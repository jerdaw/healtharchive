# Public Search and CIHR Follow-Through

**Status:** Implemented
**Created:** 2026-05-05
**Completed:** 2026-05-06
**Primary incident:** [CIHR WARC-complete crawl resumed after ZIM build failure](../../operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md)

## Scope

This plan closed the remaining engineering and operator follow-through after
the 2026 CIHR recovery:

- restore public `/api/search` latency after the dataset grew to about 1.2M
  snapshots;
- keep public-surface verification from being blocked by one slow search mode;
- prevent WARC-complete Browsertrix crawls from entering a resume loop after an
  optional ZIM finalization failure;
- review and document the final CIHR failed URLs.

## Outcomes

- Public search was restored to verifier-safe levels through stored
  `snapshots.search_vector`, stored snapshot deduplication, and a lean default
  broad-query rank path.
- The public-surface verifier now falls back to `view=pages` for snapshot-id
  discovery while preserving the original search failure, and raw snapshot
  checks have a separate timeout.
- WARC-complete/ZIM-finalization recurrence prevention is implemented:
  Browsertrix runs with final crawlStatus `pending=0` and discoverable WARCs
  can be accepted for indexing instead of automatically starting another resume
  crawl.
- CIHR job `8` was accepted, indexed, and documented as research-ready with
  `557972` indexed pages.
- The CIHR failed-URL review found 26 final retry exhaustion events. Exact job
  `8` snapshot coverage existed for 25 page/route URLs, and the lone uncovered
  URL was a render-asset image accepted as a non-page gap.
- Annual output-dir mount topology follow-through was completed separately on
  2026-05-06 for jobs `6`, `7`, and `8`; replay smoke stayed healthy for HC,
  PHAC, and CIHR.
- The preserved VPS branch `prod-pre-a3e0dece` was reviewed and discarded
  because current deployed `main` already contained the relevant fixes plus
  newer annual-edition, replay, search, and incident documentation work.

## Evidence

- Deployed through `fb46cdef1c09ce07027e8128bd3fd40ac5a988ef`.
- Production deploy helper, live baseline drift check, and public-surface
  verification passed after deployment.
- Final warm-up search samples after the performance deploys:
  - `q=covid&pageSize=1`: `3.252s`, `5.476s`, `2.487s`, `2.389s`, `1.959s`
  - `q=covid&pageSize=1&view=pages`: `8.959s`, `6.742s`, `4.787s`, `4.566s`,
    `4.285s`
  - `pageSize=1`: `6.793s`, `1.885s`, `3.678s`, `2.339s`, `2.067s`
  - `pageSize=1&source=cihr`: `5.919s`, `2.329s`, `2.502s`, `3.070s`,
    `2.491s`

## Canonical Docs Updated

- [HealthArchive ops roadmap](../../operations/healtharchive-ops-roadmap.md)
- [Roadmap backlog](../roadmap.md)
- [CIHR WARC-complete incident](../../operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md)
- [PHAC HTTP/2 incident](../../operations/incidents/2026-03-23-annual-crawl-phac-canada-ca-http2-thrash.md)
- [Post-reboot tiering verification playbook](../../operations/playbooks/validation/post-reboot-tiering-verify.md)
- [CLI reference](../../reference/cli-commands.md)

## Remaining Backlog

- Optional DB/index-plan tuning for broad `q=...&view=pages` search remains in
  the roadmap if repeated warm-cache samples exceed the desired response
  target.
- Routine quarterly ops evidence collection continues under the ops roadmap.

## Historical Context

The detailed task-by-task implementation checklist was compressed after
completion. Full historical detail remains available in git history.
