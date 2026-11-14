# MOCK NINJA — Phase 0 Audit

Date: 2026-10-30
Scope: read-only audit of the current repository and provisioned Supabase posture. No application behavior was changed for this audit.

## 1. Executive summary

MOCK NINJA is a React 18, Vite, TypeScript, Tailwind, Supabase and KaTeX JEE practice platform. The core student path exists: authentication, onboarding, mock catalogue, mock details, NTA-style exam flow, server grading, results, progress, focus topics, daily practice, subscriptions, billing states, support and feedback. The admin area has real question, mock, content, support, user, billing and reconciliation screens.

The largest incomplete areas are AI Question Studio, durable exam integrity history, question/question-paper media uploads, a unified route registry, a shared copy module, and full cross-screen visual QA. The current exam window-switch warning is client-side only. Premium start access is server-checked, but paid checkout remains unavailable until the payment provider is configured.

The database reports 38 public/storage relations in the inspected posture, all with RLS enabled. However, many tables grant broad Data API privileges to anon/authenticated and rely on RLS to deny access; this is a hardening concern. There is no question-paper media bucket and no integrity-events table.

## 2. Stack and versions

From package.json:

- React 18.3.1; React DOM 18.3.1.
- Vite 7.3.7; TypeScript 5.5.3.
- React Router DOM 7.18.4.
- Tailwind CSS 3.4.1; PostCSS 8.4.35; Autoprefixer 10.4.18.
- Supabase JS 2.57.4.
- TanStack React Query 5.104.5.
- i18next 26.5.4; react-i18next 17.1.0; browser language detector 8.2.1.
- KaTeX 0.19.0 and @types/katex 0.16.8.
- lucide-react 0.446.0, sonner 2.0.8, zod 4.6.7, clsx 2.1.1, tailwind-merge 3.7.0.
- ESLint 9.9.1 with TypeScript ESLint 8.3.0.
- No MUI dependency or MUI theme is present. UI primitives are local Tailwind components.

## 3. Route table

Status uses the current source and memory: Complete means a real page and flow exists; Partial means the page exists but has known placeholder/unfinished behavior; Alias means it intentionally points to another real page; Dev means development-only.

### Public and authentication

| Path | Component | Guard | Status |
|---|---|---|---|
| `/` | LandingPage | public | Complete |
| `/login` | LoginPage | public-only | Complete |
| `/signup` | SignupPage | public-only | Complete |
| `/forgot-password` | ForgotPasswordPage | public-only | Complete |
| `/reset-password` | ResetPasswordPage | public-only | Complete |
| `/onboarding` | OnboardingPage | student | Complete |
| `/trust` | TrustPage | public | Complete |
| `/privacy` | PrivacyPage | public | Complete |
| `/terms` | TermsPage | public | Complete |
| `/mock-tests` | MockTestsPage | public | Complete |
| `/previous-year-papers` | PreviousYearPapersPage | public | Complete |
| `/chapters` | ChaptersPage | public | Complete |
| `/revision-vault` | RevisionVaultPage | public | Complete/feature links marked coming soon |
| `/dpp` | DppStudentPage | student | Complete |
| `/dpp/custom` | CustomPracticePage | student | Complete |
| `/pricing` | PricingPage | public | Complete |
| `/faq`, `/faqs` | FaqPage | public | Complete/alias |
| `/contact` | ContactPage | public | Complete |

### Student

| Path | Component | Guard | Status |
|---|---|---|---|
| `/dashboard` | DashboardPage | student | Complete |
| `/attempted-tests` | AttemptedTestsPage | student | Complete |
| `/mocks` | MocksPage | student | Complete |
| `/mocks/:id` | MockDetailPage | student | Complete |
| `/exam/:attemptId` | ExamPage | student | Complete; integrity history missing |
| `/results/:attemptId` | ResultsPage | student | Complete |
| `/solution/:attemptId`, `/solution` | SolutionsPage | student | Complete/alias |
| `/exam/:attemptId/reattempt` | ReattemptPage | student | Complete |
| `/mastery` | MasteryPage | student | Complete |
| `/performance`, `/progress` | ProgressPage | student | Complete/alias |
| `/leaderboard` | LeaderboardPage | student | Complete |
| `/study-plan` | StudyPlanPage | student | Complete |
| `/mistake-notebook` | MistakeNotebookPage | student | Complete |
| `/focus` | FocusPage | student | Complete |
| `/resources` | ResourcesPage | student | Complete |
| `/account` | AccountPage | student | Complete |
| `/settings` | SettingsPage | student | Complete |
| `/bookmarks` | BookmarksPage | student | Complete |
| `/subscription` | SubscriptionPlansPage | student | Complete; paid checkout pending |
| `/checkout` | CheckoutPage | student | Partial; payment gateway preview |
| `/payment/success` | PaymentSuccessPage | student | Complete state UI; gateway pending |
| `/payment/failure` | PaymentFailurePage | student | Complete state UI |
| `/payment/pending` | PaymentFailurePage | student | Alias |
| `/billing`, `/billing/transactions`, `/dashboard/billing` | BillingPage | student | Complete/aliases |
| `/notifications` | NotificationsSupportPage | student | Complete |
| `/report-question` | ReportQuestionPage | student | Complete |

### Admin

| Path | Component | Guard | Status |
|---|---|---|---|
| `/admin` | AdminDashboardPage | ADMIN/EDITOR | Complete |
| `/admin/topics` | AdminTopicsPage | ADMIN/EDITOR | Complete |
| `/admin/questions` | AdminQuestionsPage | ADMIN/EDITOR | Complete; no media upload |
| `/admin/questions/import` | AdminImportPage | ADMIN/EDITOR | Complete/limited import |
| `/admin/mocks` | AdminMocksPage | ADMIN/EDITOR | Complete; no paper/media upload |
| `/admin/exam-settings` | AdminExamSettingsPage | ADMIN | Complete |
| `/admin/attempts` | AdminAttemptsPage | ADMIN | Complete |
| `/admin/rankings` | AdminRankingsPage | ADMIN | Complete |
| `/admin/proctoring` | AdminProctoringPage | ADMIN | Partial; no durable switch-event source |
| `/admin/watermarks` | AdminWatermarksPage | ADMIN | Complete |
| `/admin/users` | AdminUsersPage | ADMIN | Complete |
| `/admin/billing` | AdminBillingPage | ADMIN | Complete |
| `/admin/subscriptions` | AdminSubscriptionPlansPage | ADMIN | Complete |
| `/admin/resources` | AdminResourcesPage | ADMIN/EDITOR | Complete |
| `/admin/content` | AdminContentPage | ADMIN | Complete |
| `/admin/support` | AdminSupportPage | ADMIN | Complete |
| `/admin/ai` | AdminAiPage | ADMIN | Stub: Placeholder/Phase 9 |
| `/admin/reports` | AdminReportsPage | ADMIN | Complete |
| `/admin/question-reports` | AdminQuestionReportsPage | ADMIN | Complete |
| `/admin/analytics` | AdminReportsPage | ADMIN | Alias |
| `/admin/settings` | AdminSettingsPage | ADMIN | Complete |
| `/admin/homepage` | AdminHomepagePage | ADMIN/EDITOR | Complete |
| `/admin/transactions` | AdminTransactionsPage | ADMIN | Complete |
| `/admin/reconciliation` | AdminReconciliationPage | ADMIN | Complete |
| `/admin/promo-codes` | AdminPromoCodesPage | ADMIN | Complete |

### Development and fallback

| Path | Component | Guard | Status |
|---|---|---|---|
| `/dev/math` | DevMathPage | public/dev | Dev |
| `/dev/ui` | DevUiPage | public/dev | Dev |
| `*` | NotFoundPage | public | Complete |

The route list is declared directly in `src/App.tsx`. `src/features/home/config/routes.ts` is only a small feature route map and is not the application route registry.

## 4. Component inventory

### Layout and application infrastructure

- `PublicLayout`, `StudentLayout`, `AdminLayout`.
- `ThemeProvider`, `AuthProvider`, `ProtectedRoute`, `ErrorBoundary`, `OfflineBanner`, `Toaster`.
- `BrandLogo`, `ThemeSwitcher`, `LanguageSwitcher`, `LoadingScreen`, `EmptyState`, `ErrorState`.

### Local UI primitives

- `Button`, `Card`, `Badge`, `Dialog`, `Progress`, `Skeleton`, `Tabs`, `Toast`, `Tooltip`.
- These are the primary shared versions. Some pages still use native buttons, inputs, `confirm()`, inline alerts, and page-specific cards instead of the primitives.

### Exam components

- `PreStartFlow`, `NumericalKeypad`, `PaletteSymbol`, `BookmarkButton`, `Math`.
- Exam warning and several exam dialogs remain inline in `ExamPage`.

### Student and home components

- Performance analytics, personal details dialog, home section components, and subscription card/comparison/FAQ components.

### Duplicate or fragmented patterns

- Route definitions are duplicated between `App.tsx` and the small home route map.
- Toasts are shared through `src/lib/toast.ts`, but many messages remain inline.
- `Card`, `Button`, `Dialog`, `Badge`, and `EmptyState` are shared, but pages also use bespoke bordered panels, native buttons, inline dialogs, and native `confirm()`.
- There is no `src/lib/copy.ts`; translations and inline strings coexist.
- There is no shared motion variants module.
- `src/index.css` contains both token variables and many page-specific hard-coded surface rules.

## 5. Design tokens actually in use

### CSS theme variables in `src/index.css`

Light: `--bg #f7f9fc`, `--header #ffffff`, `--surface #ffffff`, `--surface-elevated #f8fafc`, `--border #dbe3ee`, `--text #172033`, `--text-2 #526176`, `--accent #6d28d9`, `--accent-contrast #ffffff`, `--violet #7c3aed`, `--magenta #db2777`, `--mint #0f766e`, `--amber #b45309`, `--danger #b91c1c`, `--focus #0369a1`, `--muted-surface #eef2f7`, `--input-surface #ffffff`.

Dark: `--bg #101117`, `--header #171827`, `--surface #191923`, `--surface-elevated #22212d`, `--border #373443`, `--text #f5f3fa`, `--text-2 #cbd5e1`, `--accent #a78bfa`, `--accent-contrast #17111f`, `--violet #a78bfa`, `--magenta #f0abfc`, `--mint #5eead4`, `--amber #fbbf24`, `--danger #f87171`, `--focus #c4b5fd`, `--muted-surface #252536`, `--input-surface #20212d`.

### Tailwind colors in `tailwind.config.js`

- `navy`: 50–950, default `#0B1120`.
- `govt`: 50–950, default `#06B6D4`.
- `vibe`: 50–950, default `#F43F5E`.
- `aurora`: 50–950, default `#8B5CF6`.
- `saffron`: 50–900, default `#FF9913`.
- `india`: 50–900, default `#10B981`.
- `amber`: 50–900, default `#F59E0B`.
- `orange`: 50–900, default `#F97316`.
- Aliases: `success #10B981`, `warning #F59E0B`, `error #F43F5E`, `accent #06B6D4`.

### Typography, radius, shadow, motion

- Sans: Manrope, Inter, system-ui; display: Space Grotesk, Manrope, system-ui; serif: Lora, Georgia, serif; Plus Jakarta Sans is also loaded for selected exam/admin headings.
- Tailwind has `2xs` at 0.625rem/0.875rem and `content` max width 1200px.
- Shadows: `card`, `card-hover`, `glow-teal`, `glow-vibe`, `glow-aurora`, `focus`, `premium`.
- Animations: fade-in, slide-up/down, scale-in, slide-in-left, shimmer, float, pulse-glow, gradient-shift, bounce-in plus CSS keyframes.
- Existing global focus rule uses a 2px aurora ring with 2px offset, but its ring offset is dark-specific and needs a theme-safe audit.
- Existing base tap target is 44px. Reduced motion globally shortens transitions and animations.

## 6. Database and RLS posture

The live Supabase inspection reports RLS enabled on every listed relation.

### Public application tables

`profiles`, `subjects`, `chapters`, `questions`, `mock_tests`, `mock_test_questions`, `attempts`, `responses`, `student_focus_topics`, `mastery_scores`, `user_daily_mocks`, `public_profiles`, `notification_log`, `ai_usage_ledger`, `question_bookmarks`, `testimonials`, `faqs`, `homepage_content`, `support_inquiries`, `platform_settings`, `subscription_plans`, `user_subscriptions`, `question_reports`, `promo_codes`, `transactions`, `refund_requests`, `referral_codes`, `test_feedback`, `push_subscriptions`, and `custom_practice_sets` — all report RLS enabled.

### Storage/system relations

`storage.buckets`, `storage.buckets_analytics`, `storage.buckets_vectors`, `storage.migrations`, `storage.objects`, `storage.s3_multipart_uploads`, `storage.s3_multipart_uploads_parts`, and `storage.vector_indexes` — all report RLS enabled. Current object policies are for the private `avatars` bucket only. No question-media or question-paper bucket is present.

### Required patch 1/2 data

The inspected live schema includes the focus-topic, mastery-score, daily-target mock, leaderboard/public-profile, nudge-log/notification, and AI budget ledger structures. The AI ledger currently supports `STUDIO` and `DAILY_TOPUP` purposes only.

### Security findings for future phases

- Broad anon/authenticated table grants are present on many relations. RLS currently limits effective access in most cases, but least-privilege grants should be reviewed before launch.
- Several staff policies use `ALL`; future hardening should separate CRUD verbs where practical.
- Some user-owned tables have no explicit update/delete policy, which is restrictive but should be verified against actual flows.
- Student-owned financial and subscription rows currently permit browser-side writes under owner policies; payment activation must move to a verified server/webhook path before production payments.
- No integrity-event table exists.
- No question-media storage bucket exists.
- Storage object policies cover avatars only; question assets must use a separate private bucket and tightly scoped policies.

## 7. Single-source-of-truth violations

- User-facing text is split between EN/HI translation files and inline strings in page components.
- No shared `copy.ts` exists for common toasts, errors, empty states, confirmations, and button labels.
- Routes are hard-coded in `src/App.tsx`; the feature route map is separate and incomplete.
- CSS contains many literal hex colors and rgba values alongside Tailwind tokens and CSS variables.
- Spacing and motion frequently use page-level utility combinations rather than shared semantic tokens.
- Admin question validation, error presentation, and success copy are partly inline and partly translated.
- Admin dashboard contains inline labels such as “submitted today”, “open inquiries”, “Latest student attempts”, and “No attempts yet.”
- `AdminAiPage` is still a placeholder rather than a working page.
- Native `confirm()` and inline modal structures coexist with the shared `Dialog` primitive.
- `transition-all` is used in shared CSS and pages despite the desired property-specific motion rule.

## 8. Phase 0 conclusion

The foundation is usable, but the next implementation should be sequenced rather than treated as one undifferentiated rewrite. First fix the durable security/data boundaries for integrity events, payment activation, and question media. Then centralize routes/copy/tokens and polish the exam surface. The homepage palette and NTA exam structure should remain protected while accessibility and truthful-content corrections proceed.
