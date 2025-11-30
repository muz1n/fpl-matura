#!/usr/bin/env python3
"""
Exportiere Prognosen aus einer CSV in JSON-Dateien fuer die WebApp.

Annahme:
- Die CSV hat mindestens die Spalten:
  - season (z.B. "2022-23")
  - gw (Gameweek als Zahl)
  - player_name
  - team
  - position
  - predicted_points
  - actual_points (optional)

Du musst unten INPUT_CSV und OUTPUT_BASE_DIR anpassen.
"""

from pathlib import Path
import pandas as pd
import json

# TODO: Pfad anpassen: wo liegt deine Predictions-CSV?
INPUT_CSV = Path("data/cleaned_merged_gw_2023-24.csv")

# Pfad zum Web-Projekt (relativ von hier aus anpassen)
WEB_DIR = Path("web")
OUTPUT_BASE_DIR = WEB_DIR / "public" / "data" / "predictions"


def main() -> None:
    df = pd.read_csv(INPUT_CSV)

    required_cols = ["season", "GW", "name", "team", "pos", "xP"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Spalte '{col}' fehlt in {INPUT_CSV}")

    has_actual = "points" in df.columns

    for (season, gw), group in df.groupby(["season", "GW"]):
        season_str = str(season)
        gw_int = int(gw)

        records = []
        for _, row in group.iterrows():
            rec = {
                "player_name": row["name"],
                "team": row["team"],
                "position": row["pos"],
                "gw": gw_int,
                "predicted_points": float(row["xP"]),
            }
            if has_actual:
                rec["actual_points"] = float(row["points"])
            if "player_id" in df.columns:
                rec["player_id"] = int(row["player_id"])
            records.append(rec)

        out_dir = OUTPUT_BASE_DIR / season_str
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"gw{gw_int}.json"

        with out_path.open("w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        print(f"Geschrieben: {out_path}")


if __name__ == "__main__":
    main()
