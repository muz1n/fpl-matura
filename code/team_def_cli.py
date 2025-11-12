"""Alternate CLI to compute and save team defensive metrics.

This is a single-file CLI that avoids the previously-created duplicated file.
Usage example:
  python code/team_def_cli.py --season 2025-26 --opp_window 5 --opp_k 3 --with_opp_strength
"""

import argparse
import importlib.util
import pathlib


def _load_module(path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(path.stem, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", required=True)
    parser.add_argument("--with_opp_strength", action="store_true")
    parser.add_argument("--opp_window", type=int, default=5)
    parser.add_argument("--opp_k", type=int, default=3)
    args = parser.parse_args(argv)

    repo = pathlib.Path(__file__).resolve().parents[1]
    def_metrics = _load_module(repo / "code" / "utils" / "def_metrics.py")
    data_io = _load_module(repo / "code" / "utils" / "data_io.py")

    player_gw = data_io.load_player_gameweeks(args.season)
    if player_gw.empty:
        print(
            f"Warning: no player GW data found for season {args.season}; outputs may be empty"
        )

    team_metrics = def_metrics.compute_team_def_metrics(
        player_gw, window=args.opp_window, k=args.opp_k
    )
    out_path = def_metrics.save_team_def_metrics(
        team_metrics, args.season, args.opp_window, args.opp_k
    )
    print("Saved team metrics to:", out_path)

    if args.with_opp_strength:
        enriched = def_metrics.attach_opponent_features(player_gw, team_metrics)
        out_dir = repo / "out" / "player_features"
        out_dir.mkdir(parents=True, exist_ok=True)
        fname = f"player_with_opp_strength_{args.season}_l{args.opp_window}_k{args.opp_k}.csv"
        data_io.save_table(enriched, out_dir / fname)
        print("Saved enriched player features to:", out_dir / fname)


if __name__ == "__main__":
    main()
