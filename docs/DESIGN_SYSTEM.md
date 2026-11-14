# MOCK NINJA — Design System Baseline

Status: Phase 0 baseline audit, 2026-10-30.

This document records the values already present in the project. It does not introduce new colors or replace the locked visual direction.

## Principles

- Trustworthy, calm, factual JEE preparation experience.
- Dark graphite and glass treatment for the product brand; readable light surfaces are supported through the shared theme variables and overrides.
- NTA-style exam structure is protected: timer, candidate header, subject/section tabs, five palette states, question area, and exam actions.
- No NTA affiliation claims. Public footer must retain: “Independent practice platform. Not affiliated with NTA.”
- Live exam is calm: no celebration effects, sound, or distracting loops.
- Respect `prefers-reduced-motion`.

## Current color sources

Use existing CSS variables and Tailwind ramps only. The audited values are recorded in `docs/AUDIT.md` and `tailwind.config.js`.

The intended future rule is one semantic source for surfaces, text, borders, focus, status, and brand accents. Do not add a new palette while consolidating the existing values.

## Typography

- UI/body: Manrope, Inter, system-ui.
- Display: Space Grotesk, Manrope, system-ui.
- Selected exam/admin heading: Plus Jakarta Sans.
- Existing body uses antialiasing and font features `cv11` and `ss01`.
- Existing small label token: 0.625rem with 0.875rem line height.
- Exam prose already uses relaxed line height and horizontal overflow for display math.
- Scores, timers, and tabular data should use tabular numerals.

## Spacing and touch

- Existing shared minimum tap target: 44px.
- Existing layouts use Tailwind spacing and responsive breakpoints.
- Future changes should keep an 8px rhythm where practical and retain comfortable 16px input text on mobile.
- Exam actions and palette cells must remain easy to operate under pressure.

## Elevation and surfaces

Existing Tailwind elevation values:

- `card`
- `card-hover`
- `glow-teal`
- `glow-vibe`
- `glow-aurora`
- `focus`
- `premium`

Use crisp borders plus restrained shadows. Glow belongs on brand/primary/focused elements, not ordinary reading surfaces.

## Motion

Current animations include fade, slide, scale, shimmer, float, pulse glow, gradient shift, and bounce. The desired future motion bands are:

- Press: about 120ms.
- Hover and small reveal: about 200ms.
- Theme/modal/page transition: about 300ms.
- Entering easing: `cubic-bezier(0.22, 1, 0.36, 1)`.

Prefer explicit transition properties rather than `transition-all`. Reduced-motion rules must remove scale/translate and keep only quick fades where needed.

Recorded token values (2026-10-30 Phase 1 pass):

- Lift (`.lift` in `src/index.css`): 300ms, transform and box-shadow only.
- Shared buttons: 200ms ease-out, explicit color, transform, box-shadow, and opacity properties.
- Progress and performance bars: width only, 300ms.
- Focus ring: 2px aurora-400 ring with a 2px offset tinted to the current theme surface.

## Focus

The current base focus rule uses a visible 2px aurora ring with a 2px offset. It must remain visible on both themes and all interactive controls, including native controls and shared primitives. The ring offset should use a theme-safe surface rather than assuming a dark background.

## Copy tone

- Warm, calm, specific, and action-oriented.
- Never shame low scores or missed days.
- Never claim official NTA affiliation or unsupported security certifications.
- Do not invent metrics, testimonials, or platform capabilities.
- Keep official exam instruction text verbatim.
- All new user-facing strings should be translated in English and Hindi; future consolidation should use a shared copy layer for non-linguistic app messages.

## Contrast and QA baseline

A full visual contrast pass has not yet been run in a browser. The code audit found theme overrides covering many dark-tuned utilities, but also found literal colors and page-specific styles that require review. Phase 1 must record measured AA results for body text, large text, controls, borders, dialogs, exam surfaces, and both theme modes.

## Protected areas

The homepage reference areas and the NTA exam structure remain protected by `docs/LOCKED_UI.md` and `docs/DESIGN_REFERENCE.md`. Accessibility, responsive, and truthful-content fixes are allowed; visual restructuring requires an explicit unlock decision.
