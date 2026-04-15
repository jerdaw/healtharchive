from __future__ import annotations

from ha_backend.crawl_rescue_status import (
    PROMOTION_REASON_FRESH_FAILURE_BUDGET,
    derive_crawl_rescue_status,
    infer_primary_backend,
    summarize_crawl_operator_state,
)


def test_infer_primary_backend_uses_source_default_when_job_already_on_fallback() -> None:
    config = {
        "execution_policy": {
            "capture_backend": "playwright_warc",
            "fallback_backend": "playwright_warc",
        }
    }

    assert infer_primary_backend(source_code="hc", config=config) == "browsertrix"


def test_derive_crawl_rescue_status_marks_fallback_active_and_promoted() -> None:
    status = derive_crawl_rescue_status(
        source_code="hc",
        config={
            "execution_policy": {
                "capture_backend": "playwright_warc",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
                "primary_backend": "browsertrix",
                "last_promoted_from_backend": "browsertrix",
                "last_promotion_reason": PROMOTION_REASON_FRESH_FAILURE_BUDGET,
            }
        },
        crawler_stage="promoted_to_playwright_warc",
        last_stats={"backend": {"name": "playwright_warc"}},
    )

    assert status.primary_backend == "browsertrix"
    assert status.effective_backend == "playwright_warc"
    assert status.fallback_active is True
    assert status.promoted_to_fallback is True
    assert status.short_status == "fallback-active"
    assert status.note == (
        "promoted from browsertrix to playwright_warc after fresh-failure budget exhaustion"
    )


def test_derive_crawl_rescue_status_marks_fresh_failure_before_promotion() -> None:
    status = derive_crawl_rescue_status(
        source_code="phac",
        config={
            "execution_policy": {
                "capture_backend": "browsertrix",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
            }
        },
        crawler_stage="fresh_failed",
        last_stats={},
    )

    assert status.primary_backend == "browsertrix"
    assert status.configured_backend == "browsertrix"
    assert status.effective_backend == "browsertrix"
    assert status.fallback_active is False
    assert status.promoted_to_fallback is False
    assert status.short_status == "fresh-failed"
    assert status.note == "fresh browsertrix phase failed; job remains within fresh-failure budget"


def test_summarize_crawl_operator_state_marks_intentional_retry_backoff() -> None:
    rescue = derive_crawl_rescue_status(
        source_code="phac",
        config={
            "execution_policy": {
                "capture_backend": "browsertrix",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
            }
        },
        crawler_stage="fresh_failed",
        last_stats={},
    )

    operator_state = summarize_crawl_operator_state(job_status="retryable", rescue=rescue)

    assert operator_state.label == "waiting-fresh-retry"
    assert operator_state.note == "awaiting next fresh browsertrix retry within the configured rescue budget"


def test_summarize_crawl_operator_state_marks_running_fallback() -> None:
    rescue = derive_crawl_rescue_status(
        source_code="hc",
        config={
            "execution_policy": {
                "capture_backend": "playwright_warc",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
                "primary_backend": "browsertrix",
                "last_promoted_from_backend": "browsertrix",
                "last_promotion_reason": PROMOTION_REASON_FRESH_FAILURE_BUDGET,
            }
        },
        crawler_stage="promoted_to_playwright_warc",
        last_stats={"backend": {"name": "playwright_warc"}},
    )

    operator_state = summarize_crawl_operator_state(job_status="running", rescue=rescue)

    assert operator_state.label == "running-fallback"
    assert operator_state.note == (
        "promoted from browsertrix to playwright_warc after fresh-failure budget exhaustion"
    )
