#!/usr/bin/env python3
"""
Season-Rule-Engine für Fantasy Premier League

Lädt FPL-Regeln pro Season mit Deep-Merge Inheritance:
- _base: Default-Regeln
- Season-spezifisch: Overrides (GK goal 6→10, DC-Punkte, Transfer-Rollover etc.)

Eras:
- Era 1 (2016-17 bis 2023-24): GK goal=6, kein DC
- Era 2 (2024-25): GK goal=10, kein DC, max_rollover_ft=4
- Era 3 (2025-26+): GK goal=10, DC aktiv, Assistant Manager, chip_sets=2

Autor: Tim Sennhauser
Datum: 2024-11-17
"""

import json
from pathlib import Path
from typing import Dict, Any
from copy import deepcopy


# Typen
class ScoringRules:
    """Scoring-Regeln (betreffen ML-Modell)"""

    def __init__(self, data: Dict[str, Any]):
        self.gk_goal = data.get("gk_goal", 6)
        self.gk_clean_sheet = data.get("gk_clean_sheet", 4)
        self.def_clean_sheet = data.get("def_clean_sheet", 4)
        self.mid_clean_sheet = data.get("mid_clean_sheet", 1)
        self.fwd_goal = data.get("fwd_goal", 4)
        self.mid_goal = data.get("mid_goal", 5)
        self.def_goal = data.get("def_goal", 6)
        self.gk_assist = data.get("gk_assist", 3)
        self.def_assist = data.get("def_assist", 3)
        self.mid_assist = data.get("mid_assist", 3)
        self.fwd_assist = data.get("fwd_assist", 3)
        self.gk_saves_per_point = data.get("gk_saves_per_point", 3)
        self.def_bonus_ceiling = data.get("def_bonus_ceiling", 3)
        self.defensive_contribution = data.get("defensive_contribution", False)
        self.dc_threshold_cbit = data.get("dc_threshold_cbit", 10)
        self.dc_threshold_cbirt = data.get("dc_threshold_cbirt", 12)
        self.dc_points = data.get("dc_points", 2)


class SquadRules:
    """Squad-Regeln (betreffen Team Selection)"""

    def __init__(self, data: Dict[str, Any]):
        self.budget = data.get("budget", 100.0)
        self.max_from_club = data.get("max_from_club", 3)
        self.squad_size = data.get("squad_size", 15)
        self.gk_count = data.get("gk_count", 2)
        self.def_count = data.get("def_count", 5)
        self.mid_count = data.get("mid_count", 5)
        self.fwd_count = data.get("fwd_count", 3)


class TransferRules:
    """Transfer-Regeln (betreffen Simulation)"""

    def __init__(self, data: Dict[str, Any]):
        self.free_transfers_per_gw = data.get("free_transfers_per_gw", 1)
        self.max_rollover_ft = data.get("max_rollover_ft", 1)
        self.transfer_cost = data.get("transfer_cost", 4)
        self.preserve_ft_after_wildcard = data.get("preserve_ft_after_wildcard", False)
        self.preserve_ft_after_free_hit = data.get("preserve_ft_after_free_hit", False)


class ChipRules:
    """Chip-Regeln (Info only, nicht ML-relevant)"""

    def __init__(self, data: Dict[str, Any]):
        self.chip_sets = data.get("chip_sets", 1)
        self.has_wildcard = data.get("has_wildcard", True)
        self.has_free_hit = data.get("has_free_hit", True)
        self.has_bench_boost = data.get("has_bench_boost", True)
        self.has_triple_captain = data.get("has_triple_captain", True)
        self.has_assistant_manager = data.get("has_assistant_manager", False)


class RuleSet:
    """Komplettes Regelwerk für eine Season"""

    def __init__(self, data: Dict[str, Any]):
        self.scoring = ScoringRules(data.get("scoring", {}))
        self.squad = SquadRules(data.get("squad", {}))
        self.transfers = TransferRules(data.get("transfers", {}))
        self.chips = ChipRules(data.get("chips", {}))


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep-Merge: Rekursive Kombination von Base + Override.

    Überschreibt Base-Werte mit Override-Werten (wenn vorhanden),
    behält aber Base-Werte, die nicht überschrieben werden.

    Args:
        base: Base-Regeln (aus _base)
        override: Season-spezifische Overrides

    Returns:
        Gemergtes Dict
    """
    result = deepcopy(base)

    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Rekursiv mergen
            result[key] = deep_merge(result[key], value)
        else:
            # Override überschreibt
            result[key] = value

    return result


def load_rules(season: str) -> RuleSet:
    """
    Lädt Regeln für eine Season mit Deep-Merge Inheritance.

    Ablauf:
    1. Lade JSON-Datei (fpl_rules_by_season.json)
    2. Starte mit _base-Regeln
    3. Merge Season-spezifische Overrides
    4. Erstelle RuleSet-Objekt

    Args:
        season: Season im Format "2024-25" oder "2025-26"

    Returns:
        RuleSet-Objekt mit allen Regeln für die Season

    Raises:
        FileNotFoundError: Wenn JSON-Datei nicht existiert
        ValueError: Wenn Season-Format ungültig

    Beispiel:
        >>> rules = load_rules("2024-25")
        >>> print(rules.scoring.gk_goal)
        10
        >>> rules = load_rules("2017-18")
        >>> print(rules.scoring.gk_goal)
        6
    """
    # Validiere Season-Format
    if not season or len(season) != 7 or season[4] != "-":
        raise ValueError(f"Ungültiges Season-Format: {season}. Erwarte z.B. '2024-25'")

    # Lade JSON
    json_path = (
        Path(__file__).parent.parent.parent / "data" / "fpl_rules_by_season.json"
    )
    if not json_path.exists():
        raise FileNotFoundError(f"FPL Rules JSON nicht gefunden: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        all_rules = json.load(f)

    # Hole _base Regeln
    if "_base" not in all_rules:
        raise ValueError("Fehler in fpl_rules_by_season.json: '_base' fehlt")

    base_rules = all_rules["_base"]

    # Hole Season-spezifische Overrides (falls vorhanden)
    season_overrides = all_rules.get(season, {})

    # Deep-Merge
    merged_rules = deep_merge(base_rules, season_overrides)

    # Erstelle RuleSet
    return RuleSet(merged_rules)


def get_era(season: str) -> int:
    """
    Gibt die Era für eine Season zurück.

    Eras:
    - Era 1 (2016-17 bis 2023-24): GK goal=6, kein DC
    - Era 2 (2024-25): GK goal=10, kein DC, max_rollover_ft=4
    - Era 3 (2025-26+): GK goal=10, DC aktiv, Assistant Manager

    Args:
        season: Season im Format "2024-25"

    Returns:
        Era-Nummer (1, 2, oder 3)

    Beispiel:
        >>> get_era("2017-18")
        1
        >>> get_era("2024-25")
        2
        >>> get_era("2025-26")
        3
    """
    # Extrahiere Startjahr
    try:
        start_year = int(season.split("-")[0])
    except (ValueError, IndexError):
        raise ValueError(f"Ungültiges Season-Format: {season}")

    if start_year >= 2025:
        return 3  # Era 3: DC aktiv
    elif start_year == 2024:
        return 2  # Era 2: GK goal=10, kein DC
    else:
        return 1  # Era 1: GK goal=6, kein DC


def validate_cross_era_prediction(train_season: str, predict_season: str) -> None:
    """
    Validiert, dass Cross-Era-Predictions nicht durchgeführt werden.

    Wirft Exception wenn train_season und predict_season in verschiedenen Eras liegen,
    weil Regeländerungen (GK goal 6→10, DC-Punkte) die Predictions wissenschaftlich
    ungültig machen würden.

    Args:
        train_season: Season für Training (z.B. "2022-23")
        predict_season: Season für Predictions (z.B. "2024-25")

    Raises:
        ValueError: Wenn Cross-Era-Prediction versucht wird

    Beispiel:
        >>> validate_cross_era_prediction("2022-23", "2023-24")  # OK (beide Era 1)
        >>> validate_cross_era_prediction("2022-23", "2024-25")  # FEHLER (Era 1 → 2)
        ValueError: Cross-Era-Predictions nicht erlaubt: 2022-23 (Era 1) → 2024-25 (Era 2)
    """
    train_era = get_era(train_season)
    predict_era = get_era(predict_season)

    if train_era != predict_era:
        raise ValueError(
            f"Cross-Era-Predictions nicht erlaubt: {train_season} (Era {train_era}) → "
            f"{predict_season} (Era {predict_era}). "
            f"Regeländerungen machen Predictions wissenschaftlich ungültig."
        )


if __name__ == "__main__":
    # Test: Lade Regeln für verschiedene Seasons
    print("=== Season-Rule-Engine Test ===\n")

    seasons = ["2017-18", "2022-23", "2024-25", "2025-26"]

    for season in seasons:
        try:
            rules = load_rules(season)
            era = get_era(season)
            print(f"Season {season} (Era {era}):")
            print(f"  GK Goal Points: {rules.scoring.gk_goal}")
            print(f"  DC aktiv: {rules.scoring.defensive_contribution}")
            print(f"  Max Rollover FT: {rules.transfers.max_rollover_ft}")
            print(f"  Assistant Manager: {rules.chips.has_assistant_manager}")
            print(f"  Chip Sets: {rules.chips.chip_sets}")
            print()
        except Exception as e:
            print(f"Fehler bei {season}: {e}\n")

    # Test: Cross-Era Validation
    print("=== Cross-Era Validation Test ===\n")

    test_cases = [
        ("2022-23", "2023-24", True),  # OK: beide Era 1
        ("2022-23", "2024-25", False),  # FEHLER: Era 1 → 2
        ("2024-25", "2025-26", False),  # FEHLER: Era 2 → 3
        ("2025-26", "2026-27", True),  # OK: beide Era 3
    ]

    for train, predict, should_pass in test_cases:
        try:
            validate_cross_era_prediction(train, predict)
            result = "✓ OK" if should_pass else "✗ FEHLER (sollte Exception werfen)"
        except ValueError as e:
            result = (
                "✗ FEHLER" if should_pass else f"✓ OK (Exception: {str(e)[:50]}...)"
            )

        print(f"{train} → {predict}: {result}")
