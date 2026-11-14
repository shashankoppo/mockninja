/*
# Gate chapter notes and formula flashcards to paid plans

1. New function
- has_active_paid_plan(uuid): true when the user has an ACTIVE subscription to a plan priced above zero that has not expired. Same rule the exam start action uses for premium mocks.
- Runs as SECURITY DEFINER so it can read subscription rows regardless of the caller's policies; EXECUTE is granted only to authenticated.

2. Modified tables
- revision_notes and formula_cards: the public read policies are replaced. Published rows are now readable only by users with an active paid plan, or by staff.
- anon loses SELECT on both tables, so signed-out visitors can no longer read the content through the database.

3. Security
- Writes are unchanged (staff only via is_staff()).
- No existing data is modified.
*/

CREATE OR REPLACE FUNCTION public.has_active_paid_plan(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user
      AND us.status = 'ACTIVE'
      AND sp.price_inr > 0
      AND (us.expires_at IS NULL OR us.expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_paid_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_paid_plan(uuid) TO authenticated;

DROP POLICY IF EXISTS "read_published_revision_notes" ON public.revision_notes;
CREATE POLICY "paid_read_published_revision_notes" ON public.revision_notes
  FOR SELECT TO authenticated
  USING (is_published = true AND (public.has_active_paid_plan(auth.uid()) OR public.is_staff()));

DROP POLICY IF EXISTS "read_published_formula_cards" ON public.formula_cards;
CREATE POLICY "paid_read_published_formula_cards" ON public.formula_cards
  FOR SELECT TO authenticated
  USING (is_published = true AND (public.has_active_paid_plan(auth.uid()) OR public.is_staff()));

REVOKE SELECT ON public.revision_notes FROM anon;
REVOKE SELECT ON public.formula_cards FROM anon;
