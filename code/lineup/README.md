# Lineup Module

Automatisches FPL-Lineup-Picking mit Formationswahl.

## auto_formation_cli.py

CLI-Tool zum automatischen Zusammenstellen eines optimalen FPL-Lineups für einen bestimmten Gameweek.

### Verwendung

```bash
python code/lineup/auto_formation_cli.py \
    --season 2023-24 \
    --gw 30 \
    --squad_csv data/current/squad_2023-24.csv \
    [--window 5] \
    [--k 3] \
    [--p_floor 0.6] \
    [--formation_pref 3-4-3 4-4-2] \
    [--output out/lineups/lineup.csv]
```

### Parameter

**Pflichtparameter:**
- `--season`: Saison (z.B. `2023-24`)
- `--gw`: Gameweek-Nummer
- `--squad_csv`: Pfad zur Squad-CSV-Datei

**Optionale Parameter:**
- `--window`: Rolling-Window für Team-Metriken (Standard: 5)
- `--k`: Shrinkage-Parameter für Team-Metriken (Standard: 3)
- `--p_floor`: Mindest-Startwahrscheinlichkeit (Standard: 0.6)
- `--prefer_minutes`: Bei Gleichstand Spieler mit mehr Minuten bevorzugen (Standard: aktiviert)
- `--formation_pref`: Bevorzugte Formationen in Reihenfolge (z.B. `3-4-3 4-4-2`)
- `--output`: Ausgabe-CSV-Pfad (optional)

### Squad-CSV Format

Die Squad-CSV muss mindestens folgende Spalten enthalten:
- `player_id`: Eindeutige Spieler-ID
- `name`: Spielername
- `position`: Position (`GK`, `DEF`, `MID`, `FWD`)

Optional:
- `club`: Vereinsname
- `price`: Spielerpreis

Beispiel:
```csv
player_id,name,position,club,price
1,Aaron Ramsdale,GK,Arsenal,5.0
3,Kieran Trippier,DEF,Newcastle,7.0
8,Mohamed Salah,MID,Liverpool,12.5
13,Erling Haaland,FWD,Man City,14.0
```

### Funktionsweise

1. **Daten laden**: 
   - Squad aus CSV
   - Historische Player-Gameweek-Daten aus `data/{season}_player_gw.csv`

2. **Feature-Berechnung**:
   - Rolling-Stats (Punkte, Minuten, TP/90) über letzte 3 GWs
   - Optional: Opponent-Strength-Features (wenn Team/Opponent-Spalten verfügbar)

3. **Prognose**:
   - Nutzt Rolling-Features als Basis-Prognose
   - Schätzt Start-Wahrscheinlichkeit aus Minuten-Historie

4. **Lineup-Selection**:
   - Filtert Spieler nach `p_floor`
   - Probiert alle Formationen (oder nur bevorzugte)
   - Wählt Formation mit höchster erwarteter Punktzahl
   - Bestimmt Kapitän/Vize (höchste/zweithöchste Prognose)
   - Wählt beste 4 Spieler für die Bank

### Ausgabe

**Terminal-Ausgabe:**
```
============================================================
LINEUP FÜR SAISON 2023-24, GAMEWEEK 30
============================================================

Formation: 3-4-3
Erwartete Punkte (XI): 68.80

--- STARTELF (11) ---
  Aaron Ramsdale                 (GK ) - 5.20 Pkt
  Kieran Trippier                (DEF) - 6.50 Pkt
  ...

--- BANK (4) ---
  Torwart: 2
  Feldspieler: [6, 7, 12]

Kapitän: Erling Haaland
Vize: Mohamed Salah
============================================================
```

**CSV-Ausgabe** (wenn `--output` angegeben):
```csv
player_id,role,is_captain,is_vice
1,xi,0,0
3,xi,0,0
...
13,xi,1,0
8,xi,0,1
2,bench_gk,0,0
6,bench,0,0
```

### Fallback-Logik

Wenn keine historischen Daten vor dem Target-GW verfügbar sind:
- `pred_points`: Standard 2.0 Punkte
- `p_start`: Standard 0.5 (50%)
- Wenn alle Spieler `p_start < p_floor`: Alle bekommen `p_start = 0.8`

### Abhängigkeiten

- `code/utils/team_builder.py`: `pick_lineup_autoformation()` Funktion
- `code/utils/data_io.py`: Daten-Lade-Utilities
- `code/utils/def_metrics.py`: Opponent-Strength-Features (optional)

### Beispiele

**Einfaches Lineup:**
```bash
python code/lineup/auto_formation_cli.py \
    --season 2023-24 \
    --gw 30 \
    --squad_csv data/current/squad_2023-24.csv
```

**Mit bevorzugter Formation:**
```bash
python code/lineup/auto_formation_cli.py \
    --season 2023-24 \
    --gw 30 \
    --squad_csv data/current/squad_2023-24.csv \
    --formation_pref 4-3-3
```

**Mit Ausgabe-Datei:**
```bash
python code/lineup/auto_formation_cli.py \
    --season 2023-24 \
    --gw 30 \
    --squad_csv data/current/squad_2023-24.csv \
    --output out/lineups/lineup_gw30.csv
```

**Niedrigerer Start-Threshold:**
```bash
python code/lineup/auto_formation_cli.py \
    --season 2023-24 \
    --gw 30 \
    --squad_csv data/current/squad_2023-24.csv \
    --p_floor 0.4
```
