from __future__ import annotations

from pathlib import Path
from typing import Optional

from warcio.archiveiterator import ArchiveIterator

from ha_backend.indexing.warc_reader import ArchiveRecord, _parse_warc_datetime
from ha_backend.models import Snapshot


def _load_matching_html_record(
    warc_path: Path,
    *,
    target_record_id: str | None = None,
    target_url: str | None = None,
) -> Optional[ArchiveRecord]:
    with warc_path.open("rb") as fh:
        for record in ArchiveIterator(fh):
            try:
                if record.rec_type != "response":
                    continue

                url = record.rec_headers.get_header("WARC-Target-URI")
                if not url:
                    continue

                warc_record_id = record.rec_headers.get_header("WARC-Record-ID")
                if target_record_id:
                    if warc_record_id != target_record_id:
                        continue
                elif target_url:
                    if url != target_url:
                        continue
                else:
                    continue

                warc_date = record.rec_headers.get_header("WARC-Date")
                capture_ts = _parse_warc_datetime(warc_date)

                http_headers = getattr(record, "http_headers", None)
                status_code: Optional[int] = None
                mime_type: Optional[str] = None
                headers: dict[str, str] = {}

                if http_headers is not None:
                    try:
                        sc = http_headers.get_statuscode()
                        status_code = int(sc) if sc is not None else None
                    except Exception:
                        status_code = None

                    for name, value in http_headers.headers:
                        headers[name.lower()] = value

                    ct = headers.get("content-type")
                    if ct:
                        mime_type = ct.split(";", 1)[0].strip().lower()

                if mime_type and "html" not in mime_type:
                    continue

                return ArchiveRecord(
                    url=url,
                    capture_timestamp=capture_ts,
                    status_code=status_code,
                    mime_type=mime_type,
                    headers=headers,
                    body_bytes=record.content_stream().read(),
                    warc_record_id=warc_record_id,
                    warc_path=warc_path,
                )
            except Exception:  # nosec: B112 - broad exception to skip bad records
                continue

    return None


def find_record_for_snapshot(snapshot: Snapshot) -> Optional[ArchiveRecord]:
    """
    Locate the WARC response record corresponding to a Snapshot.

    For now we primarily rely on the stored warc_record_id. If that is not
    available, we fall back to the first HTML response in the WARC that matches
    the snapshot URL.
    """
    warc_path = Path(snapshot.warc_path)
    if not warc_path.is_file():
        return None

    # Prefer exact record ID match when we have one.
    target_id = snapshot.warc_record_id
    if target_id:
        record = _load_matching_html_record(warc_path, target_record_id=target_id)
        if record is not None:
            return record

    # Fallback: first record matching URL.
    return _load_matching_html_record(warc_path, target_url=snapshot.url)


__all__ = ["find_record_for_snapshot"]
