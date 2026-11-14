import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ConsentRequest {
  guardian_email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with the user's JWT to get their identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ConsentRequest = await req.json();
    const guardianEmail = body.guardian_email?.trim().toLowerCase();

    if (!guardianEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      return new Response(JSON.stringify({ error: 'Valid guardian email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to set guardian_consent_at and log notification
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Set guardian_consent_at — only the server can do this (guard trigger blocks students)
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        guardian_consent_at: new Date().toISOString(),
        guardian_email: guardianEmail,
        consent_version: 'v1-2026',
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to record consent' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the consent notification
    await serviceClient.from('notification_log').insert({
      user_id: user.id,
      type: 'GUARDIAN_CONSENT',
    });

    // In production, send email here via a notification service.
    // For now, we just record it.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
