#!/usr/bin/env python3
"""
Download und merge alle FPL-Saisons von vaastav/Fantasy-Premier-League.

Verwendung:
    python tools/download_all_seasons.py
"""

import requests
import pandas as pd
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Konfiguration
REPO_URL = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master"
SEASONS = [
    "2016-17",
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
    "2023-24",
    "2024-25",
]
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def download_gw_data(season: str) -> pd.DataFrame | None:
    """
    Ladet alle Gameweek-Daten fuer eine Saison von vaastav.

    Struktur: /data/{season}/gws/merged_gw.csv
    """
    url = f"{REPO_URL}/data/{season}/gws/merged_gw.csv"
    logger.info(f"Downloading {season} from {url}")

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # CSV in DataFrame laden
        from io import StringIO

        df = pd.read_csv(StringIO(response.text))

        # Season-Spalte hinzufuegen
        df["season"] = season

        logger.info(
            f"✓ {season}: {len(df)} rows, {df['GW'].nunique() if 'GW' in df.columns else df['round'].nunique()} gameweeks"
        )
        return df

    except requests.exceptions.RequestException as e:
        logger.error(f"✗ {season}: Download failed - {e}")
        return None
    except Exception as e:
        logger.error(f"✗ {season}: Processing failed - {e}")
        return None


def standardize_columns(df: pd.DataFrame, season: str) -> pd.DataFrame:
    """
    Standardisiert Spaltennamen zwischen verschiedenen Saisons.
    """
    # Spalten-Mapping (alt -> neu)
    rename_map = {
        "round": "gw",
        "element": "player_id",
        "total_points": "points",
        "value": "price",  # vaastav nutzt "value" für Spielerpreis
        "position": "pos",
    }

    # Nur vorhandene Spalten umbenennen
    existing_renames = {k: v for k, v in rename_map.items() if k in df.columns}
    if existing_renames:
        df = df.rename(columns=existing_renames)
        logger.info(f"  Renamed columns for {season}: {existing_renames}")

    # GW auf Kleinbuchstaben (falls GW gross war)
    if "GW" in df.columns and "gw" not in df.columns:
        df = df.rename(columns={"GW": "gw"})

    return df


def main():
    """Hauptfunktion: alle Saisons downloaden und mergen."""
    logger.info("=" * 70)
    logger.info("FPL Multi-Season Data Downloader")
    logger.info("=" * 70)

    all_dataframes = []

    for season in SEASONS:
        df = download_gw_data(season)

        if df is not None:
            df = standardize_columns(df, season)
            all_dataframes.append(df)
        else:
            logger.warning(f"Skipping {season} due to errors")

    if not all_dataframes:
        logger.error("No data downloaded! Exiting.")
        return

    logger.info("\n" + "=" * 70)
    logger.info("Merging all seasons...")
    logger.info("=" * 70)

    # Alle DataFrames concatenaten
    merged_df = pd.concat(all_dataframes, ignore_index=True)

    logger.info(f"Total rows: {len(merged_df)}")
    logger.info(f"Seasons: {sorted(merged_df['season'].unique())}")
    logger.info(f"Columns: {list(merged_df.columns[:15])}...")

    # Als ein grosses merged file speichern
    output_file = OUTPUT_DIR / "merged_gw_all_seasons.csv"
    merged_df.to_csv(output_file, index=False)
    logger.info(f"\n✓ Saved: {output_file}")

    # Auch einzelne Saisons speichern (falls noch nicht vorhanden)
    for season in SEASONS:
        season_df = merged_df[merged_df["season"] == season]
        if not season_df.empty:
            season_file = OUTPUT_DIR / f"merged_gw_{season}.csv"
            if not season_file.exists():
                season_df.to_csv(season_file, index=False)
                logger.info(f"✓ Saved: {season_file.name}")

    logger.info("\n" + "=" * 70)
    logger.info("✓ All seasons downloaded and merged!")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
