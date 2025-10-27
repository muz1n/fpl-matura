"""Zentrale Auswertungspipeline fuer Spieler- und Team-Benchmarks."""  # Beschreibt grob den Zweck der Datei fuer Laien

from __future__ import (
    annotations,
)  # Erlaubt moderne Typ-Features auch auf aelteren Python-Versionen

import argparse  # Zum Einlesen der Kommandozeilenargumente
import logging  # Fuer einheitliche Log-Ausgaben
import sys  # Ermoeglicht das Anpassen des Python-Suchpfads
from pathlib import Path  # Pfadobjekte statt einfacher Strings
from typing import Dict, List, Optional, Tuple  # Typ-Hilfen fuer bessere Lesbarkeit

import numpy as np  # Mathematische Basisfunktionen
import pandas as pd  # Tabellendaten bequem bearbeiten
import os  # Betriebssystemfunktionen (Pfadmanipulation etc.)
import importlib.util  # Hilfsfunktionen zum dynamischen Laden von Modulen

# Sicherstellen, dass das Projektwurzelverzeichnis im Suchpfad liegt, egal von wo das Skript gestartet wird
PROJECT_ROOT = (
    Path(__file__).resolve().parents[1]
)  # Wurzelordner (eine Ebene ueber code/)
if str(PROJECT_ROOT) not in sys.path:  # Nur hinzufuegen, falls noch nicht vorhanden
    sys.path.insert(0, str(PROJECT_ROOT))

# --- robust local imports by file path to avoid stdlib 'code' clash ---
# os and importlib.util are imported at the top of the module; sys was already imported above.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def _import_local(module_name: str, rel_path: str):
    """Import a local module from a relative file path (cross-platform)."""
    full_path = os.path.join(REPO_ROOT, *rel_path.split("/"))
    spec = importlib.util.spec_from_file_location(module_name, full_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module {module_name!r} from {full_path!r}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)  # type: ignore
    return mod


_data_io = _import_local("fpl_data_io", "code/utils/data_io.py")
_baselines = _import_local("fpl_baselines", "code/utils/baselines.py")
_team_builder = _import_local("fpl_team_builder", "code/utils/team_builder.py")

# re-export the symbols expected below (so the rest of the file stays unchanged)
ensure_dirs = _data_io.ensure_dirs
load_player_gameweeks = _data_io.load_player_gameweeks
save_json = _data_io.save_json
save_plot = _data_io.save_plot
save_table = _data_io.save_table

add_baseline_a1_points = _baselines.add_baseline_a1_points
add_baseline_a2_points = _baselines.add_baseline_a2_points
add_team_baseline_b1_score = _baselines.add_team_baseline_b1_score
add_team_baseline_b2_score = _baselines.add_team_baseline_b2_score

ALLOWED_FORMATIONS = _team_builder.ALLOWED_FORMATIONS
build_team = _team_builder.build_team
choose_best_formation = _team_builder.choose_best_formation
# --- end robust imports ---


logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s"
)  # Standard-Loggingformat setzen


def parse_args() -> argparse.Namespace:  # Kapselt die CLI-Argumente
    parser = argparse.ArgumentParser()  # Erstellt den Parser fuer Eingaben
    parser.add_argument("--season", required=True)  # Saison als Pflichtparameter
    parser.add_argument(
        "--gw_start", type=int, required=True
    )  # Start-Spieltag definieren
    parser.add_argument("--gw_end", type=int, required=True)  # End-Spieltag definieren
    parser.add_argument(
        "--formation", default="auto"
    )  # Formation festlegen oder Auto-Modus
    parser.add_argument("--out", default="out")  # Ausgabeverzeichnis fuer Tabellen
    parser.add_argument(
        "--plots", default="docs/plots"
    )  # Ausgabeverzeichnis fuer Grafiken
    parser.add_argument(
        "--random_state", type=int, default=42
    )  # Zufallsbasis fuer reproduzierbare Modelle
    parser.add_argument(
        "--dry_run", action="store_true"
    )  # Optionaler Trockenlauf ohne Dateien zu schreiben
    return parser.parse_args()  # Rueckgabe der geparsten Argumente


def mae(
    y_true: np.ndarray, y_pred: np.ndarray
) -> float:  # Mittlerer absoluter Fehler berechnen
    true_arr = np.asarray(
        y_true, dtype=float
    )  # Wahrheitswerte in Float-Array umwandeln
    pred_arr = np.asarray(y_pred, dtype=float)  # Prognosewerte in Float-Array umwandeln
    mask = ~np.isnan(true_arr) & ~np.isnan(
        pred_arr
    )  # Nur Paare ohne Fehlwerte behalten
    if mask.sum() == 0:  # Falls keine gueltigen Paare existieren
        return float("nan")  # Rueckgabe von NaN als Platzhalter
    return float(
        np.mean(np.abs(true_arr[mask] - pred_arr[mask]))
    )  # Durchschnitt der absoluten Abweichungen berechnen


def try_model_predict(  # Versucht optionales Modell aus rf_baseline zu verwenden
    train: pd.DataFrame, test: pd.DataFrame, season: str, random_state: int
) -> pd.Series:
    """Versucht Vorhersagen eines vorhandenen Random-Forest-Modells zu nutzen."""  # Kurze Funktionsbeschreibung fuer Laien

    try:
        # Dynamically import the local adapter module using the project's helper to avoid
        # static resolution of the "code." package name in different environments.
        rf_mod = _import_local(
            "rf_baseline", "code/rf_baseline.py"
        )  # Optionalen Adapter importieren
        predict_for = getattr(rf_mod, "predict_for")
        train_rf_until = getattr(rf_mod, "train_rf_until")

        model = train_rf_until(
            train, season=season, random_state=random_state
        )  # Modell bis zum Zielspieltag trainieren
        preds = predict_for(model, test)  # Vorhersagen fuer Testspieler erzeugen
        return pd.Series(
            preds, index=test.index, dtype=float
        )  # Rueckgabe als Serie mit urspruenglichem Index
    except Exception as exc:  # Falls Import oder Aufruf scheitert
        logging.info(
            "Kein Modell-Adapter nutzbar: %s", exc
        )  # Hinweis im Log fuer Transparenz
        return pd.Series(
            np.nan, index=test.index, dtype=float
        )  # Serie voller NaN als Fallback


def _evaluate_gw(  # Hilfsroutine fuer einzelne Spieltage
    df: pd.DataFrame,
    season: str,
    gw: int,
    formation_mode: str,
    random_state: int,
) -> Optional[Tuple[pd.DataFrame, Dict[str, float]]]:
    logging.info(
        "Pruefe Spieltag %s", gw
    )  # Infoausgabe welcher Spieltag behandelt wird
    train = df[df["gw"] < gw].copy()  # Trainingsdaten bis zum Vortag
    test = df[df["gw"] == gw].copy()  # Testdaten exakt fuer den Spieltag
    if train.empty or test.empty:  # Falls Daten fehlen
        logging.warning(
            "Train oder Test leer - ueberspringe Spieltag %s", gw
        )  # Warnung fuer fehlende Daten
        return None  # Kein Ergebnis fuer diesen Spieltag
    if "points" not in test.columns:  # Punktsaeule zwingend noetig
        logging.warning(
            "Spalte 'points' fehlt fuer Spieltag %s", gw
        )  # Warnhinweis fuer Anwender
        return None  # Ohne Punkte keine Bewertung

    test = add_baseline_a1_points(train, test)  # Baseline A1 berechnen und anreichern
    test = add_baseline_a2_points(train, test)  # Baseline A2 berechnen und anreichern
    model_pred = try_model_predict(
        train, test, season=season, random_state=random_state
    )  # Optionales Modell ausfuehren
    if model_pred.isna().all():  # Falls keine gueltigen Modellwerte vorhanden
        logging.info(
            "Kein Modell-Output gefunden - nutze A1 als Ersatz"
        )  # Hinweis auf Fallback
        model_pred = test["baseline_a1_points"].fillna(
            0.0
        )  # Baseline A1 als Ersatzvorhersage
    test["model_points_pred"] = (
        model_pred.values
    )  # Prognose im Test-DataFrame speichern

    rows_player: List[Dict[str, object]] = []  # Liste fuer MAE-Ergebnisse je Variante
    for label, column in [  # Fuer Modell sowie A1 und A2
        ("model", "model_points_pred"),
        ("A1", "baseline_a1_points"),
        ("A2", "baseline_a2_points"),
    ]:
        rows_player.append(  # Gesamtergebnis fuer alle Positionen erfassen
            {
                "season": season,  # Saison hinterlegen
                "gw": gw,  # Spieltag hinterlegen
                "who": label,  # Name der Variante
                "position": "ALL",  # Kennzeichnung fuer Gesamtwert
                "mae": mae(
                    test["points"].values, test[column].values
                ),  # MAE fuer alle Spieler
            }  # Ende des Dictionary-Eintrags
        )  # Ende des append-Aufrufs
        if "position" in test.columns:  # Falls Positionsinfo vorhanden ist
            for pos, sub in test.groupby("position"):  # Ueber jede Position iterieren
                rows_player.append(
                    {
                        "season": season,  # Saison im Ergebnis belassen
                        "gw": gw,  # Spieltag speichern
                        "who": label,  # Variante speichern
                        "position": pos,  # Konkrete Position
                        "mae": mae(
                            sub["points"].values, sub[column].values
                        ),  # MAE fuer die Position
                    }  # Abschluss des Blockes
                )  # Abschluss der Positionsschleife

    cand = test.copy()  # Kandidatenliste fuer Teamauswahl aufbauen
    cand = add_team_baseline_b1_score(cand, train)  # Team-Baseline B1 berechnen
    cand = add_team_baseline_b2_score(cand, train)  # Team-Baseline B2 berechnen

    def _select_team(
        score_col: str, allowed_formations: List[str]
    ) -> Tuple[str, Dict]:  # Hilfsfunktion fuer Teamwahl
        frame = cand.assign(
            pred_points=cand[score_col].fillna(0.0)
        )  # Zielspalte als Prognosepunkte setzen
        if formation_mode == "auto":  # Wenn Auto-Modus aktiv ist
            return choose_best_formation(
                frame, allowed_formations
            )  # Beste Formation suchen
        return formation_mode, build_team(
            frame, formation=formation_mode
        )  # Sonst feste Formation nutzen

    try:
        best_form, model_team = _select_team(
            "model_points_pred", ALLOWED_FORMATIONS
        )  # Modell-Team bestimmen
    except Exception as exc:  # Falls Teambau scheitert
        logging.warning("Konnte Modell-Team nicht bauen: %s", exc)  # Warnung ausgeben
        best_form = (
            formation_mode if formation_mode != "auto" else ALLOWED_FORMATIONS[0]
        )  # Ersatzformation definieren
        model_team = {
            "start_xi": [],
            "captain": None,
            "vice_captain": None,
            "bench": [],
        }  # Leeres Team als Fallback

    try:
        _, team_b1 = _select_team(
            "team_b1_score", ALLOWED_FORMATIONS
        )  # Team fuer Baseline B1 bauen
    except Exception as exc:  # Fehlerfall auffangen
        logging.warning("Konnte B1-Team nicht bauen: %s", exc)  # Warnhinweis schreiben
        team_b1 = {"start_xi": [], "captain": None}  # Leeres Team als Ersatz

    try:
        _, team_b2 = _select_team(
            "team_b2_score", ALLOWED_FORMATIONS
        )  # Team fuer Baseline B2 bauen
    except Exception as exc:  # Fehlerfall auffangen
        logging.warning("Konnte B2-Team nicht bauen: %s", exc)  # Warnhinweis schreiben
        team_b2 = {"start_xi": [], "captain": None}  # Leeres Team als Ersatz

    def team_real_points(
        team_dict: Dict,
    ) -> float:  # Reale Punkte fuer ein Team berechnen
        start = team_dict.get("start_xi", [])  # Startelf aus dem Dictionary holen
        if not start:  # Falls keine Spieler vorhanden sind
            return 0.0  # Kein Punktwert moeglich
        start_ids = [
            p.get("player_id") for p in start
        ]  # Spieler-IDs der Startelf sammeln
        captain_id = team_dict.get("captain", {}).get(
            "player_id"
        )  # Kapitaens-ID auslesen
        result = 0.0  # Akkumulator fuer Gesamtpunkte
        for _, row in test[
            test["player_id"].isin(start_ids)
        ].iterrows():  # Nur Spieler der Startelf betrachten
            pts = float(row.get("points", 0.0))  # Tatsachenpunkte des Spielers
            if (
                captain_id is not None and row.get("player_id") == captain_id
            ):  # Kapitaen zaehlt doppelt
                pts *= 2  # Punkte verdoppeln
            result += pts  # Punkte aufsummieren
        return result  # Gesamtpunkte zurueckgeben

    rows_team = {
        "season": season,  # Saison merken
        "gw": gw,  # Spieltag merken
        "formation": best_form,  # Genutzte Formation vermerken
        "model_team_points": team_real_points(
            model_team
        ),  # Reale Punkte des Modellteams
        "b1_team_points": team_real_points(team_b1),  # Reale Punkte des B1-Teams
        "b2_team_points": team_real_points(team_b2),  # Reale Punkte des B2-Teams
    }  # Abschluss des Blockes
    return (
        pd.DataFrame(rows_player),
        rows_team,
    )  # Rueckgabe der Spieler- und Teamresultate


def evaluate_span(  # Hauptschleife ueber alle Spieltage
    df: pd.DataFrame,
    season: str,
    gw_start: int,
    gw_end: int,
    formation_mode: str,
    out_dir: Path,
    plots_dir: Path,
    random_state: int,
    dry_run: bool,
) -> None:
    ensure_dirs(out_dir, plots_dir)  # Sicherstellen, dass Ausgabepfade existieren
    player_rows: List[pd.DataFrame] = []  # Sammelbehälter fuer Spieler-Metriken
    team_rows: List[Dict[str, float]] = []  # Sammelbehälter fuer Team-Metriken

    for gw in range(gw_start, gw_end + 1):  # Schleife ueber alle Zielspieltage
        result = _evaluate_gw(
            df, season, gw, formation_mode, random_state
        )  # Einzelspieltag berechnen
        if result is None:  # Falls Spieltag ausgelassen wurde
            continue  # Naechsten Spieltag ansehen
        player_rows.append(result[0])  # Spieler-Metriken hinzufuegen
        team_rows.append(result[1])  # Team-Metriken hinzufuegen

    player_df = (
        pd.concat(player_rows, ignore_index=True) if player_rows else pd.DataFrame()
    )  # Tabellen zusammenfuehren
    team_df = pd.DataFrame(team_rows)  # Teamresultate in DataFrame verwandeln

    if dry_run:  # Im Trockenlauf nichts abspeichern
        logging.info(
            "Trockenlauf aktiv - ueberspringe das Speichern von Artefakten"
        )  # Hinweis fuer Anwender
    else:
        save_table(player_df, out_dir / "player_mae.csv")  # Spielermae-Tabelle sichern
        save_table(team_df, out_dir / "team_points.csv")  # Teampunkte-Tabelle sichern

    run_meta = {
        "season": season,  # Saison fuer Nachvollziehbarkeit
        "gw_start": gw_start,  # Startspieltag dokumentieren
        "gw_end": gw_end,  # Endspieltag dokumentieren
        "formation_mode": formation_mode,  # Genutzter Formationsmodus
        "random_state": random_state,  # Zufallsbasis
        "gws_evaluated": (
            sorted(team_df["gw"].tolist()) if not team_df.empty else []
        ),  # Aufgelistete Spieltage
        "dry_run": dry_run,  # Kennzeichnung ob Trockenlauf
    }  # Abschluss des Blockes
    if not dry_run:  # Nur im echten Lauf Metadaten speichern
        save_json(run_meta, out_dir / "run_settings.json")  # Konfiguration sichern

    if dry_run:  # Bei Trockenlauf hier stoppen
        return  # Keine Plots anlegen

    try:
        import matplotlib.pyplot as plt

        # ----- PLAYER MAE -----
        if not player_df.empty:
            # Absoluter MAE (mit Zahlen über den Balken)
            fig = plt.figure()
            ax = plt.gca()
            summary = (
                player_df[player_df["position"] == "ALL"]
                .groupby("who")["mae"]
                .mean()
                .sort_values()
            )
            summary.plot(kind="bar", ax=ax)
            ax.set_ylabel("MAE (Ø über Zeitraum)")
            for i, v in enumerate(summary.values):
                ax.text(i, v, f"{v:.2f}", ha="center", va="bottom")
            save_plot(fig, plots_dir / "player_mae_bar.png")

            # Δ zu A1 (negativ = besser als A1) -> zeigt Unterschiede sofort
            base = summary.get("A1", summary.iloc[0])
            delta = summary - base
            fig2 = plt.figure()
            ax2 = plt.gca()
            delta.plot(kind="bar", ax=ax2)
            ax2.axhline(0, linewidth=1)
            ax2.set_ylabel("Δ MAE vs A1 (↓ = besser)")
            for i, v in enumerate(delta.values):
                ax2.text(
                    i, v, f"{v:+.2f}", ha="center", va="bottom" if v >= 0 else "top"
                )
            save_plot(fig2, plots_dir / "player_mae_delta_vs_A1.png")

        # ----- TEAM PUNKTE -----
        if not team_df.empty:
            series = {
                "model_team_points": "Model",
                "b1_team_points": "B1",
                "b2_team_points": "B2",
            }
            ymin = team_df[list(series.keys())].min().min()
            ymax = team_df[list(series.keys())].max().max()
            pad = max(1.0, 0.05 * (ymax - ymin))

            if team_df["gw"].nunique() < 3:
                # Wenige GWs -> gruppiertes Balkendiagramm mit Zahlen
                fig = plt.figure()
                ax = plt.gca()
                gws = team_df["gw"].to_numpy()
                idx = np.arange(len(gws))
                width = 0.25
                for j, (col, label) in enumerate(series.items()):
                    vals = team_df[col].to_numpy()
                    ax.bar(idx + j * width, vals, width, label=label)
                    for i, val in enumerate(vals):
                        ax.text(
                            idx[i] + j * width,
                            val,
                            f"{val:.1f}",
                            ha="center",
                            va="bottom",
                        )
                ax.set_xticks(idx + width)
                ax.set_xticklabels(gws)
                ax.set_xlabel("GW")
                ax.set_ylabel("Reale Team-Punkte")
                ax.set_ylim(ymin - pad, ymax + pad)
                ax.legend()
                save_plot(fig, plots_dir / "team_points_bar.png")
            else:
                # Viele GWs -> Linien + Marker + Werte
                fig = plt.figure()
                ax = plt.gca()
                for col, label in series.items():
                    ax.plot(team_df["gw"], team_df[col], marker="o", label=label)
                    for x, y in zip(team_df["gw"], team_df[col]):
                        ax.annotate(
                            f"{y:.1f}",
                            (x, y),
                            textcoords="offset points",
                            xytext=(0, 5),
                            ha="center",
                        )
                ax.set_xlabel("GW")
                ax.set_ylabel("Reale Team-Punkte")
                ax.set_ylim(ymin - pad, ymax + pad)
                ax.legend()
                save_plot(fig, plots_dir / "team_points_over_gw.png")

    except Exception as exc:
        logging.warning("Plotten übersprungen: %s", exc)


if __name__ == "__main__":  # Nur ausfuehren wenn Datei direkt gestartet wird
    args = parse_args()  # CLI-Argumente einlesen
    out_dir = Path(args.out)  # Ausgabepfad in Path umwandeln
    plots_dir = Path(args.plots)  # Plotpfad in Path umwandeln
    if (
        args.formation != "auto" and args.formation not in ALLOWED_FORMATIONS
    ):  # Formation gueltig?
        logging.error(
            "Unbekannte Formation: %s", args.formation
        )  # Fehlermeldung ausgeben
        raise SystemExit(1)  # Programm beenden
    ensure_dirs(out_dir, plots_dir)  # Verzeichnisse anlegen

    data = load_player_gameweeks(args.season)  # Spielerdaten laden
    if data.empty:  # Falls keine Daten vorhanden sind
        logging.warning(
            "Keine Daten geladen - erzeuge Dummy-Outputs und beende."
        )  # Hinweis ausgeben
        if not args.dry_run:  # Nur Dateien schreiben falls kein Trockenlauf
            save_table(  # Leere Spielerdatei anlegen
                pd.DataFrame(columns=["season", "gw", "who", "position", "mae"]),
                out_dir / "player_mae.csv",
            )
            save_table(  # Leere Teamdatei anlegen
                pd.DataFrame(
                    columns=[
                        "season",
                        "gw",
                        "formation",
                        "model_team_points",
                        "b1_team_points",
                        "b2_team_points",
                    ]
                ),
                out_dir / "team_points.csv",
            )
            save_json(  # Metadaten zum Lauf sichern
                {
                    "season": args.season,
                    "gw_start": args.gw_start,
                    "gw_end": args.gw_end,
                    "formation_mode": args.formation,
                    "random_state": args.random_state,
                    "gws_evaluated": [],
                    "dry_run": args.dry_run,
                    "hinweis": "keine daten verfuegbar",
                },  # Abschluss des Blockes mit Komma
                out_dir / "run_settings.json",
            )
        raise SystemExit(0)  # Programm sauber beenden

    evaluate_span(  # Hauptauswertung starten
        data,
        args.season,
        args.gw_start,
        args.gw_end,
        args.formation,
        out_dir,
        plots_dir,
        args.random_state,
        args.dry_run,
    )
