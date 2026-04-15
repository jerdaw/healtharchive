# Developer environment setup (frontend + monorepo-aware)

This document explains how to set up a local development environment and how
to avoid common “CI passed locally but failed on GitHub” issues.

For backend-specific setup and local API testing flows in the monorepo, also
read:

- https://github.com/jerdaw/healtharchive/blob/main/docs/development/dev-environment-setup.md
- https://github.com/jerdaw/healtharchive/blob/main/docs/development/live-testing.md

---

## Local setup (frontend)

From `frontend/`:

```bash
npm ci
npm run dev
```

Full checks (what CI runs):

```bash
npm run check
```

Node.js **20.19+** is required. Both the monorepo root and `frontend/` include
`.nvmrc` files pinning the expected version for frontend tasks.

---

## Local guardrails (recommended for solo-fast direct-to-main)

### Pre-commit (recommended)

This repo includes a `.pre-commit-config.yaml` with fast, mechanical checks
(whitespace/EOF fixes, YAML validation, detecting private keys).

Install once:

```bash
pipx install pre-commit
```

Enable “run on commit”:

```bash
pre-commit install
```

Run on demand:

```bash
pre-commit run --all-files
```

Monorepo convenience: if the repo-root venv already exists, you can run:

```bash
../.venv/bin/pre-commit run --all-files
```

### Pre-push hook (recommended)

This runs automatically on every `git push` and prevents pushing broken `main`:

```bash
./scripts/install-pre-push-hook.sh
```

To bypass once (emergency only):

- `git push --no-verify`
- or set `HA_SKIP_PRE_PUSH=1`

---

## Where to run what (local vs VPS)

- Run this doc’s setup and hooks on your **local dev machine**.
- Run production deploy + verification on the **VPS** (see backend runbook).
