# Feature-Dokumentation: cleaned_players.csv (Saison 2022/23)

> **In einfachen Worten (mein Vorgehen):**  
> Ich will FPL-Punkte vorhersagen. Dafür prüfe ich pro Spalte:  
> 1) Hat sie mit Punkten zu tun (direkt/indirekt)?  
> 2) Wirkt sie je Position anders?  
> 3) Ist sie **vor** der Deadline bekannt (kein Leakage)?  
> **Transformation** bedeutet: Werte so aufbereiten, dass sie vergleichbar sind (z. B. pro 90 Minuten statt Saison-Summe).  
> **Einfrieren** bedeutet: Preis/Beliebtheit genau so verwenden, wie sie **vor** der Deadline waren (Snapshot), damit keine Zukunftsinfos ins Modell rutschen.  
> Diese Datei ist eine Arbeitsgrundlage; die Live-Vorhersage passiert später auf Gameweek-Daten.

## Inhalt
- [Hinweis zur Datenlage](#hinweis-zur-datenlage)
- [Bewertungssystematik](#bewertungssystematik)
- [Nicht verwendbare Spalten](#nicht-verwendbare-spalten)
- [Spaltenübersicht](#spaltenübersicht)
- [Auswahl für das erste Modell](#auswahl-für-das-erste-modell)
- [Risiken und Bias](#risiken-und-bias)
- [Nächste Schritte](#nächste-schritte)
- [Eigenes Vorgehen und Grenzen](#eigenes-vorgehen-und-grenzen)


## Hinweis zur Datenlage
`cleaned_players.csv` enthält aggregierte Saisondaten (eine Zeile pro Spieler) aus 2022/23. Die spätere App arbeitet auf Gameweek-Ebene. Diese Datei dient hier zur strukturierten Feature-Einschätzung und zum Ableiten von sinnvollen Transformationen.  
Regelbezug siehe `docs/fpl_basics/fpl_punktevergabe.md` (bis 2024/25). Änderungen ab 2025/26 werden separat dokumentiert.


## Bewertungssystematik
Für jedes potenzielle Feature werden festgehalten:
- **Punktebezug**: direkter oder indirekter Zusammenhang mit FPL-Punkten  
- **Positionsabhängig**: unterscheidet sich die Punktewirkung je Position  
- **Leakage**: würde das Feature Informationen nutzen, die erst nach dem Spiel entstehen oder stark von Ergebnis-Hype abhängen  
- **Zeitbezug**: saison-aggregiert, vor dem Spiel, nach dem Spiel  
- **Transformation**: empfohlene Aufbereitung, z. B. pro 90, Normalisierung


## Nicht verwendbare Spalten

| Spalte         | Grund                                      |
|----------------|--------------------------------------------|
| `first_name`   | Nur Identifikation                         |
| `second_name`  | Nur Identifikation                         |
| `total_points` | Zielvariable, nicht als Eingabe verwenden  |


## Spaltenübersicht
Hinweis: „Positionsabhängig = ja“ bedeutet, dass die Punktewirkung je Position verschieden ist, z. B. Tore und Clean Sheets.

| Spalte                | Typ         | Beschreibung                                                 | Punktebezug (Regel)                        | Positionsabhängig | Leakage        | Zeitbezug           | Transformation / Notizen                                        |
|-----------------------|-------------|--------------------------------------------------------------|--------------------------------------------|-------------------|----------------|---------------------|-----------------------------------------------------------------|
| `goals_scored`        | numerisch   | Erzielt Tore (Saison total)                                  | Torpunkte unterschiedlich je Position      | **ja**            | nein           | saison-aggregiert   | Rate pro 90 oder Rollfenster aus `merged_gw`                    |
| `assists`             | numerisch   | Torvorlagen (Saison total)                                   | Assistpunkte                               | nein              | nein           | saison-aggregiert   | Rate pro 90 oder Rollfenster                                   |
| `minutes`             | numerisch   | Gesamte Einsatzzeit (Saison)                                 | Minutenpunkte, Basis für CS-Bewertung      | nein              | nein           | saison-aggregiert   | Anteil Einsatzzeit, Availability-Proxy                          |
| `clean_sheets`        | numerisch   | Spiele ohne Gegentor                                         | CS-Punkte je Position unterschiedlich      | **ja**            | nein           | saison-aggregiert   | CS-Rate statt absolute Zahl                                     |
| `creativity`          | numerisch   | FPL-Index Chance-Creation                                    | indirekt                                   | nein              | nein           | saison-aggregiert   | Standardisieren optional                                        |
| `influence`           | numerisch   | FPL-Index Spielkontrolle                                     | indirekt                                   | nein              | nein           | saison-aggregiert   | Standardisieren optional                                        |
| `threat`              | numerisch   | FPL-Index Torgefahr                                          | indirekt                                   | nein              | nein           | saison-aggregiert   | Standardisieren optional                                        |
| `bps`                 | numerisch   | Bonus Point System Rohwert                                   | Grundlage Bonusvergabe                     | nein              | **ja**         | **post-match**       | Nicht als Input für Vorhersagen derselben GW nutzen             |
| `bonus`               | numerisch   | Vergebene Bonuseinheiten                                     | direkte Punkte                             | nein              | **ja**         | **post-match**       | Nicht als Input für Vorhersagen derselben GW nutzen             |
| `ict_index`           | numerisch   | Kombi aus `influence`, `creativity`, `threat`                | indirekt                                   | nein              | nein           | saison-aggregiert   | Redundant, weglassen, da aus Einzelindizes ableitbar            |
| `selected_by_percent` | numerisch   | Beliebtheit in der Community                                 | meta, spiegelt Form und Hype               | nein              | potenziell     | vor dem Spiel        | Nur konservativ nutzen, Snapshot-Zeitpunkt vor Deadline fixieren |
| `now_cost`            | numerisch   | Marktwert in 0.1 Mio                                         | Budget-Constraint, indirekter Leistungsbezug | nein            | potenziell     | vor dem Spiel        | Skalieren in Mio, Preisänderungen optional als Feature          |
| `element_type`        | kategorisch | Position: 1 GK, 2 DEF, 3 MID, 4 FWD                          | regelt Punktegewichtung                     | n. a.             | nein           | zeitlos             | One-Hot oder als int belassen                                   |
| `red_cards`           | numerisch   | Rote Karten                                                  | negative Punkte                            | nein              | nein           | saison-aggregiert   | Rate pro 90 oder pro Einsatz                                    |
| `yellow_cards`        | numerisch   | Gelbe Karten                                                 | negative Punkte                            | nein              | nein           | saison-aggregiert   | Rate pro 90 oder pro Einsatz                                    |


## Auswahl für das erste Modell
Robuste Baseline mit Random Forest:
- Kernleistung: `goals_scored` als Rate, `assists` als Rate, `minutes` als Availability-Proxy  
- Defensiv: `clean_sheets` als Rate, plus `element_type`  
- Kontextindizes: `creativity`, `influence`, `threat` standardisiert  
- Budget: `now_cost` skaliert  
- Nicht verwenden für gleiche GW: `bonus`, `bps`  
- Weglassen: `ict_index`  
- Optional/meta: `selected_by_percent` nur mit klar definiertem Stichtag vor Deadline


## Risiken und Bias
- Leakage: `bonus` und `bps` entstehen nach dem Match, für Ziel-GW nicht verwenden  
- Aggregation: Saisonwerte glätten Form, für Live später auf GW-Daten mit Rollfenster wechseln  
- Meta-Effekte: `selected_by_percent` und `now_cost` spiegeln Community-Reaktionen  
- Positionslogik: Punkte für Tore und Clean Sheets sind positionsabhängig, `element_type` ist nötig


## Nächste Schritte
1. In `features/vaastav/merged_gw_2022-23.md` identische Tabelle auf GW-Basis anlegen  
2. Raten berechnen: `goals_scored_per90`, `assists_per90`, `cards_per90`, `cs_rate`  
3. `creativity`, `influence`, `threat` standardisieren  
4. Stichtage definieren: Preis und Beliebtheit vor jeder Deadline einfrieren  
5. `ict_index` entfernen; `bonus` und `bps` nur für historische Analyse nutzen, nicht als Input der Ziel-GW


## Eigenes Vorgehen und Grenzen
- Ich starte bewusst einfach (Random Forest, wenige, saubere Features).  
- Saisonwerte sind nur Orientierung; für den Prototyp nutze ich `merged_gw` mit rollenden Fenstern.  
- Unsichere Annahmen markiere ich und prüfe sie mit Quellen nach.
