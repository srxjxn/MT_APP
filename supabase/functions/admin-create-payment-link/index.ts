// Supabase Edge Function: admin-create-payment-link
// Admin-only. Creates a Stripe Checkout (one-time payment) link for a parent for an owed
// private package or membership, tagged so the existing stripe-webhook records it on payment.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!STRIPE_SECRET_KEY) return json({ error: 'Stripe is not configured.' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // --- Auth: caller must be an owner/admin (this function runs with verify_jwt = false,
    //     so we verify the caller's token ourselves). ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await authed.auth.getUser();
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerRow } = await admin.from('users').select('role').eq('auth_id', caller.id).single();
    if (!callerRow || (callerRow.role !== 'owner' && callerRow.role !== 'admin')) {
      return json({ error: 'Forbidden' }, 403);
    }

    // --- Input ---
    const { targetUserId, amountCents, description, paymentType, studentPackageId, subscriptionId } = await req.json();
    if (!targetUserId || !amountCents || amountCents <= 0 || !paymentType) {
      return json({ error: 'targetUserId, positive amountCents, and paymentType are required' }, 400);
    }

    // --- Load the target parent ---
    const { data: parent, error: pErr } = await admin
      .from('users')
      .select('id, org_id, email, first_name, last_name, stripe_customer_id')
      .eq('id', targetUserId)
      .single();
    if (pErr || !parent) return json({ error: 'Target user not found' }, 404);

    // --- Ensure a Stripe customer exists ---
    let customerId: string | null = parent.stripe_customer_id;
    if (!customerId) {
      const cp = new URLSearchParams();
      cp.append('email', parent.email);
      const name = `${parent.first_name ?? ''} ${parent.last_name ?? ''}`.trim();
      if (name) cp.append('name', name);
      cp.append('metadata[user_id]', parent.id);
      const cRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cp.toString(),
      });
      const customer = await cRes.json();
      if (!cRes.ok) return json({ error: customer.error?.message ?? 'Stripe customer error' }, 400);
      customerId = customer.id as string;
      await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', parent.id);
    }

    // --- Create the Checkout session (one-time payment) ---
    const redirectBaseUrl = `${supabaseUrl}/functions/v1/payment-redirect`;
    const params = new URLSearchParams();
    params.append('customer', customerId);
    params.append('success_url', `${redirectBaseUrl}?status=success`);
    params.append('cancel_url', `${redirectBaseUrl}?status=cancelled`);
    params.append('mode', 'payment');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][price_data][product_data][name]', description || 'Payment');
    params.append('line_items[0][quantity]', '1');

    // Stamp metadata on BOTH the session and the payment_intent so whichever webhook event
    // fires (checkout.session.completed or payment_intent.succeeded) can read it.
    const setMeta = (k: string, v: string) => {
      params.append(`metadata[${k}]`, v);
      params.append(`payment_intent_data[metadata][${k}]`, v);
    };
    setMeta('user_id', parent.id);
    setMeta('org_id', parent.org_id);
    setMeta('payment_type', paymentType); // 'package' | 'subscription'
    if (description) setMeta('description', description);
    if (studentPackageId) setMeta('student_package_id', studentPackageId);
    if (subscriptionId) setMeta('subscription_id', subscriptionId);

    const sRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await sRes.json();
    if (!sRes.ok) return json({ error: session.error?.message ?? 'Stripe error' }, 400);

    return json({ url: session.url }, 200);
  } catch (err) {
    console.error('admin-create-payment-link error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
