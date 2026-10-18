"""Offline integrity checks for the temporary CI browser comparison."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import stat
import struct
import zipfile
from pathlib import Path, PurePosixPath

CHROME_VERSION = "148.0.7778.97"
CHROME_ARCHIVE_URL = (
    "https://storage.googleapis.com/chrome-for-testing-public/"
    f"{CHROME_VERSION}/linux64/chrome-linux64.zip"
)
CHROME_ARCHIVE_BYTES = 183_950_119
CHROME_ARCHIVE_MD5_B64 = "j2Fm0T/aAZVF/bXFCW8l0w=="
CHROME_ARCHIVE_CRC32C_B64 = "kCmWHw=="
CHROME_ARCHIVE_GENERATION = "1777416380381639"
MAX_ARCHIVE_MEMBERS = 20_000
MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024

_CRC32C_TABLE = []
for _index in range(256):
    _value = _index
    for _ in range(8):
        _value = (_value >> 1) ^ (0x82F63B78 if _value & 1 else 0)
    _CRC32C_TABLE.append(_value)


def crc32c(chunks) -> int:
    """Return the Castagnoli CRC32C for an iterable of byte chunks."""
    value = 0xFFFFFFFF
    for chunk in chunks:
        for byte in chunk:
            value = _CRC32C_TABLE[(value ^ byte) & 0xFF] ^ (value >> 8)
    return value ^ 0xFFFFFFFF


def crc32c_base64(value: int) -> str:
    return base64.b64encode(struct.pack(">I", value)).decode("ascii")


def verify_manifest(path: Path) -> None:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("version") != CHROME_VERSION:
        raise ValueError("manifest version mismatch")
    downloads = manifest.get("downloads", {}).get("chrome", [])
    matches = [
        item.get("url")
        for item in downloads
        if isinstance(item, dict) and item.get("platform") == "linux64"
    ]
    if matches != [CHROME_ARCHIVE_URL]:
        raise ValueError("manifest download entry mismatch")


def verify_storage_headers(path: Path) -> None:
    text = path.read_text(encoding="latin-1")
    blocks = [block for block in re.split(r"\r?\n\r?\n", text) if block.strip()]
    if not blocks:
        raise ValueError("missing response headers")

    lines = blocks[-1].splitlines()
    if not lines or not re.fullmatch(r"HTTP/\S+ 200(?: .*)?", lines[0]):
        raise ValueError("archive response status mismatch")

    headers: dict[str, list[str]] = {}
    for line in lines[1:]:
        name, separator, value = line.partition(":")
        if separator:
            headers.setdefault(name.strip().lower(), []).append(value.strip())

    if headers.get("content-length") != [str(CHROME_ARCHIVE_BYTES)]:
        raise ValueError("archive response length mismatch")
    if headers.get("x-goog-generation") != [CHROME_ARCHIVE_GENERATION]:
        raise ValueError("archive generation mismatch")

    storage_hashes = {
        item.strip() for value in headers.get("x-goog-hash", []) for item in value.split(",")
    }
    if f"md5={CHROME_ARCHIVE_MD5_B64}" not in storage_hashes:
        raise ValueError("archive storage MD5 metadata mismatch")
    if f"crc32c={CHROME_ARCHIVE_CRC32C_B64}" not in storage_hashes:
        raise ValueError("archive storage CRC32C metadata mismatch")


def verify_archive(
    path: Path,
    expected_size: int = CHROME_ARCHIVE_BYTES,
    expected_md5_b64: str = CHROME_ARCHIVE_MD5_B64,
    expected_crc32c_b64: str = CHROME_ARCHIVE_CRC32C_B64,
) -> str:
    if path.stat().st_size != expected_size:
        raise ValueError("archive file length mismatch")

    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    size = 0

    def chunks():
        nonlocal size
        with path.open("rb") as archive:
            while chunk := archive.read(1024 * 1024):
                size += len(chunk)
                md5.update(chunk)
                sha256.update(chunk)
                yield chunk

    crc = crc32c(chunks())
    if size != expected_size:
        raise ValueError("archive streamed length mismatch")
    if base64.b64encode(md5.digest()).decode("ascii") != expected_md5_b64:
        raise ValueError("archive MD5 mismatch")
    if crc32c_base64(crc) != expected_crc32c_b64:
        raise ValueError("archive CRC32C mismatch")
    return sha256.hexdigest()


def validate_archive_members(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) > MAX_ARCHIVE_MEMBERS:
            raise ValueError("archive contains too many members")
        names = [item.filename for item in members]
        if len(names) != len(set(names)):
            raise ValueError("archive contains duplicate paths")
        total_uncompressed = 0
        for item in members:
            name = item.filename
            pure = PurePosixPath(name)
            components = name[:-1].split("/") if item.is_dir() else name.split("/")
            if (
                pure.is_absolute()
                or "\x00" in name
                or "\\" in name
                or any(part in {"", ".", ".."} for part in components)
                or not pure.parts
                or pure.parts[0] != "chrome-linux64"
            ):
                raise ValueError("archive path is outside the expected root")
            member_type = stat.S_IFMT(item.external_attr >> 16)
            allowed_types = {0, stat.S_IFDIR} if item.is_dir() else {0, stat.S_IFREG}
            if member_type not in allowed_types:
                raise ValueError("archive contains a non-regular member")
            if item.is_dir() and member_type == stat.S_IFREG:
                raise ValueError("archive directory type mismatch")
            if not item.is_dir() and member_type == stat.S_IFDIR:
                raise ValueError("archive file type mismatch")
            total_uncompressed += item.file_size
            if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                raise ValueError("archive uncompressed size exceeds limit")
        chrome = archive.getinfo("chrome-linux64/chrome")
        if chrome.is_dir():
            raise ValueError("browser executable is not a file")


def extract_archive(path: Path, destination: Path) -> None:
    validate_archive_members(path)
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            parts = item.filename.rstrip("/").split("/")
            target = destination.joinpath(*parts)
            if item.is_dir():
                target.mkdir(mode=0o755, parents=True, exist_ok=True)
                os.chmod(target, 0o755)
                continue
            target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            with archive.open(item, "r") as source, target.open("xb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)
            archived_mode = item.external_attr >> 16
            os.chmod(target, 0o755 if archived_mode & 0o111 else 0o644)


def main() -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("manifest", "headers", "archive", "members"):
        command = commands.add_parser(name)
        command.add_argument("path", type=Path)
    extract = commands.add_parser("extract")
    extract.add_argument("path", type=Path)
    extract.add_argument("destination", type=Path)
    args = parser.parse_args()

    try:
        if args.command == "manifest":
            verify_manifest(args.path)
            print("manifest=verified")
        elif args.command == "headers":
            verify_storage_headers(args.path)
            print("storageMetadata=verified")
        elif args.command == "archive":
            digest = verify_archive(args.path)
            print(
                f"archiveBytes={CHROME_ARCHIVE_BYTES} md5=verified crc32c=verified "
                f"sha256={digest} vendorSha256Attestation=not-claimed"
            )
        elif args.command == "members":
            validate_archive_members(args.path)
            print("archivePaths=verified")
        elif args.command == "extract":
            extract_archive(args.path, args.destination)
            print("archiveExtraction=verified")
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile, KeyError):
        print("comparisonPreflight=failed")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
