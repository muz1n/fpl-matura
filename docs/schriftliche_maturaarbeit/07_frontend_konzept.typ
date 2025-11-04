#let frontend_konzept() = [
= Frontend-Konzept

== Zweck dieses Kapitels
Ich beschreibe, wie die Web-App aufgebaut ist, damit ein Leser ohne Vorkenntnisse versteht, *was* er sieht, *warum* die Elemente so gestaltet sind und *wie* aus Modellwerten klare Entscheidungen werden. Ich halte mich an einfache Sprache, klare Bezeichnungen und sichtbare Einheiten.

== Ziel des Frontends
- Die App zeigt Prognosen pro Spieler verständlich an.
- Die App unterstützt konkrete Entscheidungen: Transfers, Aufstellung, Captain.
- Die App bleibt nachvollziehbar: Jede Zahl hat Kontext, jede Ansicht hat einen kurzen Lesesatz.

== Kernansichten (Screens)
Ich plane wenige, übersichtliche Screens. Jede Ansicht hat oben einen Lesesatz: ein Satz, der erklärt, was man sehen soll.

*Start / Übersicht*
- Lesesatz: _Diese Seite zeigt die wichtigsten Schritte für die aktuelle Gameweek._
- Elemente: Gameweek-Auswahl, Hinweis zur Datenaktualität, schnelle Links zu *Spielersuche* und *Team-Builder*.
- Status-Badges: Datenstand (z. B. 2025-10-31), Modellversion (z. B. rf_v1).

*Spielersuche (Liste)*
- Lesesatz: _Hier finde ich Spieler mit Prognosewert, Minuten-Erwartung und Gegnerinfo._
- Elemente: Suchfeld, Filter (Position, Team, Budget-Rest, Heim/Auswärts), Sortierung nach Prognose.
- Anzeige pro Spieler: Name, Position, Team, Prognose in Punkten, einfacher Kontext (Heim/Auswärts, Gegnerkategorie), kurzer Text *warum* (z. B. *xg_ma3 hoch, mins_ma3 stabil*).

*Team-Builder*
- Lesesatz: _Hier stelle ich mein Team zusammen, unter Budget und Club-Limits._
- Elemente: Budget-Anzeige, Restbudget in CHF-Punkten (oder FPL-Währung), Anzahl Club-Slots, Formation-Auswahl (z. B. 3-5-2), Positionsleisten zum Befüllen.
- Unterstützung: Schaltfläche *Empfehlung übernehmen* (füllt Slot mit Top-Kandidat unter den Constraints), Undo/Redo.

*Vergleich Baselines vs. Modell* (kompakt)
- Lesesatz: _Diese Ansicht zeigt, dass das Modell die einfachen Baselines im Test schlägt._
- Elemente: Zahlenboxen mit MAE-Werten je Methode und knapper Text, was das praktisch bedeutet (ohne Diagramme, nur klare Zahlen und 1–2 Sätze).

*Erklärung der Prognose* (pro Spieler)
- Lesesatz: _Hier steht kurz, welche Eingaben die Schätzung dieses Spielers am stärksten beeinflussen._
- Elemente: 3–5 Stichwörter mit kurzer Begründung (z. B. *mins_ma3 hoch*, *xg_ma3 mittel*, *opp_strength niedrig*). Kein Fachjargon ohne Erklärung.

== Eingaben (User-Inputs)
- Gameweek-Wähler: Auswahl der Ziel-Gameweek.
- Filter: Position, Team, Preisbereich, Heim/Auswärts, Gegnerstärke-Kategorie.
- Teamregeln: Formation, Budget, max. 3 Spieler pro Club.
- Optional: Schalter *nur Spieler mit hoher Einsatzwahrscheinlichkeit* (z. B. mins_ma3 ≥ Schwellenwert).

== Ausgaben (sichtbar und laienklar)
- Prognose pro Spieler in Punkten mit Einheit *Pkt*.
- Kontextangaben: Heim/Auswärts, Gegnerkategorie (stark, mittel, schwach), kurzer *warum*-Hinweis.
- Im Team-Builder: Summenleiste (erwartete Team-Punkte), Restbudget, Regelhinweise (z. B. *Club-Limit erreicht*).

== Anzeige-Regeln für Zahlen
- Jede Zahl mit Einheit (z. B. *8.3 Pkt*).
- Rundung: auf eine Dezimalstelle, damit Zahlen ruhig wirken.
- Negative Zahlen vermeiden; falls doch (technisch), als 0.0 Pkt anzeigen und Flag *prüfen* anzeigen.

== Fehlermeldungen und leere Zustände
- Keine rohen Fehlermeldungen. Stattdessen einfache Sätze:
  - *Keine Daten gefunden für diese Filter. Bitte Filter lockern.*
  - *Verbindung fehlgeschlagen. Bitte neu laden.*
- Leere Liste: Kurzer Text, wie man zu Ergebnissen kommt (z. B. *Filter entfernen oder Gameweek ändern*).

== Navigation und Lesbarkeit
- Immer sichtbare Brotkrumen: *Übersicht → Spielersuche* oder *Übersicht → Team-Builder*.
- Lesesätze direkt über Listen/Blöcken.
- Labels in einfacher Sprache: *Prognose*, *Minuten-Erwartung*, *Gegnerstärke*.

== Mobile und Desktop
- Mobile: Einspaltig, Hauptaktionen gross und mit Text.
- Desktop: Zwei-Spalten-Layout möglich (Liste links, Details rechts).
- Interaktionen ohne Hover-Abhängigkeit: alle Hinweise sind klickbar oder dauerhaft sichtbar.

== Datenaktualität und Version
- Kopfzeile mit *Datenstand* (Datum/Zeit), *Modellversion*, *Feature-Version*.
- Tooltip erklärt, was die Version bedeutet: *Trainiert bis GW 24, getestet ab GW 25*.

== Einfache Barrierefreiheit
- Bedienelemente mit Tastatur erreichbar.
- Klare Fokusmarkierung.
- Alternativtext für Icons.

== Wie App und Pipeline zusammenspielen
- Die Pipeline speichert Prognosen als einfache Datei mit Datum und Gameweek.
- Das Frontend liest die aktuelle Datei (*Datenstand* sichtbar).
- Bei neuen Läufen zeigt die App automatisch den neuesten Stand, die alte Version bleibt auswählbar.

== Mini-Fluss für einen Nutzer (Beispiel)
1. Ich öffne die Übersicht, wähle die Gameweek 25.
2. Ich gehe zur Spielersuche, filtere auf *DEF* und *Heim*.
3. Ich sortiere nach *Prognose*. Ich öffne einen Spieler und lese *warum*.
4. Im Team-Builder fülle ich Slots, beachte Budget und Club-Limits.
5. Ich prüfe die erwartete Team-Punktzahl und speichere die Auswahl.

== Akzeptanzkriterien für das Frontend-Konzept
- Jede Ansicht hat einen Lesesatz in einfachem Deutsch.
- Alle Zahlen tragen eine Einheit und eine kurze Deutung.
- Es gibt klare Texte für Fehler und leere Zustände.
- *Warum*-Hinweise pro Spieler bestehen aus 3–5 einfachen Stichwörtern.
- Datenstand und Modellversion sind sichtbar.
- Team-Builder verhindert Regelverstösse und erklärt *warum*.

== Was ein Laie nach diesem Kapitel versteht
- Welche Ansichten es gibt und wozu sie dienen.
- Welche Eingaben er setzen kann und welche Ausgaben er bekommt.
- Wie aus Prognosezahlen konkrete Team-Entscheidungen werden.
]
