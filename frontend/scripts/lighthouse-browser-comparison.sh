#!/usr/bin/env bash
set -euo pipefail

readonly APP_SOURCE_SHA="6d6ae6c99f606884aecf3fa698a799f1ee0a354f"
readonly HELPER_BRANCH="fix/production-public-build-config-20261013"
readonly RUNNER_IMAGE_VERSION="20261012.334.1"
readonly CHROME155_VERSION="155.0.8059.39"
readonly CHROME148_VERSION="148.0.7778.97"
readonly MANIFEST_URL="https://googlechromelabs.github.io/chrome-for-testing/148.0.7778.97.json"
readonly ARCHIVE_URL="https://storage.googleapis.com/chrome-for-testing-public/148.0.7778.97/linux64/chrome-linux64.zip"
readonly SCRIPT_PATH="$(realpath -e "${BASH_SOURCE[0]}")"

write_failure_summary() {
  local reason="$1"
  local line
  line="experimentStatus=blocked reason=$reason"
  printf '%s\n' "$line"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      printf '\n### Temporary Lighthouse browser comparison\n'
      printf '%s\n' "$line"
      printf 'No browser comparison was run; the ordinary Frontend CI gate is independent.\n'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

emit_safe_line() {
  local line="$1"
  printf '%s\n' "$line"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "$line" >> "$GITHUB_STEP_SUMMARY"
  fi
}

report_arm_result() {
  local arm="$1"
  local namespace_exit="$2"
  local expected_version="$3"
  local launch_path_sha="$4"
  local result_path="$5"
  local version_check="not-verified"
  local run_exit="unavailable"
  local summary_check="failed"
  local marker_count="0"
  local marker_check="failed"
  local summary_truncated="unknown"
  local summary_header=""

  if [[ -f "$result_path" && ! -L "$result_path" ]]; then
    version_check="$(sed -n 's/^versionCheck=\([a-z-]*\)$/\1/p' "$result_path" | head -n 1)"
    run_exit="$(sed -n 's/^runExit=\([a-z0-9-]*\)$/\1/p' "$result_path" | head -n 1)"
    summary_check="$(sed -n 's/^summaryCheck=\([a-z-]*\)$/\1/p' "$result_path" | head -n 1)"
    summary_header="$(sed -n '/^browserMarkerCount=/p' "$result_path" | head -n 1)"
    if [[ "$summary_header" =~ ^browserMarkerCount=([0-9]+)[[:space:]]browserMarkerVersionCheck=(passed|failed)[[:space:]]summaryTruncated=(true|false)$ ]]; then
      marker_count="${BASH_REMATCH[1]}"
      marker_check="${BASH_REMATCH[2]}"
      summary_truncated="${BASH_REMATCH[3]}"
    fi
    while IFS= read -r safe_line; do
      [[ "$safe_line" == safeDiagnostic=* ]] && emit_safe_line "arm=$arm ${safe_line#safeDiagnostic=}"
    done < "$result_path"
  fi

  if [[ "$namespace_exit" == 0 && "$version_check" == "passed" && \
    "$run_exit" == 0 && "$summary_check" == "passed" && \
    "$marker_check" == "passed" && "$summary_truncated" == "false" ]]; then
    emit_safe_line "arm=$arm state=passed browserVersion=$expected_version browserMarkerCount=$marker_count summaryTruncated=$summary_truncated launchPathSha256=$launch_path_sha"
  else
    emit_safe_line "arm=$arm state=failed-or-blocked namespaceExit=$namespace_exit versionCheck=$version_check runExit=$run_exit summaryCheck=$summary_check markerCount=$marker_count markerVersionCheck=$marker_check summaryTruncated=$summary_truncated launchPathSha256=$launch_path_sha"
    arm_failures=$((arm_failures + 1))
  fi
}

inside_root_namespace() {
  local expected_uid="$1"
  local expected_gid="$2"
  local app_root="$3"
  local node_bin="$4"
  local node_dir="$5"
  local arm="$6"
  local chrome_bin="$7"
  local expected_version="$8"
  local expected_product="$9"
  local arm_dir="${10}"
  local test_mode="${11:-}"
  local script_dir="$(/usr/bin/dirname "$SCRIPT_PATH")"
  local summary_helper="$script_dir/lighthouse-browser-compare-summary.cjs"
  local integrity_helper="$script_dir/lighthouse-browser-compare-integrity.py"
  local default_routes

  if [[ ! "$expected_uid" =~ ^[1-9][0-9]*$ || ! "$expected_gid" =~ ^[0-9]+$ ]]; then
    exit 81
  fi
  if [[ ! -f "$summary_helper" || -L "$summary_helper" || \
    ! -f "$integrity_helper" || -L "$integrity_helper" ]]; then
    exit 85
  fi
  if [[ "$test_mode" == "--test-paths-only" ]]; then
    printf 'insideRootHelperPaths=resolved\n'
    return 0
  fi
  if ! /usr/sbin/ip link set lo up >/dev/null 2>&1; then
    exit 82
  fi
  if ! /usr/sbin/ip -o link show 2>/dev/null | /usr/bin/awk 'NR == 1 && $2 == "lo:" {next} {bad = 1} END {exit !(NR == 1 && !bad)}'; then
    exit 83
  fi
  if ! default_routes="$(/usr/sbin/ip -o route show default 2>/dev/null)"; then
    exit 84
  fi
  if [[ -n "$default_routes" ]]; then
    exit 84
  fi

  exec /usr/bin/setpriv \
    --reuid "$expected_uid" \
    --regid "$expected_gid" \
    --init-groups \
    --no-new-privs \
    -- /usr/bin/env -i \
      PATH="$node_dir:/usr/bin:/bin:/usr/sbin:/sbin" \
      HOME="$arm_dir/home" \
      TMPDIR="$arm_dir/tmp" \
      EXPECTED_UID="$expected_uid" \
      APP_ROOT="$app_root" \
      NODE_BIN="$node_bin" \
      NODE_DIR="$node_dir" \
      SUMMARY_HELPER="$summary_helper" \
      ARM="$arm" \
      CHROME_BIN="$chrome_bin" \
      EXPECTED_VERSION="$expected_version" \
      EXPECTED_PRODUCT="$expected_product" \
      ARM_DIR="$arm_dir" \
      /bin/bash "$SCRIPT_PATH" --inside-user
}

probe_root_namespace() {
  local expected_uid="$1"
  local expected_gid="$2"
  local node_dir="$3"
  local default_routes
  if [[ ! "$expected_uid" =~ ^[1-9][0-9]*$ || ! "$expected_gid" =~ ^[0-9]+$ ]]; then
    exit 91
  fi
  if ! /usr/sbin/ip link set lo up >/dev/null 2>&1; then
    exit 92
  fi
  if ! /usr/sbin/ip -o link show 2>/dev/null | /usr/bin/awk 'NR == 1 && $2 == "lo:" {next} {bad = 1} END {exit !(NR == 1 && !bad)}'; then
    exit 93
  fi
  if ! default_routes="$(/usr/sbin/ip -o route show default 2>/dev/null)"; then
    exit 94
  fi
  if [[ -n "$default_routes" ]]; then
    exit 94
  fi
  exec /usr/bin/setpriv \
    --reuid "$expected_uid" \
    --regid "$expected_gid" \
    --init-groups \
    --no-new-privs \
    -- /usr/bin/env -i PATH="$node_dir:/usr/bin:/bin:/usr/sbin:/sbin" \
      /bin/bash "$SCRIPT_PATH" --probe-user "$expected_uid"
}

probe_user_namespace() {
  local actual_uid
  local effective_caps
  actual_uid="$(id -u)"
  effective_caps="$(awk '/^CapEff:/ {print $2}' /proc/self/status)"
  [[ "$actual_uid" == "$1" && "$actual_uid" != 0 && "$effective_caps" == "0000000000000000" ]]
}

inside_user_namespace() {
  local actual_uid
  local effective_caps
  actual_uid="$(id -u)"
  effective_caps="$(awk '/^CapEff:/ {print $2}' /proc/self/status)"
  if [[ "$actual_uid" != "$EXPECTED_UID" || "$actual_uid" == 0 || "$effective_caps" != "0000000000000000" ]]; then
    printf 'versionCheck=not-run\nrunExit=not-run\n' > "$ARM_DIR/result.txt"
    exit 85
  fi

  local version_text
  if ! version_text="$(/usr/bin/env -i \
    PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin" \
    HOME="$ARM_DIR/home" TMPDIR="$ARM_DIR/tmp" \
    "$CHROME_BIN" --version 2>/dev/null)"; then
    printf 'versionCheck=failed\nrunExit=not-run\n' > "$ARM_DIR/result.txt"
    exit 86
  fi

  local version_check="failed"
  if [[ "$EXPECTED_PRODUCT" == "chrome" && "$version_text" == "Google Chrome $EXPECTED_VERSION" ]]; then
    version_check="passed"
  elif [[ "$EXPECTED_PRODUCT" == "chrome-for-testing" && "$version_text" == "Google Chrome for Testing $EXPECTED_VERSION" ]]; then
    version_check="passed"
  fi
  unset version_text
  if [[ "$version_check" != "passed" ]]; then
    printf 'versionCheck=failed\nrunExit=not-run\n' > "$ARM_DIR/result.txt"
    exit 87
  fi

  local run_exit=0
  (
    cd "$APP_ROOT/frontend"
    /usr/bin/env -i \
      PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin" \
      HOME="$ARM_DIR/home" TMPDIR="$ARM_DIR/tmp" \
      CI=true \
      NODE_ENV=production \
      CHROME_PATH="$CHROME_BIN" \
      NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001 \
      NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8001 \
      NEXT_PUBLIC_REPLAY_BASE_URL=https://replay-sentinel.invalid \
      NEXT_PUBLIC_SHOW_API_HEALTH_BANNER=false \
      NEXT_PUBLIC_LOG_API_HEALTH_FAILURE=false \
      NEXT_PUBLIC_SHOW_API_BASE_HINT=false \
      NEXT_TELEMETRY_DISABLED=1 \
      "$NODE_BIN" scripts/run-lighthouse.mjs
  ) > "$ARM_DIR/raw-run.log" 2>&1 || run_exit=$?

  local summary_exit=0
  "$NODE_BIN" "$SUMMARY_HELPER" \
    "$ARM_DIR/raw-run.log" "$EXPECTED_VERSION" \
    > "$ARM_DIR/safe-diagnostics.txt" 2>/dev/null || summary_exit=$?

  {
    printf 'versionCheck=%s\n' "$version_check"
    printf 'runExit=%s\n' "$run_exit"
    printf 'summaryCheck=%s\n' "$([[ "$summary_exit" == 0 ]] && printf passed || printf failed)"
    cat "$ARM_DIR/safe-diagnostics.txt"
  } > "$ARM_DIR/result.txt"

  if [[ "$run_exit" != 0 || "$summary_exit" != 0 ]]; then
    exit 1
  fi
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

if [[ "${1:-}" == "--inside-root" ]]; then
  shift
  inside_root_namespace "$@"
  exit $?
fi
if [[ "${1:-}" == "--inside-user" ]]; then
  inside_user_namespace
  exit $?
fi
if [[ "${1:-}" == "--probe-root" ]]; then
  shift
  probe_root_namespace "$@"
  exit $?
fi
if [[ "${1:-}" == "--probe-user" ]]; then
  shift
  probe_user_namespace "$@"
  exit $?
fi

if [[ "$#" != 1 || -z "${GITHUB_WORKSPACE:-}" || -z "${RUNNER_TEMP:-}" || -z "${GITHUB_STEP_SUMMARY:-}" ]]; then
  write_failure_summary "missing-runner-input"
  exit 1
fi

readonly APP_ROOT="$(realpath -e "$1")"
readonly WORKSPACE="$(realpath -e "$GITHUB_WORKSPACE")"
readonly TEMP_ROOT="$(realpath -e "$RUNNER_TEMP")"
readonly INTEGRITY_HELPER="$WORKSPACE/frontend/scripts/lighthouse-browser-compare-integrity.py"
readonly SUMMARY_HELPER="$WORKSPACE/frontend/scripts/lighthouse-browser-compare-summary.cjs"
readonly HELPER_SHA="${COMPARISON_HELPER_SHA:-}"
readonly APP_HEAD="$(git -C "$APP_ROOT" rev-parse HEAD 2>/dev/null || true)"
readonly HELPER_HEAD="$(git -C "$WORKSPACE" rev-parse HEAD 2>/dev/null || true)"
readonly RUNNER_UID="$(id -u)"
readonly RUNNER_GID="$(id -g)"
readonly NODE_BIN="$(command -v node || true)"
readonly NODE_DIR="$(dirname "${NODE_BIN:-/nonexistent}")"
readonly CURL_BIN="$(command -v curl || true)"
readonly CHROME155_CANDIDATE="$(command -v google-chrome || command -v google-chrome-stable || true)"
WORK_DIR=""
REPORT_DIR="$APP_ROOT/frontend/.lighthouseci"
arm_failures=0

cleanup_reports() {
  if [[ -L "$REPORT_DIR" ]]; then
    return 1
  fi
  if [[ -e "$REPORT_DIR" ]]; then
    rm -rf -- "$REPORT_DIR"
  fi
}

cleanup() {
  cleanup_reports >/dev/null 2>&1 || true
  if [[ -n "$WORK_DIR" && "$WORK_DIR" == "$TEMP_ROOT"/ha-lighthouse-comparison.* && -d "$WORK_DIR" && ! -L "$WORK_DIR" ]]; then
    rm -rf -- "$WORK_DIR"
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail_preflight() {
  local reason="$1"
  write_failure_summary "$reason"
  exit 1
}

if [[ "${ImageOS:-}" != "ubuntu24" || "${ImageVersion:-}" != "$RUNNER_IMAGE_VERSION" ]]; then
  fail_preflight "runner-image-mismatch"
fi
if [[ "$APP_ROOT" != "$WORKSPACE/app-under-test" || "$APP_HEAD" != "$APP_SOURCE_SHA" ]]; then
  fail_preflight "app-source-mismatch"
fi
if [[ "${GITHUB_HEAD_REF:-}" != "$HELPER_BRANCH" ]]; then
  fail_preflight "helper-branch-mismatch"
fi
if [[ "$HELPER_HEAD" != "$HELPER_SHA" ]]; then
  fail_preflight "helper-source-mismatch"
fi
if [[ "$RUNNER_UID" == 0 || ! "$RUNNER_UID" =~ ^[1-9][0-9]*$ || ! "$RUNNER_GID" =~ ^[0-9]+$ ]]; then
  fail_preflight "runner-identity-invalid"
fi
if [[ -z "$NODE_BIN" || -z "$CURL_BIN" || -z "$CHROME155_CANDIDATE" || \
  ! -x /usr/bin/python3 || ! -x /usr/bin/sudo || ! -x /usr/bin/unshare || \
  ! -x /usr/bin/setpriv || ! -x /usr/sbin/ip ]]; then
  fail_preflight "required-tool-missing"
fi
if [[ "$("$NODE_BIN" --version 2>/dev/null || true)" != "v20.19.0" ]]; then
  fail_preflight "node-version-mismatch"
fi
if [[ ! -f "$INTEGRITY_HELPER" || -L "$INTEGRITY_HELPER" || \
  ! -f "$SUMMARY_HELPER" || -L "$SUMMARY_HELPER" || \
  ! -f "$APP_ROOT/frontend/scripts/run-lighthouse.mjs" ]]; then
  fail_preflight "comparison-source-missing"
fi

WORK_DIR="$(mktemp -d "$TEMP_ROOT/ha-lighthouse-comparison.XXXXXX")"
chmod 700 "$WORK_DIR"
mkdir -m 700 "$WORK_DIR/home"

emit_safe_line ""
emit_safe_line "### Temporary Lighthouse browser comparison"
emit_safe_line "experimentStatus=preparing"
emit_safe_line "helperSource=$HELPER_HEAD appSource=$APP_HEAD runnerImage=$ImageOS/$ImageVersion node=20.19.0"
emit_safe_line "Each browser arm uses the unchanged 3-route × 3-run Lighthouse config, retry behavior, budgets, and 300-second watchdog."
emit_safe_line "This non-blocking experiment is not merge acceptance or proof of browser-version causality."

if ! /usr/bin/sudo -n /usr/bin/unshare --net --fork -- \
  /bin/bash "$SCRIPT_PATH" --probe-root "$RUNNER_UID" "$RUNNER_GID" "$NODE_DIR" \
  >"$WORK_DIR/netns-probe.log" 2>&1; then
  fail_preflight "loopback-namespace-unavailable"
fi

# Fetch the exact versioned manifest and archive with an empty environment and no redirects.
manifest_status="$(env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin HOME="$WORK_DIR/home" \
  "$CURL_BIN" -q --silent --show-error --fail --noproxy '*' --connect-timeout 15 --max-time 30 \
  --proto '=https' --tlsv1.2 --output "$WORK_DIR/manifest.json" --write-out '%{http_code}' \
  "$MANIFEST_URL" 2>"$WORK_DIR/manifest-curl.err" || true)"
if [[ "$manifest_status" != "200" ]]; then
  fail_preflight "official-manifest-unavailable"
fi
if ! /usr/bin/python3 -I "$INTEGRITY_HELPER" manifest "$WORK_DIR/manifest.json" >"$WORK_DIR/manifest-check.txt" 2>/dev/null; then
  fail_preflight "official-manifest-mismatch"
fi

archive="$WORK_DIR/chrome-linux64.zip"
archive_headers="$WORK_DIR/chrome-linux64.headers"
archive_status="$(env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin HOME="$WORK_DIR/home" \
  "$CURL_BIN" -q --silent --show-error --fail --noproxy '*' --connect-timeout 15 --max-time 240 \
  --proto '=https' --tlsv1.2 --dump-header "$archive_headers" --output "$archive" \
  --write-out '%{http_code}' "$ARCHIVE_URL" 2>"$WORK_DIR/archive-curl.err" || true)"
if [[ "$archive_status" != "200" ]]; then
  fail_preflight "official-archive-unavailable"
fi
if ! /usr/bin/python3 -I "$INTEGRITY_HELPER" headers "$archive_headers" >"$WORK_DIR/header-check.txt" 2>/dev/null; then
  fail_preflight "official-archive-metadata-mismatch"
fi
if ! /usr/bin/python3 -I "$INTEGRITY_HELPER" archive "$archive" >"$WORK_DIR/archive-check.txt" 2>/dev/null; then
  fail_preflight "official-archive-checksum-mismatch"
fi
if ! /usr/bin/python3 -I "$INTEGRITY_HELPER" extract "$archive" "$WORK_DIR/cft148" >"$WORK_DIR/extract-check.txt" 2>/dev/null; then
  fail_preflight "official-archive-layout-mismatch"
fi

chrome148="$WORK_DIR/cft148/chrome-linux64/chrome"
if [[ ! -f "$chrome148" || ! -x "$chrome148" || -L "$chrome148" ]]; then
  fail_preflight "chrome148-binary-missing"
fi
chrome155="$(realpath -e "$CHROME155_CANDIDATE" 2>/dev/null || true)"
if [[ -z "$chrome155" || ! -f "$chrome155" || ! -x "$chrome155" ]]; then
  fail_preflight "chrome155-binary-missing"
fi
chrome155_path_sha="$(sha256sum "$chrome155" | awk '{print $1}')"
chrome148_path_sha="$(sha256sum "$chrome148" | awk '{print $1}')"
archive_sha="$(awk '{for (i = 1; i <= NF; i++) if ($i ~ /^sha256=/) {sub(/^sha256=/, "", $i); print $i}}' "$WORK_DIR/archive-check.txt")"
if [[ ! "$chrome155_path_sha" =~ ^[0-9a-f]{64}$ || ! "$chrome148_path_sha" =~ ^[0-9a-f]{64}$ || ! "$archive_sha" =~ ^[0-9a-f]{64}$ ]]; then
  fail_preflight "browser-digest-unavailable"
fi

run_arm() {
  local arm="$1"
  local chrome_bin="$2"
  local expected_version="$3"
  local expected_product="$4"
  local binary_sha="$5"
  local arm_dir="$WORK_DIR/$arm"
  local namespace_exit=0
  if ! mkdir -m 700 "$arm_dir" || ! mkdir -m 700 "$arm_dir/home" "$arm_dir/tmp"; then
    emit_safe_line "arm=$arm state=failed-or-blocked reason=temporary-directory-unavailable"
    arm_failures=$((arm_failures + 1))
    return 0
  fi

  if ! cleanup_reports; then
    emit_safe_line "arm=$arm state=blocked reason=report-path-unsafe"
    arm_failures=$((arm_failures + 1))
    return 0
  fi

  /usr/bin/sudo -n /usr/bin/unshare --net --fork --mount-proc -- \
    /bin/bash "$SCRIPT_PATH" --inside-root \
      "$RUNNER_UID" "$RUNNER_GID" "$APP_ROOT" "$NODE_BIN" "$NODE_DIR" \
      "$arm" "$chrome_bin" "$expected_version" "$expected_product" "$arm_dir" \
    >"$arm_dir/namespace-output.log" 2>&1 || namespace_exit=$?

  report_arm_result "$arm" "$namespace_exit" "$expected_version" "$binary_sha" "$arm_dir/result.txt"

  if ! cleanup_reports; then
    emit_safe_line "arm=$arm cleanup=blocked-report-path-unsafe"
    arm_failures=$((arm_failures + 1))
  fi
}

run_arm "chrome155-current" "$chrome155" "$CHROME155_VERSION" "chrome" "$chrome155_path_sha"
run_arm "chrome148-cft" "$chrome148" "$CHROME148_VERSION" "chrome-for-testing" "$chrome148_path_sha"

if [[ "$arm_failures" == 0 ]]; then
  emit_safe_line "experimentStatus=completed-both-arms-passed"
  exit 0
fi
emit_safe_line "experimentStatus=completed-with-arm-failure-or-isolation-block"
exit 1
