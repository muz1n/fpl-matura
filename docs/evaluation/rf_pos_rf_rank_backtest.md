# RF_POS und RF_RANK Backtest Integration

## Status

✅ **Predictions vorhanden** für alle 4 Saisons (2020-21 bis 2023-24, GW30-38):
- `predictions_SEASON_gwXX_rf_pos.json`
- `predictions_SEASON_gwXX_rf_rank.json`

⚠️ **Backtest-Daten fehlen** für rf_pos und rf_rank (zeigen "Selection failed")

## Lösung: Backtest neu laufen lassen

### Schnellstart

1. **Doppelklick auf** `run_full_backtest.bat`
2. Warte ca. 5-10 Minuten (je nach Rechnerleistung)
3. Fertig! Daten sind in `out/backtests/`

### Manuell (falls Batch-Datei nicht funktioniert)

```bash
# Aktiviere virtuelle Umgebung
.venv\Scripts\activate.bat

# Laufe Backtest für alle 4 Saisons mit allen Methoden
python code/evaluation/team_backtest.py --season 2020-21 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
python code/evaluation/team_backtest.py --season 2021-22 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
python code/evaluation/team_backtest.py --season 2023-24 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
```

## Output-Dateien

Nach dem Lauf findest du in `out/backtests/`:

- `team_backtest_2020-21_gw2-38.csv` - Detail-Ergebnisse für jeden GW
- `team_backtest_summary_2020-21_gw2-38.csv` - Zusammenfassung (Avg Points, Coverage, etc.)
- `team_backtest_2020-21_gw2-38.png` - Visualisierung
- (gleiche Dateien für 2021-22, 2022-23, 2023-24)

## WebApp Integration

Die WebApp liest automatisch die CSV-Dateien über die API und zeigt alle Methoden mit Daten an:

### Automatische Erkennung
- API-Endpunkt: `/api/backtest?season=XXXX-XX&gwStart=2&gwEnd=38`
- Liest `out/backtests/team_backtest_summary_*.csv`
- Zeigt alle Methoden mit `n_gw > 0` an

### Farben (bereits konfiguriert)
- RF: Blau (#3b82f6)
- RF Relaxed: Violett (#8b5cf6)
- RF OptFill: Cyan (#06b6d4)
- **RF POS: Indigo (#6366f1)**
- **RF Rank: Lila (#a855f7)**
- MA3: Grün (#10b981)
- POS: Orange (#f59e0b)

### Charts
Die WebApp erstellt automatisch:
1. **Durchschnittliche Punkte pro Season** (Bar Chart)
2. **Coverage Chart** (Gestapelte Bars zeigen Anzahl erfolgreicher GWs)
3. **Methoden-Vergleich** (Pie Chart für ausgewählte Season)
4. **GW-für-GW Verlauf** (Line Chart für Detail-Analyse)

## Ergebnis-Interpretation

### Was zu erwarten ist:

**RF_POS** sollte **besser** als Standard-RF sein, weil:
- Nutzt RF-Prognosen (genauer)
- Aber verwendet POS-basierte Team-Selektion (robuster bei Budget/Formation-Constraints)
- Sollte höhere Coverage haben (weniger "Selection failed")

**RF_RANK** sollte **Top-Spieler boosten**:
- Nutzt RF-Prognosen als Basis
- Boostet Prognosen für Spieler mit hohem historischen Ranking
- Könnte höhere Peak-Performance haben (Captain-Effekt)
- Aber möglicherweise höhere Varianz

## Troubleshooting

### "Selection failed" bleibt bestehen
- Prüfe ob Predictions wirklich existieren: `dir out\predictions\*rf_pos*.json`
- Prüfe Predictions-Format: `type out\predictions\predictions_2023-24_gw30_rf_pos.json`
- Stelle sicher, dass `player_id`, `pred_points`, `position`, `team`, `cost` vorhanden sind

### Backtest dauert sehr lange
- Normal! Jeder GW benötigt ca. 2-5 Sekunden
- 4 Seasons × 37 GWs × 6 Methoden = ~888 Berechnungen
- Geschätzte Laufzeit: 5-10 Minuten

### CSV-Dateien werden nicht erstellt
- Prüfe Schreibrechte in `out/backtests/`
- Prüfe Logs in `logs/` für Fehlermeldungen
- Stelle sicher, dass virtuelle Umgebung aktiviert ist

## Nächste Schritte

1. ✅ Backtests laufen lassen (siehe oben)
2. ✅ WebApp-API testen: `http://localhost:3000/api/backtest?season=2023-24&gwStart=2&gwEnd=38`
3. ✅ Multi-Season Seite öffnen: `http://localhost:3000/multi-season`
4. ✅ Methoden-Filter nutzen: RF, RF_POS, RF_RANK, MA3, POS auswählen
5. ✅ Charts vergleichen und interpretieren
