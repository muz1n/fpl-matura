"""CLI to compute and save team defensive metrics.

Loads player gameweek data for a season, computes team defensive metrics and
optionally attaches opponent-strength features back to player rows and saves
the outputs. Uses file-based module loading to avoid package import issues.
"""

import argparse
import importlib.util
import pathlib
from typing import Optional


def _load_module(path: pathlib.Path):
    """Load a module from a file path and return the module object."""
    spec = importlib.util.spec_from_file_location(path.stem, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main(argv: Optional[list] = None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", required=True)
    parser.add_argument("--with_opp_strength", action="store_true")
    parser.add_argument("--opp_window", type=int, default=5)
    parser.add_argument("--opp_k", type=int, default=3)
    args = parser.parse_args(argv)

    repo = pathlib.Path(__file__).resolve().parents[1]
    def_metrics_path = repo / "code" / "utils" / "def_metrics.py"
    data_io_path = repo / "code" / "utils" / "data_io.py"

    dm = _load_module(def_metrics_path)
    di = _load_module(data_io_path)

    player_gw = di.load_player_gameweeks(args.season)
    if getattr(player_gw, "empty", False):
        print(
            f"Warning: no player GW data found for season {args.season}; outputs may be empty"
        )

    # compute and save team defensive metrics
    team_metrics = dm.compute_team_def_metrics(
        player_gw, window=args.opp_window, k=args.opp_k
    )
    out_path = dm.save_team_def_metrics(
        team_metrics, args.season, args.opp_window, args.opp_k
    )
    print("Saved team metrics to:", out_path)

    if args.with_opp_strength:
        enriched = dm.attach_opponent_features(player_gw, team_metrics)
        out_dir = repo / "out" / "player_features"
        out_dir.mkdir(parents=True, exist_ok=True)
        fname = f"player_with_opp_strength_{args.season}_l{args.opp_window}_k{args.opp_k}.csv"
        out_file = out_dir / fname
        di.save_table(enriched, out_file)
        print("Saved enriched player features to:", out_file)


if __name__ == "__main__":
    main()
