# HealthArchive.ca – Copy inventory (EN baseline)

Scope: **UI + project copy** (frontend + partner kit + replay banner). Archived snapshots remain as-captured.

This inventory is a working map of every user-visible copy surface that should be reviewed for:

- Clarity of value proposition (what it is / who it’s for / why it matters).
- Safety posture (independent archive, non-affiliation, not medical advice, content may be outdated).
- Consistency (terminology, CTAs, disclaimers).
- i18n readiness (avoid brittle string concatenation; prefer reusable canonical phrases).

Related artifacts:

- Canonical disclaimers and required placements: `disclaimer-matrix.md`
- Canonical terminology and definitions: `copy-glossary.md`

## Canonical, reusable copy

- `src/lib/siteCopy.ts`
  - Mission lines used across public pages.
  - “What this site is / is not” definitions.
  - Workflow disclaimers (archive + browse).
  - Helper for browse disclaimer with optional capture label.

## Global shell copy (appears on every page)

- `src/app/[locale]/layout.tsx`
  - `<title>` and meta description (built from `siteCopy`).
  - `<html lang>` (locale-aware: `en-CA` default, `fr-CA` under `/fr`).
- `src/components/layout/Header.tsx`
  - Brand subtitle and primary nav labels.
  - Language switcher (English ↔ Français).
  - Theme toggle aria-label.
- `src/components/layout/Footer.tsx`
  - Independence/non-affiliation statement.
  - “Not medical advice / reference only” statement.
  - Global footer links (policy and workflow routes).

## Primary workflows (high-traffic, high-risk for misinterpretation)

- Home: `src/app/[locale]/page.tsx`
  - Hero: value proposition and audiences.
  - “In development” status posture.
  - “What this site is (and isn’t)” block (uses `siteCopy`).
- Archive explorer: `src/app/[locale]/archive/page.tsx`
  - “Important note” disclaimer (uses `siteCopy`).
  - Search/filter labels, tooltips, and empty states.
  - Result cards and CTAs (via `src/components/archive/SearchResultCard.tsx`).
- Browse-by-source: `src/app/[locale]/archive/browse-by-source/page.tsx`
  - Coverage summary copy and per-source CTAs (browse/replay/records).
  - “Live API unavailable” fallback messaging.
- Snapshot detail: `src/app/[locale]/snapshot/[id]/page.tsx`
  - Metadata labels and “Important note” disclaimer (uses `siteCopy`).
  - Timeline section language (cross-capture comparisons).
  - Links to browse/replay/raw HTML and reporting.
- Full-screen browse wrapper: `src/app/[locale]/browse/[id]/page.tsx` +
  `src/components/replay/BrowseReplayClient.tsx`
  - Persistent banner copy (capture context + disclaimer).
  - “Switch edition” language and resolution notices.
- Change tracking surfaces:
  - Changes feed: `src/app/[locale]/changes/page.tsx`
  - Compare view: `src/app/[locale]/compare/page.tsx`
  - Digest + RSS: `src/app/[locale]/digest/page.tsx`
  - Each has “descriptive only / not guidance” language and citation links.

## Policy, governance, and issue intake (legally sensitive)

- Governance: `src/app/[locale]/governance/page.tsx`
  - Scope/cadence/provenance/corrections/takedown commitments.
  - Controlling language notice (English governs).
- Terms: `src/app/[locale]/terms/page.tsx`
  - Acceptable use, non-advice posture, availability.
  - Controlling language notice (English governs).
- Privacy: `src/app/[locale]/privacy/page.tsx`
  - Data collection claims (logs, aggregate counts, report submissions, theme preference).
  - Controlling language notice (English governs).
- Report an issue: `src/app/[locale]/report/page.tsx` +
  `src/components/report/ReportIssueForm.tsx`
  - PHI warning and report category descriptions.
  - Submission success/failure copy and fallback mailto wording.

## Research + partner-facing pages

- Researchers: `src/app/[locale]/researchers/page.tsx`
  - Research use cases, exports guidance, request checklist, citation block.
- Exports: `src/app/[locale]/exports/page.tsx`
  - Export manifest, data dictionary, limitations, dataset releases link.
- Brief: `src/app/[locale]/brief/page.tsx`
  - Partner-friendly description + “what it is not” list.
- Cite: `src/app/[locale]/cite/page.tsx`
  - Snapshot and compare citation guidance + handout link.
- Status: `src/app/[locale]/status/page.tsx`
  - Operational status labels, metric definitions, usage posture.
- Impact: `src/app/[locale]/impact/page.tsx`
  - Monthly narrative sections (what changed, reliability, usage, next focus).

## Supporting narrative pages

- Methods & coverage: `src/app/[locale]/methods/page.tsx`
- About: `src/app/[locale]/about/page.tsx`
- Contact: `src/app/[locale]/contact/page.tsx`
- Changelog: `src/app/[locale]/changelog/page.tsx` + entries in `src/content/changelog.ts`

## Reusable components with user-visible copy

- Search results and actions: `src/components/archive/SearchResultCard.tsx`
- Search-within UI: `src/components/archive/SearchWithinResults.tsx`
- Copy-to-clipboard UX: `src/components/archive/CopyButton.tsx`
- Snapshot iframe fallbacks: `src/components/SnapshotFrame.tsx`
- Backend health callout: `src/components/ApiHealthBanner.tsx`
- Snapshot replay header/edition switching notices: `src/components/replay/SnapshotReplayClient.tsx`

## Downloadable copy (partner kit)

- `public/partner-kit/healtharchive-brief.md`
- `public/partner-kit/healtharchive-brief.fr.md` (French alpha; English governs)
- `public/partner-kit/healtharchive-citation.md`
- `public/partner-kit/healtharchive-citation.fr.md` (French alpha; English governs)
- `public/exports/healtharchive-data-dictionary.md`
- `public/exports/healtharchive-data-dictionary.fr.md` (French alpha; English governs)

## Backend-provided UI copy that affects user-facing experience

Some disclaimer UI can be rendered by the replay service / backend:

- Replay banner disclaimer snippet (shown above replay iframes): `healtharchive-backend/src/ha_backend/api/routes_public.py`

Keep this aligned with the frontend’s global safety posture (independent archive, not official, content may be outdated).
