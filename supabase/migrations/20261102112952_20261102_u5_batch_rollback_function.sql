/*
# U5: Batch rollback function

1. New function: rollback_import_batch(p_batch_id uuid)
   - SECURITY DEFINER, callable by authenticated (admin check inside)
   - Checks that the batch exists and has status COMPLETED or PARTIAL
   - Checks that NO questions from the batch are PUBLISHED
   - Checks that NO questions from the batch are used in any attempt (via mock_test_questions join)
   - If safe, deletes all questions created by the batch (matching created_by and source='IMPORTED' within the batch creation window)
   - Updates batch status to ROLLED_BACK
   - Returns the number of questions deleted
2. Security
   - REVOKE from PUBLIC, anon; GRANT to authenticated
*/

CREATE OR REPLACE FUNCTION public.rollback_import_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch import_batches;
  v_caller_role text;
  v_deleted int;
  v_blocked text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Only admins can roll back import batches';
  END IF;

  SELECT * INTO v_batch FROM public.import_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found';
  END IF;

  IF v_batch.status NOT IN ('COMPLETED', 'PARTIAL') THEN
    RAISE EXCEPTION 'Only COMPLETED or PARTIAL batches can be rolled back';
  END IF;

  SELECT count(*) INTO v_deleted
  FROM public.questions q
  WHERE q.source = 'IMPORTED'
    AND q.created_by = v_batch.created_by
    AND q.created_at >= v_batch.created_at
    AND q.created_at <= v_batch.created_at + interval '5 minutes'
    AND q.review_status = 'PUBLISHED';

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'Cannot roll back: % questions from this batch are published', v_deleted;
  END IF;

  SELECT count(*) INTO v_deleted
  FROM public.mock_test_questions mtq
  JOIN public.questions q ON q.id = mtq.question_id
  WHERE q.source = 'IMPORTED'
    AND q.created_by = v_batch.created_by
    AND q.created_at >= v_batch.created_at
    AND q.created_at <= v_batch.created_at + interval '5 minutes';

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'Cannot roll back: % questions from this batch are linked to mock tests', v_deleted;
  END IF;

  DELETE FROM public.questions
  WHERE source = 'IMPORTED'
    AND created_by = v_batch.created_by
    AND created_at >= v_batch.created_at
    AND created_at <= v_batch.created_at + interval '5 minutes';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  UPDATE public.import_batches
  SET status = 'ROLLED_BACK'
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('deleted', v_deleted, 'batch_id', p_batch_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rollback_import_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_import_batch(uuid) TO authenticated;
