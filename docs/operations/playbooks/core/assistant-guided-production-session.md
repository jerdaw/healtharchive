# Assistant-guided production session playbook (operators)

Purpose: safely use an interactive assistant on the HealthArchive production VPS
for diagnosis and tightly scoped recovery without turning production into the
primary development workspace.

This playbook is HealthArchive-specific. Shared host access posture, ingress
ownership, and cross-project VPS controls remain canonical in
`platform-ops/`. Use this file as the service-local operating procedure for
HealthArchive incidents and crawl investigations.

This file is a guardrail document, not a claim that every shared-host control
described below is already enabled. Do not use this workflow until the access,
approval, and audit prerequisites are in place for the current production host.

The shared host standard and rollout runbook for this posture are:

- <https://github.com/jerdaw/platform-ops/blob/main/docs/standards/PLAT-010-production-access-and-session-audit.md>
- <https://github.com/jerdaw/platform-ops/blob/main/docs/runbooks/RUN-007-assistant-guided-prod-session-rollout.md>

## When to use

- You need live runtime truth from the HealthArchive production VPS and
  copy/paste diagnosis is becoming too slow.
- The issue is operational or runtime-specific (for example: crawl stalls,
  worker state drift, systemd state, Docker/container behavior, WARC output
  activity, deploy verification).
- A human operator is present and can approve or decline any state-changing
  action in real time.

Do not use this playbook for:

- normal feature development
- broad refactors or exploratory coding on the VPS
- shared-host policy changes that should be implemented in `platform-ops/`

## Preconditions / access

- Environment: production
- Required access:
  - Tailscale SSH to the VPS as `haadmin`
  - `sudo` available for one-shot commands only; no persistent root shells
- Required inputs:
  - issue statement (what you are trying to diagnose or fix)
  - service/job identifiers if relevant
  - planned access window

## Safety / guardrails

- Default to read-only diagnosis.
- Keep the human operator in the loop for every state-changing command.
- Do not edit `/opt/healtharchive` directly during the session.
- Do not run `git pull` on the VPS as a substitute for the deploy helper.
- Use repo-first remediation for code, config logic, crawler behavior, watchdog
  behavior, and CLI changes: fix locally, validate locally, deploy a pinned
  ref, then run any dependent recovery command.
- Keep heavyweight diagnosis bounded with `timeout` and, when needed,
  `systemd-run --scope` resource limits.
- Treat session recording and logs as sensitive: terminal output may contain
  secrets, tokens, URLs, or operational details that should stay private.

## Protocol v2

Use two modes only:

1. Diagnostic mode
2. Maintenance mode

### Diagnostic mode (default)

Diagnostic mode is read-only by default. Stay here unless the operator
explicitly approves a maintenance step.

Normal commands in this mode include:

- host state: `hostname`, `whoami`, `date`, `uptime`, `df -h`, `free -h`,
  `findmnt`, `ps`
- repo state: `git rev-parse HEAD`, `git status --porcelain`, `git log -1`
- service state: `systemctl status healtharchive-api healtharchive-worker --no-pager -l`,
  `docker ps`
- HealthArchive inspection:
  - `/opt/healtharchive/.venv/bin/healtharchive list-jobs --limit 50`
  - `/opt/healtharchive/.venv/bin/healtharchive show-job --id <JOB_ID>`
  - `cd /opt/healtharchive && ./scripts/vps-crawl-status.sh --year <YEAR>`
- bounded diagnostics:
  - `timeout 120 ./scripts/vps-crawl-content-report.py ...`
  - `sudo systemd-run --scope -p CPUQuota=25% -p MemoryHigh=512M -p MemoryMax=1G timeout 120 <command>`

Extra rules in diagnostic mode:

- Prefer non-`sudo` commands first.
- Use one-shot `sudo` only for read-only inspection that truly needs it
  (for example: `journalctl -u ... --no-pager`).
- Never use `sudo -s`, `sudo su -`, or other persistent privileged shells.
- Do not read secret-bearing files such as `/etc/healtharchive/backend.env`
  unless the incident specifically requires it and the operator explicitly
  accepts the exposure.

### Maintenance mode (explicitly approved only)

Enter maintenance mode only when the operator explicitly says to proceed with a
specific state-changing action.

Before each maintenance action, provide a mini change request:

- objective
- exact command
- expected impact
- rollback path

Commands that always require explicit approval:

- `sudo systemctl stop|start|restart ...`
- `./scripts/vps-deploy.sh --apply ...`
- `/opt/healtharchive/.venv/bin/healtharchive recover-stale-jobs --apply ...`
- `/opt/healtharchive/.venv/bin/healtharchive retry-job ...`
- `/opt/healtharchive/.venv/bin/healtharchive patch-job-config ...`
- `/opt/healtharchive/.venv/bin/healtharchive cleanup-job ...`
- `docker stop`, `docker rm`
- mount/unmount actions
- package installation
- file edits on the VPS
- removal commands such as `rm`

## Never do this during an assistant-guided prod session

- use the production VPS as the main coding workspace
- hotfix the backend by editing files under `/opt/healtharchive`
- rely on ad hoc retries before verifying whether the repo needs a fix
- restart `healtharchive-worker` during an active crawl unless interruption is
  explicitly accepted
- delete crawl temp directories or job outputs just because an alert fired

## Tailscale SSH policy example (shared host control; coordinate in `platform-ops/`)

Use an explicit host user allowlist for tagged production devices. Do not use
`autogroup:nonroot` for `tag:prod`.

This example is intentionally narrow:

- destination host tag is `tag:prod`
- recorder identity tag is `tag:ssh-recorder`
- `users` is explicitly `haadmin`
- `action` is `check`
- the tailnet default `check` approval window is acceptable for phase 1
- `acceptEnv` is omitted on purpose
- session recording starts fail-open during recorder burn-in
- same-box recorder is a temporary phase-1 compromise only

```jsonc
{
  "ssh": [
    {
      "action": "check",
      "src": ["group:prod-operators"],
      "dst": ["tag:prod"],
      "users": ["haadmin"],
      "recorder": ["tag:ssh-recorder"],
      "enforceRecorder": false
    }
  ]
}
```

Notes:

- A matching network access rule must also exist; this snippet only shows the
  SSH stanza.
- Keep the source principal time-bounded. Prefer a just-in-time workflow
  (temporary group membership or expiring device posture) rather than a
  standing broad grant.
- On tailnets without Premium/Enterprise custom approval windows, rely on the
  default `check` behavior instead of setting `checkPeriod`.
- Once recorder behavior is verified and a break-glass path exists, consider
  moving `enforceRecorder` to `true`.
- Session recording only applies to Tailscale SSH sessions, not generic SSH
  traffic sent over the tailnet.
- In phase 1, the recorder should run as a separate recorder identity on the
  same VPS, not as the VPS host's own Tailscale node identity.

## Example sudo logging pattern for `haadmin`

Keep authz decisions separate from logging decisions. The pattern below adds
session-oriented audit posture without changing which commands `haadmin` may run
today.

Example file: `/etc/sudoers.d/90-healtharchive-session-audit`

```sudoers
Cmnd_Alias HA_SESSION_COMMANDS = \
    /usr/bin/systemctl, \
    /usr/bin/journalctl, \
    /usr/bin/docker, \
    /opt/healtharchive/.venv/bin/healtharchive, \
    /opt/healtharchive/scripts/vps-deploy.sh

Defaults:haadmin use_pty, env_reset
Defaults:haadmin iolog_dir="/var/log/projects-merge/sudo-io/%{user}"
Defaults:haadmin iolog_file="%Y%m%d-%H%M%S-%{command}"
Defaults!HA_SESSION_COMMANDS log_output
```

Recommended follow-ups:

- Keep `log_input` disabled by default; enable it only deliberately and only if
  you are sure no secrets/passwords will be typed.
- Validate changes with `visudo -cf /etc/sudoers.d/90-healtharchive-session-audit`.
- If you later adopt remote sudo logging, add `log_servers=...` in the shared
  host policy layer rather than hard-coding it in an app-specific playbook.
- Phase 1 is audit-first only: do not narrow `haadmin` sudo authz yet unless a
  separate hardening change explicitly does that work.

## Operator checklist

### Start of session

1. Confirm that direct VPS diagnosis is actually needed.
2. Confirm the access window is temporary and the operator is present.
3. Confirm the session will use Tailscale SSH, not generic SSH-over-tailnet.
4. Confirm the SSH policy is narrow enough for production:
   `users=["haadmin"]`, `action="check"`, default approval window, minimal
   environment forwarding.
5. Confirm whether session recording is enabled and whether it is currently
   fail-open or fail-closed.
6. Open an incident note or scratchpad timeline if the issue is more than
   routine maintenance.
7. Capture a baseline snapshot before touching anything:
   `cd /opt/healtharchive && ./scripts/vps-crawl-status.sh --year <YEAR>`
8. Classify the next step:
   - read-only diagnosis
   - repo fix needed
   - one-off maintenance action

### End of session

1. Record what was observed and which commands were run.
2. Record whether production state changed.
3. If a code/config fix is still needed, move the work back to the local repo.
4. If a deploy occurred, verify the live checkout is on the intended ref.
5. If a maintenance action occurred, verify service/job health after the
   change.
6. Revoke or let expire the temporary SSH/JIT access.
7. Leave the next safest command or next decision in the incident note/handoff.

## Verification ("done" criteria)

- The session stayed within the allowed mode (diagnostic or explicitly approved
  maintenance).
- Any repo-dependent fix was implemented locally and deployed via the standard
  deploy helper instead of ad hoc VPS edits.
- Any privileged commands were one-shot, auditable, and understandable after
  the fact.
- Temporary access has been revoked or allowed to expire.

## Rollback / recovery (if needed)

- If a proposed maintenance step feels ambiguous or higher-blast-radius than
  expected, stop and return to diagnostic mode.
- If the issue requires backend behavior changes, exit the session and follow
  `deploy-and-verify.md` after the repo fix is ready.
- If session recording or SSH policy changes block legitimate emergency access,
  use the documented break-glass path from the shared host contract before
  proceeding.

## References

- Production runbook: `../../../deployment/production-single-vps.md`
- Operator responsibilities: `operator-responsibilities.md`
- Deploy + verify: `deploy-and-verify.md`
- Incident response: `incident-response.md`
- Shared VPS documentation boundary:
  <https://github.com/jerdaw/platform-ops/blob/main/docs/standards/PLAT-009-shared-vps-documentation-boundary.md>
- Tailscale SSH:
  <https://tailscale.com/docs/features/tailscale-ssh>
- Tailscale SSH session recording:
  <https://tailscale.com/kb/1246/tailscale-ssh-session-recording>
- Tailscale just-in-time access:
  <https://tailscale.com/kb/1443/just-in-time-access>
