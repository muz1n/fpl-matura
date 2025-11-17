# Getting Started

## Python Umgebung installieren

1. Python 3 installieren.
2. Im Hauptordner:
   ```
   pip install -r requirements.txt
   ```

## Daten

- Im Ordner `data/` sind CSV Dateien mit Spieler- und Spieltagsdaten.
- Beispiel: `2023-24_player_gw.csv` enthaelt Spielerstatistiken pro Spieltag.
- Die Daten werden fuer Predictions und Analysen genutzt.

## Predictions generieren

- Beispiel:
  ```
  python code/make_predictions.py --season 2022-23 --start_gw 30 --end_gw 38 --model rf
  ```
- Die Ergebnisse werden als JSON in `out/` gespeichert.

## Modelle vergleichen

- Mit `evaluate.py` werden alle Modelle verglichen:
  ```
  python code/evaluate.py
  ```

## Residuen analysieren

- Mit `error_analysis.py` werden Residuen analysiert:
  ```
  python code/error_analysis.py
  ```

## Team Backtest mit Budget Constraint

- Beispiel:
  ```
  python code/team_backtest.py --budget 100.0
  ```

## JSON Dateien in `out/`

- Ergebnisse wie Predictions und Lineups werden als JSON gespeichert.
- Diese Dateien koennen fuer weitere Analysen und die Webapp genutzt werden.

## Webapp starten

1. In den Ordner `web/` wechseln.
2. Abhaengigkeiten installieren:
   ```
   npm install
   ```
3. Webapp starten:
   ```
   npm run dev
   ```

## API Dateien

- Die Webapp laedt Predictions und Lineup aus den JSON Dateien in `out/`.
- Die API stellt die Daten fuer die Anzeige bereit.

## Ergebnisse in der Webapp

- Nach dem Start sind die Ergebnisse im Browser sichtbar.
- Predictions und Lineups werden als Tabellen und Grafiken angezeigt.

Fertig. Das Projekt ist jetzt lokal nutzbar.