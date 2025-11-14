#!/usr/bin/env python3
"""
rf_pos_models.py

Train four position-specific RandomForestRegressor models (GK/DEF/MID/FWD) using rolling features.
Evaluate sequentially on test gameweeks without leakage and output predictions + summaries.

Usage:
    python code/rf_pos_models.py --season 2022-23 --start_gw 30 --end_gw 38
"""

import argparse
import json
import os
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr

warnings.filterwarnings("ignore")


# -------------------------------------------------------------------------
# Feature engineering
# -------------------------------------------------------------------------
def compute_rolling_features(df, group_cols=None, window=3):
    """
    Compute rolling features for each player (grouped by name).
    Strictly uses past data (shift(1) before rolling).

    Returns a DataFrame with original columns + rolling features.
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

    # Ensure we have the columns
    available = [c for c in feature_cols if c in df.columns]

    df_sorted = df.sort_values(group_cols + ["GW"]).copy()

    for col in available:
        # Shift by 1 to avoid leakage, then rolling mean
        shifted = df_sorted.groupby(group_cols)[col].shift(1)
        rolled = shifted.rolling(window=window, min_periods=1).mean()
        df_sorted[f"{col}_ma{window}"] = rolled

    return df_sorted


def build_features(row):
    """
    Build feature vector for a single row.
    Returns dict of features with robust defaults.
    """
    feats = {}

    # Rolling features
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

    # Home flag
    feats["home"] = 1.0 if row.get("was_home", False) else 0.0

    # Opponent strength (optional)
    opp_str = row.get("opponent_strength", None)
    if opp_str is not None and not pd.isna(opp_str):
        feats["opponent_strength"] = float(opp_str)
    else:
        feats["opponent_strength"] = 3.0  # neutral default

    # Simple interaction
    feats["minutes_x_ict"] = feats["minutes_ma3"] * feats["ict_index_ma3"]

    return feats


# -------------------------------------------------------------------------
# Model training & prediction
# -------------------------------------------------------------------------
def train_position_models(
    train_df,
    positions=["GK", "DEF", "MID", "FWD"],
    n_estimators=400,
    max_depth=None,
    min_samples_leaf=2,
    random_state=42,
):
    """
    Train one RandomForestRegressor per position on training data.
    Returns dict: {pos: model}
    """
    models = {}

    for pos in positions:
        pos_data = train_df[train_df["position"] == pos].copy()
        if len(pos_data) == 0:
            print(f"Warning: No training data for position {pos}")
            models[pos] = None
            continue

        # Build feature matrix
        X_list = []
        y_list = []

        for idx, row in pos_data.iterrows():
            feats = build_features(row)
            X_list.append(list(feats.values()))
            y_list.append(row["total_points"])

        X = np.array(X_list)
        y = np.array(y_list)

        # Train model
        model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=min_samples_leaf,
            random_state=random_state,
            n_jobs=-1,
        )
        model.fit(X, y)
        models[pos] = model

        print(f"Trained {pos} model on {len(X)} samples")

    return models


def predict_gameweek(models, gw_df):
    """
    Predict total_points for all players in gw_df using position-specific models.
    Returns dict: {player_name: prediction}
    """
    predictions = {}

    for idx, row in gw_df.iterrows():
        pos = row.get("position", None)
        if pos is None or pos not in models or models[pos] is None:
            predictions[row["name"]] = 0.0
            continue

        feats = build_features(row)
        X = np.array([list(feats.values())])
        pred = models[pos].predict(X)[0]
        predictions[row["name"]] = max(0.0, pred)  # non-negative

    return predictions


# -------------------------------------------------------------------------
# Evaluation
# -------------------------------------------------------------------------
def evaluate_predictions(y_true, y_pred):
    """
    Compute MAE, RMSE, Spearman correlation.
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))

    # Spearman
    spearman = 0.0
    if len(y_true) > 1:
        res = spearmanr(y_true, y_pred)
        # spearmanr may return an object with attribute 'correlation', a tuple, or a scalar
        corr = None
        if hasattr(res, "correlation"):
            corr = getattr(res, "correlation", None)
        elif isinstance(res, (tuple, list)):
            corr = res[0] if len(res) > 0 else None
        else:
            # try to coerce to float (res might already be a scalar)
            try:
                corr = float(res)
            except Exception:
                corr = None
        # Only treat None or real-NaN floats as invalid; avoid passing non-scalars to isnan
        if corr is None or (isinstance(corr, (float, np.floating)) and np.isnan(corr)):
            spearman = 0.0
        else:
            # Normalize corr to a plain Python float in a robust way
            try:
                # Coerce via numpy to handle a wide range of numeric-like objects,
                # then convert to a Python float.
                spearman = float(np.asarray(corr, dtype=float).tolist())
            except Exception:
                spearman = 0.0
    else:
        spearman = 0.0

    return {"mae": mae, "rmse": rmse, "spearman": spearman}


# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Train position-specific RF models")
    parser.add_argument(
        "--season", type=str, required=True, help="Season (e.g., 2022-23)"
    )
    parser.add_argument(
        "--start_gw", type=int, required=True, help="Start gameweek for evaluation"
    )
    parser.add_argument(
        "--end_gw", type=int, required=True, help="End gameweek for evaluation"
    )
    parser.add_argument(
        "--train_gw_min", type=int, default=1, help="Min GW for training"
    )
    args = parser.parse_args()

    season = args.season
    start_gw = args.start_gw
    end_gw = args.end_gw
    train_gw_min = args.train_gw_min

    # Load data
    data_path = Path("data") / f"merged_gw_{season}.csv"
    if not data_path.exists():
        print(f"Error: {data_path} not found")
        return

    df = pd.read_csv(data_path)

    # Filter to season (only if season column exists)
    if "season" in df.columns:
        df = df[df["season"] == season].copy()

    # Ensure position column
    if "position" not in df.columns:
        print("Error: 'position' column not found in data")
        return

    # Compute rolling features
    print("Computing rolling features...")
    df = compute_rolling_features(df, group_cols=["name"], window=3)

    # Split train/test
    train_df = df[(df["GW"] >= train_gw_min) & (df["GW"] < start_gw)].copy()
    test_df = df[(df["GW"] >= start_gw) & (df["GW"] <= end_gw)].copy()

    print(f"Training on GW {train_gw_min}-{start_gw-1}: {len(train_df)} rows")
    print(f"Testing on GW {start_gw}-{end_gw}: {len(test_df)} rows")

    if len(train_df) == 0:
        print("Error: No training data")
        return

    # Train models
    print("\nTraining position-specific models...")
    models = train_position_models(train_df, positions=["GK", "DEF", "MID", "FWD"])

    # Evaluate sequentially
    print("\nEvaluating on test gameweeks...")

    all_preds = []
    all_actuals = []
    pos_results = {
        pos: {"y_true": [], "y_pred": []} for pos in ["GK", "DEF", "MID", "FWD"]
    }

    os.makedirs("out", exist_ok=True)

    for gw in range(start_gw, end_gw + 1):
        gw_df = test_df[test_df["GW"] == gw].copy()

        if len(gw_df) == 0:
            print(f"  GW {gw}: No data")
            continue

        # Predict
        predictions = predict_gameweek(models, gw_df)

        # Build prediction JSON (same schema as other predictions)
        pred_list = []
        for name, pred in predictions.items():
            player_row = gw_df[gw_df["name"] == name].iloc[0]
            pred_list.append(
                {
                    "name": name,
                    "team": player_row.get("team", ""),
                    "position": player_row.get("position", ""),
                    "predicted_points": round(pred, 2),
                    "actual_points": float(player_row.get("total_points", 0.0)),
                }
            )

        # Write prediction JSON
        pred_path = Path("out") / f"predictions_gw{gw}_rf_pos.json"
        with open(pred_path, "w") as f:
            json.dump(pred_list, f, indent=2)

        # Collect for overall metrics
        for item in pred_list:
            all_preds.append(item["predicted_points"])
            all_actuals.append(item["actual_points"])

            pos = item["position"]
            if pos in pos_results:
                pos_results[pos]["y_true"].append(item["actual_points"])
                pos_results[pos]["y_pred"].append(item["predicted_points"])

        print(f"  GW {gw}: Predicted {len(predictions)} players -> {pred_path}")

    # Overall metrics
    print("\n" + "=" * 60)
    print("OVERALL METRICS")
    print("=" * 60)

    if len(all_preds) > 0:
        overall_metrics = evaluate_predictions(all_actuals, all_preds)
        print(f"MAE:      {overall_metrics['mae']:.4f}")
        print(f"RMSE:     {overall_metrics['rmse']:.4f}")
        print(f"Spearman: {overall_metrics['spearman']:.4f}")

        # Write overall summary
        summary_path = (
            Path("out") / f"rf_pos_summary_{season}_gw{start_gw}-{end_gw}.csv"
        )
        summary_df = pd.DataFrame(
            [
                {
                    "season": season,
                    "start_gw": start_gw,
                    "end_gw": end_gw,
                    "mae": overall_metrics["mae"],
                    "rmse": overall_metrics["rmse"],
                    "spearman": overall_metrics["spearman"],
                    "n_predictions": len(all_preds),
                }
            ]
        )
        summary_df.to_csv(summary_path, index=False)
        print(f"\nOverall summary written to {summary_path}")

    # Per-position metrics
    print("\n" + "=" * 60)
    print("PER-POSITION METRICS")
    print("=" * 60)

    bypos_rows = []
    for pos in ["GK", "DEF", "MID", "FWD"]:
        y_true = pos_results[pos]["y_true"]
        y_pred = pos_results[pos]["y_pred"]

        if len(y_true) > 0:
            metrics = evaluate_predictions(y_true, y_pred)
            print(
                f"{pos:4s}: MAE={metrics['mae']:6.3f}  RMSE={metrics['rmse']:6.3f}  Spearman={metrics['spearman']:6.3f}  (n={len(y_true)})"
            )

            bypos_rows.append(
                {
                    "position": pos,
                    "mae": metrics["mae"],
                    "rmse": metrics["rmse"],
                    "spearman": metrics["spearman"],
                    "n_predictions": len(y_true),
                }
            )
        else:
            print(f"{pos:4s}: No predictions")

    if bypos_rows:
        bypos_path = Path("out") / f"rf_pos_bypos_{season}_gw{start_gw}-{end_gw}.csv"
        bypos_df = pd.DataFrame(bypos_rows)
        bypos_df.to_csv(bypos_path, index=False)
        print(f"\nPer-position summary written to {bypos_path}")

    print("\nDone!")


if __name__ == "__main__":
    main()
