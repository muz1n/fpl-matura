# FPL Maturaprojekt

**Machine-Learning-Vorhersagen für Fantasy Premier League**

Dieses Projekt entwickelt ein Machine-Learning-System zur Vorhersage von Fantasy Premier League (FPL) Spielerpunkten und zur automatischen Teamzusammenstellung.

## Projektstruktur

- `code/` - Python-Code (Modelle, Features, Evaluation)
- `data/` - FPL-Daten (8 Saisons: 2016-17 bis 2023-24)
- `out/` - Backtest-Ergebnisse und Vorhersagen
- `web/` - Next.js Web-Applikation
- `tests/` - Unit-Tests
- `journal/` - Arbeitsdokumentation
- `docs/schriftliche_maturaarbeit/` - Wissenschaftliche Maturaarbeit

## Quick Start

```bash
# 1. Python-Umgebung einrichten
pip install -r requirements.txt

# 2. Tests ausführen
pytest tests/

# 3. Web-App starten
cd web
npm install
npm run dev
# → http://localhost:3000
```

## Hauptergebnisse

**Vorhersagegenauigkeit** (über 103k Vorhersagen, 4 Testsaisons 2020-2024):
- **Random Forest (RF)**: MAE 1.20, RMSE 2.18
- **Moving Average (MA3)**: MAE 1.24, RMSE 2.32
- **Position Average (POS)**: MAE 1.53, RMSE 2.38

**Team-Performance** (durchschnittliche Punkte/Gameweek):
- **MA3**: 46.0 Punkte (Effizienz: 34.6%)
- **RF**: 45.8 Punkte (Effizienz: 34.6%)
- **POS**: 13.0 Punkte (Effizienz: 9.8%)

Die detaillierte Analyse findet sich in `docs/schriftliche_maturaarbeit/maturaarbeit.typ`.

## Daten

**Quelle**: [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)

**Verfügbare Saisons** (in `data/`):
- `merged_gw_2016-17.csv` bis `merged_gw_2023-24.csv` (8 Saisons)
- `cleaned_merged_gw_*.csv` (bereinigte Versionen)
- Gesamt: **188,168 Spieler-Gameweek-Datensätze**

**Train/Test-Split**:
- **Training**: 2016-17 bis 2019-20 (4 Saisons)
- **Testing**: 2020-21 bis 2023-24 (4 Saisons, chronologisch)

## Reproduktion

### Backtests ausführen

Die vollständigen Backtests über 4 Testsaisons können über die Pipeline reproduziert werden:

```bash
# Vorhersagen für alle Saisons generieren
python code/pipeline/run_backtest_pipeline.py

# Ergebnisse analysieren
python code/evaluation/calculate_mae_rmse.py
python code/evaluation/calculate_team_points.py
```

Die Resultate werden in `out/backtests/` gespeichert.

## Web-Applikation

Die interaktive Web-App visualisiert Vorhersagen und Backtests:

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

**Features**:
- Interaktive Vorhersagen für alle Saisons & Gameweeks
- Backtest-Visualisierungen mit Performance-Charts
- Multi-Season-Vergleich (8 Saisons)
- Feature-Importance-Analysen
- Automatische Lineup-Optimierung

**Deployment**: Vercel (automatische CI/CD via GitHub)

## Weitere Dokumentation

- **Wissenschaftliche Arbeit**: `docs/schriftliche_maturaarbeit/maturaarbeit.typ`
- **Journal**: `journal/` - Arbeitsdokumentation über 8 Monate
- **Code-Dokumentation**: `code/README.md`
- **Daten-Qualität**: `data/README.md`
