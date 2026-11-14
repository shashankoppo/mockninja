/*
# Add Email OTP Verification Toggle to Admin Settings

## Purpose
Adds a platform_settings key `feature_email_otp` so admins can enable/disable
the email OTP verification requirement after signup. When enabled, new users
must enter a 6-digit code sent to their email before accessing the platform.
When disabled, signup goes straight to onboarding.

## Changes
1. Inserts a new row into `platform_settings` with key `feature_email_otp`
   and value `{ "enabled": true }` (OTP verification ON by default).
2. Uses `ON CONFLICT (key) DO NOTHING` so re-running is safe.

## Security
- No new tables or RLS changes.
- The `platform_settings` table already has admin-only write policies.
- The `anon` role can read this setting (needed so the signup page can check
  whether OTP is required before the user is authenticated).
*/

INSERT INTO platform_settings (key, value, updated_at)
VALUES ('feature_email_otp', '{"enabled": true}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
