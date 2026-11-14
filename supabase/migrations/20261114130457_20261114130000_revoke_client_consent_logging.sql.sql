/*
# Revoke client access to consent logging

1. Problem
- `log_consent_event(p_user_id, p_type, p_meta)` is a SECURITY DEFINER function that inserts a consent record for whatever user id the caller supplies. Any signed-in student could write consent records for another student.
- No part of the application calls this function.

2. Change
- Revoke EXECUTE from PUBLIC, anon, and authenticated.
- Grant EXECUTE to service_role only, so server-side code can still record consent when it needs to.

3. Security
- No client role can call the function any more.
- No table grants or policies change. Existing consent records are untouched.

4. Notes
- Idempotent: revoking and granting again has no further effect.
*/

REVOKE EXECUTE ON FUNCTION public.log_consent_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_consent_event(uuid, text, jsonb) TO service_role;
