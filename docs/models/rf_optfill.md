# RF_OPTFILL - Optimizer-Level Fallback

## Übersicht
`rf_optfill` ist KEINE eigenständige Vorhersagemethode, sondern eine **Team-Selektions-Strategie** mit intelligentem Fallback-Mechanismus.

## Konzept
Bei RF-basierter Team-Selektion:
1. **Primär**: Versuche Team-Aufstellung mit RF-Vorhersagen
2. **Bei Fehlschlag**: Erstelle Hybrid-Predictions (RF + POS Fallback)
3. **Retry**: Versuche erneut Team-Aufstellung mit Hybrid-Daten

## Ziel
Direkte Lösung für "Selection failed" Fälle durch:
- Beibehaltung der RF-Qualität wo möglich
- POS-Fallback nur für fehlende/problematische Positionen
- **Keine Änderung am RF-Modell selbst** (Optimizer-Level Fix)

## Unterschiede zu anderen Methoden

| Methode | Typ | Fallback-Strategie | RF-Predictions genutzt |
|---------|-----|-------------------|------------------------|
| `rf` | Standard | Keine (fail = fail) | ✅ Ja |
| `rf_filled` | Prediction-Level | RF→MA3→POS chain | ✅ Ja (mit Fallback) |
| `rf_relaxed` | Model-Level | Relaxte Filter | ✅ Ja (mehr Daten) |
| `rf_optfill` | **Optimizer-Level** | **Hybrid RF+POS** | ✅ Ja (Primary), POS nur bei Fail |

## Ablauf (Pseudocode)
```python
if method == "rf_optfill":
    # 1. Versuch mit RF
    team = select_team(rf_predictions)
    
    if team is None:
        # 2. Hybrid: RF + POS Fallback
        hybrid = merge(rf_predictions, pos_predictions)
        team = select_team(hybrid)
        
        if team is not None:
            team["used_fallback"] = True  # Markierung
```

## Implementation
Siehe `code/evaluation/team_backtest.py`:
- Keine eigene Prediction-Generierung nötig
- Fallback-Logik in `run_backtest()` Funktion
- Nutzt existierende RF + POS Predictions

## Verwendung

### KEINE eigene Prediction-Generierung
```bash
# FALSCH - rf_optfill hat keine eigene Generation:
# python code/models/make_predictions.py --method rf_optfill  # ❌

# RICHTIG - nutze rf und pos:
python code/models/make_predictions.py --season 2022-23 --gw 30 --method rf
python code/models/make_predictions.py --season 2022-23 --gw 30 --method pos
```

### Backtest
```bash
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf rf_optfill ma3 pos
```

### Full-Season Pipeline
```bash
run_full_season_pipeline.bat 2022-23 2 38
# Pipeline generiert automatisch rf + pos, rf_optfill nutzt beide
```

## Output-Felder
Backtest-Ergebnisse enthalten zusätzliches Feld:
- `used_fallback`: `True` wenn POS-Fallback aktiv wurde, sonst `None`

## Erwartete Effekte

### Positiv
- ✅ Direkte Reduktion von "Selection failed" Fällen
- ✅ RF-Qualität bleibt erhalten (kein Modell-Downgrade)
- ✅ Trackt genau wann/wo Fallback greift
- ✅ Keine zusätzliche Berechnungszeit (nutzt existierende Predictions)

### Trade-offs
- ⚠️ Hybrid-Teams haben gemischte Prediction-Qualität (RF-Teile gut, POS-Teile baseline)
- ⚠️ Wenn RF strukturell versagt (Budget/Constraints), hilft POS auch nicht zwingend

## Hypothese
**Problem-Diagnose**: "Strukturelle Constraint-Probleme trotz genügend Spielern"

Falls rf_optfill deutlich mehr erfolgreiche GWs hat als rf, bestätigt dies dass:
1. RF-Predictions grundsätzlich vorhanden sind
2. Fallback-Mixing das Problem löst
3. Selection-Algorithmus profitiert von mehr Flexibilität

## Evaluierung
Vergleiche nach Backtest:
1. **n_gw Erfolgsrate**: rf vs rf_optfill
2. **used_fallback Häufigkeit**: Wie oft greift Fallback?
3. **avg_xi_points**: Qualitätsverlust durch Hybrid-Predictions?
4. **Pattern-Analyse**: Welche GWs brauchen Fallback? (Budget-Wochen, Injury-Crisis, etc.)

## Related
- Standard RF: `docs/models/baseline_rf.md`
- Alternative: `docs/models/rf_relaxed.md` (Model-Level Lösung)
- POS Baseline: `docs/baselines.md`
- rf_filled (deprecated): `docs/models/rf_filled.md` (Prediction-Level Fallback, weniger effektiv)
