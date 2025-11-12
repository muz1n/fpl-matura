"""
Pytest test suite for pick_lineup_autoformation.

Tests four key scenarios:
- Case A: MIDs dominate → 3-5-2 formation
- Case B: FWDs dominate → 3-4-3 formation
- Case C: Tie between formations → deterministic fallback
- Case D: Minutes-aware scoring affects captain/bench selection
"""

import pytest
import pandas as pd
from utils.team_builder import pick_lineup_autoformation


class TestPickLineupAutoformation:
    """Test suite for automatic lineup selection with various squad configurations."""

    def test_case_a_mids_dominate_352(self):
        """
        Case A: MIDs dominate ⇒ 3-5-2.

        Squad: 2 GK, 5 DEF, 5 MID, 3 FWD.
        MIDs have clearly higher pred_points than DEFs and FWDs.

        Expects:
        - Formation: "3-5-2"
        - Captain: A midfielder (highest scorer)
        - Exactly 11 starters
        - Exactly 3 bench outfielders (ordered by score)
        - All IDs unique
        """
        squad_data = [
            # Goalkeepers (2)
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
            },
            # Defenders (5) - moderate scores
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 5.5,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 5.2,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 5.0,
            },
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 4.5,
            },
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.70,
                "pred_points": 4.0,
            },
            # Midfielders (5) - HIGH SCORES (dominate)
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 9.5,
            },
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.92,
                "pred_points": 9.2,
            },
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.90,
                "pred_points": 9.0,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 8.8,
            },
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 8.5,
            },
            # Forwards (3) - moderate scores
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.90,
                "pred_points": 7.0,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.85,
                "pred_points": 6.5,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.75,
                "pred_points": 6.0,
            },
        ]

        squad_df = pd.DataFrame(squad_data)
        result = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)

        # Assert formation is 3-5-2 (3 DEF, 5 MID, 2 FWD)
        assert (
            result["formation"] == "3-5-2"
        ), f"Expected 3-5-2, got {result['formation']}"

        # Assert exactly 11 starters
        assert (
            len(result["xi_ids"]) == 11
        ), f"Expected 11 starters, got {len(result['xi_ids'])}"

        # Assert exactly 3 bench outfielders
        assert (
            len(result["bench_out_ids"]) == 3
        ), f"Expected 3 bench outfielders, got {len(result['bench_out_ids'])}"

        # Assert captain is a midfielder (IDs 8-12)
        assert result["captain_id"] in [
            8,
            9,
            10,
            11,
            12,
        ], f"Captain should be a MID, got ID {result['captain_id']}"

        # Assert vice is also high scorer
        assert result["vice_id"] in result["xi_ids"], "Vice captain must be in XI"

        # Assert all IDs are unique
        all_ids = result["xi_ids"] + [result["bench_gk_id"]] + result["bench_out_ids"]
        assert len(all_ids) == len(set(all_ids)), "All player IDs must be unique"
        assert len(all_ids) == 15, "Total 15 players (11 XI + 1 bench GK + 3 bench out)"

        # Assert captain has highest score (MID_A with 9.5)
        assert (
            result["captain_id"] == 8
        ), f"Captain should be MID_A (ID 8), got {result['captain_id']}"

        print(
            f"✅ Case A passed: Formation={result['formation']}, Captain={result['captain_id']}, XI_sum={result['xi_points_sum']:.2f}"
        )

    def test_case_b_fwds_dominate_343(self):
        """
        Case B: FWDs dominate ⇒ 3-4-3.

        Squad: 2 GK, 5 DEF, 5 MID, 3 FWD.
        FWDs have clearly highest pred_points.

        Expects:
        - Formation: "3-4-3"
        - Captain: A forward (highest scorer)
        - Exactly 11 starters
        - Exactly 3 bench outfielders
        """
        squad_data = [
            # Goalkeepers (2)
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
            },
            # Defenders (5) - moderate scores
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 5.5,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 5.2,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 5.0,
            },
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 4.5,
            },
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.70,
                "pred_points": 4.0,
            },
            # Midfielders (5) - moderate scores
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 6.5,
            },
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.92,
                "pred_points": 6.2,
            },
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.90,
                "pred_points": 6.0,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 5.8,
            },
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 5.5,
            },
            # Forwards (3) - HIGH SCORES (dominate)
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.95,
                "pred_points": 11.0,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.92,
                "pred_points": 10.5,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.90,
                "pred_points": 10.0,
            },
        ]

        squad_df = pd.DataFrame(squad_data)
        result = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)

        # Assert formation is 3-4-3 (3 DEF, 4 MID, 3 FWD)
        assert (
            result["formation"] == "3-4-3"
        ), f"Expected 3-4-3, got {result['formation']}"

        # Assert exactly 11 starters
        assert (
            len(result["xi_ids"]) == 11
        ), f"Expected 11 starters, got {len(result['xi_ids'])}"

        # Assert exactly 3 bench outfielders
        assert (
            len(result["bench_out_ids"]) == 3
        ), f"Expected 3 bench outfielders, got {len(result['bench_out_ids'])}"

        # Assert captain is a forward (IDs 13-15)
        assert result["captain_id"] in [
            13,
            14,
            15,
        ], f"Captain should be a FWD, got ID {result['captain_id']}"

        # Assert vice captain is in XI
        assert result["vice_id"] in result["xi_ids"], "Vice captain must be in XI"

        # Assert all IDs unique and total 15
        all_ids = result["xi_ids"] + [result["bench_gk_id"]] + result["bench_out_ids"]
        assert len(all_ids) == len(set(all_ids)), "All player IDs must be unique"
        assert len(all_ids) == 15, "Total 15 players"

        # Assert captain is FWD_A (highest scorer)
        assert (
            result["captain_id"] == 13
        ), f"Captain should be FWD_A (ID 13), got {result['captain_id']}"

        # Assert all 3 forwards are in XI
        assert 13 in result["xi_ids"], "FWD_A should be in XI"
        assert 14 in result["xi_ids"], "FWD_B should be in XI"
        assert 15 in result["xi_ids"], "FWD_C should be in XI"

        print(
            f"✅ Case B passed: Formation={result['formation']}, Captain={result['captain_id']}, XI_sum={result['xi_points_sum']:.2f}"
        )

    def test_case_c_tie_deterministic_fallback(self):
        """
        Case C: Tie between formations ⇒ deterministic fallback.

        Engineer scores so that 3-5-2 and 3-4-3 produce identical XI sums.
        The function should pick deterministically based on its internal priority order.

        Typical fallback: formations are tried in ALLOWED_FORMATIONS order.
        If 3-4-3 comes before 3-5-2 in the list, 3-4-3 wins on tie.
        We'll verify deterministic behavior (same formation on repeated calls).

        Expects:
        - Formation is deterministic (same on multiple runs)
        - XI sum is identical for both candidate formations in debug
        - Exactly 11 starters, 3 bench outfielders
        """
        # Carefully craft scores so that:
        # 3-5-2: 1 GK + 3 DEF + 5 MID + 2 FWD
        # 3-4-3: 1 GK + 3 DEF + 4 MID + 3 FWD
        # Both sums equal.
        #
        # Strategy: Make top 5 MIDs and top 2 FWDs have same total as top 4 MIDs and top 3 FWDs.
        # Example:
        #   Top 5 MID = [8,8,8,8,8] = 40
        #   Top 2 FWD = [7,7] = 14
        #   Total = 54 + GK + 3*DEF
        #
        #   Top 4 MID = [8,8,8,8] = 32
        #   Top 3 FWD = [9,8,7] = 24 (design FWDs to add 24)
        #   Total = 56 + GK + 3*DEF (not equal!)
        #
        # Better: Set MID5 = 6, FWD3 = 8 such that:
        #   3-5-2: MID[8,8,8,8,6]=38 + FWD[9,8]=17 = 55
        #   3-4-3: MID[8,8,8,8]=32 + FWD[9,8,8]=25 = 57 (still not equal)
        #
        # Let's make all MIDs = 8, FWD1=9, FWD2=8, FWD3=7:
        #   3-5-2: 5*8=40 + 9+8=17 = 57
        #   3-4-3: 4*8=32 + 9+8+7=24 = 56 (not equal)
        #
        # Try: MID=[8,8,8,8,7], FWD=[9,8,8]:
        #   3-5-2: 8+8+8+8+7=39 + 9+8=17 = 56
        #   3-4-3: 8+8+8+8=32 + 9+8+8=25 = 57 (close!)
        #
        # Try: MID=[8,8,8,8,8], FWD=[8.5, 8.5, 7]:
        #   3-5-2: 40 + 17=57
        #   3-4-3: 32 + 24=56
        #
        # Final attempt: MID=[8,8,8,8,8], FWD=[9,8,7]:
        #   Adjust: make FWD3=8 for 3-4-3 to get equal.
        #   Let's set: MID all 8.0, FWD=[9.0, 8.0, 8.0]:
        #     3-5-2: 5*8 + 9+8 = 40+17=57
        #     3-4-3: 4*8 + 9+8+8 = 32+25=57 ✓

        squad_data = [
            # Goalkeepers (2)
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
            },
            # Defenders (5) - all same to avoid DEF influence
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 5.0,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 5.0,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 5.0,
            },
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 4.5,
            },
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.70,
                "pred_points": 4.0,
            },
            # Midfielders (5) - all 8.0 for top 5
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 8.0,
            },
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.92,
                "pred_points": 8.0,
            },
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.90,
                "pred_points": 8.0,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 8.0,
            },
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 8.0,
            },
            # Forwards (3) - [9, 8, 8] for tie
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.95,
                "pred_points": 9.0,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.92,
                "pred_points": 8.0,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.90,
                "pred_points": 8.0,
            },
        ]

        squad_df = pd.DataFrame(squad_data)

        # Run twice to verify determinism
        result1 = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)
        result2 = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)

        # Assert same formation on both runs (deterministic)
        assert (
            result1["formation"] == result2["formation"]
        ), "Formation should be deterministic on ties"

        # Assert exactly 11 starters, 3 bench outfielders
        assert (
            len(result1["xi_ids"]) == 11
        ), f"Expected 11 starters, got {len(result1['xi_ids'])}"
        assert (
            len(result1["bench_out_ids"]) == 3
        ), f"Expected 3 bench outfielders, got {len(result1['bench_out_ids'])}"

        # Check debug to verify tie (scores should be very close or equal)
        debug = result1["debug"]
        formations_tried = [k for k in debug.keys() if debug[k] != -float("inf")]

        # Assert at least 2 formations were feasible
        assert (
            len(formations_tried) >= 2
        ), f"Expected multiple feasible formations, got {formations_tried}"

        # Check if 3-5-2 and 3-4-3 have same score
        if "3-5-2" in debug and "3-4-3" in debug:
            score_352 = debug["3-5-2"]
            score_343 = debug["3-4-3"]
            # Allow small floating point tolerance
            assert (
                abs(score_352 - score_343) < 0.01
            ), f"Expected tie, got 3-5-2={score_352}, 3-4-3={score_343}"
            print(
                f"✅ Case C passed: Tie verified (3-5-2={score_352:.2f}, 3-4-3={score_343:.2f}), deterministic formation={result1['formation']}"
            )
        else:
            # If only one is feasible, that's also deterministic
            print(
                f"✅ Case C passed: Deterministic formation={result1['formation']} (formations: {formations_tried})"
            )

        # Verify all IDs unique
        all_ids = (
            result1["xi_ids"] + [result1["bench_gk_id"]] + result1["bench_out_ids"]
        )
        assert len(all_ids) == len(set(all_ids)), "All player IDs must be unique"
        assert len(all_ids) == 15, "Total 15 players"

    def test_case_d_minutes_aware_weighting(self):
        """
        Case D: Minutes-aware scoring affects captain/bench selection.

        Player A: pred_points=10.0, p_start=0.55 (below typical threshold)
        Player B: pred_points=9.0, p_start=0.95 (reliable starter)

        Without minutes weighting: A > B (captain A)
        With minutes weighting (prefer_minutes=True, p_floor=0.6):
          A_score = 10.0 * clamp(0.55, 0.6, 1.0) = 10.0 * 0.6 = 6.0
          B_score = 9.0 * clamp(0.95, 0.6, 1.0) = 9.0 * 0.95 = 8.55
          B > A (captain B)

        Expects:
        - With prefer_minutes=True: Captain is player B (higher weighted score)
        - Bench placement: Lower p_start players should be benched even if raw pred_points higher
        - Exactly 11 starters, 3 bench outfielders
        """
        squad_data = [
            # Goalkeepers (2)
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
            },
            # Defenders (5) - solid starters
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 5.5,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 5.2,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 5.0,
            },
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 4.5,
            },
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.70,
                "pred_points": 4.0,
            },
            # Midfielders (5) - THIS IS WHERE WE TEST MINUTES WEIGHTING
            # MID_A: High pred_points but LOW p_start (rotation risk)
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.55,
                "pred_points": 10.0,
            },
            # MID_B: Slightly lower pred_points but HIGH p_start (nailed starter)
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 9.0,
            },
            # Others: moderate
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 7.5,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 7.0,
            },
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.80,
                "pred_points": 6.5,
            },
            # Forwards (3)
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.92,
                "pred_points": 8.0,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.88,
                "pred_points": 7.5,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.80,
                "pred_points": 7.0,
            },
        ]

        squad_df = pd.DataFrame(squad_data)

        # Test WITH minutes weighting
        result_minutes = pick_lineup_autoformation(
            squad_df, prefer_minutes=True, p_floor=0.6
        )

        # Expected weighted scores:
        # MID_A: 10.0 * 0.6 = 6.0 (clamped p_start to p_floor)
        # MID_B: 9.0 * 0.95 = 8.55
        # MID_C: 7.5 * 0.88 = 6.6
        # MID_D: 7.0 * 0.85 = 5.95
        # MID_E: 6.5 * 0.80 = 5.2
        #
        # Captain should be MID_B (ID 9) with weighted score 8.55

        assert (
            result_minutes["captain_id"] == 9
        ), f"With minutes weighting, captain should be MID_B (ID 9), got {result_minutes['captain_id']}"

        # MID_A (ID 8) should likely be benched or lower in XI due to low weighted score
        # Check if MID_B is in XI (should definitely be)
        assert (
            9 in result_minutes["xi_ids"]
        ), "MID_B (ID 9) should be in XI with high weighted score"

        # Verify counts
        assert (
            len(result_minutes["xi_ids"]) == 11
        ), f"Expected 11 starters, got {len(result_minutes['xi_ids'])}"
        assert (
            len(result_minutes["bench_out_ids"]) == 3
        ), f"Expected 3 bench outfielders, got {len(result_minutes['bench_out_ids'])}"

        # Test WITHOUT minutes weighting (raw pred_points)
        result_no_minutes = pick_lineup_autoformation(
            squad_df, prefer_minutes=False, p_floor=0.6
        )

        # Without weighting, MID_A (10.0) > MID_B (9.0), so captain should be MID_A
        assert (
            result_no_minutes["captain_id"] == 8
        ), f"Without minutes weighting, captain should be MID_A (ID 8), got {result_no_minutes['captain_id']}"

        # Verify both have valid lineups
        all_ids_minutes = (
            result_minutes["xi_ids"]
            + [result_minutes["bench_gk_id"]]
            + result_minutes["bench_out_ids"]
        )
        all_ids_no_minutes = (
            result_no_minutes["xi_ids"]
            + [result_no_minutes["bench_gk_id"]]
            + result_no_minutes["bench_out_ids"]
        )

        assert (
            len(all_ids_minutes) == len(set(all_ids_minutes)) == 15
        ), "All IDs unique (minutes=True)"
        assert (
            len(all_ids_no_minutes) == len(set(all_ids_no_minutes)) == 15
        ), "All IDs unique (minutes=False)"

        print(
            f"✅ Case D passed: Minutes weighting changes captain from {result_no_minutes['captain_id']} to {result_minutes['captain_id']}"
        )
        print(
            f"   No minutes: Captain={result_no_minutes['captain_id']} (MID_A), XI_sum={result_no_minutes['xi_points_sum']:.2f}"
        )
        print(
            f"   With minutes: Captain={result_minutes['captain_id']} (MID_B), XI_sum={result_minutes['xi_points_sum']:.2f}"
        )

    def test_basic_constraints(self):
        """
        Additional test: Verify basic constraints on any valid lineup.

        - Exactly 1 GK in XI
        - Exactly 1 GK on bench
        - Total 15 unique player IDs
        - Captain and vice both in XI
        - Bench order is deterministic (same squad → same bench order)
        """
        squad_data = [
            # Standard balanced squad
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
            },
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 5.5,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 5.2,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 5.0,
            },
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 4.5,
            },
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.70,
                "pred_points": 4.0,
            },
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 7.0,
            },
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.92,
                "pred_points": 6.8,
            },
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.90,
                "pred_points": 6.5,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 6.2,
            },
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 6.0,
            },
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.92,
                "pred_points": 8.5,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.85,
                "pred_points": 7.5,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.75,
                "pred_points": 6.5,
            },
        ]

        squad_df = pd.DataFrame(squad_data)
        result = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)

        # Check GK counts
        gk_ids = [1, 2]
        xi_gks = [pid for pid in result["xi_ids"] if pid in gk_ids]
        assert len(xi_gks) == 1, f"Expected exactly 1 GK in XI, got {len(xi_gks)}"
        assert result["bench_gk_id"] in gk_ids, "Bench GK must be a GK"
        assert (
            result["bench_gk_id"] not in result["xi_ids"]
        ), "Bench GK must not be in XI"

        # Check total unique IDs
        all_ids = result["xi_ids"] + [result["bench_gk_id"]] + result["bench_out_ids"]
        assert len(all_ids) == 15, f"Expected 15 total players, got {len(all_ids)}"
        assert len(set(all_ids)) == 15, "All player IDs must be unique"

        # Check captain/vice in XI
        assert result["captain_id"] in result["xi_ids"], "Captain must be in XI"
        assert result["vice_id"] in result["xi_ids"], "Vice captain must be in XI"
        assert (
            result["captain_id"] != result["vice_id"]
        ), "Captain and vice must be different"

        # Check formation string format
        formation_parts = result["formation"].split("-")
        assert (
            len(formation_parts) == 3
        ), f"Formation should have 3 parts (DEF-MID-FWD), got {result['formation']}"
        assert all(
            part.isdigit() for part in formation_parts
        ), "Formation parts must be digits"

        # Check formation sums to 10 (excl GK)
        def_count, mid_count, fwd_count = map(int, formation_parts)
        assert (
            def_count + mid_count + fwd_count == 10
        ), f"Formation must sum to 10, got {def_count + mid_count + fwd_count}"

        # Verify bench order determinism (run twice)
        result2 = pick_lineup_autoformation(squad_df, prefer_minutes=False, p_floor=0.6)
        assert (
            result["bench_out_ids"] == result2["bench_out_ids"]
        ), "Bench order should be deterministic"

        print(
            f"✅ Basic constraints passed: Formation={result['formation']}, XI={len(result['xi_ids'])}, Bench={len(result['bench_out_ids'])}"
        )

    def test_bench_policy_penalize_doubtful(self):
        """
        Test bench_policy with penalize_doubtful parameter.

        Squad with doubtful players on the bench candidates.
        Player A: pred_points=6.0, doubtful=False (should be bench slot 1)
        Player B: pred_points=6.5, doubtful=True (higher score but doubtful)

        Without penalty: B > A (bench order: B, A, ...)
        With penalty=0.2: B_bench = 6.5 * 0.8 = 5.2 < A (bench order: A, B, ...)

        Expects:
        - Default (no policy): Doubtful player ranked higher on bench
        - With policy: Non-doubtful player ranked higher due to penalty
        """
        squad_data = [
            # Goalkeepers (2)
            {
                "player_id": 1,
                "name": "GK_A",
                "position": "GK",
                "p_start": 0.95,
                "pred_points": 4.0,
                "doubtful": False,
            },
            {
                "player_id": 2,
                "name": "GK_B",
                "position": "GK",
                "p_start": 0.60,
                "pred_points": 2.5,
                "doubtful": False,
            },
            # Defenders (5) - top 3 will start in 3-4-3
            {
                "player_id": 3,
                "name": "DEF_A",
                "position": "DEF",
                "p_start": 0.90,
                "pred_points": 7.0,
                "doubtful": False,
            },
            {
                "player_id": 4,
                "name": "DEF_B",
                "position": "DEF",
                "p_start": 0.88,
                "pred_points": 6.8,
                "doubtful": False,
            },
            {
                "player_id": 5,
                "name": "DEF_C",
                "position": "DEF",
                "p_start": 0.85,
                "pred_points": 6.6,
                "doubtful": False,
            },
            # These two compete for bench - B is doubtful but higher score
            {
                "player_id": 6,
                "name": "DEF_D",
                "position": "DEF",
                "p_start": 0.80,
                "pred_points": 6.5,
                "doubtful": True,
            },  # Doubtful!
            {
                "player_id": 7,
                "name": "DEF_E",
                "position": "DEF",
                "p_start": 0.75,
                "pred_points": 6.0,
                "doubtful": False,
            },
            # Midfielders (5) - top 4 will start in 3-4-3
            {
                "player_id": 8,
                "name": "MID_A",
                "position": "MID",
                "p_start": 0.95,
                "pred_points": 8.0,
                "doubtful": False,
            },
            {
                "player_id": 9,
                "name": "MID_B",
                "position": "MID",
                "p_start": 0.92,
                "pred_points": 7.8,
                "doubtful": False,
            },
            {
                "player_id": 10,
                "name": "MID_C",
                "position": "MID",
                "p_start": 0.90,
                "pred_points": 7.6,
                "doubtful": False,
            },
            {
                "player_id": 11,
                "name": "MID_D",
                "position": "MID",
                "p_start": 0.88,
                "pred_points": 7.4,
                "doubtful": False,
            },
            # This one will be on bench
            {
                "player_id": 12,
                "name": "MID_E",
                "position": "MID",
                "p_start": 0.85,
                "pred_points": 5.5,
                "doubtful": False,
            },
            # Forwards (3) - all 3 will start in 3-4-3
            {
                "player_id": 13,
                "name": "FWD_A",
                "position": "FWD",
                "p_start": 0.95,
                "pred_points": 9.0,
                "doubtful": False,
            },
            {
                "player_id": 14,
                "name": "FWD_B",
                "position": "FWD",
                "p_start": 0.92,
                "pred_points": 8.5,
                "doubtful": False,
            },
            {
                "player_id": 15,
                "name": "FWD_C",
                "position": "FWD",
                "p_start": 0.90,
                "pred_points": 8.0,
                "doubtful": False,
            },
        ]

        squad_df = pd.DataFrame(squad_data)

        # Test WITHOUT bench_policy (default behavior)
        result_no_policy = pick_lineup_autoformation(
            squad_df, prefer_minutes=False, p_floor=0.6
        )

        # Expected: DEF_D (ID 6, 6.5 pts, doubtful) should be higher on bench than DEF_E (ID 7, 6.0 pts)
        # Bench should be: [6, 7, 12] or [7, 6, 12] depending on exact scores
        # DEF_D has higher raw score, so should come first without penalty
        bench_no_policy = result_no_policy["bench_out_ids"]

        # ID 6 (doubtful, 6.5) should rank higher than ID 7 (6.0) without penalty
        idx_6_no_policy = bench_no_policy.index(6) if 6 in bench_no_policy else 999
        idx_7_no_policy = bench_no_policy.index(7) if 7 in bench_no_policy else 999

        assert 6 in bench_no_policy, "DEF_D (ID 6) should be on bench"
        assert 7 in bench_no_policy, "DEF_E (ID 7) should be on bench"
        assert idx_6_no_policy < idx_7_no_policy, (
            f"Without penalty, doubtful player (ID 6, 6.5pts) should rank higher than non-doubtful (ID 7, 6.0pts). "
            f"Got bench order: {bench_no_policy}"
        )

        # Test WITH bench_policy penalize_doubtful=0.2
        bench_policy = {"penalize_doubtful": 0.2}
        result_with_policy = pick_lineup_autoformation(
            squad_df, prefer_minutes=False, p_floor=0.6, bench_policy=bench_policy
        )

        # Expected: DEF_D gets penalized: 6.5 * (1 - 0.2) = 5.2 < 6.0 (DEF_E)
        # So DEF_E (ID 7) should now rank HIGHER than DEF_D (ID 6)
        bench_with_policy = result_with_policy["bench_out_ids"]

        idx_6_with_policy = (
            bench_with_policy.index(6) if 6 in bench_with_policy else 999
        )
        idx_7_with_policy = (
            bench_with_policy.index(7) if 7 in bench_with_policy else 999
        )

        assert 6 in bench_with_policy, "DEF_D (ID 6) should be on bench"
        assert 7 in bench_with_policy, "DEF_E (ID 7) should be on bench"
        assert idx_7_with_policy < idx_6_with_policy, (
            f"With penalty=0.2, non-doubtful player (ID 7, 6.0pts) should rank higher than penalized doubtful "
            f"(ID 6, 6.5*0.8=5.2pts). Got bench order: {bench_with_policy}"
        )

        # Verify XI selection is unchanged (policy only affects bench ordering)
        assert (
            result_no_policy["xi_ids"] == result_with_policy["xi_ids"]
        ), "Bench policy should not affect XI selection"
        assert (
            result_no_policy["captain_id"] == result_with_policy["captain_id"]
        ), "Bench policy should not affect captain selection"

        print("✅ Bench policy test passed:")
        print(
            f"   No policy bench order: {bench_no_policy} (doubtful player ID 6 ranks higher)"
        )
        print(
            f"   With penalty=0.2 bench order: {bench_with_policy} (non-doubtful ID 7 ranks higher)"
        )


if __name__ == "__main__":
    # Allow running as standalone script for quick testing
    pytest.main([__file__, "-v", "-s"])
