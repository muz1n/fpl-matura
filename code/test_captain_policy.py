"""Test captain_policy Parameter mit prefer_minutes Tiebreak."""

import pandas as pd
from utils.team_builder import pick_lineup_autoformation


def test_captain_policy_prefer_minutes():
    """Testet dass captain_policy={'prefer_minutes': True} Gleichstaende mit p_start bricht."""

    # Erstelle einen 15-Spieler-Squad wo die Top 2 sehr aehnliche Scores haben
    squad = pd.DataFrame(
        [
            # GK
            {
                "player_id": 1,
                "name": "GK1",
                "position": "GK",
                "pred_points": 5.0,
                "p_start": 1.0,
                "price": 5.0,
            },
            {
                "player_id": 2,
                "name": "GK2",
                "position": "GK",
                "pred_points": 4.0,
                "p_start": 0.8,
                "price": 4.5,
            },
            # DEF
            {
                "player_id": 3,
                "name": "DEF1",
                "position": "DEF",
                "pred_points": 6.02,
                "p_start": 0.95,
                "price": 5.5,
            },
            {
                "player_id": 4,
                "name": "DEF2",
                "position": "DEF",
                "pred_points": 6.00,
                "p_start": 0.99,
                "price": 5.0,
            },
            {
                "player_id": 5,
                "name": "DEF3",
                "position": "DEF",
                "pred_points": 5.5,
                "p_start": 0.9,
                "price": 4.5,
            },
            {
                "player_id": 6,
                "name": "DEF4",
                "position": "DEF",
                "pred_points": 5.0,
                "p_start": 0.85,
                "price": 4.0,
            },
            {
                "player_id": 7,
                "name": "DEF5",
                "position": "DEF",
                "pred_points": 4.5,
                "p_start": 0.8,
                "price": 4.0,
            },
            # MID
            {
                "player_id": 8,
                "name": "MID1",
                "position": "MID",
                "pred_points": 5.8,
                "p_start": 0.92,
                "price": 7.0,
            },
            {
                "player_id": 9,
                "name": "MID2",
                "position": "MID",
                "pred_points": 5.5,
                "p_start": 0.88,
                "price": 6.5,
            },
            {
                "player_id": 10,
                "name": "MID3",
                "position": "MID",
                "pred_points": 5.0,
                "p_start": 0.85,
                "price": 6.0,
            },
            {
                "player_id": 11,
                "name": "MID4",
                "position": "MID",
                "pred_points": 4.5,
                "p_start": 0.8,
                "price": 5.5,
            },
            {
                "player_id": 12,
                "name": "MID5",
                "position": "MID",
                "pred_points": 4.0,
                "p_start": 0.75,
                "price": 5.0,
            },
            # FWD
            {
                "player_id": 13,
                "name": "FWD1",
                "position": "FWD",
                "pred_points": 5.5,
                "p_start": 0.9,
                "price": 9.0,
            },
            {
                "player_id": 14,
                "name": "FWD2",
                "position": "FWD",
                "pred_points": 5.0,
                "p_start": 0.85,
                "price": 8.0,
            },
            {
                "player_id": 15,
                "name": "FWD3",
                "position": "FWD",
                "pred_points": 4.5,
                "p_start": 0.8,
                "price": 7.0,
            },
        ]
    )

    print("=" * 80)
    print("TEST: Captain Policy with prefer_minutes")
    print("=" * 80)
    print("\nSzenario: DEF1 (6.02 pts, 95% start) vs DEF2 (6.00 pts, 99% start)")
    print("Score-Differenz: 0.02 (innerhalb epsilon 0.05)")
    print()

    # Test OHNE captain_policy (Standard-Verhalten)
    print("--- OHNE captain_policy (Standard) ---")
    result_default = pick_lineup_autoformation(
        squad_df=squad,
        prefer_minutes=False,  # p_start nicht in Score-Berechnung verwenden
    )
    captain_name_default = squad[squad["player_id"] == result_default["captain_id"]][
        "name"
    ].values[0]
    vice_name_default = squad[squad["player_id"] == result_default["vice_id"]][
        "name"
    ].values[0]
    print(f"Captain: {captain_name_default} (ID: {result_default['captain_id']})")
    print(f"Vice: {vice_name_default} (ID: {result_default['vice_id']})")
    print("Erwartet: DEF1 (hoechster Raw-Score)")
    print()

    # Test MIT captain_policy={'prefer_minutes': True}
    print("--- MIT captain_policy={'prefer_minutes': True} ---")
    result_policy = pick_lineup_autoformation(
        squad_df=squad,
        prefer_minutes=False,  # p_start nicht in Score-Berechnung verwenden
        captain_policy={"prefer_minutes": True},
    )
    captain_name_policy = squad[squad["player_id"] == result_policy["captain_id"]][
        "name"
    ].values[0]
    vice_name_policy = squad[squad["player_id"] == result_policy["vice_id"]][
        "name"
    ].values[0]
    print(f"Captain: {captain_name_policy} (ID: {result_policy['captain_id']})")
    print(f"Vice: {vice_name_policy} (ID: {result_policy['vice_id']})")
    print("Erwartet: DEF2 (hoehere p_start: 0.99 > 0.95, innerhalb epsilon)")
    print()

    # Verhalten verifizieren
    if result_default["captain_id"] == 3:  # DEF1
        print("✓ Standard-Verhalten: Hoechster Score (DEF1) ist Kapitaen")
    else:
        print(
            f"✗ Standard-Verhalten unerwartet: Captain ID {result_default['captain_id']}"
        )

    if result_policy["captain_id"] == 4:  # DEF2
        print(
            "✓ Policy-Verhalten: Hoehere p_start (DEF2) ist Kapitaen wenn innerhalb epsilon"
        )
    else:
        print(
            f"✗ Policy-Verhalten unerwartet: Captain ID {result_policy['captain_id']}"
        )

    print()
    print("=" * 80)
    print("TEST ABGESCHLOSSEN")
    print("=" * 80)


if __name__ == "__main__":
    test_captain_policy_prefer_minutes()
