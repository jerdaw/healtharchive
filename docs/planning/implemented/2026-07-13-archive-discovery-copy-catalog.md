# Archive discovery bilingual copy catalog

## Goal

Move the complete archive discovery and search workflow's user-facing English
and French copy out of inline locale conditionals and into one typed catalog,
while preserving routing, API fallback behavior, source localization, search
semantics, and the English-governs policy.

## Scope

- Add a typed catalog for static and parameterized archive copy, including
  pluralization, result counts, date ranges, source previews, filters,
  pagination, replay actions, and search-within-results messages.
- Migrate `/archive`, `/archive/browse-by-source`, `SearchResultCard`,
  `SearchWithinResults`, `CopyButton`, and the route-owned `ApiHealthBanner` as
  one coherent public workflow. Keep clipboard status copy in a reusable
  interaction section because citation and snapshot pages share the button.
- Keep locale-dependent fetching, URL construction, source-name localization,
  conditional rendering, and date/number formatting as behavior rather than
  translatable copy.
- Add catalog parity and route/component rendering tests that cover English,
  French, parameterized messages, fallbacks, filters, and result actions.
- Update bilingual development guidance and record this completed phase in the
  roadmap without claiming the remaining site-wide catalog migration is done.

## Validation

- Run focused archive, source-browser, search-within, and catalog tests.
- Run frontend format, lint, typecheck, unit tests, production build, and link
  checks.
- Run strict repository documentation checks and the local pre-push gate.

## Outcome

The archive discovery/search workflow now has one typed source of truth for
static, parameterized, accessible, diagnostic, and interaction copy. The
broader site-wide backlog remains open with this completed workflow and its
remaining scope stated explicitly.
