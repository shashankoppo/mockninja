/*
# Allow the client to set the id on new support inquiries

1. Changes
- Grant INSERT on the id column of support_inquiries to anon and authenticated.

2. Why
- The contact form needs the ticket id for its notification. Visitors who are not signed in cannot read the row back after inserting it, so the form now generates the id itself and inserts without asking for the row.

3. Security
- Row policies are unchanged. The insert policy still requires status OPEN, no handler, and no resolution time.
*/

GRANT INSERT (id) ON support_inquiries TO anon, authenticated;
