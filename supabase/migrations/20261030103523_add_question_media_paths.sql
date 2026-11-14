/*
# Add media path columns for question papers and question images

1. Modified Tables
- `mock_tests.question_paper_path` (text, nullable): storage path of the uploaded question paper PDF in the `question-media` bucket.
- `questions.image_path` (text, nullable): storage path of the question image in the `question-media` bucket.

2. Security
- No new policies. Existing staff-only policies on these tables and on the bucket continue to apply.
- Students do not read these columns in this migration.
*/

ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS question_paper_path text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_path text;
