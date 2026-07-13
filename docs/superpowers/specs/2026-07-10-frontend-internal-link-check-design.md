# Frontend Internal Link Check Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

The frontend production build is covered by lint, type checking, component
tests, and a Docker build smoke, but CI does not traverse the rendered public
site to detect internal links that return an error. A renamed or removed route
can therefore leave a broken header, footer, content, or call-to-action link
without failing the frontend gate. This is active roadmap item #37.

## Goals

1. Crawl rendered same-origin links from both English and French entry points.
2. Fail deterministically when an internal page returns an HTTP error or a
   redirect/fetch cycle cannot complete.
3. Reuse the production build already created by `npm run check` rather than
   adding another build or CI job.
4. Keep the check independent of the public internet and a live backend.
5. Bound traversal so an accidental link cycle or route explosion cannot hang
   CI.
6. Unit-test URL normalization, link extraction, deduplication, and failure
   classification before wiring the executable crawler.

## Non-Goals

- Probe external websites or validate their availability.
- Run browser automation, JavaScript interaction, or visual checks.
- Validate links embedded inside replayed/archive iframe content.
- Validate fragment identifiers in this first bounded slice.
- Replace the existing integration smoke or component accessibility tests.
- Change production routes, navigation, or deployment behavior.

## Options Considered

### External link-checking service or action

Rejected for this batch. It adds a third-party dependency, public-network
variability, and a separate workflow cost. External availability is also not
under this repository's control.

### Static source scan

Rejected as the primary check. It cannot reliably resolve composed components,
localized links, conditional rendering, or framework redirects.

### Crawl the local production server

Selected. The checker assembles and starts the standalone runtime from the
existing `.next` build, waits for readiness, fetches English and French roots,
and breadth-first crawls rendered same-origin anchors. It exercises the same
runtime shape used by the production container while remaining local and
reproducible.

## Module Boundary

Add a small JavaScript module under `frontend/scripts/` with pure helpers for:

- resolving an anchor against the page where it appeared;
- accepting only `http(s)` links on the configured local origin;
- dropping query strings and fragments for route-level deduplication;
- extracting and sorting unique internal paths from rendered HTML;
- classifying HTTP responses as pass/fail.

The executable script imports those helpers, starts the Next server as a child
process, polls readiness, and performs bounded breadth-first traversal. Keeping
the policy helpers pure makes the important behavior directly unit-testable
without starting a server.

## Crawl Contract

- Seed `/` and `/fr` explicitly so both locale trees are checked even if locale
  switching changes later.
- Follow only same-origin `<a href>` targets.
- Ignore `mailto:`, `tel:`, other schemes, and external origins.
- Normalize a route to its pathname, dropping query and fragment variations so
  search/filter links do not multiply the queue.
- Follow redirects and validate the final response.
- Treat fetch errors and HTTP status `>=400` as failures.
- Parse further anchors only from successful HTML responses.
- Enforce a configurable page limit with a conservative default; reaching the
  limit is itself a failure because it means coverage was truncated.
- Always stop the child server, including on signal or failure.

## Backend Independence

CI keeps the existing loopback API base URL with diagnostics disabled. The
checker temporarily binds a fail-fast `503` stub to that loopback target so
server-rendered pages exercise their existing offline/fallback behavior without
waiting for an absent backend. It refuses non-loopback API targets, does not
call an operator endpoint, and requires no credentials.

## CI Integration

Add `npm run check:links` after `npm run build` in the existing `check` script.
The frontend `lint-and-test` job already runs `make frontend-ci`, which invokes
`npm run check`; no new workflow, runner, dependency install, or duplicate
production build is needed.

## Testing

Write focused Vitest tests first for:

1. relative, root-relative, localized, query, and fragment normalization;
2. same-origin acceptance and external/non-HTTP rejection;
3. HTML anchor extraction and stable deduplication;
4. success, redirect-final, HTTP-error, and non-HTML response classification;
5. page-limit policy.

Then run the real checker against a local production build, the full frontend
`npm run check`, and strict documentation validation.

## Delivery

Use an independent branch from `origin/main`. Update the frontend
implementation guide and testing guidelines, archive the implementation plan,
remove completed roadmap item #37, and open a PR against `main`. No deployment
or live-site probing is part of this batch.
