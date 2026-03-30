// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events for one-time payments and recurring subscriptions.
// Events:
//   payment_intent.succeeded — create/update payment record
//   payment_intent.payment_failed — mark payment failed
//   invoice.paid — record recurring subscription payment
//   invoice.payment_failed — record failed subscription payment
//   checkout.session.completed — link subscription OR execute one-time post-payment actions
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

/**
 * Execute post-payment actions based on the post_action metadata from checkout session.
 */
async function executePostAction(
  supabase: ReturnType<typeof createClient>,
  postAction: { type: string; [key: string]: unknown },
  paymentId: string,
) {
  switch (postAction.type) {
    case 'enroll': {
      const { lesson_instance_id, student_ids } = postAction as {
        type: string;
        lesson_instance_id: string;
        student_ids: string[];
      };

      for (const studentId of student_ids) {
        // Check if already enrolled (idempotency)
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('lesson_instance_id', lesson_instance_id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!existing) {
          await supabase.from('enrollments').insert({
            lesson_instance_id,
            student_id: studentId,
            status: 'enrolled',
            payment_id: paymentId,
          });
        }
      }
      break;
    }

    case 'create_package': {
      const { student_id, coach_package_id, hours_purchased } = postAction as {
        type: string;
        student_id: string;
        coach_package_id: string;
        hours_purchased: number;
      };

      // Idempotency: check if this exact webhook already created/updated a package very recently
      const { data: recentPkg } = await supabase
        .from('student_packages')
        .select('id')
        .eq('student_id', student_id)
        .eq('coach_package_id', coach_package_id)
        .gte('updated_at', new Date(Date.now() - 60000).toISOString())
        .maybeSingle();

      if (!recentPkg) {
        // Check for existing active package to aggregate into
        const { data: existingActive } = await supabase
          .from('student_packages')
          .select('id, hours_purchased')
          .eq('student_id', student_id)
          .eq('coach_package_id', coach_package_id)
          .eq('status', 'active')
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (existingActive) {
          // Aggregate: add hours to existing package
          await supabase
            .from('student_packages')
            .update({
              hours_purchased: existingActive.hours_purchased + hours_purchased,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingActive.id);
        } else {
          // No active package — create new
          await supabase.from('student_packages').insert({
            student_id,
            coach_package_id,
            hours_purchased,
            hours_used: 0,
            status: 'active',
            purchased_at: new Date().toISOString(),
          });
        }
      }
      break;
    }

    case 'link_request': {
      const { request_id } = postAction as { type: string; request_id: string };

      await supabase
        .from('lesson_requests')
        .update({ payment_id: paymentId })
        .eq('id', request_id);
      break;
    }

    default:
      console.warn('Unknown post_action type:', postAction.type);
  }
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

        // Try to update existing payment record first (idempotency)
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
              description: paymentIntent.description || meta.description || null,
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

        // Find local subscriptions (may be multiple with tiered pricing)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('id, user_id, org_id, status')
          .eq('stripe_subscription_id', stripeSubId);

        const sub = subs?.[0];
        if (sub) {
          // Activate ALL pending subscriptions sharing this Stripe sub
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', stripeSubId)
            .eq('status', 'pending');

          // Record the recurring payment (once per invoice, using first sub for reference)
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

        const { data: subs2 } = await supabase
          .from('subscriptions')
          .select('id, user_id, org_id')
          .eq('stripe_subscription_id', stripeSubId)
          .limit(1);

        const sub2 = subs2?.[0];
        if (sub2) {
          await supabase.from('payments').insert({
            org_id: sub2.org_id,
            user_id: sub2.user_id,
            amount_cents: invoice.amount_due,
            payment_type: 'subscription',
            payment_platform: 'stripe',
            payment_status: 'failed',
            stripe_payment_intent_id: invoice.payment_intent || null,
            stripe_invoice_id: invoice.id,
            subscription_id: sub2.id,
            description: `Failed recurring payment – ${invoice.lines?.data?.[0]?.description || 'Subscription'}`,
          });
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode === 'subscription') {
          // Subscription checkout — link Stripe subscription to local subscription
          const stripeSubId = session.subscription;
          const localSubId = session.metadata?.subscription_id;

          if (stripeSubId && localSubId) {
            const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
            if (STRIPE_SECRET_KEY) {
              const stripeRes = await fetch(
                `https://api.stripe.com/v1/subscriptions/${stripeSubId}`,
                {
                  headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
                }
              );
              const stripeSub = await stripeRes.json();

              if (stripeRes.ok) {
                await supabase
                  .from('subscriptions')
                  .update({
                    stripe_subscription_id: stripeSubId,
                    current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  })
                  .eq('id', localSubId);
              } else {
                await supabase
                  .from('subscriptions')
                  .update({ stripe_subscription_id: stripeSubId })
                  .eq('id', localSubId);
              }
            } else {
              await supabase
                .from('subscriptions')
                .update({ stripe_subscription_id: stripeSubId })
                .eq('id', localSubId);
            }
          }
        } else if (session.mode === 'payment') {
          // One-time payment checkout — create payment record and execute post-actions
          const meta = session.metadata || {};
          const paymentIntentId = session.payment_intent;

          if (meta.user_id && meta.org_id) {
            // Check if payment already exists (idempotency — payment_intent.succeeded may have already fired)
            const { data: existingPayment } = await supabase
              .from('payments')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle();

            let paymentId: string;

            if (existingPayment) {
              paymentId = existingPayment.id;
            } else {
              const { data: newPayment } = await supabase
                .from('payments')
                .insert({
                  org_id: meta.org_id,
                  user_id: meta.user_id,
                  amount_cents: session.amount_total,
                  payment_type: meta.payment_type || 'lesson',
                  payment_platform: 'stripe',
                  payment_status: 'completed',
                  stripe_payment_intent_id: paymentIntentId,
                  subscription_id: meta.subscription_id || null,
                  description: meta.description || null,
                  paid_at: new Date().toISOString(),
                })
                .select('id')
                .single();

              paymentId = newPayment?.id;
            }

            // Execute post-payment actions if specified
            if (paymentId && meta.post_action) {
              try {
                const postAction = JSON.parse(meta.post_action);
                await executePostAction(supabase, postAction, paymentId);
              } catch (e) {
                console.error('Failed to execute post_action:', e);
              }
            }
          }
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
          incomplete: 'pending',
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
