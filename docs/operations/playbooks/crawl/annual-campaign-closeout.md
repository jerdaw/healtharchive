# Annual campaign closeout (operators)

Purpose: close a full annual crawl/capture campaign with evidence, validation,
summary text, follow-ups, and a durable report.

This playbook is the campaign-level closeout. The production closeout checklist
is one validation gate inside this larger process.

## When to use

- After all annual jobs or shards for a campaign year are indexed, accepted, or
  explicitly excluded.
- Before announcing that a campaign is search-ready or research-ready.
- Before moving annual-crawl follow-up plans into `docs/planning/implemented/`.
- Before shifting attention from crawl recovery/ops back to external
  validation, outreach, or routine operations.

## Preconditions / access

- Environment: production VPS; NASD if database-backup replication is part of
  the closeout.
- Required access: production VPS shell as the operator; `sudo` for systemd,
  backup, and storage checks.
- Required inputs:
  - campaign year;
  - source list;
  - annual status output;
  - per-source coverage/provenance reports;
  - search/replay validation evidence;
  - incident/follow-up list;
  - backup and restore posture evidence;
  - final deployed Git ref.

## Safety / guardrails

- Do not declare a source research-ready until its coverage/provenance report is
  generated and accepted.
- Do not delete crawl artifacts, WARCs, reports, logs, or backup evidence as
  part of closeout. Cleanup belongs in a separate approved playbook.
- Keep public-facing copy factual and bounded. Distinguish indexed page counts,
  total snapshot counts, known gaps, and accepted exclusions.
- Keep secrets, private URLs, and tokens out of committed reports.
- If a validation step fails, keep the campaign open and add the follow-up to
  the ops roadmap or main roadmap.

## Steps

### 1. Capture the campaign state

On the VPS:

```bash
cd /opt/healtharchive
YEAR=2026

ha-check
set -a; source /etc/healtharchive/backend.env; set +a
/opt/healtharchive/.venv/bin/healtharchive annual-status --year "$YEAR"
```

Record:

- timestamp;
- deployed Git ref;
- source/job IDs;
- job status;
- operator state;
- indexed page counts;
- backend/provenance labels;
- rescue/fallback states;
- running job count.

### 2. Review each source

For each annual source, confirm:

- blocking jobs are `indexed`, accepted, or explicitly excluded;
- `search_ready=true`;
- `research_ready=true`;
- coverage/provenance report exists;
- fallback captures are labeled;
- known gaps and accepted exclusions are written down;
- replay has at least one successful spot check.

Use a table in the closeout report with one row per source.

### 3. Regenerate or verify annual reports

If reports are stale or missing, regenerate them before closure:

```bash
YEAR=2026
set -a; source /etc/healtharchive/backend.env; set +a
/opt/healtharchive/.venv/bin/healtharchive salvage-annual-edition --year "$YEAR" --report
/opt/healtharchive/.venv/bin/healtharchive annual-status --year "$YEAR"
```

Keep the generated per-edition artifacts in place:

- `target-ledger.jsonl`;
- `capture-manifest.jsonl`;
- `coverage-report.json`;
- `coverage-report.md`.

### 4. Run search, replay, and public validation

On the VPS:

```bash
YEAR=2026
./scripts/annual-search-verify.sh \
  --year "$YEAR" \
  --out-root /srv/healtharchive/ops/search-eval \
  --base-url http://127.0.0.1:8001

./scripts/verify_public_surface.py \
  --require-source hc \
  --require-source phac \
  --require-source cihr
```

Record:

- search verification artifact path;
- public API and frontend verification result;
- raw snapshot and replay result;
- any source-specific exceptions.

### 5. Run production closeout validation

Run the generic production gate:

- `../validation/production-closeout.md`

For annual campaigns, include backup/NAS checks even if backup code did not
change. The campaign is not fully closed until the database can be backed up and
replicated after indexing completes.

### 6. Classify incidents, deviations, and follow-ups

For every incident or deviation during the campaign, classify it as:

- **Closed**: resolved and documented;
- **Accepted**: known gap accepted for this edition with a reason;
- **Ops follow-up**: track in `../../healtharchive-ops-roadmap.md`;
- **Product/engineering backlog**: track in `../../../planning/roadmap.md`;
- **External validation**: track in the active external/admissions plan.

Do not leave closeout-only TODOs in chat history or terminal scrollback.

### 7. Write the closeout report

Copy the report template:

```bash
cp docs/_templates/annual-campaign-closeout-report-template.md \
  docs/operations/reports/<YEAR>-annual-campaign-closeout.md
```

The report must include:

- executive summary;
- campaign result table;
- validation checklist;
- backup/retention posture;
- incident/deviation summary;
- accepted gaps and exclusions;
- follow-ups and owners/surfaces;
- public-safe summary text;
- operator handoff text;
- evidence and references.

### 8. Update canonical docs and roadmap state

- Update `../../annual-campaign.md` if scope, source policy, or done criteria
  changed.
- Update `../../current-work-tracker.md` if production state materially changed.
- Update `../../healtharchive-ops-roadmap.md` with remaining operational
  follow-ups.
- Remove completed items from `../../../planning/roadmap.md`.
- Move completed active plans to `../../../planning/implemented/`.
- Add the report to `../../README.md` under Mission Reports & Logs.

### 9. Commit and push

From the local repo:

```bash
git diff --check
make docs-build
git status --short
git add <changed-files>
git commit -m "docs: close <YEAR> annual campaign"
git push origin main
```

## Verification ("done" criteria)

- `annual-status` and `ha-check` show all campaign sources search-ready.
- Per-source coverage/provenance reports are generated and accepted.
- Search, replay, public surface, baseline drift, automation posture, alerts,
  backup, NAS replication, and disk checks pass or have documented accepted
  exceptions.
- A closeout report exists in `docs/operations/reports/`.
- Public-safe and operator handoff summaries exist in the report.
- Remaining work is tracked in the correct roadmap; completed work is removed
  or archived.
- Closeout docs are committed and pushed.

## Rollback / recovery

- If production validation fails, follow `../validation/production-closeout.md`
  and keep the campaign open.
- If a source fails readiness, return to `annual-campaign.md` and the relevant
  crawl/indexing playbook.
- If storage or replay fails, follow the storage/replay playbooks before
  declaring the campaign closed.

## References

- Annual scope and done criteria: `../../annual-campaign.md`
- Generic production closeout: `../validation/production-closeout.md`
- Annual campaign playbook: `annual-campaign.md`
- Report template: `../../../_templates/annual-campaign-closeout-report-template.md`
