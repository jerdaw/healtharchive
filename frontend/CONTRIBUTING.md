# Contributing (HealthArchive Frontend)

## Quickstart

- Install: `npm ci`
- Dev: `npm run dev`
- Full checks (what CI runs): `npm run check`

## Optional: pre-commit

This repo includes a `.pre-commit-config.yaml` with fast, mechanical checks (whitespace/EOF, YAML/TOML validation, detecting private keys).

- Install (recommended): `pipx install pre-commit` (or `python -m pip install --user pre-commit`)
- Enable: `pre-commit install`
- Run on demand: `pre-commit run --all-files`
  - Mono-repo convenience: you can also run `../healtharchive-backend/.venv/bin/pre-commit run --all-files` if you already have the backend venv.

Note: CI runs these hooks (pull requests + pushes to `main`). Installing the hook locally avoids “CI fixed whitespace” failures.

## Optional: pre-push (recommended for solo-fast direct-to-main)

If you're pushing directly to `main`, a local pre-push hook helps keep "green main" true by running checks before every push.

- Install: `./scripts/install-pre-push-hook.sh`
- Bypass once: `git push --no-verify` (or set `HA_SKIP_PRE_PUSH=1`)
