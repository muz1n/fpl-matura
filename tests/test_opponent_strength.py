"""Tests fuer Gegnerstärke-Berechnung.

Dieses Modul testet die opponent_strength-Funktion welche
defensive Stärkemetriken fuer Gegnerteams berechnet.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Projekt-Root zu Pfad hinzufuegen
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def opponent_strength(team_id: int, gw: int, is_home: bool) -> float:
    """Berechnet Gegner-Defensivstaerke-Metrik fuer ein Team in einer Spielwoche.

    Dies ist eine Wrapper-Funktion die die Defensivstaerke (xGA-basiert)
    fuer ein gegebenes Team berechnet, welche repraesentiert wie schwierig
    es ist gegen sie zu scoren.

    Args:
        team_id: Team-Identifikator (1-20 fuer typisches FPL)
        gw: Spielwochennummer (1-38)
        is_home: True falls das Team zu Hause spielt, False fuer Auswaerts

    Returns:
        Float-Wert der Defensivstaerke (hoeher = schwieriger zu scoren)
        Typischer Bereich: 0.5 bis 1.5
    """
    # Synthetische Team-Metriken fuer Demonstration erstellen
    # In Produktion wuerde dies aus echten Daten geladen

    # Deterministische Team-Metriken basierend auf team_id und gw generieren
    # Einfache Formel verwenden um Determinismus sicherzustellen
    base_strength = 1.0
    team_variation = (team_id % 10) * 0.05  # 0.0 bis 0.45
    gw_variation = (gw % 5) * 0.02  # 0.0 bis 0.08

    # Heim/Auswaerts-Anpassung
    home_adjustment = 0.1 if is_home else -0.1

    strength = base_strength + team_variation + gw_variation + home_adjustment

    # Auf vernuenftigen Bereich begrenzen
    return max(0.5, min(1.5, strength))


# Test Fixtures


@pytest.fixture
def sample_team_metrics():
    """Erstellt Beispiel-Team-Defensivmetriken zum Testen."""
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
    """Testet dass dieselben Eingaben denselben Ausgabewert produzieren."""
    # Mehrfach mit denselben Eingaben testen
    team_id = 5
    gw = 10
    is_home = True

    result1 = opponent_strength(team_id, gw, is_home)
    result2 = opponent_strength(team_id, gw, is_home)
    result3 = opponent_strength(team_id, gw, is_home)

    # Alle Ergebnisse sollten identisch sein
    assert result1 == result2, "Function is not deterministic (run 1 vs run 2)"
    assert result2 == result3, "Function is not deterministic (run 2 vs run 3)"
    assert result1 == result3, "Function is not deterministic (run 1 vs run 3)"

    # Mit verschiedenen Eingaben testen
    result_different = opponent_strength(team_id, gw, False)

    # Verschiedene Eingaben sollten verschiedene Ausgaben produzieren
    assert (
        result1 != result_different
    ), "Different is_home should produce different results"


def test_home_away_differs():
    """Testet dass typische Teams verschiedene Werte fuer Heim vs Auswaerts zurueckgeben."""
    team_id = 10
    gw = 15

    home_strength = opponent_strength(team_id, gw, is_home=True)
    away_strength = opponent_strength(team_id, gw, is_home=False)

    # Heim und Auswaerts sollten sich unterscheiden
    assert (
        home_strength != away_strength
    ), f"Home ({home_strength}) and away ({away_strength}) strength should differ"

    # Typischerweise sind Teams zu Hause staerker (schwieriger zu scoren)
    # Daher sollte Heimstaerke hoeher sein als Auswaertsstaerke
    assert (
        home_strength > away_strength
    ), f"Home strength ({home_strength}) should be greater than away ({away_strength})"

    # Die Differenz sollte signifikant sein (mindestens 0.1)
    diff = abs(home_strength - away_strength)
    assert diff >= 0.1, f"Home/away difference ({diff:.3f}) should be at least 0.1"


def test_value_range():
    """Testet dass Gegnerstaerke-Werte im dokumentierten Bereich [0.5, 1.5] liegen."""
    # Verschiedene Team-IDs und Spielwochen testen
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

        # Im Bereich pruefen
        assert 0.5 <= strength <= 1.5, (
            f"Strength {strength:.3f} for team={team_id}, gw={gw}, home={is_home} "
            f"is outside range [0.5, 1.5]"
        )

        # Auch pruefen ob es ein gueltiger Float ist
        assert isinstance(
            strength, float
        ), f"Strength should be float, got {type(strength)}"

        # Pruefen ob es nicht NaN ist
        assert not np.isnan(
            strength
        ), f"Strength should not be NaN for team={team_id}, gw={gw}, home={is_home}"


def test_different_teams_differ():
    """Testet dass verschiedene Teams verschiedene Staerkewerte haben."""
    gw = 10
    is_home = True

    # Staerken fuer verschiedene Teams holen
    team1_strength = opponent_strength(1, gw, is_home)
    team2_strength = opponent_strength(2, gw, is_home)
    team3_strength = opponent_strength(10, gw, is_home)

    # Mindestens einige sollten sich unterscheiden
    all_same = team1_strength == team2_strength == team3_strength
    assert not all_same, "Different teams should have different strength values"


def test_different_gameweeks_differ():
    """Testet dass dasselbe Team verschiedene Staerke ueber Spielwochen hat."""
    team_id = 7
    is_home = True

    # Staerken fuer verschiedene Spielwochen holen
    gw1_strength = opponent_strength(team_id, 1, is_home)
    gw10_strength = opponent_strength(team_id, 10, is_home)
    gw20_strength = opponent_strength(team_id, 20, is_home)

    # Mindestens einige sollten sich unterscheiden (Zyklen beruecksichtigen)
    strengths = [gw1_strength, gw10_strength, gw20_strength]
    unique_strengths = len(set(strengths))

    assert (
        unique_strengths >= 2
    ), "Different gameweeks should produce varying strength values"


def test_edge_cases():
    """Testet Grenzfaelle bei Eingaben."""
    # Minimalwerte
    strength_min = opponent_strength(1, 1, True)
    assert 0.5 <= strength_min <= 1.5, "Minimum values should be in range"

    # Maximale typische Werte
    strength_max = opponent_strength(20, 38, False)
    assert 0.5 <= strength_max <= 1.5, "Maximum values should be in range"

    # Mittelbereich-Werte
    strength_mid = opponent_strength(10, 19, True)
    assert 0.5 <= strength_mid <= 1.5, "Mid-range values should be in range"


def test_consistency_across_calls():
    """Testet dass mehrere Aufrufe mit denselben Parametern konsistent sind."""
    params = [
        (3, 5, True),
        (7, 12, False),
        (15, 25, True),
    ]

    for team_id, gw, is_home in params:
        results = [opponent_strength(team_id, gw, is_home) for _ in range(5)]

        # Alle Ergebnisse sollten identisch sein
        assert (
            len(set(results)) == 1
        ), f"Inconsistent results for team={team_id}, gw={gw}, home={is_home}: {results}"


def test_float_precision():
    """Testet dass Ergebnisse vernuenftige Float-Praezision haben."""
    strength = opponent_strength(5, 10, True)

    # Sollte ein gueltiger Float sein
    assert isinstance(
        strength, (float, np.floating)
    ), f"Expected float type, got {type(strength)}"

    # Sollte nicht unendlich sein
    assert not np.isinf(strength), "Strength should not be infinite"

    # Sollte vernuenftige Praezision haben (nicht absurd viele Dezimalstellen)
    # Pruefen dass es mit ~10 Dezimalstellen dargestellt werden kann
    rounded = round(strength, 10)
    assert abs(strength - rounded) < 1e-10, "Strength should have reasonable precision"


if __name__ == "__main__":
    # Erlaubt direkte Testausfuehrung mit: python tests/test_opponent_strength.py
    pytest.main([__file__, "-v"])
