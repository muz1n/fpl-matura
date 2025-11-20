"""Berechnung von Feature Importances für das Random Forest Modell.

Dieses Skript nutzt die gleiche Datenaufbereitung wie `rf_baseline.py` und
schreibt eine JSON-Datei mit sortierten Feature Importances nach `out/`.

Ausgabeformat JSON (`feature_importance_<season>_rf.json`):
{
  "season": "2023-24",
  "method": "rf",
  "n_features": 8,
  "generated_at": "2025-11-20T12:34:56Z",
  "features": [
    {"feature": "price", "importance": 0.21, "rank": 1, "cumulative": 0.21, "normalized": 1.0},
    ...
  ]
}

Verwendung:
  python code/compute_feature_importance.py --season 2023-24 --train_csv data/merged_gw_2023-24.csv --out out

Hinweis:
- Falls eine bereinigte Datei `cleaned_merged_gw_<season>.csv` existiert, wird diese bevorzugt.
- Die Feature-Engineering Logik wird aus `rf_baseline.py` wiederverwendet.
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

# Reuse Helper aus rf_baseline
from rf_baseline import load_train_table, train_rf  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR = ROOT / "data"


def resolve_train_csv(season: str) -> Path:
    """Finde passende Trainingsdatei für Season.

    Bevorzugt bereinigte Datei, sonst originale merged Datei.
    """
    cleaned = DATA_DIR / f"cleaned_merged_gw_{season}.csv"
    raw = DATA_DIR / f"merged_gw_{season}.csv"
    if cleaned.exists():
        return cleaned
    if raw.exists():
        return raw
    raise FileNotFoundError(
        f"Keine Trainingsdaten für Season {season} gefunden (cleaned oder merged)."
    )


def compute_importances(
    season: str, train_csv: Path, position: str | None = None
) -> Dict[str, Any]:
    """Trainiert RF und berechnet sortierte Feature Importances.

    Optional kann nach Position gefiltert werden (GK, DEF, MID, FWD). Dann werden nur
    Zeilen dieser Position fuer das Training genutzt (Ziel: positionsspezifische Aussage).

    Args:
        season: Season-String (z.B. "2023-24")
        train_csv: Pfad zur Trainings-CSV (bereinigt oder roh)
        position: Optional Positionsfilter

    Returns:
        Dictionary mit Metadaten und Feature-Liste
    """
    if position is None:
        # Standardpfad: gesamte Daten wie gehabt
        X_train, y_train, X_test, y_test, feats, price_baseline, meta = (
            load_train_table(train_csv)
        )
    else:
        # Eigene reduzierte Aufbereitung (dupliziert Logik vereinfacht aus rf_baseline)
        import pandas as pd

        df = pd.read_csv(train_csv)

        # Spalten ermitteln
        id_col = next(
            (c for c in ["element", "id", "player_id"] if c in df.columns), None
        )
        gw_col = next(
            (c for c in ["GW", "gw", "round", "event"] if c in df.columns), None
        )
        tp_col = next((c for c in ["total_points", "points"] if c in df.columns), None)
        min_col = next((c for c in ["minutes", "mins"] if c in df.columns), None)
        pos_col = next((c for c in ["position", "pos"] if c in df.columns), None)

        needed = [id_col, gw_col, tp_col, min_col, pos_col]
        if any(c is None for c in needed):
            missing = [
                n
                for n, c in zip(
                    ["id", "gw", "total_points", "minutes", "position"], needed
                )
                if c is None
            ]
            raise ValueError(f"Fehlende Spalten fuer Positionsfilter: {missing}")

        rename = {
            id_col: "id",
            gw_col: "gw",
            tp_col: "total_points",
            min_col: "minutes",
            pos_col: "position",
        }
        df = df.rename(columns=rename)

        # Filter nach Position
        df = df[df["position"] == position].copy()
        if df.empty:
            raise ValueError(f"Keine Daten fuer Position {position}")

        import pandas as pd  # lokale Nutzung

        df["id"] = pd.to_numeric(df["id"], errors="coerce")
        df["gw"] = pd.to_numeric(df["gw"], errors="coerce")
        df["total_points"] = pd.to_numeric(df["total_points"], errors="coerce")
        df["minutes"] = pd.to_numeric(df["minutes"], errors="coerce")
        df = df.sort_values(["id", "gw"])
        df["target_next"] = df.groupby("id")["total_points"].shift(-1)
        # Rolling
        for c in ["total_points", "minutes"]:
            df[f"{c}_r3"] = (
                df.groupby("id")[c].shift(1).rolling(3, min_periods=1).mean()
            )
        if set(["total_points_r3", "minutes_r3"]).issubset(df.columns):
            df["tp_per90_r3"] = (
                df["total_points_r3"] / df["minutes_r3"].replace(0, np.nan) * 90
            )
        last_gw = int(df["gw"].max())
        test_from = max(df["gw"].min(), last_gw - 7)
        train = df[(df["gw"] < test_from) & df["target_next"].notna()].copy()
        feats = [
            c
            for c in ["total_points_r3", "minutes_r3", "tp_per90_r3"]
            if c in train.columns
        ]
        X_train, y_train = train[feats].fillna(0.0), train["target_next"].values
        # Dummy fuer API-Kompat
    # Meta / Baseline im Positionsmodus nicht genutzt – daher entfallen
    # Kein X_test hier notwendig fuer Importances
    rf = train_rf(X_train, y_train)

    importances = rf.feature_importances_
    if len(importances) != len(feats):
        raise ValueError(
            f"Länge importances ({len(importances)}) != Länge feats ({len(feats)})"
        )
    order = np.argsort(importances)[::-1]
    sorted_feats: List[Dict[str, Any]] = []
    cumulative = 0.0
    max_imp = float(importances[order[0]]) if len(order) else 1.0
    for rank, idx in enumerate(order, start=1):
        imp = float(importances[idx])
        cumulative += imp
        sorted_feats.append(
            {
                "feature": feats[idx],
                "importance": imp,
                "rank": rank,
                "cumulative": cumulative,
                "normalized": imp / max_imp if max_imp > 0 else 0.0,
            }
        )
    result: Dict[str, Any] = {
        "season": season,
        "method": "rf",
        "n_features": len(feats),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "features": sorted_feats,
        "position": position,
    }
    return result


def write_json(result: Dict[str, Any], out_dir: Path) -> Path:
    """Schreibt Ergebnis nach out/.

    Args:
        result: Ergebnis-Dict
        out_dir: Zielverzeichnis
    Returns:
        Pfad zur geschriebenen Datei
    """
    suffix = f"_{result['position']}" if result.get("position") else ""
    out_path = (
        out_dir
        / f"feature_importance_{result['season']}_{result['method']}{suffix}.json"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    return out_path


def main():
    parser = argparse.ArgumentParser(
        description="Berechne Feature Importances für Random Forest Modell"
    )
    parser.add_argument("--season", required=True, type=str, help="Season z.B. 2023-24")
    parser.add_argument(
        "--train_csv",
        type=str,
        help="Optional expliziter Pfad zur Trainings-CSV; sonst automatische Auflösung",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=str(OUT_DIR),
        help="Ausgabeverzeichnis (Standard: out/)",
    )
    parser.add_argument(
        "--position",
        type=str,
        choices=["GK", "DEF", "MID", "FWD"],
        help="Optional: Filter auf Position fuer positionsspezifische Importances",
    )
    args = parser.parse_args()

    season = args.season
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        train_csv = (
            Path(args.train_csv) if args.train_csv else resolve_train_csv(season)
        )
        if not train_csv.exists():
            raise FileNotFoundError(f"Trainingsdatei existiert nicht: {train_csv}")

        result = compute_importances(season, train_csv, position=args.position)
        out_path = write_json(result, out_dir)
        print(f"✓ Feature Importances gespeichert: {out_path}")

    except Exception as e:
        print(f"❌ Fehler: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
