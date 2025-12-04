#!/usr/bin/env python3
"""
Berechnet Feature Importance aus trainierten RF-Modellen.

Nutzt existierende Vorhersage-JSONs (die Position-Daten enthalten).
Trainiert positionsspezifische RF-Modelle und extrahiert Feature-Wichtigkeiten.
"""
import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Hyperparameter aus maturaarbeit.typ
POSITION_PARAMS = {
    "GK": {"n_estimators": 400, "max_depth": None, "random_state": 42},
    "DEF": {"n_estimators": 100, "max_depth": 4, "random_state": 42},
    "MID": {"n_estimators": 400, "max_depth": None, "random_state": 42},
    "FWD": {"n_estimators": 100, "max_depth": 4, "random_state": 42},
}


def main():
    ROOT = Path(__file__).resolve().parents[2]

    # Lade Vorhersage-Daten (enthalten bereits Positionen)
    season = "2020-21"
    start_gw = 2
    end_gw = 29

    print(f"Lade RF-Vorhersagen für {season} GW{start_gw}-{end_gw}...")

    all_data = []
    for gw in range(start_gw, end_gw + 1):
        pred_file = (
            ROOT / "out" / "predictions" / f"predictions_{season}_gw{gw}_rf.json"
        )

        if not pred_file.exists():
            continue

        with open(pred_file) as f:
            data = json.load(f)

        players = data if isinstance(data, list) else data.get("players", [])
        df_gw = pd.DataFrame(players)
        df_gw["GW"] = gw
        all_data.append(df_gw)

    if not all_data:
        print("❌ Keine Vorhersage-Daten gefunden!")
        return

    df = pd.concat(all_data, ignore_index=True)
    print(f"✓ {len(df)} Spieler-Vorhersagen geladen")

    # Position-Spalte normalisieren
    if "position" not in df.columns:
        if "pos" in df.columns:
            df["position"] = df["pos"]
        else:
            print("❌ Keine Position-Spalte gefunden!")
            return

    # Prüfe verfügbare Features
    # RF-Vorhersagen enthalten leider keine MA3-Features, nur finale Werte
    # Wir müssen die Predictions vom tatsächlichen Training-Prozess nehmen

    print("\n⚠ Hinweis: Vorhersage-JSONs enthalten keine Feature-Daten!")
    print("Die Feature Importance muss aus dem Training-Prozess extrahiert werden.")
    print("\nAlternative: Lade tatsächliche Trainings-Daten mit Positionen...")

    # Lade Ground-Truth Daten mit Positionen
    # Trick: Nutze die erste Vorhersage-JSON um Position-Mapping zu erstellen
    pred_file = (
        ROOT / "out" / "predictions" / f"predictions_{season}_gw{start_gw}_rf.json"
    )
    with open(pred_file) as f:
        pred_data = json.load(f)

    players_list = (
        pred_data if isinstance(pred_data, list) else pred_data.get("players", [])
    )

    # Erstelle Mapping: player_id -> position
    player_pos_map = {}
    for p in players_list:
        pid = p.get("player_id") or p.get("element")
        pos = p.get("pos") or p.get("position")
        if pid and pos:
            player_pos_map[pid] = pos

    print(f"✓ Position-Mapping für {len(player_pos_map)} Spieler erstellt")

    # Lade merged_gw Daten und füge Positionen hinzu
    data_file = ROOT / "data" / f"merged_gw_{season}.csv"
    if not data_file.exists():
        print(f"❌ Datei nicht gefunden: {data_file}")
        return

    df_hist = pd.read_csv(data_file)
    print(f"✓ {len(df_hist)} historische Zeilen geladen")

    # Füge Positionen aus Mapping hinzu
    if "element" in df_hist.columns:
        df_hist["position"] = df_hist["element"].map(player_pos_map)
    elif "player_id" in df_hist.columns:
        df_hist["position"] = df_hist["player_id"].map(player_pos_map)
    else:
        print("❌ Keine player_id/element Spalte gefunden!")
        return

    # Entferne Zeilen ohne Position
    df_hist = df_hist[df_hist["position"].notna()].copy()
    print(f"✓ {len(df_hist)} Zeilen nach Position-Filter")

    # Berechne Rolling Features
    print("\nBerechne Rolling Features...")
    df_hist = df_hist.sort_values(["name", "GW"]).copy()

    feature_cols = [
        "minutes",
        "points",  # merged_gw hat "points" statt "total_points"
        "ict_index",
        "influence",
        "creativity",
        "threat",
    ]
    available = [c for c in feature_cols if c in df_hist.columns]

    for col in available:
        shifted = df_hist.groupby("name")[col].shift(1)
        rolled = shifted.rolling(window=3, min_periods=1).mean()
        df_hist[f"{col}_ma3"] = rolled.fillna(0)

    # Filter auf Training-Gameweeks
    train_df = df_hist[(df_hist["GW"] >= start_gw) & (df_hist["GW"] < end_gw)].copy()
    print(f"✓ {len(train_df)} Training-Zeilen (GW{start_gw}-{end_gw-1})")

    # Trainiere Modelle pro Position
    models = {}
    feature_importances = {}
    position_counts = {}

    positions = train_df["position"].value_counts().to_dict()
    print(f"\nPositionen: {positions}")

    ma3_features = [f"{c}_ma3" for c in available]

    for pos in ["GK", "DEF", "MID", "FWD"]:
        pos_data = train_df[train_df["position"] == pos].copy()

        if len(pos_data) < 50:
            print(f"\n⚠ {pos}: Nur {len(pos_data)} Zeilen, überspringe")
            continue

        # Features: nur MA3
        X = pos_data[ma3_features].fillna(0)
        y = pos_data["points"].fillna(0)  # merged_gw hat "points" statt "total_points"

        print(f"\n{pos}: {len(pos_data)} Zeilen, {X.shape[1]} Features")

        # Train RF
        params = POSITION_PARAMS[pos]
        rf = RandomForestRegressor(**params)
        rf.fit(X, y)

        models[pos] = rf
        feature_importances[pos] = dict(zip(X.columns, rf.feature_importances_))
        position_counts[pos] = len(pos_data)

        # Top 3 Features
        top_features = sorted(
            feature_importances[pos].items(), key=lambda x: x[1], reverse=True
        )[:3]
        for feat, imp in top_features:
            print(f"  {feat}: {imp:.1%}")

    if not models:
        print("\n❌ Keine Modelle trainiert!")
        return

    # Gewichteter Durchschnitt über alle Positionen
    total_samples = sum(position_counts.values())
    weighted_importance = {}

    # Sammle alle Feature-Namen
    all_features = set()
    for pos_imp in feature_importances.values():
        all_features.update(pos_imp.keys())

    for feat in all_features:
        weighted_sum = 0.0
        for pos, count in position_counts.items():
            imp = feature_importances[pos].get(feat, 0.0)
            weighted_sum += imp * (count / total_samples)
        weighted_importance[feat] = weighted_sum

    # Sortiere nach Wichtigkeit
    sorted_features = sorted(
        weighted_importance.items(), key=lambda x: x[1], reverse=True
    )

    print("\n" + "=" * 60)
    print("Gewichtete Feature Importance (über alle Positionen):")
    print("=" * 60)
    for feat, imp in sorted_features:
        print(f"{feat:25s}: {imp:6.1%}")

    # Speichere Ergebnis
    out_dir = ROOT / "out" / "analysis"
    out_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "season": season,
        "gw_range": f"{start_gw}-{end_gw-1}",
        "total_samples": total_samples,
        "position_counts": position_counts,
        "weighted_importance": {k: round(v, 4) for k, v in sorted_features},
        "by_position": {
            pos: {
                k: round(v, 4)
                for k, v in sorted(imp.items(), key=lambda x: x[1], reverse=True)
            }
            for pos, imp in feature_importances.items()
        },
    }

    out_file = out_dir / "feature_importance.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Ergebnisse gespeichert: {out_file}")
    print(f"\nTop 3 Features:")
    for feat, imp in sorted_features[:3]:
        print(f"  {feat}: {imp:.1%}")


if __name__ == "__main__":
    main()
