# Deterministic Documentation References

**Status:** Completed on 2026-07-11

## Context

The reference gate depended on unmanaged local artifacts that happened to
exist in a long-lived checkout but correctly did not exist in an isolated
worktree.

## Scope

Make reference validation deterministic in an isolated checkout without
changing the checker or creating local placeholders.

## Design decision

Path-like inline-code tokens under checker-recognized repository prefixes
remain machine-checkable. They must be tracked or generated before the checker
runs. Bare illustrative artifact or category names are not repository
references and need not resolve. Unmanaged local artifacts under recognized
prefixes are described as prose categories instead of asserted as repository
references.

## Delivered

- Historical audit prose now describes unmanaged environment overrides and
  frontend dependencies as categories rather than resolvable references.
- Documentation guidance defines tracked-or-generated-at-check-time semantics.
- The reference checker and its validation rigor remain unchanged.

## RED evidence

- RED: the isolated checkout reported exactly the two unmanaged local examples.
- The worktree did not contain placeholder environment or dependency artifacts.

## GREEN evidence

- GREEN: `make docs-refs` and `make docs-check` passed with those assets absent.
- The clean result came from correcting source prose, not local setup tricks.

## Validation

- `make docs-refs` passed.
- `make docs-check` passed before and after closeout edits.
- Task 1 `make backend-ci` passed with 385 tests and one known deprecation
  warning.
- Fresh Task 2 `make prepush` passed formatting, lint, type checking, 385 tests,
  API smoke verification, migration checks, and dependency audit.
- `git diff --check` passed.

## Documentation

The maintenance audit retains its preservation and manual-review exclusions.
The documentation guideline records when inline path formatting is valid.

## Scope boundary

No product roadmap item was closed and no checker exclusion was added.

## Remaining work

None for this bounded maintenance fix.
