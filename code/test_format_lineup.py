"""Test format_lineup_table function."""

import pandas as pd
from utils.team_builder import pick_lineup_autoformation, format_lineup_table


def test_format_lineup_table():
    """Test that format_lineup_table produces a readable string table."""

    # Create a 15-player squad
    squad = pd.DataFrame(
        [
            # GK
            {
                "player_id": 1,
                "name": "Alisson",
                "position": "GK",
                "pred_points": 5.2,
                "p_start": 1.0,
                "price": 5.5,
            },
            {
                "player_id": 2,
                "name": "Kelleher",
                "position": "GK",
                "pred_points": 3.8,
                "p_start": 0.3,
                "price": 4.0,
            },
            # DEF
            {
                "player_id": 3,
                "name": "Alexander-Arnold",
                "position": "DEF",
                "pred_points": 6.5,
                "p_start": 0.95,
                "price": 7.5,
            },
            {
                "player_id": 4,
                "name": "Robertson",
                "position": "DEF",
                "pred_points": 6.2,
                "p_start": 0.98,
                "price": 6.5,
            },
            {
                "player_id": 5,
                "name": "Van Dijk",
                "position": "DEF",
                "pred_points": 5.8,
                "p_start": 0.92,
                "price": 6.0,
            },
            {
                "player_id": 6,
                "name": "Gabriel",
                "position": "DEF",
                "pred_points": 5.5,
                "p_start": 0.90,
                "price": 5.5,
            },
            {
                "player_id": 7,
                "name": "White",
                "position": "DEF",
                "pred_points": 4.8,
                "p_start": 0.85,
                "price": 5.0,
            },
            # MID
            {
                "player_id": 8,
                "name": "Salah",
                "position": "MID",
                "pred_points": 8.5,
                "p_start": 0.99,
                "price": 13.0,
            },
            {
                "player_id": 9,
                "name": "Saka",
                "position": "MID",
                "pred_points": 7.2,
                "p_start": 0.95,
                "price": 10.0,
            },
            {
                "player_id": 10,
                "name": "Palmer",
                "position": "MID",
                "pred_points": 6.8,
                "p_start": 0.93,
                "price": 11.0,
            },
            {
                "player_id": 11,
                "name": "Foden",
                "position": "MID",
                "pred_points": 6.5,
                "p_start": 0.88,
                "price": 9.5,
            },
            {
                "player_id": 12,
                "name": "Gordon",
                "position": "MID",
                "pred_points": 5.2,
                "p_start": 0.85,
                "price": 7.5,
            },
            # FWD
            {
                "player_id": 13,
                "name": "Haaland",
                "position": "FWD",
                "pred_points": 9.2,
                "p_start": 0.97,
                "price": 14.5,
            },
            {
                "player_id": 14,
                "name": "Watkins",
                "position": "FWD",
                "pred_points": 6.5,
                "p_start": 0.90,
                "price": 9.0,
            },
            {
                "player_id": 15,
                "name": "Solanke",
                "position": "FWD",
                "pred_points": 5.8,
                "p_start": 0.88,
                "price": 7.5,
            },
        ]
    )

    print("=" * 80)
    print("TEST: format_lineup_table")
    print("=" * 80)
    print()

    # Pick lineup
    result = pick_lineup_autoformation(
        squad_df=squad,
        prefer_minutes=False,  # Use raw pred_points for clarity
    )

    print(f"Formation selected: {result['formation']}")
    print(f"Captain: {result['captain_id']}, Vice: {result['vice_id']}")
    print()

    # Format and display the table
    table = format_lineup_table(
        squad_df=squad,
        xi_ids=result["xi_ids"],
        bench_gk_id=result["bench_gk_id"],
        bench_out_ids=result["bench_out_ids"],
        captain_id=result["captain_id"],
        vice_id=result["vice_id"],
    )

    print(table)
    print()

    # Verify it's a string
    assert isinstance(table, str), "format_lineup_table should return a string"

    # Verify it contains expected sections
    assert "STARTING XI" in table, "Table should have STARTING XI section"
    assert "BENCH" in table, "Table should have BENCH section"
    assert "[GK]" in table, "Table should mark bench goalkeeper"
    assert "[B1]" in table, "Table should have B1 marker"
    assert "[B2]" in table, "Table should have B2 marker"
    assert "[B3]" in table, "Table should have B3 marker"

    # Verify captain/vice markers
    assert "(C)" in table, "Table should mark captain"
    assert "(VC)" in table, "Table should mark vice-captain"

    print("✓ All assertions passed")
    print()
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_format_lineup_table()
