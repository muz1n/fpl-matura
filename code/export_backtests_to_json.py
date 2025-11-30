#!/usr/bin/env python3
"""
Exportiert Backtest-Summary CSVs in JSON-Dateien fuer die WebApp.

Erwartete Dateinamen im Ordner out:
  team_backtest_summary_<season>_gw<start>-<end>.csv

Erwartete Spalten im CSV:
  - method            (z.B. rf, ma3, rf_pos)
  - avg_points        (Durchschnittliche Punkte)
  - efficiency        (z.B. Punkte / Maximum oder aehnliches)

Optional koennen weitere Spalten vorhanden sein, die werden ignoriert.
"""

from pathlib import Path
import pandas as pd
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
WEB_DIR = ROOT / "web"
BACKTEST_JSON_DIR = WEB_DIR / "public" / "data" / "backtests"


def parse_filename(path: Path):
    """
    Erwartet Namen wie:
      team_backtest_summary_2022-23_gw30-38.csv
    Gibt (season, "30-38") zurueck.
    """
    m = re.match(r"team_backtest_summary_(.+)_gw(\d+-\d+)\.csv", path.name)
    if not m:
        return None
    season = m.group(1)
    gw_range = m.group(2)
    return season, gw_range


def convert_file(csv_path: Path):
    parsed = parse_filename(csv_path)
    if not parsed:
        print(f"Ueberspringe Datei mit unerwartetem Namen: {csv_path.name}")
        return

    season, gw_range = parsed
    df = pd.read_csv(csv_path)

    required_cols = ["method", "avg_xi_points", "avg_efficiency"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Spalte '{col}' fehlt in {csv_path}")

    records = []
    for _, row in df.iterrows():
        rec = {
            "method": str(row["method"]),
            "season": season,
            "gw_range": gw_range,
            "avg_points": float(row["avg_xi_points"]),
            "efficiency": float(row["avg_efficiency"]),
        }
        records.append(rec)

    BACKTEST_JSON_DIR.mkdir(parents=True, exist_ok=True)
    out_path = BACKTEST_JSON_DIR / f"{season}_gw{gw_range}.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Geschrieben: {out_path}")


def main():
    for csv_path in OUT_DIR.glob("team_backtest_summary_*.csv"):
        print(f"Verarbeite {csv_path.name}...")
        convert_file(csv_path)


if __name__ == "__main__":
    main()
