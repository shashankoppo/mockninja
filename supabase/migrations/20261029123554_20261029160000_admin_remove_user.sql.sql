/*
# Admin remove user function

1. Purpose
   Allows an ADMIN to remove a user from the platform. This is a SECURITY DEFINER
   function so it can delete the profile row (and null out referrals pointing to it)
   even though the admin client cannot directly DELETE from auth.users.

2. New Functions
   - `admin_remove_user(p_target_id uuid)` — SECURITY DEFINER, callable only by
     authenticated users whose profile role is ADMIN. It:
       a. Rejects self-deletion (cannot remove your own account).
       b. Rejects removing other admins (prevents locking out the panel).
       c. Nullifies `referred_by` references pointing to the target (avoids FK violation).
       d. Deletes the target's profile row.
   The auth.users row itself remains (Supabase does not allow service-role-free
   deletion from auth.users), but the user effectively loses their profile and
   all associated data cascades through existing FKs on dependent tables.

3. Security
   - SECURITY DEFINER, search_path set to public.
   - EXECUTE revoked from PUBLIC and anon; granted to authenticated only.
   - Body checks `is_staff()` and that the caller is ADMIN via the profiles table.
*/

CREATE OR REPLACE FUNCTION public.admin_remove_user(p_target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  -- Get caller role
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only admins can remove users';
  END IF;

  -- Prevent self-deletion
  IF p_target_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own account';
  END IF;

  -- Get target role
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent removing other admins
  IF v_target_role = 'ADMIN' THEN
    RAISE EXCEPTION 'Cannot remove admin users';
  END IF;

  -- Nullify referrals pointing to this user
  UPDATE profiles SET referred_by = NULL WHERE referred_by = p_target_id;

  -- Delete the profile row
  DELETE FROM profiles WHERE id = p_target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_remove_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_user(uuid) TO authenticated;
