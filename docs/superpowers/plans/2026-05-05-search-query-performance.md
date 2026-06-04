# Search Query Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make text `/api/search?q=...` use indexed PostgreSQL full-text search by default so public search queries avoid per-request computed-vector scans.

**Architecture:** Keep the public search contract unchanged. The public route will use the stored `snapshots.search_vector` GIN-indexed column on PostgreSQL and reserve computed vectors for SQLite/dev fallback or an explicit legacy fallback toggle. Operator docs will make `healtharchive backfill-search-vector` the supported recovery path when stored vectors are incomplete.

**Tech Stack:** FastAPI, SQLAlchemy ORM, PostgreSQL FTS/GIN, SQLite test fallback, pytest.

---

### Task 1: Add Regression Coverage For Indexed FTS

**Files:**
- Modify: `tests/test_api_search_and_snapshot.py`

- [x] **Step 1: Write the failing test**

Add a test near `test_search_default_browse_uses_storage_dedup_without_runtime_window` that compiles the internal search route against a mock PostgreSQL session and verifies the normal `q=...` path does not build the computed `to_tsvector` fallback.

```python
def test_postgres_text_search_uses_stored_search_vector_by_default(monkeypatch) -> None:
    from ha_backend.api import routes_public

    class FakeQuery:
        def __init__(self) -> None:
            self.filters = []

        def join(self, *args, **kwargs):
            return self

        def filter(self, *criteria):
            self.filters.extend(criteria)
            return self

        def with_entities(self, *args):
            return self

        def scalar(self):
            return 1

        def options(self, *args, **kwargs):
            return self

        def order_by(self, *args):
            return self

        def offset(self, value):
            return self

        def limit(self, value):
            return self

        def all(self):
            return []

    class FakeDialect:
        name = "postgresql"

    class FakeBind:
        dialect = FakeDialect()

    class FakeSession:
        def __init__(self) -> None:
            self.query_obj = FakeQuery()

        def get_bind(self):
            return FakeBind()

        def query(self, *args):
            return self.query_obj

    def fail_build_search_vector(*args, **kwargs):
        raise AssertionError("default PostgreSQL search should not build computed vectors")

    fake_db = FakeSession()
    monkeypatch.setattr(routes_public, "build_search_vector", fail_build_search_vector)
    monkeypatch.setattr(routes_public, "_has_table", lambda db, table: False)
    monkeypatch.setattr(routes_public, "_has_column", lambda db, table, column: False)

    response, mode = routes_public._search_snapshots_inner(
        q="covid",
        source=None,
        sort=None,
        view=None,
        includeNon2xx=False,
        includeDuplicates=False,
        from_date=None,
        to_date=None,
        page=1,
        pageSize=1,
        ranking=None,
        db=fake_db,
    )

    assert response.total == 1
    assert mode == "relevance_fts"
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
.venv/bin/pytest tests/test_api_search_and_snapshot.py::test_postgres_text_search_uses_stored_search_vector_by_default -q
```

Expected: the test fails with `AssertionError: default PostgreSQL search should not build computed vectors`.

### Task 2: Make Stored FTS The Default Postgres Search Path

**Files:**
- Modify: `src/ha_backend/api/routes_public.py`
- Test: `tests/test_api_search_and_snapshot.py`

- [x] **Step 1: Implement the smallest route change**

Update `apply_fts_filter()` in `src/ha_backend/api/routes_public.py` so normal PostgreSQL relevance search uses only `Snapshot.search_vector`. Keep a fallback helper for explicit legacy fallback if a future config/env toggle is added.

```python
def apply_fts_filter(qry: Any) -> Any:
    nonlocal tsquery, vector_expr
    if q_filter is None:
        raise ValueError("apply_fts_filter called without q_filter")
    tsquery = func.websearch_to_tsquery(TS_CONFIG, q_filter)
    vector_expr = Snapshot.search_vector
    return qry.filter(Snapshot.search_vector.op("@@")(tsquery))
```

- [x] **Step 2: Run the new focused test and nearby search tests**

Run:

```bash
.venv/bin/pytest tests/test_api_search_and_snapshot.py::test_postgres_text_search_uses_stored_search_vector_by_default tests/test_api_search_and_snapshot.py::test_search_sort_newest tests/test_api_search_and_snapshot.py::test_search_view_pages_returns_latest_snapshot_for_group -q
```

Expected: all selected tests pass.

### Task 3: Document Operator Recovery For Incomplete Search Vectors

**Files:**
- Modify: `docs/operations/search-quality.md`
- Modify: `docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md`

- [x] **Step 1: Add search-vector diagnostic and remediation commands**

Add a short section to `docs/operations/search-quality.md` after the existing `backfill-search-vector` section:

```markdown
### Production slow text search triage

If `/api/search?q=...` is much slower than browse searches, first verify the
stored PostgreSQL FTS vector is populated. The public API expects
`snapshots.search_vector` to be the searchable index for PostgreSQL.

```bash
cd <deploy-root>
set -a; source /etc/healtharchive/backend.env; set +a

./.venv/bin/python - <<'PY'
from ha_backend.db import get_session
from ha_backend.models import Snapshot

with get_session() as session:
    total = session.query(Snapshot).count()
    missing = session.query(Snapshot).filter(Snapshot.search_vector.is_(None)).count()
    print(f"snapshot_total={total}")
    print(f"search_vector_missing={missing}")
PY
```

If `search_vector_missing` is non-zero, run:

```bash
cd <deploy-root>
set -a; source /etc/healtharchive/backend.env; set +a
./.venv/bin/healtharchive backfill-search-vector
```

Then repeat representative timing probes, including both browse and text-search
queries.
```

- [x] **Step 2: Update the CIHR incident follow-through**

Append a note to the public search follow-through section in the incident doc:

```markdown
- 2026-05-05 follow-up: browse search was restored to low-single-second
  latency after deploying the stored-dedup browse fast path. Remaining
  `q=...` latency is tracked as search-vector/index usage work; PostgreSQL
  text search should rely on populated `snapshots.search_vector` rather than
  per-request computed vectors.
```

### Task 4: Verify The Full Patch

**Files:**
- Test: `tests/test_api_search_and_snapshot.py`
- Test: `tests/test_api_contracts.py`
- Test: `tests/test_ops_verify_public_surface_pages.py`

- [x] **Step 1: Run focused verification**

Run:

```bash
.venv/bin/pytest tests/test_api_search_and_snapshot.py tests/test_api_contracts.py tests/test_ops_verify_public_surface_pages.py -q
```

Expected: all selected tests pass.

- [x] **Step 2: Run backend CI**

Run:

```bash
make backend-ci
```

Expected: lint, typing, and backend pytest pass.

- [x] **Step 3: Build docs and check whitespace**

Run:

```bash
make docs-build
git diff --check
```

Expected: docs build succeeds and `git diff --check` exits 0.

### Task 5: Prepare Deployment Notes

**Files:**
- No code files.

- [x] **Step 1: Capture exact post-deploy commands for the operator**

Use these commands after merge/deploy:

```bash
cd <deploy-root>
git rev-parse HEAD

set -a; source /etc/healtharchive/backend.env; set +a
./.venv/bin/python - <<'PY'
from ha_backend.db import get_session
from ha_backend.models import Snapshot

with get_session() as session:
    total = session.query(Snapshot).count()
    missing = session.query(Snapshot).filter(Snapshot.search_vector.is_(None)).count()
    print(f"snapshot_total={total}")
    print(f"search_vector_missing={missing}")
PY

base="https://api.healtharchive.ca"
for qs in \
  "pageSize=1" \
  "pageSize=1&view=pages" \
  "q=covid&pageSize=1" \
  "q=covid&pageSize=1&view=pages"
do
  echo "== $qs =="
  curl -fsS -o /tmp/ha-search.json \
    -w 'http=%{http_code} time=%{time_total}s size=%{size_download}\n' \
    --max-time 120 \
    "$base/api/search?$qs" || echo "FAILED"
done
```

If `search_vector_missing` is non-zero, run:

```bash
cd <deploy-root>
set -a; source /etc/healtharchive/backend.env; set +a
./.venv/bin/healtharchive backfill-search-vector
```

Then repeat the timing probes.

### Task 6: Remove Runtime Snapshot Dedup From PostgreSQL Text Search

**Files:**
- Modify: `src/ha_backend/api/routes_public.py`
- Modify: `tests/test_api_search_and_snapshot.py`

- [x] **Step 1: Capture the production bottleneck**

After the stored-vector deployment, production timing probes improved browse
searches but still showed slow text search:

```text
q=covid&pageSize=1              58.924s
q=covid&pageSize=1&view=pages   10.365s
```

Production `EXPLAIN (ANALYZE, BUFFERS)` showed the FTS match count was fast
enough on its own, while the current ranked snapshot path spent about 51s in a
runtime `row_number()` same-day dedup plan and per-row `page_signals` lookups.
The same ranked query using stored `snapshots.deduplicated = false` completed
in about 6.37s.

- [x] **Step 2: Add regression coverage**

Extend the PostgreSQL mock search test so the default `q=...` path raises if it
builds `func.row_number()`. This preserves the existing SQLite/dev runtime
dedup fallback while proving production PostgreSQL text search uses stored
deduplication metadata.

- [x] **Step 3: Broaden the stored-dedup fast path**

Allow `_can_use_storage_dedup_only_for_snapshots()` to return true for
PostgreSQL FTS relevance searches when there is no date range, boolean query,
URL search, or explicit duplicate inclusion. Leave runtime dedup in place for
non-PostgreSQL fallbacks and modes where stored dedup is not enough to preserve
the public API contract.

- [x] **Step 4: Verify locally**

Run:

```bash
.venv/bin/pytest -s tests/test_api_search_and_snapshot.py tests/test_api_contracts.py tests/test_ops_verify_public_surface_pages.py -q
make backend-ci
make docs-build && git diff --check
```

### Task 7: Keep Broad Default Ranking On The Fast Path

**Files:**
- Modify: `src/ha_backend/api/routes_public.py`
- Modify: `tests/test_api_search_and_snapshot.py`

- [x] **Step 1: Capture the post-deploy result**

After deploying the stored-dedup optimization, production public verification
passed and broad text-search latency improved, but remained higher than the raw
stored-dedup query plan:

```text
q=covid&pageSize=1              17.630s
q=covid&pageSize=1&view=pages    6.410s
```

The remaining likely hot path is default broad-query ranking over a large match
set. The prior production `EXPLAIN` showed the ranked stored-dedup path still
spent most of its time joining/scoring `page_signals` over about 100k matching
snapshots.

- [x] **Step 2: Add regression coverage**

Add a PostgreSQL mock test where `page_signals` exists and default
`q=covid` search raises if the query builder calls `outerjoin(PageSignal, ...)`.
Keep separate existing tests for SQLite/local authority boosts and explicit
`ranking=v2` hubness behavior.

- [x] **Step 3: Keep default broad PostgreSQL search fast**

Skip `page_signals` ranking only for default broad PostgreSQL relevance
queries. Explicit ranking modes, non-PostgreSQL behavior, and narrower query
modes keep the existing ranking path.

### Task 8: Trim Per-Row String Heuristics From Default Broad Rank

**Files:**
- Modify: `src/ha_backend/api/routes_public.py`
- Modify: `tests/test_api_search_and_snapshot.py`

- [x] **Step 1: Capture the post-deploy query plan**

After deploying Task 7, the target query improved again but remained above the
low-single-second goal:

```text
q=covid&pageSize=1              12.028s
q=covid&pageSize=1&view=pages    7.932s
```

Fresh production `EXPLAIN (ANALYZE, BUFFERS)` showed:

```text
current_snapshot_count        578.691 ms
current_snapshot_ranked_top1  3349.317 ms
```

The count is now fast enough. The top-result query still evaluates title and
URL string heuristics across roughly 141k FTS hits before returning page one.

- [x] **Step 2: Add regression coverage**

Extend the PostgreSQL mock default text-search test to inspect the generated
`ORDER BY` and fail if the default broad path includes title or URL string
heuristics such as `lower(snapshots.title)`, URL query penalties, tracking
parameter penalties, or URL-depth `replace()` work.

- [x] **Step 3: Keep default broad ranking lean**

For default broad PostgreSQL text search, rank by stored FTS rank only and keep
the existing status, capture timestamp, and id tie-breakers. Richer title, URL,
authority, hubness, and PageRank heuristics remain available to explicit
ranking modes and non-default paths.

### Task 9: Record Final Production Outcome

**Files:**
- Modify: `docs/superpowers/plans/2026-05-05-search-query-performance.md`
- Modify: `docs/operations/search-quality.md`
- Modify: `docs/planning/roadmap.md`

- [x] **Step 1: Capture deployed commits**

Search performance follow-through landed in four production deploys:

```text
b9a919d8e22075dc22b0065064b71758ba6b9fb9  use stored search vectors
3dd8eb9f1215cea8ec849c5b9426c90cb1290b4e  avoid runtime snapshot dedup
60a9f1faf23d5321883d9051875398c2a850dd3e  skip PageSignal ranking on default broad search
e9129c4eda31ce8a2b6072454e2ae48f484ecbad  trim default broad rank to FTS rank
```

Each deploy passed the production deploy helper, baseline drift check, and
public-surface verifier.

- [x] **Step 2: Capture final timing samples**

After the final deploy and warm-up sampling, production public API timings were:

```text
q=covid&pageSize=1:
  3.252s, 5.476s, 2.487s, 2.389s, 1.959s
q=covid&pageSize=1&view=pages:
  8.959s, 6.742s, 4.787s, 4.566s, 4.285s
pageSize=1:
  6.793s, 1.885s, 3.678s, 2.339s, 2.067s
pageSize=1&source=cihr:
  5.919s, 2.329s, 2.502s, 3.070s, 2.491s
```

The main target (`q=covid&pageSize=1`) is no longer in the timeout / 60s class
and settles into the low-single-digit range after warm-up.

- [x] **Step 3: Move remaining tuning to backlog**

Do not keep patching the hot path without new repeated evidence. Remaining
work is optional DB/index-plan tuning for broad `q=...&view=pages`, especially
if it repeatedly exceeds the desired response target after cache warm-up.
