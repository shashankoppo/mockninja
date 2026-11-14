# Mock Ninja — Update Audit

**Date:** 2026-10-23
**Framework:** Vite 7.3 + React 18 + TypeScript 5.5 + Tailwind 3.4
**Backend:** Supabase (Postgres + Auth + Edge Functions)
**Auth:** Supabase email/password, `AuthProvider` context, roles `STUDENT | EDITOR | ADMIN`

---

## Route Mapping (Prompts A–D)

| Route | Exists? | Fully functional? | Real backend data? | Action |
|---|---|---|---|---|
| `/` (Homepage) | Yes (`LandingPage.tsx`) | Partial — static content, hard-coded testimonials/belts, no sections 4–23 from CMS | Partial — `HeroSection.tsx` uses CMS but `LandingPage.tsx` is static | **UPDATE** |
| `/login` | Yes (`LoginPage.tsx`) | Yes | Yes (Supabase Auth) | **KEEP** |
| `/signup` | Yes (`SignupPage.tsx`) | Yes | Yes | **KEEP** |
| `/onboarding` | Yes (`OnboardingPage.tsx`) | Yes | Yes | **KEEP** |
| `/trust` | Yes (`TrustPage.tsx`) | Yes | Static content | **KEEP** |
| `/privacy` | Yes (`PrivacyPage.tsx`) | Yes | Static content | **KEEP** |
| `/terms` | Yes (`TermsPage.tsx`) | Yes | Static content | **KEEP** |
| **— Public Website (Prompt B) —** | | | | |
| `/mock-tests` | No (existing `/mocks` is student-only) | No | N/A | **CREATE** |
| `/mock-tests/full-length` | No | No | N/A | **CREATE** |
| `/mock-tests/sectional` | No | No | N/A | **CREATE** |
| `/previous-year-papers` | No | No | N/A | **CREATE** |
| `/chapters` | No | No | N/A | **CREATE** |
| `/revision-vault` | No | No | N/A | **CREATE** |
| `/dpp` | No | No | N/A | **CREATE** |
| `/pricing` | No | No | N/A | **CREATE** |
| `/faq` | No | No | N/A | **CREATE** |
| `/contact` | No | No | N/A | **CREATE** |
| `/refund-policy` | No | No | N/A | **CREATE** |
| **— Student Portal (Prompt C) —** | | | | |
| `/dashboard` | Yes (`DashboardPage.tsx`) | Partial — stat cards, daily mock, recent attempts; missing guided first-test for new accounts | Yes (Supabase + edge functions) | **UPDATE** |
| `/mocks` | Yes (`MocksPage.tsx`) | Partial — filter sidebar, mock cards; missing custom-generator, full-length/sectional split | Yes | **UPDATE** |
| `/mocks/:id` | Yes (`MockDetailPage.tsx`) | Partial | Yes | **UPDATE** |
| `/mocks/full-length` | No | No | N/A | **CREATE** |
| `/mocks/sectional` | No | No | N/A | **CREATE** |
| `/mocks/custom-generator` | No | No | N/A | **CREATE** |
| `/exam/:attemptId` | Yes (`ExamPage.tsx`, 918 lines) | Yes — NTA-style CBT, palette states, timer, auto-submit, fullscreen, integrity | Yes (edge function `exam`) | **KEEP** (verify legacy mode) |
| `/exam/:id/instructions` | Merged into ExamPage pre-start flow | Partial — PreStartFlow component exists | Yes | **UPDATE** (separate route) |
| `/exam/:id/live` | Merged into ExamPage | Same as `/exam/:attemptId` | Yes | **UPDATE** (split route) |
| `/results/:attemptId` | Yes (`ResultsPage.tsx`) | Partial — scorecard, subject breakdown, solutions; missing time-quality quadrant, weak/strong matrix, marks-lost analysis | Yes | **UPDATE** |
| `/results/:attemptId/solutions` | Merged into ResultsPage | Partial | Yes | **UPDATE** (separate route) |
| `/exam/:attemptId/reattempt` | No (edge function exists) | No — `mistake-reattempt` edge fn exists but no UI | Yes | **CREATE** |
| `/performance` | Yes (`ProgressPage.tsx`) | Partial — score trend, subject accuracy | Yes | **UPDATE** |
| `/mastery` | No (data in `mastery_scores` table) | No — belt logic in DB, no UI page | Yes | **CREATE** |
| `/leaderboard` | Yes (`LeaderboardPage.tsx`) | Partial | Yes (`get_leaderboard` RPC) | **UPDATE** |
| `/study-plan` | No | No | N/A | **CREATE** |
| `/mistake-notebook` | No | No | N/A | **CREATE** |
| `/dpp` (student) | No | No | N/A | **CREATE** |
| `/resources` | No | No | N/A | **CREATE** |
| `/account` | No | No | N/A | **CREATE** |
| `/profile` | Yes (`SettingsPage.tsx` at `/settings`) | Partial | Yes | **UPDATE** |
| **— Admin Panel (Prompt D) —** | | | | |
| `/admin` | Yes (`AdminDashboardPage.tsx`) | Partial — 4 stat cards, quick actions, checklist | Yes (count queries) | **UPDATE** |
| `/admin/topics` | No | No | N/A | **CREATE** |
| `/admin/questions` | Yes (`AdminQuestionsPage.tsx`) | Partial — question management with KaTeX | Yes | **UPDATE** |
| `/admin/questions/import` | No | No | N/A | **CREATE** |
| `/admin/mocks` | Yes (`AdminMocksPage.tsx`) | Partial — test builder | Yes | **UPDATE** |
| `/admin/exam-settings` | No | No | N/A | **CREATE** |
| `/admin/attempts` | No | No | N/A | **CREATE** |
| `/admin/rankings` | No | No | N/A | **CREATE** |
| `/admin/proctoring` | No | No | N/A | **CREATE** |
| `/admin/watermarks` | No | No | N/A | **CREATE** |
| `/admin/users` | No | No | N/A | **CREATE** |
| `/admin/billing` | No | No | N/A | **CREATE** |
| `/admin/resources` | No | No | N/A | **CREATE** |
| `/admin/content` | No (homepage_content table exists) | No — CMS table + RPCs exist, no admin UI | Yes | **CREATE** |
| `/admin/support` | No | No | N/A | **CREATE** |
| `/admin/analytics` | Yes (`AdminReportsPage.tsx`) | Partial | Partial | **UPDATE** |
| `/admin/settings` | No | No | N/A | **CREATE** |
| `/admin/ai` | Yes (`AdminAiPage.tsx`) | Partial — `FEATURE_AI = false` | No | **KEEP** (gated behind feature flag) |

---

## Homepage Section Inventory (Current)

The current `LandingPage.tsx` renders these sections in order:
1. Hero (with floating badges including "Daily practice" — **NOW REMOVED**)
2. Stats strip (3 subjects, 75 questions, 300 marks, daily smart practice)
3. NTA-style interface showcase (mock exam preview + palette legend)
4. Pillar cards (Question Bank, Mastery Tracking, Honest Scoring, Data Protection)
5. Test series cards (Full Syllabus, Subject-wise, Chapter)
6. Feature cards (i18n-driven, 3 cards)
7. Topper testimonials (hard-coded, not from CMS)
8. Data protection teaser
9. Belt ladder (White→Black, simple colored squares)
10. Final CTA

**Note:** `HeroSection.tsx` (feature-based, CMS-driven) exists but is NOT used by `LandingPage.tsx`. The static `LandingPage.tsx` is the rendered version.

---

## Data Models (Existing)

- **profiles** — user data with role, guardian consent
- **subjects** — Physics, Chemistry, Maths (seeded)
- **chapters** — 30 chapters (10 per subject, seeded)
- **questions** — 34 published questions with LaTeX, EN/HI fields
- **mock_tests** — 3 mock tests (full syllabus, physics subject, maths chapter)
- **mock_test_questions** — junction table
- **attempts** — exam attempts (status, score, timing)
- **responses** — per-question answers (is_correct, awarded_marks — server-set)
- **mastery_scores** — belt tracking per chapter (belt_level, total_questions, correct_questions)
- **user_daily_mocks** — daily target mock assignments
- **focus_topics** — student-selected focus areas (max 5)
- **public_profiles** — leaderboard display names
- **notification_log** — notifications
- **ai_usage_ledger** — AI usage tracking
- **testimonials** — CMS testimonials (from migration 012)
- **faqs** — CMS FAQs (from migration 012)
- **homepage_content** — CMS homepage config (from migration 012)

## Edge Functions (Existing)

1. **exam** — start, get, save, submit, results (service role, JWT-verified)
2. **daily-mock** — generate daily target mock from focus/weak topics
3. **mistake-reattempt** — reattempt incorrect/unanswered questions
4. **guardian-consent** — guardian consent email flow

## RLS & Security

- All tables have RLS enabled (migration 002)
- Students can only see their own data + published mocks
- Staff have full CRUD via `is_staff()` check
- Students have NO direct access to questions table
- No direct writes to attempts/responses (edge functions only)
- SECURITY DEFINER RPCs for public homepage content (anon + authenticated)
- `is_staff()`, `can_go_public()`, `get_leaderboard()` — authenticated only
- `build_daily_target_mock()`, `refresh_mastery()` — service role only

## Billing

No billing/Stripe integration exists yet. No `/pricing` page. Entitlements are `FREE | PREMIUM` in the `mock_tests` table but no payment processor is configured.

## Test Engine

The exam player (`ExamPage.tsx`) implements:
- NTA-style 5-state palette (Not Visited, Not Answered, Answered, Marked, Answered+Marked)
- Subject tabs (Physics/Chemistry/Maths) with Section A (MCQ) / Section B (Numerical)
- Server-authoritative timer via edge function
- Fullscreen enforcement + integrity strikes (3-strike auto-submit)
- KaTeX rendering, on-screen numerical keypad
- Save & Next, Mark for Review, Clear Response
- Submit confirmation modal with per-subject summary
- Auto-submit on time expiry
- Mobile palette drawer

**Missing:** Legacy mode (section_max_attempts locking for 2021-2024 PYQ pattern) not yet implemented.

## Known Gaps

1. No public website pages (Prompt B routes) — all missing
2. No billing/pricing system
3. No `/ai-practice` route (gated behind `FEATURE_AI = false`)
4. Homepage sections 4–23 not implemented (current homepage has ~10 static sections)
5. Most admin panel pages (Prompt D) missing
6. Several student portal pages missing (mastery, study-plan, mistake-notebook, resources, account, reattempt)
7. Legacy PYQ section_max_attempts locking not implemented
8. No WhatsApp floating button
9. No refund-policy page
10. Belt visuals are simple colored squares, not fabric-textured SVG/CSS

---

## Changes Made This Session

1. **Removed "Daily practice" floating badge** from hero section in `LandingPage.tsx` (was a decorative label with PencilLine icon at bottom-left of hero visual, not a text input).
2. **Removed unused `PencilLine` import** from `lucide-react` in `LandingPage.tsx`.
