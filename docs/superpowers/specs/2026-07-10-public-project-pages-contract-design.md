# Public Project Pages Contract Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

Roadmap items #39 and #41 still ask for a public project summary page and a
frontend changelog page. Both are already implemented as bilingual `/about`
and `/changelog` routes. The About route has focused axe coverage, but neither
page has a small direct test that preserves its public-purpose contract, and
the main docs landing page does not point readers to either public route.
Creating replacement pages would duplicate working product behavior; the
remaining work is regression coverage, discoverability, and roadmap truth.

## Goals

1. Characterize the English and French About page as the public project
   summary.
2. Characterize the English and French Changelog page as the public update
   history.
3. Assert independence/non-governmental framing on About.
4. Assert that rendered changelog entries match the locale-owned content data
   and retain public repository/release links.
5. Link both public pages from the docs portal landing page.
6. Remove stale roadmap items #39 and #41 and archive the closeout plan.

## Non-Goals

- Rewrite either page or change public copy.
- Add a second project-summary or changelog route.
- Change changelog entry policy, release automation, or dataset releases.
- Add live-site/browser tests or depend on a backend.
- Claim the changelog is exhaustive technical release history.

## Characterization Contract

Add one focused Vitest file under `frontend/tests/`:

- About English renders “Why HealthArchive.ca exists,” independence framing,
  and the development-status section.
- About French renders the corresponding localized heading and independent,
  non-governmental framing.
- Changelog English/French render the correct H1 and exactly one article per
  locale content entry.
- The English changelog retains links to the app repository and dataset
  releases as its deeper-detail escape hatch.

The test imports route components and locale content directly, matching the
existing server-component test style and avoiding network calls.

## Documentation

Add “Public project summary” and “Public changelog” to the docs landing page's
key-resource table using the canonical public URLs. This connects technical
documentation readers to the already-existing public explanations without
duplicating their copy inside MkDocs.

## Validation

- Run the focused characterization test.
- Run full frontend formatting, lint, type checking, and tests; a production
  build is not required for a test/docs-only batch unless the normal check is
  selected for final parity.
- Run strict docs coverage/build and public-surface tests.
- Run commit file-quality/private-key and secret checks.

## Delivery

Use a stacked branch based on the accessibility-audit branch from PR #135
because the parent series updates the same planning indexes. Open a PR against that branch.
No deployment or live-site action is part of this batch.
