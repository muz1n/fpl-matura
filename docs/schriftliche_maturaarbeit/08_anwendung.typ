#let anwendung() = [
= Anwendung: Von Prognosen zu Entscheidungen

== Ziel dieses Kapitels
Ich zeige, wie ich Modellwerte in klare FPL-Entscheidungen übersetze. Es geht um drei Dinge: Transfers, Aufstellung und Captain. Ich formuliere einfache Rezepte, nenne typische Prüfungen und gebe ein Mini-Beispiel. Ein Laie kann damit nachvollziehen, wie aus Zahlen eine sinnvolle Handlung wird.

== Welche Angaben ich für Entscheidungen nutze
- Prognose der Punkte pro Spieler in *Pkt*
- Minuten-Erwartung, zum Beispiel aus mins_ma3 oder Startelf-Anteilen
- Gegnerkontext, zum Beispiel Heim oder Auswärts und grobe Gegnerstärke
- Formindikatoren, zum Beispiel points_ma3 oder xg_ma3
- Regelkontext, Budget und Club-Limits

== Transfers: einfaches Entscheid-Rezept
*Ziel:* Spieler finden, die voraussichtlich über dem Positions-Durchschnitt punkten, und schwache oder riskante Spieler ersetzen.

Schritte
1. Kandidatenliste erstellen. Ich sortiere alle Spieler der Ziel-Gameweek nach Prognose in *Pkt* und filtere auf Position und Budget.  
2. Minuten prüfen. Nur Spieler mit stabiler Minuten-Erwartung sind sinnvoll.  
3. Kontext prüfen. Heimspiel und schwacher Gegner sind Pluspunkte.  
4. Vergleich mit Positions-Durchschnitt. Liegt die Prognose klar darüber, wird der Spieler zum Transfer-Kandidaten.  
5. Risiko prüfen. Verletzungszeichen, Rotation, Sperren und ungeklärte Rollen sind Warnsignale.  
6. Budget und Struktur. Passen Preis und Club-Limits, ohne das Team an anderer Stelle zu schwächen.

Typische Ersatzmuster
- Konsequent ersetzen, wenn ein Stammspieler wiederholt deutlich unter dem Positions-Durchschnitt liegt und Rotationsrisiko steigt.  
- Geld freischaufeln, wenn eine teure Position wenig bringt. Dann auf eine solide, günstigere Option wechseln, die stabile Minuten hat.

== Aufstellung: einfaches Entscheid-Rezept
*Ziel:* Die besten elf im Rahmen der Formation aufstellen und die Bank sinnvoll ordnen.

Schritte
1. Startelf nach Prognose. Ich wähle die elf höchsten Prognosen unter Beachtung der Formation.  
2. Minuten-Filter. Grenzfälle mit unsicherer Einsatzzeit landen eher auf der Bank.  
3. Kontext-Tie-Breaker. Bei knappen Fällen geben Heimspiel, Gegnerstärke und Form den Ausschlag.  
4. Bank-Reihenfolge. Zuerst der Spieler mit den besten Minuten und solidem Kontext, dann absteigend. Torhüter bleiben nach den FPL-Regeln eng geführt.

Hinweise zur Formation
- Ich wähle die Formation, in der meine Kaderplätze die höchsten Summen liefern. Wenn Mittelfeldbreite klar stärker wirkt, ist 3-5-2 sinnvoll, sonst 3-4-3.

== Captain: einfaches Entscheid-Rezept
*Ziel:* Einen Spieler wählen, der hohe Prognosewerte mit verlässlichen Minuten kombiniert.

Schritte
1. Kandidaten nach Prognose an die Spitze stellen.  
2. Minuten absichern. Ein Captain muss voraussichtlich lange spielen.  
3. Kontext prüfen. Heimspiel, schwacher Gegner und stabile Rolle sind Pluspunkte.  
4. Vice-Captain wählen. Eine stabile Alternative aus einer anderen Mannschaft, falls der Captain unerwartet ausfällt.

Wann ich vermeide zu captainen
- Hohe Rotationswahrscheinlichkeit ohne klare Infos.  
- Unklare Rückkehr nach Verletzung.  
- Sehr starke Gegner auswärts, wenn es ähnlich starke Alternativen gibt.

== Mini-Beispiel in Worten
Ich wähle die Gameweek 25. In der Spielersuche sortiere ich nach Prognose. Ein Mittelfeldspieler hat eine hohe Prognose, spielt zu Hause gegen einen schwachen Gegner und hat in den letzten drei Spielen viele Minuten und ordentliche xG-Werte. Ich prüfe Budget und Club-Limit, dann transferiere ich ihn für einen Mittelfeldspieler, der seit Wochen unter dem Positions-Durchschnitt liegt und oft nur eingewechselt wurde. In der Aufstellung setze ich ihn in die Startelf. Für den Captain vergleiche ich die zwei höchsten Prognosen. Der eine hat sehr sichere Minuten, Heimspiel und gute Form. Ich nehme ihn als Captain und setze den anderen, der auswärts spielt, als Vice-Captain.

== Besondere Wochen
Doppelte Gameweek  
Ich summiere die Prognosen über beide Spiele eines Spielers und gewichte Minuten realistisch. Captain-Kandidaten aus doppelten Wochen prüfe ich besonders sorgfältig.

Leere Gameweek  
Ich priorisiere Spieler mit bestätigtem Spiel. Prognosen von Spielern ohne Einsatz werden ignoriert. Transfers sichern zuerst die Startelf.

== Sicherheitschecks direkt vor der Deadline
- Kurz Presse- und Teamnews prüfen.  
- Aufstellungstendenzen und Sperren checken.  
- Unplausible Ausreisser hinterfragen. Wenn eine Schätzung für einen Spieler extrem hoch oder niedrig ist, schaue ich mir Minuten und Kontext noch einmal an.

== Was ich nicht überinterpretiere
- Eine Prognose ist keine Garantie. Sie ist ein Erwartungswert.  
- Feature-Wichtigkeit bedeutet nicht Ursache. Sie zeigt nur, welche Eingaben das Modell für die Schätzung stark nutzt.  
- Einzelspiele sind laut. Ich verlasse mich auf rollende Informationen und klare Regeln.

== Was ein Laie nach diesem Kapitel versteht
- Wie aus Prognosen konkrete Transfers entstehen.  
- Wie ich Startelf und Bank fair ordne.  
- Wie ich einen Captain mit Augenmass wähle.  
- Welche Sonderfälle ich beachte und wie ich vor der Deadline prüfe.

== Akzeptanzkriterien
- Drei Entscheid-Rezepte sind vollständig und in einfacher Sprache beschrieben.  
- Ein Mini-Beispiel erklärt die Anwendung ohne Zahlenchaos.  
- Sonderfälle doppelte und leere Wochen sind benannt.  
- Sicherheitschecks vor der Deadline sind aufgelistet.
]
