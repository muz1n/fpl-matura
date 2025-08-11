# Punktevergabe im Fantasy Premier League (FPL)

Dieses Dokument beschreibt die offizielle Punktevergabe im FPL, gültig bis einschliesslich der Saison **2024/25**.

---

## Grundlegende Punktregeln (bis 2024/25)

| Aktion                                 | Punkte                         |
|----------------------------------------|--------------------------------|
| Spielminute (unter 60 Minuten)         | +1                             |
| Spielminute (mindestens 60 Minuten)    | +2                             |
| Tor (Torwart / Verteidiger)            | +6                             |
| Tor (Mittelfeldspieler)                | +5                             |
| Tor (Stürmer)                          | +4                             |
| Assist                                 | +3                             |
| Clean Sheet (Torwart / Verteidiger)    | +4 (nur bei mind. 60 Minuten)  |
| Clean Sheet (Mittelfeldspieler)        | +1 (nur bei mind. 60 Minuten)  |
| 3 gehaltene Schüsse (Torwart)          | +1                             |
| Gehaltener Penalty (Torwart)           | +5                             |
| Verschossener Penalty                  | –2                             |
| Gegentor (Torwart / Verteidiger)       | –1 pro 2 Gegentore             |
| Gelbe Karte                            | –1                             |
| Rote Karte                             | –3                             |
| Eigentor                               | –2                             |
| Bonuspunkte (BPS-System)              | +1 bis +3                      |

> Hinweis: Das Bonus Point System (BPS) wurde ab 2024/25 leicht angepasst (z. B. geringere Punkte für gehaltene Elfmeter, neu bewertete Aktionen wie Pfostenräumungen), jedoch ohne Änderungen an der offiziellen Punktelogik für Spieler.

---

## Relevanz für das Modell

Diese Punktregeln beeinflussen direkt, **welche Features methodisch sinnvoll sind**:

- **Direkte Punktegeber:**  
  `minutes`, `goals_scored`, `assists`, `clean_sheets`, `saves`, `bonus`
- **Indirekte Hinweise zur Vorhersage:**  
  `expected_goals`, `expected_assists`, `threat`, `creativity`

> Hinweis: Ab der Saison 2025/26 gelten neue Punktregeln (z. B. für defensive Aktionen), die in den Daten integriert werden müssen. Siehe `docs/fpl_basics/fpl_regeländerungen_2025.md`.

