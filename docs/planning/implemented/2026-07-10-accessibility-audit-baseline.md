# Accessibility Audit Baseline Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Publish a truthful internal accessibility evidence baseline, correct
the public statement, and prevent frontend/docs-portal copies from drifting.

**Design:** `../../superpowers/specs/2026-07-10-accessibility-audit-baseline-design.md`

## Task 1: Add the failing mirror contract

**File:** `tests/test_frontend_accessibility_docs_sync.py`

Require the accessibility statement and dated audit to resolve identically
through `frontend/docs/` and the tracked `docs/frontend/` symlink bridge. Run it
before creating the audit and record the expected missing-file failure.

## Task 2: Publish the dated audit baseline

**File:** `frontend/docs/accessibility-audit-2026-07-10.md`

Document scope, WCAG target, automated test matrix, source-review evidence,
findings, limitations, and prioritized follow-up. Distinguish internal baseline
work from external expert/manual assistive-technology validation.

## Task 3: Reconcile the public statement

**File:** `frontend/docs/accessibility.md`

Remove unsupported conformance, broad test-coverage, device/AT compatibility,
and fixed response-time claims. Link the dated audit and retain clear feedback
and archived-content limitation guidance.

## Task 4: Make the evidence discoverable

**Files:**

- Modify: `frontend/docs/README.md`
- Modify: `frontend/docs/implementation-guide.md`
- Modify: `mkdocs.yml`

Index the statement/audit in both frontend-doc sources and MkDocs navigation.
Replace stale “future axe testing” language with the current baseline and real
manual follow-up.

## Task 5: Close roadmap and planning truth

**Files:**

- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive this plan under `docs/planning/implemented/`

Remove completed roadmap item #23 and record exact validation without closing
the external/manual follow-up documented in the audit.

## Task 6: Verify, review, and publish

1. Run the focused current axe suite and record its exact result.
2. Run the mirror contract red, then green.
3. Run strict docs coverage/build and active-doc/public-surface tests.
4. Review every claim against repository evidence and the public/private
   boundary.
5. Run whitespace, file-quality, private-key, and secret checks.
6. Commit, push, open/read back the stacked PR, and report hosted checks without
   deploying.

## Completion Record

- Added a dated internal accessibility audit baseline with explicit scope,
  evidence classes, tested-route matrix, WCAG-principle summary, findings, and
  prioritized follow-up. It does not claim conformance or external review.
- Replaced the previous accessibility statement's unsupported broad keyboard,
  contrast, resize, touch-target, screen-reader, compatibility, and fixed
  response-time claims with evidence-backed wording and explicit gaps.
- Preserved WCAG 2.1 Level AA as the project target and documented the boundary
  between the first-party viewer shell and unmodified archived content.
- Initial RED: the new bridge contract passed for the existing statement and
  failed for the missing dated audit (`1 passed, 1 failed`). After adding the
  canonical audit, both statement and audit resolve identically through the
  tracked docs-portal symlink (`2 passed`).
- The focused current accessibility suite passed 12 tests across two files:
  11 axe scans covering English/French Home, About, Methods, Contact, and
  Researchers fixtures, plus one heading-hierarchy assertion.
- A locked `npm ci` installed 490 packages and applied the checked-in
  `eslint-plugin-react@7.37.5` patch. npm reported the repository's existing 13
  audit findings (1 low, 4 moderate, 8 high); no dependency changed.
- Added the statement and dated baseline to the frontend docs index and MkDocs
  navigation, and reconciled stale “future axe testing” language in the
  implementation guide.
- Removed completed roadmap item #23 while retaining dynamic-route, manual
  assistive-technology, reflow/contrast, user-research, and external-expert work
  as explicit audit follow-up.
- Frontend Prettier passed for the updated Markdown. Strict documentation
  coverage/build passed, followed by 16 bridge, active-doc, docs-coverage, and
  public LLM-surface tests.
- No application behavior, live-site probe, deployment, or private operations
  material changed.
