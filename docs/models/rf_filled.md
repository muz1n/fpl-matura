# rf_filled Implementation

## Übersicht

`rf_filled` ist eine neue Vorhersage-Variante, die RF-Vorhersagen mit MA3 und POS auffüllt, um vollständige Coverage zu erreichen und "Selection failed" Probleme zu minimieren.

## Funktionsweise

**Fallback-Hierarchie:**
1. **RF (RandomForest)**: Primäre Vorhersagen werden verwendet wenn verfügbar
2. **MA3 (Moving Average 3)**: Fallback wenn RF fehlt
3. **POS (Position Models)**: Fallback wenn RF und MA3 fehlen

## Dateien

- `code/models/filled_model.py`: Hauptskript zur Erstellung von rf_filled Vorhersagen
- `generate_rf_filled.bat`: Batch-Skript für Massen-Generierung
- `code/evaluation/team_backtest.py`: Erweitert um rf_filled Support

## Verwendung

### Einzelne Gameweek

```bash
# 1. Erstelle RF, MA3 und POS Vorhersagen
python code/models/make_predictions.py --season 2022-23 --gw 30 --method rf
python code/models/make_predictions.py --season 2022-23 --gw 30 --method ma3
python code/models/make_predictions.py --season 2022-23 --gw 30 --method pos

# 2. Erstelle rf_filled Vorhersagen
python code/models/filled_model.py --season 2022-23 --gw 30
```

### Komplette Saison

```bash
# 1. Generiere Basis-Vorhersagen (RF, MA3, POS)
generate_predictions_multi_season.ps1 -Season "2022-23" -GwStart 2 -GwEnd 38

# 2. Generiere rf_filled Vorhersagen
generate_rf_filled.bat 2022-23 2 38
```

### Backtest mit rf_filled

```bash
# Einzelne Methode
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf_filled

# Vergleich mit anderen Methoden
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf ma3 pos rf_filled
```

## Ausgabe-Format

rf_filled Vorhersagen werden gespeichert als:
```
out/predictions_<season>_gw<gw>_rf_filled.json
```

Struktur identisch zu RF/MA3/POS:
```json
{
  "season": "2022-23",
  "gw": 30,
  "method": "rf_filled",
  "generated_at": "2025-01-22T10:30:00Z",
  "players": [
    {
      "player_id": 123,
      "name": "Player Name",
      "pos": "MID",
      "team": "ARS",
      "predicted_points": 5.2,
      "price": 7.5,
      "filled_source": "rf"  // Zusätzliches Metadaten-Feld
    }
  ],
  "stats": {  // Zusätzliche Statistik
    "rf": 450,
    "ma3": 30,
    "pos": 20,
    "missing": 0
  }
}
```

## Erwartete Verbesserungen

1. **Höhere Erfolgsrate bei Team-Selection**: Weniger "Selection failed" durch vollständige Coverage
2. **Bessere Gesamt-Performance**: RF-Vorhersagen wo möglich, MA3/POS als sinnvoller Fallback
3. **Robustheit**: Funktioniert auch wenn einzelne Methoden für bestimmte Spieler fehlschlagen

## Beispiel-Workflow für Full-Season Backtest

```bash
# Schritt 1: Alle Basis-Vorhersagen generieren (falls noch nicht vorhanden)
.\generate_predictions_multi_season.ps1 -Season "2022-23" -GwStart 2 -GwEnd 38

# Schritt 2: rf_filled Vorhersagen generieren
.\generate_rf_filled.bat 2022-23 2 38

# Schritt 3: Backtest durchführen
python code\evaluation\team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf ma3 pos rf_filled
```

## Technische Details

- **Keine Model-Änderungen**: RF, MA3 und POS bleiben unverändert
- **Output-Only Kombination**: Nur finale Vorhersagen werden kombiniert
- **Identisches Format**: Kompatibel mit allen bestehenden Evaluation-Tools
- **Transparenz**: `filled_source` Feld dokumentiert Herkunft jeder Vorhersage
