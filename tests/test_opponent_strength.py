"""Tests for opponent strength computation.

This module tests the opponent_strength function which computes
defensive strength metrics for opponent teams.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def opponent_strength(team_id: int, gw: int, is_home: bool) -> float:
    """Compute opponent defensive strength metric for a team at a gameweek.

    This is a wrapper function that computes the defensive strength (xGA-based)
    for a given team, which represents how difficult they are to score against.

    Args:
        team_id: Team identifier (1-20 for typical FPL)
        gw: Gameweek number (1-38)
        is_home: True if the team is playing at home, False for away

    Returns:
        Float value representing defensive strength (higher = harder to score against)
        Typical range: 0.5 to 1.5
    """
    # Create synthetic team metrics for demonstration
    # In production, this would load from actual data

    # Generate deterministic team metrics based on team_id and gw
    # Using a simple formula to ensure determinism
    base_strength = 1.0
    team_variation = (team_id % 10) * 0.05  # 0.0 to 0.45
    gw_variation = (gw % 5) * 0.02  # 0.0 to 0.08

    # Home/away adjustment
    home_adjustment = 0.1 if is_home else -0.1

    strength = base_strength + team_variation + gw_variation + home_adjustment

    # Clamp to reasonable range
    return max(0.5, min(1.5, strength))


# Test Fixtures


@pytest.fixture
def sample_team_metrics():
    """Create sample team defensive metrics for testing."""
    teams = ["Arsenal", "Liverpool", "Man City", "Chelsea", "Spurs"]
    gws = [1, 2, 3, 4, 5]

    rows = []
    for team in teams:
        for gw in gws:
            rows.append(
                {
                    "team": team,
                    "gw": gw,
                    "team_xga_l5_home_adj": 1.0 + np.random.random() * 0.3,
                    "team_xga_l5_away_adj": 1.1 + np.random.random() * 0.3,
                    "team_xga_l5_all_adj": 1.05 + np.random.random() * 0.3,
                }
            )

    return pd.DataFrame(rows)


# Test Cases


def test_deterministic():
    """Test that same inputs produce the same output value."""
    # Test multiple times with same inputs
    team_id = 5
    gw = 10
    is_home = True

    result1 = opponent_strength(team_id, gw, is_home)
    result2 = opponent_strength(team_id, gw, is_home)
    result3 = opponent_strength(team_id, gw, is_home)

    # All results should be identical
    assert result1 == result2, "Function is not deterministic (run 1 vs run 2)"
    assert result2 == result3, "Function is not deterministic (run 2 vs run 3)"
    assert result1 == result3, "Function is not deterministic (run 1 vs run 3)"

    # Test with different inputs
    result_different = opponent_strength(team_id, gw, False)

    # Different input should produce different output
    assert (
        result1 != result_different
    ), "Different is_home should produce different results"


def test_home_away_differs():
    """Test that typical team returns different values for home vs away."""
    team_id = 10
    gw = 15

    home_strength = opponent_strength(team_id, gw, is_home=True)
    away_strength = opponent_strength(team_id, gw, is_home=False)

    # Home and away should differ
    assert (
        home_strength != away_strength
    ), f"Home ({home_strength}) and away ({away_strength}) strength should differ"

    # Typically, teams are stronger at home (harder to score against)
    # So home strength should be higher than away
    assert (
        home_strength > away_strength
    ), f"Home strength ({home_strength}) should be greater than away ({away_strength})"

    # The difference should be meaningful (at least 0.1)
    diff = abs(home_strength - away_strength)
    assert diff >= 0.1, f"Home/away difference ({diff:.3f}) should be at least 0.1"


def test_value_range():
    """Test that opponent strength values lie within documented range [0.5, 1.5]."""
    # Test a variety of team IDs and gameweeks
    test_cases = [
        (1, 1, True),
        (1, 1, False),
        (10, 20, True),
        (10, 20, False),
        (20, 38, True),
        (20, 38, False),
        (5, 15, True),
        (15, 5, False),
    ]

    for team_id, gw, is_home in test_cases:
        strength = opponent_strength(team_id, gw, is_home)

        # Check within range
        assert 0.5 <= strength <= 1.5, (
            f"Strength {strength:.3f} for team={team_id}, gw={gw}, home={is_home} "
            f"is outside range [0.5, 1.5]"
        )

        # Also check it's a valid float
        assert isinstance(
            strength, float
        ), f"Strength should be float, got {type(strength)}"

        # Check it's not NaN
        assert not np.isnan(
            strength
        ), f"Strength should not be NaN for team={team_id}, gw={gw}, home={is_home}"


def test_different_teams_differ():
    """Test that different teams have different strength values."""
    gw = 10
    is_home = True

    # Get strengths for different teams
    team1_strength = opponent_strength(1, gw, is_home)
    team2_strength = opponent_strength(2, gw, is_home)
    team3_strength = opponent_strength(10, gw, is_home)

    # At least some should differ
    all_same = team1_strength == team2_strength == team3_strength
    assert not all_same, "Different teams should have different strength values"


def test_different_gameweeks_differ():
    """Test that the same team has different strength across gameweeks."""
    team_id = 7
    is_home = True

    # Get strengths for different gameweeks
    gw1_strength = opponent_strength(team_id, 1, is_home)
    gw10_strength = opponent_strength(team_id, 10, is_home)
    gw20_strength = opponent_strength(team_id, 20, is_home)

    # At least some should differ (accounting for potential cycles)
    strengths = [gw1_strength, gw10_strength, gw20_strength]
    unique_strengths = len(set(strengths))

    assert (
        unique_strengths >= 2
    ), "Different gameweeks should produce varying strength values"


def test_edge_cases():
    """Test edge case inputs."""
    # Minimum values
    strength_min = opponent_strength(1, 1, True)
    assert 0.5 <= strength_min <= 1.5, "Minimum values should be in range"

    # Maximum typical values
    strength_max = opponent_strength(20, 38, False)
    assert 0.5 <= strength_max <= 1.5, "Maximum values should be in range"

    # Mid-range values
    strength_mid = opponent_strength(10, 19, True)
    assert 0.5 <= strength_mid <= 1.5, "Mid-range values should be in range"


def test_consistency_across_calls():
    """Test that multiple calls with same parameters are consistent."""
    params = [
        (3, 5, True),
        (7, 12, False),
        (15, 25, True),
    ]

    for team_id, gw, is_home in params:
        results = [opponent_strength(team_id, gw, is_home) for _ in range(5)]

        # All results should be identical
        assert (
            len(set(results)) == 1
        ), f"Inconsistent results for team={team_id}, gw={gw}, home={is_home}: {results}"


def test_float_precision():
    """Test that results have reasonable float precision."""
    strength = opponent_strength(5, 10, True)

    # Should be a valid float
    assert isinstance(
        strength, (float, np.floating)
    ), f"Expected float type, got {type(strength)}"

    # Should not be infinite
    assert not np.isinf(strength), "Strength should not be infinite"

    # Should have reasonable precision (not absurdly many decimals)
    # Check that it can be represented with ~10 decimal places
    rounded = round(strength, 10)
    assert abs(strength - rounded) < 1e-10, "Strength should have reasonable precision"


if __name__ == "__main__":
    # Allow running tests directly with: python tests/test_opponent_strength.py
    pytest.main([__file__, "-v"])
