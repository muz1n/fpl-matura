# Feature-Dokumentation: merged_gw.csv (Saison 2022/23)

> **In einfachen Worten (mein Vorgehen):**  
> Ich will FPL-Punkte pro Gameweek vorhersagen. Darum prüfe ich pro Spalte:  
> 1) Hat sie mit Punkten zu tun (direkt/indirekt)?  
> 2) Wirkt sie je Position anders?  
> 3) Ist sie **vor** der Deadline bekannt (**kein Leakage**)?  
> **Transformation** bedeutet: Werte so aufbereiten, dass sie vergleichbar und „vorausschauend“ nutzbar sind, z. B. **Rollfenster** über die **letzten n GWs** oder **pro-90-Raten**.  
> **Einfrieren** bedeutet: Werte wie Preis/Beliebtheit als **Snapshot vor Deadline** verwenden, damit keine Infos aus der Zukunft ins Modell rutschen.  
> Viele Spalten dieser Datei sind Match-Ergebnisse. Die nutze ich **nur verzögert** (z. B. als Durchschnitt der letzten Spiele), nicht für dieselbe GW.

## Inhalt
- [Kontext](#kontext)
- [Bewertungssystematik](#bewertungssystematik)
- [Spaltenübersicht](#spaltenübersicht)
- [Empfohlene Startfeatures für die Baseline](#empfohlene-startfeatures-für-die-baseline)
- [Risiken und Bias](#risiken-und-bias)
- [Nächste Schritte](#nächste-schritte)
- [Eigenes Vorgehen und Grenzen](#eigenes-vorgehen-und-grenzen)

---

## Kontext
`merged_gw.csv` enthält **Gameweek-Daten pro Spieler und Spiel** (2022/23). Viele Spalten sind **post-match** (erst nach dem Spiel bekannt). Für echte Vorhersagen verwende ich solche Informationen **nur als Historie** (z. B. Mittelwert der letzten 3–5 GWs), niemals als Input für dieselbe Ziel-GW.

---

## Bewertungssystematik
Für jede Spalte dokumentiere ich:
- **Punktebezug**: direkter oder indirekter Zusammenhang mit FPL-Punkten  
- **Positionsabhängig**: unterschiedliche Punktewirkung je Position (z. B. Tore, Clean Sheet, Saves)  
- **Leakage**: enthält Infos, die erst nach dem Spiel sicher sind  
- **Zeitbezug**: vor dem Spiel, post-match, zeitlos, saison-aggregiert  
- **Transformation**: empfohlene Aufbereitung (Rollfenster, pro 90, Standardisierung, One-Hot)

---

## Spaltenübersicht

> Hinweis: Kurzbeschreibungen sind knapp gehalten, damit die Tabelle gut lesbar bleibt. „Snapshot“ meint einen vor-Deadline-Stand, der eingefroren wird.

| Spalte | Typ | Beschreibung | Punktebezug (Regel) | Positionsabhängig | Leakage | Zeitbezug | Transformation / Notizen |
|---|---|---|---|---|---|---|---|
| `name` | text | Spielername | — | — | nein | zeitlos | Identifikator |
| `position` | text | GK/DEF/MID/FWD | steuert Punktegewichtung | n. a. | nein | zeitlos | One-Hot oder als Kategorie |
| `team` | int/label | Team-ID/Label | indirekt | nein | nein | zeitlos | One-Hot; für Gegnerstärke nützlich |
| `element` | int | Spieler-ID | — | — | nein | zeitlos | Identifikator, für Joins |
| `fixture` | int | Fixture-ID | — | — | nein | zeitlos | Join auf Spielinfos |
| `round` | int | Gameweek-Nummer | — | — | nein | vor dem Spiel | Für Rollfenster |
| `GW` | int | Duplikat/Variante von `round` | — | — | nein | vor dem Spiel | Redundant zu `round` |
| `kickoff_time` | datetime | Anpfiff | indirekt (Resttage, Reise) | nein | nein | vor dem Spiel | Feature Engineering möglich (Tageszeit, Abstand) |
| `opponent_team` | int | Gegner-Team | indirekt (Fixture-Stärke) | nein | nein | vor dem Spiel | Mit Gegnerstärke mergen |
| `was_home` | bool | Heimspiel | indirekt | nein | nein | vor dem Spiel | binär lassen |
| `team_h_score` | int | Heim-Tore | Ergebnis | — | **ja** | post-match | **Nicht** für Ziel-GW; historisch als „Teamform“ möglich |
| `team_a_score` | int | Auswärts-Tore | Ergebnis | — | **ja** | post-match | s. o. |
| `minutes` | int | Einsatzzeit | Minutenpunkte / Voraussetzung für CS | nein | **ja** | post-match | **Nur historisch** als Availability-Proxy (Rollfenster) |
| `goals_scored` | int | Tore in der GW | direkte Tore-Punkte | **ja** | **ja** | post-match | Nur als Historie (Rate pro 90, Rollfenster) |
| `assists` | int | Assists in der GW | +3 Punkte | nein | **ja** | post-match | Historie/Rate nutzen |
| `clean_sheets` | int | CS in der GW | CS-Punkte | **ja** | **ja** | post-match | Historische CS-Rate |
| `goals_conceded` | int | Gegentore | −1 je 2 Gegentore (DEF/GK) | **ja** | **ja** | post-match | Historische Rate |
| `saves` | int | Paraden | +1 je 3 Saves (GK) | **ja** | **ja** | post-match | Historische Rate; nur GK relevant |
| `penalties_saved` | int | Gehaltene Elfmeter | +5 (GK) | **ja** | **ja** | post-match | Selten; historisch glätten |
| `penalties_missed` | int | Verschossene Elfmeter | −2 | nein | **ja** | post-match | Historische Rate |
| `yellow_cards` | int | Gelbe Karten | −1 | nein | **ja** | post-match | Historische Rate |
| `red_cards` | int | Rote Karten | −3 | nein | **ja** | post-match | Historische Rate |
| `own_goals` | int | Eigentore | −2 | nein | **ja** | post-match | Historische Rate |
| `bonus` | int | Vergebene Bonuspunkte | +1 bis +3 | nein | **ja** | post-match | **Nicht** für Ziel-GW; nur Historie |
| `bps` | int | BPS-Rohwert | Grundlage Bonusvergabe | nein | **ja** | post-match | **Nicht** für Ziel-GW; nur Historie |
| `influence` | float | FPL-Index Präsenz | indirekt | nein | **ja** | post-match | Historisch; standardisieren |
| `creativity` | float | FPL-Index Kreativität | indirekt | nein | **ja** | post-match | Historisch; standardisieren |
| `threat` | float | FPL-Index Torgefahr | indirekt | nein | **ja** | post-match | Historisch; standardisieren |
| `ict_index` | float | Kombi aus obigen Indizes | indirekt | nein | **ja** | post-match | Redundant, weglassen (oder nur historisch) |
| `expected_goals` | float | xG dieser GW | indirekt, Ereignis-basiert | nein | **ja** | post-match | Nur als Historie (Rollfenster) |
| `expected_assists` | float | xA dieser GW | indirekt | nein | **ja** | post-match | Nur als Historie |
| `expected_goal_involvements` | float | xG+xA | indirekt | nein | **ja** | post-match | Nur als Historie |
| `expected_goals_conceded` | float | xGC dieser GW | indirekt (DEF/GK) | **ja** | **ja** | post-match | Nur als Historie |
| `starts` | int | Startelf-Flag | indirekt (Availability) | nein | **ja** | post-match | Für Historie nutzbar (Start-Rate) |
| `total_points` | int | Punkte in der GW | Zielgrösse | — | **ja** | post-match | **Nicht** als Input; Zielvariable |
| `xP` | float | FPL-Expected Points | meta/prognostisch | nein | **potenziell** | vor dem Spiel* | Nur als **Baseline-Vergleich**; als Input vorsichtig nutzen |
| `value` | int | FPL-Preis (0.1 Mio) | Budget, Markt | nein | potenziell | vor dem Spiel* | In Mio skalieren; **Snapshot** einfrieren |
| `selected` | int | Anzahl Manager | meta (Beliebtheit) | nein | potenziell | vor dem Spiel* | **Snapshot** vor Deadline; optional |
| `transfers_in` | int | Transfers in dieser GW | meta/Marktdruck | nein | potenziell | vor dem Spiel* | **Snapshot** oder Differenzen definieren |
| `transfers_out` | int | Transfers in dieser GW (out) | meta/Marktdruck | nein | potenziell | vor dem Spiel* | s. o. |
| `transfers_balance` | int | In − Out | meta | nein | potenziell | vor dem Spiel* | s. o. |

\* **vor dem Spiel***: Diese Werte sind in der Praxis nur dann vor-Deadline, wenn der Datensnapshot rechtzeitig erfasst wurde. Im Zweifel **einfrieren** und den Zeitpunkt dokumentieren.

---

## Empfohlene Startfeatures für die Baseline
Ziel: **einfache, robuste** Vorhersage der nächsten GW-Punkte mit Random Forest.

**Aus Historie (Rollfenster, z. B. letzte 3–5 GWs):**
- Leistung: `goals_scored`, `assists`, `minutes`, `creativity`, `influence`, `threat`  
- Defensiv: `clean_sheets`, `goals_conceded` (Rate), `saves` für GK  
- Disziplin: `yellow_cards`, `red_cards` (Rates, schwach gewichtet)

**Vor-Match Kontexte:**
- Fixture: `was_home`, `opponent_team` (mit Gegnerstärke), `round`  
- Budget/Meta (optional): `value` (in Mio, Snapshot), `selected`/`transfers_*` (vorsichtig)

**Nicht als Input für Ziel-GW:**
- `total_points`, `bonus`, `bps`, **alle** `expected_*` dieser Ziel-GW, `team_*_score`, `starts`

---

## Risiken und Bias
- **Leakage**: Alles, was erst nach dem Spiel feststeht, nicht für dieselbe Ziel-GW verwenden.  
- **Meta-Dominanz**: `selected`, `transfers_*`, `xP` spiegeln Community/FPL-Modell. Nur kontrolliert einsetzen, damit das eigene Modell nicht „abliest“.  
- **Datums-Schnappschüsse**: `value`, `selected`, `transfers_*` nur als **vor-Deadline-Snapshot** nutzen und den Zeitpunkt festhalten.  
- **Überanpassung an seltene Events**: `penalties_saved`, `own_goals`, `red_cards` sind selten – eher stark glätten oder niedriger gewichten.

---

## Nächste Schritte
1. **Spaltenprofil automatisch auslesen** (Datentyp, Missing-Rate) und hier verlinken.  
2. **Rollfenster-Features** bauen: pro 90 und Durchschnitt der letzten n GWs für Kernspalten.  
3. **Fixture-Stärke** als separaten Merge (Teamratings) einplanen.  
4. **Snapshots** definieren: Wie und wann `value`, `selected`, `transfers_*` eingefroren werden.  
5. **Baseline-Training**: Nur vor-Match-und Historie-Features; MAE gegen naive Baseline (z. B. letzter Wert).

---

## Eigenes Vorgehen und Grenzen
- Ich starte bewusst einfach (Random Forest, wenige, saubere, zukunftssichere Features).  
- Post-Match-Spalten nutze ich **nur** als historisch aggregierte Signale, niemals für die Ziel-GW.  
- Unsichere Annahmen werden markiert und später mit Quellen/Checks abgesichert.
