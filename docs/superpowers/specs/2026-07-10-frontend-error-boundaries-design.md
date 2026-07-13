# Frontend Error Boundaries Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

The Next.js App Router frontend has no route-segment `error.tsx` and no
`global-error.tsx`. An uncaught rendering/runtime failure therefore falls
through to framework behavior without HealthArchive-specific recovery actions,
bilingual context, accessibility guarantees, or a stable no-detail-leak
contract. This is active roadmap item #24.

## Goals

1. Add a locale-aware segment boundary for failures below `[locale]/layout.tsx`.
2. Add a dependency-light global boundary for failures that include the root
   locale layout.
3. Offer retry and safe home navigation without exposing error messages,
   stacks, digests, paths, or implementation details.
4. Preserve the project's independent/non-governmental archive framing.
5. Add interaction, localization, structure, no-leak, and accessibility tests.
6. Document the boundary ownership and remove the completed item from the
   not-yet-implemented roadmap.

## Non-Goals

- Add Sentry or another telemetry provider.
- Log error objects to the browser console from these components.
- Add API calls, admin/metrics access, or incident reporting.
- Replace page-level API fallback states or `notFound()` behavior.
- Change the locale proxy, root layout, theme bootstrap, Header, or Footer.

## Options Considered

### One boundary under `[locale]`

Rejected as incomplete. It cannot catch failures in the locale layout itself
and offers no branded recovery surface for root-layout failure.

### One global boundary

Rejected as too coarse. Most route failures can retain the normal shell,
locale, skip link, Header/Footer, theme, and design system.

### Segment plus global boundaries

Selected. The segment boundary uses existing locale/design components. The
global boundary replaces the root layout only when necessary and avoids
dependencies that may have caused or participated in that failure.

## Shared Copy

Add a pure helper under `frontend/src/lib/` that returns typed English or French
segment copy via the existing `Locale`/`Localized` conventions. It covers:

- eyebrow/title/intro;
- recovery explanation;
- retry and return-home labels;
- independent archive/non-official reminder.

The global boundary uses the same copy source but renders English and French
blocks together. It cannot reliably infer a locale when the locale layout has
failed, and a bilingual fallback is safer than hydration-sensitive document
inspection or an English-only assumption.

## Segment Boundary

`frontend/src/app/[locale]/error.tsx` is a client component with the Next.js
`error`/`reset` signature. It derives a supported locale from `useParams`,
defaulting safely to English, and renders:

- `PageShell` for consistent heading/layout;
- an assertive, labelled recovery card;
- a primary retry button calling `reset`;
- a locale-aware native home link (`/` or `/fr`).

It accepts the error object only because Next.js requires it and never renders
or logs its content.

## Global Boundary

`frontend/src/app/global-error.tsx` is a client component and returns its own
`<html>` and `<body>`, as required by Next.js. It includes:

- inline resilient layout/color/focus styles rather than depending on the
  failed locale layout or global stylesheet;
- a `main` landmark and labelled alert panel;
- separate English and `lang="fr-CA"` explanatory blocks;
- a retry button and plain `/` home link;
- no Header/Footer, fonts, theme script, providers, or API imports.

Export a content-only component for interaction/accessibility tests while the
default wrapper preserves the actual global-error contract.

## Safety And Accessibility

- Do not render `error.message`, `error.stack`, `error.digest`, or stringified
  error objects.
- Do not imply that archived content is current guidance or medical advice.
- Use one clear H1, a main landmark, labelled alert region, native button/link,
  visible focus styles, and non-color-only instructions.
- Retry remains user-triggered; no automatic reload loop.
- Home navigation remains available if retry repeatedly fails.

## Testing

Create `frontend/tests/errorBoundaries.test.tsx` before implementation.

- Mock `useParams` for English, French, and invalid locale fallback.
- Assert localized headings/actions/home paths.
- Assert retry callback execution.
- Assert neither segment nor global output contains a sentinel error message or
  digest.
- Render the global wrapper to static markup and assert `<html>/<body>` plus
  bilingual language markup.
- Run axe against segment and content-only global recovery surfaces.
- Run focused Vitest, then the full frontend `npm run check` (format, lint,
  typecheck, tests, build).

## Delivery

Use an independent branch from `origin/main`. Update the implementation guide,
archive the implementation plan, remove roadmap item #24, and open a PR against
`main`. No production deployment is part of the batch.
