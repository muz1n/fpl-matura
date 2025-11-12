"""One-GW auto-formation lineup picker CLI.

Usage:
  python code/lineup/auto_formation_cli.py --season 2023-24 --gw 30 --window 5 --k 3 --squad_csv data/current/squad_2023-24.csv

Behavior:
  - Prefer loading enriched features file: out/player_features/player_with_opp_strength_{season}_l{window}_k{k}.csv
  - If not found and --squad_csv is provided, load the squad CSV (must contain
    player_id,name,position,pred_points[,p_start]).
  - Filter to --gw when a 'gw' column exists; if --gw missing, use max gw found.
  - Reduce to 15-man squad via in_squad==True if present; else when using --squad_csv
    take those 15 rows; otherwise error.
  - Call pick_lineup_autoformation(...) and print a tiny summary table and save JSON/CSV
    to out/lineup/xi_{season}_gw{gw}.json and .csv
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from code.utils.team_builder import pick_lineup_autoformation


def _build_features_path(season: str, window: int, k: int) -> Path:
    return Path("out") / "player_features" / f"player_with_opp_strength_{season}_l{window}_k{k}.csv"


def _maybe_alias_columns(df: pd.DataFrame) -> pd.DataFrame:
    # Light aliasing for common names
    if "player_id" not in df.columns and "element" in df.columns:
        df = df.rename(columns={"element": "player_id"})
    if "name" not in df.columns:
        for c in ("web_name", "player_name"):
            if c in df.columns:
                df = df.rename(columns={c: "name"})
                break
    return df


def _ensure_required_columns(df: pd.DataFrame, cols: List[str], context: str) -> None:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns in {context}: {missing}. "
            "Expected at least: player_id,name,position,pred_points[,p_start]"
        )


def _filter_gw(df: pd.DataFrame, gw: Optional[int]) -> tuple[pd.DataFrame, Optional[int]]:
    if "gw" not in df.columns:
        return df, gw  # no GW in data, nothing to filter
    if gw is None:
        # pick max gw present
        try:
            gw = int(pd.to_numeric(df["gw"], errors="coerce").max())
        except Exception:
            gw = None
    if gw is None:
        return df, None
    filtered = df[pd.to_numeric(df["gw"], errors="coerce") == gw]
    if filtered.empty:
        raise ValueError(f"No rows for gw={gw} in data")
    return filtered, gw


def _reduce_to_squad(df: pd.DataFrame, used_source: str, squad_csv_given: bool) -> pd.DataFrame:
    # Prefer explicit in_squad if present
    if "in_squad" in df.columns:
        squad = df[df["in_squad"] == True].copy()  # noqa: E712
        if squad.empty:
            raise ValueError("Column 'in_squad' present but no True rows found")
        return squad
    # If we loaded from squad_csv, assume the file already contains the 15-man squad
    if squad_csv_given:
        return df
    raise ValueError(
        "Could not determine 15-man squad. Provide a file with in_squad==True or use --squad_csv."
    )


def _compute_score(df: pd.DataFrame, prefer_minutes: bool, p_floor: float,
                   pred_col: str = "pred_points", p_start_col: str = "p_start") -> pd.Series:
    has_p = p_start_col in df.columns
    def _row_score(row) -> float:
        base = float(row.get(pred_col, 0.0))
        if not prefer_minutes or not has_p:
            return base
        ps = float(row.get(p_start_col, 1.0))
        if ps < p_floor:
            ps = p_floor
        if ps > 1.0:
            ps = 1.0
        return base * ps
    return df.apply(_row_score, axis=1)


def run_cli():
    parser = argparse.ArgumentParser(description="Auto-formation lineup picker for one GW")
    parser.add_argument("--season", required=True, help="Season label, e.g. 2023-24")
    parser.add_argument("--gw", type=int, default=None, help="Gameweek to filter (defaults to max in data)")
    parser.add_argument("--window", type=int, default=5, help="Lookback window length for features filename")
    parser.add_argument("--k", type=int, default=3, help="K parameter for features filename")
    parser.add_argument("--squad_csv", type=str, default=None, help="Path to a 15-man squad CSV")
    parser.add_argument("--prefer_minutes", action="store_true", help="Weight points by start probability")
    parser.add_argument("--p_floor", type=float, default=0.6, help="Minimum start prob clamp when weighting")
    parser.add_argument(
        "--formation_pref",
        type=str,
        default=None,
        help="Comma-separated formations to try (e.g., 3-4-3,4-4-2)",
    )
    parser.add_argument("--output_dir", type=str, default="out/lineup", help="Where to save outputs")

    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    season: str = args.season
    gw: Optional[int] = args.gw
    window: int = args.window
    k: int = args.k
    squad_csv: Optional[str] = args.squad_csv
    prefer_minutes: bool = bool(args.prefer_minutes)
    p_floor: float = float(args.p_floor)
    formation_pref = (
        [s.strip() for s in args.formation_pref.split(",") if s.strip()]
        if args.formation_pref
        else None
    )
    output_dir = Path(args.output_dir)

    # 1) Load data: prefer enriched features
    features_path = _build_features_path(season, window, k)
    used_source = None
    if features_path.exists():
        logging.info(f"Loading features: {features_path}")
        df = pd.read_csv(features_path)
        used_source = "features"
    elif squad_csv:
        sc_path = Path(squad_csv)
        if not sc_path.exists():
            raise FileNotFoundError(f"squad_csv not found: {sc_path}")
        logging.info(f"Loading squad CSV: {sc_path}")
        df = pd.read_csv(sc_path)
        used_source = "squad"
    else:
        raise FileNotFoundError(
            f"Features not found at {features_path} and no --squad_csv provided"
        )

    df = _maybe_alias_columns(df)

    # 2) Filter GW if present/needed
    df, gw_effective = _filter_gw(df, gw)
    if gw_effective is not None:
        gw = gw_effective
    # else keep gw as provided or None; use None in filenames guarded below

    # 3) Reduce to 15-man squad
    df_squad = _reduce_to_squad(df, used_source, used_source == "squad")

    # 4) Validate required columns before picking
    _ensure_required_columns(
        df_squad,
        ["player_id", "name", "position", "pred_points"],
        context="squad data",
    )
    # price optional; helpful for bench tiebreak
    if "price" not in df_squad.columns:
        df_squad["price"] = 5.0

    # 5) Call picker
    result = pick_lineup_autoformation(
        df_squad,
        prefer_minutes=prefer_minutes,
        p_floor=p_floor,
        formation_preference=formation_pref,
    )

    # Prepare mappings for display
    by_id: Dict[int, Dict] = (
        df_squad.set_index("player_id")[["name", "position", "pred_points"]].to_dict("index")
    )
    # recompute score for printing
    df_squad["_score"] = _compute_score(df_squad, prefer_minutes, p_floor)
    score_map: Dict[int, float] = df_squad.set_index("player_id")["_score"].to_dict()

    def _name(pid: int) -> str:
        meta = by_id.get(int(pid), {})
        return str(meta.get("name", pid))

    def _pos(pid: int) -> str:
        meta = by_id.get(int(pid), {})
        return str(meta.get("position", "?"))

    # 6) Print summary
    print("")
    print(f"Season: {season} | GW: {gw if gw is not None else 'n/a'} | Formation: {result['formation']}")
    print(f"XI predicted points (sum of pred_points): {result['xi_points_sum']:.2f}")
    print(f"Captain: {_name(result['captain_id'])} | Vice: {_name(result['vice_id'])}")

    # XI table
    print("\nXI:")
    xi_rows = []
    for pid in result["xi_ids"]:
        xi_rows.append({
            "position": _pos(pid),
            "name": _name(pid),
            "player_id": int(pid),
            "score": float(score_map.get(int(pid), 0.0)),
        })
    xi_df = pd.DataFrame(xi_rows)
    # order by GK first, then DEF, MID, FWD typical; within as provided
    pos_order = {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
    xi_df["_po"] = xi_df["position"].map(pos_order).fillna(9)
    xi_df = xi_df.sort_values(by=["_po", "score"], ascending=[True, False])
    print(xi_df[["position", "name", "score"]].to_string(index=False, justify="left"))

    # Bench table
    print("\nBench:")
    bench_rows = []
    bench_rows.append({
        "position": _pos(result["bench_gk_id"]),
        "name": _name(result["bench_gk_id"]),
        "player_id": int(result["bench_gk_id"]),
        "score": float(score_map.get(int(result["bench_gk_id"]), 0.0)),
        "bench_slot": "GK"
    })
    for i, pid in enumerate(result["bench_out_ids"], start=1):
        bench_rows.append({
            "position": _pos(pid),
            "name": _name(pid),
            "player_id": int(pid),
            "score": float(score_map.get(int(pid), 0.0)),
            "bench_slot": f"B{i}",
        })
    bench_df = pd.DataFrame(bench_rows)
    print(bench_df[["bench_slot", "position", "name", "score"]].to_string(index=False, justify="left"))

    # 7) Save outputs
    output_dir.mkdir(parents=True, exist_ok=True)
    gw_token = gw if gw is not None else "na"
    json_path = output_dir / f"xi_{season}_gw{gw_token}.json"
    csv_path = output_dir / f"xi_{season}_gw{gw_token}.csv"

    # JSON: include IDs and names for convenience
    json_payload = {
        "season": season,
        "gw": gw,
        "formation": result["formation"],
        "xi_ids": result["xi_ids"],
        "xi_names": [_name(pid) for pid in result["xi_ids"]],
        "bench_gk_id": result["bench_gk_id"],
        "bench_gk_name": _name(result["bench_gk_id"]),
        "bench_out_ids": result["bench_out_ids"],
        "bench_out_names": [_name(pid) for pid in result["bench_out_ids"]],
        "captain_id": result["captain_id"],
        "captain_name": _name(result["captain_id"]),
        "vice_id": result["vice_id"],
        "vice_name": _name(result["vice_id"]),
        "xi_points_sum": result["xi_points_sum"],
        "formation_scores": result["debug"],
    }
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(json_payload, f, ensure_ascii=False, indent=2)
    logging.info(f"Saved JSON -> {json_path}")

    # CSV: XI then bench with roles
    csv_rows = []
    for pid in result["xi_ids"]:
        csv_rows.append({
            "role": "XI",
            "position": _pos(pid),
            "name": _name(pid),
            "player_id": int(pid),
            "score": float(score_map.get(int(pid), 0.0)),
        })
    csv_rows.append({
        "role": "Bench_GK",
        "position": _pos(result["bench_gk_id"]),
        "name": _name(result["bench_gk_id"]),
        "player_id": int(result["bench_gk_id"]),
        "score": float(score_map.get(int(result["bench_gk_id"]), 0.0)),
    })
    for i, pid in enumerate(result["bench_out_ids"], start=1):
        csv_rows.append({
            "role": f"Bench_{i}",
            "position": _pos(pid),
            "name": _name(pid),
            "player_id": int(pid),
            "score": float(score_map.get(int(pid), 0.0)),
        })
    pd.DataFrame(csv_rows).to_csv(csv_path, index=False)
    logging.info(f"Saved CSV  -> {csv_path}")


if __name__ == "__main__":
    try:
        run_cli()
    except Exception as e:
        # Robust, clear error message
        logging.basicConfig(level=logging.ERROR, format="%(levelname)s %(message)s")
        logging.error(str(e))
        raise
"""CLI zum automatischen Zusammenstellen eines FPL-Lineups mit Formation."""CLI zum automatischen Zusammenstellen eines FPL-Lineups mit Formation.



Usage:Usage:

    python code/lineup/auto_formation_cli.py \    python code/lineup/auto_formation_cli.py \

        --season 2023-24 \        --season 2023-24 \

        --gw 30 \        --gw 30 \

        --window 5 \        --window 5 \

        --k 3 \        --k 3 \

        --squad_csv data/current/squad_2023-24.csv        --squad_csv data/current/squad_2023-24.csv



Output:Output:

    - Console: Formation, XI, Captain/Vice, Bench    - Console: Formation, XI, Captain/Vice, Bench

    - JSON: out/lineup/xi_{season}_gw{gw}.json    - JSON: out/lineup/xi_{season}_gw{gw}.json

    - CSV: out/lineup/xi_{season}_gw{gw}.csv    - CSV: out/lineup/xi_{season}_gw{gw}.csv

""""""



import argparseimport argparse

import jsonimport json

import loggingimport logging

import sysimport sys

from pathlib import Pathfrom pathlib import Path



import pandas as pdimport pandas as pd



# Setup paths# Setup paths

repo_root = Path(__file__).resolve().parents[2]repo_root = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(repo_root / "code"))sys.path.insert(0, str(repo_root / "code"))



from utils.team_builder import pick_lineup_autoformationfrom utils.team_builder import pick_lineup_autoformation



logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")





def main():

    parser = argparse.ArgumentParser(
        description="Auto-formation lineup picker for FPL / Automatisches Lineup-Picking mit Formationswahl",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
    parser.add_argument("--season", required=True, help="Saison, z.B. 2023-24")

Examples:    parser.add_argument("--gw", type=int, required=True, help="Gameweek-Nummer")

  # Using enriched feature file (preferred)    parser.add_argument(

  python code/lineup/auto_formation_cli.py --season 2023-24 --gw 30 --window 5 --k 3        "--squad_csv",

          required=True,

  # Using simple squad CSV        help="Pfad zur Squad-CSV (muss player_id, position, name enthalten)",

  python code/lineup/auto_formation_cli.py --season 2023-24 --gw 30 --squad_csv data/current/squad_2023-24.csv    )

        """,    parser.add_argument(

    )        "--window",

    parser.add_argument("--season", required=True, help="Season, e.g. 2023-24")        type=int,

    parser.add_argument(        default=5,

        "--gw", type=int, help="Gameweek number (optional, uses max if missing)"        help="Rolling-Window fuer Team-Metriken (Standard: 5)",

    )    parser = argparse.ArgumentParser(

    parser.add_argument(        description="Auto-formation lineup picker for FPL",

        "--window", type=int, default=5, help="Rolling window for features (default: 5)"        formatter_class=argparse.RawDescriptionHelpFormatter,

    )        epilog="""

    parser.add_argument(Examples:

        "--k", type=int, default=3, help="Shrinkage parameter for features (default: 3)"  # Using enriched feature file (preferred)

    )  python code/lineup/auto_formation_cli.py --season 2023-24 --gw 30 --window 5 --k 3

    parser.add_argument(  

        "--squad_csv",  # Using simple squad CSV

        help="Path to squad CSV (15 players with player_id, name, position, pred_points)",  python code/lineup/auto_formation_cli.py --season 2023-24 --gw 30 --squad_csv data/current/squad_2023-24.csv

    )        """,

    parser.add_argument(    )

        "--p_floor",    parser.add_argument("--season", required=True, help="Season, e.g. 2023-24")

        type=float,    parser.add_argument(

        default=0.6,        "--gw", type=int, help="Gameweek number (optional, uses max if missing)"

        help="Min start probability clamp (default: 0.6)",    )

    )    parser.add_argument(

    parser.add_argument(        "--window", type=int, default=5, help="Rolling window for features (default: 5)"

        "--prefer_minutes",    )

        action="store_true",    parser.add_argument(

        default=True,        "--k", type=int, default=3, help="Shrinkage parameter for features (default: 3)"

        help="Weight by p_start (default: True)",    )

    )    parser.add_argument(

    parser.add_argument(        "--squad_csv",

        "--formation_pref",        help="Path to squad CSV (15 players with player_id, name, position, pred_points)",

        nargs="+",    )

        help="Preferred formations, e.g. '4-3-3' '3-4-3'",    parser.add_argument(

    )        "--p_floor",

    parser.add_argument(        type=float,

        "--output_dir",        default=0.6,

        default="out/lineup",        help="Min start probability clamp (default: 0.6)",

        help="Output directory (default: out/lineup)",    )

    )    parser.add_argument(

        "--prefer_minutes",

    args = parser.parse_args()        action="store_true",

        default=True,

    # ─────────────────────────────────────────────────────────────────────        help="Weight by p_start (default: True)",

    # 1. Load data    )

    # ─────────────────────────────────────────────────────────────────────    parser.add_argument(

    enriched_path = (        "--formation_pref",

        repo_root        nargs="+",

        / "out"        help="Preferred formations, e.g. '4-3-3' '3-4-3'",

        / "player_features"    )

        / f"player_with_opp_strength_{args.season}_l{args.window}_k{args.k}.csv"    parser.add_argument(

    )        "--output_dir",

        default="out/lineup",

    df = None        help="Output directory (default: out/lineup)",

    source = None    )



    # Try enriched file first    args = parser.parse_args()

    if enriched_path.exists():

        logging.info(f"Loading enriched features: {enriched_path}")    # ─────────────────────────────────────────────────────────────────────

        df = pd.read_csv(enriched_path)    # 1. Load data

        source = "enriched"    # ─────────────────────────────────────────────────────────────────────

    elif args.squad_csv:    enriched_path = (

        squad_path = Path(args.squad_csv)        repo_root

        if not squad_path.exists():        / "out"

            logging.error(f"Squad CSV not found: {args.squad_csv}")        / "player_features"

            sys.exit(1)        / f"player_with_opp_strength_{args.season}_l{args.window}_k{args.k}.csv"

        logging.info(f"Loading squad CSV: {args.squad_csv}")    )

        df = pd.read_csv(squad_path)

        source = "squad_csv"    df = None

    else:    source = None

        logging.error(

            f"No data found. Enriched file missing: {enriched_path}\n"    # Try enriched file first

            "Please provide --squad_csv or generate enriched features first."    if enriched_path.exists():

        )        logging.info(f"Loading enriched features: {enriched_path}")

        sys.exit(1)        df = pd.read_csv(enriched_path)

        source = "enriched"

    # ─────────────────────────────────────────────────────────────────────    elif args.squad_csv:

    # 2. Validate required columns        squad_path = Path(args.squad_csv)

    # ─────────────────────────────────────────────────────────────────────        if not squad_path.exists():

    required_cols = ["player_id", "position"]            logging.error(f"Squad CSV not found: {args.squad_csv}")

    missing = [c for c in required_cols if c not in df.columns]            sys.exit(1)

    if missing:        logging.info(f"Loading squad CSV: {args.squad_csv}")

        logging.error(f"Missing required columns: {missing}")        df = pd.read_csv(squad_path)

        sys.exit(1)        source = "squad_csv"

    else:

    # ─────────────────────────────────────────────────────────────────────        logging.error(

    # 3. Filter to gameweek            f"No data found. Enriched file missing: {enriched_path}\n"

    # ─────────────────────────────────────────────────────────────────────            "Please provide --squad_csv or generate enriched features first."

    if source == "enriched" and "gw" in df.columns:        )

        if args.gw is None:        sys.exit(1)

            target_gw = int(df["gw"].max())

            logging.info(f"No --gw provided, using max GW: {target_gw}")    # ─────────────────────────────────────────────────────────────────────

        else:    # 2. Validate required columns

            target_gw = args.gw    # ─────────────────────────────────────────────────────────────────────

    required_cols = ["player_id", "position"]

        df = df[df["gw"] == target_gw].copy()    missing = [c for c in required_cols if c not in df.columns]

        if df.empty:    if missing:

            logging.error(f"No data for GW {target_gw} in enriched file")        logging.error(f"Missing required columns: {missing}")

            sys.exit(1)        sys.exit(1)

        logging.info(f"Filtered to GW {target_gw}: {len(df)} rows")

    else:    # ─────────────────────────────────────────────────────────────────────

        target_gw = args.gw if args.gw else 1    # 3. Filter to gameweek

        logging.info(f"Using GW {target_gw} (no gw column in data)")    # ─────────────────────────────────────────────────────────────────────

    if source == "enriched" and "gw" in df.columns:

    # ─────────────────────────────────────────────────────────────────────        if args.gw is None:

    # 4. Extract 15-player squad            target_gw = int(df["gw"].max())

    # ─────────────────────────────────────────────────────────────────────            logging.info(f"No --gw provided, using max GW: {target_gw}")

    if "in_squad" in df.columns:        else:

        squad_df = df[df["in_squad"] == True].copy()  # noqa: E712            target_gw = args.gw

        logging.info(f"Extracted squad via in_squad==True: {len(squad_df)} players")

    else:        df = df[df["gw"] == target_gw].copy()

        squad_df = df.copy()        if df.empty:

        logging.info(f"Using all {len(squad_df)} rows as squad")            logging.error(f"No data for GW {target_gw} in enriched file")

            sys.exit(1)

    if len(squad_df) != 15:        logging.info(f"Filtered to GW {target_gw}: {len(df)} rows")

        logging.warning(    else:

            f"Squad has {len(squad_df)} players (expected 15). Proceeding anyway."        target_gw = args.gw if args.gw else 1

        )        logging.info(f"Using GW {target_gw} (no gw column in data)")



    # ─────────────────────────────────────────────────────────────────────    # ─────────────────────────────────────────────────────────────────────

    # 5. Ensure required columns with defaults    # 4. Extract 15-player squad

    # ─────────────────────────────────────────────────────────────────────    # ─────────────────────────────────────────────────────────────────────

    if "pred_points" not in squad_df.columns:    if "in_squad" in df.columns:

        if "points" in squad_df.columns:        squad_df = df[df["in_squad"] == True].copy()  # noqa: E712

            logging.warning("No pred_points column, using 'points' as fallback")        logging.info(f"Extracted squad via in_squad==True: {len(squad_df)} players")

            squad_df["pred_points"] = squad_df["points"]    else:

        else:        squad_df = df.copy()

            logging.warning("No pred_points column, using default 3.0")        logging.info(f"Using all {len(squad_df)} rows as squad")

            squad_df["pred_points"] = 3.0

    if len(squad_df) != 15:

    if "p_start" not in squad_df.columns:        logging.warning(

        logging.info("No p_start column, using default 1.0 (no minutes penalty)")            f"Squad has {len(squad_df)} players (expected 15). Proceeding anyway."

        squad_df["p_start"] = 1.0        )



    if "name" not in squad_df.columns:    # ─────────────────────────────────────────────────────────────────────

        squad_df["name"] = squad_df["player_id"].astype(str)    # 5. Ensure required columns with defaults

    # ─────────────────────────────────────────────────────────────────────

    if "price" not in squad_df.columns:    if "pred_points" not in squad_df.columns:

        squad_df["price"] = 5.0        if "points" in squad_df.columns:

            logging.warning("No pred_points column, using 'points' as fallback")

    # ─────────────────────────────────────────────────────────────────────            squad_df["pred_points"] = squad_df["points"]

    # 6. Call lineup picker        else:

    # ─────────────────────────────────────────────────────────────────────            logging.warning("No pred_points column, using default 3.0")

    logging.info(f"Calling lineup picker (p_floor={args.p_floor})...")            squad_df["pred_points"] = 3.0

    try:

        result = pick_lineup_autoformation(    if "p_start" not in squad_df.columns:

            squad_df,        logging.info("No p_start column, using default 1.0 (no minutes penalty)")

            prefer_minutes=args.prefer_minutes,        squad_df["p_start"] = 1.0

            p_start_col="p_start",

            pred_col="pred_points",    if "name" not in squad_df.columns:

            position_col="position",        squad_df["name"] = squad_df["player_id"].astype(str)

            player_id_col="player_id",

            name_col="name",    if "price" not in squad_df.columns:

            p_floor=args.p_floor,        squad_df["price"] = 5.0

            formation_preference=args.formation_pref,

        )    # ─────────────────────────────────────────────────────────────────────

    except ValueError as e:    # 6. Call lineup picker

        logging.error(f"Lineup picker failed: {e}")    # ─────────────────────────────────────────────────────────────────────

        sys.exit(1)    logging.info(f"Calling lineup picker (p_floor={args.p_floor})...")

    try:

    # ─────────────────────────────────────────────────────────────────────        result = pick_lineup_autoformation(

    # 7. Print results            squad_df,

    # ─────────────────────────────────────────────────────────────────────            prefer_minutes=args.prefer_minutes,

    print("\n" + "=" * 70)            p_start_col="p_start",

    print(f"FPL LINEUP - SEASON {args.season}, GAMEWEEK {target_gw}")            pred_col="pred_points",

    print("=" * 70)            position_col="position",

    print(f"\nFormation: {result['formation']}")            player_id_col="player_id",

    print(f"Expected XI Points: {result['xi_points_sum']:.2f}")            name_col="name",

            p_floor=args.p_floor,

    # Get captain/vice names            formation_preference=args.formation_pref,

    captain_row = squad_df[squad_df["player_id"] == result["captain_id"]]        )

    vice_row = squad_df[squad_df["player_id"] == result["vice_id"]]    except ValueError as e:

    captain_name = (        logging.error(f"Lineup picker failed: {e}")

        captain_row.iloc[0]["name"] if not captain_row.empty else result["captain_id"]        sys.exit(1)

    )

    vice_name = vice_row.iloc[0]["name"] if not vice_row.empty else result["vice_id"]    # ─────────────────────────────────────────────────────────────────────

    # 7. Print results

    print(f"\nCaptain: {captain_name} (ID {result['captain_id']})")    # ─────────────────────────────────────────────────────────────────────

    print(f"Vice-Captain: {vice_name} (ID {result['vice_id']})")    print("\n" + "=" * 70)

    print(f"FPL LINEUP - SEASON {args.season}, GAMEWEEK {target_gw}")

    # Build XI table    print("=" * 70)

    print("\n--- STARTING XI ---")    print(f"\nFormation: {result['formation']}")

    xi_df = squad_df[squad_df["player_id"].isin(result["xi_ids"])].copy()    print(f"Expected XI Points: {result['xi_points_sum']:.2f}")

    xi_df["role"] = "XI"

    xi_df["order"] = xi_df["player_id"].map(    # Get captain/vice names

        {pid: i for i, pid in enumerate(result["xi_ids"])}    captain_row = squad_df[squad_df["player_id"] == result["captain_id"]]

    )    vice_row = squad_df[squad_df["player_id"] == result["vice_id"]]

    xi_df = xi_df.sort_values("order")    captain_name = (

        captain_row.iloc[0]["name"] if not captain_row.empty else result["captain_id"]

    print(f"{'Position':<8} {'Name':<30} {'Pred Pts':<10}")    )

    print("-" * 50)    vice_name = vice_row.iloc[0]["name"] if not vice_row.empty else result["vice_id"]

    for _, row in xi_df.iterrows():

        marker = ""    print(f"\nCaptain: {captain_name} (ID {result['captain_id']})")

        if row["player_id"] == result["captain_id"]:    print(f"Vice-Captain: {vice_name} (ID {result['vice_id']})")

            marker = " (C)"

        elif row["player_id"] == result["vice_id"]:    # Build XI table

            marker = " (VC)"    print("\n--- STARTING XI ---")

        print(    xi_df = squad_df[squad_df["player_id"].isin(result["xi_ids"])].copy()

            f"{row['position']:<8} {row['name']:<30} {row['pred_points']:>8.2f}{marker}"    xi_df["role"] = "XI"

        )    xi_df["order"] = xi_df["player_id"].map(

        {pid: i for i, pid in enumerate(result["xi_ids"])}

    # Build bench table    )

    print("\n--- BENCH ---")    xi_df = xi_df.sort_values("order")

    bench_ids = [result["bench_gk_id"]] + result["bench_out_ids"]

    bench_df = squad_df[squad_df["player_id"].isin(bench_ids)].copy()    print(f"{'Position':<8} {'Name':<30} {'Pred Pts':<10}")

    bench_df["order"] = bench_df["player_id"].map(    print("-" * 50)

        {pid: i for i, pid in enumerate(bench_ids)}    for _, row in xi_df.iterrows():

    )        marker = ""

    bench_df = bench_df.sort_values("order")        if row["player_id"] == result["captain_id"]:

            marker = " (C)"

    for i, (_, row) in enumerate(bench_df.iterrows()):        elif row["player_id"] == result["vice_id"]:

        label = "GK" if i == 0 else f"B{i}"            marker = " (VC)"

        print(        print(

            f"{label:<8} {row['position']:<8} {row['name']:<30} {row['pred_points']:>8.2f}"            f"{row['position']:<8} {row['name']:<30} {row['pred_points']:>8.2f}{marker}"

        )        )



    # Show formation scores    # Build bench table

    print("\n--- FORMATION SCORES (debug) ---")    print("\n--- BENCH ---")

    sorted_formations = sorted(result["debug"].items(), key=lambda x: -x[1])    bench_ids = [result["bench_gk_id"]] + result["bench_out_ids"]

    for form, score in sorted_formations:    bench_df = squad_df[squad_df["player_id"].isin(bench_ids)].copy()

        if score == -float("inf"):    bench_df["order"] = bench_df["player_id"].map(

            print(f"  {form}: infeasible")        {pid: i for i, pid in enumerate(bench_ids)}

        else:    )

            marker = " <-- SELECTED" if form == result["formation"] else ""    bench_df = bench_df.sort_values("order")

            print(f"  {form}: {score:>6.2f}{marker}")

    for i, (_, row) in enumerate(bench_df.iterrows()):

    print("=" * 70)        label = "GK" if i == 0 else f"B{i}"

        print(

    # ─────────────────────────────────────────────────────────────────────            f"{label:<8} {row['position']:<8} {row['name']:<30} {row['pred_points']:>8.2f}"

    # 8. Save outputs        )

    # ─────────────────────────────────────────────────────────────────────

    output_dir = Path(args.output_dir)    # Show formation scores

    output_dir.mkdir(parents=True, exist_ok=True)    print("\n--- FORMATION SCORES (debug) ---")

    sorted_formations = sorted(result["debug"].items(), key=lambda x: -x[1])

    # JSON output    for form, score in sorted_formations:

    json_path = output_dir / f"xi_{args.season}_gw{target_gw}.json"        if score == -float("inf"):

    json_data = {            print(f"  {form}: infeasible")

        "season": args.season,        else:

        "gw": target_gw,            marker = " <-- SELECTED" if form == result["formation"] else ""

        "formation": result["formation"],            print(f"  {form}: {score:>6.2f}{marker}")

        "xi_ids": result["xi_ids"],

        "bench_gk_id": result["bench_gk_id"],    print("=" * 70)

        "bench_out_ids": result["bench_out_ids"],

        "captain_id": result["captain_id"],    # ─────────────────────────────────────────────────────────────────────

        "vice_id": result["vice_id"],    # 8. Save outputs

        "xi_points_sum": result["xi_points_sum"],    # ─────────────────────────────────────────────────────────────────────

        "debug_formation_scores": result["debug"],    output_dir = Path(args.output_dir)

    }    output_dir.mkdir(parents=True, exist_ok=True)



    with open(json_path, "w") as f:    # JSON output

        json.dump(json_data, f, indent=2)    json_path = output_dir / f"xi_{args.season}_gw{target_gw}.json"

    logging.info(f"Saved JSON: {json_path}")    json_data = {

        "season": args.season,

    # CSV output        "gw": target_gw,

    csv_path = output_dir / f"xi_{args.season}_gw{target_gw}.csv"        "formation": result["formation"],

    lineup_rows = []        "xi_ids": result["xi_ids"],

        "bench_gk_id": result["bench_gk_id"],

    for idx, pid in enumerate(result["xi_ids"]):        "bench_out_ids": result["bench_out_ids"],

        player_row = squad_df[squad_df["player_id"] == pid]        "captain_id": result["captain_id"],

        if not player_row.empty:        "vice_id": result["vice_id"],

            p = player_row.iloc[0]        "xi_points_sum": result["xi_points_sum"],

            lineup_rows.append(        "debug_formation_scores": result["debug"],

                {    }

                    "role": "XI",

                    "order": idx + 1,    with open(json_path, "w") as f:

                    "player_id": pid,        json.dump(json_data, f, indent=2)

                    "name": p["name"],    logging.info(f"Saved JSON: {json_path}")

                    "position": p["position"],

                    "pred_points": p["pred_points"],    # CSV output

                    "is_captain": pid == result["captain_id"],    csv_path = output_dir / f"xi_{args.season}_gw{target_gw}.csv"

                    "is_vice": pid == result["vice_id"],    lineup_rows = []

                }

            )    for idx, pid in enumerate(result["xi_ids"]):

        player_row = squad_df[squad_df["player_id"] == pid]

    # Bench GK        if not player_row.empty:

    bench_gk_row = squad_df[squad_df["player_id"] == result["bench_gk_id"]]            p = player_row.iloc[0]

    if not bench_gk_row.empty:            lineup_rows.append(

        p = bench_gk_row.iloc[0]                {

        lineup_rows.append(                    "role": "XI",

            {                    "order": idx + 1,

                "role": "BENCH_GK",                    "player_id": pid,

                "order": 0,                    "name": p["name"],

                "player_id": result["bench_gk_id"],                    "position": p["position"],

                "name": p["name"],                    "pred_points": p["pred_points"],

                "position": p["position"],                    "is_captain": pid == result["captain_id"],

                "pred_points": p["pred_points"],                    "is_vice": pid == result["vice_id"],

                "is_captain": False,                }

                "is_vice": False,            )

            }

        )    # Bench GK

    bench_gk_row = squad_df[squad_df["player_id"] == result["bench_gk_id"]]

    # Bench outfield    if not bench_gk_row.empty:

    for bench_idx, pid in enumerate(result["bench_out_ids"], start=1):        p = bench_gk_row.iloc[0]

        player_row = squad_df[squad_df["player_id"] == pid]        lineup_rows.append(

        if not player_row.empty:            {

            p = player_row.iloc[0]                "role": "BENCH_GK",

            lineup_rows.append(                "order": 0,

                {                "player_id": result["bench_gk_id"],

                    "role": f"BENCH_{bench_idx}",                "name": p["name"],

                    "order": bench_idx,                "position": p["position"],

                    "player_id": pid,                "pred_points": p["pred_points"],

                    "name": p["name"],                "is_captain": False,

                    "position": p["position"],                "is_vice": False,

                    "pred_points": p["pred_points"],            }

                    "is_captain": False,        )

                    "is_vice": False,

                }    # Bench outfield

            )    for bench_idx, pid in enumerate(result["bench_out_ids"], start=1):

        player_row = squad_df[squad_df["player_id"] == pid]

    lineup_df = pd.DataFrame(lineup_rows)        if not player_row.empty:

    lineup_df.to_csv(csv_path, index=False)            p = player_row.iloc[0]

    logging.info(f"Saved CSV: {csv_path}")            lineup_rows.append(

                {

    print(f"\n[OK] Outputs saved to {output_dir}/")                    "role": f"BENCH_{bench_idx}",

                    "order": bench_idx,

                    "player_id": pid,

if __name__ == "__main__":                    "name": p["name"],

    main()                    "position": p["position"],

                    "pred_points": p["pred_points"],
                    "is_captain": False,
                    "is_vice": False,
                }
            )

    lineup_df = pd.DataFrame(lineup_rows)
    lineup_df.to_csv(csv_path, index=False)
    logging.info(f"Saved CSV: {csv_path}")

    print(f"\n[OK] Outputs saved to {output_dir}/")

    return latest


if __name__ == "__main__":
    main()
