/*
# Allow staff import history writes

1. Purpose
- The mock-builder creates questions in the browser and then records the upload in `import_batches`.
- The original table policy allowed staff to read history, but only `service_role` could insert or update rows.
- This caused successful question uploads to show a row-level security error while saving the history entry.

2. Modified table
- `import_batches`
- No columns or existing records are changed.
- Staff may insert a history row for themselves.
- Staff may update import counts and status for rows they created.

3. Security
- Grants are limited to INSERT and UPDATE for `authenticated`.
- INSERT requires `is_staff()` and `created_by = auth.uid()`.
- UPDATE requires `is_staff()` and ownership of the history row.
- Existing staff-only SELECT policy remains unchanged.
- Anonymous users and students receive no write access.

4. Important notes
- The import-questions Edge Function continues to use `service_role` for its server-side batch writes.
- This migration is additive and does not delete or rewrite existing import history.
*/

GRANT INSERT, UPDATE ON public.import_batches TO authenticated;

DROP POLICY IF EXISTS "staff_insert_import_batches" ON public.import_batches;
CREATE POLICY "staff_insert_import_batches"
  ON public.import_batches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff() AND created_by = auth.uid());

DROP POLICY IF EXISTS "staff_update_import_batches" ON public.import_batches;
CREATE POLICY "staff_update_import_batches"
  ON public.import_batches FOR UPDATE
  TO authenticated
  USING (public.is_staff() AND created_by = auth.uid())
  WITH CHECK (public.is_staff() AND created_by = auth.uid());