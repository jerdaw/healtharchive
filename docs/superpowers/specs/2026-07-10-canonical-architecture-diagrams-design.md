# Canonical Architecture Diagrams Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

Roadmap item #40 asks for architecture diagrams. HealthArchive already has
useful Mermaid visuals in the beginner walkthrough and data-model reference,
but the canonical architecture guide contains only prose and does not direct
readers to those visual references. A reader entering through the canonical
guide cannot quickly see the system boundary or the job lifecycle, and the
roadmap still treats all diagram work as missing.

## Goals

1. Add one public-safe system-context diagram to the canonical architecture
   guide.
2. Add one job-lifecycle diagram next to the authoritative lifecycle prose.
3. Link the existing end-to-end walkthrough and ERD rather than duplicating
   their detailed diagrams.
4. Keep component names and state transitions aligned with current code and
   architecture prose.
5. Remove completed roadmap item #40 and archive an implementation record.

## Non-Goals

- Document deployment hosts, private paths, network topology, monitoring
  internals, or operator-only infrastructure.
- Replace the detailed tutorial, data-model reference, or `archive_tool`
  documentation.
- Add a generated bitmap or a new diagram toolchain.
- Redesign application architecture or job states.
- Claim optional ZIM output is required for search or replay.

## Diagram 1: System Context

Use a left-to-right Mermaid flowchart with public actors and repository-owned
components:

- researchers/public users reach the Next.js frontend;
- the frontend calls only public FastAPI routes;
- operators use the CLI/admin surface;
- worker/background tasks coordinate through application services and the
  relational database;
- `archive_tool` runs as a subprocess and delegates capture to the crawler
  container;
- WARCs are the durable captured-content input to indexing and replay;
- the database holds jobs, editions, snapshots, and change metadata.

The diagram labels public versus administrative paths without showing auth
values, hostnames, runtime locations, or deployment ownership.

## Diagram 2: Job Lifecycle

Use a Mermaid state diagram for the durable high-level states documented in
the guide:

- `queued -> running`;
- recoverable crawl failure `running -> retryable -> running`;
- accepted crawl output `running -> completed -> indexing`;
- terminal crawl failure `running -> failed`;
- indexing success/failure `indexing -> indexed|index_failed`;
- an explicit operator reconciliation/retry may move `index_failed` back to
  `indexing`.

The WARC-complete/ZIM-finalization exception is an acceptance condition on the
transition to `completed`, not a new `ArchiveJob.status`; keep that distinction
in adjacent prose.

## Cross-References

Add a short visual-reference list near the guide introduction:

- architecture walkthrough for step-by-step capture-to-search diagrams;
- data-model reference for the Mermaid ERD;
- `archive_tool` internals for crawler mechanics.

## Validation

- Run strict documentation coverage and MkDocs build so Mermaid fences and
  links pass the current docs pipeline.
- Run active-doc/current-state and public LLM-surface tests.
- Review diagrams against `models.py`, worker/job lifecycle prose, and the
  public/private documentation boundary.

## Delivery

Use a stacked branch based on the frontend-link-check branch because both
batches update the same sparse roadmap block. Open a PR against
`feat/frontend-internal-link-check`; no deployment or generated binary asset is
part of this batch.
