# Production closeout validation (operators)

Purpose: decide whether a production change, incident recovery, or implementation
plan is complete enough to close.

This is a short, read-only checklist. It does not replace the deploy runbook,
incident playbook, or automation playbooks; it ties their final verification
steps together so "done" has one clear meaning.

## When to use

- After any production change that affects service behavior, runtime topology,
  automation, alerting, backup/retention, or public surfaces.
- Before moving an active implementation plan to
  `docs/planning/implemented/`.
- Before marking an ops-roadmap item or incident follow-up closed.
- Skip for docs-only changes that do not affect the live runtime.

## Preconditions / access

- Environment: production VPS; NASD only if the change touched NAS backup
  replication.
- Required access: production VPS shell as the operator; `sudo` for systemd and
  backup inspections.
- Required inputs: intended Git commit/ref, list of changed operational
  surfaces, and any backup/NAS paths affected by the work.
- Repository changes that production commands depend on are already committed,
  pushed, and deployed.

## Safety / guardrails

- Default to read-only validation. Do not run cleanup, restarts, or destructive
  storage commands as part of closeout unless a separate playbook calls for
  them.
- Do not edit `/opt/healtharchive` directly. Fix production behavior through a
  committed repo change and the deploy helper.
- Do not print secrets. When inspecting env files, print variable names or
  sanitized summaries only.
- If a check fails, keep the work open and record the follow-up in the
  ops roadmap or main roadmap instead of declaring completion.

## Steps

### 1. Confirm repository and deployed ref

From the local repo:

```bash
git status --short --branch
git log -1 --oneline
```

On the VPS, verify the active checkout is the intended deployed ref:

```bash
cd /opt/healtharchive
git rev-parse --short=12 HEAD
git status --short --branch
```

If the production state depends on a newer commit, deploy that commit before
continuing. Prefer the pinned-ref deploy helper for incident follow-through:

```bash
./scripts/vps-deploy.sh --apply --baseline-mode live --ref <GIT_SHA>
```

### 2. Run production health and surface checks

On the VPS:

```bash
cd /opt/healtharchive

ha-check
curl -fsS http://127.0.0.1:8001/api/health
curl -fsS http://127.0.0.1:9090/-/ready
curl -fsS http://127.0.0.1:9093/-/ready

./scripts/check_baseline_drift.py --mode live --no-write
./scripts/verify_public_surface.py \
  --require-source hc \
  --require-source phac \
  --require-source cihr
./scripts/verify_ops_automation.sh
```

### 3. Confirm alert state

On the VPS:

```bash
curl -fsS http://127.0.0.1:9090/api/v1/alerts > /tmp/ha-alerts.json
python3 - <<'PY'
import json

alerts = json.load(open("/tmp/ha-alerts.json")).get("data", {}).get("alerts", [])
found = False
for alert in alerts:
    labels = alert.get("labels", {})
    name = labels.get("alertname", "")
    if not name.startswith("HealthArchive"):
        continue
    found = True
    print(
        alert.get("state"),
        name,
        labels.get("severity", ""),
        alert.get("activeAt", ""),
    )
if not found:
    print("OK: no active HealthArchive alerts")
PY
rm -f /tmp/ha-alerts.json
```

If an alert is firing, either resolve it or document why it is accepted before
closing the work.

### 4. Verify backup chain when touched

Run this section after work that touched database backups, retention, Storage
Box, NASD replication, or root-disk cleanup.

On the VPS:

```bash
cd /opt/healtharchive

systemctl list-timers --all | grep healtharchive-db-backup
sudo systemctl status healtharchive-db-backup.service --no-pager

sudo find /srv/healtharchive/backups -maxdepth 1 -type f \
  -printf '%TY-%Tm-%Td %10s %p\n' | sort
sudo find /srv/healtharchive/storagebox/backups/db -maxdepth 1 -type f \
  -printf '%TY-%Tm-%Td %10s %p\n' | sort | tail -20

curl -s http://127.0.0.1:9100/metrics | grep '^healtharchive_db_backup_'
```

On NASD, if NAS replication changed:

```bash
find /volume1/automated-backup-ingest/service-backups/healtharchive/logical-dumps \
  -maxdepth 1 -type f -printf '%TY-%Tm-%Td %10s %p\n' | sort | tail -20
```

### 5. Close docs and roadmap state

- Update canonical docs that operators use, not just planning notes.
- Move completed active plans from `docs/planning/` to
  `docs/planning/implemented/` and compress long plans to the implemented-plan
  summary format.
- Remove completed items from `docs/planning/roadmap.md`.
- Keep unfinished work in the appropriate tracker:
  - `docs/operations/healtharchive-ops-roadmap.md` for live ops follow-through;
  - `docs/planning/roadmap.md` for future product, engineering, or governance
    work.
- Update `docs/operations/current-work-tracker.md` when the current production
  state changed materially.

### 6. Commit and push closeout changes

From the local repo:

```bash
git diff --check
make docs-build
git status --short
git add <changed-files>
git commit -m "docs: record <closeout topic>"
git push origin main
```

## Verification ("done" criteria)

- Production health, baseline drift, public surface, automation posture, and
  alert-state checks pass.
- Backup/NAS checks pass when backup or storage behavior changed.
- Canonical docs describe the current reality.
- Completed implementation plans are archived; remaining work is still visible
  in the roadmap or ops roadmap.
- The local working tree is clean and the closeout commit is pushed.

## Rollback / recovery

- If deploy validation fails, follow
  `../core/deploy-and-verify.md` and keep the work open.
- If an incident symptom returns, follow `../core/incident-response.md`.
- If storage or mount checks fail, follow
  `../storage/storagebox-sshfs-stale-mount-recovery.md`.
- If automation posture fails, follow `automation-maintenance.md`.

## References

- Deploy and verify: `../core/deploy-and-verify.md`
- Incident response: `../core/incident-response.md`
- Automation maintenance: `automation-maintenance.md`
- Roadmap process: `../../../roadmap-process.md`
- Documentation guidelines: `../../../documentation-guidelines.md`
- Production runbook: `../../../deployment/production-single-vps.md`
