# Canonical Architecture Diagrams Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Put accurate, public-safe system context and job lifecycle visuals in
the canonical architecture guide and connect the existing detailed diagrams.

**Design:** `../../superpowers/specs/2026-07-10-canonical-architecture-diagrams-design.md`

## Task 1: Add canonical visual references

**File:** `docs/architecture.md`

Add direct links to the existing architecture walkthrough, data-model ERD, and
`archive_tool` internals. Keep the canonical guide as the overview rather than
copying detailed tutorial content.

## Task 2: Add the system-context diagram

**File:** `docs/architecture.md`

Add a Mermaid flowchart covering public users, frontend, API, administrative
entry points, worker/background tasks, database metadata, `archive_tool`, the
crawler container, and durable WARCs. Preserve the public/private boundary and
WARC-first architecture.

## Task 3: Add the job-lifecycle diagram

**File:** `docs/architecture.md`

Add a Mermaid state diagram for queued, running, retryable, completed, failed,
indexing, indexed, and index-failed states. Explain that WARC-complete optional
ZIM failure affects crawl acceptance, not the durable status vocabulary. Fix
the adjacent duplicate ordered-list numbering while editing that section.

## Task 4: Close roadmap and planning truth

**Files:**

- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive this plan under `docs/planning/implemented/`

Remove completed roadmap item #40, index the archived plan, and record exact
validation evidence.

## Task 5: Verify, review, and publish

1. Run strict documentation coverage and build.
2. Run active-doc, docs-coverage, and public LLM-surface tests.
3. Run whitespace, file-quality, private-key, and secret checks.
4. Review every diagram edge/state against current code and public-safe docs.
5. Commit in a bounded docs batch, push, open/read back the stacked PR, and
   report hosted checks without deploying.

## Completion Record

- Added a canonical Mermaid system-context diagram that distinguishes public
  frontend/API traffic, authorized administrative entry points, background job
  services, crawler subprocess/container boundaries, durable WARCs, indexing,
  and relational metadata without exposing deployment details.
- Added a Mermaid state diagram for queued, running, retryable, completed,
  failed, indexing, indexed, and index-failed states. Adjacent prose explicitly
  keeps `warc_complete_finalization_failed` as a crawler-stage acceptance signal
  rather than inventing a new durable job status.
- Linked the existing step-by-step architecture walkthrough, data-model ERD,
  and public `archive_tool` source documentation from the canonical guide.
- Corrected duplicate ordered-list numbering in the existing data-flow section.
- Removed completed roadmap item #40 and indexed this archived implementation
  record.
- `make docs-coverage-strict docs-build-strict` passed strict coverage,
  OpenAPI/LLM generation, and strict MkDocs rendering. The documented
  Material/MkDocs 2 warning remains the repository's tracked platform concern.
- Fourteen active-doc, docs-coverage, and public LLM-surface tests passed; the
  built architecture HTML contains both expected Mermaid markers.
- No application behavior, deployment, generated binary asset, or private
  operations material changed.
