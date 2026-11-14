// Support inquiry notification edge function
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InquiryPayload {
  inquiry_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body: InquiryPayload = await req.json();

    if (!body.inquiry_id || !body.email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Mark the inquiry as having a notification sent, so the admin inbox
    // can display this state and we avoid duplicate notifications.
    await serviceClient.from('notification_log').insert({
      type: 'SUPPORT_INQUIRY',
      message: `New inquiry from ${body.name} (${body.email}): ${body.subject}`,
    });

    // Send email via Supabase's built-in email service if configured,
    // otherwise log for the admin to pick up in the notification log.
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const staffEmail = Deno.env.get('STAFF_SUPPORT_EMAIL') || 'support@mockninja.com';

    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Mock Ninja Support <noreply@mockninja.com>',
          to: [staffEmail],
          subject: `New Support Inquiry: ${body.subject || 'General'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">New Support Inquiry</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold;">Name:</td><td style="padding: 8px 0;">${body.name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${body.email}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td style="padding: 8px 0;">${body.subject || 'General'}</td></tr>
              </table>
              <h3 style="margin-top: 20px;">Message:</h3>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${body.message}</div>
              <p style="margin-top: 20px; color: #666; font-size: 12px;">Review this inquiry in the admin panel under Support.</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text());
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
