"""Evaluate prediction accuracy against actual FPL points.

This script loads prediction JSON files, merges them with actual points data,
and computes various evaluation metrics including MAE, RMSE, Spearman correlation,
and calibration analysis.
"""

import argparse
import glob
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats


def load_predictions(pattern: str) -> pd.DataFrame:
    """Load all prediction JSON files matching the pattern.

    Args:
        pattern: Glob pattern for prediction files (e.g., 'out/predictions_gw*.json')

    Returns:
        DataFrame with columns: player_id, gw, pred_points

    Raises:
        FileNotFoundError: If no prediction files are found
        ValueError: If JSON files have unexpected structure
    """
    pred_files = glob.glob(pattern)

    if not pred_files:
        raise FileNotFoundError(
            f"No prediction files found matching pattern: {pattern}"
        )

    print(f"Found {len(pred_files)} prediction file(s)")

    all_predictions = []

    for pred_file in sorted(pred_files):
        try:
            with open(pred_file, "r") as f:
                data = json.load(f)

            # Handle different possible JSON structures
            if isinstance(data, list):
                # Assume list of dicts with player_id, gw, pred_points
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                # Could be nested structure, try to flatten
                if "predictions" in data:
                    df = pd.DataFrame(data["predictions"])
                else:
                    df = pd.DataFrame([data])
            else:
                raise ValueError(f"Unexpected JSON structure in {pred_file}")

            # Validate required columns
            required_cols = {"player_id", "gw", "pred_points"}
            missing_cols = required_cols - set(df.columns)
            if missing_cols:
                raise ValueError(
                    f"Missing required columns in {pred_file}: {missing_cols}"
                )

            all_predictions.append(df[["player_id", "gw", "pred_points"]])
            print(f"  Loaded {len(df)} predictions from {Path(pred_file).name}")

        except json.JSONDecodeError as e:
            print(
                f"Warning: Failed to parse JSON from {pred_file}: {e}", file=sys.stderr
            )
            continue
        except Exception as e:
            print(f"Warning: Error loading {pred_file}: {e}", file=sys.stderr)
            continue

    if not all_predictions:
        raise ValueError("No valid prediction data could be loaded")

    predictions = pd.concat(all_predictions, ignore_index=True)
    print(f"\nTotal predictions loaded: {len(predictions)}")

    return predictions


def load_actuals(data_paths: List[str]) -> pd.DataFrame:
    """Load actual points from merged gameweek CSV files.

    Args:
        data_paths: List of paths to merged_gw CSV files

    Returns:
        DataFrame with columns: player_id, gw, total_points, position, price

    Raises:
        FileNotFoundError: If no data files exist
    """
    all_actuals = []

    for data_path in data_paths:
        path = Path(data_path)
        if not path.exists():
            print(f"Warning: Data file not found: {data_path}", file=sys.stderr)
            continue

        try:
            df = pd.read_csv(data_path)

            # Check for required columns
            # Based on the CSV structure, we need 'element' (player_id), 'GW', 'total_points'
            if "element" not in df.columns:
                print(
                    f"Warning: 'element' column not found in {data_path}",
                    file=sys.stderr,
                )
                continue
            if "GW" not in df.columns:
                print(f"Warning: 'GW' column not found in {data_path}", file=sys.stderr)
                continue
            if "total_points" not in df.columns:
                print(
                    f"Warning: 'total_points' column not found in {data_path}",
                    file=sys.stderr,
                )
                continue

            # Select columns (position and value are optional but useful for baselines)
            cols_to_keep = ["element", "GW", "total_points"]
            new_col_names = ["player_id", "gw", "total_points"]

            if "position" in df.columns:
                cols_to_keep.append("position")
                new_col_names.append("position")

            if "value" in df.columns:
                cols_to_keep.append("value")
                new_col_names.append("price")

            # Rename to standard names
            actuals = df[cols_to_keep].copy()
            actuals.columns = new_col_names

            all_actuals.append(actuals)
            print(f"Loaded {len(actuals)} actual records from {path.name}")

        except Exception as e:
            print(f"Error loading {data_path}: {e}", file=sys.stderr)
            continue

    if not all_actuals:
        raise FileNotFoundError(
            "No valid actual data files could be loaded. "
            f"Tried: {', '.join(data_paths)}"
        )

    actuals = pd.concat(all_actuals, ignore_index=True)
    print(f"Total actual records loaded: {len(actuals)}")

    return actuals


def merge_predictions_actuals(
    predictions: pd.DataFrame, actuals: pd.DataFrame
) -> pd.DataFrame:
    """Merge predictions with actuals on (player_id, gw).

    Args:
        predictions: DataFrame with player_id, gw, pred_points
        actuals: DataFrame with player_id, gw, total_points

    Returns:
        Merged DataFrame with both predictions and actuals, missing values dropped
    """
    merged = predictions.merge(actuals, on=["player_id", "gw"], how="inner")

    # Drop rows with missing values
    initial_len = len(merged)
    merged = merged.dropna(subset=["pred_points", "total_points"])
    dropped = initial_len - len(merged)

    if dropped > 0:
        print(f"\nDropped {dropped} rows with missing values")

    print(f"Final dataset size: {len(merged)} predictions matched with actuals")

    return merged


def compute_metrics(df: pd.DataFrame) -> Dict[str, float]:
    """Compute overall evaluation metrics.

    Args:
        df: DataFrame with pred_points and total_points columns

    Returns:
        Dictionary with MAE, RMSE, and Spearman correlation
    """
    # Ensure we operate on numeric numpy arrays to avoid ExtensionArray issues
    y_true = pd.to_numeric(df["total_points"], errors="coerce").to_numpy(dtype=float)
    y_pred = pd.to_numeric(df["pred_points"], errors="coerce").to_numpy(dtype=float)

    # Remove pairs where either side is NaN
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    n_samples = int(mask.sum())
    if n_samples == 0:
        return {
            "mae": float("nan"),
            "rmse": float("nan"),
            "spearman_correlation": float("nan"),
            "spearman_pvalue": float("nan"),
            "n_samples": 0,
        }

    y_true = y_true[mask]
    y_pred = y_pred[mask]

    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    # Spearman correlation (handle edge case of constant values)
    try:
        if len(np.unique(y_true)) > 1 and len(np.unique(y_pred)) > 1:
            res = stats.spearmanr(y_true, y_pred)

            # scipy.stats.spearmanr may return an object with attributes or a tuple-like result.
            # Prefer attribute access, fall back to sequence access, and ensure any array-like
            # or sequence is converted to a scalar float safely.
            def _to_scalar(x):
                if x is None:
                    return float("nan")
                # Handle numpy arrays, lists or tuples by taking the first element if present
                if isinstance(x, (list, tuple, np.ndarray)):
                    try:
                        return float(x[0])
                    except Exception:
                        return float("nan")
                try:
                    return float(x)
                except Exception:
                    return float("nan")

            corr = getattr(res, "correlation", None)
            pval = getattr(res, "pvalue", None)

            if corr is None or pval is None:
                # fallback to sequence-like access
                try:
                    seq_corr = res[0]
                    seq_pval = res[1]
                except Exception:
                    seq_corr = seq_pval = float("nan")
                corr = corr if corr is not None else seq_corr
                pval = pval if pval is not None else seq_pval

            spearman_corr = _to_scalar(corr)
            spearman_p = _to_scalar(pval)
        else:
            spearman_corr, spearman_p = float("nan"), float("nan")
    except Exception:
        spearman_corr, spearman_p = float("nan"), float("nan")

    return {
        "mae": mae,
        "rmse": rmse,
        "spearman_correlation": spearman_corr,
        "spearman_pvalue": spearman_p,
        "n_samples": n_samples,
    }


def compute_per_gw_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Compute metrics separately for each gameweek.

    Args:
        df: DataFrame with pred_points, total_points, and gw columns

    Returns:
        DataFrame with one row per gameweek containing metrics
    """
    gw_metrics = []

    def _to_scalar(x):
        if x is None:
            return float("nan")
        if isinstance(x, (list, tuple, np.ndarray)):
            try:
                return float(x[0])
            except Exception:
                return float("nan")
        try:
            return float(x)
        except Exception:
            return float("nan")

    for gw in sorted(df["gw"].unique()):
        gw_df = df[df["gw"] == gw]

        # Convert to numeric numpy arrays and drop NaNs
        y_true = pd.to_numeric(gw_df["total_points"], errors="coerce").to_numpy(
            dtype=float
        )
        y_pred = pd.to_numeric(gw_df["pred_points"], errors="coerce").to_numpy(
            dtype=float
        )
        mask = ~np.isnan(y_true) & ~np.isnan(y_pred)

        if mask.sum() == 0:
            mae = float("nan")
            rmse = float("nan")
            spearman_corr = float("nan")
            n_samples = 0
        else:
            y_true = y_true[mask]
            y_pred = y_pred[mask]
            mae = float(np.mean(np.abs(y_true - y_pred)))
            rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

            # Spearman correlation (handle edge case of constant values)
            try:
                if len(np.unique(y_true)) > 1 and len(np.unique(y_pred)) > 1:
                    res = stats.spearmanr(y_true, y_pred)
                    corr = getattr(res, "correlation", None)
                    if corr is None:
                        try:
                            corr = res[0]
                        except Exception:
                            corr = float("nan")
                    spearman_corr = _to_scalar(corr)
                else:
                    spearman_corr = float("nan")
            except Exception:
                spearman_corr = float("nan")
            n_samples = int(mask.sum())

        gw_metrics.append(
            {
                "gw": int(gw),
                "n_samples": n_samples,
                "mae": float(mae),
                "rmse": float(rmse),
                "spearman_correlation": float(spearman_corr),
            }
        )

    return pd.DataFrame(gw_metrics)


def compute_calibration(df: pd.DataFrame, n_bins: int = 10) -> pd.DataFrame:
    """Compute calibration table using equal-frequency binning.

    Args:
        df: DataFrame with pred_points and total_points columns
        n_bins: Number of bins for calibration analysis

    Returns:
        DataFrame with bin_mean_pred, bin_mean_actual, count for each bin
    """
    # Use qcut for equal-frequency binning
    df = df.copy()

    try:
        df["bin"] = pd.qcut(
            df["pred_points"], q=n_bins, labels=False, duplicates="drop"
        )
    except ValueError as e:
        # If we can't create n_bins, try with fewer
        print(f"Warning: Could not create {n_bins} bins, trying with fewer: {e}")
        df["bin"] = pd.qcut(
            df["pred_points"],
            q=min(n_bins, len(df) // 10),
            labels=False,
            duplicates="drop",
        )

    calibration = (
        df.groupby("bin")
        .agg(
            {
                "pred_points": ["mean", "min", "max"],
                "total_points": "mean",
                "player_id": "count",
            }
        )
        .reset_index()
    )

    # Flatten column names
    calibration.columns = [
        "bin",
        "bin_mean_pred",
        "bin_min_pred",
        "bin_max_pred",
        "bin_mean_actual",
        "count",
    ]

    calibration["bin"] = calibration["bin"].astype(int)

    return calibration


def build_rolling_mean_baseline(actuals: pd.DataFrame, window: int = 3) -> pd.DataFrame:
    """Build rolling mean baseline: predict based on last N gameweeks' actual points.

    Args:
        actuals: DataFrame with player_id, gw, total_points
        window: Number of previous gameweeks to average (default: 3)

    Returns:
        DataFrame with player_id, gw, baseline_rolling columns
    """
    # Sort by player and gameweek
    actuals_sorted = actuals.sort_values(["player_id", "gw"]).copy()

    # For each player, compute rolling mean of previous gameweeks
    baselines = []

    for player_id in actuals_sorted["player_id"].unique():
        player_data = actuals_sorted[actuals_sorted["player_id"] == player_id].copy()
        player_data = player_data.sort_values("gw")

        # Compute rolling mean of previous points (shift by 1 to avoid lookahead)
        player_data["baseline_rolling"] = (
            player_data["total_points"]
            .shift(1)
            .rolling(window=window, min_periods=1)
            .mean()
        )

        baselines.append(player_data[["player_id", "gw", "baseline_rolling"]])

    baseline_df = pd.concat(baselines, ignore_index=True)
    return baseline_df


def build_price_baseline(actuals: pd.DataFrame, train_gws: List[int]) -> pd.DataFrame:
    """Build price-based baseline: predict points = k * price, fit k per position.

    Args:
        actuals: DataFrame with player_id, gw, total_points, position, price
        train_gws: List of gameweeks to use for training (fitting k)

    Returns:
        DataFrame with player_id, gw, baseline_price columns
    """
    if "position" not in actuals.columns or "price" not in actuals.columns:
        print("Warning: position or price column missing, price baseline will be NaN")
        result = actuals[["player_id", "gw"]].copy()
        result["baseline_price"] = np.nan
        return result

    # Fit k per position on training data
    train_data = actuals[actuals["gw"].isin(train_gws)].copy()

    # Handle missing or zero prices
    train_data = train_data[train_data["price"] > 0].copy()

    position_k = {}
    for pos in train_data["position"].unique():
        pos_data = train_data[train_data["position"] == pos]
        if len(pos_data) > 0:
            # Simple linear regression: points = k * price
            # k = mean(points / price)
            k = (pos_data["total_points"] / pos_data["price"]).mean()
            position_k[pos] = k
        else:
            position_k[pos] = 0.0

    # Apply k to all data
    result = actuals[["player_id", "gw", "position", "price"]].copy()
    result["baseline_price"] = result.apply(
        lambda row: (
            position_k.get(row["position"], 0.0) * row["price"]
            if row["price"] > 0
            else 0.0
        ),
        axis=1,
    )

    return result[["player_id", "gw", "baseline_price"]]


def compute_significance_tests(
    merged: pd.DataFrame, baseline_col: str, model_col: str = "pred_points"
) -> Dict:
    """Compute paired statistical tests comparing model vs baseline.

    Args:
        merged: DataFrame with total_points, model predictions, and baseline predictions
        baseline_col: Name of baseline prediction column
        model_col: Name of model prediction column (default: 'pred_points')

    Returns:
        Dictionary with test results and effect sizes
    """
    # Filter to rows where both predictions are available
    valid = merged.dropna(subset=["total_points", model_col, baseline_col])

    if len(valid) == 0:
        return {
            "n_samples": 0,
            "baseline_name": baseline_col,
            "model_mae": np.nan,
            "baseline_mae": np.nan,
            "mae_improvement": np.nan,
            "paired_t_test_pvalue": np.nan,
            "wilcoxon_pvalue": np.nan,
            "cohens_d": np.nan,
        }

    y_true = valid["total_points"].values
    y_model = valid[model_col].values
    y_baseline = valid[baseline_col].values

    # Compute absolute errors
    ae_model = np.abs(y_true - y_model)  # type: ignore
    ae_baseline = np.abs(y_true - y_baseline)  # type: ignore

    # Compute MAE for both
    mae_model = float(np.mean(ae_model))
    mae_baseline = float(np.mean(ae_baseline))
    mae_improvement = mae_baseline - mae_model

    # Paired differences (positive = model is better)
    diff = ae_baseline - ae_model

    # Paired t-test
    try:
        t_result = stats.ttest_rel(ae_baseline, ae_model)
        # Handle both tuple and result object returns
        if hasattr(t_result, "pvalue"):
            t_pval = float(t_result.pvalue)
        else:
            t_pval = float(t_result[1])
    except Exception:
        t_pval = np.nan

    # Wilcoxon signed-rank test
    try:
        # Remove zeros for Wilcoxon (ties)
        diff_nonzero = diff[diff != 0]
        if len(diff_nonzero) > 0:
            w_result = stats.wilcoxon(diff_nonzero)
            # Handle both tuple and result object returns
            if hasattr(w_result, "pvalue"):
                w_pval = float(w_result.pvalue)  # type: ignore
            else:
                w_pval = float(w_result[1])  # type: ignore
        else:
            w_pval = np.nan
    except Exception:
        w_pval = np.nan

    # Cohen's d effect size
    try:
        mean_diff = np.mean(diff)
        std_diff = np.std(diff, ddof=1)
        cohens_d = mean_diff / std_diff if std_diff > 0 else 0.0
        cohens_d = float(cohens_d)
    except Exception:
        cohens_d = np.nan

    return {
        "n_samples": int(len(valid)),
        "baseline_name": baseline_col,
        "model_mae": mae_model,
        "baseline_mae": mae_baseline,
        "mae_improvement": float(mae_improvement),
        "paired_t_test_pvalue": t_pval,
        "wilcoxon_pvalue": w_pval,
        "cohens_d": cohens_d,
    }


def print_summary(
    overall_metrics: Dict[str, float],
    per_gw_metrics: pd.DataFrame,
    calibration: pd.DataFrame,
    significance: Optional[Dict] = None,
) -> None:
    """Print a compact summary of evaluation results.

    Args:
        overall_metrics: Dictionary of overall metrics
        per_gw_metrics: DataFrame of per-gameweek metrics
        calibration: DataFrame of calibration results
        significance: Dictionary of significance test results (optional)
    """
    print("\n" + "=" * 70)
    print("PREDICTION EVALUATION SUMMARY")
    print("=" * 70)

    print("\n--- Overall Metrics ---")
    print(f"Samples:              {overall_metrics['n_samples']:,}")
    print(f"MAE:                  {overall_metrics['mae']:.3f}")
    print(f"RMSE:                 {overall_metrics['rmse']:.3f}")
    print(f"Spearman Correlation: {overall_metrics['spearman_correlation']:.3f}")
    print(f"Spearman p-value:     {overall_metrics['spearman_pvalue']:.3e}")

    print("\n--- Per-Gameweek Summary ---")
    print(f"Gameweeks evaluated:  {len(per_gw_metrics)}")
    print(
        f"MAE range:            {per_gw_metrics['mae'].min():.3f} - {per_gw_metrics['mae'].max():.3f}"
    )
    print(
        f"RMSE range:           {per_gw_metrics['rmse'].min():.3f} - {per_gw_metrics['rmse'].max():.3f}"
    )
    print(f"Mean Spearman corr:   {per_gw_metrics['spearman_correlation'].mean():.3f}")

    print("\n--- Calibration Table (10 bins) ---")
    print(calibration.to_string(index=False, float_format=lambda x: f"{x:.2f}"))

    # Print significance tests if available
    if significance:
        print("\n--- Baseline Comparisons & Significance Tests ---")
        for baseline_name, results in significance.items():
            if results["n_samples"] == 0:
                print(f"\n{baseline_name}: No overlapping samples")
                continue

            print(f"\n{baseline_name}:")
            print(f"  Samples:              {results['n_samples']:,}")
            print(f"  Model MAE:            {results['model_mae']:.3f}")
            print(f"  Baseline MAE:         {results['baseline_mae']:.3f}")
            print(f"  MAE Improvement:      {results['mae_improvement']:.3f}")
            print(f"  Paired t-test p-val:  {results['paired_t_test_pvalue']:.4f}")
            print(f"  Wilcoxon p-value:     {results['wilcoxon_pvalue']:.4f}")
            print(f"  Cohen's d:            {results['cohens_d']:.3f}")

    print("\n" + "=" * 70)


def save_results(
    overall_metrics: Dict[str, float],
    per_gw_metrics: pd.DataFrame,
    calibration: pd.DataFrame,
    output_dir: str = "out",
    significance: Optional[Dict] = None,
) -> None:
    """Save evaluation results to files.

    Args:
        overall_metrics: Dictionary of overall metrics
        per_gw_metrics: DataFrame of per-gameweek metrics
        calibration: DataFrame of calibration results
        output_dir: Directory to save results
        significance: Dictionary of significance test results (optional)
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Combine overall and per-GW metrics
    metrics_output = {
        "overall": overall_metrics,
        "per_gameweek": per_gw_metrics.to_dict(orient="records"),
    }

    # Add significance tests if available
    if significance:
        metrics_output["significance"] = significance

    # Save metrics as JSON
    metrics_file = output_path / "metrics_predictions.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"\nSaved metrics to: {metrics_file}")

    # Save calibration as CSV
    calibration_file = output_path / "calibration_predictions.csv"
    calibration.to_csv(calibration_file, index=False, float_format="%.4f")
    print(f"Saved calibration to: {calibration_file}")


def main():
    """Main entry point for the evaluation script."""
    parser = argparse.ArgumentParser(
        description="Evaluate FPL prediction accuracy against actual points",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  python code/evaluate_predictions.py
  python code/evaluate_predictions.py --predictions "out/predictions_gw*.json"
  python code/evaluate_predictions.py --data-22-23 "data/merged_gw_2022-23.csv"
        """,
    )

    parser.add_argument(
        "--predictions",
        type=str,
        default="out/predictions_gw*.json",
        help="Glob pattern for prediction JSON files (default: out/predictions_gw*.json)",
    )

    parser.add_argument(
        "--data-22-23",
        type=str,
        default="data/merged_gw_2022-23.csv",
        help="Path to 2022-23 actual data CSV (default: data/merged_gw_2022-23.csv)",
    )

    parser.add_argument(
        "--data-23-24",
        type=str,
        default="data/merged_gw_2023-24.csv",
        help="Path to 2023-24 actual data CSV (default: data/merged_gw_2023-24.csv)",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="out",
        help="Output directory for results (default: out)",
    )

    parser.add_argument(
        "--n-bins",
        type=int,
        default=10,
        help="Number of bins for calibration analysis (default: 10)",
    )

    args = parser.parse_args()

    try:
        # Load predictions
        print("=" * 70)
        print("Loading prediction files...")
        print("=" * 70)
        predictions = load_predictions(args.predictions)

        # Load actuals
        print("\n" + "=" * 70)
        print("Loading actual data files...")
        print("=" * 70)
        data_paths = [args.data_22_23, args.data_23_24]
        actuals = load_actuals(data_paths)

        # Merge
        print("\n" + "=" * 70)
        print("Merging predictions with actuals...")
        print("=" * 70)
        merged = merge_predictions_actuals(predictions, actuals)

        if len(merged) == 0:
            print("\nError: No matching records found between predictions and actuals")
            print("Please check that player_id and gw values match between files")
            sys.exit(1)

        # Compute metrics
        print("\n" + "=" * 70)
        print("Computing evaluation metrics...")
        print("=" * 70)
        overall_metrics = compute_metrics(merged)
        per_gw_metrics = compute_per_gw_metrics(merged)
        calibration = compute_calibration(merged, n_bins=args.n_bins)

        # Build baselines and compute significance tests
        print("\n" + "=" * 70)
        print("Building baselines and computing significance tests...")
        print("=" * 70)

        significance_results = {}

        # 1. Rolling mean baseline (last 3 gameweeks)
        print("Building rolling mean baseline (window=3)...")
        rolling_baseline = build_rolling_mean_baseline(actuals, window=3)
        merged_rolling = merged.merge(
            rolling_baseline, on=["player_id", "gw"], how="left"
        )

        sig_rolling = compute_significance_tests(
            merged_rolling, baseline_col="baseline_rolling", model_col="pred_points"
        )
        significance_results["rolling_mean_3gw"] = sig_rolling
        print(
            f"  Rolling mean baseline: {sig_rolling['n_samples']} overlapping samples"
        )

        # 2. Price-based baseline (fit on training fold)
        # Use all unique GWs in merged data as training (simple approach)
        # In a more sophisticated setup, you'd use a proper train/test split
        all_gws = sorted(actuals["gw"].unique())

        # Use first 75% of GWs for training k coefficients
        n_train = max(1, int(len(all_gws) * 0.75))
        train_gws = all_gws[:n_train]

        print(
            f"Building price baseline (training on {len(train_gws)} GWs: {min(train_gws)}-{max(train_gws)})..."
        )
        price_baseline = build_price_baseline(actuals, train_gws=train_gws)
        merged_price = merged.merge(price_baseline, on=["player_id", "gw"], how="left")

        sig_price = compute_significance_tests(
            merged_price, baseline_col="baseline_price", model_col="pred_points"
        )
        significance_results["price_based"] = sig_price
        print(f"  Price baseline: {sig_price['n_samples']} overlapping samples")

        # Print and save results
        print_summary(
            overall_metrics, per_gw_metrics, calibration, significance_results
        )
        save_results(
            overall_metrics,
            per_gw_metrics,
            calibration,
            args.output_dir,
            significance_results,
        )

        print("\n✓ Evaluation completed successfully!")

    except FileNotFoundError as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
