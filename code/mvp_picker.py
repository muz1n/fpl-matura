# mvp_picker.py
# Minimaler FPL-MVP: 3-GW-Baseline + Greedy-Team (3-4-3), Budget 100.0, max 3 pro Club.
# Liest: data/merged_gw*.csv  | Schreibt: Markdown auf stdout
import sys
import pandas as pd
import numpy as np
from collections import defaultdict, Counter

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "data/merged_gw2022-23.csv"
BUDGET = 100.0
FORMATION = {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3}
BENCH = {"GK": 1, "DEF": 1, "MID": 1, "FWD": 1}
MAX_PER_CLUB = 3

def first_col(df, *names, default=None):
    for n in names:
        if n in df.columns:
            return n
    return default

def map_position(x):
    if pd.isna(x): return None
    if isinstance(x, str):
        s = x.strip().upper()
        if s in {"GK","GKP"}: return "GK"
        if s in {"DEF","DEFENDER"}: return "DEF"
        if s in {"MID","MIDFIELDER","MDF"}: return "MID"
        if s in {"FWD","FORWARD","ST"}: return "FWD"
        if s=="G": return "GK"
        if s=="D": return "DEF"
        if s=="M": return "MID"
        if s=="F": return "FWD"
    try:
        v = int(float(x))
        return {1:"GK",2:"DEF",3:"MID",4:"FWD"}.get(v, None)
    except:
        return None

def to_price(row):
    for c in ["value", "now_cost", "price", "cost"]:
        if c in row and not pd.isna(row[c]):
            try:
                val = float(row[c])
                return round(val/10.0, 1) if val > 25 else round(val, 1)
            except:
                pass
    return np.nan

def team_name(row):
    for c in ["team_name","team","club","squad"]:
        if c in row and not pd.isna(row[c]):
            return str(row[c])
    return "NA"

def player_name(row):
    for c in ["name","web_name","player_name","second_name","first_name"]:
        if c in row and isinstance(row[c], str) and row[c].strip():
            return row[c]
    if "element" in row and not pd.isna(row["element"]):
        return f"ID_{int(row['element'])}"
    return "UNKNOWN"

def ensure_round(df):
    c = first_col(df, "round", "event", "gw", default=None)
    if c is None:
        if "kickoff_time" in df.columns:
            df = df.sort_values("kickoff_time")
            df["__ord__"] = np.arange(len(df))
            return df, "__ord__"
        df["__ord__"] = np.arange(len(df))
        return df, "__ord__"
    return df, c

def pct_rank(s):
    return s.rank(pct=True, method="average").fillna(0.0)

# ---------- Load & prepare ----------
df = pd.read_csv(CSV_PATH)
df, round_col = ensure_round(df)
pos_col = first_col(df, "position", "pos", "element_type", default=None)
name_col = first_col(df, "name","web_name","player_name","second_name","first_name", default=None)
team_col = first_col(df, "team_name","team","club","squad", default=None)

for needed in ["minutes","goals_scored","assists","creativity","influence","threat","clean_sheets"]:
    if needed not in df.columns:
        df[needed] = 0

df["__pos__"]  = df[pos_col].apply(map_position) if pos_col else None
df["__name__"] = df.apply(player_name, axis=1) if name_col is None else df[name_col].astype(str)
df["__team__"] = df.apply(team_name,  axis=1) if team_col is None else df[team_col].astype(str)
df["__price__"] = df.apply(to_price, axis=1)

# ungültige Zeilen raus
df = df[~df["__pos__"].isna()]

# ---------- last 3 GWs je Spieler ----------
df = df.sort_values(["__name__", round_col])

def agg_last3(g):
    g = g.tail(3)
    games = max(len(g), 1)
    return pd.Series({
        "minutes3": g["minutes"].mean(),
        "goals3": g["goals_scored"].mean(),
        "assists3": g["assists"].mean(),
        "creativity3": g["creativity"].mean(),
        "influence3": g["influence"].mean(),
        "threat3": g["threat"].mean(),
        "cs_rate3": g["clean_sheets"].sum() / games,
        "price": g["__price__"].iloc[-1],
        "team": g["__team__"].iloc[-1],
        "pos": g["__pos__"].iloc[-1],
        "name": g["__name__"].iloc[-1],
    })

agg = df.groupby("__name__", as_index=False).apply(agg_last3).reset_index(drop=True)

# fehlende Preise mit Minimalwerten je Position ersetzen
fallback_price = {"GK":4.0, "DEF":4.0, "MID":4.5, "FWD":4.5}
agg["price"] = agg.apply(lambda r: r["price"] if not pd.isna(r["price"]) else fallback_price.get(r["pos"], 4.5), axis=1)

# Perzentile + Score
for col in ["minutes3","goals3","assists3","creativity3","influence3","threat3","cs_rate3"]:
    agg[col+"_pct"] = pct_rank(agg[col].astype(float))

weights = {
    "base": {"goals3":3.0, "assists3":2.0, "threat3":1.2, "creativity3":1.0, "influence3":0.8, "minutes3":0.3},
    "cs_DEF_GK": 1.5, "cs_MID": 0.7, "cs_FWD": 0.3
}

def score_row(r):
    s = (weights["base"]["goals3"]      * r["goals3_pct"] +
         weights["base"]["assists3"]    * r["assists3_pct"] +
         weights["base"]["threat3"]     * r["threat3_pct"] +
         weights["base"]["creativity3"] * r["creativity3_pct"] +
         weights["base"]["influence3"]  * r["influence3_pct"] +
         weights["base"]["minutes3"]    * r["minutes3_pct"])
    if r["pos"] in ["GK","DEF"]:
        s += weights["cs_DEF_GK"] * r["cs_rate3_pct"]
    elif r["pos"]=="MID":
        s += weights["cs_MID"] * r["cs_rate3_pct"]
    else:
        s += weights["cs_FWD"] * r["cs_rate3_pct"]
    return s

agg["pred_score"] = agg.apply(score_row, axis=1)

# ---------- Greedy-Picker ----------
def minimal_cost_remaining(pool, need_slots, picked):
    rem = 0.0
    used = set(p["name"] for p in picked)
    for pos, k in need_slots.items():
        if k<=0: continue
        cand = pool[(~pool["name"].isin(used)) & (pool["pos"]==pos)].nsmallest(k, "price")
        rem += cand["price"].sum()
    return rem

def build_team(pool):
    pool = pool.copy().sort_values("pred_score", ascending=False).reset_index(drop=True)
    need = FORMATION.copy()
    picked = []
    club_count = Counter()
    budget = 0.0

    def can_add(r):
        if need[r["pos"]] <= 0: return False
        if club_count[r["team"]] >= MAX_PER_CLUB: return False
        min_rem = minimal_cost_remaining(pool, {p: (need[p] - (1 if p==r["pos"] else 0)) for p in need}, picked + [r])
        return (budget + r["price"] + min_rem) <= BUDGET + 1e-9

    for _, r in pool.iterrows():
        if all(v==0 for v in need.values()):
            break
        if can_add(r):
            picked.append({"name":r["name"],"team":r["team"],"pos":r["pos"],"price":r["price"],"score":r["pred_score"]})
            need[r["pos"]] -= 1
            club_count[r["team"]] += 1
            budget += r["price"]

    # Bench: günstig pro Position
    xi = picked
    xi_names = {p["name"] for p in xi}
    remaining = pool[~pool["name"].isin(xi_names)].copy()
    bench = []
    for pos, cnt in BENCH.items():
        for _ in range(cnt):
            for _, r in remaining[remaining["pos"]==pos].sort_values("price").iterrows():
                if r["name"] in xi_names or r["name"] in {b["name"] for b in bench}: continue
                club_cnt_full = Counter([p["team"] for p in xi] + [b["team"] for b in bench])
                if club_cnt_full[r["team"]] >= MAX_PER_CLUB: continue
                if budget + r["price"] <= BUDGET + 1e-9:
                    bench.append({"name":r["name"],"team":r["team"],"pos":r["pos"],"price":r["price"]})
                    budget += r["price"]
                    break
    return xi, bench, budget

pool = agg.rename(columns={"price":"price","pos":"pos","team":"team","name":"name"})
xi, bench, total_cost = build_team(pool)

# Captain / Vice
xi_sorted = sorted(xi, key=lambda x: x["score"], reverse=True)
captain = xi_sorted[0]["name"] if xi_sorted else ""
vice = xi_sorted[1]["name"] if len(xi_sorted)>1 else ""

def sum_score(players): return sum(p.get("score",0) for p in players)

# ---------- Markdown ----------
print("# GW1 – Empfehlung (MVP)\n")
print("## Start-XI (3-4-3)")
order = ["GK","DEF","DEF","DEF","MID","MID","MID","MID","FWD","FWD","FWD"]
bypos = defaultdict(list)
for p in xi_sorted:
    bypos[p["pos"]].append(p)
used = []
for need_pos in order:
    if bypos[need_pos]:
        p = bypos[need_pos].pop(0)
        used.append(p)
        print(f"- {need_pos}: {p['name']} ({p['team']}) £{p['price']:.1f}")
    else:
        print(f"- {need_pos}: —")

print(f"\n**Captain:** {captain}")
print(f"**Vice-Captain:** {vice}\n")

print("## Bank")
for pos in ["GK","DEF","MID","FWD"]:
    cand = [b for b in bench if b["pos"]==pos]
    if cand:
        b = sorted(cand, key=lambda x: x["price"])[0]
        print(f"- {pos}: {b['name']} ({b['team']}) £{b['price']:.1f}")
    else:
        print(f"- {pos}: —")

print(f"\n**Gesamtkosten:** £{total_cost:.1f}")
print(f"**Summe prognostizierte Punkte (XI, relativer Score):** {sum_score(used):.3f}\n")

print("## Kurzbegründung")
print("- Prognose = Durchschnitt der letzten 3 Einsätze je Spieler, in Perzentile skaliert und einfach gewichtet.")
print("- Auswahl = Greedy unter Budget 100.0, max. 3 pro Club, Formation 3-4-3; Bench = günstig pro Position.")
print("- MVP-Limiten: keine Gegnerstärke/Verletzungen; später Daten der neuen Saison und bessere Optimierung.")
