# MOCK NINJA — Changelog

Append-only project milestones.

## 2026-10-30 — Phase 0 audit

- Audited the installed React/Vite/TypeScript/Tailwind/Supabase stack and confirmed there is no MUI dependency or theme.
- Documented the current public, student, admin, development, and fallback routes.
- Confirmed the live database reports RLS enabled across all inspected public and storage relations.
- Recorded security hardening areas: broad role grants, browser-writable payment/subscription rows, missing integrity-event storage, and avatar-only storage policies.
- Recorded missing capabilities: durable window-switch history, question/question-paper media upload, unified route registry, shared copy module, and working Admin AI page.
- Created the Phase 0 audit, design-system baseline, and route guide.
- No application behavior or UI was changed during this audit.

## 2026-10-30 — Phases 1 to 3 partial delivery

- Removed transition-all from shared components, pages, and layouts; homepage feature sections left unchanged because they are locked.
- Documented motion and focus tokens in the design-system doc.
- Exam: window-switch overlay text now comes from translations; instructions overlay and subject/section tabs enlarged; each window switch is saved to a durable record for the attempt.
- Admin: question papers (PDF) can be attached to mocks; images can be attached to questions. Files live in a private, staff-only storage bucket. Students do not yet see these files.
- Results: shareable result summary card added after each attempt.
- Not started: dashboard analytics, engagement layer, AI Question Studio, remaining missing pages, route registry, copy consolidation, full QA.

## 2026-11-04 — Responsive pass across screens

- Exam: the candidate avatar is hidden on phones so the paper title has room beside the timer; instructions popup uses tighter padding on phones.
- Student: results subject table scrolls sideways on phones; bookmarks stats stack on phones.
- Admin: import summary tiles and test series rows wrap on phones.
- Public and auth pages were checked for fixed-width and fixed-column layouts; no changes were needed.
- Verification: typecheck, production build, and the 10 visual tests passed. Phone widths were not checked in a browser.

## 2026-11-04 — Responsive headers and touch targets

- Headers in the public, student, admin, and onboarding views are more compact on phones; header icon buttons and the exam palette, info button, subject tabs, and results rating stars are at least 44 pixels to tap.
- Verification: typecheck, production build, and the 10 visual tests passed. Phone widths were not checked in a browser.



## 2026-11-12 — AI generation orchestration

- AI question generation records each request as a job with status, counts, tokens, and cost.
- Generated questions are saved for review, not as drafts; admins can switch provider (Gemini or OpenAI), model, and pricing from the AI studio.
- Generation is limited to admins; usage records can no longer be written from the browser.
- Verification: typecheck (only pre-existing errors), production build, and edge function deploy passed. Provider key presence could not be verified.

## 2026-11-14 — Consent logging locked to the server

- The consent-logging database function can no longer be called from the browser or by signed-in users. It was not used anywhere in the app.
- Verification: migration applied; advisor findings reviewed and documented in PROJECT_MEMORY.

## 2026-11-14 — Typecheck clean; checkout session fix

- Checkout now sends the signed-in session token when creating a payment order; if the session has expired, the user is asked to sign in again.
- Admin pages load individually, so the project type-checks with no errors.

## 2026-11-21 — AI generates DPPs and mock tests; performance indexes

- AI Studio can now create DPPs and mock test drafts in addition to standalone questions. Generated tests appear as drafts in the mock builder for review before publishing.
- Dropped a duplicate database index and added indexes on 10 high-traffic foreign keys.
- Verification: typecheck clean, build passed, edge function deployed.

## 2026-11-21 — Deployment hardening

- Added HSTS and Content-Security-Policy headers to nginx config for production security.
- Suppressed nginx version disclosure in responses.
- Fixed social share preview image from bolt.new placeholder to local project logo.
- Bumped service worker cache version to ensure new deploys are served immediately.
