#!/usr/bin/env python3
"""Team Backtest: Compare RF vs MA3 vs POS methods via team selection.

Self-contained script with no repo module imports.
Uses only stdlib + pandas + matplotlib.

Usage:
    python code/team_backtest.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List

import matplotlib.pyplot as plt
import pandas as pd

# Setup paths
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Valid FPL formations (DEF-MID-FWD)
VALID_FORMATIONS = ["3-4-3", "3-5-2", "4-4-2", "4-3-3", "4-5-1", "5-4-1", "5-3-2"]

# Formation position requirements
FORMATION_SLOTS = {
    "3-4-3": {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "3-5-2": {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "4-4-2": {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "4-3-3": {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "4-5-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "5-4-1": {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
    "5-3-2": {"GK": 1, "DEF": 5, "MID": 3, "FWD": 2},
}


def load_predictions(gw: int, method: str) -> pd.DataFrame | None:
    """Load predictions from JSON file for a specific gameweek.

    Args:
        gw: Gameweek number
        method: Prediction method (rf, ma3, pos)

    Returns:
        DataFrame with columns [player_id, name, pos, team, predicted_points, price]
        or None if file not found
    """
    pred_file = OUT_DIR / f"predictions_gw{gw}.json"

    if not pred_file.exists():
        logger.warning(f"GW{gw}: Prediction file not found: {pred_file.name}")
        return None

    try:
        with open(pred_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        players = data.get("players", [])
        if not players:
            logger.warning(f"GW{gw}: No players in prediction file")
            return None

        df = pd.DataFrame(players)

        # Ensure required columns exist
        required = ["player_id", "predicted_points", "pos", "team", "price"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            logger.error(f"GW{gw}: Missing columns in predictions: {missing}")
            return None

        # Standardize column names
        if "name" not in df.columns:
            df["name"] = "Unknown"

        logger.info(f"GW{gw} ({method}): Loaded {len(df)} predictions")
        return df[["player_id", "name", "pos", "team", "predicted_points", "price"]]

    except Exception as e:
        logger.error(f"GW{gw}: Error loading predictions: {e}")
        return None


def load_truth(season: str) -> pd.DataFrame | None:
    """Load true points data for a season.

    Args:
        season: Season string (e.g., "2023-24", "2022-23")

    Returns:
        DataFrame with columns [gw, player_id, points] or None if not found
    """
    # Try to find the right file for this season
    possible_files = [
        DATA_DIR / f"merged_gw_{season}.csv",
        DATA_DIR / f"{season}_player_gw.csv",
        DATA_DIR / "merged_gw_2022-23.csv",  # Fallback
        DATA_DIR / "merged_gw_2024-25.csv",  # Another fallback
    ]

    truth_file = None
    for f in possible_files:
        if f.exists():
            truth_file = f
            logger.info(f"Using truth file: {f.name}")
            break

    if truth_file is None:
        logger.error(f"No truth file found for season {season}")
        return None

    try:
        df = pd.read_csv(truth_file)

        # Handle different column name conventions
        rename_map = {}
        if "element" in df.columns and "player_id" not in df.columns:
            rename_map["element"] = "player_id"
        if "GW" in df.columns:
            rename_map["GW"] = "gw"
        elif "round" in df.columns and "gw" not in df.columns:
            rename_map["round"] = "gw"
        if "total_points" in df.columns:
            rename_map["total_points"] = "points"

        if rename_map:
            df = df.rename(columns=rename_map)

        # Ensure required columns
        if "gw" not in df.columns:
            logger.error(
                f"No 'gw' column in {truth_file.name}. Available: {list(df.columns[:10])}"
            )
            return None
        if "player_id" not in df.columns:
            logger.error(f"No 'player_id' column in {truth_file.name}")
            return None
        if "points" not in df.columns:
            logger.error(f"No 'points' column in {truth_file.name}")
            return None

        # Clean data
        df = df.copy()  # Ensure we have a proper DataFrame
        df["player_id"] = pd.to_numeric(df["player_id"], errors="coerce")
        df["gw"] = pd.to_numeric(df["gw"], errors="coerce")
        df["points"] = pd.to_numeric(df["points"], errors="coerce").fillna(0)

        # Drop rows with invalid player_id or gw
        df = df[df["player_id"].notna()]
        df = df[df["gw"].notna()]
        df["player_id"] = df["player_id"].astype(int)
        df["gw"] = df["gw"].astype(int)

        logger.info(
            f"Loaded truth data: {len(df)} rows across {df['gw'].nunique()} gameweeks"
        )
        result_df = df[["gw", "player_id", "points"]].copy()
        return result_df

    except Exception as e:
        import traceback

        logger.error(f"Error loading truth file: {e}")
        logger.error(traceback.format_exc())
        return None


def build_candidate_pool(df_pred: pd.DataFrame) -> pd.DataFrame:
    """Build a 15-player candidate squad from predictions.

    Takes top N players per position by predicted_points:
    GK=2, DEF=5, MID=5, FWD=3

    Args:
        df_pred: DataFrame with predictions

    Returns:
        DataFrame with exactly 15 players (or fewer if not enough available)
    """
    pool_limits = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}
    pool_parts = []

    for pos, limit in pool_limits.items():
        pos_df = df_pred[df_pred["pos"] == pos].copy()
        pos_df = pos_df.sort_values("predicted_points", ascending=False).head(limit)
        pool_parts.append(pos_df)

    pool = pd.concat(pool_parts, ignore_index=True)

    logger.debug(
        f"Candidate pool: {len(pool)} players - "
        + ", ".join(
            [
                f"{pos}={len(pool[pool['pos']==pos])}"
                for pos in ["GK", "DEF", "MID", "FWD"]
            ]
        )
    )

    return pool


def pick_xi_for_formation(
    candidates: pd.DataFrame, formation: str, max_per_club: int = 3
) -> List[int] | None:
    """Pick best XI for a given formation respecting constraints.

    Args:
        candidates: DataFrame with candidate players
        formation: Formation string (e.g., "4-4-2")
        max_per_club: Maximum players from same club (default 3)

    Returns:
        List of 11 player_ids, or None if cannot build valid XI
    """
    if formation not in FORMATION_SLOTS:
        logger.error(f"Unknown formation: {formation}")
        return None

    slots = FORMATION_SLOTS[formation].copy()
    xi = []
    club_counts = {}

    # Sort candidates by predicted points (descending)
    sorted_candidates = candidates.sort_values("predicted_points", ascending=False)

    for _, player in sorted_candidates.iterrows():
        pos = player["pos"]
        club = player["team"]
        player_id = int(player["player_id"])

        # Check if we need this position
        if slots.get(pos, 0) <= 0:
            continue

        # Check club constraint
        if club_counts.get(club, 0) >= max_per_club:
            continue

        # Add to XI
        xi.append(player_id)
        slots[pos] -= 1
        club_counts[club] = club_counts.get(club, 0) + 1

        # Check if XI is complete
        if len(xi) == 11:
            break

    # Validate we got all positions filled
    if len(xi) != 11 or any(v > 0 for v in slots.values()):
        logger.debug(
            f"Formation {formation}: Could not fill all slots (got {len(xi)}/11)"
        )
        return None

    return xi


def evaluate_xi(
    xi_ids: List[int], truth_gw_df: pd.DataFrame, pred_df: pd.DataFrame
) -> Dict:
    """Evaluate an XI using true points and select captain.

    Args:
        xi_ids: List of 11 player_ids in the XI
        truth_gw_df: True points for this gameweek
        pred_df: Predictions (to select captain by predicted points)

    Returns:
        Dict with xi_points (including captain bonus), captain_id, vice_id
    """
    # Get true points for XI players
    xi_truth = truth_gw_df[truth_gw_df["player_id"].isin(xi_ids)].copy()

    # Get predictions for XI to determine captain
    xi_pred = pred_df[pred_df["player_id"].isin(xi_ids)].copy()
    xi_pred = xi_pred.sort_values("predicted_points", ascending=False)

    captain_id = int(xi_pred.iloc[0]["player_id"]) if len(xi_pred) > 0 else None
    vice_id = int(xi_pred.iloc[1]["player_id"]) if len(xi_pred) > 1 else captain_id

    # Calculate total points
    base_points = xi_truth["points"].sum()

    # Add captain bonus (captain gets double points)
    if captain_id:
        captain_points = xi_truth[xi_truth["player_id"] == captain_id]["points"].values
        if len(captain_points) > 0:
            base_points += captain_points[0]  # Add captain's points again for double

    return {
        "xi_points": float(base_points),
        "captain_id": captain_id,
        "vice_id": vice_id,
        "n_truth_matched": len(xi_truth),
    }


def select_best_team_for_gw(
    pred_df: pd.DataFrame, truth_gw_df: pd.DataFrame
) -> Dict | None:
    """Select the best team (XI + formation) for a gameweek.

    Args:
        pred_df: Predictions for all players this GW
        truth_gw_df: True points for this GW

    Returns:
        Dict with team details or None if selection failed
    """
    # Build candidate pool (15 players)
    candidates = build_candidate_pool(pred_df)

    if len(candidates) < 11:
        logger.warning(f"Insufficient candidates: {len(candidates)}")
        return None

    # Merge with truth to filter only players with known results
    candidates = candidates.merge(
        truth_gw_df[["player_id"]], on="player_id", how="inner"
    )

    if len(candidates) < 11:
        logger.warning(f"Insufficient candidates with truth data: {len(candidates)}")
        return None

    # Try all formations and pick best based on PREDICTED points
    best_formation = None
    best_xi = None
    best_predicted_total = -1

    for formation in VALID_FORMATIONS:
        xi_ids = pick_xi_for_formation(candidates, formation, max_per_club=3)

        if xi_ids is None:
            continue

        # Calculate predicted total for this XI
        xi_pred = candidates[candidates["player_id"].isin(xi_ids)]
        predicted_total = xi_pred["predicted_points"].sum()

        if predicted_total > best_predicted_total:
            best_predicted_total = predicted_total
            best_formation = formation
            best_xi = xi_ids

    if best_xi is None:
        logger.warning("No valid formation found")
        return None

    # Now evaluate using TRUE points
    eval_result = evaluate_xi(best_xi, truth_gw_df, candidates)

    return {
        "formation": best_formation,
        "xi_ids": best_xi,
        "xi_points": eval_result["xi_points"],
        "captain_id": eval_result["captain_id"],
        "vice_id": eval_result["vice_id"],
        "n_truth_matched": eval_result["n_truth_matched"],
        "n_candidates": len(candidates),
    }


def run_backtest(season: str, gw_start: int, gw_end: int, methods: List[str]) -> None:
    """Run team backtest and generate outputs.

    Args:
        season: Season string (e.g., "2023-24")
        gw_start: First gameweek
        gw_end: Last gameweek (inclusive)
        methods: List of methods to evaluate (e.g., ["rf", "ma3", "pos"])
    """
    logger.info("=" * 70)
    logger.info(f"Team Backtest: {season}, GW{gw_start}-{gw_end}")
    logger.info(f"Methods: {', '.join(methods)}")
    logger.info("=" * 70)

    # Load truth data once
    truth_df = load_truth(season)
    if truth_df is None:
        logger.error("Cannot proceed without truth data")
        return

    results = []

    for gw in range(gw_start, gw_end + 1):
        logger.info(f"\n{'='*70}")
        logger.info(f"GW{gw}")
        logger.info(f"{'='*70}")

        # Get truth for this GW
        truth_gw = truth_df[truth_df["gw"] == gw].copy()

        if truth_gw.empty:
            logger.warning(f"GW{gw}: No truth data available, skipping")
            continue

        logger.info(f"GW{gw}: {len(truth_gw)} players with true points")

        for method in methods:
            logger.info(f"\n  Method: {method.upper()}")

            # Load predictions
            pred_df = load_predictions(gw, method)
            if pred_df is None:
                logger.warning(f"  GW{gw} ({method}): No predictions, skipping")
                continue

            # Select team
            team_result = select_best_team_for_gw(pred_df, truth_gw)

            if team_result is None:
                logger.warning(f"  GW{gw} ({method}): Team selection failed")
                results.append(
                    {
                        "method": method,
                        "gw": gw,
                        "formation": None,
                        "xi_points": 0,
                        "captain_id": None,
                        "vice_id": None,
                        "n_truth_matched": 0,
                        "n_candidates": 0,
                        "notes": "Selection failed",
                    }
                )
                continue

            logger.info(
                f"  → {team_result['formation']}: "
                f"{team_result['xi_points']:.1f} pts "
                f"(C={team_result['captain_id']})"
            )

            results.append(
                {
                    "method": method,
                    "gw": gw,
                    "formation": team_result["formation"],
                    "xi_points": team_result["xi_points"],
                    "captain_id": team_result["captain_id"],
                    "vice_id": team_result["vice_id"],
                    "n_truth_matched": team_result["n_truth_matched"],
                    "n_candidates": team_result["n_candidates"],
                    "notes": "OK",
                }
            )

    if not results:
        logger.error("No results generated!")
        return

    # Create detailed results DataFrame
    results_df = pd.DataFrame(results)

    # Save detailed results
    detail_filename = f"team_backtest_{season}_gw{gw_start}-{gw_end}.csv"
    detail_path = OUT_DIR / detail_filename
    results_df.to_csv(detail_path, index=False)
    logger.info(f"\n✓ Saved detailed results: {detail_filename}")

    # Compute summary statistics
    summary_df = (
        results_df[results_df["xi_points"] > 0]
        .groupby("method")
        .agg(
            avg_xi_points=("xi_points", "mean"),
            std_xi_points=("xi_points", "std"),
            n_gw=("xi_points", "count"),
        )
        .reset_index()
    )

    summary_df = summary_df.sort_values("avg_xi_points", ascending=False)

    # Save summary
    summary_filename = f"team_backtest_summary_{season}_gw{gw_start}-{gw_end}.csv"
    summary_path = OUT_DIR / summary_filename
    summary_df.to_csv(summary_path, index=False)
    logger.info(f"✓ Saved summary: {summary_filename}")

    # Display summary
    logger.info("\n" + "=" * 70)
    logger.info("SUMMARY STATISTICS")
    logger.info("=" * 70)
    print("\n" + summary_df.to_string(index=False))

    # Create visualization
    create_comparison_plot(summary_df, season, gw_start, gw_end)

    logger.info("\n" + "=" * 70)
    logger.info("✓ Team backtest completed!")
    logger.info("=" * 70)


def create_comparison_plot(
    summary_df: pd.DataFrame, season: str, gw_start: int, gw_end: int
) -> None:
    """Create bar chart comparing methods.

    Args:
        summary_df: Summary statistics DataFrame
        season: Season string
        gw_start: First gameweek
        gw_end: Last gameweek
    """
    if summary_df.empty:
        logger.warning("No data to plot")
        return

    plt.figure(figsize=(10, 6))

    methods = summary_df["method"].tolist()
    avg_points = summary_df["avg_xi_points"].tolist()
    std_points = summary_df["std_xi_points"].fillna(0).tolist()

    # Use distinct colors
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"][: len(methods)]

    # Create bar chart
    bars = plt.bar(
        methods, avg_points, color=colors, alpha=0.8, edgecolor="black", linewidth=1.5
    )

    # Add error bars
    plt.errorbar(
        range(len(methods)),
        avg_points,
        yerr=std_points,
        fmt="none",
        ecolor="black",
        capsize=8,
        capthick=2,
        elinewidth=2,
    )

    # Add value labels on bars
    for i, (bar, val) in enumerate(zip(bars, avg_points)):
        height = bar.get_height()
        plt.text(
            i,
            height + std_points[i] + 0.5,
            f"{val:.1f}",
            ha="center",
            va="bottom",
            fontsize=13,
            fontweight="bold",
        )

    plt.xlabel("Prediction Method", fontsize=13, fontweight="bold")
    plt.ylabel("Average XI Points (with captain bonus)", fontsize=13, fontweight="bold")
    plt.title(
        f"Team Backtest: {season} GW{gw_start}-{gw_end}\n"
        f"Average Team Points by Method",
        fontsize=14,
        fontweight="bold",
        pad=20,
    )

    plt.grid(axis="y", alpha=0.3, linestyle="--", linewidth=0.7)
    plt.ylim(bottom=0)
    plt.tight_layout()

    # Save plot
    plot_filename = f"team_backtest_{season}_gw{gw_start}-{gw_end}.png"
    plot_path = OUT_DIR / plot_filename
    plt.savefig(plot_path, dpi=300, bbox_inches="tight")
    logger.info(f"✓ Saved plot: {plot_filename}")
    plt.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Team backtest: Compare prediction methods via team selection"
    )
    parser.add_argument(
        "--season", type=str, default="2022-23", help="Season (e.g., 2023-24, 2022-23)"
    )
    parser.add_argument("--gw_start", type=int, required=True, help="First gameweek")
    parser.add_argument(
        "--gw_end", type=int, required=True, help="Last gameweek (inclusive)"
    )
    parser.add_argument(
        "--methods",
        nargs="+",
        default=["rf"],
        choices=["rf", "ma3", "pos"],
        help="Prediction methods to compare",
    )

    args = parser.parse_args()

    run_backtest(
        season=args.season,
        gw_start=args.gw_start,
        gw_end=args.gw_end,
        methods=args.methods,
    )


if __name__ == "__main__":
    main()
