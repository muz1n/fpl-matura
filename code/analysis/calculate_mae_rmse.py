#!/usr/bin/env python3
"""
Berechnet MAE und RMSE für alle Methoden über alle Testsaisons.

Lädt Vorhersage-JSONs und vergleicht mit tatsächlichen Punkten aus merged_gw.
Erstellt Zusammenfassung für Thesis-Dokumentation.
"""
import json
from pathlib import Path

import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "out"
DATA_DIR = ROOT / "data"


def load_actual_points(season: str) -> pd.DataFrame:
    """Lädt tatsächliche Punkte aus merged_gw Datei."""
    data_file = DATA_DIR / f"merged_gw_{season}.csv"

    if not data_file.exists():
        return pd.DataFrame()

    df = pd.read_csv(data_file)

    # Relevante Spalten: element (player_id), name, GW, points
    if "element" in df.columns:
        df = df.rename(columns={"element": "player_id"})

    # merged_gw hat "points" statt "total_points"
    if "points" in df.columns:
        df["actual_points"] = df["points"]

    return df[["player_id", "name", "GW", "actual_points"]].copy()


def load_predictions(season: str, gw: int, method: str) -> pd.DataFrame | None:
    """Lädt Vorhersage-JSON für eine GW."""
    pred_file = OUT_DIR / "predictions" / f"predictions_{season}_gw{gw}_{method}.json"

    if not pred_file.exists():
        return None

    with open(pred_file, encoding="utf-8") as f:
        data = json.load(f)

    players = data if isinstance(data, list) else data.get("players", [])
    if not players:
        return None

    df = pd.DataFrame(players)
    df["GW"] = gw
    df["season"] = season
    df["method"] = method

    return df


def calculate_metrics(df: pd.DataFrame) -> dict:
    """Berechnet MAE und RMSE aus DataFrame mit predicted_points und actual_points."""
    if "predicted_points" not in df.columns or "actual_points" not in df.columns:
        return {"mae": None, "rmse": None, "n": 0}

    # Entferne Zeilen mit fehlenden Werten
    valid = df.dropna(subset=["predicted_points", "actual_points"])

    if len(valid) == 0:
        return {"mae": None, "rmse": None, "n": 0}

    pred = valid["predicted_points"].to_numpy(dtype=np.float64)
    actual = valid["actual_points"].to_numpy(dtype=np.float64)

    mae = np.mean(np.abs(pred - actual))
    rmse = np.sqrt(np.mean((pred - actual) ** 2))

    return {"mae": float(mae), "rmse": float(rmse), "n": len(valid)}


def main():
    # Test-Saisons und Methoden
    test_seasons = ["2020-21", "2021-22", "2022-23", "2023-24"]
    methods = ["rf", "ma3", "pos"]

    print("Berechne MAE und RMSE für alle Methoden...\n")

    # Sammle alle Ergebnisse
    all_results = []

    for season in test_seasons:
        print(f"\nSaison {season}:")
        print("=" * 60)

        # Lade tatsächliche Punkte für diese Saison
        df_actual = load_actual_points(season)
        if len(df_actual) == 0:
            print(f"  Keine Daten für {season}")
            continue

        for method in methods:
            # Sammle Vorhersagen für alle GWs dieser Saison
            season_data = []

            for gw in range(2, 39):  # GW 2-38
                df_gw = load_predictions(season, gw, method)
                if df_gw is not None:
                    season_data.append(df_gw)

            if not season_data:
                print(f"  {method.upper():6s}: Keine Vorhersage-Daten")
                continue

            # Kombiniere alle GWs
            df_pred = pd.concat(season_data, ignore_index=True)

            # Merge mit tatsächlichen Punkten
            # Versuche über player_id, falls nicht vorhanden über name+GW
            if "player_id" in df_pred.columns:
                df_merged = df_pred.merge(
                    df_actual,
                    on=["player_id", "GW"],
                    how="inner",
                    suffixes=("_pred", "_actual"),
                )
            else:
                df_merged = df_pred.merge(
                    df_actual,
                    on=["name", "GW"],
                    how="inner",
                    suffixes=("_pred", "_actual"),
                )

            # Berechne Metriken
            metrics = calculate_metrics(df_merged)

            if metrics["mae"] is not None:
                print(
                    f"  {method.upper():6s}: MAE = {metrics['mae']:.2f}, RMSE = {metrics['rmse']:.2f} (n={metrics['n']})"
                )

                all_results.append(
                    {
                        "season": season,
                        "method": method,
                        "mae": round(metrics["mae"], 2),
                        "rmse": round(metrics["rmse"], 2),
                        "n_predictions": metrics["n"],
                    }
                )
            else:
                print(f"  {method.upper():6s}: Fehler bei Berechnung")

    if not all_results:
        print("\n❌ Keine Ergebnisse berechnet!")
        return

    # Berechne Durchschnitt über alle Saisons
    print("\n" + "=" * 60)
    print("Durchschnitt über alle Test-Saisons:")
    print("=" * 60)

    df_results = pd.DataFrame(all_results)

    for method in methods:
        method_data = df_results[df_results["method"] == method]
        if len(method_data) > 0:
            avg_mae = method_data["mae"].mean()
            avg_rmse = method_data["rmse"].mean()
            total_n = method_data["n_predictions"].sum()
            print(
                f"  {method.upper():6s}: MAE = {avg_mae:.2f}, RMSE = {avg_rmse:.2f} (total n={total_n})"
            )

    # Speichere Ergebnisse
    out_dir = ROOT / "out" / "analysis"
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "description": "MAE und RMSE für alle Methoden über Test-Saisons 2020-21 bis 2023-24",
        "by_season": all_results,
        "averages": {
            method: {
                "mae": round(
                    df_results[df_results["method"] == method]["mae"].mean(), 2
                ),
                "rmse": round(
                    df_results[df_results["method"] == method]["rmse"].mean(), 2
                ),
                "total_predictions": int(
                    df_results[df_results["method"] == method]["n_predictions"].sum()
                ),
            }
            for method in methods
            if len(df_results[df_results["method"] == method]) > 0
        },
    }

    out_file = out_dir / "mae_rmse.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Ergebnisse gespeichert: {out_file}")

    # Erstelle auch CSV für einfache Verwendung
    csv_file = out_dir / "mae_rmse.csv"
    df_results.to_csv(csv_file, index=False)
    print(f"✓ CSV gespeichert: {csv_file}")


if __name__ == "__main__":
    main()
