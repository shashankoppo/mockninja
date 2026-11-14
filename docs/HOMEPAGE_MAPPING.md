# Homepage Mapping — MOCK NINJA

## Framework & Tooling
- **Framework**: React 18 + Vite 7 + TypeScript
- **Router**: react-router-dom v7 (`BrowserRouter`, `Routes`, `Route`)
- **Styling**: Tailwind CSS 3 with custom tokens (govt/blue, navy, saffron, india/green, amber)
- **Data fetching**: @tanstack/react-query v5 (staleTime 60s default)
- **Supabase**: `@supabase/supabase-js` singleton at `src/lib/supabase.ts`
- **Auth**: `src/lib/auth.tsx` — `AuthProvider` context, `useAuth()` hook, session-based
- **i18n**: react-i18next (EN/HI), files in `src/i18n/`
- **Icons**: lucide-react
- **Build**: `npm run build` (vite build) | **Typecheck**: `npm run typecheck` (tsc --noEmit) | **Lint**: `npm run lint`
- **Tests**: None yet (no Vitest installed — not adding per scope constraints)

## Existing Routes
| Route | Page | Status |
|-------|------|--------|
| `/` | LandingPage | EXISTS (being upgraded) |
| `/login` | LoginPage | EXISTS |
| `/signup` | SignupPage | EXISTS |
| `/onboarding` | OnboardingPage | EXISTS |
| `/dashboard` | DashboardPage | EXISTS |
| `/mocks` | MocksPage (catalogue) | EXISTS |
| `/mocks/:id` | MockDetailPage | EXISTS |
| `/exam/:attemptId` | ExamPage | EXISTS |
| `/results/:attemptId` | ResultsPage | EXISTS |
| `/focus` | FocusPage | EXISTS |
| `/progress` | ProgressPage | EXISTS |
| `/leaderboard` | LeaderboardPage | EXISTS |
| `/settings` | SettingsPage | EXISTS |
| `/trust` | TrustPage | EXISTS |
| `/privacy` | PrivacyPage | EXISTS |
| `/terms` | TermsPage | EXISTS |
| `/admin` | AdminDashboardPage | EXISTS |
| AI Practice / Studio | — | MISSING (no route) |

### Route Key Allowlist
```
SIGNUP        → /signup
LOGIN         → /login
DASHBOARD     → /dashboard
MOCKS         → /mocks
MOCK_DETAIL   → /mocks/:id
PROGRESS      → /progress
TRUST         → /trust
```
**No AI_PRACTICE route** — any AI-related CTA is hidden behind feature flag `VITE_FEATURE_AI=false`.

## Database Tables & RPCs
| Table | Relevant Columns | Homepage Use |
|-------|-----------------|--------------|
| `mock_tests` | id, title, category, duration_min, total_marks, access, status, kind, visibility | Popular Test Series, Exam Navigator |
| `mock_test_questions` | mock_test_id (count) | Derived test counts |
| `subjects` | id, name | Exam Navigator categories |
| `chapters` | id, subject_id, name | (not used on homepage) |
| `questions` | review_status | Platform stats (published count) — STUDENT has no SELECT, needs RPC |
| `attempts` | user_id, mock_test_id, status, score | Personalized section (auth only) |
| `responses` | is_correct, awarded_marks, time_spent_sec | Personalized analytics (auth only) |
| `mastery_scores` | user_id, chapter_id, belt, score | Performance teaser (auth only) |
| `profiles` | id, email, full_name | Personalized greeting (auth only) |

### Missing Tables (need migration)
- `testimonials` — published student feedback with consent
- `faqs` — published FAQ entries
- `homepage_content` — editable hero copy, CTA labels, section config
- `public_platform_stats` — RPC view for trust stats (registered students, mock attempts, published questions, test series count)

### RLS Constraint
All existing tables have `TO authenticated` policies only — the anon key gets zero rows. The homepage is public (no sign-in required), so we need **SECURITY DEFINER RPCs** that return only published/answer-safe/public data to `anon` and `authenticated`.

## Section → Data Source Mapping
| # | Section | Data Source | Auth? |
|---|---------|------------|-------|
| 1 | Hero + Conversion | `homepage_content` RPC (published row) or hardcoded fallback | Public |
| 2 | Trust Stats | `public_platform_stats()` RPC | Public |
| 3 | Exam Navigator | `public_home_categories()` RPC (subjects + mock categories with published counts) | Public |
| 4 | Popular Test Series | `public_featured_tests()` RPC (published, public, featured mocks with question counts) | Public |
| 5 | Personalized Prep | Authenticated queries on attempts + mastery_scores (user-scoped) | Signed-in only |
| 6 | Why Mock Ninja | Static content + `homepage_content` config | Public |
| 7 | Performance Analytics | Authenticated: attempts/responses/mastery. Signed-out: sample illustration | Both |
| 8 | Testimonials | `public_testimonials()` RPC (published + consent_confirmed) | Public |
| 9 | FAQ | `public_faqs()` RPC (published, ordered) | Public |
| 10 | Final CTA | Static + auth-aware routing | Public |

## Metric Definitions (Section 2)
1. **Registered students**: `count(*) FROM profiles` — excludes auth.users without a profile row
2. **Mock tests attempted**: `count(*) FROM attempts WHERE status = 'SUBMITTED'`
3. **Published practice questions**: `count(*) FROM questions WHERE review_status = 'PUBLISHED'`
4. **Available test series**: `count(*) FROM mock_tests WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC'`
- Refresh: on-demand RPC call (real-time). Hide any metric < 1. Hide strip if < 2 metrics remain.

## Sections Hidden When Data Missing
- Section 2 (Trust Stats): hidden if RPC returns < 2 non-zero metrics
- Section 4 (Popular Test Series): hidden if no published public mocks exist
- Section 5 (Personalized): hidden if signed-out; shows general CTA instead
- Section 7 (Analytics teaser): signed-out shows sample illustration only
- Section 8 (Testimonials): hidden if zero published+consented rows
- Section 9 (FAQ): hidden if zero published FAQs

## Environment Variables
- `VITE_SUPABASE_URL` — exists
- `VITE_SUPABASE_ANON_KEY` — exists
- `VITE_FEATURE_AI` — set to `false` (AI practice route does not exist)

## Known Gaps
1. No AI practice/studio route exists → AI CTAs are hidden
2. No payment/Stripe integration → "Unlock Access" links to `/mocks` catalogue
3. No proctoring/webcam capability → not advertised
4. No test resumption support (exam Edge Function doesn't support resume) → "Continue preparation" routes to dashboard
5. Tests are Vitest+Testing Library would need installation — deferred per scope
