"""Tests fuer Aufstellungsauswahl-Regeln und Validierung.

Dieses Modul testet dass die pick_lineup-Funktion FPL-Regeln korrekt durchsetzt:
- XI muss genau 11 eindeutige Spieler enthalten
- XI muss genau 1 Torhüter enthalten
- XI muss einer gültigen Formation aus dem erlaubten Set folgen
"""

import pandas as pd
import pytest

# team_builder-Modul dynamisch vom Repository-Pfad laden falls verfuegbar,
# andernfalls als Package mit importlib importieren.
import sys
from pathlib import Path
import importlib.util
import importlib

PROJECT_ROOT = Path(__file__).resolve().parents[1]
module_path = PROJECT_ROOT / "code" / "utils" / "team_builder.py"

if module_path.exists():
    spec = importlib.util.spec_from_file_location("team_builder", str(module_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not create a valid ModuleSpec for {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    pick_lineup_autoformation = module.pick_lineup_autoformation
    ALLOWED_FORMATIONS = module.ALLOWED_FORMATIONS
    POS_SLOTS = module.POS_SLOTS
else:
    # Als Package importieren versuchen (falls Tests in installiertem Package-Kontext laufen)
    try:
        module = importlib.import_module("code.utils.team_builder")
        pick_lineup_autoformation = module.pick_lineup_autoformation
        ALLOWED_FORMATIONS = module.ALLOWED_FORMATIONS
        POS_SLOTS = module.POS_SLOTS
    except Exception as e:
        raise ImportError(
            "Could not import 'team_builder' from code.utils or load it from the repository path."
        ) from e


def pick_lineup(squad: pd.DataFrame, gw: int = 1) -> dict:
    """Wrapper-Funktion fuer pick_lineup_autoformation zum Testen.

    Args:
        squad: DataFrame mit Spielerdaten (15 Spieler erwartet)
        gw: Spielwochennummer (wird in aktueller Implementierung nicht verwendet)

    Returns:
        Dictionary mit Aufstellungsinformationen:
        - formation: str
        - xi_ids: Liste von 11 Spieler-IDs in der Start-XI
        - bench_gk_id: Torhüter auf der Bank
        - bench_out_ids: Liste von 3 Feldspielern auf der Bank
        - captain_id: Kapitän-Spieler-ID
        - vice_id: Vize-Kapitän-Spieler-ID
    """
    result = pick_lineup_autoformation(squad)
    return result


# Test Fixtures


@pytest.fixture
def valid_squad():
    """Erstellt einen gueltigen 15-Spieler-Squad zum Testen."""
    players = [
        # 2 Goalkeepers
        {
            "player_id": 1,
            "name": "GK1",
            "position": "GK",
            "pred_points": 5.0,
            "price": 5.0,
            "p_start": 0.9,
        },
        {
            "player_id": 2,
            "name": "GK2",
            "position": "GK",
            "pred_points": 3.0,
            "price": 4.5,
            "p_start": 0.8,
        },
        # 5 Defenders
        {
            "player_id": 3,
            "name": "DEF1",
            "position": "DEF",
            "pred_points": 6.0,
            "price": 6.0,
            "p_start": 0.95,
        },
        {
            "player_id": 4,
            "name": "DEF2",
            "position": "DEF",
            "pred_points": 5.5,
            "price": 5.5,
            "p_start": 0.90,
        },
        {
            "player_id": 5,
            "name": "DEF3",
            "position": "DEF",
            "pred_points": 5.0,
            "price": 5.0,
            "p_start": 0.85,
        },
        {
            "player_id": 6,
            "name": "DEF4",
            "position": "DEF",
            "pred_points": 4.5,
            "price": 4.5,
            "p_start": 0.80,
        },
        {
            "player_id": 7,
            "name": "DEF5",
            "position": "DEF",
            "pred_points": 4.0,
            "price": 4.0,
            "p_start": 0.75,
        },
        # 5 Midfielders
        {
            "player_id": 8,
            "name": "MID1",
            "position": "MID",
            "pred_points": 7.0,
            "price": 7.0,
            "p_start": 0.95,
        },
        {
            "player_id": 9,
            "name": "MID2",
            "position": "MID",
            "pred_points": 6.5,
            "price": 6.5,
            "p_start": 0.90,
        },
        {
            "player_id": 10,
            "name": "MID3",
            "position": "MID",
            "pred_points": 6.0,
            "price": 6.0,
            "p_start": 0.85,
        },
        {
            "player_id": 11,
            "name": "MID4",
            "position": "MID",
            "pred_points": 5.5,
            "price": 5.5,
            "p_start": 0.80,
        },
        {
            "player_id": 12,
            "name": "MID5",
            "position": "MID",
            "pred_points": 5.0,
            "price": 5.0,
            "p_start": 0.75,
        },
        # 3 Forwards
        {
            "player_id": 13,
            "name": "FWD1",
            "position": "FWD",
            "pred_points": 8.0,
            "price": 8.0,
            "p_start": 0.95,
        },
        {
            "player_id": 14,
            "name": "FWD2",
            "position": "FWD",
            "pred_points": 7.0,
            "price": 7.0,
            "p_start": 0.90,
        },
        {
            "player_id": 15,
            "name": "FWD3",
            "position": "FWD",
            "pred_points": 6.0,
            "price": 6.0,
            "p_start": 0.85,
        },
    ]
    return pd.DataFrame(players)


@pytest.fixture
def squad_433_formation():
    """Erstellt einen Squad der eine 4-3-3-Formation waehlen sollte."""
    players = [
        # 2 Goalkeepers
        {
            "player_id": 1,
            "name": "GK1",
            "position": "GK",
            "pred_points": 5.0,
            "price": 5.0,
        },
        {
            "player_id": 2,
            "name": "GK2",
            "position": "GK",
            "pred_points": 3.0,
            "price": 4.5,
        },
        # 5 Defenders - top 4 sehr stark machen
        {
            "player_id": 3,
            "name": "DEF1",
            "position": "DEF",
            "pred_points": 7.0,
            "price": 6.0,
        },
        {
            "player_id": 4,
            "name": "DEF2",
            "position": "DEF",
            "pred_points": 6.5,
            "price": 5.5,
        },
        {
            "player_id": 5,
            "name": "DEF3",
            "position": "DEF",
            "pred_points": 6.0,
            "price": 5.0,
        },
        {
            "player_id": 6,
            "name": "DEF4",
            "position": "DEF",
            "pred_points": 5.5,
            "price": 4.5,
        },
        {
            "player_id": 7,
            "name": "DEF5",
            "position": "DEF",
            "pred_points": 2.0,
            "price": 4.0,
        },
        # 5 Midfielders - nur 3 gut machen
        {
            "player_id": 8,
            "name": "MID1",
            "position": "MID",
            "pred_points": 6.0,
            "price": 7.0,
        },
        {
            "player_id": 9,
            "name": "MID2",
            "position": "MID",
            "pred_points": 5.5,
            "price": 6.5,
        },
        {
            "player_id": 10,
            "name": "MID3",
            "position": "MID",
            "pred_points": 5.0,
            "price": 6.0,
        },
        {
            "player_id": 11,
            "name": "MID4",
            "position": "MID",
            "pred_points": 2.0,
            "price": 5.5,
        },
        {
            "player_id": 12,
            "name": "MID5",
            "position": "MID",
            "pred_points": 1.5,
            "price": 5.0,
        },
        # 3 Forwards - alle stark
        {
            "player_id": 13,
            "name": "FWD1",
            "position": "FWD",
            "pred_points": 8.0,
            "price": 8.0,
        },
        {
            "player_id": 14,
            "name": "FWD2",
            "position": "FWD",
            "pred_points": 7.0,
            "price": 7.0,
        },
        {
            "player_id": 15,
            "name": "FWD3",
            "position": "FWD",
            "pred_points": 6.5,
            "price": 6.0,
        },
    ]
    return pd.DataFrame(players)


# Test Cases


def test_valid_xi_count(valid_squad):
    """Testet dass die Startelf exakt 11 einzigartige Spieler enthaelt."""
    result = pick_lineup(valid_squad, gw=1)

    xi_ids = result["xi_ids"]

    # Genau 11 Spieler pruefen
    assert len(xi_ids) == 11, f"Expected 11 players in XI, got {len(xi_ids)}"

    # Alle einzigartig pruefen (keine Duplikate)
    assert len(set(xi_ids)) == 11, f"XI contains duplicate players: {xi_ids}"

    # Pruefen dass alle gueltige Spieler-IDs aus dem Squad sind
    squad_ids = set(valid_squad["player_id"].tolist())
    for pid in xi_ids:
        assert pid in squad_ids, f"Player ID {pid} not in original squad"


def test_has_one_gk(valid_squad):
    """Testet dass die Startelf genau 1 Torhhueter enthaelt."""
    result = pick_lineup(valid_squad, gw=1)

    xi_ids = result["xi_ids"]

    # Positionen fuer XI-Spieler holen
    xi_positions = valid_squad[valid_squad["player_id"].isin(xi_ids)][
        "position"
    ].tolist()

    # Torhueter zaehlen
    gk_count = xi_positions.count("GK")

    assert gk_count == 1, f"Expected exactly 1 GK in XI, got {gk_count}"

    # Auch pruefen dass die Bank genau 1 GK hat
    bench_gk_id = result["bench_gk_id"]
    bench_gk_position = valid_squad[valid_squad["player_id"] == bench_gk_id][
        "position"
    ].values[0]
    assert (
        bench_gk_position == "GK"
    ), f"Bench GK has position {bench_gk_position}, expected GK"


def test_valid_formation(valid_squad):
    """Testet dass die XI-Formation eine der erlaubten FPL-Formationen ist."""
    result = pick_lineup(valid_squad, gw=1)

    formation = result["formation"]
    xi_ids = result["xi_ids"]

    # Check formation is in allowed list
    expected_formations = {
        "3-4-3",
        "3-5-2",
        "4-4-2",
        "4-3-3",
        "4-5-1",
        "5-4-1",
        "5-3-2",
    }
    assert (
        formation in expected_formations
    ), f"Formation '{formation}' not in allowed set: {expected_formations}"

    # Pruefen dass Formation mit tatsaechlichen Positionszahlen in XI uebereinstimmt
    xi_data = valid_squad[valid_squad["player_id"].isin(xi_ids)]
    position_counts = xi_data["position"].value_counts().to_dict()

    # Erwartete Zahlen fuer diese Formation holen
    expected_counts = POS_SLOTS[formation]

    # Zahlen pruefen
    for pos in ["GK", "DEF", "MID", "FWD"]:
        actual_count = position_counts.get(pos, 0)
        expected_count = expected_counts[pos]
        assert (
            actual_count == expected_count
        ), f"Formation {formation}: Expected {expected_count} {pos}, got {actual_count}"


def test_specific_formation_433(squad_433_formation):
    """Testet dass ein fuer 4-3-3 optimierter Squad diese Formation tatsaechlich waehlt."""
    result = pick_lineup(squad_433_formation, gw=1)

    formation = result["formation"]

    # Dieser Squad ist darauf ausgelegt 4-3-3 zu favorisieren
    assert (
        formation == "4-3-3"
    ), f"Expected 4-3-3 formation for this squad, got {formation}"


def test_all_players_accounted_for(valid_squad):
    """Testet dass alle 15 Spieler entweder in der XI oder auf der Bank sind."""
    result = pick_lineup(valid_squad, gw=1)

    xi_ids = set(result["xi_ids"])
    bench_gk_id = result["bench_gk_id"]
    bench_out_ids = set(result["bench_out_ids"])

    # Alle ausgewaehlten Spieler kombinieren
    all_selected = xi_ids | {bench_gk_id} | bench_out_ids

    # Sollte genau 15 Spieler haben
    assert (
        len(all_selected) == 15
    ), f"Expected 15 total players (11 XI + 4 bench), got {len(all_selected)}"

    # Sollte exakt mit dem Squad uebereinstimmen
    squad_ids = set(valid_squad["player_id"].tolist())
    assert all_selected == squad_ids, "Selected players don't match original squad"


def test_no_overlap_xi_and_bench(valid_squad):
    """Testet dass kein Spieler sowohl in XI als auch auf der Bank erscheint."""
    result = pick_lineup(valid_squad, gw=1)

    xi_ids = set(result["xi_ids"])
    bench_ids = {result["bench_gk_id"]} | set(result["bench_out_ids"])

    overlap = xi_ids & bench_ids

    assert len(overlap) == 0, f"Players appear in both XI and bench: {overlap}"


def test_bench_has_correct_structure(valid_squad):
    """Testet dass die Bank 1 GK + 3 Feldspieler hat."""
    result = pick_lineup(valid_squad, gw=1)

    # Bank-GK pruefen
    bench_gk_id = result["bench_gk_id"]
    assert bench_gk_id is not None, "Bench GK is missing"

    bench_gk_data = valid_squad[valid_squad["player_id"] == bench_gk_id]
    assert len(bench_gk_data) == 1, f"Bench GK ID {bench_gk_id} not found in squad"
    assert bench_gk_data["position"].values[0] == "GK", "Bench GK is not a goalkeeper"

    # Bank-Feldspieler pruefen
    bench_out_ids = result["bench_out_ids"]
    assert (
        len(bench_out_ids) == 3
    ), f"Expected 3 outfield players on bench, got {len(bench_out_ids)}"

    bench_out_data = valid_squad[valid_squad["player_id"].isin(bench_out_ids)]
    bench_out_positions = bench_out_data["position"].tolist()

    # Keiner sollte Torhueter sein
    assert "GK" not in bench_out_positions, "Outfield bench contains a goalkeeper"


def test_captain_and_vice_selected(valid_squad):
    """Testet dass Kapitaen und Vizekapitaen ausgewaehlt sind und in der XI sind."""
    result = pick_lineup(valid_squad, gw=1)

    captain_id = result["captain_id"]
    vice_id = result["vice_id"]
    xi_ids = result["xi_ids"]

    # Beide sollten ausgewaehlt sein
    assert captain_id is not None, "Captain not selected"
    assert vice_id is not None, "Vice-captain not selected"

    # Beide sollten in XI sein
    assert captain_id in xi_ids, f"Captain {captain_id} not in XI"
    assert vice_id in xi_ids, f"Vice-captain {vice_id} not in XI"

    # Sollten verschiedene Spieler sein
    assert captain_id != vice_id, "Captain and vice-captain are the same player"


def test_formation_in_allowed_list():
    """Testet dass alle verwendeten Formationen in der ALLOWED_FORMATIONS-Konstante sind."""
    expected = {"3-4-3", "3-5-2", "4-4-2", "4-3-3", "4-5-1", "5-4-1", "5-3-2"}

    # Pruefen dass ALLOWED_FORMATIONS unser erwartetes Set enthaelt
    actual = set(ALLOWED_FORMATIONS)

    # Die tatsaechliche kann 5-4-1 als letztes haben (Tippfehlercheck)
    assert (
        expected.issubset(actual) or actual == expected
    ), f"ALLOWED_FORMATIONS mismatch. Expected subset: {expected}, Actual: {actual}"


if __name__ == "__main__":
    # Erlaubt direkte Testausfuehrung mit: python tests/test_lineup_rules.py
    pytest.main([__file__, "-v"])
