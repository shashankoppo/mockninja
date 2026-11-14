/*
# Revoke all anonymous privileges on revision content

1. Modified tables
- revision_notes and formula_cards: anon loses INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER.

2. Security
- Row policies do not cover TRUNCATE, so the anonymous role could previously have emptied these tables. Signed-out visitors now have no access at all.
- Authenticated users keep their existing privileges; access for paid plans and staff is governed by the row policies.
*/

REVOKE ALL ON public.revision_notes FROM anon;
REVOKE ALL ON public.formula_cards FROM anon;
