from __future__ import annotations

from ha_backend import runtime_metrics


def test_search_metrics_include_process_label(monkeypatch) -> None:
    monkeypatch.setattr(runtime_metrics.os, "getpid", lambda: 4242)

    lines = "\n".join(runtime_metrics.render_search_metrics_prometheus())

    assert 'healtharchive_search_requests_total{pid="4242"}' in lines
    assert 'healtharchive_search_errors_total{pid="4242"}' in lines
    assert 'healtharchive_search_errors_by_type{type="timeout",pid="4242"}' in lines
    assert 'healtharchive_search_duration_seconds_bucket{le="0.05",pid="4242"}' in lines
    assert 'healtharchive_search_duration_seconds_sum{pid="4242"}' in lines
    assert 'healtharchive_search_mode_total{mode="newest",pid="4242"}' in lines
    assert 'healtharchive_search_duration_seconds_max{pid="4242"}' in lines
