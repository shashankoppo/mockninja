# MOCK NINJA — Route Guide

Baseline: 2026-10-30. The route table is declared in `src/routes/appRoutes.tsx` and rendered by `src/App.tsx`; this document is the human-readable mirror.

## Public/authentication

| Path | Page | Access | Status |
|---|---|---|---|
| `/` | Landing | Public | Complete |
| `/login` | Login | Public only | Complete |
| `/signup` | Signup | Public only | Complete |
| `/forgot-password` | Forgot password | Public only | Complete |
| `/reset-password` | Reset password | Public only | Complete |
| `/onboarding` | Onboarding | Signed-in student | Complete |
| `/trust` | Trust centre | Public | Complete |
| `/privacy` | Privacy | Public | Complete |
| `/terms` | Terms | Public | Complete |
| `/mock-tests` | Public mock catalogue | Public | Complete |
| `/previous-year-papers` | Previous-year papers | Public | Complete |
| `/chapters` | Chapter catalogue | Public | Complete |
| `/revision-vault` | Revision vault | Public/student links | Complete: links to chapter notes and formula flashcards |
| `/revision-vault/notes` | Chapter notes list | Student | Complete: notes grouped by chapter, searchable |
| `/revision-vault/notes/:noteId` | Chapter note reader | Student | Complete: reading view with previous/next within chapter |
| `/revision-vault/flashcards` | Formula flashcards | Student | Complete: flip cards, mark known, shuffle, subject filter |
| `/dpp` | Daily practice | Student | Complete |
| `/dpp/custom` | Custom practice builder | Student | Complete |
| `/pricing` | Public pricing | Public | Complete |
| `/faq`, `/faqs` | FAQ | Public | Complete/alias |
| `/contact` | Contact | Public | Complete |

## Student workspace

| Path | Page | Access | Status |
|---|---|---|---|
| `/dashboard` | Dashboard | Student | Complete |
| `/attempted-tests` | Attempt history | Student | Complete |
| `/mocks` | Mock catalogue | Student | Complete |
| `/mocks/:id` | Mock details | Student | Complete |
| `/exam/:attemptId` | Live exam | Student | Complete; integrity history pending |
| `/results/:attemptId` | Results | Student | Complete |
| `/solution/:attemptId`, `/solution` | Solutions | Student | Complete/alias |
| `/exam/:attemptId/reattempt` | Mistake reattempt | Student | Complete |
| `/mastery` | Mastery | Student | Complete |
| `/performance`, `/progress` | Progress | Student | Complete/alias |
| `/leaderboard` | Leaderboard | Student | Complete |
| `/study-plan` | Study plan | Student | Complete |
| `/mistake-notebook` | Mistake notebook | Student | Complete |
| `/focus` | Focus topics | Student | Complete |
| `/resources` | Resources | Student | Complete |
| `/account` | Account | Student | Complete |
| `/settings` | Settings | Student | Complete |
| `/bookmarks` | Bookmarks | Student | Complete |
| `/subscription` | Subscription plans | Student | Complete; paid gateway pending |
| `/checkout` | Checkout | Student | Partial: preview until payment provider is configured |
| `/payment/success` | Payment result | Student | Complete UI |
| `/payment/failure` | Payment failure | Student | Complete UI |
| `/payment/pending` | Pending payment | Student | Alias |
| `/billing`, `/billing/transactions`, `/dashboard/billing` | Billing | Student | Complete/aliases |
| `/notifications` | Notifications and support | Student | Complete |
| `/report-question` | Report question | Student | Complete |

## Admin

| Path | Page | Access | Status |
|---|---|---|---|
| `/admin` | Admin dashboard | Admin/editor | Complete |
| `/admin/topics` | Topics | Admin/editor | Complete |
| `/admin/questions` | Question bank | Admin/editor | Complete; media upload pending |
| `/admin/questions/import` | Question import | Admin/editor | Complete/limited |
| `/admin/mocks` | Mock builder | Admin/editor | Complete; question paper upload pending |
| `/admin/exam-settings` | Exam settings | Admin | Complete |
| `/admin/attempts` | Attempts | Admin | Complete |
| `/admin/rankings` | Rankings | Admin | Complete |
| `/admin/proctoring` | Proctoring | Admin | Partial; shows window-switch counts per attempt, per-event timeline not shown |
| `/admin/watermarks` | Watermarks | Admin | Complete |
| `/admin/users` | Users | Admin | Complete |
| `/admin/billing` | Billing | Admin | Complete |
| `/admin/subscriptions` | Subscription plans | Admin | Complete |
| `/admin/resources` | Resources | Admin/editor | Complete |
| `/admin/content` | Content | Admin | Complete |
| `/admin/support` | Support | Admin | Complete |
| `/admin/ai` | AI Question Studio | Admin | Complete usage view; question generation not enabled |
| `/admin/reports` | Reports | Admin | Complete |
| `/admin/question-reports` | Question reports | Admin | Complete |
| `/admin/analytics` | Analytics | Admin | Alias to reports |
| `/admin/settings` | Platform settings | Admin | Complete |
| `/admin/homepage` | Homepage management | Admin/editor | Complete |
| `/admin/transactions` | Transactions | Admin | Complete |
| `/admin/reconciliation` | Payment reconciliation | Admin | Complete |
| `/admin/promo-codes` | Promo codes | Admin | Complete |

## Development/fallback

- `/dev/math` — development math gallery.
- `/dev/ui` — development UI gallery.
- `*` — friendly not-found page.

## Route registry decision

`src/routes/appRoutes.tsx` is the single list of route paths, page elements, and access guards; `App.tsx` renders it. Sidebars, breadcrumbs, and document titles still define their own links and labels. This file mirrors the registry and is not itself executable.
