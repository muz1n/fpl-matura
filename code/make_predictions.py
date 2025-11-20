#!/usr/bin/env python3
# Dieses Skript erstellt Vorhersagen für die Punktzahl von Fussballspielern in einer bestimmten Spielwoche.
# Es nutzt verschiedene Methoden (RandomForest, gleitender Durchschnitt, Positionsmittelwert) und verwendet nur Daten aus der gewählten Saison.
# Die Ergebnisse werden als JSON-Datei gespeichert und können für Analysen oder Vergleiche genutzt werden.

"""Erstelle Vorhersagen für eine bestimmte Spielwoche (rf | ma3 | pos).

Unterschiedliche Methoden und strenge Saisonbegrenzung:
- Liest nur data/merged_gw_<season>.csv (meldet klaren Fehler, falls Datei fehlt)
- Verwendet nur Zeilen aus dieser Saisondatei; keine Verknüpfungen mit anderen Saisons
- Spielerpool für gw = Spieler, die in dieser Saison vor der Spielwoche schon aufgetaucht sind

Methoden:
- rf: RandomForest auf verschobenen, gleitenden Merkmalen aus vergangenen Spielwochen (< gw)
- ma3: Spieler-Durchschnitt der letzten 3 Spielwochen strikt vor gw
- pos: Positionsmittelwert der letzten 5 Spielwochen strikt vor gw

Verwendung:
    python code/make_predictions.py --season 2022-23 --gw 30 --methode rf
    python code/make_predictions.py --season 2022-23 --gw 30 --methode ma3
    python code/make_predictions.py --season 2022-23 --gw 30 --methode pos
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PredictionMethod = Literal["rf", "ma3", "pos"]


def _to_float(val: Any) -> float:
    """Wandelt einen Wert möglichst in float um; gibt np.nan zurück bei Fehler."""
    try:
        import pandas as pd  # local to avoid global when not available in env

        if isinstance(val, pd.Series):
            val = val.iloc[0] if len(val) > 0 else np.nan
    except Exception:
        pass
    try:
        # Convert to a numpy array of floats and extract a scalar value.
        # This safely handles scalars, numpy arrays and pandas objects.
        arr = np.asarray(val, dtype=float)
        if arr.size == 0:
            return np.nan
        return float(arr.item())
    except (TypeError, ValueError):
        return np.nan
    except Exception:
        return np.nan


def load_season_data(season: str) -> pd.DataFrame:
    """Lädt die Saison-Datei ausschliesslich für die angegebene Saison.

    Bevorzugt bereinigte Dateien (cleaned_merged_gw_*.csv) um Duplikate zu vermeiden.
    Falls nicht vorhanden, nutzt Original-Datei mit Warnung.

    Prüft Datenqualität: Seasons vor 2020-21 werden abgelehnt wegen fehlender Position-Daten.
    """
    # Qualitätsprüfung: Season muss >= 2020-21 sein
    quality_path = DATA_DIR / "season_quality.json"
    if quality_path.exists():
        with open(quality_path, "r", encoding="utf-8") as f:
            quality_data = json.load(f)
            season_info = quality_data["seasons"].get(season)
            if season_info and not season_info["usable"]:
                raise SystemExit(
                    f"❌ FEHLER: Season {season} kann nicht verwendet werden.\n"
                    f"   Grund: {season_info['reason']}\n"
                    f"   Empfehlung: Verwende Seasons ab 2020-21 (vollständige Daten)."
                )

    # Bevorzuge bereinigte Datei
    cleaned_path = DATA_DIR / f"cleaned_merged_gw_{season}.csv"
    original_path = DATA_DIR / f"merged_gw_{season}.csv"

    if cleaned_path.exists():
        csv_path = cleaned_path
        print(f"Lade bereinigte Daten von: {csv_path}")
    elif original_path.exists():
        csv_path = original_path
        print(f"⚠ Lade Original-Daten (mit möglichen Duplikaten): {csv_path}")
        print(
            "  Hinweis: Führe 'python tools/cleanup_season_data.py' aus um bereinigte Daten zu erstellen"
        )
    else:
        raise SystemExit(
            f"FEHLER: Saison-Datei für '{season}' wurde nicht gefunden.\n"
            f"Erwartete Dateien:\n"
            f"  - {cleaned_path.name} (bevorzugt)\n"
            f"  - {original_path.name}\n"
            f"Bitte stelle sicher, dass die Datei unter {DATA_DIR} existiert."
        )

    df = pd.read_csv(csv_path)

    # Standardisiere wichtige Spalten
    rename_map = {
        "element": "player_id",
        "id": "player_id",
        "round": "gw",
        "event": "gw",
        "GW": "gw",
        "total_points": "points",
        "value": "price",
        "now_cost": "price",
        "was_home": "home",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Entferne doppelte Spalten nach Umbenennung (behalte die erste)
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()].copy()

    # Numerische Umwandlung
    for col in [
        "player_id",
        "gw",
        "points",
        "minutes",
        "price",
        "ict_index",
        "influence",
        "creativity",
        "threat",
        "home",
    ]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Preis normalisieren, falls in 10er-Einheiten gespeichert
    if "price" in df.columns:
        med = df["price"].dropna().median()
        if pd.notna(med) and med > 25:
            df["price"] = df["price"] / 10.0

    # Position normalisieren
    if "pos" not in df.columns:
        if "position" in df.columns:
            df["pos"] = (
                df["position"]
                .astype(str)
                .str.upper()
                .map(
                    {"GKP": "GK", "GK": "GK", "DEF": "DEF", "MID": "MID", "FWD": "FWD"}
                )
                .fillna(df["position"].astype(str))
            )
        elif "element_type" in df.columns:
            df["pos"] = (
                df["element_type"]
                .map({1: "GK", 2: "DEF", 3: "MID", 4: "FWD"})
                .fillna("MID")
            )
        else:
            df["pos"] = "MID"

    # Team normalisieren
    if "team" not in df.columns:
        for c in ["team_short", "team_name", "team_h", "team_a"]:
            if c in df.columns:
                df["team"] = df[c].astype(str)
                break
    if "team" not in df.columns:
        df["team"] = "UNK"

    # Name als Fallback
    if "name" not in df.columns:
        df["name"] = "Unknown"

    # Stelle sicher, dass Spieler-ID und Spielwoche Integer sind
    if "player_id" in df.columns:
        df = df[df["player_id"].notna()].copy()
        df["player_id"] = df["player_id"].astype(int)
    if "gw" in df.columns:
        df = df[df["gw"].notna()].copy()
        df["gw"] = df["gw"].astype(int)

    # Sortiere nach Spieler und Spielwoche für gleitende Berechnungen
    df = df.sort_values(["player_id", "gw"]).reset_index(drop=True)
    return df


def get_pool_for_gw(df: pd.DataFrame, gw: int) -> list[int]:
    """Spieler, die vor der angegebenen Spielwoche in dieser Saison schon existierten.

    Warnt wenn weniger als 600 Spieler vorhanden (abgesagte/verschobene Spiele).
    """
    if "player_id" not in df.columns or "gw" not in df.columns:
        return []

    pool = df[df["gw"] == gw]["player_id"].dropna().unique().tolist()

    # Warne bei niedriger Spielerzahl (wahrscheinlich abgesagte Spiele)
    if len(pool) < 600:
        print(f"⚠️ WARNUNG: Nur {len(pool)} Spieler für GW{gw} verfügbar (< 600)")
        print(
            "   Möglicher Grund: Abgesagte oder verschobene Spiele in dieser Spielwoche"
        )
        print("   Die Vorhersagequalität kann beeinträchtigt sein.")

    return pool
    pool = df.loc[df["gw"] < gw, "player_id"].dropna().astype(int).unique().tolist()
    return pool


def build_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Fügt r3-gleitende Merkmale hinzu, um 1 verschoben (keine Informationsleckage).

    WICHTIG: Behält Metadaten-Spalten (pos, name, team, price) im DataFrame.
    """
    roll_cols = [
        c
        for c in ["points", "minutes", "ict_index", "influence", "creativity", "threat"]
        if c in df.columns
    ]
    df = df.copy()

    # Rolling features berechnen
    for col in roll_cols:
        df[f"{col}_r3"] = (
            df.groupby("player_id")[col].shift(1).rolling(3, min_periods=1).mean()
        )

    # Points per 90 berechnen
    if set(["points_r3", "minutes_r3"]).issubset(df.columns):
        with np.errstate(divide="ignore", invalid="ignore"):
            df["points_per90_r3"] = (
                df["points_r3"] / df["minutes_r3"].replace(0, np.nan)
            ) * 90

    # Stelle sicher, dass Metadaten-Spalten vorhanden sind
    # (pos, name, team, price sollten bereits von load_season_data() vorhanden sein)
    return df


def train_rf_model(
    df: pd.DataFrame, gw_target: int
) -> tuple[RandomForestRegressor, list[str]]:
    """Trainiert RandomForest nur mit Zeilen gw < gw_target in DIESER Saison.

    Ziel = Punkte der aktuellen Zeile; Merkmale sind verschobene gleitende Mittelwerte.
    """
    # Gleitende Merkmale berechnen
    df_feats = build_rolling_features(df)

    # Mögliche Merkmale (nur vorhandene werden genutzt)
    feature_candidates = [
        "price",
        "minutes_r3",
        "points_r3",
        "points_per90_r3",
        "ict_index_r3",
        "influence_r3",
        "creativity_r3",
        "threat_r3",
        "home",  # may be missing
        "opp_strength",  # likely missing
    ]
    features = [c for c in feature_candidates if c in df_feats.columns]

    # Trainingsdaten: nur Zeilen strikt vor Ziel-Spielwoche und mit Punktewert
    train_df = df_feats[
        (df_feats["gw"] < gw_target) & df_feats["points"].notna()
    ].copy()
    # Mindestens ein nicht-NaN-Merkmal erforderlich
    if not features:
        # Fallback to price if available, else zero vector
        if "price" in df_feats.columns:
            features = ["price"]
        else:
            df_feats["const"] = 0.0
            features = ["const"]

    # Einfache Validierung: letzte 10% der Spielwochen vor Ziel als Validierung
    if len(train_df) > 0:
        min_gw = int(train_df["gw"].min())
        max_gw = int(train_df["gw"].max())
        val_split_gw = max(min_gw, max_gw - max(1, (max_gw - min_gw) // 10))
        val_df = train_df[train_df["gw"] >= val_split_gw]
        tr_df = train_df[train_df["gw"] < val_split_gw]
    else:
        tr_df = train_df
        val_df = train_df

    X_tr = tr_df[features].fillna(0.0).to_numpy(dtype=float)
    y_tr = tr_df["points"].to_numpy(dtype=float)
    X_val = val_df[features].fillna(0.0).to_numpy(dtype=float)
    y_val = val_df["points"].to_numpy(dtype=float)

    print(f"Trainingsbeispiele: {len(X_tr)}, Validierungsbeispiele: {len(X_val)}")

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    if len(X_tr) > 0:
        model.fit(X_tr, y_tr)
        if len(X_val) > 0:
            y_pred = model.predict(X_val)
            mae = mean_absolute_error(y_val, y_pred)
            print(f"Validation MAE: {mae:.3f}")
    else:
        # Triviales Modell fitten, um Fehler zu vermeiden
        model.fit(np.zeros((1, len(features))), np.array([0.0]))

    return model, features


def predict_positional(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """POS-Baseline: Durchschnittliche Punkte pro Position über die letzten 5 Spielwochen vor gw."""
    window = 5
    hist = df[(df["gw"] < gw) & (df["gw"] >= gw - window)].copy()
    pos_means = hist.groupby("pos")["points"].mean().to_dict() if not hist.empty else {}
    global_mean = float(hist["points"].mean()) if not hist.empty else 0.0

    # Spieler-Metadaten per gw-1
    last_meta = (
        df[df["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id")
        .tail(1)
        .set_index("player_id")
    )

    rows = []
    for pid in pool:
        if pid in last_meta.index:
            s = last_meta.loc[pid]
            # Position sicher extrahieren: falls Series/ndarray, nehme erstes Element
            pos_val = s.get("pos", "MID")
            if isinstance(pos_val, (pd.Series, np.ndarray)):
                try:
                    il = getattr(pos_val, "iloc", None)
                    pos_val = il[0] if il is not None else pos_val[0]
                except Exception:
                    pos_val = "MID"
            if pd.isna(pos_val) or (
                isinstance(pos_val, str) and pos_val.strip() in ("", "nan", "")
            ):
                pos = "MID"
            else:
                pos = str(pos_val)
            price_val = s.get("price", np.nan)
            price = _to_float(price_val)
            name = str(s.get("name", f"Player {pid}"))
            team = str(s.get("team", "UNK"))
        else:
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"
        pred = float(pos_means.get(pos, global_mean))
        rows.append(
            {
                "player_id": pid,
                "name": name,
                "team": team,
                "pos": pos,
                "price": price,
                "predicted_points": pred,
            }
        )

    return pd.DataFrame(rows)


def predict_ma3(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """MA3-Baseline: Spieler-Durchschnitt der letzten bis zu 3 Spielwochen strikt vor gw."""
    g = df.sort_values(["player_id", "gw"]).copy()
    g["points_ma3"] = (
        g.groupby("player_id")["points"].shift(1).rolling(3, min_periods=1).mean()
    )

    last_meta = (
        g[g["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id")
        .tail(1)
        .set_index("player_id")
    )

    rows = []
    for pid in pool:
        pred = 0.0
        if pid in last_meta.index and "points_ma3" in last_meta.columns:
            val = last_meta.at[pid, "points_ma3"]
            pred_val = _to_float(val)
            if not np.isnan(pred_val):
                pred = pred_val

        if pred == 0.0:
            # Fallback: Mittelwert der verfügbaren Historie vor gw
            hist_points = g.loc[
                (g["player_id"] == pid) & (g["gw"] < gw), "points"
            ].dropna()
            pred = float(hist_points.mean()) if len(hist_points) > 0 else 0.0

        if pid in last_meta.index:
            s = last_meta.loc[pid]
            # Position sicher extrahieren
            pos_val = s.get("pos", "MID")
            if pd.isna(pos_val) or str(pos_val).strip() in ("", "nan"):  # type: ignore
                pos = "MID"
            else:
                pos = str(pos_val)
            price_val = s.get("price", np.nan)
            price = _to_float(price_val)
            name = str(s.get("name", f"Player {pid}"))
            team = str(s.get("team", "UNK"))
        else:
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"

        rows.append(
            {
                "player_id": pid,
                "name": name,
                "team": team,
                "pos": pos,
                "price": price,
                "predicted_points": pred,
            }
        )

    return pd.DataFrame(rows)


def predict_rf(df: pd.DataFrame, gw: int, pool: list[int]) -> pd.DataFrame:
    """RandomForest-Modell, trainiert auf dieser Saison mit Zeilen gw < Ziel-Spielwoche."""
    model, features = train_rf_model(df, gw)

    df_feats = build_rolling_features(df)
    # Merkmals-Snapshot per Spieler für gw-1
    snap = (
        df_feats[df_feats["gw"] < gw]
        .sort_values(["player_id", "gw"])
        .groupby("player_id")
        .tail(1)
        .set_index("player_id")
    )

    X = []
    meta = []
    for pid in pool:
        if pid in snap.index:
            row = snap.loc[pid]
            vals = []
            for col in features:
                v = _to_float(row[col]) if col in row else np.nan
                vals.append(0.0 if np.isnan(v) else v)
            X.append(vals)

            # Position aus row holen, aber NaN/None sicher behandeln
            pos_val = row.get("pos", "MID")
            if pd.isna(pos_val) or str(pos_val).strip() in ("", "nan"):  # type: ignore
                pos = "MID"
            else:
                pos = str(pos_val)

            price_val = row.get("price", np.nan)
            price = _to_float(price_val)
            name = str(row.get("name", f"Player {pid}"))
            team = str(row.get("team", "UNK"))
        else:
            X.append([0.0] * len(features))
            pos, price, name, team = "MID", np.nan, f"Player {pid}", "UNK"

        meta.append(
            {"player_id": pid, "name": name, "team": team, "pos": pos, "price": price}
        )

    X = np.asarray(X, dtype=float) if len(X) > 0 else np.zeros((0, len(features)))
    preds = model.predict(X) if len(X) > 0 else np.array([])

    rows = []
    for m, p in zip(meta, preds):
        rows.append({**m, "predicted_points": float(p)})
    return pd.DataFrame(rows)


def build_output(
    season: str,
    gw: int,
    method: str,
    pred_df: pd.DataFrame,
    season_player_ids: set[int],
) -> dict:
    """Wendet Saisonbegrenzung an und erstellt das JSON-Ausgabeformat."""
    df = pred_df.copy()
    # Saisonbegrenzung: entferne Spieler, die nicht in dieser Saison vorkommen
    before = len(df)
    df = df[df["player_id"].isin(season_player_ids)].copy()
    dropped = before - len(df)
    if dropped > 0:
        dropped_ids = sorted(set(pred_df["player_id"]) - season_player_ids)
        print(
            f"WARNING: Dropped {dropped} players not in season {season}: {dropped_ids[:5]}{'...' if len(dropped_ids)>5 else ''}"
        )

    # Felder und Standardwerte festlegen
    for c in ["name", "team", "pos"]:
        if c not in df.columns:
            df[c] = {"name": "Unknown", "team": "UNK", "pos": "MID"}[c]
    if "price" not in df.columns:
        df["price"] = np.nan

    df["predicted_points"] = pd.to_numeric(
        df["predicted_points"], errors="coerce"
    ).fillna(0.0)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")

    players = []
    for _, row in df.sort_values("predicted_points", ascending=False).iterrows():
        # Position sicher extrahieren (NaN → "MID")
        pos_val = row.get("pos", "MID")
        if pd.isna(pos_val) or (
            isinstance(pos_val, str) and pos_val.strip() in ("", "nan")
        ):
            pos = "MID"
        else:
            pos = str(pos_val)

        players.append(
            {
                "player_id": int(row["player_id"]),
                "name": str(row.get("name", "Unknown")),
                "pos": pos,
                "team": str(row.get("team", "UNK")),
                "predicted_points": round(float(row["predicted_points"]), 3),
                "price": (
                    0.0
                    if pd.isna(row.get("price", np.nan))
                    else round(float(row["price"]), 1)
                ),
            }
        )

    # Kontrolle: Ausgabe-Spieler-IDs sind Teil der Saison-IDs
    out_ids = {p["player_id"] for p in players}
    assert out_ids.issubset(
        season_player_ids
    ), "Season guard failed: output contains players not in this season."

    result = {
        "season": season,
        "gw": int(gw),
        "method": method,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "players": players,
    }
    # Kurze Statistik
    mean_pp = np.mean([p["predicted_points"] for p in players]) if players else 0.0
    print(
        f"Vorhergesagte Spieler: {len(players)} | Mittelwert(predicted_points)={mean_pp:.3f}"
    )
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Erstelle FPL-Vorhersagen (rf|ma3|pos) mit strenger Saisonbegrenzung"
    )
    parser.add_argument(
        "--season", type=str, required=True, help="Saison (z.B. 2022-23)"
    )
    parser.add_argument("--gw", type=int, required=True, help="Spielwochen-Nummer")
    # Unterstützt sowohl --method als auch --methode (Alias)
    parser.add_argument(
        "--method",
        "--methode",
        dest="method",
        type=str,
        default="rf",
        choices=["rf", "ma3", "pos"],
        help="Vorhersagemethode",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=OUT_DIR, help="Ausgabeverzeichnis"
    )

    args = parser.parse_args()

    print(
        f"Erstelle Vorhersagen für Saison {args.season}, Spielwoche {args.gw}, Methode: {args.method}"
    )

    # Lade ausschliesslich die Daten dieser Saison
    df = load_season_data(args.season)

    # Spielerpool aufbauen, die vor der Spielwoche schon aufgetaucht sind
    pool = get_pool_for_gw(df, args.gw)
    season_ids = set(df["player_id"].unique().tolist())
    print(f"Spielerpool für Spielwoche {args.gw}: {len(pool)} Spieler")

    # Vorhersage je nach Methode
    method = args.method.lower()
    if method == "pos":
        pred_df = predict_positional(df, args.gw, pool)
    elif method == "ma3":
        pred_df = predict_ma3(df, args.gw, pool)
    else:
        pred_df = predict_rf(df, args.gw, pool)

    # Ausgabe mit Saisonbegrenzung erstellen
    output = build_output(args.season, args.gw, method, pred_df, season_ids)

    # Neues konsistentes Dateischema mit Season-Prefix:
    # predictions_<season>_gw<gw>_<method>.json
    output_file = (
        args.output_dir / f"predictions_{args.season}_gw{args.gw}_{method}.json"
    )
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    print(f"\n✓ Vorhersagen wurden geschrieben nach: {output_file}")
    print("  Hinweis: Neues Schema mit Season-Prefix aktiv (kein Altmodus).")
    print(f"  Anzahl Spieler: {len(output['players'])}")
    if output["players"]:
        print("  Top 5 Vorhersagen:")
        for i, player in enumerate(output["players"][:5], 1):
            print(
                f"    {i}. {player['name']} ({player['pos']}) - {player['predicted_points']} Punkte"
            )


if __name__ == "__main__":
    main()
