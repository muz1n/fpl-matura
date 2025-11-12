"""Smoke test for attach_opponent_features."""

import importlib.util
import pathlib
from pprint import pprint

import pandas as pd


def _load_module():
    repo = pathlib.Path(__file__).resolve().parents[1]
    module_path = repo / "code" / "utils" / "def_metrics.py"
    spec = importlib.util.spec_from_file_location("def_metrics", str(module_path))
    if spec is None:
        raise ImportError(f"Could not create module spec for {module_path}")
    mod = importlib.util.module_from_spec(spec)
    loader = spec.loader
    if loader is None:
        raise ImportError(
            f"No loader available for module spec created from {module_path}"
        )
    loader.exec_module(mod)
    return mod


mod = _load_module()
attach_opponent_features = mod.attach_opponent_features
compute_team_def_metrics = mod.compute_team_def_metrics


# build synthetic team metrics for two teams over 3 gws
team_rows = [
    {
        "team": "A",
        "gw": 1,
        "team_xga_l5_home_adj": 1.0,
        "team_xga_l5_away_adj": 1.2,
        "team_xga_l5_all_adj": 1.1,
    },
    {
        "team": "B",
        "gw": 1,
        "team_xga_l5_home_adj": 1.6,
        "team_xga_l5_away_adj": 1.4,
        "team_xga_l5_all_adj": 1.5,
    },
    {
        "team": "A",
        "gw": 2,
        "team_xga_l5_home_adj": 0.9,
        "team_xga_l5_away_adj": 1.3,
        "team_xga_l5_all_adj": 1.1,
    },
    {
        "team": "B",
        "gw": 2,
        "team_xga_l5_home_adj": 1.7,
        "team_xga_l5_away_adj": 1.35,
        "team_xga_l5_all_adj": 1.525,
    },
]
team_metrics = pd.DataFrame(team_rows)

# player rows: players from both teams against each other
player_rows = [
    {"gw": 1, "team": "A", "opponent": "B", "home_away": "H", "player_id": 1},
    {"gw": 1, "team": "B", "opponent": "A", "home_away": "A", "player_id": 2},
    {"gw": 2, "team": "A", "opponent": "B", "home_away": "A", "player_id": 3},
    {"gw": 2, "team": "B", "opponent": "A", "home_away": "H", "player_id": 4},
]
player_df = pd.DataFrame(player_rows)

out = attach_opponent_features(player_df, team_metrics)

pprint(out.to_dict(orient="records"))
