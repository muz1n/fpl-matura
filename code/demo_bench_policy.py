"""
Demonstration of bench_policy feature for pick_lineup_autoformation.

Shows how the penalize_doubtful parameter affects bench ordering when
certain players have injury doubts or fitness concerns.
"""

import pandas as pd
from utils.team_builder import pick_lineup_autoformation


def print_bench_comparison():
    """Compare bench ordering with and without doubtful penalty."""

    # Create squad with some doubtful players
    squad_data = [
        # Goalkeepers
        {
            "player_id": 1,
            "name": "Alisson",
            "position": "GK",
            "pred_points": 5.0,
            "p_start": 0.95,
            "doubtful": False,
        },
        {
            "player_id": 2,
            "name": "Kelleher",
            "position": "GK",
            "pred_points": 3.0,
            "p_start": 0.70,
            "doubtful": False,
        },
        # Defenders (top 3 start, bottom 2 compete for bench)
        {
            "player_id": 3,
            "name": "TAA",
            "position": "DEF",
            "pred_points": 7.0,
            "p_start": 0.95,
            "doubtful": False,
        },
        {
            "player_id": 4,
            "name": "Van Dijk",
            "position": "DEF",
            "pred_points": 6.5,
            "p_start": 0.90,
            "doubtful": False,
        },
        {
            "player_id": 5,
            "name": "Robertson",
            "position": "DEF",
            "pred_points": 6.0,
            "p_start": 0.88,
            "doubtful": False,
        },
        {
            "player_id": 6,
            "name": "Konate",
            "position": "DEF",
            "pred_points": 5.5,
            "p_start": 0.80,
            "doubtful": True,
        },  # Injury concern!
        {
            "player_id": 7,
            "name": "Gomez",
            "position": "DEF",
            "pred_points": 5.0,
            "p_start": 0.75,
            "doubtful": False,
        },
        # Midfielders (top 4 start)
        {
            "player_id": 8,
            "name": "Salah",
            "position": "MID",
            "pred_points": 9.0,
            "p_start": 0.98,
            "doubtful": False,
        },
        {
            "player_id": 9,
            "name": "Szoboszlai",
            "position": "MID",
            "pred_points": 7.5,
            "p_start": 0.85,
            "doubtful": False,
        },
        {
            "player_id": 10,
            "name": "Mac Allister",
            "position": "MID",
            "pred_points": 7.0,
            "p_start": 0.88,
            "doubtful": False,
        },
        {
            "player_id": 11,
            "name": "Gravenberch",
            "position": "MID",
            "pred_points": 6.5,
            "p_start": 0.85,
            "doubtful": False,
        },
        {
            "player_id": 12,
            "name": "Jones",
            "position": "MID",
            "pred_points": 5.0,
            "p_start": 0.70,
            "doubtful": False,
        },
        # Forwards (all 3 start in 3-4-3)
        {
            "player_id": 13,
            "name": "Nunez",
            "position": "FWD",
            "pred_points": 8.5,
            "p_start": 0.90,
            "doubtful": False,
        },
        {
            "player_id": 14,
            "name": "Diaz",
            "position": "FWD",
            "pred_points": 8.0,
            "p_start": 0.88,
            "doubtful": False,
        },
        {
            "player_id": 15,
            "name": "Gakpo",
            "position": "FWD",
            "pred_points": 7.5,
            "p_start": 0.85,
            "doubtful": False,
        },
    ]

    squad_df = pd.DataFrame(squad_data)

    print("=" * 70)
    print("BENCH POLICY DEMONSTRATION")
    print("=" * 70)
    print()
    print("Squad includes Konate (DEF, 5.5 pts) marked as DOUBTFUL")
    print("and Gomez (DEF, 5.0 pts) who is fit and available.")
    print()

    # Test 1: No policy (default behavior)
    print("─" * 70)
    print("TEST 1: No bench_policy (default)")
    print("─" * 70)
    result1 = pick_lineup_autoformation(squad_df, prefer_minutes=False)

    print(f"Formation: {result1['formation']}")
    print(f"Starting XI: {result1['xi_ids']}")
    print("\nBench order (by player_id):")
    for i, pid in enumerate(result1["bench_out_ids"], 1):
        player = squad_df[squad_df["player_id"] == pid].iloc[0]
        doubtful_flag = "⚠️  DOUBTFUL" if player["doubtful"] else ""
        print(
            f"  {i}. {player['name']} ({player['position']}, {player['pred_points']:.1f} pts) {doubtful_flag}"
        )

    print("\n→ Konate ranks HIGHER on bench due to better predicted points (5.5 > 5.0)")
    print("  despite being doubtful!")
    print()

    # Test 2: With penalize_doubtful
    print("─" * 70)
    print("TEST 2: With bench_policy={'penalize_doubtful': 0.25}")
    print("─" * 70)
    result2 = pick_lineup_autoformation(
        squad_df, prefer_minutes=False, bench_policy={"penalize_doubtful": 0.25}
    )

    print(f"Formation: {result2['formation']}")
    print(f"Starting XI: {result2['xi_ids']}")
    print("\nBench order (by player_id):")
    for i, pid in enumerate(result2["bench_out_ids"], 1):
        player = squad_df[squad_df["player_id"] == pid].iloc[0]
        doubtful_flag = "⚠️  DOUBTFUL" if player["doubtful"] else ""
        effective_score = player["pred_points"] * (0.75 if player["doubtful"] else 1.0)
        score_note = (
            f" (bench score: {effective_score:.2f})" if player["doubtful"] else ""
        )
        print(
            f"  {i}. {player['name']} ({player['position']}, {player['pred_points']:.1f} pts{score_note}) {doubtful_flag}"
        )

    print("\n→ Konate's bench score penalized: 5.5 × 0.75 = 4.125 < 5.0")
    print("  Gomez now ranks HIGHER on bench as the safer pick!")
    print()

    # Verify XI unchanged
    print("─" * 70)
    print("VERIFICATION")
    print("─" * 70)
    if result1["xi_ids"] == result2["xi_ids"]:
        print("✅ Starting XI unchanged (bench_policy only affects bench ordering)")
    else:
        print("❌ Starting XI changed (unexpected!)")

    if result1["captain_id"] == result2["captain_id"]:
        print("✅ Captain unchanged (bench_policy only affects bench ordering)")
    else:
        print("❌ Captain changed (unexpected!)")

    print()
    print("=" * 70)
    print("CONCLUSION")
    print("=" * 70)
    print("The bench_policy parameter allows you to de-prioritize doubtful players")
    print("for bench slots, making your bench more reliable for auto-substitutions.")
    print("This is especially useful when players have:")
    print("  • Injury concerns")
    print("  • Fitness doubts")
    print("  • Press conference red flags")
    print()
    print("Default behavior (no penalty) remains unchanged for backward compatibility.")
    print("=" * 70)


if __name__ == "__main__":
    print_bench_comparison()
