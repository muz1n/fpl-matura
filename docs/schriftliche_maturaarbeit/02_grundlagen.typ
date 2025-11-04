#let grundlagen() = [
= Grundlagen

== Wozu dieses Kapitel dient
Dieses Kapitel gibt den nötigen Hintergrund, damit ein Leser ohne Vorkenntnisse die späteren Methoden versteht. Ich erkläre knapp, was FPL ist, welche Entscheidungen ich modellieren möchte, wie meine Daten aufgebaut sind, was maschinelles Lernen hier leistet, welche einfachen Vergleichsmethoden ich nutze und wie ich die Güte einer Vorhersage bewerte.

== FPL in verständlich
Fantasy Premier League ist ein Managerspiel zum echten Fussball. Ich stelle ein Team mit begrenztem Budget zusammen und treffe jede Woche Entscheidungen. Punkte entstehen aus echten Leistungen der Spieler. Beispiele sind Tore, Assists, zu Null spielen, Einsatzzeit und Bonuspunkte. Die genauen Regeln der Punktevergabe stehen in `docs/fpl_basics/fpl_punktevergabe.md`. Für das Verständnis hier reicht:

- Es gibt vier Positionen. Torhüter, Verteidiger, Mittelfeld, Stürmer. Die Punkte für dieselbe Aktion unterscheiden sich je nach Position. Ein Tor eines Verteidigers zählt anders als ein Tor eines Stürmers.
- Pro Club darf ich höchstens drei Spieler haben. Das Budget ist begrenzt. Jede Woche gibt es einen Captain, dessen Punkte sich verdoppeln.
- Entscheidungen wiederholen sich jede Gameweek. Genau deshalb lohnt sich ein systematischer Ansatz.

== Welche Entscheidungen ich modellieren möchte
Ich will mit Prognosen über Spielerpunkte meine Entscheidungen besser begründen. Wichtig sind für mich drei Felder:
- *Transfers*. Wen verkaufe ich, wen kaufe ich, passt es in Budget und Strategie.
- *Aufstellung*. Welche elf Spieler stelle ich, wer sitzt auf der Bank.
- *Captain*. Der Captain zählt doppelt, deshalb ist eine verlässliche Erwartung wichtig.

Unsicherheiten, die eine Prognose schwierig machen:
- *Einsatzzeit*. Startelf oder Einwechslung. Ein Spieler mit wenigen Minuten kann kaum viele Punkte holen.
- *Gegnerstärke und Spielort*. Starker Gegner auswärts ist oft ungünstiger als ein Heimspiel gegen ein schwaches Team.
- *Form und Rolle*. Verletzungen, Rotation, neue Position im System des Trainers.

== So sind meine Daten aufgebaut
Ich betrachte eine Beobachtung als Kombination *Spieler und Gameweek*. Dazu gibt es Spalten, die ich als Rohwerte aus Quellen übernehme, und Spalten, die ich selbst ableite.

Beispielhafte Struktur zur Orientierung:
| spieler_id | gw | punkte | minuten | gegner | heim | schuesse | xg | team_tore | gegner_tore |
| 10         | 12 | 6      | 78      | MCI    | 1    | 3        | 0.4| 2         | 1           |

- *Rohwerte* sind direkte Messwerte, zum Beispiel minuten, gegner, heim, gelbe_karte.
- *Abgeleitete Features* fasse ich aus mehreren Rohwerten zusammen, damit das Modell stabile Muster lernt. Beispiele:
  - gleitender Durchschnitt der letzten drei Spiele für minuten, schuesse, xg,
  - Gegnerstärke-Index auf Basis der Gegentore oder Tabelle,
  - Formindikator, der die letzten Spiele stärker gewichtet als ältere Spiele.

Die genaue Liste der Spalten und Features beschreibe ich später im Kapitel „Daten und Features“ mit echten Beispielen aus meinem Datensatz. Hier geht es nur um das Prinzip, damit ein Laie das Grundbild versteht.

== Was maschinelles Lernen hier leistet
Mein Ziel ist eine Vorhersage der *Punkte eines Spielers in der nächsten Gameweek*. Dazu brauche ich drei Dinge:
- *Zielvariable*. Das ist der Wert, den ich schätzen möchte. Hier: punkte in der nächsten Gameweek.
- *Features*. Das sind die Eingaben, die das Modell sieht, zum Beispiel Durchschnittsminuten, xG der letzten Spiele, Gegnerstärke und Heim oder Auswärts.
- *Modell*. Das Verfahren, das aus Features eine Zahl schätzt. Ich setze einen *Random Forest* ein, weil er mit kleineren Datensätzen robust ist, nicht nur lineare Zusammenhänge lernt und mir eine einfache Übersicht zur Bedeutung einzelner Features geben kann.

Wie das Lernen abläuft, in einfachen Worten:
- *Training*. Ich zeige dem Modell vergangene Beispiele mit bekannten Zielwerten. Das Modell lernt, welche Muster bei welchen Features zu welchen Punkten passen.
- *Test*. Ich prüfe das Gelernte an Beispielen, die das Modell noch nicht gesehen hat. So erkenne ich, ob es auch auf neue Daten passt.
- *Overfitting* vermeiden. Ich trenne Trainings- und Testdaten sauber und nutze, wenn es sinnvoll ist, Cross-Validation. Ziel ist, echte Muster zu lernen, nicht nur die Vergangenheit auswendig.

Mini-Beispiel zur Anschaulichkeit:
- Feature A: Durchschnittsminuten der letzten drei Spiele.
- Feature B: Durchschnittlicher xG-Wert der letzten drei Spiele.
- Intuition: Höhere A und B deuten oft auf mehr Punkte hin. Das Modell lernt die Stärke dieser Zusammenhänge aus vielen Beispielen.

== Warum ich Baselines benutze
Baselines sind sehr einfache Methoden. Ich nutze sie als Untergrenze. Mein Modell muss besser sein als diese einfachen Methoden, sonst lohnt sich die zusätzliche Komplexität nicht.

Geplante Baselines in verständlich:
- *Letzter-Wert-Baseline*. Ich setze die Punkte des letzten Spiels als Prognose für die nächste Gameweek.
- *Gleitender Durchschnitt*. Ich nehme den Durchschnitt der letzten n Spiele, zum Beispiel der letzten drei, damit Ausreisser geglättet werden.
- *Positionsdurchschnitt*. Ich nehme den Durchschnitt der Punkte von Spielern derselben Position in den letzten Spielen, als sehr einfache Referenz.

Diese Baselines sind leicht zu erklären und schnell zu berechnen. Sie machen den Vergleich mit dem Modell fair und nachvollziehbar.

== Wie ich Güte messe: MAE verständlich und konkret
Ich brauche eine Zahl, die zeigt, wie weit Vorhersagen im Durchschnitt danebenliegen. Ich nutze den *mittleren absoluten Fehler* MAE. Vorgehen:
1. Pro Beispiel die *absolute Abweichung* zwischen wahrer Punktzahl und Vorhersage bilden.
2. Alle Abweichungen addieren.
3. Durch die Anzahl Beispiele teilen.

Mini-Rechnung mit drei Spielern:
- Wahr: 5, 2, 8
- Vorhersage: 4, 3, 10
- Abweichungen: |5 − 4| = 1, |2 − 3| = 1, |8 − 10| = 2
- Summe: 1 + 1 + 2 = 4
- Anzahl: 3
- *MAE*: 4 geteilt durch 3 ist 1.33

Warum gerade MAE:
- Er ist leicht zu erklären.
- Ein Ausreisser macht den Durchschnitt nicht komplett kaputt, weil ich nicht quadriere.
- Ich kann das Ergebnis in Punkten lesen, das ist für FPL intuitiv.

== Wie meine Pipeline grundsätzlich abläuft
Ich folge einer festen Reihenfolge, damit alles nachvollziehbar bleibt:
1. *Daten sammeln*. Quelle, Zeitraum und Version dokumentieren.
2. *Aufbereiten*. Fehlende Werte prüfen, Datentypen kontrollieren, IDs konsistent halten.
3. *Features bilden*. Sinnvolle abgeleitete Grössen erstellen, zum Beispiel gleitende Durchschnitte und Gegnerstärke.
4. *Trainieren*. Das Modell an Trainingsdaten lernen lassen. Wichtige Hyperparameter bewusst wählen, Zweck kurz begründen.
5. *Testen*. Auf getrennten Daten prüfen, keine Überschneidung mit dem Training.
6. *Vergleichen*. Gegen Baselines vergleichen. Ziel ist ein klarer, fairer Unterschied.
7. *Darstellen*. Ergebnisse mit gut lesbaren Grafiken zeigen. Jede Grafik bekommt einen Lesesatz, Achsen mit Einheiten, Zeitraum und Quelle.

(Geplante Grafik: Einfaches Flussschema mit diesen sieben Schritten. Lesesatz: „So entsteht aus Rohdaten eine Punktprognose, Schritt für Schritt.“)

== Wie ich Grafiken lesbar mache
Ich sorge dafür, dass jede Grafik für Laien verständlich ist:
- Ein *Lesesatz* über oder unter der Grafik, der in einem Satz erklärt, was man sehen soll.
- *Achsen* klar beschriften, Einheiten nennen.
- *Zeitraum* und *Quelle* angeben.
- Wenn notwendig, *Beispielwerte* im Text nennen, damit der Leser eine Zahl in Kontext setzen kann.

== Mini-Glossar
- *Zielvariable*. Der Wert, den ich vorhersage. Hier die Punkte eines Spielers.
- *Feature*. Eine Eingabe für das Modell, zum Beispiel Durchschnittsminuten.
- *Modell*. Das Verfahren, das aus Features eine Vorhersage berechnet.
- *Baseline*. Eine sehr einfache Vergleichsmethode, die als Mindeststandard dient.
- *MAE*. Mittlerer absoluter Fehler, Durchschnitt der absoluten Abweichungen zwischen Vorhersage und Wahrheit.
- *Overfitting*. Zu starkes Lernen der Trainingsdaten, auf neuen Daten schlechter.
- *Reproduzierbarkeit*. Andere können mit denselben Schritten und Daten meine Ergebnisse nachbauen.
]
