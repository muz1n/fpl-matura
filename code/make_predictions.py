#!/usr/bin/env python3
"""Generate predictions for a specific gameweek (rf | ma3 | pos).

Distinct methods and strict season guard:
- Only read data/merged_gw_<season>.csv (fail clearly if missing)
- Use only rows from THIS season file; no cross-season joins
- Player pool for gw = players seen historically in this season before gw

Methods:
- rf: RandomForest on shifted rolling features built from past GWs (< gw)
- ma3: Player moving average over last 3 GWs strictly before gw
- pos: Positional mean over last 5 GWs strictly before gw

Usage:
    python code/make_predictions.py --season 2022-23 --gw 30 --methode rf
    python code/make_predictions.py --season 2022-23 --gw 30 --methode ma3
    python code/make_predictions.py --season 2022-23 --gw 30 --methode pos
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PredictionMethod = Literal["rf", "ma3", "pos"]


def _to_float(val: object) -> float:
    """Best-effort conversion to float; returns np.nan on failure."""
    try:
        import pandas as pd  # local to avoid global when not available in env
        if isinstance(val, pd.Series):
            val = val.iloc[0] if len(val) > 0 else np.nan
    except Exception:
        pass
    try:
        return float(val)
    except Exception:
        return np.nan


def load_season_data(season: str) -> pd.DataFrame:
    """Load the season file strictly for the given season.

    Expected file: data/merged_gw_<season>.csv
    Fails with a clear error if missing.
    """
    csv_path = DATA_DIR / f"merged_gw_{season}.csv"
    if not csv_path.exists():
        raise SystemExit(
            f"ERROR: Could not find season file '{csv_path.name}'.\n"
            f"Please ensure the file exists under {DATA_DIR} and try again."
        )

    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)

    # Standardize key columns
    rename_map = {
        "element": "player_id",
        "id": "player_id",
        "round": "gw",
        "event": "gw",
        "GW": "gw",
        "total_points": "points",
        "value": "price",
        "now_cost": "price",
        "was_home": "home",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Deduplicate any columns that may have collided due to renaming (keep first)
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()].copy()

    # Numeric coercion
    for col in ["player_id", "gw", "points", "minutes", "price", "ict_index", "influence", "creativity", "threat", "home"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Normalize price if stored in 10x units
    if "price" in df.columns:
        med = df["price"].dropna().median()
        if pd.notna(med) and med > 25:
            df["price"] = df["price"] / 10.0

    # Position normalization
    if "pos" not in df.columns:
        if "position" in df.columns:
            df["pos"] = df["position"].astype(str).str.upper().map(
                {"GKP": "GK", "GK": "GK", "DEF": "DEF", "MID": "MID", "FWD": "FWD"}
            ).fillna(df["position"].astype(str))
        elif "element_type" in df.columns:
            df["pos"] = (
                df["element_type"].map({1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}).fillna("MID")
            )
        else:
            df["pos"] = "MID"

    # Team normalization
    if "team" not in df.columns:
        for c in ["team_short", "team_name", "team_h", "team_a"]:
            if c in df.columns:
                df["team"] = df[c].astype(str)
                break
    if "team" not in df.columns:
        df["team"] = "UNK"

    # Name fallback
    if "name" not in df.columns:
        df["name"] = "Unknown"

    # Ensure integers where appropriate
    if "player_id" in df.columns:
        df = df[df["player_id"].notna()].copy()
        df["player_id"] = df["player_id"].astype(int)
    if "gw" in df.columns:
        df = df[df["gw"].notna()].copy()
        df["gw"] = df["gw"].astype(int)

    # Sort by player-gw for rolling ops
    df = df.sort_values(["player_id", "gw"]).reset_index(drop=True)
    return df


def get_pool_for_gw(df: pd.DataFrame, gw: int) -> list[int]:
    """Players that existed historically before the given gw in this season."""
    if "player_id" not in df.columns or "gw" not in df.columns:
        return []
    pool = (
        df.loc[df["gw"] < gw, "player_id"].dropna().astype(int).unique().tolist()
    )
    return pool


def build_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add r3 rolling features shifted by 1 (no leakage)."""
    roll_cols = [c for c in ["points", "minutes", "ict_index", "influence", "creativity", "threat"] if c in df.columns]
    df = df.copy()
    for col in roll_cols:
        df[f"{col}_r3"] = (
            df.groupby("player_id")[col].shift(1).rolling(3, min_periods=1).mean()
        )
    if set(["points_r3", "minutes_r3"]).issubset(df.columns):
        with np.errstate(divide="ignore", invalid="ignore"):
            df["points_per90_r3"] = (df["points_r3"] / df["minutes_r3"].replace(0, np.nan)) * 90
    return df


def train_rf_model(df: pd.DataFrame, gw_target: int) -> tuple[RandomForestRegressor, list[str]]:
    """Train RF using only rows with gw < gw_target in THIS season.

    Target = current row's points; features are shifted rolling means.
    """
    # Build rolling features
    df_feats = build_rolling_features(df)

    # Candidate features (only those available are used)
    feature_candidates = [
        "price",
        "minutes_r3",
        "points_r3",
        "points_per90_r3",
        "ict_index_r3",
        "influence_r3",
        "creativity_r3",
        "threat_r3",
        "home",  # may be missing
        "opp_strength",  # likely missing
    ]
    features = [c for c in feature_candidates if c in df_feats.columns]

    # Training data: only rows strictly before target gw and with a points value
    train_df = df_feats[(df_feats["gw"] < gw_target) & df_feats["points"].notna()].copy()
    # Require at least one non-NaN feature
    if not features:
        # Fallback to price if available, else zero vector
        if "price" in df_feats.columns:
            features = ["price"]
        else:
            df_feats["const"] = 0.0
            features = ["const"]

    # Simple validation split using the last 10% of gws before target
    if len(train_df) > 0:
        min_gw = int(train_df["gw"].min())
        max_gw = int(train_df["gw"].max())
        val_split_gw = max(min_gw, max_gw - max(1, (max_gw - min_gw) // 10))
        val_df = train_df[train_df["gw"] >= val_split_gw]
        tr_df = train_df[train_df["gw"] < val_split_gw]
    else:
        tr_df = train_df
        val_df = train_df

    X_tr = tr_df[features].fillna(0.0).to_numpy(dtype=float)
    y_tr = tr_df["points"].to_numpy(dtype=float)
    X_val = val_df[features].fillna(0.0).to_numpy(dtype=float)
    y_val = val_df["points"].to_numpy(dtype=float)

    print(f"Training samples: {len(X_tr)}, Validation samples: {len(X_val)}")

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    if len(X_tr) > 0:
        model.fit(X_tr, y_tr)
        if len(X_val) > 0:
            y_pred = model.predict(X_val)
            mae = mean_absolute_error(y_val, y_pred)
            print(f"Validation MAE: {mae:.3f}")
    else:
        # Fit trivial model to avoid errors
        model.fit(np.zeros((1, len(features))), np.array([0.0]))

    return model, features


def predict_positional(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """POS baseline: mean points by position over last 5 GWs before gw."""
    window = 5
    hist = df[(df["gw"] < gw) & (df["gw"] >= gw - window)].copy()
    pos_means = (
        hist.groupby("pos")["points"].mean().to_dict() if not hist.empty else {}
    )
    global_mean = float(hist["points"].mean()) if not hist.empty else 0.0

    # Player metadata as of gw-1
    last_meta = (
        df[df["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id").tail(1)
        .set_index("player_id")
    )

    rows = []
    for pid in pool:
        if pid in last_meta.index:
            s = last_meta.loc[pid]
            pos = str(s.get("pos", "MID"))
            price_val = s.get("price", np.nan)
            price = _to_float(price_val)
            name = str(s.get("name", f"Player {pid}"))
            team = str(s.get("team", "UNK"))
        else:
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"
        pred = float(pos_means.get(pos, global_mean))
        rows.append({"player_id": pid, "name": name, "team": team, "pos": pos, "price": price, "predicted_points": pred})

    return pd.DataFrame(rows)


def predict_ma3(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """MA3 baseline: player mean of last up-to-3 GWs strictly before gw."""
    g = df.sort_values(["player_id", "gw"]).copy()
    g["points_ma3"] = g.groupby("player_id")["points"].shift(1).rolling(3, min_periods=1).mean()

    last_meta = (
        g[g["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id").tail(1)
        .set_index("player_id")
    )

    rows = []
    for pid in pool:
        pred = 0.0
        if pid in last_meta.index and "points_ma3" in last_meta.columns:
            val = last_meta.at[pid, "points_ma3"]
            pred_val = _to_float(val)
            if not np.isnan(pred_val):
                pred = pred_val
        if pred == 0.0:
            # fallback to mean of available history before gw
            hist_points = g.loc[(g["player_id"] == pid) & (g["gw"] < gw), "points"].dropna()
            pred = float(hist_points.mean()) if len(hist_points) > 0 else 0.0

        if pid in last_meta.index:
            s = last_meta.loc[pid]
            pos = str(s.get("pos", "MID"))
            price_val = s.get("price", np.nan)
            price = _to_float(price_val)
            name = str(s.get("name", f"Player {pid}"))
            team = str(s.get("team", "UNK"))
        else:
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"
        rows.append({"player_id": pid, "name": name, "team": team, "pos": pos, "price": price, "predicted_points": pred})

    return pd.DataFrame(rows)


def predict_rf(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """RF model trained on this season with rows gw < target gw."""
    model, features = train_rf_model(df, gw)

    df_feats = build_rolling_features(df)
    # Feature snapshot as of gw-1 per player
    snap = (
        df_feats[df_feats["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id").tail(1)
        .set_index("player_id")
    )

    X = []
    meta = []
    for pid in pool:
        if pid in snap.index:
            row = snap.loc[pid]
            vals = []
            for col in features:
                v = _to_float(row[col]) if col in row else np.nan
                vals.append(0.0 if np.isnan(v) else v)
            X.append(vals)
            pos = str(row.get("pos", "MID"))
            price_val = row.get("price", np.nan)
            price = _to_float(price_val)
            name = str(row.get("name", f"Player {pid}"))
            team = str(row.get("team", "UNK"))
        else:
            X.append([0.0] * len(features))
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"
        meta.append({"player_id": pid, "name": name, "team": team, "pos": pos, "price": price})

    X = np.asarray(X, dtype=float) if len(X) > 0 else np.zeros((0, len(features)))
    preds = model.predict(X) if len(X) > 0 else np.array([])

    rows = []
    for m, p in zip(meta, preds):
        rows.append({**m, "predicted_points": float(p)})
    return pd.DataFrame(rows)


def build_output(season: str, gw: int, method: str, pred_df: pd.DataFrame, season_player_ids: set[int]) -> dict:
    """Apply season guard and build JSON output schema."""
    df = pred_df.copy()
    # Season guard: drop any player not in this season's df
    before = len(df)
    df = df[df["player_id"].isin(season_player_ids)].copy()
    dropped = before - len(df)
    if dropped > 0:
        dropped_ids = sorted(set(pred_df["player_id"]) - season_player_ids)
        print(f"WARNING: Dropped {dropped} players not in season {season}: {dropped_ids[:5]}{'...' if len(dropped_ids)>5 else ''}")

    # Finalize fields and defaults
    for c in ["name", "team", "pos"]:
        if c not in df.columns:
            df[c] = {"name": "Unknown", "team": "UNK", "pos": "MID"}[c]
    if "price" not in df.columns:
        df["price"] = np.nan

    df["predicted_points"] = pd.to_numeric(df["predicted_points"], errors="coerce").fillna(0.0)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")

    players = []
    for _, row in df.sort_values("predicted_points", ascending=False).iterrows():
        players.append(
            {
                "player_id": int(row["player_id"]),
                "name": str(row.get("name", "Unknown")),
                "pos": str(row.get("pos", "MID")),
                "team": str(row.get("team", "UNK")),
                "predicted_points": round(float(row["predicted_points"]), 3),
                "price": (0.0 if pd.isna(row.get("price", np.nan)) else round(float(row["price"]), 1)),
            }
        )

    # Assertion: output player ids subset of season ids
    out_ids = {p["player_id"] for p in players}
    assert out_ids.issubset(season_player_ids), "Season guard failed: output contains players not in this season."

    result = {
        "season": season,
        "gw": int(gw),
        "method": method,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "players": players,
    }
    # Sanity log
    mean_pp = np.mean([p["predicted_points"] for p in players]) if players else 0.0
    print(f"Predicted players: {len(players)} | mean(predicted_points)={mean_pp:.3f}")
    return result


def main():
    parser = argparse.ArgumentParser(description="Generate FPL predictions (rf|ma3|pos) with strict season guard")
    parser.add_argument("--season", type=str, required=True, help="Season (e.g., 2022-23)")
    parser.add_argument("--gw", type=int, required=True, help="Gameweek number")
    # Support both --method and --methode (alias)
    parser.add_argument("--method", "--methode", dest="method", type=str, default="rf", choices=["rf", "ma3", "pos"], help="Prediction method")
    parser.add_argument("--output-dir", type=Path, default=OUT_DIR, help="Output directory")

    args = parser.parse_args()

    print(f"Generating predictions for Season {args.season}, GW {args.gw}, Method: {args.method}")

    # Load strictly this season's data
    df = load_season_data(args.season)

    # Build player pool seen before gw
    pool = get_pool_for_gw(df, args.gw)
    season_ids = set(df["player_id"].unique().tolist())
    print(f"Player pool for GW{args.gw}: {len(pool)} players")

    # Predict by method
    method = args.method.lower()
    if method == "pos":
        pred_df = predict_positional(df, args.gw, pool)
    elif method == "ma3":
        pred_df = predict_ma3(df, args.gw, pool)
    else:
        pred_df = predict_rf(df, args.gw, pool)

    # Build output with season guard
    output = build_output(args.season, args.gw, method, pred_df, season_ids)

    # Write JSON
    output_file = args.output_dir / f"predictions_gw{args.gw}_{method}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    print(f"\n✓ Predictions written to: {output_file}")
    print(f"  Total players: {len(output['players'])}")
    if output["players"]:
        print("  Top 5 predictions:")
        for i, player in enumerate(output["players"][:5], 1):
            print(f"    {i}. {player['name']} ({player['pos']}) - {player['predicted_points']} pts")


if __name__ == "__main__":
    main()
