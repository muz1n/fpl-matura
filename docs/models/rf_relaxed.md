# RF_RELAXED - Relaxte Random Forest Variante

## Übersicht
`rf_relaxed` ist eine Variante des Standard-RF-Modells mit weniger strikten Datenfiltern und aggressiverer Imputation fehlender Werte.

## Ziel
Erhöhung der Anzahl verfügbarer Spieler pro Spielwoche durch:
- Weniger strenge Filterung (akzeptiert auch Zeilen ohne Punkte-Historie)
- Median-basierte Imputation statt einfachem Fill-with-Zero
- Reduzierung von "Selection failed" Fällen im Backtest

## Unterschiede zu Standard-RF

| Aspekt | RF (Standard) | RF_RELAXED |
|--------|---------------|------------|
| Trainingsdaten | Nur Zeilen mit notna() Punkten | Alle Zeilen (Punkte-NaN → 0) |
| Feature-Imputation | fillna(0.0) | fillna(median) dann fillna(0.0) |
| Missing Player Features | fillna(0.0) | fillna(median der Kohorte) |
| Anzahl Trainingsbeispiele | Niedriger | Höher |

## Implementation
Siehe `code/models/make_predictions.py`:
- Funktion `train_rf_model(..., relaxed=True)`
- Funktion `predict_rf(..., relaxed=True)`

## Verwendung

### Vorhersagen generieren
```bash
python code/models/make_predictions.py --season 2022-23 --gw 30 --method rf_relaxed
```

### Backtest
```bash
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf rf_relaxed ma3 pos
```

### Full-Season Pipeline
```bash
run_full_season_pipeline.bat 2022-23 2 38
```

## Erwartete Effekte

### Positiv
- ✅ Mehr verfügbare Spieler pro GW
- ✅ Weniger "Selection failed" durch strukturelle Probleme
- ✅ Bessere Abdeckung von Neuzugängen und selten gespielten Spielern

### Potenzielle Risiken
- ⚠️ Noise durch Spieler mit wenig Spielzeit
- ⚠️ Vorhersagequalität könnte sinken (mehr unsichere Daten)
- ⚠️ Overfitting auf Median-Werte

## Hypothese
**Problem-Diagnose**: "Zu wenig verfügbare Spieler durch strikte Filter"

Falls rf_relaxed mehr erfolgreiche GWs erreicht als rf, bestätigt dies die Hypothese dass Datenfilterung das Hauptproblem war.

## Evaluierung
Vergleiche nach Backtest:
1. **Anzahl erfolgreicher GWs**: rf vs rf_relaxed
2. **Durchschnittliche Punkte**: Qualität der Vorhersagen
3. **Anzahl verfügbarer Kandidaten pro GW**: Direkte Messung der Filtereffekte

## Related
- Standard RF: `docs/models/baseline_rf.md` (falls existent)
- Alternative Lösung: `docs/models/rf_optfill.md` (Optimizer-Level Fallback)
- Vergleich: `docs/evaluation/method_comparison.md`
