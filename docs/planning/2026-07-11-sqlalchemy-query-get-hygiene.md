# SQLAlchemy Query.get Test Hygiene Plan

> **For implementers:** Use `superpowers:subagent-driven-development` and the
> approved design in
> `docs/superpowers/specs/2026-07-11-sqlalchemy-query-get-hygiene-design.md`.

**Goal:** Replace the repository's two legacy SQLAlchemy `Query.get()` test
calls with supported `Session.get()` lookups and close only that warning item.

**Scope:** One test function, three maintenance-audit truth updates, and
planning closeout. No production code, dependency, or warning-policy changes.

---

## Task 1: Remove the legacy lookups and update current audit truth

**Files:**

- Modify: `tests/test_changes.py`
- Modify: `docs/maintenance-audit.md`

- [ ] Bootstrap the worktree with `make venv` if `.venv/bin/pytest` is absent.

- [ ] Prove RED:

```bash
.venv/bin/pytest tests/test_changes.py -q \
  -W "error::sqlalchemy.exc.LegacyAPIWarning"
```

Expected: `1 failed, 12 passed`; failure points to the first legacy lookup.
Unrelated datetime warnings may remain visible.

- [ ] Replace both calls exactly:

```python
job1 = db_session.get(ArchiveJob, snap1.job_id)
job2 = db_session.get(ArchiveJob, snap2.job_id)
```

- [ ] Update `docs/maintenance-audit.md`:

  1. annotate the historical deferred `Query.get()` observation as resolved by
     the later 2026-07-11 hygiene pass;
  2. remove `Query.get()` from the current Python test-hygiene recommendation;
  3. remove it from the current remaining-warning list;
  4. retain datetime, TestClient, and SQLite ResourceWarning follow-ups.

- [ ] Prove GREEN and validate:

```bash
.venv/bin/pytest tests/test_changes.py -q \
  -W "error::sqlalchemy.exc.LegacyAPIWarning"
if grep -RIn --include="*.py" -E "\.query\([^)]*\)\.get\(" src tests; then
  echo "legacy Query.get call remains" >&2
  exit 1
else
  status=$?
  if test "$status" -ne 1; then
    exit "$status"
  fi
fi
make docs-check
make prepush
git diff --check
```

Expected: 13 focused tests pass; grep returns no match (exit 1); docs and
pre-push gates pass. Do not claim other warning classes are fixed.

- [ ] Review the exact two-file diff and commit:

```bash
git add tests/test_changes.py docs/maintenance-audit.md
git commit -m "test: replace legacy SQLAlchemy lookups"
```

## Task 2: Archive and integrate the bounded outcome

**Files:**

- Move the active plan into `docs/planning/implemented/` under the same name.
- Modify `docs/planning/README.md`.
- Modify `docs/planning/implemented/README.md`.

- [ ] Compress this plan to a 40–80 line outcome record preserving exact
  RED/GREEN results, the two mechanical replacements, audit chronology, full
  validation, and the warnings deliberately left open.

- [ ] Remove the active index entry and add the implemented plan to both
  planning indexes. Do not change `docs/planning/roadmap.md`.

- [ ] Validate and commit closeout:

```bash
make docs-check
git diff --check
git diff -- docs/planning
git add docs/planning
git commit -m "docs: record Query.get warning cleanup"
```

- [ ] After independent cumulative review, push and open a ready PR:

```bash
git push -u origin codex/sqlalchemy-query-get-hygiene
gh pr create --base main --head codex/sqlalchemy-query-get-hygiene \
  --title "test: replace legacy SQLAlchemy lookups" \
  --body "## Summary

- replace two deprecated Query.get test lookups with Session.get
- preserve audit chronology while closing only the Query.get warning item
- leave datetime, TestClient, and SQLite warning follow-ups open

## Validation

- 13 focused tests with LegacyAPIWarning promoted to error
- make docs-check
- make prepush"
gh pr checks --watch
gh pr view --json url,isDraft,mergeable,mergeStateStatus,headRefOid,statusCheckRollup
local_head="$(git rev-parse HEAD)"
remote_head="$(gh pr view --json headRefOid --jq .headRefOid)"
test "$local_head" = "$remote_head"
```

Confirm all hosted checks pass and the remote head equals local `HEAD`. Do not
merge, deploy, release, or alter dependencies.
