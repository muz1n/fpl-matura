# Spielstruktur im Fantasy Premier League (FPL)

Dieses Dokument erklärt die grundlegenden Spielmechanismen der Fantasy Premier League. 
**Basisregeln** gelten fortlaufend; **saison­spezifische Änderungen 2025/26** sind unten im Chip-Abschnitt markiert.

---

## Kader & Aufstellung

- Jeder Manager stellt einen Kader aus **15 Spielern** zusammen:
  - **2 Torhüter**
  - **5 Verteidiger**
  - **5 Mittelfeldspieler**
  - **3 Stürmer**
- Pro **Premier-League-Team** dürfen sich **maximal 3 Spieler** im Kader befinden.

- Pro Spieltag werden **11 Spieler** aufgestellt. Die restlichen 4 sind Bankspieler.
- Die Formation kann frei gewählt werden, es gelten aber folgende Einschränkungen:
  - Es muss immer **genau 1 Torhüter** aufgestellt sein.
  - Es müssen mindestens **3 Verteidiger** eingesetzt werden.
  - Es müssen mindestens **2 Mittelfeldspieler** eingesetzt werden.
  - Es muss mindestens **1 Stürmer** eingesetzt werden.
  - Maximal **3 Stürmer** sind erlaubt.

---

## Budget & Preise

- Das Startbudget beträgt **£100 Millionen**.
- Die Preise der Spieler ändern sich während der Saison in 0.1-Millionen-Schritten (z. B. von 6.5 auf 6.6 Mio), abhängig vom Transferverhalten der Community.
- Spielerwerte werden täglich angepasst, steigen oder fallen aber nicht unbegrenzt schnell.

---

## Transfers

- Pro Gameweek ist **ein Transfer kostenlos**.
- Unbenutzte Transfers können auf die nächste Woche übertragen werden, bis zu einem Maximum von **5 gleichzeitig**.
- **Jeder zusätzliche Transfer kostet 4 Punkte Abzug**.
- Transfers können jederzeit gemacht werden, sind aber nur bis **zur jeweiligen Gameweek-Deadline** gültig.
- In einer Gameweek sind maximal **20 Transfers erlaubt**, ausser beim Einsatz eines Chips.
- **AFCON-Sonderfall 2025/26:** In **GW16** werden die verfügbaren Free Transfers einmalig auf **5** aufgefüllt (Top-up), um Ausfälle durch das Turnier abzufedern.

---

## Chips (2025/26)

Chips sind Sonderaktionen. Pro Gameweek kann **nur ein Chip** aktiv sein.

| Chip              | Verfügbarkeit 2025/26          | Effekt |
|-------------------|---------------------------------|--------|
| **Wildcard**      | **2×** (eine pro Saisonhälfte) | Unbegrenzte Transfers ohne Punktabzug |
| **Free Hit**      | **2×** (eine pro Saisonhälfte) | Einmalige Team-Neuzusammenstellung für eine GW |
| **Bench Boost**   | **2×** (eine pro Saisonhälfte) | Alle 15 Spieler punkten |
| **Triple Captain**| **2×** (eine pro Saisonhälfte) | Captain-Punkte werden verdreifacht |
| **Assistant Manager** | **entfällt 2025/26** (nur 2024/25) | – |

**Wichtig:** Das **erste Set** (4 Chips) muss **bis zur GW19-Deadline** gespielt werden und kann **nicht** in die zweite Saisonhälfte übertragen werden; das **zweite Set** ist **ab GW20** bis Saisonende nutzbar.

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
