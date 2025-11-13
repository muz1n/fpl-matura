#!/usr/bin/env python3
"""Generate predictions for a specific gameweek.

This script trains a Random Forest model (or uses other methods) and generates
predictions in JSON format that can be consumed by the frontend.

Usage:
    python make_predictions.py --season 2023-24 --gw 38 --method rf
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PredictionMethod = Literal["rf", "ma3", "pos"]


def load_and_prepare_data(season: str) -> tuple[pd.DataFrame, list[str]]:
    """Load historical gameweek data and prepare features.

    Args:
        season: Season identifier (e.g., "2023-24")

    Returns:
        Tuple of (DataFrame with features, list of feature columns)
    """
    # Versuche verschiedene Dateinamen
    possible_files = [
        DATA_DIR / f"merged_gw_{season}.csv",
        DATA_DIR / "merged_gw_2022-23.csv",  # Fallback für Training
        DATA_DIR / "merged_gw_2024-25.csv",
    ]

    df = None
    for csv_path in possible_files:
        if csv_path.exists():
            print(f"Loading data from: {csv_path}")
            df = pd.read_csv(csv_path)
            break

    if df is None:
        raise FileNotFoundError(
            f"Could not find data file for season {season}. Tried: {possible_files}"
        )

    # Standardisiere Spaltennamen
    rename_map = {
        "element": "player_id",
        "id": "player_id",
        "round": "gw",
        "event": "gw",
        "total_points": "points",
        "now_cost": "price",
        "value": "price",
        "selected_by_percent": "selected",
    }

    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Konvertiere zu numerisch
    numeric_cols = [
        "points",
        "minutes",
        "price",
        "selected",
        "influence",
        "creativity",
        "threat",
        "ict_index",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Preis normalisieren (falls in 10er-Schritten)
    if "price" in df.columns:
        median_price = df["price"].dropna().median()
        if median_price > 25:
            df["price"] = df["price"] / 10.0

    # Sortiere nach Spieler und GW
    df = df.sort_values(["player_id", "gw"])

    # Target: Punkte der nächsten Spielwoche
    df["target_next"] = df.groupby("player_id")["points"].shift(-1)

    # Rolling Features (aus Vergangenheit, ohne Leak)
    roll_cols = ["points", "minutes", "influence", "creativity", "threat", "ict_index"]
    roll_cols = [c for c in roll_cols if c in df.columns]

    for col in roll_cols:
        df[f"{col}_r3"] = (
            df.groupby("player_id")[col].shift(1).rolling(3, min_periods=1).mean()
        )

    # Points per 90 minutes
    if "points_r3" in df.columns and "minutes_r3" in df.columns:
        df["points_per90_r3"] = (
            df["points_r3"] / df["minutes_r3"].replace(0, np.nan) * 90
        )

    # Feature-Liste
    feature_candidates = [
        "price",
        "selected",
        "influence_r3",
        "creativity_r3",
        "threat_r3",
        "ict_index_r3",
        "minutes_r3",
        "points_per90_r3",
    ]

    features = [f for f in feature_candidates if f in df.columns]

    return df, features


def train_model(
    df: pd.DataFrame, features: list[str], test_gw_start: int
) -> RandomForestRegressor:
    """Train Random Forest model on historical data.

    Args:
        df: DataFrame with features and target
        features: List of feature column names
        test_gw_start: GW to start test set (for validation)

    Returns:
        Trained RandomForestRegressor model
    """
    # Split in Train/Test für Validierung
    train_df = df[(df["gw"] < test_gw_start) & df["target_next"].notna()].copy()
    test_df = df[(df["gw"] >= test_gw_start) & df["target_next"].notna()].copy()

    X_train = train_df[features].fillna(0.0)
    y_train = train_df["target_next"]

    X_test = test_df[features].fillna(0.0)
    y_test = test_df["target_next"]

    # Convert to numpy arrays to avoid pandas ExtensionArray typing issues
    X_train = X_train.to_numpy(dtype=float)
    y_train = y_train.to_numpy(dtype=float)
    X_test = X_test.to_numpy(dtype=float)
    y_test = y_test.to_numpy(dtype=float)

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")

    # Trainiere Modell
    model = RandomForestRegressor(
        n_estimators=400,
        max_depth=None,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    # Validierung
    if len(X_test) > 0:
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        print(f"Validation MAE: {mae:.3f}")

    return model


def generate_predictions(
    model: RandomForestRegressor,
    features: list[str],
    season: str,
    gw: int,
    method: PredictionMethod = "rf",
) -> dict:
    """Generate predictions for a specific gameweek.

    Args:
        model: Trained model
        features: List of feature names
        season: Season identifier
        gw: Gameweek number
        method: Prediction method to use

    Returns:
        Dictionary with predictions in frontend schema format
    """
    # Lade aktuelle Spielerdaten
    current_data_files = [
        DATA_DIR / f"cleaned_players_{season}_team.csv",
        DATA_DIR / "cleaned_players_2025-26_team.csv",
    ]

    current_df = None
    for csv_path in current_data_files:
        if csv_path.exists():
            print(f"Loading current player data from: {csv_path}")
            current_df = pd.read_csv(csv_path)
            break

    if current_df is None:
        # Fallback: verwende letzte GW aus historischen Daten
        print("No current player data found, using mock data")
        current_df = create_mock_player_data()

    # Standardisiere Spalten
    rename_map = {
        "id": "player_id",
        "now_cost": "price",
        "selected_by_percent": "selected",
        "web_name": "name",
        "element_type": "element_type_id",
    }
    current_df = current_df.rename(
        columns={k: v for k, v in rename_map.items() if k in current_df.columns}
    )

    # Team: bevorzuge team_short, sonst team_name
    if "team_short" in current_df.columns:
        current_df["team"] = current_df["team_short"]
    elif "team_name" in current_df.columns:
        current_df["team"] = current_df["team_name"]

    # Position aus element_type_id ableiten falls nötig
    if "pos" not in current_df.columns and "position" in current_df.columns:
        current_df["pos"] = current_df["position"]
    elif "pos" not in current_df.columns and "element_type_id" in current_df.columns:
        # FPL element_type: 1=GK, 2=DEF, 3=MID, 4=FWD
        pos_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        current_df["pos"] = current_df["element_type_id"].map(pos_map).fillna("MID")

    # Preis normalisieren (falls noch nicht geschehen)
    if "price" in current_df.columns:
        median_price = current_df["price"].dropna().median()
        if median_price > 25:
            current_df["price"] = current_df["price"] / 10.0

    # Erstelle Feature-Matrix
    for feat in features:
        if feat not in current_df.columns:
            # Feature fehlt - mit 0 oder Durchschnitt auffüllen
            if feat.endswith("_r3"):
                # Rolling features - verwende aktuelle Werte falls vorhanden
                base_col = feat.replace("_r3", "")
                if base_col in current_df.columns:
                    current_df[feat] = current_df[base_col]
                else:
                    current_df[feat] = 0.0
            else:
                current_df[feat] = 0.0

    X = current_df[features].fillna(0.0)
    predictions = model.predict(X)

    # Erstelle Output-Struktur
    players = []
    for i, (idx, row) in enumerate(current_df.iterrows()):
        player = {
            "player_id": int(row.get("player_id", i + 1)),
            "name": str(row.get("name", f"Player {i + 1}")),
            "team": str(row.get("team", "UNK")),
            "pos": str(row.get("pos", "MID")),
            "predicted_points": round(float(predictions[i]), 2),
            "minutes_exp": int(row.get("minutes_r3", row.get("minutes", 90))),
            "opponent": str(row.get("opponent", "TBD")),
            "is_home": bool(row.get("is_home", True)),
            "opp_strength": round(float(row.get("opp_strength", 3.0)), 2),
            "price": round(float(row.get("price", 5.0)), 1),
        }
        players.append(player)

    # Sortiere nach predicted_points
    players.sort(key=lambda p: p["predicted_points"], reverse=True)

    result = {
        "season": season,
        "gw": gw,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "model_version": f"rf_baseline_{method}",
        "players": players,
    }

    return result


def create_mock_player_data() -> pd.DataFrame:
    """Create mock player data for testing purposes."""
    # Einfache Mock-Daten
    return pd.DataFrame(
        {
            "player_id": range(1, 101),
            "name": [f"Player {i}" for i in range(1, 101)],
            "team": ["MCI", "LIV", "ARS", "CHE"] * 25,
            "pos": ["GK"] * 10 + ["DEF"] * 30 + ["MID"] * 40 + ["FWD"] * 20,
            "price": np.random.uniform(4.0, 13.0, 100),
            "selected": np.random.uniform(0.5, 25.0, 100),
            "minutes_r3": np.random.uniform(60, 90, 100),
            "points_r3": np.random.uniform(2, 8, 100),
            "opponent": ["WHU"] * 100,
            "is_home": [True] * 100,
            "opp_strength": [3.0] * 100,
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Generate FPL predictions")
    parser.add_argument(
        "--season", type=str, required=True, help="Season (e.g., 2023-24)"
    )
    parser.add_argument("--gw", type=int, required=True, help="Gameweek number")
    parser.add_argument(
        "--method",
        type=str,
        default="rf",
        choices=["rf", "ma3", "pos"],
        help="Prediction method",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=OUT_DIR,
        help="Output directory for predictions",
    )

    args = parser.parse_args()

    print(
        f"Generating predictions for Season {args.season}, GW {args.gw}, Method: {args.method}"
    )

    # Lade und bereite Daten vor
    df, features = load_and_prepare_data(args.season)
    print(f"Features: {', '.join(features)}")

    # Trainiere Modell
    max_gw = int(df["gw"].max())
    test_gw_start = max(df["gw"].min(), max_gw - 7)
    model = train_model(df, features, test_gw_start)

    # Generiere Predictions
    predictions = generate_predictions(
        model, features, args.season, args.gw, args.method
    )

    # Schreibe Output
    output_file = args.output_dir / f"predictions_gw{args.gw}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(predictions, f, indent=4, ensure_ascii=False)

    print(f"\n✓ Predictions written to: {output_file}")
    print(f"  Total players: {len(predictions['players'])}")
    print("  Top 5 predictions:")
    for i, player in enumerate(predictions["players"][:5], 1):
        print(
            f"    {i}. {player['name']} ({player['pos']}) - {player['predicted_points']} pts"
        )


if __name__ == "__main__":
    main()
