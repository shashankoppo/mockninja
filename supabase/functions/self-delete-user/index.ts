import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile } = await admin.from('profiles').select('role, email').eq('id', user.id).maybeSingle();
    if (profile?.role === 'ADMIN') return json({ error: 'Admin accounts must be removed by another administrator' }, 400);

    const { data: deletion, error: requestError } = await userClient.rpc('request_account_deletion');
    if (requestError) return json({ error: 'Could not create deletion request' }, 500);

    if (new Date(deletion.scheduled_for).getTime() > Date.now()) {
      return json({ ok: true, scheduled_for: deletion.scheduled_for, status: deletion.status });
    }

    const { error: deleteDataError } = await admin.rpc('delete_user_data', { p_user_id: user.id });
    if (deleteDataError) return json({ error: 'Could not delete account data' }, 500);

    const { data: avatarList } = await admin.storage.from('avatars').list('', { search: user.id });
    if (avatarList?.length) await admin.storage.from('avatars').remove(avatarList.map((file) => file.name));

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) return json({ error: 'Could not delete account' }, 500);

    return json({ ok: true, deleted: true });
  } catch (error) {
    console.error('self-delete-user failed', error);
    return json({ error: 'Unexpected error' }, 500);
  }
});
