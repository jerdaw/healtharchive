from __future__ import annotations

import json
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _dashboard_exprs(path: Path) -> list[str]:
    dashboard = json.loads(path.read_text(encoding="utf-8"))
    exprs: list[str] = []
    for panel in dashboard.get("panels", []):
        for target in panel.get("targets", []):
            expr = target.get("expr")
            if isinstance(expr, str):
                exprs.append(expr)
    return exprs


def test_search_dashboards_aggregate_process_local_metrics() -> None:
    dashboard_dir = _repo_root() / "ops" / "observability" / "dashboards"
    dashboard_names = [
        "healtharchive-ops-overview.json",
        "healtharchive-search-performance.json",
    ]

    for dashboard_name in dashboard_names:
        expr_text = "\n".join(_dashboard_exprs(dashboard_dir / dashboard_name))

        assert "sum(rate(healtharchive_search_requests_total[5m]))" in expr_text
        assert (
            'sum(rate(healtharchive_search_errors_by_type{type=~"server|timeout|unknown"}[5m]))'
            in expr_text
        )
        assert "rate(healtharchive_search_errors_total[5m])" not in expr_text
        assert "rate(healtharchive_search_requests_total[5m]) /" not in expr_text
