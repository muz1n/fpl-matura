# cold_start_offline.py
# Offline-GW1: Score aus Preis/Ownership-Perzentilen + Vorjahresleistung (per90 + ICT), Formation 3-5-2
# Eingabe standard: data/cleaned_players_2025-26.csv  | Ausgabe: Markdown auf stdout

import sys, math
import pandas as pd
import numpy as np
from collections import defaultdict, Counter

# ---------- Konfiguration ----------
CSV_PATH_DEFAULT = "data/cleaned_players_2025-26.csv"
BUDGET = 100.0
FORMATION = {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2}   # Experten-Trend GW1
BENCH     = {"GK": 1, "DEF": 1, "MID": 1, "FWD": 1}
MAX_PER_CLUB = 3

# ---------- Hilfsfunktionen ----------
def robust_read_csv(path):
    tries = [
        {"engine":"c"},
        {"sep":None},  # auto sniff (python engine)
        {"sep":";", "engine":"python"},
        {"engine":"python", "on_bad_lines":"skip"},
        {"engine":"python", "on_bad_lines":"skip", "encoding":"utf-8", "encoding_errors":"ignore"},
    ]
    last = None
    for kw in tries:
        try:
            return pd.read_csv(path, **kw)
        except Exception as e:
            last = e
    raise last

def map_pos(v):
    try:
        v = int(v)
        return {1:"GK", 2:"DEF", 3:"MID", 4:"FWD"}.get(v, None)
    except:
        s = str(v).strip().upper()
        return {"GK":"GK","GKP":"GK","DEF":"DEF","D":"DEF","MID":"MID","M":"MID","FWD":"FWD","ST":"FWD","F":"FWD"}.get(s, None)

def pct_rank(s):
    return s.rank(pct=True, method="average").fillna(0.0)

def to_price(series):
    x = pd.to_numeric(series, errors="coerce")
    # FPL now_cost ist meist in Zehnteln (z.B. 49 -> 4.9)
    return np.where(x>25, x/10.0, x)

def to_float(series):
    return pd.to_numeric(series, errors="coerce")

def per90(col, minutes):
    m = minutes.copy()
    m = m.where(m>0, np.nan)
    return col / (m/90.0)

# ---------- Daten laden ----------
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else CSV_PATH_DEFAULT
df = robust_read_csv(CSV_PATH)

# Spaltenzuordnung (tolerant)
name_col = next((c for c in ["web_name","second_name","name","player_name","first_name"] if c in df.columns), None)
team_col = next((c for c in ["team_name","team","club","squad","team_short"] if c in df.columns), None)
pos_col  = next((c for c in ["element_type","position","pos"] if c in df.columns), None)
price_col= next((c for c in ["now_cost","price","value","cost"] if c in df.columns), None)
own_col  = next((c for c in ["selected_by_percent","selected_by","ownership"] if c in df.columns), None)

# Pflichtfelder prüfen (bis auf team_col, das kann fehlen)
missing = [x for x in [name_col,pos_col,price_col] if x is None]
if missing:
    raise ValueError("CSV fehlt eine der Pflichtspalten: name/web_name, element_type/position, now_cost/price/value")

# Basisfelder
pool = pd.DataFrame()
pool["name"] = df[name_col].astype(str)

# Team optional
HAS_TEAM = team_col is not None
pool["team"] = (df[team_col].astype(str) if HAS_TEAM else "NA")

# Position mappen
pool["pos"] = df[pos_col].apply(map_pos)
pool = pool[~pool["pos"].isna()]

# Preis in Mio
pool["price"] = to_price(df[price_col]).astype(float)
pool = pool[pool["price"]>0]

# Ownership (Prozent) optional
if own_col:
    own = df[own_col].astype(str).str.replace("%","",regex=False)
    pool["own"] = pd.to_numeric(own, errors="coerce").fillna(0.0)
else:
    pool["own"] = 0.0

# Vorjahres-Stats (falls vorhanden)
mins   = to_float(df["minutes"])           if "minutes" in df.columns else pd.Series(0, index=pool.index, dtype=float)
goals  = to_float(df["goals_scored"])      if "goals_scored" in df.columns else pd.Series(0, index=pool.index, dtype=float)
assists= to_float(df["assists"])           if "assists" in df.columns else pd.Series(0, index=pool.index, dtype=float)
cs     = to_float(df["clean_sheets"])      if "clean_sheets" in df.columns else pd.Series(0, index=pool.index, dtype=float)
gc     = to_float(df["goals_conceded"])    if "goals_conceded" in df.columns else pd.Series(0, index=pool.index, dtype=float)
saves  = to_float(df["saves"])             if "saves" in df.columns else pd.Series(0, index=pool.index, dtype=float)

influence = to_float(df["influence"])      if "influence" in df.columns else pd.Series(0, index=pool.index, dtype=float)
creativity= to_float(df["creativity"])     if "creativity" in df.columns else pd.Series(0, index=pool.index, dtype=float)
threat    = to_float(df["threat"])         if "threat" in df.columns else pd.Series(0, index=pool.index, dtype=float)
ict      = to_float(df["ict_index"])       if "ict_index" in df.columns else pd.Series(0, index=pool.index, dtype=float)

# Per90 berechnen (robust gegen 0 Minuten)
g90  = per90(goals, mins).fillna(0.0)
a90  = per90(assists, mins).fillna(0.0)
cs90 = per90(cs, mins).fillna(0.0)
gc90 = per90(gc, mins).fillna(0.0)
sv90 = per90(saves, mins).fillna(0.0)

# Perzentile bilden
pool["price_pct"] = pct_rank(pool["price"])
pool["own_pct"]   = pct_rank(pool["own"])
pool["mins_pct"]  = pct_rank(mins)

pool["g90_pct"]   = pct_rank(g90)
pool["a90_pct"]   = pct_rank(a90)
pool["cs90_pct"]  = pct_rank(cs90)
pool["gc90_pct"]  = pct_rank(gc90)   # wird negativ gewichtet
pool["sv90_pct"]  = pct_rank(sv90)

pool["thr_pct"]   = pct_rank(threat)
pool["cre_pct"]   = pct_rank(creativity)
pool["inf_pct"]   = pct_rank(influence)
pool["ict_pct"]   = pct_rank(ict)

# ---------- Scoring (positionsspezifisch, transparent) ----------
# Grundidee:
# - MID/FWD: offensive Returns + ICT + Einsatz + (leicht) Preis & Ownership
# - DEF: Clean Sheets wichtiger, GC als kleine Strafe, bisschen Threat (set pieces / wing-backs)
# - GK: Clean Sheets + Saves, wenig Ownership/Preis-Effekt
def score_row(r):
    pos = r["pos"]
    if pos == "MID":
        return (3.0*r["g90_pct"] + 2.0*r["a90_pct"] + 1.2*r["thr_pct"] + 1.0*r["cre_pct"] +
                0.8*r["inf_pct"] + 0.3*r["mins_pct"] + 0.4*r["own_pct"] + 0.3*r["price_pct"])
    if pos == "FWD":
        return (3.2*r["g90_pct"] + 1.8*r["a90_pct"] + 1.0*r["thr_pct"] +
                0.6*r["inf_pct"] + 0.3*r["mins_pct"] + 0.3*r["own_pct"] + 0.3*r["price_pct"])
    if pos == "DEF":
        return (1.5*r["cs90_pct"] - 0.2*r["gc90_pct"] + 0.6*r["thr_pct"] +
                0.4*r["mins_pct"] + 0.3*r["own_pct"] + 0.3*r["price_pct"])
    if pos == "GK":
        return (1.8*r["cs90_pct"] + 0.4*r["sv90_pct"] - 0.3*r["gc90_pct"] +
                0.4*r["mins_pct"] + 0.3*r["own_pct"] + 0.3*r["price_pct"])
    return 0.0

pool["pred_score"] = pool.apply(score_row, axis=1)

# ---------- Team-Auswahl (Greedy) ----------
def minimal_cost_remaining(pool_sorted, need, picked, enforce_club):
    rem = 0.0
    used = {p["name"] for p in picked}
    for pos, k in need.items():
        if k <= 0: continue
        cand = pool_sorted[(~pool_sorted["name"].isin(used)) & (pool_sorted["pos"]==pos)]
        if enforce_club:
            # nimm die billigsten k, die 3-pro-Klub nicht verletzen (heuristisch)
            tmp = []
            club_count = Counter([p["team"] for p in picked])
            for _, r in cand.sort_values("price").iterrows():
                if club_count[r["team"]] >= MAX_PER_CLUB: continue
                tmp.append(r["price"])
                club_count[r["team"]] += 1
                if len(tmp) == k: break
            rem += sum(tmp)
        else:
            rem += cand["price"].nsmallest(k).sum()
    return rem

def build_team(pool_df):
    enforce_club = HAS_TEAM
    pool_sorted = pool_df.sort_values("pred_score", ascending=False).reset_index(drop=True)
    need = FORMATION.copy()
    picked = []
    budget = 0.0
    club_count = Counter()

    def can_add(r):
        if need[r["pos"]] <= 0: return False
        if enforce_club and club_count[r["team"]] >= MAX_PER_CLUB: return False
        # Budget-Feasibility: aktueller + r + minimal verbleibend <= Budget
        min_rem = minimal_cost_remaining(pool_sorted, {p:(need[p] - (1 if p==r["pos"] else 0)) for p in need}, picked + [r], enforce_club)
        return (budget + r["price"] + min_rem) <= BUDGET + 1e-9

    # XI wählen
    for _, r in pool_sorted.iterrows():
        if all(v==0 for v in need.values()):
            break
        if can_add(r):
            picked.append({"name":r["name"], "team":r["team"], "pos":r["pos"], "price":float(r["price"]), "score":float(r["pred_score"])})
            need[r["pos"]] -= 1
            budget += float(r["price"])
            if enforce_club:
                club_count[r["team"]] += 1

    # Bench auffüllen: günstigster je Position (unter Budget und Klublimit falls enforce_club)
    xi = picked
    xi_names = {p["name"] for p in xi}
    remaining = pool_sorted[~pool_sorted["name"].isin(xi_names)].copy()
    bench = []
    for pos, cnt in BENCH.items():
        for _ in range(cnt):
            for _, r in remaining[remaining["pos"]==pos].sort_values("price").iterrows():
                if r["name"] in xi_names or r["name"] in {b["name"] for b in bench}: continue
                if enforce_club and Counter([p["team"] for p in xi]+[b["team"] for b in bench])[r["team"]] >= MAX_PER_CLUB:
                    continue
                if budget + float(r["price"]) <= BUDGET + 1e-9:
                    bench.append({"name":r["name"], "team":r["team"], "pos":r["pos"], "price":float(r["price"]), "score":float(r["pred_score"])})
                    budget += float(r["price"])
                    break

    # Captain / Vice
    xi_sorted = sorted(xi, key=lambda x: x["score"], reverse=True)
    captain = xi_sorted[0]["name"] if xi_sorted else ""
    vice    = xi_sorted[1]["name"] if len(xi_sorted)>1 else ""
    return xi, bench, budget, captain, vice, enforce_club, club_count

# ---------- Ausführen ----------
xi, bench, total_cost, captain, vice, enforce_club, club_count = build_team(pool)

# ---------- Markdown-Output ----------
print("# GW1 – Empfehlung (Cold Start offline, 3-5-2)\n")
print("## Start-XI (3-5-2)")
order = ["GK","DEF","DEF","DEF","MID","MID","MID","MID","MID","FWD","FWD"]
bypos = defaultdict(list)
for p in sorted(xi, key=lambda x: x["score"], reverse=True):
    bypos[p["pos"]].append(p)
used = []
for need_pos in order:
    if bypos[need_pos]:
        p = bypos[need_pos].pop(0)
        used.append(p)
        team_disp = p["team"] if enforce_club else "-"
        print(f"- {need_pos}: {p['name']} ({team_disp}) £{p['price']:.1f}")
    else:
        print(f"- {need_pos}: —")

print(f"\n**Captain:** {captain}")
print(f"**Vice-Captain:** {vice}\n")

print("## Bank")
for pos in ["GK","DEF","MID","FWD"]:
    cand = [b for b in bench if b["pos"]==pos]
    if cand:
        b = sorted(cand, key=lambda x: x["price"])[0]
        team_disp = b["team"] if enforce_club else "-"
        print(f"- {pos}: {b['name']} ({team_disp}) £{b['price']:.1f}")
    else:
        print(f"- {pos}: —")

print(f"\n**Gesamtkosten:** £{total_cost:.1f}")
rel_sum = sum(p["score"] for p in used)
print(f"**Summe prognostizierte Punkte (XI, relativer Score):** {rel_sum:.3f}\n")

print("## Kurzbegründung")
print("- Score = Preis- und Ownership-Perzentile + Vorjahresleistung (per90) + ICT (positionsgewichtet).")
print("- Auswahl = Greedy unter Budget 100.0, Formation 3-5-2, Bank = günstig pro Position.")
if enforce_club:
    print(f"- Klublimit: max. 3 pro Klub wurde automatisch erzwungen.")
else:
    print("- **Hinweis:** CSV hatte keine Teamspalte → max. 3 pro Klub konnte **nicht** erzwungen werden. Bitte beim Übernehmen kurz prüfen.")

# Optional: Übersicht Klubverteilung (nur wenn erzwungen)
if enforce_club:
    counts = Counter([p["team"] for p in xi] + [b["team"] for b in bench])
    crowded = [f"{t}: {c}" for t,c in counts.items() if c>0]
    if crowded:
        print("\n## Klubverteilung im 15er-Kader")
        print(", ".join(sorted(crowded)))
