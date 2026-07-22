"""
PDF / text parsing.

PDF strategy:
1. Try PyMuPDF (fitz) — fast, robust, keeps layout.
2. Fall back to pdfplumber for tricky files.
3. If both return nothing (scanned PDF), leave the page empty and let the
   chunker skip it. We do not run OCR in the request path — that would blow
   the latency budget for the prototype.

Non-PDF: read as UTF-8 text.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from app.core.logging import get_logger

log = get_logger(__name__)


@dataclass
class ParsedPage:
    page: int
    text: str


@dataclass
class ParsedDoc:
    pages: List[ParsedPage]
    title: str | None = None
    author: str | None = None


# Cap rows read from tabular files so a huge spreadsheet/CSV can't blow the
# ingest latency/memory budget. Enough for retrieval to be useful.
_MAX_TABULAR_ROWS = 5000


def parse_document(path: Path, mime_type: str | None = None) -> ParsedDoc:
    suffix = path.suffix.lower()
    mt = (mime_type or "").lower()

    if suffix == ".pdf" or mt.endswith("pdf"):
        return _parse_pdf(path)
    if suffix in {".txt", ".md", ".markdown", ".log", ".json"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        return ParsedDoc(pages=[ParsedPage(page=1, text=text)])
    if suffix == ".csv" or "csv" in mt:
        return _parse_delimited(path, delimiter=",")
    if suffix == ".tsv" or "tab-separated" in mt:
        return _parse_delimited(path, delimiter="\t")
    if suffix in {".xlsx", ".xls"} or "spreadsheet" in mt or "ms-excel" in mt:
        return _parse_excel(path)
    if suffix == ".docx":
        return _parse_docx(path)
    # unknown — try as text
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        return ParsedDoc(pages=[ParsedPage(page=1, text=text)])
    except Exception:
        return ParsedDoc(pages=[])


def _rows_to_text(header: list[str], rows: list[list[str]]) -> str:
    """Render tabular rows as readable "col: value" lines so the chunker and
    retriever have natural-language-ish text to work with."""
    lines: list[str] = []
    header = [str(h).strip() for h in header]
    if header:
        lines.append("Columns: " + ", ".join(h for h in header if h))
    for r in rows:
        cells = [str(c).strip() for c in r]
        if not any(cells):
            continue
        if header:
            pairs = [
                f"{header[i]}: {cells[i]}"
                for i in range(min(len(header), len(cells)))
                if cells[i]
            ]
            lines.append(" | ".join(pairs))
        else:
            lines.append(" | ".join(c for c in cells if c))
    return "\n".join(lines)


def _parse_delimited(path: Path, delimiter: str) -> ParsedDoc:
    import csv

    try:
        with path.open("r", encoding="utf-8", errors="ignore", newline="") as fh:
            reader = csv.reader(fh, delimiter=delimiter)
            all_rows = []
            for i, row in enumerate(reader):
                if i > _MAX_TABULAR_ROWS:
                    break
                all_rows.append(row)
        if not all_rows:
            return ParsedDoc(pages=[])
        header = all_rows[0]
        text = _rows_to_text(header, all_rows[1:])
        return ParsedDoc(pages=[ParsedPage(page=1, text=text)])
    except Exception as e:
        log.warning("delimited parse failed for {}: {}", path.name, e)
        return ParsedDoc(pages=[])


def _parse_excel(path: Path) -> ParsedDoc:
    """Parse .xlsx via openpyxl. Each worksheet becomes a page. Older .xls is
    not supported by openpyxl — those return empty and are marked failed by
    the ingest path."""
    try:
        import openpyxl  # type: ignore
    except Exception as e:
        log.warning("openpyxl not installed — cannot parse {}: {}", path.name, e)
        return ParsedDoc(pages=[])

    try:
        wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    except Exception as e:
        log.warning("openpyxl failed for {}: {}", path.name, e)
        return ParsedDoc(pages=[])

    pages: list[ParsedPage] = []
    try:
        for page_no, ws in enumerate(wb.worksheets, start=1):
            rows: list[list[str]] = []
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i > _MAX_TABULAR_ROWS:
                    break
                rows.append(["" if v is None else str(v) for v in row])
            if not rows:
                continue
            header = rows[0]
            body = _rows_to_text(header, rows[1:])
            text = f"Sheet: {ws.title}\n{body}" if body else ""
            if text.strip():
                pages.append(ParsedPage(page=page_no, text=text))
    finally:
        wb.close()
    return ParsedDoc(pages=pages)


def _parse_pdf(path: Path) -> ParsedDoc:
    pages: list[ParsedPage] = []
    title = None
    author = None
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(path))
        try:
            meta = doc.metadata or {}
            title = meta.get("title") or None
            author = meta.get("author") or None
            for i, page in enumerate(doc, start=1):
                txt = page.get_text("text") or ""
                pages.append(ParsedPage(page=i, text=txt.strip()))
        finally:
            doc.close()
    except Exception as e:
        log.warning("PyMuPDF failed for {}: {}", path.name, e)

    # If PyMuPDF returned no text, try pdfplumber
    if not pages or all(not p.text for p in pages):
        try:
            import pdfplumber  # type: ignore

            pages = []
            with pdfplumber.open(str(path)) as pdf:
                for i, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    pages.append(ParsedPage(page=i, text=text.strip()))
        except Exception as e:
            log.warning("pdfplumber failed for {}: {}", path.name, e)

    return ParsedDoc(pages=pages, title=title, author=author)


def _parse_docx(path: Path) -> ParsedDoc:
    try:
        import zipfile
        import xml.etree.ElementTree as ET

        text_blocks: list[str] = []
        with zipfile.ZipFile(path) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
                for p in root.iter(f"{ns}p"):
                    para = "".join(t.text or "" for t in p.iter(f"{ns}t"))
                    if para:
                        text_blocks.append(para)
        return ParsedDoc(pages=[ParsedPage(page=1, text="\n".join(text_blocks))])
    except Exception as e:
        log.warning("docx parse failed: {}", e)
        return ParsedDoc(pages=[])


# ─── chunking ──────────────────────────────────────────────────────────────────

_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")
_MULTISPACE = re.compile(r"\s+")


def _clean(text: str) -> str:
    return _MULTISPACE.sub(" ", text).strip()


def chunk_pages(
    parsed: ParsedDoc,
    *,
    chunk_size: int = 900,
    overlap: int = 150,
    min_chars: int = 120,
) -> list[dict]:
    """Split parsed pages into overlapping semantic chunks.

    Chunks respect sentence boundaries where possible and keep track of the
    page number. Each chunk gets a monotonically increasing index for stable
    ordering. Returned dicts are ready to be inserted as DocumentChunk rows.
    """
    chunks: list[dict] = []
    idx = 0
    char_offset = 0

    for page in parsed.pages:
        text = _clean(page.text)
        if not text:
            continue
        sentences = _SPLIT_RE.split(text)
        buf = ""
        buf_start = char_offset
        for s in sentences:
            if not s:
                continue
            candidate = (buf + " " + s).strip() if buf else s
            if len(candidate) <= chunk_size:
                buf = candidate
                continue
            # flush
            if len(buf) >= min_chars:
                chunks.append(
                    {
                        "chunk_index": idx,
                        "page": page.page,
                        "text": buf,
                        "char_start": buf_start,
                        "char_end": buf_start + len(buf),
                    }
                )
                idx += 1
                # overlap: keep the tail
                tail = buf[-overlap:] if overlap else ""
                buf = (tail + " " + s).strip()
                buf_start = buf_start + len(buf) - len(buf)  # approximate
            else:
                buf = candidate
        if len(buf) >= min_chars:
            chunks.append(
                {
                    "chunk_index": idx,
                    "page": page.page,
                    "text": buf,
                    "char_start": buf_start,
                    "char_end": buf_start + len(buf),
                }
            )
            idx += 1
        char_offset += len(text) + 1
    return chunks
