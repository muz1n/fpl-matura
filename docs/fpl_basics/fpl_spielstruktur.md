# Spielstruktur im Fantasy Premier League (FPL)

Dieses Dokument erklärt die grundlegenden Spielmechanismen der Fantasy Premier League, gültig bis einschliesslich Saison 2024/25. Es enthält alle wichtigen Informationen über Kader, Budget, Transfers, Chips, Kapitänsregeln und automatische Aufstellung.

---

## Kader & Aufstellung

- Jeder Manager stellt einen Kader aus **15 Spielern** zusammen:
  - **2 Torhüter**
  - **5 Verteidiger**
  - **5 Mittelfeldspieler**
  - **3 Stürmer**

- Pro Spieltag werden **11 Spieler** aufgestellt. Die restlichen 4 sind Bankspieler.
- Die Formation kann frei gewählt werden, es gelten aber folgende Einschränkungen:
  - Es muss immer **genau 1 Torhüter** aufgestellt sein.
  - Es müssen mindestens **3 Verteidiger** eingesetzt werden.
  - Maximal **3 Stürmer** sind erlaubt.

---

## Budget & Preise

- Das Startbudget beträgt **£100 Millionen**.
- Die Preise der Spieler ändern sich während der Saison in 0.1-Millionen-Schritten (z. B. von 6.5 auf 6.6 Mio), abhängig vom Transferverhalten der Community.
- Spielerwerte werden täglich angepasst, steigen oder fallen aber nicht unbegrenzt schnell.

---

## Transfers

- Pro Gameweek ist **ein Transfer kostenlos**.
- Unbenutzte Transfers können auf die nächste Woche übertragen werden, bis zu einem Maximum von **5 gleichzeitig**.
- **Jeder zusätzliche Transfer kostet 4 Punkte Abzug**.
- Transfers können jederzeit gemacht werden, sind aber nur bis zum jeweiligen Gameweek-Deadline gültig.
- In einer Gameweek sind maximal **20 Transfers erlaubt**, ausser beim Einsatz eines Chips.

---

## Chips

Chips sind Sonderaktionen, die strategisch eingesetzt werden können. Sie verändern Aufstellung, Punktevergabe oder Transfers. Pro Gameweek kann **nur ein Chip aktiv sein**.

| Chip               | Verfügbarkeit      | Effekt                                                                 |
|--------------------|--------------------|------------------------------------------------------------------------|
| **Wildcard**        | 2× pro Saison      | Unbegrenzte Transfers ohne Punkteverlust. Eine pro Saisonhälfte.       |
| **Free Hit**        | 1× pro Saison      | Einmaliger, temporärer Teamwechsel für eine einzelne Gameweek.         |
| **Bench Boost**     | 1× pro Saison      | Auch alle vier Bankspieler erhalten in dieser Woche Punkte.            |
| **Triple Captain**  | 1× pro Saison      | Der Captain erhält dreifache Punkte anstelle von doppelten.            |
| **Assistant Manager** | Nur 2024/25       | Automatisierte Aufstellung für drei Spieltage. Ab 2025/26 gestrichen.  |

**Hinweise:**
- Die Wildcard ist als einziger Chip **zweimal pro Saison verfügbar**: einmal vor Ende Dezember, einmal danach.
- Der Assistant Manager Chip wurde **nur in der Saison 2024/25 eingeführt** und ist in der **Saison 2025/26 nicht mehr verfügbar**.
- Chips müssen manuell aktiviert werden. Es ist **nicht möglich, zwei Chips gleichzeitig zu aktivieren**.

---

## Kapitäns-Logik

- Der **Captain** erhält **doppelte Punkte** für seine Leistungen.
- Der **Vice-Captain** springt ein, falls der Captain nicht spielt.
- Wird keiner der beiden eingesetzt, wird kein Punktedoppler vergeben.

---

## Automatische Auswechslung (Substitution)

- Wenn ein aufgestellter Spieler **nicht spielt**, wird er automatisch durch einen Bankspieler ersetzt.
- Die Reihenfolge der Bank wird vom Manager selbst bestimmt.
- Substitutionen passieren nur, wenn die Formation weiterhin gültig bleibt (z. B. kein Wechsel auf 2 Verteidiger möglich).

---

## Bedeutung für das Projekt

Diese Struktur ist relevant für die spätere Team-Optimierungslogik und die WebApp:

- Das **Budget** limitiert, welche Spieler gleichzeitig im Team sein können.
- Die **Positionsstruktur** (z. B. min. 3 Verteidiger) beeinflusst zulässige Formationen.
- **Transfers** erzeugen strategische Abwägungen (–4 Punkte Abzug), was in Simulationen abgebildet werden muss.
- Die **Chips** können starken Einfluss auf das Punktepotenzial haben. Sie sind besonders relevant bei der Planung über mehrere Spieltage.
- Die temporäre Existenz des **Assistant Manager Chips** ist nur relevant, wenn Daten aus der Saison 2024/25 verwendet werden.

> Neue oder geänderte Spielmechanismen ab der Saison 2025/26 (z. B. Chips, neue Bonusregeln) werden separat in `fpl_regeländerungen_2025.md` dokumentiert.
