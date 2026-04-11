from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from .archive_contract import ArchiveJobConfig
from .job_registry import get_config_for_source

PROMOTION_REASON_FRESH_FAILURE_BUDGET = "fresh_failure_budget_exhausted"


def _normalize_backend(value: object, *, default: str) -> str:
    text = str(value or "").strip().lower()
    return text or default


def infer_primary_backend(*, source_code: str | None, config: Mapping[str, Any] | None) -> str:
    job_cfg = ArchiveJobConfig.from_dict(dict(config or {}))
    policy = job_cfg.execution_policy
    configured_backend = _normalize_backend(policy.capture_backend, default="browsertrix")
    fallback_backend = _normalize_backend(policy.fallback_backend, default="none")
    explicit_primary = _normalize_backend(policy.primary_backend, default="")
    if explicit_primary:
        return explicit_primary

    if source_code and fallback_backend != "none" and configured_backend == fallback_backend:
        profile = get_config_for_source(str(source_code).strip().lower())
        if profile is not None:
            profile_cfg = ArchiveJobConfig.from_dict(
                {"execution_policy": dict(profile.default_execution_policy or {})}
            )
            profile_backend = _normalize_backend(
                profile_cfg.execution_policy.capture_backend, default=configured_backend
            )
            if profile_backend != configured_backend:
                return profile_backend

    return configured_backend


@dataclass(frozen=True)
class CrawlRescueStatus:
    primary_backend: str
    configured_backend: str
    effective_backend: str
    fallback_backend: str
    resume_policy: str
    fresh_failure_budget: int
    crawler_stage: str | None
    fallback_configured: bool
    fallback_active: bool
    promoted_to_fallback: bool
    promotion_signal: str | None
    last_promoted_from_backend: str | None
    last_promotion_reason: str | None

    @property
    def fallback_backend_label(self) -> str:
        return self.fallback_backend if self.fallback_configured else "none"

    @property
    def short_status(self) -> str:
        if self.promoted_to_fallback and self.fallback_active:
            return "fallback-active"
        if self.crawler_stage == "fresh_failed":
            return "fresh-failed"
        if self.crawler_stage == "fallback_exhausted":
            return "fallback-exhausted"
        if self.crawler_stage and self.crawler_stage.endswith("_retry"):
            return "fallback-retry"
        return "normal"

    @property
    def note(self) -> str | None:
        if self.promoted_to_fallback:
            from_backend = self.last_promoted_from_backend or self.primary_backend
            if (
                self.last_promotion_reason == PROMOTION_REASON_FRESH_FAILURE_BUDGET
                or self.crawler_stage == f"promoted_to_{self.fallback_backend}"
            ):
                return (
                    f"promoted from {from_backend} to {self.fallback_backend} "
                    "after fresh-failure budget exhaustion"
                )
            return f"fallback backend {self.fallback_backend} is active"
        if self.crawler_stage == "fresh_failed" and self.fresh_failure_budget > 0:
            return (
                f"fresh {self.primary_backend} phase failed; "
                "job remains within fresh-failure budget"
            )
        if self.crawler_stage == "fallback_exhausted":
            return f"fallback backend {self.effective_backend} exhausted its retry budget"
        if self.crawler_stage and self.crawler_stage.endswith("_retry"):
            return f"retrying fallback backend {self.effective_backend}"
        return None


def derive_crawl_rescue_status(
    *,
    source_code: str | None,
    config: Mapping[str, Any] | None,
    crawler_stage: str | None,
    last_stats: Mapping[str, Any] | None,
) -> CrawlRescueStatus:
    job_cfg = ArchiveJobConfig.from_dict(dict(config or {}))
    policy = job_cfg.execution_policy

    configured_backend = _normalize_backend(policy.capture_backend, default="browsertrix")
    fallback_backend = _normalize_backend(policy.fallback_backend, default="none")
    effective_backend = configured_backend

    backend_info = (last_stats or {}).get("backend")
    if isinstance(backend_info, Mapping):
        backend_name = _normalize_backend(backend_info.get("name"), default="")
        if backend_name:
            effective_backend = backend_name

    primary_backend = infer_primary_backend(source_code=source_code, config=config)
    fallback_configured = fallback_backend != "none"
    fallback_active = fallback_configured and effective_backend == fallback_backend

    promotion_signal: str | None = None
    promoted_to_fallback = False
    if fallback_configured and crawler_stage == f"promoted_to_{fallback_backend}":
        promoted_to_fallback = True
        promotion_signal = "crawler_stage"
    elif fallback_active and primary_backend != fallback_backend:
        promoted_to_fallback = True
        promotion_signal = "effective_backend"

    last_promoted_from_backend: str | None = _normalize_backend(
        policy.last_promoted_from_backend, default=""
    )
    if not last_promoted_from_backend:
        last_promoted_from_backend = None

    last_promotion_reason = str(policy.last_promotion_reason or "").strip() or None

    return CrawlRescueStatus(
        primary_backend=primary_backend,
        configured_backend=configured_backend,
        effective_backend=effective_backend,
        fallback_backend=fallback_backend,
        resume_policy=_normalize_backend(policy.resume_policy, default="auto"),
        fresh_failure_budget=int(policy.max_fresh_failures_before_fallback or 0),
        crawler_stage=str(crawler_stage).strip() or None,
        fallback_configured=fallback_configured,
        fallback_active=fallback_active,
        promoted_to_fallback=promoted_to_fallback,
        promotion_signal=promotion_signal,
        last_promoted_from_backend=last_promoted_from_backend,
        last_promotion_reason=last_promotion_reason,
    )


__all__ = [
    "CrawlRescueStatus",
    "PROMOTION_REASON_FRESH_FAILURE_BUDGET",
    "derive_crawl_rescue_status",
    "infer_primary_backend",
]
