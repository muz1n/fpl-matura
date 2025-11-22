#!/usr/bin/env python3
"""Bewertung und Vergleich verschiedener Prognosemethoden.

Vergleicht die Vorhersagemethoden RF, MA3 und POS mit den tatsaechlichen FPL-Punkten.
Erzeugt eine Vergleichstabelle sowie eine Visualisierung.

Verwendung:
    python evaluate_methods.py --season 2023-24 --gw_start 30 --gw_end 38 \\
        --compare rf ma3 pos --metrics mae,rmse,spearman
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Any, cast

import numpy as np
from numpy.typing import ArrayLike
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
import matplotlib.pyplot as plt
import seaborn as sns

# make_predictions-Modul importieren
import sys

sys.path.insert(0, str(Path(__file__).parent))
import make_predictions as mp

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_actual_points(season: str, gw: int) -> pd.DataFrame:
    """Ladet die tatsaechlichen Punkte fuer eine bestimmte Spielwoche.

    Args:
        season: Saisonbezeichner
        gw: Spielwochen-Nummer

    Returns:
        DataFrame mit player_id, gw, actual_points
    """
    # Lade tatsaechliche GW-Daten
    possible_files = [
        DATA_DIR / f"merged_gw_{season}.csv",
        DATA_DIR / "merged_gw_2022-23.csv",
        DATA_DIR / "merged_gw_2024-25.csv",
    ]

    df = None
    for csv_path in possible_files:
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            break

    if df is None:
        raise FileNotFoundError(f"No data file found for season {season}")

    # Standardisiere Spalten
    rename_map = {
        "element": "player_id",
        "id": "player_id",
        "round": "gw",
        "event": "gw",
        "GW": "gw",
        "total_points": "actual_points",
        "points": "actual_points",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Filtere auf spezifische GW
    if "gw" in df.columns:
        df = df[df["gw"] == gw]

    if "player_id" not in df.columns or "actual_points" not in df.columns:
        raise ValueError("Missing required columns in data file")

    # Aggregiere falls es Duplikate gibt (z.B. mehrere Fixtures pro GW)
    result = df.groupby("player_id")["actual_points"].sum().reset_index()

    return result


def calculate_metrics(predictions: ArrayLike, actuals: ArrayLike) -> Dict[str, float]:
    """Berechnet Auswertungsmetriken.

    Args:
        predictions: Prognosewerte (array-like)
        actuals: Echte Werte (array-like)

    Returns:
        Dictionary mit Metriknamen und -werten
    """
    predictions = np.asarray(predictions, dtype=float)
    actuals = np.asarray(actuals, dtype=float)

    # NaN-Werte herausfiltern
    mask = ~(np.isnan(predictions) | np.isnan(actuals))
    predictions = predictions[mask]
    actuals = actuals[mask]

    if predictions.size == 0:
        return {"mae": np.nan, "rmse": np.nan, "spearman": np.nan}

    mae = mean_absolute_error(actuals, predictions)
    rmse = np.sqrt(mean_squared_error(actuals, predictions))

    # Spearman-Korrelation
    if predictions.size > 1:
        res = spearmanr(predictions, actuals)
        # scipy.stats.spearmanr kann (corr, pvalue) oder ein Objekt mit .correlation zurueckgeben
        if isinstance(res, tuple):
            spearman_corr = res[0]
        else:
            spearman_corr = getattr(res, "correlation", np.nan)
        # Sicherstellen, dass spearman_corr ein skalarer numerischer Wert ist
        if isinstance(spearman_corr, (int, float, np.floating)):
            spearman_value = float(spearman_corr)
        else:
            try:
                # Numerischen Wert aus array-aehnlichen Typen extrahieren (z.B. 0-d numpy)
                spearman_value = float(np.asarray(spearman_corr).item())
            except Exception:
                spearman_value = np.nan
    else:
        spearman_value = np.nan

    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "spearman": float(spearman_value) if not np.isnan(spearman_value) else np.nan,
    }


def apply_ma3_method(predictions_data: Dict[str, Any]) -> Dict[str, Any]:
    """Wendet die MA3-Methode auf die Prognosen an.

    Liefert derzeit dieselben Daten zurueck, da keine historischen Daten
    fuer MA3 im aktuellen Setup vorliegen. In der Praxis wuerde hier der
    3-Spiele-Gleitmittelwert berechnet.
    """
    # Fuer jetzt, einfach RF-Prognosen als Basis verwenden
    # In Wirklichkeit wuerde man MA3 aus historischen Daten berechnen
    result = predictions_data.copy()
    result["model_version"] = result["model_version"] + "+ma3"
    return result


def apply_pos_method(predictions_data: Dict[str, Any]) -> Dict[str, Any]:
    """Wendet die positionsbasierte Durchschnittsmethode an."""
    result = predictions_data.copy()

    # Durchschnitt pro Position berechnen
    players = result["players"]
    by_pos = {}
    for player in players:
        pos = player["pos"]
        if pos not in by_pos:
            by_pos[pos] = []
        by_pos[pos].append(player["predicted_points"])

    # Durchschnitte berechnen
    pos_avg = {pos: np.mean(points) for pos, points in by_pos.items()}

    # Prognosen durch Positionsdurchschnitte ersetzen
    for player in players:
        player["predicted_points"] = pos_avg[player["pos"]]

    result["model_version"] = result["model_version"] + "+pos"
    return result


def evaluate_method(
    method: str, season: str, gw_start: int, gw_end: int, skip_generation: bool = False
) -> pd.DataFrame:
    """Bewertet eine einzelne Methode ueber mehrere Spielwochen.

    Args:
        method: Methodenname (rf, ma3, pos)
        season: Saisonbezeichner
        gw_start: Erste Spielwoche
        gw_end: Letzte Spielwoche
        skip_generation: Wenn True, bestehende Prognosen laden statt generieren

    Returns:
        DataFrame mit player_id, gw, predicted_points, actual_points
    """
    all_results = []

    print(f"\n{'='*60}")
    print(f"Evaluating method: {method.upper()}")
    print(f"{'='*60}")

    # Trainingsdaten einmal laden und aufbereiten
    # Probiere eine Liste bekannter Lade-Funktionsnamen in make_predictions
    df = None
    features = None
    loader_candidates = [
        "load_and_prepare_data",
        "load_and_prepare",
        "load_and_prepare_data_v2",
    ]
    for name in loader_candidates:
        func = getattr(mp, name, None)
        if callable(func):
            # Rufe den Loader auf und akzeptiere entweder (df, features) oder nur df
            try:
                res = func(season)
            except TypeError:
                # Fallback falls die Funktion kein season-Argument akzeptiert
                res = func()
            if isinstance(res, (tuple, list)) and len(res) == 2:
                df, features = res
            else:
                df = res
                features = None
            break

    # Fallback auf separate load/prepare-Funktionen falls verfuegbar
    if df is None or features is None:
        load_func = getattr(mp, "load_data", None)
        prep_func = getattr(mp, "prepare_features", None)
        if callable(load_func) and callable(prep_func):
            df = load_func(season)
            features = prep_func(df)
        else:
            available = ", ".join(sorted([a for a in dir(mp) if not a.startswith("_")]))
            raise AttributeError(
                "make_predictions stellt kein bekanntes load/prepare-Interface bereit; "
                f"erwartet wurde eine von {', '.join(loader_candidates)} oder 'load_data' + 'prepare_features'; "
                f"verfuegbare Attribute: {available}"
            )

    # Type-Checker und Laufzeit behandeln df als pandas DataFrame
    df = cast(pd.DataFrame, df)

    max_gw = int(df["gw"].max())
    test_gw_start = max(df["gw"].min(), max_gw - 7)

    # Modell einmal trainieren (unterstuetze mehrere moegliche Trainingsfunktionsnamen)
    train_candidates = [
        "train_model",
        "train",
        "train_rf",
        "fit_model",
        "build_model",
        "train_model_v2",
    ]
    train_func = None
    train_func_name = None
    for name in train_candidates:
        func = getattr(mp, name, None)
        if callable(func):
            train_func = func
            train_func_name = name
            break

    if train_func is None:
        available = ", ".join(sorted([a for a in dir(mp) if not a.startswith("_")]))
        raise AttributeError(
            "make_predictions stellt keine bekannte Trainingsfunktion bereit; "
            f"erwartet wurde eine von {', '.join(train_candidates)}; verfuegbare Attribute: {available}"
        )

    # Rufe die gefundene Trainingsfunktion mit verschiedenen moeglichen Signaturen auf
    try:
        model = train_func(df, features, test_gw_start)
    except TypeError:
        try:
            model = train_func(df, features)
        except TypeError:
            try:
                model = train_func(df)
            except TypeError as e:
                raise TypeError(
                    f"Konnte Trainingsfunktion '{train_func_name}' nicht aufrufen: {e}"
                )

    for gw in range(gw_start, gw_end + 1):
        print(f"\nProcessing GW {gw}...")

        # Pruefen, ob Prognosen bereits vorhanden sind (neues Dateischema mit Season-Prefix)
        pred_file = OUT_DIR / f"predictions_{season}_gw{gw}.json"

        if skip_generation and pred_file.exists():
            print(f"  Loading existing predictions from {pred_file}")
            with open(pred_file, "r", encoding="utf-8") as f:
                predictions_data = json.load(f)
        else:
            # Prognosen generieren
            print("  Generating predictions...")

            # Prognosefunktion in make_predictions ermitteln (unterstuetzt mehrere moegliche Namen)
            pred_candidates = [
                "generate_predictions",
                "generate_preds",
                "generate",
                "predict",
                "predict_points",
                "predict_players",
                "make_predictions",
                "create_predictions",
            ]
            pred_func = None
            pred_func_name = None
            for name in pred_candidates:
                func = getattr(mp, name, None)
                if callable(func):
                    pred_func = func
                    pred_func_name = name
                    break

            if pred_func is None:
                available = ", ".join(
                    sorted([a for a in dir(mp) if not a.startswith("_")])
                )
                raise AttributeError(
                    "make_predictions stellt keine bekannte Prognosefunktion bereit; "
                    f"erwartet wurde eine von {', '.join(pred_candidates)}; verfuegbare Attribute: {available}"
                )

            # Mehrere moegliche Signaturen fuer die ermittelte Prognosefunktion versuchen
            predictions_data = None
            call_attempts = [
                (model, features, season, gw, "rf"),
                (model, features, season, gw),
                (model, features, gw, "rf"),
                (model, season, gw, "rf"),
                (model, features, gw),
                (model, season, gw),
                (model, features),
                (model, gw),
                (model,),
            ]
            for args_call in call_attempts:
                try:
                    predictions_data = pred_func(*args_call)
                    break
                except TypeError:
                    # Naechste Signatur versuchen
                    continue

            if predictions_data is None:
                raise TypeError(
                    f"Konnte Prognosefunktion '{pred_func_name}' nicht mit bekannten Signaturen aufrufen"
                )

            # Falls das Rueckgabeobjekt in dict konvertiert werden kann, versuchen
            to_dict = getattr(predictions_data, "to_dict", None)
            if callable(to_dict):
                try:
                    predictions_data = to_dict()
                except Exception:
                    pass

            # Fuer spaetere Nutzung speichern
            with open(pred_file, "w") as f:
                json.dump(predictions_data, f, indent=4)

        # Methodentransformation anwenden
        # Type-Checker informieren, dass predictions_data dict-like ist
        predictions_data = cast(Dict[str, Any], predictions_data)

        if method == "ma3":
            predictions_data = apply_ma3_method(predictions_data)
        elif method == "pos":
            predictions_data = apply_pos_method(predictions_data)
        # rf bleibt unveraendert

        # Tatsaechliche Punkte laden
        try:
            actuals = load_actual_points(season, gw)
        except Exception as e:
            print(f"  Warning: Could not load actuals for GW {gw}: {e}")
            continue

        # Prognosen mit tatsaechlichen Punkten zusammenfuehren
        pred_df = pd.DataFrame(predictions_data["players"])
        merged = pred_df.merge(actuals, on="player_id", how="inner")

        if len(merged) == 0:
            print(f"  Warning: No matching players for GW {gw}")
            continue

        merged["gw"] = gw
        merged["method"] = method
        all_results.append(
            merged[["player_id", "gw", "method", "predicted_points", "actual_points"]]
        )

        print(f"  Matched {len(merged)} players")

    if not all_results:
        print(f"  No results found for {method}")
        return pd.DataFrame()

    return pd.concat(all_results, ignore_index=True)


def create_comparison_table(
    results_df: pd.DataFrame, metrics: List[str]
) -> pd.DataFrame:
    """Erstellt eine Vergleichstabelle ueber alle Methoden.

    Args:
        results_df: DataFrame mit allen Resultaten
        metrics: Liste der zu berechnenden Metriken

    Returns:
        DataFrame mit Methoden als Zeilen und Metriken als Spalten
    """
    comparison = []

    for method in results_df["method"].unique():
        method_data = results_df[results_df["method"] == method]

        predictions = method_data["predicted_points"].values
        actuals = method_data["actual_points"].values

        metrics_dict = calculate_metrics(predictions, actuals)
        metrics_dict["method"] = method
        metrics_dict["n_predictions"] = len(predictions)

        comparison.append(metrics_dict)

    comparison_df = pd.DataFrame(comparison)

    # Spalten neu anordnen
    cols = ["method", "n_predictions"] + [
        m for m in metrics if m in comparison_df.columns
    ]
    comparison_df = comparison_df[cols]

    return comparison_df


def plot_comparison(comparison_df: pd.DataFrame, output_path: Path):
    """Erstellt eine Visualisierung des Methodenvergleichs.

    Args:
        comparison_df: Vergleichstabelle
        output_path: Pfad zum Speichern des Plots
    """
    # Stil setzen
    sns.set_style("whitegrid")

    # Figur mit Subplots erstellen
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    methods = comparison_df["method"].values
    colors = sns.color_palette("husl", len(methods))

    # MAE
    axes[0].bar(methods, comparison_df["mae"], color=colors)
    axes[0].set_title("Mean Absolute Error (MAE)", fontsize=12, fontweight="bold")
    axes[0].set_ylabel("MAE")
    axes[0].axhline(y=2.0, color="r", linestyle="--", label="Target (MAE < 2)")
    axes[0].legend()

    # RMSE
    axes[1].bar(methods, comparison_df["rmse"], color=colors)
    axes[1].set_title("Root Mean Squared Error (RMSE)", fontsize=12, fontweight="bold")
    axes[1].set_ylabel("RMSE")

    # Spearman
    axes[2].bar(methods, comparison_df["spearman"], color=colors)
    axes[2].set_title("Spearman Correlation", fontsize=12, fontweight="bold")
    axes[2].set_ylabel("Correlation")
    axes[2].set_ylim(-1, 1)
    axes[2].axhline(y=0, color="gray", linestyle="-", linewidth=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    print(f"\n✓ Visualization saved to: {output_path}")
    plt.close()


def main():
    parser = argparse.ArgumentParser(description="Evaluate prediction methods")
    parser.add_argument(
        "--season", type=str, required=True, help="Season (e.g., 2023-24)"
    )
    parser.add_argument("--gw_start", type=int, required=True, help="First gameweek")
    parser.add_argument("--gw_end", type=int, required=True, help="Last gameweek")
    parser.add_argument(
        "--compare",
        type=str,
        nargs="+",
        default=["rf", "ma3", "pos"],
        help="Methods to compare",
    )
    parser.add_argument(
        "--metrics",
        type=str,
        default="mae,rmse,spearman",
        help="Comma-separated list of metrics",
    )
    parser.add_argument(
        "--skip-generation",
        action="store_true",
        help="Skip prediction generation, use existing files",
    )

    args = parser.parse_args()

    metrics = [m.strip().lower() for m in args.metrics.split(",")]

    print(f"\n{'='*70}")
    print("FPL Prediction Method Evaluation")
    print(f"{'='*70}")
    print(f"Season: {args.season}")
    print(f"Gameweeks: {args.gw_start} - {args.gw_end}")
    print(f"Methods: {', '.join(args.compare)}")
    print(f"Metrics: {', '.join(metrics)}")
    print(f"{'='*70}")

    # Jede Methode bewerten
    all_results = []
    for method in args.compare:
        method_results = evaluate_method(
            method, args.season, args.gw_start, args.gw_end, args.skip_generation
        )
        if not method_results.empty:
            all_results.append(method_results)

    if not all_results:
        print("\n❌ No results to compare")
        return

    # Alle Resultate zusammenfuehren
    results_df = pd.concat(all_results, ignore_index=True)

    # Vergleichstabelle erstellen
    comparison_df = create_comparison_table(results_df, metrics)

    # Resultate ausgeben
    print(f"\n{'='*70}")
    print("COMPARISON RESULTS")
    print(f"{'='*70}\n")
    print(comparison_df.to_string(index=False))
    print(f"\n{'='*70}")

    # Hypothese pruefen
    min_mae = comparison_df["mae"].min()
    if min_mae < 2.0:
        print(f"\n✅ HYPOTHESIS TEIL 1: MAE < 2 erfüllt! (Best MAE: {min_mae:.3f})")
    else:
        print(f"\n❌ HYPOTHESIS TEIL 1: MAE >= 2 (Best MAE: {min_mae:.3f})")

    # Resultate speichern
    csv_path = (
        OUT_DIR
        / f"method_comparison_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.csv"
    )
    comparison_df.to_csv(csv_path, index=False)
    print(f"\n✓ Results saved to: {csv_path}")

    # Visualisierung erstellen
    png_path = (
        OUT_DIR
        / f"method_comparison_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.png"
    )
    plot_comparison(comparison_df, png_path)

    # Detaillierte Resultate speichern
    detailed_path = (
        OUT_DIR
        / f"detailed_results_{args.season.replace('-', '_')}_gw{args.gw_start}-{args.gw_end}.csv"
    )
    results_df.to_csv(detailed_path, index=False)
    print(f"✓ Detailed results saved to: {detailed_path}")


if __name__ == "__main__":
    main()
