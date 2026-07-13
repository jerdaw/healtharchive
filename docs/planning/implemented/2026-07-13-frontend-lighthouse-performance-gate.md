# Frontend Lighthouse performance gate

**Status:** Implemented 2026-07-13

## Goal

Close roadmap item 36 with a deterministic, blocking Lighthouse gate over a
representative local production build, without using production services,
credentials, or public report storage.

## Scope

- Add a pinned Lighthouse CI development dependency and a reproducible
  `make frontend-lighthouse` command that reuses an existing production build.
- Run the standalone Next.js server on a dynamically allocated port and bind a
  fail-fast API stub to the build-configured loopback API port so the audit
  exercises stable bundled fallback content without live-data variance.
- Audit representative home, archive discovery, and long-form content routes
  more than once, then enforce conservative category and Core Web Vitals
  budgets calibrated from an actual clean run.
- Keep the Chrome-dependent gate outside routine `npm run check`, but run it
  after that build in the existing `Frontend CI / lint-and-test` job. Preserve
  the required job name and avoid a second install/build job.
- Keep reports local and ignored. Upload them only when the CI audit fails,
  using the repository's three-day diagnostic-artifact policy.
- Add focused tests for route/origin safety and shared local production-server
  behavior, document prerequisites and calibration, archive this plan, and
  remove completed roadmap item 36.

## Validation

- Prove the performance runner rejects non-loopback targets and covers the
  configured representative routes.
- Run the production build and the Lighthouse gate with a real Chrome binary;
  inspect the generated reports and record the measured baseline.
- Run frontend format, lint, typecheck, unit tests, production build, and link
  checks.
- Run the workflow policy tests, strict documentation checks, and the local
  pre-push gate.

## Boundaries

- Do not audit the deployed site or depend on mutable production data.
- Do not upload reports to Lighthouse temporary public storage or add tokens.
- Do not rename required checks, add a new workflow, or duplicate the existing
  frontend install/build solely for performance testing.
- Treat initial budgets as regression floors, not production SLOs; tighten
  them only from repeated evidence.

## Outcome

- The existing frontend CI build now feeds nine Lighthouse audits: three runs
  each for the home page, archive search, and bundled demo snapshot.
- The gate blocks regressions in performance, accessibility, best practices,
  SEO, LCP, FCP, CLS, TBT, JavaScript transfer size, and total transfer size.
- A clean local Chromium run completed in 113 seconds. Representative medians
  were: home `98/100/96/100` with `1055 ms` LCP and `832 KB`; archive search
  `100/100/100/100` with `671 ms` LCP and `879 KB`; demo snapshot
  `100/100/100/100` with `549 ms` LCP and `825 KB`. Scores are ordered as
  performance/accessibility/best-practices/SEO; all measured CLS and TBT values
  were zero.
- Reports stay local by default. CI preserves them for three days only when a
  failure needs diagnosis.
