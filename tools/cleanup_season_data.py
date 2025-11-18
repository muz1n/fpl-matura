#!/usr/bin/env python3
"""
Data Cleanup Script für FPL Season-Daten.

Behebt bekannte Datenqualitätsprobleme in vaastav/Fantasy-Premier-League:
1. Duplikate (player_id + gw Kombinationen mehrfach vorhanden)
2. Fehlende Position-Daten (pos = NaN in älteren Seasons)

Strategie:
- Duplikate: Behalte letzten Eintrag (keep='last') - aktuellste Daten
- Fehlende pos: Bleibt NaN (wird später in make_predictions.py auf "MID" gefüllt)

Output:
- Bereinigte CSV-Dateien: data/cleaned_merged_gw_*.csv
- Qualitätsreport: data/cleanup_report.json

Autor: Tim Sennhauser
Datum: 2024-11-18
"""

import json
from pathlib import Path
from typing import Dict, List, Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def clean_season_file(season: str, filepath: Path) -> Dict[str, Any]:
    """
    Bereinigt eine Season-Datei von Duplikaten.

    Args:
        season: Season-String (z.B. "2022-23")
        filepath: Pfad zur Original-Datei

    Returns:
        Dict mit Cleanup-Statistiken
    """
    report = {
        "season": season,
        "original_file": filepath.name,
        "status": "ok",
        "changes": [],
    }

    try:
        # Datei laden
        df = pd.read_csv(filepath)
        original_rows = len(df)
        report["original_rows"] = original_rows

        # 1. Duplikate entfernen
        if "player_id" in df.columns and "gw" in df.columns:
            # Zähle Duplikate BEFORE
            duplicates_before = df.duplicated(
                subset=["player_id", "gw"], keep=False
            ).sum()

            # Entferne Duplikate (behalte letzten Eintrag)
            df_cleaned = df.drop_duplicates(subset=["player_id", "gw"], keep="last")

            duplicates_removed = original_rows - len(df_cleaned)

            if duplicates_removed > 0:
                report["changes"].append(
                    {
                        "type": "duplicates_removed",
                        "count": int(duplicates_removed),
                        "duplicate_pairs": int(duplicates_before // 2),
                        "strategy": "keep='last' (aktuellste Daten)",
                    }
                )
        else:
            df_cleaned = df
            report["changes"].append(
                {
                    "type": "warning",
                    "message": "Keine player_id/gw Spalten - Duplikat-Check übersprungen",
                }
            )

        # 2. Fehlende Position-Daten dokumentieren (nicht fixen)
        if "pos" in df_cleaned.columns:
            nan_positions = df_cleaned["pos"].isna().sum()
            if nan_positions > 0:
                report["changes"].append(
                    {
                        "type": "missing_positions",
                        "count": int(nan_positions),
                        "action": "Keine Änderung (wird in make_predictions.py auf MID gefüllt)",
                    }
                )

        report["cleaned_rows"] = len(df_cleaned)
        report["rows_removed"] = int(original_rows - len(df_cleaned))

        # Speichere bereinigte Datei
        output_file = DATA_DIR / f"cleaned_{filepath.name}"
        df_cleaned.to_csv(output_file, index=False)
        report["output_file"] = output_file.name

        return report

    except Exception as e:
        report["status"] = "error"
        report["error"] = str(e)
        return report


def generate_quality_report(cleanup_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Erstellt einen umfassenden Qualitätsbericht.

    Returns:
        Dict mit Gesamtstatistiken
    """
    total_original = sum(
        r.get("original_rows", 0) for r in cleanup_results if "original_rows" in r
    )
    total_cleaned = sum(
        r.get("cleaned_rows", 0) for r in cleanup_results if "cleaned_rows" in r
    )
    total_removed = total_original - total_cleaned

    # Duplikat-Statistiken
    duplicates_by_season = []
    for r in cleanup_results:
        dup_changes = [
            c for c in r.get("changes", []) if c.get("type") == "duplicates_removed"
        ]
        if dup_changes:
            duplicates_by_season.append(
                {
                    "season": r["season"],
                    "duplicates_removed": dup_changes[0]["count"],
                    "duplicate_pairs": dup_changes[0]["duplicate_pairs"],
                }
            )

    total_duplicates = sum(d["duplicates_removed"] for d in duplicates_by_season)

    # Position-Statistiken
    missing_pos_by_season = []
    for r in cleanup_results:
        pos_changes = [
            c for c in r.get("changes", []) if c.get("type") == "missing_positions"
        ]
        if pos_changes:
            missing_pos_by_season.append(
                {
                    "season": r["season"],
                    "missing_positions": pos_changes[0]["count"],
                }
            )

    return {
        "summary": {
            "total_seasons_processed": len(cleanup_results),
            "total_original_rows": total_original,
            "total_cleaned_rows": total_cleaned,
            "total_rows_removed": total_removed,
            "total_duplicates_removed": total_duplicates,
        },
        "duplicates_by_season": duplicates_by_season,
        "missing_positions_by_season": missing_pos_by_season,
        "data_quality_issues": {
            "description": "Duplikate stammen aus vaastav/Fantasy-Premier-League Original-Daten",
            "likely_cause": "Daten-Updates/Korrekturen während der Season (z.B. nachträgliche Preis-/Statistik-Anpassungen)",
            "cleanup_strategy": "Behalte letzten Eintrag (keep='last') um aktuellste Daten zu verwenden",
        },
        "detailed_results": cleanup_results,
    }


def main():
    """Hauptfunktion: Bereinigt alle Season-Dateien."""
    print("=" * 70)
    print("DATA CLEANUP - FPL Season-Daten")
    print("=" * 70)
    print()

    # Finde alle merged_gw_*.csv Dateien (NICHT cleaned_*)
    season_files = [
        f
        for f in DATA_DIR.glob("merged_gw_*.csv")
        if not f.name.startswith("cleaned_") and f.name != "merged_gw_all_seasons.csv"
    ]

    if not season_files:
        print("❌ Keine Season-Dateien gefunden in data/")
        return

    print(f"Gefunden: {len(season_files)} Season-Dateien")
    print()

    cleanup_results = []

    for filepath in sorted(season_files):
        # Extrahiere Season aus Dateiname
        season = filepath.stem.replace("merged_gw_", "")
        print(f"Bereinige {season}...", end=" ")

        result = clean_season_file(season, filepath)
        cleanup_results.append(result)

        if result["status"] == "ok":
            removed = result.get("rows_removed", 0)
            print(f"✓ {removed} Zeilen entfernt ({result['cleaned_rows']} verbleiben)")
        else:
            print(f"✗ Fehler: {result.get('error', 'Unknown')}")

    print()
    print("=" * 70)
    print("QUALITY REPORT")
    print("=" * 70)

    # Generiere Qualitätsbericht
    quality_report = generate_quality_report(cleanup_results)

    summary = quality_report["summary"]
    print("\nZusammenfassung:")
    print(f"  Seasons verarbeitet: {summary['total_seasons_processed']}")
    print(f"  Original-Zeilen: {summary['total_original_rows']:,}")
    print(f"  Bereinigte Zeilen: {summary['total_cleaned_rows']:,}")
    print(f"  Entfernte Duplikate: {summary['total_duplicates_removed']:,}")

    if quality_report["duplicates_by_season"]:
        print("\nDuplikate pro Season:")
        for d in quality_report["duplicates_by_season"]:
            print(
                f"  {d['season']}: {d['duplicates_removed']:,} Duplikate ({d['duplicate_pairs']:,} Paare)"
            )

    # Speichere Qualitätsbericht
    report_file = DATA_DIR / "cleanup_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Qualitätsbericht gespeichert: {report_file}")

    print()
    print("=" * 70)
    print("DOKUMENTATION FÜR MATURAARBEIT")
    print("=" * 70)
    print(
        """
Datenqualität - Erkenntnisse:

1. Duplikate in Original-Daten:
   - vaastav/Fantasy-Premier-League enthält Duplikate (player_id + gw mehrfach)
   - Vermutlich durch nachträgliche Updates während der Season
   - Betrifft ALLE Seasons (2016-17 bis 2023-24)

2. Cleanup-Strategie:
   - Behalte letzten Eintrag (keep='last')
   - Begründung: Aktuellste Daten nach möglichen Korrekturen
   - Dokumentiert in cleanup_report.json

3. Verwendung:
   - Original-Dateien: merged_gw_*.csv (mit Duplikaten)
   - Bereinigte Dateien: cleaned_merged_gw_*.csv (ohne Duplikate)
   - make_predictions.py sollte bereinigte Dateien verwenden
    """
    )

    print("\n✓ Cleanup abgeschlossen!")
    print()


if __name__ == "__main__":
    main()
