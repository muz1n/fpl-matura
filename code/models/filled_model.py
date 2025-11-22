#!/usr/bin/env python3
"""Erstellt rf_filled Vorhersagen durch Kombination von RF, MA3 und POS.

rf_filled Strategie:
- Verwende RF-Vorhersagen wo verfügbar
- Falls RF fehlt, verwende MA3
- Falls MA3 auch fehlt, verwende POS
- Ergebnis: Komplette Vorhersagen für alle Spieler im Pool

Das Skript lädt bestehende Vorhersagen aus dem out/ Verzeichnis.
Falls Vorhersagen fehlen, müssen diese zuerst mit make_predictions.py erstellt werden.

Verwendung:
    python code/models/filled_model.py --season 2022-23 --gw 30
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "out"


def load_predictions(season: str, gw: int, method: str) -> Dict:
    """Lädt bestehende Vorhersagen aus JSON-Datei.

    Args:
        season: Saison-Bezeichnung (z.B. "2022-23")
        gw: Gameweek-Nummer
        method: Methode (rf, ma3, pos)

    Returns:
        Dict mit Vorhersage-Daten oder leeres Dict falls Datei nicht existiert
    """
    pred_file = OUT_DIR / f"predictions_{season}_gw{gw}_{method}.json"
    if not pred_file.exists():
        print(f"⚠ Vorhersage nicht gefunden: {pred_file.name}")
        return {"players": []}

    with open(pred_file, "r", encoding="utf-8") as f:
        return json.load(f)


def create_rf_filled_predictions(season: str, gw: int) -> Dict:
    """Erstellt rf_filled Vorhersagen durch Fallback-Logik.

    Args:
        season: Saison-Bezeichnung
        gw: Gameweek-Nummer

    Returns:
        Dict mit kombinierten Vorhersagen im Standard-Format
    """
    # Lade alle drei Methoden
    print(f"\nLade Vorhersagen für {season} GW{gw}...")
    rf_data = load_predictions(season, gw, "rf")
    ma3_data = load_predictions(season, gw, "ma3")
    pos_data = load_predictions(season, gw, "pos")

    # Erstelle Lookup-Dicts nach player_id
    rf_lookup = {p["player_id"]: p for p in rf_data.get("players", [])}
    ma3_lookup = {p["player_id"]: p for p in ma3_data.get("players", [])}
    pos_lookup = {p["player_id"]: p for p in pos_data.get("players", [])}

    # Alle verfügbaren Spieler-IDs sammeln
    all_player_ids = (
        set(rf_lookup.keys()) | set(ma3_lookup.keys()) | set(pos_lookup.keys())
    )

    if not all_player_ids:
        print("❌ FEHLER: Keine Vorhersagen für diese GW gefunden.")
        print("   Bitte erstelle zuerst Vorhersagen mit make_predictions.py:")
        print(
            f"   python code/models/make_predictions.py --season {season} --gw {gw} --method rf"
        )
        print(
            f"   python code/models/make_predictions.py --season {season} --gw {gw} --method ma3"
        )
        print(
            f"   python code/models/make_predictions.py --season {season} --gw {gw} --method pos"
        )
        return {
            "season": season,
            "gw": gw,
            "method": "rf_filled",
            "generated_at": datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "players": [],
        }

    # Fallback-Logik anwenden
    filled_players = []
    stats = {"rf": 0, "ma3": 0, "pos": 0, "missing": 0}

    for player_id in sorted(all_player_ids):
        player_data = None
        source = None

        # Priorität: RF > MA3 > POS
        if player_id in rf_lookup:
            player_data = rf_lookup[player_id].copy()
            source = "rf"
            stats["rf"] += 1
        elif player_id in ma3_lookup:
            player_data = ma3_lookup[player_id].copy()
            source = "ma3"
            stats["ma3"] += 1
        elif player_id in pos_lookup:
            player_data = pos_lookup[player_id].copy()
            source = "pos"
            stats["pos"] += 1
        else:
            stats["missing"] += 1
            continue

        # Markiere die Quelle in den Metadaten (optional für Debugging)
        player_data["filled_source"] = source
        filled_players.append(player_data)

    # Nach predicted_points absteigend sortieren (wie in make_predictions.py)
    filled_players.sort(key=lambda x: x.get("predicted_points", 0.0), reverse=True)

    # Statistik ausgeben
    print("\n✓ rf_filled Statistik:")
    print(f"  RF-Vorhersagen verwendet:  {stats['rf']}")
    print(f"  MA3-Fallback verwendet:    {stats['ma3']}")
    print(f"  POS-Fallback verwendet:    {stats['pos']}")
    print(f"  Gesamt-Spieler:            {len(filled_players)}")

    if stats["rf"] > 0:
        coverage_pct = (stats["rf"] / len(filled_players)) * 100
        print(f"  RF-Abdeckung:              {coverage_pct:.1f}%")

    # Erstelle Output im Standard-Format
    result = {
        "season": season,
        "gw": int(gw),
        "method": "rf_filled",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "players": filled_players,
        "stats": stats,  # Zusätzliche Metadaten für Transparenz
    }

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Erstelle rf_filled Vorhersagen durch Kombination von RF, MA3 und POS"
    )
    parser.add_argument(
        "--season", type=str, required=True, help="Saison (z.B. 2022-23)"
    )
    parser.add_argument("--gw", type=int, required=True, help="Spielwochen-Nummer")
    parser.add_argument(
        "--output-dir", type=Path, default=OUT_DIR, help="Ausgabeverzeichnis"
    )

    args = parser.parse_args()

    print(f"Erstelle rf_filled Vorhersagen für {args.season} GW{args.gw}")

    # Erstelle kombinierte Vorhersagen
    output = create_rf_filled_predictions(args.season, args.gw)

    if not output["players"]:
        print("\n❌ Keine Vorhersagen erstellt. Bitte prüfe obige Fehlermeldungen.")
        return 1

    # Speichern
    output_file = (
        args.output_dir / f"predictions_{args.season}_gw{args.gw}_rf_filled.json"
    )
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    print(f"\n✓ rf_filled Vorhersagen geschrieben nach: {output_file}")
    print(f"  Anzahl Spieler: {len(output['players'])}")

    if output["players"]:
        print("  Top 5 Vorhersagen:")
        for i, player in enumerate(output["players"][:5], 1):
            source = player.get("filled_source", "?")
            print(
                f"    {i}. {player['name']} ({player['pos']}) - "
                f"{player['predicted_points']} Punkte [Quelle: {source.upper()}]"
            )

    return 0


if __name__ == "__main__":
    exit(main())
