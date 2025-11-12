# RF Kurzbericht

**Datum:** 2025-11-12 (Mock für Demo-Zwecke)

## 1. Datengrundlage
- Historische Spielerdaten mit Rolling-Features (R3)
- Ziel: Vorhersage total_points für nächstes GW
- Features: price, selected, influence_r3, creativity_r3, threat_r3, ict_index_r3, minutes_r3, tp_per90_r3

## 2. CV-Setup
- GroupKFold (5 Folds), gruppiert nach GW → kein zeitliches Leakage
- Random Forest: 200 Trees, max_depth=15

## 3. Metriken vs. Baseline
- **RF MAE:** 2.150
- **RF RMSE:** 3.420
- **RF R²:** 0.245
- **Baseline (Positions-Durchschnitt) MAE:** 2.680
- **Baseline (MA3) MAE:** 2.550

## 4. Einordnung
✓ **Gut:** RF übertrifft beide Baselines.

## 5. Nächste Schritte
- Weitere Features testen (Gegner-Stärke, Home/Away)
- Hyperparameter-Tuning
- Ensemble mit anderen Modellen (XGBoost, LightGBM)

## 6. Plots
- Lernkurve: `docs/plots/rf_learning_curve.png`
- Feature Importance: `docs/plots/rf_feature_importance.png`

---
**Hinweis:** Dieser Bericht wurde als Demo erstellt. Führe `python code/rf_report.py --train_csv data/merged_gw_2024-25.csv` aus, um echte Metriken zu generieren.
