# code/rf_report.py
# Erweiterte RF-Evaluation mit GroupKFold (kein GW-Leakage),
# mehreren Baselines, Feature Importance und Plots.

import argparse
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Headless-Backend für Plots
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.inspection import permutation_importance

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR = ROOT / "docs" / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)


def pick_col(df, candidates, default=None):
    """Wählt die erste existierende Spalte aus candidates."""
    for c in candidates:
        if c in df.columns:
            return c
    return default


def coerce_float(df, cols):
    """Konvertiert Spalten zu numerischen Werten."""
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def load_and_prepare_data(path_csv: Path):
    """
    Lädt Daten und erstellt Features.
    Rückgabe: DataFrame mit Features, Ziel und GW für Gruppierung.
    """
    df = pd.read_csv(path_csv)

    # Flexible Spaltennamen
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
    pos_col = pick_col(df, ["position", "pos"])

    needed = [id_col, gw_col, tp_col, min_col]
    if any(c is None for c in needed):
        missing = [
            n
            for n, c in zip(["id", "gw", "total_points", "minutes"], needed)
            if c is None
        ]
        raise SystemExit(f"Fehlende Spalten: {missing}")

    use = [id_col, gw_col, tp_col, min_col, price_c, sel_col, inf_col, cre_col, thr_col, ict_col, pos_col]
    use = [c for c in use if c is not None]
    df = df[use].copy()

    # Einheitliche Benennung
    rename = {
        id_col: "id",
        gw_col: "gw",
        tp_col: "total_points",
        min_col: "minutes"
    }
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
    if pos_col:
        rename[pos_col] = "position"
    df = df.rename(columns=rename)

    # Numerische Konvertierung
    df = coerce_float(
        df,
        ["minutes", "total_points", "price", "selected", "influence", "creativity", "threat", "ict_index"]
    )

    # Preisnormalisierung (falls in 10er-Schritten)
    if "price" in df.columns:
        med = df["price"].dropna().median()
        if pd.notna(med) and med > 25:
            df["price"] = df["price"] / 10.0

    # Ziel: nächstes GW vorhersagen
    df = df.sort_values(["id", "gw"])
    df["target"] = df.groupby("id")["total_points"].shift(-1)

    # Rolling-Features (shift(1) → kein Leakage)
    roll_cols = [c for c in ["total_points", "minutes", "influence", "creativity", "threat", "ict_index"] if c in df.columns]
    for c in roll_cols:
        df[f"{c}_r3"] = df.groupby("id")[c].shift(1).rolling(3, min_periods=1).mean()

    if set(["total_points_r3", "minutes_r3"]).issubset(df.columns):
        df["tp_per90_r3"] = df["total_points_r3"] / df["minutes_r3"].replace(0, np.nan) * 90

    # Nur Zeilen mit gültigem Ziel
    df = df[df["target"].notna()].copy()

    return df


def compute_baselines(df):
    """
    Berechnet Baseline-Vorhersagen:
    1. Mittelwert je Position
    2. Moving Average (letzte 3 Spiele)
    """
    # Baseline 1: Durchschnitt je Position
    if "position" in df.columns:
        pos_mean = df.groupby("position")["total_points"].transform("mean")
        df["baseline_pos_mean"] = pos_mean
    else:
        df["baseline_pos_mean"] = df["total_points"].mean()

    # Baseline 2: MA3 (total_points_r3)
    if "total_points_r3" in df.columns:
        df["baseline_ma3"] = df["total_points_r3"]
    else:
        df["baseline_ma3"] = df["total_points"].mean()

    return df


def cross_validate_rf(df, feats, n_splits=5, random_state=42):
    """
    GroupKFold-CV: gruppiert nach GW, um zeitliche Leaks zu vermeiden.
    Rückgabe: Liste von (MAE, RMSE, R²) für jeden Fold.
    """
    X = df[feats].fillna(0.0).values
    y = df["target"].values
    groups = df["gw"].values

    gkf = GroupKFold(n_splits=n_splits)
    results = []

    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups), start=1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        rf = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        y_pred = rf.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        results.append((mae, rmse, r2))

    return results


def plot_learning_curve(df, feats, save_path):
    """
    Erstellt Lernkurve: MAE über Trainingsgröße.
    """
    X = df[feats].fillna(0.0).values
    y = df["target"].values

    train_sizes = np.linspace(0.2, 1.0, 5)
    n_max = len(X)
    train_errors = []
    val_errors = []

    for size in train_sizes:
        n_train = int(n_max * size * 0.8)
        n_val = int(n_max * size * 0.2)

        X_train, y_train = X[:n_train], y[:n_train]
        X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]

        rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)

        train_errors.append(mean_absolute_error(y_train, rf.predict(X_train)))
        val_errors.append(mean_absolute_error(y_val, rf.predict(X_val)))

    plt.figure(figsize=(8, 5))
    plt.plot(train_sizes, train_errors, 'o-', label='Training MAE')
    plt.plot(train_sizes, val_errors, 's-', label='Validierung MAE')
    plt.xlabel('Anteil Trainingsdaten')
    plt.ylabel('MAE')
    plt.title('Lernkurve Random Forest')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def plot_feature_importance(df, feats, save_path, random_state=42):
    """
    Berechnet und plottet Feature Importance (Permutation).
    """
    X = df[feats].fillna(0.0).values
    y = df["target"].values

    rf = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=random_state, n_jobs=-1)
    rf.fit(X, y)

    perm_importance = permutation_importance(rf, X, y, n_repeats=10, random_state=random_state, n_jobs=-1)
    importances = perm_importance.importances_mean

    # Sortieren
    indices = np.argsort(importances)[::-1]

    plt.figure(figsize=(8, 6))
    plt.barh(range(len(feats)), importances[indices], align='center')
    plt.yticks(range(len(feats)), [feats[i] for i in indices])
    plt.xlabel('Permutation Importance')
    plt.title('Feature Importance (Permutation)')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def write_report(metrics, baseline_metrics, feats, save_path):
    """
    Schreibt Kurzbericht als Markdown.
    """
    mae_mean, rmse_mean, r2_mean = metrics
    mae_pos, mae_ma3 = baseline_metrics

    with open(save_path, "w", encoding="utf-8") as f:
        f.write("# RF Kurzbericht\n\n")
        f.write(f"**Datum:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")

        f.write("## 1. Datengrundlage\n")
        f.write("- Historische Spielerdaten mit Rolling-Features (R3)\n")
        f.write("- Ziel: Vorhersage total_points für nächstes GW\n")
        f.write("- Features: " + ", ".join(feats) + "\n\n")

        f.write("## 2. CV-Setup\n")
        f.write("- GroupKFold (5 Folds), gruppiert nach GW → kein zeitliches Leakage\n")
        f.write("- Random Forest: 200 Trees, max_depth=15\n\n")

        f.write("## 3. Metriken vs. Baseline\n")
        f.write(f"- **RF MAE:** {mae_mean:.3f}\n")
        f.write(f"- **RF RMSE:** {rmse_mean:.3f}\n")
        f.write(f"- **RF R²:** {r2_mean:.3f}\n")
        f.write(f"- **Baseline (Positions-Durchschnitt) MAE:** {mae_pos:.3f}\n")
        f.write(f"- **Baseline (MA3) MAE:** {mae_ma3:.3f}\n\n")

        f.write("## 4. Einordnung\n")
        if mae_mean < mae_pos and mae_mean < mae_ma3:
            f.write("✓ **Gut:** RF übertrifft beide Baselines.\n\n")
        elif mae_mean < max(mae_pos, mae_ma3):
            f.write("○ **OK:** RF besser als eine Baseline, aber ausbaufähig.\n\n")
        else:
            f.write("✗ **Ausbaufähig:** RF schlechter als Baselines. Feature-Engineering oder Hyperparameter prüfen.\n\n")

        f.write("## 5. Nächste Schritte\n")
        f.write("- Weitere Features testen (Gegner-Stärke, Home/Away)\n")
        f.write("- Hyperparameter-Tuning\n")
        f.write("- Ensemble mit anderen Modellen (XGBoost, LightGBM)\n\n")

        f.write("## 6. Plots\n")
        f.write("- Lernkurve: `docs/plots/rf_learning_curve.png`\n")
        f.write("- Feature Importance: `docs/plots/rf_feature_importance.png`\n")


def main(train_csv):
    print("Lade Daten...")
    df = load_and_prepare_data(Path(train_csv))
    print(f"  {len(df)} Zeilen geladen")

    print("Berechne Baselines...")
    df = compute_baselines(df)

    # Feature-Liste
    feat_candidates = [
        "price", "selected",
        "influence_r3", "creativity_r3", "threat_r3", "ict_index_r3",
        "minutes_r3", "tp_per90_r3"
    ]
    feats = [c for c in feat_candidates if c in df.columns]
    print(f"  Features: {feats}")

    print("Cross-Validation mit GroupKFold...")
    cv_results = cross_validate_rf(df, feats, n_splits=5)
    mae_vals = [r[0] for r in cv_results]
    rmse_vals = [r[1] for r in cv_results]
    r2_vals = [r[2] for r in cv_results]

    mae_mean = np.mean(mae_vals)
    rmse_mean = np.mean(rmse_vals)
    r2_mean = np.mean(r2_vals)

    print(f"  RF MAE: {mae_mean:.3f} ± {np.std(mae_vals):.3f}")
    print(f"  RF RMSE: {rmse_mean:.3f}")
    print(f"  RF R²: {r2_mean:.3f}")

    # Baseline-Metriken
    mae_pos = mean_absolute_error(df["target"], df["baseline_pos_mean"])
    mae_ma3 = mean_absolute_error(df["target"], df["baseline_ma3"])
    print(f"  Baseline (Pos-Mean) MAE: {mae_pos:.3f}")
    print(f"  Baseline (MA3) MAE: {mae_ma3:.3f}")

    print("Erstelle Lernkurve...")
    plot_learning_curve(df, feats, PLOTS_DIR / "rf_learning_curve.png")

    print("Berechne Feature Importance...")
    plot_feature_importance(df, feats, PLOTS_DIR / "rf_feature_importance.png")

    print("Schreibe Kurzbericht...")
    write_report(
        (mae_mean, rmse_mean, r2_mean),
        (mae_pos, mae_ma3),
        feats,
        ROOT / "docs" / "rf_kurzbericht.md"
    )

    print("✓ Fertig!")
    print("  Kurzbericht: docs/rf_kurzbericht.md")
    print("  Plots: docs/plots/rf_learning_curve.png, rf_feature_importance.png")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Erweiterter RF-Report mit CV, Baselines und Plots")
    ap.add_argument("--train_csv", type=str, required=True, help="Pfad zum Trainingsdatensatz")
    args = ap.parse_args()
    main(args.train_csv)
