// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for both subscription and one-time payments.
// Returns the checkout URL for browser redirect (Apple Guideline 3.1.1 compliance).

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

    const body = await req.json();
    const {
      customer_id,
      user_id,
      org_id,
      mode = 'subscription', // 'subscription' or 'payment'
      // Subscription-specific fields
      price_id,
      subscription_id,
      quantity,
      // One-time payment fields
      amount_cents,
      description,
      payment_type,
      post_action, // JSON object with post-payment instructions for webhook
    } = body;

    if (!customer_id || !user_id || !org_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id, user_id, and org_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const params = new URLSearchParams();
    params.append('customer', customer_id);
    params.append('success_url', 'modern-tennis://billing?checkout_success=true');
    params.append('cancel_url', 'modern-tennis://billing?checkout_cancelled=true');
    if (mode === 'subscription') {
      // Subscription mode — requires price_id and subscription_id
      if (!price_id || !subscription_id) {
        return new Response(
          JSON.stringify({ error: 'price_id and subscription_id are required for subscription mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear any stale stripe_subscription_id so the webhook can link it fresh
      await supabase
        .from('subscriptions')
        .update({ stripe_subscription_id: null })
        .eq('id', subscription_id);

      params.append('mode', 'subscription');
      params.append('payment_method_collection', 'always');
      params.append('line_items[0][price]', price_id);
      params.append('line_items[0][quantity]', String(quantity || 1));
      params.append('metadata[subscription_id]', subscription_id);
      params.append('metadata[user_id]', user_id);
      params.append('subscription_data[metadata][subscription_id]', subscription_id);
      params.append('subscription_data[metadata][user_id]', user_id);
    } else {
      // One-time payment mode — requires amount_cents
      if (!amount_cents || amount_cents <= 0) {
        return new Response(
          JSON.stringify({ error: 'amount_cents is required and must be positive for payment mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      params.append('mode', 'payment');
      params.append('line_items[0][price_data][currency]', 'usd');
      params.append('line_items[0][price_data][unit_amount]', String(amount_cents));
      params.append('line_items[0][price_data][product_data][name]', description || 'Payment');
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[user_id]', user_id);
      params.append('metadata[org_id]', org_id);
      params.append('metadata[payment_type]', payment_type || 'lesson');
      if (description) params.append('metadata[description]', description);
      if (subscription_id) params.append('metadata[subscription_id]', subscription_id);
      if (post_action) params.append('metadata[post_action]', JSON.stringify(post_action));
      // Also pass metadata to the PaymentIntent so payment_intent.succeeded can use it
      params.append('payment_intent_data[metadata][user_id]', user_id);
      params.append('payment_intent_data[metadata][org_id]', org_id);
      params.append('payment_intent_data[metadata][payment_type]', payment_type || 'lesson');
      if (description) params.append('payment_intent_data[metadata][description]', description);
      if (subscription_id) params.append('payment_intent_data[metadata][subscription_id]', subscription_id);
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message ?? 'Stripe error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
