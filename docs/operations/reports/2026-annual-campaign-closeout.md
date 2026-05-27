# 2026 Annual Campaign Closeout Report

**Status:** Closed
**Campaign year:** 2026
**Closeout date:** 2026-05-27
**Production ref:** `adddee8ad135`
**Sources:** `hc`, `phac`, `cihr`
**Evidence log:** `/tmp/ha-production-closeout-20260527T181251Z.log` on the
production VPS

## Executive Summary

The 2026 HealthArchive annual capture campaign is closed. Health Canada, PHAC,
and CIHR are indexed and search-ready for the 2026 annual edition. Production
validation on 2026-05-27 showed healthy API, search, replay, frontend, metrics,
alerts, backups, NAS replication, Docker/cache posture, and disk headroom.

The annual jobs contain `942479` indexed pages across the three campaign
sources. The public API snapshot total at closeout was `1200659`, which includes
all indexed snapshots, not only the 2026 annual campaign.

The campaign completed with documented provenance differences:

- Health Canada and PHAC are search-ready through labeled `playwright_warc`
  fallback captures.
- CIHR is search-ready through Browsertrix WARC capture.
- CIHR's ZIM finalization problem was accepted because WARC capture and search
  indexing are the canonical readiness path.

## Campaign Results

| Source | Job | Status | Indexed pages | Backend/provenance | Readiness | Notes |
| --- | ---: | --- | ---: | --- | --- | --- |
| `hc` | `6` | `indexed` | `262567` | `playwright_warc`, fallback-active | search-ready | Fallback capture is labeled and accepted. |
| `phac` | `7` | `indexed` | `121940` | `playwright_warc`, fallback-active | search-ready | PHAC fallback policy remains accepted for this edition. |
| `cihr` | `8` | `indexed` | `557972` | `browsertrix`, normal | search-ready | WARC capture accepted after ZIM finalization failure. |

Total indexed annual pages: `942479`

`ha-check` at `2026-05-27T18:12:51Z` reported:

- `Ready for search: YES`
- `total=3`
- `indexed=3`
- `in_progress=0`
- `failed=0`
- `missing=0`
- `errors=0`
- no running jobs

## Validation Summary

| Gate | Result | Evidence |
| --- | --- | --- |
| Annual status / `ha-check` | Pass | `Ready for search: YES`; all 3 jobs indexed; no running jobs. |
| Search/public API | Pass | `verify_public_surface.py` found all required sources and a searchable snapshot. |
| Replay spot check | Pass | Replay URL for CIHR snapshot `1444021` returned `200`. |
| Frontend public pages | Pass | English and French archive, changes, digest, exports, researchers, brief, cite, methods, governance, status, impact, and snapshot pages returned `200`. |
| Baseline drift | Pass | `check_baseline_drift.py --mode live --no-write` reported `PASS: No drift detected`. |
| Automation posture | Pass | `verify_ops_automation.sh` on deployed `adddee8ad135` reported `failures=0`, `warnings=0`, `unexpected_timers=0`. |
| Active alerts | Pass | Prometheus returned no active `HealthArchive*` alerts. |
| Backups and NAS replication | Pass | Latest dump `healtharchive_2026-05-27T033808Z.dump` exists locally, on Storage Box, and on NASD. |
| Docker/cache metrics | Pass | Docker runtime metrics healthy; frontend fetch cache below threshold; `node_textfile_scrape_error 0`. |
| Disk/storage headroom | Pass | Root disk `50%` used; Storage Box `76%` used. |

## Source Notes

### Health Canada (`hc`)

- What completed: job `6` reached `indexed` with `262567` pages.
- Backend/provenance: `playwright_warc` fallback path, labeled
  `fallback-active`.
- Known gaps: none blocking search readiness at closeout.
- Accepted exclusions: inherited campaign scope/exclusion policy.
- Follow-ups: none required for the 2026 annual edition.

### PHAC (`phac`)

- What completed: job `7` reached `indexed` with `121940` pages.
- Backend/provenance: `playwright_warc` fallback path, labeled
  `fallback-active`.
- Known gaps: PHAC high-churn policy remains documented in annual scope.
- Accepted exclusions: PHAC temporary public-health-notices exclusion remains
  accepted for this edition until a separate live verification proves those
  Browsertrix paths are stable.
- Follow-ups: no targeted PHAC recrawl is required for the 2026 annual edition.

### CIHR (`cihr`)

- What completed: job `8` reached `indexed` with `557972` pages.
- Backend/provenance: Browsertrix WARC capture, normal rescue state.
- Known gaps: ZIM finalization failed, but WARC capture and search indexing are
  canonical for annual readiness.
- Accepted exclusions: non-page/render-asset gap accepted after failed-URL
  coverage review.
- Follow-ups: none required for 2026 annual search readiness.

## Incidents, Deviations, and Accepted Gaps

| Item | Classification | Outcome | Follow-up surface |
| --- | --- | --- | --- |
| PHAC canada.ca HTTP/2 churn and fallback path | Accepted | PHAC indexed through labeled `playwright_warc` fallback; no targeted recrawl required. | Annual scope and ops roadmap |
| CIHR WARC-complete / ZIM finalization failure | Accepted | Browsertrix WARC capture indexed successfully; ZIM is optional for annual readiness. | Incident notes |
| Annual output directory topology conversion | Closed | Jobs `6`, `7`, and `8` converted from direct hot `sshfs` mounts to the expected topology; replay checks passed. | Ops roadmap |
| Root disk full from DB backup cache | Closed | Local DB backup retention now keeps one successful dump and mirrors successful dumps to Storage Box; rescue duplicates removed after verification. | Incident notes and production runbook |
| Frontend Next.js cache growth | Closed | Frontend cache externalized to a Docker volume; runtime metrics and cache maintenance are enabled. | Decision record and ops docs |
| Search alert noise from multi-worker metrics | Closed | Search metrics now include `pid`; alerts and dashboards aggregate process-local series. | Monitoring docs |
| Automation verifier stale timer inventory | Closed | `verify_ops_automation.sh` recognizes expected timer units; deployed ref `adddee8ad135` verifies cleanly. | Commit `adddee8ad135` |

## Backup, Retention, and Recovery Posture

- Latest local VPS dump:
  `/srv/healtharchive/backups/healtharchive_2026-05-27T033808Z.dump`
- Latest Storage Box mirror:
  `/srv/healtharchive/storagebox/backups/db/healtharchive_2026-05-27T033808Z.dump`
- Latest NASD replicated dump:
  `/volume1/automated-backup-ingest/service-backups/healtharchive/logical-dumps/healtharchive_2026-05-27T033808Z.dump`
- Backup metrics:
  - `healtharchive_db_backup_last_success 1`
  - local backup bytes: `1978095044`
  - mirror bytes: `9890216197`
- Retention decision:
  - VPS local backup cache keeps a short local cache;
  - Storage Box retains mirrored successful dumps;
  - NASD protected ingest path keeps the replicated logical dumps.

## Remaining Follow-Ups

| Priority | Item | Surface | Notes |
| --- | --- | --- | --- |
| P1 | Routine quarterly ops and evidence collection | `docs/operations/healtharchive-ops-roadmap.md` | Continue normal validation cadence. |
| P2 | Broad `q=...&view=pages` DB/index-plan tuning | `docs/operations/healtharchive-ops-roadmap.md` | Only if repeated warm-cache samples exceed the desired target. |
| P2 | Hot-path staleness root-cause investigation | `docs/planning/2026-02-06-hotpath-staleness-root-cause-investigation.md` | Continue only if storage Errno 107 symptoms recur. |
| P1 | External validation and outreach | `docs/planning/2026-02-admissions-strengthening-plan.md` | Annual campaign is no longer blocking outreach. |

## Public-Safe Summary Text

Use this for public, partner, or verifier-facing communication:

> HealthArchive completed its 2026 annual capture cycle for Health Canada,
> the Public Health Agency of Canada, and CIHR. The 2026 edition is indexed and
> searchable, with provenance notes preserved for fallback capture paths and
> accepted crawl limitations.

## Operator Handoff Text

Use this for internal handoff:

> The 2026 annual campaign is closed. Jobs `6`, `7`, and `8` are indexed and
> search-ready with `942479` annual pages. Production closeout passed for
> baseline drift, public surface, automation posture, active alerts, backups,
> NASD replication, Docker/cache metrics, and disk headroom. Remaining work is
> routine ops, optional search tuning, recurrence-driven storage investigation,
> and external validation/outreach.

## References

- Annual campaign scope: `docs/operations/annual-campaign.md`
- Annual campaign closeout playbook:
  `docs/operations/playbooks/crawl/annual-campaign-closeout.md`
- Generic production closeout:
  `docs/operations/playbooks/validation/production-closeout.md`
- Current work tracker: `docs/operations/current-work-tracker.md`
- Ops roadmap: `docs/operations/healtharchive-ops-roadmap.md`
