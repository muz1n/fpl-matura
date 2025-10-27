"""Hilfsfunktionen zum Laden und Speichern von Auswertungsdaten."""  # Erklaert Zweck der Datei fuer Laien

from __future__ import (
    annotations,
)  # Aktiviert neue Typfeatures bei aelteren Python-Versionen

import json  # Zum Schreiben von JSON-Dateien
import logging  # Einheitliche Protokollausgaben
from pathlib import Path  # Komfortable Pfadobjekte
from typing import Iterable  # Typ-Hilfe fuer Generatoren

import pandas as pd  # Tabellendatenverarbeitung

EXPECTED_COLS = [  # Standardspalten fuer Spielerdaten definieren
    "season",  # Saisonkennung
    "gw",  # Spieltag
    "player_id",  # Spieler-ID
    "position",  # Position
    "club",  # Klubzugehoerigkeit
    "price",  # Preis in Millionen
    "ownership",  # Ownership in Prozent
    "minutes",  # Gespielte Minuten
    "points",  # Fantasy-Punkte
    "p90_last",  # Optionaler Wert aus Vorsaison
    "p90_roll_3",  # Optionaler Rolling-Wert
]


def ensure_dirs(
    out_dir: Path, plots_dir: Path
) -> None:  # Legt benoetigte Verzeichnisse an
    for directory in (out_dir, plots_dir):  # Beide Verzeichnisse der Reihe nach
        directory.mkdir(
            parents=True, exist_ok=True
        )  # Erzeugt Pfad inklusive Eltern falls noetig


def _candidate_paths(season: str) -> Iterable[Path]:  # Sammelt moegliche Quelldateien
    filenames = [  # Typische Dateinamen zusammenstellen
        f"{season}_player_gw.csv",  # Standardformat Saison_voran
        f"player_gw_{season}.csv",  # Alternativer Name
    ]
    base_dirs = [
        Path("data"),
        Path("out"),
        Path("docs"),
        Path("."),
    ]  # Uebliche Verzeichnisse durchsuchen
    for base in base_dirs:  # Durch jedes Basisverzeichnis iterieren
        for filename in filenames:  # Jeden Dateinamen kombinieren
            yield base / filename  # Vollstaendigen Pfad liefern


def load_player_gameweeks(season: str) -> pd.DataFrame:  # Laedt Spieler-GW-Daten
    """Durchsucht bekannte Ordner nach CSVs und liefert Tabelle oder leeres Geruest."""  # Kurze Beschreibung

    candidates = list(_candidate_paths(season))  # Alle Kandidatenpfade vorbereiten
    for path in candidates:  # Jeden Pfad pruefen
        if not path.exists():  # Falls Datei fehlt
            continue  # Zum naechsten Kandidaten springen
        try:
            logging.info(
                "Lade Spieler-GW-Daten aus %s", path
            )  # Hinweis auf gefundene Datei
            df = pd.read_csv(path)  # CSV-Datei einlesen
            return df  # Erfolgreich geladene Daten zurueckgeben
        except Exception as exc:  # Fehler beim Laden abfangen
            logging.warning(
                "Fehler beim Laden von %s: %s", path, exc
            )  # Warnung ausgeben
    logging.warning(  # Falls nichts gefunden wurde
        "Keine CSV-Daten fuer Saison %s gefunden. Erwartete Pfade: %s",
        season,
        [str(p) for p in candidates],
    )
    return pd.DataFrame(
        columns=EXPECTED_COLS
    )  # Leeren DataFrame mit Standardsapalten zurueckgeben


def save_table(df: pd.DataFrame, path: Path) -> None:  # Speichert Tabellen als CSV
    path = Path(path)  # Pfadobjekt sicherstellen
    path.parent.mkdir(parents=True, exist_ok=True)  # Elternverzeichnis anlegen
    df.to_csv(path, index=False)  # DataFrame ohne Index schreiben
    logging.info(
        "Gespeicherte Tabelle: %s (%d Zeilen)", path, len(df)
    )  # Rueckmeldung ausgeben


def save_plot(fig, path: Path) -> None:  # Speichert Matplotlib-Diagramme
    path = Path(path)  # Pfadobjekt sicherstellen
    path.parent.mkdir(parents=True, exist_ok=True)  # Elternordner anlegen
    fig.savefig(path, bbox_inches="tight")  # Figur platzsparend sichern
    logging.info("Gespeicherter Plot: %s", path)  # Rueckmeldung ins Log schreiben


def save_json(obj: dict, path: Path) -> None:  # Speichert JSON-Dateien
    path = Path(path)  # Pfadobjekt sicherstellen
    path.parent.mkdir(parents=True, exist_ok=True)  # Elternordner anlegen
    with path.open("w", encoding="utf-8") as handle:  # Datei im Schreibmodus oeffnen
        json.dump(
            obj, handle, ensure_ascii=False, indent=2
        )  # Struktur lesbar abspeichern
    logging.info("Gespeicherte JSON-Datei: %s", path)  # Rueckmeldung ausgeben
