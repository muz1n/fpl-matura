# fpl-matura
Maturaprojekt zur Entwicklung einer KI-basierten FPL-Optimierungsapp

## Validierung (Stand: 13. Nov 2025)

Das Modell wurde mittels zeitbasierter Evaluation auf dem Testfenster Gameweek 30–38 der Saison 2023-24 validiert. Gemessen wurden MAE (mittlerer absoluter Fehler), RMSE (Root Mean Square Error) und Spearman-Korrelation ρ zur Bewertung der Vorhersagegenauigkeit und Ranking-Qualität.

### Ergebnisse

| Methode | MAE   | RMSE  | ρ (Spearman) |
|---------|-------|-------|--------------|
| rf      | 1.42  | 2.50  | 0.001        |
| ma3     | 1.42  | 2.50  | 0.001        |
| pos     | 1.34  | 2.38  | -0.037       |

**Anzahl Predictions:** 6'532 (über alle Methoden und Gameweeks)

### Reproduktion

Die Ergebnisse können mit folgenden Kommandos nachvollzogen werden:

```bash
# Mini-Validierung (Testfenster GW30-38, Saison 2023-24)
python code\evaluate.py --season 2023-24 --gw_start 30 --gw_end 38 --methods rf ma3 pos --metrics mae rmse spearman

# Einzelne GW-Predictions erzeugen (Beispiel: GW38, Methode rf)
python code\make_predictions.py --season 2023-24 --gw 38 --methode rf
```

### Interpretation & Grenzen

- **MAE < 2 erfüllt:** Die durchschnittliche Punkteabweichung liegt bei ca. 1.3–1.4 Punkten. Dies erfüllt die in der Projektvereinbarung formulierte Hypothese (Teil 1) und zeigt, dass die Modelle die FPL-Punktzahl mit akzeptabler Genauigkeit schätzen können.
- **Niedrige Spearman-Korrelation:** Die ρ-Werte nahe Null bzw. leicht negativ zeigen, dass das aktuelle Ranking der Spieler noch verbesserungswürdig ist. Dies ist relevant für die Auswahl der Starting XI und Captain-Wahl, wird aber in nachfolgenden Iterationen weiter optimiert.
- **RMSE und Ausreißer:** Der RMSE liegt deutlich über dem MAE, was auf vereinzelte grosse Abweichungen (Ausreißer) hindeutet. Eine geplante Residual- und Kalibrierungsanalyse soll diese Fälle besser identifizieren und die Modellrobustheit erhöhen.
