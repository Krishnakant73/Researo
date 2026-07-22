"""Bulk-ingest a folder of documents into a running Researo API.

Walks a directory (recursively) and uploads every supported file to the
`/api/v1/documents/upload` endpoint, so each document is parsed, chunked,
embedded and indexed exactly like a real upload.

Usage:
    # start the API first (in another terminal):
    #   python scripts/run.py
    #
    # then, from apps/api:
    python scripts/ingest.py                      # walks ../../demo-data
    python scripts/ingest.py --dir ../../demo-data
    python scripts/ingest.py --dir "C:/path/to/kaggle-dataset"
    python scripts/ingest.py --base-url http://localhost:8000

Any directory works — point --dir at a Kaggle download folder to ingest it too.
Supported file types: .pdf .txt .md .docx  (matches app/parsing).
"""
from __future__ import annotations

import argparse
import mimetypes
import sys
from pathlib import Path

import httpx

SUPPORTED_EXTS = {".pdf", ".txt", ".md", ".docx"}
DEFAULT_DIR = Path(__file__).resolve().parents[3] / "demo-data"


def iter_files(root: Path) -> list[Path]:
    return sorted(
        p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    )


def upload(client: httpx.Client, base_url: str, path: Path) -> tuple[bool, str]:
    mime, _ = mimetypes.guess_type(path.name)
    mime = mime or "application/octet-stream"
    try:
        with path.open("rb") as fh:
            resp = client.post(
                f"{base_url}/api/v1/documents/upload",
                files={"file": (path.name, fh, mime)},
                timeout=120.0,
            )
    except httpx.RequestError as e:
        return False, f"request failed: {e}"

    if resp.status_code != 200:
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"

    body = resp.json()
    if not body.get("success"):
        return False, f"api error: {body.get('error')}"
    data = body.get("data", {})
    return True, f"{data.get('status')} · {data.get('chunks')} chunks · {data.get('category')}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Bulk-ingest documents into Researo.")
    parser.add_argument(
        "--dir",
        type=Path,
        default=DEFAULT_DIR,
        help=f"Directory to walk (default: {DEFAULT_DIR})",
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the running API (default: http://localhost:8000)",
    )
    args = parser.parse_args()

    root: Path = args.dir.resolve()
    if not root.exists():
        print(f"Directory not found: {root}", file=sys.stderr)
        return 1

    files = iter_files(root)
    if not files:
        print(f"No supported files ({', '.join(sorted(SUPPORTED_EXTS))}) found under {root}")
        return 0

    print(f"Ingesting {len(files)} file(s) from {root}")
    print(f"Target: {args.base_url}\n")

    ok_count = 0
    fail_count = 0
    with httpx.Client() as client:
        # Fail fast if the server is not up
        try:
            client.get(f"{args.base_url}/api/v1/health", timeout=10.0)
        except httpx.RequestError:
            print(
                f"Could not reach the API at {args.base_url}. "
                "Start it first with `python scripts/run.py`.",
                file=sys.stderr,
            )
            return 1

        for path in files:
            rel = path.relative_to(root)
            success, detail = upload(client, args.base_url, path)
            status = "OK  " if success else "FAIL"
            print(f"[{status}] {rel}  —  {detail}")
            if success:
                ok_count += 1
            else:
                fail_count += 1

    print(f"\nDone. {ok_count} succeeded, {fail_count} failed.")
    return 0 if fail_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
