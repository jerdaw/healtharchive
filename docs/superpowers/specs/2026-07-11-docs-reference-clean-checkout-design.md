# Deterministic Documentation Reference Checks Design

**Date:** 2026-07-11

## Context

`make docs-refs` is documented as the internal-reference integrity check and is
part of `make docs-check`. Its inline-code scanner treats path-like code spans
under repository prefixes such as frontend paths as references that must exist.

Two lines in `docs/maintenance-audit.md` use inline-code formatting for ignored
local artifacts: the frontend-local environment override and frontend
dependency tree. Those examples describe assets that were intentionally
preserved or excluded from review; they are not repository references that
should exist in a clean checkout. The check therefore passes in a long-lived
checkout where the artifacts happen to exist, but fails in an isolated clean
worktree where they correctly do not. That makes a documented validation gate
depend on unrelated local state.

## Goal

Make documentation reference validation deterministic in a clean checkout by
aligning those two historical examples with the checker's existing semantics,
without weakening or changing the checker.

## Non-goals

- Creating placeholder ignored files or dependency directories.
- Adding a reference-checker waiver or exclusion mechanism.
- Exempting gitignored, generated, or absent paths automatically.
- Weakening Markdown link or inline-code path validation.
- Reclassifying the maintenance audit's historical conclusions.
- Changing documentation generation, navigation, or deployment behavior.

## Approaches Considered

### 1. Describe intentionally absent artifacts as prose categories (selected)

Rephrase the two maintenance-audit bullets to describe local environment
overrides, virtual environments, and dependency trees as categories rather
than formatting absent repository-prefixed paths as inline code. Add a rule to
`docs/documentation-guidelines.md`: path-like inline-code tokens under
checker-recognized repository prefixes must resolve when the reference checker
runs from a clean checkout—either because they are tracked or because the
documented check prerequisites generate them. Bare illustrative artifact or
category names that the checker does not recognize as repository references
need not resolve. Describe unmanaged local examples under recognized prefixes
in prose.

This matches the checker's existing contract: path-like inline code under a
recognized repository prefix is a machine-checkable reference, while bare
illustrative artifact or category names are not repository references. Prose
may discuss a class of local artifact without asserting that a specific path
exists. It fixes the source ambiguity instead of adding an exception
mechanism.

### 2. Explicit inline-code waiver

A same-line or token-specific waiver could preserve exact path spelling, but it
adds parser rules and review burden for two historical examples. A line-wide
waiver could also hide an unrelated broken path. The maintenance audit does not
need exact local filenames to preserve its conclusion, so the mechanism is not
justified.

### 3. Ignore all gitignored paths

This would make the current examples pass, but could hide stale references to
generated contracts, environment examples, or dependency-relative files. Git
ignore policy and documentation reference validity are different contracts.

## Documentation Contract

The existing checker remains unchanged:

- Markdown links must resolve unless they are external or otherwise covered by
  existing rules;
- path-like inline-code tokens under recognized repository prefixes must exist
  when the checker runs from a clean checkout, either as tracked files or as
  outputs created by the documented check prerequisites;
- bare illustrative artifact or category names that the checker does not
  recognize as repository references may remain inline code and need not
  resolve;
- local or ignored artifacts under a recognized repository prefix that the
  validation workflow neither tracks nor generates should be described by
  category in prose, not presented as resolvable inline-code references;
- no placeholder files may be created solely to satisfy documentation checks.

The maintenance audit will continue to state that ignored local assets were
preserved and dependency trees were excluded from manual review. Only the
machine-checkable path implication changes.

## Validation Strategy

Capture RED in the isolated worktree: `make docs-refs` reports exactly the two
maintenance-audit examples and no other finding. After the prose/guideline
change, prove GREEN without creating local artifacts:

- assert that neither the frontend-local environment override nor frontend
  dependency directory exists in the worktree;
- run `make docs-refs` successfully;
- run `make docs-check`, backend parity, and the pre-push gate;
- run diff and public/private-boundary review.

Because the checker behavior does not change, no new Python unit test is
needed. The repository-level check in an isolated worktree is the regression
proof for the content contract.

## Documentation And Closeout

Archive a dated implementation plan and update both planning indexes. No
roadmap item is marked complete because this is validation-gate maintenance,
not a previously scoped product backlog item.

## Risk And Rollback

Risk is limited to making the historical wording less precise. The replacement
retains the asset categories and preservation/exclusion decisions while
removing only the false clean-checkout existence implication. Rollback is
limited to two maintenance-audit bullets, one documentation-guideline rule,
and planning history.
