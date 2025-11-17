#!/usr/bin/env python3
"""
rf_pos_tuning_mid.py

Lightweight hyperparameter tuning for MID position RandomForestRegressor.
Reduces grid size to speed up experimentation.

Usage:
    python code/rf_pos_tuning_mid.py --season 2022-23 --start_gw 30 --end_gw 38

Notes:
- Reuses feature engineering from rf_pos_models.py (compute_rolling_features, build_features).
- Focuses ONLY on MID players.
- Does NOT write any trained model to disk; outputs metrics to console only.
"""

import argparse
import warnings
from pathlib import Path
from itertools import product

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr

# Reuse helpers for identical feature logic
from rf_pos_models import compute_rolling_features, build_features

warnings.filterwarnings("ignore")


# -------------------------------------------------------------------------
# Metrics
# -------------------------------------------------------------------------
def evaluate_predictions(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    spearman = 0.0
    if len(y_true) > 1:
        res = spearmanr(y_true, y_pred)
        corr = None
        if hasattr(res, "correlation"):
            corr = getattr(res, "correlation", None)
        elif isinstance(res, (tuple, list)):
            corr = res[0] if len(res) > 0 else None
        else:
            try:
                corr = float(res)
            except Exception:
                corr = None
        if corr is None or (isinstance(corr, (float, np.floating)) and np.isnan(corr)):
            spearman = 0.0
        else:
            try:
                spearman = float(np.asarray(corr, dtype=float).tolist())
            except Exception:
                spearman = 0.0
    return {"mae": mae, "rmse": rmse, "spearman": spearman}


# -------------------------------------------------------------------------
# Training
# -------------------------------------------------------------------------
def train_mid_model(
    train_df,
    n_estimators=100,
    max_depth=None,
    min_samples_leaf=1,
    min_samples_split=2,
    random_state=42,
):
    mid_data = train_df[train_df["position"] == "MID"].copy()
    if len(mid_data) == 0:
        return None
    X_list, y_list = [], []
    for _, row in mid_data.iterrows():
        feats = build_features(row)
        X_list.append(list(feats.values()))
        y_list.append(row["total_points"])
    X = np.array(X_list)
    y = np.array(y_list)
    model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_leaf=min_samples_leaf,
        min_samples_split=min_samples_split,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X, y)
    return model


# -------------------------------------------------------------------------
# Prediction
# -------------------------------------------------------------------------
def predict_mid(model, test_df):
    mid_data = test_df[test_df["position"] == "MID"].copy()
    if model is None or len(mid_data) == 0:
        return [], []
    y_true, y_pred = [], []
    for _, row in mid_data.iterrows():
        feats = build_features(row)
        X = np.array([list(feats.values())])
        pred = model.predict(X)[0]
        y_pred.append(max(0.0, pred))
        y_true.append(row["total_points"])
    return y_true, y_pred


# -------------------------------------------------------------------------
# Grid search
# -------------------------------------------------------------------------
def run_grid_search(train_df, test_df, param_grid):
    param_names = list(param_grid.keys())
    param_values = [param_grid[k] for k in param_names]
    combos = list(product(*param_values))
    total = len(combos)
    print(f"\nTesting {total} parameter combinations...\n")
    results = []
    for i, combo in enumerate(combos, 1):
        params = dict(zip(param_names, combo))
        model = train_mid_model(
            train_df,
            n_estimators=100,
            max_depth=params["max_depth"],
            min_samples_leaf=params["min_samples_leaf"],
            min_samples_split=params["min_samples_split"],
            random_state=42,
        )
        y_true, y_pred = predict_mid(model, test_df)
        if len(y_pred) == 0:
            print(
                f"[{i}/{total}] SKIP (no test data) max_depth={params['max_depth']} min_leaf={params['min_samples_leaf']} min_split={params['min_samples_split']}"
            )
            continue
        metrics = evaluate_predictions(y_true, y_pred)
        print(
            f"[{i}/{total}] max_depth={params['max_depth']} min_leaf={params['min_samples_leaf']} min_split={params['min_samples_split']} -> MAE={metrics['mae']:.4f} RMSE={metrics['rmse']:.4f} Spearman={metrics['spearman']:.4f}"
        )
        results.append(
            {
                "max_depth": params["max_depth"],
                "min_samples_leaf": params["min_samples_leaf"],
                "min_samples_split": params["min_samples_split"],
                "mae": metrics["mae"],
                "rmse": metrics["rmse"],
                "spearman": metrics["spearman"],
                "n_predictions": len(y_pred),
            }
        )
    return results


# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Lightweight tuning for MID RF model")
    parser.add_argument(
        "--season", type=str, required=True, help="Season label (e.g. 2022-23)"
    )
    parser.add_argument(
        "--start_gw", type=int, required=True, help="Start GW for test set"
    )
    parser.add_argument("--end_gw", type=int, required=True, help="End GW for test set")
    parser.add_argument(
        "--train_gw_min", type=int, default=1, help="Earliest GW used for training"
    )
    args = parser.parse_args()

    season = args.season
    start_gw = args.start_gw
    end_gw = args.end_gw
    train_gw_min = args.train_gw_min

    data_path = Path("data") / f"merged_gw_{season}.csv"
    if not data_path.exists():
        print(f"Error: {data_path} not found")
        return

    df = pd.read_csv(data_path)
    # Season column may or may not exist; filter only if present
    if "season" in df.columns:
        df = df[df["season"] == season].copy()

    if "position" not in df.columns:
        print("Error: 'position' column missing")
        return

    print("Computing rolling features...")
    df = compute_rolling_features(df, group_cols=["name"], window=3)

    train_df = df[(df["GW"] >= train_gw_min) & (df["GW"] < start_gw)].copy()
    test_df = df[(df["GW"] >= start_gw) & (df["GW"] <= end_gw)].copy()

    mid_train = len(train_df[train_df["position"] == "MID"])
    mid_test = len(test_df[test_df["position"] == "MID"])
    print("\nData split:")
    print(
        f"  Train GW {train_gw_min}-{start_gw-1}: rows={len(train_df)} MID_rows={mid_train}"
    )
    print(f"  Test  GW {start_gw}-{end_gw}: rows={len(test_df)} MID_rows={mid_test}")

    if mid_train == 0 or mid_test == 0:
        print("Insufficient MID data for training or testing.")
        return

    param_grid = {
        "max_depth": [4, 8, None],
        "min_samples_leaf": [1, 3],
        "min_samples_split": [2],
    }
    print("\nGrid:")
    for k, v in param_grid.items():
        print(f"  {k}: {v}")

    results = run_grid_search(train_df, test_df, param_grid)
    if not results:
        print("No results produced.")
        return

    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values(
        by=["spearman", "mae"], ascending=[False, True]
    ).reset_index(drop=True)

    print("\nSorted results (Spearman desc, MAE asc):")
    print(
        f"{'Rank':<5} {'max_depth':<10} {'min_leaf':<9} {'min_split':<10} {'MAE':<8} {'RMSE':<8} {'Spearman':<9} {'n':<5}"
    )
    print("-" * 80)
    # Use itertuples to get native-like attributes and avoid passing pandas/Hashable objects to int()
    for rank, row in enumerate(results_df.itertuples(index=False), start=1):
        depth_str = str(row.max_depth)
        print(
            f"{rank:<5} {depth_str:<10} {int(np.asarray(row.min_samples_leaf).item()):<9} {int(np.asarray(row.min_samples_split).item()):<10} {float(np.asarray(row.mae).item()):<8.4f} {float(np.asarray(row.rmse).item()):<8.4f} {float(np.asarray(row.spearman).item()):<9.4f} {int(np.asarray(row.n_predictions).item()):<5}"
        )

    # Convert best row to plain Python types via to_dict() before printing
    best = results_df.iloc[0].to_dict()
    print("\nBEST CONFIGURATION (Spearman primary, MAE tie-breaker):")
    print(f"  max_depth:        {best['max_depth']}")
    print(f"  min_samples_leaf: {int(best['min_samples_leaf'])}")
    print(f"  min_samples_split:{int(best['min_samples_split'])}")
    print("  Metrics:")
    print(f"    Spearman: {float(best['spearman']):.4f}")
    print(f"    MAE:      {float(best['mae']):.4f}")
    print(f"    RMSE:     {float(best['rmse']):.4f}")
    print(f"    n_pred:   {int(best['n_predictions'])}")


if __name__ == "__main__":
    main()
