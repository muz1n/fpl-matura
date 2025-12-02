# Code-Struktur-Übersicht

## ✅ Hauptskripte (BEHALTEN)

### Modell-Training & Vorhersage (code/models/)
- **make_predictions.py**: Haupt-Skript für Prognosen (rf, ma3, pos) ✅
- **filled_model.py**: Kombinierte Vorhersagen (rf_filled) mit Fallback-Logik ✅
- **baseline_model.py**: Random Forest Baseline-Modell ✅
- **position_model.py**: Positionsspezifische RF-Modelle ✅
- **moving_average_model.py**: Ranking-optimiertes RF-Modell ✅

### Evaluation (code/evaluation/)
- **evaluate.py**: Haupt-Evaluation (MAE, RMSE, Spearman) ✅
- **team_backtest.py**: Team-Performance-Test ✅
- **error_analysis.py**: Fehleranalyse und Visualisierung ✅

### Hilfsskripte (code/analysis/)
- **mvp_picker.py**: Cold-Start-Heuristik (MVP-Auswahl) ✅
- **compute_team_def_metrics_cli.py**: Team-Defensive-Metriken ✅
- **team_def_cli.py**: CLI für Team-Defense ✅

## ⚠️ Spezial-Skripte (BEHALTEN, aber dokumentieren)

### Hyperparameter-Tuning (nur für DEF/FWD nötig)
- **rf_pos_tuning_def.py**: Tuning für Verteidiger ⚠️
- **rf_pos_tuning_fwd.py**: Tuning für Stürmer ⚠️
- **rf_pos_tuning_mid.py**: Tuning für Mittelfeld (nicht verwendet, da Standard-Params) ⚠️

**Hinweis:** Diese wurden nur einmal ausgeführt, um optimale Hyperparameter zu finden. Die Ergebnisse sind in `position_model.py` hardcoded. **Können archiviert werden.**

### Alternative Evaluation-Skripte (code/evaluation/)
- **evaluate_methods.py**: Alternative zu evaluate.py (ähnliche Funktionalität) ⚠️
- **evaluate_predictions.py**: Detaillierte Prognose-Bewertung (Kalibrierung, Residuen) ⚠️
- **evaluate_lineup.py**: Lineup-Bewertung (anders als team_backtest.py) ⚠️
- **evaluate_ab_opp_strength.py**: A/B-Test für Gegnerstärke-Features ⚠️

**Hinweis:** Diese sind **spezifisch** und werden **nicht regelmässig** gebraucht. Sollten bleiben, aber klar als "Advanced" markiert.

## 📁 Ordner-Struktur

### code/features/
- **make_features.py**: Feature-Engineering-Logik ✅

### code/lineup/
- **auto_formation_cli.py**: CLI für Auto-Formation ✅
- **auto_formation_cli_v2.py**: Version 2 der Auto-Formation ⚠️ (Duplikat?)

### code/pipeline/
- **make_gw.py**: Pipeline für Gameweek-Daten ✅

### code/utils/
- Hilfsfunktionen (z.B. data_io.py) ✅

## 🗑️ Archiv (bereits in archive/)
- **cold_start_offline.py**: Alter Cold-Start-Prototyp (nicht mehr verwendet) 🗑️

## 📋 Empfohlene Aktionen

### Sofort
1. ✅ Tests nach tests/ verschieben (ERLEDIGT)
2. ✅ Demos nach docs/examples/ verschieben (ERLEDIGT)
3. ✅ __init___1.py löschen (ERLEDIGT)
4. ✅ .gitignore erweitern (ERLEDIGT)

### Nächste Schritte
5. ⚠️ **rf_pos_tuning_*.py** nach `code/archive/tuning/` verschieben (da nur einmal verwendet)
6. ⚠️ **auto_formation_cli_v2.py** prüfen: Duplikat oder aktive Version?
7. ⚠️ README in code/ aktualisieren (welches Skript für was?)

### Optional (für finale Arbeit)
8. Alle Skripte mit Header-Kommentaren versehen
9. Docstrings vervollständigen
10. Ungenutzte Skripte in docs/ dokumentieren (warum existieren sie?)
