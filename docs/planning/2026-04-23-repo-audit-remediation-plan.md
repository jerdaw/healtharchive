# Repo Audit Remediation Plan (2026-04-23)

**Status:** Active planning only
**Related:** `2026-04-23-repo-audit-follow-up-board.md`, `roadmap.md`, `docs/development/test-coverage.md`

## Summary

This plan turns the 2026-04-23 audit board into one ordered remediation track
for HealthArchive.

No fixes are applied here. This is sequencing only.

## Priority Sequence

### Track 1: CI, Coverage, And Policy Alignment

Why first:

1. this repo has the largest code surface in the audit set
2. the main current risk is not docs confusion but a mismatch between stated bar
   and enforced gates

Scope:

1. reconcile `AGENTS.md`, coverage docs, and backend CI expectations
2. decide the actual enforced scope for `make ci`, `make check-full`, and
   scheduled/full lanes
3. decide what belongs in the normal PR gate versus slower or scheduled
   verification

Exit criteria:

1. stated coverage and CI bar match the actual enforcement model
2. the fast lane versus full lane split is explicit and defensible

### Track 2: Frontend Security And Verification Truth

Why second:

1. current frontend security docs overstate enforced controls
2. this is a bounded documentation-and-gate-alignment problem

Scope:

1. reconcile frontend README and deployment verification docs with actual CI
   steps
2. decide whether report-only CSP remains acceptable or needs a staged path to
   enforcement
3. define the future frontend security verification expectations clearly

Exit criteria:

1. frontend security docs no longer overstate CI enforcement
2. CSP posture has an explicit target state or accepted rationale

### Track 3: Structural Backend Decomposition

Why third:

1. oversized modules are a real maintainability risk
2. decomposition should follow once the repo’s gate policy is clear

Scope:

1. define a bounded split plan for `cli.py`
2. define a bounded split plan for `api/routes_public.py`
3. identify the future command and router families

Exit criteria:

1. the decomposition target is explicit enough to become future implementation
   plans

### Track 4: Low-Signal Privacy Follow-Through

Why last:

1. this repo had the cleanest documentation and privacy posture in the audit
   batch
2. the remaining issue is narrow and lower risk

Scope:

1. define a concrete retention review path for issue reports and optional
   reporter email
2. trace how issue-report data can propagate through logs, backups, and admin
   surfaces

Exit criteria:

1. the issue-report retention path is explicit enough to support later fixes

## Non-Goals

1. no live ops workflow change by itself
2. no code refactor or CI change in this document
3. no docs-platform migration work
