"""
Export aller Premier League Spieler aus CSV für Web-App.

Liest cleaned_merged_gw_2023-24.csv und erstellt eine JSON-Datei
mit allen Spielern inklusive predicted_points (xP) für die Lineup-Builder Suche.
"""

import pandas as pd
import json
from pathlib import Path


def main():
    # Pfade
    project_root = Path(__file__).parent.parent
    data_path = project_root / "data" / "cleaned_merged_gw_2023-24.csv"
    output_path = project_root / "web" / "data" / "players_2023-24.json"

    print(f"📂 Lade Daten von: {data_path}")
    df = pd.read_csv(data_path)

    # Nur die neuesten GW-Daten pro Spieler (letztes GW der Saison)
    df_latest = (
        df.sort_values("GW", ascending=False).groupby("player_id").first().reset_index()
    )

    print(f"✅ {len(df_latest)} unique Spieler gefunden")

    # Spieler-Objekte erstellen
    players = []
    for _, row in df_latest.iterrows():
        player = {
            "player_id": int(row["player_id"]),
            "name": str(row["name"]),
            "team": str(row["team"]),
            "pos": str(row["pos"]),
            "price": round(
                float(row["price"]) / 10, 1
            ),  # Price ist in 0.1M, umrechnen zu M
            "predicted_points": (
                round(float(row["xP"]), 2) if pd.notna(row["xP"]) else 0.0
            ),
        }
        players.append(player)

    # Nach predicted_points sortieren
    players.sort(key=lambda p: p["predicted_points"], reverse=True)

    # Teams extrahieren (unique)
    teams = sorted(df_latest["team"].unique().tolist())

    print(f"🏆 {len(teams)} Teams gefunden:")
    for team in teams:
        count = len([p for p in players if p["team"] == team])
        print(f"   - {team}: {count} Spieler")

    # JSON erstellen
    output_data = {
        "season": "2023-24",
        "teams": teams,
        "players": players,
        "total_players": len(players),
        "total_teams": len(teams),
    }

    # Output-Verzeichnis erstellen
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON speichern
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Export erfolgreich: {output_path}")
    print(f"📊 {len(players)} Spieler, {len(teams)} Teams")


if __name__ == "__main__":
    main()
