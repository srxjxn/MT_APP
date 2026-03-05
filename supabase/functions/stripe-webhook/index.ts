// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events as a server-side safety net.
// Events: payment_intent.succeeded, payment_intent.payment_failed
//
// Setup:
// 1. Set STRIPE_WEBHOOK_SECRET in Supabase secrets
// 2. Configure webhook URL in Stripe Dashboard:
//    https://<project>.supabase.co/functions/v1/stripe-webhook
// 3. Select events: payment_intent.succeeded, payment_intent.payment_failed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

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
        // Update payment record if it exists
        const { error } = await supabase
          .from('payments')
          .update({
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .eq('payment_status', 'pending');

        if (error) {
          console.error('Failed to update payment:', error.message);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { error } = await supabase
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .eq('payment_status', 'pending');

        if (error) {
          console.error('Failed to update payment:', error.message);
        }
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
