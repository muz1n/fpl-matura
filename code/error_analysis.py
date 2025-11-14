#!/usr/bin/env python3
"""
Error-/Ranking-Analyse (Residuals, Ausreißer, per Position)

Usage (from repo root):
  python code\\error_analysis.py

Inputs
- Picks latest CSV: out/detailed_results_*.csv
  Expected columns (robust to variations):
    method, gw, player_id, name, pos, team, predicted_points,
    true_points (or total_points), residual (computed if missing)

Outputs (written to out/):
- error_top20_<stamp>.csv
- metrics_by_position_<stamp>.csv
- residuals_plot_<stamp>.png
- calibration_plot_<stamp>.png

Self-contained: stdlib + pandas + numpy + matplotlib (+ scipy if available)
"""

from __future__ import annotations

import os
import sys
import glob
import datetime as dt
from typing import Optional, List

import numpy as np
import pandas as pd

# Use a non-interactive backend to avoid display issues
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

try:
    from scipy import stats as sp_stats  # optional
except Exception:  # pragma: no cover - optional dependency
    sp_stats = None


def log(msg: str) -> None:
    print(f"[error_analysis] {msg}")


def repo_root() -> str:
    # Assume this file lives in <repo>/code/error_analysis.py
    here = os.path.abspath(os.path.dirname(__file__))
    return os.path.abspath(os.path.join(here, os.pardir))


def out_dir_path() -> str:
    path = os.path.join(repo_root(), "out")
    os.makedirs(path, exist_ok=True)
    return path


def find_latest_results_file() -> Optional[str]:
    pattern = os.path.join(out_dir_path(), "detailed_results_*.csv")
    files = glob.glob(pattern)
    if not files:
        return None
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return files[0]


def pick_true_col(df: pd.DataFrame) -> str:
    # Infer the true points column name
    lower_map = {c.lower(): c for c in df.columns}
    for key in ("true_points", "total_points"):
        if key in lower_map:
            return lower_map[key]
    # Fallback: try a best-effort guess
    for key in ("actual_points", "points", "y_true", "actual", "truth"):
        if key in lower_map:
            return lower_map[key]
    raise KeyError(
        "Could not infer true points column (looked for 'true_points' or 'total_points')."
    )


def ensure_numeric(df: pd.DataFrame, cols: List[str]) -> None:
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")


def compute_residuals(df: pd.DataFrame, pred_col: str, true_col: str) -> pd.DataFrame:
    # Standardize column name for downstream use
    if "true_points" not in df.columns:
        df["true_points"] = df[true_col]
    ensure_numeric(df, [pred_col, "true_points"])
    if "residual" not in df.columns:
        df["residual"] = df["true_points"] - df[pred_col]
    ensure_numeric(df, ["residual"])
    return df


def top20_outliers_by_method(df: pd.DataFrame, pred_col: str) -> pd.DataFrame:
    df = df.copy()
    df["abs_residual"] = df["residual"].abs()
    keep_cols = [
        c
        for c in [
            "method",
            "gw",
            "player_id",
            "name",
            "pos",
            "team",
            pred_col,
            "true_points",
            "residual",
            "abs_residual",
        ]
        if c in df.columns
    ]
    out_list = []
    for method, g in df.groupby("method", dropna=False):
        g2 = g.sort_values("abs_residual", ascending=False).head(20)
        out_list.append(g2[keep_cols])
    if not out_list:
        return pd.DataFrame(columns=keep_cols)
    return pd.concat(out_list, axis=0, ignore_index=True)


def group_spearman(x: pd.Series, y: pd.Series) -> float:
    # Drop NA pairs
    xy = pd.concat([x, y], axis=1).dropna()
    if len(xy) < 2:
        return float("nan")
    if sp_stats is not None:
        try:
            r = sp_stats.spearmanr(
                xy.iloc[:, 0].values, xy.iloc[:, 1].values, nan_policy="omit"
            )
            # scipy returns correlation and pvalue; guard against scalar vs object
            corr = getattr(r, "correlation", None)
            return float(corr) if corr is not None else float("nan")
        except Exception:
            pass
    # Fallback to pandas
    try:
        return float(xy.iloc[:, 0].corr(xy.iloc[:, 1], method="spearman"))
    except Exception:
        return float("nan")


def metrics_by_position(df: pd.DataFrame, pred_col: str) -> pd.DataFrame:
    rows = []
    for (method, pos), g in df.groupby(["method", "pos"], dropna=False):
        g = g[[pred_col, "true_points", "residual"]].dropna()
        n = len(g)
        if n == 0:
            mae = rmse = spearman = float("nan")
        else:
            res = g["residual"].to_numpy(dtype=float)
            mae = float(np.mean(np.abs(res)))
            rmse = float(np.sqrt(np.mean(np.square(res))))
            spearman = group_spearman(g[pred_col], g["true_points"])
        rows.append(
            {
                "method": method,
                "pos": pos,
                "n": n,
                "MAE": mae,
                "RMSE": rmse,
                "Spearman": spearman,
            }
        )
    return pd.DataFrame(rows).sort_values(["method", "pos"]).reset_index(drop=True)


def select_methods_for_plots(df: pd.DataFrame, max_methods: int = 3) -> List[str]:
    counts = df["method"].value_counts(dropna=False)
    selected = list(counts.head(max_methods).index)
    return [str(m) for m in selected]


def plot_residuals(
    df: pd.DataFrame, pred_col: str, methods: List[str], out_path: str
) -> None:
    if not methods:
        log("No methods to plot for residuals.")
        return
    ncols = len(methods)
    fig, axes = plt.subplots(1, ncols, figsize=(5 * ncols, 4), squeeze=False)
    axes = axes[0]
    for ax, method in zip(axes, methods):
        g = df[df["method"].astype(str) == method]
        g = g[[pred_col, "residual"]].dropna()
        if len(g) > 5000:
            # subsample to keep the figure lightweight
            g = g.sample(5000, random_state=42)
        ax.scatter(g[pred_col], g["residual"], s=10, alpha=0.35)
        ax.axhline(0.0, color="black", lw=1, ls="--")
        ax.set_title(f"Residuals: {method} (n={len(g)})")
        ax.set_xlabel("predicted_points")
        ax.set_ylabel("residual (true - pred)")
        # Helpful range guards
        try:
            x_min, x_max = np.nanpercentile(g[pred_col], [1, 99])
            y_min, y_max = np.nanpercentile(g["residual"], [1, 99])
            ax.set_xlim(x_min - 0.5, x_max + 0.5)
            ax.set_ylim(y_min - 0.5, y_max + 0.5)
        except Exception:
            pass
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_calibration(
    df: pd.DataFrame, pred_col: str, methods: List[str], out_path: str
) -> None:
    if not methods:
        log("No methods to plot for calibration.")
        return
    fig, ax = plt.subplots(1, 1, figsize=(6, 5))
    for method in methods:
        g = df[df["method"].astype(str) == method][[pred_col, "true_points"]].dropna()
        if len(g) < 2:
            continue
        try:
            # Bin by predicted into deciles within each method
            g = g.copy()
            g["bin"] = pd.qcut(g[pred_col], q=10, labels=False, duplicates="drop")
            agg = (
                g.groupby("bin", dropna=True)
                .agg(
                    mean_pred=(pred_col, "mean"),
                    mean_true=("true_points", "mean"),
                    count=(pred_col, "size"),
                )
                .dropna()
            )
            ax.plot(
                agg["mean_pred"],
                agg["mean_true"],
                marker="o",
                lw=1.5,
                label=f"{method} (n={agg['count'].sum()})",
            )
        except Exception:
            # If qcut fails due to not enough unique values
            continue
    # Perfect calibration guide
    all_vals = df[[pred_col, "true_points"]].dropna()
    if len(all_vals) > 0:
        vmin = float(
            np.nanmin([all_vals[pred_col].min(), all_vals["true_points"].min()])
        )
        vmax = float(
            np.nanmax([all_vals[pred_col].max(), all_vals["true_points"].max()])
        )
        ax.plot([vmin, vmax], [vmin, vmax], color="gray", ls="--", lw=1, label="ideal")
        ax.set_xlim(vmin, vmax)
        ax.set_ylim(vmin, vmax)
    ax.set_xlabel("mean predicted (per decile)")
    ax.set_ylabel("mean true (per decile)")
    ax.set_title("Calibration (decile-binned)")
    ax.legend(loc="best", fontsize=8)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def main(argv: List[str]) -> int:
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = out_dir_path()

    csv_path = find_latest_results_file()
    if not csv_path or not os.path.exists(csv_path):
        log("No input found: expected out/detailed_results_*.csv. Aborting.")
        return 1
    log(f"Using input: {csv_path}")

    df = pd.read_csv(csv_path)
    # Basic required columns check
    required = ["method", "predicted_points"]
    for col in required:
        if col not in df.columns:
            raise KeyError(f"Missing required column '{col}' in {csv_path}")

    # Robustly pick true column and compute residual if needed
    true_col = pick_true_col(df)
    df = compute_residuals(df, pred_col="predicted_points", true_col=true_col)

    # Log basic counts
    n_rows = len(df)
    n_methods = df["method"].nunique(dropna=False)
    log(f"Rows: {n_rows:,} | Methods: {n_methods}")

    # 1) Top-20 outliers per method
    top20_df = top20_outliers_by_method(df, pred_col="predicted_points")
    top20_path = os.path.join(out_dir, f"error_top20_{stamp}.csv")
    top20_df.to_csv(top20_path, index=False)
    log(f"Wrote top-20 outliers per method: {top20_path} (rows={len(top20_df)})")

    # 2) Per-position metrics (MAE, RMSE, Spearman)
    if "pos" not in df.columns:
        log("Column 'pos' missing; synthesizing single 'ALL' position.")
        df["pos"] = "ALL"
    metrics_df = metrics_by_position(df, pred_col="predicted_points")
    metrics_path = os.path.join(out_dir, f"metrics_by_position_{stamp}.csv")
    metrics_df.to_csv(metrics_path, index=False)
    log(f"Wrote per-position metrics: {metrics_path} (rows={len(metrics_df)})")

    # Choose up to 3 methods for plotting to keep figures readable
    sel_methods = select_methods_for_plots(df, max_methods=3)
    log(f"Plotting methods: {sel_methods}")

    # 3) Residuals plot
    resid_plot_path = os.path.join(out_dir, f"residuals_plot_{stamp}.png")
    plot_residuals(
        df, pred_col="predicted_points", methods=sel_methods, out_path=resid_plot_path
    )
    log(f"Wrote residuals plot: {resid_plot_path}")

    # 4) Calibration plot (deciles)
    calib_plot_path = os.path.join(out_dir, f"calibration_plot_{stamp}.png")
    plot_calibration(
        df, pred_col="predicted_points", methods=sel_methods, out_path=calib_plot_path
    )
    log(f"Wrote calibration plot: {calib_plot_path}")

    log("Done.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        log("Interrupted.")
        sys.exit(130)
