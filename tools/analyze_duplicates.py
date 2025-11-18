#!/usr/bin/env python3
"""
Prüft, ob Duplikate aus vaastav-Originalquellen oder aus unserem Import kommen.

Analysiert:
1. Direkter Download von vaastav GitHub (RAW)
2. Unsere gespeicherten merged_gw_*.csv Dateien
3. Vergleich: Sind Duplikate bereits im Original oder entstehen sie beim Zusammenfügen?

Autor: Tim Sennhauser
Datum: 2024-11-18
"""

import requests
from pathlib import Path
from io import StringIO

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BASE_URL = (
    "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"
)


def check_vaastav_original(season: str) -> dict:
    """
    Lädt Original-Datei direkt von vaastav GitHub und prüft auf Duplikate.

    Returns:
        Dict mit Duplikat-Info
    """
    url = f"{BASE_URL}/{season}/gws/merged_gw.csv"

    try:
        print(f"Downloading {season} from vaastav...", end=" ")
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        df = pd.read_csv(StringIO(response.text))

        # Spalten standardisieren für Vergleich
        if "element" in df.columns:
            df["player_id"] = df["element"]
        if "round" in df.columns:
            df["gw"] = df["round"]
        elif "GW" in df.columns:
            df["gw"] = df["GW"]

        # Duplikate prüfen
        if "player_id" in df.columns and "gw" in df.columns:
            duplicates = df.duplicated(subset=["player_id", "gw"], keep=False)
            duplicate_count = duplicates.sum()

            # Zeige Beispiele
            if duplicate_count > 0:
                dup_examples = (
                    df[duplicates]
                    .head(10)[["player_id", "gw", "name"]]
                    .to_dict("records")
                )
            else:
                dup_examples = []

            print(f"{'✗' if duplicate_count > 0 else '✓'} {duplicate_count} Duplikate")

            return {
                "season": season,
                "source": "vaastav_original",
                "total_rows": len(df),
                "duplicate_rows": int(duplicate_count),
                "duplicate_pairs": (
                    int(duplicate_count // 2) if duplicate_count > 0 else 0
                ),
                "examples": dup_examples,
            }
        else:
            print("✗ Fehlende Spalten")
            return {
                "season": season,
                "source": "vaastav_original",
                "error": "Missing player_id or gw columns",
            }

    except Exception as e:
        print(f"✗ Error: {e}")
        return {
            "season": season,
            "source": "vaastav_original",
            "error": str(e),
        }


def check_our_file(season: str) -> dict:
    """
    Prüft unsere gespeicherte merged_gw_*.csv Datei.

    Returns:
        Dict mit Duplikat-Info
    """
    filepath = DATA_DIR / f"merged_gw_{season}.csv"

    if not filepath.exists():
        return {
            "season": season,
            "source": "our_file",
            "error": "File not found",
        }

    try:
        print(f"Checking our file {season}...", end=" ")
        df = pd.read_csv(filepath)

        # Duplikate prüfen
        if "player_id" in df.columns and "gw" in df.columns:
            duplicates = df.duplicated(subset=["player_id", "gw"], keep=False)
            duplicate_count = duplicates.sum()

            # Zeige Beispiele
            if duplicate_count > 0:
                dup_examples = (
                    df[duplicates]
                    .head(10)[["player_id", "gw", "name"]]
                    .to_dict("records")
                )
            else:
                dup_examples = []

            print(f"{'✗' if duplicate_count > 0 else '✓'} {duplicate_count} Duplikate")

            return {
                "season": season,
                "source": "our_file",
                "total_rows": len(df),
                "duplicate_rows": int(duplicate_count),
                "duplicate_pairs": (
                    int(duplicate_count // 2) if duplicate_count > 0 else 0
                ),
                "examples": dup_examples,
            }
        else:
            print("✗ Fehlende Spalten")
            return {
                "season": season,
                "source": "our_file",
                "error": "Missing player_id or gw columns",
            }

    except Exception as e:
        print(f"✗ Error: {e}")
        return {
            "season": season,
            "source": "our_file",
            "error": str(e),
        }


def main():
    """Hauptfunktion: Vergleicht vaastav-Original mit unseren Dateien."""
    print("=" * 70)
    print("DUPLIKAT-ANALYSE: vaastav Original vs. Unsere Dateien")
    print("=" * 70)
    print()

    # Test-Seasons: verschiedene Jahre
    test_seasons = ["2016-17", "2020-21", "2022-23", "2023-24"]

    results = []

    for season in test_seasons:
        print(f"\n--- {season} ---")

        # 1. Prüfe vaastav Original
        vaastav_result = check_vaastav_original(season)
        results.append(vaastav_result)

        # 2. Prüfe unsere Datei
        our_result = check_our_file(season)
        results.append(our_result)

        # 3. Vergleich
        if "error" not in vaastav_result and "error" not in our_result:
            vaastav_dups = vaastav_result["duplicate_rows"]
            our_dups = our_result["duplicate_rows"]

            if vaastav_dups == our_dups:
                print(
                    f"  ➜ Duplikate sind IDENTISCH ({vaastav_dups}) → Problem liegt bei vaastav!"
                )
            elif our_dups > vaastav_dups:
                print(
                    f"  ➜ Mehr Duplikate in unserer Datei ({our_dups} vs {vaastav_dups}) → Unser Import fügt Duplikate hinzu!"
                )
            else:
                print(
                    f"  ➜ Weniger Duplikate in unserer Datei ({our_dups} vs {vaastav_dups}) → Unser Import bereinigt Duplikate!"
                )

    print("\n" + "=" * 70)
    print("ZUSAMMENFASSUNG")
    print("=" * 70)

    # Gruppiere Ergebnisse
    vaastav_results = [
        r for r in results if r["source"] == "vaastav_original" and "error" not in r
    ]
    our_results = [r for r in results if r["source"] == "our_file" and "error" not in r]

    print("\nvaastav Original:")
    for r in vaastav_results:
        print(
            f"  {r['season']}: {r['duplicate_rows']} Duplikate ({r['duplicate_pairs']} Paare)"
        )

    print("\nUnsere Dateien:")
    for r in our_results:
        print(
            f"  {r['season']}: {r['duplicate_rows']} Duplikate ({r['duplicate_pairs']} Paare)"
        )

    print("\nFAZIT:")
    if vaastav_results and our_results:
        vaastav_total = sum(r["duplicate_rows"] for r in vaastav_results)
        our_total = sum(r["duplicate_rows"] for r in our_results)

        if vaastav_total == our_total:
            print("  ✗ Duplikate sind BEREITS IM ORIGINAL von vaastav vorhanden!")
            print(
                "  → Wir brauchen ein Cleanup-Script + Qualitätsreport für die Arbeit"
            )
        elif our_total > vaastav_total:
            print("  ✗ Unser Import FÜGT DUPLIKATE HINZU!")
            print("  → download_all_seasons.py muss gefixt werden")
        else:
            print("  ✓ Unser Import bereinigt bereits Duplikate")

    print()


if __name__ == "__main__":
    main()
