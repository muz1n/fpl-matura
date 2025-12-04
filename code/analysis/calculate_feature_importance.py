#!/usr/bin/env python3
"""
Berechnet Feature Importance aus trainierten Random Forest Modellen.

Da wir positionsspezifische Modelle verwenden, analysieren wir jedes Modell
separat und berechnen dann einen gewichteten Durchschnitt.

Output: JSON-Datei mit Feature Importance Werten
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"


def build_features(row):
    """
    Baut Feature-Vektor wie in position_model.py
    """
    feats = {}

    # Rolling-Features
    for col in [
        "minutes_ma3",
        "total_points_ma3",
        "ict_index_ma3",
        "influence_ma3",
        "creativity_ma3",
        "threat_ma3",
    ]:
        feats[col] = row.get(col, 0.0)
        if pd.isna(feats[col]):
            feats[col] = 0.0

    # Heim-Flag
    feats["home"] = 1.0 if row.get("was_home", False) else 0.0

    # Gegnerstärke
    opp_str = row.get("opponent_strength", None)
    if opp_str is not None and not pd.isna(opp_str):
        feats["opponent_strength"] = float(opp_str)
    else:
        feats["opponent_strength"] = 3.0

    # Interaktion
    feats["minutes_x_ict"] = feats["minutes_ma3"] * feats["ict_index_ma3"]

    return feats


def compute_rolling_features(df, group_cols=None, window=3):
    """
    Berechnet Rolling-Features je Spieler.
    """
    if group_cols is None:
        group_cols = ["name"]

    feature_cols = [
        "minutes",
        "total_points",
        "ict_index",
        "influence",
        "creativity",
        "threat",
    ]

    available = [c for c in feature_cols if c in df.columns]

    df_sorted = df.sort_values(group_cols + ["GW"]).copy()

    for col in available:
        shifted = df_sorted.groupby(group_cols)[col].shift(1)
        rolled = shifted.rolling(window=window, min_periods=1).mean()
        df_sorted[f"{col}_ma{window}"] = rolled

    return df_sorted


def train_position_models(train_df, positions=["GK", "DEF", "MID", "FWD"]):
    """
    Trainiert positionsspezifische RF-Modelle und gibt Feature Importance zurück.
    """
    models = {}
    feature_importances = {}

    for pos in positions:
        pos_data = train_df[train_df["position"] == pos].copy()
        if len(pos_data) == 0:
            print(f"⚠ Keine Daten für Position {pos}")
            continue

        # Feature-Matrix erstellen
        X_list = []
        y_list = []

        for idx, row in pos_data.iterrows():
            feats = build_features(row)
            X_list.append(list(feats.values()))
            y_list.append(row.get("total_points", row.get("points", 0.0)))

        X = np.array(X_list)
        y = np.array(y_list)

        # Feature-Namen (wichtig für Interpretation!)
        feature_names = list(build_features(pos_data.iloc[0]).keys())

        # Hyperparameter wie im echten Modell
        if pos in ["FWD", "DEF"]:
            model = RandomForestRegressor(
                n_estimators=100,
                max_depth=4,
                min_samples_leaf=3,
                random_state=42,
                n_jobs=-1,
            )
        else:
            model = RandomForestRegressor(
                n_estimators=400,
                max_depth=None,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )

        model.fit(X, y)
        models[pos] = model

        # Feature Importance extrahieren
        importance = model.feature_importances_
        feature_importances[pos] = {
            "feature_names": feature_names,
            "importance": importance.tolist(),
            "n_samples": len(X),
        }

        print(f"✓ {pos}: {len(X)} samples trainiert")

    return models, feature_importances


def compute_weighted_average_importance(feature_importances):
    """
    Berechnet gewichteten Durchschnitt über alle Positionen.
    Gewichtung nach Anzahl Samples.
    """
    # Sammle alle Feature-Namen (sollten gleich sein)
    all_features = None
    total_samples = 0
    weighted_importance = None

    for pos, data in feature_importances.items():
        n = data["n_samples"]
        total_samples += n

        if all_features is None:
            all_features = data["feature_names"]
            weighted_importance = np.zeros(len(all_features))

        # Gewichtet addieren
        importance = np.array(data["importance"])
        weighted_importance += importance * n

    # Normalisieren
    weighted_importance /= total_samples

    # Sortieren nach Importance
    sorted_indices = np.argsort(weighted_importance)[::-1]

    result = []
    for idx in sorted_indices:
        result.append(
            {
                "feature": all_features[idx],
                "importance": float(weighted_importance[idx]),
                "importance_pct": float(weighted_importance[idx] * 100),
            }
        )

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Berechne Feature Importance aus RF-Modellen"
    )
    parser.add_argument(
        "--train-seasons",
        nargs="+",
        default=["2016-17", "2017-18", "2018-19", "2019-20"],
        help="Saisons für Training",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUT_DIR / "analysis" / "feature_importance.json",
        help="Output JSON Datei",
    )

    args = parser.parse_args()

    print(f"Lade Trainingsdaten aus {len(args.train_seasons)} Saisons...")

    # Lade alle Trainingsdaten
    all_data = []
    for season in args.train_seasons:
        data_path = DATA_DIR / f"cleaned_merged_gw_{season}.csv"
        if not data_path.exists():
            print(f"⚠ {data_path} nicht gefunden, überspringe")
            continue

        df = pd.read_csv(data_path)
        all_data.append(df)
        print(f"  ✓ {season}: {len(df):,} Zeilen")

    if not all_data:
        print("❌ Keine Daten gefunden!")
        return 1

    train_df = pd.concat(all_data, ignore_index=True)
    print(f"\nGesamt: {len(train_df):,} Zeilen")

    # Stelle sicher, dass 'position' Spalte existiert
    if "position" not in train_df.columns and "pos" in train_df.columns:
        train_df = train_df.rename(columns={"pos": "position"})

    # Berechne Rolling-Features
    print("\nBerechne Rolling-Features...")
    train_df = compute_rolling_features(train_df, group_cols=["name"], window=3)

    # Trainiere Modelle und extrahiere Feature Importance
    print("\nTrainiere positionsspezifische Modelle...")
    models, feature_importances = train_position_models(
        train_df, positions=["GK", "DEF", "MID", "FWD"]
    )

    # Berechne gewichteten Durchschnitt
    print("\nBerechne gewichtete Feature Importance...")
    avg_importance = compute_weighted_average_importance(feature_importances)

    # Zeige Top 10
    print("\n📊 Top 10 Features:")
    for i, feat in enumerate(avg_importance[:10], 1):
        print(f"  {i}. {feat['feature']:<25} {feat['importance_pct']:>6.2f}%")

    # Speichere Ergebnis
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "train_seasons": args.train_seasons,
        "n_total_samples": int(len(train_df)),
        "positions": {
            pos: {
                "n_samples": data["n_samples"],
                "features": [
                    {
                        "feature": name,
                        "importance": float(imp),
                        "importance_pct": float(imp * 100),
                    }
                    for name, imp in zip(data["feature_names"], data["importance"])
                ],
            }
            for pos, data in feature_importances.items()
        },
        "weighted_average": avg_importance,
    }

    # Erstelle Output-Verzeichnis
    args.output.parent.mkdir(parents=True, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Feature Importance gespeichert nach: {args.output}")

    return 0


if __name__ == "__main__":
    exit(main())
