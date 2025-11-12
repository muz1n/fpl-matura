# Füge diesen Prompt oben in eine neue, leere Datei ein (VS Code).
# Prompt (user request):
# Write a production-ready Python CLI script at `code/pipeline/make_gw.py` that:
#
# - CLI: `python code/pipeline/make_gw.py --season 2023-24 --gw 38 --squad data/sample_squad_23-24.json`
# - Steps:
#   1) Load the 15-man squad from `--squad` (JSON with fields: player_id, name, team, pos, price).
#   2) Produce or load predictions for that GW as a pandas DataFrame with at least:
#      [player_id, gw, name, team, pos, predicted_points, minutes_exp, opponent, is_home, opp_strength, price].
#      If a local predictor function exists (e.g., `from code.model.predict import predict_gw`), call it.
#      Else: look for `out/predictions_gw{gw}.json` and load it.
#   3) Call an existing lineup picker (e.g., `from code.lineup.pick import pick_lineup`) to select
#      formation, xi_ids, bench_gk_id, bench_out_ids, captain_id, vice_id and compute xi_points_sum
#      based on predicted_points.
#      If the picker is not available, implement a simple fallback that chooses a valid formation
#      and the top predicted players per position.
#   4) Save two files under `out/`:
#      - `predictions_gw{gw}.json` with this structure:
#        {
#          "season": "2023-24",
#          "gw": 38,
#          "generated_at": ISO8601,
#          "model_version": "<git short sha or 'dev'>",
#          "players": [ ... ]
#        }
#      - `lineup_gw{gw}.json` with this structure: { ... }
#   5) Print a short summary to stdout:
#      - players predicted: N
#      - chosen formation and XI list with names
#      - captain and vice names
#   6) Robustness:
#      - Validate formation and XI: exactly 11 unique players, exactly 1 GK, formation valid.
#      - Clear error messages if inputs missing.
#      - Create `out/` if it does not exist.
#   7) Utilities:
#      - Helper to fetch `model_version` from `git rev-parse --short HEAD`, else 'dev'.
#      - Type hints and docstrings.
#      - No heavy dependencies beyond pandas/numpy/argparse/pathlib/json/datetime/subprocess.
#
# Make the script clean, readable, and fail fast with helpful messages.

"""CLI to produce predictions and pick a lineup for a given GW.

This script follows the user's spec and will:
- load a 15-man squad JSON
- try to call a local predictor `predict_gw` if available, else load `out/predictions_gw{gw}.json`
- try to call `pick_lineup` from the project; if missing, use a simple fallback picker
- save predictions and chosen lineup JSONs under `out/`

Usage:
  python code/pipeline/make_gw.py --season 2023-24 --gw 38 --squad data/sample_squad_23-24.json
"""
from __future__ import annotations

import argparse
import datetime
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


ALLOWED_FORMATIONS = {
    "3-5-2": (3, 5, 2),
    "3-4-3": (3, 4, 3),
    "4-4-2": (4, 4, 2),
    "4-3-3": (4, 3, 3),
    "4-5-1": (4, 5, 1),
    "5-4-1": (5, 4, 1),
    "5-3-2": (5, 3, 2),
}


@dataclass
class SquadPlayer:
    player_id: int
    name: str
    team: str
    pos: str  # GK|DEF|MID|FWD
    price: float


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Make GW predictions and pick lineup")
    p.add_argument("--season", required=True, help="Season like '2023-24'")
    p.add_argument("--gw", required=True, type=int, help="Gameweek number")
    p.add_argument(
        "--squad", required=True, type=Path, help="Path to 15-man squad JSON"
    )
    return p.parse_args()


def load_squad(path: Path) -> List[SquadPlayer]:
    if not path.exists():
        raise SystemExit(f"Squad file not found: {path}")
    data = json.loads(path.read_text(encoding="utf8"))
    if not isinstance(data, list):
        raise SystemExit("Squad JSON must be a list of player dicts")
    squad: List[SquadPlayer] = []
    for i, it in enumerate(data):
        try:
            squad.append(
                SquadPlayer(
                    player_id=int(it["player_id"]),
                    name=str(it["name"]),
                    team=str(it.get("team", "")),
                    pos=str(it["pos"]),
                    price=float(it.get("price", 0.0)),
                )
            )
        except KeyError as e:
            raise SystemExit(f"Missing field in squad[{i}]: {e}")
    if len(squad) != 15:
        raise SystemExit(f"Squad must contain 15 players, got {len(squad)}")
    return squad


def try_get_model_version() -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL
        )
        return out.decode().strip()
    except Exception:
        return "dev"


def predictions_from_local_predictor(
    season: str, gw: int, squad: List[SquadPlayer]
) -> Optional[pd.DataFrame]:
    """Try to call a local predictor function. Return DataFrame or None on failure."""
    try:
        # Try to import a predictor if available
        from code.model.predict import predict_gw  # type: ignore

        # Try calling with common signatures
        try:
            df = predict_gw(season=season, gw=gw, squad=[s.__dict__ for s in squad])
        except TypeError:
            try:
                df = predict_gw(season, gw)
            except TypeError:
                df = predict_gw(gw)

        if isinstance(df, pd.DataFrame):
            return df
        # If the predictor returns list/dict, convert
        return pd.DataFrame(df)
    except Exception:
        return None


def load_predictions_from_file(gw: int) -> Optional[pd.DataFrame]:
    p = Path("out") / f"predictions_gw{gw}.json"
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf8"))
    players = data.get("players", [])
    if not players:
        return None
    return pd.DataFrame(players)


def ensure_prediction_columns(df: pd.DataFrame) -> pd.DataFrame:
    required = [
        "player_id",
        "gw",
        "name",
        "team",
        "pos",
        "predicted_points",
        "minutes_exp",
        "opponent",
        "is_home",
        "opp_strength",
        "price",
    ]
    # Add missing columns with sensible defaults
    for c in required:
        if c not in df.columns:
            if c == "gw":
                df[c] = np.nan
            elif c in ("predicted_points", "minutes_exp", "opp_strength", "price"):
                df[c] = 0.0
            elif c == "is_home":
                df[c] = False
            else:
                df[c] = None
    # Enforce types
    df["player_id"] = df["player_id"].astype(int)
    df["predicted_points"] = df["predicted_points"].astype(float)
    df["price"] = df["price"].astype(float)
    return df[required]


def try_call_pick_lineup(
    pred_df: pd.DataFrame, squad: List[SquadPlayer], season: str, gw: int
) -> Optional[Dict]:
    try:
        from code.lineup.pick import pick_lineup  # type: ignore

        # We don't assume a specific signature - try common ones
        try:
            res = pick_lineup(pred_df, squad=squad, season=season, gw=gw)
        except TypeError:
            try:
                res = pick_lineup(pred_df)
            except TypeError:
                res = pick_lineup(pred_df, season, gw)
        return dict(res)
    except Exception:
        return None


def fallback_pick_lineup(pred_df: pd.DataFrame) -> Dict:
    """Simple deterministic fallback lineup picker.

    Strategy:
    - Evaluate each allowed formation by selecting top players per position.
    - Choose formation maximizing sum of predicted_points for the XI (captain doubles).
    - Captain=highest predicted in XI, vice=second highest.
    - Bench: next best GK and next 3 outfielders by predicted_points not in XI.
    """
    # Normalize pos strings
    df = pred_df.copy()
    df["pos"] = (
        df["pos"]
        .str.upper()
        .map(lambda x: x if x in ("GK", "DEF", "MID", "FWD") else x[:3])
    )

    best_lineup: Optional[Dict] = None
    best_score = -np.inf

    for formation, (d_count, m_count, f_count) in ALLOWED_FORMATIONS.items():
        # pick GK
        gk_pool = df[df["pos"] == "GK"].sort_values("predicted_points", ascending=False)
        if len(gk_pool) < 1:
            continue
        gk = gk_pool.iloc[0]

        # pick defenders, mids, fwds
        def_pool = df[df["pos"] == "DEF"].sort_values(
            "predicted_points", ascending=False
        )
        mid_pool = df[df["pos"] == "MID"].sort_values(
            "predicted_points", ascending=False
        )
        fwd_pool = df[df["pos"] == "FWD"].sort_values(
            "predicted_points", ascending=False
        )

        if (
            len(def_pool) < d_count
            or len(mid_pool) < m_count
            or len(fwd_pool) < f_count
        ):
            continue

        xi = []
        xi_ids = []

        xi_ids.append(int(gk["player_id"]))
        xi.extend([int(x) for x in def_pool.head(d_count)["player_id"].tolist()])
        xi.extend([int(x) for x in mid_pool.head(m_count)["player_id"].tolist()])
        xi.extend([int(x) for x in fwd_pool.head(f_count)["player_id"].tolist()])

        if len(xi) != 1 + d_count + m_count + f_count:
            continue

        xi_set = set(xi)
        if len(xi_set) != len(xi):
            # duplicated players across positions (unlikely), skip
            continue

        xi_df = df[df["player_id"].isin(xi)].set_index("player_id")
        # choose captain & vice
        capt_id = int(xi_df["predicted_points"].idxmax())
        vice_id = int(xi_df["predicted_points"].drop(index=capt_id).idxmax())

        # sum predicted points with captain doubled
        score = xi_df["predicted_points"].sum() + xi_df.loc[capt_id, "predicted_points"]

        if score > best_score:
            best_score = score
            # bench GK: next GK not in xi
            bench_gk_candidates = gk_pool[~gk_pool["player_id"].isin(xi)].sort_values(
                "predicted_points", ascending=False
            )
            bench_gk_id = (
                int(bench_gk_candidates.iloc[0]["player_id"])
                if len(bench_gk_candidates) > 0
                else None
            )
            # bench out: next top 3 outfielders
            outfield = df[df["pos"] != "GK"].sort_values(
                "predicted_points", ascending=False
            )
            bench_out_candidates = (
                outfield[~outfield["player_id"].isin(xi)].head(3)["player_id"].tolist()
            )

            best_lineup = {
                "formation": formation,
                "xi_ids": [int(x) for x in xi],
                "bench_gk_id": int(bench_gk_id) if bench_gk_id is not None else None,
                "bench_out_ids": [int(x) for x in bench_out_candidates],
                "captain_id": int(capt_id),
                "vice_id": int(vice_id),
                "xi_points_sum": float(score),
                "debug": {"rules_ok": True, "notes": "chosen by fallback picker"},
            }

    if best_lineup is None:
        raise SystemExit("Could not form a valid XI with available players")
    return best_lineup


def validate_lineup(lineup: Dict, pred_df: pd.DataFrame) -> Tuple[bool, str]:
    xi = lineup.get("xi_ids", [])
    if len(xi) != 11:
        return False, f"XI must contain 11 players, got {len(xi)}"
    if len(set(xi)) != 11:
        return False, "XI contains duplicate players"
    # ensure exactly 1 GK
    gk_count = pred_df[pred_df["player_id"].isin(xi) & (pred_df["pos"] == "GK")].shape[
        0
    ]
    if gk_count != 1:
        return False, f"XI must contain exactly 1 GK, got {gk_count}"
    # ensure formation is allowed
    formation = lineup.get("formation")
    if formation not in ALLOWED_FORMATIONS:
        return False, f"Formation {formation} not allowed"
    return True, "ok"


def save_predictions_json(
    season: str, gw: int, model_version: str, pred_df: pd.DataFrame, out_dir: Path
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    outp = out_dir / f"predictions_gw{gw}.json"
    payload = {
        "season": season,
        "gw": int(gw),
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "model_version": model_version,
        "players": [],
    }
    for _, r in pred_df.iterrows():
        payload["players"].append(
            {
                "player_id": int(r["player_id"]),
                "name": str(r.get("name", "")),
                "team": str(r.get("team", "")),
                "pos": str(r.get("pos", "")),
                "predicted_points": float(r.get("predicted_points", 0.0)),
                "minutes_exp": float(r.get("minutes_exp", 0.0)),
                "opponent": str(r.get("opponent", "")),
                "is_home": bool(r.get("is_home", False)),
                "opp_strength": float(r.get("opp_strength", 0.0)),
                "price": float(r.get("price", 0.0)),
            }
        )
    outp.write_text(json.dumps(payload, indent=2), encoding="utf8")
    return outp


def save_lineup_json(
    season: str, gw: int, model_version: str, lineup: Dict, out_dir: Path
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    outp = out_dir / f"lineup_gw{gw}.json"

    # Local helpers that validate/convert values safely
    def _to_optional_int(v) -> Optional[int]:
        if v is None:
            return None
        if isinstance(v, int):
            return v
        try:
            return int(v)
        except (TypeError, ValueError):
            raise SystemExit(
                f"Invalid integer value in lineup (expected int or None): {v!r}"
            )

    def _to_int_required(v) -> int:
        if v is None:
            raise SystemExit("Missing required integer value in lineup")
        if isinstance(v, int):
            return v
        try:
            return int(v)
        except (TypeError, ValueError):
            raise SystemExit(f"Invalid integer value in lineup (expected int): {v!r}")

    payload = {
        "season": season,
        "gw": int(gw),
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "model_version": model_version,
        "formation": lineup.get("formation"),
        "xi_ids": [int(x) for x in lineup.get("xi_ids", [])],
        "bench_gk_id": _to_optional_int(lineup.get("bench_gk_id")),
        "bench_out_ids": [int(x) for x in lineup.get("bench_out_ids", [])],
        "captain_id": _to_int_required(lineup.get("captain_id")),
        "vice_id": _to_int_required(lineup.get("vice_id")),
        "xi_points_sum": float(lineup.get("xi_points_sum", 0.0)),
        "debug": lineup.get("debug", {}),
    }
    outp.write_text(json.dumps(payload, indent=2), encoding="utf8")
    return outp


def main() -> None:
    args = parse_args()
    season = args.season
    gw = int(args.gw)
    squad_path: Path = args.squad

    squad = load_squad(squad_path)

    # Try local predictor
    pred_df = predictions_from_local_predictor(season, gw, squad)
    if pred_df is None:
        pred_df = load_predictions_from_file(gw)
        if pred_df is None:
            raise SystemExit(
                "No predictions found: neither local predictor available nor out/predictions_gw{gw}.json exists"
            )

    pred_df = ensure_prediction_columns(pred_df)

    # Try existing pick_lineup
    lineup = try_call_pick_lineup(pred_df, squad, season, gw)
    if lineup is None:
        lineup = fallback_pick_lineup(pred_df)

    # Validate
    ok, note = validate_lineup(lineup, pred_df)
    lineup.setdefault("debug", {})
    lineup["debug"]["rules_ok"] = ok
    lineup["debug"]["notes"] = note

    model_version = try_get_model_version()
    out_dir = Path("out")

    # Save
    save_predictions_json(season, gw, model_version, pred_df, out_dir)
    save_lineup_json(season, gw, model_version, lineup, out_dir)

    # Print summary
    players_predicted = pred_df.shape[0]
    xi_ids = lineup.get("xi_ids", [])
    id2name = {int(r["player_id"]): r.get("name", "") for _, r in pred_df.iterrows()}
    # be defensive: xi_ids elements might be ints or strings; guard against None
    xi_names = [id2name.get(int(i) if i is not None else -1, str(i)) for i in xi_ids]
    formation = lineup.get("formation")

    # Safely handle possible None/unknown values for captain/vice before calling int()
    _cap = lineup.get("captain_id")
    _vice = lineup.get("vice_id")
    captain_name = id2name.get(int(_cap) if _cap is not None else -1, "")
    vice_name = id2name.get(int(_vice) if _vice is not None else -1, "")

    print(f"players predicted: {players_predicted}")
    print(f"chosen formation: {formation}")
    print("XI:")
    for i, n in enumerate(xi_names, 1):
        print(f"  {i:2}. {n}")
    print(f"captain: {captain_name}")
    print(f"vice: {vice_name}")


if __name__ == "__main__":
    main()
