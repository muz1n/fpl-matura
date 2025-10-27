"""Berechnet Spieler- und Team-Benchmarks fuer die Auswertung."""  # Kurze Beschreibung der Datei

from __future__ import annotations  # Aktiviert moderne Typfeatures

import logging  # Fuer Warnungen und Hinweise
from typing import Iterable  # Typ-Hilfe fuer Spaltenlisten

import numpy as np  # Numerische Helferlein
import pandas as pd  # Tabellenoperationen

REQUIRED_BASE_COLS = {
    "player_id",
    "minutes",
    "points",
}  # Minimale Spalten fuer Berechnungen


def _check_columns(
    frame: pd.DataFrame, required: Iterable[str], context: str
) -> bool:  # Prueft Spaltenverfuegbarkeit
    missing = [
        col for col in required if col not in frame.columns
    ]  # Fehlende Spalten sammeln
    if missing:  # Wenn etwas fehlt
        logging.warning(
            "%s benoetigt Spalten %s - fehlend: %s", context, list(required), missing
        )  # Warnung loggen
        return False  # Rueckmeldung fuer Aufrufer
    return True  # Alles in Ordnung


def _minutes_mean_last_k(
    train: pd.DataFrame, player_id: int, k: int = 3
) -> float:  # Erwartete Minuten schaetzen
    if (
        "minutes" not in train.columns or "player_id" not in train.columns
    ):  # Sicherheitsabfrage
        return 60.0  # Fallbackwert nutzen
    sub = (
        train[train["player_id"] == player_id].sort_values("gw").tail(k)
    )  # Letzte k Spiele holen
    if sub.empty:  # Falls keine Historie vorhanden
        return 60.0  # Fallbackwert behalten
    return float(
        np.clip(sub["minutes"].mean(), 0, 90)
    )  # Durchschnittsminuten begrenzen


def _attach_p90_last(
    train: pd.DataFrame, frame: pd.DataFrame
) -> pd.DataFrame:  # Fuegt p90_last aus dem Training an
    required_cols = []  # Liste der nachzureichenden Spalten
    if "p90_last" not in frame.columns:  # p90_last noch nicht vorhanden
        required_cols.append("p90_last")  # Muss berechnet werden
    if "minutes_last" not in frame.columns:  # Historische Minuten fehlen?
        required_cols.append("minutes_last")  # Ebenfalls berechnen
    if not required_cols:  # Wenn nichts fehlt
        return frame  # Original unveraendert zurueckgeben
    if not _check_columns(
        train, REQUIRED_BASE_COLS, "A1/B1/B2 p90_last"
    ):  # Pruefen ob Training ausreichend ist
        for col in required_cols:  # Fehlende Spalten mit Nullen fuellen
            frame[col] = 0.0
        return frame
    agg = (  # Aggregation ueber Spieler
        train.groupby("player_id")
        .agg(points_last=("points", "sum"), minutes_last=("minutes", "sum"))
        .reset_index()
    )
    agg["p90_last"] = np.where(  # Punkte pro 90 Minuten berechnen
        agg["minutes_last"] > 0, agg["points_last"] / agg["minutes_last"] * 90.0, 0.0
    )
    merge_cols = ["player_id"] + required_cols  # Nur benoetigte Spalten weitergeben
    return frame.merge(
        agg[merge_cols], on="player_id", how="left"
    )  # Historie anreichern


def add_baseline_a1_points(
    train: pd.DataFrame, test: pd.DataFrame
) -> pd.DataFrame:  # Spieler-Baseline A1 anwenden
    """Baseline A1: p90 aus der Historie mit erwarteten Minuten multiplizieren."""  # Beschreibung fuer Anwender

    out = test.copy()  # Sicherstellen, dass Original unveraendert bleibt
    if not _check_columns(
        test, {"player_id"}, "Baseline A1 Test"
    ):  # Spieler-IDs zwingend noetig
        return out  # Ohne IDs keine Berechnung
    augmented = _attach_p90_last(train, out)  # Historische Werte anreichern
    if (
        "minutes_last" not in augmented.columns
    ):  # Falls trotz allem keine Minuten existieren
        augmented["minutes_last"] = np.nan  # Mit NaN fuellen
    augmented["expected_minutes_a1"] = augmented[
        "player_id"
    ].apply(  # Erwartete Minuten ueber Hilfsfunktion
        lambda pid: _minutes_mean_last_k(train, pid, k=3)
    )
    augmented["baseline_a1_points"] = (  # Finale Punkteberechnung
        augmented["p90_last"].fillna(0.0)
        * augmented["expected_minutes_a1"].fillna(60.0)
        / 90.0
    )
    return augmented  # Ergebnis zurueckgeben


def add_baseline_a2_points(
    train: pd.DataFrame, test: pd.DataFrame, r: int = 3
) -> pd.DataFrame:  # Spieler-Baseline A2 anwenden
    """Baseline A2: Rollierendes p90 ueber die letzten ``r`` Spiele."""  # Beschreibung fuer Anwender

    out = test.copy()  # Kopie erzeugen
    if not _check_columns(test, {"player_id"}, "Baseline A2 Test"):  # IDs Pflicht
        return out  # Ohne IDs kein Ergebnis
    if not _check_columns(
        train, REQUIRED_BASE_COLS.union({"gw"}), "Baseline A2 Train"
    ):  # Historie pruefen
        out["baseline_a2_points"] = 0.0  # Fallbackwert setzen
        return out
    rows = []  # Zwischenspeicher fuer pro Spieler berechnete Werte
    for pid, sub in train.groupby("player_id"):  # Fuer jeden Spieler separat
        sub = sub.sort_values("gw").tail(r)  # Letzte r Spieltage betrachten
        if sub.empty:  # Falls keine Daten vorhanden
            p90_roll = 0.0  # Nullpunkte annehmen
            exp_min = 60.0  # Standardminuten
        else:
            minutes = sub["minutes"].replace(
                0, np.nan
            )  # Nullminuten als fehlend behandeln
            p90_values = (sub["points"] / minutes) * 90.0  # p90 je Spiel berechnen
            p90_values = p90_values.replace(
                [np.inf, -np.inf], np.nan
            )  # Unsaubere Werte ausblenden
            p90_roll = (
                float(p90_values.mean(skipna=True)) if p90_values.notna().any() else 0.0
            )  # Mittelwert bilden
            exp_min = float(
                np.clip(sub["minutes"].mean(), 0, 90)
            )  # Erwartete Minuten begrenzen
        rows.append(
            {"player_id": pid, "p90_roll": p90_roll, "expected_minutes_a2": exp_min}
        )  # Ergebnis merken
    feat = pd.DataFrame(rows)  # In DataFrame umwandeln
    out = out.merge(feat, on="player_id", how="left")  # Mit Testdaten zusammenfuehren
    out["baseline_a2_points"] = (  # Finaler Wert fuer Baseline A2
        out["p90_roll"].fillna(0.0) * out["expected_minutes_a2"].fillna(60.0) / 90.0
    )
    return out  # Ergebnis zurueckgeben


def add_team_baseline_b1_score(
    test: pd.DataFrame, train: pd.DataFrame
) -> pd.DataFrame:  # Team-Baseline B1 anwenden
    """Team-Baseline B1: Perzentilmix aus Preis, Ownership und p90 je Position."""  # Beschreibung fuer Anwender

    out = test.copy()  # Kopie bilden
    needed = {
        "player_id",
        "position",
        "price",
        "ownership",
    }  # Pflichtspalten definieren
    if not _check_columns(
        out, needed, "Baseline B1 Test"
    ):  # Pruefen ob alles vorhanden ist
        out["team_b1_score"] = 0.0  # Fallback setzen
        return out
    out = _attach_p90_last(train, out)  # Historische Werte zufuegen
    for col in [
        "preis_pct",
        "ownership_pct",
        "p90_last_pct",
    ]:  # Alte Hilfsspalten entfernen
        if col in out.columns:
            out.drop(columns=[col], inplace=True)

    def pct(series: pd.Series) -> pd.Series:  # Perzentilberechnung als Hilfsfunktion
        return series.rank(pct=True, method="average")

    out["preis_pct"] = out.groupby("position")["price"].transform(
        pct
    )  # Preis je Position normieren
    out["ownership_pct"] = out.groupby("position")["ownership"].transform(
        pct
    )  # Ownership je Position normieren
    if "p90_last" in out.columns:  # Nur falls vorhanden verarbeiten
        out["p90_last_pct"] = out.groupby("position")["p90_last"].transform(
            pct
        )  # p90 je Position normieren
    else:
        out["p90_last_pct"] = 0.0  # Sonst mit Null fuellen
    out["team_b1_score"] = (  # Mischscore berechnen
        0.4 * out["preis_pct"].fillna(0.0)
        + 0.3 * out["ownership_pct"].fillna(0.0)
        + 0.3 * out["p90_last_pct"].fillna(0.0)
    )
    return out  # Ergebnis liefern


def add_team_baseline_b2_score(
    test: pd.DataFrame, train: pd.DataFrame
) -> pd.DataFrame:  # Team-Baseline B2 anwenden
    """Team-Baseline B2: Wertigkeit aus p90-last geteilt durch Preis mit Minutenabschlag."""  # Beschreibung fuer Anwender

    out = test.copy()  # Kopie anlegen
    needed_test = {"player_id", "price"}  # Pflichtspalten definieren
    if not _check_columns(
        out, needed_test, "Baseline B2 Test"
    ):  # Vorhandensein pruefen
        out["team_b2_score"] = 0.0  # Fallback setzen
        return out
    out = _attach_p90_last(train, out)  # Historische Werte zufuegen
    if "minutes_last" not in out.columns:  # Minutenhistorie nachreichen falls fehlt
        minutes_hist = (
            train.groupby("player_id")["minutes"]
            .sum()
            .rename("minutes_last")
            .reset_index()
            if "minutes" in train.columns and "player_id" in train.columns
            else pd.DataFrame({"player_id": out["player_id"], "minutes_last": 0})
        )
        out = out.merge(minutes_hist, on="player_id", how="left")
    out["minutes_last"] = out["minutes_last"].fillna(
        0.0
    )  # Fehlende Minuten durch Null ersetzen
    dampening = (
        out["minutes_last"].clip(lower=0.0) / 900.0
    )  # Anteil der Mindestminuten berechnen
    dampening = dampening.clip(upper=1.0).fillna(
        0.0
    )  # Maximalwert begrenzen und Fehlwerte auffuellen
    out["p90_last_adj"] = (
        out["p90_last"].fillna(0.0) * dampening
    )  # p90 mit Minutenanteil drosseln
    price = pd.to_numeric(out["price"], errors="coerce").replace(
        0, np.nan
    )  # Preis robust umwandeln
    out["team_b2_score"] = (out["p90_last_adj"] / price).fillna(
        0.0
    )  # Wertigkeit berechnen
    return out  # Ergebnis liefern
