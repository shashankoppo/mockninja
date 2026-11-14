import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();
    if (callerProfile?.role !== 'ADMIN') return json({ error: 'Only admins can remove users' }, 403);

    const body = await req.json().catch(() => null);
    const targetId = typeof body?.target_id === 'string' ? body.target_id : '';
    if (!targetId) return json({ error: 'target_id is required' }, 400);
    if (targetId === caller.id) return json({ error: 'You cannot remove your own account' }, 400);

    const { data: target, error: targetError } = await admin
      .from('profiles')
      .select('id, role, email')
      .eq('id', targetId)
      .maybeSingle();
    if (targetError) return json({ error: 'Could not load user' }, 500);
    if (!target) return json({ error: 'User not found' }, 404);
    if (target.role === 'ADMIN') return json({ error: 'Cannot remove admin users' }, 400);

    // 1. Run manifest-driven deletion (removes/anonymises all user data in one transaction)
    const { error: deleteDataError } = await admin.rpc('delete_user_data', { p_user_id: targetId });
    if (deleteDataError) {
      console.error('delete_user_data failed', deleteDataError);
      return json({ error: 'Could not delete user data' }, 500);
    }

    // 2. Delete avatar storage objects
    const { data: avatarList } = await admin.storage
      .from('avatars')
      .list('', { search: targetId });
    if (avatarList && avatarList.length > 0) {
      const paths = avatarList.map((f) => f.name);
      await admin.storage.from('avatars').remove(paths);
    }

    // 3. Delete the auth user (cascades any remaining FKs)
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
    if (deleteError) return json({ error: 'Could not delete the account' }, 500);

    return json({ ok: true });
  } catch (err) {
    console.error('admin-remove-user failed', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
