"""
One-time / build-time script: reads the consumer master Excel and writes a fast
JSON cache. In production (Render free tier) the FastAPI app loads this cache
instead of parsing the 24 MB / 96k-row spreadsheet on every request.

Run from repo root or from backend/:
    python -m scripts.build_master_cache
or:
    python backend/scripts/build_master_cache.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from openpyxl import load_workbook

HERE = Path(__file__).resolve().parent
BACKEND_DIR = HERE.parent
MASTERDATA_DIR = BACKEND_DIR / "Masterdata"
CACHE_DIR = MASTERDATA_DIR / "cache"

IVRS_COL = 8  # Column H
DC_COL = 4    # Column D


def main() -> int:
    consumer_master_dir = MASTERDATA_DIR / "Consumer Master"
    xlsx_files = sorted(p for p in consumer_master_dir.iterdir() if p.suffix.lower() == ".xlsx")
    if not xlsx_files:
        print(f"No .xlsx file found in {consumer_master_dir}", file=sys.stderr)
        return 1
    xlsx = xlsx_files[0]
    print(f"Reading {xlsx.name} ...")

    wb = load_workbook(xlsx, read_only=True, data_only=True)
    ws = wb.active

    rows_iter = ws.iter_rows(values_only=True)
    header_row = next(rows_iter)
    headers = [str(c).strip() if c is not None else "" for c in header_row]
    print(f"  {len(headers)} columns in header row")

    consumers_by_ivrs: dict[str, dict] = {}
    dcs: list[str] = []
    dc_seen: set[str] = set()
    total = 0

    for row in rows_iter:
        padded = list(row) + [None] * (len(headers) - len(row))
        ivrs_val = padded[IVRS_COL - 1] if IVRS_COL - 1 < len(padded) else None
        ivrs = str(ivrs_val).strip() if ivrs_val is not None else ""
        if not ivrs:
            continue

        obj: dict = {}
        for h, v in zip(headers, padded):
            if not h:
                continue
            if v is None:
                obj[h] = None
            elif isinstance(v, (int, float, bool)):
                obj[h] = v
            else:
                obj[h] = str(v)

        consumers_by_ivrs[ivrs] = obj
        total += 1

        dc_val = padded[DC_COL - 1] if DC_COL - 1 < len(padded) else None
        dc = str(dc_val).strip() if dc_val is not None else ""
        if dc and dc not in dc_seen:
            dc_seen.add(dc)
            dcs.append(dc)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    dcs_file = CACHE_DIR / "dcs.json"
    consumers_file = CACHE_DIR / "consumers.json"

    with dcs_file.open("w") as f:
        json.dump({"dcs": dcs, "headers": headers}, f)

    with consumers_file.open("w") as f:
        json.dump(consumers_by_ivrs, f)

    print(f"Unique DCs ({len(dcs)}): {dcs}")
    print(f"Total consumers indexed: {total}")
    for p in (dcs_file, consumers_file):
        size_mb = round(p.stat().st_size / 1024 / 1024, 2)
        print(f"  wrote {p.relative_to(BACKEND_DIR)}  ({size_mb} MB)")
    return 0


if __name__ == "__main__":
    os.chdir(BACKEND_DIR)
    raise SystemExit(main())
