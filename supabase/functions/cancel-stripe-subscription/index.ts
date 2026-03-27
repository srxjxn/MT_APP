// Supabase Edge Function: cancel-stripe-subscription
// Cancels a single student's subscription. If siblings remain on the Stripe sub,
// decrements quantity. If last student, cancels the entire Stripe subscription.

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

    const { stripe_subscription_id, subscription_id, cancel_immediately = false } = await req.json();

    if (!stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'stripe_subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Count active siblings sharing this Stripe subscription (excluding the one being cancelled)
    const { data: siblings } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripe_subscription_id)
      .in('status', ['active', 'pending'])
      .neq('id', subscription_id || '');

    const siblingCount = siblings?.length ?? 0;

    if (siblingCount > 0 && subscription_id) {
      // SIBLINGS REMAIN: decrement Stripe quantity, only cancel this local sub
      // Get current Stripe sub to find item ID
      const getRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
        { headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` } }
      );
      const currentStripeSub = await getRes.json();
      if (!getRes.ok) {
        return new Response(
          JSON.stringify({ error: currentStripeSub.error?.message ?? 'Stripe error' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const item = currentStripeSub.items?.data?.[0];
      if (item) {
        const params = new URLSearchParams();
        params.append('items[0][id]', item.id);
        params.append('items[0][quantity]', String(siblingCount));
        params.append('proration_behavior', 'none');

        await fetch(
          `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
      }

      // Cancel only the target local subscription
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: false,
          stripe_subscription_id: null,
        })
        .eq('id', subscription_id);
    } else {
      // LAST STUDENT: cancel entire Stripe subscription
      if (cancel_immediately) {
        const stripeRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
          }
        );
        const result = await stripeRes.json();
        if (!stripeRes.ok) {
          return new Response(
            JSON.stringify({ error: result.error?.message ?? 'Stripe error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const params = new URLSearchParams();
        params.append('cancel_at_period_end', 'true');

        const stripeRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        const result = await stripeRes.json();
        if (!stripeRes.ok) {
          return new Response(
            JSON.stringify({ error: result.error?.message ?? 'Stripe error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update all local subscriptions sharing this Stripe sub
      if (cancel_immediately) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', stripe_subscription_id);
      } else {
        await supabase
          .from('subscriptions')
          .update({ cancel_at_period_end: true })
          .eq('stripe_subscription_id', stripe_subscription_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('cancel-stripe-subscription error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
