"""One-GW auto-formation lineup picker CLI.

Usage:
  python code/lineup/auto_formation_cli_v2.py --season 2023-24 --gw 30 --window 5 --k 3 --squad_csv data/current/squad_2023-24.csv

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
import sys
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

# Robust local import to avoid stdlib 'code' module name clash
REPO_ROOT = Path(__file__).resolve().parents[2]
UTILS_PATH = REPO_ROOT / "code" / "utils" / "team_builder.py"


def _import_local(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module {module_name!r} from {file_path!r}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)  # type: ignore
    return mod


_team_builder = _import_local("fpl_team_builder_cli", UTILS_PATH)
# pull the functions we need
pick_lineup_autoformation = _team_builder.pick_lineup_autoformation  # type: ignore[attr-defined]
format_lineup_table = _team_builder.format_lineup_table  # type: ignore[attr-defined]


def _build_features_path(season: str, window: int, k: int) -> Path:
    return (
        Path("out")
        / "player_features"
        / f"player_with_opp_strength_{season}_l{window}_k{k}.csv"
    )


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


def _filter_gw(
    df: pd.DataFrame, gw: Optional[int]
) -> tuple[pd.DataFrame, Optional[int]]:
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


def _reduce_to_squad(
    df: pd.DataFrame, used_source: str, squad_csv_given: bool
) -> pd.DataFrame:
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


def _compute_score(
    df: pd.DataFrame,
    prefer_minutes: bool,
    p_floor: float,
    pred_col: str = "pred_points",
    p_start_col: str = "p_start",
) -> pd.Series:
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
    parser = argparse.ArgumentParser(
        description="Auto-formation lineup picker for one GW"
    )
    parser.add_argument("--season", required=True, help="Season label, e.g. 2023-24")
    parser.add_argument(
        "--gw",
        type=int,
        default=None,
        help="Gameweek to filter (defaults to max in data)",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=5,
        help="Lookback window length for features filename",
    )
    parser.add_argument(
        "--k", type=int, default=3, help="K parameter for features filename"
    )
    parser.add_argument(
        "--squad_csv", type=str, default=None, help="Path to a 15-man squad CSV"
    )
    parser.add_argument(
        "--prefer_minutes",
        action="store_true",
        help="Weight points by start probability",
    )
    parser.add_argument(
        "--p_floor",
        type=float,
        default=0.6,
        help="Minimum start prob clamp when weighting",
    )
    parser.add_argument(
        "--formation_pref",
        type=str,
        default=None,
        help="Comma-separated formations to try (e.g., 3-4-3,4-4-2)",
    )
    parser.add_argument(
        "--output_dir", type=str, default="out/lineup", help="Where to save outputs"
    )

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
    by_id = df_squad.set_index("player_id")[
        ["name", "position", "pred_points"]
    ].to_dict("index")
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
    print(
        f"Season: {season} | GW: {gw if gw is not None else 'n/a'} | Formation: {result['formation']}"
    )
    print(f"XI predicted points (sum of pred_points): {result['xi_points_sum']:.2f}")
    print(f"Captain: {_name(result['captain_id'])} | Vice: {_name(result['vice_id'])}")
    print("")

    # Use format_lineup_table for clean display
    lineup_table = format_lineup_table(
        squad_df=df_squad,
        xi_ids=result["xi_ids"],
        bench_gk_id=result["bench_gk_id"],
        bench_out_ids=result["bench_out_ids"],
        captain_id=result["captain_id"],
        vice_id=result["vice_id"],
    )
    print(lineup_table)
    print("")

    # XI table (legacy - can be removed if you prefer just the formatted table)
    print("\nDetailed XI:")
    xi_rows = []
    for pid in result["xi_ids"]:
        xi_rows.append(
            {
                "position": _pos(pid),
                "name": _name(pid),
                "player_id": int(pid),
                "score": float(score_map.get(int(pid), 0.0)),
            }
        )
    xi_df = pd.DataFrame(xi_rows)
    # order by GK first, then DEF, MID, FWD typical; within as provided
    pos_order = {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
    xi_df["_po"] = xi_df["position"].map(pos_order).fillna(9)
    xi_df = xi_df.sort_values(by=["_po", "score"], ascending=[True, False])
    print(xi_df[["position", "name", "score"]].to_string(index=False, justify="left"))

    # Bench table
    print("\nBench:")
    bench_rows = []
    bench_rows.append(
        {
            "position": _pos(result["bench_gk_id"]),
            "name": _name(result["bench_gk_id"]),
            "player_id": int(result["bench_gk_id"]),
            "score": float(score_map.get(int(result["bench_gk_id"]), 0.0)),
            "bench_slot": "GK",
        }
    )
    for i, pid in enumerate(result["bench_out_ids"], start=1):
        bench_rows.append(
            {
                "position": _pos(pid),
                "name": _name(pid),
                "player_id": int(pid),
                "score": float(score_map.get(int(pid), 0.0)),
                "bench_slot": f"B{i}",
            }
        )
    bench_df = pd.DataFrame(bench_rows)
    print(
        bench_df[["bench_slot", "position", "name", "score"]].to_string(
            index=False, justify="left"
        )
    )

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
        csv_rows.append(
            {
                "role": "XI",
                "position": _pos(pid),
                "name": _name(pid),
                "player_id": int(pid),
                "score": float(score_map.get(int(pid), 0.0)),
            }
        )
    csv_rows.append(
        {
            "role": "Bench_GK",
            "position": _pos(result["bench_gk_id"]),
            "name": _name(result["bench_gk_id"]),
            "player_id": int(result["bench_gk_id"]),
            "score": float(score_map.get(int(result["bench_gk_id"]), 0.0)),
        }
    )
    for i, pid in enumerate(result["bench_out_ids"], start=1):
        csv_rows.append(
            {
                "role": f"Bench_{i}",
                "position": _pos(pid),
                "name": _name(pid),
                "player_id": int(pid),
                "score": float(score_map.get(int(pid), 0.0)),
            }
        )
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
