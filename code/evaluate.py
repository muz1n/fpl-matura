from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Dict, List

# Vergleich von fünf Spieler-Vorhersagemodellen (rf, ma3, pos, rf_pos, rf_rank).

import numpy as np
import pandas as pd
import os
import importlib.util
from scipy.stats import spearmanr
from sklearn.metrics import mean_absolute_error, mean_squared_error

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def _import_local(module_name: str, rel_path: str):
    full_path = os.path.join(REPO_ROOT, *rel_path.split("/"))
    spec = importlib.util.spec_from_file_location(module_name, full_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module {module_name!r} from {full_path!r}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)  # type: ignore
    return mod


_data_io = _import_local("fpl_data_io", "code/utils/data_io.py")
_rf_pos_models = _import_local("rf_pos_models", "code/rf_pos_models.py")

load_player_gameweeks = _data_io.load_player_gameweeks
ensure_dirs = _data_io.ensure_dirs
save_table = _data_io.save_table
save_json = _data_io.save_json

train_position_models = _rf_pos_models.train_position_models
predict_gameweek = _rf_pos_models.predict_gameweek
compute_rolling_features = _rf_pos_models.compute_rolling_features

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--season", required=True)
    p.add_argument("--gw_start", type=int, required=True)
    p.add_argument("--gw_end", type=int, required=True)
    p.add_argument(
        "--formation", default="auto"
    )  # nicht mehr genutzt, bleibt fuer CLI-Kompatibilitaet
    p.add_argument("--out", default="out")
    p.add_argument("--random_state", type=int, default=42)
    p.add_argument("--dry_run", action="store_true")
    return p.parse_args()


def safe_spearman(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) < 2:
        return float("nan")
    try:
        res = spearmanr(y_true, y_pred)
        # spearmanr may return a tuple/list/ndarray or an object with .correlation
        # use getattr to avoid static-analysis complaints about unknown attributes
        corr = getattr(res, "correlation", None)
        if corr is not None:
            rho = corr
        else:
            # works for tuples/lists/ndarrays and plain scalars
            try:
                rho = res[0]
            except Exception:
                rho = res

        # Convert to numpy array to handle array-like results, then extract scalar
        rho_arr = np.asarray(rho)
        if rho_arr.size == 1:
            val = float(rho_arr.item())
            return val if not np.isnan(val) else float("nan")
        return float("nan")
    except Exception:
        return float("nan")


def try_model_predict(
    train: pd.DataFrame, test: pd.DataFrame, season: str, random_state: int
) -> pd.Series:
    """Baseline RF (rf_baseline.py) falls verfügbar, sonst NaN."""
    try:
        rf_mod = _import_local("rf_baseline", "code/rf_baseline.py")
        train_rf_until = getattr(rf_mod, "train_rf_until")
        predict_for = getattr(rf_mod, "predict_for")
        model = train_rf_until(train, season=season, random_state=random_state)
        preds = predict_for(model, test)
        return pd.Series(preds, index=test.index, dtype=float)
    except Exception as exc:
        logging.info("RF Baseline nicht verfügbar: %s", exc)
        return pd.Series(np.nan, index=test.index, dtype=float)


def evaluate_rf_pos(train_df: pd.DataFrame, test_df: pd.DataFrame) -> pd.Series:
    """Trainiert positionsspezifische RF Modelle und liefert Punktvorhersagen."""
    # rf_pos_models erwartet 'total_points' und 'name', aber data hat 'points' und 'player_id'
    train_work = train_df.copy()
    test_work = test_df.copy()
    if "total_points" not in train_work.columns and "points" in train_work.columns:
        train_work["total_points"] = train_work["points"]
    if "total_points" not in test_work.columns and "points" in test_work.columns:
        test_work["total_points"] = test_work["points"]
    if "name" not in train_work.columns and "player_id" in train_work.columns:
        train_work["name"] = train_work["player_id"].astype(str)
    if "name" not in test_work.columns and "player_id" in test_work.columns:
        test_work["name"] = test_work["player_id"].astype(str)
    models = train_position_models(train_work, positions=["GK", "DEF", "MID", "FWD"])
    preds_dict = predict_gameweek(models, test_work)
    vals = [preds_dict.get(row.get("name"), 0.0) for _, row in test_work.iterrows()]
    return pd.Series(vals, index=test_df.index, dtype=float)


def rank_transform(points: pd.Series, reference_mean: float) -> pd.Series:
    """Transformiert Punktvorhersagen auf Rang-Prozent-Skala * Referenzmittelwert."""
    if points.empty:
        return pd.Series([], dtype=float)
    ranks = points.rank(method="average", ascending=False)
    pct = ranks / ranks.max()  # 1.0 = bester Spieler
    return pct * reference_mean


def ensure_rolling(df: pd.DataFrame, id_col: str = "player_id") -> pd.DataFrame:
    base_stats = ["minutes", "points", "ict_index", "influence", "creativity", "threat"]
    for col in base_stats:
        if col not in df.columns:
            df[col] = 0.0
        roll_col = f"{col}_ma3"
        if roll_col not in df.columns:
            df[roll_col] = (
                df.groupby(id_col)[col].shift(1).rolling(window=3, min_periods=1).mean()
            )
    # One-hot Position
    if "position" in df.columns:
        for p in ["GK", "DEF", "MID", "FWD"]:
            c = f"pos_{p}"
            if c not in df.columns:
                df[c] = (df["position"] == p).astype(int)
    # Name aus player_id ableiten falls fehlend
    if "name" not in df.columns and "player_id" in df.columns:
        df["name"] = df["player_id"].astype(str)
    return df


def evaluate_span(
    df: pd.DataFrame, season: str, gw_start: int, gw_end: int, random_state: int
) -> pd.DataFrame:
    model_names = ["rf", "ma3", "pos", "rf_pos", "rf_rank"]
    results: Dict[str, Dict[str, List[float]]] = {
        m: {"y_true": [], "y_pred": []} for m in model_names
    }

    df = df.copy()
    if "season" in df.columns:
        df = df[df["season"] == season]
    if "gw" not in df.columns:
        logging.error("Spalte 'gw' fehlt in den Daten – Abbruch.")
        return pd.DataFrame()
    df = ensure_rolling(df)

    for gw in range(gw_start, gw_end + 1):
        train = df[df["gw"] < gw].copy()
        test = df[df["gw"] == gw].copy()
        if train.empty or test.empty:
            continue
        if "points" not in test.columns:
            continue

        # rf
        rf_pred = try_model_predict(
            train, test, season=season, random_state=random_state
        )
        if rf_pred.isna().all():
            rf_pred = (
                test["points"].groupby(test["position"]).transform("mean")
                if "position" in test.columns
                else pd.Series(0.0, index=test.index)
            )
        results["rf"]["y_true"].extend(test["points"].values.tolist())
        results["rf"]["y_pred"].extend(rf_pred.values.tolist())

        # ma3
        if "points_ma3" not in test.columns:
            test["points_ma3"] = (
                test.groupby("player_id")["points"].shift(1).rolling(3, 1).mean()
            )
        ma3_pred = test["points_ma3"].fillna(0.0)
        results["ma3"]["y_true"].extend(test["points"].values.tolist())
        results["ma3"]["y_pred"].extend(ma3_pred.values.tolist())

        # pos (Positionsmittelwert aus TRAIN)
        if "position" in test.columns:
            pos_means_train = train.groupby("position")["points"].mean()
            pos_pred = (
                test["position"].map(pos_means_train).fillna(train["points"].mean())
            )
        else:
            pos_pred = pd.Series(train["points"].mean(), index=test.index)
        results["pos"]["y_true"].extend(test["points"].values.tolist())
        results["pos"]["y_pred"].extend(pos_pred.values.tolist())

        # rf_pos (positionsspezifische Modelle)
        rf_pos_pred = evaluate_rf_pos(train, test)
        results["rf_pos"]["y_true"].extend(test["points"].values.tolist())
        results["rf_pos"]["y_pred"].extend(rf_pos_pred.values.tolist())

        # rf_rank: Rangtransformation der rf_pos oder rf Vorhersage (hier rf_pos bevorzugt)
        reference_mean = train["points"].mean()
        rf_rank_pred = rank_transform(
            pd.Series(rf_pos_pred.values, index=test.index), reference_mean
        )
        results["rf_rank"]["y_true"].extend(test["points"].values.tolist())
        results["rf_rank"]["y_pred"].extend(rf_rank_pred.values.tolist())

    # Zusammenfassung
    rows = []
    for name in model_names:
        y_true = np.array(results[name]["y_true"], dtype=float)
        y_pred = np.array(results[name]["y_pred"], dtype=float)
        if len(y_true) == 0:
            continue
        rows.append(
            {
                "model": name,
                "mae": mean_absolute_error(y_true, y_pred),
                "rmse": np.sqrt(mean_squared_error(y_true, y_pred)),
                "spearman": safe_spearman(y_true, y_pred),
                "n_samples": int(len(y_true)),
            }
        )
    return pd.DataFrame(rows)


def main():
    args = parse_args()
    # Re-Use out Verzeichnis auch als plots_dir Dummy
    ensure_dirs(Path(args.out), Path(args.out))
    data = load_player_gameweeks(args.season)
    if data.empty:
        logging.warning("Keine Daten – leere Auswertung.")
        print("| Modell | MAE | RMSE | Spearman | Samples |")
        return
    summary = evaluate_span(
        data, args.season, args.gw_start, args.gw_end, args.random_state
    )
    if summary.empty:
        logging.warning("Keine GWs ausgewertet.")
    else:
        print(
            "\nModellvergleich ({} GW {}-{}):".format(
                args.season, args.gw_start, args.gw_end
            )
        )
        print(
            "{:<8} {:>8} {:>8} {:>9} {:>9}".format(
                "Modell", "MAE", "RMSE", "Spearman", "Samples"
            )
        )
        for _, r in summary.sort_values("mae").iterrows():
            print(
                "{:<8} {:8.3f} {:8.3f} {:9.3f} {:9d}".format(
                    r.model, r.mae, r.rmse, r.spearman, r.n_samples
                )
            )
        # Markdown
        print("\n| Modell | MAE | RMSE | Spearman | Samples |")
        print("|--------|-----|------|----------|---------|")
        for _, r in summary.iterrows():
            print(
                f"| {r.model} | {r.mae:.3f} | {r.rmse:.3f} | {r.spearman:.3f} | {r.n_samples} |"
            )
        if not args.dry_run:
            save_table(summary, Path(args.out) / "model_comparison.csv")
            save_json(
                {
                    "season": args.season,
                    "gw_start": args.gw_start,
                    "gw_end": args.gw_end,
                    "models": summary["model"].tolist(),
                },
                Path(args.out) / "run_settings.json",
            )


if __name__ == "__main__":
    main()
