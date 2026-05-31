# 2026 Annual Campaign Closeout Report

**Status:** Closed

**Campaign year:** 2026

**Closeout date:** 2026-05-27

**Production ref validated at closeout:** `adddee8ad135`

**Sources covered:** Health Canada, Public Health Agency of Canada, and
Canadian Institutes of Health Research

This report closes the 2026 annual crawl campaign. It assumes the reader is
already familiar with HealthArchive's purpose, but not with the details of this
crawl, how it behaved, or how to interpret its limits.

The practical question this report answers is:

> What did the 2026 annual campaign capture, how well did it complete, and what
> should researchers and technical users keep in mind when using it?

## Summary

The 2026 annual campaign is complete. HealthArchive captured, indexed, and
validated the annual edition for three sources:

- Health Canada;
- the Public Health Agency of Canada (PHAC);
- the Canadian Institutes of Health Research (CIHR).

The campaign produced **942,479 indexed annual pages** across those sources. At
closeout, the full public HealthArchive database contained **1,200,659 indexed
snapshots** across all indexed material.

All three sources are search-ready. The edition is suitable for bounded
research, data analysis, citation, replay spot checks, and API workflows.

The main caveat is that this is a documented web crawl, not a perfect copy of
every related web object. The strongest layer is public HTML pages inside the
configured source boundaries. PDFs, videos, third-party assets, duplicate URL
variants, and one PHAC subsection have important limitations described below.

## Campaign Scope

The campaign covered the configured annual source areas for:

- Health Canada on Canada.ca;
- PHAC on Canada.ca;
- CIHR on `cihr-irsc.gc.ca`.

It did not attempt to crawl all of Canada.ca, all Government of Canada health
content, all CIHR-adjacent hosts, or every file linked from captured pages.

That distinction matters most for Health Canada and PHAC. Both live on
Canada.ca, but HealthArchive treats them as separate source scopes. A Canada.ca
page can be public and still be outside this campaign if it does not fall within
the configured Health Canada or PHAC source rules.

## Campaign Results

| Source | Indexed annual pages | Capture result | Closeout interpretation |
| --- | ---: | --- | --- |
| Health Canada | 262,567 | WARC fallback capture | Search-ready and accepted |
| PHAC | 121,940 | WARC fallback capture | Search-ready and accepted, with a known public-health-notices gap |
| CIHR | 557,972 | Browsertrix WARC capture | Search-ready and accepted, with documented media and URL-variant limits |

Total indexed annual pages: **942,479**.

These are indexed page counts. They should not be read as counts of official
publications, unique policy documents, PDFs, or live-site URLs.

## How The Crawl Went

The campaign completed successfully, but it required operational intervention.

Health Canada and PHAC were the most difficult sources because both are on
Canada.ca. The primary capture path repeatedly hit transport instability. Rather
than keep retrying indefinitely, HealthArchive switched those sources to a
fallback WARC capture path. That fallback path produced usable WARC captures and
indexed pages, and it is accepted for this annual edition.

PHAC also had one unstable subsection: public health notices. That subsection
was excluded from the 2026 annual edition after repeated crawl instability. It
should be treated as incomplete.

CIHR completed through Browsertrix WARC capture and produced the largest
indexed count in the campaign. CIHR did not require the same fallback path used
for the Canada.ca sources. Some CIHR URL patterns and media-heavy areas were
limited intentionally to keep the crawl bounded and useful.

The campaign also surfaced several operational issues that were fixed before
closeout: root disk pressure from database backup handling, frontend cache
growth, search alert noise from multi-worker metrics, and automation verifier
inventory drift. Those issues are recorded for provenance, but they do not block
use of the annual edition.

## What To Expect From The Data

The 2026 edition is strongest for public HTML pages inside the configured source
boundaries.

For those pages, users can generally expect:

- source attribution;
- captured URLs;
- capture timestamps;
- indexed text and metadata;
- searchable records through the public archive;
- API access for technical workflows;
- WARC-backed replay where replay is technically supported.

This makes the edition useful for finding captured pages, building reproducible
samples, citing specific snapshots, analyzing indexed page text, and checking
what HealthArchive captured for a defined annual source set.

## Known Limits

The most important interpretation rule is simple: a missing URL is not proof
that a page never existed. It may have been outside scope, excluded, represented
by another URL variant, not discovered, not HTML, or unsuitable for replay.

Known limits for this edition:

| Area | What to know |
| --- | --- |
| Source boundaries | The campaign covers the configured Health Canada, PHAC, and CIHR source areas only. |
| PHAC public health notices | This subsection is an accepted gap and should not be treated as complete. |
| Non-HTML files | PDFs, office documents, ZIP files, videos, and similar assets are not the strength of this edition. |
| Third-party assets | Scripts, fonts, analytics, media players, and embeds from other hosts may be missing or incomplete. |
| Replay | Replay is useful evidence, but dynamic pages may not visually match the live site perfectly. |
| CIHR URL variants | Query-string and fragment variants were limited to avoid duplicate crawl expansion. |
| CIHR media-heavy paths | `asl-video` and broad media/archive expansion were intentionally limited. |

These limits define how the data should be used. They do not make the campaign
unsuccessful.

## Year-To-Year Keyword And URL Analysis

The missing-URL caveat does not prevent useful year-to-year analysis. It does
mean the claim has to name the measured universe.

This edition supports claims such as:

> Among pages captured and indexed by HealthArchive in the 2026 annual edition,
> keyword or URL pattern X appeared with frequency Y.

It does not, by itself, support stronger claims such as:

> Across the complete live source websites, keyword or URL pattern X appeared
> with frequency Y.

For year-to-year keyword, URL, or page-frequency comparisons, use the indexed
annual edition as the denominator unless you have done additional completeness
validation. Report the source, year, number of indexed pages searched, number
of matching pages, and whether the analysis used all indexed pages or a matched
panel of URLs/page groups that appeared in multiple years.

Recommended practice:

- compare sources separately before aggregating Health Canada, PHAC, and CIHR;
- normalize raw counts, for example matches per 1,000 indexed pages;
- document accepted gaps, especially the PHAC public-health-notices exclusion;
- keep non-HTML files out of the denominator unless they were separately
  extracted and validated;
- use stable fields such as source code, snapshot ID, captured URL, normalized
  URL group, capture timestamp, and campaign year;
- consider a matched-panel analysis when the question is about language change
  over time rather than annual collection size.

In short: keyword trends are appropriate when framed as trends within
HealthArchive's indexed annual editions. They become claims about the full live
websites only after separate evidence shows the annual editions are complete
enough for that stronger claim.

## Source Notes

### Health Canada

Health Canada closed with **262,567 indexed annual pages**.

The source is search-ready and accepted. It should be understood as broad
coverage of Health Canada's configured public Canada.ca source area, including
English and French entry points.

The key provenance note is the fallback WARC capture path. Canada.ca transport
behavior made the primary path unstable, so HealthArchive used fallback capture
to produce a usable annual edition. Any methods section using this source should
mention that fallback capture was used.

Avoid interpreting this source as a complete crawl of all Canada.ca health
content or as a complete capture of non-HTML assets.

### Public Health Agency of Canada

PHAC closed with **121,940 indexed annual pages**.

The source is search-ready and accepted. It should be understood as broad
coverage of PHAC's configured public Canada.ca source area, including English
and French entry points.

Like Health Canada, PHAC used the fallback WARC capture path because Canada.ca
transport behavior made the primary path unstable.

The main PHAC caveat is public health notices. That subsection was excluded
after repeated instability and should not be treated as complete in this annual
edition. Studies that depend on comprehensive PHAC public health notice coverage
should not rely on the 2026 annual edition alone for that subsection.

### Canadian Institutes of Health Research

CIHR closed with **557,972 indexed annual pages**.

The source is search-ready and accepted. It should be understood as broad
coverage of public CIHR HTML pages on `cihr-irsc.gc.ca`, including English and
French entry points.

CIHR used Browsertrix WARC capture. An optional packaged output format did not
finalize, but the WARC capture succeeded. Because WARC is the canonical archive
format for search and replay, that optional package failure did not block
closeout.

The main CIHR caveats are scope controls. Query strings, fragments, top-level
binary files, media expansion, archive-file expansion, and `asl-video` paths are
not completeness claims for this edition.

## Recommended Use

Good uses:

- search for captured pages from the three annual sources;
- cite specific HealthArchive snapshot records;
- build reproducible samples using source code, snapshot ID, URL, and capture
  timestamp;
- analyze text and metadata from the indexed HTML layer;
- compare year-to-year keyword or URL frequencies within the indexed annual
  editions, using explicit denominators and caveats;
- use the API for repeatable queries and exports;
- use replay as supporting evidence when a captured page replays correctly.

Use caution when:

- estimating exact live-site page counts;
- treating missing URLs as evidence that content did not exist;
- describing keyword frequency as a complete live-site frequency without
  additional completeness validation;
- analyzing PDFs, videos, images, office documents, or ZIP files;
- doing visual comparisons that depend on live scripts or third-party assets;
- comparing Health Canada, PHAC, and CIHR without accounting for their different
  capture paths and source boundaries.

For reproducibility, store source code, snapshot ID, captured URL, and capture
timestamp. Page titles are useful, but they are less stable than those fields.

## Citation And Methods Notes

When citing a HealthArchive record or building a derived dataset, include:

- source name and source code;
- captured URL;
- snapshot ID;
- capture timestamp;
- HealthArchive page or replay URL when available;
- date accessed;
- any relevant caveat from this report.

A methods note for this edition should mention that:

- the analysis used the 2026 annual edition for Health Canada, PHAC, and CIHR;
- Health Canada and PHAC were accepted through fallback WARC capture;
- PHAC public health notices were not treated as complete;
- CIHR media-heavy and duplicate-URL areas were intentionally limited;
- the analysis was limited to indexed HTML pages unless otherwise verified.

## Public Access

Public archive:

- `https://healtharchive.ca/archive`

Public API:

- `https://api.healtharchive.ca`

At closeout, validation confirmed that the public website, API health endpoint,
source list, exports, search, snapshot detail, raw snapshot access, replay,
change feed, and bilingual frontend pages were reachable.

## Validation

Closeout validation passed on 2026-05-27.

| Validation area | Result | Meaning |
| --- | --- | --- |
| Annual crawl status | Passed | All three campaign sources reached the indexed state. |
| Search readiness | Passed | The annual data was available through search. |
| Public API | Passed | API health, source, search, snapshot, export, and change surfaces responded. |
| Public frontend | Passed | Public English and French archive pages were reachable. |
| Replay | Passed | Representative replay worked for at least one captured record. |
| Baseline drift | Passed | Production matched the expected operational baseline. |
| Automation posture | Passed | Required operations timers and monitors were active. |
| Alerts | Passed | No active HealthArchive alerts were firing at closeout. |
| Backups | Passed | Local, Storage Box, and NASD backup paths had the expected database dump. |
| Docker/cache metrics | Passed | Runtime and frontend cache metrics were readable by monitoring. |
| Disk and storage headroom | Passed | Root disk and Storage Box had acceptable free space. |

Validation confirms that the closed annual edition is searchable, publicly
reachable, operationally healthy, backed up, and documented. It does not claim
perfect crawl completeness outside the stated source boundaries and caveats.

## Accepted Gaps And Resolved Issues

| Item | Classification | Impact |
| --- | --- | --- |
| Health Canada fallback WARC capture | Accepted | Usable, with fallback capture noted as provenance. |
| PHAC fallback WARC capture | Accepted | Usable, with fallback capture noted as provenance. |
| PHAC public-health-notices exclusion | Accepted gap | That subsection is incomplete in this edition. |
| CIHR optional packaged output failure | Accepted | WARC search and replay succeeded, so closeout was not blocked. |
| CIHR media, binary, archive, query, and fragment limits | Accepted scope boundary | The edition focuses on public HTML pages, not exhaustive media capture. |
| Annual output directory reconciliation | Closed | Crawl outputs were reconciled into the expected production layout. |
| Root disk pressure from database backups | Closed | Backup retention and mirroring were corrected. |
| Frontend cache growth | Closed | Cache storage, cleanup, and monitoring were corrected. |
| Search metrics alert noise | Closed | Metrics were corrected for multi-worker API behavior. |
| Automation verifier inventory drift | Closed | Expected production timers are now recognized by the verifier. |

## Backup And Recovery Posture

The backup chain was healthy at closeout.

Latest confirmed dump:

- `healtharchive_2026-05-27T033808Z.dump`

The dump existed in:

- local VPS backup cache;
- Storage Box mirror;
- NASD replicated logical-dump ingest path.

The dump was about 1.98 GB. The mirrored backup set was about 9.89 GB at
closeout.

## Remaining Follow-Ups

The annual campaign is closed. Remaining items are follow-ups, not blockers.

| Priority | Follow-up | Why it remains |
| --- | --- | --- |
| P1 | Routine quarterly operations evidence | Keeps restore, backup, and monitoring evidence fresh. |
| P1 | External validation and outreach | The edition is ready for external review and use. |
| P2 | Search and index tuning if broad searches prove slow | Useful optimization, not a closeout blocker. |
| P2 | Storage hot-path recurrence investigation if symptoms return | Only needed if storage staleness recurs. |

## Public Summary

HealthArchive completed its 2026 annual capture cycle for Health Canada, PHAC,
and CIHR. The edition is indexed, searchable, and validated for public use, with
942,479 indexed annual pages across the three sources. Health Canada and PHAC
were accepted through fallback WARC capture, PHAC public health notices are a
known incomplete area, and CIHR media-heavy and duplicate-URL areas were
intentionally limited.

## Operator Handoff

The 2026 annual campaign is closed. All three sources are indexed and
search-ready. Production validation, public surface verification, monitoring
posture, and backup replication passed at closeout.

Do not continue annual-crawl recovery work for this campaign unless new evidence
shows a specific source defect. Future work should focus on external validation,
routine operations evidence, and targeted improvements found through real user
sampling.

## References

- Annual campaign scope: `docs/operations/annual-campaign.md`
- Annual campaign closeout playbook:
  `docs/operations/playbooks/crawl/annual-campaign-closeout.md`
- Production closeout gate:
  `docs/operations/playbooks/validation/production-closeout.md`
- Current work tracker: `docs/operations/current-work-tracker.md`
- Ops roadmap: `docs/operations/healtharchive-ops-roadmap.md`
