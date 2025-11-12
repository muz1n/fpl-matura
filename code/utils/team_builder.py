"""Hilfen zum Bauen von Teams unter FPL-Regeln."""  # Erklaert Ziel der Datei fuer Laien

from __future__ import annotations  # Moderne Typfeatures aktivieren

import logging  # Fuer nachvollziehbare Hinweise
from typing import (
    Dict,
    List,
    Tuple,
    Literal,
    TypedDict,
    Optional,
)  # Typ-Hilfen fuer Rueckgabewerte

import numpy as np  # NumPy fuer Sortierhilfen
import pandas as pd  # Pandas fuer Tabellenoperationen

ALLOWED_FORMATIONS = [  # Erlaubte FPL-Formationen
    "3-4-3",
    "3-5-2",
    "4-4-2",
    "4-5-1",
    "4-3-3",
    "5-3-2",
    "5-4-1",
]

POS_SLOTS = {  # Anzahl Startelfplaetze je Position pro Formation
    "3-4-3": {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "3-5-2": {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "4-4-2": {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "4-5-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "4-3-3": {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "5-3-2": {"GK": 1, "DEF": 5, "MID": 3, "FWD": 2},
    "5-4-1": {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
}  # Abschluss des Blockes


def _prepare_candidates(
    candidates: pd.DataFrame,
) -> pd.DataFrame:  # Sortiert Kandidaten nach Tie-Break-Regeln
    df = candidates.copy()  # Kopie der Kandidaten bilden
    if "pred_points" not in df.columns:  # Falls Prognosewerte fehlen
        logging.warning(
            "pred_points fehlen - verwende 0 als Platzhalter"
        )  # Warnung ausgeben
        df["pred_points"] = 0.0  # Nullwerte einsetzen
    sort_config = [  # Sortierprioritaet definieren
        ("pred_points", False, -np.inf),  # Zuerst nach Prognosepunkten (absteigend)
        ("p90_last", False, -np.inf),  # Danach nach p90_last (absteigend)
        ("price", False, -np.inf),  # Dann nach Preis (absteigend)
        ("player_id", True, np.inf),  # Zuletzt nach Spieler-ID (aufsteigend)
    ]
    sort_cols: List[str] = []  # Liste der Hilfsspalten fuer Sortierung
    ascending: List[bool] = []  # Sortierreihenfolge pro Spalte
    temp_cols: List[str] = []  # Namen der Hilfsspalten zum spaeteren Loeschen
    for col, asc, fill_value in sort_config:  # Ueber jede Regel iterieren
        if col not in df.columns:  # Wenn Spalte fehlt
            continue  # Naechste Regel pruefen
        temp_col = f"__sort_{col}"  # Hilfsspalte benennen
        temp_cols.append(temp_col)  # Namen merken
        sort_cols.append(temp_col)  # In Sortierliste aufnehmen
        ascending.append(asc)  # Passende Richtung merken
        values = pd.to_numeric(
            df[col], errors="coerce"
        )  # Werte robust in Zahlen verwandeln
        df[temp_col] = values.fillna(
            fill_value
        )  # Fehlende Werte durch Default ersetzen
    if sort_cols:  # Nur sortieren wenn Regeln vorhanden
        df = df.sort_values(
            by=sort_cols, ascending=ascending, kind="mergesort"
        )  # Stabile Sortierung anwenden
    return df.drop(columns=temp_cols, errors="ignore")  # Hilfsspalten wieder entfernen


def build_team(  # Baut ein Team fuer eine feste Formation
    candidates: pd.DataFrame,
    formation: str,
    budget: float = 100.0,
    max_per_club: int = 3,
) -> Dict:
    if formation not in POS_SLOTS:  # Gueltigkeit der Formation pruefen
        raise ValueError(
            f"Unbekannte Formation: {formation}"
        )  # Fehler fuer Anwender ausgeben
    slots = POS_SLOTS[formation].copy()  # Verbleibende Slots je Position kopieren
    team = {  # Ergebnisstruktur vorbereiten
        "formation": formation,
        "start_xi": [],
        "bench": [],
        "captain": None,
        "vice_captain": None,
        "spent": 0.0,
    }  # Abschluss des Blockes
    club_counts: Dict[str, int] = {}  # Anzahl Spieler pro Klub verfolgen
    spent = 0.0  # Bisher ausgegebenes Budget

    ordered = _prepare_candidates(candidates)  # Kandidaten nach Tie-Break sortieren
    for _, row in ordered.iterrows():  # Jeden Kandidaten durchgehen
        pos = row.get("position")  # Position auslesen
        if pos not in slots or slots[pos] <= 0:  # Wenn kein Platz mehr frei ist
            continue  # Naechster Spieler
        price = float(row.get("price", 0.0) or 0.0)  # Preis robust bestimmen
        if spent + price > budget + 1e-9:  # Budgetgrenze pruefen
            continue  # Spieler ueberspringen
        club = row.get("club")  # Klub auslesen
        if club:
            if club_counts.get(club, 0) >= max_per_club:  # Klublimit pruefen
                continue  # Spieler ueberspringen
        team["start_xi"].append(row.to_dict())  # Spieler in Startelf uebernehmen
        slots[pos] -= 1  # Slotverbrauch aktualisieren
        spent += price  # Budget anpassen
        if club:
            club_counts[club] = club_counts.get(club, 0) + 1  # Klubzaehler erhoehen
        if sum(slots.values()) == 0:  # Wenn alle Plaetze belegt sind
            break  # Schleife beenden

    team["spent"] = spent  # Verbrauchtes Budget sichern
    remaining_slots = sum(max(0, v) for v in slots.values())  # Uebrige Slots pruefen
    if remaining_slots > 0:  # Falls nicht alle Plaetze gefuellt wurden
        logging.warning(
            "Formation %s konnte nicht vollstaendig besetzt werden (%d Restplaetze)",
            formation,
            remaining_slots,
        )

    start_df = pd.DataFrame(team["start_xi"])  # Startelf in DataFrame verwandeln
    if not start_df.empty:  # Falls Spieler vorhanden sind
        sorted_start = _prepare_candidates(start_df)  # Startelf fuer Kapitaen sortieren
        team["captain"] = sorted_start.iloc[0].to_dict()  # Bester Spieler als Kapitaen
        team["vice_captain"] = (  # Zweiter Spieler als Vize, sonst wieder Erster
            sorted_start.iloc[1].to_dict()
            if len(sorted_start) > 1
            else sorted_start.iloc[0].to_dict()
        )
    else:
        team["captain"] = None  # Kein Kapitaen moeglich
        team["vice_captain"] = None  # Kein Vize moeglich

    start_ids = set(start_df.get("player_id", []))  # IDs der Startelf sichern
    if "player_id" in ordered.columns:  # Pruefen ob IDs vorhanden sind
        bench_pool = ordered[
            ~ordered["player_id"].isin(start_ids)
        ]  # Restliche Spieler als Bankkandidaten
    else:
        bench_pool = ordered.iloc[0:0]  # Leerer DataFrame als Fallback
    bench_sorted = _prepare_candidates(bench_pool).iloc[
        :4
    ]  # Top-4 fuer die Bank waehlen
    team["bench"] = [
        row.to_dict() for _, row in bench_sorted.iterrows()
    ]  # Bankeintraege speichern
    return team  # Fertiges Team zurueckgeben


def choose_best_formation(  # Durchprobieren aller Formationen
    candidates: pd.DataFrame, formations: List[str]
) -> Tuple[str, Dict]:
    best_form = None  # Beste Formation initialisieren
    best_team: Dict | None = None  # Passendes Team merken
    best_points = -np.inf  # Vergleichswert fuer Prognosepunkte
    scored_candidates = candidates.copy()  # Kopie der Kandidaten erstellen
    if "pred_points" not in scored_candidates.columns:  # Prognosewerte sicherstellen
        scored_candidates["pred_points"] = 0.0  # Nullwerte als Fallback
    for formation in formations:  # Jede Formation testen
        try:
            team = build_team(scored_candidates, formation)  # Team fuer Formation bauen
        except Exception as exc:  # Fehler auffangen
            logging.warning(
                "Formation %s uebersprungen: %s", formation, exc
            )  # Hinweis ausgeben
            continue  # Naechste Formation testen
        start_xi = team["start_xi"]  # Startelf auslesen
        if not start_xi:  # Falls kein gueltiges Team entstand
            expected_points = -np.inf  # Schlechte Bewertung vergeben
        else:
            ids = [p.get("player_id") for p in start_xi]  # Spieler-IDs sammeln
            expected_points = (
                scored_candidates.set_index("player_id")["pred_points"]
                .reindex(ids)
                .fillna(0.0)
                .sum()
            )  # Prognosepunkte aufsummieren
        if expected_points > best_points:  # Besseres Ergebnis gefunden?
            best_points = expected_points  # Vergleichswert aktualisieren
            best_form = formation  # Formation merken
            best_team = team  # Team merken
    if best_form is None or best_team is None:  # Falls keine Formation erfolgreich war
        raise ValueError("Keine gueltige Formation gefunden")  # Fehler melden
    return best_form, best_team  # Beste Formation samt Team zurueckgeben


# ─────────────────────────────────────────────────────────────────────
# Production-ready lineup picker with auto-formation
# ─────────────────────────────────────────────────────────────────────

FormationStr = Literal["3-4-3", "3-5-2", "4-4-2", "4-5-1", "4-3-3", "5-3-2", "5-4-1"]


class LineupResult(TypedDict):
    """Result of pick_lineup_autoformation."""

    formation: FormationStr
    xi_ids: List[int]  # 11 player_ids
    bench_gk_id: int
    bench_out_ids: List[int]  # exactly 3 ids, order matters (B1,B2,B3)
    captain_id: int
    vice_id: int
    xi_points_sum: float
    debug: Dict[str, float]  # per-formation score summary


def parse_formation_counts(formation: str) -> Dict[str, int]:
    """Parse e.g. '4-3-3' -> {'DEF':4,'MID':3,'FWD':3}."""
    parts = formation.split("-")
    if len(parts) != 3:
        raise ValueError(f"Invalid formation string: {formation}")
    d, m, f = int(parts[0]), int(parts[1]), int(parts[2])
    return {"DEF": d, "MID": m, "FWD": f}


def pick_lineup_autoformation(
    squad_df: pd.DataFrame,
    prefer_minutes: bool = True,
    p_start_col: str = "p_start",
    pred_col: str = "pred_points",
    position_col: str = "position",
    player_id_col: str = "player_id",
    name_col: str = "name",
    p_floor: float = 0.6,
    formation_preference: Optional[List[FormationStr]] = None,
    bench_policy: Optional[Dict[str, float]] = None,
    captain_policy: Optional[Dict[str, bool]] = None,
) -> LineupResult:
    """
    Auto-select formation, XI, bench order, captain/vice from a 15-man squad.

    Algorithm:
      1. Compute score = pred_points (no minutes) or pred_points * clamp(p_start, p_floor, 1.0) (prefer_minutes=True).
      2. Pick best GK by score -> starting GK; other GK -> bench_gk_id.
      3. For each valid formation, pick top DEF/MID/FWD by score. Sum XI scores.
      4. Best formation = highest XI sum.
      5. Bench outfield order: sort remaining outfield by score_bench desc, then p_start desc, then price desc, then name asc.
         - score_bench = score * (1 - penalize_doubtful) if doubtful==True and bench_policy["penalize_doubtful"] set.
      6. Captain/vice = top 2 by score in XI.

    Args:
        squad_df: Must include columns: position, player_id, pred_points, p_start (optional), doubtful (optional).
        prefer_minutes: If True & p_start col present, multiply pred_points by clamp(p_start, p_floor,1.0).
        p_start_col: Column name for starting probability.
        pred_col: Column name for predicted points.
        position_col: Column name for position (GK, DEF, MID, FWD).
        player_id_col: Column name for player ID.
        name_col: Column name for player name (optional; used for debug).
        p_floor: Minimum start probability clamp (default 0.6).
        formation_preference: List of formations to try (defaults to all ALLOWED_FORMATIONS).
        bench_policy: Optional dict with keys like "penalize_doubtful" (default: None = no penalty).
                      Example: {"penalize_doubtful": 0.2} reduces bench score by 20% for doubtful players.
        captain_policy: Optional dict with keys like "prefer_minutes" (default: None).
                        Example: {"prefer_minutes": True} when enabled, among top 2 scores choose the one
                        with higher p_start as captain when scores are within epsilon=0.05.
                        Ensures deterministic captain selection with minutes-based tiebreak.

    Returns:
        LineupResult with formation, xi_ids, bench_gk_id, bench_out_ids, captain_id, vice_id, xi_points_sum, debug.
    """
    df = squad_df.copy()

    # Ensure columns
    if pred_col not in df.columns:
        raise ValueError(f"Missing required column: {pred_col}")
    if position_col not in df.columns:
        raise ValueError(f"Missing required column: {position_col}")
    if player_id_col not in df.columns:
        raise ValueError(f"Missing required column: {player_id_col}")

    # Fill defaults for optional columns
    if "price" not in df.columns:
        df["price"] = 5.0
    if name_col not in df.columns:
        df[name_col] = df[player_id_col].astype(str)

    has_p_start = p_start_col in df.columns

    # Compute score
    def compute_score(row):
        base = float(row.get(pred_col, 0.0))
        if not prefer_minutes or not has_p_start:
            return base
        p_s = float(row.get(p_start_col, 1.0))
        clamped = max(p_floor, min(1.0, p_s))
        return base * clamped

    df["_score"] = df.apply(compute_score, axis=1)

    # Validate positions
    pos_counts = df[position_col].value_counts().to_dict()
    if pos_counts.get("GK", 0) < 2:
        raise ValueError("Squad must have at least 2 goalkeepers")
    if pos_counts.get("DEF", 0) < 3:
        raise ValueError("Squad must have at least 3 defenders")
    if pos_counts.get("MID", 0) < 3:
        raise ValueError("Squad must have at least 3 midfielders")
    if pos_counts.get("FWD", 0) < 1:
        raise ValueError("Squad must have at least 1 forward")

    # 1. Pick GK for XI
    gk_df = df[df[position_col] == "GK"].copy()
    gk_df = gk_df.sort_values(by="_score", ascending=False)
    starting_gk = gk_df.iloc[0]
    bench_gk_id = int(gk_df.iloc[1][player_id_col])

    # Outfield only
    outfield_df = df[df[position_col] != "GK"].copy()

    # 2. Try formations
    formations_to_try = formation_preference or ALLOWED_FORMATIONS
    best_formation: Optional[FormationStr] = None
    best_xi_rows = None
    best_xi_sum = -np.inf
    formation_debug: Dict[str, float] = {}

    for formation in formations_to_try:
        # parse counts
        try:
            counts = parse_formation_counts(formation)
        except ValueError:
            continue

        # check feasibility
        if pos_counts.get("DEF", 0) < counts["DEF"]:
            formation_debug[formation] = -np.inf
            continue
        if pos_counts.get("MID", 0) < counts["MID"]:
            formation_debug[formation] = -np.inf
            continue
        if pos_counts.get("FWD", 0) < counts["FWD"]:
            formation_debug[formation] = -np.inf
            continue

        xi_list = []
        for pos_key in ["DEF", "MID", "FWD"]:
            needed = counts[pos_key]
            pos_subset = outfield_df[outfield_df[position_col] == pos_key].copy()
            pos_subset = pos_subset.sort_values(by="_score", ascending=False)
            top_n = pos_subset.head(needed)
            xi_list.append(top_n)

        xi_tmp = pd.concat(xi_list, ignore_index=True)
        if len(xi_tmp) != 10:
            formation_debug[formation] = -np.inf
            continue

        xi_tmp_sum = xi_tmp["_score"].sum()
        formation_debug[formation] = xi_tmp_sum

        if xi_tmp_sum > best_xi_sum:
            best_xi_sum = xi_tmp_sum
            best_formation = formation  # type: ignore
            best_xi_rows = xi_tmp

    if best_formation is None or best_xi_rows is None:
        raise ValueError(
            "No valid formation found. Check that squad has enough players per position."
        )

    # Build final XI: starting_gk + outfield
    xi_all = pd.concat([pd.DataFrame([starting_gk]), best_xi_rows], ignore_index=True)
    xi_ids = xi_all[player_id_col].astype(int).tolist()

    # 3. Captain/Vice from XI (by _score, with optional minutes-based tiebreak)
    xi_sorted = xi_all.sort_values(by="_score", ascending=False)

    # Check if captain_policy with prefer_minutes is enabled
    use_minutes_tiebreak = False
    if captain_policy is not None:
        use_minutes_tiebreak = captain_policy.get("prefer_minutes", False)

    # Deterministic captain selection
    if use_minutes_tiebreak and has_p_start and len(xi_sorted) >= 2:
        # Get top 2 candidates
        top2 = xi_sorted.head(2)
        score_1 = float(top2.iloc[0]["_score"])
        score_2 = float(top2.iloc[1]["_score"])

        # If scores are within epsilon (0.05), choose based on p_start
        epsilon = 0.05
        if abs(score_1 - score_2) <= epsilon:
            p_start_1 = float(top2.iloc[0].get(p_start_col, 0.0))
            p_start_2 = float(top2.iloc[1].get(p_start_col, 0.0))

            # If second player has higher p_start, swap captain and vice
            if p_start_2 > p_start_1:
                captain_id = int(top2.iloc[1][player_id_col])
                vice_id = int(top2.iloc[0][player_id_col])
            else:
                # Deterministic tiebreak: if p_start also equal, use existing score order
                captain_id = int(top2.iloc[0][player_id_col])
                vice_id = int(top2.iloc[1][player_id_col])
        else:
            # Scores differ by more than epsilon, use normal logic
            captain_id = int(xi_sorted.iloc[0][player_id_col])
            vice_id = int(xi_sorted.iloc[1][player_id_col])
    else:
        # Default behavior: highest score is captain
        captain_id = int(xi_sorted.iloc[0][player_id_col])
        vice_id = (
            int(xi_sorted.iloc[1][player_id_col]) if len(xi_sorted) > 1 else captain_id
        )

    # 4. Bench outfield (3 players)
    remaining_outfield = outfield_df[~outfield_df[player_id_col].isin(xi_ids)].copy()

    # Compute bench score (may differ from XI score due to bench_policy)
    remaining_outfield["_score_bench"] = remaining_outfield["_score"]

    # Apply bench_policy penalties if configured
    if bench_policy is not None:
        penalize_doubtful = bench_policy.get("penalize_doubtful", 0.0)
        if penalize_doubtful > 0.0 and "doubtful" in remaining_outfield.columns:
            # Reduce score for doubtful players: score_bench = score * (1 - penalty)
            mask_doubtful = remaining_outfield["doubtful"].astype(bool)
            remaining_outfield.loc[mask_doubtful, "_score_bench"] = (
                remaining_outfield.loc[mask_doubtful, "_score_bench"]
                * (1.0 - penalize_doubtful)
            )

    # Deterministic tie-break: score_bench desc, then p_start desc, then price desc, then name asc
    # Build sort keys
    remaining_outfield["_p_start_sort"] = remaining_outfield.get(p_start_col, 1.0)
    remaining_outfield["_price_sort"] = remaining_outfield["price"]
    remaining_outfield["_name_sort"] = remaining_outfield[name_col].astype(str)

    remaining_outfield = remaining_outfield.sort_values(
        by=["_score_bench", "_p_start_sort", "_price_sort", "_name_sort"],
        ascending=[False, False, False, True],
        kind="mergesort",
    )

    if len(remaining_outfield) < 3:
        raise ValueError("Not enough outfield players left for bench (need 3).")

    bench_out_ids = remaining_outfield.head(3)[player_id_col].astype(int).tolist()

    # 5. Final points sum (from pred_col, not _score)
    xi_points_sum = xi_all[pred_col].sum()

    # Build debug mapping: each formation -> its XI sum (or -inf if invalid)
    debug_dict: Dict[str, float] = formation_debug

    return LineupResult(
        formation=best_formation,
        xi_ids=xi_ids,
        bench_gk_id=bench_gk_id,
        bench_out_ids=bench_out_ids,
        captain_id=captain_id,
        vice_id=vice_id,
        xi_points_sum=float(xi_points_sum),
        debug=debug_dict,
    )


def format_lineup_table(
    squad_df: pd.DataFrame,
    xi_ids: List[int],
    bench_gk_id: int,
    bench_out_ids: List[int],
    captain_id: Optional[int] = None,
    vice_id: Optional[int] = None,
    player_id_col: str = "player_id",
    name_col: str = "name",
    position_col: str = "position",
    pred_col: str = "pred_points",
    p_start_col: str = "p_start",
) -> str:
    """
    Format lineup as a simple string table for display.

    Args:
        squad_df: DataFrame with player information
        xi_ids: List of 11 player IDs in starting XI
        bench_gk_id: ID of goalkeeper on bench
        bench_out_ids: List of 3 outfield player IDs on bench
        captain_id: Optional captain ID (adds (C) marker)
        vice_id: Optional vice-captain ID (adds (VC) marker)
        player_id_col: Column name for player ID
        name_col: Column name for player name
        position_col: Column name for position
        pred_col: Column name for predicted points
        p_start_col: Column name for starting probability

    Returns:
        Formatted string table with starting XI and bench
    """
    # Set up DataFrame with player_id as index for easy lookup
    df = squad_df.set_index(player_id_col)

    # Helper to format player row
    def format_player(pid: int, prefix: str = "") -> str:
        if pid not in df.index:
            return f"{prefix}Player {pid} (not found)"

        row = df.loc[pid]

        # Helper to safely extract a scalar float from possible Series/array values
        def _to_float(val, default=0.0):
            if isinstance(val, pd.Series):
                if val.empty:
                    return float(default)
                v = val.iloc[0]
            elif isinstance(val, (list, tuple, np.ndarray)):
                try:
                    v = val[0]
                except Exception:
                    return float(default)
            else:
                v = val
            try:
                if v is None:
                    return float(default)
                return float(v)
            except Exception:
                return float(default)

        # Safely get name and position (handle possible Series)
        name_val = row.get(name_col, f"ID{pid}")
        name = (
            str(name_val.iloc[0]) if isinstance(name_val, pd.Series) else str(name_val)
        )
        pos_val = row.get(position_col, "???")
        pos = str(pos_val.iloc[0]) if isinstance(pos_val, pd.Series) else str(pos_val)

        # Safely convert numeric fields
        pred = _to_float(row.get(pred_col, 0.0), 0.0)
        p_start = (
            _to_float(row.get(p_start_col, 1.0), 1.0)
            if p_start_col in df.columns
            else 1.0
        )

        # Add captain/vice markers
        marker = ""
        if captain_id is not None and pid == captain_id:
            marker = " (C)"
        elif vice_id is not None and pid == vice_id:
            marker = " (VC)"

        return f"{prefix}{pos:3s} | {name:20s}{marker:5s} | {pred:5.2f} pts | {p_start:4.0%} start"

    # Build table
    lines = []
    lines.append("=" * 70)
    lines.append("STARTING XI")
    lines.append("-" * 70)

    for pid in xi_ids:
        lines.append(format_player(pid, "  "))

    lines.append("-" * 70)
    lines.append("BENCH")
    lines.append("-" * 70)
    lines.append(format_player(bench_gk_id, "  [GK]  "))

    for i, pid in enumerate(bench_out_ids, start=1):
        lines.append(format_player(pid, f"  [B{i}]  "))

    lines.append("=" * 70)

    return "\n".join(lines)
