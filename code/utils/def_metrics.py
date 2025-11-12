"""Defensive team metrics: rolling xGA with shrinkage.

Provides compute_team_def_metrics which builds rolling defensive metrics
per team and gameweek and applies James-Stein-like shrinkage towards the
league mean for each GW and context (home/away/all).

The function is defensive about missing columns and will prefer 'xGA'
if present, otherwise 'goals_against'.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd
from pathlib import Path

import importlib.util
import pathlib


def compute_team_def_metrics(
    results_df: pd.DataFrame, window: int = 5, k: int = 3
) -> pd.DataFrame:
    """
    Build rolling defensive metrics per team and GW.

    Input columns expected:
      - 'gw', 'date', 'team', 'opponent', 'home_away' in {'H','A'}, and either 'xGA' or 'goals_against'.

    Steps implemented:
      1) For each team, compute rolling mean of xGA (or GA) over last `window` matches,
         split by home/away and overall; no leakage (shift by 1 before rolling).
      2) Compute league mean mu per GW and context by averaging the team's rolling
         values for that GW (these rolling values are already shifted so they don't
         include the current match). Apply shrinkage: alpha = n / (n + k);
         adj = alpha * rolling + (1-alpha) * mu; if n == 0 fallback to mu.
      3) Provide columns: team_xga_l5_home_adj, team_xga_l5_away_adj, team_xga_l5_all_adj.
      4) Return a tidy frame keyed by ['team','gw'] with these columns.

    Returns
    -------
    pd.DataFrame
        Columns: ['team', 'gw', 'team_xga_l{window}_home_adj', 'team_xga_l{window}_away_adj', 'team_xga_l{window}_all_adj']
    """

    if results_df is None or results_df.empty:
        return pd.DataFrame(
            columns=[
                "team",
                "gw",
                f"team_xga_l{window}_home_adj",
                f"team_xga_l{window}_away_adj",
                f"team_xga_l{window}_all_adj",
            ]
        )

    df = results_df.copy()

    # pick xga column
    if "xGA" in df.columns:
        xga_col = "xGA"
    elif "goals_against" in df.columns:
        xga_col = "goals_against"
    else:
        raise ValueError("Input must contain either 'xGA' or 'goals_against' column")

    # ensure necessary columns
    for col in ("gw", "team", "home_away"):
        if col not in df.columns:
            raise ValueError(f"Input must contain column '{col}'")

    # normalize types
    df = df.copy()
    # Use gw and date for ordering; if date missing, fallback to gw order
    if "date" in df.columns:
        df["_order"] = pd.to_datetime(df["date"], errors="coerce")
        # where date cannot be parsed, use gw as integer to keep deterministic order
        df["_order"] = df["_order"].fillna(
            pd.to_timedelta(df["gw"].astype(int), unit="d")
        )
    else:
        df["_order"] = pd.to_timedelta(df["gw"].astype(int), unit="d")

    # helper to compute shifted rolling mean and count per group
    def _rolling_stats(group: pd.DataFrame, by_cols: Optional[tuple] = None):
        s = group.sort_values("_order")[xga_col]
        shifted = s.shift(1)
        roll_mean = shifted.rolling(window=window, min_periods=1).mean()
        roll_count = shifted.rolling(window=window, min_periods=0).count()
        return roll_mean, roll_count

    # overall rolling per team
    overall_roll_mean = []
    for name, grp in df.groupby("team"):
        mean_series, n_series = _rolling_stats(grp)
        overall_roll_mean.append(
            pd.DataFrame(
                {
                    "_idx": grp.index,
                    "team_xga_roll_all": mean_series.values,
                    "team_xga_n_all": n_series.values,
                }
            )
        )
    overall_roll = pd.concat(overall_roll_mean).set_index("_idx").sort_index()

    # home/away rolling per team
    ha_roll_mean = []
    for (team, ha), grp in df.groupby(["team", "home_away"]):
        mean_series, n_series = _rolling_stats(grp)
        # attach to indices
        col_mean = f"team_xga_roll_{ha}"
        col_n = f"team_xga_n_{ha}"
        ha_roll_mean.append(
            pd.DataFrame(
                {
                    "_idx": grp.index,
                    col_mean: mean_series.values,
                    col_n: n_series.values,
                }
            )
        )

    ha_roll = pd.concat(ha_roll_mean).set_index("_idx").sort_index()

    # merge rolling back into df
    df = df.join(overall_roll, how="left").join(ha_roll, how="left")

    # fill missing n with 0
    df["team_xga_n_all"] = df["team_xga_n_all"].fillna(0).astype(float)
    if "team_xga_n_H" in df.columns:
        df["team_xga_n_H"] = df["team_xga_n_H"].fillna(0).astype(float)
    else:
        df["team_xga_n_H"] = 0.0
    if "team_xga_n_A" in df.columns:
        df["team_xga_n_A"] = df["team_xga_n_A"].fillna(0).astype(float)
    else:
        df["team_xga_n_A"] = 0.0

    # rolling means may be NaN where no prior matches; keep as NaN
    # compute league-level mu per gw and context by averaging team rolling values for that gw
    def _league_mu(col_name: str):
        mu = df.groupby("gw")[col_name].mean()
        return mu

    mu_all = _league_mu("team_xga_roll_all")
    mu_H = _league_mu("team_xga_roll_H")
    mu_A = _league_mu("team_xga_roll_A")

    # map mus to rows
    df["mu_all"] = df["gw"].map(mu_all).astype(float)
    df["mu_H"] = df["gw"].map(mu_H).astype(float)
    df["mu_A"] = df["gw"].map(mu_A).astype(float)

    # fallback: if mu is nan (e.g., early GWs), use global mean of xga (shifted: mean of past observed xga)
    global_prior = df[xga_col].mean()
    df["mu_all"] = df["mu_all"].fillna(global_prior)
    df["mu_H"] = df["mu_H"].fillna(global_prior)
    df["mu_A"] = df["mu_A"].fillna(global_prior)

    # compute shrinkage-adjusted estimates
    def _shrink(roll_col: str, n_col: str, mu_col: str, out_name: str):
        n = df[n_col].astype(float)
        alpha = n / (n + float(k))
        roll = df[roll_col]
        mu = df[mu_col]
        adj = alpha * roll + (1 - alpha) * mu
        # where n == 0, use mu
        adj = adj.where(n > 0, mu)
        df[out_name] = adj

    # ensure roll cols exist (may be missing for some ha)
    for col in ["team_xga_roll_all", "team_xga_roll_H", "team_xga_roll_A"]:
        if col not in df.columns:
            df[col] = np.nan

    _shrink("team_xga_roll_H", "team_xga_n_H", "mu_H", f"team_xga_l{window}_home_adj")
    _shrink("team_xga_roll_A", "team_xga_n_A", "mu_A", f"team_xga_l{window}_away_adj")
    _shrink(
        "team_xga_roll_all", "team_xga_n_all", "mu_all", f"team_xga_l{window}_all_adj"
    )

    out_cols = [
        "team",
        "gw",
        f"team_xga_l{window}_home_adj",
        f"team_xga_l{window}_away_adj",
        f"team_xga_l{window}_all_adj",
    ]
    out = (
        df[out_cols]
        .drop_duplicates(subset=["team", "gw"])
        .sort_values(["team", "gw"])
        .reset_index(drop=True)
    )
    return out


def attach_opponent_features(
    player_df: pd.DataFrame, team_metrics: pd.DataFrame
) -> pd.DataFrame:
    """
    Join adjusted opponent defense strength per player row.

    Inputs:
        player_df with ['gw','team','opponent','home_away' in {'H','A'}]
        team_metrics with ['team','gw','team_xga_l5_home_adj','team_xga_l5_away_adj','team_xga_l5_all_adj']

    Rules:
        home_flag = 1 if home_away == 'H' else 0
        If home_flag == 1: use opponent's AWAY-adjusted metric for that gw; fallback to ALL-adjusted
        If home_flag == 0: use opponent's HOME-adjusted metric; fallback to ALL-adjusted

    Output:
        player_df with columns 'home_flag' (0/1) and 'opp_def_xga_l5_adj' (float)

    Notes:
        - Both inputs should already be filtered to past GWs to avoid leakage.
        - The function is robust to missing opponent metrics: it falls back to the ALL-adjusted value
            and finally leaves NaN if nothing is available.
    """

    # basic checks
    if player_df is None or player_df.empty:
        return player_df
    if team_metrics is None or team_metrics.empty:
        df = player_df.copy()
        df["home_flag"] = (df.get("home_away") == "H").astype(int)
        df["opp_def_xga_l5_adj"] = np.nan
        return df

    # required columns
    for col in ("gw", "team", "opponent", "home_away"):
        if col not in player_df.columns:
            raise ValueError(f"player_df must contain column '{col}'")
    req_tm = {
        "team",
        "gw",
        "team_xga_l5_home_adj",
        "team_xga_l5_away_adj",
        "team_xga_l5_all_adj",
    }
    if not req_tm.issubset(set(team_metrics.columns)):
        missing = req_tm - set(team_metrics.columns)
        raise ValueError(f"team_metrics missing columns: {missing}")

    df = player_df.copy()
    tm = team_metrics.copy()

    # compute home flag
    df["home_flag"] = (df["home_away"] == "H").astype(int)

    # prepare opponent metrics: merge on opponent (team_metrics.team) and gw
    tm_opp = tm.rename(
        columns={
            "team": "opponent",
            "team_xga_l5_home_adj": "opp_team_xga_l5_home_adj",
            "team_xga_l5_away_adj": "opp_team_xga_l5_away_adj",
            "team_xga_l5_all_adj": "opp_team_xga_l5_all_adj",
        }
    )

    merged = df.merge(
        tm_opp[
            [
                "opponent",
                "gw",
                "opp_team_xga_l5_home_adj",
                "opp_team_xga_l5_away_adj",
                "opp_team_xga_l5_all_adj",
            ]
        ],
        on=["opponent", "gw"],
        how="left",
    )

    # choose appropriate opponent metric depending on whether the player is at home
    # if player is home -> opponent plays away, so use opponent's AWAY-adjusted metric
    prefer_opp_away = merged["opp_team_xga_l5_away_adj"]
    prefer_opp_home = merged["opp_team_xga_l5_home_adj"]
    all_adj = merged["opp_team_xga_l5_all_adj"]

    # pick value: if home_flag==1 -> prefer_opp_away else prefer_opp_home; fallback to all_adj when necessary
    chosen = pd.Series(
        np.where(merged["home_flag"] == 1, prefer_opp_away, prefer_opp_home),
        index=merged.index,
    )
    # where chosen is null, fallback to all_adj
    chosen = chosen.where(~pd.isna(chosen), other=all_adj)

    # Additional fallback 1: per-GW league mean for the opponent-context (home/away from opponent view)
    # Build league-level mus from team_metrics (seasonal means per GW)
    mu_home = tm.groupby("gw")["team_xga_l5_home_adj"].mean()
    mu_away = tm.groupby("gw")["team_xga_l5_away_adj"].mean()
    mu_all = tm.groupby("gw")["team_xga_l5_all_adj"].mean()

    # map mus to merged rows
    merged["mu_opp_home"] = merged["gw"].map(mu_home)
    merged["mu_opp_away"] = merged["gw"].map(mu_away)
    merged["mu_opp_all"] = merged["gw"].map(mu_all)

    # global prior: season mean of the ALL-adjusted team metric
    global_prior = tm["team_xga_l5_all_adj"].mean()

    # where chosen is still NaN, use the mu for the opponent-context (if player is home -> opponent away)
    need_mu = chosen.isna()
    if need_mu.any():
        # select proper mu per row
        mu_choice = np.where(
            merged.loc[need_mu, "home_flag"] == 1,
            merged.loc[need_mu, "mu_opp_away"],
            merged.loc[need_mu, "mu_opp_home"],
        )
        mu_choice = pd.Series(mu_choice, index=merged.loc[need_mu].index)
        # where mu_choice is NaN, fallback to seasonal ALL mu
        mu_choice = mu_choice.where(
            ~pd.isna(mu_choice), other=merged.loc[need_mu, "mu_opp_all"]
        )
        # where still NaN, fallback to global_prior
        mu_choice = mu_choice.where(~pd.isna(mu_choice), other=global_prior)
        chosen.loc[need_mu] = mu_choice

    # final fallback: if any remaining NA (shouldn't happen), set to global_prior
    chosen = chosen.where(~pd.isna(chosen), other=global_prior)

    merged["opp_def_xga_l5_adj"] = chosen.astype(float)

    # final columns: keep original player_df columns plus home_flag and opp_def_xga_l5_adj
    out_cols = list(player_df.columns) + ["home_flag", "opp_def_xga_l5_adj"]
    out = merged[out_cols]
    return out


def save_team_def_metrics(df: pd.DataFrame, season: str, window: int, k: int) -> str:
    """Save team defensive metrics to a CSV and return the path.

    Files are written to out/team_metrics/team_metrics_{season}_l{window}_k{k}.csv
    """
    out_dir = Path("out") / "team_metrics"
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = f"team_metrics_{season}_l{window}_k{k}.csv"
    path = out_dir / fname
    # use data_io.save_table for consistent logging and directory handling
    # import data_io lazily to avoid package import issues when this module is
    # loaded via importlib from scripts.
    repo = pathlib.Path(__file__).resolve().parents[2]
    data_io_path = repo / "code" / "utils" / "data_io.py"
    spec = importlib.util.spec_from_file_location("data_io", str(data_io_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load data_io module spec from {data_io_path}")
    data_io = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(data_io)  # type: ignore[attr-defined]
    data_io.save_table(df, path)
    return str(path)


def load_team_def_metrics(season: str, window: int, k: int) -> pd.DataFrame | None:
    """Load saved team defensive metrics for the given parameters.

    Returns a DataFrame if the file exists, otherwise None.
    """
    path = Path("out") / "team_metrics" / f"team_metrics_{season}_l{window}_k{k}.csv"
    if not path.exists():
        return None
    try:
        df = pd.read_csv(path)
        return df
    except Exception:
        return None
