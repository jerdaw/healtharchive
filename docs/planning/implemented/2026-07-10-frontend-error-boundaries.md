# Frontend Error Boundaries Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Add tested locale-segment and global recovery boundaries that remain
safe, accessible, bilingual, and free of internal error detail.

**Design:** `../../superpowers/specs/2026-07-10-frontend-error-boundaries-design.md`

## Task 1: Add failing boundary tests

**File:** `frontend/tests/errorBoundaries.test.tsx`

1. Mock `next/navigation` locale params.
2. Assert English/French segment copy, localized home paths, and retry action.
3. Assert invalid/missing locale safely falls back to English.
4. Assert global wrapper structure and bilingual content.
5. Assert neither boundary emits sentinel message/digest detail.
6. Add axe checks for the segment and content-only global surface.
7. Run the focused test and record the expected missing-module failure.

## Task 2: Add shared recovery copy

**File:** `frontend/src/lib/errorRecovery.ts`

Define typed localized copy and a `getErrorRecoveryCopy(locale)` helper using
the existing `Localized`/`pickLocalized` pattern. Include archive limitations
and non-official framing without duplicating operational detail.

## Task 3: Implement both App Router boundaries

**Files:**

- Create: `frontend/src/app/[locale]/error.tsx`
- Create: `frontend/src/app/global-error.tsx`

Implement the segment boundary with `PageShell` and localized recovery actions.
Implement the self-contained global wrapper/content with inline resilient
styles and bilingual blocks. Never render/log the error object. Run focused
tests to green.

## Task 4: Close documentation and roadmap truth

**Files:**

- Modify: `frontend/docs/implementation-guide.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Archive this plan under `docs/planning/implemented/`

Document boundary placement, responsibilities, recovery/no-leak behavior, and
testing. Remove completed roadmap item #24 without changing unrelated backlog.

## Task 5: Verify, review, and publish

1. Install isolated dependencies with `npm ci` in the worktree frontend.
2. Run focused Vitest and accessibility tests.
3. Run `npm run check` for format, lint, typecheck, full tests, and build.
4. Run strict backend docs checks for the roadmap/index/guide bridge.
5. Run base-to-head whitespace and public-boundary scans.
6. Review the complete diff for detail leakage, hydration/layout dependencies,
   localization drift, and accessible recovery behavior.
7. Record exact evidence, commit, push, open/read back the PR, and report hosted
   checks without deploying.

## Completion Record

- WSL's non-interactive default PATH had no `npm`, so the first `npm ci`
  command did not start. A compatible existing NVM runtime was located and used:
  Node `v22.13.1`, npm `10.9.2` (the frontend requires Node `>=20.19`).
- Locked `npm ci` installed 490 packages and applied the checked-in
  `eslint-plugin-react@7.37.5` patch. The audit summary reported the repository's
  existing 13 findings (1 low, 4 moderate, 8 high); dependencies were not
  changed in this feature branch, and upstream-safe advisory follow-through
  remains separately tracked in the roadmap.
- Initial RED: focused Vitest could not resolve `@/app/[locale]/error`, so the
  suite failed before collecting tests.
- Added typed shared English/French recovery copy, a locale-aware segment
  boundary, and a self-contained bilingual global boundary. Neither boundary
  renders or logs the supplied error object.
- Focused GREEN: six tests passed for English/French/invalid-locale behavior,
  retry and localized home actions, global document structure, sentinel
  message/digest non-disclosure, and axe accessibility.
- Prettier initially found two new files requiring formatting, then the full
  format check passed.
- ESLint rejected the global native home link under the normal App Router rule.
  A single documented line-level exception preserves the intentionally
  router-independent global recovery link; full lint then passed.
- TypeScript initially found localized-literal inference and test digest typing
  errors. Explicit shared-copy and sentinel intersection types corrected both;
  full typecheck passed.
- `npm run check` passed format, lint, typecheck, 113 tests across 39 files, and
  the Next.js `16.2.9` production build. The build compiled in 2.0 seconds,
  completed TypeScript in 3.3 seconds, and generated all 47 static pages in 40
  seconds.
- `make docs-coverage-strict docs-build-strict` passed strict coverage,
  OpenAPI/LLM generation, and strict MkDocs; documentation built in 6.24
  seconds on the first closeout wording and 1.49 seconds after the completion
  evidence was added.
- The implementation guide documents segment/global ownership, dependency and
  no-detail boundaries, and tests. Completed roadmap item #24 was removed and
  this archived plan was added to the planning index.
- PR [#131](https://github.com/jerdaw/healtharchive/pull/131) is open and
  mergeable against `main`. Its body/base/head and safety/validation evidence
  were read back intact. Platform integration was green at first readback;
  backend test/API-health/E2E and frontend contract/lint-test jobs were still in
  progress.
