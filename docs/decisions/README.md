# Decision records (ADR-lite)

This folder contains **decision records** for high-stakes choices that affect:

- security posture,
- privacy / data handling,
- public vs private surfaces,
- operational invariants (what must remain true over time).

Goal: make important choices legible and durable so they don’t get lost in chat history, PR threads, or implicit “tribal knowledge”.

Related:

- Documentation policy and doc taxonomy: `../documentation-guidelines.md`
- Public/private boundaries: `../operations/observability-and-private-stats.md`
- Data handling and retention: `../operations/data-handling-retention.md`
- Production invariants (drift policy): `../operations/baseline-drift.md`

---

## What goes here (examples)

- Decisions that change public attack surface (e.g., making an endpoint public/private).
- Decisions that change what data is collected or retained (especially anything user-related).
- Decisions that change operational safety rails (automation posture, caps, sentinels).
- Decisions that change reproducibility guarantees (exports, dataset release immutability).

## What does not go here

- Backlog items and implementation steps (use `../planning/`).
- Incident timelines and recovery notes (use `../operations/incidents/`).
- Routine ops logs and event-triggered organic evidence records. These are not
  decision records; adoption evidence has no standing collection cadence.

---

## Naming

One file per decision:

- `YYYY-MM-DD-short-title.md` (UTC date the decision is made/accepted)

If multiple decisions occur on one day, add a suffix:

- `YYYY-MM-DD-short-title-a.md`, `...-b.md`

## How to create a new decision record

1) Copy the template: `../_templates/decision-template.md`
2) Fill **Context** + **Decision** first.
3) Record alternatives briefly (what you didn’t do, and why).
4) Link to supporting artifacts (PRs, incident notes, runbooks, issues).
5) Mark status as `accepted` once you commit to it.

If a decision changes later, create a new decision record and mark the old one as `superseded` (link both directions).

---

## Decision records

- `2026-08-12-dataset-publication-and-stewardship.md`
- `2026-06-11-annual-crawl-media-retention-policy.md`
- `2026-06-11-solo-operator-alert-paging-policy.md`
- `2026-05-26-frontend-cache-externalization-and-docker-runtime-metrics.md`
- `2026-05-24-db-backup-retention-and-nas-ingest.md`
- `2026-04-28-annual-editions-and-sharded-crawl-convergence.md`
- `2026-02-19-alert-fatigue-reduction-for-crawl-alerting.md`
- `2026-02-07-git-first-vps-changes.md`
- `2026-02-06-per-source-crawl-profiles-and-annual-reconciliation.md`
- `2026-02-03-crawl-auto-recover-queue-fill.md`
- `2026-02-03-crawl-job-db-state-reconciliation.md`
- `2026-01-24-single-vps-ops-automation-guardrails-for-crawl-and-storage.md`
- `2026-01-23-annual-crawl-throughput-and-artifacts.md`
- `2026-01-19-annual-crawl-resiliency-and-queue-order.md`
- `2026-01-19-ops-first-monitoring.md`
- `2026-01-18-search-ranking-v3.md`
- `2026-01-09-public-incident-disclosure-posture.md`
