# Historische Lineup-Evaluation

## Übersicht

Dieses Feature ermöglicht den direkten Vergleich zwischen ML-generierten Lineups und dem theoretical optimalen Lineup für historische Gameweeks.

## Komponenten

### 1. Backend: `code/evaluate_lineup.py`

**Funktion**: `evaluate_single_lineup_for_webapp(season, gw, methode)`

**Ablauf**:
1. Lädt tatsächliche Resultate für Season+GW
2. Lädt generiertes Modell-Lineup
3. Berechnet echte Punkte des Modell-Lineups
4. Findet optimales Lineup (mit Hindsight)
5. Berechnet Delta und Effizienz

**Verwendung**:
```python
from code.evaluate_lineup import evaluate_single_lineup_for_webapp

result = evaluate_single_lineup_for_webapp('2021-22', 25, 'rf')
print(f"Modell: {result['model_actual_points']} vs Optimal: {result['optimal_points']}")
```

### 2. API: `/api/eval/[season]/[gw]`

**Endpoint**: `GET /api/eval/2021-22/25?methode=rf`

**Response**:
```json
{
  "evaluation_possible": true,
  "season": "2021-22",
  "gw": 25,
  "methode": "rf",
  "model_actual_points": 62.0,
  "optimal_points": 78.0,
  "delta": -16.0,
  "efficiency_percent": 79.5,
  "model_lineup": {...},
  "optimal_lineup": {...}
}
```

**Error Cases**:
- Season < 2020-21 → 422 + error_message
- Lineup nicht gefunden → 422 + error_message
- Server-Fehler → 500

### 3. Frontend: `<HistoricalEvaluation />`

**Props**:
- `season`: string (z.B. "2021-22")
- `gw`: number
- `methode`: string (default: "rf")

**Anzeige**:
- 3 Cards: Modell-Punkte, Optimal-Punkte, Delta
- Effizienz-Balken (farbkodiert)
- Interpretation-Box mit Erklärungen
- Hinweis für Maturaarbeit

## Verwendung in der Maturaarbeit

### Forschungsfrage
"Wie nah kommt mein ML-Modell an das theoretisch optimale Lineup?"

### Metriken

**Effizienz** = (Modell-Punkte / Optimale-Punkte) × 100%

Interpretation:
- **≥ 90%**: Sehr gut - Modell ist nahe am Optimum
- **75-90%**: Solide - Modell macht gute Vorhersagen
- **< 75%**: Verbesserungspotenzial

### Diskussionspunkte

1. **Warum ist 100% unmöglich?**
   - Optimales Lineup kennt echte Punkte (Hindsight)
   - ML-Modell arbeitet mit Vorhersagen (Unsicherheit)
   - 80-90% ist realistisches Ziel für gutes Modell

2. **Was beeinflusst die Effizienz?**
   - Qualität der Vorhersagen (MAE)
   - Formationsregeln (Budget, max 3 pro Club)
   - Variabilität in FPL-Punkten

3. **Vergleich verschiedener Methoden**:
   - RF vs MA3 vs Pos
   - Welche Methode hat höchste Durchschnitts-Effizienz?

## Datenqualität-Einschränkungen

Evaluation nur für Seasons 2020-21 bis 2023-24:
- Vollständige Position-Daten erforderlich
- Bereinigte Daten ohne Duplikate
- Konsistente FPL-Regeln

Für andere Seasons:
- Fehlermeldung mit Begründung
- Hinweis auf Datenqualität-Dokumentation

## Testing

```bash
# Backend-Test
python code/evaluate_lineup.py --season 2021-22 --gw 25 --methode rf

# API-Test
curl http://localhost:3000/api/eval/2021-22/25?methode=rf

# Frontend
# Öffne http://localhost:3000/predictions
# Wähle Season 2021-22, GW 25
# Scrolle zu "Historische Evaluation"
```

## Troubleshooting

**"Kein Lineup gefunden"**:
1. Predictions generieren: `python code/make_predictions.py --season 2021-22 --gw 25 --methode rf`
2. Lineup erstellen: `python code/lineup/auto_formation_cli_v2.py --season 2021-22 --gw 25 --methode rf`

**"Season hat unzureichende Datenqualität"**:
- Nur 2020-21 bis 2023-24 unterstützt
- Siehe `docs/data_quality.md` für Details

**Import-Fehler**:
- Stelle sicher dass Python-Path korrekt ist
- `sys.path.insert(0, str(ROOT))` sollte funktionieren

## Nächste Schritte

- [ ] Season-Auswahl in Frontend einbauen (derzeit hardcoded "2022-23")
- [ ] Lineup-Player-Details anzeigen (wer ist im Lineup?)
- [ ] Multi-GW-Evaluation (z.B. GW30-38 Durchschnitt)
- [ ] Feature Importance: Welche Features korrelieren mit hoher Effizienz?
