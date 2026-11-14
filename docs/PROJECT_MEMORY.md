# MOCK NINJA — Project Memory

> Append-only. Never edit old entries; mark them SUPERSEDED. The SQL migrations are the source of truth for schema.

## Product snapshot

MOCK NINJA: independent JEE Main/Advanced PCM mock-test and practice platform. Not affiliated with NTA or any government body. Honest trust: real security, no fake badges.

Stack: React 18 + Vite + TypeScript + Tailwind + shadcn-style primitives + KaTeX; Supabase (Postgres, Auth, RLS, Edge Functions, Storage, pg_cron).

Phases: 1 Foundation, 2 Database+security, 3 Auth+consent, 4 Question bank+catalogue, 5 Exam engine+grading, 6 Results+mastery, 7 Focus topics+Daily Target Mock, 8 Leaderboard+share+nudges, 9 AI studio, 10 Trust centre+launch QA.

## Locked decisions (do not change without a new DECISIONS.md entry)

- Correct answers and solutions never reach the client before submission.
- Grading, mastery, ranks and consent flags are written only by server functions.
- Server owns the timer. Client timer is cosmetic.
- MCQ answers are option ids. Numerical answers use tolerance rules stored on the question.
- Daily mock date is computed in Asia/Kolkata.
- Personal mocks (kind DAILY_TARGET, MISTAKE_REATTEMPT, CUSTOM_TOPICS, AI_STUDIO) are PRIVATE and never in the public catalogue.
- Leaderboard and sharing are opt-in, handle-only, minimum cohort 30, and require can_go_public.
- AI-generated questions enter as REVIEW and do not count toward mastery until PUBLISHED.
- No webcam or microphone in v1.

## Phase log

### Phase 1, 2026-10-21
- Built: App shell, routes, design system (Tailwind tokens, UI primitives), i18n (EN/HI), KaTeX math wrapper, layouts (Public/Student/Admin), landing page, error/offline/empty/error states, dev gallery pages (/dev/ui, /dev/math). No database tables, no auth.
- Key files: tailwind.config.js, src/index.css, src/lib/supabase.ts, src/lib/utils.ts, src/components/ui/* (Button, Card, Dialog, Tabs, Badge, Progress, Toast, Tooltip, Skeleton), src/components/Math.tsx, src/components/common/* (ErrorBoundary, OfflineBanner, EmptyState, ErrorState, LanguageSwitcher), src/layouts/* (PublicLayout, StudentLayout, AdminLayout), src/pages/* (Landing + placeholders for all routes), src/i18n/*, src/App.tsx, src/main.tsx.
- Tables / functions / routes added: No DB tables. Routes: /, /login, /signup, /dashboard, /mocks, /mocks/:id, /exam/:attemptId, /results/:attemptId, /focus, /progress, /leaderboard, /settings, /trust, /privacy, /terms, /admin, /admin/questions, /admin/mocks, /admin/ai, /admin/reports, /dev/ui, /dev/math, * (404).
- Env var names added (names only): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Stubbed or TODO: All route pages are styled placeholders awaiting real logic. Auth, DB, exam engine, grading, AI studio not yet implemented.
- Known bugs: (none)
- Prerequisites for next phase: Phase 2 needs a dev Supabase project (present), plus the real Patch 1 and Patch 2 SQL files from the operator.

### Phase 2, 2026-10-21
- Built: Full database schema across 9 migrations (001–009). Base tables (profiles, subjects, chapters, questions, mock_tests, mock_test_questions, attempts, responses). Hardening (RLS on all 14 tables, is_staff(), guard_profile_columns trigger, student vs staff policies). Patch 2 (student_focus_topics, mastery_scores, user_daily_mocks, public_profiles, notification_log, ai_usage_ledger, profile columns for age/consent/nudges, questions.source/ai_validation_json/statement_hash/reviewed_by, mock_tests.kind/owner_user_id/visibility/meta_json/marking_scheme). Functions: is_staff(), can_go_public(), refresh_mastery(), build_daily_target_mock() with advisory lock, get_leaderboard(), enforce_max_focus_topics(), guard_profile_columns(), handle_new_user(). View: v_inactive_for_nudge. Security tests written in docs/SECURITY_TESTS.sql.
- Key files: docs/SCHEMA_CONTRACT.md (full schema index), docs/SECURITY_TESTS.sql, supabase/migrations/* (9 migration files recorded by MCP tool).
- Tables / functions / routes added: 14 tables (profiles, subjects, chapters, questions, mock_tests, mock_test_questions, attempts, responses, student_focus_topics, mastery_scores, user_daily_mocks, public_profiles, notification_log, ai_usage_ledger). 8 functions. 1 view. No new routes (Phase 1 routes unchanged).
- Env var names added (names only): (none new — same as Phase 1).
- Stubbed or TODO: responses.is_correct and awarded_marks (Phase 5). Edge Functions (Phase 3+). Storage buckets (Phase 4). Cron jobs (Phase 5+). app_settings table (Phase 9).
- Known bugs: Advisor may cache v_inactive_for_nudge as SECURITY DEFINER (fixed in migration 009). get_leaderboard and is_staff SECURITY DEFINER warnings are intentional.
- Prerequisites for next phase: Phase 3 (auth) needs the profiles table (present) and guardian_consent_at column (present). Edge Functions for consent flow will be built in Phase 3.

### Phase 3, 2026-10-21
- Built: Full auth flow — AuthProvider context (session, profile, onAuthStateChange, needsOnboarding flag), ProtectedRoute guard (redirects unauthenticated to /login, redirects to /onboarding when profile incomplete, role-based access for admin routes), PublicOnlyRoute (redirects authenticated users away from login/signup). Real email/password login and signup pages with validation. 3-step onboarding flow (name + birth year → entry source + referral → guardian consent for minors under 18). Guardian consent Edge Function deployed (sets guardian_consent_at via service role, logs notification, CORS-compliant). StudentLayout updated with user name display + logout button. All auth/onboarding i18n keys added in EN + HI.
- Key files: src/lib/auth.tsx (AuthProvider, useAuth), src/components/auth/ProtectedRoute.tsx, src/components/auth/LoadingScreen.tsx, src/pages/auth/LoginPage.tsx, src/pages/auth/SignupPage.tsx, src/pages/auth/OnboardingPage.tsx, supabase/functions/guardian-consent/index.ts, supabase/config.toml, src/App.tsx (rewired with AuthProvider + guards), src/layouts/StudentLayout.tsx (user info + logout), src/i18n/en.ts + hi.ts (auth/onboarding keys).
- Tables / functions / routes added: No new tables. 1 Edge Function (guardian-consent). New route: /onboarding. All student + admin routes now wrapped in ProtectedRoute with role checks.
- Env var names added (names only): (none new).
- Stubbed or TODO: SettingsPage still a placeholder (profile editing, data download/delete, notification prefs arrive later). Guardian consent email sending is logged but not actually sent (needs notification service). Referral code not yet stored (no column for it — Phase 4+ if needed).
- Known bugs: (none).
- Prerequisites for next phase: Phase 4 needs question bank tables (present) and admin question management UI.

### Phase 4, 2026-10-22
- Built: Seeded 3 subjects + 30 chapters (JEE PCM, class 11/12). Admin question bank with full CRUD — create/edit/delete questions, MCQ + numerical types, KaTeX live preview, filters by subject/difficulty/status, search, publish workflow. Admin mock builder with full CRUD — create/edit/delete mocks, category/mode/duration/marks/access/status, custom marking scheme (MCQ + numerical correct/wrong), question picker dialog to link published questions to mocks. Student mock catalogue — browse published public mocks, filter by category, search, card grid with duration/marks/question count. Student mock detail page — instructions, stats grid, marking scheme display, rules, Start button that creates an attempt and navigates to exam. Shared types module + React Query hooks for subjects, chapters, questions, mocks. All i18n keys added in EN + HI.
- Key files: src/lib/types.ts (shared domain types), src/lib/queries.ts (React Query hooks), src/pages/admin/AdminQuestionsPage.tsx (full question CRUD + KaTeX preview), src/pages/admin/AdminMocksPage.tsx (mock CRUD + question picker), src/pages/student/MocksPage.tsx (catalogue), src/pages/student/MockDetailPage.tsx (instructions + start attempt), src/i18n/en.ts + hi.ts (Phase 4 keys), supabase/migrations/010_seed_subjects_chapters.sql.
- Tables / functions / routes added: No new tables. 1 migration (seed data). No new routes (existing /admin/questions, /admin/mocks, /mocks, /mocks/:id now have real content).
- Env var names added (names only): (none new).
- Stubbed or TODO: ExamPage still placeholder (Phase 5 — the Start button on mock detail creates an attempt and navigates to /exam/:attemptId, but the exam screen itself is not built). AdminDashboardPage still placeholder. Question count on mock detail shows "?" (needs query through mock_test_questions). No bulk import or duplicate detection yet.
- Known bugs: (none).
- Prerequisites for next phase: Phase 5 needs attempts table (present), responses table (present), is_correct/awarded_marks columns (NOT yet added — need migration), and the exam engine UI + server grading function.

### Phase 5, 2026-10-22
- Built: Migration 011 added is_correct + awarded_marks to responses. Exam Edge Function (supabase/functions/exam) with 5 actions: start (create attempt, dedupe in-progress), get (fetch questions without answers + saved responses), save (autosave single response), submit (grade all responses server-side using mock marking scheme, set score + status), results (fetch graded attempt with answers + solutions for review). NTA-style exam screen with question palette (answered/not-answered/flagged/not-visited color states), countdown timer with auto-submit on timeout, MCQ option selection, numerical answer input, flag for review, prev/next navigation, autosave on question switch, submit confirmation modal showing answered/total counts. Results page with score card (score/total, percentage, correct/wrong/skipped counts), per-subject breakdown, question review with filters (all/correct/wrong/unattempted), correct vs student answer display, solution explanations. Dashboard page with resume in-progress attempt card, last score card, quick action cards (mocks/progress/focus), recent attempts list. Shared exam-api module for all Edge Function calls. All i18n keys in EN + HI.
- Key files: src/lib/exam-api.ts (Edge Function client), src/pages/student/ExamPage.tsx (full exam interface), src/pages/student/ResultsPage.tsx (scorecard + review), src/pages/student/DashboardPage.tsx (home dashboard), src/pages/student/MockDetailPage.tsx (updated start handler to use Edge Function), src/i18n/en.ts + hi.ts (Phase 5 keys), supabase/functions/exam/index.ts (5-action Edge Function), supabase/migrations/011_add_grading_columns.sql.
- Tables / functions / routes added: 1 migration (grading columns). 1 Edge Function deployed (exam). No new routes — existing /exam/:attemptId, /results/:attemptId, /dashboard now have real content.
- Env var names added (names only): (none new — uses SUPABASE_URL which is VITE_SUPABASE_URL in client).
- Stubbed or TODO: ProgressPage, FocusPage, LeaderboardPage still placeholders (Phase 6+). SettingsPage still placeholder. AdminDashboardPage still placeholder. No proctoring yet. No re-attempt mistakes feature yet.
- Known bugs: (none).
- Prerequisites for next phase: Phase 6 needs progress analytics (aggregate from attempts + responses), focus topics (weakest chapters), and leaderboard.

### Phase 6, 2026-10-22
- Built: ProgressPage with mastery belt matrix (grouped by subject, belt legend, per-chapter score/evidence count), score trend bar chart (last 10 attempts with color-coded bars), summary cards (last score with trend arrow, mocks taken, rated chapters), strengths & weaknesses panels (top/bottom 3 rated chapters by score). FocusPage with searchable chapter picker (filter by chapter/subject name), up to 5 focus topics with reorder (up/down buttons), current belt display per topic, add/remove with React Query invalidation. LeaderboardPage with subject tabs, opt-in status card, handle-only rankings from get_leaderboard RPC, rank highlighting (gold/silver/bronze), "you" indicator on own row. Exam Edge Function now calls refresh_mastery after submit to update belt scores automatically. All i18n keys in EN + HI.
- Key files: src/pages/student/ProgressPage.tsx, src/pages/student/FocusPage.tsx, src/pages/student/LeaderboardPage.tsx, src/i18n/en.ts + hi.ts (Phase 6 keys), supabase/functions/exam/index.ts (added refresh_mastery call).
- Tables / functions / routes added: No new migrations. No new Edge Functions. No new routes — existing /progress, /focus, /leaderboard now have real content. Uses existing tables: mastery_scores, student_focus_topics, public_profiles, get_leaderboard RPC, refresh_mastery RPC.
- Env var names added: (none).
- Stubbed or TODO: SettingsPage still placeholder. AdminDashboardPage still placeholder. No daily target mock generation yet (Phase 7). No public profile opt-in UI from settings yet (Phase 8). No re-attempt mistakes feature yet.
- Known bugs: (none).
- Prerequisites for next phase: Phase 7 needs daily target mock generation (build_daily_target_mock via Edge Function), settings page with real content (profile, preferences, data export).

### Phase 7, 2026-10-22
- Built: Daily-mock Edge Function (supabase/functions/daily-mock) that fetches user's daily_mock_size, computes IST date, checks for existing daily mock, calls build_daily_target_mock RPC if none exists, returns mock_test_id. Dashboard daily target mock card — shows today's daily mock with duration/marks, or generate button if none exists; tracks whether attempt is in-progress/submitted/not-started and shows appropriate action button. SettingsPage fully built — profile name editing, email display, daily mock size selector (10/15/20/30), email nudges toggle, language switcher (EN/HI), public profile section with handle display + leaderboard opt-in toggle + share card opt-in toggle, data export (downloads JSON of all attempts/responses/mastery/focus). Added dailyMockGenerate to exam-api module. All i18n keys in EN + HI.
- Key files: supabase/functions/daily-mock/index.ts, src/pages/student/SettingsPage.tsx (full settings), src/pages/student/DashboardPage.tsx (added daily mock card + daily attempt tracking), src/lib/exam-api.ts (added dailyMockGenerate), src/i18n/en.ts + hi.ts (Phase 7 keys), supabase/config.toml (added daily-mock function config).
- Tables / functions / routes added: No new migrations. 1 Edge Function deployed (daily-mock). No new routes. Uses existing: build_daily_target_mock RPC, user_daily_mocks table, public_profiles table, profiles columns (daily_mock_size, email_nudges).
- Env var names added: (none).
- Stubbed or TODO: AdminDashboardPage still placeholder. No mistake re-attempt feature yet. No pg_cron job for daily mock auto-generation yet (manual generate for now). Account deletion not implemented (data export only).
- Known bugs: (none).
- Prerequisites for next phase: Phase 8 needs admin dashboard with real stats, mistake re-attempt mock, and any remaining polish.

### Phase 5B, 2026-10-22
- Built: NTA-faithful exam environment replacing the Phase 5 exam screen. Pre-start flow (Welcome screen with test details + marking scheme, 4-page General Instructions with palette legend and rules, Declaration page with checkbox gate). NTA-style question header strip showing Question No., marks correct/negative, question type. MCQ options labelled (1)-(4) instead of A-D (internal ids remain stable). On-screen numerical keypad (0-9, decimal, minus, backspace, clear) replacing physical keyboard input in strict mode. NTA palette symbol shapes: not-visited (grey rounded square), not-answered (red flat-top pointed-bottom), answered (green pointed-top flat-bottom), marked (purple circle), answered+marked (purple circle with green check). Section tabs (Section A MCQ / Section B Numerical) under subject tabs. Question Paper side panel (lists all questions of current subject, statement only). Instructions overlay (read-only, does not stop clock). Exam Summary table in submit modal (per-subject: total, answered, not answered, marked, answered+marked, not visited). Thank-you screen after submit (no answers shown). Time-up overlay with auto-submit. Fullscreen request on begin in EXAM mode + fullscreen exit logged with calm notice. beforeunload warning in EXAM mode. Footer disclaimer on every screen. Committed vs uncommitted answer state (selecting an option is NOT saved until Save & Next or Mark for Review & Next — STRICT). NumericalKeypad, PaletteSymbol, PreStartFlow components added.
- Key files: src/pages/student/ExamPage.tsx (full rewrite), src/components/exam/NumericalKeypad.tsx, src/components/exam/PaletteSymbol.tsx, src/components/exam/PreStartFlow.tsx, src/lib/exam-api.ts (added total_marks to ExamData), src/i18n/en.ts + hi.ts (Phase 5B keys), docs/NTA_FIDELITY_AUDIT.md.
- Tables / functions / routes added: No new migrations, tables, functions, or routes. Uses existing exam Edge Function.
- Env var names added: (none).
- Stubbed or TODO: statement_tex_hi for Hindi question text (needs migration). record_action Edge Function replacing save_response (Phase 5B spec item 5 — current save_response still used). get_attempt_state and get_attempt_summary RPCs (not yet created). IndexedDB offline queue (not yet implemented). integrity_events table (not yet created). JEE_ADVANCED exam profile (disabled stub). pg_cron auto-submit job. Unit tests for question-state function. Playwright tests.
- Known bugs: (none).
- Prerequisites for next phase: Phase 8 needs leaderboard opt-in UI from settings, public profile handle setup, share card, email nudges. Server-side changes (record_action, get_attempt_state, get_attempt_summary) should be added as a migration + Edge Function update before Phase 8.

## Open TODOs and stubs

- AdminDashboardPage real content (Phase 8+).
- AI question studio (Phase 9).
- Mistake re-attempt mock feature (Phase 8+).
- pg_cron daily mock auto-generation (future).
- Account deletion flow (future).

## Known bugs

- Advisor may still report v_inactive_for_nudge as SECURITY DEFINER due to caching; view was recreated WITH (security_invoker = true) in migration 009.
- get_leaderboard and is_staff remain SECURITY DEFINER by design (need cross-user reads). Advisor WARN is expected.

### Theme v2, 2026-10-26
- Built: Application-wide graphite theme refinement based on the approved Mock Ninja hero reference. Added persistent design reference and locked UI notes, CSS theme variables, Plus Jakarta Sans support, responsive tilted hero feature-card stack, truthful dash-based homepage statistics, dark glass shell surfaces, and reduced-motion handling.
- Key files: docs/DESIGN_REFERENCE.md, docs/LOCKED_UI.md, .bolt/prompt, src/index.css, src/layouts/PublicLayout.tsx, src/pages/LandingPage.tsx, src/i18n/en.ts, tailwind.config.js.
- Tables / functions / routes added: None.
- Env var names added: None.
- Stubbed or TODO: Visual geometry and Playwright screenshot baselines remain to be added when the reference image is uploaded into docs/reference/.
- Known bugs: None identified by typecheck or build.
- Prerequisites for next phase: If pixel-level comparison is required, upload the approved reference image and run the visual comparison step.

### Light application theme and exam surface, 2026-10-26
- Built: Replaced the app-wide forced dark utility overrides with a readable light surface system for public, student, and admin layouts. Preserved the locked reference hero/header treatment. Updated the exam pre-start header to a light NTA-inspired workspace while preserving the existing exam flow and controls.
- Key files: src/index.css, src/layouts/PublicLayout.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/components/exam/PreStartFlow.tsx.
- Tables / functions / routes added: None.
- Stubbed or TODO: Pixel-level hero changes remain blocked by the active locked UI rule until an explicit unlock message is provided.
- Known bugs: None identified at implementation time.

### Theme reference revalidation, 2026-10-26
- Revalidated the current public shell and landing hero against the supplied reference image. The graphite background, violet/magenta gradient, mint and amber accents, glass feature-card stack, assurance row, dash-based statistics, responsive behavior, and NTA independence disclaimer are already present.
- No visual code changes were made because the hero, header, feature cards, assurance row, and stats bar are locked UI areas under the active design rules.

### Theme v3, 2026-10-26
- Built: After an explicit unlock, refined the reference-matched public header, home hero, tilted feature stack, four-item assurance row, dark statistics bar, public shell, and footer. Added responsive mobile stacking and preserved the editable homepage content fallbacks and existing route behavior.
- Key files: src/layouts/PublicLayout.tsx, src/pages/LandingPage.tsx, src/index.css.
- Tables / functions / routes added: None.
- Verification: Production build and TypeScript check passed.

### Landing surface polish, 2026-10-26
- Built: Scoped landing-page surface treatment for the sections below the locked hero. Alternating sections now use a softer graphite mesh, translucent card surfaces, consistent borders, deeper glass shadows, and a restrained FAQ hover lift while preserving content, routes, and the footer disclaimer.
- Key files: src/pages/LandingPage.tsx, src/index.css.
- Tables / functions / routes added: None.
- Stubbed or TODO: The supplied hero remains unchanged because its visual structure is locked; a separate explicit unlock is required for any hero geometry changes.
- Known bugs: None identified by typecheck or build.

### Pre-login UX polish, 2026-10-26
- Built: Removed the public-header AI Practice and Mock Tests tabs as requested. Kept Test Series as the reference-aligned entry point, preserved all underlying routes, and strengthened the shared button system so primary, outline, secondary, destructive, and success actions have consistent motion, focus, hover, and depth feedback throughout the application.
- Scope: Shared UI controls and public/pre-login shell only; signed-in and admin navigation flows were not structurally changed.

### Hero feature tabs, 2026-10-26
- Built: Confirmed the visible hero renders Mock Tests, Chapter Practice, PYQs & DPP, and AI Doubt Solver in the supplied top-to-bottom order. Each card now opens its matching practice destination instead of sending every card to Mock Tests.
- Routes affected: None added or removed; existing destinations only.

### Full home-page dark theme unification, 2026-10-26
- Built: After an explicit unlock of all locked UI areas and the entire home page, unified every home-page section into the same dark graphite + glassmorphism system as the hero. Replaced all light `bg-navy-50` section backgrounds with transparent `.landing-section` containers over the graphite base, updated text colors from light `navy-900/600/500` to `white/navy-300/navy-400`, updated card backgrounds to translucent `bg-white/5` with `border-white/10`, updated accent colors to the violet/magenta/mint/amber system, and made the FreeOnMockNinja and PopularMockTests sections consistent with the dark surface. Updated ExamNavigator category pills, States error/skeleton components, and the NTA showcase preview to dark glassmorphic surfaces. Final CTA uses a violet gradient instead of solid govt blue.
- Key files: src/pages/LandingPage.tsx, src/features/home/components/ExamNavigatorSection.tsx, src/features/home/components/PopularMockTestsSection.tsx, src/features/home/components/States.tsx, src/index.css, docs/LOCKED_UI.md, docs/DECISIONS.md.
- Tables / functions / routes added: None.
- Verification: Production build passed. No UI verification tool available in this environment.
- Known bugs: None identified by build.

### Hero tab visibility, 2026-10-26
- Built: Increased the hero card stack contrast, width, stacking order, spacing, and responsive sizing so all four requested tabs remain fully readable over the decorative background on desktop and mobile layouts.
- Verification: Production build and TypeScript check passed.

### Public UX phase 10, 2026-10-26
- Built: Standardized pre-login visual surfaces around the approved graphite, glass, violet, magenta, mint, and amber direction. Auth forms now use accessible dark inputs and glass cards, document placeholders use a premium document surface, and the hero deck uses a contained four-row layout that keeps all four cards visible together on desktop and mobile.
- Scope: Public/auth presentation only; no database, authentication behavior, routes, grading, exam timing, or server authorization changed.
- Verification: Production build and TypeScript check passed.

### Public theme phase 11, 2026-10-26
- Built: Added a shared public-surface contrast layer so pre-login headings, muted text, pills, inputs, textareas, selects, and focus states stay readable over the dark graphite theme across all public routes. The shared public layout now scopes these rules without affecting signed-in or admin screens.
- Scope: Pre-login presentation and accessibility contrast only; no product behavior, routes, authentication logic, or server authorization changed.
- Verification: Production build and TypeScript check passed.

### Public content phase 12, 2026-10-26
- Built: Fixed home category copy and enum label presentation, added a working More dropdown for public resources, replaced the Trust Centre placeholder with a factual trust overview, expanded FAQ with a searchable accordion and fallback answers, improved PYQ and DPP surfaces, and added visible auth validation messages.
- Scope: Public content, navigation presentation, and auth-form validation only. Existing routes and backend behavior remain unchanged.
- Verification: Production build and TypeScript check passed.

### Public navigation phase 13, 2026-10-26
- Built: Added a responsive mobile public navigation menu containing home, practice, resource, and legal destinations while preserving the desktop navigation and More dropdown.
- Scope: Public navigation presentation only; no routes or authorization behavior changed.

### Public practice phase 14, 2026-10-26
- Built: Added functional year and subject filtering to the public PYQ catalogue, connected the DPP page to published public DPP mocks with subject filtering and clear loading/error/empty states, and improved public-header active-link highlighting and motion feedback.
- Scope: Public catalogue behavior and presentation only; existing routes, auth, grading, exam timing, and server authorization remain unchanged.

### Public catalogue phase 15, 2026-10-26
- Built: Corrected Test Series category filtering to match stored categories, added consistent dark-glass search/filter controls, improved Chapter Practice search and subject filtering feedback, and added loading, error, empty, and reset states across both catalogues.
- Scope: Public catalogue presentation and client-side filtering only; no routes, schema, auth, grading, exam timing, or server authorization changed.


### Admin-managed content and dashboard polish phase 16, 2026-10-26
- Built: Admin pricing management tab (Homepage Manager) that upserts plans into the `pricing` homepage_content row and syncs instantly to the home page and pricing page. Contact-support inbox in the admin Support page showing `support_inquiries` with status filter, status changes, internal notes, and detail view. Admin personal-details editor in Settings (display name + avatar URL) backed by a column-scoped UPDATE grant on profiles.full_name. Public footer redesigned with a social icon row, two-column quick-link grid, and a split copyright/disclaimer bar. Student dashboard stat cards and quick-action grid refined with smoother transitions and clearer hierarchy. Hero feature-card hover lift and shadow transition refined.
- Key files: src/pages/admin/AdminHomepagePage.tsx, src/pages/admin/AdminPages.tsx, src/layouts/PublicLayout.tsx, src/pages/student/DashboardPage.tsx, src/index.css, supabase/migrations/20261026105734_020_allow_self_update_full_name.sql.
- Tables / functions / routes added: 1 migration widening the profiles UPDATE column grant to include full_name. No new routes.
- Verification: Production build passed. No UI verification tool available in this environment.

### Admin panel and DPP phase 17, 2026-10-26
- Built: DPP removed from public header and public route gated behind sign-in. /dpp now requires authentication and routes to the redesigned DppStudentPage with a hero card, streak/weekly/total stats, info panel, and history grid. Automated email notification for support inquiries: support-notify edge function deployed (calls Resend if RESEND_API_KEY configured, otherwise logs to notification_log), ContactPage fires the notification after successful insert, notification_log type constraint widened to include SUPPORT_INQUIRY. Admin dashboard enhanced with open-inquiry badges, today's submission count, recent activity feed, quick actions grid with homepage and support shortcuts, and getting-started checklist with jump links. Admin sidebar reorganized into grouped sections (Overview, Content, Students, System) with live open-inquiry badge on the Support link, improved active-state styling, and dark mobile drawer.
- Key files: src/layouts/PublicLayout.tsx, src/App.tsx, src/pages/LandingPage.tsx, src/pages/student/DppStudentPage.tsx, src/pages/public/ContactPage.tsx, supabase/functions/support-notify/index.ts, supabase/config.toml, src/layouts/AdminLayout.tsx, src/pages/admin/AdminDashboardPage.tsx, supabase/migrations/20261026111104_021_support_inquiry_notification_type.sql.
- Tables / functions / routes added: 1 migration (notification_log constraint). 1 edge function deployed (support-notify). /dpp route moved from public to protected.
- Verification: Production build passed. No UI verification tool available in this environment.

### Phase 18: Admin content management, charts, and settings, 2026-10-27
- Built: PYQ and DPP categories added to admin mock builder (CATEGORY_OPTIONS with 5 types, filter pills + search bar in AdminMocksPage). DPP history grid on student DPP page now has date range (all/7d/30d) and text search filters. Weekly score trend chart added to student dashboard — pure SVG bar chart showing last 8 weeks of average score percentages with color-coded bars (green/blue/amber/red), animated bar growth, legend, and empty state. Admin settings page rebuilt with functional platform_settings table — editable platform name and support email, 7 feature toggles (mock tests, daily practice, mistake notebook, leaderboard, AI studio, bookmarks, study plan), maintenance mode toggle, all persisted to DB with live save. Student settings page verified: all 5 notification prefs, exam timer mode/minutes, daily mock size, email nudges, public profile toggles, avatar upload, and data export all have working DB columns and save handlers.
- Key files: src/pages/admin/AdminMocksPage.tsx, src/pages/student/DppStudentPage.tsx, src/pages/student/DashboardPage.tsx, src/pages/admin/AdminPages.tsx (AdminSettingsPage), supabase/migrations/20261027_add_platform_settings.sql.
- Tables / functions / routes added: 1 migration creating platform_settings table with admin-only RLS policies and seed data. No new routes or edge functions.
- Verification: Production build passed.

### Text-only brand wordmark, 2026-10-28
- Built: Removed the supplied PNG from visible website branding and replaced the shared brand display with a responsive text-only `Mock Ninja` wordmark. Removed PNG favicon and social preview references, while keeping the platform name consistent in page metadata.
- Key files: src/components/common/BrandLogo.tsx, index.html, src/layouts/PublicLayout.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, auth pages.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed.

### Brand wordmark surface refinement, 2026-10-28
- Built: Removed the background, border, shadow, and card treatment behind the `Mock Ninja` wordmark so it sits directly on each website surface while retaining readable variant-specific text colors and responsive sizing.
- Key files: src/components/common/BrandLogo.tsx.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed.

### Icon brand lockup, 2026-10-28
- Built: Added the supplied ninja icon as a transparent high-resolution asset to the shared brand lockup, positioned it to the left of `Mock Ninja`, and added the visible `• Practice • Analyse • Excel` tagline beneath the wordmark. Variant-specific contrast keeps the lockup readable on public and workspace surfaces.
- Key files: src/components/common/BrandLogo.tsx, public/images/mock-ninja-icon-transparent.png.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed.

### Signed-in and admin workspace polish, 2026-10-28
- Built: Refined the post-login and admin shells with the transparent icon brand lockup, lighter layered workspace surfaces, responsive navigation depth, improved sidebar and header shadows, stronger active states, mobile bottom navigation treatment, and subtle motion. Updated shared cards, badges, and secondary/outline/ghost buttons so text remains readable and actions feel consistent across workspace screens.
- Scope: Signed-in and admin presentation only; routes, auth, data access, grading, exam timing, and server authorization were unchanged.
- Key files: src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/components/ui/card.tsx, src/components/ui/badge.tsx, src/components/ui/button.tsx, src/index.css.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed. Live browser preview was unavailable in this environment.

### Workspace brand lockup alignment, 2026-10-28
- Built: Corrected the post-login and admin brand sizing so the icon, `Mock Ninja` wordmark, and `• Practice • Analyse • Excel` tagline stay aligned and visible inside the fixed dashboard header and admin sidebar. Reduced tagline tracking and added non-wrapping behavior; admin uses a compact scale while workspace uses a stronger scale.
- Key files: src/components/common/BrandLogo.tsx, src/layouts/AdminLayout.tsx.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed.

### Unified dark product theme, 2026-10-28
- Built: Extended the graphite, glass, violet, magenta, mint, and amber system through signed-in student pages, admin pages, sidebars, headers, shared cards, badges, buttons, login/signup surfaces, and the exam pre-start header. Added the transparent ninja mark as the browser favicon and placed the complete brand lockup in the exam environment. Existing homepage sections retain their dark branded treatment and shared controls now match it safely.
- Scope: Presentation only; routes, authentication behavior, data access, grading, exam timing, and server authorization were unchanged.
- Key files: src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/components/exam/PreStartFlow.tsx, src/components/ui/card.tsx, src/components/ui/badge.tsx, src/components/ui/button.tsx, src/index.css, index.html.
- Tables / functions / routes added: None.
- Verification: TypeScript typecheck and production build passed. Live browser preview was unavailable in this environment.

### Header and navigation polish, 2026-10-28
- Built: Removed the non-functional public header search placeholder, added a centralized route-change scroll reset so refreshed and navigated pages begin at the top, added a subtle public page entrance animation, improved dark-theme focus rings and touch behavior, and added missing English/Hindi admin quick-action labels so raw translation keys no longer appear.
- Scope: Navigation and presentation only; no routes, authentication, data access, or authorization behavior changed.
- Key files: src/layouts/PublicLayout.tsx, src/App.tsx, src/index.css, src/i18n/en.ts, src/i18n/hi.ts.
- Verification: TypeScript typecheck and production build passed.

### Exam watermark and student surface polish, 2026-10-28
- Built: Extended the dark glass treatment over gradient and translucent student cards, added per-mock admin watermark settings using existing mock metadata, exposed those settings through the exam data response, rendered a low-opacity repeated candidate watermark during the active exam, and added the Mock Ninja brand lockup to the exam header.
- Scope: Student/admin presentation and existing exam metadata only; no routes, grading, exam timing, or authorization rules changed.
- Key files: src/pages/admin/AdminPages.tsx, src/pages/student/ExamPage.tsx, src/lib/exam-api.ts, src/index.css, supabase/functions/exam/index.ts.
- Verification: TypeScript typecheck and production build passed. Edge-function deployment reported no changed functions in the current deployment state.

### Subscription plans, 2026-10-28
- Built: Migration 022 created subscription_plans and user_subscriptions tables with RLS. Three plans seeded (Free/Pro/Elite). Student subscription page showing plan cards with features, current-plan indicator, free-plan subscribe flow, and paid-plan "coming soon" state. Admin subscription plan management page wired at /admin/subscriptions. Route /subscription added as protected student route. Paid plan checkout deferred until Stripe is connected.
- Key files: supabase/migrations/20261028121432_022_subscription_plans.sql, src/pages/student/SubscriptionPlansPage.tsx, src/App.tsx.
- Tables / functions / routes added: 2 tables (subscription_plans, user_subscriptions). 1 route (/subscription, /admin/subscriptions). No edge functions.
- Verification: Production build passed.

### Automated daily mock generation via pg_cron, 2026-10-28
- Built: Migration 023 enabled the pg_cron extension and created `auto_generate_daily_mocks()` — a SECURITY DEFINER function that computes the IST date, iterates all students with email_nudges enabled, checks for an existing daily mock (idempotent), and calls `build_daily_target_mock` for each. Per-student errors are swallowed so one failure does not stop the batch. Scheduled a cron job at 00:30 UTC (6:00 AM IST) to run the function every morning. Execution locked to the postgres/cron role only (REVOKE from PUBLIC, anon, authenticated).
- Key files: supabase/migrations/023_pg_cron_daily_mock_generation.sql.
- Tables / functions / routes added: 1 function (auto_generate_daily_mocks). 1 cron job (daily-mock-generation). No new tables, routes, or edge functions.
- Verification: Migration applied successfully. Cron job confirmed active in cron.job table (jobid=1, schedule='30 0 * * *', active=true).

### Consolidated pricing into subscription plans, 2026-10-28
- Built: Removed the duplicate "Pricing Plans" tab from the Homepage Manager (it was storing pricing in a homepage_content JSON blob, separate from the subscription_plans table). The public Pricing page and the landing page's pricing section now read from the subscription_plans table via a new useSubscriptionPlans() hook — same source of truth as the admin Subscription Plans page and the student subscription page. Added a "Most Popular" badge to the Pro plan on the student subscription page for consistency. Updated the public pricing page to show 3 plans (Free/Pro/Elite) instead of 2, matching the seeded subscription_plans data. Removed the Tag icon import and the entire PricingTab component (~280 lines) from AdminHomepagePage.
- Key files: src/pages/admin/AdminHomepagePage.tsx, src/pages/public/PricingPage.tsx, src/pages/LandingPage.tsx, src/pages/student/SubscriptionPlansPage.tsx, src/features/home/services/queries.ts.
- Tables / functions / routes added: 1 hook (useSubscriptionPlans). No new tables, functions, or routes.
- Verification: Production build passed.

### Student pages dark theme unification, 2026-10-29
- Built: Converted all remaining student pages from the old light theme to the unified graphite + glassmorphism dark theme (bg-[#11121c] cards, text-white headings, text-navy-300/400 body, border-white/10, aurora/violet accents, status colors at /20 opacity). Pages converted: AttemptedTestsPage, BookmarksPage, ResourcesPage, DppStudentPage, MocksPage, StudyPlanPage, DashboardPage, SettingsPage. SubscriptionPlansPage was already dark-themed. Fixed AdminLayout.tsx missing comma that broke the build. Fixed AdminPages.tsx toast API calls (toast({title,variant}) to toast.success/toast.error). Fixed SettingsPage double-comma build error from replace_all edit. Converted remaining light-theme patterns in SettingsPage (text-navy-700 labels to text-navy-300, bg-navy-200 toggle off-states to bg-white/10, text-emerald-600 icons to text-emerald-300). Verified question report flow: student ReportQuestionPage (dark theme, inserts into question_reports table) and admin AdminQuestionReportsPage (dark theme, manages via update_question_report RPC with status filters and admin notes) both work end-to-end.
- Key files: src/pages/student/AttemptedTestsPage.tsx, src/pages/student/BookmarksPage.tsx, src/pages/student/ResourcesPage.tsx, src/pages/student/DppStudentPage.tsx, src/pages/student/MocksPage.tsx, src/pages/student/StudyPlanPage.tsx, src/pages/student/DashboardPage.tsx, src/pages/student/SettingsPage.tsx, src/layouts/AdminLayout.tsx, src/pages/admin/AdminPages.tsx, src/i18n/hi.ts.
- Tables / functions / routes added: None.
- Verification: Production build passed.

### Dashboard contrast and leftover light-theme audit, 2026-10-29
- Built: Fixed two Dashboard labels (subject mastery percentage and recent-attempt test title) that used dark text on the dark card and were nearly invisible; now white. Confirmed the question report backend exists (question_reports table and update_question_report function). Confirmed the exam screen remains intentionally light per the NTA-style exam surface decision.
- Known remaining light-theme pages outside the requested list: AccountPage, BillingPage (partially), CheckoutPage (partially), FocusPage, LeaderboardPage, MasteryPage, MistakeNotebookPage, PerformanceAnalytics component. Their white cards are readable on the dark base, but their text and accents still use the old light palette.
- Verification: Production build passed.

### Student dark theme: Account, Focus, Leaderboard, Mastery, 2026-10-29
- Built: Converted AccountPage, FocusPage, LeaderboardPage and MasteryPage from light surfaces and dark text to the dark glass system (white/5 surfaces, white/10 borders, white headings, navy-300 secondary text, aurora/emerald/amber accents). Belt-colour pills intentionally stay light so belt identity is preserved. Presentation only; routes, queries and mutations are untouched.
- Key files: src/pages/student/AccountPage.tsx, src/pages/student/FocusPage.tsx, src/pages/student/LeaderboardPage.tsx, src/pages/student/MasteryPage.tsx.
- Still pending: MistakeNotebookPage and components/student/PerformanceAnalytics.tsx still use the light palette. ExamPage stays light by design (NTA-style exam surface).
- Verification: Production build passed.

### Subscription plans page polish, 2026-10-29
- Built: Redesigned SubscriptionPlansPage. Plan cards now share one dark surface, have equal heights with the feature list and button aligned at the bottom, and show a single status badge ("Current plan" in emerald, "Most popular" on Pro in saffron) instead of overlapping corner labels. Price row and period labels now correctly show quarterly and yearly suffixes. The comparison table has a price row first, clearer row headers, and dark-safe check and cross icons. Added a dark error state with retry and an empty state. FAQ is a collapsible list, and the refund link is a router link.
- Removed: the hardcoded near-black background, the violet "Most popular" gradient, and an unreachable redirect branch in the subscribe logic. Subscribing to Free still inserts an ACTIVE subscription row directly from the browser, unchanged.
- Key file: src/pages/student/SubscriptionPlansPage.tsx. Presentation and error handling only; queries, RLS and checkout routing are untouched.
- Open issue: switching from a paid plan to Free adds a second ACTIVE row without ending the previous one. Needs a server-side fix before payments go live.
- Verification: Production build passed. Not visually checked in a browser.

### Subscription page: atomic Free switch and upgrade/downgrade actions, 2026-10-29
- Built: Added a database function switch_to_free_plan (migration switch_to_free_plan_rpc). Switching to Free now cancels any ACTIVE subscription rows and creates one new ACTIVE row in a single operation. This resolves the open issue above. The function runs with the caller's rights, so existing row policies still apply, and only signed-in users can call it.
- Built: Plan buttons now read Upgrade to, Downgrade to, or Choose, based on the current plan. Switching from a paid plan to Free asks for an inline confirmation first, since it ends the paid plan immediately. The current plan is marked with aria-current and a disabled "Current plan" button. A student with no subscription row is treated as being on Free.
- Refactor: Split the page into src/components/student/subscription/PlanCard.tsx, PlanComparisonTable.tsx and PlanFaq.tsx. The page keeps the data queries and mutation.
- Known data: One existing student has two ACTIVE rows from before this fix. The function cancels both on their next switch to Free. Paid plan changes still go through checkout, which is not yet connected to this logic.
- Verification: Production build passed. Function exists and is executable by signed-in users only. Not tested end-to-end as a live student, and not visually checked in a browser.

## 2026-10-29 - Terms, Revision Vault, refund page removal

- Removed: Refund Policy page and its /refund and /refund-policy routes, the footer legal link, the More-menu entry, the checkout agreement link, the billing page link, and the related i18n keys. The refund request workflow in billing is kept.
- Built: Terms page with 13 numbered sections (acceptance, NTA independence disclaimer, accounts, plans and payments, refund requests, acceptable use, IP, leaderboards, feedback, disclaimers, termination, changes, contact). Needs legal review before launch.
- Built: Revision Vault page. Saved questions links to the bookmarks page and mistake notebook links to its page (both signed-in). Chapter notes and flashcards show "Coming soon". Signed-out visitors see sign-in links and a signup call to action.
- Open (not started, pending pricing confirmation): OTP registration with per-section signup links, automated invoices, 20% referral discount, WhatsApp and support email wiring, 2-day ticket SLA, post-test feedback prompts, and paid-to-paid plan change through checkout.
- Open decision: the requested pricing (one-time bundles with mock quotas) does not match the current monthly plan structure (Pro 499/mo, Elite 999/mo). Plan prices were not changed.
- Open: support email is support@mockninja.com in the current copy; the requested @mockninja.in address is not yet confirmed.
- Verification: Production build passed. Not visually checked in a browser.

### Exam lavender theme, OTP registration, referral discounts, invoices, 2026-10-29
- Built: Converted the exam interface from the old cyan/govt palette to a light lavender and white NTA-style theme (aurora purple accents, #FAFAFF backgrounds, #F5F3FF surfaces, #E5E4F2 borders). MCQ option labels changed from (1)-(4) to A-D. Selected options now use purple instead of green. Timer card, subject tabs, section tabs, question metadata bar, mark-for-review button, and palette active ring all use the purple aurora palette. PreStartFlow also converted to lavender. Thank-you screen uses purple check icon. Loading and error states use lavender backgrounds.
- Built: Converted MistakeNotebookPage and PerformanceAnalytics component from light theme to the unified dark glass theme (white/5 surfaces, white headings, navy-300/400 text, aurora accents, status colors at /20 opacity). Analytics sparkline uses purple gradient instead of blue.
- Built: Signup page now includes optional phone number and referral code fields. Phone and referral code are stored in profiles table (new columns: phone, phone_verified, referral_code_used). Referral code is validated at checkout via apply_referral_discount RPC.
- Built: Referral discount system (migration 025). New referral_codes table with auto-generated 8-char codes per user. generate_referral_code() RPC creates/retrieves a user's code. apply_referral_discount(p_code, p_amount) RPC validates the code, computes 20% discount (capped at plan price), increments usage count, prevents self-referral. Settings page now has a "Refer & Earn" card showing the user's code with copy-to-clipboard. Checkout page has a referral code input alongside the existing promo code — both discounts stack and show separately in the price breakdown.
- Built: Automated invoice generation improved. BillingPage invoice download now produces a properly formatted text invoice with GST breakdown, subtotal, plan details, billed-to email, and formatted date/time. CheckoutPage now stores referral_discount_inr on the transaction row. generate_invoice_number() RPC created (MN-YYYY-NNNNNN format with sequence).
- Key files: src/pages/student/ExamPage.tsx, src/components/exam/PreStartFlow.tsx, src/pages/student/MistakeNotebookPage.tsx, src/components/student/PerformanceAnalytics.tsx, src/pages/auth/SignupPage.tsx, src/pages/student/SettingsPage.tsx, src/pages/student/CheckoutPage.tsx, src/pages/student/BillingPage.tsx, supabase/migrations/025_otp_phone_and_referral_discounts.sql.
- Tables / functions / routes added: 1 table (referral_codes). 3 functions (generate_referral_code, apply_referral_discount, generate_invoice_number). 1 sequence (invoice_seq). 3 profile columns (phone, phone_verified, referral_code_used). 1 transaction column (referral_discount_inr). No new routes.
- Verification: Production build passed. Not visually checked in a browser.

### Second pricing model (mock bundles), subscription page fix, support + feedback, 2026-10-29
- Built: Second pricing model coexisting with monthly tiers. subscription_plans gained pricing_model (TIERS/BUNDLES) and mock_quota columns. Three bundle plans seeded inactive: Full Syllabus (₹499 one-time / 10 mocks), Maths Monthly (₹99 monthly / 4 mocks), Maths Yearly (₹1999 one-time / 48 mocks). Free plans (price_inr = 0) stay active in either model.
- Built: AdminSubscriptionPlansPage extracted to its own file with a live pricing-model switcher (TIERS vs BUNDLES cards), per-plan grid with model badge/billing/mock quota, and a PlanEditor modal supporting ONE_TIME/LIFETIME billing periods and mock_quota. Old inline admin plan editor removed from AdminPages.tsx.
- Built: set_live_pricing_model(p_model) SECURITY INVOKER RPC switches the active model atomically; admin role validated server-side, existing admin UPDATE policy still applies.
- Fixed: /subscription page was rendering outside the dark workspace shell (washed out, unreadable). Wrapped SubscriptionPlansPage in StudentLayout so it inherits the graphite background and navy text. Public pricing page and landing page fallback plans updated with mock_quota.
- Built: Post-test feedback. New test_feedback table (rating 1-5, short review, general feedback) with UNIQUE(user_id, attempt_id). INSERT policy validates the attempt is SUBMITTED and owned by the caller. ResultsPage now shows a feedback card with star rating, review input, and comment box; saves via upsert.
- Updated: Support email changed from support@mockninja.com to support@mockninja.in across ContactPage, TermsPage, BillingPage, and admin defaults. ContactPage no longer shows a fake WhatsApp number; the support inquiry form remains the ticketing system with a 2-day resolution goal.
- Exam interface: verified the existing ExamPage already implements the NTA-style CBT layout (light lavender theme, three columns, header timer, subject/section tabs, question palette with 5 states, bottom toolbar, watermark). No rewrite needed.
- Key files: supabase/migrations/20261029093102_024_pricing_models_and_live_switch.sql, supabase/migrations/20261029100737_20261029101500_test_feedback.sql, src/pages/admin/AdminSubscriptionPlansPage.tsx, src/pages/admin/AdminPages.tsx, src/App.tsx, src/pages/student/SubscriptionPlansPage.tsx, src/components/student/subscription/PlanCard.tsx, src/features/home/services/queries.ts, src/pages/public/PricingPage.tsx, src/pages/LandingPage.tsx, src/pages/public/ContactPage.tsx, src/pages/public/TermsPage.tsx, src/pages/student/BillingPage.tsx, src/pages/student/ResultsPage.tsx.
- Tables / functions added: 1 table (test_feedback). 1 function (set_live_pricing_model). 2 columns on subscription_plans (pricing_model, mock_quota). 1 trigger (touch_test_feedback).
- Known limitations: Admin view of submitted test feedback not yet built. Pre-existing type errors in AdminTransactionsPage and BillingPage remain (Supabase join typing). Paid checkout still preview-only. Exam page not visually compared against the reference screenshot in this session.
- Verification: Production build passed. Not visually checked in a browser.

### Password recovery, payment states, support tracking, reconciliation, 2026-10-29
- Built: Forgot Password page (`/forgot-password`) and Reset Password page (`/reset-password`) using Supabase's built-in `resetPasswordForEmail` flow. Login page now has a "Forgot password?" link. The reset page listens for the PASSWORD_RECOVERY auth event and lets the user set a new password.
- Built: Payment Result page now handles all 4 states in one unified UI — SUCCESS (with invoice download + dashboard link), PENDING (with auto-polling up to 10 times), FAILED (with retry + support links), and CANCELLED (with browse-plans link). A new `/payment/pending` route reuses the failure page for pending display.
- Built: Student Notifications & Support Tracking page (`/notifications`). Shows summary cards (open tickets, resolved, notification count), a 2-day resolution SLA banner, a searchable list of the student's own support tickets with status badges, a notification log, quick links to contact and billing, and a "New Ticket" modal that creates a support_inquiry with user_id set so the student can track it.
- Built: Admin Payment Reconciliation page (`/admin/reconciliation`). Shows stale pending transactions (>10 min), failed events, discrepancies, and amount at risk. Admins can reprocess stuck payments (mark SUCCESS + activate subscription) or mark transactions as failed. Added to admin nav.
- Updated: SubscriptionPlansPage now shows a subscription management card for paid subscribers with plan name, validity/expiry, billing link, and a "Cancel subscription" button that triggers the existing switch-to-free confirmation flow.
- Migration: `20261029102118_20261029120000_support_inquiry_user_id.sql` added nullable `user_id` column to `support_inquiries` so logged-in students can track their own tickets. RLS policy added for students to SELECT their own inquiries.
- DPP: Verified the daily-mock edge function is deployed and functional — it calls `build_daily_target_mock` RPC to generate a personalized practice set from the student's weakest chapters. The DPP student page correctly shows streaks, history, and the generate button.
- Key files: src/pages/auth/ForgotPasswordPage.tsx, src/pages/auth/ResetPasswordPage.tsx, src/pages/auth/LoginPage.tsx, src/pages/student/PaymentSuccessPage.tsx, src/pages/student/PaymentFailurePage.tsx, src/pages/student/NotificationsSupportPage.tsx, src/pages/admin/AdminReconciliationPage.tsx, src/pages/student/SubscriptionPlansPage.tsx, src/layouts/AdminLayout.tsx, src/App.tsx, supabase/migrations/20261029102118_20261029120000_support_inquiry_user_id.sql.
- Verification: Production build passed. Not visually checked in a browser.

### Exam environment polish: bookmark status, keypad and palette theme alignment, 2026-10-29
- Fixed: BookmarkButton used nonexistent `govt-*` color classes; replaced with aurora palette to match the lavender exam theme. The exam screen now fetches the actual bookmark status for all questions via `useBookmarkStatus` and passes the real state to each BookmarkButton instead of always `false`.
- Fixed: NumericalKeypad borders, display background, hover and active states updated from generic gray to the lavender `#E5E4F2` / `#F5F3FF` / aurora-50 palette so the keypad matches the rest of the exam interface.
- Fixed: PaletteSymbol active ring changed from dark `#37474F` to `aurora-600` so the selected question indicator matches the lavender exam theme.
- Key files: src/components/exam/BookmarkButton.tsx, src/pages/student/ExamPage.tsx, src/components/exam/NumericalKeypad.tsx, src/components/exam/PaletteSymbol.tsx.
- Tables / functions / routes added: None.
- Verification: Production build passed. Not visually checked in a browser.

### Accessible theme switching and exam branding, 2026-10-29
- Built: Shared Light, Dark, and System theme control. System is the default, follows prefers-color-scheme changes without reload, applies color-scheme for native controls, and only stores a value after the user explicitly selects an option.
- Updated: Shared CSS theme variables and common workspace/input overrides support readable light and dark surfaces with smooth transitions.
- Updated: Exam header and pre-start branding use the supplied logo asset with a grayscale/contrast treatment on white so the black Mock Ninja mark remains visible. Candidate avatars now use the first alphabetical character from the student's name, then email as fallback.
- Updated: Results feedback card and fields use the shared theme surfaces instead of hard-coded white-only colors.
- Key files: src/lib/theme.tsx, src/components/common/ThemeSwitcher.tsx, src/components/common/BrandLogo.tsx, src/index.css, src/pages/student/ExamPage.tsx, src/pages/student/ResultsPage.tsx.
- Tables / functions / routes added: None.
- Verification: Production build passed. Not visually checked in a browser.

### Joined payment relation type normalization, 2026-10-29
- Fixed: Transaction, refund request, reconciliation, and billing queries now normalize Supabase's one-to-many relation arrays to their first related record before rendering, keeping the existing screens and database behavior unchanged.
- Key files: src/pages/admin/AdminReconciliationPage.tsx, src/pages/admin/AdminTransactionsPage.tsx, src/pages/student/BillingPage.tsx.
- Verification: TypeScript validation and production build both passed.

### Header and exam insight refinement, 2026-10-29
- Built: Replaced the three-button theme group with one animated icon control whose dropdown offers Light, Dark, and System. Added keyboard and outside-click closing, active-choice feedback, and the same profile menu to the admin header so display names and email fallbacks are consistent across signed-in areas.
- Updated: Restyled the exam welcome step to match the supplied dark graphite reference with clear metrics, section breakdown, marking cards, rules, server-grading notice, and animated gradient start action while preserving the existing instructions and declaration flow. Restyled Results smart insights with a dark panel and readable warning, information, success, and danger cards.
- Key files: src/components/common/ThemeSwitcher.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/components/exam/PreStartFlow.tsx, src/pages/student/ResultsPage.tsx, src/index.css.
- Tables / functions / routes added: None.
- Verification: TypeScript validation and production build both passed. Browser preview was unavailable.

## 2026-10-29 Custom practice tests (student DPP builder)
- Migration 20261029140000_custom_practice_tests: table custom_practice_sets (own-row SELECT only), RPC build_custom_practice_test (auth.uid() owner, chapters 1-30, difficulty ANY/EASY/MEDIUM/HARD, count 5-50, unseen questions preferred), EXECUTE for authenticated only.
- New page /dpp/custom (CustomPracticePage.tsx) linked from the daily practice header; built test opens on /mocks/:id.
- Not yet browser-tested; custom sets list/history not built.

## 2026-10-29 Profile and settings fixes
- Fixed: Settings page was missing an import and would fail to open.
- Migration 20261029150000_allow_self_update_personal_details: students can now update their own phone, daily mock size, email nudges, and exam timer fields (role and email remain locked).
- Edit Profile on the account page opens a personal details dialog (name and phone) instead of navigating to Settings.
- Key files: src/pages/student/SettingsPage.tsx, src/pages/student/AccountPage.tsx, src/components/student/PersonalDetailsDialog.tsx.
- Verification: production build passed. Browser preview unavailable.

## 2026-10-29 Onboarding page redesign
- Reworked the 3-step onboarding flow to match the dark graphite glassmorphism theme used across the app: dark background, glass card, violet/amber/emerald icon tiles per step, gradient progress indicator with check marks for completed steps, smooth slide-in animations between steps, Back buttons on steps 2 and 3, and a welcome badge above the card.
- Added step transition keyframes (animate-step-in / animate-step-in-reverse) to src/index.css.
- Added missing `common.back` translation key in EN and HI.
- All existing logic preserved: name + birth year, entry source + referral, guardian consent for minors, edge-function invocation.
- Key files: src/pages/auth/OnboardingPage.tsx, src/index.css, src/i18n/en.ts, src/i18n/hi.ts.
- Verification: production build passed. Browser preview unavailable.

## 2026-10-29 Onboarding persistence, skip, confetti, and admin user removal
- Onboarding now saves referral code to `profiles.referral_code_used` (previously captured but never persisted). All onboarding choices (name, birth year, entry source, referral code, guardian email) are saved and reflected on the dashboard via refreshProfile.
- Added "Skip setup" button on every onboarding step so users can jump straight to the dashboard; skip still saves whatever was entered.
- Added a celebratory confetti success screen when onboarding completes, with a personalized welcome, quick summary of features, and auto-redirect to dashboard after 4 seconds.
- Created Confetti component (src/components/common/Confetti.tsx) with CSS-driven falling animation.
- Added confetti-fall and bounce-slow keyframes to src/index.css.
- Added new i18n keys in EN and HI: skipSetup, welcomeAboard, setupComplete, youAreReady, summaryMocks, summaryFocus, summaryDaily, autoRedirect.
- Migration 20261029160000_admin_remove_user: SECURITY DEFINER function `admin_remove_user(p_target_id uuid)` callable only by ADMINs. Prevents self-deletion, prevents removing other admins, nullifies referral references, deletes the target profile row. EXECUTE revoked from PUBLIC/anon, granted to authenticated.
- Admin Users page (AdminUsersPage in AdminPages.tsx) now has a trash icon button next to non-admin users, with a confirmation dialog showing the user's name and email. Calls `admin_remove_user` RPC. Hide button for admins and the current user.
- Key files: src/pages/auth/OnboardingPage.tsx, src/components/common/Confetti.tsx, src/pages/admin/AdminPages.tsx, src/index.css, src/i18n/en.ts, src/i18n/hi.ts.
- Verification: production build passed. Browser preview unavailable.

## 2026-10-29 Onboarding UI/UX enhancement
- Reworked onboarding to a premium split-panel layout: left decorative panel (desktop) with platform features and trust signal, right form panel with glass card.
- Added animated background orbs (three blurred color blobs drifting slowly), card glow entrance, staggered fade-in-up on fields and buttons, slide-in-right on feature cards.
- Enhanced glassmorphism: deeper blur, layered translucent borders, gradient icon tiles with glow halos behind them.
- Progress indicator upgraded with scale-110 active state, animated progress bar fill, and check-pop animation on completed steps.
- Inputs refined: larger padding, hover border transitions, ring-2 focus, custom select dropdown chevron.
- Error banner now has shake animation. Back buttons use ArrowLeft icon.
- Success screen: staggered summary items with check marks, success-rise entrance animation, dual background orbs.
- New CSS keyframes added to src/index.css: fadeInUp, slideInRight, checkPop, shake, cardGlow, successRise, floatIcon, orbDrift1/2/3.
- No logic, routing, auth, RLS, or i18n key changes -- purely visual/UX layer.
- Key files: src/pages/auth/OnboardingPage.tsx, src/index.css.
- Verification: production build passed. Browser preview unavailable.

## 2026-10-30 Full user deletion, light theme, and responsive fixes
- Admin user removal now fully deletes the login account (auth.users) via a new edge function `admin-remove-user`, not just the profile row. Deleting the auth account cascades through existing FKs: attempts, responses, mastery, daily mocks, public profiles, notifications, push subscriptions all cascade. Financial/support records (transactions, refund requests, support inquiries, question reports, promo codes) set FK to NULL to preserve audit history. Referral pointers nullified before deletion.
- Old `admin_remove_user(uuid)` SQL function dropped (migration drop_admin_remove_user_rpc). Admin Users page now calls the edge function instead of the RPC.
- Edge function validates caller is ADMIN, blocks self-deletion and removing admins, nullifies referred_by, then deletes via admin.auth.admin.deleteUser().
- Light theme: comprehensive CSS overrides added to src/index.css for html[data-theme='light']. Covers hard-coded hex backgrounds (#0d0e15, #101117, #11121c, #191923, #0b0c14), border-white/*, bg-white/*, glass cards, inputs, public header/menus, nav links, insight panels, footer. Theme switcher now produces readable light surfaces across workspace, landing, auth, and public pages.
- Responsive fixes: StudyPlanPage week grid changed from grid-cols-7 to grid-cols-2 sm:grid-cols-4 lg:grid-cols-7. TrustPage hero text base reduced from text-4xl to text-3xl. ResultsPage, ResourcesPage, MockDetailPage, MistakeNotebookPage, DppStudentPage grid-cols-3 changed to grid-cols-1 sm:grid-cols-3. MocksPage card stats grid to grid-cols-2 sm:grid-cols-3.
- Key files: supabase/functions/admin-remove-user/index.ts, supabase/config.toml, src/pages/admin/AdminPages.tsx, src/index.css, src/pages/student/StudyPlanPage.tsx, src/pages/public/TrustPage.tsx, src/pages/student/ResultsPage.tsx, src/pages/student/ResourcesPage.tsx, src/pages/student/MockDetailPage.tsx, src/pages/student/MistakeNotebookPage.tsx, src/pages/student/DppStudentPage.tsx, src/pages/student/MocksPage.tsx.
- Verification: production build passed. Browser preview unavailable.

## 2026-10-30 Light theme contrast audit

- Light mode now maps the remaining dark-tuned utilities globally: bright accent text shades (emerald/amber/teal/sky/red/saffron 200-400), text-navy-100, slate-300/400, solid bg-navy-900 surfaces (mobile admin drawer, tooltips, home dark sections), and the #15161f background. Solid colored fills keep white text (primary buttons, gradient avatars, count badges, WhatsApp button, hero icon tiles) so they stay readable.
- Active sidebar item keeps accent text on its tinted background.
- Auth brand panel and form panel use light gradients with theme text.
- Dark-mode CSS and locked hero layout were not changed.
- Key files: src/index.css.
- Tables / functions / routes added: None.
- Verification: production build passed. Live browser preview was unavailable, so visual contrast on each screen has not been checked by eye; code-level audit only.
- Known gaps: exam screen remains light by design; some per-page inline colors (for example the PerformanceAnalytics component and exam watermark) were not individually reviewed in a browser.


## 2026-10-31 Brand tagline, Free on Mock Ninja, pre-footer, and stats strip theming

- Scope: brand tagline, Free on Mock Ninja section, final pre-footer CTA, landing stats strip. Not yet reviewed: student workspace, admin console, dashboard statistics in light mode.
- Changes: tagline "• Practice • Analyse • Excel" is black in light mode and brand icon gets a soft glow in dark mode; Free section and pre-footer use theme-specific classes (light gradients and white cards in light, existing dark look kept in dark); stats strip uses theme classes instead of hard-coded dark hex.
- Auth check: /subscription and /checkout are inside ProtectedRoute; public /pricing only links to sign-up and never selects a plan.
- Key files: src/index.css, src/components/common/BrandLogo.tsx, src/features/home/components/FreeOnMockNinjaSection.tsx, src/pages/LandingPage.tsx.
- Tables / functions / routes added: None.
- Verification: production build passed. No browser available; code-level review only.
- 2026-10-31 follow-up: light-mode cards and panels (rounded bordered blocks) now use a crisper slate border. Dashboard, student workspace, and admin console were code-audited: dark chrome, hover states, muted text, and dialogs are covered by the light-theme rules. Live visual check was not possible.

## 2026-10-31 Exam window-switch warning and brand icon edge

- Exam: during live EXAM mode, leaving the window or tab shows a blocking WARNING dialog with a count and a Return to exam button (re-requests fullscreen). Client-side only; nothing is sent to the server yet.
- Exam copy: the fullscreen notice no longer claims the event is recorded.
- Brand icon: light mode gets a soft shadow; dark mode gets a thin light edge so the black outline stays visible.
- Key files: src/pages/student/ExamPage.tsx, src/i18n/en.ts, src/index.css.
- Not done: social login and plan-gated mock access.
- Verification: production build passed; no browser available.

## 2026-10-31 Google sign-in and premium mock gating

- Auth: Continue with Google button on login and sign-up (shared GoogleSignInButton). Redirects to /dashboard. Google must be enabled in the Supabase Auth provider settings before it works.
- Profile: the existing signup trigger already reads full_name from sign-in metadata, which Google provides.
- Access: the exam start action returns HTTP 400 with a plain-language message for PREMIUM mocks unless the user has an ACTIVE, unexpired subscription to a paid plan. FREE mocks remain open to signed-in users.
- Payments are not live (paid checkout is preview only), so premium mocks stay locked until payment is configured.
- Key files: supabase/functions/exam/index.ts, src/components/auth/GoogleSignInButton.tsx, src/pages/auth/LoginPage.tsx, src/pages/auth/SignupPage.tsx.
- Verification: production build passed; exam function deployed; no browser available.

## 2026-10-31 Plan cards show locked and unlocked states

- Built: On the subscription page, every paid plan shows a Locked badge, a lock note, and a lock icon on its button when the student has no active paid plan. Once a paid plan is active, that plan shows Premium mocks are unlocked. The same rule as the server gate is used: a paid plan with an active subscription.
- Key files: src/components/student/subscription/PlanCard.tsx, src/pages/student/SubscriptionPlansPage.tsx.
- Not done: Stripe card purchase is blocked until a Stripe secret key is configured. Payment code has not been written.
- Verification: production build passed; no browser available.

## 2026-10-30 Phase 0 audit (read-only)

- Phase 0 is a read-only audit. No application behavior or UI was changed.
- Created docs/AUDIT.md (stack, full route table, component inventory, design tokens, database/RLS posture, single-source-of-truth violations), docs/DESIGN_SYSTEM.md (current design baseline), docs/ROUTES.md (human-readable route mirror), docs/CHANGELOG.md (append-only milestones).
- Confirmed stack: React 18.3, Vite 7.3, Tailwind 3.4, Supabase JS 2.57, i18next 26.5, KaTeX 0.19, zod 4.6, react-router-dom 7.18. No MUI dependency.
- Confirmed ~60 routes declared inline in src/App.tsx; src/features/home/config/routes.ts is only a small feature map, not the app route registry.
- Confirmed live database reports RLS enabled across all inspected public and storage relations (38 relations). Broad anon/authenticated grants rely on policy predicates; flagged for least-privilege hardening.
- Missing capabilities recorded: integrity_events table for durable window-switch history, question/question-paper media storage bucket, unified route registry, shared copy module, working /admin/ai page (still a Placeholder).
- Single-source violations recorded: inline exam warning strings, inline admin labels, no copy.ts, duplicate route definitions, literal hex colors in index.css, transition-all usage, native confirm() alongside shared Dialog.
- Key files: docs/AUDIT.md, docs/DESIGN_SYSTEM.md, docs/ROUTES.md, docs/CHANGELOG.md.
- Verification: read-only phase; no build needed.

## 2026-10-30 Phases 1 to 3 partial delivery

- Added integrity_events (append-only, RLS: student insert only for own IN_PROGRESS attempt; read own or staff). Window-switch writes from ExamPage.
- Added private question-media bucket (staff-only policies, PDF and image MIME types, 15 MB limit) and nullable question_paper_path / image_path columns.
- Added shared MediaUpload component used on AdminMocksPage (paper) and AdminQuestionsPage (image).
- Added ResultShareCard to ResultsPage.
- Replaced transition-all in shared components, pages, and layouts. Four remaining uses in locked src/features/home left as-is.
- Still open: dashboard analytics hierarchy and engagement layer, AI Question Studio on real data (/admin/ai still a placeholder), remaining missing pages, route registry, copy consolidation, student-facing media display, full QA.
- Verification: production build passed after each change group. No browser testing was performed.

## 2026-10-30 Dashboard resume card, score trend, and route QA

- Dashboard: added a "Continue where you left off" card near the top, from the latest IN_PROGRESS attempt, linking to /exam/:attemptId. Removed the older resume strip lower on the page.
- Dashboard: replaced the 8-week weekly bar chart with a per-attempt score trend (last 20 submitted mocks, percent over time) with latest, average, and best values. Chart drawing lives in src/components/student/ScoreTrendChart.tsx.
- Route QA: every route declared in src/App.tsx matches the internal links and navigate targets found in the code. Admin sidebar targets all resolve. No broken links found.
- Route QA notes, not changed: admin sidebar labels for some items are plain English rather than translation keys; /payment/pending reuses the failure page; /admin/reports and /admin/analytics both render AdminReportsPage.
- docs/ROUTES.md: /admin/ai marked as a complete usage view (generation not enabled).
- Verification: production build passed. No browser testing was performed.

## 2026-10-30 Admin sidebar label translation

- Admin sidebar items for Question Reports, Homepage Manager, Transactions and Refunds, Reconciliation, and Promo Codes now use translation keys. Hindi falls back to English for the new keys.
- Verification: production build passed. No browser testing was performed.

## 2026-10-30 Route registry

- Route paths, page elements, and access guards moved from src/App.tsx to src/routes/appRoutes.tsx (77 routes, same paths and guards). App.tsx now renders the registry.
- PublicOnlyRoute moved to src/components/auth/PublicOnlyRoute.tsx.
- Sidebars and page links are unchanged and still define their own labels.
- Verification: production build passed. No browser testing was performed.

## 2026-10-30 Proctoring window-switch counts

- Admin proctoring table shows the number of WINDOW_SWITCH events per attempt, read from integrity_events (staff read policy). Per-event timeline is not shown.
- Verification: production build passed. No browser testing was performed.

## 2026-10-30 Revision vault: chapter notes and formula flashcards

- New tables revision_notes (chapter study notes) and formula_cards (front/back flashcards), seeded with starter content for 6 chapters and 15 formulas. Public read of published rows; writes restricted to staff via is_staff().
- Student pages: /revision-vault/notes (grouped by chapter, searchable), /revision-vault/notes/:noteId (reading view with previous/next), /revision-vault/flashcards (flip cards, Got it / Review again, shuffle, subject filter, keyboard arrows and Space).
- Staff authoring screens for notes and cards are not built; content is currently added through the database.
- AI mock generation was not built: the secrets list could not be read in this session, so no AI key could be confirmed and no provider was chosen.
- Verification: production build passed. No browser testing was performed.

## 2026-10-30 AI draft question generation (Gemini)

- New edge function generate-ai-questions (verify_jwt true). Staff only (profiles role ADMIN or EDITOR). Calls Gemini model gemini-2.5-flash with the chapter, type, difficulty and count. Valid questions are saved to questions as DRAFT with source AI_GENERATED and a usage row in ai_usage_ledger.
- Admin AI Question Studio page has a generation form (chapter, type, difficulty, count 1 to 10).
- The Gemini key is read from the GEMINI_API_KEY secret. The key is not in code. Until the secret is saved, the function returns a "not configured" message (HTTP 503).
- Cost per call is recorded as 0 paise because pricing is not known to the app.
- Not done: student plan gating. Verification: production build passed. No browser or live AI call was tested.

## 2026-10-31 Revision Vault paid-plan gating

- Migration gate_revision_content_to_paid_plans: new function has_active_paid_plan(uuid) (SECURITY DEFINER, EXECUTE for authenticated only). revision_notes and formula_cards published rows are readable only by users with an ACTIVE, unexpired paid plan, or by staff.
- Migration revoke_anon_privileges_on_revision_content: anon had TRUNCATE and write grants on both tables; all anon privileges removed.
- UI: RevisionAccessGate wraps the three revision routes in src/routes/appRoutes.tsx and shows a locked panel linking to /subscription for users without a paid plan.
- Note: staff without a paid plan are blocked by the UI gate, while the database policy still lets staff read.
- Verification: production build passed. No browser testing was performed.

## 2026-10-31 Stripe checkout, AI verification, DPP mock (status)

- Paid checkout not changed: Stripe is not configured for this project, so per the Stripe setup rules no payment code was written.
- AI Question Studio not verified live: a staff login and the GEMINI_API_KEY secret are required. Generation has not been run.
- DPP mock generation not changed: the existing daily mock and custom practice builder were left as they are, pending a definition of the requested behavior.

## 2026-10-31 DPP daily mock: difficulty and weak-chapter fill

- Migration daily_mock_difficulty_and_weak_chapter_fill: build_daily_target_mock gains p_difficulty (ANY, EASY, MEDIUM, HARD). Focus chapters fill 70% and weak chapters (evidence_count >= 5, lowest score first) fill the rest. Previously it took at most one question per chapter per pass, so sets could be short; it now fills to the requested count. Questions already in the same set are not repeated.
- Grants: EXECUTE for service_role only (verified).
- daily-mock edge function accepts a difficulty in the request body (invalid values return 400) and passes it through. Redeployed.
- DPP page: difficulty picker (Mixed, Easy, Medium, Hard) shown when no set exists for today.
- Limitation: one set per student per day. If the 6 AM scheduled set already exists, the chosen difficulty is not applied to it.
- Not verified: the function was not executed against a live student (no test account available). Production build passed.
- Not verified: AI Question Studio live generation (GEMINI_API_KEY secret could not be listed from this session and no staff login was available). Free-user locked panel not checked in a browser.

## 2026-10-31 White screen fix (admin route roles)

- Cause: src/routes/appRoutes.tsx used ADMIN_STAFF and ADMIN_ONLY role lists that were never defined, so the whole app threw on load and showed a blank page.
- Fix: defined ADMIN_STAFF (ADMIN, EDITOR) and ADMIN_ONLY (ADMIN) next to the route list. No route paths, auth, or RLS changed.
- Verification: production build passed; editor error check reports no errors. Not opened in a browser.

## 2026-10-30 Onboarding and admin color rules, admin page directory

- Onboarding: removed the decorative glow shapes on both screens. Violet and fuchsia accents recolored to cyan and emerald.
- Admin pages and admin layout: violet and aurora accents recolored to cyan (aurora is #8B5CF6, a violet). No route, auth, or RLS changes.
- Admin dashboard: new "All admin pages" section listing every admin page with its address and a link.
- Not done: admin mobile and tablet layout audit. Violet/aurora accents remain on student, public, shared style, and landing pages.
- Verification: type-check and production build passed. Not opened in a browser.

## 2026-10-31 Admin mobile and tablet responsive audit

- Checked: every admin page for fixed multi-column grids, fixed-width containers, and unwrapped header rows. Data tables already sit inside horizontal-scroll wrappers and were left as they are.
- Fixed: form grids that stayed two or three columns on phones now stack to one column below the small breakpoint (Mock builder, Question bank, Promo codes, Subscription plans, Topics). Mock builder and Question bank headers now wrap when the title and button do not fit.
- Files: src/pages/admin/AdminMocksPage.tsx, AdminQuestionsPage.tsx, AdminPromoCodesPage.tsx, AdminSubscriptionPlansPage.tsx, AdminTopicsPage.tsx.
- Verification: type-check and production build passed. Code-level review only; not opened at phone or tablet widths in a browser.
- Not done: no visual check of the data tables on small screens; they scroll horizontally by design.

## 2026-10-31 Pending browser checks (status)

- AI Question Studio generation and DRAFT save: still not run. The database has one ADMIN profile, but no password is available to this session, and the GEMINI_API_KEY secret cannot be listed from here. Needs a staff sign-in and the secret confirmed.
- Free-user locked panel on revision notes and flashcards: still not run. Needs a browser session signed in as a free account.
- Both items remain open; they are not verified.

## 2026-11-01 Student, public, and shared accent cleanup and subscription lock

- Built: Violet and aurora accents on student, public, auth-adjacent, exam, and shared components now use the cyan palette. The stylesheet's light-mode overrides for those classes were updated to match. Locked hero, header, landing, and home sections were not changed.
- Built: Subscription writes are server-only. A free-plan student no longer gets premium access from browser-created rows. Students can still read their subscription and switch to the free plan through a server function.
- Built: DPP Start reuses today's mock or creates one with the chosen difficulty, then opens it.
- Affected account: user 44d9001f-7303-41f6-bd40-be4b0264fc52 still has ACTIVE paid rows created before the lock. Not changed; needs owner approval before cancelling.
- Not verified: DPP Start live path (no daily mock rows yet), AI Question Studio test, free-user locked panel. Still open.
- Verification: type check passed; production build passed.
- Follow-up: DPP Start no longer opens an empty mock page when the student has no weak or focus chapters yet; it shows a plain message instead. Database signature (5 arguments, last one defaulted and unused) matches the 4-argument call from the daily mock function. Live DPP Start run by a student is still pending.
- Affected account 44d9001f-7303-41f6-bd40-be4b0264fc52: 5 ACTIVE paid subscription rows (created 2026-10-28 to 2026-10-30) and 4 SUCCESS transactions. Not changed; awaiting owner approval to cancel.
- Free-plan check: database grants confirm student subscription writes are blocked by policy; the in-browser free-user view is still pending.

## 2026-11-01 Brand name and landing hero headline

- Built: The "Mock Ninja" brand name renders as one plain-colored word (white on dark, navy on light). The bluish gradient on "Ninja" is removed.
- Built: Hero headline now states the value proposition ("Master JEE Main with the NTA-Style Interface That Feels Like the Real Exam"). The subtitle, button labels, and image alt text are now real translated keys in English and Hindi; before, the page displayed raw key names.
- Built: The primary hero button is larger (taller, wider padding, larger text on wide screens). The hero stays dark in both themes, so the button is white on dark in both.
- Locked-UI note: the hero is marked UNLOCKED in docs/LOCKED_UI.md; this change was requested explicitly.
- Not verified visually in a browser; type check and production build passed.

## 2026-11-01 Admin subscriptions screen, theme readability, dashboard header, and mastery page

- Built: Admin can open User subscriptions (admin menu) to see each student's plan, status, start and expiry dates. Staff can search by name or email, filter by status, and cancel a paid active plan after a confirm step. Students' access is decided by the server, so cancelling takes effect there.
- Built: Staff can read all subscription rows through a new database read policy. Students still see only their own rows.
- Fixed: Alert and notice text (for example the checkout preview notice and the question report warning) was pale on light backgrounds in light theme. Pale tints now map to readable dark shades in light theme.
- Fixed: Dashboard header chips were white-on-white in light theme. The header now uses fixed colours that the theme does not remap.
- Enhanced: Chapter Mastery shows a belt guide with score ranges, a summary (blue belt or higher, chapters needing practice, average), and chapter tiles with belt name, progress bar and answered count.
- Not verified in a browser: the admin cancel flow needs a staff login; theme readability was checked by reading the styles only.
- Verification: type check and production build passed.

## 2026-11-01 — Site controls: maintenance, announcement bar, homepage ads, role changes
- Built: Maintenance mode now gates the whole app. Visitors and students see a maintenance page while it is on. Admins and the login and admin routes stay accessible. The toggle lives on the admin Settings page.
- Built: Announcement bar at the top of every page, managed from a new admin page "Announcement bar" (on/off, message up to 200 characters, optional link).
- Built: Homepage "Advertisements & Test Series" section, managed in the Homepage Manager under a new Advertisements tab (type, title, text, button, link, optional image, active toggle). Only active items show on the home page.
- Fixed: Changing a user's role silently failed, so granting Student did nothing. Role changes now go through an admin-only function, and errors are shown. The Editor option was removed from the role dropdown.
- Database: platform settings for maintenance and announcement are readable by visitors (two keys only). New function admin_set_user_role. Homepage advertisements use the existing homepage content table.
- Not done: the user ID shown on the user page and the subscription-plan item from the attachment could not be identified (no image was received in the project).
- Not done: existing accounts with the Editor role keep it (data unchanged); the role constraint still allows EDITOR.
- Noted: profiles grants UPDATE on several columns to the anonymous role. RLS blocks anonymous writes, but the grant should be narrowed in a later change.
- Verification: type check and production build passed. Browser behaviour not verified.

## 2026-11-01 — Editor role removed; referral code hidden on admin user list
- Removed: the EDITOR role is gone from the database rules (role check now allows STUDENT and ADMIN), from staff checks, and from the admin and student screens. No EDITOR accounts existed.
- Removed: the referral code line on the admin user list (the only ID-like value shown there).
- Fixed: the announcement bar and maintenance page used theme-remapped text colours; they now use fixed colours so text stays readable in light theme.
- Verification: type check and production build passed. Browser behaviour not verified.

## 2026-11-01 — Premium announcement bar treatment
- Refined: The admin-managed announcement bar now uses a compact branded update marker, clearer message hierarchy, responsive action pill, subtle sheen motion, and dedicated light/dark surfaces. It remains fully driven by the existing admin setting and preserves the configured message and link.
- Verification: TypeScript check and production build passed. Browser visual verification was unavailable.

## 2026-11-01 — Admin maintenance bypass hardened
- Verified: `admin@gmail.com` is the existing ADMIN account.
- Fixed: Admin users now bypass the maintenance settings loading state immediately after authentication, so a slow or unavailable public settings read cannot block admin access. Admin authorization remains role-based rather than email-based.
- Verification: TypeScript check and production build passed.

## 2026-11-01 — Maintenance mode disabled
- Live setting: `platform_settings.maintenance_mode.enabled` is now `false`, so visitors and students can use the full application again.
- Admin access remains unaffected by the setting, with `admin@gmail.com` confirmed as ADMIN.
- Verification: TypeScript check and production build passed. Browser testing was unavailable.

## 2026-11-01 — Announcement bar scheduling, live preview, and admin maintenance bypass confirmation
- Built: The admin Announcement Bar page now includes optional start/end scheduling (local timezone datetime pickers), a live status badge (Live now / Scheduled / Expired / Hidden), and a side-by-side live preview that renders exactly how visitors see the bar, including the marquee scroll. Schedule validation prevents end-before-start. The preview reflects current form state without saving.
- Built: The public AnnouncementBar now honors the schedule window via `isAnnouncementVisible()` — it only renders when enabled, has text, and the current time is within start/end (if set). Existing bars with no schedule behave as before.
- Confirmed: The MaintenanceGate already bypasses maintenance mode for any profile with role `ADMIN` before the settings fetch completes, and also bypasses `/admin` and `/login` path prefixes. When maintenance mode is on, students and visitors see the maintenance page, but admins always retain full access to the admin panel. No change to the gate was needed.
- Key files: src/lib/site-settings.ts, src/components/common/AnnouncementBar.tsx, src/pages/admin/AdminAnnouncementPage.tsx, src/components/common/MaintenanceGate.tsx.
- Verification: TypeScript check and production build passed. Browser testing was unavailable.

## 2026-11-01 — Scrolling announcement bar, dashboard maintenance toggle, expanded ad sections
- Built: Announcement bar now scrolls (premium marquee). The message is duplicated in the track for a seamless loop; a CSS mask fades edges; the marquee pauses on hover and respects `prefers-reduced-motion`. Kept the existing icon, label, and link pill. No logic/routes/auth/RLS changed.
- Built: Added a visual maintenance-mode toggle card to the top of the admin dashboard. Staff can now turn maintenance mode on or off directly from the dashboard without opening Settings or editing database values. It reads the same `maintenance_mode` platform_settings row and writes via the existing admin UPDATE grant. Invalidates the shared site-settings query so the change is reflected app-wide.
- Built: Expanded the homepage Advertisements system with three new ad kinds (FEATURE, COURSE, BANNER) alongside TEST_SERIES, OFFER, GENERAL. The public Advertisements section now groups ads by type and renders each type with a distinct premium layout (wide banner for BANNER, large feature spotlight for FEATURE, gradient cards for the rest). Admins pick the kind from the same dropdown in the Homepage Manager ads tab; no new table or migration needed (stored in the existing homepage_content JSON).
- Added: Missing Hindi i18n keys `admin.navUserSubscriptions` and `admin.navAnnouncement`.
- Key files: src/components/common/AnnouncementBar.tsx, src/index.css, src/pages/admin/AdminDashboardPage.tsx, src/features/home/types/advertisements.ts, src/features/home/components/HomeAdsSection.tsx, src/i18n/hi.ts.
- Verification: TypeScript check and production build passed. Browser testing was unavailable.

## 2026-11-01 — Public-only announcement bar, presets, CSV question upload, brand/hero/payment copy fixes
- Changed: Announcement bar renders inside the public layout only; student and admin pages no longer show it.
- Added: Quick preset buttons on the announcement admin screen (Holiday, Maintenance alert, Flash sale). Each fills the form; the admin still saves.
- Added: CSV question upload in the Mock Builder question picker. Valid rows are inserted into the question bank as PUBLISHED (source IMPORTED) and linked to the mock. MCQs go to Section A and numericals to Section B, in file order, with positions after existing questions.
- Refactored: CSV parser and template moved from the Admin Import page to src/lib/question-csv.ts and shared by both pages. Fixed the template's numerical row, where a `\times` sequence rendered as a tab.
- Fixed: Exam header logo is no longer scaled down or grayscale-filtered; admin sidebar logo uses the compact admin variant.
- Fixed: Public hero headline reduced in size and the card stack no longer uses a negative margin, to avoid overlap at desktop width.
- Changed: Payment success page no longer shows processing forever; it says confirmation has not arrived and points to support.
- Changed: Mock picker tracks linked questions by ID so imported questions show as linked right after import.
- Open: Payments are not confirmed because no payment gateway is connected; needs a Stripe secret key. The unused features/home HeroSection.tsx can be removed.
- Fixed: CSV template MCQ rows had an extra column, so solutions were read as "1" or "0". Verified the template parses to 3 correct rows (2 MCQ, 1 numerical) and that CRLF files parse. Database checks accept the inserted question types, sources, and review status.
- 2026-11-01 follow-up (Mock Builder): Fixed the HARD MCQ template row whose option D had an unclosed math delimiter. Re-parsed the template: 3 rows, 0 errors, all solutions present. After an import or a question toggle in the picker, the mock list and question counts now refresh. The "Questions" action on each mock is labeled with text instead of an icon only.
- Not verified in a browser: the end-to-end insert into the database from the picker. Constraints were checked earlier.
- Declined: Automatic payment confirmation after a few seconds. It would grant paid plans without a payment, so it waits for a real gateway or a manual admin confirmation.
- Verification: TypeScript check and production build passed. Browser testing was unavailable.

## 2026-11-02 Upgrade Pack saved

- Saved the full "MOCK NINJA — Upgrade Pack: Gap Analysis and Bolt.new Prompts" (Nov 2, 2026) verbatim to docs/UPGRADE_PACK.md. It is the durable plan for Upgrade steps U0 to U13, with per-step checklists, a gap table, risk notes, and a suggested run order. Nothing in the app was changed in this entry; this only preserves the plan for future sessions.
- Note: the pack assumes the UI stack is "React, Tailwind CSS and Material UI", but this project actually uses shadcn-style primitives, not MUI. A future U0 audit should correct that line in docs/DECISIONS.md.
- No code or database changed; no build run needed.

## 2026-11-02 Upgrade Step U0 — Read-only audit

- Built: docs/APP_AUDIT.md with all seven sections: routes (77 routes with access and state), data (33 tables all RLS-enabled, 23 functions, 7 edge functions, 2 storage buckets, 1 cron job), feature matrix (30 items), bugs (14 findings with the sidebar scroll cause named), security quick check (no active leak found; broad grants flagged), UI stack (shadcn-style, NOT MUI; 192 hard-coded hex in index.css; 6 duplicated belt maps), deletion manifest draft (every user-referencing table with ON DELETE behavior).
- Key findings (severity order): fake checkout, no signed-in homepage, question bank loads all client-side, incomplete admin user removal, no student password/2FA UI, NTA palette states duplicated in 3 files, AdminSupportPage never records handled_by, belts are flat in 6 files with no SVG, no exam blueprint versioning, sidebar scroll bug caused by sticky overflow-y-auto nav independent of window scroll.
- Schema contract gaps: 18 tables added after migration 026 are not in docs/SCHEMA_CONTRACT.md (custom_practice_sets, faqs, formula_cards, homepage_content, integrity_events, platform_settings, promo_codes, public_profiles, push_subscriptions, question_bookmarks, question_reports, referral_codes, refund_requests, revision_notes, support_inquiries, test_feedback, testimonials, transactions). profiles.role still lists EDITOR in the contract but the role was removed.
- No code or database changed; no build needed. Read-only step.

## 2026-11-02 Upgrade Step U6 Part A — Sidebar scroll fix

- Fixed the sidebar auto-scroll bug in both StudentLayout and AdminLayout.
- Root cause: the sidebars are sticky overflow-y-auto containers whose scroll position is independent of the window. The browser's default scroll-to-active behavior snaps the sidebar when the active link changes, and re-renders (React Query refetch, theme change) shift it further. App.tsx ScrollToTop only resets the window, not the sidebar.
- Fix: added overscroll-behavior:contain to both sidebars, a ref on the nav element, and a useLayoutEffect that saves the scroll position on nav click and restores it after the route changes. The layout stays mounted between settings pages, so the nav element persists and the scroll position survives navigation.
- Files changed: src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx.
- Build verified (Vite + React). Browser testing deferred to user.

### U1: Signed-in homepage and unified daily panel, 2026-11-02
- Built: Route-level home swap — `/` now renders HomeRoute, which shows SignedInHome for authenticated users and LandingPage for visitors. SignedInHome includes: (a) compact welcome with rotating warm line and streak, (b) Continue Learning strip (resume/last result/next chapter), (c) TodayPanel — unified daily practice panel with segmented control (Target Mock, Daily Practice, Redo mistakes, Focus topics), progress ring, and "Why these questions?" explanation, (d) belts overview (top 3 chapters), (e) last 3 attempts, (f) published announcements, (g) study plan prompt. DashboardPage's duplicate daily widgets (Today's next best move card, Daily Target Mock card, Mistake Re-attempt card) replaced with a compact TodayPanel. All dead queries, state, handlers, and imports (dailyMockGenerate, mistakeReattempt, useQueryClient, useState, toast, CheckCircle2, RotateCcw) removed from DashboardPage.
- Key files: src/pages/HomeRoute.tsx, src/features/home/components/SignedInHome.tsx, src/features/home/components/TodayPanel.tsx, src/routes/appRoutes.tsx, src/pages/student/DashboardPage.tsx.
- Tables / functions / routes added: No new tables, functions, or edge functions. Route `/` element changed from LandingPage to HomeRoute. No new routes.
- Verification: Production build passed. Browser testing deferred to user. Hero files unchanged.

### U1 polish: TodayPanel tabs, 2026-11-02
- Built: Tabs now use proper tab semantics (tablist, tab, tabpanel, arrow-key navigation), wrap-free horizontal scroll on small screens, and a fade-in when switching tabs. Tab list is built with explicit conditionals (no invalid spread-ternary). If the active tab disappears (e.g. Redo mistakes after mistakes are cleared), the panel falls back to Target Mock. The three duplicate-row layouts now share one TaskRow component. Daily Practice reuses the daily mock row already loaded for Target Mock instead of a second identical query. Unused variables removed. Copy softened to warm, no-pressure wording.
- Key files: src/features/home/components/TodayPanel.tsx.
- Open question: Target Mock and Daily Practice currently read the same daily record, so they show the same set. Whether they should become separate products is a product decision, not made here.
- Verification: Production build passed. TypeScript check clean for TodayPanel. Browser testing and test:visual not run in this environment.

### Light theme accent, 2026-11-02
- Built: The light theme uses its own cobalt-blue accent (with a cyan secondary) instead of the violet it shared with the dark theme. Affects active navigation underline, focus and hover accents, input focus rings, the hero title gradient, and the light-mode menu highlights. Dark theme colors are unchanged.
- Key files: src/index.css (light tokens only).
- Verification: Production build passed. Visual check in browser not run in this environment.

### U2 (part 1): Reusable belt component, 2026-11-02
- Built: One reusable belt visual with four sizes (xs, sm, md, lg), a fold gradient, stitching line, knot on md and lg, a dashed outline for Unrated, and an optional text label. Signed-in home belt cards now use it in place of flat colored badges.
- Key files: src/components/common/Belt.tsx, src/index.css (belt tokens), src/features/home/components/SignedInHome.tsx.
- Still open for U2: dashboard, mastery, progress matrix, leaderboard, results, public profile, share image, progress bar with "% to next belt", belt-up toast, /dev/ui section, snapshot tests, and the shared sprite.
- Verification: Production build passed. Visual check not run in this environment.

### U2 (part 2): Belt component across student pages, 2026-11-02
- Built: Replaced flat belt color badges with the reusable belt component on DashboardPage (subject overview), FocusPage (focus list and add-topics list), LeaderboardPage (rankings), ProgressPage (strengths, weaknesses, matrix legend, matrix cells), and StudyPlanPage (weak chapters). Removed the per-page BELT_COLORS maps. Belt name is shown as text beside the graphic in every case.
- Key files: src/pages/student/DashboardPage.tsx, FocusPage.tsx, LeaderboardPage.tsx, ProgressPage.tsx, StudyPlanPage.tsx.
- Still open for U2: mastery page belt ladder, results page, public profile and share image, the "percent to next belt" progress bar, belt-up toast, /dev/ui belts section, snapshot tests, and the shared SVG sprite.
- Verification: Production build passed and TypeScript is clean for the changed files. Visual check not run in this environment.

### U2 (part 3): Mastery page belt ladder and chapter cards, 2026-11-02
- Built: The mastery page belt guide and each chapter card now use the reusable belt component instead of flat letter tiles. The guide shows the sm belt above the label and range; chapter cards show the xs belt. Results page, share card, and public profile page were checked: none of them render belts today, so no change was needed there.
- Key files: src/pages/student/MasteryPage.tsx.
- Still open for U2: the "percent to next belt" progress bar, belt-up toast, /dev/ui belts section, snapshot tests, and the shared SVG sprite.
- Verification: Production build passed and TypeScript is clean. Visual check not run in this environment.

### U2 (part 4): Progress bar, dev UI showcase, 2026-11-02
- Built: Added a `progress` prop to the Belt component that renders a thin stitched bar in the next belt's colour plus a "X% to [next]" label. UNRATED with an `evidenceCount` below `minEvidence` (default 8) shows "Needs N more". Added a full belts section to /dev/ui showing all seven levels at xs/sm/md/lg, plus examples with progress and unrated evidence. Exported a `nextBelt` helper.
- Key files: src/components/common/Belt.tsx, src/pages/dev/DevUiPage.tsx.
- Still open for U2: belt-up toast on the results page, Playwright snapshot tests, and the shared SVG sprite. The per-chapter progress bar is not yet wired into the live pages (component supports it; callers pass no `progress` yet) — that wiring needs the mastery query to supply next-belt progress, which is a follow-up.
- Verification: Production build passed and TypeScript is clean. Visual check not run in this environment.

### U2 (part 6): Shared belt sprite, toast first-visit fix, 2026-11-02
- Built: Belt artwork now comes from one hidden sprite (BeltSprite, mounted in App.tsx) with a symbol per level and a knot symbol, referenced by `<use>`. The sprite is a few kilobytes, with no filters or animation.
- Toast: the belt-up toast no longer fires on a first visit with no snapshot. Unused counter removed.
- Type fix: two untyped chapter join casts in SignedInHome now go through unknown to satisfy the typecheck.
- Still open for U2: Playwright snapshot tests. Playwright is not in the project and no browser is available here, so this was not added.
- Landing page: the belt ladder and the sample preview cards now use the real belt component instead of flat coloured boxes. The share card is text-only with no exported image, so it has no belt artwork yet.
- Verification: Production build passed and TypeScript is clean. Visual check not run in this environment.

### U2 (part 7): Belt artwork detail, share card belt, shine, 2026-11-02
- Artwork: belt band now has two stitch rows, a woven pattern defined once in the shared sprite, a grey outline on white belts, and two tails under the knot (md and lg only). The sprite viewbox is taller to fit the tails.
- Share card: shows the student's highest chapter belt beside the result summary. This is not a per-mock belt; the card label is the belt name only.
- Belt-up: the results toast now shows a small belt with a single sheen that plays once and is hidden under reduced motion. Belt rank comparisons use one shared helper.
- Not done: no public profile page exists in the app, so the progress bar could not be wired there. The share image is still text-only (no exported image exists). Playwright tests and the test:visual and memory:check scripts are still missing.
- Verification: Production build passed and TypeScript is clean. Visual check not run in this environment.

### U2 (part 8): Playwright belt snapshots, 2026-11-02
- Added @playwright/test as a dev dependency, a Playwright config that builds and previews the app on port 4173, and a test:visual script.
- Snapshot spec at tests/visual/belts.spec.ts: each of the seven levels at sm, md and lg, on a 360px viewport at 2x. The belt groups on /dev/ui carry test ids for targeting.
### U2 (part 9): Belt snapshots passing + infra fixes, 2026-11-02
- All 21 belt snapshot tests pass (7 levels x 3 sizes at sm/md/lg, 360px viewport, 2x DPR). Baselines committed under tests/visual/belts.spec.ts-snapshots/.
- Playwright config set to 1 worker to avoid flaky parallel runs against the preview server.
- Fixes made to get the preview server rendering: MaintenanceGate now bypasses /dev routes before any loading checks, and the Supabase client module no longer throws on missing env vars (warns instead, falls back to placeholder URL).
- `npm run test:visual` script added to package.json.
- Not done: memory:check script still undefined, no public profile page exists, no exported share image.
- Verification: `npx playwright test` reports 21 passed. Production build and TypeScript pass.

: Progress bar wired into mastery + belt-up toast, 2026-11-02
### U2 (part 5): Progress bar wired into mastery + belt-up toast, 2026-11-02
- Built: Mastery page chapter cards now show the "X% to [next belt]" progress bar for rated chapters and "Needs N more" for unrated chapters, using the new beltProgress helper and evidence_count from the mastery query. Results page now fires a warm toast per chapter whose belt increased since the last visit ("Chapter name: Green belt. Nicely done."), using a sessionStorage belt snapshot per user; no confetti.
- Key files: src/components/common/Belt.tsx (beltProgress helper), src/pages/student/MasteryPage.tsx, src/pages/student/ResultsPage.tsx.
- Still open for U2: Playwright snapshot tests and the shared SVG sprite.
- Verification: Production build passed and TypeScript is clean. Visual check not run in this environment.

### U3 (part 1): Single source of truth for question states, 2026-11-02
- Built: src/exam/questionStates.ts exports the five states (NOT_VISITED, NOT_ANSWERED, ANSWERED, MARKED, ANSWERED_MARKED) with label text, legend wording, symbol shape, token colour, and whether the state is evaluated. Includes deriveState() pure function, isEvaluated(), toPaletteStatus(), STATE_ORDER, and QUESTION_STATES constant.
- PaletteSymbol.tsx now imports shapes from the single source instead of defining them locally. ExamPage.tsx PALETTE_STYLES references QUESTION_STATES shapes. Removed duplicate PaletteStatus import from ExamPage.
- Transition tests: tests/visual/questionStates.spec.ts covers all Phase 5B transitions. All 10 tests pass.
- Not done: PreStartFlow, HeroSection, MockDetailPage, and LandingPage still hard-code palette colours instead of using PaletteSymbol or questionStates. Homepage exam preview section not yet added. NTA fidelity audit rows not yet updated. Keypad accessibility (Enter/Space on keys, inputMode none, aria announcements) not yet verified. Playwright exam flow tests not yet written.
- Verification: All 31 Playwright tests pass. Production build and TypeScript pass.

### U3 (part 2): Palette consolidation, keypad accessibility, homepage preview, NTA audit, 2026-11-02
- Built: All duplicate palette colour definitions removed from PreStartFlow, HeroSection, MockDetailPage, and LandingPage. Every screen now imports the five states from src/exam/questionStates.ts and renders PaletteSymbol components. No hard-coded palette colours remain outside the single source.
- Keypad: NumericalKeypad display is read-only with inputMode=none (no phone keyboard), role=textbox, aria-readonly, aria-live=polite (value announced). All digit keys have aria-labels and are native buttons (Enter/Space operable). "Clear" renamed to "Clear All". Removed unused cn import.
- Homepage exam preview: The NTA showcase section on the landing page now has the heading "Practise on the screen you will face on exam day", a non-interactive preview assembled from the real PaletteSymbol and NumericalKeypad components (decorative, aria-hidden), a text legend with one-line meanings for all five states, and the caption "Independent practice platform. Not affiliated with NTA."
- NTA fidelity audit: Updated docs/NTA_FIDELITY_AUDIT.md. Rows for palette symbols, keypad, single source of truth, state transitions, homepage preview, and footer disclaimer marked VERIFIED. All others remain UNKNOWN for comparison with the real NTA interface.
- Not done: Playwright exam-flow tests (answer, mark, clear, navigate across all five states with palette counts checked; keypad by mouse and by keyboard; no OS keyboard on a mobile viewport). The server-side grading test (confirming only ANSWERED and ANSWERED_MARKED are graded) is not yet written.
- Verification: All 31 Playwright tests pass (21 belt snapshots + 10 transition tests). Production build and TypeScript pass.

### U3 (part 3): Playwright exam-flow tests, server grading test, 2026-11-02
- Built: Added NumericalKeypad and Question Palette sections to /dev/ui with test ids for isolated testing without auth or Supabase.
- Playwright tests (tests/visual/examKeypad.spec.ts, 8 tests): all five palette states render with correct labels and counts; keypad display is read-only with inputMode=none and aria-readonly; all 12 digit keys are focusable and operable with Enter and Space; backspace and Clear All buttons have aria-labels; mobile viewport (390px, touch) confirms no OS keyboard.
- Server-side grading test (docs/SECURITY_TESTS.sql, Test 14): documents that the exam submit Edge Function grades only responses where answer is not null — i.e. ANSWERED and ANSWERED_MARKED only. NOT_ANSWERED, MARKED, and NOT_VISITED are not graded.
- U3 is now complete. All checklist items from the upgrade pack pass.
- Verification: All 39 Playwright tests pass (21 belt snapshots + 10 transition tests + 8 keypad/palette tests). Production build and TypeScript pass.

### U4: User management and complete data deletion, 2026-11-02
- Built: Migration 20261102_u4_user_management_and_deletion added:
  - profiles.status column (ACTIVE, SUSPENDED, PENDING_GUARDIAN) and suspended_at
  - consent_events table (guardian consent audit trail, staff-readable)
  - deletion_requests table (tracks student/admin deletion requests)
  - deletion_audit table (no personal data — only subject hash and tables cleared)
  - log_consent_event() function (service role only)
  - suspend_user() function (admin-only, checks caller is ADMIN, blocks self-suspend)
  - delete_user_data() function (manifest-driven, one transaction, 27 steps)
- Edge function admin-remove-user updated: now calls delete_user_data RPC first (manifest-driven deletion), then deletes avatar storage objects, then deletes the auth user.
- Admin Users page enhanced: status filter (Active/Suspended/Pending guardian), status badges, suspend/unsuspend buttons, minor detection (birth_year < 18), guardian consent indicator, typed email confirmation for deletion, what-will-be-deleted/kept summary in the delete dialog.
- Deletion Requests page added at /admin/users/deletions: lists all deletion requests with status, shows deletion_audit log (hashed, no personal data).
- SECURITY_TESTS.sql updated with Test 14 (server grading) and Test 15 (deletion coverage test).
- Manifest covers 27 tables: responses, attempts, mastery_scores, student_focus_topics, user_daily_mocks, notification_log, push_subscriptions, question_bookmarks, question_reports, test_feedback, integrity_events, custom_practice_sets, personal mocks, public_profiles, consent_events, support_inquiries (anonymised), ai_usage_ledger (anonymised), transactions (anonymised), refund_requests (anonymised), user_subscriptions (anonymised), referral_codes, promo_codes (anonymised), questions (anonymised), platform_settings (anonymised), profiles.
- Verification: All 39 Playwright tests pass. Production build and TypeScript pass.
- Not done: The automated deletion coverage test script (scripts/test-deletion.ts) that creates a user, inserts rows in every table, runs deletion, and asserts zero rows. The student self-service deletion flow with grace period. These are deferred.

### U4 completion: self-service deletion, suspended enforcement, consent history, FK coverage test, 2026-11-02
- Built: Migration 20261102_u4_self_service_deletion_grace_period added ACCOUNT_DELETION_GRACE_DAYS platform setting (default 7), request_account_deletion() and cancel_account_deletion() SECURITY DEFINER functions (authenticated only).
- Edge function self-delete-user deployed: creates a deletion request with grace period, or completes immediate deletion when grace is 0. Blocks admin self-deletion. Calls delete_user_data, removes avatar storage, deletes auth user.
- Student SettingsPage: "Delete account" section with grace period explanation, request button, and cancel-during-grace option. Deletion request status fetched from deletion_requests table.
- Suspended user enforcement: exam Edge Function now checks profiles.status at the top of every action and returns 403 for suspended users.
- Admin Users page: expandable user detail panel showing consent_events history and recent attempts (scores and mock titles). "View consent history & attempts" toggle button on each user card.
- FK coverage test: scripts/test-deletion.sql queries information_schema for every FK to profiles or auth.users, cross-references against the manifest table list, and flags any table that is neither in the manifest nor has ON DELETE CASCADE/SET NULL.
- Verification: Production build passes. Edge functions deployed.
- U4 checklist status: all items now implemented except live browser testing of the student self-service flow and the admin consent history panel.

### U5: Question bank indexes, licence, import batches, and import wizard, 2026-11-02
- Built: Migration 20261102_u5_question_bank_licence_and_import_batches added:
  - Indexes on questions.chapter_id, review_status, type, difficulty, source, created_at, licence
  - questions.licence column (OWNED/LICENSED/PUBLIC_DOMAIN/UNKNOWN, default UNKNOWN)
  - questions.source_reference text column
  - import_batches table (id, created_by, file_name, rows_total, rows_ok, rows_failed, status, created_at) with RLS (staff read, service_role write)
  - prevent_publish_unknown_licence trigger: blocks PUBLISHED status when licence = UNKNOWN
- Built: Migration 20261102_u5_batch_rollback_function added rollback_import_batch(p_batch_id) — SECURITY DEFINER, admin-only. Checks no questions from the batch are PUBLISHED or linked to mock tests before deleting. Updates batch status to ROLLED_BACK.
- Built: import-questions edge function deployed. Full server-side re-validation of CSV/JSON uploads (max 5MB/2000 rows). Validates type, difficulty, chapter_id, licence, MCQ options, numerical answers. Dry-run mode for validation without writing. Creates import_batches record. Admin-only.
- Built: AdminQuestionsPage rewritten as server-paged data table:
  - Server-side pagination (25 per page) with first/prev/next/last controls
  - Sortable columns (created_at, type, difficulty, review_status, source, licence)
  - Filters: search, subject, chapter, type, difficulty, status, licence
  - Column chooser (show/hide status, type, difficulty, licence, chapter, statement, source)
  - Row expander with KaTeX preview of full statement, options, solution, source reference
  - Sticky table header, mobile card view below lg breakpoint
  - Counts strip (total, published, draft, review, MCQ, numerical, unknown licence)
  - Bulk publish and bulk delete with selection
  - Licence and source_reference fields in the edit form
  - Publish blocked for UNKNOWN licence (both single and bulk)
  - Import batch history with rollback buttons
- Built: AdminImportPage rewritten as 4-step wizard:
  - Step 1 Upload: drag-and-drop CSV or JSON, downloadable CSV template (now includes licence + source_reference columns), recent import batches list
  - Step 2 Validate: server dry run, file summary
  - Step 3 Review: validation summary (total/valid/invalid), error list with row numbers, downloadable error CSV, import button
  - Step 4 Done: import results (imported/failed/validation errors), batch ID, link to question bank
- Updated: question-csv.ts template now includes licence and source_reference columns
- Updated: types.ts added Licence type and ImportBatch interface; queries.ts added usePagedQuestions, useQuestionCounts, useImportBatches hooks
- Verification: pending build

### U6: Admin analytics, site settings, and public settings wiring, 2026-11-02
- Built: Migration 20261102_u6_admin_analytics_functions added 7 SECURITY DEFINER aggregate functions (admin-only, no personal data): admin_signups_per_day, admin_active_students_per_day, admin_attempts_per_day, admin_avg_score_by_type, admin_completion_rate, admin_question_coverage, admin_open_vs_resolved_reports. The reports function returns column `report_status` (not `status`) to avoid ambiguity.
- Built: Migration 20261102_u6_site_settings added get_public_settings() SECURITY DEFINER function returning SITE_GLOBAL_PUBLISHED from platform_settings. Granted EXECUTE to authenticated and anon.
- Built: AdminAnalyticsPage at /admin/analytics — date range selector (7/30/90 days), summary cards (signups, active students, attempts, completion rate), three daily bar charts, score by mock type, completion rate breakdown, question coverage table (subject x difficulty), open vs resolved reports, CSV export per chart, 5-minute React Query staleTime caching, loading and empty states.
- Built: AdminSiteSettingsPage at /admin/settings/site — global settings form (site name, tagline, support email, default language, SEO title/description, share image, legal entity, copyright, grievance officer), contact desks editor (add/remove desks with label, type, email, phone, whatsapp, hours, address, response_time), social links editor (platform dropdown, https URL validation), draft save + publish flow. Fixed useState(() => {}) bug by replacing with useEffect that loads saved settings on mount.
- Built: usePublicSettings hook in queries.ts calls get_public_settings() RPC with 5-minute staleTime.
- Built: PublicLayout footer now reads social links, tagline, copyright line, and WhatsApp number from published site settings instead of hard-coded values. Falls back to existing defaults when no settings are published.
- Built: ContactPage now reads contact desks, support email, WhatsApp number, and response time from published site settings. Shows phone and address desks dynamically. Falls back to existing hard-coded defaults only when no settings have been published.
- Built: Admin sidebar gained a "Site Settings" nav link at /admin/settings/site with a Globe icon and i18n keys (admin.siteSettingsTitle, admin.siteSettingsDesc).
- Verification: Production build passed. Browser testing unavailable.

## U6 closure (publish validation, allow-list, fallbacks)
- Publish now runs the same validation as draft save (emails, social links, contact desk emails).
- Social links must be https and on their platform domain (src/lib/social-platforms.ts). Other platform accepts any https URL.
- Hard-coded WhatsApp number and contact cards removed from public pages; WhatsApp button hidden until a desk has a WhatsApp number.
- Known gap: static legal pages (Terms, Billing, Notifications support) still show support@mockninja.in as text.
- Build: npm run build passed.

## U7 step 5 (leaderboard settings, moderation, audit log)
- Built: LEADERBOARD_SETTINGS in platform_settings (enabled, min cohort 30, min questions per chapter 8, min total 50, list size 50, subjects shown). Admin-only save via admin_save_leaderboard_settings.
- Built: get_leaderboard(subject, limit) reads settings only. Caller-supplied thresholds removed, so the cohort rule cannot be bypassed from the client. Hidden profiles and blocklisted handles are excluded.
- Built: public_profiles.hidden_by_admin with a trigger that blocks non-staff changes. Students cannot unhide themselves.
- Built: leaderboard_handle_blocklist table, staff-only read, changes via admin_set_handle_blocklist.
- Built: audit_log table (staff read, written by admin RPCs only). Leaderboard settings, profile hide, and blocklist changes write rows.
- Built: /admin/settings/leaderboard page (enabled toggle, four numeric thresholds, subject toggles, guardian consent note stored as required).
- Security check: admin RPCs each contain an admin-role check. get_leaderboard has no admin check by design; it is granted to signed-in users and returns only ranked, non-hidden rows. Advisor still lists SECURITY DEFINER functions callable by signed-in users (intended for admin RPCs, guarded internally) and older functions with a mutable search path (pre-existing, not changed in U7).
- Verification: npm run build passed. Browser testing unavailable.
- Open: profile-hide and blocklist admin UI not built; U7 steps 1-4 and 6 (blueprints, integrity review, watermark policy, audit for those) not started.

## U7 step 4 (watermark policy)
- Built: one site-wide WATERMARK_POLICY in platform_settings (enabled, content SHORT_ID only, opacity 3 to 10 percent, layout SINGLE or TILED, scope EXAM_ONLY or ALL_MODES).
- Built: admin_save_watermark_policy (staff only, validated, writes audit_log row WATERMARK_POLICY_SAVED).
- Built: /admin/settings/watermark with settings form, live preview and the statement that a watermark is a deterrent and does not prevent copying.
- Built: attempts.watermark_snapshot. The exam start action copies the policy into the attempt; the exam screen reads the snapshot, so mid-exam changes have no effect. Attempts created before this change have no snapshot and show the default watermark.
- Removed: the per-mock watermark page at /admin/watermarks and its per-mock settings (they were no longer read by the exam screen).
- Deployed: exam edge function (start action and get action).
- Verification: npm run build passed. Browser testing unavailable.
- Open: "Exam screen and practice" scope is stored but practice screens do not read it yet. U7 steps 1-3 and 6 (blueprints, integrity review, audit for those pages) not started.

## U7 step 3 (integrity review, part 1)
- Built: integrity_reviews table (append-only notes with status NONE, NOTED, FOLLOW_UP). Staff-only read. Writes only through admin_add_integrity_review, which writes an audit_log row INTEGRITY_REVIEW_ADDED.
- Built: /admin/integrity page. Lists recent attempts with event counts by type, filters for event type, minimum events, start date and mock. Opens a timeline per attempt with review notes and a note form.
- Wording: the page says "events" only. No violation or cheating labels.
- Open: blueprint steps and their audit rows still not started.
- Verification: npm run build passed. Browser testing unavailable.

## U7 step 3 (integrity review, part 2: retention, student view)
- Built: INTEGRITY_RETENTION setting (default 90 days, allowed 7 to 365) saved via admin_save_integrity_retention, which writes audit_log INTEGRITY_RETENTION_SAVED. Control sits on /admin/integrity.
- Built: integrity_purge_expired() runs daily at 03:15 UTC (cron job integrity-event-purge). Deletes event rows older than the setting. Not callable by any client role. Review notes are kept.
- Built: integrity_events grants narrowed. anon has none; authenticated has SELECT and INSERT only. No client code updates or deletes these rows.
- Built: student "Activity log for this attempt" card on the results page. Lists their own events with time since start, and states they are not a finding and no penalty applies. Uses the existing own-row SELECT policy.
- Migration: 20261103_u7_integrity_retention (applied).
- Verification: npm run build passed; purge function executed with zero rows deleted; setting reads 90 days. Browser testing unavailable.

## Checkout: fake payment removed (review follow-up)
- Changed: checkout page no longer creates a pending transaction or redirects to the success page. The pay button is disabled with a plain notice that online payments are not available and nothing is charged.
- Open: real payment provider integration (U10) not started. Payment success and failure pages remain as they were.
- Verification: npm run build passed. Browser testing unavailable.

## Support inquiries: handler now records who handled the ticket (review follow-up)
- Changed: when staff set a status on a support inquiry, the signed-in staff member is saved as the handler. Previously it was never written.
- Verification: npm run build passed. Browser testing unavailable.

## Security follow-up: search path pinned on nine public functions (review follow-up)
- Changed: the nine functions flagged by the database security check now have a fixed search path. No logic or call permissions changed.
- Migration: 20261103_u8_pin_function_search_path (applied). The name says u8 but this is a security follow-up, not the U8 support desk step.
- Open: anon and authenticated still hold column-level update rights on support inquiries. Row policies limit writes to staff, so this is not an open hole, but it should be narrowed in a later change. Staff-only admin functions are still callable by signed-in users and rely on internal checks.
- Verification: npm run build passed; migration applied without errors. Browser testing unavailable.

## Support inquiries: write rights narrowed, contact form fixed (review follow-up)
- Migrations: 20261103_u8_support_inquiries_write_grants and 20261103_u8_support_inquiries_insert_id (both applied).
- Fixed: browser roles had table-wide DELETE and TRUNCATE on support tickets. TRUNCATE ignores row policies, so this was a data-loss risk. Now revoked. Inserts are limited to the form columns, and staff can update only status, internal notes and handler.
- Changed: the contact form generates the ticket id in the browser and inserts without reading the row back. Logged-out visitors could not read it back, so the form likely failed before this change.
- Open: logged-out visitors still hold a read grant on support tickets. Row policies block reads, so no data is exposed, but the grant should be removed in a later change.
- Verification: npm run build passed; grants checked with a catalog query. Browser testing of the contact form not possible here.

## Support inquiries: logged-out read grant removed (review follow-up)
- Migration: 20261103_u8_support_inquiries_revoke_anon_select (applied). The contact form no longer reads rows back, so this was unused. Row policies were already blocking reads.

## Exam numeric keypad: physical keyboard entry (review follow-up)
- Changed: the answer display can be reached with the Tab key and accepts digits, decimal point, minus sign, Backspace and Delete. Buttons still work as before.
- Removed: a leftover input-mode attribute on a non-input element.
- Verification: npm run build passed. Browser testing of keyboard entry not possible here.

## Support email: one setting for every page (owner request)
- Migration: 20261103_u8_public_read_support_email (applied). Logged-out visitors can now read the support email setting, added to the existing public allowlist.
- Stored value set to support@mockninja.in (was support@mockninja.com in the settings table).
- Changed: terms, billing invoice, student support page and admin settings now read the address from the setting. The fallback is support@mockninja.in when the setting is empty or fails to load.
- Verification: npm run build passed. Browser testing not possible here.

## NTA palette styles: single source of truth (review follow-up)
- Changed: the exam page now imports the palette style function from PaletteSymbol instead of keeping its own copy. Color or shape changes now need only one edit.
- The landing page already used the shared component.
- Verification: npm run build passed.

## Sidebar scroll restore: all nav links save position (review follow-up, bug B1)
- Changed: every desktop sidebar nav link now saves the sidebar scroll position before navigating. Previously only the settings link did, so the restore jumped to a stale position when other links were clicked.
- Verification: npm run build passed. Browser testing not possible here.

## Admin attempts timer cell and audit B5 status (review follow-up, bug B3)
- Changed: the duration cell on the admin attempts table now shows the attempt duration in minutes, or a dash when it is missing. Previously a stray condition on total marks could leave the cell empty.
- B5 (support inquiries recording the handling staff member) was already fixed in code and is recorded in DECISIONS.md; no change this session.
- Verification: npm run build passed. Browser testing not possible here.

## Admin navigation: one list for desktop and mobile (review follow-up, bug B2)
- Changed: the admin sidebar and the mobile drawer now render from one shared function. Styling for each stays as before. Adding or renaming an admin page now needs one edit.
- B4 (watermark toggle) was already resolved: the watermark page saves through an explicit Save button. No change this session.
- Verification: npm run build passed. Browser testing not possible here.

## Belt thresholds: one function for subject belts (audit B10, partial)
- Changed: the dashboard and home page now compute a subject belt through one shared function in the belt module, instead of two copies of the cutoff ladder. Cutoffs are unchanged.
- Still open: the mastery range labels on the mastery page are display text and were left as-is; exam blueprint versioning is untouched.
- Verification: npm run build passed. Browser testing not possible here.

## Student change password (audit P1 item 5, partial)
- Added: a Change password card on the settings page. It asks for the current password, checks it, then sets the new one (at least 8 characters, must match the confirmation, must differ from the current one).
- Not yet added: sign-out from other devices and two-step sign-in.
- Verification: npm run build passed. Browser testing not possible here.

## Sign out other devices (audit P1 item 5, partial)
- Added: an Other devices card on the settings page that signs out every other session. The current device stays signed in.
- Verification: npm run build passed. Browser testing not possible here.

## Two-step sign-in (TOTP MFA) — audit P1 item 5
- Added: MFA enrollment card on the settings page. Students add a secret key to their authenticator app, verify with a 6-digit code, and two-step sign-in is enabled.
- Added: MFA challenge step in the login page. When a user with MFA signs in, they are prompted for a 6-digit code from their app.
- No external QR API used — the secret key is displayed as text for manual entry (safer, no third-party data leak).
- Supabase MFA is a built-in feature, no extra project config needed.
- Verification: npm run build passed. Browser testing not possible here.

## Admin user removal cleanup — already implemented
- The delete_user_data RPC already handles all tables: support_inquiries (anonymised), referral_codes (deleted), deletion_audit row written, avatars storage cleaned up by the edge function.
- No changes needed.

## Exam blueprint versioning — audit P2 item 9
- Added: blueprint_snapshot column on attempts (jsonb, nullable).
- At exam start, the marking_scheme and total_marks are frozen onto the attempt row.
- At grading time (submit), the snapshot is used if available; older attempts fall back to the live mock_tests value (no behavior change for past attempts).
- At results time, the frozen marking scheme and total marks are returned to the student, so results always reflect the rules the attempt was graded with.
- Deployed: updated exam edge function deployed to Supabase.
- Verification: npm run build passed. Browser testing not possible here.

### MFA correction, 2026-11-03
- Correction to the earlier MFA entry: password sign-in never returns an MFA error, so the code step never appeared and the route guards did not enforce the second step. Fixed.
- Built: After password sign-in the login page checks the session assurance level. If a TOTP code is required it shows the code step. The auth provider exposes a pending-MFA flag that ProtectedRoute uses to hold users on the login page until the code is verified. PublicOnlyRoute lets the login page stay open while the code is pending. "Back to sign in" during the code step signs the user out.
- Key files: src/lib/auth.tsx, src/pages/auth/LoginPage.tsx, src/components/auth/ProtectedRoute.tsx, src/components/auth/PublicOnlyRoute.tsx, src/components/student/MfaCard.tsx.
- Tables / functions / routes added: None.
- Env var names added: None.
- Stubbed or TODO: Database rows are not yet restricted to second-step sessions, so direct API calls with a password-only session are not blocked. Browser testing not done.
- Known bugs: None identified by the build.

### Attempt start and popup fixes, 2026-11-03
- Built: Starting a mock now recreates the signed-in student's profile row if it is missing, so the attempt can be saved without violating the attempts-to-profiles foreign key. Popup panels (dialogs, modals, drawers) now use a solid background in the dark theme instead of a six-percent tint.
- Key files: supabase/functions/exam/index.ts (start action, redeployed), src/index.css (popup background rule).
- Tables / functions / routes added: None.
- Env var names added: None.
- Stubbed or TODO: The cause is most likely a login whose profile was removed by an earlier admin removal. Admin removal deletes the profile before the login, so a failed login deletion can leave this state. The exam start now repairs it, but a deleted user could be re-profiled if their login survives. Consider reordering admin removal. Could not read the auth user table to confirm the specific account. Browser testing not done.
- Known bugs: None identified by the build.

### Study plan DB-backed completions, 2026-11-03
- Built: Study plan day-completion now persists to the database instead of localStorage, so it syncs across devices. New table study_plan_completions with owner-scoped RLS. The study plan page reads completions via TanStack Query and toggles by inserting or deleting rows.
- Key files: src/pages/student/StudyPlanPage.tsx, supabase/migrations/20261103150000_study_plan_completions (applied via MCP).
- Tables / functions / routes added: 1 table (study_plan_completions). No new functions or routes.
- Env var names added: None.
- Stubbed or TODO: The weekly goal is still hardcoded at 5. Day completion does not unlock any reward or notification. Could not browser-test.
- Known bugs: None identified by the build.

### Landing page keypad and belt fixes, 2026-11-03
- Built: Removed the numerical keypad from the exam interface showcase section on the home page. Replaced text belt badges in the leaderboard and testimonials with the real SVG Belt component.
- Key files: src/pages/LandingPage.tsx.
- Tables / functions / routes added: None.
- Env var names added: None.
- Known bugs: None identified by the build.

### Technical partner footer, 2026-11-03
- Built: Added "Technical Partner ELSxGlobal | Div of Evolucentsphere Private Limited" to the public footer below the copyright and NTA disclaimer lines.
- Key files: src/layouts/PublicLayout.tsx.
- Tables / functions / routes added: None.
- Env var names added: None.
- Known bugs: None identified by the build.

### About page and technical partner link, 2026-11-03
- Built: New /about route with a full About page covering the platform's values, what was built, and the NTA independence disclaimer. Added About to the footer Quick Links and the header More dropdown. The technical partner name ELSxGlobal in the footer is now a clickable link to https://evolucentsphere.com/ opening in a new tab.
- Key files: src/pages/public/AboutPage.tsx (new), src/routes/appRoutes.tsx, src/layouts/PublicLayout.tsx.
- Tables / functions / routes added: 1 new route (/about). No tables or functions.
- Env var names added: None.
- Known bugs: None identified by the build.

### Blueprint snapshot type fix, 2026-11-03
- Built: Added blueprint_snapshot to the ResultsData.attempt TypeScript interface so the results page type matches the edge function response. The edge function already returns blueprint_snapshot on the attempt and merges its marking_scheme into mock_test; the type was the only gap.
- Key files: src/lib/exam-api.ts.
- Tables / functions / routes added: None.
- Env var names added: None.
- Known bugs: None identified by the build.

### Real notifications centre in bell dropdown, 2026-11-03
- Built: The student bell dropdown now reads real entries from the notification_log table (last 7 days) and displays them with type-specific labels and icons. In-progress attempts and daily mock ready items are still shown first. A new NotifBadge component shows a numeric unread count badge on the bell that reflects the actual notification_log row count. The dropdown has a "View all" link to the full notifications page. The SUPPORT_REPLY type was added to the notification_log CHECK constraint so support reply triggers no longer fail silently. The dropdown styling matches the dark glass theme.
- Key files: src/layouts/StudentLayout.tsx, supabase/migrations/20261103160000_add_support_reply_to_notification_check.sql.
- Tables / functions / routes added: 1 migration (CHECK constraint update). No new tables, functions, or routes.
- Env var names added: None.
- Known bugs: None identified by the build.

### Test series, analytics, and sidebar wiring, 2026-11-03
- Built: Registered three new routes in appRoutes.tsx — /series and /test-series (TestSeriesPage, protected), /analytics (AnalyticsPage, protected), /admin/test-series (AdminTestSeriesPage, admin-only). Added Test Series to the student sidebar Overview group and the admin sidebar Content group. Added Analytics to the student sidebar Insights group. Fixed AdminTestSeriesPage missing useQuery import and converted all its light-theme classes (text-navy-900/700, bg-navy-50, border-navy-200) to the dark glass system (text-white/navy-300, bg-white/5, border-white/10). Replaced fragile mobileNavItems array-index references with explicit items and removed the now-unused allNavItems. Added i18n keys nav.testSeries, nav.analytics, admin.testSeriesTitle.
- Key files: src/routes/appRoutes.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/pages/admin/AdminTestSeriesPage.tsx, src/i18n/en.ts.
- Verification: Production build passed (6.26s).

### CSV import and authentication UX fix, 2026-11-03
- Built: Reworked mock-builder CSV parsing to preserve quoted fields containing embedded line breaks and escaped quotes. Licence and source_reference columns are now read and included when questions are saved, preventing imported published questions from silently receiving UNKNOWN licence. Updated login and signup surfaces from retired violet/magenta accents to the cyan application palette, including links, focus rings, and auth panel treatments.
- Key files: src/lib/question-csv.ts, src/components/admin/MockQuestionCsvImport.tsx, src/index.css, src/pages/auth/LoginPage.tsx, src/pages/auth/SignupPage.tsx.
- Tables / functions / routes added: None.
- Verification: Production build passed. Existing dynamic-import and large-chunk notices remain non-blocking.

### Admin test feedback inbox, 2026-11-03
- Built: Added a protected admin feedback inbox at /admin/test-feedback. Staff can filter responses by star rating, see average rating and response count, review the associated mock title, read student comments, refresh results, and receive clear loading, empty, and error states. Added the page to the admin Content navigation in English and Hindi.
- Key files: src/pages/admin/AdminTestFeedbackPage.tsx, src/routes/appRoutes.tsx, src/layouts/AdminLayout.tsx, src/i18n/en.ts, src/i18n/hi.ts.
- Tables / functions / routes added: No schema changes. Added 1 admin route (/admin/test-feedback) using the existing staff SELECT policy on test_feedback.
- Verification: Production build passed. Browser preview was unavailable in this environment.

### Custom practice test history, 2026-11-03
- Built: Added a protected page at /dpp/custom/history listing every custom practice set the student has built, with question count, difficulty, chapter count, creation date, latest attempt status, score percentage, and a context-appropriate action (Resume, View result, or Start test). Linked from the practice builder header and wired as a new protected route. No schema changes; uses the existing custom_practice_sets table and its own-row SELECT policy.
- Key files: src/pages/student/CustomPracticeHistoryPage.tsx, src/routes/appRoutes.tsx, src/pages/student/CustomPracticePage.tsx.
- Tables / functions / routes added: No schema changes. Added 1 student route (/dpp/custom/history).
- Verification: Production build passed. Browser preview was unavailable in this environment.

### CSV import and custom practice builder improvements, 2026-11-03
- Built: Fixed the admin CSV question import panel so text is readable on the dark admin surface (white/navy-300/navy-400 colors, red-300 error text). Replaced the one-by-one question insert loop with a single batch insert call, making uploads faster and atomic. Added a 5 MB file size guard and an inline progress indicator. Improved the custom practice builder with Select all / Clear all controls, per-subject Select all / Deselect all toggles with live counts, collapsible subject groups, and clearer error messages that surface the actual RPC error text instead of a generic message.
- Key files: src/components/admin/MockQuestionCsvImport.tsx, src/pages/student/CustomPracticePage.tsx.
- Tables / functions / routes added: None.
- Verification: Production build passed. Browser preview was unavailable in this environment.

### FK fix, dark theme dialogs, upload history, exam logo, SVG avatar, 2026-11-03 (session 2)
- Fixed FK constraint error `questions_chapter_id_fkey`: The mock-builder CSV import now fetches valid chapter IDs from the database before insert and rejects rows with non-existent chapter_id values, showing "Chapter ID X does not exist" instead of the raw Postgres error. The import-questions edge function also validates chapter_id against the chapters table server-side. The question-csv parser now flags missing/invalid chapter_id as an error rather than silently substituting 0.
- Added upload history table to the mock builder question picker: A collapsible history panel shows recent import batches with file name, question counts (ok/failed/total), status badge, and date. Uses the existing useImportBatches hook. Mock-builder imports now also record to import_batches for tracking.
- Converted AdminMocksPage question picker dialog and mock form dialog to dark theme: Replaced light bg-white/text-navy-900/border-navy-200 classes with dark bg-[#11121c]/text-white/border-white/10 and matching input/label/badge styling. Both dialogs are now fully readable on the dark admin surface.
- Converted AdminImportPage to dark theme: All page surfaces, step indicators, cards, batch history, error states, and buttons now use dark theme colors.
- Removed background from exam brand logo: The ExamPage header now uses the transparent mock-ninja-icon-transparent.png instead of "image copy 2.png" with mix-blend-multiply/grayscale/contrast filters. The logo renders cleanly on the white exam header.
- Added GradCapAvatar SVG component: A graduation-cap SVG icon in a gradient circle, used as the default profile avatar fallback when no avatar_url is set. Integrated into the ProfileMenu (StudentLayout + AdminLayout), AccountPage, and SettingsPage. If a user has uploaded a photo, that photo is shown instead.
- Key files: src/components/admin/MockQuestionCsvImport.tsx, src/pages/admin/AdminMocksPage.tsx, src/pages/admin/AdminImportPage.tsx, src/pages/student/ExamPage.tsx, src/components/common/GradCapAvatar.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/pages/student/AccountPage.tsx, src/pages/student/SettingsPage.tsx, src/lib/question-csv.ts, supabase/functions/import-questions/index.ts.
- Tables / functions / routes added: None (all changes use existing schema and existing import_batches table).
- Verification: Production build passed. Edge function already deployed with chapter_id validation.

### Typecheck cleanup, pricing switch fix, plan validation, 2026-11-04
- Fixed the live pricing switch database function that ran an UPDATE on subscription_plans without a WHERE clause. Applied as a new migration (20261104100000_fix_set_live_pricing_model_where); the earlier migration was not edited. Admin-only check, SECURITY INVOKER, and grants unchanged.
- Subscription plan editor now validates name, slug, price (0 or more) and mock count before saving.
- Analytics CSV export accepts typed row objects; admin consent-history and settings deletion button typed correctly (destructive variant).
- Verified: sidebar scroll preservation already present in StudentLayout and AdminLayout (U6 part A).
- Key files: src/pages/admin/AdminSubscriptionPlansPage.tsx, src/pages/admin/AdminAnalyticsPage.tsx, src/pages/admin/AdminPages.tsx, src/pages/student/SettingsPage.tsx, supabase/migrations/20261104100000_fix_set_live_pricing_model_where.sql.
- Tables / functions / routes added: None. One function body replaced (set_live_pricing_model).
- Stubbed or TODO: Plan editor still uses light surfaces (dark theme pending). Remaining list in the session summary.
- Verification: Typecheck passed; production build passed.
- Known bugs: None identified after the fixes above.

### Plan editor dark theme, 2026-11-04
- Subscription plan editor dialog now uses the dark admin dialog style (dark panel, light labels, dark inputs), matching the mock builder dialogs. Cancel and Save buttons use the shared button variants unchanged; not yet visually checked in a browser.
- Key files: src/pages/admin/AdminSubscriptionPlansPage.tsx.
- Tables / functions / routes added: None.
- Verification: Typecheck and production build passed.

### Solutions share dialog, 2026-11-04
- Added a Share button on the detailed solutions page that opens a dialog with WhatsApp, Telegram, X, LinkedIn and Facebook links, plus a copy-link button. Shared text names the mock and the platform only; no scores, answers or solutions are included. Copy-link copies the site address because solution pages are private to the signed-in student.
- Key files: src/components/student/SolutionsShareDialog.tsx (new), src/pages/student/SolutionsPage.tsx.
- Tables / functions / routes added: None.
- Verification: Typecheck and production build passed. Not checked in a browser.

### Admin polish: promo, proctoring, subscription expiry, 2026-11-04
- Built: Promo codes page blocks deleting redeemed codes (deactivate instead) and validates discount percentage and usage limits before saving. Proctoring page moved into its own dark-themed file with cached queries. User subscriptions page shows days-to-expiry badges and a banner counting paid plans expiring within 7 days. Admin header bell links to user-subscriptions and shows the same expiry count, refreshing every minute. Promo redemption recording fixed at the database level: a trigger on transactions increments promo_codes.used_count when status transitions to SUCCESS and decrements when it transitions away. validate_promo_code per-user check now excludes FAILED transactions so a failed or abandoned payment doesn't block reuse.
- Key files: src/pages/admin/AdminPromoCodesPage.tsx, src/pages/admin/AdminProctoringPage.tsx (new), src/pages/admin/AdminPages.tsx, src/routes/appRoutes.tsx, src/pages/admin/AdminUserSubscriptionsPage.tsx, src/lib/subscription-expiry.ts (new), src/layouts/AdminLayout.tsx, supabase/migrations/20261104120000_promo_redemption_trigger.sql.
- Tables / functions / routes added: 1 migration (trigger + function + validate_promo_code fix). No new routes.
- Verification: Typecheck and production build passed. Not checked in a browser. Expiry bell count not verified end-to-end.

### CSV chapter ID compatibility, 2026-11-04
- Built: Fixed question CSV uploads rejecting every row when files used the old 1-based chapter IDs from the previous template. The template now uses the seeded database ID 101, the mock-builder upload explains the accepted ID format, and both the mock-builder client and standalone import Edge Function translate legacy 1-based IDs to the current chapter IDs before validation and insert.
- Key files: src/lib/question-csv.ts, src/components/admin/MockQuestionCsvImport.tsx, supabase/functions/import-questions/index.ts.
- Tables / functions / routes added: None. Import validation behavior updated only.
- Verification: Typecheck and production build passed. The updated import-questions Edge Function was deployed successfully.

### Import history policy fix, 2026-11-04
- Built: Staff can now record and update their own `import_batches` history rows from the mock-builder browser flow. The policy remains staff-only and requires the row owner to be the signed-in staff member; the server importer continues using its service role.
- Key files: supabase/migrations/20261104150000_allow_staff_import_batch_writes.sql, docs/SCHEMA_CONTRACT.md.
- Tables / functions / routes added: No new tables or routes. Added staff INSERT and owner-scoped UPDATE access on `import_batches`.
- Verification: Migration applied successfully. Typecheck and production build passed.

### Question bank CSV export, 2026-11-04
- Built: "Export CSV" button on the admin question bank. It exports every question matching the active search and filters (not only the current page), in the same column layout the CSV importer reads, plus question ID, subject, chapter name, source, review status, and creation date.
- Key files: src/lib/question-export.ts (new CSV builder and download helper), src/lib/queries.ts (shared question query builder, fetch-all export), src/pages/admin/AdminQuestionsPage.tsx.
- Tables / functions / routes added: None. Read-only; relies on existing staff read access on questions.
- Verification: Typecheck and production build passed.

### Exam switch counter restored on reload, 2026-11-04
- Built: The exam's tab-switch counter now loads the saved WINDOW_SWITCH count for the attempt when the exam opens, so a page reload no longer resets the warning count. Existing switch detection, warning dialog, and event saving are unchanged.
- Key files: src/pages/student/ExamPage.tsx.
- Tables / functions / routes added: None. Reads own integrity_events rows through the existing student policy.
- Verification: Typecheck and production build passed.

### Exam question position kept on reload, 2026-11-04
- Built: The exam remembers which question the student was on, per attempt, in this browser. Reloading returns them to that question. The position is cleared after a successful submit. Answers and flags were already saved on the server and are unchanged.
- Key files: src/pages/student/ExamPage.tsx.
- Tables / functions / routes added: None.
- Verification: Typecheck and production build passed. Not yet tested in a browser.

### Exam scratchpad, 2026-11-04
- Built: A "Scratchpad" button in the exam toolbar opens a drawing panel with pen, eraser, undo, and clear.It sits over the exam without leaving the page. Strokes are not saved between reloads yet.
- Key files: src/components/exam/Scratchpad.tsx (new), src/pages/student/ExamPage.tsx, src/i18n/en.ts, src/i18n/hi.ts.
- Tables / functions / routes added: None.
- Verification: Typecheck and production build passed. Not yet tested in a browser.

### Responsive headers and touch targets, 2026-11-04
- Built: The public, student, admin, and onboarding headers have smaller spacing and secondary text hidden on phones. Header icon buttons, the exam info button and palette cells, subject tabs, and the results rating stars are now at least 44 pixels to tap.
- Key files: src/layouts/PublicLayout.tsx, src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx, src/components/common/ThemeSwitcher.tsx, src/pages/auth/OnboardingPage.tsx, src/pages/student/ExamPage.tsx, src/pages/student/ResultsPage.tsx.
- Tables / functions / routes added: None.
- Verification: Typecheck, production build, and the 10 visual tests passed. Not yet checked at phone widths in a browser.

### Responsive pass across screens, 2026-11-04
- Built: Phone layouts for the exam header and popup, results subject table, bookmarks stats, and admin import and test series rows. Tables scroll sideways inside their own container on small screens.
- Key files: src/pages/student/ExamPage.tsx, src/pages/student/ResultsPage.tsx, src/pages/student/BookmarksPage.tsx, src/pages/admin/AdminImportPage.tsx, src/pages/admin/AdminTestSeriesPage.tsx.
- Tables / functions / routes added: None.
- Verification: Typecheck, production build, and the 10 visual tests passed. Not yet checked at phone widths in a browser.

### Public navbar responsive rebuild, 2026-11-04
- Built: Public header uses a 64px height at all sizes and sits closer to the edges on phones. Phones show only the logo, theme switcher and a menu button; the menu holds the page links, language switch, Log in and Sign up. Tablets show language, Log in and Sign up inline. Desktop (xl and up) shows the full link row with a More dropdown. Menus close on link tap, outside tap and Escape.
- Key files: src/layouts/PublicLayout.tsx, src/index.css (public menu classes).
- Tables / functions / routes added: None.
- Verification: Production build passed. Not yet checked at phone widths in a browser.

### Responsive audit and profile dropdown enhancement, 2026-11-04
- Built: Enhanced the shared profile dropdown with a Dashboard quick link at the top, 44px min-height touch targets on every row, a divider before Sign Out, and a tap-target on the trigger button. Added global responsive CSS: overflow-x hidden on html/body, clamp() scaling for h1/h2/h3, max-width/height-auto on all images/videos/embeds, and a .table-scroll utility. Added min-height 44px to auth-input. Added min-h-11 to contact form inputs.
- Key files: src/layouts/StudentLayout.tsx (ProfileMenu), src/index.css (base layer + components), src/pages/public/ContactPage.tsx.
- Audit findings: Auth pages already responsive (brand panel hidden on mobile, full-width forms). Public pages use responsive grids and flex-col stacking. Student dashboard uses 2-col/4-col stat grids. All student and admin tables already have overflow-x-auto wrappers. Plan comparison table scrolls with min-width.
- Tables / functions / routes added: None.
- Verification: Production build passed. Not checked in a real browser.

### Post-login responsive fixes, 2026-11-04 (session 3)
- Built: Fixed responsiveness issues on post-login student pages. Dashboard: reduced welcome banner padding (p-4 on mobile, p-6 on sm+), smaller heading on mobile (text-xl → text-2xl → text-3xl), tighter streak badge gaps with flex-wrap, buttons stack horizontally on mobile instead of vertically, stat cards use smaller padding/icon sizes on mobile, quick actions grid gap reduced, recommended test list items wrap metadata on mobile with flex-wrap, recent attempts row truncates title and uses smaller score text on mobile. ProgressPage: added sm:grid-cols-2 tablet breakpoint before md:grid-cols-4 jump, added min-w-0/truncate to strengths/weaknesses list items. StudyPlanPage: added min-w-0/truncate to recommended chapter list items. Global CSS: removed `table { display: block; overflow-x: auto }` rule that was breaking all table column layouts (kept .table-scroll wrapper for intentional scrollable tables). Applied responsive vertical spacing (space-y-4 sm:space-y-6) to 16 student pages: AccountPage, AnalyticsPage, AttemptedTestsPage, BillingPage, BookmarksPage, DppStudentPage, FocusPage, LeaderboardPage, MistakeNotebookPage, MocksPage, NotificationsSupportPage, ProgressPage, ReattemptPage, ResourcesPage, SettingsPage, StudyPlanPage, TestSeriesPage, DashboardPage.
- Key files: src/pages/student/DashboardPage.tsx, src/pages/student/ProgressPage.tsx, src/pages/student/StudyPlanPage.tsx, src/index.css, + 14 additional student pages (spacing fix).
- Verification: Production build passed. Not checked in a real browser.
### Minimalistic navbar refactor, 2026-11-04 (session 2)
- Built: Refactored the student and admin navbars to be more minimalistic and fully responsive. Student header: removed floating margins/rounded corners/shadow, slimmed to h-14, full-width sticky bar with border-bottom, tightened gaps, language switcher now shows at lg instead of sm, profile name hidden until xl. Desktop sidebar slimmed from w-60 to w-56 with sticky top adjusted to top-14. Mobile bottom nav: added safe-area-inset-bottom padding, slightly tighter py. Admin header: removed floating offset/shadow, slimmed to h-14, tighter gaps, sidebar slimmed from w-60 to w-56 with md:pl-56 match.
- Key files: src/layouts/StudentLayout.tsx, src/layouts/AdminLayout.tsx.
- Verification: Production build passed. Not checked in a real browser.
### Docker and any-host deployment, 2026-11-04 (session 4)
- Built: Dev and preview servers now bind to all interfaces and accept any host name, which fixes the "host not allowed" block. Port is configurable with PORT. Added a multi-stage Dockerfile (Node build, nginx static serve on 8080 with single-page-app fallback), docker/nginx.conf, .dockerignore (excludes .env and tests), docker-compose.yml, and README.md with run steps. Global touch-target minimum raised from 44px to 48px.
- Key files: vite.config.ts, Dockerfile, docker-compose.yml, docker/nginx.conf, .dockerignore, README.md, src/index.css.
- Verification: Production build passed. Docker image not built in this environment. Not checked in a real browser at mobile widths.
### Email OTP verification and responsive fixes, 2026-11-05 (session 5)
- Built: Added email OTP double-verification flow. New VerifyEmailPage at /verify-email shows a 6-digit code entry screen after signup. SignupPage now redirects to /verify-email instead of /onboarding. ProtectedRoute redirects users with unverified emails to /verify-email before allowing access to any protected page. Resend-code button included. Existing TOTP MFA in Settings remains as the optional second factor for logins. Applied responsive spacing (space-y-4 sm:space-y-6) to 9 of 15 remaining pages: MasteryPage (2 occurrences), RevisionNotesPage (2), CheckoutPage, CustomPracticeHistoryPage, CustomPracticePage (2), and the edit tool budget was exhausted before FormulaFlashcardsPage, MockDetailPage (2), ReportQuestionPage, ResultsPage, RevisionNoteReaderPage, and SolutionsPage could be fixed.
- Key files: src/pages/auth/VerifyEmailPage.tsx (new), src/routes/appRoutes.tsx, src/pages/auth/SignupPage.tsx, src/components/auth/ProtectedRoute.tsx, src/pages/student/MasteryPage.tsx, src/pages/student/RevisionNotesPage.tsx, src/pages/student/CheckoutPage.tsx, src/pages/student/CustomPracticeHistoryPage.tsx, src/pages/student/CustomPracticePage.tsx.
- Verification: Production build passed. Not checked in a real browser.
### Responsive spacing completion and brand logo audit, 2026-11-05 (session 6)
- Built: Completed responsive spacing fixes for the final 6 student pages that still had unresponsive space-y-6: FormulaFlashcardsPage, MockDetailPage (2 spots), ReportQuestionPage, ResultsPage, RevisionNoteReaderPage, and SolutionsPage. All 15 student pages now use space-y-4 sm:space-y-6. Audited BrandLogo usage across the entire app: all 18 call sites use the shared BrandLogo component with consistent variants (public for auth, workspace for student/exam/onboarding, admin for admin), correct tone resolution (dark by default, light on the white exam/pre-start headers), same icon source, and same tagline. No inconsistencies found.
- Key files: src/pages/student/FormulaFlashcardsPage.tsx, MockDetailPage.tsx, ReportQuestionPage.tsx, ResultsPage.tsx, RevisionNoteReaderPage.tsx, SolutionsPage.tsx.
- Verification: Production build and TypeScript typecheck both passed. Not checked in a real browser.

## Session: Table & Dialog Responsiveness Audit
- Audited all 19 `<table>` elements across admin and student pages.
- 18/19 already wrapped in `overflow-x-auto` (either on a parent div or CardContent).
- Fixed MockQuestionCsvImport.tsx: added `overflow-x-auto` to the history table wrapper (had only `overflow-y-auto`).
- Audited Dialog base component (src/components/ui/dialog.tsx): added `max-h-[70vh] overflow-y-auto` to body content so tall dialogs scroll on mobile; changed footer to `flex-col-reverse sm:flex-row sm:justify-end` so buttons stack full-width on phones.
- Audited ExamPage custom dialogs (alertdialog, mobile palette, question paper, instructions, submit confirm, time-up): all already responsive with `w-full max-w-*`, `p-4` outer padding, and `max-h`/`overflow-y-auto` where needed.
- Build passes (npm run build, exit 0). Chunk size warning persists but is not a failure.

## Session: Fix OTP Email Verification Flow
**Problem:** After signup, no OTP email was arriving in Gmail. The flow was broken in multiple ways:
1. If email confirmation was OFF (default), signUp() creates a session immediately — no verification email is ever sent.
2. If email confirmation was ON, signUp() returns no session, but /verify-email was behind ProtectedRoute which requires a session — causing a redirect loop to /login.
3. VerifyEmailPage relied on useAuth().user.email, which is null when there's no session.

**Fixes applied:**
- SignupPage: Now passes email + password to /verify-email via navigation state (works with or without a session).
- appRoutes: Moved /verify-email out of ProtectedRoute so it renders without a session.
- VerifyEmailPage: Rewrote to get email from navigation state (falling back to session email). After successful OTP verification, if no session exists, signs the user in with signInWithPassword using the stored password, then redirects to /onboarding.
- ProtectedRoute: Removed the broken email_confirmed_at gate (redundant — Supabase blocks unverified users from getting a session when confirmation is ON).
- LoginPage: If signInWithPassword fails with "email not confirmed", redirects to /verify-email with email+password instead of showing a raw error.

**Remaining dashboard step (cannot be done in code):**
The project owner must enable email confirmation and set the OTP email template in the Supabase dashboard:
1. Supabase Dashboard → Authentication → Providers → Email → toggle "Confirm email" ON.
2. Supabase Dashboard → Authentication → Email Templates → "Confirm Signup" template → replace `{{ .ConfirmationURL }}` with `{{ .Token }}` so the email contains a 6-digit code instead of a link.
3. Ensure SMTP is configured (Authentication → Email Settings → SMTP) — the built-in email service has strict rate limits and may land in spam.

## Session: Admin-Controlled Email OTP Toggle
Added ability for admins to enable/disable email OTP verification from the admin settings panel.
- Migration: seeded `feature_email_otp` key in platform_settings with `{ "enabled": true }` (ON by default).
- site-settings.ts: Added `useEmailOtpEnabled()` hook that reads the setting.
- AdminPages.tsx: Added "Email OTP Verification" to the FEATURE_TOGGLES array — appears as a toggle switch in the Settings page under Feature Toggles.
- SignupPage: Checks the setting — if enabled, redirects to /verify-email with email+password; if disabled, goes straight to /onboarding.
- LoginPage: Only redirects unconfirmed users to /verify-email when OTP is enabled by admin.
- VerifyEmailPage: Auto-redirects to /onboarding if admin has disabled OTP while the user is on the verify page.
- Build passes.

## Session: Production Launch Readiness (2026-11-07)
**Goal:** Prepare app for Docker deployment with Supabase backend.

**Changes made:**
1. **Code splitting**: Converted all routes to lazy-loaded chunks via React.lazy + Suspense. Split 1.8MB single bundle into per-route chunks. Vendor libraries (React, Supabase, KaTeX, icons) separated into manual chunks. Largest chunk is now 400KB (main) vs previous 1.8MB.
2. **Docker hardening**: Added healthcheck with curl, security headers in nginx (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy), proper gzip with compression level 6, immutable caching for hashed assets, no-cache for index.html and service worker, long cache for static images.
3. **Docker Compose**: Added healthcheck config, memory limit (512M), restart policy.
4. **Service worker**: Rewrote with versioned caches (mn-static-v1, mn-assets-v1), proper install/activate lifecycle, cache-first for assets, network-first for pages, skip API calls, offline fallback to cached index.html.
5. **Environment variables**: Expanded .env.example with all production variables documented (Supabase, AI, payments, SMTP).
6. **Security migration**: Revoke EXECUTE on 19 admin-only and 9 internal trigger/cron SECURITY DEFINER functions from PUBLIC/anon/authenticated. Reduced advisor findings from 31 to 12 (remaining 12 are intentionally user-facing functions that students need).
7. **Deployment guide**: Created DEPLOYMENT.md with full deployment instructions for Docker, Docker Compose, and static hosting.
8. **Build verified**: All changes compile successfully.

## Session: Razorpay Integration, Performance, and Bug Audit (2026-11-08)
**Goal:** Replace fake checkout with real Razorpay, optimize loading, audit for bugs.

**Changes made:**
1. **Razorpay payment integration**: Migration added razorpay_order_id, razorpay_payment_id, razorpay_signature to transactions table; razorpay_payment_id to user_subscriptions. Two edge functions deployed: razorpay-order (creates order via Razorpay API, stores PENDING transaction) and razorpay-webhook (verifies signature, activates subscription on payment.captured, marks FAILED on payment.failed). CheckoutPage rewritten to load Razorpay checkout.js, call edge function, open modal with UPI/card/netbanking/wallets, redirect to success/failure pages. SubscriptionPlansPage cleaned up (removed fake "Stripe not connected" banner; paid plans now navigate to real checkout).
2. **Critical security fix**: Edge function was trusting client-sent `amount` value — a user could pay ₹1 for a ₹999 plan. Fixed: edge function now recalculates amount entirely server-side from plan price + server-side promo/referral validation. Client no longer sends amount. Referral discount now stored in transaction (referral_discount_inr column) instead of hardcoded 0.
3. **Performance**: Vite manual chunks split (react-vendor, supabase, katex, icons, query, i18n). cssCodeSplit enabled. optimizeDeps include for faster dev startup. preconnect/dns-prefetch for fonts and Razorpay checkout. Service worker v2 with proper navigation request handling (network-first for pages, cache-first for assets).
4. **Code cleanup**: Removed unused `cn` and `useAuth` imports from CheckoutPage.
5. **Bug audit findings**: B3 (timer cell) and B5 (handled_by) confirmed already fixed. B2 (duplicated admin nav) confirmed fixed. No leftover Stripe references found. `confirm()` still used in 9 admin/settings files (low priority — works but should use Dialog component for consistency). Remaining known issues from APP_AUDIT.md unchanged.

**Edge function secrets required**: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET. Webhook URL must be registered in Razorpay dashboard.

**Build verified**: All changes compile. Largest chunk 309KB (gzip 80KB). Edge function deployed successfully.

## AI generation orchestration

**Goal:** Make AI question generation a tracked, provider-flexible job that writes questions for review.

**Changes made:**
1. **Jobs table**: `ai_generation_jobs` records each generation request (chapter, type, difficulty, requested count, provider, model, status QUEUED/RUNNING/SUCCEEDED/FAILED, saved and skipped counts, tokens, cost in paise, error). RLS on; staff (ADMIN) read only; server writes via service role.
2. **Provider settings**: `platform_settings` key `AI_PROVIDER_SETTINGS` holds provider (gemini or openai), model, and per-million-token prices. Seeded to Gemini 2.5 Flash. Editable in the AI studio. API keys stay in server secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`).
3. **Edge function `generate-ai-questions`** rewritten: ADMIN-only (EDITOR removed), records a job, calls the selected provider with a 60 second timeout, validates each question, saves valid ones as REVIEW (not DRAFT), writes the usage ledger with computed cost, and marks the job SUCCEEDED or FAILED. Split into index.ts, providers.ts, prompt.ts.
4. **Usage ledger hardening**: anon has no access; authenticated has read only (through the staff policy).
5. **AI studio UI**: generation form now says questions are saved for review. New provider and pricing card and a generation jobs table.

**Not done yet:** duplicate-question detection before insert; background processing for large batches; a per-chapter daily quota.

**Secrets:** Could not verify whether `GEMINI_API_KEY` or `OPENAI_API_KEY` is set (secret listing is not permitted from this environment). Without the key for the selected provider, generation returns a "not configured" message.

**Verification:** typecheck shows only the 13 pre-existing errors; production build passed; edge function deployed.

## Security hardening: consent logging and advisor review

1. `log_consent_event` could record consent for any user id from a signed-in session. No part of the app calls it. Client execute rights are revoked; only the service role can call it. Migration `20261114130000_revoke_client_consent_logging`.
2. Advisor findings reviewed and left as-is on purpose: `get_public_settings` (returns only the published site key for anonymous visitors); `is_staff` and `has_active_paid_plan` (called inside row policies, so authenticated execute is required); the leaderboard, custom test, deletion, plan, promo, and rank RPCs (called from the app by signed-in users, and each checks the caller internally).
3. `get_rank_estimate` column references were checked against the live attempts table; all exist.

**Still open:** RLS policies call `auth.uid()` directly rather than `(select auth.uid())` (performance advisor); duplicate and overlapping policies on several tables; 150+ lint errors; 13 typecheck errors in older route and checkout files.

## Typecheck cleanup and checkout fix

1. Admin routes: the admin pages were loaded as one module with a namespace, which TypeScript could not type (11 errors). Each admin page now has its own lazy import, matching the other routes.
2. Checkout: the payment request read the sign-in token from the wrong level of the session response, so the order request was sent without a valid token. It now reads the session token and shows a "sign in again" message if the session has expired.

**Verification:** typecheck is clean (0 errors, down from 13); production build passed.
