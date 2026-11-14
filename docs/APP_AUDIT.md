# MOCK NINJA — APP_AUDIT.md (Upgrade Step U0)

> Read-only audit, 2026-11-02. No code, migration, or setting changed in this step.
> Stack correction: the Upgrade Pack says "React, Tailwind CSS and Material UI". The project actually uses **shadcn-style hand-rolled Tailwind primitives**, not Material UI. See section 6 and the DECISIONS.md note.

## 1. ROUTES

All routes from `src/routes/appRoutes.tsx`. Access: P=public, S=signed-in student, A=admin.

| Path | File | Access | State |
|------|------|--------|-------|
| / | LandingPage.tsx | P | works |
| /login | auth/LoginPage | P (PublicOnly) | works |
| /signup | auth/SignupPage | P (PublicOnly) | works |
| /forgot-password | auth/ForgotPasswordPage | P (PublicOnly) | works |
| /reset-password | auth/ResetPasswordPage | P (PublicOnly) | works |
| /onboarding | auth/OnboardingPage | S | works |
| /trust | public/TrustPage | P | works |
| /privacy | public/PrivacyPage | P | works |
| /terms | public/TermsPage | P | works |
| /mock-tests | public/MockTestsPage | P | works |
| /previous-year-papers | public/PreviousYearPapersPage | P | works |
| /chapters | public/ChaptersPage | P | works |
| /revision-vault | public/RevisionVaultPage | P | works |
| /dpp | student/DppStudentPage | S | works |
| /dpp/custom | student/CustomPracticePage | S | works |
| /pricing | public/PricingPage | P | works |
| /faq, /faqs | public/FaqPage | P | works (duplicate path) |
| /contact | public/ContactPage | P | works |
| /dashboard | student/DashboardPage | S | works |
| /attempted-tests | student/AttemptedTestsPage | S | works |
| /mocks | student/MocksPage | S | works |
| /mocks/:id | student/MockDetailPage | S | works |
| /exam/:attemptId | student/ExamPage | S | works |
| /results/:attemptId | student/ResultsPage | S | works |
| /solution/:attemptId, /solution | student/SolutionsPage | S | works |
| /exam/:attemptId/reattempt | student/ReattemptPage | S | works |
| /mastery | student/MasteryPage | S | works |
| /performance, /progress | student/ProgressPage | S | works (duplicate path) |
| /leaderboard | student/LeaderboardPage | S | works |
| /study-plan | student/StudyPlanPage | S | PARTIAL (day completion is localStorage only) |
| /mistake-notebook | student/MistakeNotebookPage | S | works |
| /focus | student/FocusPage | S | works (weak-chapter picker, not AI doubt solver) |
| /resources | student/ResourcesPage | S | works |
| /account | student/AccountPage | S | works |
| /settings | student/SettingsPage | S | works |
| /bookmarks | student/BookmarksPage | S | works |
| /revision-vault/notes | student/RevisionNotesPage | S (RevisionAccessGate) | works |
| /revision-vault/notes/:noteId | student/RevisionNoteReaderPage | S (gate) | works |
| /revision-vault/flashcards | student/FormulaFlashcardsPage | S (gate) | works |
| /subscription | student/SubscriptionPlansPage | S | works (preview-only checkout) |
| /checkout | student/CheckoutPage | S | PREVIEW-ONLY (no real gateway) |
| /payment/success | student/PaymentSuccessPage | S | works |
| /payment/failure, /payment/pending | student/PaymentFailurePage | S | works (pending reuses failure page) |
| /billing, /billing/transactions, /dashboard/billing | student/BillingPage | S | works (duplicate paths) |
| /notifications | student/NotificationsSupportPage | S | works (support tracking, not a full notification centre) |
| /report-question | student/ReportQuestionPage | S | works |
| /admin | admin/AdminDashboardPage | A | works |
| /admin/topics | admin/AdminTopicsPage | A | works |
| /admin/questions | admin/AdminQuestionsPage | A | works (no pagination) |
| /admin/questions/import | admin/AdminImportPage | A | works (partial: no bulk, no error file) |
| /admin/mocks | admin/AdminMocksPage | A | works |
| /admin/exam-settings | AdminExamSettingsPage | A | placeholder-ish (AdminPages) |
| /admin/attempts | AdminAttemptsPage | A | works (buggy timer cell) |
| /admin/rankings | AdminRankingsPage | A | works |
| /admin/proctoring | AdminProctoringPage | A | PARTIAL (flat table, no timeline/notes) |
| /admin/watermarks | AdminWatermarksPage | A | works (per-mock policy) |
| /admin/announcement | admin/AdminAnnouncementPage | A | works |
| /admin/users | AdminUsersPage | A | PARTIAL (no status/ban/audit/pagination) |
| /admin/billing | AdminBillingPage | A | placeholder-ish |
| /admin/subscriptions | admin/AdminSubscriptionPlansPage | A | works |
| /admin/resources | AdminResourcesPage | A | placeholder-ish |
| /admin/content | AdminContentPage | A | placeholder-ish |
| /admin/support | AdminSupportPage | A | works (basic, no ticketing/SLA) |
| /admin/ai | admin/AdminAiPage | A | works (Gemini, needs GEMINI_API_KEY) |
| /admin/reports, /admin/analytics | admin/AdminReportsPage | A | works (simple div charts; duplicate path) |
| /admin/question-reports | admin/AdminQuestionReportsPage | A | works |
| /admin/settings | AdminSettingsPage | A | works (platform name/email/toggles/maintenance) |
| /admin/homepage | admin/AdminHomepagePage | A | works |
| /admin/transactions | admin/AdminTransactionsPage | A | works |
| /admin/user-subscriptions | admin/AdminUserSubscriptionsPage | A | works |
| /admin/reconciliation | admin/AdminReconciliationPage | A | works |
| /admin/promo-codes | admin/AdminPromoCodesPage | A | works |
| /dev/math | dev/DevMathPage | P | works |
| /dev/ui | dev/DevUiPage | P | works |
| * | NotFoundPage | P | works |

Missing routes found in the upgrade plan but not in the app: /about, /analytics (student), /series, /series/:slug, /pyq, /support (student ticket UI), /settings/security, /admin/users/deletions, /admin/blueprints, /admin/integrity, /admin/settings/site, /admin/settings/watermark (global), /admin/settings/leaderboard, /notifications (real notifications centre).

Dead links: none found. The landing hero "AI Doubt Solver" card links to /focus, which is a weak-chapter picker, not a doubt solver — mislabel, not a dead link.

## 2. DATA

### Tables (33 in public schema)

RLS is enabled on all 33 tables (confirmed via `get_security_posture`). The schema contract (`docs/SCHEMA_CONTRACT.md`) only documents tables through migration 026. Tables present in the database but **not in the contract**:

| Table | Notes |
|-------|-------|
| custom_practice_sets | student custom DPP builder (migration 20261029140000) |
| faqs | admin-managed FAQs |
| formula_cards | revision vault flashcards |
| homepage_content | homepage sections JSON |
| integrity_events | proctoring window-switch events |
| platform_settings | maintenance, announcement |
| promo_codes | promotional codes |
| public_profiles | leaderboard opt-in, handle |
| push_subscriptions | browser push |
| question_bookmarks | saved questions |
| question_reports | student question reports |
| referral_codes | referral program |
| refund_requests | refund workflow |
| revision_notes | revision vault notes |
| support_inquiries | support tickets (basic) |
| test_feedback | post-test feedback |
| testimonials | homepage testimonials |
| transactions | payments |

The contract also lists `profiles.role` as allowing EDITOR, but the EDITOR role was removed (migration 20261031082227). The contract's RLS summary says students have NO ACCESS to `questions` — this is now correct for students, but the contract omits that `support_inquiries`, `transactions`, `refund_requests`, `promo_codes`, `push_subscriptions`, `question_reports`, `referral_codes`, `test_feedback`, `custom_practice_sets`, `revision_notes`, `formula_cards`, `integrity_events`, `platform_settings`, `homepage_content`, `faqs`, `testimonials`, `question_bookmarks` all exist and have their own policies.

### Database functions (23)

All execute roles confirmed via `get_security_posture`:

| Function | Security | Executed by | Notes |
|----------|----------|-------------|-------|
| admin_set_user_role | DEFINER | authenticated | admin-only by policy check inside |
| apply_referral_discount | INVOKER | authenticated | |
| auto_generate_daily_mocks | DEFINER | (none/cron) | postgres/cron only |
| build_custom_practice_test | DEFINER | authenticated | |
| build_daily_target_mock | DEFINER | (none) | service role only (5 args, last defaulted) |
| can_go_public | INVOKER | authenticated | |
| generate_invoice_number | INVOKER | authenticated | |
| generate_referral_code | INVOKER | authenticated | |
| get_leaderboard | DEFINER | authenticated | |
| get_mock_leaderboard | DEFINER | authenticated | |
| has_active_paid_plan | DEFINER | authenticated | |
| is_staff | DEFINER | authenticated | role check |
| public_exam_categories | INVOKER | anon, authenticated | |
| public_faqs | INVOKER | anon, authenticated | |
| public_featured_tests | INVOKER | anon, authenticated | |
| public_homepage_content | INVOKER | anon, authenticated | |
| public_platform_stats | INVOKER | anon, authenticated | |
| public_testimonials | INVOKER | anon, authenticated | |
| refresh_mastery | DEFINER | (none) | service role only |
| set_live_pricing_model | INVOKER | authenticated | admin by policy |
| switch_to_free_plan | DEFINER | authenticated | |
| update_question_report | DEFINER | authenticated | staff by policy |

**Security note:** `is_staff()`, `get_leaderboard`, `get_mock_leaderboard`, `has_active_paid_plan`, `admin_set_user_role`, `build_custom_practice_test`, `auto_generate_daily_mocks`, `build_daily_target_mock`, `refresh_mastery`, `switch_to_free_plan`, `update_question_report` are SECURITY DEFINER. The advisor flags these as expected (documented in DECISIONS.md). `public_*` functions are INVOKER and executable by anon — these return public aggregate/homepage data only.

### Edge Functions (7 deployed)

| Slug | verifyJWT | Purpose |
|------|-----------|---------|
| guardian-consent | true | sets guardian_consent_at (minors) |
| exam | true | start/get/save/submit/results actions |
| daily-mock | true | get-or-create daily target mock |
| mistake-reattempt | true | build mistake reattempt mock |
| support-notify | false | notify on new support inquiry |
| admin-remove-user | true | delete auth user (admin only) |
| generate-ai-questions | true | Gemini AI question generation (staff) |

### Storage buckets (2)

| Bucket | Public | Limit | MIME |
|--------|--------|-------|------|
| avatars | false | 2 MB | jpeg/png/webp/gif |
| question-media | false | 15 MB | pdf/png/jpeg/webp |

### Cron jobs (1)

| Job | Schedule | Active |
|-----|----------|--------|
| daily-mock-generation | 30 0 * * * (00:30 UTC = 6 AM IST) | true |

## 3. FEATURE MATRIX

| # | Feature | State | Evidence |
|---|---------|-------|----------|
| 1 | Signed-in homepage variant | MISSING | appRoutes.tsx:84 maps / to LandingPage unconditionally; LandingPage only swaps CTA target |
| 2 | Continue Learning | EXISTS (dashboard only) | DashboardPage.tsx:365-381 resume card; not on homepage |
| 3 | Study plan | PARTIAL | StudyPlanPage.tsx real but day-completion is localStorage (lines 32-48) |
| 4 | Today / daily practice widgets | MULTIPLE | DashboardPage (target mock card, daily quick action), DppStudentPage (today's DPP, streak), LandingPage (hard-coded "15 problems today" + "Daily Target Mock" section) — not unified |
| 5 | DPP | EXISTS | DppStudentPage.tsx, CustomPracticePage at /dpp/custom |
| 6 | Mastery belts | FLAT (no SVG) | ProgressPage (span chips), MasteryPage (div tiles), LeaderboardPage (span chips), ResultShareCard (none), LandingPage (div), DashboardPage (Badge chips) — 6 separate belt color maps |
| 7 | NTA palette states | DUPLICATED | PaletteSymbol.tsx:4 (canonical type), ExamPage.tsx:56-62 (PALETTE_STYLES copy), LandingPage.tsx:53-59 (paletteDemo copy) — no shared constants file |
| 8 | Answered & Marked for Review | EXISTS | ExamPage.tsx:348-356 (getPaletteStatus), markReviewAndNext:292-322 commits answer + flagged |
| 9 | Numerical keypad | PARTIAL | NumericalKeypad.tsx: read-only div display (good), but no inputMode, no keyboard event handlers, mouse/touch only, no leading-zero normalization |
| 10 | Question bank table | FULL CLIENT LIST | AdminQuestionsPage.tsx:82 useQuestions loads all; :83-86 filters in JS; no .range(), no pagination |
| 11 | Question import & validation | PARTIAL | AdminImportPage.tsx: dry-run preview + per-row errors; no error file download, no licence checks, one-by-one client insert loop (52-71), no bulk RPC |
| 12 | User management | PARTIAL | AdminPages AdminUsersPage: client-side search, role change RPC, remove edge function; no status/ban column, no audit log, no pagination |
| 13 | Admin user removal | PARTIAL/INCOMPLETE | admin-remove-user/index.ts: deletes auth user via admin API, relies on DB CASCADE; no explicit deletion manifest, no storage cleanup, no deletion_audit row |
| 14 | Admin analytics page | EXISTS (simple) | AdminReportsPage.tsx: div-based bar charts (attempts, subject, difficulty); no recharts; real data |
| 15 | Site settings (social, contact, global) | PARTIAL | AdminSettingsPage: platform_name + support_email + feature toggles + maintenance; no social links, no contact desks, no address/phone |
| 16 | Student dashboard | EXISTS | DashboardPage.tsx: real, comprehensive |
| 17 | Student analytics page | MISSING | no /analytics route; closest is /performance / /progress → ProgressPage |
| 18 | AI Doubt-to-Practice Studio (student) | MISSING | no student AI page; FocusPage is weak-chapter picker; admin AdminAiPage exists |
| 19 | Exam blueprint | MISSING | no blueprint table/column/migration; marking scheme is per-mock (mock_tests.marking_scheme) |
| 20 | Leaderboard settings | MISSING | no admin controls for cohort/window/min-size; hardcoded p_min_cohort:1 in AdminRankingsPage |
| 21 | Integrity event review | PARTIAL | AdminProctoringPage: flat table with counts; no timeline, no staff notes, no status workflow |
| 22 | Watermark | PARTIAL (per-mock) | AdminWatermarksPage: per-mock meta_json.watermark; no global policy page |
| 23 | Support desk | BASIC | AdminSupportPage: support_inquiries with status/notes; no ticket threading, replies, SLA, assignment; student side is NotificationsSupportPage (tracking, not ticketing) |
| 24 | Subscriptions/payments | PREVIEW-ONLY | CheckoutPage.tsx:152-156 fakes payment (PENDING transaction + redirect); no real gateway; SubscriptionPlansPage/BillingPage are real display-wise |
| 25 | Password change / 2FA / sign out other devices | MISSING | SettingsPage: no password/2FA/session UI; AccountPage: none |
| 26 | Data export / account deletion (students) | PARTIAL | SettingsPage:231-258 exportData (JSON download); no self-service account deletion |
| 27 | Notifications centre | PARTIAL | StudentLayout.tsx:296-306 bell dropdown (heuristic from attempts/daily mock); /notifications → NotificationsSupportPage (support tracking); no real notifications table read on student side |
| 28 | Public pages (About, FAQ, Contact) | PARTIAL | ContactPage, FaqPage exist and work; About MISSING (no /about route) |
| 29 | Test series | MISSING | no /series route, no test_series table |
| 30 | PYQ library | PARTIAL | /previous-year-papers page exists; no is_pyq column or licence flag confirmed |

## 4. BUGS

**B1. Sidebar auto-scrolls in settings — likely cause: sticky nav with overflow-y-auto is an independent scroll context.**
- `StudentLayout.tsx:326`: desktop sidebar `<nav>` uses `sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto`. It is its own scroll container, independent of window scroll.
- `App.tsx:19-27` `ScrollToTop` resets window scroll on pathname change but does NOT reset the sidebar's internal scroll.
- Zero `scrollIntoView`/`scrollTo`/`focus()` calls found in layouts or settings pages (confirmed by grep).
- The sidebar's scroll-to-active is browser-default behavior for `overflow-y-auto` + active `NavLink`. When the active settings link sits low in the list, the container snaps to show it. Any re-render (React Query refetch, theme change, dropdown toggle) can shift the inner scroll position because `scrollRestoration` is not set.
- The active settings link is appended outside `navGroups` in a separate block (`StudentLayout.tsx:354-367`), so the browser's scroll-to-active may jump to it.
- **Likely fix:** remove `overflow-y-auto` from the sticky nav (let it fit the viewport), or add explicit active-link scroll handling with `scroll-mt-16` and a one-time `scrollIntoView({ block: 'nearest' })`.

**B2. AdminLayout duplicates the entire nav list inline** — `AdminLayout.tsx:103-146` (desktop) and `:174-208` (mobile) are two separate copies of the same nav list. The mobile copy lacks the `badgeKey`/open-inquiries logic the desktop has. Any nav change must be made twice.

**B3. AdminAttemptsPage timer cell is broken** (`AdminPages.tsx:142`): the `||` precedence with ternary produces empty or stray output when `duration_min` is falsy.

**B4. AdminWatermarksPage toggle is cache-only** (`AdminPages.tsx:571`): toggling calls `updateWatermark` (query cache mutation only); navigating away without "Save" loses the change silently.

**B5. AdminSupportPage.updateInquiry never records handled_by** (`AdminPages.tsx:837`): `handled_by: patch.status ? undefined : undefined` — both branches set `undefined`, so staff handling is never written.

**B6. AdminImportPage inserts questions one-by-one in a client loop** (lines 52-71): O(n) sequential round-trips, no transaction, partial-failure leaves orphan rows. No bulk insert. No error file download.

**B7. AdminQuestionsPage loads ALL questions client-side** (`:82` `useQuestions`): for a large question bank this will hang the browser. No pagination.

**B8. CheckoutPage is a fake payment** (`:152-156`): "Stripe not connected yet — simulate flow." Users see a "Pay ₹X" button that never charges but creates a PENDING transaction and redirects to success.

**B9. NTA palette styles duplicated in 3 files** — PaletteSymbol.tsx, ExamPage.tsx:56-62, LandingPage.tsx:53-59. If NTA colors change, three files must be updated.

**B10. Belt thresholds duplicated** — DashboardPage.tsx:228-233 (hardcoded 90/75/55/35/15) vs StudyPlanPage (DB belt values). Two sources of truth for belt assignment.

**B11. ExamPage auto-enter fullscreen effect** (`:100-106`): runs on every state change; on error path the user stays stuck in fullscreen because exit only happens in `handleSubmitFinal` success path.

**B12. NumericalKeypad** (`NumericalKeypad.tsx`): no `inputMode`, no physical-keyboard support, `-` sign can only prepend, `.` appended on empty value produces `.5` not `0.5`.

**B13. App.tsx ScrollToTop** (`:19-27`): resets window scroll but not the sidebar's internal scroll (contributes to B1).

**B14. AdminSettingsPage "RPC Health" check** (`:1050-1056`): calls `get_mock_leaderboard` with a zero-UUID; doesn't actually test migrations.

## 5. SECURITY QUICK CHECK (report only, no fixes)

- **Service-role key in client code:** Not found in `src/`. The client uses the anon key (`src/lib/supabase.ts`). The service role key is only in `.env` for edge functions.
- **Tables without RLS:** None. All 33 tables have RLS enabled (confirmed via `get_security_posture`).
- **Functions executable by anon or authenticated that should not be:** `public_*` functions are INVOKER + anon-executable and return only public aggregate/homepage data — acceptable. `is_staff()`, `get_leaderboard`, `get_mock_leaderboard`, `has_active_paid_plan` are DEFINER + authenticated-only — expected (documented in DECISIONS.md). No function was found that should be locked down further.
- **Correct answers before submission:** The exam Edge Function `get` action does not return `answer_json` or `solution_tex` (confirmed in prior session). Questions are fetched without answers. Safe.
- **Admin routes relying only on hiding links:** All admin routes use `<ProtectedRoute roles={[...ADMIN_ONLY]}>` (appRoutes.tsx:140-166). Server-side RLS on `questions`, `mock_tests`, `homepage_content`, etc. requires `is_staff()`. Not just hidden links.
- **Visitor seeing another student's data:** `profiles` SELECT is `auth.uid() = id OR is_staff()`. `attempts` SELECT is `auth.uid() = user_id OR is_staff()`. `responses` SELECT is via attempt ownership. `mastery_scores`, `notification_log`, `student_focus_topics`, `user_daily_mocks` are all own-or-staff. `public_profiles` is readable by all (intentional). No cross-student leak found.
- **Broad grants concern (from prior audit):** Many tables grant CRUD to anon/authenticated and rely on RLS predicates. This is a least-privilege hardening concern, not an active leak, but flagged for a future security phase.
- **profiles UPDATE grant to anon:** The grant exists (confirmed in prior security posture), but RLS blocks anonymous writes. The grant should be narrowed.

## 6. UI STACK

**Component library:** Custom shadcn-style hand-rolled Tailwind primitives. `package.json` contains **NO `@mui` or `@material-ui`**. Actual UI dependencies:
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `clsx`, `tailwind-merge`
- `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- `katex`
- `lucide-react` (icons)
- `react` / `react-dom` 18
- `react-router-dom` 7
- `sonner` (toasts)
- `zod`

UI primitives live in `src/components/ui/` (button, card, badge, progress, skeleton, toast, tabs, dialog, tooltip). These are hand-rolled Tailwind components, not Material UI.

**Hard-coded hex color values in `src/index.css`:** 192 matches for `#[0-9a-fA-F]{3,8}`. The file defines light/dark CSS variables then overrides Tailwind classes with hex values in gradient/background rules (tricolor bar, hero, announcement bar, prestart, free-mock, final-cta, watermark).

**Duplicated components / constants:**
- NTA palette styles: `PaletteSymbol.tsx` (canonical), `ExamPage.tsx:56-62` (copy), `LandingPage.tsx:53-59` (copy)
- Belt color maps: 6 separate definitions (DashboardPage, StudyPlanPage, ProgressPage, MasteryPage, LeaderboardPage, LandingPage) — no shared `lib/belts.ts`
- AdminLayout nav: desktop (`:103-146`) and mobile (`:174-208`) are two copies of the same list
- `LinkButton` in DashboardPage.tsx:955 and `FlameCircIcon` in LandingPage.tsx:825 — trivial wrappers re-defined per file

## 7. DELETION MANIFEST (draft)

Every table and storage path that references a user, with its current ON DELETE behavior:

| Table / Path | FK Column | References | ON DELETE |
|--------------|-----------|------------|-----------|
| profiles | referred_by | profiles | NO ACTION |
| profiles | id | auth.users | CASCADE |
| attempts | user_id | profiles | CASCADE |
| attempts | mock_test_id | mock_tests | CASCADE |
| responses | attempt_id | attempts | CASCADE |
| responses | question_id | questions | CASCADE |
| mastery_scores | user_id | profiles | CASCADE |
| mastery_scores | chapter_id | chapters | CASCADE |
| student_focus_topics | user_id | profiles | CASCADE |
| user_daily_mocks | user_id | profiles | CASCADE |
| user_daily_mocks | mock_test_id | mock_tests | CASCADE |
| public_profiles | user_id | profiles | CASCADE |
| notification_log | user_id | profiles | CASCADE |
| push_subscriptions | user_id | profiles | CASCADE |
| question_bookmarks | attempt_id | attempts | SET NULL |
| question_bookmarks | question_id | questions | CASCADE |
| question_reports | user_id (default auth.uid) | auth.users | (implicit) |
| question_reports | resolved_by | profiles | SET NULL |
| question_reports | attempt_id | attempts | SET NULL |
| question_reports | mock_test_id | mock_tests | SET NULL |
| question_reports | question_id | questions | CASCADE |
| test_feedback | user_id (default auth.uid) | auth.users | (implicit) |
| test_feedback | attempt_id | attempts | CASCADE |
| test_feedback | mock_test_id | mock_tests | CASCADE |
| ai_usage_ledger | created_by | profiles | SET NULL |
| integrity_events | user_id | profiles | CASCADE |
| integrity_events | attempt_id | attempts | CASCADE |
| custom_practice_sets | user_id (default auth.uid) | auth.users | (implicit) |
| custom_practice_sets | mock_test_id | mock_tests | CASCADE |
| mock_tests | owner_user_id | profiles | CASCADE |
| transactions | user_id (default auth.uid) | auth.users | (implicit) |
| transactions | refunded_by | profiles | SET NULL |
| transactions | plan_id | subscription_plans | SET NULL |
| transactions | promo_code_id | promo_codes | SET NULL |
| refund_requests | user_id (default auth.uid) | auth.users | (implicit) |
| refund_requests | processed_by | profiles | SET NULL |
| refund_requests | transaction_id | transactions | CASCADE |
| support_inquiries | user_id | (nullable, no FK) | (no cascade) |
| support_inquiries | handled_by | profiles | SET NULL |
| user_subscriptions | user_id (default auth.uid) | auth.users | (implicit) |
| user_subscriptions | plan_id | subscription_plans | SET NULL |
| promo_codes | created_by | profiles | SET NULL |
| platform_settings | updated_by | profiles | SET NULL |
| questions | created_by | profiles | SET NULL |
| questions | reviewed_by | profiles | SET NULL |
| profiles | (auth.users link) | auth.users | CASCADE |
| Storage: avatars/ | user_id path | — | NO automatic cleanup (edge function does not delete storage) |
| Storage: question-media/ | no user FK | — | NOT user-scoped |
| auth.users | (external) | — | deleted by admin-remove-user edge function via admin API |

**Gap:** The `admin-remove-user` edge function deletes the auth user (cascading most FKs) but does NOT clean up: avatars storage objects, `support_inquiries` with user_id, or `referral_codes` rows. `profiles.referred_by` is nullified before deletion. There is no `deletion_audit` table. Financial records (transactions, refund_requests) set FK to NULL (preserved), which is correct for tax/legal retention.

## 10 MOST IMPORTANT FINDINGS (ordered by severity)

1. **P1 — Checkout is a fake payment.** `CheckoutPage.tsx:152-156` simulates a payment by creating a PENDING transaction and redirecting to success. Users see a "Pay ₹X" button that never charges. This is the highest-risk item: it implies a completed purchase with no money moved. Blocked on Stripe configuration.

2. **P1 — No signed-in homepage variant.** The home route always shows the public landing page; signed-in students see no personal content, Continue Learning, or unified Today panel. The dashboard exists separately but is not the home page.

3. **P1 — AdminQuestionsPage loads the entire question bank client-side** with no pagination. A large question bank will freeze the browser. Needs server-paged data table.

4. **P1 — Admin user removal is incomplete.** The `admin-remove-user` edge function deletes the auth user (cascading most FKs) but does not clean up storage objects (avatars), `support_inquiries`, `referral_codes`, or write a deletion audit record. No manifest-driven deletion.

5. **P1 — No password change, 2FA, or sign-out-other-devices for students.** An account holding exam history has no security management UI beyond email/password login and a data export.

6. **P1 — NTA palette states are duplicated in 3 files** with no single source of truth. A color or behavior change requires editing `PaletteSymbol.tsx`, `ExamPage.tsx`, and `LandingPage.tsx` simultaneously. No transition tests exist.

7. **P1 — AdminSupportPage.updateInquiry never records `handled_by`** (`AdminPages.tsx:837`). Both ternary branches set `undefined`, so staff handling is never written to the database.

8. **P2 — Belts are flat text/boxes in 6 separate files** with no shared component or SVG. No `lib/belts.ts`. Belt thresholds are also duplicated (DashboardPage hardcodes 90/75/55/35/15 vs StudyPlanPage reads DB values).

9. **P2 — No exam blueprint versioning.** NTA rules (75 questions, +4/-1, sections) are constants in code, not versioned database records. A mid-exam rule change could alter running or past attempts.

10. **P2 — Sidebar scroll bug (B1).** The student sidebar is a sticky `overflow-y-auto` container whose scroll position is independent of the window and not reset on navigation. The browser's default scroll-to-active snaps the sidebar when the active link sits low, and re-renders shift it. `App.tsx` `ScrollToTop` resets only the window.

- Audit B3 (admin attempts timer cell) fixed. Audit B5 (handled_by) confirmed already implemented.

- Audit B2 (duplicated admin nav) fixed. Audit B4 (watermark toggle) confirmed already resolved.
