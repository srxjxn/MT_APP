// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events for one-time payments and recurring subscriptions.
// Events:
//   payment_intent.succeeded — create/update payment record
//   payment_intent.payment_failed — mark payment failed
//   invoice.paid — record recurring subscription payment
//   invoice.payment_failed — record failed subscription payment
//   customer.subscription.updated — sync subscription status/period
//   customer.subscription.deleted — mark subscription cancelled

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifyStripeSignature(payload: string, signature: string): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET) return false;

  const elements = signature.split(',');
  const timestampStr = elements.find((e) => e.startsWith('t='))?.slice(2);
  const sig = elements.find((e) => e.startsWith('v1='))?.slice(3);

  if (!timestampStr || !sig) return false;

  const signedPayload = `${timestampStr}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(expectedSig, sig);
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature
    if (STRIPE_WEBHOOK_SECRET) {
      const isValid = await verifyStripeSignature(body, signature);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(body);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;

        // Try to update existing payment record first
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (existing) {
          // Update existing record
          await supabase
            .from('payments')
            .update({
              payment_status: 'completed',
              paid_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        } else {
          // Create payment record from PaymentIntent metadata
          const meta = paymentIntent.metadata || {};
          if (meta.user_id && meta.org_id) {
            await supabase.from('payments').insert({
              org_id: meta.org_id,
              user_id: meta.user_id,
              amount_cents: paymentIntent.amount,
              payment_type: meta.payment_type || 'subscription',
              payment_platform: 'stripe',
              payment_status: 'completed',
              stripe_payment_intent_id: paymentIntent.id,
              subscription_id: meta.subscription_id || null,
              description: paymentIntent.description || null,
              paid_at: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { error } = await supabase
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (error) {
          console.error('Failed to update payment:', error.message);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        if (!stripeSubId) break;

        // Find local subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, user_id, org_id')
          .eq('stripe_subscription_id', stripeSubId)
          .maybeSingle();

        if (sub) {
          // Record the recurring payment
          await supabase.from('payments').insert({
            org_id: sub.org_id,
            user_id: sub.user_id,
            amount_cents: invoice.amount_paid,
            payment_type: 'subscription',
            payment_platform: 'stripe',
            payment_status: 'completed',
            stripe_payment_intent_id: invoice.payment_intent || null,
            stripe_invoice_id: invoice.id,
            subscription_id: sub.id,
            description: `Recurring payment – ${invoice.lines?.data?.[0]?.description || 'Subscription'}`,
            paid_at: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()).toISOString(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        if (!stripeSubId) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, user_id, org_id')
          .eq('stripe_subscription_id', stripeSubId)
          .maybeSingle();

        if (sub) {
          await supabase.from('payments').insert({
            org_id: sub.org_id,
            user_id: sub.user_id,
            amount_cents: invoice.amount_due,
            payment_type: 'subscription',
            payment_platform: 'stripe',
            payment_status: 'failed',
            stripe_payment_intent_id: invoice.payment_intent || null,
            stripe_invoice_id: invoice.id,
            subscription_id: sub.id,
            description: `Failed recurring payment – ${invoice.lines?.data?.[0]?.description || 'Subscription'}`,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;

        // Map Stripe status to local status
        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'active',
          canceled: 'cancelled',
          unpaid: 'paused',
          incomplete: 'active',
          incomplete_expired: 'expired',
          trialing: 'active',
          paused: 'paused',
        };

        const localStatus = statusMap[stripeSub.status] || 'active';

        await supabase
          .from('subscriptions')
          .update({
            status: localStatus,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
          })
          .eq('stripe_subscription_id', stripeSub.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', stripeSub.id);
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
