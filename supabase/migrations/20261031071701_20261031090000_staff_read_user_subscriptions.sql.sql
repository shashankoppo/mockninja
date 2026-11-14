/*
# Let staff read all user subscriptions

1. Summary
The new admin subscriptions screen lists every student's subscription so staff can review and cancel paid access.

2. Changes
- user_subscriptions: adds a SELECT policy that lets staff read all rows.

3. Security
- Students keep reading only their own rows (subs_select_own is unchanged).
- Staff update access (staff_update_subscriptions) already exists and is used to cancel a subscription.
- No grants change; authenticated already has SELECT and UPDATE.

4. Important notes
- The policy is re-created idempotently, so re-running this migration is safe.
*/

DROP POLICY IF EXISTS staff_select_subscriptions ON user_subscriptions;
CREATE POLICY staff_select_subscriptions ON user_subscriptions FOR SELECT
  TO authenticated USING (is_staff());
