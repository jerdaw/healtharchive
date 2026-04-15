#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Install (or remove) a local .git/hooks/pre-push hook for this repo.

The hook runs:
  1) `pre-commit run --all-files` (fast mechanical checks)
  2) `npm run check` (what CI runs)

Usage:
  ./scripts/install-pre-push-hook.sh [--force] [--uninstall]

Notes:
  - Install pre-commit once (recommended): `pipx install pre-commit`
  - To bypass temporarily: `git push --no-verify` (or set HA_SKIP_PRE_PUSH=1).
EOF
}

FORCE="false"
UNINSTALL="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE="true"
      shift 1
      ;;
    --uninstall)
      UNINSTALL="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required." >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "ERROR: Not inside a git repository." >&2
  exit 1
fi

hooks_dir="$(git rev-parse --git-path hooks)"
hook_path="${hooks_dir}/pre-push"
marker="# healtharchive:pre-push:v1"

if [[ "${UNINSTALL}" == "true" ]]; then
  if [[ -f "${hook_path}" ]] && grep -qF "${marker}" "${hook_path}" 2>/dev/null; then
    rm -f "${hook_path}"
    echo "Removed: ${hook_path}"
    exit 0
  fi
  echo "Nothing to remove: ${hook_path}"
  exit 0
fi

if [[ -f "${hook_path}" ]] && ! grep -qF "${marker}" "${hook_path}" 2>/dev/null; then
  if [[ "${FORCE}" != "true" ]]; then
    echo "ERROR: ${hook_path} already exists and doesn't look like ours." >&2
    echo "Hint: re-run with --force to overwrite, or --uninstall to remove ours." >&2
    exit 2
  fi
fi

tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

cat >"${tmp}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
${marker}

if [[ "\${HA_SKIP_PRE_PUSH:-}" == "1" ]]; then
  echo "HA_SKIP_PRE_PUSH=1 set; skipping HealthArchive pre-push checks." >&2
  exit 0
fi

repo_root="\$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "\${repo_root}"

pre_commit_cmd=""
if command -v pre-commit >/dev/null 2>&1; then
  pre_commit_cmd="pre-commit"
elif [[ -x "${repo_root}/.venv/bin/pre-commit" ]]; then
  # Monorepo convenience: reuse the repo-root venv when available.
  pre_commit_cmd="${repo_root}/.venv/bin/pre-commit"
elif [[ -x "../healtharchive/.venv/bin/pre-commit" ]]; then
  # Legacy split-repo convenience: reuse backend venv's pre-commit if available.
  pre_commit_cmd="../healtharchive/.venv/bin/pre-commit"
else
  echo "ERROR: pre-commit is required for this repo's pre-push checks." >&2
  echo "Install it once with: pipx install pre-commit" >&2
  exit 1
fi

echo "HealthArchive pre-push: running 'pre-commit run --all-files'..." >&2
"\${pre_commit_cmd}" run --all-files

echo "HealthArchive pre-push: running 'npm run check'..." >&2
npm run check
EOF

chmod +x "${tmp}"
mkdir -p "${hooks_dir}"
install -m 0755 "${tmp}" "${hook_path}"

echo "Installed: ${hook_path}"
echo "Tip: bypass once with: git push --no-verify"
