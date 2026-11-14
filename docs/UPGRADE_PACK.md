# MOCK NINJA — Upgrade Pack: Gap Analysis and Bolt.new Prompts

> Source: Nov 2, 2026. Preserved verbatim for future sessions. Do not lose this memory.
> This is a planning document. Steps are run one per chat, each with its own acceptance checklist.

## Overview and how to run it

The transcript you pasted is a voice assistant's running commentary on screens you showed it. It is useful as a list of symptoms, but it is vague in places, contradicts itself in a few (it drifts into the Settings page after you asked it not to), and it never checks anything against what the app actually contains. I have compared every item with the Phase 1 to 10 pack, Phase 5B and Theme v2, sorted them into "already specified", "partly specified" and "missing", added what a premium JEE platform still lacks that the transcript never mentioned, and flagged the suggestions that would be unsafe or wrong if built literally.

What I could not see. I have not seen your running app, only your description of it. Some "missing" items may already exist in some form, and some things the pack specifies may have been built differently. So the first step, U0, is a read-only audit that makes Bolt inventory the real routes, tables and features before anything is changed. Every later step reads that audit.

Your stack. Bolt must keep the project's existing UI stack (React, Tailwind CSS and Material UI) and the locked palette. No step may introduce a second component library, new brand colours, or changes to the locked hero components.

## Rules that apply to every step

- One step per chat. Read docs/PROJECT_MEMORY.md, docs/DECISIONS.md, docs/SCHEMA_CONTRACT.md, docs/DESIGN_REFERENCE.md, docs/LOCKED_UI.md and, after U0, docs/APP_AUDIT.md first.
- After a step: append to PROJECT_MEMORY.md, run npm run memory:check and npm run test:visual, commit to GitHub, and only then send the next step.
- Never edit an existing migration; add a new numbered one. Never edit a locked component without the word UNLOCK and its name.
- Server-side checks are the authority for permissions, scoring, timing, deletion and payments. The interface only reflects them.
- Tone of all new copy: warm, encouraging and inclusive, with no gendered assumptions and no pressure language.

## Order, dependencies and risk

| Step | What it delivers | Depends on | Risk |
|------|-------------------|------------|------|
| U0 | Read-only audit and true inventory | none | Low |
| U1 | Signed-in homepage, Continue Learning, one unified daily panel | Phases 3, 6, 7 | Low |
| U2 | Taekwondo-style belt visuals everywhere | Phase 6 | Low |
| U3 | NTA fidelity pass: palette, keypad, homepage exam preview | Phase 5B, T4 | Medium |
| U4 | User management and complete data deletion | Phase 3 | High (irreversible) |
| U5 | Question bank table and upload validation | Phase 4 | Medium |
| U6 | Admin fixes, analytics graphs, contact and social settings | T5 | Medium |
| U7 | Exam blueprint versions, integrity review, watermark and leaderboard settings | 5B, Phase 8 | Medium |
| U8 | Support desk | Phase 3 | Medium |
| U9 | Student analytics page and AI Doubt-to-Practice Studio | Phases 6, 9 | Medium |
| U10 | Subscriptions and payments (test mode first) | business details | High (money) |
| U11 to U13 | Optional: answer-key corrections with rescoring, notifications and public pages, test series and PYQ library | various | Medium |

## Gap analysis

Priority key: P1 is a correctness, safety or visible-bug item; P2 is a core feature that a premium platform needs; P3 is polish or depends on business decisions.

### A. Items from your transcript, checked against the pack

| # | Item | Status in the pack | What is still needed | Priority |
|---|------|-------------------|----------------------|----------|
| 1 | Homepage changes with login status; study plan only for signed-in students | Partly: the dashboard exists, no signed-in homepage variant | Signed-in homepage that swaps in personal sections; personal widgets never render for visitors | P1 |
| 2 | "Continue Learning" for returning students | Partly: dashboard cards only | Same data on the signed-in homepage | P1 |
| 3 | One unified daily practice section | Partly: Daily Target Mock card only, DPP not specified | One "Today" panel combining Daily Target Mock, DPP, mistake re-attempts and focus topics | P1 |
| 4 | Taekwondo-style belts with fabric texture | Missing: belts are text plus colour | Reusable SVG belt component with weave, stitching, folds and knot | P2 |
| 5 | NTA palette with exact "Answered & Marked for Review" behaviour | Specified in 5B, never verified | Single source of truth for states, tests for every transition, fidelity audit run | P1 |
| 6 | Numerical answers with a mouse-only keypad | Specified in 5B | Keep, but keypad must be keyboard-operable and must not open the phone keyboard | P1 |
| 7 | Homepage section showing real NTA behaviour | Missing | Exam-interface preview built from the real palette components | P3 |
| 8 | Question bank as a responsive data table | Partly: editor and import exist | Server-paged, filterable, mobile-friendly table with bulk actions | P1 |
| 9 | Removing a user deletes all their data | Partly: self-service delete only; cascade never tested | Admin removal, a deletion manifest, storage and auth cleanup, tests | P1 |
| 10 | Sidebar auto-scrolls in settings | Missing: it is a bug | Diagnose and fix scroll jumping; keep scroll position | P1 |
| 11 | Graphs on the admin Analytics page | Missing | Admin charts from aggregate-only queries | P2 |
| 12 | Social links, contact desks and global settings editable by admin | Partly: homepage content and flags only | Contact desks, social links, legal and SEO fields with validation and publish | P2 |
| 13 | Dedicated student dashboard | Partly | Finish as the signed-in landing page | P2 |
| 14 | Interactive AI Doubt-to-Practice Studio (student side) | Missing: Phase 9 is the admin generator | Student studio with history, quotas, checks and disclaimers | P2 |
| 15 | Deep Performance Analytics page | Partly: /progress is basic | /analytics with subject, chapter, time and negative-marks views | P2 |
| 16 | User Management page | Missing | Search, roles, status, guardian consent, delete, audit | P1 |
| 17 | Question bank upload validation | Specified (dry run) | Extend with duplicate and licence checks and a downloadable error file | P2 |
| 18 | Exam Blueprint page with versioned NTA rules | Missing: rules are constants in code | Versioned blueprints that mocks pin to, so history never changes | P2 |
| 19 | Leaderboard settings | Missing: only student opt-in exists | Admin controls for cohort size, eligibility and on or off | P3 |
| 20 | Proctoring event review logs | Partly: read-only table in T5 | Reviewable timeline per attempt with staff notes; no camera claims | P3 |
| 21 | Dynamic watermark policy | Partly: one flag | Policy page: on or off, content, opacity, exam-only | P3 |
| 22 | Support desk | Missing (the schema already reserves an SLA_ALERT notification type) | Tickets, replies, status, SLA and email | P2 |
| 23 | Subscription management and payment sync | Missing: only an access flag exists | Plans, entitlements, hosted checkout, signed webhooks, invoices | P3 |
| 24 | Settings: password change, MFA, public profile, export, delete | Partly: export, delete and profile exist; student password change and MFA do not | Add password change, optional MFA, sign out other sessions | P2 |

### B. Missing and not mentioned in the transcript

| Item | Why it matters | Step |
|------|----------------|------|
| Answer-key correction with automatic rescoring and notice to affected students | One wrong key corrupts scores, belts and ranks; this is the biggest trust risk for a mock platform | U11 |
| In-app notifications centre and a first-run checklist | Returning students need a place for results, replies and reminders | U12 |
| Public pages (About, FAQ, Contact, Pricing if billing exists), sitemap, meta and Open Graph tags, pre-rendering | A Vite single-page app is poorly indexed without it | U12 |
| Student account security: password change, optional two-factor, sign out other devices | Expected on any account that holds exam history | U12 |
| Hindi coverage check | A bilingual promise needs a script that finds untranslated keys | U12 |
| Test series and PYQ library data model with licence flags | The header and hero already promise them | U13 |
| Scheduled live mocks with start windows (optional) | Common in test series; needs fair-start rules | U13 |
| Human check and bot protection on sign-up, login and support forms | Prevents abuse of email and AI budgets | U8, U12 |
| Consent log and a data-deletion request queue | Needed to show how guardian consent and deletion requests were handled | U4 |
| Data retention schedule and email authentication records (SPF, DKIM, DMARC) | Policy and operations decisions Bolt cannot make for you; add to the legal open items | Outside Bolt |

### C. Suggestions that would be wrong or risky if built literally

| Suggestion | Problem | How the prompts handle it |
|------------|---------|--------------------------|
| "Delete all associated data" | Payment and invoice records usually must be kept for tax and legal reasons, and audit logs must stay | Everything personal is deleted or anonymised; financial records are kept with the identity removed. Confirm retention periods with an accountant or lawyer |
| "Authentic Taekwondo belts" | Taekwondo ladders usually run white, yellow, green, blue, red, black, while your database uses white, yellow, green, blue, brown, black | Keep the database values and draw Brown as a brown belt; every belt shows its name as text |
| Fabric texture and folds on every belt | SVG filters repeated in lists are slow on mid-range phones | One shared SVG symbol set using patterns, no per-instance filters, under 20 KB |
| "Mouse-only" keypad | Keyboard and switch users could not answer at all | Typing into the box stays disabled, but each keypad button is focusable and works with Enter or Space; the phone keyboard never opens |
| "Proctoring event review" | There is no camera, and an event is a signal, not proof of cheating | Named Integrity events; staff review with notes; never an automatic penalty or a cheating label |
| Payment gateway "sync" | Highest-risk area: money, GST, refunds, minors | Hosted checkout only, no card data in the app, signed webhooks, idempotency, test mode first, entitlements enforced on the server |
| "Fully interactive" AI studio | AI explanations can be wrong and uploads are private data | Independent answer check, clear "AI-generated" labels, quotas and budget, moderation, deletable history, excluded from mastery |
| Homepage that swaps by login | A flash of the wrong content, layout shift, or personal data shown to visitors | Route-level swap, skeleton while the session resolves, data fetched only after sign-in, hero stays locked |

## Steps U0 to U3: audit, homepage, belts, exam fidelity

### U0: Read-only audit (run this first)

UPGRADE STEP U0: READ-ONLY AUDIT. Do NOT change any code, database object or setting in this step. Read docs/PROJECT_MEMORY.md, docs/DECISIONS.md, docs/SCHEMA_CONTRACT.md, docs/DESIGN_REFERENCE.md and docs/LOCKED_UI.md first. Then inspect the real project and write docs/APP_AUDIT.md with these sections:

1. ROUTES: every route with its file, who may open it (public, student, staff), and its state (works, placeholder, broken, dead link).
2. DATA: every table with its columns and whether RLS is enabled, every database function with who may execute it, every Edge Function, storage bucket and cron job. Mark every difference from docs/SCHEMA_CONTRACT.md.
3. FEATURE MATRIX: for each item below write EXISTS, PARTIAL, MISSING or BROKEN, with file paths and one line of evidence: signed-in homepage variant; Continue Learning; study plan; Today or daily practice widgets (list each one and where it appears); DPP; mastery belts and how they are drawn; NTA palette states; Answered and Marked for Review behaviour; numerical keypad and how input is restricted; question bank table; question import and validation; user management; admin user removal; admin analytics page and its charts; site settings (social links, contact details, global settings); student dashboard; student analytics page; AI Doubt-to-Practice Studio (student side); exam blueprint; leaderboard settings; integrity event review; watermark; support desk; subscriptions or payments; password change, two-factor, data export and account deletion for students; notifications centre; public pages (About, FAQ, Contact); test series; PYQ library.
4. BUGS: list every visible defect you can find by reading the code, including the sidebar that auto-scrolls in the settings area. For that one, search for scrollIntoView, scrollTo, focus() calls in effects, components remounting because of a changing key or an inline component definition, and layout containers that scroll with the window instead of their own overflow, and say which is the likely cause.
5. SECURITY QUICK CHECK (report only, do not fix): any service-role key or secret in client code; tables without RLS; functions executable by anon or authenticated that should not be; any endpoint or query that returns correct answers before submission; admin routes that rely only on hiding links; any place a visitor can see another student's data.
6. UI STACK: confirm which component library and styling system is in use (expected: React, Tailwind CSS and Material UI), list any second component library, count hard-coded colour values outside the token files, and list duplicated components.
7. DELETION MANIFEST (draft): every table, storage path and external record that references a user, with its current ON DELETE behaviour.

Finish by posting the ten most important findings in chat, ordered by severity. Append an Upgrade step U0 entry to docs/PROJECT_MEMORY.md, record every difference between the pack and reality in docs/DECISIONS.md, and run npm run memory:check.

- [ ] docs/APP_AUDIT.md exists with all seven sections filled
- [ ] No code, migration or setting changed in this step
- [ ] Every feature in the matrix has a state and evidence
- [ ] The sidebar scroll bug has a named likely cause

### U1: Signed-in homepage, Continue Learning and one unified daily panel

UPGRADE STEP U1: SIGNED-IN HOMEPAGE AND UNIFIED DAILY PANEL. Read the memory and design files and docs/APP_AUDIT.md first. Use the project's existing UI stack. Do not edit locked components; the hero stays as it is.

1. ROUTE-LEVEL SWAP. Make the home route choose between PublicHome (the current homepage with the locked hero) and SignedInHome after the session resolves. Read the stored session synchronously where possible, show a lightweight skeleton while it resolves, and avoid any flash of the wrong page or layout shift. Visitors must never see personal sections, not even empty ones. Personal data is fetched only after sign-in, under existing RLS.
2. SIGNED-IN HOMEPAGE, in this order, no more than about two screens of scroll on desktop: (a) a compact welcome with the student's first name and one rotating warm line (inclusive and gender-neutral, no pressure about streaks); (b) Continue Learning strip: resume an in-progress attempt (with remaining time), last result, next recommended chapter; (c) the unified Today panel; (d) belts overview: three chapters with their belts; (e) the last three attempts; (f) published announcements; (g) the study plan if one exists, shown only for signed-in students who finished onboarding, otherwise a gentle "Set your target" prompt.
3. UNIFIED TODAY PANEL. One card replacing every separate daily widget found in the audit, on the homepage and on the dashboard. A segmented control with only the tabs whose feature exists: Target Mock, Daily Practice (DPP), Redo mistakes, Focus topics. One primary button at a time, a small progress ring ("2 of 3 done today"), and the explanation panel "Why these questions?" from Phase 7. It uses get_or_create_daily_mock and the existing DPP data. Remove the old duplicate widgets and redirect any link that pointed at them.
4. If a study plan feature exists, only gate it as in 2(g). Do not build a new planner in this step.
5. Dashboard route /dashboard shows the same sections as the signed-in homepage, plus full lists; keep both consistent by sharing components.
6. Loading, empty and error states on every section. New copy is warm, encouraging and inclusive.

- [ ] A visitor never sees personal sections or placeholders for them
- [ ] No flash of the public page for a signed-in student on reload
- [ ] There is exactly one daily practice panel in the app, and old widgets are gone
- [ ] The hero files are unchanged and npm run test:visual passes
- [ ] Layout shift under 0.1 on the home route in both states

### U2: Taekwondo-style mastery belts

UPGRADE STEP U2: BELT VISUALS. Read the memory and design files and docs/APP_AUDIT.md first. Replace every flat belt box with one reusable component. Keep the database values exactly as they are (UNRATED, WHITE, YELLOW, GREEN, BLUE, BROWN, BLACK).

1. Component `<Belt level size progress showLabel />`. Sizes: xs 20px (list chips), sm 32px, md 64px, lg 128px. The artwork is inline SVG: a slightly curved horizontal band with a fine twill weave (an SVG pattern), rows of stitching along the length as on a real taekwondo belt, soft fold shading made from gradients and a dark crease, two tails and a square knot (knot only at md and lg). Black belt has a darker weave with a faint sheen; white belt has a grey fold shading so it stays visible on dark surfaces; UNRATED is an undyed folded belt outline.
2. Colours: define belt colours as semantic tokens (--belt-white, --belt-yellow, --belt-green, --belt-blue, --belt-brown, --belt-black) in the token file. They are a documented exception to the locked brand palette; record this in DECISIONS.md. Do not change any brand colour.
3. Performance and safety: one hidden SVG sprite with a symbol per level, patterns defined once, no SVG filters, total under 20 KB; instances use `<use>`. No animation by default; on a belt-up event a single short shine, disabled under reduced motion.
4. Accessibility: role img with aria-label such as "Green belt, 62 percent of the way to Blue"; the belt name is always shown as text beside it in lists, tables and cards; never colour alone.
5. Progress: with the progress prop show a thin stitched bar below the belt in the next belt's colour and the text "62% to Blue". UNRATED shows "Needs N more questions" from evidence_count versus the minimum of 8.
6. Use it in: the signed-in homepage and dashboard, the Today panel, /progress topic matrix (xs), the leaderboard, the results page, the public profile and the share card (/s/:handle and the exported share image use the same SVG).
7. Belt-up moment: if the previous level is available without a schema change (for example from the cached progress query before submit), show one warm toast on the results page such as "Chapter name: Green belt. Nicely done." No confetti.
8. Add a belts section to /dev/ui showing all levels at all sizes and a Playwright snapshot test for each level at three sizes.

- [ ] No flat belt boxes remain anywhere (search the code)
- [ ] All seven levels render crisply at all four sizes on a 360px phone
- [ ] Belt name appears as text wherever a belt appears
- [ ] Sprite is under 20 KB and no SVG filters are used
- [ ] Share image shows the same belt artwork

### U3: NTA fidelity pass, keypad access and homepage exam preview

UPGRADE STEP U3: EXAM FIDELITY PASS. Read the memory and design files, Phase 5B and docs/APP_AUDIT.md first. Do not change grading or timing code.

1. SINGLE SOURCE OF TRUTH. Create src/exam/questionStates.ts exporting the five states (NOT_VISITED, NOT_ANSWERED, ANSWERED, MARKED, ANSWERED_MARKED) with label text, legend wording, symbol shape, token colour and whether the state is evaluated (only ANSWERED and ANSWERED_MARKED). The exam palette, legend, instruction pages, the homepage preview, the admin preview and the tests must all import it; delete any duplicate definitions.
2. TRANSITIONS. Write unit tests for the pure state function covering every transition in Phase 5B section 4, with these cases explicit: Save and Next with an answer gives ANSWERED and removes a review mark; Mark for Review and Next with an answer gives ANSWERED_MARKED (evaluated); without an answer gives MARKED (not evaluated); Clear Response gives NOT_ANSWERED; moving away without saving discards an unsaved selection; the first view turns NOT_VISITED into NOT_ANSWERED. Confirm that the server grades only ANSWERED and ANSWERED_MARKED and add a server-side test for it.
3. NUMERICAL KEYPAD. The answer box is read-only with inputMode set to none so a phone's keyboard never opens. Physical typing into it is ignored. The keypad (0 to 9, decimal point, minus, Backspace, Clear All) is operated by mouse or touch, and every key is also focusable and operable with Enter or Space so keyboard and switch users can still answer. The entered value is announced politely to screen readers. Allow only digits, one decimal point and a leading minus; enforce the question's stated format before saving.
4. HOMEPAGE EXAM PREVIEW. Add a new section below the hero area of PublicHome (not inside any locked component): the heading "Practise on the screen you will face on exam day", a non-interactive preview assembled from the real palette and keypad components, and a text legend of the five states with one-line meanings. The preview is decorative for screen readers; the legend is real text. Caption: "Independent practice platform. Not affiliated with NTA."
5. Run the checklist in docs/NTA_FIDELITY_AUDIT.md: update every row you can verify from the code, leave the rest UNKNOWN for me to compare with NTA's practice test, and list what you changed.
6. Add Playwright tests: answer, mark, clear and navigate across all five states with palette counts checked; keypad by mouse and by keyboard; no OS keyboard on a mobile viewport.

- [ ] Exactly one definition of the five states exists, and every screen imports it
- [ ] Transition tests pass, including the Answered and Marked for Review cases
- [ ] A keyboard-only user can enter a numerical answer; typing into the box does nothing
- [ ] The homepage preview matches the real exam palette and the locked hero is untouched
- [ ] NTA_FIDELITY_AUDIT.md rows are updated and unknowns are listed

## Steps U4 to U6: users and deletion, question bank, admin fixes and settings

### U4: User management and complete data deletion

This is irreversible work, so test it on a dev project with throw-away accounts before it goes near real students. Retention periods for financial records are a decision for an accountant or lawyer; the prompt makes them a setting and defaults to keeping only anonymised amounts.

UPGRADE STEP U4: USER MANAGEMENT AND DELETION. Read the memory and design files and docs/APP_AUDIT.md first (especially the deletion manifest draft). Staff only; every check is enforced on the server.

1. /admin/users: a server-paged table (25, 50, 100 per page) with search by name, email or handle; filters for role, status (ACTIVE, SUSPENDED, PENDING_GUARDIAN), age band (under 18 or adult), guardian consent state, and last active; columns for name, email, role, status, age band, guardian consent, last active and attempt count. Below 900px it becomes cards. A row opens a side drawer with the profile, consent history and an attempts summary (counts and scores only). There is NO impersonation and no way to view a student's password or sessions.
2. New migration: profiles.status (ACTIVE, SUSPENDED, PENDING_GUARDIAN, default ACTIVE); consent_events(id, user_id, type, at, meta) written only by server functions for guardian requested, granted and withdrawn; deletion_requests(id, user_id, requested_by_role, source STUDENT, ADMIN or GUARDIAN, status REQUESTED, SCHEDULED, COMPLETED or CANCELLED, requested_at, scheduled_for, completed_at); deletion_audit(id, subject_hash, actor_role, tables_cleared jsonb, at) which holds NO personal data.
3. Role changes: admins only, with a typed confirmation, an audit_log row, and rules that you cannot change your own role and that at least one admin must always remain.
4. Suspend and unsuspend: an Edge Function sets profiles.status and bans or unbans the auth user. The create_attempt, record_action and submit functions refuse suspended users on the server.
5. COMPLETE DELETION. Edge Function delete_user (service role, called from the admin UI or the student's confirmed request) runs a SECURITY DEFINER function delete_user_data(p_user) in one transaction, driven by a manifest in code that lists every table and storage path holding user data. It must remove or anonymise: responses, attempts, mastery_scores, student_focus_topics, user_daily_mocks, private mocks owned by the user, public_profiles, notification_log, question_reports written by the user, support tickets and messages, AI studio history, uploaded files, and the profile. Records that must be kept for legal or tax reasons (payments and invoices, if they exist) are anonymised: the user link is removed, amounts and invoice numbers stay. ai_usage_ledger.user_id becomes NULL. audit_log rows that name the user are rewritten to say "deleted user" with personal fields removed. Then the Edge Function deletes the user's Storage objects and finally the auth user through the admin API, and writes a deletion_audit row with a hash, never the email.
6. Student self-service deletion keeps the confirmation from Phase 3 and adds a grace period setting ACCOUNT_DELETION_GRACE_DAYS (default 7; 0 means immediate). During the grace period the student can cancel by signing in. Admin deletion is immediate after a typed confirmation of the user's email. The dialog first shows counts of what will be deleted and what will be kept anonymised, and why. You cannot delete the last admin or yourself from this screen.
7. Deletion-request queue at /admin/users/deletions showing requests, status and completion.
8. TESTS (required): scripts/test-deletion.ts creates a user, inserts at least one row in every table that references profiles or auth.users (discovered from information_schema foreign keys), runs deletion, and asserts zero rows, empty storage paths and no auth user remain. A second test FAILS if any table with a foreign key to profiles or auth.users is missing from the manifest and lacks ON DELETE CASCADE or SET NULL, so a new table can never be forgotten.

- [ ] Deleting a test user leaves no row, file or auth account behind (the test passes)
- [ ] A new table with a user reference fails the coverage test until it is added to the manifest
- [ ] You cannot delete or demote the last admin, or yourself
- [ ] A suspended user is refused by the server even with a valid token
- [ ] deletion_audit contains no email, name or other personal data
- [ ] Consent and deletion histories are visible to staff

### U5: Question bank table and upload validation

UPGRADE STEP U5: QUESTION BANK TABLE AND IMPORT. Read the memory and design files and docs/APP_AUDIT.md first. Staff only.

1. Replace the question list at /admin/questions with a server-paged, sortable data table: search by text or id; filters for subject, chapter, type, difficulty, review status, source (EXPERT, IMPORTED, AI_GENERATED), licence, reviewer, reported count and created date; a column chooser; saved filters; a counts strip by status; a row expander with a KaTeX preview; keyboard navigation; sticky header; skeletons and empty states. Below 900px each row becomes a card. Bulk actions: send to review, publish (the second-reviewer rule still applies), reject with a reason, change chapter or difficulty, export CSV.
2. New migration: indexes on chapter_id, review_status, type, difficulty, source and created_at; questions.licence (OWNED, LICENSED, PUBLIC_DOMAIN, UNKNOWN, default UNKNOWN) and source_reference text; a rule that a question with licence UNKNOWN cannot be PUBLISHED; import_batches(id, created_by, file_name, rows_total, rows_ok, rows_failed, status, created_at).
3. Import wizard: Upload, Map columns, Validate (dry run), Review errors, Import. Accept CSV or JSON up to 5 MB and 2,000 rows with a downloadable template. Validate: required fields; allowed values; chapter exists; MCQ has four distinct options and one correct; numerical tolerance format; TeX compiles in KaTeX; referenced images exist; exact and near duplicates; a licence declared for every row. Show a per-row error table with a downloadable error CSV. Import in chunks, tag each row with its batch id, always as REVIEW, never PUBLISHED.
4. The browser validates for speed, but the Edge Function import_questions re-validates everything on the server and is the only writer.
5. A batch can be rolled back (deleted) while none of its questions has been published or used in an attempt.
6. Tests for the table filters and pagination, the validation rules, rollback, and that a student cannot call import_questions.

- [ ] 10,000 questions page and filter quickly with no full-table loads in the browser
- [ ] The table is usable at 390px wide
- [ ] A bad row produces a clear error and imports nothing from a dry run
- [ ] A question with unknown licence cannot be published
- [ ] Rolling back a clean batch removes all its rows

### U6: Admin fixes, analytics graphs and site settings

UPGRADE STEP U6: ADMIN FIXES, ANALYTICS AND SITE SETTINGS. Read the memory and design files and docs/APP_AUDIT.md first.

A. SIDEBAR SCROLL BUG. Fix the cause named in the audit. The sidebar must be its own scroll container (sticky, full viewport height, overflow-y auto, overscroll-behavior contain). The layout component must stay mounted between settings pages so its scroll position survives navigation; never define components inside components. Do not call scrollIntoView on route change; if the active item may be hidden on first load, scroll it into view once with block nearest. Apply the same fix to the student settings area. Test: a Playwright test visits six settings pages in turn and asserts the sidebar scrollTop changes by no more than 2px and the window does not jump.

B. ADMIN ANALYTICS at /admin/analytics with a date range (7, 30, 90 days). Use staff-only SECURITY DEFINER functions that return aggregates only, with no personal data: sign-ups per day, active students per day, attempts submitted per day, average score by mock type, completion rate (started versus submitted), question bank coverage by subject and difficulty, AI spend versus budget from ai_usage_ledger, and open versus resolved reports. Draw them with the shared chart theme from Theme v2, give every chart a text summary or data table, add CSV export of the aggregates, cache for 5 minutes, and provide empty and loading states.

C. SITE SETTINGS at /admin/settings/site, building on the homepage content and versions from step T5:
- Contact desks: a list with label, type (SUPPORT, GRIEVANCE, PRESS, OTHER), email, phone in international format, WhatsApp number, working hours, postal address, and typical response time.
- Social links: platform (YouTube, Instagram, X, Telegram, LinkedIn, Facebook, WhatsApp channel, other), https URL, and a per-platform domain allow-list.
- Global: site name, tagline, support email, default language, SEO title and description, share image, maintenance banner on or off, legal entity name, copyright line, and grievance officer details.

Flow: edit draft, preview, publish, roll back, as in T5. A public function get_public_settings() returns published values only, cached for 5 minutes and refreshed after a publish. The footer, /contact page, support widget, WhatsApp button, Trust centre and header all read from it. Search the code for hard-coded emails, phone numbers and social URLs and replace every one. Validate emails, phone numbers and URLs (https only, no javascript: links, no free-text HTML). Admin-only, with an audit_log row on every publish.

- [ ] Sidebar scroll position survives navigation in admin and student settings (test passes)
- [ ] Every analytics chart has a text alternative and uses no personal data
- [ ] Editing a contact desk or social link and publishing updates the footer and contact page without a deploy
- [ ] No hard-coded contact detail or social URL remains in the code
- [ ] A non-https or off-allow-list link is rejected

## Steps U7 to U10: blueprints and integrity, support desk, analytics and AI studio, billing

### U7: Exam blueprints, integrity review, watermark policy, leaderboard settings

UPGRADE STEP U7: BLUEPRINTS AND ADMIN POLICIES. Read the memory and design files, Phase 5B and docs/APP_AUDIT.md first. Staff only; do not change grading or timing code except where stated.

1. EXAM BLUEPRINTS (new migration). exam_blueprints(id, exam_key such as JEE_MAIN_P1 or CUSTOM, version int, status DRAFT, ACTIVE or RETIRED, effective_from, duration_min, sections jsonb with subject, section, question type, count, marks_correct, marks_wrong and compulsory, rules jsonb for navigation, strict mode and timer warning, source_url, source_checked_on, notes, created_by). Unique on exam_key plus version. A trigger blocks any edit to an ACTIVE or RETIRED blueprint except changing ACTIVE to RETIRED; changes are made by "Duplicate as new version". mock_tests gets blueprint_id; the mock builder validates a mock against its blueprint (counts, marks, sections). At create_attempt, copy the blueprint rules and marking scheme into attempts.blueprint_snapshot; submit_attempt grades from that snapshot, so later edits can never change a running or past attempt. Back-fill the snapshot for attempts already in progress from their mock's current scheme. Seed JEE_MAIN_P1 version 1 from Phase 5B (75 questions, 25 per subject, +4 and -1 in both sections, all numerical compulsory) with source_checked_on empty.
2. /admin/blueprints: version list, side-by-side diff between two versions, activate with a typed confirmation, retire, duplicate. Show a warning badge when source_checked_on is empty or older than 90 days: "Check the current official bulletin before using this version."
3. INTEGRITY REVIEW at /admin/integrity: a table of attempts with event counts by type; filters by type, count, date and mock; an attempt view showing a timeline of events against attempt time; staff notes in integrity_reviews(attempt_id, reviewer, status NONE, NOTED or FOLLOW_UP, note, at). Wording: "events", never "violations" or "cheating". There is no automatic penalty anywhere. Students can see their own events on their results page. A retention setting (default 90 days) with a daily purge job.
4. WATERMARK POLICY at /admin/settings/watermark: on or off, content (student handle or a short id, never email or real name), opacity 3 to 10 percent, single or tiled, exam mode only or all modes, with a live preview. Store as app_settings WATERMARK_POLICY and snapshot it into the attempt at start so mid-exam changes have no effect. The page states plainly that this is a deterrent and does not prevent copying.
5. LEADERBOARD SETTINGS at /admin/settings/leaderboard: enabled, minimum cohort (default 30), minimum questions per chapter (8), minimum total (50), list size, subjects shown. The rule that under-18 students need guardian consent is shown but cannot be switched off. Moderation: staff can hide a public profile (public_profiles.hidden_by_admin) and maintain a handle blocklist. Re-create get_leaderboard with CREATE OR REPLACE so it reads these settings and skips hidden profiles.
6. Audit_log rows for every change on these pages.

- [ ] An ACTIVE blueprint cannot be edited; a duplicate becomes the next version
- [ ] Editing a blueprint or the watermark policy mid-exam changes nothing for running attempts
- [ ] A mock that breaks its blueprint cannot be published
- [ ] Integrity pages never show "violation" or "cheating"
- [ ] Lowering the leaderboard cohort in settings changes what the leaderboard returns, and a hidden profile disappears

### U8: Support desk

UPGRADE STEP U8: SUPPORT DESK. Read the memory and design files and docs/APP_AUDIT.md first.

1. New migration: support_tickets(id, user_id, email, subject, category ACCOUNT, EXAM_ISSUE, QUESTION_ERROR, BILLING, TECHNICAL or OTHER, priority, status OPEN, PENDING_STAFF, PENDING_STUDENT, RESOLVED or CLOSED, related_attempt_id, related_question_id, assigned_to, created_at, first_response_at, resolved_at, sla_due_at); support_messages(id, ticket_id, author_user_id, author_role STUDENT, STAFF or SYSTEM, body, is_internal_note, created_at); support_attachments(id, ticket_id, message_id, storage_path, mime, size_bytes); canned_replies(id, title, body). RLS: a student reads only their own tickets and non-internal messages; staff read everything; all writes go through Edge Functions.
2. Student pages: /support (my tickets with text status chips and a New ticket button) and a ticket thread. The new-ticket form has category, subject, message, an optional link to an attempt or question, and up to 3 attachments (PNG, JPG or PDF, 5 MB each), validated by type and size on the server. Attachments live in a private bucket and are shown through short-lived signed URLs.
3. A public /contact form for visitors, protected by a human check (Cloudflare Turnstile or equivalent) and a rate limit; it creates a ticket by email only. Signed-in tickets are limited to 5 per hour.
4. Admin inbox at /admin/support: filters (status, category, assignee, SLA breach), search, assign to me, status changes, canned replies, internal notes (never visible to students), and an attempt or question link that opens the related admin page.
5. SLA: targets in hours by category and priority in app_settings. A daily job marks breaches and, once per breach, writes notification_log type SLA_ALERT and emails the SUPPORT contact desk from the site settings.
6. Email: a student gets a short "You have a new reply" email with a link, never the message text. Tickets with no student reply for 14 days are closed automatically; closed tickets are deleted after a retention setting (default 365 days).
7. Add the three new tables and the storage prefix to the deletion manifest from U4 so the coverage test passes.

- [ ] A student can open, read and reply to only their own tickets
- [ ] Internal notes never reach a student, even through the API
- [ ] A 6 MB or wrong-type attachment is refused by the server
- [ ] A breached SLA sends exactly one alert
- [ ] The U4 deletion coverage test passes with the new tables

### U9: Student analytics page and AI Doubt-to-Practice Studio

UPGRADE STEP U9: STUDENT ANALYTICS AND AI STUDIO. Read the memory and design files, Phase 9 and docs/APP_AUDIT.md first. Part A is always built; Part B only if FEATURE_AI_PRACTICE is on or I say so.

PART A. /analytics (signed-in students)
1. Sections: Overview (score, accuracy and attempt rate over the last attempts); Subjects (Physics, Chemistry, Mathematics: score percent, accuracy, share attempted, time per question); Chapters (table with belt, accuracy by difficulty, average time, questions attempted, trend arrow); Time and strategy (time per question against difficulty, the ten slowest questions, answers given after more than twice the average time); Negative marks (marks lost to wrong answers by subject and type); Cohort comparison, shown only when at least 30 students qualify, as an anonymous average.
2. Data comes from RPCs that use auth.uid() and return only the caller's own rows plus aggregate cohort values. Date range and exam profile filters. CSV export of the student's own analytics. Facts and clearly labelled observations only; no claims about the student's personality or wellbeing.
3. Charts use the shared chart theme with text alternatives; use the Belt component for belts; fast with indexes on responses and attempts.

PART B. /ai (AI Doubt-to-Practice Studio)
4. Flow: Ask (type a question or topic; optionally upload one image, PNG or JPG up to 4 MB), Explain (a step-by-step explanation in KaTeX), Practice (generate 5 similar questions), Save. Every explanation carries the label "AI-generated. It may contain mistakes. Check it against your textbook or teacher." with Helpful and Report-an-error buttons that write to a feedback table.
5. Practice questions go through the Phase 9 pipeline, including the independent solve check, and are stored as AI_GENERATED. Practice is an inline quiz with reveal; a "Make a mock from these" button creates a PRIVATE mock of kind AI_STUDIO. AI studio questions are excluded from mastery, belts and leaderboards.
6. Controls: daily quotas per plan (defaults 5 explanations and 2 practice sets for free students) in app_settings; the global budget guard from Phase 9; refusal of non-academic requests; user text and images are delimited and never trusted as instructions; images are deleted after processing unless the student chooses to save the session; the studio is refused on the server while the student has an in-progress exam-mode attempt.
7. History: ai_studio_sessions(id, user_id, input_text, chapter_id, explanation_json, practice_json, created_at, expires_at). Students can delete any session; sessions expire after 90 days. Add the table and any image storage prefix to the deletion manifest.
8. Same guardian-consent and suspended-user rules as the rest of the app.

- [ ] /analytics shows only the student's own data, and cohort values appear only at 30 or more students
- [ ] Every AI output is labelled, and a deliberately wrong generated answer is caught by the check
- [ ] AI studio questions do not move mastery or belts
- [ ] Quotas and the global budget stop generation with a clear message
- [ ] The studio is refused during an exam-mode attempt
- [ ] Deleting a session removes its text and any stored image

### U10: Subscriptions and payments (only when business details are ready)

Do not run this until you have chosen the plans, the payment gateway and the tax and invoice details with your accountant. Use the gateway's test mode only until every checklist line passes.

UPGRADE STEP U10: SUBSCRIPTIONS AND PAYMENTS (TEST MODE). Read the memory and design files and docs/APP_AUDIT.md first. Add a feature flag FEATURE_BILLING, default false. Use the gateway's HOSTED checkout; card details must never touch our pages, servers or logs.

1. New migration: plans(id, key, name, description, price_paise, currency INR, interval ONE_TIME, MONTHLY or YEARLY, entitlements jsonb, active, sort_order); subscriptions(id, user_id, plan_id, status PENDING, ACTIVE, PAST_DUE, CANCELLED or EXPIRED, current_period_end, gateway_ref); payments(id, user_id, subscription_id, gateway_order_id, gateway_payment_id, amount_paise, status, invoice_no, created_at); webhook_events(id, provider_event_id unique, payload jsonb, processed_at). RLS: a student reads only their own subscription and payments; every write is by Edge Function.
2. Public /pricing reads plans from the database; no price or plan name is typed in the interface. Checkout Edge Function creates the order on the server with the amount taken from the plans table (never from the browser) and returns the hosted-checkout reference. A success page polls the subscription status.
3. Webhook Edge Function: verify the gateway signature with the secret from Edge Function secrets, store each event once by provider_event_id (idempotent), and update subscriptions and payments in one transaction. Handle paid, failed, refunded and disputed events, and late or duplicate deliveries.
4. Entitlements: a database function has_entitlement(user, key) is the only authority. create_attempt, the AI studio quotas and any PREMIUM content check it on the server. A daily job expires subscriptions, with a grace setting.
5. Student /settings/billing: current plan, renewal date, payment and invoice list, and cancel at period end. Invoices use the legal entity and tax fields from the site settings; mark the layout as pending accountant review.
6. Admin /admin/subscriptions: plans CRUD (price changes apply to new purchases only), subscription search, manual grant or revoke with a required reason and an audit_log row, a refund log that records refunds made in the gateway dashboard, and revenue summaries as aggregates.
7. Minors: the checkout asks the buyer to confirm they are the student's parent or guardian or an adult. Payments are anonymised, not deleted, when a user is deleted (U4 manifest).
8. Tests in test mode: successful payment, failed payment, duplicate webhook, bad signature, late webhook, refund; and a test proving a student cannot unlock PREMIUM by editing client code or calling functions directly.
9. Add placeholders for refund policy, GST details and invoice numbering to docs/LEGAL_OPEN_ITEMS.md.

- [ ] A tampered amount in the browser has no effect on the charged amount
- [ ] A webhook with a bad signature is rejected, and a duplicate is processed once
- [ ] A student cannot reach PREMIUM content without an active entitlement, by any route
- [ ] No card data or secrets appear in the client, logs or database
- [ ] Everything runs in test mode, and live mode stays off until you switch it on

## Optional steps U11 to U13, final acceptance and run order

### U11: Answer-key corrections with rescoring

UPGRADE STEP U11: ANSWER-KEY CORRECTIONS AND RESCORING. Read the memory and design files and docs/APP_AUDIT.md first. Admin only; server-enforced.

1. New migration: answer_key_changes(id, question_id, changed_by, kind CORRECT_KEY, ACCEPT_ALSO or DROP_QUESTION, old_answer_json, new_answer_json, reason, affected_attempts, created_at, rescored_at) and score_history(id, attempt_id, old_score, new_score, change_id, at).
2. On a question's admin page add "Correct the answer key". Choose the kind: CORRECT_KEY (a new correct answer), ACCEPT_ALSO (an additional accepted answer), or DROP_QUESTION (full marks to students who attempted it; a setting decides whether unattempted students receive marks, default no). A reason is required.
3. A dry run first shows how many attempts and students are affected and the range of score changes. A typed confirmation runs it.
4. Edge Function rescore_question(change_id) is idempotent: it updates responses.is_correct and awarded_marks for every submitted response to that question using each attempt's blueprint snapshot, recomputes attempts.score, writes score_history, then refreshes mastery for each affected student in batches so belts and leaderboards stay correct.
5. Every affected student gets an in-app notice (and an email if enabled): "Your score on <mock> changed from X to Y because the answer key for question N was corrected." Scores never change silently.
6. Link it to question_reports: resolving a report as KEY_ERROR can open this flow. Audit every action.

- [ ] A dry run changes nothing and shows the affected counts
- [ ] Running the rescore twice gives the same final scores
- [ ] Each affected student receives a notice and a score_history row exists
- [ ] Belts and the leaderboard reflect the corrected scores

### U12: Notifications, public pages and SEO, account security, Hindi coverage

This step needs the message UNLOCK GlobalHeader for the signed-in variant only (a bell slot). The public variant and the hero must not change.

UPGRADE STEP U12: NOTIFICATIONS, PUBLIC PAGES, ACCOUNT SECURITY AND I18N. UNLOCK GlobalHeader (signed-in variant only). Read the memory and design files and docs/APP_AUDIT.md first.

1. NOTIFICATIONS. notifications(id, user_id, type, title_key, body_key, params jsonb, link, read_at, created_at) with RLS so a student reads and marks only their own. A bell with an unread count in the signed-in header, a dropdown of the latest ten, a /notifications page, mark all read, and server-side creation only. Types: result ready, ticket reply, score corrected, belt reached, announcement.
2. FIRST-RUN CHECKLIST on the signed-in homepage: set your target, pick focus topics, take your first mock, choose email preferences. Dismissible, stored in profiles.onboarding_state, gentle wording.
3. PUBLIC PAGES: /about, /faq (from the admin-managed FAQs), /contact (from U6 and U8), /pricing only if billing exists. Generate sitemap.xml and robots.txt; set unique title, description, canonical and Open Graph tags per public route; add Organization structured data from the site settings; pre-render the public routes at build time with a maintained Vite-compatible tool, and if that is not possible here, record the limitation in DECISIONS.md.
4. STUDENT ACCOUNT SECURITY at /settings/security: change password (asks for the current password), optional authenticator-app two-factor, email change with verification, and "Sign out of other devices". Keep it separate from the profile page so the settings sidebar stays short.
5. HINDI COVERAGE: add npm run i18n:check that lists every English key without a Hindi value and fails the build for any not on an allow-list. New Hindi text you write is marked in docs/I18N_REVIEW.md as machine-drafted and needing human review.
6. Add a human check on sign-up and login if one is configured.

- [ ] Notifications are visible only to their owner and the bell updates without a reload
- [ ] Sitemap, robots and per-page meta tags exist; the public hero is unchanged and test:visual passes
- [ ] Password change needs the current password; two-factor can be enabled and used
- [ ] npm run i18n:check runs and lists the gaps

### U13: Test series and PYQ library

UPGRADE STEP U13: TEST SERIES AND PYQ LIBRARY. Read the memory and design files and docs/APP_AUDIT.md first. Do not upload or invent previous-year paper content; this step builds the structure only.

1. New migration: test_series(id, slug, title, description, status DRAFT or PUBLISHED, access FREE or PREMIUM, position); test_series_items(series_id, mock_test_id, position, release_at nullable); questions.is_pyq boolean, exam text, year int, shift text, paper text. A question may be shown as a previous-year question only if is_pyq is true AND its licence is OWNED, LICENSED or PUBLIC_DOMAIN.
2. Routes /series, /series/:slug and /pyq. Series pages list their mocks in order with the student's best score and a Start button; access is enforced on the server (the access flag now, has_entitlement once billing exists). The PYQ library filters by exam, year, shift, paper and chapter and builds a PRIVATE practice mock of kind CUSTOM_TOPICS. Licensed previous-year questions carry a text badge; generated or practice questions carry a different one.
3. Admin: series CRUD with mock ordering and scheduled release; PYQ metadata editing in the question editor.
4. Turn on FEATURE_PYQ and FEATURE_TEST_SERIES only when pages and content exist, and remove the Soon badges from the header and hero cards for them.
5. OPTIONAL, scheduled live mocks: mock_tests.window_start and window_end; a countdown page before the start; a setting late_join_policy (FIXED_END or FULL_DURATION); live-mock leaderboards appear only after the window closes.

- [ ] A question shows as a previous-year question only with a valid licence
- [ ] A PREMIUM series cannot be opened without access, even by calling functions directly
- [ ] Header and hero items for these features switch from Soon to live only after the content exists

## Suggested running order

1. U0 audit, then read the ten findings yourself.
2. Quick win: send only part A of U6 (the sidebar scroll fix), because it is a visible bug.
3. U1, U2, U3 for the visible student experience.
4. U4, U5, rest of U6 for admin safety and content.
5. U7, U8 for policies and support.
6. U9, then U11 to U13 as content and traffic grow.
7. U10 last, only when plans, gateway and tax details are settled.

## Final acceptance

The upgrade is done when every row of the gap table in section A is either built and checked, or deliberately deferred with a note in docs/DECISIONS.md; docs/APP_AUDIT.md shows no BROKEN items and no open security finding; the deletion coverage test, docs/SECURITY_TESTS.sql, the Playwright flows and npm run test:visual all pass; and docs/PROJECT_MEMORY.md has an entry for each step that was run.

Resume line for a new Bolt.new chat: use the Resume Prompt from the main pack, and add: "Also read docs/APP_AUDIT.md, report which Upgrade steps U0 to U13 are complete, and do not redo any of them."
