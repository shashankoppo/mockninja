# Project memory

## Product intent & audience

- Independent exam practice platform (not affiliated with NTA). Users are exam aspirants.
- Onboarding is the first-run experience guiding users through setup choices.
- Homepage serves as a marketing/landing surface with admin-managed advertisement sections.

## Brand personality & voice

- Factual, trustworthy; never claims official affiliation. Footer disclaimer required: "Independent practice platform. Not affiliated with NTA."
- Supports internationalization (at least two languages; `t()` translation keys used throughout UI).

## Visual design & UX direction

- App-wide theme: **dark graphite** with **glassmorphism** (translucent panels, blur, subtle borders). Light theme also supported.
- Announcement bar: premium/elegant styling with branded update icon + "Latest update" label, refined action pill with arrow icon, subtle sheen/motion, `prefers-reduced-motion` respected. Now features seamless marquee scroll loop with soft fade-out edges and hover-pause. Light/dark theme tokens with strong contrast. Admin-managed content, visibility, and link behavior preserved.
- Onboarding: dark glassy theme; gradient progress bar with check marks, CSS slide animations, back buttons on non-first steps, welcome badge.
- Homepage advertisements: six distinct ad types — Test series, Offer, Feature spotlight, Course, Wide banner, General. Each has its own layout (wide banners, large feature tiles, gradient cards), grouped by type. Admins select type via dropdown in Homepage Manager.
- Admin dashboard: maintenance mode toggle at top of dashboard (instant-acting, writes to same platform setting).
- Typography, spacing, components follow shared design system (see `docs/DESIGN_REFERENCE.md`, `docs/LOCKED_UI.md`).
- i18n: all visible strings via `t()`; update all language files when adding keys.

## Decisions, constraints & rationale

- Announcement bar visuals reworked (marquee scroll, fade edges, hover-pause) without altering logic/routes/auth/RLS/grading/timing.
- Onboarding visuals reworked to match app theme under same constraints.
- Homepage ad system expanded from original set to six types without changing admin workflow (same dropdown in Homepage Manager).
- Maintenance toggle added to admin dashboard to avoid needing Settings/db access for maintenance mode.
- Missing Hindi i18n keys for admin nav labels (`navAnnouncement`, `navUserSubscriptions`) added.
- Builds verified (Vite + React) after visual changes; browser testing deferred to user.
- Authoritative workflow docs live in `docs/` (PROJECT_MEMORY, DECISIONS, SCHEMA_CONTRACT, DESIGN_REFERENCE, LOCKED_UI). `.bolt/prompt` governs rules; not restated here.

## Open questions & assumptions

- Browser visual QA of announcement bar, onboarding, homepage ad layouts, and maintenance toggle still pending (user asked to verify).
- Exact exam types, languages, and locked UI regions are defined in docs not yet surfaced here; consult docs before touching locked areas.
- Admin can currently choose from six ad types; future ad types or layout variations not yet discussed.