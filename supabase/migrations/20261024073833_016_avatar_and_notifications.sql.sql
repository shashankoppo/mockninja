-- Add avatar and notification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS notif_mock_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_streak_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_report boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_leaderboard_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_new_tests boolean NOT NULL DEFAULT true;

GRANT UPDATE (avatar_url, notif_mock_reminders, notif_streak_alerts, notif_weekly_report, notif_leaderboard_updates, notif_new_tests) ON public.profiles TO authenticated;

-- Create avatars storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own avatar" ON storage.objects;
CREATE POLICY "Users read own avatar" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
