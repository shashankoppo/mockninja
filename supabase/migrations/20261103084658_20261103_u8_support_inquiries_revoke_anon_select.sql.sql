/*
# Remove logged-out read grant on support inquiries

1. Changes
- Revoke SELECT on support_inquiries from anon.

2. Why
- The contact form no longer reads its row back, so logged-out visitors do not need any read access. No row policy grants them reads, so this only removes an unused permission.

3. Security
- Signed-in and staff read rights are unchanged.
*/

REVOKE SELECT ON support_inquiries FROM anon;
