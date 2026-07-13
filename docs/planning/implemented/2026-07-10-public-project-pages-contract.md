# Public Project Pages Contract Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Preserve the existing bilingual project-summary and changelog routes,
make them discoverable from docs, and remove stale roadmap entries.

**Design:** `../../superpowers/specs/2026-07-10-public-project-pages-contract-design.md`

## Task 1: Add route characterization tests

**File:** `frontend/tests/publicProjectPages.test.tsx`

1. Render About in English and French and assert its purpose, independence, and
   status framing.
2. Render Changelog in English and French and assert localized headings and
   article counts against `changelogEntriesByLocale`.
3. Assert the deeper-detail repository and dataset-release links.
4. Run the focused test.

## Task 2: Improve docs discoverability

**File:** `docs/README.md`

Add the canonical public About and Changelog URLs to the key-resource table.
Do not duplicate page copy or operational detail.

## Task 3: Close roadmap and planning truth

**Files:**

- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive this plan under `docs/planning/implemented/`

Remove completed items #39 and #41 and record exact evidence that the pages
pre-existed this closeout.

## Task 4: Verify, review, and publish

1. Run focused and full relevant frontend checks.
2. Run strict docs coverage/build and public-surface tests.
3. Review the diff for copy assumptions, locale brittleness, and public/private
   boundary issues.
4. Run whitespace, file-quality, private-key, and secret checks.
5. Commit, push, open/read back the stacked PR, and report hosted checks without
   deploying.

## Completion Record

- Confirmed that the bilingual `/about` route already implements the public
  project summary with motivation, independence/non-governmental framing, and
  project status.
- Confirmed that the bilingual `/changelog` route already implements the public
  update history from locale-owned changelog content and links readers to the
  app repository and dataset releases for deeper detail.
- Added four focused characterization tests for English/French About headings
  and independence framing, English/French changelog headings and entry counts,
  and the changelog's public repository/release links.
- Focused Vitest passed all four tests. The pages themselves were not rewritten;
  this batch protects and documents the behavior that already satisfied roadmap
  items #39 and #41.
- Added both canonical public URLs to the docs landing-page resource table and
  removed the two stale roadmap entries.
- A locked `npm ci` installed 490 packages and applied the checked-in
  `eslint-plugin-react@7.37.5` patch. npm reported the repository's existing 13
  audit findings (1 low, 4 moderate, 8 high); no dependency changed.
- Frontend formatting, ESLint, TypeScript, and all 144 tests across 41 files
  passed. Strict documentation coverage/build passed, followed by 16 bridge,
  active-doc, docs-coverage, and public LLM-surface tests.
- No deployment, live-site probe, backend call, public copy change, or private
  operations material changed.
