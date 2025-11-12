#let grenzen_risiken() = [
= Grenzen, Risiken, Annahmen

== Ziel dieses Kapitels
Ich lege offen, wo meine Arbeit Unsicherheiten hat, welche Annahmen ich treffe und welche Risiken bestehen. Ich erkläre jeweils kurz, warum das wichtig ist und wie ich damit umgehe. So können Leser die Ergebnisse fair einordnen.

== Datenbezogene Grenzen
* *Abdeckung und Lücken*  
  Nicht alle Spiele haben gleich viele Details. Einzelne Felder fehlen. Das kann Muster verzerren. Ich kennzeichne fehlende Werte und beschreibe die Behandlung im Datenkapitel.

* *Zeitliche Verschiebungen*  
  Datenstände sind nicht immer tagesgleich. Späte Updates können Prognosen leicht ändern. Ich nenne Datum und Uhrzeit des Datenstands im Frontend und in den Dateien.

* *Definitionen und Messfehler*  
  Metriken wie xG sind modelliert und können je nach Quelle abweichen. Ich verwende innerhalb der Arbeit konsistente Quellen und schreibe die Quelle dazu.

* *Regeländerungen der FPL*  
  Änderungen zwischen Saisons können Punkteverteilungen verändern. Historische Daten passen dann nur näherungsweise. Ich markiere betroffene Stellen und reduziere die Interpretation, falls ein Bruch vermutet wird.

== Modellbezogene Grenzen
* *Keine Kausalität*  
  Das Modell erkennt Zusammenhänge, aber keine Ursachen. Eine hohe Wichtigkeit heisst nicht, dass ein Feature die Punkte verursacht. Ich schreibe das bei der Deutung immer dazu.

* *Overfitting-Risiko*  
  Bei kleinen Datensätzen kann ein Modell die Vergangenheit zu genau lernen. Ich begrenze die Baumtiefe, nutze Mindestgrösse pro Blatt und prüfe sauber mit zeitlichem Testsplit.

* *Extrapolation*  
  Random Forests sind schwach ausserhalb des gelernten Bereichs. Für seltene Extremsituationen sind Schätzungen unsicher. Ich markiere Ausreisser in der Deutung als vorsichtig zu lesen.

* *Datenleckage*  
  Zukunftsdaten dürfen nie in Features landen. Ich benutze rollende Fenster, die nur in die Vergangenheit schauen, und dokumentiere die Splits.

== Evaluations- und Methodenrisiken
* *Unfaire Vergleiche*  
  Baselines müssen die gleiche Sicht auf die Vergangenheit haben wie das Modell. Ich gleiche Zeitfenster ab und prüfe doppelt, dass Splits identisch sind.

* *Zufallsschwankung*  
  Ein einzelner Testschnitt kann zufällig günstiger oder ungünstiger sein. Wenn genug Daten vorhanden sind, nutze ich rollende Validierung. Sonst beschreibe ich die Unsicherheit im Text.

* *Ein-Metrik-Fokus*  
  MAE ist gut lesbar, deckt aber nicht alles ab. Ich bleibe bei MAE für Laienverständlichkeit, erwähne aber kurz, wo andere Metriken anderes zeigen könnten.

== Anwendungs- und Frontend-Grenzen
* *Minuten-Prognose ist indirekt*  
  Ich benutze Proxys wie mins_ma3 und Startelf-Anteile. Eine echte Einsatzzeit-Prognose habe ich nicht. Ich weise auf Rotationsrisiko hin.

* *Kontext ist vereinfacht*  
  Gegnerstärke ist grob. Taktische Details, individuelle Matchups oder kurzfristige Trainerentscheidungen bilde ich nicht ab. Ich schreibe das klar hin.

* *Numerische Unsicherheit*  
  Prognosen sind Erwartungswerte. Sie sind keine Garantie. Das Frontend zeigt Einheiten und Lesesätze, damit die Aussage nicht überinterpretiert wird.

== Organisatorische und technische Grenzen
* *Rechenzeit und Wiederholbarkeit*  
  Viele Bäume brauchen Zeit. Ich setze festen random_state und notiere Hyperparameter, damit Läufe wiederholbar sind. Kleine Abweichungen können bleiben.

* *Dateipfade und Versionen*  
  Wenn Pfade oder Dateinamen geändert werden, können Skripte scheitern. Ich führe Namensregeln und ein Journal, damit Änderungen nachvollziehbar sind.

== Zentrale Annahmen und ihre Auswirkungen
* *Vergangenheit hilft für die nahe Zukunft*  
  Ich nehme an, dass kurz zurückliegende Leistungen Information für die nächste Gameweek liefern. Wirkung: rollende Durchschnitte sind sinnvoll, aber bei Systemwechseln begrenzt.

* *Heimvorteil und Gegnerstärke zählen*  
  Ich gehe davon aus, dass Heimspiele und schwache Gegner im Mittel mehr Punkte erlauben. Wirkung: Heim/Auswärts und Gegnerkategorie fliessen in Features ein.

* *Stabile Rolle führt zu stabilen Punkten*  
  Wer regelmässig lange spielt, punktet berechenbarer. Wirkung: Minuten-Features bekommen Gewicht. Kurz-Einsätze werden abgestraft.

== Umgang mit Unsicherheit in der Praxis
* *Vor der Deadline prüfen*  
  Ich mache einen kurzen Check auf Verletzungen, Sperren und Aufstellungstendenzen.

* *Konservative Entscheidungen bei hohem Risiko*  
  Wenn die Minuten unsicher sind, wähle ich die sichere Alternative mit leicht niedriger Prognose.

* *Kommunikation im Text und Frontend*  
  Lesesätze nennen Einheiten, Zeitraum und Quelle. Hohe Unsicherheit wird sprachlich markiert.

== Was ich bewusst nicht abdecke
* Taktische Tiefenanalyse einzelner Partien.  
* Spielerpsychologie oder interne Teamdynamik.  
* Live-Optimierung während des Spieltags.  
* Komplexe Optimierung über mehrere Gameweeks mit Szenario-Bäumen.  
* Modellensemble oder Boosting als Standard. Das bleibt als Ausblick möglich.

== Prüfliste für faire Deutung
* Ist klar, welche Daten und Zeiträume verwendet wurden.  
* Sind Baselines und Modell mit denselben Splits verglichen.  
* Ist Leckage ausgeschlossen und dokumentiert.  
* Wird Unsicherheit deutlich benannt.  
* Sind Einheiten, Achsen, Zeitraum und Quelle in jeder Grafik sichtbar.

== Was ein Laie nach diesem Kapitel versteht
* Woher Unsicherheit kommt und warum sie normal ist.  
* Welche Annahmen ich mache und welche Wirkung sie haben.  
* Wie ich dafür sorge, dass Vergleiche fair sind.  
* Warum Ergebnisse als Orientierung dienen und nicht als Garantie.

== Akzeptanzkriterien
* Mindestens sechs präzise Grenzen, jeweils mit kurzer Begründung.  
* Konkrete Annahmen mit Wirkung auf die Methodik.  
* Klare Massnahmen gegen Leckage und Overfitting.  
* Prüfliste für faire Deutung vorhanden.  
* Formulierungen laienklar, ohne Fachjargon ohne Erklärung.
]
