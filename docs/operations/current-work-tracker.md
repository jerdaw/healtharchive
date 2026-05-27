# Current Work Tracker

**Last updated:** 2026-05-27
**Purpose:** durable handoff for current fixes, crawl progress, and next checks.
**Audience:** maintainers and operators picking up after local chat history or
terminal scrollback is gone.

This file is the short current-state tracker. Keep it factual and update it
after meaningful production checks, deploys, or crawl-status changes.

Canonical follow-up surfaces:

- Current ops posture and routine tasks: [HealthArchive ops roadmap](healtharchive-ops-roadmap.md)
- Not-yet-implemented technical backlog: [future roadmap](../planning/roadmap.md)
- Active external-validation work: [admissions strengthening plan](../planning/2026-02-admissions-strengthening-plan.md)
- Historical implementation record: [implemented plans](../planning/implemented/README.md)

## Current Crawl Progress

Last production evidence was operator-provided on 2026-05-27 via `ha-check`.

| Source | Job | Status | Indexed pages | Research/search readiness | Notes |
| --- | ---: | --- | ---: | --- | --- |
| HC | `6` | `indexed` | `262567` | search-ready, research-ready | `playwright_warc` fallback provenance |
| PHAC | `7` | `indexed` | `121940` | search-ready, research-ready | `playwright_warc` fallback provenance; no targeted recrawl needed |
| CIHR | `8` | `indexed` | `557972` | search-ready, research-ready | Browsertrix WARC capture accepted after ZIM finalization failure |
| **Total** | | | **`942479`** | **search-ready** | `total=3 indexed=3 in_progress=0 failed=0 missing=0 errors=0` |

Current campaign conclusion:

- The 2026 annual campaign is indexed and usable for public search/replay.
- `ha-check` reports `Ready for search: YES`.
- No crawl jobs are running; this is expected because the annual campaign is
  fully indexed.
- Worker, crawl auto-recover, and storage hot-path auto-recover services/timers
  are healthy. Auto-recover is skipping with `no_start_candidates`.
- CIHR final failed URL review is closed: 25 final retry-failed page/route URLs
  already had exact job `8` snapshot coverage; the lone uncovered URL was a
  render-asset image and accepted as a non-page gap.
- Annual output directories for jobs `6`, `7`, and `8` were converted during a
  maintenance window on 2026-05-06. Replay smoke returned `200` for HC, PHAC,
  and CIHR after the conversion.
- Root disk and Storage Box headroom are healthy as of the 2026-05-27 check:
  root `49%` used, Storage Box `76%` used.

## Fixes And Changes Landed

Recent shipped work, in dependency order:

- Public search performance:
  - use stored search vectors for public text search;
  - avoid runtime dedup work for PostgreSQL text search;
  - keep broad/default search ranking on the fast path.
- Public verifier hardening:
  - use `view=pages` fallback for snapshot-id discovery when primary search is
    slow;
  - keep raw snapshot checks on a separate timeout budget.
- CIHR WARC-complete/ZIM-finalization recurrence prevention:
  - WARC-complete Browsertrix runs with final crawlStatus `pending=0` and
    discoverable WARCs can be accepted for indexing instead of starting another
    resume crawl.
- PHAC policy follow-through:
  - keep Browsertrix-first scheduling with labeled `playwright_warc` fallback
    for now;
  - keep temporary high-churn exclusions until separate live verification proves
    those Browsertrix paths are stable.
- Annual output-dir topology:
  - jobs `6`, `7`, and `8` were moved away from direct per-job annual `sshfs`
    mounts during the 2026-05-06 maintenance window;
  - future checks should use the annual tiering script as the dry-run detector.
- DB backup and root-disk recovery:
  - repo-managed DB backup timer now keeps one successful local dump and mirrors
    successful dumps to Storage Box;
  - NASD pulls the Storage Box mirror into the protected automated ingest path;
  - the root-disk rescue backup duplicate was removed after canonical backups
    were verified.
- Frontend cache containment:
  - the live frontend was redeployed with `/app/.next/cache` mounted on the
    `healtharchive-frontend-next-cache` Docker volume;
  - Docker runtime metrics and frontend cache maintenance timers are enabled.
- Search alert hygiene:
  - `/api/search` runtime metrics now include `pid` labels for multi-worker API
    processes;
  - `HealthArchiveSearchErrorsSustained` and dashboards aggregate those
    process-local series;
  - the warning did not refire after deployment and a wait window on
    2026-05-27.
- Repo hygiene:
  - completed plans were archived/compressed;
  - stale PRs and branches were closed/deleted;
  - accepted dependency updates were landed through human-authored commits;
  - no open PRs remained after the 2026-05-06 cleanup.

Relevant recent commits:

- `9a2cbedb` - make search metrics multi-worker safe
- `1206f4b2` - make docker textfile metrics readable
- `c26d2963` - bound frontend cache growth
- `e13d7689` - align backup pull with NAS ingest path
- `cc8c81d1` - roadmap follow-through optimization
- `4d0f0104` - frontend audit follow-up tracking
- `cad5c1df` - maintenance follow-through and jsdom update
- `fb46cdef` - annual tiering and PHAC follow-through
- `ca25d8ea` - CIHR failed URL review
- `3911f9d6` - search follow-through outcome

## Remaining Fixes To Track

Keep these in the roadmap until implemented or explicitly retired:

| Area | Current tracker | Next action |
| --- | --- | --- |
| Broad `q=...&view=pages` search latency | [future roadmap](../planning/roadmap.md#searchapi-performance-backend) | Re-test warm-cache behavior before designing DB/index-plan changes. |
| Large indexing progress visibility | [future roadmap](../planning/roadmap.md#crawling-indexing-reliability-backend) | Add heartbeats/logging/metrics so long indexing runs are visibly healthy. |
| WARC-complete finalization acceptance metric | [future roadmap](../planning/roadmap.md#crawling-indexing-reliability-backend) | Add metric/alert only if this accepted state recurs or needs operator visibility. |
| Annual edition/shard convergence | [future roadmap](../planning/roadmap.md#crawling-indexing-reliability-backend) | Add richer target ledgers, shard UI, and post-run coverage tooling. |
| Frontend Next/PostCSS advisory | [future roadmap](../planning/roadmap.md#reliability-security-and-ci) | Wait for an upstream-safe Next/PostCSS release; avoid npm's downgrade suggestion. |
| Frontend ESLint 10 | [future roadmap](../planning/roadmap.md#reliability-security-and-ci) | Retry only after the React/Next ESLint plugin stack supports ESLint 10. |
| External validation/admissions evidence | [admissions strengthening plan](../planning/2026-02-admissions-strengthening-plan.md) | Send the first outreach batch and record public-safe outcomes in the mentions log. |
| Quarterly evidence | [ops roadmap](healtharchive-ops-roadmap.md) | Run restore test, dataset release check, automation posture check, and adoption signal entry each quarter. |

## Re-Establish State In A New Chat

From the local repo:

```bash
cd /home/jer/repos/vps/healtharchive/healtharchive
git status --short --branch
git log -8 --oneline
gh pr list --state open
git ls-remote --heads origin
```

Expected after the 2026-05-27 cleanup:

- working tree clean except ignored local environment artifacts;
- active branch is `main`;
- no open PRs;
- remote heads are `main` and `gh-pages`.

For an operator-guided production check on the VPS, start with read-only
commands:

```bash
cd /opt/healtharchive
set -a; source /etc/healtharchive/backend.env; set +a

./.venv/bin/healtharchive annual-status --year 2026 --json --sources hc phac cihr
systemctl is-active postgresql.service healtharchive-worker.service healtharchive-api.service healtharchive-replay.service healtharchive-storagebox-sshfs.service
sudo --preserve-env=HEALTHARCHIVE_DATABASE_URL,HEALTHARCHIVE_ARCHIVE_ROOT \
  ./.venv/bin/python3 scripts/vps-annual-output-tiering.py --year 2026
curl -s http://127.0.0.1:9100/metrics | rg '^healtharchive_replay_smoke_|^healtharchive_tiering_' || true
```

Use the standard deploy helper and public verifier only after repo changes are
committed, pushed, and ready for a pinned-ref deploy.

## Update Rules

- Update this file after any production crawl-progress change, public verifier
  result that changes confidence, or maintenance-window action.
- Keep durable facts here; put detailed implementation checklists in
  `docs/planning/` and move completed plans to `docs/planning/implemented/`.
- Keep unresolved work in `docs/planning/roadmap.md`; do not leave completed
  work in the active backlog.
- Do not include secrets, private contact details, or non-human authorship attribution.
