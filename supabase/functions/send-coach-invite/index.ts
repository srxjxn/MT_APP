// Supabase Edge Function: send-coach-invite
// Sends an invite email to a coach via Resend.
//
// Prerequisites:
// 1. Set RESEND_API_KEY in Supabase Edge Function secrets
// 2. For testing: uses onboarding@resend.dev (delivers only to your Resend account email)
// 3. For production: verify a sender domain in Resend and update the "from" address below
//
// Usage from the app:
//   await supabase.functions.invoke('send-coach-invite', {
//     body: { email: 'coach@example.com', inviterName: 'John Doe', orgName: 'Modern Tennis' }
//   });

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend is not configured. Set RESEND_API_KEY in Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, inviterName, orgName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">You're invited to ${orgName || 'Modern Tennis'}!</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.5;">
          ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} to join <strong>${orgName || 'Modern Tennis'}</strong> as a coach.
        </p>
        <p style="color: #444; font-size: 16px; line-height: 1.5; margin-top: 24px;">
          Here's how to get started:
        </p>
        <ol style="color: #444; font-size: 16px; line-height: 1.8; padding-left: 20px;">
          <li>Download the <strong>Modern Tennis</strong> app from the App Store</li>
          <li>Sign up using this email address (<strong>${email}</strong>)</li>
          <li>You'll be automatically added as a coach — no code needed</li>
        </ol>
        <p style="color: #888; font-size: 14px; margin-top: 32px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Modern Tennis <onboarding@resend.dev>',
        to: [email],
        subject: `You're invited to join ${orgName || 'Modern Tennis'} as a coach`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: resendData.message ?? 'Failed to send email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
