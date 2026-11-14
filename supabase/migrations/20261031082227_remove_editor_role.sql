/*
# Remove the EDITOR role

- Any EDITOR profile is moved to STUDENT (none exist today; this keeps the change safe if one appears).
- Role check constraint on profiles now allows only STUDENT and ADMIN.
- is_staff() checks ADMIN only, matching the admin-only role function.
*/

UPDATE profiles SET role = 'STUDENT' WHERE role = 'EDITOR';

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%' AND pg_get_constraintdef(oid) ILIKE '%EDITOR%'
  LOOP
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('STUDENT', 'ADMIN'));

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid()
  AND role = 'ADMIN'
);
$function$;
