// Supabase Edge Function: create-stripe-customer
// Creates a Stripe Customer for a user and stores the customer_id in the users table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

serve(async (req) => {
  // Handle CORS preflight
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
      console.error('STRIPE_SECRET_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, name, user_id } = await req.json();
    console.log('create-stripe-customer called:', { email, user_id, hasName: !!name });

    if (!email || !user_id) {
      console.error('Missing required fields:', { email, user_id });
      return new Response(
        JSON.stringify({ error: 'email and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Customer
    const params = new URLSearchParams();
    params.append('email', email);
    if (name) params.append('name', name);
    params.append('metadata[user_id]', user_id);

    const stripeRes = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const customer = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe API error:', customer.error);
      return new Response(
        JSON.stringify({ error: customer.error?.message ?? 'Stripe error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stripe customer created:', customer.id);

    // Update user record with stripe_customer_id using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user_id);

    if (updateError) {
      console.error('DB update error:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update user: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User updated with stripe_customer_id');

    return new Response(
      JSON.stringify({ customer_id: customer.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
