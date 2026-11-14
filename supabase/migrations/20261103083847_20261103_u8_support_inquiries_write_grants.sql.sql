/*
# Narrow browser write access on support inquiries

1. Problem
- The public and signed-in roles held table-wide DELETE, TRUNCATE, TRIGGER, REFERENCES and UPDATE rights on support_inquiries.
- TRUNCATE ignores row level security, so a browser session could have erased every support ticket.

2. Changes
- Revoke all write-type table rights from anon and authenticated.
- Re-grant INSERT only on the columns the contact form and the student ticket form send: name, email, subject, message, user_id.
- Re-grant UPDATE only on the columns staff change in the admin inbox: status, internal_notes, handled_by, for authenticated.
- Existing SELECT rights are unchanged, so row policies still control what each role can read.

3. Security
- Row policies are unchanged. Inserts still must start as OPEN with no handler. Staff updates still limited to allowed statuses.
- service_role and postgres rights are unchanged.
*/

REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE, INSERT ON support_inquiries FROM anon, authenticated;

GRANT INSERT (name, email, subject, message, user_id) ON support_inquiries TO anon, authenticated;
GRANT UPDATE (status, internal_notes, handled_by) ON support_inquiries TO authenticated;
