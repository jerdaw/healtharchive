#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "healtharchive-cache-cold-archive-status-v1"
DEFAULT_OUT = Path(
    os.environ.get(
        "HEALTHARCHIVE_CACHE_COLD_ARCHIVE_STATUS_PATH",
        "/tmp/healtharchive-cache-cold-archive-status.json",
    )
)
MAX_BOUNDED_INT = 10_000_000

FIELD_ORDER = [
    "schemaVersion",
    "coldArchiveConfigured",
    "lastVerifiedSyncAgeSeconds",
    "lastVerifiedSyncStatus",
    "lastRestoreProofStatus",
    "nasRetentionVerified",
    "dbBackupMirrorVerified",
    "hotCacheJobCount",
    "evictedRestorableJobCount",
    "manifestVerifiedCount",
    "storageBoxRetired",
]
BOOL_FIELDS = {
    "coldArchiveConfigured",
    "nasRetentionVerified",
    "dbBackupMirrorVerified",
    "storageBoxRetired",
}
INT_FIELDS = {
    "lastVerifiedSyncAgeSeconds",
    "hotCacheJobCount",
    "evictedRestorableJobCount",
    "manifestVerifiedCount",
}
STATUS_FIELDS = {
    "lastVerifiedSyncStatus",
    "lastRestoreProofStatus",
}
ALLOWED_STATUSES = {
    "unknown",
    "not-started",
    "not-configured",
    "dry-run-passed",
    "sync-pending",
    "verified",
    "passed",
    "failed",
    "blocked",
    "stale",
    "rollback-ready",
    "cancel-ready",
}
ASSIGNMENT_SECRET_WORDS = ("token", "secret", "password")
ASSIGNMENT_SECRET_PATTERNS = [rf"[?&]{word}{'='}" for word in ASSIGNMENT_SECRET_WORDS] + [
    rf"{word}{'='}" for word in ASSIGNMENT_SECRET_WORDS
]
HEADER_SECRET_PATTERNS = [
    "Authorization" + r":\s*",
    "Cookie" + r":\s*",
]
AUTHENTICATED_URL_PATTERNS = [rf"{scheme}://\S+:\S+@" for scheme in ("postgres", "redis")]
SECRET_SHAPE_RE = re.compile(
    "("
    + "|".join(
        [
            *HEADER_SECRET_PATTERNS,
            r"Bearer\s+[A-Za-z0-9._~+/=-]{12,}",
            *ASSIGNMENT_SECRET_PATTERNS,
            r"api[_-]?key",
            *AUTHENTICATED_URL_PATTERNS,
            r"[a-z][a-z0-9+.-]*://[^/\s:]+:[^@\s]+@",
            r"BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY",
        ]
    )
    + ")",
    re.IGNORECASE,
)
PRIVATE_TOPOLOGY_SHAPE_RE = re.compile(
    r"("
    r"ssh://|sftp://|rsync://|"
    r"(?<!\d)(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01])|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\.\d+\.\d+(?!\d)|"
    r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b|"
    r"/(?:srv|etc|home|mnt|volume|var|opt|Users)/"
    r")",
    re.IGNORECASE,
)
PRIVATE_FIELD_RE = re.compile(
    r"(nas.*(host|ip|share|path|mount|user)|hostname|private.*ip|shareName|mountOptions|sshConfig|privateKey|credential)",
    re.IGNORECASE,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def error(error_id: str, category: str, reason: str) -> dict[str, str]:
    return {"id": error_id, "category": category, "reason": reason}


def bounded_int(value: int) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < 0
        or value > MAX_BOUNDED_INT
    ):
        raise ValueError(f"bounded integer required: 0..{MAX_BOUNDED_INT}")
    return value


def build_payload(
    *,
    cold_archive_configured: bool = False,
    last_verified_sync_age_seconds: int = 0,
    last_verified_sync_status: str = "not-configured",
    last_restore_proof_status: str = "not-started",
    nas_retention_verified: bool = False,
    db_backup_mirror_verified: bool = False,
    hot_cache_job_count: int = 0,
    evicted_restorable_job_count: int = 0,
    manifest_verified_count: int = 0,
    storage_box_retired: bool = False,
) -> dict[str, Any]:
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "coldArchiveConfigured": bool(cold_archive_configured),
        "lastVerifiedSyncAgeSeconds": bounded_int(last_verified_sync_age_seconds),
        "lastVerifiedSyncStatus": last_verified_sync_status,
        "lastRestoreProofStatus": last_restore_proof_status,
        "nasRetentionVerified": bool(nas_retention_verified),
        "dbBackupMirrorVerified": bool(db_backup_mirror_verified),
        "hotCacheJobCount": bounded_int(hot_cache_job_count),
        "evictedRestorableJobCount": bounded_int(evicted_restorable_job_count),
        "manifestVerifiedCount": bounded_int(manifest_verified_count),
        "storageBoxRetired": bool(storage_box_retired),
    }
    return {key: payload[key] for key in FIELD_ORDER}


def iter_strings(value: Any, path: str = ""):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield from iter_strings(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            child_path = f"{path}.{index}" if path else str(index)
            yield from iter_strings(child, child_path)


def validate_payload(payload: Any) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    secret_shape = False
    private_topology_shape = False

    if not isinstance(payload, dict):
        errors.append(
            error("payload-not-object", "schema", "Status payload must be a JSON object.")
        )
        payload = {}

    for key in payload:
        if key not in FIELD_ORDER:
            if PRIVATE_FIELD_RE.search(str(key)):
                category = "private-topology"
                private_topology_shape = True
            else:
                category = "schema"
            errors.append(
                error(f"unknown-field-{key}", category, "Unknown status fields are not allowed.")
            )

    if payload.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(
            error("schema-version", "schema", "Unsupported or missing status schema version.")
        )

    for key in sorted(BOOL_FIELDS):
        if not isinstance(payload.get(key), bool):
            errors.append(
                error(
                    f"bool-{key}", "schema", "Required boolean status field is missing or invalid."
                )
            )

    for key in sorted(INT_FIELDS):
        value = payload.get(key)
        if (
            isinstance(value, bool)
            or not isinstance(value, int)
            or value < 0
            or value > MAX_BOUNDED_INT
        ):
            errors.append(
                error(
                    f"metric-{key}",
                    "schema",
                    "Required count or age field is outside the allowed bound.",
                )
            )

    for key in sorted(STATUS_FIELDS):
        if payload.get(key) not in ALLOWED_STATUSES:
            errors.append(
                error(f"status-{key}", "schema", "Status field is missing or not allowlisted.")
            )

    for path, text in iter_strings(payload):
        if SECRET_SHAPE_RE.search(text):
            secret_shape = True
            errors.append(
                error(
                    f"sensitive-shape-{path.replace('.', '-')}",
                    "sensitive-shape",
                    "Secret-shaped text was detected.",
                )
            )
        if PRIVATE_TOPOLOGY_SHAPE_RE.search(text):
            private_topology_shape = True
            errors.append(
                error(
                    f"private-topology-shape-{path.replace('.', '-')}",
                    "private-topology",
                    "Private-topology-shaped text was detected.",
                )
            )

    return {
        "generatedAt": utc_now(),
        "schemaVersion": "healtharchive-cache-cold-archive-status-validation-v1",
        "valid": not errors,
        "errorCount": len(errors),
        "errors": errors,
        "secretShapeDetected": secret_shape,
        "privateTopologyShapeDetected": private_topology_shape,
        "safety": {
            "secretValuesCollected": False,
            "rawSensitiveOutputCollected": False,
            "rawLogsCollected": False,
            "rawDirectoryListingsCollected": False,
            "rawMountOptionsCollected": False,
            "nasTopologyCollected": False,
            "providerConsoleCollected": False,
            "credentialsCollected": False,
        },
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp.chmod(0o644)
    os.replace(tmp, path)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"ERROR: status JSON not found: {path}") from None
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: status JSON is invalid: {exc}") from exc


def print_summary(path: Path, validation: dict[str, Any], *, wrote: bool) -> None:
    print("HealthArchive cache/cold archive status")
    print(f"  status_path={path}")
    print(f"  wrote_status_json={str(wrote).lower()}")
    print(f"  status_json_valid={str(validation['valid']).lower()}")
    print(f"  error_count={validation['errorCount']}")
    print(f"  secret_shape_detected={str(validation['secretShapeDetected']).lower()}")
    print(
        f"  private_topology_shape_detected={str(validation['privateTopologyShapeDetected']).lower()}"
    )
    print("  secret_values_collected=false")
    print("  raw_sensitive_output_collected=false")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="HealthArchive VPS helper: write or validate value-free cache/cold archive status JSON."
    )
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Status JSON output path.")
    parser.add_argument(
        "--validate", help="Validate an existing status JSON file instead of writing one."
    )
    parser.add_argument("--json-out", help="Optional validation JSON output path.")
    parser.add_argument(
        "--cold-archive-configured",
        action="store_true",
        help="Mark the cold archive as configured.",
    )
    parser.add_argument("--last-verified-sync-age-seconds", type=int, default=0)
    parser.add_argument(
        "--last-verified-sync-status", choices=sorted(ALLOWED_STATUSES), default="not-configured"
    )
    parser.add_argument(
        "--last-restore-proof-status", choices=sorted(ALLOWED_STATUSES), default="not-started"
    )
    parser.add_argument("--nas-retention-verified", action="store_true")
    parser.add_argument("--db-backup-mirror-verified", action="store_true")
    parser.add_argument("--hot-cache-job-count", type=int, default=0)
    parser.add_argument("--evicted-restorable-job-count", type=int, default=0)
    parser.add_argument("--manifest-verified-count", type=int, default=0)
    parser.add_argument("--storage-box-retired", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.validate:
        path = Path(args.validate)
        payload = read_json(path)
        validation = validate_payload(payload)
        wrote = False
    else:
        path = Path(args.out)
        try:
            payload = build_payload(
                cold_archive_configured=args.cold_archive_configured,
                last_verified_sync_age_seconds=args.last_verified_sync_age_seconds,
                last_verified_sync_status=args.last_verified_sync_status,
                last_restore_proof_status=args.last_restore_proof_status,
                nas_retention_verified=args.nas_retention_verified,
                db_backup_mirror_verified=args.db_backup_mirror_verified,
                hot_cache_job_count=args.hot_cache_job_count,
                evicted_restorable_job_count=args.evicted_restorable_job_count,
                manifest_verified_count=args.manifest_verified_count,
                storage_box_retired=args.storage_box_retired,
            )
        except ValueError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 2
        validation = validate_payload(payload)
        if validation["valid"] is True:
            write_json(path, payload)
            wrote = True
        else:
            wrote = False

    if args.json_out:
        write_json(Path(args.json_out), validation)
    print_summary(path, validation, wrote=wrote)
    return 0 if validation["valid"] is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
