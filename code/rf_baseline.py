# code/rf_baseline.py
# Trainiert eine RF-Baseline auf 22/23 (zeitlicher Split),
# vergleicht gegen Preis-Baseline, schreibt Metriken und Vorhersagen für aktuelle GW.

import argparse
from pathlib import Path
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def pick_col(df, candidates, default=None):
    for c in candidates:
        if c in df.columns:
            return c
    return default


def coerce_float(df, cols):
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def load_train_table(path_csv: Path):
    df = pd.read_csv(path_csv)

    id_col = pick_col(df, ["element", "id", "player_id"])
    gw_col = pick_col(df, ["round", "gw", "event"])
    tp_col = pick_col(df, ["total_points", "points"])
    min_col = pick_col(df, ["minutes", "mins"])
    price_c = pick_col(df, ["now_cost", "value", "price"])
    sel_col = pick_col(df, ["selected_by_percent", "selected_pct", "selected"])
    inf_col = pick_col(df, ["influence"])
    cre_col = pick_col(df, ["creativity"])
    thr_col = pick_col(df, ["threat"])
    ict_col = pick_col(df, ["ict_index", "ict"])

    needed = [id_col, gw_col, tp_col, min_col]
    if any(c is None for c in needed):
        missing = [
            n
            for n, c in zip(["id", "gw", "total_points", "minutes"], needed)
            if c is None
        ]
        raise SystemExit(f"Fehlende Spalten im Trainingsdatensatz: {missing}")

    use = [
        id_col,
        gw_col,
        tp_col,
        min_col,
        price_c,
        sel_col,
        inf_col,
        cre_col,
        thr_col,
        ict_col,
    ]
    use = [c for c in use if c is not None]
    df = df[use].copy()
    # einheitlich benennen
    rename = {id_col: "id", gw_col: "gw", tp_col: "total_points", min_col: "minutes"}
    if price_c:
        rename[price_c] = "price"
    if sel_col:
        rename[sel_col] = "selected"
    if inf_col:
        rename[inf_col] = "influence"
    if cre_col:
        rename[cre_col] = "creativity"
    if thr_col:
        rename[thr_col] = "threat"
    if ict_col:
        rename[ict_col] = "ict_index"
    df = df.rename(columns=rename)

    # Typen vereinheitlichen
    df = coerce_float(
        df,
        [
            "minutes",
            "total_points",
            "price",
            "selected",
            "influence",
            "creativity",
            "threat",
            "ict_index",
        ],
    )

    # Falls price in 10er-Schritten vorliegt (z.B. 55 statt 5.5), normalisieren
    if "price" in df.columns:
        # Heuristik: wenn Median > 25, dann /10
        med = df["price"].dropna().median()
        if pd.notna(med) and med > 25:
            df["price"] = df["price"] / 10.0

    # Ziel: nächstes GW (shift -1 pro Spieler)
    df = df.sort_values(["id", "gw"])
    df["target_next"] = df.groupby("id")["total_points"].shift(-1)

    # Rolling-Features r3 aus Vergangenheit (shift(1) → keine Leaks)
    roll_cols = [
        c
        for c in [
            "total_points",
            "minutes",
            "influence",
            "creativity",
            "threat",
            "ict_index",
        ]
        if c in df.columns
    ]
    for c in roll_cols:
        df[f"{c}_r3"] = df.groupby("id")[c].shift(1).rolling(3, min_periods=1).mean()
    if set(["total_points_r3", "minutes_r3"]).issubset(df.columns):
        df["tp_per90_r3"] = (
            df["total_points_r3"] / df["minutes_r3"].replace(0, np.nan) * 90
        )

    # Zeitlicher Split: letzte 8 GWs als Test
    last_gw = int(df["gw"].max())
    test_from = max(df["gw"].min(), last_gw - 7)
    train = df[(df["gw"] < test_from) & df["target_next"].notna()].copy()
    test = df[(df["gw"] >= test_from) & df["target_next"].notna()].copy()

    # Featureliste (nur was vorhanden ist)
    feat_candidates = [
        "price",
        "selected",
        "influence_r3",
        "creativity_r3",
        "threat_r3",
        "ict_index_r3",
        "minutes_r3",
        "tp_per90_r3",
    ]
    feats = [c for c in feat_candidates if c in train.columns]

    X_train, y_train = train[feats].fillna(0.0), train["target_next"].values
    X_test, y_test = test[feats].fillna(0.0), test["target_next"].values

    # Preis-Baseline (falls price vorhanden)
    price_baseline = None
    if "price" in feats:
        bl = LinearRegression()
        bl.fit(train[["price"]].fillna(0.0), y_train)
        price_baseline = bl

    meta = {
        "last_gw": last_gw,
        "test_from": int(test_from),
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "features": feats,
        "has_price_baseline": price_baseline is not None,
    }
    return X_train, y_train, X_test, y_test, feats, price_baseline, meta


def train_rf(X_train, y_train, random_state=42):
    rf = RandomForestRegressor(
        n_estimators=400,
        max_depth=None,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    return rf


def predict_current(rf, feats, current_csv: Path, out_csv: Path):
    cur = pd.read_csv(current_csv)

    # Mapping: aktuelle Spalten → Trainingsfeatures
    # (nicht vorhandene Features als 0 auffüllen)
    rename_map = {
        "now_cost": "price",
        "selected_by_percent": "selected",
        "ict_index": "ict_index_r3",
        "influence": "influence_r3",
        "creativity": "creativity_r3",
        "threat": "threat_r3",
    }
    df = cur.copy()
    for src, dst in rename_map.items():
        if src in df.columns and dst not in df.columns:
            df[dst] = pd.to_numeric(df[src], errors="coerce")

    for f in feats:
        if f not in df.columns:
            df[f] = 0.0

    X_cur = df[feats].fillna(0.0)
    preds = rf.predict(X_cur)
    df["pred_points"] = preds

    keep = ["id", "web_name", "position", "team_name", "team_short"]
    for k in keep:
        if k not in df.columns:
            df[k] = None
    # Preisspalte angleichen
    if "now_cost" in df.columns:
        df["price"] = df["now_cost"]
    elif "price" in df.columns:
        df["price"] = df["price"]
    else:
        df["price"] = None

    out = df[
        [
            "id",
            "web_name",
            "position",
            "team_name",
            "team_short",
            "price",
            "pred_points",
        ]
    ].copy()
    out = out.sort_values("pred_points", ascending=False)
    out.to_csv(out_csv, index=False)
    return out


def main(train_csv, current_csv, gw):
    X_train, y_train, X_test, y_test, feats, price_baseline, meta = load_train_table(
        Path(train_csv)
    )
    rf = train_rf(X_train, y_train)

    y_rf = rf.predict(X_test)
    mae_rf = mean_absolute_error(y_test, y_rf)

    line_rf = f"RandomForest: MAE = {mae_rf:.3f}"
    if price_baseline is not None:
        y_bl = price_baseline.predict(X_test[["price"]])
        mae_bl = mean_absolute_error(y_test, y_bl)
        line_bl = f"Preis-Baseline: MAE = {mae_bl:.3f}"
    else:
        mae_bl = None
        line_bl = "Preis-Baseline: nicht verfügbar (keine Preisspalte)"

    metrics_path = OUT_DIR / "rf_baseline_metrics.md"
    with open(metrics_path, "w", encoding="utf-8") as f:
        f.write("# RF-Baseline Metriken\n\n")
        f.write(
            f"- Trainingssplit: bis GW {meta['test_from']-1}, Test: GW {meta['test_from']}–{meta['last_gw']}\n"
        )
        f.write(f"- n_train: {meta['n_train']}, n_test: {meta['n_test']}\n")
        f.write(f"- Features: {', '.join(meta['features'])}\n")
        f.write(f"- {line_rf}\n")
        f.write(f"- {line_bl}\n")
    print(f"OK: {metrics_path}")

    out_pred = OUT_DIR / f"rf_pred_points_gw{gw}.csv"
    predict_current(rf, feats, Path(current_csv), out_pred)
    print(f"OK: {out_pred}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--train_csv", type=str, required=True)
    ap.add_argument("--current_csv", type=str, required=True)
    ap.add_argument("--gw", type=int, required=True)
    args = ap.parse_args()
    main(args.train_csv, args.current_csv, args.gw)
