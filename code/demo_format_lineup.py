"""Demo of format_lineup_table with full workflow."""

import pandas as pd
from utils.team_builder import pick_lineup_autoformation, format_lineup_table


def demo_full_workflow():
    """Demonstrate complete workflow from squad to formatted table."""

    # Simulate a squad with various scenarios
    squad = pd.DataFrame(
        [
            # GK - one starter, one backup
            {
                "player_id": 1,
                "name": "Ederson",
                "position": "GK",
                "pred_points": 5.5,
                "p_start": 0.98,
                "price": 5.5,
            },
            {
                "player_id": 2,
                "name": "Ortega",
                "position": "GK",
                "pred_points": 4.0,
                "p_start": 0.15,
                "price": 4.0,
            },
            # DEF - mix of starters and rotation risks
            {
                "player_id": 3,
                "name": "Trippier",
                "position": "DEF",
                "pred_points": 6.8,
                "p_start": 0.95,
                "price": 7.0,
            },
            {
                "player_id": 4,
                "name": "Saliba",
                "position": "DEF",
                "pred_points": 6.5,
                "p_start": 0.98,
                "price": 6.0,
            },
            {
                "player_id": 5,
                "name": "Udogie",
                "position": "DEF",
                "pred_points": 5.9,
                "p_start": 0.88,
                "price": 5.0,
            },
            {
                "player_id": 6,
                "name": "Konsa",
                "position": "DEF",
                "pred_points": 5.2,
                "p_start": 0.85,
                "price": 4.5,
            },
            {
                "player_id": 7,
                "name": "Robinson",
                "position": "DEF",
                "pred_points": 4.8,
                "p_start": 0.80,
                "price": 4.5,
            },
            # MID - high scorers
            {
                "player_id": 8,
                "name": "Saka",
                "position": "MID",
                "pred_points": 8.2,
                "p_start": 0.97,
                "price": 10.0,
            },
            {
                "player_id": 9,
                "name": "Bruno Fernandes",
                "position": "MID",
                "pred_points": 7.5,
                "p_start": 0.95,
                "price": 8.5,
            },
            {
                "player_id": 10,
                "name": "Son",
                "position": "MID",
                "pred_points": 7.0,
                "p_start": 0.90,
                "price": 9.5,
            },
            {
                "player_id": 11,
                "name": "Maddison",
                "position": "MID",
                "pred_points": 6.2,
                "p_start": 0.85,
                "price": 7.5,
            },
            {
                "player_id": 12,
                "name": "Bowen",
                "position": "MID",
                "pred_points": 5.8,
                "p_start": 0.88,
                "price": 7.0,
            },
            # FWD - premium and budget options
            {
                "player_id": 13,
                "name": "Haaland",
                "position": "FWD",
                "pred_points": 9.5,
                "p_start": 0.99,
                "price": 14.5,
            },
            {
                "player_id": 14,
                "name": "Isak",
                "position": "FWD",
                "pred_points": 7.2,
                "p_start": 0.92,
                "price": 8.5,
            },
            {
                "player_id": 15,
                "name": "Welbeck",
                "position": "FWD",
                "pred_points": 5.5,
                "p_start": 0.75,
                "price": 5.5,
            },
        ]
    )

    print("\n" + "=" * 80)
    print("DEMO: Complete Workflow with format_lineup_table")
    print("=" * 80)
    print("\n1. Input: 15-player squad")
    print(f"   Total players: {len(squad)}")
    print(
        f"   GK: {len(squad[squad['position']=='GK'])}, "
        f"DEF: {len(squad[squad['position']=='DEF'])}, "
        f"MID: {len(squad[squad['position']=='MID'])}, "
        f"FWD: {len(squad[squad['position']=='FWD'])}"
    )

    print("\n2. Running pick_lineup_autoformation...")
    result = pick_lineup_autoformation(
        squad_df=squad,
        prefer_minutes=True,
        p_floor=0.6,
        captain_policy={"prefer_minutes": True},
    )

    print(f"   ✓ Formation selected: {result['formation']}")
    print(f"   ✓ XI predicted points sum: {result['xi_points_sum']:.2f}")
    print(f"   ✓ Captain: ID {result['captain_id']}")
    print(f"   ✓ Vice-captain: ID {result['vice_id']}")

    print("\n3. Formatting lineup table...")
    table = format_lineup_table(
        squad_df=squad,
        xi_ids=result["xi_ids"],
        bench_gk_id=result["bench_gk_id"],
        bench_out_ids=result["bench_out_ids"],
        captain_id=result["captain_id"],
        vice_id=result["vice_id"],
    )

    print("\n4. Final Output:")
    print(table)

    print("\n5. Verification:")
    captain_name = squad[squad["player_id"] == result["captain_id"]]["name"].values[0]
    vice_name = squad[squad["player_id"] == result["vice_id"]]["name"].values[0]
    print(f"   ✓ Captain: {captain_name}")
    print(f"   ✓ Vice-captain: {vice_name}")
    print(f"   ✓ Starting XI: {len(result['xi_ids'])} players")
    print(f"   ✓ Bench: 1 GK + {len(result['bench_out_ids'])} outfield")

    # Show formation details
    counts = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
    for pid in result["xi_ids"]:
        pos = squad[squad["player_id"] == pid]["position"].values[0]
        counts[pos] += 1
    print(f"\n6. Formation Breakdown ({result['formation']}):")
    print(
        f"   GK: {counts['GK']}, DEF: {counts['DEF']}, "
        f"MID: {counts['MID']}, FWD: {counts['FWD']}"
    )

    print("\n" + "=" * 80)
    print("DEMO COMPLETE - format_lineup_table ready for CLI integration!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    demo_full_workflow()
