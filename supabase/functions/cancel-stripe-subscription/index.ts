// Supabase Edge Function: cancel-stripe-subscription
// Cancels a Stripe Subscription (at period end by default, or immediately).

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

    const { stripe_subscription_id, cancel_immediately = false } = await req.json();

    if (!stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'stripe_subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cancel_immediately) {
      // Delete the subscription immediately
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          },
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
      // Cancel at period end
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

    // Update local subscription record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (cancel_immediately) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: false,
        })
        .eq('stripe_subscription_id', stripe_subscription_id);
    } else {
      await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('stripe_subscription_id', stripe_subscription_id);
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
