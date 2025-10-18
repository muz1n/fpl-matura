# Random Forest

## Was ist ein Random Forest?
Ein Random Forest ist eine Sammlung vieler kleiner Modelle, diese heissen Entscheidungsbäume.  
Ein Entscheidungsbaum lernt einfache Wenn-Dann-Regeln aus Trainingsdaten. Beispiel: Wenn die Einsatzminuten hoch sind und der Gegner schwach ist, dann steigen die erwarteten Punkte.

Die Vorhersage entsteht so:
1. Ich trainiere viele Bäume unabhängig voneinander.  
2. Jeder Baum gibt eine Schätzung ab.  
3. Ich bilde den Durchschnitt dieser Schätzungen.

Ein einzelner Baum kann sich leicht an Zufälle im Training gewöhnen. Viele Bäume zusammen glätten solche Zufälle. Das Ergebnis ist stabiler.

## Warum passt Random Forest zu meinem Projekt?
- **Datenlage:** Pro Saison gibt es in der Premier League etwa 38 Spielwochen. Pro Spieler habe ich damit nur wenige aktuelle Beobachtungen. Das ist im Vergleich zu grossen ML-Datensätzen wenig.  
- **Schwankungen:** Spielerform, Einsatzminuten und Gegnerstärke schwanken über die Saison. Ein einzelnes Ausreisser-Spiel soll die Vorhersage nicht dominieren.  
- **Ziel:** Ich brauche ein Verfahren, das mit überschaubarem Tuning sinnvolle Vorhersagen liefert und sich gut erklären lässt.

Der Random Forest erfüllt diese Punkte, weil:
- mehrere Bäume gemittelt werden. Dadurch ist die Vorhersage weniger empfindlich gegenüber einzelnen Ausreissern.  
- Bäume nichtlineare Zusammenhänge abbilden können. Ein Baum kann zum Beispiel berücksichtigen, dass hohe Minuten und ein schwacher Gegner zusammen besonders wichtig sind.  
- ich wichtige Einstellungen klar benennen und dokumentieren kann. So bleibt die Arbeit nachvollziehbar.

Hinweis: Das bedeutet nicht, dass der Random Forest „besser als alle anderen Modelle“ ist. Es bedeutet, dass er für meine Datenlage und Projektziele eine vernünftige und erklärbare Wahl ist. Andere Verfahren wie Gradient Boosting oder neuronale Netze sind mögliche Erweiterungen, brauchen aber oft mehr Tuning und klare Regularisierung. Für den Prototyp ist der Random Forest ein passender Startpunkt.

## Entscheidungsbäume als Baustein
Ein Entscheidungsbaum teilt die Daten schrittweise nach Regeln auf. Jede Teilung heisst Split.  
Ziel ist, dass die Werte am Ende der Zweige, den Blättern, möglichst ähnlich sind.  
Sehr tiefe Bäume können sich zu stark an Trainingsdaten anpassen. Viele eher einfache Bäume, die ich später mitteln kann, sind insgesamt stabiler.

## Warum „Random“? Bootstrap und Merkmals-Zufall
Zwei Quellen für zufällige Vielfalt machen den Wald robust:
1. **Bootstrap:** Jeder Baum trainiert auf einer Zufallsstichprobe der Trainingsdaten. Dabei wird mit Zurücklegen gezogen. Bäume sehen also leicht verschiedene Versionen derselben Daten.  
2. **Zufällige Merkmalsauswahl:** Bei jedem Split darf ein Baum nur eine zufällige Teilmenge der verfügbaren Merkmale prüfen. Dadurch unterscheiden sich die Bäume stärker.

Durch diese Vielfalt machen einzelne zufällige Muster weniger aus. Der Durchschnitt über viele Bäume ist meist stabiler als ein einzelner Baum.

## Wichtige Einstellungen (Hyperparameter) in meinem Code
Die Namen sind identisch zu den Parametern in `scikit-learn` für `RandomForestRegressor`. Ich erkläre die Bedeutung und die Begründung. Konkrete Werte nenne ich als Bereiche, weil ich sie in der Evaluation prüfe und berichte.

- **`n_estimators`** bestimmt die Anzahl Bäume.  
  Mehr Bäume glätten die Vorhersage, brauchen aber mehr Laufzeit.  
  **Praxis:** Ich prüfe einen Bereich, zum Beispiel 200 bis 500, und wähle die kleinste Zahl, ab der sich der Fehler kaum noch verbessert.

- **`max_depth`** begrenzt die Tiefe pro Baum.  
  Begrenzte Tiefe verhindert zu spezifische Regeln.  
  **Praxis:** Ich teste eine moderate Tiefe, zum Beispiel 8 bis 12.

- **`min_samples_leaf`** ist die minimale Anzahl Beispiele pro Blatt.  
  Grössere Blätter glätten Ausreisser.  
  **Praxis:** Ich teste Werte wie 20 bis 50, je nach Datengrösse.

- **`max_features`** begrenzt die Zahl der Merkmale pro Split.  
  Eine Teilmenge pro Split macht die Bäume unterschiedlicher und das Ensemble stabiler.  
  **Praxis:** Ich nutze häufig „sqrt“ der Gesamtzahl oder einen festen Anteil.

- **`random_state`** setzt den Startwert für Zufall.  
  Das macht Ergebnisse reproduzierbar.

- **Optional `oob_score`:** interne Güte-Schätzung mit nicht gezogenen Beispielen.  
  In diesem Projekt ist die zeitliche Validierung wichtiger. `oob_score` kann ergänzen, ist aber nicht zwingend.

Ich dokumentiere alle tatsächlich verwendeten Werte in der Evaluation, zusammen mit dem Testfehler. So bleibt die Wahl überprüfbar.

## Überanpassung vermeiden
Ich vermeide Überanpassung durch Grenzen beim Training:
- Tiefe begrenzen (`max_depth`)  
- Mindestgrösse der Blätter setzen (`min_samples_leaf`)  
- Pro Split nur eine Teilmenge der Merkmale zulassen (`max_features`)  
- Genug Bäume verwenden (`n_estimators`)

Zusätzlich beachte ich die Zeit. Ich trainiere bis zur Vorwoche und teste in der Zielwoche. So nutze ich keine Information aus der Zukunft. Dieser Punkt ist zentral und steht in meiner Datei zur Evaluation.

## Welche Merkmale sind wichtig? (Permutation-Wichtigkeit)
Zur Erklärung nutze ich Permutation-Wichtigkeit. Idee: Ich mische ein einzelnes Merkmal zufällig und messe, wie stark der Fehler steigt.  
Steigt der Fehler deutlich, war das Merkmal wichtig.  
So kann ich zum Beispiel prüfen, ob Einsatzminuten zuletzt, p90-Leistung, Gegnerstärke oder Preis entscheidend sind. Die Top-Merkmale zeige ich als Balkendiagramm in der Evaluation.

## Bias und Varianz
Kleine Tiefe und grössere Blätter erhöhen den Bias, senken aber die Varianz. Mehr Bäume senken die Varianz weiter.  
Für dieses Projekt bevorzuge ich eine stabile Vorhersage über Spielwochen. Darum wähle ich eher moderate Komplexität und genug Bäume. Ich optimiere auf die mittlere absolute Abweichung im zeitlich sauberen Test.

## Grenzen des Verfahrens
- **Extrapolation:** Der Wald kann schlecht über bekannte Wertebereiche hinaus extrapolieren.  
- **Zeitliche Muster:** Der Wald kennt den Kalender nicht. Ich bilde Zeit sauber im Train-Test-Split ab.  
- **Plötzliche Ereignisse:** Verletzungen oder Trainerwechsel sind schwer vorhersehbar. Ich zeige solche Fälle in der Auswertung über Residuen und Fehlerbeispiele.

## Verbindung zur restlichen Arbeit
- Die genaue Art der Train-Test-Aufteilung und die Metriken stehen in `docs/evaluation/metrics.md`.  
- Die Baselines, gegen die ich vergleiche, stehen in `docs/baselines.md`.  
- Plots und Ergebnisse erzeugt `code/evaluate.py` und legt sie in `docs/plots/` sowie `out/` ab.

## Kurzfazit
Der Random Forest ist für diese Aufgabe eine sinnvolle Wahl. Er kann mit begrenzten und schwankenden Saisondaten stabil arbeiten und bleibt gut erklärbar. Ich begrenze die Modellkomplexität bewusst, dokumentiere alle Einstellungen und prüfe die Güte strikt über die Zeit. So erfülle ich die Anforderungen an Theorie, Nachvollziehbarkeit und Präsentation.
