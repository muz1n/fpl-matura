# KI-Log (Transparenz)

Dieses Log hält kurz fest, wann und wie KI (z. B. Copilot) im Projekt eingesetzt wurde. Ziel: einfache Nachvollziehbarkeit für Lehrpersonen, ohne technische Überfrachtung. Neue Einträge können unten als weitere Tabellenzeilen ergänzt werden.

## Einträge
| Datum (YYYY-MM-DD) | Bereich/Datei | Tool | Tätigkeit/Zweck | Commit/Artefakte |
|---|---|---|---|---|
| 2025-11-13 | web API/FE (predictions.tsx, lineup.ts) | Copilot | Methoden-Dropdown, Legacy-Handling, Lineup-Live-Fallback | commits & out/* |
| 2025-11-13 | code/make_predictions.py | Copilot | rf/ma3/pos getrennt, Season-Guard, methodenspezifische JSONs | predictions_gw*_*.json |
| 2025-11-13 | code/team_backtest.py | Copilot | Backtest RF/MA3/POS (GW30–38), PNG | team_backtest_*.{csv,png} |
| 2025-11-13 | code/error_analysis.py | Copilot | Ausreisser/Residual/Calibration | error_* / metrics_by_position_*.csv / *.png |
| 2025-11-13 | code/rf_rank_boost.py | Copilot | Ranking-Boost (rf_rank), Reports + JSONs | rf_rank_boost_* / predictions_gw*_rf_rank.json |
| 2025-11-13 | README.md | Copilot | Validierung/Backtest/rf_rank dokumentiert | README |
