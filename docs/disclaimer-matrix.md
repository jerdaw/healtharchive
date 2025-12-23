# HealthArchive.ca – Disclaimer matrix (EN baseline)

This document centralizes the project’s safety posture so copy stays consistent across the site.

Scope: **UI + project copy**. Archived snapshots remain as-captured.

## Guidance

- Use the exact canonical phrasing below where possible.
- If a page needs an adapted version (short vs long), keep meaning identical.
- Avoid implying affiliation with any government agency.
- Avoid implying any content is current guidance or medical advice.
- French UI copy exists as an automated, convenience-only translation; keep meanings conservative and aligned with the English baseline.

## Canonical disclaimers (English)

### Independence and non-affiliation

**Canonical text (short)**

- “Independent project · Not an official government website.”

**Canonical text (long)**

- “HealthArchive.ca is an independent project and is not affiliated with, endorsed by, or associated with the Public Health Agency of Canada, Health Canada, or any other government agency.”

**Required placements**

- Global footer (always visible): `src/components/layout/Footer.tsx`
- Any replay/browse UI where archived pages could be mistaken as live: `src/components/replay/BrowseReplayClient.tsx`
- Snapshot detail callout (high-risk for misinterpretation): `src/app/[locale]/snapshot/[id]/page.tsx`

### Not medical advice / not current guidance

**Canonical text (short)**

- “This is an archive — not current guidance or medical advice.”

**Canonical text (long)**

- “Archived content is provided for reference and research purposes only. It may be incomplete, outdated, or superseded. Nothing on this site should be interpreted as medical advice or current guidance.”

**Required placements**

- Global footer: `src/components/layout/Footer.tsx`
- Archive explorer callout: `src/app/[locale]/archive/page.tsx`
- Browse-by-source callout: `src/app/[locale]/archive/browse-by-source/page.tsx`
- Snapshot “Important note” callout: `src/app/[locale]/snapshot/[id]/page.tsx`
- Full-screen browse banner: `src/components/replay/BrowseReplayClient.tsx`
- Changes/compare/digest callouts: `src/app/[locale]/changes/page.tsx`, `src/app/[locale]/compare/page.tsx`, `src/app/[locale]/digest/page.tsx`
- Brief/citation guidance: `src/app/[locale]/brief/page.tsx`, `src/app/[locale]/cite/page.tsx`

### Archived content limitations

**Canonical text**

- “Archived content may be incomplete, outdated, or superseded.”

**Required placements**

- Wherever archived content is displayed or summarized (archive/snapshot/browse/compare/digest).

### Change tracking (descriptive only)

**Canonical text**

- “Change tracking is descriptive only and does not interpret meaning or provide guidance.”

**Required placements**

- Changes feed callout: `src/app/[locale]/changes/page.tsx`
- Compare view callout: `src/app/[locale]/compare/page.tsx`
- Digest callout: `src/app/[locale]/digest/page.tsx`
- Citation guidance where compare is discussed: `src/app/[locale]/cite/page.tsx`

### Capture cadence (not real-time monitoring)

**Canonical text**

- “Digests and feeds reflect edition-to-edition changes and do not imply real-time monitoring.”

**Required placements**

- Changes feed scope/help text: `src/app/[locale]/changes/page.tsx`
- Digest page callout: `src/app/[locale]/digest/page.tsx`
- Governance cadence policy: `src/app/[locale]/governance/page.tsx`

### Privacy posture (no accounts, no PHI)

**Canonical text**

- “There are no user accounts, and we do not collect personal health information.”

**Required placements**

- Privacy page intro: `src/app/[locale]/privacy/page.tsx`
- Report form warning (PHI warning): `src/app/[locale]/report/page.tsx`, `src/components/report/ReportIssueForm.tsx`

### Exports limitations (metadata-only)

**Canonical text**

- “Exports are metadata-only and do not include raw HTML or full diff bodies.”

**Required placements**

- Exports page intro: `src/app/[locale]/exports/page.tsx`
- Data dictionary: `public/exports/healtharchive-data-dictionary.md`

### Controlling language (English governs)

**Canonical text**

- “The English version of this page is the official version. If a French translation is provided, it is for convenience only. In the event of any inconsistency or discrepancy, the English version governs.”

**Required placements**

- Terms: `src/app/[locale]/terms/page.tsx`
- Privacy: `src/app/[locale]/privacy/page.tsx`
- Governance: `src/app/[locale]/governance/page.tsx`

## Backend / replay banner copy (alignment)

If the replay service injects a banner/disclaimer above archived pages, keep it aligned with the
frontend’s posture:

- Independent archive
- Not an official government website
- Content may be outdated

Backend location (if applicable): `healtharchive-backend/src/ha_backend/api/routes_public.py`
