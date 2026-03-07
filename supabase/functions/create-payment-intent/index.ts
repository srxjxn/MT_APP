// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent and returns the client secret.
// Passes metadata (user_id, org_id, payment_type, subscription_id) so the
// stripe-webhook can create a payment record server-side on success.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Edge Function secrets.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { amount_cents, description, customer_id, user_id, org_id, payment_type, subscription_id } = await req.json();

    if (!amount_cents || amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create PaymentIntent via Stripe API
    const params = new URLSearchParams();
    params.append('amount', String(amount_cents));
    params.append('currency', 'usd');
    if (description) params.append('description', description);
    if (customer_id) params.append('customer', customer_id);

    // Attach metadata for server-side payment record creation
    if (user_id) params.append('metadata[user_id]', user_id);
    if (org_id) params.append('metadata[org_id]', org_id);
    if (payment_type) params.append('metadata[payment_type]', payment_type);
    if (subscription_id) params.append('metadata[subscription_id]', subscription_id);

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const paymentIntent = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: paymentIntent.error?.message ?? 'Stripe error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
