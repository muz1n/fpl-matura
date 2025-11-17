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

---

### 14.11.2025 – rf_pos Tuning nach Position (FWD/DEF)

**Kurzfassung**

Ich habe das Random-Forest-Modell `rf_pos` pro Position bewertet und gezielt nur für Stürmer (FWD) und Verteidiger (DEF) getunte Hyperparameter übernommen. Für Mittelfeldspieler (MID) und Torhueter (GK) lasse ich bewusst die bisherigen Einstellungen stehen, weil ich dort keine stabile Verbesserung nachweisen konnte.

**Setup**

- Modell: `RandomForestRegressor` pro Position (GK, DEF, MID, FWD)
- Daten: Premier League Saison 2022–23, Gameweeks 30 bis 38
- Ziel: Prognose der Punkte pro Spieler und Gameweek
- Vergleich:
  - alter Stand von `rf_pos`
  - neues Tuning mit:
    - `n_estimators=100`
    - `max_depth=4`
    - `min_samples_leaf=3`
    - `random_state=42`, `n_jobs=-1`

**Kriterien**

- Hauptkriterium: Spearman-Rangkorrelation zwischen Prognose und echten Punkten pro Position  
- Nebenkriterium: mittlerer absoluter Fehler (MAE) in Punkten

---

### **Ergebnisse (mit echten Werten)**

#### **FWD (Stürmer)**  
- Spearman: **0.705**  
- MAE: **1.27**  
**Einordnung:**  
Die Rangordnung der Stürmer trifft die echten Punkte gut. Der MAE ist solide. Das Tuning bringt eine leichte, aber klare Verbesserung.

#### **DEF (Verteidiger)**  
- Spearman: **0.59**  
- MAE: **1.05**  
**Einordnung:**  
Die Rangordnung ist ok, aber wie erwartet schwächer als bei FWD. Der MAE ist tief. Das Tuning verbessert das Modell leicht, ohne zu overfitten.

#### **MID (Mittelfeld)**  
- Spearman: **0.74**  
- MAE: **1.03**  
**Einordnung:**  
Tuning führte zu keinen robusten Verbesserungen. Die Resultate sind stabil und nachvollziehbar, daher bewusst keine Hyperparameter-Änderung.

#### **GK (Torhueter)**  
- Spearman: **0.77**  
- MAE: **0.77**  
**Einordnung:**  
Sehr kleine Datenbasis und hohe Gefahr von Overfitting. Bewusst nicht getunt. Die Resultate liegen exakt im erwarteten Bereich.

---

### **Entscheidung**

In `rf_pos_models.py` sind jetzt **nur für FWD und DEF** die getunten Hyperparameter fix eingebaut:

- `n_estimators=100`
- `max_depth=4`
- `min_samples_leaf=3`

MID und GK bleiben unverändert.

Damit ist `rf_pos` ab jetzt:

- für Stürmer und Verteidiger leicht stärker und stabiler  
- für Mittelfeld und Torhueter bewusst konservativ gehalten  
- insgesamt robuster und besser dokumentiert

---

### **Reflexion**


---

### 17.11.2025 – Erweiterung von evaluate.py (rf_pos und rf_rank)

Die Datei evaluate.py wertet jetzt fuenf Modelle gemeinsam aus: rf, ma3, pos, rf_pos und rf_rank. Fuer alle Modelle werden die Metriken MAE, RMSE, Spearman und die Anzahl der Samples berechnet. Die Ergebnisse werden als Tabelle in der Konsole ausgegeben und zusaetzlich als model_comparison.csv sowie run_settings.json im passenden Ordner gespeichert.

Das Modell rf_pos nutzt positionsspezifische Random Forest Modelle mit Tuning fuer FWD und DEF. Das Modell rf_rank ist als einfache Rangtransformation der Punktvorhersagen implementiert, um die Spearman Korrelation zu verbessern.

Ein erster Testlauf (Saison 2023-24, Gameweeks 30–31) zeigt:
- rf bleibt beim MAE weiterhin stark
- ma3 und pos sind deutlich schwaecher
- rf_pos und rf_rank sind interessante Varianten, liefern aber im kleinen Testfenster noch keine klar bessere Gesamtperformance

Diese Erweiterung ist wichtig, weil sie den wissenschaftlichen Vergleich der Methoden ermoeglicht und direkt in die schriftliche Arbeit und die Praesentation einfliessen wird. Die Varianten rf_pos und rf_rank sind als methodische Experimente zu verstehen, die das Ranking-Problem adressieren sollen.

