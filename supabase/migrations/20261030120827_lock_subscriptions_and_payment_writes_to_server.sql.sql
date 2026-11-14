/*
# Lock subscriptions and payment records to server-side changes

1. Summary
Students could insert their own paid subscription rows, and transaction rows already marked SUCCESS, directly from the browser. That granted premium access without any payment. This migration removes the browser write path.

2. Changes
- user_subscriptions: students can only read their own rows. Student insert, update and delete policies are removed. Staff may insert and update rows for manual reconciliation.
- transactions: students may only insert PENDING transactions. Status changes stay with staff.
- switch_to_free_plan: runs with owner rights so it keeps working without client write access. It still activates only free plans for the calling user.

3. Security
- anon privileges on user_subscriptions are removed entirely (they previously included write and TRUNCATE).
- EXECUTE on switch_to_free_plan is revoked from PUBLIC and anon.

4. Important notes
- Existing rows are not changed by this migration. Review paid subscriptions and SUCCESS transactions created outside a real payment before relying on plan access.
*/

REVOKE ALL ON user_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;

DROP POLICY IF EXISTS subs_insert_own ON user_subscriptions;
DROP POLICY IF EXISTS subs_update_own ON user_subscriptions;
DROP POLICY IF EXISTS subs_delete_own ON user_subscriptions;

DROP POLICY IF EXISTS staff_insert_subscriptions ON user_subscriptions;
CREATE POLICY staff_insert_subscriptions ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS staff_update_subscriptions ON user_subscriptions;
CREATE POLICY staff_update_subscriptions ON user_subscriptions FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS student_insert_own_transactions ON transactions;
CREATE POLICY student_insert_own_transactions ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

ALTER FUNCTION switch_to_free_plan(uuid) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION switch_to_free_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION switch_to_free_plan(uuid) TO authenticated;
