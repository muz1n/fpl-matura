#!/usr/bin/env python3
"""
Validiert alle Season-Daten von vaastav/Fantasy-Premier-League.

Prüft:
- Spalten-Vollständigkeit (player_id, gw, pos, team, price, points, name)
- Datenqualität (NaN-Werte, Duplikate, inkonsistente GW-Nummern)
- Spieler-Anzahl pro GW (sollte ~700-800 sein)
- Position-Verteilung (sollte GK/DEF/MID/FWD haben)
- Anomalien (z.B. GW32 in 2022-23 hat nur 611 Spieler)

Output: JSON-Report mit allen Problemen pro Season

Autor: Tim Sennhauser
Datum: 2024-11-18
"""

import json
from pathlib import Path
from typing import Dict, Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def validate_season_file(season: str, filepath: Path) -> Dict[str, Any]:
    """
    Validiert eine Season-Datei.

    Returns:
        Dict mit Validierungsergebnissen
    """
    report = {
        "season": season,
        "file": filepath.name,
        "status": "ok",
        "warnings": [],
        "errors": [],
        "stats": {},
    }

    try:
        # Datei laden
        df = pd.read_csv(filepath)
        report["stats"]["total_rows"] = len(df)
        report["stats"]["columns"] = list(df.columns)

        # Spalten-Mapping (standardisiert nach download_all_seasons.py)
        expected_cols = ["player_id", "gw", "pos", "team", "price", "points", "name"]
        actual_cols = df.columns.tolist()

        # Check ob wichtige Spalten vorhanden (nach Mapping)
        if "element" in actual_cols:
            df = df.rename(columns={"element": "player_id"})
        if "round" in actual_cols:
            df = df.rename(columns={"round": "gw"})
        if "position" in actual_cols:
            df = df.rename(columns={"position": "pos"})
        if "total_points" in actual_cols:
            df = df.rename(columns={"total_points": "points"})

        missing_cols = [c for c in expected_cols if c not in df.columns]
        if missing_cols:
            report["errors"].append(f"Fehlende Spalten: {missing_cols}")
            report["status"] = "error"
            return report

        # GW-Analyse
        if "gw" in df.columns:
            df["gw"] = pd.to_numeric(df["gw"], errors="coerce")
            gws = df["gw"].dropna().unique()
            report["stats"]["gameweeks"] = sorted([int(g) for g in gws if pd.notna(g)])
            report["stats"]["num_gameweeks"] = len(gws)

            # Spieler pro GW
            players_per_gw = df.groupby("gw")["player_id"].nunique().to_dict()
            report["stats"]["players_per_gw"] = {
                int(k): int(v) for k, v in players_per_gw.items() if pd.notna(k)
            }

            # Anomalien finden (< 600 oder > 900 Spieler)
            anomalies = {
                gw: count
                for gw, count in players_per_gw.items()
                if pd.notna(gw) and (count < 600 or count > 900)
            }
            if anomalies:
                for gw, count in anomalies.items():
                    report["warnings"].append(
                        f"GW{int(gw)}: Ungewöhnliche Spielerzahl ({count} Spieler, erwartet 700-800)"
                    )

        # Position-Analyse
        if "pos" in df.columns:
            pos_counts = df["pos"].value_counts().to_dict()
            report["stats"]["position_distribution"] = pos_counts

            # Check ob alle Positionen vorhanden
            expected_positions = {"GK", "DEF", "MID", "FWD"}
            actual_positions = set(pos_counts.keys())
            missing_positions = expected_positions - actual_positions
            if missing_positions:
                report["warnings"].append(f"Fehlende Positionen: {missing_positions}")

        # NaN-Analyse
        nan_counts = df[expected_cols].isna().sum().to_dict()
        critical_nans = {
            col: count
            for col, count in nan_counts.items()
            if count > 0 and col in ["player_id", "gw", "pos"]
        }
        if critical_nans:
            report["warnings"].append(
                f"NaN-Werte in kritischen Spalten: {critical_nans}"
            )

        # Duplikate prüfen
        if "player_id" in df.columns and "gw" in df.columns:
            duplicates = df.duplicated(subset=["player_id", "gw"], keep=False).sum()
            if duplicates > 0:
                report["errors"].append(f"Duplikate gefunden: {duplicates} Zeilen")
                report["status"] = "error"

        # Punkte-Statistiken
        if "points" in df.columns:
            df["points"] = pd.to_numeric(df["points"], errors="coerce")
            report["stats"]["points_stats"] = {
                "mean": round(df["points"].mean(), 2),
                "median": round(df["points"].median(), 2),
                "max": (
                    int(df["points"].max()) if pd.notna(df["points"].max()) else None
                ),
                "min": (
                    int(df["points"].min()) if pd.notna(df["points"].min()) else None
                ),
            }

        # Preis-Statistiken
        if "price" in df.columns:
            df["price"] = pd.to_numeric(df["price"], errors="coerce")
            price_median = df["price"].dropna().median()
            # Preis normalisieren falls in 10er-Einheiten
            if price_median > 25:
                df["price"] = df["price"] / 10.0
            report["stats"]["price_stats"] = {
                "mean": round(df["price"].mean(), 2),
                "median": round(df["price"].median(), 2),
                "max": (
                    round(df["price"].max(), 1) if pd.notna(df["price"].max()) else None
                ),
                "min": (
                    round(df["price"].min(), 1) if pd.notna(df["price"].min()) else None
                ),
            }

        # Warnung-Level setzen
        if report["warnings"] and report["status"] == "ok":
            report["status"] = "warning"

    except Exception as e:
        report["status"] = "error"
        report["errors"].append(f"Fehler beim Laden: {str(e)}")

    return report


def main():
    """Validiert alle Season-Dateien."""
    print("=" * 70)
    print("VALIDIERUNG ALLER SEASON-DATEN")
    print("=" * 70)
    print()

    # Bevorzuge bereinigte Dateien, falls vorhanden
    cleaned_files = list(DATA_DIR.glob("cleaned_merged_gw_*.csv"))
    original_files = list(DATA_DIR.glob("merged_gw_*.csv"))

    if cleaned_files:
        season_files = cleaned_files
        print(f"✓ Verwende bereinigte Dateien: {len(season_files)} Seasons")
    else:
        season_files = original_files
        print(
            f"⚠ Keine bereinigten Dateien gefunden, verwende Original: {len(season_files)} Seasons"
        )

    if not season_files:
        print("❌ Keine Season-Dateien gefunden in data/")
        return

    print()

    all_reports = []

    for filepath in sorted(season_files):
        # Extrahiere Season aus Dateiname (z.B. "cleaned_merged_gw_2022-23.csv" → "2022-23")
        season = filepath.stem.replace("cleaned_merged_gw_", "").replace(
            "merged_gw_", ""
        )
        print(f"Validiere {season}...", end=" ")

        report = validate_season_file(season, filepath)
        all_reports.append(report)

        # Status-Symbol
        status_symbol = {"ok": "✓", "warning": "⚠", "error": "✗"}[report["status"]]

        print(f"{status_symbol} {report['status'].upper()}")

        # Fehler/Warnungen anzeigen
        for error in report["errors"]:
            print(f"  ✗ FEHLER: {error}")
        for warning in report["warnings"]:
            print(f"  ⚠ WARNUNG: {warning}")

        if report["status"] == "ok":
            stats = report["stats"]
            print(f"  → {stats['total_rows']} Zeilen, {stats['num_gameweeks']} GWs")

    print()
    print("=" * 70)
    print("ZUSAMMENFASSUNG")
    print("=" * 70)

    ok_count = sum(1 for r in all_reports if r["status"] == "ok")
    warning_count = sum(1 for r in all_reports if r["status"] == "warning")
    error_count = sum(1 for r in all_reports if r["status"] == "error")

    print(f"✓ OK: {ok_count}")
    print(f"⚠ Warnungen: {warning_count}")
    print(f"✗ Fehler: {error_count}")
    print()

    # Speichere detaillierten Report
    output_file = DATA_DIR / "validation_report.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_reports, f, indent=2, ensure_ascii=False)

    print(f"✓ Detaillierter Report gespeichert: {output_file}")

    # Zeige kritische Probleme
    print()
    print("=" * 70)
    print("KRITISCHE PROBLEME")
    print("=" * 70)

    critical_issues = []
    for report in all_reports:
        if report["status"] == "error":
            critical_issues.append(f"{report['season']}: {', '.join(report['errors'])}")
        elif report["status"] == "warning":
            # Nur schwere Warnungen anzeigen
            severe_warnings = [
                w for w in report["warnings"] if "Ungewöhnliche Spielerzahl" in w
            ]
            if severe_warnings:
                critical_issues.append(
                    f"{report['season']}: {', '.join(severe_warnings)}"
                )

    if critical_issues:
        for issue in critical_issues:
            print(f"⚠ {issue}")
    else:
        print("✓ Keine kritischen Probleme gefunden!")

    print()


if __name__ == "__main__":
    main()
