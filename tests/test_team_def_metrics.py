"""Schneller Runner um compute_team_def_metrics zu smoke-testen."""

from pprint import pprint

import pandas as pd

import importlib.util
import pathlib


def _load_def_metrics():
    """Laedt compute_team_def_metrics dynamisch aus der Modul-Datei."""
    repo = pathlib.Path(__file__).resolve().parents[1]
    module_path = repo / "code" / "utils" / "def_metrics.py"
    spec = importlib.util.spec_from_file_location("def_metrics", str(module_path))
    if spec is None:
        raise ImportError(f"Could not create module spec for {module_path}")
    if spec.loader is None:
        raise ImportError(f"No loader available for module spec from {module_path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.compute_team_def_metrics


compute_team_def_metrics = _load_def_metrics()


def make_sample():
    # Erstelle einen kleinen synthetischen Datensatz fuer 3 Teams ueber 6 GWs
    rows = []
    teams = ["A", "B", "C"]
    gw = 1
    for gw in range(1, 9):
        for team in teams:
            # Heim/Auswaerts ungefaehr abwechseln
            ha = "H" if (gw + ord(team[0])) % 2 == 0 else "A"
            # Synthetisches xGA mit kleiner Variation
            base = {"A": 1.0, "B": 1.5, "C": 1.2}[team]
            xga = base + (gw % 3) * 0.2 + (0.1 if ha == "A" else -0.05)
            rows.append(
                {
                    "gw": gw,
                    "date": f"2025-08-{gw:02d}",
                    "team": team,
                    "opponent": "X",
                    "home_away": ha,
                    "xGA": xga,
                }
            )
    return pd.DataFrame(rows)


def main():
    df = make_sample()
    res = compute_team_def_metrics(df, window=5, k=3)
    pprint(res.head(20).to_dict(orient="records"))


if __name__ == "__main__":
    main()
