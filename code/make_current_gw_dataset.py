# code/make_current_gw_dataset.py
# Erzeugt:
# - data/cleaned_players_2025-26_team.csv
# - data/current/merged_gw_like_gw{GW}.csv

import argparse
from pathlib import Path
import pandas as pd
import requests

BOOTSTRAP = "https://fantasy.premierleague.com/api/bootstrap-static/"
FIXTURES = "https://fantasy.premierleague.com/api/fixtures/?event={gw}"

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CURR_DIR = DATA_DIR / "current"
CURR_DIR.mkdir(parents=True, exist_ok=True)

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def get(url):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


def build_catalog(boot):
    el = pd.DataFrame(boot["elements"])
    teams = pd.DataFrame(boot["teams"])[["id", "name", "short_name"]].rename(
        columns={"id": "team_id", "name": "team_name", "short_name": "team_short"}
    )
    keep = [
        "id",
        "web_name",
        "first_name",
        "second_name",
        "element_type",
        "team",
        "now_cost",
        "selected_by_percent",
        "status",
        "chance_of_playing_next_round",
        "form",
        "points_per_game",
        "influence",
        "creativity",
        "threat",
        "ict_index",
    ]
    df = el[keep].copy().rename(columns={"team": "team_id"})
    # numerisch casten
    num = [
        "now_cost",
        "selected_by_percent",
        "chance_of_playing_next_round",
        "form",
        "points_per_game",
        "influence",
        "creativity",
        "threat",
        "ict_index",
    ]
    for c in num:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["now_cost"] = df["now_cost"] / 10.0  # FPL gibt *10
    df["position"] = df["element_type"].map(POS)
    df = df.merge(teams, on="team_id", how="left")
    return df


def make_opp_table(fx, teams):
    rows = []
    for _, r in fx.iterrows():
        rows.append(
            {
                "team_id": r["team_h"],
                "opp_team_id": r["team_a"],
                "is_home": True,
                "fdr": r.get("team_h_difficulty"),
            }
        )
        rows.append(
            {
                "team_id": r["team_a"],
                "opp_team_id": r["team_h"],
                "is_home": False,
                "fdr": r.get("team_a_difficulty"),
            }
        )
    opp = pd.DataFrame(rows)
    opp = opp.merge(teams[["team_id", "team_short"]], on="team_id", how="left").merge(
        teams[["team_id", "team_short"]].rename(
            columns={"team_id": "opp_team_id", "team_short": "opp_team_short"}
        ),
        on="opp_team_id",
        how="left",
    )
    return opp


def main(gw):
    boot = get(BOOTSTRAP)
    catalog = build_catalog(boot)
    teams = catalog[["team_id", "team_short", "team_name"]].drop_duplicates()

    # Katalog schreiben
    catalog_out = DATA_DIR / "cleaned_players_2025-26_team.csv"
    catalog[
        [
            "id",
            "web_name",
            "first_name",
            "second_name",
            "element_type",
            "position",
            "team_id",
            "team_name",
            "team_short",
            "now_cost",
            "status",
            "chance_of_playing_next_round",
            "selected_by_percent",
            "form",
            "points_per_game",
            "influence",
            "creativity",
            "threat",
            "ict_index",
        ]
    ].to_csv(catalog_out, index=False)

    # Fixtures holen
    fx = pd.DataFrame(get(FIXTURES.format(gw=gw)))
    if fx.empty:
        raise SystemExit(f"Keine Fixtures für GW {gw} gefunden.")
    opp = make_opp_table(fx, teams)
    opp = opp.drop(columns=["team_short"], errors="ignore")  # vermeidet team_short_x/y

    merged = catalog.merge(opp, on="team_id", how="left")
    merged["gw"] = gw
    merged_out = CURR_DIR / f"merged_gw_like_gw{gw}.csv"
    merged[
        [
            "id",
            "web_name",
            "position",
            "team_id",
            "team_name",
            "team_short",
            "now_cost",
            "selected_by_percent",
            "status",
            "chance_of_playing_next_round",
            "form",
            "points_per_game",
            "influence",
            "creativity",
            "threat",
            "ict_index",
            "opp_team_id",
            "opp_team_short",
            "is_home",
            "fdr",
            "gw",
        ]
    ].to_csv(merged_out, index=False)

    print(f"OK: {catalog_out}")
    print(f"OK: {merged_out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--gw", type=int, required=True)
    args = ap.parse_args()
    main(args.gw)
