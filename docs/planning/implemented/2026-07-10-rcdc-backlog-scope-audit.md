# RCDC Backlog Scope Audit Plan

**Status:** Implemented 2026-07-10

**Goal:** Prevent repeated selection of an adjacent code task whose named
subproject is not present in the current repository or workspace.

## Task 1: Verify repository and workspace scope

1. Search the current `origin/main` tree for `rcdc` and `CDC_zim_mirror`.
2. Search repository history for either path.
3. Search the recursively discovered workspace, excluding Git metadata,
   worktrees, and dependencies, for a matching project.

## Task 2: Update roadmap truth

**File:** `docs/planning/roadmap.md`

Keep the adjacent startup-sanity-check idea on the roadmap, but mark it blocked
because its source tree and test harness are absent. Record the exact condition
for resuming: restore/import the canonical source or link its maintained repo,
then re-audit its local instructions and tests before planning code changes.

## Task 3: Validate and publish

1. Run strict docs coverage/build and active-doc/public-surface tests.
2. Review the update for false completion claims and private detail.
3. Archive this scope-audit plan, commit, push, and open/read back a stacked PR.

No implementation, dependency, deployment, or external repository mutation is
authorized by this scope audit.

## Completion Record

- `git ls-tree -r --name-only origin/main` found no `rcdc` or
  `CDC_zim_mirror` path.
- `git log --all -- rcdc CDC_zim_mirror` found no matching reachable history.
- A recursive workspace search excluding Git metadata, linked worktrees, and
  dependencies found no matching ZIM-mirror project.
- The roadmap now retains the startup-sanity-check idea as blocked, states why
  implementation cannot be performed or tested, and names the source-restore
  condition required before reselection.
- Strict documentation coverage/build passed, followed by 16 bridge,
  active-doc, docs-coverage, and public LLM-surface tests.
- The task was not marked complete, and no substitute codebase, dependency,
  deployment, or external repository was invented or changed.
