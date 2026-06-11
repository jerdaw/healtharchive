#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

DEFAULT_MAX_BYTES = 3 * 1024**3


def _now_epoch() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _label_value(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


def _labels(**labels: object) -> str:
    return ",".join(f'{key}="{_label_value(value)}"' for key, value in labels.items())


def _emit(lines: list[str], line: str) -> None:
    lines.append(line.rstrip("\n"))


def _run(args: list[str], *, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # nosec: B603
        args,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _path_bytes(container: str, path: str) -> tuple[int, int]:
    quoted = shlex.quote(path)
    script = f"if [ -e {quoted} ]; then du -s -B1 {quoted} 2>/dev/null | awk '{{print $1}}'; else echo 0; fi"
    result = _run(["docker", "exec", container, "sh", "-lc", script])
    if result.returncode != 0:
        return 0, 0
    first = (result.stdout.strip().splitlines() or ["0"])[0]
    try:
        return int(first), 1
    except ValueError:
        return 0, 0


def _clear_path(container: str, path: str) -> int:
    quoted = shlex.quote(path)
    script = (
        f"if [ -d {quoted} ]; then find {quoted} -mindepth 1 -maxdepth 1 -exec rm -rf {{}} +; fi"
    )
    result = _run(["docker", "exec", container, "sh", "-lc", script], timeout=600)
    return 1 if result.returncode == 0 else 0


def _restart_container(container: str) -> int:
    result = _run(["docker", "restart", container], timeout=180)
    return 1 if result.returncode == 0 else 0


def _write_atomic(out_dir: Path, out_file: str, lines: Iterable[str]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{out_file}.", suffix=".tmp", dir=out_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            for line in lines:
                f.write(f"{line}\n")
        os.chmod(tmp_name, 0o644)
        os.replace(tmp_name, out_dir / out_file)
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Bound the HealthArchive frontend Next.js fetch cache."
    )
    parser.add_argument(
        "--apply", action="store_true", help="Actually clear/restart when over threshold."
    )
    parser.add_argument(
        "--container",
        default=os.environ.get("HEALTHARCHIVE_FRONTEND_CONTAINER", "healtharchive-frontend"),
        help="Frontend container name.",
    )
    parser.add_argument(
        "--cache-path",
        default=os.environ.get("HEALTHARCHIVE_FRONTEND_CACHE_PATH", "/app/.next/cache/fetch-cache"),
        help="Container path to bound.",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=int(
            os.environ.get("HEALTHARCHIVE_FRONTEND_CACHE_MAX_BYTES", str(DEFAULT_MAX_BYTES))
        ),
        help="Clear cache when bytes exceed this value. Default: 3 GiB.",
    )
    parser.add_argument(
        "--restart-after-clear",
        action=argparse.BooleanOptionalAction,
        default=os.environ.get("HEALTHARCHIVE_FRONTEND_CACHE_RESTART_AFTER_CLEAR", "1") != "0",
        help="Restart the frontend container after a real cache clear. Default: true.",
    )
    parser.add_argument(
        "--out-dir",
        default="/var/lib/node_exporter/textfile_collector",
        help="node_exporter textfile collector directory.",
    )
    parser.add_argument(
        "--out-file",
        default="healtharchive_frontend_cache_maintenance.prom",
        help="Output filename under --out-dir.",
    )
    args = parser.parse_args(argv)

    if not args.cache_path.startswith("/app/.next/cache"):
        raise SystemExit("--cache-path must stay under /app/.next/cache")
    if args.max_bytes < 0:
        raise SystemExit("--max-bytes must be non-negative")

    lines: list[str] = []
    ok = 1
    timestamp = _now_epoch()
    bytes_before, probe_ok = _path_bytes(args.container, args.cache_path)
    if not probe_ok:
        ok = 0

    over_limit = 1 if probe_ok and bytes_before > args.max_bytes else 0
    cleared = 0
    clear_success = 0
    restarted = 0
    restart_success = 0
    bytes_after = bytes_before

    if over_limit and args.apply:
        cleared = 1
        clear_success = _clear_path(args.container, args.cache_path)
        if not clear_success:
            ok = 0
        bytes_after, after_probe_ok = _path_bytes(args.container, args.cache_path)
        if not after_probe_ok:
            ok = 0
        if clear_success and args.restart_after_clear:
            restarted = 1
            restart_success = _restart_container(args.container)
            if not restart_success:
                ok = 0

    labels = _labels(container=args.container, path=args.cache_path)
    _emit(lines, f"healtharchive_frontend_cache_maintenance_timestamp_seconds {timestamp}")
    _emit(lines, f"healtharchive_frontend_cache_probe_ok{{{labels}}} {probe_ok}")
    _emit(lines, f"healtharchive_frontend_cache_bytes{{{labels}}} {bytes_after}")
    _emit(lines, f"healtharchive_frontend_cache_bytes_before{{{labels}}} {bytes_before}")
    _emit(lines, f"healtharchive_frontend_cache_max_bytes{{{labels}}} {args.max_bytes}")
    _emit(lines, f"healtharchive_frontend_cache_over_limit{{{labels}}} {over_limit}")
    _emit(lines, f"healtharchive_frontend_cache_clear_attempted{{{labels}}} {cleared}")
    _emit(lines, f"healtharchive_frontend_cache_clear_success{{{labels}}} {clear_success}")
    _emit(lines, f"healtharchive_frontend_cache_restart_attempted{{{labels}}} {restarted}")
    _emit(lines, f"healtharchive_frontend_cache_restart_success{{{labels}}} {restart_success}")
    _emit(lines, f"healtharchive_frontend_cache_maintenance_ok {ok}")

    _write_atomic(Path(args.out_dir), args.out_file, lines)

    if over_limit and not args.apply:
        print(
            f"DRY RUN: {args.container}:{args.cache_path} is {bytes_before} bytes, "
            f"above threshold {args.max_bytes}; rerun with --apply to clear.",
        )
    elif over_limit and args.apply:
        print(
            f"APPLY: {args.container}:{args.cache_path} was {bytes_before} bytes, "
            f"now {bytes_after} bytes; restarted={bool(restarted and restart_success)}.",
        )
    else:
        print(
            f"OK: {args.container}:{args.cache_path} is {bytes_before} bytes, "
            f"threshold {args.max_bytes}.",
        )

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
