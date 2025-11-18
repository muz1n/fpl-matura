# Datenqualität und Datenbereinigu ng

## Übersicht

Dieses Dokument beschreibt die Datenqualitätsanalyse, identifizierte Probleme und getroffene Entscheidungen für die Verwendung von FPL-Daten aus dem vaastav/Fantasy-Premier-League Repository.

## Datenquelle

- **Repository**: [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
- **Verfügbare Seasons**: 2016-17 bis 2023-24 (8 Seasons)
- **Datenformat**: CSV-Dateien mit Spieler-Gameweek-Daten

## Identifizierte Qualitätsprobleme

### 1. Duplikate in allen Seasons

**Problem**: Alle 8 Seasons enthielten Duplikate (identische player_id + gw Kombinationen).

**Analyse**: 
- Systematische Untersuchung mit `tools/analyze_duplicates.py`
- Vergleich: vaastav Original-Daten vs. eigene Import-Logik
- **Ergebnis**: Duplikate sind im Original von vaastav vorhanden, nicht durch eigenen Code verursacht

**Zahlen**:
| Season | Duplikate (Zeilen) | Duplikat-Paare |
|--------|-------------------|----------------|
| 2016-17 | 1,146 | 573 |
| 2017-18 | 1,340 | 670 |
| 2018-19 | 1,312 | 656 |
| 2019-20 | 494 | 247 |
| 2020-21 | 2,913 | 1,456 |
| 2021-22 | 4,434 | 2,217 |
| 2022-23 | 3,096 | 1,548 |
| 2023-24 | 1,966 | 983 |
| **Total** | **16,701** | **8,370** |

**Ursache**: Vermutlich Mid-Season-Korrekturen in der offiziellen FPL-API, die vaastav archiviert hat (z.B. Punkt-Anpassungen nach VAR-Entscheidungen).

**Lösung**: 
- Systematische Bereinigung mit `tools/cleanup_season_data.py`
- Strategie: `drop_duplicates(keep='last')` - behält neueste/korrigierte Daten
- Ergebnis: 8 bereinigte Dateien (`cleaned_merged_gw_*.csv`)

**Wissenschaftliche Begründung**: Die keep='last'-Strategie ist defensibel, da spätere Einträge wahrscheinlich Korrekturen darstellen (z.B. nach offiziellen Punkt-Anpassungen).

### 2. Fehlende Position-Daten (2016-2020)

**Problem**: Seasons 2016-17 bis 2019-20 haben keine Position-Daten (pos-Spalte ist NaN).

**Zahlen**:
| Season | Zeilen mit NaN pos | Anteil |
|--------|-------------------|---------|
| 2016-17 | 23,106 | 100% |
| 2017-18 | 21,797 | 100% |
| 2018-19 | 21,134 | 100% |
| 2019-20 | 22,313 | 100% |

**Impact**: Position ist kritisch für:
- Position-basierte Vorhersagen (`methode=pos`)
- Lineup-Optimierung (Formationsregeln: GK/DEF/MID/FWD)
- Feature Engineering (Position-spezifische Features)

**Entscheidung**: **Seasons 2016-2020 werden ausgeschlossen** von Training und Vorhersagen.

**Begründung**:
1. Wissenschaftliche Integrität: Keine Predictions ohne vollständige Daten
2. Praktikabilität: 4 vollständige Seasons (2020-24) sind ausreichend für Training
3. Qualität > Quantität: Lieber weniger, aber saubere Daten

### 3. Ungewöhnliche Spielerzahlen pro Gameweek

**Problem**: Einige Gameweeks haben deutlich weniger Spieler als erwartet (Normal: 700-800).

**Beispiele extremer Fälle**:
| Season | GW | Spieler | Grund |
|--------|----|---------| ------|
| 2021-22 | 18 | 262 | COVID-bedingte Absagen (Weihnachten) |
| 2020-21 | 29 | 277 | COVID-bedingte Absagen |
| 2021-22 | 30 | 292 | Spielverschiebungen |
| 2022-23 | 8 | 440 | Nach Tod Queen Elizabeth |
| 2023-24 | 29 | 344 | Spielverschiebungen |

**Ursachen**:
- COVID-19 Pandemie (2020-22): Teamquarantänen, Spielabsagen
- Sonderevents: Staatstrauer nach Tod Queen Elizabeth (2022)
- Spielplan-Konflikte: FA Cup, europäische Wettbewerbe

**Entscheidung**: **Warnungen, aber kein Ausschluss**

**Implementierung**:
1. `data/season_quality.json` dokumentiert alle problematischen GWs
2. `make_predictions.py` warnt bei < 600 Spielern
3. Web-App zeigt Warning-Icon bei GW-Auswahl
4. User kann selbst entscheiden ob Prediction trotzdem sinnvoll

**Begründung**:
- Transparenz: User wird informiert über reduzierte Datenqualität
- Flexibilität: In manchen Analysen sind diese GWs trotzdem wertvoll
- Realitätsnähe: Spiegelt tatsächliche FPL-Challenges wider

## Implementierte Lösungen

### 1. Datenbereinigungs-Pipeline

**Script**: `tools/cleanup_season_data.py`

**Funktionen**:
- Lädt alle Original-Season-Dateien
- Entfernt Duplikate mit `keep='last'`
- Generiert bereinigte Dateien (`cleaned_merged_gw_*.csv`)
- Erstellt Qualitätsreport (`data/cleanup_report.json`)

**Ergebnis**:
- Original: 196,538 Zeilen
- Bereinigt: 188,168 Zeilen
- Entfernt: 8,370 Duplikate (4.3%)

### 2. Season-Qualitäts-Konfiguration

**Datei**: `data/season_quality.json`

**Inhalt**:
- Pro Season: usable-Flag, Grund, Detailstatistiken
- Problematische GWs: player_count, reason
- Usage-Guidelines: Empfohlene Seasons, Schwellwerte

**Verwendung**:
- Backend: Validierung in `make_predictions.py`
- Frontend: Season/GW-Selektoren, Warnungen
- Dokumentation: Single Source of Truth

### 3. Validierung in make_predictions.py

**Season-Validierung**:
```python
# Prüft season_quality.json beim Laden
if season < "2020-21":
    raise SystemExit("Season kann nicht verwendet werden - fehlende Position-Daten")
```

**GW-Warnung**:
```python
# Warnt bei < 600 Spielern
if len(pool) < 600:
    print("⚠️ WARNUNG: Abgesagte/verschobene Spiele in dieser GW")
```

### 4. Web-App Integration

**Datei**: `web/lib/seasonQuality.ts`

**Funktionen**:
- `getUsableSeasons()`: Nur 2020-24 Seasons
- `isGwProblematic()`: Prüft problematische GWs
- `getGwWarningMessage()`: Tooltip-Texte für UI
- `validateSeason()`: Server-Side Validierung

**UI-Komponenten** (geplant):
- Season-Dropdown: Zeigt nur nutzbare Seasons
- GW-Selector: Warning-Icon + Tooltip bei problematischen GWs
- Prediction-Form: Validation vor Submit

## Wissenschaftliche Rechtfertigung

### Warum keep='last' bei Duplikaten?

**Hypothese**: Spätere Einträge sind Korrekturen nach offiziellen Punkt-Anpassungen.

**Evidenz**:
- FPL hat Regelungen für nachträgliche Punkt-Änderungen (VAR, Bonus-Neuberechnung)
- vaastav scrapet kontinuierlich → später Scrape = aktuellere Daten
- Alternative (keep='first') würde potentiell falsche Daten behalten

**Risiko**: Falls Duplikate Fehler statt Korrekturen sind, könnte keep='last' falsch sein.

**Mitigation**: Dokumentation macht Annahmen transparent, erlaubt spätere Re-Analyse.

### Warum Ausschluss 2016-2020?

**Alternative**: Position-Daten manuell nachtragen oder schätzen.

**Gegen diese Alternative**:
1. Aufwand: 88,350 fehlende Einträge
2. Qualität: Schätzungen könnten Bias einführen
3. Reproduzierbarkeit: Manuelle Ergänzungen schwer zu validieren
4. Suffizienz: 4 Seasons reichen für ML-Training

**Für Ausschluss**:
- Wissenschaftliche Integrität: Keine Schätzungen ohne klare Methodik
- Fokus auf Qualität: 4 saubere Seasons > 8 teilweise fehlerhafte
- Zeiteffizienz: Maturaarbeit-Deadline (17 Tage)

## Auswirkungen auf Maturaarbeit

### Positive Aspekte

1. **Methodische Stärke**: Systematischer Umgang mit Datenqualität zeigt wissenschaftliches Arbeiten
2. **Transparenz**: Vollständige Dokumentation aller Probleme und Entscheidungen
3. **Reproduzierbarkeit**: Cleanup-Scripts + Qualitätsreports ermöglichen Nachvollziehbarkeit
4. **Realitätsnähe**: COVID-Absagen spiegeln echte FPL-Challenges wider

### Limitationen

1. **Reduzierter Datensatz**: Nur 4 statt 8 Seasons verwendbar
2. **Historische Lücke**: Keine Daten vor 2020-21
3. **GW-Anomalien**: Einige GWs mit reduzierter Vorhersagequalität

### Diskussion für Maturaarbeit

**Forschungsfrage-Impact**:
- Seasons 2020-24 sind ausreichend für "Kann ML FPL-Punkte vorhersagen?"
- 4 Seasons = ~90,000 Trainingsbeispiele (ausreichend für Random Forest)
- Cross-Season-Validierung möglich (z.B. Train auf 2020-22, Test auf 2023-24)

**Methodischer Gewinn**:
- Kapitel "Datenqualität" stärkt wissenschaftliche Argumentation
- Zeigt kritisches Denken und systematisches Vorgehen
- Diskussion von Trade-offs (Quantität vs. Qualität)

## Zusammenfassung

**Kernentscheidungen**:
1. ✅ Duplikate entfernen mit keep='last' → 8,370 Zeilen bereinigt
2. ❌ Seasons 2016-2020 ausschliessen → fehlende Position-Daten
3. ⚠️ Problematische GWs warnen, aber erlauben → User-Entscheidung

**Verwendbare Daten**:
- **4 Seasons**: 2020-21, 2021-22, 2022-23, 2023-24
- **~188,000 Zeilen** total (nach Bereinigung)
- **Vollständige Features**: pos, price, points, etc.

**Tooling**:
- `tools/validate_season_data.py`: Qualitätsanalyse
- `tools/cleanup_season_data.py`: Datenbereinigun g
- `data/season_quality.json`: Qualitätsmetadaten
- `web/lib/seasonQuality.ts`: Frontend-Integration

**Dokumentation**:
- Cleanup-Report: `data/cleanup_report.json`
- Validation-Report: `data/validation_report.json`
- Dieses Dokument: Wissenschaftliche Rechtfertigung

---

**Letzte Aktualisierung**: 2025-11-18  
**Maturaarbeit-Deadline**: 2025-12-05 (17 Tage verbleibend)
