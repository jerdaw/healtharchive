from __future__ import annotations

from pathlib import Path


def _script_text() -> str:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "vps-install-observability-alerting.sh"
    return script_path.read_text(encoding="utf-8")


def test_alertmanager_routing_pages_only_explicit_pushover_alerts() -> None:
    text = _script_text()

    assert "receiver: healtharchive-null" in text
    assert '- notify="pushover"' in text
    assert '- notification_tier="P0"' in text
    assert '- notification_tier="P1"' in text
    assert "receiver: healtharchive-webhook-pushover" in text
    assert '- severity="critical"' not in text
    assert "repeat_interval: 24h" in text
    assert "repeat_interval: 72h" in text
    assert "group_wait: 2m" in text
    assert "group_wait: 10m" in text
    assert "group_interval: 30m" in text
    assert "group_interval: 6h" in text
    assert "send_resolved: true" in text
    assert "healtharchive-webhook-noncritical" not in text
    assert "healtharchive-webhook-critical" not in text


def test_alertmanager_unit_detection_dry_run_fallback_exists() -> None:
    text = _script_text()

    assert 'if [[ "${APPLY}" != "true" ]]; then' in text
    assert 'AM_UNIT="prometheus-alertmanager.service"' in text
    assert "Could not discover Alertmanager unit in dry-run" in text


def test_alertmanager_groups_by_crawl_identity_and_has_inhibit_rules() -> None:
    text = _script_text()

    assert 'group_by: ["alertname", "source", "job_id"]' in text
    assert "inhibit_rules:" in text
    assert 'alertname="HealthArchiveStorageBoxMountDown"' in text
    assert 'alertname="HealthArchiveStorageHotpathStaleUnrecovered"' in text
    assert 'equal: ["service"]' in text
