# Feature-Dokumentation: cleaned_players.csv

## Inhalt
- [Hinweis zur Datenlage](#hinweis-zur-datenlage)
- [Bewertungssystematik](#bewertungssystematik)
- [Nicht verwendbare Spalten](#nicht-verwendbare-spalten)
- [Potenziell verwendbare Features](#potenziell-verwendbare-features)
- [Erste Überlegungen zur späteren Nutzung](#erste-überlegungen-zur-späteren-nutzung)

---

## Hinweis zur Datenlage

Der Datensatz `cleaned_players.csv` enthält aggregierte Saisondaten (eine Zeile pro Spieler) aus einer vergangenen Premier-League-Saison (hier: 2022/23). Die Spalten zeigen z. B. Tore, Assists, Minuten und weitere Statistiken über die gesamte Saison hinweg.

Dieser Datensatz dient in diesem Projekt vorrangig zur **Einschätzung möglicher Input-Variablen** (Features) für ein Machine-Learning-Modell. Die spätere Anwendung soll jedoch auf **aktuellen Gameweek-Daten** basieren und in der **Saison 2025/26 live getestet** werden.

> Hinweis: Ab der Saison 2025/26 gelten im FPL neue Regeln zur Punktevergabe. Diese Änderungen sind in diesem Datensatz noch nicht abgebildet und müssen beim Modelltraining oder bei der Erweiterung der Daten berücksichtigt werden. Eine Übersicht der Regeln findet sich im `fpl_basics` Ordner.

---

## Bewertungssystematik

Jede Spalte wird anhand von zwei Kriterien bewertet:

1. **Punktrelevanz** - Gibt es direkte oder indirekte Punkte im FPL-System?
   - **sehr relevant**: Direkter Punktegewinn laut offiziellen Regeln
   - **relevant**: Indirekter, aber starker Einfluss
   - **optional**: Möglicher Zusatznutzen
   - **redundant**: In anderen Spalten bereits enthalten
   - **meta-feature**: Kein Spielfeldverhalten, sondern Communityeinfluss
   - **negativ relevant**: Führt zu Minuspunkten oder Nachteilen

2. **Positionsabhängigkeit** – Gilt die Punktwirkung nur für bestimmte Spielerrollen (z. B. Verteidiger)?

Zusätzlich wird für jede Spalte der **Datentyp** angegeben:
- `numerisch`: enthält Zahlen (z. B. Minuten, Tore)
- `kategorisch`: enthält Kategorien oder Texte (z. B. Position, Teamname)

---

## Nicht verwendbare Spalten

| Spalte         | Grund                                        |
|----------------|----------------------------------------------|
| `first_name`   | Nur zur Identifikation, nicht modellrelevant |
| `second_name`  | Nur zur Identifikation, nicht modellrelevant |
| `total_points` | Zielvariable, nicht als Eingabe verwenden    |

---

## Potenziell verwendbare Features

| Spalte                | Typ         | Beschreibung                                                                 | Punktrelevanz        | Positionsabhängig |
|-----------------------|-------------|------------------------------------------------------------------------------|-----------------------|-------------------|
| `goals_scored`        | numerisch   | Anzahl erzielter Tore                                                        | sehr relevant         | nein              |
| `assists`             | numerisch   | Anzahl Torvorlagen                                                           | sehr relevant         | nein              |
| `minutes`             | numerisch   | Gesamte Einsatzzeit in Minuten                                               | sehr relevant         | nein              |
| `clean_sheets`        | numerisch   | Anzahl Spiele ohne Gegentor                                                  | sehr relevant         | ja                |
| `creativity`          | numerisch   | Indexwert für Chancenerarbeitung                                             | relevant              | nein              |
| `influence`           | numerisch   | Indexwert für Spielkontrolle und Präsenz                                     | relevant              | nein              |
| `threat`              | numerisch   | Indexwert für Torgefahr                                                      | relevant              | nein              |
| `bps`                 | numerisch   | Bonus Point System, Rohwert                                                  | optional              | nein              |
| `bonus`               | numerisch   | Vergebene Bonuspunkte                                                        | optional              | nein              |
| `ict_index`           | numerisch   | Kombination aus influence, creativity, threat                                | redundant             | nein              |
| `selected_by_percent` | numerisch   | Beliebtheit in der FPL-Community                                             | meta-feature          | nein              |
| `now_cost`            | numerisch   | Marktwert in 0.1-Millionen-Schritten                                         | relevant              | nein              |
| `element_type`        | kategorisch | Spielerrolle (1 = GK, 2 = DEF, 3 = MID, 4 = FWD)                             | sehr relevant         | nein              |
| `red_cards`           | numerisch   | Anzahl roter Karten                                                          | negativ relevant      | nein              |
| `yellow_cards`        | numerisch   | Anzahl gelber Karten                                                         | negativ relevant      | nein              |

---

## Erste Überlegungen zur späteren Nutzung

- Spalten wie `goals_scored`, `assists`, `minutes`, `clean_sheets` und `element_type` bilden die wichtigsten Grundmerkmale zur Punktprognose.
- `selected_by_percent` ist ein sogenanntes **Meta-Feature**, das die Auswahlhäufigkeit eines Spielers durch reale FPL-Teilnehmende misst. Es kann nützlich sein, weil es indirekt viele Faktoren bündelt (Form, Vertrauen, Spielzeit, Gegner etc.). Gleichzeitig birgt es das Risiko von **Verzerrung**, da es auf subjektiver Wahrnehmung basiert.
- `ict_index` ist abgeleitet aus anderen Features und sollte **nicht zusätzlich** verwendet werden, wenn `influence`, `creativity` und `threat` einzeln verfügbar sind.
- Die Bewertung der Punktrelevanz ist für spätere Modellschritte wichtig, muss aber bei neuen Regeln (ab 2025/26) nochmals überprüft werden.

> Für eine vollständige Einordnung der aktuellen und zukünftigen Punktevergabe-Regeln siehe: `docs/fpl_basics/fpl_punktevergabe.md`.
