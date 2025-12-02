# FPL-Matura Daten-Ordner

Dieser Ordner enthält alle Daten für das FPL-Vorhersage-System.

## 📊 Haupt-Datensätze

### Historische Spieler-Gameweek Daten (2016-17 bis 2023-24)

#### Bereinigte Daten (`cleaned_merged_gw_YYYY-YY.csv`)
- **Verwendung**: Training und Backtesting der ML-Modelle
- **Bereinigung**: Duplikate entfernt, Datenqualität geprüft
- **Spalten**: 65 Features inkl. Punkte, Minuten, xG, xA, Gegner, etc.
- **Saisons**:
  - `cleaned_merged_gw_2016-17.csv` - 23.106 Zeilen
  - `cleaned_merged_gw_2017-18.csv` - 21.797 Zeilen
  - `cleaned_merged_gw_2018-19.csv` - 21.134 Zeilen
  - `cleaned_merged_gw_2019-20.csv` - 22.313 Zeilen
  - `cleaned_merged_gw_2020-21.csv` - 22.889 Zeilen
  - `cleaned_merged_gw_2021-22.csv` - 23.230 Zeilen
  - `cleaned_merged_gw_2022-23.csv` - 24.957 Zeilen
  - `cleaned_merged_gw_2023-24.csv` - 28.742 Zeilen

#### Originale Daten (`merged_gw_YYYY-YY.csv`)
- **Verwendung**: Backup und Referenz
- **Zustand**: Vor Duplikat-Entfernung
- **Quelle**: Von vaastav/Fantasy-Premier-League GitHub heruntergeladen

#### All-Seasons Datensatz
- `merged_gw_all_seasons.csv` - 196.538 Zeilen
- **Verwendung**: Gesamtübersicht aller Saisons kombiniert

### Aktuelle Saison (2024-25)

- `cleaned_players_2025-26.csv` - 668 Spieler
  - Aktuelle Spielerdaten für Prognosen
  - 19 Spalten: player_id, name, team, position, price, etc.

- `cleaned_players_2025-26_team.csv` - 696 Spieler
  - Erweiterte Version mit Team-Informationen
  - Wird für Web-App verwendet

## 🔧 Konfigurations- und Qualitätsdateien

- `data_quality_config.json` - Konfiguration für Datenqualitätsprüfungen
- `cleanup_report.json` - Bericht über durchgeführte Bereinigungen
- `validation_report.json` - Validierungsergebnisse der Daten
- `season_quality.json` - Qualitätsmetriken pro Saison
- `fpl_rules_by_season.json` - FPL-Regeln und Punktesystem pro Saison

## 📁 Datenquellen

### Hauptquelle
- **GitHub**: [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
- **Download-Tool**: `tools/download_all_seasons.py`

### FPL API (für aktuelle Daten)
- **Offizielle API**: https://fantasy.premierleague.com/api/
- **Verwendung**: Aktuelle Spielerdaten für 2024-25 Saison

## 🛠️ Datenverarbeitung

### Download
```bash
python tools/download_all_seasons.py
```

### Bereinigung
```bash
python tools/cleanup_season_data.py
```

### Validierung
```bash
python tools/validate_season_data.py
```

## 📝 Hinweise

- **Regel-Änderungen**: Ab Saison 2024-25 wurden FPL-Regeln geändert (z.B. GK Goal = 5 statt 6, DC = 2)
- **Era-System**: Code unterscheidet zwischen Era 1 (2016-24) und Era 2 (2024+)
- **Datenqualität**: Alle Dateien wurden auf Duplikate und Konsistenz geprüft
- **Backup**: Originale `merged_gw_*.csv` bleiben als Backup erhalten
