#!/usr/bin/env python3
"""Team-Backtest: Vergleich verschiedener Prognose-Methoden via Teamselektion.

Unterstuetzte Methoden jetzt: rf, rf_relaxed, ma3, pos, rf_pos, rf_rank, rf_filled, rf_optfill

rf_optfill = Spezielle Variante: Bei Selection-Fail wird POS als Fallback genutzt (Optimizer-Level)

Eigenstaendiges Skript ohne Repo-Imports.
Verwendet nur Stdlib + pandas + matplotlib.

Budget-Modell:
- Maximales Gesamtbudget 100.0 fuer den 15-Mann-Kader
- Maximal 3 Spieler pro Klub (FPL-Regel)
- Gierige Auswahl: Spieler nach prognostizierten Punkten absteigend sortiert
- Ein Spieler wird nur hinzugefuegt, wenn Budget- und Klubgrenzen eingehalten sind

Verwendung:
    python code/team_backtest.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf rf_optfill
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import pandas as pd

# Pfade einrichten
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Season-Rules PATH Setup (muss vor Import sein)
CODE_DIR = ROOT / "code"
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

# Lokale Imports nach sys.path Setup
from utils.season_rules import load_rules  # noqa: E402

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


def prediction_filename(season: str, gw: int, method: str) -> Path:
    """Erzeugt konsistenten Dateinamen fuer Prognosedateien mit Season-Prefix."""
    return OUT_DIR / "predictions" / f"predictions_{season}_gw{gw}_{method}.json"


def load_predictions(season: str, gw: int, method: str) -> pd.DataFrame | None:
    """Ladet Prognosen aus JSON fuer eine bestimmte Spielwoche.

    Unterstuetzt zwei Formate:
    1) Neues Schema: {"players": [...]} mit player_id, pos etc.
    2) Listen-Format (rf_pos / rf_rank): [{name, team, position, predicted_points, ...}]

    Fehlende Pflichtspalten werden spaeter via Merge mit Truth-Daten angereichert.

    Args:
        season: Saisonstring, Teil des Dateinamens
        gw: Spielwochen-Nummer
        method: Prognosemethode (rf, ma3, pos, rf_pos, rf_rank)

    Returns:
        DataFrame idealerweise mit Spalten [player_id, name, pos, team, predicted_points, price]
        oder zumindest Grundspalten fuer spaetere Anreicherung.
    """
    pred_file = prediction_filename(season, gw, method)

    if not pred_file.exists():
        logger.warning(
            f"GW{gw} ({method}): Prediction file not found: {pred_file.name}"
        )
        return None

    try:
        with open(pred_file, "r", encoding="utf-8") as f:
            raw = json.load(f)

        # Format erkennen
        if isinstance(raw, dict):
            players = raw.get("players")
            if players is None:
                # Vielleicht direkt Player-Liste unter anderem Key?
                # Falls keine Liste gefunden: Fehlermeldung
                for v in raw.values():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        players = v
                        break
            if players is None:
                logger.error(f"GW{gw} {season} ({method}): Unbekanntes Dict-Format")
                return None
            df = pd.DataFrame(players)
        elif isinstance(raw, list):
            if not raw:
                logger.warning(f"GW{gw} {season} ({method}): Leere Liste")
                return None
            if not isinstance(raw[0], dict):
                logger.error(
                    f"GW{gw} {season} ({method}): Listen-Format ohne Dict-Eintraege"
                )
                return None
            df = pd.DataFrame(raw)
        else:
            logger.error(
                f"GW{gw} {season} ({method}): Unerwartetes JSON-Root ({type(raw)})"
            )
            return None

        # Standardisierung der Spaltennamen
        if "position" in df.columns and "pos" not in df.columns:
            df["pos"] = df["position"]
        if "element" in df.columns and "player_id" not in df.columns:
            df["player_id"] = df["element"]
        if "total_points" in df.columns and "predicted_points" not in df.columns:
            # Manche Modelle koennen total_points als Proxy nutzen
            df["predicted_points"] = df["total_points"]

        if "name" not in df.columns:
            df["name"] = "Unknown"
        if "team" not in df.columns:
            df["team"] = "Unknown"

        # rf_pos hat keinen player_id / price -> spaetere Anreicherung
        missing_core = [
            c
            for c in ["player_id", "predicted_points", "pos", "team"]
            if c not in df.columns
        ]
        if missing_core:
            logger.warning(
                f"GW{gw} {season} ({method}): Fehlende Kernspalten {missing_core} - versuche spaetere Anreicherung"
            )

        if "price" not in df.columns:
            # Platzhalter, echte Preise werden bei Name-Merge gesetzt
            df["price"] = None

        # Nur relevante Spalten behalten (weitere koennen existieren)
        keep_cols = [
            c
            for c in ["player_id", "name", "pos", "team", "predicted_points", "price"]
            if c in df.columns
        ]
        df = df[keep_cols].copy()
        logger.info(f"GW{gw} {season} ({method}): Loaded {len(df)} predictions (roh)")
        return df
    except Exception as e:
        logger.error(f"GW{gw} {season}: Error loading predictions: {e}")
        return None


def load_truth(season: str) -> pd.DataFrame | None:
    """Ladet echte Punktedaten fuer eine Saison.

    Bevorzugt bereinigte Dateien (cleaned_merged_gw_*.csv) um Duplikate zu vermeiden.

    Args:
        season: Saisonstring (z.B. "2023-24", "2022-23")

    Returns:
        DataFrame mit mindestens Spalten [gw, player_id, points] und – falls vorhanden –
        Zusatzspalten wie [pos, team, price, name]. Diese Zusatzspalten sind fuer die
        Berechnung des Hindsight-Optimums nuetzlich (Budget/Club/Formation basierend
        auf echten Punkten).
    """
    # Bevorzuge bereinigte Datei, dann Original
    possible_files = [
        DATA_DIR / f"cleaned_merged_gw_{season}.csv",  # Bevorzugt: bereinigt
        DATA_DIR / f"merged_gw_{season}.csv",  # Fallback: Original
        DATA_DIR / f"{season}_player_gw.csv",  # Alt
        DATA_DIR / "cleaned_merged_gw_2022-23.csv",  # Fallback
        DATA_DIR / "merged_gw_2022-23.csv",  # Fallback
    ]

    truth_file = None
    for f in possible_files:
        if f.exists():
            truth_file = f
            is_cleaned = "cleaned_" in f.name
            status = (
                "✓ bereinigte Daten"
                if is_cleaned
                else "⚠ Original-Daten (mit Duplikaten)"
            )
            logger.info(f"Using truth file: {f.name} [{status}]")
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

        # Falls durch Umbenennung doppelte 'gw' Spalten entstehen (z.B. sowohl 'GW' als auch 'round')
        if (df.columns == "gw").sum() > 1:
            gw_cols = [c for c in df.columns if c == "gw"]
            # Erste nicht-null Werte pro Zeile behalten
            combined_gw = df[gw_cols].bfill(axis=1).iloc[:, 0]
            df = df.drop(columns=gw_cols).assign(gw=combined_gw)

        # Gleiches Vorgehen fuer 'points' falls Duplikate nach Umbenennung
        if (df.columns == "points").sum() > 1:
            pts_cols = [c for c in df.columns if c == "points"]
            combined_pts = df[pts_cols].bfill(axis=1).iloc[:, 0]
            df = df.drop(columns=pts_cols).assign(points=combined_pts)

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
        # Falls Mehrfachspalten weiterhin existieren (MultiIndex / Duplikate) explizit extrahieren
        # Nach Zusammenfuehrung oben sollten 'gw' und 'points' eindeutige Series sein.
        # Falls doch DataFrames durch Duplikate uebrig bleiben, verwende squeeze().
        if isinstance(df["gw"], pd.DataFrame):  # type: ignore[index]
            df["gw"] = df["gw"].bfill(axis=1).squeeze()  # type: ignore[assignment]
        if isinstance(df["points"], pd.DataFrame):  # type: ignore[index]
            df["points"] = df["points"].bfill(axis=1).squeeze()  # type: ignore[assignment]
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
        # Zusatzspalten falls vorhanden beibehalten
        keep_cols = ["gw", "player_id", "points"]
        for extra in ["pos", "team", "price", "name"]:
            if extra in df.columns:
                keep_cols.append(extra)
        result_df = df[keep_cols].copy()
        return result_df

    except Exception as e:
        import traceback

        logger.error(f"Error loading truth file: {e}")
        logger.error(traceback.format_exc())
        return None


def build_candidate_pool(
    df_pred: pd.DataFrame, max_budget: float = 1000.0, max_per_club: int = 3
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

    # Debug: Check input data
    logger.info(f"build_candidate_pool: {len(df_pred)} predictions")
    if len(df_pred) > 0:
        logger.info(f"  Positions: {df_pred['pos'].value_counts().to_dict()}")

        # Check for NaN prices
        nan_prices = df_pred["price"].isna().sum()
        if nan_prices > 0:
            logger.warning(f"  WARNING: {nan_prices} predictions have NaN price!")

        non_nan_prices = df_pred["price"].dropna()
        if len(non_nan_prices) > 0:
            logger.info(
                f"  Price range: {non_nan_prices.min():.1f} - {non_nan_prices.max():.1f}"
            )
        else:
            logger.warning("  WARNING: ALL prices are NaN!")

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

    # DataFrame aus Liste von Series erstellen (reset index)
    if not selected_players:
        return pd.DataFrame()

    pool = pd.DataFrame(selected_players).reset_index(drop=True)

    # Debug-Logging nur wenn pool nicht leer
    if len(pool) > 0:
        pos_counts = {
            pos: len(pool[pool["pos"] == pos])
            for pos in ["GK", "DEF", "MID", "FWD"]
            if pos in pool["pos"].values
        }
        logger.debug(
            f"Candidate pool: {len(pool)} players - "
            + ", ".join([f"{pos}={count}" for pos, count in pos_counts.items()])
            + f" - Budget: {current_budget:.1f}/{max_budget:.1f}"
        )

    return pool


def pick_xi_for_formation(
    candidates: pd.DataFrame,
    formation: str,
    max_per_club: int = 3,
    max_budget: float = 1000.0,
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


def compute_hindsight_optimum(
    truth_gw_df: pd.DataFrame,
    max_budget: float = 1000.0,
    max_per_club: int = 3,
) -> Dict | None:
    """Berechnet das Hindsight-Optimum fuer eine Spielwoche.

    Verwendet echte Punkte als "predicted_points" und waehlt analog zum normalen
    Selektionsprozess die beste Formation + Captain (Captain = Spieler mit den
    meisten echten Punkten in der gewaehlten XI).

    Annahmen:
    - Falls Spalten fuer Preis / Team / Position fehlen, kann keine Auswahl erfolgen.
    - Die Budget- und Klubgrenzen orientieren sich an Season-Rules.

    Returns:
        Dict mit Keys [formation, xi_ids, xi_points, captain_id, budget_used] oder None.
    """
    needed = ["player_id", "pos", "team", "price"]
    # Anreicherung falls Pflichtspalten fehlen
    for col in needed:
        if col not in truth_gw_df.columns:
            logger.warning(
                f"Hindsight-Optimum: Pflichtspalte {col} fehlt in truth_gw_df"
            )
            return None
    # Echte Punkte als predicted_points
    candidates = truth_gw_df.copy()
    candidates["predicted_points"] = candidates["points"]
    # Alle Formationen testen
    best_formation = None
    best_xi = None
    best_total = -1
    best_budget = 0.0
    for formation in VALID_FORMATIONS:
        result = pick_xi_for_formation(
            candidates, formation, max_per_club=max_per_club, max_budget=max_budget
        )
        if result is None:
            continue
        xi_ids, budget_used = result
        xi_df = candidates[candidates["player_id"].isin(xi_ids)]
        total_points = xi_df["points"].sum()
        if total_points > best_total:
            best_total = total_points
            best_formation = formation
            best_xi = xi_ids
            best_budget = budget_used
    if best_xi is None:
        logger.warning("Hindsight-Optimum: Keine gueltige Formation gefunden")
        return None
    xi_df = candidates[candidates["player_id"].isin(best_xi)].copy()
    xi_df = xi_df.sort_values("points", ascending=False)
    captain_id = int(xi_df.iloc[0]["player_id"]) if len(xi_df) > 0 else None
    return {
        "formation": best_formation,
        "xi_ids": best_xi,
        "xi_points": best_total,
        "captain_id": captain_id,
        "budget_used": best_budget,
    }


def select_best_team_for_gw(
    pred_df: pd.DataFrame,
    truth_gw_df: pd.DataFrame,
    max_budget: float = 1000.0,
    max_per_club: int = 3,
) -> Dict | None:
    """Waehlt das beste Team (Startelf + Formation) fuer eine Spielwoche.

    Args:
        pred_df: Prognosen fuer alle Spieler dieser GW
        truth_gw_df: Echte Punkte dieser GW (fuer Validierung / Anreicherung)
        max_budget: Budget-Limit (default 100.0)
        max_per_club: Max. Spieler desselben Klubs (default 3)

    Returns:
        Dict mit formation, xi_ids, xi_points, captain_id etc. oder None bei Fehler
    """
    needed = ["player_id", "pos", "team", "price"]

    # Prüfe, welche Felder fehlen
    missing_fields = [
        col for col in needed if col not in pred_df.columns or pred_df[col].isna().all()
    ]

    # Falls Felder fehlen: Merge mit truth_gw_df
    if missing_fields:
        logger.info(f"Anreicherung: Fehlende Felder {missing_fields}, starte Merge")

        # Merge nach name, team, pos (am präzisesten)
        truth_basic = truth_gw_df[["player_id", "name", "pos", "team", "price"]].dropna(
            subset=["name", "team", "pos"]
        )

        pred_df = pred_df.merge(
            truth_basic,
            on=["name", "team", "pos"],
            how="left",
            suffixes=("", "_truth"),
        )

        # Übernehme _truth Felder in Hauptspalten
        if "player_id_truth" in pred_df.columns:
            if "player_id" in pred_df.columns:
                pred_df["player_id"] = pred_df["player_id"].fillna(
                    pred_df["player_id_truth"]
                )
            else:
                pred_df["player_id"] = pred_df["player_id_truth"]

        for c in ["pos", "team", "price"]:
            source_col = f"{c}_truth"
            if source_col in pred_df.columns:
                if c in pred_df.columns:
                    pred_df[c] = pred_df[c].fillna(pred_df[source_col])
                else:
                    pred_df[c] = pred_df[source_col]

        # Cleanup _truth columns
        drop_cols = [c for c in pred_df.columns if c.endswith("_truth")]
        if drop_cols:
            pred_df = pred_df.drop(columns=drop_cols)

        matched = (
            pred_df["player_id"].notna().sum() if "player_id" in pred_df.columns else 0
        )
        matched_with_price = (
            pred_df["price"].notna().sum() if "price" in pred_df.columns else 0
        )
        logger.info(
            f"Anreicherung: Matched {matched}/{len(pred_df)} players via name+team+pos"
        )
        logger.info(f"  - player_id: {matched}/{len(pred_df)} filled")
        logger.info(f"  - price: {matched_with_price}/{len(pred_df)} filled")

        if matched_with_price < len(pred_df):
            logger.warning(
                f"  - WARNUNG: {len(pred_df) - matched_with_price} Spieler haben keinen Preis!"
            )

        # Preis-Fallback für noch fehlende Preise
        if "price" in pred_df.columns and pred_df["price"].isna().any():
            avg_price = (
                truth_gw_df["price"].dropna().mean()
                if "price" in truth_gw_df.columns
                else 6.0
            )
            pred_df["price"] = pred_df["price"].fillna(avg_price)

        # Fallback: Wenn nach Anreicherung < 50 Spieler mit gueltiger ID, nimm alle Spieler aus truth_gw_df
        valid_ids = (
            pred_df["player_id"].notna().sum() if "player_id" in pred_df.columns else 0
        )
        if valid_ids < 50:
            logger.warning(
                f"Anreicherung: Weniger als 50 Spieler mit ID nach Merge ({valid_ids}), Fallback auf truth_gw_df"
            )
            fallback_df = truth_gw_df.copy()
            fallback_df["predicted_points"] = None
            pred_map = pred_df.set_index(["name", "team", "pos"])
            for idx, row in fallback_df.iterrows():
                key = (row["name"], row["team"], row["pos"])
                if key in pred_map.index and "predicted_points" in pred_map.columns:
                    fallback_df.loc[idx, "predicted_points"] = pred_map.loc[key, "predicted_points"]  # type: ignore
            fallback_df["notes"] = "Fallback: truth_gw_df verwendet"
            pred_df = fallback_df

        # Entferne Spieler ohne ID (nach allen Matching-Versuchen)
        if "player_id" in pred_df.columns and pred_df["player_id"].isna().any():
            removed = pred_df[pred_df["player_id"].isna()].shape[0]
            if removed > 0:
                pred_df = pred_df[pred_df["player_id"].notna()].copy()
                logger.warning(
                    f"Anreicherung: Entferne {removed} Spieler ohne player_id"
                )
    # Kandidatenpool erstellen
    candidates = build_candidate_pool(
        pred_df, max_budget=max_budget, max_per_club=max_per_club
    )
    if len(candidates) < 11:
        logger.warning(f"Insufficient candidates: {len(candidates)}")
        return None
    # Mit echten Daten mergen, um nur Spieler mit Resultaten zu behalten
    truth_player_ids = truth_gw_df[["player_id"]].copy()
    candidates = candidates.merge(truth_player_ids, on="player_id", how="inner")
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
    # Season-Rules laden
    try:
        rules = load_rules(season)
        max_budget = rules.squad.budget
        max_per_club = rules.squad.max_from_club
        logger.info(f"Season {season} - Budget: {max_budget}, Max/Club: {max_per_club}")
    except Exception as e:
        logger.warning(f"Could not load rules for {season}, using defaults: {e}")
        max_budget = 1000.0
        max_per_club = 3

    logger.info("=" * 70)
    logger.info(f"Team Backtest: {season}, GW{gw_start}-{gw_end}")
    logger.info(f"Methods: {', '.join(methods)}")
    logger.info(f"Rules: Budget={max_budget}, Max/Club={max_per_club}")
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

        # Hindsight-Optimum berechnen (einmal pro GW)
        optimum = compute_hindsight_optimum(
            truth_gw, max_budget=max_budget, max_per_club=max_per_club
        )
        optimum_points = optimum["xi_points"] if optimum else None
        optimum_captain = optimum["captain_id"] if optimum else None
        optimum_formation = optimum["formation"] if optimum else None

        for method in methods:
            logger.info(f"\n  Method: {method.upper()}")

            # rf_optfill: Spezielle Behandlung mit Fallback
            is_optfill = method == "rf_optfill"
            primary_method = "rf" if is_optfill else method

            # Prognosen laden (primary method)
            pred_df = load_predictions(season, gw, primary_method)
            if pred_df is None:
                logger.warning(f"  GW{gw} ({method}): No predictions, skipping")
                continue

            # Team auswaehlen (mit Season-Rules)
            team_result = select_best_team_for_gw(
                pred_df, truth_gw, max_budget=max_budget, max_per_club=max_per_club
            )

            # rf_optfill Fallback-Logik
            used_fallback = False
            if is_optfill and team_result is None:
                logger.info(
                    f"  GW{gw} (rf_optfill): RF selection failed, trying POS fallback..."
                )

                # Lade POS Predictions als Fallback
                pos_df = load_predictions(season, gw, "pos")
                if pos_df is not None:
                    # Erstelle hybrid predictions: RF wo verfügbar, sonst POS
                    # Merge RF und POS predictions
                    if "player_id" in pred_df.columns and "player_id" in pos_df.columns:
                        # Nutze RF predictions als Basis
                        hybrid_df = pred_df.copy()
                        # Fülle fehlende mit POS hinzu
                        pos_only = pos_df[
                            ~pos_df["player_id"].isin(hybrid_df["player_id"])
                        ]
                        hybrid_df = pd.concat([hybrid_df, pos_only], ignore_index=True)
                    else:
                        # Fallback: nutze POS komplett
                        hybrid_df = pos_df.copy()

                    # Versuche Team-Selektion mit hybrid predictions
                    team_result = select_best_team_for_gw(
                        hybrid_df,
                        truth_gw,
                        max_budget=max_budget,
                        max_per_club=max_per_club,
                    )

                    if team_result is not None:
                        used_fallback = True
                        logger.info(
                            f"  GW{gw} (rf_optfill): ✓ Fallback successful with hybrid RF+POS"
                        )
                    else:
                        logger.warning(f"  GW{gw} (rf_optfill): Fallback also failed")

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
                        "used_fallback": used_fallback if is_optfill else None,
                    }
                )
                continue

            logger.info(
                f"  → {team_result['formation']}: "
                f"{team_result['xi_points']:.1f} pts "
                f"(C={team_result['captain_id']}) "
                f"Budget: {team_result['budget_used']:.1f}/100.0"
                f"{' [FALLBACK USED]' if used_fallback else ''}"
            )

            eff = (
                team_result["xi_points"] / optimum_points
                if optimum_points and optimum_points > 0
                else None
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
                    "optimum_points": optimum_points,
                    "optimum_formation": optimum_formation,
                    "optimum_captain_id": optimum_captain,
                    "efficiency": eff,
                    "notes": team_result.get("notes", ""),
                    "used_fallback": used_fallback if is_optfill else None,
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
    # Unicode Haken entfernt (Windows cp1252 Kompatibilitaet)
    logger.info(f"\nOK Saved detailed results: {detail_filename}")

    # Zusammenfassende Statistik berechnen
    valid_results = results_df[results_df["xi_points"] > 0].copy()

    if len(valid_results) == 0:
        logger.warning(
            "Keine erfolgreichen Team-Auswahlen - keine Summary-Statistik moeglich"
        )
        return

    # Berechne efficiency nur fuer Zeilen, wo es existiert
    agg_operations: Any = {"xi_points": ["mean", "std", "count"]}

    # Fuege efficiency hinzu, falls vorhanden
    if (
        "efficiency" in valid_results.columns
        and valid_results["efficiency"].notna().any()
    ):
        agg_operations["efficiency"] = ["mean"]

    summary_df = valid_results.groupby("method").agg(agg_operations)

    # Flatten multi-level columns
    summary_df.columns = ["_".join(col).strip() for col in summary_df.columns.values]
    summary_df = summary_df.reset_index()

    # Rename to expected column names
    rename_map = {
        "xi_points_mean": "avg_xi_points",
        "xi_points_std": "std_xi_points",
        "xi_points_count": "n_gw",
    }
    if "efficiency_mean" in summary_df.columns:
        rename_map["efficiency_mean"] = "avg_efficiency"

    summary_df = summary_df.rename(columns=rename_map)

    summary_df = summary_df.sort_values("avg_xi_points", ascending=False)

    # Zusammenfassung speichern
    summary_filename = f"team_backtest_summary_{season}_gw{gw_start}-{gw_end}.csv"
    summary_path = OUT_DIR / summary_filename
    summary_df.to_csv(summary_path, index=False)
    logger.info(f"OK Saved summary: {summary_filename}")

    # Zusammenfassung anzeigen
    logger.info("\n" + "=" * 70)
    logger.info("SUMMARY STATISTICS")
    logger.info("=" * 70)
    print("\n" + summary_df.to_string(index=False))

    # Create visualization
    create_comparison_plot(summary_df, season, gw_start, gw_end)

    logger.info("\n" + "=" * 70)
    logger.info("OK Team backtest completed!")
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
    plt.ylabel("Average XI Points (mit Captain-Bonus)", fontsize=13, fontweight="bold")
    plt.title(
        f"Team Backtest: {season} GW{gw_start}-{gw_end}\n"
        f"Average Team Points by Method\n(Effizienz vs. Hindsight nicht im Plot)",
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
    logger.info(f"OK Saved plot: {plot_filename}")
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
        default=["rf", "ma3", "pos"],
        choices=[
            "rf",
            "rf_relaxed",
            "rf_optfill",
            "ma3",
            "pos",
            "rf_pos",
            "rf_rank",
            "rf_filled",
        ],
        help="Prediction methods to compare (rf, ma3, pos, rf_pos, rf_rank, rf_filled)",
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
