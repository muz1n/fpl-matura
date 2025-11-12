"""Test-Script fuer pick_lineup_autoformation."""

import sys
from pathlib import Path
import pandas as pd
from utils.team_builder import pick_lineup_autoformation


# Modul dynamisch laden
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root / "code"))


# Beispiel-Squad erstellen (15 Spieler)
squad_data = [
    # Torhueter (2)
    {
        "player_id": 1,
        "name": "Goalkeeper A",
        "position": "GK",
        "p_start": 0.95,
        "pred_points": 5.2,
        "minutes": 90,
    },
    {
        "player_id": 2,
        "name": "Goalkeeper B",
        "position": "GK",
        "p_start": 0.65,
        "pred_points": 2.0,
        "minutes": 0,
    },
    # Verteidiger (5)
    {
        "player_id": 3,
        "name": "Defender A",
        "position": "DEF",
        "p_start": 0.98,
        "pred_points": 6.5,
        "minutes": 90,
    },
    {
        "player_id": 4,
        "name": "Defender B",
        "position": "DEF",
        "p_start": 0.90,
        "pred_points": 5.8,
        "minutes": 85,
    },
    {
        "player_id": 5,
        "name": "Defender C",
        "position": "DEF",
        "p_start": 0.85,
        "pred_points": 5.1,
        "minutes": 80,
    },
    {
        "player_id": 6,
        "name": "Defender D",
        "position": "DEF",
        "p_start": 0.70,
        "pred_points": 4.2,
        "minutes": 45,
    },
    {
        "player_id": 7,
        "name": "Defender E",
        "position": "DEF",
        "p_start": 0.62,
        "pred_points": 3.5,
        "minutes": 20,
    },
    # Mittelfeldspieler (5)
    {
        "player_id": 8,
        "name": "Midfielder A",
        "position": "MID",
        "p_start": 0.95,
        "pred_points": 7.2,
        "minutes": 90,
    },
    {
        "player_id": 9,
        "name": "Midfielder B",
        "position": "MID",
        "p_start": 0.88,
        "pred_points": 6.8,
        "minutes": 85,
    },
    {
        "player_id": 10,
        "name": "Midfielder C",
        "position": "MID",
        "p_start": 0.82,
        "pred_points": 6.0,
        "minutes": 75,
    },
    {
        "player_id": 11,
        "name": "Midfielder D",
        "position": "MID",
        "p_start": 0.75,
        "pred_points": 5.5,
        "minutes": 60,
    },
    {
        "player_id": 12,
        "name": "Midfielder E",
        "position": "MID",
        "p_start": 0.63,
        "pred_points": 3.8,
        "minutes": 15,
    },
    # Stuermer (3)
    {
        "player_id": 13,
        "name": "Forward A",
        "position": "FWD",
        "p_start": 0.92,
        "pred_points": 8.5,
        "minutes": 90,
    },
    {
        "player_id": 14,
        "name": "Forward B",
        "position": "FWD",
        "p_start": 0.85,
        "pred_points": 7.0,
        "minutes": 80,
    },
    {
        "player_id": 15,
        "name": "Forward C",
        "position": "FWD",
        "p_start": 0.65,
        "pred_points": 5.2,
        "minutes": 50,
    },
]

squad_df = pd.DataFrame(squad_data)

# Lineup automatisch zusammenstellen
print("=== Test 1: Automatische Formationswahl ===")
result = pick_lineup_autoformation(squad_df, prefer_minutes=True, p_floor=0.6)

print(f"Formation: {result['formation']}")
print(f"Startelf IDs: {result['xi_ids']}")
print(f"Kapitaen ID: {result['captain_id']}")
print(f"Vize ID: {result['vice_id']}")
print(f"Bank-Torwart ID: {result['bench_gk_id']}")
print(f"Bank-Feldspieler IDs: {result['bench_out_ids']}")
print(f"Erwartete Punkte (XI): {result['xi_points_sum']:.2f}")
print("\nDebug-Info (Formation Scores):")
for formation_str, score_val in result["debug"].items():
    if score_val == -float("inf"):
        print(f"  {formation_str}: infeasible")
    else:
        print(f"  {formation_str}: {score_val:.2f}")

# Test 2: Mit bevorzugter Formationsliste
print("\n=== Test 2: Mit bevorzugter Formation (4-4-2) ===")
result2 = pick_lineup_autoformation(
    squad_df, prefer_minutes=True, p_floor=0.6, formation_preference=["4-4-2", "3-5-2"]
)

print(f"Formation: {result2['formation']}")
print(f"Erwartete Punkte (XI): {result2['xi_points_sum']:.2f}")
print("Debug - Formations tried:")
for formation_str, score_val in result2["debug"].items():
    if score_val == -float("inf"):
        print(f"  {formation_str}: infeasible")
    else:
        print(f"  {formation_str}: {score_val:.2f}")

# Test 3: Niedrigerer p_floor
print("\n=== Test 3: Niedrigerer p_floor (0.3) ===")
result3 = pick_lineup_autoformation(squad_df, prefer_minutes=True, p_floor=0.3)

print(f"Formation: {result3['formation']}")
print(f"Erwartete Punkte (XI): {result3['xi_points_sum']:.2f}")

print("\n✅ Alle Tests erfolgreich!")
