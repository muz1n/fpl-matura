#!/usr/bin/env python3
"""
Schnelle Feature Importance Berechnung (nur 1 Saison für Speed)
"""

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
    feats = {}
    for col in [
        "minutes_ma3",
        "total_points_ma3",
        "ict_index_ma3",
        "influence_ma3",
        "creativity_ma3",
        "threat_ma3",
    ]:
        val = row.get(col, 0.0)
        feats[col] = 0.0 if pd.isna(val) else float(val)

    feats["home"] = 1.0 if row.get("was_home", False) else 0.0
    opp = row.get("opponent_strength", None)
    feats["opponent_strength"] = 3.0 if opp is None or pd.isna(opp) else float(opp)
    feats["minutes_x_ict"] = feats["minutes_ma3"] * feats["ict_index_ma3"]
    return feats


def main():
    print("Lade Trainingsdaten (nur 2019-20 für Geschwindigkeit)...")

    path = DATA_DIR / "cleaned_merged_gw_2019-20.csv"
    df = pd.read_csv(path)
    print(f"✓ Geladen: {len(df):,} Zeilen")

    # Position Spalte normalisieren
    if "pos" in df.columns and "position" not in df.columns:
        df["position"] = df["pos"]

    if "position" not in df.columns:
        print("❌ Keine position/pos Spalte gefunden!")
        print(f"Verfügbare Spalten: {df.columns.tolist()}")
        return

    print(
        f"✓ Positionen gefunden: {df['position'].value_counts().to_dict()}"
    )  # Rolling Features
    print("\nBerechne Rolling-Features...")
    for col in [
        "minutes",
        "total_points",
        "ict_index",
        "influence",
        "creativity",
        "threat",
    ]:
        if col in df.columns:
            df_sorted = df.sort_values(["name", "GW"]).copy()
            shifted = df_sorted.groupby(["name"])[col].shift(1)
            df[f"{col}_ma3"] = shifted.rolling(3, min_periods=1).mean()

    # Trainiere Modelle
    print("\nTrainiere Modelle...")
    positions = ["GK", "DEF", "MID", "FWD"]
    importances = {}

    for pos in positions:
        pos_df = df[df["position"] == pos].copy()
        if len(pos_df) < 100:
            continue

        X_list, y_list = [], []
        for _, row in pos_df.iterrows():
            feats = build_features(row)
            X_list.append(list(feats.values()))
            y_list.append(row.get("total_points", 0.0))

        X, y = np.array(X_list), np.array(y_list)

        # Schnelles Training mit weniger Bäumen
        rf = RandomForestRegressor(
            n_estimators=50,  # Reduziert für Speed
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X, y)

        feature_names = list(build_features(pos_df.iloc[0]).keys())
        importances[pos] = {
            "features": feature_names,
            "importance": rf.feature_importances_.tolist(),
            "n_samples": len(X),
        }
        print(f"  ✓ {pos}: {len(X):,} samples")

    # Gewichteter Durchschnitt
    if not importances:
        print("❌ Keine Modelle trainiert!")
        return

    # Nehme ersten verfügbaren Position für Feature-Namen
    first_pos = list(importances.keys())[0]
    features = importances[first_pos]["features"]

    total = sum(d["n_samples"] for d in importances.values())
    weighted = np.zeros(len(features))

    for data in importances.values():
        weighted += np.array(data["importance"]) * data["n_samples"]
    weighted /= total

    # Sortieren
    sorted_idx = np.argsort(weighted)[::-1]
    result = [
        {
            "feature": features[i],
            "importance": float(weighted[i]),
            "importance_pct": float(weighted[i] * 100),
        }
        for i in sorted_idx
    ]

    print("\n📊 Top 10 Features:")
    for i, f in enumerate(result[:10], 1):
        print(f"  {i}. {f['feature']:<25} {f['importance_pct']:>6.2f}%")

    # Speichern
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "train_season": "2019-20",
        "note": "Basierend auf einer Saison für schnelle Berechnung",
        "weighted_average": result,
        "by_position": importances,
    }

    out_path = OUT_DIR / "analysis" / "feature_importance.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Gespeichert: {out_path}")


if __name__ == "__main__":
    main()
