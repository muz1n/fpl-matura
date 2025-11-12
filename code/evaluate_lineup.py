"""Evaluate lineup decisions against actual FPL points.

This script loads lineup JSON files, computes actual team points, and compares
against hindsight-optimal lineups to measure decision quality.
"""

import argparse
import glob
import json
import sys
from itertools import combinations
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


# FPL formation constraints
ALLOWED_FORMATIONS = [
    "3-4-3",
    "3-5-2",
    "4-4-2",
    "4-5-1",
    "4-3-3",
    "5-3-2",
    "5-4-1",
]

POS_SLOTS = {
    "3-4-3": {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "3-5-2": {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "4-4-2": {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "4-5-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "4-3-3": {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "5-3-2": {"GK": 1, "DEF": 5, "MID": 3, "FWD": 2},
    "5-4-1": {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
}


def load_lineups(pattern: str) -> List[Dict]:
    """Load all lineup JSON files matching the pattern.

    Args:
        pattern: Glob pattern for lineup files (e.g., 'out/lineup_gw*.json')

    Returns:
        List of lineup dictionaries with gw, xi_ids, bench_gk_id, bench_out_ids

    Raises:
        FileNotFoundError: If no lineup files are found
        ValueError: If JSON files have unexpected structure
    """
    lineup_files = glob.glob(pattern)

    if not lineup_files:
        raise FileNotFoundError(f"No lineup files found matching pattern: {pattern}")

    print(f"Found {len(lineup_files)} lineup file(s)")

    all_lineups = []

    for lineup_file in sorted(lineup_files):
        try:
            with open(lineup_file, "r") as f:
                data = json.load(f)

            # Validate required fields
            required_fields = {"gw", "xi_ids", "bench_gk_id", "bench_out_ids"}
            missing_fields = required_fields - set(data.keys())
            if missing_fields:
                raise ValueError(
                    f"Missing required fields in {lineup_file}: {missing_fields}"
                )

            all_lineups.append(data)
            print(f"  Loaded lineup for GW{data['gw']} from {Path(lineup_file).name}")

        except json.JSONDecodeError as e:
            print(
                f"Warning: Failed to parse JSON from {lineup_file}: {e}",
                file=sys.stderr,
            )
            continue
        except Exception as e:
            print(f"Warning: Error loading {lineup_file}: {e}", file=sys.stderr)
            continue

    if not all_lineups:
        raise ValueError("No valid lineup data could be loaded")

    print(f"\nTotal lineups loaded: {len(all_lineups)}")

    return all_lineups


def load_actuals(data_paths: List[str]) -> pd.DataFrame:
    """Load actual points from merged gameweek CSV files.

    Args:
        data_paths: List of paths to merged_gw CSV files

    Returns:
        DataFrame with columns: player_id, gw, total_points, position

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
            required_cols = ["element", "GW", "total_points", "position"]
            missing_cols = set(required_cols) - set(df.columns)
            if missing_cols:
                print(
                    f"Warning: Missing columns in {data_path}: {missing_cols}",
                    file=sys.stderr,
                )
                continue

            # Rename to standard names
            actuals = df[required_cols].copy()
            actuals.columns = ["player_id", "gw", "total_points", "position"]

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


def load_squad_file(squad_path: str, gw: int) -> pd.DataFrame:
    """Load the 15-man squad file for a specific gameweek.

    Args:
        squad_path: Path to squad CSV file
        gw: Gameweek number

    Returns:
        DataFrame with player_id, position, and other squad info

    Raises:
        FileNotFoundError: If squad file doesn't exist
    """
    path = Path(squad_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Squad file not found: {squad_path}\n"
            f"This file is required to determine player positions for GW{gw}"
        )

    df = pd.read_csv(squad_path)

    # Check for required columns
    if "player_id" not in df.columns:
        # Try 'element' as alternative
        if "element" in df.columns:
            df = df.rename(columns={"element": "player_id"})
        else:
            raise ValueError(f"No 'player_id' or 'element' column in {squad_path}")

    if "position" not in df.columns:
        raise ValueError(f"No 'position' column in {squad_path}")

    return df


def validate_lineup(
    xi_ids: List[int],
    bench_gk_id: int,
    bench_out_ids: List[int],
    squad_df: pd.DataFrame,
) -> Dict[str, bool]:
    """Validate lineup against FPL rules.

    Args:
        xi_ids: List of 11 starting player IDs
        bench_gk_id: Bench goalkeeper ID
        bench_out_ids: List of bench outfield player IDs
        squad_df: DataFrame with player_id and position columns

    Returns:
        Dictionary with validation flags
    """
    validation = {
        "exactly_11_xi": len(xi_ids) == 11,
        "exactly_1_bench_gk": bench_gk_id is not None,
        "exactly_3_bench_out": len(bench_out_ids) == 3,
        "no_duplicates": len(set(xi_ids + [bench_gk_id] + bench_out_ids)) == 15,
        "has_1_gk_in_xi": False,
        "valid_formation": False,
    }

    if not validation["exactly_11_xi"]:
        return validation

    # Create position lookup
    pos_lookup = dict(zip(squad_df["player_id"], squad_df["position"]))

    # Count positions in XI
    xi_positions = [pos_lookup.get(pid, "UNKNOWN") for pid in xi_ids]
    pos_counts = {
        "GK": xi_positions.count("GK"),
        "DEF": xi_positions.count("DEF"),
        "MID": xi_positions.count("MID"),
        "FWD": xi_positions.count("FWD"),
    }

    validation["has_1_gk_in_xi"] = pos_counts["GK"] == 1

    # Check if formation is valid
    for formation in ALLOWED_FORMATIONS:
        if POS_SLOTS[formation] == pos_counts:
            validation["valid_formation"] = True
            break

    return validation


def compute_team_points(player_ids: List[int], actuals: pd.DataFrame, gw: int) -> float:
    """Compute total actual points for a list of players in a gameweek.

    Args:
        player_ids: List of player IDs
        actuals: DataFrame with player_id, gw, total_points
        gw: Gameweek number

    Returns:
        Sum of actual points for the players
    """
    gw_actuals = actuals[actuals["gw"] == gw]
    points = gw_actuals[gw_actuals["player_id"].isin(player_ids)]["total_points"].sum()
    return float(points)


def find_best_xi_for_formation(
    squad_df: pd.DataFrame, actuals: pd.DataFrame, gw: int, formation: str
) -> Tuple[List[int], float]:
    """Find the best XI for a specific formation using actual points.

    Args:
        squad_df: DataFrame with player_id and position
        actuals: DataFrame with player_id, gw, total_points
        gw: Gameweek number
        formation: Formation string (e.g., '4-4-2')

    Returns:
        Tuple of (best_xi_ids, total_points)
    """
    if formation not in POS_SLOTS:
        return [], 0.0

    # Merge squad with actuals for this GW
    gw_actuals = actuals[actuals["gw"] == gw][["player_id", "total_points"]]
    squad_with_points = squad_df.merge(gw_actuals, on="player_id", how="left")
    squad_with_points["total_points"] = squad_with_points["total_points"].fillna(0.0)

    # Group by position
    by_position = {}
    for pos in ["GK", "DEF", "MID", "FWD"]:
        by_position[pos] = squad_with_points[squad_with_points["position"] == pos]

    # Check if we have enough players for this formation
    slots = POS_SLOTS[formation]
    for pos, needed in slots.items():
        if len(by_position[pos]) < needed:
            return [], 0.0  # Infeasible

    best_xi = []
    best_points = -1.0

    # Generate all valid combinations for this formation
    # Sort each position by points descending for early pruning
    pos_candidates = {}
    for pos in ["GK", "DEF", "MID", "FWD"]:
        sorted_pos = by_position[pos].sort_values("total_points", ascending=False)
        pos_candidates[pos] = sorted_pos[["player_id", "total_points"]].values.tolist()

    # Try all combinations (brute force for small squad sizes)
    for gk_combo in combinations(range(len(pos_candidates["GK"])), slots["GK"]):
        gk_ids = [pos_candidates["GK"][i][0] for i in gk_combo]
        gk_points = sum(pos_candidates["GK"][i][1] for i in gk_combo)

        for def_combo in combinations(range(len(pos_candidates["DEF"])), slots["DEF"]):
            def_ids = [pos_candidates["DEF"][i][0] for i in def_combo]
            def_points = sum(pos_candidates["DEF"][i][1] for i in def_combo)

            for mid_combo in combinations(
                range(len(pos_candidates["MID"])), slots["MID"]
            ):
                mid_ids = [pos_candidates["MID"][i][0] for i in mid_combo]
                mid_points = sum(pos_candidates["MID"][i][1] for i in mid_combo)

                for fwd_combo in combinations(
                    range(len(pos_candidates["FWD"])), slots["FWD"]
                ):
                    fwd_ids = [pos_candidates["FWD"][i][0] for i in fwd_combo]
                    fwd_points = sum(pos_candidates["FWD"][i][1] for i in fwd_combo)

                    total_points = gk_points + def_points + mid_points + fwd_points

                    if total_points > best_points:
                        best_points = total_points
                        best_xi = gk_ids + def_ids + mid_ids + fwd_ids

    return best_xi, best_points


def compute_hindsight_best_xi(
    squad_df: pd.DataFrame, actuals: pd.DataFrame, gw: int
) -> Tuple[List[int], float, Optional[str]]:
    """Find the best possible XI from the squad using hindsight (actual points).

    Args:
        squad_df: DataFrame with player_id and position
        actuals: DataFrame with player_id, gw, total_points
        gw: Gameweek number

    Returns:
        Tuple of (best_xi_ids, best_points, best_formation)
    """
    best_xi = []
    best_points = -1.0
    best_formation = None

    for formation in ALLOWED_FORMATIONS:
        xi_ids, points = find_best_xi_for_formation(squad_df, actuals, gw, formation)
        if points > best_points:
            best_points = points
            best_xi = xi_ids
            best_formation = formation

    return best_xi, best_points, best_formation


def compute_bench_loss(
    xi_ids: List[int],
    bench_out_ids: List[int],
    squad_df: pd.DataFrame,
    actuals: pd.DataFrame,
    gw: int,
) -> float:
    """Compute points lost by benching players who would have improved the XI.

    Args:
        xi_ids: Starting XI player IDs
        bench_out_ids: Benched outfield player IDs
        squad_df: DataFrame with player_id and position
        actuals: DataFrame with player_id, gw, total_points
        gw: Gameweek number

    Returns:
        Total points that could have been gained by optimal bench decisions
    """
    # Get actual points for XI and bench
    gw_actuals = actuals[actuals["gw"] == gw][["player_id", "total_points"]]

    xi_points = gw_actuals[gw_actuals["player_id"].isin(xi_ids)]
    bench_points = gw_actuals[gw_actuals["player_id"].isin(bench_out_ids)]

    if xi_points.empty or bench_points.empty:
        return 0.0

    # Find minimum points in XI
    min_xi_points = xi_points["total_points"].min()

    # Sum of bench points that exceed minimum XI points
    bench_better = bench_points[bench_points["total_points"] > min_xi_points][
        "total_points"
    ].sum()

    # Simplified bench loss: potential points left on bench
    # A more sophisticated version would consider formation constraints
    loss = max(0.0, bench_better - min_xi_points * len(bench_out_ids))

    return float(loss)


def evaluate_lineup(
    lineup: Dict, actuals: pd.DataFrame, squad_df: pd.DataFrame
) -> Dict:
    """Evaluate a single lineup against actuals.

    Args:
        lineup: Dictionary with gw, xi_ids, bench_gk_id, bench_out_ids
        actuals: DataFrame with actual points
        squad_df: DataFrame with squad information

    Returns:
        Dictionary with evaluation metrics
    """
    gw = lineup["gw"]
    xi_ids = lineup["xi_ids"]
    bench_gk_id = lineup["bench_gk_id"]
    bench_out_ids = lineup["bench_out_ids"]

    # Validate lineup
    validation = validate_lineup(xi_ids, bench_gk_id, bench_out_ids, squad_df)

    # Compute actual team points
    team_points_xi = compute_team_points(xi_ids, actuals, gw)

    # Compute hindsight best XI
    hindsight_xi_ids, hindsight_points, hindsight_formation = compute_hindsight_best_xi(
        squad_df, actuals, gw
    )

    # Compute XI gap
    xi_gap = hindsight_points - team_points_xi

    # Compute bench loss
    bench_loss = compute_bench_loss(xi_ids, bench_out_ids, squad_df, actuals, gw)

    return {
        "gw": int(gw),
        "team_points_xi": float(team_points_xi),
        "hindsight_points": float(hindsight_points),
        "hindsight_formation": hindsight_formation,
        "xi_gap": float(xi_gap),
        "bench_loss": float(bench_loss),
        "validation": validation,
        "is_valid": all(validation.values()),
    }


def aggregate_metrics(evaluations: List[Dict]) -> Dict:
    """Aggregate metrics across all evaluations.

    Args:
        evaluations: List of evaluation dictionaries

    Returns:
        Dictionary with aggregated metrics
    """
    if not evaluations:
        return {}

    xi_gaps = [e["xi_gap"] for e in evaluations]
    bench_losses = [e["bench_loss"] for e in evaluations]
    valid_count = sum(1 for e in evaluations if e["is_valid"])

    # Collect validation failures
    validation_summary = {
        "total_lineups": len(evaluations),
        "valid_lineups": valid_count,
        "validity_rate": valid_count / len(evaluations) if evaluations else 0.0,
    }

    # Count specific validation issues
    for key in ["exactly_11_xi", "has_1_gk_in_xi", "valid_formation", "no_duplicates"]:
        failures = sum(1 for e in evaluations if not e["validation"][key])
        validation_summary[f"{key}_failures"] = failures

    return {
        "n_lineups": len(evaluations),
        "mean_xi_gap": float(np.mean(xi_gaps)),
        "median_xi_gap": float(np.median(xi_gaps)),
        "total_xi_gap": float(np.sum(xi_gaps)),
        "mean_bench_loss": float(np.mean(bench_losses)),
        "total_bench_loss": float(np.sum(bench_losses)),
        "mean_team_points": float(np.mean([e["team_points_xi"] for e in evaluations])),
        "mean_hindsight_points": float(
            np.mean([e["hindsight_points"] for e in evaluations])
        ),
        "validation": validation_summary,
    }


def print_summary(aggregated: Dict, evaluations: List[Dict]) -> None:
    """Print a compact summary of evaluation results.

    Args:
        aggregated: Dictionary of aggregated metrics
        evaluations: List of individual evaluation results
    """
    print("\n" + "=" * 70)
    print("LINEUP EVALUATION SUMMARY")
    print("=" * 70)

    print("\n--- Overall Performance ---")
    print(f"Lineups evaluated:        {aggregated['n_lineups']}")
    print(f"Mean team points (XI):    {aggregated['mean_team_points']:.2f}")
    print(f"Mean hindsight points:    {aggregated['mean_hindsight_points']:.2f}")
    print(f"Mean XI gap:              {aggregated['mean_xi_gap']:.2f}")
    print(f"Median XI gap:            {aggregated['median_xi_gap']:.2f}")
    print(f"Total XI gap:             {aggregated['total_xi_gap']:.2f}")
    print(f"Mean bench loss:          {aggregated['mean_bench_loss']:.2f}")
    print(f"Total bench loss:         {aggregated['total_bench_loss']:.2f}")

    val = aggregated["validation"]
    print("\n--- Validation Summary ---")
    print(
        f"Valid lineups:            {val['valid_lineups']}/{val['total_lineups']} ({val['validity_rate']:.1%})"
    )
    if val["exactly_11_xi_failures"] > 0:
        print(f"  ✗ Wrong XI size:        {val['exactly_11_xi_failures']}")
    if val["has_1_gk_in_xi_failures"] > 0:
        print(f"  ✗ Missing GK in XI:     {val['has_1_gk_in_xi_failures']}")
    if val["valid_formation_failures"] > 0:
        print(f"  ✗ Invalid formation:    {val['valid_formation_failures']}")
    if val["no_duplicates_failures"] > 0:
        print(f"  ✗ Duplicate players:    {val['no_duplicates_failures']}")

    print("\n--- Per-Gameweek Results ---")
    print(
        f"{'GW':<4} {'Team':>6} {'Best':>6} {'Gap':>6} {'Bench':>6} {'Valid':>6} {'Formation':<8}"
    )
    print("-" * 70)
    for e in sorted(evaluations, key=lambda x: x["gw"]):
        valid_mark = "✓" if e["is_valid"] else "✗"
        formation = e["hindsight_formation"] or "N/A"
        print(
            f"{e['gw']:<4} {e['team_points_xi']:>6.1f} {e['hindsight_points']:>6.1f} "
            f"{e['xi_gap']:>6.1f} {e['bench_loss']:>6.1f} {valid_mark:>6} {formation:<8}"
        )

    print("\n" + "=" * 70)


def save_results(
    aggregated: Dict, evaluations: List[Dict], output_dir: str = "out"
) -> None:
    """Save evaluation results to files.

    Args:
        aggregated: Dictionary of aggregated metrics
        evaluations: List of evaluation dictionaries
        output_dir: Directory to save results
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Combine aggregated and per-lineup metrics
    metrics_output = {
        "overall": aggregated,
        "per_gameweek": evaluations,
    }

    # Save metrics as JSON
    metrics_file = output_path / "metrics_lineup.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"\nSaved metrics to: {metrics_file}")


def main():
    """Main entry point for the lineup evaluation script."""
    parser = argparse.ArgumentParser(
        description="Evaluate FPL lineup decisions against actual points",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  python code/evaluate_lineup.py --squad data/squad_2023-24.csv
  python code/evaluate_lineup.py --lineups "out/lineup_gw*.json" --squad data/my_squad.csv
  python code/evaluate_lineup.py --squad data/squad.csv --data-22-23 data/merged_gw_2022-23.csv
        """,
    )

    parser.add_argument(
        "--lineups",
        type=str,
        default="out/lineup_gw*.json",
        help="Glob pattern for lineup JSON files (default: out/lineup_gw*.json)",
    )

    parser.add_argument(
        "--squad",
        type=str,
        required=True,
        help="Path to squad CSV file with player_id and position columns (REQUIRED)",
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

    args = parser.parse_args()

    try:
        # Load lineups
        print("=" * 70)
        print("Loading lineup files...")
        print("=" * 70)
        lineups = load_lineups(args.lineups)

        # Load actuals
        print("\n" + "=" * 70)
        print("Loading actual data files...")
        print("=" * 70)
        data_paths = [args.data_22_23, args.data_23_24]
        actuals = load_actuals(data_paths)

        # Load squad file
        print("\n" + "=" * 70)
        print("Loading squad file...")
        print("=" * 70)
        # Use first lineup's GW for error messages
        first_gw = lineups[0]["gw"] if lineups else 1
        squad_df = load_squad_file(args.squad, first_gw)
        print(f"Loaded {len(squad_df)} players from squad file")

        if len(squad_df) != 15:
            print(
                f"\nWarning: Squad file has {len(squad_df)} players (expected 15)",
                file=sys.stderr,
            )

        # Evaluate each lineup
        print("\n" + "=" * 70)
        print("Evaluating lineups...")
        print("=" * 70)
        evaluations = []
        for lineup in lineups:
            try:
                result = evaluate_lineup(lineup, actuals, squad_df)
                evaluations.append(result)
                print(
                    f"  Evaluated GW{lineup['gw']}: gap={result['xi_gap']:.1f}, valid={result['is_valid']}"
                )
            except Exception as e:
                print(f"Error evaluating GW{lineup['gw']}: {e}", file=sys.stderr)
                continue

        if not evaluations:
            print("\nError: No lineups could be evaluated", file=sys.stderr)
            sys.exit(1)

        # Aggregate metrics
        aggregated = aggregate_metrics(evaluations)

        # Print and save results
        print_summary(aggregated, evaluations)
        save_results(aggregated, evaluations, args.output_dir)

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
