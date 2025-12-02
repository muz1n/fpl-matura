"""Einfaches Skript zum Generieren von Feature Importances für die Web-App.

Nutzt die gleiche Logik wie make_predictions.py.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Füge code/ zum Python-Pfad hinzu
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "code"))

from models.make_predictions import build_rolling_features


def generate_feature_importance(season: str, output_dir: Path):
    """Generiert Feature Importance JSON für eine Saison."""

    data_dir = ROOT / "data"
    cleaned_csv = data_dir / f"cleaned_merged_gw_{season}.csv"

    if not cleaned_csv.exists():
        print(f"❌ Datei nicht gefunden: {cleaned_csv}")
        return False

    print(f"📊 Lade Daten für {season}...")
    df = pd.read_csv(cleaned_csv)

    # Verwende gleiche Feature-Engineering wie make_predictions
    print("⚙️  Bereite Features vor...")
    df_feats = build_rolling_features(df)

    # Gleiche Feature-Liste wie in make_predictions
    feature_candidates = [
        "price",
        "minutes_r3",
        "points_r3",
        "points_per90_r3",
        "ict_index_r3",
        "influence_r3",
        "creativity_r3",
        "threat_r3",
        "home",
        "opp_strength",
    ]
    features = [c for c in feature_candidates if c in df_feats.columns]

    # Training: Nur Zeilen mit Punkten (wie in rf-Modus)
    train_df = df_feats[df_feats["points"].notna()].copy()

    if len(train_df) == 0:
        print("❌ Keine Trainingsdaten nach Filterung verfügbar!")
        return False

    X_train = train_df[features].fillna(0.0).to_numpy(dtype=float)
    y_train = train_df["points"].to_numpy(dtype=float)

    # Trainiere Random Forest (gleiche Parameter wie make_predictions)
    print("🌲 Trainiere Random Forest...")
    rf = RandomForestRegressor(
        n_estimators=300, max_depth=None, min_samples_leaf=2, random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # Extrahiere Feature Importances
    importances = rf.feature_importances_

    # Sortiere Features nach Wichtigkeit
    indices = np.argsort(importances)[::-1]

    # Berechne normalisierte und kumulative Werte
    total_importance = importances.sum()
    cumulative = 0.0
    feature_list = []

    for rank, idx in enumerate(indices, 1):
        imp = float(importances[idx])
        norm = imp / total_importance if total_importance > 0 else 0
        cumulative += norm

        feature_list.append(
            {
                "feature": features[idx],
                "importance": round(imp, 6),
                "normalized": round(norm, 6),
                "cumulative": round(cumulative, 6),
                "rank": rank,
            }
        )

    # Erstelle Output JSON
    result = {
        "season": season,
        "method": "rf",
        "n_features": len(feature_list),
        "generated_at": datetime.now().isoformat()[:10],
        "features": feature_list,
    }

    # Speichere als rf_<season>.json (wie von API erwartet)
    output_file = output_dir / f"rf_{season}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ Feature Importances gespeichert: {output_file}")
    print("   Top 5 Features:")
    for feat in feature_list[:5]:
        print(f"   {feat['rank']}. {feat['feature']:30s} {feat['importance']:.4f}")

    return True


def main():
    """Generiert Feature Importances für alle Saisons."""

    seasons = ["2020-21", "2021-22", "2022-23", "2023-24"]
    output_dir = ROOT / "out"
    output_dir.mkdir(exist_ok=True, parents=True)

    print("=" * 60)
    print("Feature Importance Generierung für alle Saisons")
    print("=" * 60)
    print()

    success_count = 0
    for season in seasons:
        print(f"\n{'─' * 60}")
        print(f"Saison: {season}")
        print(f"{'─' * 60}")

        if generate_feature_importance(season, output_dir):
            success_count += 1
        print()

    print("=" * 60)
    print(f"Fertig! {success_count}/{len(seasons)} Saisons erfolgreich.")
    print("=" * 60)


if __name__ == "__main__":
    main()
