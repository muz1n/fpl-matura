# Feature-Dokumentation: cleaned_players.csv

## Inhalt
- [Hinweis zur Datenlage](#hinweis-zur-datenlage)
- [Bewertungskriterien für die Einschätzung](#bewertungskriterien-für-die-einschätzung)
- [Nicht verwendbare Spalten](#nicht-verwendbare-spalten)
- [Potenziell verwendbare Features](#potenziell-verwendbare-features)
- [Erste Überlegungen zur späteren Nutzung](#erste-überlegungen-zur-späteren-nutzung)


Diese Datei dokumentiert die potenziell als Eingabevariablen nutzbaren Spalten aus dem Datensatz `cleaned_players.csv` (Saison 2022/23) aus dem GitHub-Repository `vaastav/Fantasy-Premier-League`.

Ziel ist es, eine strukturierte Übersicht möglicher Eingabevariablen für ein Machine-Learning-Modell zur Vorhersage von FPL-Punkten zu erstellen.

## Hinweis zur Datenlage

Der Datensatz enthält aggregierte Saisondaten für alle Spieler (eine Zeile pro Spieler). In der späteren Anwendung wird stattdessen mit laufenden Saisonwerten gearbeitet. Die Einschätzungen hier gelten daher vorrangig als Grundlage für das Grundverständnis und die Feature-Auswahl.

---

## Nicht verwendbare Spalten

| Spalte         | Grund                                        |
|----------------|----------------------------------------------|
| `first_name`   | Nur zur Identifikation, nicht modellrelevant |
| `second_name`  | Nur zur Identifikation, nicht modellrelevant |
| `total_points` | Zielvariable, nicht als Eingabe verwenden    |

---

## Potenziell verwendbare Features

### Bewertungskriterien für die Einschätzung

Die Einschätzungen basieren auf folgender Logik:

- **sehr relevant**: Das Feature steht in direktem Zusammenhang mit der Punktevergabe im FPL (z. B. Tore, Assists, Spielzeit).
- **relevant**: Das Feature ist hilfreich, aber etwas indirekter (z. B. Clean Sheets).
- **situationsabhängig**: Nützlich, aber nicht für alle Positionen gleich wichtig (z. B. Kreativitäts-Index).
- **optional / redundant**: Möglicherweise durch andere Features abgedeckt.
- **Meta-Feature**: Von der Community beeinflusst (nicht direkt leistungsbezogen).
- **negativ relevant**: Korreliert negativ mit Punkten (z. B. rote Karten), kann aber nützlich sein.


| Spalte                | Typ         | Beschreibung                                                                 | Einschätzung                |
|-----------------------|-------------|------------------------------------------------------------------------------|-----------------------------|
| `goals_scored`        | numerisch   | Anzahl erzielter Tore                                                        | sehr relevant               |
| `assists`             | numerisch   | Anzahl Torvorlagen                                                           | sehr relevant               | 
| `minutes`             | numerisch   | Gesamte Einsatzzeit in Minuten                                               | sehr relevant               |
| `clean_sheets`        | numerisch   | Anzahl Spiele ohne Gegentor (v. a. für DEF/GK relevant)                      | relevant                    | 
| `creativity`          | numerisch   | Indexwert für Chancenerarbeitung                                             | situationsabhängig          |
| `influence`           | numerisch   | Indexwert für Spielkontrolle und Präsenz                                     | situationsabhängig          |
| `threat`              | numerisch   | Indexwert für Torgefahr                                                      | relevant                    |
| `bps`                 | numerisch   | Bonus Point System, Rohwert                                                  | optional                    | 
| `bonus`               | numerisch   | Vergebene Bonuspunkte                                                        | evtl. redundant zu `bps`    |
| `ict_index`           | numerisch   | Kombination aus influence, creativity, threat                                | abgeleitet, evtl. redundant |
| `selected_by_percent` | numerisch   | Beliebtheit in der FPL-Community (Meta-Feature)                              | evtl. nützlich              |
| `now_cost`            | numerisch   | Marktwert in 0.1-Millionen-Schritten                                         | relevant für Budgetmodelle  |
| `element_type`        | kategorisch | Spielerrolle (1 = GK, 2 = DEF, 3 = MID, 4 = FWD)                             | sehr wichtig                |
| `red_cards`           | numerisch   | Anzahl roter Karten                                                          | negativ relevant            |
| `yellow_cards`        | numerisch   | Anzahl gelber Karten                                                         | negativ relevant            |

---

## Erste Überlegungen zur späteren Nutzung

- Spalten wie `goals_scored`, `assists`, `minutes`, `threat` und `element_type` scheinen die wichtigsten Kernmerkmale zu sein.
- `selected_by_percent` ist ein sogenanntes **Meta-Feature**, das die Auswahlhäufigkeit eines Spielers durch reale FPL-Teilnehmende misst. Es kann nützlich sein, weil es indirekt viele Faktoren bündelt (Form, Vertrauen, Spielzeit, Gegner etc.). Gleichzeitig birgt es das Risiko von **Verzerrung**, da es auf subjektiver Wahrnehmung und Hype basiert und nicht direkt auf Leistung.
- `ict_index` ist abgeleitet aus anderen Features und sollte **nicht zusätzlich** verwendet werden, wenn `influence`, `creativity` und `threat` einzeln genutzt werden.
