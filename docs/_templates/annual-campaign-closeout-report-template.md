# <YEAR> Annual Campaign Closeout Report

**Status:** Draft | Closed | Reopened
**Campaign year:** `<YEAR>`
**Closeout date:** `<YYYY-MM-DD>`
**Production ref:** `<git-sha>`
**Sources:** `<source codes>`
**Evidence log(s):** `<paths or links>`

## Executive Summary

_Review required._

Briefly state whether the campaign is search-ready and research-ready, what was
captured, and any accepted limitations.

## Campaign Results

_Generated from closeout evidence by `scripts/render_annual_closeout_report.py`;
review the Notes column and Source Notes before closure._

| Source | Job/shards | Status | Indexed pages | Backend/provenance | Readiness | Notes |
| --- | ---: | --- | ---: | --- | --- | --- |
| `<code>` | `<id>` | `<status>` | `<count>` | `<backend>` | `<state>` | `<notes>` |

Total indexed annual pages: `<count>`

## Validation Summary

_Generated from closeout evidence by `scripts/render_annual_closeout_report.py`;
rows that mention review still require operator judgment._

| Gate | Result | Evidence |
| --- | --- | --- |
| Annual status / `ha-check` | `<pass/fail>` | `<timestamp/output>` |
| Search verification | `<pass/fail>` | `<artifact>` |
| Public surface | `<pass/fail>` | `<output>` |
| Replay spot checks | `<pass/fail>` | `<URLs/artifacts>` |
| Baseline drift | `<pass/fail>` | `<output>` |
| Automation posture | `<pass/fail>` | `<output>` |
| Active alerts | `<pass/fail>` | `<output>` |
| Backups and NAS replication | `<pass/fail>` | `<output>` |
| Disk/storage headroom | `<pass/fail>` | `<output>` |

## Source Notes

_Review required._

### `<source code>`

- What completed:
- Backend/provenance:
- Known gaps:
- Accepted exclusions:
- Follow-ups:

## Incidents, Deviations, and Accepted Gaps

_Review required._

| Item | Classification | Outcome | Follow-up surface |
| --- | --- | --- | --- |
| `<incident/deviation>` | Closed / Accepted / Ops follow-up / Backlog | `<summary>` | `<doc/link>` |

## Backup, Retention, and Recovery Posture

_Partly generated from closeout evidence by
`scripts/render_annual_closeout_report.py`; NASD, restore-test, and retention
decisions require review._

- Latest local dump:
- Latest Storage Box mirror:
- Latest NASD replicated dump:
- Restore-test status:
- Retention or cleanup decisions:

## Remaining Follow-Ups

_Review required._

| Priority | Item | Owner/surface | Notes |
| --- | --- | --- | --- |
| `<P0/P1/P2>` | `<item>` | `<roadmap/doc>` | `<notes>` |

## Public-Safe Summary Text

_Review required._

Use this for public, partner, or verifier-facing communication.

> `<short factual summary>`

## Operator Handoff Text

_Review required._

Use this for internal handoff.

> `<short operational summary>`

## References

- Annual campaign closeout playbook:
  `docs/operations/playbooks/crawl/annual-campaign-closeout.md`
- Annual campaign scope:
  `docs/operations/annual-campaign.md`
- Production closeout:
  `docs/operations/playbooks/validation/production-closeout.md`
