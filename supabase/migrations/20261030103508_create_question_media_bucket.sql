/*
# Create private question-media storage bucket

1. New Storage
- `question-media`: private bucket for question paper PDFs and question images.
  - Public access is off. Files are read through short-lived signed URLs.
  - Allowed MIME types: application/pdf, image/png, image/jpeg, image/webp.
  - Size limit: 15 MB per file.

2. Security
- Only staff (is_staff()) may insert, select, or delete objects in this bucket.
- No policy for anon, and no policy for ordinary students.
- No update policy: files are replaced by uploading a new object and deleting the old one.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-media',
  'question-media',
  false,
  15728640,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "staff_insert_question_media" ON storage.objects;
CREATE POLICY "staff_insert_question_media" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'question-media' AND is_staff());

DROP POLICY IF EXISTS "staff_select_question_media" ON storage.objects;
CREATE POLICY "staff_select_question_media" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'question-media' AND is_staff());

DROP POLICY IF EXISTS "staff_delete_question_media" ON storage.objects;
CREATE POLICY "staff_delete_question_media" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'question-media' AND is_staff());
