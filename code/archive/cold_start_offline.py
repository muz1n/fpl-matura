# cold_start_offline.py
# Offline-GW1: Hybrid-Score (Preis/Ownership-Perzentile + Vorjahresleistung per90 + ICT)
# + Nailedness-Filter (Min/Own/Preis) + Anti-4.0-Start-Regeln + FORCE-FILL (Notfall)
# Formation 3-5-2, volle Bank, Budget < 100, max. 3 pro Klub (wenn Teamspalte vorhanden)

import sys
import pandas as pd
import numpy as np
from collections import defaultdict, Counter

# ----------------- Konfiguration -----------------
CSV_PATH_DEFAULT = "data/cleaned_players_2025-26.csv"
BUDGET = 100.0
FORMATION = {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2}
BENCH = {"GK": 1, "DEF": 1, "MID": 1, "FWD": 1}
MAX_PER_CLUB = 3

# Bank sicherstellen
BENCH_MIN = {"GK": 4.0, "DEF": 4.0, "MID": 4.5, "FWD": 4.5}
BENCH_CUSHION = 1.0  # lässt i.d.R. <100 übrig

# „Sicher starten“-Regeln
MIN_NAILED_PCT = 0.25  # 0..1 (aus Minutes/Ownership/Preis)
START_GK_MIN_PRICE = 4.5  # kein 4.0-GK als Starter (falls Alternativen existieren)
MAX_CHEAP_DEF_IN_XI = 1  # max. x × £4.0-DEF in der XI


# ----------------- Utils -----------------
def robust_read_csv(path):
    tries = [
        {"engine": "c"},
        {"sep": None},
        {"sep": ";", "engine": "python"},
        {"engine": "python", "on_bad_lines": "skip"},
        {
            "engine": "python",
            "on_bad_lines": "skip",
            "encoding": "utf-8",
            "encoding_errors": "ignore",
        },
    ]
    last = Exception(f"Failed to read CSV: {path}")
    for kw in tries:
        try:
            return pd.read_csv(path, **kw)
        except Exception as e:
            last = e
    raise last


def map_pos(v):
    try:
        v = int(v)
        return {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}.get(v)
    except Exception:
        s = str(v).strip().upper()
        return {
            "GK": "GK",
            "GKP": "GK",
            "DEF": "DEF",
            "D": "DEF",
            "MID": "MID",
            "M": "MID",
            "FWD": "FWD",
            "ST": "FWD",
            "F": "FWD",
        }.get(s)


def pct_rank(s):
    return s.rank(pct=True, method="average").fillna(0.0)


def to_price(series):
    x = pd.to_numeric(series, errors="coerce")
    return np.where(x > 25, x / 10.0, x)  # FPL now_cost in Zehnteln


def to_float(series):
    return pd.to_numeric(series, errors="coerce")


def per90(col, minutes):
    m = minutes.copy()
    m = m.where(m > 0, np.nan)
    return col / (m / 90.0)


def bench_reserve_cost():
    base = (
        BENCH.get("GK", 0) * BENCH_MIN["GK"]
        + BENCH.get("DEF", 0) * BENCH_MIN["DEF"]
        + BENCH.get("MID", 0) * BENCH_MIN["MID"]
        + BENCH.get("FWD", 0) * BENCH_MIN["FWD"]
    )
    return float(base + BENCH_CUSHION)


# ----------------- Daten laden -----------------
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else CSV_PATH_DEFAULT
df = robust_read_csv(CSV_PATH)

name_col = next(
    (
        c
        for c in ["web_name", "second_name", "name", "player_name", "first_name"]
        if c in df.columns
    ),
    None,
)
team_col = next(
    (
        c
        for c in ["team_name", "team", "club", "squad", "team_short"]
        if c in df.columns
    ),
    None,
)
pos_col = next(
    (c for c in ["element_type", "position", "pos"] if c in df.columns), None
)
price_col = next(
    (c for c in ["now_cost", "price", "value", "cost"] if c in df.columns), None
)
own_col = next(
    (c for c in ["selected_by_percent", "selected_by", "ownership"] if c in df.columns),
    None,
)

if not all([name_col, pos_col, price_col]):
    raise ValueError(
        "CSV braucht name/web_name, element_type/position, now_cost/price/value"
    )

pool = pd.DataFrame()
pool["name"] = df[name_col].astype(str)
HAS_TEAM = team_col is not None
pool["team"] = df[team_col].astype(str) if HAS_TEAM else "NA"
pool["pos"] = df[pos_col].apply(map_pos)
pool = pool[~pool["pos"].isna()]
pool["price"] = to_price(df[price_col]).astype(float)
pool = pool[pool["price"] > 0]
if own_col:
    own = df[own_col].astype(str).str.replace("%", "", regex=False)
    pool["own"] = pd.to_numeric(own, errors="coerce").fillna(0.0)
else:
    pool["own"] = 0.0

mins = (
    to_float(df["minutes"])
    if "minutes" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
goals = (
    to_float(df["goals_scored"])
    if "goals_scored" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
assists = (
    to_float(df["assists"])
    if "assists" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
cs = (
    to_float(df["clean_sheets"])
    if "clean_sheets" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
gc = (
    to_float(df["goals_conceded"])
    if "goals_conceded" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
saves = (
    to_float(df["saves"])
    if "saves" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
thr = (
    to_float(df["threat"])
    if "threat" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
cre = (
    to_float(df["creativity"])
    if "creativity" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
inf_ = (
    to_float(df["influence"])
    if "influence" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)
ict = (
    to_float(df["ict_index"])
    if "ict_index" in df.columns
    else pd.Series(0, index=pool.index, dtype=float)
)

g90, a90 = per90(goals, mins).fillna(0.0), per90(assists, mins).fillna(0.0)
cs90, gc90, sv90 = (
    per90(cs, mins).fillna(0.0),
    per90(gc, mins).fillna(0.0),
    per90(saves, mins).fillna(0.0),
)

# Features (Perzentile)
pool["price_pct"] = pct_rank(pool["price"])
pool["own_pct"] = pct_rank(pool["own"])
pool["mins_pct"] = pct_rank(mins)
pool["g90_pct"] = pct_rank(g90)
pool["a90_pct"] = pct_rank(a90)
pool["cs90_pct"] = pct_rank(cs90)
pool["gc90_pct"] = pct_rank(gc90)
pool["sv90_pct"] = pct_rank(sv90)
pool["thr_pct"] = pct_rank(thr)
pool["cre_pct"] = pct_rank(cre)
pool["inf_pct"] = pct_rank(inf_)
pool["ict_pct"] = pct_rank(ict)

# Nailedness (0..1)
pool["nailed_pct"] = (
    0.5 * pool["mins_pct"] + 0.3 * pool["own_pct"] + 0.2 * pool["price_pct"]
).clip(0, 1)


# Score je Position
def score_row(r):
    if r["pos"] == "MID":
        return (
            3.0 * r["g90_pct"]
            + 2.0 * r["a90_pct"]
            + 1.2 * r["thr_pct"]
            + 1.0 * r["cre_pct"]
            + 0.8 * r["inf_pct"]
            + 0.3 * r["mins_pct"]
            + 0.4 * r["own_pct"]
            + 0.3 * r["price_pct"]
        )
    if r["pos"] == "FWD":
        return (
            3.2 * r["g90_pct"]
            + 1.8 * r["a90_pct"]
            + 1.0 * r["thr_pct"]
            + 0.6 * r["inf_pct"]
            + 0.3 * r["mins_pct"]
            + 0.3 * r["own_pct"]
            + 0.3 * r["price_pct"]
        )
    if r["pos"] == "DEF":
        return (
            1.5 * r["cs90_pct"]
            - 0.2 * r["gc90_pct"]
            + 0.6 * r["thr_pct"]
            + 0.4 * r["mins_pct"]
            + 0.3 * r["own_pct"]
            + 0.3 * r["price_pct"]
        )
    if r["pos"] == "GK":
        return (
            1.8 * r["cs90_pct"]
            + 0.4 * r["sv90_pct"]
            - 0.3 * r["gc90_pct"]
            + 0.4 * r["mins_pct"]
            + 0.3 * r["own_pct"]
            + 0.3 * r["price_pct"]
        )
    return 0.0


pool["pred_score"] = pool.apply(score_row, axis=1)


# ----------------- Team-Auswahl -----------------
def minimal_cost_for(need, used_names, club_count, enforce_club, sorted_pool):
    rem = 0.0
    for pos, k in need.items():
        if k <= 0:
            continue
        cand = sorted_pool[
            (sorted_pool["pos"] == pos) & (~sorted_pool["name"].isin(used_names))
        ]
        if enforce_club and HAS_TEAM:
            tmp = []
            cc = club_count.copy()
            for _, r in cand.sort_values("price").iterrows():
                if cc[r["team"]] >= MAX_PER_CLUB:
                    continue
                tmp.append(float(r["price"]))
                cc[r["team"]] += 1
                if len(tmp) == k:
                    break
            rem += sum(tmp)
        else:
            rem += cand["price"].nsmallest(k).sum()
    return float(rem)


def build_team(pool_df):
    enforce_club = (pool_df["team"].nunique() > 1) and HAS_TEAM
    sorted_pool = pool_df.sort_values("pred_score", ascending=False).reset_index(
        drop=True
    )
    need = FORMATION.copy()
    picked = []
    budget = 0.0
    club_count = Counter()
    effective_budget = max(0.0, BUDGET - bench_reserve_cost())
    cheap_def_in_xi = 0

    def violates_start_rules(r):
        if r["nailed_pct"] < MIN_NAILED_PCT:
            return True
        if r["pos"] == "GK" and r["price"] < START_GK_MIN_PRICE:
            return True
        if (
            r["pos"] == "DEF"
            and r["price"] <= 4.0
            and cheap_def_in_xi >= MAX_CHEAP_DEF_IN_XI
        ):
            return True
        return False

    # Pick XI
    for pos in [
        "GK",
        "DEF",
        "DEF",
        "DEF",
        "MID",
        "MID",
        "MID",
        "MID",
        "MID",
        "FWD",
        "FWD",
    ]:
        if need.get(pos, 0) <= 0:
            continue
        for _, r in sorted_pool[sorted_pool["pos"] == pos].iterrows():
            if r["name"] in {p["name"] for p in picked}:
                continue
            if violates_start_rules(r):
                continue
            if enforce_club and club_count[r["team"]] >= MAX_PER_CLUB:
                continue
            need_after = need.copy()
            need_after[pos] -= 1
            used_names = {p["name"] for p in picked} | {r["name"]}
            min_rem = minimal_cost_for(
                need_after, used_names, club_count, enforce_club, sorted_pool
            )
            if (budget + float(r["price"]) + min_rem) > (effective_budget + 1e-9):
                continue
            picked.append(
                {
                    "name": r["name"],
                    "team": r["team"],
                    "pos": pos,
                    "price": float(r["price"]),
                    "score": float(r["pred_score"]),
                }
            )
            need[pos] -= 1
            budget += float(r["price"])
            if enforce_club:
                club_count[r["team"]] += 1
            if r["pos"] == "DEF" and r["price"] <= 4.0:
                cheap_def_in_xi += 1
            break

    # If not all positions filled, relax start rules
    if not all(v == 0 for v in need.values()):
        for pos in [
            "GK",
            "DEF",
            "DEF",
            "DEF",
            "MID",
            "MID",
            "MID",
            "MID",
            "MID",
            "FWD",
            "FWD",
        ]:
            if need.get(pos, 0) <= 0:
                continue
            for _, r in sorted_pool[sorted_pool["pos"] == pos].iterrows():
                if r["name"] in {p["name"] for p in picked}:
                    continue
                if enforce_club and club_count[r["team"]] >= MAX_PER_CLUB:
                    continue
                need_after = need.copy()
                need_after[pos] -= 1
                used_names = {p["name"] for p in picked} | {r["name"]}
                min_rem = minimal_cost_for(
                    need_after, used_names, club_count, enforce_club, sorted_pool
                )
                if (budget + float(r["price"]) + min_rem) > (effective_budget + 1e-9):
                    continue
                picked.append(
                    {
                        "name": r["name"],
                        "team": r["team"],
                        "pos": pos,
                        "price": float(r["price"]),
                        "score": float(r["pred_score"]),
                    }
                )
                need[pos] -= 1
                budget += float(r["price"])
                if enforce_club:
                    club_count[r["team"]] += 1
                if r["pos"] == "DEF" and r["price"] <= 4.0:
                    cheap_def_in_xi += 1
                break

    xi = picked.copy()
    xi_names = {p["name"] for p in xi}
    # Prepare remaining pool for bench selection
    remaining = sorted_pool[~sorted_pool["name"].isin(xi_names)].copy()
    bench = []
    for pos, cnt in BENCH.items():
        for _ in range(cnt):
            cand = remaining[
                (remaining["pos"] == pos) & (remaining["nailed_pct"] >= MIN_NAILED_PCT)
            ].sort_values("price")
            if cand.empty:
                cand = remaining[remaining["pos"] == pos].sort_values("price")
            chosen = None
            for _, r in cand.iterrows():
                if r["name"] in {b["name"] for b in bench}:
                    continue
                if (
                    enforce_club
                    and Counter([p["team"] for p in xi] + [b["team"] for b in bench])[
                        r["team"]
                    ]
                    >= MAX_PER_CLUB
                ):
                    continue
                if (budget + float(r["price"])) <= (BUDGET + 1e-9):
                    chosen = r
                    break
            if chosen is not None:
                bench.append(
                    {
                        "name": chosen["name"],
                        "team": chosen["team"],
                        "pos": chosen["pos"],
                        "price": float(chosen["price"]),
                        "score": float(chosen["pred_score"]),
                    }
                )
                budget += float(chosen["price"])
    xi_sorted = sorted(xi, key=lambda x: x["score"], reverse=True)
    captain = xi_sorted[0]["name"] if xi_sorted else ""
    vice = xi_sorted[1]["name"] if len(xi_sorted) > 1 else ""
    return xi, bench, budget, captain, vice, enforce_club


# ----------------- Run -----------------
xi, bench, total_cost, captain, vice, enforce_club = build_team(pool)

# ----------------- Ausgabe -----------------
print("# GW1 – Empfehlung (Cold Start offline, 3-5-2)\n")
print("## Start-XI (3-5-2)")
order = ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"]
bypos = defaultdict(list)
for p in sorted(xi, key=lambda x: x["score"], reverse=True):
    bypos[p["pos"]].append(p)
used = []
for need_pos in order:
    if bypos[need_pos]:
        p = bypos[need_pos].pop(0)
        used.append(p)
        print(
            f"- {need_pos}: {p['name']} ({p['team'] if enforce_club else '-'}) £{p['price']:.1f}"
        )
    else:
        print(f"- {need_pos}: —")

print(f"\n**Captain:** {captain}")
print(f"**Vice-Captain:** {vice}\n")

print("## Bank")
for pos in ["GK", "DEF", "MID", "FWD"]:
    cand = [b for b in bench if b["pos"] == pos]
    if cand:
        b = sorted(cand, key=lambda x: x["price"])[0]
        print(
            f"- {pos}: {b['name']} ({b['team'] if enforce_club else '-'}) £{b['price']:.1f}"
        )
    else:
        print(f"- {pos}: —")

print(f"\n**Gesamtkosten:** £{total_cost:.1f}")
rel_sum = sum(p["score"] for p in used)
print(f"**Summe prognostizierte Punkte (XI, relativer Score):** {rel_sum:.3f}\n")

print("## Kurzbegründung")
print(
    "- Score = Preis/Ownership-Perzentile + Vorjahresleistung (per90) + ICT (positionsgewichtet)."
)
print(
    f"- Start-Regeln (strikt, mit Notfall-Relax): Nailedness >= {MIN_NAILED_PCT:.2f}, kein GK < £{START_GK_MIN_PRICE:.1f}, max. {MAX_CHEAP_DEF_IN_XI} x £4.0-DEF in der XI."
)
print(
    "- Auswahl = Greedy unter Budget 100.0, Formation 3-5-2, Bank = günstig & möglichst nailed."
)
print(
    "- Klublimit:",
    (
        "max. 3 pro Klub automatisch erzwungen."
        if enforce_club
        else "Teamspalte fehlte → Klublimit nicht erzwungen; beim Eintragen kurz prüfen."
    ),
)
