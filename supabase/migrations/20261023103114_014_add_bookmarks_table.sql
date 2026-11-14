/*
# Add question bookmarks table

1. New Tables
- `question_bookmarks`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `question_id` (uuid, not null, references questions)
  - `attempt_id` (uuid, nullable, references attempts — optional context for where the bookmark was made)
  - `note` (text, nullable — optional student note)
  - `created_at` (timestamptz, defaults to now())
  - Unique constraint on (user_id, question_id) to prevent duplicate bookmarks

2. Security
- Enable RLS on `question_bookmarks`.
- Grant SELECT, INSERT, UPDATE, DELETE to `authenticated` only (this is a signed-in app).
- Owner-scoped CRUD: each authenticated user can only access their own bookmarks.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy the policy.

3. Indexes
- Index on `user_id` for fast retrieval of a user's bookmarks.
- Index on `question_id` for checking if a question is already bookmarked.
*/

CREATE TABLE IF NOT EXISTS question_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES attempts(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

ALTER TABLE question_bookmarks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON question_bookmarks TO authenticated;

DROP POLICY IF EXISTS "select_own_bookmarks" ON question_bookmarks;
CREATE POLICY "select_own_bookmarks"
  ON question_bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON question_bookmarks;
CREATE POLICY "insert_own_bookmarks"
  ON question_bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookmarks" ON question_bookmarks;
CREATE POLICY "update_own_bookmarks"
  ON question_bookmarks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON question_bookmarks;
CREATE POLICY "delete_own_bookmarks"
  ON question_bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_question_bookmarks_user_id ON question_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_question_bookmarks_question_id ON question_bookmarks(question_id);
