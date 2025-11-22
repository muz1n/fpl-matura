"""Beurteilung von Aufstellungen im Vergleich zu tatsaechlichen FPL-Punkten.

Dieses Skript liest Aufstellungs-JSONs, berechnet die tatsaechlichen Teampunkte
und vergleicht sie mit rueckblickend optimalen Aufstellungen, um die
Entscheidungsqualitaet zu messen.
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

# Füge Root zum Path für Imports hinzu
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


# FPL-Formationsregeln
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
    """Ladet alle Aufstellungs-JSONs, die zum Muster passen.

    Args:
        pattern: Glob-Muster fuer Aufstellungsdateien (z.B. 'out/lineup_gw*.json')

    Returns:
        Liste von Dictionarys mit gw, xi_ids, bench_gk_id, bench_out_ids

    Raises:
        FileNotFoundError: Wenn keine Dateien gefunden werden
        ValueError: Bei unerwarteter JSON-Struktur
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

            # Pflichtfelder pruefen
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
    """Ladet die tatsaechlichen Punkte aus zusammengefuehrten GW-CSV-Dateien.

    Args:
        data_paths: Liste von Pfaden zu merged_gw-CSV-Dateien

    Returns:
        DataFrame mit Spalten: player_id, gw, total_points, position

    Raises:
        FileNotFoundError: Falls keine Dateien existieren
    """
    all_actuals = []

    for data_path in data_paths:
        path = Path(data_path)
        if not path.exists():
            print(f"Warning: Data file not found: {data_path}", file=sys.stderr)
            continue

        try:
            df = pd.read_csv(data_path)

            # Pruefe Pflichtspalten
            required_cols = ["element", "GW", "total_points", "position"]
            missing_cols = set(required_cols) - set(df.columns)
            if missing_cols:
                print(
                    f"Warning: Missing columns in {data_path}: {missing_cols}",
                    file=sys.stderr,
                )
                continue

            # Spalten auf Standardnamen abbilden
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
    """Ladet die 15-Spieler-Kaderdatei fuer eine bestimmte Spielwoche.

    Args:
        squad_path: Pfad zur Squad-CSV
        gw: Spielwochen-Nummer

    Returns:
        DataFrame mit player_id, position und weiteren Kaderinfos

    Raises:
        FileNotFoundError: Falls die Datei nicht existiert
    """
    path = Path(squad_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Squad file not found: {squad_path}\n"
            f"This file is required to determine player positions for GW{gw}"
        )

    df = pd.read_csv(squad_path)

    # Pflichtspalten pruefen
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

    # Positions-Nachschlagetabelle erstellen
    pos_lookup = dict(zip(squad_df["player_id"], squad_df["position"]))

    # Positionen in der Startelf zaehlen
    xi_positions = [pos_lookup.get(pid, "UNKNOWN") for pid in xi_ids]
    pos_counts = {
        "GK": xi_positions.count("GK"),
        "DEF": xi_positions.count("DEF"),
        "MID": xi_positions.count("MID"),
        "FWD": xi_positions.count("FWD"),
    }

    validation["has_1_gk_in_xi"] = pos_counts["GK"] == 1

    # Pruefen, ob die Formation gueltig ist
    for formation in ALLOWED_FORMATIONS:
        if POS_SLOTS[formation] == pos_counts:
            validation["valid_formation"] = True
            break

    return validation


def compute_team_points(player_ids: List[int], actuals: pd.DataFrame, gw: int) -> float:
    """Berechnet die Summe tatsaechlicher Punkte einer Spielerliste in einer Spielwoche.

    Args:
        player_ids: Liste von Spieler-IDs
        actuals: DataFrame mit player_id, gw, total_points
        gw: Spielwochen-Nummer

    Returns:
        Summe der echten Punkte fuer diese Spieler
    """
    gw_actuals = actuals[actuals["gw"] == gw]
    points = gw_actuals[gw_actuals["player_id"].isin(player_ids)]["total_points"].sum()
    return float(points)


def find_best_xi_for_formation(
    squad_df: pd.DataFrame, actuals: pd.DataFrame, gw: int, formation: str
) -> Tuple[List[int], float]:
    """Findet die beste Startelf fuer eine Formation anhand echter Punkte.

    Args:
        squad_df: DataFrame mit player_id und position
        actuals: DataFrame mit player_id, gw, total_points
        gw: Spielwochen-Nummer
        formation: Formation (z.B. '4-4-2')

    Returns:
        Tupel (beste_xi_ids, gesamtpunkte)
    """
    if formation not in POS_SLOTS:
        return [], 0.0

    # Kader mit den echten Punkten dieser Spielwoche verbinden
    gw_actuals = actuals[actuals["gw"] == gw][["player_id", "total_points"]]
    squad_with_points = squad_df.merge(gw_actuals, on="player_id", how="left")
    squad_with_points["total_points"] = squad_with_points["total_points"].fillna(0.0)

    # Nach Position gruppieren
    by_position = {}
    for pos in ["GK", "DEF", "MID", "FWD"]:
        by_position[pos] = squad_with_points[squad_with_points["position"] == pos]

    # Pruefen, ob genug Spieler fuer diese Formation vorhanden sind
    slots = POS_SLOTS[formation]
    for pos, needed in slots.items():
        if len(by_position[pos]) < needed:
            return [], 0.0  # Infeasible

    best_xi = []
    best_points = -1.0

    # Alle gueltigen Kombinationen fuer diese Formation erzeugen
    # Pro Position nach Punkten absteigend sortieren, um frueh zu kuerzen
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
    """Findet rueckblickend die bestmoegliche Startelf anhand echter Punkte.

    Args:
        squad_df: DataFrame mit player_id und position
        actuals: DataFrame mit player_id, gw, total_points
        gw: Spielwochen-Nummer

    Returns:
        Tupel (beste_xi_ids, beste_punkte, beste_formation)
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
    """Berechnet Punkteverlust durch Bank, wenn Spieler die Startelf verbessert haetten.

    Args:
        xi_ids: IDs der Startelf
        bench_out_ids: IDs der Feldspieler auf der Bank
        squad_df: DataFrame mit player_id und position
        actuals: DataFrame mit player_id, gw, total_points
        gw: Spielwochen-Nummer

    Returns:
        Gesamtpunkte, die durch optimale Bank-Entscheide erreichbar waeren
    """
    # Echte Punkte fuer Startelf und Bank holen
    gw_actuals = actuals[actuals["gw"] == gw][["player_id", "total_points"]]

    xi_points = gw_actuals[gw_actuals["player_id"].isin(xi_ids)]
    bench_points = gw_actuals[gw_actuals["player_id"].isin(bench_out_ids)]

    if xi_points.empty or bench_points.empty:
        return 0.0

    # Minimum-Punkte in der Startelf ermitteln
    min_xi_points = xi_points["total_points"].min()

    # Summe der Bankpunkte, die das Minimum der Startelf uebersteigen
    bench_better = bench_points[bench_points["total_points"] > min_xi_points][
        "total_points"
    ].sum()

    # Vereinfachter Bankverlust: potentielle Punkte auf der Bank
    # Eine detailliertere Variante wuerde Formationsregeln beruecksichtigen
    loss = max(0.0, bench_better - min_xi_points * len(bench_out_ids))

    return float(loss)


def evaluate_lineup(
    lineup: Dict, actuals: pd.DataFrame, squad_df: pd.DataFrame
) -> Dict:
    """Bewertet eine Aufstellung im Vergleich zu echten Punkten.

    Args:
        lineup: Dictionary mit gw, xi_ids, bench_gk_id, bench_out_ids
        actuals: DataFrame mit echten Punkten
        squad_df: DataFrame mit Kaderinformationen

    Returns:
        Dictionary mit Auswertungskennzahlen
    """
    gw = lineup["gw"]
    xi_ids = lineup["xi_ids"]
    bench_gk_id = lineup["bench_gk_id"]
    bench_out_ids = lineup["bench_out_ids"]

    # Aufstellung validieren
    validation = validate_lineup(xi_ids, bench_gk_id, bench_out_ids, squad_df)

    # Tatsaechliche Teampunkte berechnen
    team_points_xi = compute_team_points(xi_ids, actuals, gw)

    # Rueckblickend beste Startelf bestimmen
    hindsight_xi_ids, hindsight_points, hindsight_formation = compute_hindsight_best_xi(
        squad_df, actuals, gw
    )

    # Luecke zur optimalen Startelf
    xi_gap = hindsight_points - team_points_xi

    # Punkteverlust durch Bank berechnen
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
    """Fasst Kennzahlen ueber alle Auswertungen zusammen.

    Args:
        evaluations: Liste von Auswertungs-Dictionaries

    Returns:
        Dictionary mit aggregierten Kennzahlen
    """
    if not evaluations:
        return {}

    xi_gaps = [e["xi_gap"] for e in evaluations]
    bench_losses = [e["bench_loss"] for e in evaluations]
    valid_count = sum(1 for e in evaluations if e["is_valid"])

    # Validierungsfehler sammeln
    validation_summary = {
        "total_lineups": len(evaluations),
        "valid_lineups": valid_count,
        "validity_rate": valid_count / len(evaluations) if evaluations else 0.0,
    }

    # Spezifische Validierungsprobleme zaehlen
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
    """Gibt eine kompakte Zusammenfassung der Ergebnisse aus.

    Args:
        aggregated: Dictionary mit aggregierten Kennzahlen
        evaluations: Liste der Einzelauswertungen
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
    """Speichert Auswertungsergebnisse in Dateien.

    Args:
        aggregated: Dictionary mit aggregierten Kennzahlen
        evaluations: Liste der Auswertungs-Dictionaries
        output_dir: Zielverzeichnis fuer Resultate
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
    """Haupteinstiegspunkt fuer das Aufstellungs-Evaluationsskript."""
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


# ============================================================================
# Web-App Evaluation API
# ============================================================================


def evaluate_single_lineup_for_webapp(
    season: str, gw: int, methode: str = "rf"
) -> Dict:
    """Evaluiert ein einzelnes Lineup für die Web-App.

    Vergleicht das generierte Modell-Lineup mit dem optimal möglichen Lineup
    (basierend auf tatsächlichen Punkten) für eine historische GW.

    Args:
        season: Season im Format "2021-22"
        gw: Gameweek-Nummer
        methode: Prediction-Methode (rf, ma3, pos)

    Returns:
        Dict mit:
        - evaluation_possible: bool
        - error_message: str | None
        - model_lineup: {...}
        - model_actual_points: float
        - optimal_lineup: {...}
        - optimal_points: float
        - delta: float (negativ = Modell schlechter)
        - efficiency_percent: float

    Verwendung in Maturaarbeit:
    - Zeigt wie nah das Modell am theoretischen Optimum ist
    - Validiert ob ML-Vorhersagen besser sind als Zufall
    - Ermöglicht Vergleich verschiedener Methoden (rf vs ma3 vs pos)
    """
    ROOT = Path(__file__).resolve().parents[1]
    DATA_DIR = ROOT / "data"
    OUT_DIR = ROOT / "out"

    # Qualitätsprüfung: Nur 2020-24 erlaubt
    quality_path = DATA_DIR / "season_quality.json"
    if quality_path.exists():
        with open(quality_path, "r", encoding="utf-8") as f:
            quality_data = json.load(f)
            season_info = quality_data["seasons"].get(season)

            if not season_info or not season_info["usable"]:
                return {
                    "evaluation_possible": False,
                    "error_message": f"Season {season} hat unzureichende Datenqualität. Nur 2020-21 bis 2023-24 unterstützt.",
                    "model_lineup": {},
                    "model_actual_points": 0.0,
                    "optimal_lineup": {},
                    "optimal_points": 0.0,
                    "delta": 0.0,
                    "efficiency_percent": 0.0,
                }

    try:
        # 1. Lade tatsächliche Resultate für diese GW
        cleaned_path = DATA_DIR / f"cleaned_merged_gw_{season}.csv"
        original_path = DATA_DIR / f"merged_gw_{season}.csv"
        csv_path = cleaned_path if cleaned_path.exists() else original_path

        if not csv_path.exists():
            raise FileNotFoundError(f"Keine Daten für Season {season} gefunden")

        df_full = pd.read_csv(csv_path)

        # Standardisiere Spaltennamen
        rename_map = {
            "element": "player_id",
            "round": "gw",
            "total_points": "points",
            "value": "price",
            "position": "pos",
        }
        df_full = df_full.rename(
            columns={k: v for k, v in rename_map.items() if k in df_full.columns}
        )

        actual_results = df_full[df_full["gw"] == gw].copy()

        if actual_results.empty:
            raise ValueError(f"Keine Daten für GW{gw} in Season {season} gefunden")

        # 2. Lade Modell-Lineup
        lineup_path = OUT_DIR / f"lineup_gw{gw}_{methode}.json"

        if not lineup_path.exists():
            raise FileNotFoundError(
                f"Kein Lineup gefunden. Generiere zuerst Predictions und Lineup für {season} GW{gw} mit Methode {methode}."
            )

        with open(lineup_path, "r", encoding="utf-8") as f:
            model_lineup = json.load(f)

        # 3. Berechne tatsächliche Punkte des Modell-Lineups
        xi_ids = model_lineup.get("xi_ids", [])
        captain_id = model_lineup.get("captain_id")

        model_players = actual_results[actual_results["player_id"].isin(xi_ids)]
        model_actual_points = model_players["points"].sum()

        # Captain bekommt doppelte Punkte
        if captain_id:
            captain_pts = actual_results[actual_results["player_id"] == captain_id][
                "points"
            ].values
            if len(captain_pts) > 0:
                model_actual_points += captain_pts[0]  # +1x extra für Captain

        # 4. Finde optimales Lineup (Hindsight mit echten Punkten)
        # Nutze pick_lineup_autoformation mit echten Punkten statt Predictions
        # Imports zur Runtime (vermeidet Linter-Fehler)
        from code.utils.season_rules import load_rules  # type: ignore
        from code.lineup.auto_formation_cli_v2 import pick_lineup_autoformation  # type: ignore

        rules = load_rules(season)
        budget = rules["squad"]["budget"]
        max_per_club = rules["squad"]["max_from_club"]

        # Bereite Daten für Optimierung vor (nutze echte Punkte als "predictions")
        pool_df = actual_results[
            ["player_id", "name", "pos", "team", "price", "points"]
        ].copy()
        pool_df = pool_df.rename(columns={"points": "predicted_points"})

        # Rufe Lineup-Optimizer mit echten Punkten auf
        optimal_result = pick_lineup_autoformation(
            predictions=pool_df,
            budget=budget,
            max_per_club=max_per_club,
            constraints=None,
        )

        optimal_lineup = {
            "xi_ids": optimal_result.get("xi_ids", []),
            "formation": optimal_result.get("formation", ""),
            "captain_id": optimal_result.get("captain_id"),
            "total_cost": optimal_result.get("total_cost", 0.0),
        }

        optimal_xi_ids = optimal_lineup["xi_ids"]
        optimal_captain_id = optimal_lineup["captain_id"]

        # 5. Berechne optimale Punkte
        optimal_players = actual_results[
            actual_results["player_id"].isin(optimal_xi_ids)
        ]
        optimal_points = optimal_players["points"].sum()

        # Captain-Bonus
        if optimal_captain_id:
            capt_pts = actual_results[
                actual_results["player_id"] == optimal_captain_id
            ]["points"].values
            if len(capt_pts) > 0:
                optimal_points += capt_pts[0]

        # 6. Delta und Effizienz
        delta = model_actual_points - optimal_points
        efficiency = (
            (model_actual_points / optimal_points * 100) if optimal_points > 0 else 0
        )

        return {
            "evaluation_possible": True,
            "error_message": None,
            "season": season,
            "gw": gw,
            "methode": methode,
            "model_lineup": model_lineup,
            "model_actual_points": float(model_actual_points),
            "optimal_lineup": optimal_lineup,
            "optimal_points": float(optimal_points),
            "delta": float(delta),
            "efficiency_percent": float(efficiency),
        }

    except Exception as e:
        return {
            "evaluation_possible": False,
            "error_message": f"Fehler bei Evaluation: {str(e)}",
            "model_lineup": {},
            "model_actual_points": 0.0,
            "optimal_lineup": {},
            "optimal_points": 0.0,
            "delta": 0.0,
            "efficiency_percent": 0.0,
        }


if __name__ == "__main__":
    main()
