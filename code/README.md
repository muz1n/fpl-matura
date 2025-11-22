# Code-Verzeichnis

Dieser Ordner enthält den gesamten Python-Code für ML-Modelle, Evaluation und Optimierung.

## 📁 Struktur

```
code/
├── models/             # ML-Modelle
├── evaluation/         # Evaluation & Backtests
├── analysis/           # Spezialanalysen
├── features/           # Feature-Engineering
├── lineup/             # Lineup-Optimierung
├── pipeline/           # Daten-Pipeline
├── utils/              # Hilfsfunktionen
└── archive/            # Alte/ungenutzte Skripte
```

## 🚀 Hauptskripte

### Modell-Training & Vorhersage (models/)
- **make_predictions.py**: Haupt-Skript für Prognosen (rf, ma3, pos)
  ```bash
  python code/models/make_predictions.py --season 2022-23 --gw 30 --methode rf
  ```

- **filled_model.py**: Kombinierte Vorhersagen (rf_filled) mit Fallback-Logik
  ```bash
  python code/models/filled_model.py --season 2022-23 --gw 30
  ```

- **baseline_model.py**: Random Forest Baseline-Modell
- **position_model.py**: Positionsspezifische RF-Modelle
- **moving_average_model.py**: Moving-Average-basiertes Modell

### Evaluation (evaluation/)
- **evaluate.py**: Haupt-Evaluation (MAE, RMSE, Spearman)
  ```bash
  python code/evaluation/evaluate.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf ma3 pos
  ```

- **team_backtest.py**: Team-Performance-Backtest
  ```bash
  python code/evaluation/team_backtest.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf ma3 pos rf_filled
  ```

- **error_analysis.py**: Fehleranalyse mit Visualisierung
  ```bash
  python code/evaluation/error_analysis.py
  ```

### Spezial-Evaluation (evaluation/, erweitert)
- **evaluate_predictions.py**: Detaillierte Prognose-Bewertung (Kalibrierung, Residuen)
- **evaluate_methods.py**: Methoden-Vergleich (ähnlich zu evaluate.py, detaillierter)
- **evaluate_lineup.py**: Lineup-Bewertung (Vergleich mit optimaler Aufstellung)
- **evaluate_ab_opp_strength.py**: A/B-Test für Gegnerstärke-Features

### Hilfsskripte (analysis/)
- **mvp_picker.py**: Cold-Start-Heuristik (MVP-Auswahl ohne historische Daten)
- **compute_team_def_metrics_cli.py**: Team-Defensive-Metriken berechnen
- **team_def_cli.py**: CLI für Team-Defense-Daten

## 📂 Unterordner

### features/
- **make_features.py**: Feature-Engineering-Logik (Rolling Means, etc.)

### lineup/
- **auto_formation_cli_v2.py**: Auto-Formation CLI (neueste Version)

### pipeline/
- **make_gw.py**: Pipeline für Gameweek-Daten

### utils/
- Hilfsfunktionen für Daten-IO, Team-Auswahl, etc.

### archive/
- Alte/ungenutzte Skripte (siehe `archive/README.md`)

## 📖 Weitere Dokumentation

- **CODE_STRUCTURE.md**: Detaillierte Übersicht aller Skripte
- **README_make_predictions.md**: Details zu make_predictions.py

