#!/usr/bin/env python3
"""Render a draft annual campaign closeout report from captured evidence."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

SECRET_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"HEALTHARCHIVE_ADMIN_TOKEN",
        r"Authorization:\s*Bearer\s+\S+",
        r"\bBearer\s+[A-Za-z0-9._~+/=-]{12,}",
        r"postgres(?:ql)?://[^@\s]+@",
        r"HC_[A-Z0-9_]*URL\s*=",
        r"api[_-]?key\s*[:=]",
        r"password\s*[:=]",
        r"secret\s*[:=]",
    )
]


@dataclass(frozen=True)
class BackupSnapshot:
    local_dump: str
    storagebox_dump: str


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"ERROR: required JSON file not found: {path}") from None
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: invalid JSON in {path}: {exc}") from exc


def _optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return _load_json(path)


def _fmt(value: Any, default: str = "review required") -> str:
    if value is None:
        return default
    if isinstance(value, bool):
        return "yes" if value else "no"
    text = str(value).strip()
    return text if text else default


def _fmt_int(value: Any) -> str:
    if value is None or value == "":
        return "review required"
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return str(value)


def _fmt_size(size_bytes: Any) -> str:
    try:
        size = int(size_bytes)
    except (TypeError, ValueError):
        return _fmt(size_bytes)

    units = ["B", "KiB", "MiB", "GiB", "TiB"]
    value = float(size)
    unit = units[0]
    for unit in units:
        if abs(value) < 1024.0 or unit == units[-1]:
            break
        value /= 1024.0
    if unit == "B":
        return f"{size} B"
    return f"{value:.1f} {unit}"


def _section_replace(report: str, heading: str, replacement: str) -> str:
    pattern = re.compile(
        rf"(^## {re.escape(heading)}\n)(.*?)(?=^## |\Z)",
        flags=re.DOTALL | re.MULTILINE,
    )
    match = pattern.search(report)
    if not match:
        raise SystemExit(f"ERROR: template is missing required heading: ## {heading}")
    return report[: match.start()] + replacement.rstrip() + "\n\n" + report[match.end() :]


def _gate_lookup(summary: dict[str, Any]) -> dict[str, dict[str, str]]:
    gates: dict[str, dict[str, str]] = {}
    for gate in summary.get("gates", []):
        if not isinstance(gate, dict):
            continue
        name = str(gate.get("name") or "")
        if not name:
            continue
        gates[name] = {
            "result": str(gate.get("result") or "review required"),
            "evidence": str(gate.get("evidence") or "review required"),
            "note": str(gate.get("note") or ""),
        }
    return gates


def _combined_gate(gates: dict[str, dict[str, str]], names: list[str]) -> tuple[str, str]:
    selected = [gates[name] for name in names if name in gates]
    if not selected:
        return "review required", "review required"
    result = "pass" if all(gate["result"] == "pass" for gate in selected) else "fail"
    evidence = ", ".join(gate["evidence"] for gate in selected if gate["evidence"])
    return result, evidence or "review required"


def _campaign_rows(
    summary: dict[str, Any], annual_status: dict[str, Any]
) -> tuple[str, int | None]:
    rows = summary.get("annual_sources")
    if not isinstance(rows, list) or not rows:
        rows = []
        for source in annual_status.get("sources", []):
            if not isinstance(source, dict):
                continue
            job = source.get("job") if isinstance(source.get("job"), dict) else {}
            rescue = job.get("rescue") if isinstance(job.get("rescue"), dict) else {}
            rows.append(
                {
                    "source": source.get("sourceCode"),
                    "job_id": job.get("jobId"),
                    "status": source.get("status"),
                    "indexed_pages": job.get("indexedPageCount"),
                    "backend": rescue.get("effectiveBackend"),
                    "rescue": rescue.get("status"),
                    "operator_state": rescue.get("operatorState"),
                    "is_search_ready": source.get("isSearchReady"),
                }
            )

    lines = [
        "| Source | Job/shards | Status | Indexed pages | Backend/provenance | Readiness | Notes |",
        "| --- | ---: | --- | ---: | --- | --- | --- |",
    ]
    total = 0
    saw_count = False
    for row in rows:
        if not isinstance(row, dict):
            continue
        indexed_pages = row.get("indexed_pages")
        if isinstance(indexed_pages, int):
            total += indexed_pages
            saw_count = True
        backend = _fmt(row.get("backend"))
        rescue = _fmt(row.get("rescue"))
        backend_label = f"{backend} / {rescue}" if rescue != "review required" else backend
        readiness = (
            "search-ready" if row.get("is_search_ready") else _fmt(row.get("operator_state"))
        )
        lines.append(
            "| {source} | {job} | {status} | {pages} | {backend} | {readiness} | {notes} |".format(
                source=_fmt(row.get("source")),
                job=_fmt(row.get("job_id")),
                status=_fmt(row.get("status")),
                pages=_fmt_int(indexed_pages),
                backend=backend_label,
                readiness=readiness,
                notes="review required: source notes, accepted gaps, and exclusions",
            )
        )

    summary_total = summary.get("annual_summary", {}).get("indexedPageCount")
    if summary_total is None:
        summary_total = summary.get("annual_summary", {}).get("indexedPages")
    if summary_total is not None:
        try:
            return "\n".join(lines), int(summary_total)
        except (TypeError, ValueError):
            pass
    return "\n".join(lines), total if saw_count else None


def _validation_rows(summary: dict[str, Any]) -> str:
    gates = _gate_lookup(summary)
    rows = [
        ("Annual status / `ha-check`", ["annual_status", "ha_check"]),
        ("Search verification", ["annual_search_verify"]),
        ("Public surface", ["public_surface"]),
        ("Replay spot checks", ["public_surface"]),
        ("Baseline drift", ["baseline_drift"]),
        ("Automation posture", ["automation_posture"]),
        ("Active alerts", ["active_healtharchive_alerts"]),
        ("Backups and NAS replication", ["backup_chain"]),
        ("Docker/cache metrics", ["docker_cache_metrics"]),
        ("Timer posture", ["timer_posture"]),
        ("Disk/storage headroom", ["disk_headroom"]),
    ]
    lines = [
        "| Gate | Result | Evidence |",
        "| --- | --- | --- |",
    ]
    for label, names in rows:
        result, evidence = _combined_gate(gates, names)
        if label == "Backups and NAS replication" and result == "pass":
            evidence = f"{evidence}; NASD output still requires operator review"
        if label == "Replay spot checks" and result == "pass":
            evidence = f"{evidence}; verify representative replay examples during review"
        lines.append(f"| {label} | {_fmt(result)} | {_fmt(evidence)} |")
    return "\n".join(lines)


def _parse_backup_snapshot(evidence_dir: Path, summary: dict[str, Any]) -> BackupSnapshot:
    backup_rows = summary.get("backup_rows")
    if not isinstance(backup_rows, list):
        backup_rows = []
    if not backup_rows:
        backup_path = evidence_dir / "backup-chain.tsv"
        if backup_path.exists():
            for line in backup_path.read_text(encoding="utf-8", errors="replace").splitlines()[1:]:
                parts = line.split("\t")
                if len(parts) >= 4:
                    backup_rows.append(
                        {
                            "scope": parts[0],
                            "date": parts[1],
                            "size_bytes": parts[2],
                            "path_or_metric": "\t".join(parts[3:]),
                        }
                    )

    local = [
        row for row in backup_rows if isinstance(row, dict) and row.get("scope") == "local_dump"
    ]
    storagebox = [
        row
        for row in backup_rows
        if isinstance(row, dict) and row.get("scope") == "storagebox_dump"
    ]

    def latest(rows: list[dict[str, Any]]) -> str:
        if not rows:
            return "review required"
        row = sorted(rows, key=lambda item: str(item.get("date") or ""))[-1]
        return "{date} {size} {path}".format(
            date=_fmt(row.get("date")),
            size=_fmt_size(row.get("size_bytes")),
            path=_fmt(row.get("path_or_metric")),
        )

    return BackupSnapshot(local_dump=latest(local), storagebox_dump=latest(storagebox))


def _source_notes(summary: dict[str, Any]) -> str:
    sources = summary.get("sources")
    if not isinstance(sources, list) or not sources:
        sources = [
            row.get("source") for row in summary.get("annual_sources", []) if isinstance(row, dict)
        ]
    lines = [
        "## Source Notes",
        "",
        "_Review required._ Complete one subsection per source before closure.",
    ]
    for source in sources:
        source_code = _fmt(source, default="source")
        lines.extend(
            [
                "",
                f"### `{source_code}`",
                "",
                "- What completed: review required",
                "- Backend/provenance: review required",
                "- Known gaps: review required",
                "- Accepted exclusions: review required",
                "- Follow-ups: review required",
            ]
        )
    return "\n".join(lines)


def _detect_secret_like_text(report: str) -> list[str]:
    hits: list[str] = []
    for pattern in SECRET_PATTERNS:
        if pattern.search(report):
            hits.append(pattern.pattern)
    return hits


def render_report(
    *,
    year: int,
    evidence_dir: Path,
    template_path: Path,
    out_path: Path,
    status: str,
    closeout_date: date,
) -> str:
    summary = _load_json(evidence_dir / "closeout-summary.json")
    annual_status = _optional_json(evidence_dir / "annual-status.json")
    template = template_path.read_text(encoding="utf-8")

    production_ref = _fmt(summary.get("production_ref_short") or summary.get("production_ref"))
    sources = summary.get("sources") if isinstance(summary.get("sources"), list) else []
    source_csv = ",".join(str(source) for source in sources) or "review required"

    report = template
    report = report.replace(
        "# <YEAR> Annual Campaign Closeout Report", f"# {year} Annual Campaign Closeout Report"
    )
    report = re.sub(r"\*\*Status:\*\* .+", f"**Status:** {status}", report, count=1)
    report = report.replace("`<YEAR>`", f"`{year}`")
    report = report.replace("`<YYYY-MM-DD>`", f"`{closeout_date.isoformat()}`")
    report = report.replace("`<git-sha>`", f"`{production_ref}`")
    report = report.replace("`<source codes>`", f"`{source_csv}`")
    report = report.replace("`<paths or links>`", f"`{evidence_dir}`")

    campaign_table, total_indexed = _campaign_rows(summary, annual_status)
    campaign_section = "\n".join(
        [
            "## Campaign Results",
            "",
            "_Generated from closeout evidence. Review the Notes column and Source Notes before closing._",
            "",
            campaign_table,
            "",
            f"Total indexed annual pages: `{_fmt_int(total_indexed)}`",
            f"Ready for search: `{_fmt(summary.get('annual_summary', {}).get('readyForSearch'))}`",
        ]
    )
    report = _section_replace(report, "Campaign Results", campaign_section)

    validation_section = "\n".join(
        [
            "## Validation Summary",
            "",
            "_Generated from closeout gates. Rows that mention review still require operator judgment._",
            "",
            _validation_rows(summary),
        ]
    )
    report = _section_replace(report, "Validation Summary", validation_section)

    report = _section_replace(report, "Source Notes", _source_notes(summary))

    backup = _parse_backup_snapshot(evidence_dir, summary)
    backup_section = "\n".join(
        [
            "## Backup, Retention, and Recovery Posture",
            "",
            "_Partly generated from backup-chain.tsv. NASD and restore-test fields require review._",
            "",
            f"- Latest local dump: {backup.local_dump}",
            f"- Latest Storage Box mirror: {backup.storagebox_dump}",
            "- Latest NASD replicated dump: review required: paste NASD follow-up result",
            "- Restore-test status: review required",
            "- Retention or cleanup decisions: review required",
        ]
    )
    report = _section_replace(report, "Backup, Retention, and Recovery Posture", backup_section)

    placeholders = {
        "Executive Summary": "\n".join(
            [
                "## Executive Summary",
                "",
                "_Review required._ State whether the campaign is search-ready and research-ready, what was captured, and accepted limitations.",
            ]
        ),
        "Incidents, Deviations, and Accepted Gaps": "\n".join(
            [
                "## Incidents, Deviations, and Accepted Gaps",
                "",
                "_Review required._ Classify each item as Closed, Accepted, Ops follow-up, Backlog, or External validation.",
                "",
                "| Item | Classification | Outcome | Follow-up surface |",
                "| --- | --- | --- | --- |",
                "| review required | review required | review required | review required |",
            ]
        ),
        "Remaining Follow-Ups": "\n".join(
            [
                "## Remaining Follow-Ups",
                "",
                "_Review required._ Move every remaining item to the correct roadmap or operations surface.",
                "",
                "| Priority | Item | Owner/surface | Notes |",
                "| --- | --- | --- | --- |",
                "| review required | review required | review required | review required |",
            ]
        ),
        "Public-Safe Summary Text": "\n".join(
            [
                "## Public-Safe Summary Text",
                "",
                "_Review required._ Use this for public, partner, or verifier-facing communication.",
                "",
                "> review required",
            ]
        ),
        "Operator Handoff Text": "\n".join(
            [
                "## Operator Handoff Text",
                "",
                "_Review required._ Use this for internal handoff.",
                "",
                "> review required",
            ]
        ),
    }
    for heading, replacement in placeholders.items():
        report = _section_replace(report, heading, replacement)

    references_section = "\n".join(
        [
            "## References",
            "",
            "- Annual campaign closeout playbook: `docs/operations/playbooks/crawl/annual-campaign-closeout.md`",
            "- Annual campaign scope: `docs/operations/annual-campaign.md`",
            "- Production closeout: `docs/operations/playbooks/validation/production-closeout.md`",
            f"- Closeout evidence directory: `{evidence_dir}`",
            "- Closeout summary: `closeout-summary.json`",
            "- NASD follow-up command: `nasd-followup-command.txt`",
        ]
    )
    report = _section_replace(report, "References", references_section)

    secret_hits = _detect_secret_like_text(report)
    if secret_hits:
        raise SystemExit(
            "ERROR: rendered report matched secret-like pattern(s): " + ", ".join(secret_hits)
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report.rstrip() + "\n", encoding="utf-8")
    return report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True, help="Campaign year")
    parser.add_argument(
        "--evidence-dir", type=Path, required=True, help="Closeout evidence directory"
    )
    parser.add_argument(
        "--template",
        type=Path,
        default=Path("docs/_templates/annual-campaign-closeout-report-template.md"),
        help="Report template path",
    )
    parser.add_argument("--out", type=Path, required=True, help="Output report path")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite an existing report")
    parser.add_argument("--status", default="Draft", help="Report status label")
    parser.add_argument(
        "--closeout-date",
        default=datetime.now(UTC).date().isoformat(),
        help="Closeout date in YYYY-MM-DD format",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.out.exists() and not args.overwrite:
        print(
            f"ERROR: output report already exists: {args.out} (pass --overwrite to replace it)",
            file=sys.stderr,
        )
        return 2

    try:
        closeout_date = date.fromisoformat(args.closeout_date)
    except ValueError:
        print(f"ERROR: invalid --closeout-date: {args.closeout_date}", file=sys.stderr)
        return 2

    render_report(
        year=args.year,
        evidence_dir=args.evidence_dir,
        template_path=args.template,
        out_path=args.out,
        status=args.status,
        closeout_date=closeout_date,
    )
    print(f"Rendered annual closeout report: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
