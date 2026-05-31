# Incident: API DB Pool Exhaustion From Idle Transactions (2026-05-29)

Status: closed

## Metadata

- Date (UTC): 2026-05-29
- Severity (see `severity.md`): sev1
- Environment: production
- Primary area: api
- Owner: Jeremy Dawson
- Start (UTC): 2026-05-29T16:29:29Z
- End (UTC): 2026-05-31T15:22:00Z

---

## Summary

The production API accumulated many PostgreSQL sessions in
`idle in transaction`, eventually exhausting the SQLAlchemy connection pool.
During the incident, local `/api/health` and authenticated `/metrics` requests
timed out even though `healtharchive-api.service` still showed as active.

The immediate mitigation was an API restart plus a database-level
`idle_in_transaction_session_timeout = '60s'` guardrail. The durable fix was
deployed in commit `b4975c4f4986eca7da382618076f1f609e10fbef`: public and
admin API routes now use a request-scoped database session that is closed after
route execution, exports materialize rows before streaming, and Prometheus now
alerts on excessive idle transactions before the pool is exhausted.

## Impact

- User-facing impact: Public API routes could time out while the pool was
  exhausted. Frontend pages that did not need the affected API path could still
  return successfully.
- Internal impact: Prometheus could not scrape backend `/metrics`, so the
  backend scrape alert fired and the service appeared active at the systemd
  layer while application health was degraded.
- Data impact:
  - Data loss: no
  - Data integrity risk: no known integrity risk
  - Recovery completeness: complete
- Duration: The backend scrape alert first fired on 2026-05-29T16:29:29Z. The
  API was manually recovered on 2026-05-29T20:04Z and durable repo-side fixes
  were deployed and verified on 2026-05-31.

## Detection

- `curl http://127.0.0.1:8001/api/health` timed out with `HTTP=000`.
- API logs showed
  `sqlalchemy.exc.TimeoutError: QueuePool limit of size 12 overflow 24 reached`.
- `pg_stat_activity` showed 72 `healtharchive` sessions in
  `idle in transaction`, most holding completed snapshot/change SELECTs.
- `HealthArchiveBackendScrapeDown` was firing because Prometheus could not
  scrape `/metrics`.
- Manual Alertmanager relay testing confirmed the Pushover delivery path was
  working.

## Decision Log

- 2026-05-29T20:04:04Z - Restarted `healtharchive-api.service` to restore the
  public API quickly. This cleared the stuck pool state but was not considered
  a durable fix.
- 2026-05-29T21:24:17Z - Sent a manual Alertmanager relay test because alert
  delivery needed to be separated from the backend scrape failure itself.
- 2026-05-29T21:35:00Z - Added
  `idle_in_transaction_session_timeout = '60s'` for the `healtharchive` role in
  the production database as a containment guardrail.
- 2026-05-31T15:18:34Z - Deployed commit `b4975c4f4986eca7da382618076f1f609e10fbef`
  with request-scoped API session cleanup and the idle-transaction alert.

## Timeline (UTC)

- 2026-05-29T16:29:29Z - `HealthArchiveBackendScrapeDown` became active for
  instance `127.0.0.1:8001`.
- 2026-05-29T20:01:52Z - Operator check showed `/api/health` timing out after
  10 seconds while Prometheus, Alertmanager, and node_exporter were ready.
- 2026-05-29T20:02:04Z - Recent API logs showed SQLAlchemy pool checkout
  timeouts.
- 2026-05-29T20:02:15Z - `pg_stat_activity` showed 72 `idle in transaction`
  sessions for the `healtharchive` database user.
- 2026-05-29T20:04:04Z - `healtharchive-api.service` was restarted.
- 2026-05-29T20:04:16Z - External frontend and API health checks returned
  `HTTP 200`, but `HealthArchiveBackendScrapeDown` remained active until the
  next successful scrape window.
- 2026-05-29T21:24:17Z - Manual Alertmanager relay delivery test returned
  `200 OK` and the Pushover notification was received.
- 2026-05-29T21:35:00Z - Production database role guardrail was set:
  `idle_in_transaction_session_timeout = '60s'`.
- 2026-05-31T14:46:13Z - Delayed checks showed only idle database sessions,
  no `idle in transaction` buildup.
- 2026-05-31T15:18:34Z - Commit `b4975c4f4986eca7da382618076f1f609e10fbef`
  was deployed to the VPS.
- 2026-05-31T15:19:29Z - New `HealthArchiveDbIdleTransactionsHigh` alert was
  loaded and inactive.
- 2026-05-31T15:20:00Z - `/api/health`, `/metrics`, public surface
  verification, and baseline drift checks passed.

## Root Cause

- Immediate trigger: Long-lived API request sessions held PostgreSQL
  transactions open after queries had completed, consuming connection pool
  slots until new API requests could not acquire a connection.
- Underlying causes:
  - Route dependencies yielded SQLAlchemy sessions whose cleanup could be
    delayed by the ASGI response lifecycle.
  - Some export paths streamed database-backed iterators, which could keep a
    request transaction open for the duration of a slow client response.
  - Production lacked a database-level idle transaction timeout for the API
    role.
  - The existing backend scrape alert detected the failure after `/metrics`
    became unavailable, but there was no earlier alert on the idle-transaction
    buildup.

## Contributing Factors

- `systemctl is-active healtharchive-api.service` still returned active, so a
  unit-level watchdog alone would not have identified the application-level
  pool exhaustion.
- `/metrics` used the same backend process and database pool as public API
  routes, so the monitoring endpoint failed with the application.
- The most useful failure signature was split across API logs and
  `pg_stat_activity`; neither alone explained the full incident quickly.

## Resolution / Recovery

The recovery sequence was:

1. Restart `healtharchive-api.service` to clear the exhausted pool and restore
   API health.
2. Confirm public frontend, public API health, Prometheus, Alertmanager,
   node_exporter, and notification relay behavior.
3. Configure the production database role with:

   ```sql
   ALTER ROLE healtharchive IN DATABASE healtharchive
     SET idle_in_transaction_session_timeout = '60s';
   ```

4. Patch the repo so API requests use request-scoped SQLAlchemy sessions that
   close immediately after route execution.
5. Materialize export rows before returning `StreamingResponse`.
6. Add `HealthArchiveDbIdleTransactionsHigh` so Prometheus alerts before
   connection-pool starvation.
7. Deploy commit `b4975c4f4986eca7da382618076f1f609e10fbef` through the pinned
   production deploy path.

## Post-Incident Verification

- Public surface checks:
  - `GET /api/health` returned `{"status":"ok","checks":{"db":"ok"}}`.
  - Authenticated `GET /metrics` returned Prometheus metrics.
  - Public frontend and API verification passed after deployment.
- Worker/job health checks:
  - No running crawl jobs were expected during this incident window.
- Storage/mount checks:
  - Not directly involved; existing storage watchdog metrics stayed healthy.
- Integrity checks:
  - No database writes or crawl outputs were repaired as part of this incident.
  - Delayed `pg_stat_activity` checks showed only idle sessions and no
    persistent `idle in transaction` accumulation.
- Alert checks:
  - `HealthArchiveDbIdleTransactionsHigh` was loaded and inactive after
    deployment.
  - Alertmanager relay to Pushover was manually verified.

## Public Communication

- Public status update: none.
- Changelog entry: none.
- Public summary: This was an internal production reliability incident with
  possible API timeouts and no known data loss or data integrity impact. The
  durable fix was applied in repo and deployed to production.

## Open Questions

- None for closure. If the new idle-transaction alert fires again, treat that
  as a new incident or follow-up investigation rather than reopening this note.

## Action Items (TODOs)

- [x] Restore API health with a controlled service restart.
- [x] Configure the production database role with a 60-second idle transaction
  timeout.
- [x] Close request-scoped API database sessions promptly after route
  execution.
- [x] Materialize export rows before streaming responses.
- [x] Add a Prometheus alert for excessive idle transactions.
- [x] Update the production runbook and monitoring docs.
- [x] Add regression tests for request session cleanup, export streaming, and
  alert rule coverage.
- [x] Deploy and verify the fix on production.

## Automation Opportunities

- Safe and implemented:
  - database-level idle transaction timeout;
  - alerting on idle transaction buildup before pool exhaustion.
- Intentionally not primary:
  - automatic API restart on this symptom. A restart can restore service, but
    it hides the underlying transaction leak and systemd may still report the
    unit as active. Prefer the root fix plus early alerting.

## References / Artifacts

- Commit: `b4975c4f4986eca7da382618076f1f609e10fbef`
- Alert rule: `HealthArchiveDbIdleTransactionsHigh`
- Runbook: `../monitoring-and-alerting.md`
- Production setup guardrail: `../../deployment/production-single-vps.md`
- Tests:
  - `../../../tests/test_api_db_session_lifecycle.py`
  - `../../../tests/test_api_exports.py`
  - `../../../tests/test_ops_alert_rules.py`
