# code/models/moving_average_model.py
"""
Zeitbewusster Random Forest Regressor fuer FPL-Ranking-Prognose.

Verwendung:
    python code/models/moving_average_model.py --season 2022-23 --start_gw 30 --end_gw 38

Ausgaben:
    1) out/rf_rank_boost_summary_<season>_gw<start>-<end>.csv
    2) out/rf_rank_boost_bypos_<season>_gw<start>-<end>.csv
    3) out/rf_rank_boost_preds_<season>_gw<start>-<end>.csv
    4) Fuer jede GW: out/predictions_<season>_gw{gw}_rf_rank.json (neues Schema)
"""
import argparse
import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
from itertools import product
import numbers
from typing import Any, cast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


# --- Hilfsfunktionen ---
def safe_rolling(df, col, window, groupby, shift=1):
    return df.groupby(groupby)[col].transform(
        lambda x: x.shift(shift).rolling(window, min_periods=1).mean()
    )


def one_hot_position(df):
    positions = ["GK", "DEF", "MID", "FWD"]
    for pos in positions:
        df[f"pos_{pos}"] = (df["position"] == pos).astype(int)
    return df


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


# --- Main ---
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", required=True)
    parser.add_argument("--start_gw", type=int, required=True)
    parser.add_argument("--end_gw", type=int, required=True)
    args = parser.parse_args()

    season = args.season
    start_gw = args.start_gw
    end_gw = args.end_gw
    out_dir = "out"
    ensure_dir(out_dir)

    # Daten laden
    df = pd.read_csv(f"data/merged_gw_{season}.csv")
    df = df[df["season"] == season] if "season" in df.columns else df

    # Fallback fuer fehlende 'element' Spalte (alte Season-Dateien)
    if "element" not in df.columns:
        if "player_id" in df.columns:
            df["element"] = df["player_id"]
            print("Hinweis: 'element' fehlt -> verwende 'player_id' als Ersatz")
        elif "id" in df.columns:
            df["element"] = df["id"]
            print("Hinweis: 'element' fehlt -> verwende 'id' als Ersatz")
        elif "name" in df.columns:
            df["element"] = df["name"].astype("category").cat.codes
            print("Hinweis: 'element' fehlt -> verwende kodierten 'name' als Ersatz")
        else:
            print(
                "Error: keine geeignete Identifikationsspalte (element|player_id|id|name) gefunden"
            )
            return

    # Fallback fuer fehlende 'position' Spalte
    if "position" not in df.columns:
        if "pos" in df.columns:
            df = df.rename(columns={"pos": "position"})
            print("Hinweis: 'position' fehlt -> verwende 'pos' und benenne um")
        else:
            print("Error: 'position' Spalte fehlt und kein 'pos' vorhanden")
            return

    # Fallback fuer fehlende 'total_points' Spalte
    if "total_points" not in df.columns and "points" in df.columns:
        df["total_points"] = df["points"]
        print("Hinweis: 'total_points' fehlt -> mappe aus 'points'")

    # Optionale Spalten
    home_col = "home" if "home" in df.columns else None
    opp_col = "opponent_strength" if "opponent_strength" in df.columns else None

    # Gleitende Merkmale
    for stat in [
        "minutes",
        "total_points",
        "ict_index",
        "influence",
        "creativity",
        "threat",
    ]:
        if stat in df.columns:
            df[f"{stat}_ma3"] = safe_rolling(df, stat, 3, "element")
        else:
            df[f"{stat}_ma3"] = np.nan
            print(f"Warnung: Stat '{stat}' fehlt -> setze {stat}_ma3 = NaN")

    # Heimspiel/Gegnerstaerke
    if home_col:
        df["home"] = df["home"].astype(int)
    if opp_col:
        df["opponent_strength"] = df["opponent_strength"].astype(float)
    df = one_hot_position(df)

    # Merkmalsliste
    features = [
        "minutes_ma3",
        "total_points_ma3",
        "ict_index_ma3",
        "influence_ma3",
        "creativity_ma3",
        "threat_ma3",
    ]
    if home_col:
        features.append("home")
    if opp_col:
        features.append("opponent_strength")
    features += [f"pos_{p}" for p in ["GK", "DEF", "MID", "FWD"]]

    # Train/Test-Aufteilung vorbereiten
    train_df = df[df["GW"] < start_gw].copy()
    test_df = df[(df["GW"] >= start_gw) & (df["GW"] <= end_gw)].copy()

    # Grid Search
    param_grid = {
        "n_estimators": [300, 600],
        "min_samples_leaf": [1, 2, 4],
        "max_depth": [None, 12, 20],
    }
    grid = list(product(*param_grid.values()))
    best_score = -np.inf
    # best_params ist immer ein Mapping mit String-Schlüsseln, damit es mit ** entpackt werden kann
    best_params = {}
    for n_est, min_leaf, max_d in grid:
        rf = RandomForestRegressor(
            n_estimators=n_est,
            min_samples_leaf=min_leaf,
            max_depth=max_d,
            random_state=42,
            n_jobs=-1,
        )
        X_train = train_df[features].fillna(0)
        y_train = train_df["total_points"]
        rf.fit(X_train, y_train)
        preds = rf.predict(X_train)
        sr = spearmanr(y_train, preds)
        # Korrelation robust extrahieren: spearmanr kann ein Objekt mit
        # Attribut 'correlation' (namedtuple), oder ein Tuple-like (corr, pvalue),
        # oder Skalar zurückliefern. Zu Skalar normalisieren vor float-Konversion.
        rho_val = getattr(sr, "correlation", None)
        if rho_val is None:
            # sr kann tuple-like (correlation, pvalue) oder Skalar sein
            try:
                rho_val = sr[0]
            except Exception:
                rho_val = sr
        # Falls rho_val iterierbar ist (z.B. tuple, list, ndarray), erstes Element nehmen.
        if isinstance(rho_val, (list, tuple, np.ndarray)):
            try:
                # numpy-Konversion bevorzugen falls moeglich
                if isinstance(rho_val, np.ndarray):
                    if rho_val.size == 1:
                        rho_val = rho_val.item()
                    else:
                        rho_val = rho_val.flat[0]
                else:
                    rho_val = rho_val[0]
            except Exception:
                rho_val = None
        # Schliesslich sicher zu float konvertieren.
        try:
            if rho_val is None:
                raise ValueError("rho_val is None")
            # Nur bei skalaren numerischen/String-Typen float aufrufen um static checker zu genuegen
            if isinstance(rho_val, (numbers.Real, str, np.floating)):
                rho = float(cast(numbers.Real, rho_val))
            else:
                item = getattr(rho_val, "item", None)
                if callable(item):
                    # item()-Methode aufrufen falls verfuegbar und Resultat sicher zu float konvertieren
                    try:
                        val = item()
                        if isinstance(val, (numbers.Real, str, np.floating)):
                            rho = float(val)
                        else:
                            # typing.cast verwenden um static type checker vor float-Konversion zu genuegen
                            rho = float(cast(Any, val))
                    except Exception:
                        # Fallback: direkte float-Konversion von rho_val versuchen, sonst auf -inf setzen
                        try:
                            rho = float(cast(numbers.Real, rho_val))
                        except Exception:
                            rho = -np.inf
                else:
                    # Fallback: direkte float-Konversion versuchen, sonst auf -inf setzen
                    try:
                        rho = float(cast(numbers.Real, rho_val))
                    except Exception:
                        rho = -np.inf
                        rho = -np.inf
        except Exception:
            rho = -np.inf
        if np.isnan(rho):
            rho = -np.inf
            rho = -np.inf
        if rho > best_score:
            best_score = rho
            best_params = dict(
                n_estimators=n_est, min_samples_leaf=min_leaf, max_depth=max_d
            )
    # Finales Modell
    rf = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
    rf.fit(train_df[features].fillna(0), train_df["total_points"])

    # OPTIMIERUNG: Berechne rolling features EINMAL für alle Daten
    print("Computing rolling features for all data...")
    df_with_rolling = df.copy()
    for stat in [
        "minutes",
        "total_points",
        "ict_index",
        "influence",
        "creativity",
        "threat",
    ]:
        df_with_rolling[f"{stat}_ma3"] = safe_rolling(df, stat, 3, "element")

    # Test-GWs schrittweise durchlaufen
    preds_list = []
    for gw in range(start_gw, end_gw + 1):
        gw_df = df_with_rolling[df_with_rolling["GW"] == gw].copy()

        # Überspringe GWs ohne Daten (z.B. GW7 in 2022-23)
        if len(gw_df) == 0:
            print(f"  GW {gw}: No data - skipping")
            continue
        if home_col:
            gw_df["home"] = gw_df["home"].astype(int)
        if opp_col:
            gw_df["opponent_strength"] = gw_df["opponent_strength"].astype(float)
        gw_df = one_hot_position(gw_df)
        X_gw = gw_df[features].fillna(0)
        pred_points = rf.predict(X_gw)
        gw_df["predicted_points"] = pred_points
        # Pro-GW-Prognosen speichern
        pred_json = gw_df[
            ["GW", "element", "name", "position", "team", "predicted_points"]
        ].to_dict(orient="records")
        with open(
            f"{out_dir}/predictions_{season}_gw{gw}_rf_rank.json", "w", encoding="utf-8"
        ) as f:
            json.dump(pred_json, f, ensure_ascii=False, indent=2)
        preds_list.append(gw_df)
    # Alle Prognosen zusammenfuehren
    all_preds = pd.concat(preds_list, ignore_index=True)
    # Alle Prognosen speichern
    all_preds[["GW", "element", "name", "position", "team", "predicted_points"]].to_csv(
        f"{out_dir}/rf_rank_boost_preds_{season}_gw{start_gw}-{end_gw}.csv", index=False
    )
    # Metriken
    test_points = test_df["total_points"]
    pred_points = all_preds["predicted_points"]
    mae = mean_absolute_error(test_points, pred_points)
    rmse = np.sqrt(mean_squared_error(test_points, pred_points))
    rho, _ = spearmanr(test_points, pred_points)
    # Nach Position
    pos_metrics = []
    for pos in ["GK", "DEF", "MID", "FWD"]:
        test_pos = test_df[test_df["position"] == pos]
        preds_pos = all_preds[all_preds["position"] == pos]
        if len(test_pos) == 0 or len(preds_pos) == 0:
            continue
        # Indizes nach GW und element abgleichen
        merged = pd.merge(
            test_pos[["GW", "element", "total_points"]],
            preds_pos[["GW", "element", "predicted_points"]],
            on=["GW", "element"],
            how="inner",
        )
        mae_pos = mean_absolute_error(
            merged["total_points"], merged["predicted_points"]
        )
        rmse_pos = np.sqrt(
            mean_squared_error(merged["total_points"], merged["predicted_points"])
        )
        rho_pos, _ = spearmanr(merged["total_points"], merged["predicted_points"])
        pos_metrics.append(
            {"position": pos, "MAE": mae_pos, "RMSE": rmse_pos, "Spearman_rho": rho_pos}
        )
    # Zusammenfassung speichern
    summary_dict = {
        "season": season,
        "start_gw": start_gw,
        "end_gw": end_gw,
        "MAE": mae,
        "RMSE": rmse,
        "Spearman_rho": rho,
    }
    if best_params:
        summary_dict.update(best_params)
    summary = pd.DataFrame([summary_dict])
    summary.to_csv(
        f"{out_dir}/rf_rank_boost_summary_{season}_gw{start_gw}-{end_gw}.csv",
        index=False,
    )
    # Nach Position speichern
    pd.DataFrame(pos_metrics).to_csv(
        f"{out_dir}/rf_rank_boost_bypos_{season}_gw{start_gw}-{end_gw}.csv", index=False
    )
    print(f"Overall Spearman rho: {rho:.4f}, MAE: {mae:.4f}")


if __name__ == "__main__":
    main()
