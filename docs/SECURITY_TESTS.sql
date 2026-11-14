-- MOCK NINJA — Security Tests (docs/SECURITY_TESTS.sql)
--
-- These tests verify the RLS policies and function permissions from
-- migrations 001–004. They must be run with two test users A and B
-- (both STUDENT role) created via Supabase Auth.
--
-- Replace USER_A_UUID and USER_B_UUID with the actual auth user IDs.
-- Run each block by setting the local role to simulate the authenticated user.
--
-- Expected: every test below should PASS (the action is DENIED or returns
-- zero rows as indicated).

-- =============================================================
-- SETUP: Create test data (run as service role / postgres)
-- =============================================================
-- Insert subjects and a chapter for testing
INSERT INTO subjects (id, name) VALUES (1, 'Physics'), (2, 'Chemistry'), (3, 'Mathematics')
  ON CONFLICT DO NOTHING;

INSERT INTO chapters (id, subject_id, name, class_level, ordinal) VALUES
  (1, 1, 'Kinematics', 11, 1),
  (2, 1, 'Laws of Motion', 11, 2),
  (3, 1, 'Work, Energy and Power', 11, 3),
  (4, 2, 'Atomic Structure', 11, 1),
  (5, 2, 'Chemical Bonding', 11, 2),
  (6, 3, 'Complex Numbers', 11, 1),
  (7, 3, 'Quadratic Equations', 11, 2)
  ON CONFLICT DO NOTHING;

-- =============================================================
-- TEST 1: A cannot read B's student_focus_topics
-- =============================================================
-- As user A:
--   SET LOCAL role TO authenticated; SET LOCAL request.jwt.claims TO '{"sub":"USER_A_UUID"}';
--   SELECT * FROM student_focus_topics WHERE user_id = 'USER_B_UUID';
-- Expected: 0 rows

-- =============================================================
-- TEST 2: A cannot read B's mastery_scores
-- =============================================================
-- As user A: SELECT * FROM mastery_scores WHERE user_id = 'USER_B_UUID';
-- Expected: 0 rows

-- =============================================================
-- TEST 3: A cannot read B's attempts
-- =============================================================
-- As user A: SELECT * FROM attempts WHERE user_id = 'USER_B_UUID';
-- Expected: 0 rows

-- =============================================================
-- TEST 4: A cannot read B's responses (via attempt ownership)
-- =============================================================
-- As user A: SELECT r.* FROM responses r JOIN attempts a ON a.id = r.attempt_id
--   WHERE a.user_id = 'USER_B_UUID';
-- Expected: 0 rows

-- =============================================================
-- TEST 5: A cannot UPDATE responses.is_correct
-- =============================================================
-- No UPDATE policy exists on responses for authenticated users.
-- As user A: UPDATE responses SET is_correct = true WHERE ...;
-- Expected: ERROR — row-level security policy

-- =============================================================
-- TEST 6: A cannot UPDATE attempts.score
-- =============================================================
-- No UPDATE policy exists on attempts for authenticated users.
-- As user A: UPDATE attempts SET score = 300 WHERE ...;
-- Expected: ERROR — row-level security policy

-- =============================================================
-- TEST 7: A cannot SELECT from questions
-- =============================================================
-- As user A: SELECT count(*) FROM questions;
-- Expected: 0 rows (no SELECT policy for students)

-- =============================================================
-- TEST 8: A (authenticated) calling build_daily_target_mock is denied
-- =============================================================
-- As user A: SELECT build_daily_target_mock('USER_A_UUID', 15, 0.7, CURRENT_DATE);
-- Expected: ERROR — permission denied / function not callable

-- =============================================================
-- TEST 9: A (authenticated) calling refresh_mastery is denied
-- =============================================================
-- As user A: SELECT refresh_mastery('USER_A_UUID');
-- Expected: ERROR — permission denied / function not callable

-- =============================================================
-- TEST 10: A cannot set guardian_consent_at on own profile
-- =============================================================
-- As user A: UPDATE profiles SET guardian_consent_at = now() WHERE id = 'USER_A_UUID';
-- Expected: ERROR — Students cannot set their own guardian consent

-- =============================================================
-- TEST 11: A cannot set role on own profile
-- =============================================================
-- As user A: UPDATE profiles SET role = 'ADMIN' WHERE id = 'USER_A_UUID';
-- Expected: ERROR — Students cannot change their role

-- =============================================================
-- TEST 12: A cannot insert a 6th focus topic
-- =============================================================
-- As user A: Insert 5 focus topics, then attempt a 6th.
-- Expected: ERROR — You can pick at most 5 focus topics.

-- =============================================================
-- TEST 13: get_leaderboard returns no rows when fewer than 30 opted-in users
-- =============================================================
-- SELECT count(*) FROM get_leaderboard(1, 50, 30);
-- Expected: 0 rows (fewer than 30 opted-in students)

-- =============================================================
-- TEST 14: Server grades only ANSWERED and ANSWERED_MARKED
-- =============================================================
-- The exam submit Edge Function (supabase/functions/exam/index.ts)
-- grades any response where `answer !== null`. In the exam UI,
-- the committedAnswer is what gets saved to the server:
--   - ANSWERED: committedAnswer is set, flagged=false → graded
--   - ANSWERED_MARKED: committedAnswer is set, flagged=true → graded
--   - NOT_ANSWERED: committedAnswer is null → not graded
--   - MARKED: committedAnswer is null → not graded
--   - NOT_VISITED: no response row → not graded
--
-- SQL verification (run as service_role):
-- 1. Create an attempt with 5 questions.
-- 2. Insert responses:
--    Q1: answer='opt_1', flagged=false  (ANSWERED)
--    Q2: answer='opt_3', flagged=true   (ANSWERED_MARKED)
--    Q3: answer=null,    flagged=false  (NOT_ANSWERED)
--    Q4: answer=null,    flagged=true   (MARKED)
--    Q5: no row                          (NOT_VISITED)
-- 3. Call the submit action via the Edge Function.
-- 4. Query responses:
--    SELECT question_id, is_correct, awarded_marks FROM responses WHERE attempt_id = '...';
-- Expected:
--    Q1: is_correct is true/false, awarded_marks is +4 or -1 (graded)
--    Q2: is_correct is true/false, awarded_marks is +4 or -1 (graded)
--    Q3: is_correct is null, awarded_marks is 0 (not graded)
--    Q4: is_correct is null, awarded_marks is 0 (not graded)
--    Q5: no row exists (not graded)
--
-- This confirms that only ANSWERED and ANSWERED_MARKED are evaluated.

-- =============================================================
-- TEST 15: Deletion coverage — every user-referencing table is in the manifest
-- =============================================================
-- This test FAILS if any table with a FK to profiles or auth.users is missing
-- from the delete_user_data function AND lacks ON DELETE CASCADE or SET NULL.
--
-- Run as service_role:
-- SELECT t.table_name, t.column_name, tc.delete_rule
-- FROM information_schema.columns t
-- JOIN information_schema.key_column_usage kcu
--   ON kcu.table_name = t.table_name AND kcu.column_name = t.column_name
-- JOIN information_schema.table_constraints tc
--   ON tc.constraint_name = kcu.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
-- WHERE t.table_schema = 'public'
--   AND (
--     kcu.referenced_table_name = 'profiles'
--     OR kcu.referenced_table_name = 'auth.users'
--   )
-- ORDER BY t.table_name;
--
-- Expected: every returned table is either:
--   (a) handled in delete_user_data (see the manifest list), OR
--   (b) has ON DELETE CASCADE or SET NULL (so deleting the profile row handles it)
--
-- If a new table is added with a user FK and is NOT in the manifest and has
-- ON DELETE NO ACTION, this test must fail. The test script should:
-- 1. Run the query above.
-- 2. For each result, check if delete_user_data handles it OR delete_rule != 'NO ACTION'.
-- 3. If any table fails both checks, raise an error.
--
-- Manual verification steps:
-- 1. Create a test user with rows in every table (responses, attempts, mastery_scores,
--    student_focus_topics, user_daily_mocks, question_reports, test_feedback, etc.)
-- 2. Call delete_user_data(test_user_id).
-- 3. Assert zero rows remain for that user_id in every table.
-- 4. Assert transactions/refund_requests/user_subscriptions have user_id = NULL (anonymised).
-- 5. Assert deletion_audit has a row with the subject_hash and no email/name.
-- 6. Assert no auth.users row remains after the edge function runs.
