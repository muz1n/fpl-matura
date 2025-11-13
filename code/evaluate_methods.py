#!/usr/bin/env python3
"""Evaluate and compare different prediction methods.

Compares RF, MA3, and POS prediction methods against actual FPL points.
Generates comparison table and visualization.

Usage:
    python evaluate_methods.py --season 2023-24 --gw_start 30 --gw_end 38 \\
        --compare rf ma3 pos --metrics mae,rmse,spearman
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from numpy.typing import ArrayLike
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
import matplotlib.pyplot as plt
import seaborn as sns

# Import make_predictions functions
import sys

sys.path.insert(0, str(Path(__file__).parent))
from make_predictions import load_and_prepare_data, train_model, generate_predictions

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_actual_points(season: str, gw: int) -> pd.DataFrame:
    """Load actual points for a specific gameweek.

    Args:
        season: Season identifier
        gw: Gameweek number

    Returns:
        DataFrame with player_id, gw, actual_points
    """
    # Lade historische GW-Daten
    possible_files = [
        DATA_DIR / f"merged_gw_{season}.csv",
        DATA_DIR / "merged_gw_2022-23.csv",
        DATA_DIR / "merged_gw_2024-25.csv",
    ]

    df = None
    for csv_path in possible_files:
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            break

    if df is None:
        raise FileNotFoundError(f"No data file found for season {season}")

    # Standardisiere Spalten
    rename_map = {
        "element": "player_id",
        "id": "player_id",
        "round": "gw",
        "event": "gw",
        "GW": "gw",
        "total_points": "actual_points",
        "points": "actual_points",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Filtere auf spezifische GW
    if "gw" in df.columns:
        df = df[df["gw"] == gw]

    if "player_id" not in df.columns or "actual_points" not in df.columns:
        raise ValueError("Missing required columns in data file")

    # Aggregiere falls es Duplikate gibt (z.B. mehrere Fixtures pro GW)
    result = df.groupby("player_id")["actual_points"].sum().reset_index()

    return result


def calculate_metrics(predictions: ArrayLike, actuals: ArrayLike) -> Dict[str, float]:
    """Calculate evaluation metrics.

    Args:
        predictions: Predicted values (array-like)
        actuals: Actual values (array-like)

    Returns:
        Dictionary with metric names and values
    """
    predictions = np.asarray(predictions, dtype=float)
    actuals = np.asarray(actuals, dtype=float)

    # Filter out NaN values
    mask = ~(np.isnan(predictions) | np.isnan(actuals))
    predictions = predictions[mask]
    actuals = actuals[mask]

    if predictions.size == 0:
        return {"mae": np.nan, "rmse": np.nan, "spearman": np.nan}

    mae = mean_absolute_error(actuals, predictions)
    rmse = np.sqrt(mean_squared_error(actuals, predictions))

    # Spearman correlation
    if predictions.size > 1:
        res = spearmanr(predictions, actuals)
        # scipy.stats.spearmanr may return (corr, pvalue) or an object with .correlation
        if isinstance(res, tuple):
            spearman_corr = res[0]
        else:
            spearman_corr = getattr(res, "correlation", np.nan)
        # Ensure spearman_corr is a scalar numeric value before converting to float
        if isinstance(spearman_corr, (int, float, np.floating)):
            spearman_value = float(spearman_corr)
        else:
            try:
                # Try to extract numeric value from array-like or other types (e.g., 0-d numpy)
                spearman_value = float(np.asarray(spearman_corr).item())
            except Exception:
                spearman_value = np.nan
    else:
        spearman_value = np.nan

    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "spearman": float(spearman_value) if not np.isnan(spearman_value) else np.nan,
    }


def apply_ma3_method(predictions_data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply MA3 method to predictions.

    Currently just returns the same data as we don't have historical
    data for MA3 in the current setup. In a real scenario, this would
    calculate 3-game moving average.
    """
    # For now, just use RF predictions as baseline
    # In reality, you'd calculate MA3 from historical data
    result = predictions_data.copy()
    result["model_version"] = result["model_version"] + "+ma3"
    return result


def apply_pos_method(predictions_data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply position-based average method."""
    result = predictions_data.copy()

    # Calculate average by position
    players = result["players"]
    by_pos = {}
    for player in players:
        pos = player["pos"]
        if pos not in by_pos:
            by_pos[pos] = []
        by_pos[pos].append(player["predicted_points"])

    # Calculate averages
    pos_avg = {pos: np.mean(points) for pos, points in by_pos.items()}

    # Replace predictions with position averages
    for player in players:
        player["predicted_points"] = pos_avg[player["pos"]]

    result["model_version"] = result["model_version"] + "+pos"
    return result


def evaluate_method(
    method: str, season: str, gw_start: int, gw_end: int, skip_generation: bool = False
) -> pd.DataFrame:
    """Evaluate a single method across gameweeks.

    Args:
        method: Method name (rf, ma3, pos)
        season: Season identifier
        gw_start: First gameweek
        gw_end: Last gameweek
        skip_generation: If True, load existing predictions instead of generating

    Returns:
        DataFrame with player_id, gw, predicted_points, actual_points
    """
    all_results = []

    print(f"\n{'='*60}")
    print(f"Evaluating method: {method.upper()}")
    print(f"{'='*60}")

    # Load and prepare training data once
    df, features = load_and_prepare_data(season)
    max_gw = int(df["gw"].max())
    test_gw_start = max(df["gw"].min(), max_gw - 7)

    # Train model once
    model = train_model(df, features, test_gw_start)

    for gw in range(gw_start, gw_end + 1):
        print(f"\nProcessing GW {gw}...")

        # Check if predictions already exist
        pred_file = OUT_DIR / f"predictions_gw{gw}.json"

        if skip_generation and pred_file.exists():
            print(f"  Loading existing predictions from {pred_file}")
            with open(pred_file, "r") as f:
                predictions_data = json.load(f)
        else:
            # Generate predictions
            print("  Generating predictions...")
            predictions_data = generate_predictions(model, features, season, gw, "rf")

            # Save for later use
            with open(pred_file, "w") as f:
                json.dump(predictions_data, f, indent=4)

        # Apply method transformation
        if method == "ma3":
            predictions_data = apply_ma3_method(predictions_data)
        elif method == "pos":
            predictions_data = apply_pos_method(predictions_data)
        # rf stays as is

        # Load actual points
        try:
            actuals = load_actual_points(season, gw)
        except Exception as e:
            print(f"  Warning: Could not load actuals for GW {gw}: {e}")
            continue

        # Merge predictions with actuals
        pred_df = pd.DataFrame(predictions_data["players"])
        merged = pred_df.merge(actuals, on="player_id", how="inner")

        if len(merged) == 0:
            print(f"  Warning: No matching players for GW {gw}")
            continue

        merged["gw"] = gw
        merged["method"] = method
        all_results.append(
            merged[["player_id", "gw", "method", "predicted_points", "actual_points"]]
        )

        print(f"  Matched {len(merged)} players")

    if not all_results:
        print(f"  No results found for {method}")
        return pd.DataFrame()

    return pd.concat(all_results, ignore_index=True)


def create_comparison_table(
    results_df: pd.DataFrame, metrics: List[str]
) -> pd.DataFrame:
    """Create comparison table across methods.

    Args:
        results_df: DataFrame with all results
        metrics: List of metric names to calculate

    Returns:
        DataFrame with methods as rows and metrics as columns
    """
    comparison = []

    for method in results_df["method"].unique():
        method_data = results_df[results_df["method"] == method]

        predictions = method_data["predicted_points"].values
        actuals = method_data["actual_points"].values

        metrics_dict = calculate_metrics(predictions, actuals)
        metrics_dict["method"] = method
        metrics_dict["n_predictions"] = len(predictions)

        comparison.append(metrics_dict)

    comparison_df = pd.DataFrame(comparison)

    # Reorder columns
    cols = ["method", "n_predictions"] + [
        m for m in metrics if m in comparison_df.columns
    ]
    comparison_df = comparison_df[cols]

    return comparison_df


def plot_comparison(comparison_df: pd.DataFrame, output_path: Path):
    """Create visualization of method comparison.

    Args:
        comparison_df: Comparison table
        output_path: Path to save plot
    """
    # Set style
    sns.set_style("whitegrid")

    # Create figure with subplots
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    methods = comparison_df["method"].values
    colors = sns.color_palette("husl", len(methods))

    # MAE
    axes[0].bar(methods, comparison_df["mae"], color=colors)
    axes[0].set_title("Mean Absolute Error (MAE)", fontsize=12, fontweight="bold")
    axes[0].set_ylabel("MAE")
    axes[0].axhline(y=2.0, color="r", linestyle="--", label="Target (MAE < 2)")
    axes[0].legend()

    # RMSE
    axes[1].bar(methods, comparison_df["rmse"], color=colors)
    axes[1].set_title("Root Mean Squared Error (RMSE)", fontsize=12, fontweight="bold")
    axes[1].set_ylabel("RMSE")

    # Spearman
    axes[2].bar(methods, comparison_df["spearman"], color=colors)
    axes[2].set_title("Spearman Correlation", fontsize=12, fontweight="bold")
    axes[2].set_ylabel("Correlation")
    axes[2].set_ylim(-1, 1)
    axes[2].axhline(y=0, color="gray", linestyle="-", linewidth=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    print(f"\n✓ Visualization saved to: {output_path}")
    plt.close()


def main():
    parser = argparse.ArgumentParser(description="Evaluate prediction methods")
    parser.add_argument(
        "--season", type=str, required=True, help="Season (e.g., 2023-24)"
    )
    parser.add_argument("--gw_start", type=int, required=True, help="First gameweek")
    parser.add_argument("--gw_end", type=int, required=True, help="Last gameweek")
    parser.add_argument(
        "--compare",
        type=str,
        nargs="+",
        default=["rf", "ma3", "pos"],
        help="Methods to compare",
    )
    parser.add_argument(
        "--metrics",
        type=str,
        default="mae,rmse,spearman",
        help="Comma-separated list of metrics",
    )
    parser.add_argument(
        "--skip-generation",
        action="store_true",
        help="Skip prediction generation, use existing files",
    )

    args = parser.parse_args()

    metrics = [m.strip().lower() for m in args.metrics.split(",")]

    print(f"\n{'='*70}")
    print("FPL Prediction Method Evaluation")
    print(f"{'='*70}")
    print(f"Season: {args.season}")
    print(f"Gameweeks: {args.gw_start} - {args.gw_end}")
    print(f"Methods: {', '.join(args.compare)}")
    print(f"Metrics: {', '.join(metrics)}")
    print(f"{'='*70}")

    # Evaluate each method
    all_results = []
    for method in args.compare:
        method_results = evaluate_method(
            method, args.season, args.gw_start, args.gw_end, args.skip_generation
        )
        if not method_results.empty:
            all_results.append(method_results)

    if not all_results:
        print("\n❌ No results to compare")
        return

    # Combine all results
    results_df = pd.concat(all_results, ignore_index=True)

    # Create comparison table
    comparison_df = create_comparison_table(results_df, metrics)

    # Print results
    print(f"\n{'='*70}")
    print("COMPARISON RESULTS")
    print(f"{'='*70}\n")
    print(comparison_df.to_string(index=False))
    print(f"\n{'='*70}")

    # Check hypothesis
    min_mae = comparison_df["mae"].min()
    if min_mae < 2.0:
        print(f"\n✅ HYPOTHESIS TEIL 1: MAE < 2 erfüllt! (Best MAE: {min_mae:.3f})")
    else:
        print(f"\n❌ HYPOTHESIS TEIL 1: MAE >= 2 (Best MAE: {min_mae:.3f})")

    # Save results
    csv_path = (
        OUT_DIR
        / f"method_comparison_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.csv"
    )
    comparison_df.to_csv(csv_path, index=False)
    print(f"\n✓ Results saved to: {csv_path}")

    # Create visualization
    png_path = (
        OUT_DIR
        / f"method_comparison_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.png"
    )
    plot_comparison(comparison_df, png_path)

    # Save detailed results
    detailed_path = (
        OUT_DIR
        / f"detailed_results_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.csv"
    )
    results_df.to_csv(detailed_path, index=False)
    print(f"✓ Detailed results saved to: {detailed_path}")


if __name__ == "__main__":
    main()
