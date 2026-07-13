from __future__ import annotations

"""Short-transaction persistence for long-running indexing progress."""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from ha_backend.db import get_session
from ha_backend.models import ArchiveJobIndexingProgress

logger = logging.getLogger("healtharchive.indexing.progress")

INDEXING_PROGRESS_PHASES = frozenset(
    {
        "starting",
        "consolidate_warcs",
        "discover",
        "verify",
        "read_warc",
        "finalize",
        "failed",
    }
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def indexing_progress_payload(
    progress: ArchiveJobIndexingProgress,
    *,
    now_utc: datetime | None = None,
) -> dict[str, object]:
    """Serialize progress with derived non-negative elapsed/age values."""
    now = _as_utc(now_utc or _now_utc())
    started_at = _as_utc(progress.started_at)
    last_progress_at = _as_utc(progress.last_progress_at)
    return {
        "phase": progress.phase,
        "currentWarc": progress.current_warc,
        "warcIndex": int(progress.warc_index or 0),
        "warcTotal": int(progress.warc_total or 0),
        "recordsProcessed": int(progress.records_processed or 0),
        "bytesProcessed": int(progress.bytes_processed or 0),
        "bytesTotal": int(progress.bytes_total or 0),
        "startedAt": started_at.isoformat(),
        "lastProgressAt": last_progress_at.isoformat(),
        "elapsedSeconds": max(0.0, (now - started_at).total_seconds()),
        "lastProgressAgeSeconds": max(0.0, (now - last_progress_at).total_seconds()),
    }


class IndexingProgressReporter:
    """Best-effort throttled writer for one ArchiveJob progress row."""

    def __init__(
        self,
        job_id: int,
        *,
        heartbeat_interval_seconds: float = 10.0,
        monotonic: Callable[[], float] = time.monotonic,
        now_utc: Callable[[], datetime] = _now_utc,
    ) -> None:
        self.job_id = int(job_id)
        self.heartbeat_interval_seconds = max(0.0, float(heartbeat_interval_seconds))
        self._monotonic = monotonic
        self._now_utc = now_utc
        self._last_write_monotonic: float | None = None
        self._last_phase: str | None = None
        self._last_warc: str | None = None
        self._started_at: datetime | None = None
        self._disabled = False
        self._values: dict[str, int | str | None] = {
            "phase": None,
            "current_warc": None,
            "warc_index": 0,
            "warc_total": 0,
            "records_processed": 0,
            "bytes_processed": 0,
            "bytes_total": 0,
        }

    def _disable(self, exc: Exception) -> None:
        if self._disabled:
            return
        self._disabled = True
        logger.warning(
            "Disabling indexing progress persistence for job %s after write failure: %s",
            self.job_id,
            exc,
        )

    def update(
        self,
        *,
        phase: str,
        current_warc: str | Path | None = None,
        warc_index: int | None = None,
        warc_total: int | None = None,
        records_processed: int | None = None,
        bytes_processed: int | None = None,
        bytes_total: int | None = None,
        force: bool = False,
    ) -> None:
        if self._disabled:
            return
        if phase not in INDEXING_PROGRESS_PHASES:
            raise ValueError(f"Unsupported indexing progress phase: {phase!r}")

        warc_name = Path(current_warc).name[:255] if current_warc is not None else None
        now_monotonic = self._monotonic()
        changed_context = phase != self._last_phase or warc_name != self._last_warc
        interval_elapsed = (
            self._last_write_monotonic is None
            or now_monotonic - self._last_write_monotonic >= self.heartbeat_interval_seconds
        )
        if not (force or changed_context or interval_elapsed):
            return

        updates: dict[str, int | str | None] = {
            "phase": phase,
            "current_warc": warc_name,
        }
        for key, value in (
            ("warc_index", warc_index),
            ("warc_total", warc_total),
            ("records_processed", records_processed),
            ("bytes_processed", bytes_processed),
            ("bytes_total", bytes_total),
        ):
            if value is not None:
                updates[key] = max(0, int(value))
        self._values.update(updates)

        now = _as_utc(self._now_utc())
        if self._started_at is None:
            self._started_at = now

        try:
            with get_session() as session:
                progress = session.get(ArchiveJobIndexingProgress, self.job_id)
                if progress is None:
                    progress = ArchiveJobIndexingProgress(
                        job_id=self.job_id,
                        phase=phase,
                        started_at=self._started_at,
                        last_progress_at=now,
                    )
                    session.add(progress)
                elif self._last_write_monotonic is None:
                    progress.started_at = self._started_at

                progress.phase = str(self._values["phase"])
                current_warc_value = self._values["current_warc"]
                progress.current_warc = (
                    str(current_warc_value) if current_warc_value is not None else None
                )
                progress.warc_index = int(self._values["warc_index"] or 0)
                progress.warc_total = int(self._values["warc_total"] or 0)
                progress.records_processed = int(self._values["records_processed"] or 0)
                progress.bytes_processed = int(self._values["bytes_processed"] or 0)
                progress.bytes_total = int(self._values["bytes_total"] or 0)
                progress.last_progress_at = now
        except Exception as exc:
            self._disable(exc)
            return

        self._last_write_monotonic = now_monotonic
        self._last_phase = phase
        self._last_warc = warc_name

    def mark_failed(self) -> None:
        current_warc = self._values["current_warc"]
        self.update(
            phase="failed",
            current_warc=str(current_warc) if current_warc is not None else None,
            force=True,
        )

    def clear(self) -> None:
        if self._disabled:
            return
        try:
            with get_session() as session:
                progress = session.get(ArchiveJobIndexingProgress, self.job_id)
                if progress is not None:
                    session.delete(progress)
        except Exception as exc:
            self._disable(exc)


__all__ = [
    "INDEXING_PROGRESS_PHASES",
    "IndexingProgressReporter",
    "indexing_progress_payload",
]
