/*
# Performance: fix duplicate index and add critical FK indexes

1. Duplicate index
- `questions` has two identical indexes on `chapter_id`: `idx_questions_chapter` and `idx_questions_chapter_id`. Drop `idx_questions_chapter_id` (keep the one matching the FK name).

2. Foreign key indexes
- Add indexes on the most commonly joined FK columns: attempts(mock_test_id), mock_test_questions(mock_test_id), user_daily_mocks(user_id, mock_test_id), user_subscriptions(user_id), transactions(user_id), responses(attempt_id), question_reports(question_id), test_feedback(attempt_id), integrity_events(attempt_id), question_bookmarks(attempt_id).

3. Notes
- `CREATE INDEX IF NOT EXISTS` makes the migration idempotent.
- Dropping an index is safe and does not lose data.
*/

DROP INDEX IF EXISTS public.idx_questions_chapter_id;

CREATE INDEX IF NOT EXISTS idx_attempts_mock_test_id ON public.attempts (mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mtq_mock_test_id ON public.mock_test_questions (mock_test_id);
CREATE INDEX IF NOT EXISTS idx_udm_user_mock ON public.user_daily_mocks (user_id, mock_test_id);
CREATE INDEX IF NOT EXISTS idx_usubs_user_id ON public.user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_txn_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_responses_attempt_id ON public.responses (attempt_id);
CREATE INDEX IF NOT EXISTS idx_qreports_question_id ON public.question_reports (question_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attempt_id ON public.test_feedback (attempt_id);
CREATE INDEX IF NOT EXISTS idx_integrity_attempt_id ON public.integrity_events (attempt_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_attempt_id ON public.question_bookmarks (attempt_id);
