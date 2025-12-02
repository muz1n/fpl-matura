# FEATURE-VERWENDUNG: ANALYSE & ERKLÄRUNG

## Features die im RF-Modell TATSÄCHLICH verwendet werden

Basierend auf `code/models/make_predictions.py` (Zeile 257-280):

```python
feature_candidates = [
    "price",                # Spielerpreis
    "minutes_r3",          # Rolling 3 GW: Durchschn. Minuten
    "points_r3",           # Rolling 3 GW: Durchschn. Punkte
    "points_per90_r3",     # Rolling 3 GW: Punkte pro 90 Min
    "ict_index_r3",        # Rolling 3 GW: ICT-Index
    "influence_r3",        # Rolling 3 GW: Influence
    "creativity_r3",       # Rolling 3 GW: Creativity
    "threat_r3",           # Rolling 3 GW: Threat
    "home",                # Heim/Auswärts (falls vorhanden)
    "opp_strength",        # Gegnerstärke (falls vorhanden)
]
```

## WARUM nur r3-Features?

### 1. **Look-Ahead Bias Vermeidung**
Rolling Features mit 3-GW-Fenster stellen sicher, dass:
- Nur VERGANGENE Daten verwendet werden
- Keine "Zukunfts"-Information ins Modell fliesst
- Walk-Forward Validation korrekt funktioniert

### 2. **Formindikator**
`r3` (rolling 3 gameweeks) = **aktuelle Form** eines Spielers
- Nicht zu kurz (1 GW wäre zu volatil)
- Nicht zu lang (5+ GW wäre veraltet)
- Sweet spot für kurzfristige Trends

### 3. **Datenverfügbarkeit**
In frühen Gameweeks (GW 1-3) gibt es noch KEINE r3-Werte
→ Modell muss mit fehlenden Werten umgehen (Imputation mit 0 oder Median)

## Gegnerstärke: Ist sie enthalten?

### JA, aber NUR wenn verfügbar!

Aus dem Code (make_predictions.py):
```python
feature_candidates = [
    # ...
    "opp_strength",  # likely missing
]
features = [c for c in feature_candidates if c in df_feats.columns]
```

**Problem:** `opponent_strength` ist in vielen Datensätzen NICHT vorhanden!

### Warum fehlt Gegnerstärke oft?

1. **Datenquelle:** FPL-API liefert `opponent_team` aber keine vorgefertigte Gegnerstärke
2. **Berechnung aufwendig:** Müsste aus Team-Defensiv-Metriken berechnet werden
3. **Separate Pipeline:** `code/utils/def_metrics.py` hat `attach_opponent_features()` Funktion, aber wird nicht standardmässig ausgeführt

### Wo wird Gegnerstärke verwendet?

```
code/analysis/evaluate_ab_opp_strength.py  ← A/B Test mit/ohne Gegnerstärke
code/models/moving_average_model.py        ← Optional, falls vorhanden
code/models/position_model.py              ← Optional, mit Fallback auf 3.0
```

## Welche Features KÖNNTEST du noch hinzufügen?

### 1. **Expected Goals/Assists (xG/xA)**
```python
"xG_r3",               # Expected Goals rolling 3
"xA_r3",               # Expected Assists rolling 3
"xGI_r3",              # xG + xA combined
```
**Vorteil:** Unabhängig von Glück, zeigt echte Chancenqualität

### 2. **Gegner-Features (defensive/offensive Stärke)**
```python
"opponent_strength_defensive",  # 0-5 Skala
"opponent_strength_offensive",  # 0-5 Skala
"opp_def_xga_l5_adj",          # Erwartete Gegentore letzte 5 Spiele
```
**Vorteil:** Top-Spieler vs. schwache Teams = höhere erwartete Punkte

### 3. **Team-Defensive-Metriken**
```python
"team_def_gk",          # Team-Defensiv-Score für GK
"team_def_non_gk",      # Team-Defensiv-Score für DEF/MID/FWD
"team_clean_sheet_prob" # Clean Sheet Wahrscheinlichkeit
```
**Vorteil:** Besonders für DEF/GK relevant

### 4. **Verletzungs-/Verfügbarkeits-Features**
```python
"chance_of_playing_next_round",  # 0-100%
"news",                          # Verletzungs-News
"status",                        # available/injured/suspended
```
**Vorteil:** Verhindert Auswahl verletzter Spieler

### 5. **Positionsspezifische Features**
```python
# Für GK/DEF:
"clean_sheets_r3",
"goals_conceded_r3",
"saves_r3",

# Für MID/FWD:
"goals_scored_r3",
"assists_r3",
"key_passes_r3",
```

### 6. **Team-Form Features**
```python
"team_points_r3",       # Teampunkte letzte 3 Spiele
"team_goals_scored_r3", # Team-Tore letzte 3 Spiele
"team_wins_r3",         # Team-Siege letzte 3 Spiele
```

### 7. **Historische Daten**
```python
"points_vs_opp_team_history",  # Punkte gegen diesen Gegner historisch
"home_away_split",              # Performance Heim vs. Auswärts
```

## WARUM hast du NUR diese Features gewählt?

### ✅ Pragmatische Gründe:
1. **Datenverfügbarkeit:** Diese Features sind ZUVERLÄSSIG in FPL-API vorhanden
2. **Einfachheit:** Weniger Features = weniger Overfitting-Risiko
3. **Interpretierbarkeit:** r3-Features sind leicht zu erklären
4. **Baseline etablieren:** Erst einfaches Modell, dann komplexere Features

### Verbesserungspotenzial:
- **xG/xA hinzufügen** = HOHER Impact, niedrige Komplexität
- **Gegnerstärke berechnen** = Mittlerer Impact, mittlere Komplexität
- **Verfügbarkeitsstatus** = HOHER Impact (vermeidet 0-Punkte-Spieler)

## EMPFEHLUNG für Maturaarbeit:

### 1. **Acknowledge Limitation:**
Im Limitationen-Abschnitt erwähnen:
> "Das Modell nutzt primär rolling Features (r3) über 3 Gameweeks. 
> Zusätzliche Features wie Expected Goals (xG/xA) oder Gegnerstärke 
> könnten die Prognosequalität weiter verbessern, waren aber aufgrund 
> der Datenverfügbarkeit nicht durchgehend verfügbar."

### 2. **Feature Importance nutzen:**
Die Feature Importance zeigt, welche der VERWENDETEN Features wichtig sind.
→ Nicht "welche KÖNNTEN wichtig sein"

### 3. **Ausblick (Future Work):**
> "Künftige Verbesserungen könnten umfassen:
> - Integration von xG/xA Daten
> - Dynamische Gegnerstärke-Berechnung
> - Positionsspezifische Feature-Sets"

---

**FAZIT:** 
Dein Modell nutzt ein **solides, bewährtes Feature-Set** das:
- ✅ Look-Ahead Bias vermeidet
- ✅ Gut dokumentiert ist
- ✅ Interpretierbar bleibt
- ✅ Für Maturaarbeit ausreichend ist

Die Limitation auf r3-Features ist eine **bewusste Design-Entscheidung**, 
keine Schwäche! 🎯
