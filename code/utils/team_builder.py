"""Hilfen zum Bauen von Teams unter FPL-Regeln."""  # Erklaert Ziel der Datei fuer Laien

from __future__ import annotations  # Moderne Typfeatures aktivieren

import logging  # Fuer nachvollziehbare Hinweise
from typing import Dict, List, Tuple  # Typ-Hilfen fuer Rueckgabewerte

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
