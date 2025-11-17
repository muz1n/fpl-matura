#!/usr/bin/env python3
"""Team-Backtest: Vergleich RF vs. MA3 vs. POS via Teamselektion.

Eigenstaendiges Skript ohne Repo-Imports.
Verwendet nur Stdlib + pandas + matplotlib.

Budget-Modell:
- Maximales Gesamtbudget 100.0 fuer den 15-Mann-Kader
- Maximal 3 Spieler pro Klub (FPL-Regel)
- Gierige Auswahl: Spieler nach prognostizierten Punkten absteigend sortiert
- Ein Spieler wird nur hinzugefuegt, wenn Budget- und Klubgrenzen eingehalten sind

Verwendung:
    python code/team_backtest.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List

import matplotlib.pyplot as plt
import pandas as pd

# Pfade einrichten
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Gueltige FPL-Formationen (DEF-MID-FWD)
VALID_FORMATIONS = ["3-4-3", "3-5-2", "4-4-2", "4-3-3", "4-5-1", "5-4-1", "5-3-2"]

# Positionsanforderungen pro Formation
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
    """Ladet Prognosen aus JSON fuer eine bestimmte Spielwoche.

    Args:
        gw: Spielwochen-Nummer
        method: Prognosemethode (rf, ma3, pos)

    Returns:
        DataFrame mit Spalten [player_id, name, pos, team, predicted_points, price]
        oder None, falls Datei nicht gefunden
    """
    pred_file = OUT_DIR / f"predictions_gw{gw}_{method}.json"

    if not pred_file.exists():
        logger.warning(
            f"GW{gw} ({method}): Prediction file not found: {pred_file.name}"
        )
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
    """Ladet echte Punktedaten fuer eine Saison.

    Args:
        season: Saisonstring (z.B. "2023-24", "2022-23")

    Returns:
        DataFrame mit Spalten [gw, player_id, points] oder None, falls nicht gefunden
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

        # Verschiedene Spaltenkonventionen handhaben
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

        # Pflichtspalten sicherstellen
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

        # Daten bereinigen
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


def build_candidate_pool(
    df_pred: pd.DataFrame, max_budget: float = 100.0, max_per_club: int = 3
) -> pd.DataFrame:
    """Erstellt aus Prognosen einen 15-Spieler-Kader.

    Nimmt die Top-N Spieler pro Position nach predicted_points:
    GK=2, DEF=5, MID=5, FWD=3

    Erzwingt Budgetgrenze (max_budget) und Klubgrenze (max_per_club).

    Args:
        df_pred: DataFrame mit Prognosen
        max_budget: Max. Gesamtbudget fuer den 15er-Kader (Standard 100.0)
        max_per_club: Max. Spieler desselben Klubs (Standard 3)

    Returns:
        DataFrame mit 15 Spielern (oder weniger, falls nicht erfuellbar)
    """
    pool_limits = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}

    # Alle Kandidaten nach prognostizierten Punkten absteigend sortieren
    df_sorted = df_pred.sort_values("predicted_points", ascending=False).copy()

    selected_players = []
    current_budget = 0.0
    club_counts = {}
    position_counts = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}

    for _, player in df_sorted.iterrows():
        pos = player["pos"]
        club = player["team"]
        price = player["price"]

        # Positionslimit pruefen
        if position_counts.get(pos, 0) >= pool_limits.get(pos, 0):
            continue

        # Klubgrenze pruefen
        if club_counts.get(club, 0) >= max_per_club:
            continue

        # Budgetgrenze pruefen
        if current_budget + price > max_budget:
            continue

        # Spieler dem Pool hinzufuegen
        selected_players.append(player)
        current_budget += price
        club_counts[club] = club_counts.get(club, 0) + 1
        position_counts[pos] = position_counts.get(pos, 0) + 1

        # Stoppen, sobald 15 Spieler erreicht
        if len(selected_players) == 15:
            break

    pool = pd.DataFrame(selected_players)

    logger.debug(
        f"Candidate pool: {len(pool)} players - "
        + ", ".join(
            [
                f"{pos}={len(pool[pool['pos']==pos])}"
                for pos in ["GK", "DEF", "MID", "FWD"]
            ]
        )
        + f" - Budget: {current_budget:.1f}/{max_budget:.1f}"
    )

    return pool


def pick_xi_for_formation(
    candidates: pd.DataFrame,
    formation: str,
    max_per_club: int = 3,
    max_budget: float = 100.0,
) -> tuple[List[int], float] | None:
    """Waehlt die beste Startelf fuer eine Formation unter Einhaltung der Regeln.

    Args:
        candidates: DataFrame der Kandidaten
        formation: Formation (z.B. "4-4-2")
        max_per_club: Max. Spieler je Klub (Standard 3)
        max_budget: Max. Budget fuer die Startelf (Standard 100.0)

    Returns:
        Tupel (Liste von 11 player_ids, verwendetes Budget) oder None bei Scheitern
    """
    if formation not in FORMATION_SLOTS:
        logger.error(f"Unknown formation: {formation}")
        return None

    slots = FORMATION_SLOTS[formation].copy()
    xi = []
    club_counts = {}
    current_budget = 0.0

    # Kandidaten nach prognostizierten Punkten absteigend sortieren
    sorted_candidates = candidates.sort_values("predicted_points", ascending=False)

    for _, player in sorted_candidates.iterrows():
        pos = player["pos"]
        club = player["team"]
        player_id = int(player["player_id"])
        price = player["price"]

        # Pruefen, ob diese Position noch benoetigt ist
        if slots.get(pos, 0) <= 0:
            continue

        # Klubgrenze pruefen
        if club_counts.get(club, 0) >= max_per_club:
            continue

        # Budgetgrenze pruefen
        if current_budget + price > max_budget:
            logger.debug(
                f"  Budget limit: Skipping {player['name']} ({pos}, {price:.1f}) "
                f"- would exceed budget ({current_budget:.1f} + {price:.1f} > {max_budget:.1f})"
            )
            continue

        # Zur Startelf hinzufuegen
        xi.append(player_id)
        slots[pos] -= 1
        club_counts[club] = club_counts.get(club, 0) + 1
        current_budget += price

        # Pruefen, ob die Startelf komplett ist
        if len(xi) == 11:
            break

    # Validieren, dass alle Positionen besetzt sind
    if len(xi) != 11 or any(v > 0 for v in slots.values()):
        logger.debug(
            f"Formation {formation}: Could not fill all slots (got {len(xi)}/11, budget: {current_budget:.1f})"
        )
        return None

    return xi, current_budget


def evaluate_xi(
    xi_ids: List[int], truth_gw_df: pd.DataFrame, pred_df: pd.DataFrame
) -> Dict:
    """Bewertet eine Startelf anhand echter Punkte und waehlt den Captain.

    Args:
        xi_ids: Liste mit 11 player_ids der Startelf
        truth_gw_df: Echte Punkte fuer diese Spielwoche
        pred_df: Prognosen (zur Captain-Auswahl nach predicted points)

    Returns:
        Dict mit xi_points (inkl. Captain-Bonus), captain_id, vice_id
    """
    # Echte Punkte fuer Startelf-Spieler holen
    xi_truth = truth_gw_df[truth_gw_df["player_id"].isin(xi_ids)].copy()

    # Prognosen fuer die Startelf, um den Captain zu bestimmen
    xi_pred = pred_df[pred_df["player_id"].isin(xi_ids)].copy()
    xi_pred = xi_pred.sort_values("predicted_points", ascending=False)

    captain_id = int(xi_pred.iloc[0]["player_id"]) if len(xi_pred) > 0 else None
    vice_id = int(xi_pred.iloc[1]["player_id"]) if len(xi_pred) > 1 else captain_id

    # Gesamtpunkte berechnen
    base_points = xi_truth["points"].sum()

    # Captain-Bonus addieren (Captain erhaelt doppelte Punkte)
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
    pred_df: pd.DataFrame, truth_gw_df: pd.DataFrame, max_budget: float = 100.0
) -> Dict | None:
    """Waehlt das beste Team (Startelf + Formation) fuer eine Spielwoche.

    Args:
        pred_df: Prognosen fuer alle Spieler dieser GW
        truth_gw_df: Echte Punkte dieser GW
        max_budget: Max. Budget fuer das Team (Standard 100.0)

    Returns:
        Dict mit Teamdetails oder None bei Fehlschlag
    """
    # Kandidatenpool (15 Spieler) unter Budgetgrenze bilden
    candidates = build_candidate_pool(pred_df, max_budget=max_budget)

    if len(candidates) < 11:
        logger.warning(f"Insufficient candidates: {len(candidates)}")
        return None

    # Mit echten Daten mergen, um nur Spieler mit Resultaten zu behalten
    candidates = candidates.merge(
        truth_gw_df[["player_id"]], on="player_id", how="inner"
    )

    if len(candidates) < 11:
        logger.warning(f"Insufficient candidates with truth data: {len(candidates)}")
        return None

    # Alle Formationen testen und nach prognostizierten Punkten beste waehlen
    best_formation = None
    best_xi = None
    best_predicted_total = -1
    best_budget_used = 0.0

    for formation in VALID_FORMATIONS:
        result = pick_xi_for_formation(
            candidates, formation, max_per_club=3, max_budget=max_budget
        )

        if result is None:
            continue

        xi_ids, budget_used = result

        # Prognostizierte Gesamtsumme fuer diese Startelf berechnen
        xi_pred = candidates[candidates["player_id"].isin(xi_ids)]
        predicted_total = xi_pred["predicted_points"].sum()

        if predicted_total > best_predicted_total:
            best_predicted_total = predicted_total
            best_formation = formation
            best_xi = xi_ids
            best_budget_used = budget_used

    if best_xi is None:
        logger.warning("No valid formation found")
        return None

    # Nun mit echten Punkten bewerten
    eval_result = evaluate_xi(best_xi, truth_gw_df, candidates)

    return {
        "formation": best_formation,
        "xi_ids": best_xi,
        "xi_points": eval_result["xi_points"],
        "captain_id": eval_result["captain_id"],
        "vice_id": eval_result["vice_id"],
        "n_truth_matched": eval_result["n_truth_matched"],
        "n_candidates": len(candidates),
        "budget_used": best_budget_used,
    }


def run_backtest(season: str, gw_start: int, gw_end: int, methods: List[str]) -> None:
    """Fuehrt Team-Backtest aus und erzeugt Ausgaben.

    Args:
        season: Saisonstring (z.B. "2023-24")
        gw_start: Erste Spielwoche
        gw_end: Letzte Spielwoche (inklusive)
        methods: Liste der Methoden (z.B. ["rf", "ma3", "pos"])
    """
    logger.info("=" * 70)
    logger.info(f"Team Backtest: {season}, GW{gw_start}-{gw_end}")
    logger.info(f"Methods: {', '.join(methods)}")
    logger.info("=" * 70)

    # Echte Daten einmal laden
    truth_df = load_truth(season)
    if truth_df is None:
        logger.error("Cannot proceed without truth data")
        return

    results = []

    for gw in range(gw_start, gw_end + 1):
        logger.info(f"\n{'='*70}")
        logger.info(f"GW{gw}")
        logger.info(f"{'='*70}")

        # Echte Daten fuer diese GW holen
        truth_gw = truth_df[truth_df["gw"] == gw].copy()

        if truth_gw.empty:
            logger.warning(f"GW{gw}: No truth data available, skipping")
            continue

        logger.info(f"GW{gw}: {len(truth_gw)} players with true points")

        for method in methods:
            logger.info(f"\n  Method: {method.upper()}")

            # Prognosen laden
            pred_df = load_predictions(gw, method)
            if pred_df is None:
                logger.warning(f"  GW{gw} ({method}): No predictions, skipping")
                continue

            # Team auswaehlen
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
                        "budget_used": 0.0,
                        "notes": "Selection failed",
                    }
                )
                continue

            logger.info(
                f"  → {team_result['formation']}: "
                f"{team_result['xi_points']:.1f} pts "
                f"(C={team_result['captain_id']}) "
                f"Budget: {team_result['budget_used']:.1f}/100.0"
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
                    "budget_used": team_result["budget_used"],
                    "notes": "OK",
                }
            )

    if not results:
        logger.error("No results generated!")
        return

    # Detaillierten Ergebnis-DataFrame erstellen
    results_df = pd.DataFrame(results)

    # Detaillierte Resultate speichern
    detail_filename = f"team_backtest_{season}_gw{gw_start}-{gw_end}.csv"
    detail_path = OUT_DIR / detail_filename
    results_df.to_csv(detail_path, index=False)
    logger.info(f"\n✓ Saved detailed results: {detail_filename}")

    # Zusammenfassende Statistik berechnen
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

    # Zusammenfassung speichern
    summary_filename = f"team_backtest_summary_{season}_gw{gw_start}-{gw_end}.csv"
    summary_path = OUT_DIR / summary_filename
    summary_df.to_csv(summary_path, index=False)
    logger.info(f"✓ Saved summary: {summary_filename}")

    # Zusammenfassung anzeigen
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
    """Erstellt ein Balkendiagramm zum Methodenvergleich.

    Args:
        summary_df: DataFrame mit Zusammenfassungsstatistik
        season: Saisonstring
        gw_start: Erste Spielwoche
        gw_end: Letzte Spielwoche
    """
    if summary_df.empty:
        logger.warning("No data to plot")
        return

    plt.figure(figsize=(10, 6))

    methods = summary_df["method"].tolist()
    avg_points = summary_df["avg_xi_points"].tolist()
    std_points = summary_df["std_xi_points"].fillna(0).tolist()

    # Unterschiedliche Farben verwenden
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"][: len(methods)]

    # Balkendiagramm erstellen
    bars = plt.bar(
        methods, avg_points, color=colors, alpha=0.8, edgecolor="black", linewidth=1.5
    )

    # Fehlerbalken hinzufuegen
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

    # Wertebeschriftungen auf die Balken setzen
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

    # Grafik speichern
    plot_filename = f"team_backtest_{season}_gw{gw_start}-{gw_end}.png"
    plot_path = OUT_DIR / plot_filename
    plt.savefig(plot_path, dpi=300, bbox_inches="tight")
    logger.info(f"✓ Saved plot: {plot_filename}")
    plt.close()


def main():
    """Haupteinstiegspunkt."""
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
