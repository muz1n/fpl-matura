"""A/B evaluation of opponent-strength features.

Runs the same time-based train/test split twice per GW:
  - run_a: without ['home_flag','opp_def_xga_l5_adj']
  - run_b: with these features

Trains a simple RandomForestRegressor on a compact feature set and reports MAE
per GW and overall. Saves results to CSV and a plot ab_mae_per_gw.png.
"""

from __future__ import annotations

import argparse
import importlib.util
import pathlib
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


def _load_module(path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(path.stem, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _prepare_base_features(df: pd.DataFrame) -> pd.DataFrame:
    # Rolling per player over past 3 matches, shifted by 1 (no leakage)
    out = df.copy()
    out = (
        out.sort_values(["player_id", "gw"])
        if "player_id" in out.columns
        else out.sort_values(["gw"])
    )
    group_key = "player_id" if "player_id" in out.columns else None
    if group_key:
        for col in ["points", "minutes"]:
            if col in out.columns:
                out[f"{col}_r3"] = (
                    out.groupby(group_key)[col]
                    .shift(1)
                    .rolling(3, min_periods=1)
                    .mean()
                )
        if {"points_r3", "minutes_r3"}.issubset(out.columns):
            out["tp_per90_r3"] = (
                out["points_r3"] / out["minutes_r3"].replace(0, np.nan) * 90.0
            )
    return out


def _features_for(df: pd.DataFrame, with_opp: bool) -> Tuple[pd.DataFrame, List[str]]:
    # Candidate base features
    base_candidates = [
        "price",
        "ownership",
        "points_r3",
        "minutes_r3",
        "tp_per90_r3",
    ]
    feats = [c for c in base_candidates if c in df.columns]
    if with_opp:
        # Opponent features if present
        if "home_flag" in df.columns:
            feats.append("home_flag")
        if "opp_def_xga_l5_adj" in df.columns:
            feats.append("opp_def_xga_l5_adj")
    X = df[feats].fillna(0.0)
    return X, feats


def _train_rf(X: pd.DataFrame, y: np.ndarray, random_state: int = 42):
    rf = RandomForestRegressor(
        n_estimators=300,
        min_samples_leaf=2,
        min_samples_split=4,
        random_state=random_state,
        n_jobs=-1,
    )
    rf.fit(X, y)
    return rf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", required=True)
    ap.add_argument("--opp_window", type=int, default=5)
    ap.add_argument("--opp_k", type=int, default=3)
    ap.add_argument("--out_dir", default="out/ab_eval")
    args = ap.parse_args()

    repo = pathlib.Path(__file__).resolve().parent.parent
    data_io = _load_module(repo / "code" / "utils" / "data_io.py")
    def_metrics = _load_module(repo / "code" / "utils" / "def_metrics.py")

    df = data_io.load_player_gameweeks(args.season)
    if df is None or getattr(df, "empty", True):
        print(f"Warning: no data for season {args.season}; exiting with empty outputs")
        outp = pathlib.Path(args.out_dir)
        outp.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(columns=["run", "gw", "mae", "n"]).to_csv(
            outp / "ab_mae.csv", index=False
        )
        return

    # Ensure basic columns exist
    needed = ["gw", "player_id", "points", "team", "opponent", "home_away"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing required columns: {missing}")

    # Prepare rolling base features once
    df_feat = _prepare_base_features(df)

    # Pre-compute opponent team metrics on all historical rows
    try:
        team_metrics = def_metrics.compute_team_def_metrics(
            df_feat, window=args.opp_window, k=args.opp_k
        )
    except Exception as exc:
        print(
            f"Warning: could not compute team metrics: {exc}; proceeding without them"
        )
        team_metrics = pd.DataFrame(
            columns=[
                "team",
                "gw",
                "team_xga_l5_home_adj",
                "team_xga_l5_away_adj",
                "team_xga_l5_all_adj",
            ]
        )

    # We will evaluate last 8 GWs by default (similar to rf_baseline)
    gws = sorted(int(g) for g in pd.unique(df_feat["gw"].dropna()))
    if not gws:
        print("No GWs in data")
        return
    last_gw = gws[-1]
    test_from = max(gws[0], last_gw - 7)

    rows = []
    y_true_all_a, y_pred_all_a = [], []
    y_true_all_b, y_pred_all_b = [], []

    for gw in gws:
        if gw < test_from:
            continue
        train = df_feat[df_feat["gw"] < gw].copy()
        test = df_feat[df_feat["gw"] == gw].copy()
        if train.empty or test.empty:
            continue

        # Attach opponent features to both train and test for run B (train to learn mapping)
        train_b = def_metrics.attach_opponent_features(train, team_metrics)
        test_b = def_metrics.attach_opponent_features(test, team_metrics)
        # Run A (without opponent features)
        Xa, feats_a = _features_for(train, with_opp=False)
        Xtest_a, _ = _features_for(test, with_opp=False)
        ya = train["points"].to_numpy(dtype=float)
        rf_a = _train_rf(Xa, ya)
        pred_a = rf_a.predict(Xtest_a)
        truth = test["points"].to_numpy(dtype=float)
        mae_a = float(np.mean(np.abs(truth - pred_a))) if len(truth) else float("nan")
        rows.append({"run": "A", "gw": gw, "mae": mae_a, "n": int(len(truth))})
        y_true_all_a.append(truth)
        y_pred_all_a.append(pred_a)

        # Run B (with opponent features)
        Xb, feats_b = _features_for(train_b, with_opp=True)
        Xtest_b, _ = _features_for(test_b, with_opp=True)
        yb = train_b["points"].to_numpy(dtype=float)
        rf_b = _train_rf(Xb, yb)
        pred_b = rf_b.predict(Xtest_b)
        truth_b = test_b["points"].to_numpy(dtype=float)
        mae_b = (
            float(np.mean(np.abs(truth_b - pred_b))) if len(truth_b) else float("nan")
        )
        rows.append({"run": "B", "gw": gw, "mae": mae_b, "n": int(len(truth_b))})
        y_true_all_b.append(truth_b)
        y_pred_all_b.append(pred_b)

    res = pd.DataFrame(rows)

    # Overall MAE rows
    def _overall(y_true_list, y_pred_list):
        if not y_true_list:
            return float("nan")
        y_true = np.concatenate(y_true_list)
        y_pred = np.concatenate(y_pred_list)
        return float(np.mean(np.abs(y_true - y_pred))) if len(y_true) else float("nan")

    overall_a = _overall(y_true_all_a, y_pred_all_a)
    overall_b = _overall(y_true_all_b, y_pred_all_b)
    res_overall = pd.DataFrame(
        [
            {
                "run": "A",
                "gw": "ALL",
                "mae": overall_a,
                "n": int(sum(len(x) for x in y_true_all_a)),
            },
            {
                "run": "B",
                "gw": "ALL",
                "mae": overall_b,
                "n": int(sum(len(x) for x in y_true_all_b)),
            },
        ]
    )

    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_csv = out_dir / f"ab_mae_{args.season}.csv"
    pd.concat([res, res_overall], ignore_index=True).to_csv(out_csv, index=False)

    # Plot per-GW MAE
    try:
        import matplotlib.pyplot as plt

        pivot = res.pivot(index="gw", columns="run", values="mae").sort_index()
        fig = plt.figure()
        ax = plt.gca()
        if not pivot.empty:
            pivot.plot(ax=ax, marker="o")
        ax.set_xlabel("GW")
        ax.set_ylabel("MAE")
        ax.set_title("A/B: Opponent-Strength Features")
        ax.grid(True, linestyle=":", linewidth=0.5)
        fig.tight_layout()
        fig_path = out_dir / "ab_mae_per_gw.png"
        fig.savefig(fig_path, bbox_inches="tight")
    except Exception as exc:
        print(f"Plotting failed: {exc}")

    print(f"Saved A/B results to {out_csv}")


if __name__ == "__main__":
    main()
