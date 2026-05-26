#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def _now_epoch() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _label_value(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


def _labels(**labels: object) -> str:
    return ",".join(f'{key}="{_label_value(value)}"' for key, value in labels.items())


def _emit(lines: list[str], line: str) -> None:
    lines.append(line.rstrip("\n"))


def _run(args: list[str], *, timeout: int = 30) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # nosec: B603
        args,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _docker_container_names() -> list[str]:
    result = _run(["docker", "ps", "--format", "{{.Names}}"])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "docker ps failed")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def _inspect_container(name: str) -> dict[str, object] | None:
    result = _run(["docker", "inspect", "--size", name], timeout=45)
    if result.returncode != 0:
        return None
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, list) or not payload:
        return None
    obj = payload[0]
    return obj if isinstance(obj, dict) else None


def _int_or_zero(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except Exception:
        return 0


def _container_image_name(obj: dict[str, object]) -> str:
    config = obj.get("Config")
    if isinstance(config, dict):
        image = config.get("Image")
        if image:
            return str(image)
    return ""


def _container_state(obj: dict[str, object]) -> tuple[str, int]:
    state = obj.get("State")
    if not isinstance(state, dict):
        return "", 0
    status = str(state.get("Status") or "")
    running = 1 if state.get("Running") is True else 0
    return status, running


def _du_path_bytes(container: str, path: str) -> tuple[int, int]:
    quoted = shlex.quote(path)
    script = f"if [ -e {quoted} ]; then du -s -B1 {quoted} 2>/dev/null | awk '{{print $1}}'; else echo 0; fi"
    result = _run(["docker", "exec", container, "sh", "-lc", script], timeout=60)
    if result.returncode != 0:
        return 0, 0
    first = (result.stdout.strip().splitlines() or ["0"])[0]
    return _int_or_zero(first), 1


def _parse_probe(value: str) -> tuple[str, str]:
    if ":" not in value:
        raise ValueError(f"invalid --path-probe value {value!r}; expected CONTAINER:/path")
    container, path = value.split(":", 1)
    container = container.strip()
    path = path.strip()
    if not container or not path.startswith("/"):
        raise ValueError(f"invalid --path-probe value {value!r}; expected CONTAINER:/absolute/path")
    return container, path


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
        description="Emit Docker container writable-layer and runtime cache metrics."
    )
    parser.add_argument(
        "--out-dir",
        default="/var/lib/node_exporter/textfile_collector",
        help="node_exporter textfile collector directory.",
    )
    parser.add_argument(
        "--out-file",
        default="healtharchive_docker_runtime.prom",
        help="Output filename under --out-dir.",
    )
    parser.add_argument(
        "--container",
        action="append",
        default=[],
        help="Container name to inspect. Repeatable. Defaults to all running containers.",
    )
    parser.add_argument(
        "--path-probe",
        action="append",
        default=[
            "healtharchive-frontend:/app/.next/cache",
            "healtharchive-frontend:/app/.next/cache/fetch-cache",
        ],
        help="Container path to measure as CONTAINER:/absolute/path. Repeatable.",
    )
    args = parser.parse_args(argv)

    lines: list[str] = []
    ok = 1
    timestamp = _now_epoch()

    try:
        containers = list(dict.fromkeys(args.container or _docker_container_names()))
    except Exception as exc:
        containers = []
        ok = 0
        _emit(
            lines,
            f'healtharchive_docker_runtime_error{{stage="docker_ps",message="{_label_value(exc)}"}} 1',
        )

    _emit(lines, f"healtharchive_docker_runtime_metrics_timestamp_seconds {timestamp}")

    for name in containers:
        obj = _inspect_container(name)
        if obj is None:
            ok = 0
            _emit(
                lines,
                f'healtharchive_docker_container_inspect_ok{{container="{_label_value(name)}"}} 0',
            )
            continue

        image = _container_image_name(obj)
        status, running = _container_state(obj)
        base_labels = _labels(container=name, image=image, state=status)

        _emit(lines, f"healtharchive_docker_container_inspect_ok{{{_labels(container=name)}}} 1")
        _emit(lines, f"healtharchive_docker_container_running{{{base_labels}}} {running}")
        _emit(
            lines,
            f"healtharchive_docker_container_size_rw_bytes{{{base_labels}}} {_int_or_zero(obj.get('SizeRw'))}",
        )
        _emit(
            lines,
            f"healtharchive_docker_container_size_rootfs_bytes{{{base_labels}}} {_int_or_zero(obj.get('SizeRootFs'))}",
        )

    for probe in args.path_probe:
        try:
            container, path = _parse_probe(probe)
        except ValueError as exc:
            ok = 0
            _emit(
                lines,
                f'healtharchive_docker_path_probe_config_error{{message="{_label_value(exc)}"}} 1',
            )
            continue
        bytes_used, probe_ok = _du_path_bytes(container, path)
        if not probe_ok:
            ok = 0
        labels = _labels(container=container, path=path)
        _emit(lines, f"healtharchive_docker_path_probe_ok{{{labels}}} {probe_ok}")
        _emit(lines, f"healtharchive_docker_path_bytes{{{labels}}} {bytes_used}")

    _emit(lines, f"healtharchive_docker_runtime_metrics_ok {ok}")
    _write_atomic(Path(args.out_dir), args.out_file, lines)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
