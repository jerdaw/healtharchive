# 2026-03-23: Annual Crawl Content-Cost and Scope Diagnosis

**Plan Version**: v1.1
**Status**: Active
**Scope**: Diagnose which content classes and URL families are consuming the most crawl time, storage, and restart budget in the 2026 annual campaign, then use that evidence to refine scope toward a "user-facing website" backup rather than letting every downloadable asset expand the crawl frontier by default.

## Why this plan exists

The current annual-crawl problem is not just "the crawl is taking a long time".
We need to determine **what** is causing time/space pressure and repeated
failures.

This plan treats the problem as a classification and evidence problem first:

- Which URL families repeatedly cause timeout/restart churn?
- Which content classes consume the most WARC bytes?
- Which of those classes are actually required for the product goal?

The intended product goal for this plan is:

- preserve the **user-facing website**
- preserve **HTML pages and render-critical assets**
- preserve linked documents/downloads only when they are intentionally judged to
  add archival value
- avoid turning the annual campaign into a backup of every large document,
  dataset, archive, or media file by default

This is consistent with the existing HC/PHAC remediation direction:

- top-level binary/document/media links are already excluded from canada.ca
  queueing where they caused timeout thrash
- DAM scope is already limited to web-renderable assets for HC/PHAC

However, that strategy has not yet been generalized into a deliberate,
evidence-backed annual-crawl diagnostic and scope policy.

## Current state summary

Known facts from the current repo state:

- The annual campaign is completeness-first within explicit source boundaries,
  with no page/depth caps.
- HC and PHAC already exclude top-level `pdf|mp4|zip|docx|pptx|xlsx` URLs from
  queueing and only allow renderable DAM assets.
- CIHR still uses broad `scopeType=host` behavior.
- Existing ops tools can already show:
  - crawl progress/stall state,
  - restart budgets,
  - timeout/http error counters,
  - recent WARC mtimes,
  - recent timeout/HTTP2 signals in combined logs.
- Existing incident docs show multiple failure patterns:
  - binary/document timeout thrash on HC/PHAC,
  - storage instability,
  - PHAC `ERR_HTTP2_PROTOCOL_ERROR`,
  - PHAC no-progress resume-loop behavior after the HTTP/2 storm was reduced.

What we **do not** have yet:

- a single report that tells us which content classes dominate bytes, failures,
  or repeated retries for a crawl job
- a canonical evidence-based policy for which non-HTML content classes are
  allowed to expand the crawl frontier during annual captures

## Planning update after review

This plan was tightened after a reality-check review.

The review conclusion was:

- the diagnosis-first direction is correct
- the first implementation should be narrower than a fully generalized
  all-sources report
- the report should be lightweight and safe mid-crawl by default
- PHAC should be the first pilot source before generalizing to HC and CIHR
- policy decisions should distinguish:
  - frontier-expanding URLs
  - render-critical subresources
  - optional linked-download capture

This version reflects that narrower execution path.

## Goals

- Identify the dominant time/space/failure drivers for annual crawl jobs using
  read-only evidence.
- Distinguish:
  - render-critical website content
  - downloadable but lower-priority artifacts
  - likely out-of-scope bulk/dataset/media content
- Produce a source-specific decision basis for scope refinement without relying
  on arbitrary finish-time targets.
- Update canonical crawl policy/docs so future annual campaigns can apply the
  findings consistently.

## Non-goals

- Imposing hard finish-time SLAs for annual crawls.
- Broadening source scope.
- Deleting existing WARCs as part of this plan.
- Making speculative VPS-side scope tweaks without evidence.
- Replacing Browsertrix/Zimit or redesigning the whole crawl stack.

## Constraints

- Production VPS access is operator-only.
- Investigation must be safe to run mid-crawl unless explicitly marked as
  maintenance-only.
- New diagnostics should be read-only by default and should not restart
  services, mutate DB rows, or delete files.
- The first implementation must prioritize decision-useful evidence over
  exhaustive analysis. Avoid long full-WARC scans by default on active jobs.
- Any repo-side mitigation discovered by the investigation must be deployed
  before VPS recovery actions that depend on it.

## Working policy for this investigation

Use the following provisional content taxonomy when analyzing annual crawls:

1. **HTML / XHTML pages**
   - user-facing navigable pages
2. **Render-critical web assets**
   - css, js, fonts, images, icons, small json needed by pages
3. **Document downloads**
   - pdf, doc/docx, ppt/pptx, xls/xlsx
4. **Archive / bulk-download files**
   - zip, tar, gz bundles and similar
5. **Media**
   - mp4 and similar large media files
6. **Other / unknown**
   - anything not cleanly classified by the above

This taxonomy is an operational heuristic, not a claim of perfect content
classification. When mime type is missing or misleading, prefer:

- file extension
- path family
- explicit source-specific overrides where needed
- "unknown" when the signal is ambiguous

The default product assumption for annual captures under this plan is:

- categories 1-2 are core in-scope
- categories 3-5 require explicit justification if they are allowed to expand
  the crawl frontier

This assumption may be revised only after evidence review.

The key policy distinction for this investigation is:

- **Frontier-expanding URLs**: URLs that the crawler is allowed to navigate to
  as new pages/work items
- **Render-critical subresources**: assets that pages need in order to render
  correctly
- **Optional linked-download capture**: linked artifacts that may still be worth
  preserving, but should not automatically drive additional frontier expansion

## Phased implementation plan

### Phase 0: Diagnostic charter and minimal evidence model

**Goal**: Lock the minimum questions and outputs needed for a useful decision.

**Tasks**:

1. Define the minimum report outputs for each annual job:
   - job metadata
   - crawl health summary
   - top repeated failing URL families
   - top file-extension classes by count
   - top file-extension classes by WARC bytes
   - top path-prefix families by WARC bytes
   - restart/stall signals correlated with repeated URL families
   - recommendation hints with explicit confidence limits
2. Define the evidence sources to use:
   - combined logs
   - `.archive_state.json`
   - WARC inventory discovered via existing helpers
   - per-job crawl metrics already emitted by the VPS metrics script
3. Define how the report will classify a URL/content item when mime type is
   unknown:
   - prefer file extension and path family
   - fall back to "unknown"

**Deliverables**:

- Locked report schema and content taxonomy (this plan).

**Validation**:

- The report schema is sufficient to answer whether large non-HTML classes are
  dominating crawl cost or failure churn.

### Phase 1: Read-only operator diagnostics pilot

**Goal**: Add a repeatable, read-only VPS report that is lightweight enough to
use safely on a live annual crawl.

**Implementation direction**:

- Add a new read-only operator script under `scripts/` (preferred:
  `scripts/vps-crawl-content-report.py`).
- The first implementation should be a PHAC-first pilot, not a prematurely
  generalized all-source tool.
- It should accept either:
  - `--job-id <ID>`, or
  - `--year <YYYY> --source <code>`
- It should use existing discovery/parsing helpers where possible instead of
  reimplementing crawl-state lookup.
- It should default to a **lightweight** inspection mode that is safe mid-crawl.
- If a deeper WARC-record scan is later added, it should be optional and
  intended for completed or idle jobs rather than active ones.

**Tasks**:

1. Resolve the target job/output dir and newest combined log.
2. Parse the log tail or bounded log window to extract:
   - repeated timeout/HTTP/network failure URLs
   - repeated URL families near restart messages
   - dominant failing extensions/path prefixes
3. Use existing state/metrics helpers to summarize:
   - restart counts
   - recent crawl rate
   - progress age / stall state when available
4. Enumerate the job's WARCs and compute a read-only **lightweight** summary:
   - total WARC count
   - total bytes at the file level
   - bytes grouped by extension/path family using safe heuristics and sampling
     where feasible
   - "largest suspicious classes" summary for docs/media/archive types
5. If needed later, add an optional **deep** mode that inspects WARC records for
   completed/idle jobs to improve classification accuracy.
6. Emit both:
   - human-readable stdout summary
   - structured JSON output (`--json-out` optional)
   - recommendation hints that are clearly labeled as heuristic rather than
     definitive

**Deliverables**:

- New read-only VPS report script with lightweight default behavior.
- Stable JSON shape for later comparison across sources/jobs.

**Validation**:

- The report can run safely against an active annual job.
- The PHAC pilot produces decision-useful output before the report is expanded
  further.
- The report can distinguish "likely HTML/runtime problem" from
  "likely download/media frontier problem" or "likely storage issue" for at
  least one real job.

### Phase 2: Pilot-first, then source-by-source evidence review

**Goal**: Use the report to classify each annual source's dominant costs/failures.

**Tasks**:

1. Run the report for the 2026 annual PHAC job first.
2. Adjust the report if the PHAC pilot shows missing or misleading output.
3. Only after the pilot is decision-useful, run it for HC and CIHR.
4. Capture one JSON artifact per source under a public-safe ops path.
   - Strip or normalize query strings in shared artifacts unless raw values are
     specifically needed for debugging.
5. Produce a short written classification per source:
   - mostly healthy / mostly HTML friction / mostly binary-download churn /
     mostly storage issue / mixed
6. Compare findings against current source configuration:
   - HC/PHAC custom include/exclude regexes
   - CIHR broad host scope

**Deliverables**:

- PHAC pilot evidence bundle.
- Per-source evidence bundle and summary table once the pilot is proven useful.

**Validation**:

- Each source has an explicit dominant-failure/cost classification backed by
  report output.

### Phase 3: Scope-policy refinement

**Goal**: Turn evidence into explicit annual-crawl scope policy.

**Tasks**:

1. For each source, decide whether additional frontier exclusions are warranted
   for categories 3-5.
2. Prefer policy shapes like:
   - top-level binary/document/media exclusions
   - path-prefix exclusions for known bulk-download trees
   - tighter asset allowlists
   - leaving render-critical subresource capture intact when page rendering
     still needs it
   - allowing some linked downloads to remain capturable without letting them
     expand the crawl frontier by default
3. Explicitly document any class that remains high-cost but in scope, with a
   rationale, and avoid overfitting broad exclusions to a single noisy incident.
4. Update canonical annual-campaign documentation to reflect the new "user-facing
   website" policy if the evidence supports it.

**Deliverables**:

- Source-specific scope decisions.
- Canonical doc updates and implementation follow-up item(s).

**Validation**:

- No recommended exclusion is justified only by wall-clock annoyance; each is
  tied to evidence plus product-scope rationale.
- No source-policy change is made without a short written evidence summary for
  that source.

### Phase 4: Repo-side implementation follow-through

**Goal**: Apply approved scope refinements coherently.

**Tasks**:

1. Implement source-config changes in the canonical integration points:
   - `src/ha_backend/job_registry.py`
   - any needed annual reconciliation paths
2. Add or update tests that prove:
   - excluded content classes no longer expand the frontier
   - render-critical assets remain in scope
   - existing intended HTML pages remain in scope
   - optional linked-download behavior matches the documented policy for the
     source
3. Update the relevant runbooks/playbooks so operators know how to:
   - run the diagnostic report
   - interpret the output
   - reconcile annual job configs after source-profile changes

**Deliverables**:

- Repo-side scope changes and tests.
- Canonical operator docs.

**Validation**:

- The report still identifies the previously dominant noisy classes, but the
  updated scope rules prevent them from driving new crawl frontier expansion on
  future annual jobs.

## Report requirements (locked)

The Phase 1 report should provide, at minimum:

- job metadata:
  - job id, source, output dir, combined log path
- crawl health summary:
  - restart counts
  - recent crawl rate
  - progress age / stall signal if available
- error-family summary:
  - timeout count
  - HTTP/network failure count
  - repeated failing URL families with example URLs and counts
- content-cost summary:
  - top extensions by bytes
  - top extensions by URL count
  - top path prefixes by bytes
  - count/bytes for likely docs/media/archive classes
- recommendation hints:
  - likely HTML/runtime issue
  - likely binary/download frontier issue
  - likely storage issue
  - likely mixed or low-confidence case

The report must not make destructive decisions. It should surface evidence, not
silently change scope.

The default report should rely on lightweight inspection that is safe during an
active crawl. Any deeper WARC-record scan should be optional and clearly marked
as slower and more suitable for completed or idle jobs.

## Testing strategy

Implementation should include both unit and fixture-style tests:

- URL/content classification tests:
  - html vs render asset vs document vs archive vs media vs unknown
  - path-family overrides and unknown fallback behavior
- Log parsing tests:
  - repeated timeout URLs are grouped correctly
  - repeated HTTP2/network failures are grouped correctly
  - restart-adjacent URL families are surfaced
- WARC summary tests:
  - lightweight byte/count grouping works with representative WARC inputs
  - mixed extensions/path families aggregate correctly
  - optional deep scan logic (if added) works on fixture WARCs
- Integration-style script tests:
  - report succeeds when a combined log exists
  - report succeeds when a job has WARCs but sparse logs
  - report remains read-only and degrades gracefully on missing files

## Operator workflow after implementation

Preferred usage on the VPS:

```bash
cd /opt/healtharchive-backend
./scripts/vps-crawl-content-report.py --year 2026 --source phac
./scripts/vps-crawl-content-report.py --job-id 7 --json-out /srv/healtharchive/ops/observability/crawl-content/phac-2026.json
```

Start with PHAC. Do not broaden the workflow to HC/CIHR until the PHAC report
is clearly decision-useful.

The resulting evidence should be reviewed before any new source-profile
exclusions are deployed.

## Success criteria

This plan is successful when:

- the PHAC pilot proves the report is actually useful for decision-making
- we can point to concrete content classes or URL families that dominate time,
  bytes, or restart churn
- we can say, source by source, whether the main problem is:
  - HTML/runtime incompatibility
  - large/binary/download frontier waste
  - storage instability
  - mixed causes
- any future scope refinements are grounded in evidence and aligned with the
  product goal of preserving the user-facing website

## Follow-on decision rule

If the evidence shows that large binary/media/dataset classes dominate crawl
cost without improving the user-facing archive, the default next action should
be **scope refinement**, not larger restart budgets or arbitrary time targets.

If the evidence shows the dominant problem is still in-scope HTML pages, the
next action should be **crawler/runtime compatibility work**, not broader
exclusions.

If the evidence is mixed or low-confidence, prefer the smallest source-specific
change that reduces frontier waste without weakening intended HTML coverage.
