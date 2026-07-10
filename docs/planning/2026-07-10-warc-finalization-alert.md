# WARC-Complete Finalization Failure Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit a durable per-source metric and dashboard-only warning whenever a new WARC-complete/ZIM-finalization-failed job is accepted.

**Architecture:** The existing crawl textfile collector reconstructs a zero-filled gauge from persisted job stages for every configured source. A Prometheus P2 warning detects a positive 30-minute delta; no worker behavior, schema, private routing, or deployment wiring changes.

**Tech Stack:** Python 3.11+, SQLAlchemy, node-exporter textfile metrics, Prometheus rules, pytest, YAML.

## Global Constraints

- Reuse `WARC_COMPLETE_FINALIZATION_FAILED`; do not duplicate the stage literal.
- Emit zero-valued per-source series so the first recurrence is detectable.
- Use gauge semantics because values are reconstructed from persisted state.
- Keep the alert warning/P2 and dashboard-only with no Pushover routing.
- Do not run deployment, production smoke, alert reload, or private operations actions.

---

### Task 1: Emit Persisted Rescue-State Gauges

**Files:**
- Modify: `tests/test_ops_crawl_metrics_textfile_state.py`
- Modify: `scripts/vps-crawl-metrics-textfile.py`

**Interfaces:**
- Consumes: `ArchiveJob.crawler_stage`, configured `Source.code` rows, and `WARC_COMPLETE_FINALIZATION_FAILED`
- Produces: total and per-source `healtharchive_crawl_warc_complete_finalization_failed_jobs*` gauges

- [ ] **Step 1: Write the failing metrics test**

Create one completed HC job with
`crawler_stage=WARC_COMPLETE_FINALIZATION_FAILED`, run the collector, and assert:

```python
assert "healtharchive_crawl_warc_complete_finalization_failed_jobs 1" in content
assert (
    'healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source{source="hc"} 1'
    in content
)
assert (
    'healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source{source="phac"} 0'
    in content
)
```

- [ ] **Step 2: Prove the metrics test fails**

Run:

```bash
python -m pytest -q \
  tests/test_ops_crawl_metrics_textfile_state.py::test_metrics_emits_warc_complete_finalization_failure_counts
```

Expected: FAIL because the metric is absent.

- [ ] **Step 3: Add the minimal collector implementation**

Import the shared constant, query all source codes plus grouped matching jobs,
fill missing source counts with zero, and emit:

```text
# TYPE healtharchive_crawl_warc_complete_finalization_failed_jobs gauge
healtharchive_crawl_warc_complete_finalization_failed_jobs <sum>
# TYPE healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source gauge
healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source{source="<code>"} <count>
```

Reset the counts to an empty mapping in the existing database-exception path;
`healtharchive_crawl_metrics_ok` remains the collector-failure signal.

- [ ] **Step 4: Prove the metrics test passes**

Run the Step 2 command.

Expected: the test passes with HC=1 and PHAC=0.

- [ ] **Step 5: Commit the metric**

```bash
git add scripts/vps-crawl-metrics-textfile.py tests/test_ops_crawl_metrics_textfile_state.py
git commit -m "feat: expose accepted WARC finalization failures"
```

### Task 2: Alert On A New Accepted Failure

**Files:**
- Modify: `tests/test_ops_alert_rules.py`
- Modify: `ops/observability/alerting/healtharchive-alerts.yml`

**Interfaces:**
- Consumes: `healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source`
- Produces: `HealthArchiveWarcCompleteFinalizationFailureAccepted`

- [ ] **Step 1: Write the failing alert policy test**

Assert the new alert block includes:

```python
assert (
    "delta(healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source[30m]) > 0"
    in body
)
assert re.search(r"^\s*for:\s*5m\s*$", body, re.MULTILINE)
assert re.search(r"^\s*severity:\s*warning\s*$", body, re.MULTILINE)
_assert_notification_tier(body, "P2")
_assert_no_pushover_notify(body)
assert "docs/operations/playbooks/crawl/annual-campaign.md" in body
```

- [ ] **Step 2: Prove the alert test fails**

Run:

```bash
python -m pytest -q \
  tests/test_ops_alert_rules.py::test_warc_complete_finalization_failure_alert_semantics
```

Expected: FAIL because the alert block is absent.

- [ ] **Step 3: Add the minimal warning rule**

Add a crawl-group rule named
`HealthArchiveWarcCompleteFinalizationFailureAccepted` with the exact expression
and labels from Step 1, a source-aware description, and the public annual
campaign runbook URL.

- [ ] **Step 4: Prove the alert test passes**

Run the Step 2 command.

Expected: the alert semantics test passes.

- [ ] **Step 5: Commit the alert**

```bash
git add ops/observability/alerting/healtharchive-alerts.yml tests/test_ops_alert_rules.py
git commit -m "feat: alert on accepted WARC finalization failures"
```

### Task 3: Document And Close The Roadmap Follow-Up

**Files:**
- Modify: `docs/operations/monitoring-and-alerting.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive this plan under `docs/planning/implemented/`.

**Interfaces:**
- Consumes: completed metric/alert behavior
- Produces: public signal posture and an accurate future backlog

- [ ] **Step 1: Document the public signal class**

Add accepted WARC-complete finalization failures to the monitored crawler
signals and state that recurrence is a dashboard-only warning, not an outage or
data-loss page.

- [ ] **Step 2: Remove only the delivered roadmap bullet**

Remove the metric/alert bullet under WARC finalization failure handling. Keep
the separate future decision about suppressing or tolerating ZIM finalization.

- [ ] **Step 3: Run focused validation**

```bash
python -m pytest -q \
  tests/test_ops_crawl_metrics_textfile_state.py \
  tests/test_ops_alert_rules.py \
  tests/test_ops_metrics_textfile_scripts.py
```

Expected: all focused metrics and alert tests pass.

- [ ] **Step 4: Run complete validation**

```bash
make backend-ci
make docs-coverage-strict
make docs-build-strict
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 5: Archive the plan and commit closeout**

Compress this plan to the implemented-plan summary format, update both planning
indexes, and commit the monitoring doc, roadmap, and archive record.

- [ ] **Step 6: Verify the clean committed tree**

Re-run Steps 3 and 4, then confirm `git status --short --branch` is clean.
