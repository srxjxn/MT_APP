// Supabase Edge Function: create-stripe-subscription
// Creates or updates a Stripe Subscription with tiered quantity-based pricing.
// - First student: creates new Stripe sub with qty=1
// - Additional students: increments qty on existing family Stripe sub
// - Retry: retrieves existing Stripe sub's client_secret

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customer_id, price_id, subscription_id, user_id } = await req.json();

    if (!customer_id || !price_id || !subscription_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id, price_id, subscription_id, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this local subscription already has a Stripe subscription (retry scenario)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscription_id)
      .single();

    let stripeSub;

    if (existingSub?.stripe_subscription_id) {
      // RETRY PATH: retrieve existing Stripe subscription's latest invoice
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${existingSub.stripe_subscription_id}?expand[]=latest_invoice.payment_intent`,
        {
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          },
        }
      );

      const retrievedSub = await stripeRes.json();

      // If the Stripe subscription is already active/trialing, payment is done — just tell the client
      if (stripeRes.ok && ['active', 'trialing'].includes(retrievedSub.status)) {
        // Update local subscription period dates to match Stripe
        await supabase
          .from('subscriptions')
          .update({
            current_period_start: new Date(retrievedSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(retrievedSub.current_period_end * 1000).toISOString(),
          })
          .eq('id', subscription_id);

        return new Response(
          JSON.stringify({
            alreadyActive: true,
            stripeSubscriptionId: retrievedSub.id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if the Stripe sub is dead/unusable (404, expired, canceled, or no client_secret)
      const isGone = !stripeRes.ok; // 404 or other Stripe error
      const isTerminal = ['incomplete_expired', 'canceled'].includes(retrievedSub.status);
      const clientSecret = retrievedSub.latest_invoice?.payment_intent?.client_secret;
      const isUnusable = stripeRes.ok && !isTerminal && !clientSecret;

      if (isGone || isTerminal || isUnusable) {
        // Clear the dead Stripe subscription ID so we fall through to create a new one
        console.log(
          `Clearing dead Stripe sub ${existingSub.stripe_subscription_id} (gone=${isGone}, terminal=${isTerminal}, unusable=${isUnusable})`
        );
        await supabase
          .from('subscriptions')
          .update({ stripe_subscription_id: null })
          .eq('id', subscription_id);
        // Fall through to sibling/first-student path below
      } else {
        // Stripe sub is still usable — return existing client_secret
        stripeSub = retrievedSub;
      }
    }

    if (!stripeSub) {
      // Check for existing family Stripe subscription (adding a sibling)
      const { data: familySubs } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user_id)
        .eq('stripe_price_id', price_id)
        .eq('status', 'active')
        .not('stripe_subscription_id', 'is', null)
        .limit(1);

      const familyStripSubId = familySubs?.[0]?.stripe_subscription_id;

      if (familyStripSubId) {
        // SIBLING PATH: update existing Stripe sub quantity
        // First, get the current subscription to find item ID and quantity
        const getRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${familyStripSubId}`,
          {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
          }
        );
        const currentStripeSub = await getRes.json();
        if (!getRes.ok) {
          return new Response(
            JSON.stringify({ error: currentStripeSub.error?.message ?? 'Stripe error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const item = currentStripeSub.items?.data?.[0];
        if (!item) {
          return new Response(
            JSON.stringify({ error: 'No subscription item found on Stripe subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newQuantity = (item.quantity || 1) + 1;

        // Update quantity — auto-charges saved payment method
        const params = new URLSearchParams();
        params.append('items[0][id]', item.id);
        params.append('items[0][quantity]', String(newQuantity));
        params.append('proration_behavior', 'always_invoice');
        params.append('payment_behavior', 'allow_incomplete');

        const updateRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${familyStripSubId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        stripeSub = await updateRes.json();

        if (!updateRes.ok) {
          return new Response(
            JSON.stringify({ error: stripeSub.error?.message ?? 'Stripe error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update local subscription with shared Stripe sub ID and period
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: familyStripSubId,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          })
          .eq('id', subscription_id);

        // Sibling added — auto-charged, no redirect needed
        return new Response(
          JSON.stringify({
            siblingAdded: true,
            stripeSubscriptionId: stripeSub.id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // FIRST STUDENT PATH: signal client to use Stripe Checkout (Apple 3.1.1 compliant)
        return new Response(
          JSON.stringify({ needsCheckout: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Retry path — return existing client secret for incomplete Stripe subscription
    const clientSecret = stripeSub.latest_invoice?.payment_intent?.client_secret;

    if (!clientSecret) {
      // Stripe sub exists but no client secret — redirect to checkout instead
      return new Response(
        JSON.stringify({ needsCheckout: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For retry with existing incomplete sub, also redirect to checkout
    // (PaymentSheet is no longer used for subscriptions)
    return new Response(
      JSON.stringify({ needsCheckout: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-stripe-subscription error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
