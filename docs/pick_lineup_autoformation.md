# pick_lineup_autoformation Dokumentation

## Übersicht

Die Funktion `pick_lineup_autoformation` wählt automatisch die beste Formation für ein FPL-Team und stellt die Startelf sowie die Bank zusammen.

## Signatur

```python
def pick_lineup_autoformation(
    squad_df: pd.DataFrame,
    prefer_minutes: bool = True,
    p_start_col: str = "p_start",
    pred_col: str = "pred_points",
    position_col: str = "position",
    player_id_col: str = "player_id",
    name_col: str = "name",
    p_floor: float = 0.6,
    formation_preference: Optional[List[FormationStr]] = None,
) -> LineupResult
```

## Parameter

- **squad_df**: DataFrame mit Spielerdaten (mindestens `position`, `player_id`, `p_start`, `pred_points`)
- **prefer_minutes**: Bei Gleichstand Präferenz für Spieler mit mehr Minuten geben (Standard: `True`)
- **p_start_col**: Spaltenname für Startwahrscheinlichkeit (Standard: `"p_start"`)
- **pred_col**: Spaltenname für prognostizierte Punkte (Standard: `"pred_points"`)
- **position_col**: Spaltenname für Position (Standard: `"position"`, Werte: `"GK"`, `"DEF"`, `"MID"`, `"FWD"`)
- **player_id_col**: Spaltenname für Spieler-ID (Standard: `"player_id"`)
- **name_col**: Spaltenname für Spielername (Standard: `"name"`)
- **p_floor**: Mindest-Startwahrscheinlichkeit (Standard: `0.6`)
- **formation_preference**: Optionale Liste von Formationen in bevorzugter Reihenfolge

## Rückgabewert

TypedDict `LineupResult` mit folgenden Feldern:

- **formation**: Gewählte Formation (z.B. `"3-4-3"`)
- **xi_ids**: Liste mit IDs der 11 Startspieler
- **bench_gk_id**: ID des Bank-Torwarts
- **bench_out_ids**: Liste mit IDs der 3 Feldspieler auf der Bank
- **captain_id**: ID des Kapitäns (höchste pred_points in XI)
- **vice_id**: ID des Vize-Kapitäns (zweithöchste pred_points in XI)
- **xi_points_sum**: Summe der erwarteten Punkte der Startelf
- **debug**: Dictionary mit Debug-Informationen

## Funktionsweise

1. **Filterung**: Nur Spieler mit `p_start >= p_floor` werden berücksichtigt
2. **Formationswahl**: 
   - Probiert alle Formationen aus (oder nur die in `formation_preference`)
   - Für jede Formation: Wählt beste Spieler pro Position nach `pred_col`
   - Wählt Formation mit höchster Gesamtpunktzahl
3. **Kapitän/Vize**: Höchste/zweithöchste `pred_points` in der Startelf
4. **Bank**: 
   - Bester GK außerhalb der XI
   - 3 beste Feldspieler außerhalb der XI und Bank-GK

## Erlaubte Formationen

- `"3-4-3"`: 1 GK, 3 DEF, 4 MID, 3 FWD
- `"3-5-2"`: 1 GK, 3 DEF, 5 MID, 2 FWD
- `"4-4-2"`: 1 GK, 4 DEF, 4 MID, 2 FWD
- `"4-5-1"`: 1 GK, 4 DEF, 5 MID, 1 FWD
- `"4-3-3"`: 1 GK, 4 DEF, 3 MID, 3 FWD
- `"5-3-2"`: 1 GK, 5 DEF, 3 MID, 2 FWD
- `"5-4-1"`: 1 GK, 5 DEF, 4 MID, 1 FWD

## Beispiel

```python
from utils.team_builder import pick_lineup_autoformation
import pandas as pd

# Squad-Daten vorbereiten
squad_df = pd.DataFrame([
    {"player_id": 1, "name": "Player A", "position": "GK", "p_start": 0.95, "pred_points": 5.2},
    # ... weitere Spieler
])

# Lineup automatisch zusammenstellen
result = pick_lineup_autoformation(squad_df, p_floor=0.6)

print(f"Formation: {result['formation']}")
print(f"Kapitän ID: {result['captain_id']}")
print(f"Erwartete Punkte: {result['xi_points_sum']:.2f}")
```

## Minimale Anforderungen

Das Squad muss mindestens folgende Spieler mit `p_start >= p_floor` enthalten:
- 2 Torhüter (1 für XI, 1 für Bank)
- Genug Feldspieler für 11er-Team + 3 Bank-Spieler

Je nach Formation benötigt man unterschiedlich viele Spieler pro Position, aber insgesamt mindestens 15 Spieler.

## Fehlerbehandlung

Die Funktion wirft `ValueError` in folgenden Fällen:
- Keine Spieler mit ausreichender Startwahrscheinlichkeit
- Keine Formation kann mit verfügbaren Spielern gebildet werden
- Kein Torwart für die Bank verfügbar
- Nicht genug Feldspieler für die Bank

## Testen

Siehe `code/test_pick_lineup.py` für Beispiele und Tests.
