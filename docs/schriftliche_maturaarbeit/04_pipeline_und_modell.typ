#let pipeline_und_modell() = [
= Pipeline und Modell

== Wozu dieses Kapitel dient
Ich zeige den ganzen Weg von Rohdaten zur Punktprognose. Ich erkläre die Schritte der Pipeline, warum ich ein Random-Forest-Modell verwende, welche Einstellungen wichtig sind, wie ich Training und Test trenne und wie ich typische Fehler (Leckagen) vermeide. Ziel: Ein Leser ohne Vorwissen versteht, *wie* aus Daten eine verlässliche, nachvollziehbare Schätzung entsteht.

== Überblick über die Pipeline
Die Pipeline folgt einer festen Reihenfolge. Jeder Schritt hat ein klares Ziel.

1. *Daten sammeln*  
   Quelle, Zeitraum und Dateipfad festhalten. Ziel: vollständige, auffindbare Datengrundlage.

2. *Aufbereiten*  
   Datentypen prüfen, fehlende Werte erkennen, IDs konsistent halten. Ziel: sauberer, analysierbarer Bestand.

3. *Features bilden*  
   Aus Rohspalten verständliche Eingaben ableiten (zum Beispiel rollende Durchschnitte). Nur Informationen verwenden, die vor der Ziel-Gameweek bekannt waren. Ziel: sinnvolle, stabile Eingaben.

4. *Trainieren*  
   Modell auf Trainingsdaten anpassen. Hyperparameter und Datenstand dokumentieren. Ziel: trainiertes, reproduzierbares Modell.

5. *Testen*  
   Auf getrennten (späteren) Daten prüfen. Metrik MAE berechnen und mit Baselines vergleichen. Ziel: ehrliche Aussage zur Güte.

6. *Vergleichen und deuten*  
   Modell vs. Baselines einordnen. Wichtigste Eingaben erklären. Ziel: Ergebnis fair und laienklar verstehen.

7. *Anwenden*  
   Prognosen für die nächste Gameweek berechnen. Ziel: konkrete Hilfen für Transfers, Aufstellung, Captain.

_Hinweis auf geplante Grafik:_ Ein einfaches Flussbild mit diesen sieben Kästchen. Lesesatz: _So entsteht aus Rohdaten eine Punktprognose, Schritt für Schritt._

== Modellwahl: Warum ich einen Random Forest verwende
* Robust bei kleineren Datenmengen: Viele Bäume mitteln Ausreisser weg.  
* Nichtlineare Zusammenhänge: Schwellen und Wechselwirkungen ohne Formeln.  
* Wenig Vorverarbeitung: Keine Standardskalierung nötig, sinnvolle Codierung genügt.  
* Erklärbarkeit: Feature-Wichtigkeiten lassen sich zeigen (zum Beispiel per Permutation).

_Grenzen, die ich beachte:_  
Random Forests extrapolieren ausserhalb des gesehenen Bereichs schlecht. Sehr viele Bäume machen das Modell langsamer, nicht zwingend besser. Für feine Rangunterschiede sind Gradient-Boosting-Modelle oft stärker; das bleibt als Option für später.

== Wie ein Random Forest funktioniert (kurz)
Viele zufällige Entscheidbäume werden trainiert. Jeder Baum sieht eine Stichprobe der Zeilen und pro Knoten nur einen Teil der Features. Ein Baum teilt Daten in immer homogenere Gruppen und gibt am Blatt einen Zahlenwert aus. Der Forest mittelt die Vorhersagen aller Bäume. Dadurch sinkt die Streuung und die Schätzung wird stabiler als bei einem einzelnen Baum.

== Wichtige Einstellungen (Hyperparameter) und ihr Zweck
Ich nenne den Zweck in Alltagssprache. Konkrete Werte lege ich nach ersten Läufen fest und dokumentiere sie.

* *n_estimators* — Anzahl Bäume. Mehr verringert Zufallsschwankung, kostet Rechenzeit.  
* *max_depth* — maximale Tiefe pro Baum. Begrenzt Komplexität, schützt vor Überanpassung.  
* *min_samples_split* — Mindestzeilenzahl für eine Teilung. Höhere Werte glätten den Baum.  
* *min_samples_leaf* — Mindestzeilenzahl pro Blatt. Verhindert extrem kleine, instabile Blätter.  
* *max_features* — Anzahl möglicher Eingaben pro Knoten. Mehr Zufall, weniger Korrelation zwischen Bäumen, oft stabiler.  
* *criterion* — Fehlerfunktion im Baum. *absolute_error* ist robuster gegen Ausreisser als *squared_error*. Ich vergleiche beides.  
* *random_state* — Startwert für den Zufall, damit Läufe reproduzierbar sind.

== Training und Test sauber trennen (zeitlich)
Die Daten sind zeitlich geordnet. Ich verhindere Zukunftsblick.

* *Zeitliche Trennung*  
  Train auf früheren Gameweeks, Test auf späteren derselben Saison. Beispiel: Train bis GW 24, Test ab GW 25.

* *Rollende Validierung (optional, falls genug Daten)*  
  Mehrere Splits prüfen, zum Beispiel  
  Train GW 1–20 → Test GW 21–24  
  Train GW 1–24 → Test GW 25–28  
  Train GW 1–28 → Test GW 29–32  
  So sehe ich Stabilität über die Saison.

* *Keine Überschneidung*  
  Ich kontrolliere, dass keine Testzeilen im Training landen. Alle Splits (Gameweeks) schreibe ich ins Journal.

== Leckagen sicher vermeiden
*Nur Vergangenheit verwenden.* Rollende Durchschnitte und Summen schauen rückwärts. Die Zielwoche selbst ist nie im Fenster.  
*Gegnerstärke ohne Zukunft.* Team- und Gegnerindikatoren nutzen nur bis vor der Zielwoche bekannte Spiele.  
*Nach Merges prüfen.* Nach jedem Join kontrolliere ich Zeilenzahl, Duplikate und Stichproben der Zeitstempel.

== Wie ich Güte messe und darstelle
Ich nutze den MAE als Hauptmetrik, weil er leicht zu erklären ist und in Punkten lesbar bleibt. Ich vergleiche das Modell gegen einfache Baselines (zum Beispiel letzter Wert, gleitender Durchschnitt, Positionsdurchschnitt). Geplante Grafiken erhalten immer einen Lesesatz, klare Achsen, Zeitraum und Quelle.

* *Vergleich Modell vs. Baselines* — Balken der MAE-Werte. Lesesatz: _Das Modell schlägt die einfachen Baselines um X Punkte MAE._  
* *Feature-Wichtigkeit* — Balken der Permutationswichtigkeiten. Lesesatz: _Diese Eingaben beeinflussen die Schätzung am stärksten._ (Wichtigkeit ist nicht automatisch Ursache.)  
* *Fehler nach Position* — Balken je Position. Lesesatz: _Hier sieht man, für welche Positionen das Modell genauer ist._

== Anwendung auf die nächste Gameweek
Ich erstelle alle Features mit dem letzten verfügbaren Stand, berechne pro Spieler eine Punktprognose, prüfe Plausibilität (keine negativen, keine extremen Ausreisser ohne Grund) und nutze die Werte als Grundlage für Transfers, Aufstellung und Captain.

== Was ein Laie nach diesem Kapitel versteht
* Welche Schritte nötig sind, um aus Daten eine Prognose zu machen.  
* Warum ein Random Forest passt und welche Einstellungen wichtig sind.  
* Warum Zeittrennung und Leckage-Vermeidung entscheidend sind.  
* Wie Ergebnisse gegen einfache Baselines fair eingeordnet werden.
]
