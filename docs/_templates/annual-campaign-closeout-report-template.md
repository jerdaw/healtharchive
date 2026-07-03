# <YEAR> Annual Campaign Closeout Report

Template intent: write this as a standalone report for people who understand
HealthArchive's purpose but do not know this annual crawl, how it behaved, or
how to interpret its limits. A researcher, scientist, data scientist,
programmer, or operator should be able to read it and understand what was
captured, how the crawl went, what is complete enough to use, where
incompleteness is expected, and how to interpret the archive responsibly.

The renderer may prefill mechanical facts from the evidence package, but the
published report must be authored and reviewed as prose. Do not publish a
generated draft as-is. Rewrite generated tables and placeholders into a natural,
reader-facing report before closeout.

**Status:** Draft | Closed | Reopened
**Campaign year:** `<YEAR>`
**Closeout date:** `<YYYY-MM-DD>`
**Production ref:** `<git-sha>`
**Sources:** `<source codes>`
**Evidence log(s):** `<paths or links>`

## Executive Summary

_Review required._

Write this for readers who know why HealthArchive exists but need the annual
crawl result and caveats. Explain:

- what this annual campaign covered;
- whether the edition is search-ready and research-ready;
- the most important page/snapshot counts;
- the main caveats a researcher should know before using the data.

Avoid broad project preamble. Explain crawl-specific terms and internal
shorthand before relying on them.

## Campaign Results

_May be prefilled from closeout evidence by
`scripts/render_annual_closeout_report.py`; review and rewrite before closure._

Make the generated table understandable to non-operators. Define source codes,
capture paths, and readiness labels in surrounding prose.

| Source | Job/shards | Status | Indexed pages | Backend/provenance | Readiness | Notes |
| --- | ---: | --- | ---: | --- | --- | --- |
| `<code>` | `<id>` | `<status>` | `<count>` | `<backend>` | `<state>` | `<notes>` |

Total indexed annual pages: `<count>`

## Data Completeness and Known Limits

_Review required._

Explain what readers can generally expect to be well covered, and where
incompleteness is expected. Include:

- source boundaries;
- excluded paths or content types;
- non-HTML/PDF/media limitations;
- replay caveats;
- why an absent URL is not proof that a page did not exist.

## Validation Summary

_May be prefilled from closeout evidence by
`scripts/render_annual_closeout_report.py`; rows that mention review still
require operator judgment and reader-facing explanation._

Write validation results in plain language. Explain what each gate means for
someone deciding whether the dataset is usable.

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

For each source, describe the result in reader-friendly terms. Include what was
captured, what is expected to be usable, and what caveats apply.

### `<source code>`

- What completed:
- Backend/provenance:
- Known gaps:
- Accepted exclusions:
- Follow-ups:

## Incidents, Deviations, and Accepted Gaps

_Review required._

Classify operational issues, but explain why each item matters to people using
the dataset.

| Item | Classification | Outcome | Follow-up surface |
| --- | --- | --- | --- |
| `<incident/deviation>` | Closed / Accepted / Ops follow-up / Backlog | `<summary>` | `<doc/link>` |

## Using This Dataset

_Review required._

Explain recommended uses and caution areas. Include guidance for citation or
reproducibility, such as snapshot IDs, captured URLs, capture timestamps,
source codes, replay URLs, and access date.

Include a short subsection for year-to-year keyword, URL, or page-frequency
analysis. Make clear that the default measured universe is HealthArchive's
indexed annual edition, not the complete live source websites. Tell readers to
report denominators, source/year boundaries, accepted gaps, and whether they
used all indexed pages or a matched panel across years.

## Backup, Retention, and Recovery Posture

_May be partly prefilled from closeout evidence by
`scripts/render_annual_closeout_report.py`; NASD, restore-test, and retention
decisions require review._

- Latest local dump:
- Latest cold archive mirror:
- Latest NASD replicated dump:
- Restore-test status:
- Retention or cleanup decisions:

## Remaining Follow-Ups

_Review required._

Explain why the remaining work does not block use of the annual edition, or mark
anything that does block use.

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
