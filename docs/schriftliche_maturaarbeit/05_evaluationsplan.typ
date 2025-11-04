#let evaluationsplan() = [
= Evaluationsplan

== Wozu dieses Kapitel dient
Ich lege fest, wie ich die Qualität meiner Vorhersagen prüfe. Ich definiere einfache Vergleichsmethoden, erkläre die Hauptmetrik, beschreibe die zeitliche Trennung von Training und Test, plane die Visualisierungen und nenne zusätzliche Prüfungen, damit die Aussagen robust und laienklar sind.

== Baselines, die ich vergleiche
Ich setze drei sehr einfache Methoden als Untergrenze. Mein Modell ist nur sinnvoll, wenn es diese Baselines klar schlägt.

- Letzter-Wert  
  Prognose für die nächste Gameweek ist gleich die Punktzahl der letzten Gameweek des gleichen Spielers.

- Gleitender Durchschnitt  
  Prognose ist der Durchschnitt der letzten n Spiele desselben Spielers. Ich starte mit n = 3, weil das kurze Formschwankungen glättet, aber nicht zu träge wird.

- Positionsdurchschnitt  
  Prognose ist der Durchschnitt der Punkte für Spieler derselben Position über die letzten n Spiele. Das ist eine naive Gruppenreferenz.

Ich dokumentiere später die genauen n-Werte im Journal, sobald ich die ersten Läufe gemacht habe.

== Hauptmetrik: MAE
Ich bewerte Vorhersagen mit dem mittleren absoluten Fehler, kurz MAE. Er ist leicht zu erklären, robust gegen Ausreisser und in Punkten lesbar.

- Definition  
  Für jede Beobachtung berechne ich die absolute Abweichung zwischen wahrer Punktzahl und Vorhersage. Ich addiere alle Abweichungen und teile durch die Anzahl Beobachtungen. Ein kleinerer MAE ist besser.

- Beispiel (kurz)  
  Wahr: 5, 2, 8  
  Vorhersage: 4, 3, 10  
  Abweichungen: 1, 1, 2  
  Summe: 4, Anzahl: 3, MAE: 1.33

Optional kann ich RMSE nennen. Für Laien reicht MAE.

== Datensplits: Training und Test
Ich respektiere die Zeitachse, damit keine Zukunftsinformation in das Training rutscht.

- Primärer Split  
  Training auf früheren Gameweeks, Test auf späteren Gameweeks derselben Saison. Beispiel: Train bis GW 24, Test ab GW 25. Die genauen Grenzen schreibe ich in das Journal der jeweiligen Läufe.

- Rollende Validierung (optional, falls genug Daten)  
  Mehrere Zeitfenster nacheinander prüfen, zum Beispiel  
  Train GW 1–20, Test GW 21–24  
  Train GW 1–24, Test GW 25–28  
  Train GW 1–28, Test GW 29–32  
  So sehe ich, ob die Güte im Saisonverlauf stabil bleibt.

- Keine Überschneidung  
  Ich prüfe, dass keine Zeilen aus dem Test im Training landen. Ich protokolliere die Gameweeks der Splits.

== Leckagen sicher vermeiden
- Nur Vergangenheit verwenden  
  Rollende Durchschnitte und Summen schauen rückwärts. Die Zielwoche selbst ist nie im Fenster.

- Gegnerstärke ohne Zukunft  
  Team- und Gegnerindikatoren nutze ich nur mit Informationen, die vor der Zielwoche verfügbar waren.

- Nach dem Zusammenführen prüfen  
  Nach jedem Join kontrolliere ich Zeilenzahl, Duplikate und Stichproben der Zeitstempel.

== Visualisierungsplan und Lesesätze
Ich plane wenige, einfache Grafiken. Jede Grafik bekommt einen kurzen Lesesatz, Achsenbeschriftungen, Zeitraum und Quelle.

- Balken: Modell vs. Baselines (MAE)  
  Lesesatz: Das Modell hat im Test einen niedrigeren MAE als alle Baselines.

- Balken: Fehler nach Position  
  Lesesatz: Hier sieht man, in welcher Position die Vorhersagen genauer sind.

- Balken: Feature-Wichtigkeit (Permutation)  
  Lesesatz: Diese Eingaben beeinflussen die Schätzung am stärksten. Hinweis: Wichtigkeit ist nicht automatisch Ursache.

- Streuung (optional): Vorhersage vs. Wahrheit mit Punktwolke  
  Lesesatz: Punkte liegen näher an der Diagonalen, wenn die Schätzung gut ist.

Ich halte die Achsen klar, nenne Einheiten in Punkten und schreibe Zeitraum und Datenquelle unter die Grafik.

== Zusätzliche Robustheitstests
- Minutenfilter  
  Ergebnisse zusätzlich nur für Spieler mit mindestens 30 gespielten Minuten betrachten. Ziel: weniger Rauschen durch Kurz-Einsätze.

- Heim vs. Auswärts  
  Fehler getrennt nach Heim und Auswärts prüfen, weil Heimvorteil eine Rolle spielen kann.

- Gegnerstärkeklassen  
  Fehler nach groben Gegnerklassen vergleichen, zum Beispiel stark, mittel, schwach. Das zeigt, wo das Modell Probleme hat.

- Saisonabschnitte  
  Früh, Mitte, Ende separat betrachten. Rotation und Verletzungen können sich saisonal unterscheiden.

== Berichten, was wirklich zählt
Ich schreibe die folgenden Angaben immer in Textform aus, damit ein Laie die Aussage versteht.

- MAE im Test, absolute Zahl in Punkten.  
- Differenz zum besten Baseline-MAE in Punkten.  
- Kurzsatz zur Praxisbedeutung, zum Beispiel: Der Unterschied von 0.4 Punkten MAE pro Spieler ist bei 11 Startern pro Woche im Mittel 4.4 Punkte pro Spielwoche.

Optional kann ich Konfidenzintervalle per Bootstrapping angeben. Für Laien erkläre ich das so: Ich ziehe viele Stichproben mit Zurücklegen aus den Testfällen, berechne jedes Mal den MAE und nehme daraus den Bereich, der die mittleren 95 Prozent der Werte umfasst. Das zeigt, wie stabil die Zahl ist.

== Dokumentation und Reproduzierbarkeit
- Ich notiere Modellversion, Hyperparameter, Zufallsstartwert, Datenstände und genaue Gameweeks.  
- Ich schreibe die Dateipfade der Trainings- und Testtabellen.  
- Ich speichere Metriken und Grafiken unter out/ mit einem Datum im Namen.  
- Ich verweise im Journal auf den Skriptaufruf, damit der Lauf nachgestellt werden kann.

== Was ein Laie nach diesem Kapitel versteht
- Wogegen ich mein Modell messe und warum das fair ist.  
- Was der MAE bedeutet und warum ich ihn nutze.  
- Wie ich Zeitverzerrungen vermeide.  
- Welche Grafiken kommen und wie man sie liest.  
- Welche Zusatzprüfungen zeigen, dass das Ergebnis stabil ist.

== Akzeptanzkriterien
- Baselines sind klar benannt und laienfreundlich erklärt.  
- MAE ist sauber definiert, Beispiel vorhanden.  
- Zeitliche Splits sind beschrieben, keine Überschneidung.  
- Geplante Grafiken haben Lesesätze, Achsen, Zeitraum, Quelle.  
- Zusätzliche Checks zur Robustheit sind genannt.  
- Dokumentationspunkte für Reproduzierbarkeit sind aufgeführt.
]
