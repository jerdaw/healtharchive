# Frontend Internal Link Check Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Add a deterministic production-build crawler that makes broken
same-origin frontend links fail the existing frontend CI gate.

**Design:** `../../superpowers/specs/2026-07-10-frontend-internal-link-check-design.md`

## Task 1: Add failing policy tests

**Files:**

- Create: `frontend/tests/internalLinkCheck.test.mjs`
- Create: `frontend/scripts/internal-link-check-lib.mjs`

1. Add tests for URL normalization, scheme/origin filtering, sorted
   deduplication, response classification, and bounded traversal policy.
2. Import the not-yet-implemented helper module and run the focused test to
   record the expected red failure.
3. Add the minimal pure helper implementation and rerun the test to green.

## Task 2: Implement the bounded production crawler

**File:** `frontend/scripts/check-internal-links.mjs`

1. Start the built Next app on an available loopback port.
2. Poll readiness with a bounded timeout.
3. Crawl `/` and `/fr` breadth-first, following only normalized same-origin
   anchors.
4. Report source page, target, and bounded failure reason for fetch/HTTP
   failures.
5. Fail if the page bound is exhausted and always terminate the child server.
6. Run the real script against a production build and correct any discovered
   broken link rather than suppressing it broadly.

## Task 3: Integrate with the existing frontend gate

**File:** `frontend/package.json`

1. Add `check:links` for direct local use.
2. Run it after the existing production build in `check` so the current
   `lint-and-test` CI job gains coverage without another job or build.
3. Keep the checker dependency-free beyond packages already installed by the
   locked frontend install.

## Task 4: Close documentation and roadmap truth

**Files:**

- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/development/testing-guidelines.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Archive this plan under `docs/planning/implemented/`

Document scope, direct invocation, CI ownership, exclusions, and troubleshooting.
Remove completed roadmap item #37 without changing adjacent backlog items.

## Task 5: Verify, review, and publish

1. Install locked frontend dependencies in the isolated worktree.
2. Run focused helper tests and the real production crawler.
3. Run `npm run check` for format, lint, typecheck, full tests, build, and link
   traversal.
4. Run strict documentation coverage/build checks.
5. Run base-to-head whitespace and public-boundary scans.
6. Review the complete diff for unbounded crawling, child-process leaks,
   network dependence, locale gaps, and workflow cost.
7. Record exact evidence, commit, push, open/read back the PR, and report hosted
   checks without deploying.

## Completion Record

- A locked `npm ci` installed 490 packages and applied the checked-in
  `eslint-plugin-react@7.37.5` patch. npm reported the repository's existing 13
  audit findings (1 low, 4 moderate, 8 high); this batch did not change
  dependencies or apply an unsafe audit rewrite.
- Initial RED: focused Vitest could not resolve the not-yet-created
  `internal-link-check-lib.mjs`. Later red passes covered same-origin redirect
  enforcement, safe loopback stub targeting, and the locale proxy's internal
  second pass.
- Pure URL, extraction, response, redirect, bound, and loopback policy helpers
  have 29 focused tests. Four additional proxy tests preserve unprefixed
  English rewrites, direct `/en/**` canonical redirects, internal second-pass
  handling, and French pass-through.
- The first real production crawl found seven self-redirect loops on canonical
  English routes and one request timeout. Root cause analysis showed the
  internal `/en` rewrite re-entering the proxy and being mistaken for a direct
  public `/en` request. An internal request marker now permits that second pass,
  is removed before rendering, and retains the public canonical redirect.
- The crawler now assembles the same standalone runtime shape used by the
  production container, follows redirects manually without leaving loopback,
  traverses at most 100 unique paths, bounds requests and diagnostics, and
  always stops its child processes.
- A temporary loopback-only `503` API stub makes server-rendered fallback pages
  fail fast. The checker refuses remote, HTTPS, or privileged bind targets, so
  the link gate cannot probe the live backend accidentally.
- Focused GREEN: 33 tests passed across the link-policy and locale-proxy suites;
  full ESLint and TypeScript checks also passed.
- Full `npm run check` passed formatting, lint, type checking, 140 tests across
  40 files, the Next.js `16.2.9` production build with 47 generated pages, and
  a 78-route English/French rendered link crawl in 112.1 seconds.
- The implementation guide and testing guidelines document CI ownership,
  direct invocation, scope, loopback safety, standalone runtime behavior, and
  canonical locale routing. Completed roadmap item #37 was removed.
- `make docs-coverage-strict docs-build-strict` passed strict documentation
  coverage, OpenAPI/LLM generation, and the strict MkDocs build; the documented
  Material/MkDocs 2 warning remains the repository's tracked platform concern.
- No production deployment or live-site probing was performed.
