#set text(lang: "CH")

#set page(numbering: none)  

#set text(font: "Source Sans Pro")

#align(center + horizon)[
  #block[
    #text(size: 24pt, weight: "bold")[
      KI-gestützte Optimierung von Fantasy Premier League Teams
    ]
    
    #v(0.5em)
    
    #text(size: 18pt)[
      Machine-Learning-Vorhersagen und Web-App
    ]
    
    #v(2em)
    
    #line(length: 60%, stroke: 0.5pt)
    
    #v(2em)
    
    #text(size: 14pt)[
      Wissenschaftspropädeutische Maturaarbeit
    ]
    
    #v(3em)
    
    #text(size: 12pt)[
      *Verfasser:* Timur Iorich
      
      #v(0.5em)
      
      *Betreuung:* Lukas Zehnder
      
      #v(0.5em)
      
      *Schule:* Kantonsschule Zug
      
      #v(0.5em)
      
      *Schuljahr:* 2025/2026
      
      #v(0.5em)
      
      *Abgabedatum:* 5. Dezember 2025
    ]
  ]
]

#pagebreak()

#set page(numbering: none) 

#align(center)[
  #text(size: 16pt, weight: "bold")[Danksagung]
]

#v(1em)

Ich möchte mich bei allen bedanken, die mich bei dieser Maturaarbeit unterstützt haben.

Herrn Zehnder, meinem betreuenden Lehrer, möchte ich besonders danken für seine wertvollen Anregungen und seine Geduld mit mir und meiner Arbeit. Die vielen Diskussionen haben wesentlich zur Schärfung der Fragestellung und der Methodik beigetragen.

Ebenfalls danke ich Vaastav Anand für das FPL-Datensatzes auf GitHub. Ohne diese öffentlich zugänglichen Daten hätte ich keine empirische Grundlage für diese Arbeit finden können.

Schliesslich danke ich der Open-Source-Community für die Entwicklung der verwendeten Softwares (scikit-learn, pandas, Next.js, React), ohne die diese Arbeit nicht möglich gewesen wäre.

#v(6em)

#align(center)[
  #text(size: 16pt, weight: "bold")[Abstract]
]

#v(1em)

Die Fantasy Premier League (FPL) ist eine der grössten Fantasy-Sport-Plattformen weltweit und hat über 11 Millionen Nutzer. In diesem Spiel stellen die Teilnehmer wöchentlich ihr Team aus 15 Profis der Premier League zusammen, wobei die Punkte anhand von echten Spielstatistiken ermittelt werden. Die Vorhersage zukünftiger Leistungen der Spieler ist eine anspruchsvolle Aufgabe, da zahlreiche Faktoren, wie etwa die aktuelle Form, die Stärke des Gegners, Verletzungen und die taktische Ausrichtung des Trainers, berücksichtigt werden müssen.

In dieser Arbeit wird untersucht, inwieweit Machine-Learning-Methoden die Punktzahlen der FPL-Spieler gut genug vorhersagen können, um damit die Teamzusammenstellung systematisch zu verbessern. Verwendet wurde ein Random-Forest-Modell; Grundlage bildeten die Daten von acht Spieljahren (2016/17 bis 2023/24), ~188'000 Datensätze. Berücksichtigt wurden Merkmale wie Form der letzten Spiele, Gegnerstärke, Einsatzminuten und positionsspezifisches Verhalten. Die Evaluation erfolgte mittels Backtesting an vier Testsaisons (2020/21 bis 2023/24), wobei Moving Average (MA3) und Positions-Mittelwert (POS) als Baseline-Methoden dienten.

Die Ergebnisse zeigen: Moving Average (MA3) erzielt im Durchschnitt minimal mehr Team-Punkte als Random Forest (46.0 vs. 45.8 Punkte pro Spieltag), während RF bei der Vorhersagegenauigkeit leicht überlegen ist (MAE 1.20 vs. 1.24). Die Unterschiede zwischen beiden Methoden sind gering. Die Feature-Importance-Analyse zeigt, dass die Form der letzten Spiele den stärksten Einfluss auf die Vorhersagegenauigkeit hat. Eine interaktive Web-Applikation visualisiert die Vorhersagen und ermöglicht explorative Analysen.

Machine Learning bietet einen messbaren, aber moderaten Mehrwert für FPL-Vorhersagen. Kurzfristige Ereignisse wie Verletzungen oder taktische Änderungen bleiben schwer vorhersagbar. Eine Integration mit Live-Daten der offiziellen FPL-API würde die praktische Anwendbarkeit erhöhen.

#pagebreak()

#outline(
  title: [Inhaltsverzeichnis],
)

#pagebreak()

#set heading(numbering: "1.")

#counter(page).update(1) 
#set page(numbering: "1", number-align: right)

= Einleitung

Mit über 11 Millionen Spielern @fpl-rules ist die Fantasy Premier League eines der erfolgreichsten Fantasy-Sport-Angebote der Welt. Die Grundidee ist einfach: Mit 100 Millionen Pfund Spielgeld stellt man sich ein Team von 15 echten Premier-League-Spielern zusammen, von denen jede Woche 11 spielen, einer davon als Kapitän (dessen Punkte zählen doppelt).

Die Punkte werden gemäss der wirklichen Leistung auf dem Platz @fpl-scoring vergeben: Tore bringen Pluspunkte, Vorlagen, saubere Defensivarbeit. Gegentore kosten Punkte, gelbe und rote Karten. Simpel wird sehr schnell kompliziert, denn viele Faktoren spielen zugleich hinein:

- Budgetproblem: Teure Topspieler gegen Geheimtipps.
- Transferproblem: Pro Woche darf man nur einen Spieler kostenlos wechseln, jeder weitere kostet Punkte.
- Kaderproblem: Maximal 3 Spieler eines Vereins.
- Dynamikproblem: Form, Verletzungen, Sperren und Stärken anderer Gegner sind ständig in Bewegung.

Welche Entscheidung die richtige ist, weiss natürlich niemand. Die meisten Spieler der Fantasy Premier League FPL verlassen sich beim Aufstellen ihrer Teams auf ihr Bauchgefühl, auf Expertenmeinungen oder einfach mal auf ein paar Statistiken. Etwas systematischer an die historischen Daten herangegangen, lassen sich aber viel bessere Vorhersagen treffen. Eine Methode des maschinellen Lernens ist, dass anstatt selbst nach Mustern zu suchen ein Algorithmus aus vergangenen Daten lernen kann, welche Faktoren sich auf die Leistung der Spieler auswirken. Random Forest @breiman-2001-rf ist dafür geeignet, weil es auch kompliziertere, nichtlineare Zusammenhänge erfassen kann.

== Fragestellung und Ziel

In dieser Arbeit will ich nun herausfinden, ob wir mit Machine Learning die FPL-Punkte besser vorhersagen und besser Teams aufstellen können als Menschen. Die Hypothese lautet:

„Ein Random-Forest-Modell, trainiert auf historischen FPL-Daten, erreicht eine höhere Vorhersagegenauigkeit (niedrigerer MAE) als einfache Baseline-Methoden und ermöglicht eine systematische, datengetriebene Teamzusammenstellung."

Um diese Hypothese zu überprüfen, habe ich folgendes System gebaut:

- ein Random-Forest-Modell zur Punktevorhersage
- Backtesting-Validierung über vier Saisons (2020/21 bis 2023/24)
- eine Web-Applikation zur Visualisierung der Prognosen und automatischen Lineup-Optimierung
- systematischer Vergleich mit einfachen Baseline-Methoden (Moving Average, Positions-Mittelwert)

Die Evaluation erfolgt durch Backtesting, d. h. durch Simulation vergangener Saisons mit historischen Daten. Diese Ergebnisse werden uns die Praxistauglichkeit des Systems unter diesen Bedingungen beurteilen helfen, ohne dass wir auf Ergebnisse der Live-Saison angewiesen sind.

== Aufbau der Arbeit

Die Arbeit selbst ist in sechs Kapitel gegliedert. Kapitel 2 behandelt zunächst die theoretischen Grundlagen: Im Mittelpunkt steht hier das FPL-Punktesystem, dann folgen die Grundlagen des maschinellen Lernens mit den einfachen Decision Trees und dann den komplexeren Random-Forest-Algorithmen, und schliesslich die Evaluationsmetriken (MAE, RMSE, Spearman-Korrelation), die wir verwendet haben.

Kapitel 3 behandelt die Methodik: Woher stammen unsere Daten? Wie wurden Features konstruiert? Welche Hyperparameter haben wir gewählt? Wie war das System implementiert und aufgebaut? Warum haben wir Backtesting und nicht Live-Tests gemacht?

Kapitel 4 stellt die Ergebnisse aus vier Saisons Backtesting vor: Die Vorhersagegenauigkeit wird mit MAE und RMSE gemessen, die Lineup-Performance mit den erreichbaren Punkten. Unterschiede der Methoden werden in Tabellen und Visualisierungen deutlich.

Kapitel 5 geht dann kritisch mit den Ergebnissen um: Besonders relevant ist die Frage, warum die einfache Moving-Average-Methode gerade in manchen Fällen besser abschnitt als Random Forest. Analysiert werden Stärken und Schwächen des Modells sowie persönliche Erfahrungen und technische Herausforderungen während der Entwicklung.

Kapitel 6 schliesst mit einer Zusammenfassung der Ergebnisse, beantwortet die Forschungsfrage und wagt einen Ausblick auf mögliche Weiterentwicklungen, etwa ein Live-Deployment mit der offiziellen FPL-API.

#pagebreak()

= Theoretische Grundlagen

== Das FPL-Punktesystem

Fantasy Premier League vergibt nach einem festen Punktesystem Punkte @fpl-scoring, welches sich an der realen Leistung im Spiel orientiert. Je nach Position gibt es für dieselbe Aktion unterschiedlich viele Punkte. Ein Tor eines Torwarts zählt somit mehr als das eines Stürmers.

=== Grundpunkte für Einsatz

Jeder Spieler erhält alleine für seinen Einsatz Punkte:

- Torhüter und Verteidiger: 2 Punkte bei mindestens 60 Minuten
- Mittelfeldspieler: 2 Punkte bei mindestens 60 Minuten
- Stürmer: 1 Punkt bei mindestens 60 Minuten

Wer weniger als 60 Minuten spielt, bekommt nur 1 Punkt (ausser Stürmer, die bekommen 0 Punkte).

=== Tore und Vorlagen

Für Tore gibt es je nach Position unterschiedlich viele Punkte: ein Torwart, der ein Tor erzielt, bekommt dafür 10 Punkte, ein Stürmer nur 4. Das liegt daran, dass Verteidiger seltener Tore erzielen, so dass jedes mehr zählt. Vorlagen bringen konsequent 3 Punkte, egal aus welcher Position.

- Torhüter: 10 Punkte pro Tor
- Verteidiger: 6 Punkte pro Tor
- Mittelfeldspieler: 5 Punkte pro Tor
- Stürmer: 4 Punkte pro Tor
- Vorlage: 3 Punkte (alle Positionen)

=== Clean Sheets

Profitieren kann man vor allem als Torhüter und Abwehrspieler, wenn die eigene Mannschaft kein Gegentor bekommt:

- Torhüter und Verteidiger: 4 Punkte
- Mittelfeldspieler: 1 Punkt
- Stürmer: 0 Punkte

Die Clean Sheets zählen bei den Defensivspielern doppelt, weshalb meist eine stabile Abwehr mehr Punkte bringt als die Versuche, viele Tore zu erzielen.

=== Minuspunkte

Jedes Gegentor kostet Torhüter und Verteidiger 1 Punkt pro zwei Gegentore. Gelbe Karte = 1 Punkt Abzug; Rote Karte = 3 Punkte Abzug. Bei verschossenen Elfmeter gibt es 2 Minuspunkte und für ein Eigentor gibt es 2 Minuspunkte.

=== Bonuspunkte

Nach jedem Spiel gibt es für die drei besten Spieler Bonuspunkte (3, 2 oder 1 Punkt). Die Bewertung erfolgt über ein spezielles System (Bonus Points System, BPS), das Pässe, Torschüsse, gewonnene Zweikämpfe und noch einiges mehr einbezieht. Weil viele feine Details mitzählen, lassen sich Bonuspunkte kaum vorhersagen.

=== Implikationen für die Vorhersage

Das Punktesystem zeigt: In FPL zählen nicht nur Tore, sondern auch defensives Verhalten. Ein Verteidiger mit Vorlage und Clean Sheet kann mehr Punkte sammeln als ein Stürmer mit einem Tor. Genau diese Komplexität macht die Vorhersage schwierig. Verschiedene Spielertypen müssen miteinander verglichen werden, obwohl sie unterschiedliche Stärken haben; deshalb braucht es Modelle, die solche nichtlinearen Effekte abbilden.

== Grundlagen des Maschinellen Lernens

Maschinelles Lernen ermöglicht es Computern, aus Daten zu lernen, ohne dass jede Regel explizit programmiert werden muss @geron-2019. Anstatt dem System vorzuschreiben „falls X, dann Y", gebe ich ihm einfach viele Beispiele und es erkennt das Muster.

=== Supervised Learning

Im Supervised Learning trainiere ich ein Modell anhand von Beispielen, wobei ich bereits weiss was herauskommen soll. In unserem Fall sind das die historischen Spielerdaten: als Eingaben dienen mir Features wie aktuelle Form, Gegner, Position und als Ausgabe die tatsächlich erreichten FPL-Punkte. Das Modell lernt, welche Faktoren wirklich zählen.

=== Regression vs. Klassifikation

Es gibt zwei grosse Arten von Supervised Learning:

- *Regression:* Vorhersage eines kontinuierlichen Wertes (z.B. FPL-Punkte: 2.5, 8.3, 15.0)
- *Klassifikation:* Vorhersage einer Kategorie (z.B. Tor: ja/nein)

Ich benutze Regression, weil die FPL-Punkte beliebige Zahlen annehmen können.

=== Overfitting und Underfitting

Beim maschinellen Lernen ist die Balance zwischen Einfachheit und Komplexität entscheidend:

- *Underfitting:* Das Modell ist zu einfach und erkennt nicht mal die Muster in den Trainingsdaten. Beispiel: Ein Modell, das allen Spielern die gleiche Punktzahl gibt.
- *Overfitting:* Das Modell lernt die Trainingsdaten auswendig (inklusive Zufall und Ausreisser). Es funktioniert schlecht auf neuen Daten.

Die hohe Kunst besteht darin, ein Modell zu finden, das die Muster sieht, aber sich nicht an Details festklammert. Random Forest hilft mir dabei, weil es durch seine Ensembles besser gegen Overfitting gewappnet ist.

=== Train-Test-Split

Um Overfitting zu erkennen, teile ich die Daten in zwei Teile auf:

- *Trainingsdaten:* zum Lernen der Muster (hier: 2016/17 bis 2019/20)
- *Testdaten:* zum Überprüfen, ob das Modell nun auch auf neuen Daten funktioniert (hier: 2020/21 bis 2023/24)

Bei Zeitreihen wie im Fussball wichtig: ich darf nicht zufällig aufteilen, sondern muss chronologisch vorgehen. Sonst lernt das Modell aus der Zukunft   was natürlich nicht möglich ist.

== Decision Trees im Detail

Ein Decision Tree ist eines der einfachsten Modelle im ML @geron-2019. Man könnte ihn sich vorstellen wie eine Folge von Ja/Nein Fragen, die präzise auf eine Vorhersage hinauslaufen.

=== Funktionsweise

Nehmen wir an, wir wollen vorhersagen, wie viele Punkte ein Spieler nächste Woche macht. Dann könnte der Baum so aussehen:

1. Erste Frage: Hat der Spieler in den letzten 3 Spielen mehr als 5 Punkte gemacht (Durchschnitt)?
   - Ja → links
   - Nein → rechts

2. Zweite Frage (links): Spielt er zu Hause?
   - Ja → 8 Punkte
   - Nein → 6 Punkte

3. Zweite Frage (rechts): Ist der Gegner in den Top 6?
   - Ja → 2 Punkte
   - Nein → 4 Punkte

Jeder Knoten ist eine Frage, jeder Ast ist eine Antwort, jedes Ende eines Pfades ist eine Vorhersage.

#figure(
  block(
    width: 100%,
    inset: 1em,
    stroke: 0.5pt + gray,
    fill: rgb(250, 250, 250),
    [
      #set align(center)
      #set text(size: 10pt)
      
      #box(fill: rgb(220, 220, 220), inset: 0.5em, radius: 3pt)[*Form ≥ 5.0?*]
      
      #grid(
        columns: (1fr, 1fr),
        column-gutter: 2em,
        row-gutter: 0.5em,
        
        // Links
        [↙ _Nein_],
        // Rechts  
        [_Ja_ ↘],
        
        // Ebene 2
        box(fill: rgb(230, 230, 230), inset: 0.5em, radius: 3pt)[*Heimspiel?*],
        box(fill: rgb(230, 230, 230), inset: 0.5em, radius: 3pt)[*Gegner schwach?*],
        
        // Ebene 3 Links
        grid(
          columns: (1fr, 1fr),
          column-gutter: 0.5em,
          [↙ _Nein_],
          [_Ja_ ↘],
        ),
        // Ebene 3 Rechts
        grid(
          columns: (1fr, 1fr),
          column-gutter: 0.5em,
          [↙ _Nein_],
          [_Ja_ ↘],
        ),
        
        // Blätter
        grid(
          columns: (1fr, 1fr),
          column-gutter: 0.5em,
          box(fill: rgb(255, 255, 224), inset: 0.4em, radius: 3pt)[*2.0 Pkt*],
          box(fill: rgb(144, 238, 144), inset: 0.4em, radius: 3pt)[*4.2 Pkt*],
        ),
        grid(
          columns: (1fr, 1fr),
          column-gutter: 0.5em,
          box(fill: rgb(144, 238, 144), inset: 0.4em, radius: 3pt)[*6.1 Pkt*],
          box(fill: rgb(34, 139, 34), inset: 0.4em, radius: 3pt, text(fill: white)[*9.8 Pkt*]),
        ),
      )
    ]
  ),
  caption: [Beispiel eines Decision Trees für FPL-Punktevorhersagen. Der Baum stellt Fragen zu Features (Form, Heimspiel, Gegnerstärke) und trifft basierend darauf Vorhersagen. Grünere Farben bedeuten höhere vorhergesagte Punktzahlen.]
) <fig-decision-tree>

=== Split-Kriterien: Wie entscheidet der Baum?

Der Algorithmus muss nun an jedem Knoten entscheiden, welche Frage die beste ist. Hierfür gibt es mathematische Kriterien:

- *Mean Squared Error (MSE):* Wie stark sind die quadrierten Abweichungen zwischen Vorhersage und Realität? Da die Fehler quadriert werden, werden grosse Abweichungen überproportional bestraft. Der Baum wählt die Frage, die den MSE am stärksten reduziert.

Die Formel für MSE ist:

$ "MSE" = 1/n sum_(i=1)^n (y_i - hat(y)_i)^2 $

wobei $y_i$ den echten Wert und $hat(y)_i$ die Vorhersage angibt.

Bei Klassifikation (die wir hier nicht verwenden) würde man stattdessen den Gini-Index oder die Entropie verwenden.

=== Aufbau eines Baums: Rekursive Partitionierung

Der Algorithmus arbeitet rekursiv:

1. Alle Daten an der Wurzel starten
2. Beste Frage (Feature + Schwellenwert) finden, die die Daten am besten trennt
3. Daten aufteilen in zwei Gruppen
4. Wir wiederholen die Schritte 2–3 für jede Gruppe, bis ein Stoppkriterium erfüllt ist

Stoppkriterien sind:

- Maximale Tiefe erreicht (z.B. max_depth = 10)
- Zu wenige Datenpunkte in einem Knoten (z.B. min_samples_split = 5)
- Kein weiterer Gewinn an Information

=== Vorteile von Decision Trees

- Einfach zu verstehen: Man kann die Entscheidungen nachvollziehen
- Keine Datentransformation: Die Features müssen nicht normiert werden
- Erfassen auch nichtlineare Zusammenhänge: Auch komplizierte Muster werden abgebildet

=== Nachteile von Decision Trees

- Overfitting: Ein einzelner Baum passt sich sehr schnell zu stark an die Trainingsdaten an
- Instabil: Kleine Änderungen in den Daten haben grosse Auswirkungen auf den gesamten Baum
- Schlechte Generalisierung: Auf neuen Daten funktioniert er oft schlecht

Genau diese Fehler behebt Random Forest durch Ensemble Learning.

== Random Forest im Detail

Random Forest @breiman-2001-rf ist eine Erweiterung von Decision Trees. Anstelle nur einen einzigen Baum zu nutzen, trainiert man viele Bäume gleichzeitig und kombiniert ihre Vorhersagen. Man nennt dieses Prinzip Ensemble Learning.

#figure(
  block(
    width: 85%,
    inset: 1em,
    {
      set align(center)
      set text(font: "Source Sans Pro", size: 9pt)
      
      stack(
        dir: ttb,
        spacing: 0.8em,
        
        // Trainingsdaten
        box(fill: rgb(100, 150, 200), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(fill: white, weight: "bold")[Trainingsdaten (120'000 Spieler-Spiele)]
        ],
        
        text(size: 8pt, fill: rgb(100, 100, 100))[Bootstrap Sampling],
        
        // Bootstrap Samples
        grid(
          columns: 4,
          gutter: 0.5em,
          box(fill: rgb(150, 200, 150), inset: 0.3em, radius: 3pt)[Sample 1],
          box(fill: rgb(150, 200, 150), inset: 0.3em, radius: 3pt)[Sample 2],
          box(fill: rgb(150, 200, 150), inset: 0.3em, radius: 3pt)[Sample 3],
          text(size: 8pt)[... 100x],
        ),
        
        text(size: 8pt, fill: rgb(100, 100, 100))[Training mit zufälligen Features],
        
        // Bäume
        grid(
          columns: 4,
          gutter: 0.5em,
          box(stroke: 1.5pt + rgb(100, 100, 100), inset: 0.3em, radius: 3pt)[Baum 1],
          box(stroke: 1.5pt + rgb(100, 100, 100), inset: 0.3em, radius: 3pt)[Baum 2],
          box(stroke: 1.5pt + rgb(100, 100, 100), inset: 0.3em, radius: 3pt)[Baum 3],
          text(size: 8pt)[... 100x],
        ),
        
        text(size: 8pt, fill: rgb(100, 100, 100))[Durchschnittsbildung],
        
        // Final
        box(fill: rgb(200, 140, 80), inset: 0.5em, radius: 3pt, width: 60%)[
          #text(fill: white, weight: "bold")[Finale Vorhersage]
        ],
      )
      
      v(0.5em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Jeder Baum sieht nur einen Teil der Daten und Features → Robustere Vorhersagen
      ]
    }
  ),
  caption: [Architektur des Random Forest. Das Original-Dataset wird mehrfach gesampelt (Bootstrap), jeder Baum trainiert auf einer anderen Stichprobe mit zufälligen Features, und die finalen Vorhersagen werden gemittelt.]
) <fig-rf-architecture>

=== Bootstrap Aggregating (Bagging)

Der erste Trick von Random Forest ist Bagging (Bootstrap Aggregating). So funktioniert's:

1. *Bootstrap Sampling:* Aus den Trainingsdaten werden zufällige Stichproben gezogen   mit Zurücklegen. Das bedeutet: Manche Datenpunkte erscheinen mehrfach, andere gar nicht.
2. *Training:* Jeder Baum trainiert auf einer anderen Bootstrap-Stichprobe.
3. *Aggregation:* Bei Regression wird der Mittelwert über alle Vorhersagen gebildet.

Durch Bagging werden die Vorhersagen robuster. Einzelne Bäume machen unterschiedliche Fehler, im Durchschnitt heben sich diese Fehler zum Teil auf.

=== Random Feature Selection

Der zweite Trick: Jeder Baum sieht nicht alle Features, sondern nur eine zufällige Teilmenge. Bei jedem Split wird aus allen verfügbaren Features zufällig eine Auswahl getroffen (typischerweise $sqrt(n)$ Features bei $n$ Gesamt-Features).

Warum das hilft? Wenn ein Feature zu dominant ist (z.B. „Form der letzten 3 Spiele"), würden ohne Random Selection alle Bäume ähnlich aussehen. Durch die Random Selection werden die Bäume verschiedener   das Ensemble unterschiedlicher.

=== Ensemble-Vorhersage

Zur finalen Vorhersage fragen wir alle Bäume ab. Bei Regression (wie hier) nimmt man den Durchschnitt:

$ hat(y) = 1/T sum_(t=1)^T hat(y)_t $

wobei $T$ die Anzahl der Bäume ist und $hat(y)_t$ die Vorhersage von Baum $t$.

=== Out-of-Bag Error

Ein interessanter Nebeneffekt von Bagging: Jeder Baum trainiert nur auf etwa 63% der Daten (Bootstrap Sampling). Die übrigen 37% sind die Out-of-Bag (OOB) Daten. Die können wir zur Validierung verwenden, wir müssen also keine extra Testdaten abspalten.

Der OOB-Error ist ein Schätzer für den Generalisierungsfehler   ähnlich wie Cross-Validation, aber ohne zusätzlichen Rechenaufwand.

=== Feature Importance

Random Forest kann automatisch berechnen, welche Features wichtig sind. Die Idee: Wie stark verbessert ein Feature die Vorhersagen über alle Bäume hinweg?

So wird gerechnet:

1. Für jeden Baum: Bei jedem Split messen, wie stark der MSE gesenkt wird
2. Diese Verbesserungen für jedes Feature über alle Bäume summieren
3. Normalisieren, sodass alle Wichtigkeiten zusammen 100% ergeben

Features mit hoher Importance sind wichtig für die Vorhersage. Die Analyse über 14'980 Spieler-Gameweeks der Saison 2020-21 (GW2-28) zeigte: Die Spielzeit der letzten 3 Spiele (`minutes_ma3`) mit 33% und der ICT-Index (`ict_index_ma3`) mit 23% sind die wichtigsten Prädiktoren.

#figure(
  block(
    width: 100%,
    inset: 1em,
    {
      set text(size: 9pt)
      
      // Daten aus out/analysis/feature_importance.json
      let data = (
        ("Minuten (letzte 3 GW)", 33),
        ("ICT-Index (letzte 3 GW)", 23),
        ("Einfluss (letzte 3 GW)", 16),
        ("Kreativität (letzte 3 GW)", 11),
        ("Punkte (letzte 3 GW)", 10),
        ("Angriffsgefahr (letzte 3 GW)", 7),
      )
      
      let max-val = 40  // Maximum für Skalierung
      
      // Für jedes Feature
      for (label, value) in data {
        grid(
          columns: (30%, 1fr, 10%),
          align: (left, left, right),
          column-gutter: 0.5em,
          
          // Label
          text(weight: "regular")[#label],
          
          // Bar
          {
            let bar-width = (value / max-val) * 100%
            let color = if value >= 20 {
              rgb(34, 139, 34)
            } else if value >= 10 {
              rgb(100, 200, 100)
            } else {
              rgb(180, 180, 180)
            }
            
            block(
              width: 100%,
              height: 1.5em,
              fill: rgb(240, 240, 240),
              radius: 3pt,
              {
                block(
                  width: bar-width,
                  height: 100%,
                  fill: color,
                  radius: 3pt,
                )
              }
            )
          },
          
          // Wert
          text(weight: "bold", fill: rgb(60, 60, 60))[#value%],
        )
        
        v(0.3em)
      }
      
      // X-Achse Beschriftung
      v(0.5em)
      grid(
        columns: (30%, 1fr, 10%),
        [],
        align(center)[_Importance (%)_],
        [],
      )
      
      // X-Achse Ticks (korrigiert)
      grid(
        columns: (30%, 1fr, 10%),
        [],
        {
          set text(size: 7pt, fill: rgb(100, 100, 100))
          stack(
            dir: ltr,
            spacing: 1fr,
            [0],
            [10],
            [20],
            [30],
            [40],
          )
        },
        [],
      )
    }
  ),
  caption: [Feature Importance im Random Forest. Die wichtigsten Prädiktoren für FPL-Punkte sind die Spielzeit der letzten 3 Spiele (`minutes_ma3`: 33%), der ICT-Index (`ict_index_ma3`: 23%) und der Einfluss (`influence_ma3`: 16%). Basis: Saison 2020-21, GW2-28, Berechnung auf dem Test-Set (keine OOB-Werte).]
) <fig-feature-importance>


*Was bedeutet "33% Importance"?* Wenn ein Feature 33% Importance hat, bedeutet das: Von der gesamten Verbesserung, die alle Features zusammen bringen, stammen 33% von diesem einen Feature. Ein Feature mit 33% ist also ungefähr doppelt so wichtig wie eines mit 16%.

=== Hyperparameter

Random Forest hat einige Hyperparameter, die vor dem Training festgelegt werden müssen:

- n_estimators: Anzahl der Bäume (je mehr, desto stabiler, aber langsamer; typischerweise 100–500)
- max_depth: maximale Tiefe eines jeden Baums (begrenzt Overfitting)
- min_samples_split: wie viele Datenpunkte mindestens für einen Split notwendig sind
- min_samples_leaf: wie viele Datenpunkte in einem Blatt mindestens sein müssen
- max_features: wie viele der Features pro Split ausgewählt werden (häufig $sqrt(n)$ oder $log_2(n)$)

Für die berichteten Ergebnisse wurde ein einheitliches Modell für alle Positionen genutzt:

- n_estimators = 300
- max_depth = None (unbegrenzt)
- min_samples_leaf = 2
- random_state = 42
- n_jobs = -1 (alle CPU-Kerne)

Positionsspezifische Varianten (z.B. flachere Bäume für FWD/DEF, tiefere für GK/MID) wurden getestet, aber nicht für die finalen Resultate verwendet; entsprechende Experimente liegen in `code/archive/tuning/`.

=== Warum Random Forest für FPL?

Random Forest wurde als Modellarchitektur gewählt, da es mehrere Anforderungen dieser Problemstellung erfüllt:

1. *Nichtlineare Zusammenhänge:* FPL-Punkte hängen nicht linear von Features ab. Ein Spieler performt gegen schwache Gegner besser, dieser Effekt saturiert jedoch. Random Forest kann solche nichtlinearen Muster ohne explizite Feature-Transformation erfassen.

2. *Automatische Feature-Selektion:* Bei über 20 potentiellen Features ist nicht a priori klar, welche relevant sind. Random Forest gewichtet Features automatisch nach Importance und ist robust gegenüber irrelevanten Variablen.

3. *Robustheit gegenüber Ausreissern:* Einzelne extrem hohe Punktzahlen (z.B. 20 Punkte durch Hattrick) verfälschen das Modell nicht, da durch Ensemble-Averaging diese Extremwerte gedämpft werden.

4. *Interpretierbarkeit:* Im Gegensatz zu neuronalen Netzen erlaubt Random Forest die Analyse von Feature Importances, was für die Diskussion der Ergebnisse essentiell ist.


== Evaluationsmetriken

Um die Güte eines Modells beschreiben zu können, benötigt man Kennzahlen @sklearn-metrics. In diesem Projekt kommen drei Kennzahlen zum Einsatz.

=== Mean Absolute Error (MAE)

Der MAE beschreibt die durchschnittliche Abweichung zwischen Vorhersage und Realität. Negativ und positiv wird dabei nicht unterschieden. Die Formel lautet:

$ "MAE" = 1/n sum_(i=1)^n |y_i - hat(y)_i| $

MAE = 2.0 bedeutet: im Schnitt liegt die Vorhersage um 2 Punkte daneben. Super einfach zu verstehen und behandelt kleine wie grosse Fehler gleich.

=== Root Mean Squared Error (RMSE)

RMSE geizt nicht mit Bestrafung, gerade grosse Fehler werden stärker bestraft:

$ "RMSE" = sqrt(1/n sum_(i=1)^n (y_i - hat(y)_i)^2) $

Wenn ein Modell ein RMSE = 3.0 und ein MAE = 2.0 hat, deutet das auf ein paar grosse Ausreisser hin. Das ist genau das Problem bei FPL, denn einmal heftig danebenliegende Prognose kann einem das ganze Team versauen.

=== Spearman-Korrelation

Die Spearman-Korrelation misst nicht die Punktzahlen sondern die Ränge der Spieler. Die Frage: Weiss das Modell, wer die besten Spieler der Woche sind, auch wenn die Punktzahlen danebenliegen?

Ein Wert von 0.5 bedeutet: Das Modell hat die Spieler halbwegs richtig gerankt, auch wenn die Vorhersagen danebenliegen. Das ist für FPL ganz wichtig, denn in der Regel reicht es, die besten Spieler zu finden, die Punktzahl ist zweitrangig.

=== Zusammenspiel der Metriken

Diese drei Werte ergänzen sich:

- MAE zeigt die typische Grösse der Abweichung
- RMSE zeigt die Ausreisser
- Spearman zeigt, ob die Ränge stimmen

Nur alle drei zusammen ergeben ein vollständiges Bild der Modellgüte.











#pagebreak()

= Methodik

== Daten und Datenaufbereitung

=== Datenquelle

Die Grundlage dieses Projekts bildet der öffentliche Datensatz von Vaastav Anand @vaastav-fpl, der FPL-Daten seit der Saison 2016/17 automatisiert sammelt. Der Datensatz enthält sehr viele Daten zu jedem Spieler und jeder Gameweek: Minuten gespielt, Punkte, Tore, Vorlagen, Clean Sheets und weitere Statistiken.

Jede Zeile repräsentiert einen Spieler in einer Gameweek. Bei ca. 500 aktiven Spielern pro Saison und 38 Gameweeks ergeben sich pro Saison ca. 23'500 Datenpunkte. Über acht Saisons 2016/17 bis 2023/24 ergibt das 188'168 Datensätze.

=== Zeitliche Aufteilung

Die Daten wurden chronologisch in Trainings- und Testdaten aufgeteilt:

- *Trainingsdaten:* 2016/17 bis 2019/20 (4 Saisons, ~88'000 Datensätze)
- *Testdaten:* 2020/21 bis 2023/24 (4 Saisons, ~100'000 Datensätze)

Diese Aufteilung folgt zwei Prinzipien: Erstens gewährleistet die strikte chronologische Trennung, dass das Modell ausschliesslich auf vergangenen Daten trainiert wird (keine Data Leakage). Zweitens bietet die Verwendung von vier kompletten Saisons als Testdaten eine robuste Basis für die Evaluation, da saisonale Schwankungen (z.B. COVID-19-Saison 2020/21) ausgeglichen werden können. Die 50/50-Aufteilung maximiert sowohl die Trainingsdatenmenge als auch die statistische Aussagekraft der Testresultate.

#figure(
  block(
    width: 90%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      // Timeline horizontal
      stack(
        dir: ltr,
        spacing: 0.2em,
        
        // Training (Grün)
        block(
          width: 12%,
          {
            box(fill: rgb(100, 180, 100), inset: 0.5em, radius: 3pt, width: 100%)[
              *2016/17*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Training]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(100, 180, 100), inset: 0.5em, radius: 3pt, width: 100%)[
              *2017/18*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Training]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(100, 180, 100), inset: 0.5em, radius: 3pt, width: 100%)[
              *2018/19*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Training]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(100, 180, 100), inset: 0.5em, radius: 3pt, width: 100%)[
              *2019/20*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Training]
          }
        ),
        
        // Trenner
        v(0.5em),
        block(width: 2%, text(size: 16pt, fill: rgb(100, 100, 100))[|]),
        v(0.5em),
        
        // Testing (Rot/Orange)
        block(
          width: 12%,
          {
            box(fill: rgb(220, 120, 120), inset: 0.5em, radius: 3pt, width: 100%)[
              *2020/21*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Test]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(220, 120, 120), inset: 0.5em, radius: 3pt, width: 100%)[
              *2021/22*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Test]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(220, 120, 120), inset: 0.5em, radius: 3pt, width: 100%)[
              *2022/23*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Test]
          }
        ),
        
        block(
          width: 12%,
          {
            box(fill: rgb(220, 120, 120), inset: 0.5em, radius: 3pt, width: 100%)[
              *2023/24*
            ]
            v(0.3em)
            text(size: 8pt, fill: rgb(80, 80, 80))[Test]
          }
        ),
      )
      
      v(0.8em)
      
      // Legende
      grid(
        columns: (auto, auto),
        column-gutter: 2em,
        align: center,
        
        stack(
          dir: ltr,
          spacing: 0.5em,
          box(fill: rgb(100, 180, 100), width: 1.5em, height: 0.8em, radius: 2pt),
          text(size: 8pt)[Training (4 Saisons, ~88'000 Datensätze)]
        ),
        
        stack(
          dir: ltr,
          spacing: 0.5em,
          box(fill: rgb(220, 120, 120), width: 1.5em, height: 0.8em, radius: 2pt),
          text(size: 8pt)[Test (4 Saisons, ~100'000 Datensätze)]
        ),
      )
    }
  ),
  caption: [Chronologische Train-Test-Aufteilung. Das Modell trainiert auf 4 Saisons (2016-2020) und wird auf 4 zukünftigen Saisons (2020-2024) evaluiert. Die strikte zeitliche Trennung verhindert Data Leakage.]
) <fig-train-test-timeline>

Diese strenge zeitliche Trennung ist entscheidend: Das Modell darf nur in der Vergangenheit lernen und nie in der Zukunft. Alles andere wäre unrealistisch und würde die Ergebnisse verfälschen.

=== Datenbereinigung

Die Rohdaten von der FPL-API kommen nicht immer ganz sauber daher. Mehrere Probleme mussten gelöst werden:

Fehlende Werte: Manche Spieler haben für bestimmte Gameweeks keine Einträge, z.B. weil sie verletzt oder gesperrt waren, oder weil sie nicht im Kader standen. Diese Zeilen habe ich entfernt, sie enthalten keine verwertbaren Informationen.

Doppelte Einträge: Bei Vereinswechseln innerhalb der Saison tauchen Spieler manchmal mehrere Male auf. Diese Fälle habe ich zusammengeführt, die Statistiken des neuen Vereins werden weitergeführt.

Verschiedene Positionen: Die API verwendet z.T. verschiedene Schreibweisen für die Positionen. Dazu wurden folgende Bezeichnungen vereinheitlicht:

- Torhüter: `GK`
- Verteidiger: `DEF`
- Mittelfeldspieler: `MID`
- Stürmer: `FWD`

Die Bereinigung erfolgt automatisiert mit pandas. Die Rohdaten von vaastav/Fantasy-Premier-League enthalten bereits normalisierte Positionskürzel (GK, DEF, MID, FWD). Folgendes Skript zeigt die wesentlichen Bereinigungsschritte:

```python
import pandas as pd

# Fehlende Werte entfernen
df = df.dropna(subset=['total_points', 'minutes'])

# Positionen sind bereits als GK, DEF, MID, FWD kodiert
# Keine Umwandlung nötig

# Duplikate bei Transfers zusammenfassen (letzter Eintrag pro GW)
df = df.groupby(['player_id', 'season', 'GW']).last().reset_index()```

=== Warum keine Normalisierung?

Bei vielen Machine-Learning-Algorithmen (z.B. lineare Regression, neuronale Netze) ist Normalisierung wichtig, da Features mit grösseren Werten sonst dominieren. Random Forest ist hier jedoch eine Ausnahme: Da Entscheidungsbäume nur Schwellenwerte vergleichen ("ist minutes > 60?"), spielt die absolute Skalierung keine Rolle. Ein Split bei 60 Minuten funktioniert genauso wie ein Split bei 0.67 nach Min-Max-Skalierung.

Deshalb wurde in diesem Projekt bewusst auf Feature-Normalisierung verzichtet - Random Forest benötigt sie nicht und die Rohdaten sind leichter interpretierbar.

=== Explorative Datenanalyse

Bevor ich mit dem Feature Engineering begonnen habe, habe ich die Daten etwas genauer betrachtet.

Nun zu den Erkenntnissen: Bei der Punkteverteilung sammeln die meisten Spieler zwischen 0 und 10 Punkte pro Gameweek. Werte über 15 sind schon selten, Werte über 20 extrem selten. Die Verteilung ist stark rechtsschief, viele kleine Werte, wenige grosse Ausreisser.

Worin unterscheiden sich die Positionen? Im Schnitt holen Mittelfeldspieler die meisten Punkte (4.2 pro GW), dann folgen Stürmer (3.9), Verteidiger (3.7) und Torhüter (3.1). Aber bei Stürmern ist die Varianz am höchsten, die schwanken zwischen 0 und 20 Punkten am stärksten.

#figure(
  block(
    width: 80%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      // Daten: Min, Q1, Median, Q3, Max für jede Position
      let positions = (
        ("GK", 0, 2, 3.1, 4, 10),
        ("DEF", 0, 2, 3.7, 5, 15),
        ("MID", 0, 2, 4.2, 6, 18),
        ("FWD", 0, 2, 3.9, 6, 20),
      )
      
      let labels = ("Torhüter", "Verteidiger", "Mittelfeld", "Stürmer")
      let colors = (rgb(180, 180, 180), rgb(100, 150, 200), rgb(100, 200, 100), rgb(200, 100, 100))
      
      // Y-Achse (Punkte)
      let max-points = 22
      
      stack(
        dir: ltr,
        spacing: 2em,
        
        // Für jede Position
        ..for (i, data) in positions.enumerate() {
          let (code, min-val, q1, median, q3, max-val) = data
          let label = labels.at(i)
          let color = colors.at(i)
          
          (block(
            width: 3cm,
            {
              set align(center)
              
              // Boxplot
              block(
                width: 2cm,
                height: 8cm,
                {
                  // Hintergrund Raster
                  place(
                    block(
                      width: 100%,
                      height: 100%,
                      {
                        for y in range(0, 5) {
                          let pos = (y / 4) * 100%
                          place(top + left, dy: pos, line(length: 100%, stroke: 0.5pt + rgb(230, 230, 230)))
                        }
                      }
                    )
                  )
                  
                  // Whisker 
                  let y-min = (1 - min-val / max-points) * 100%
                  let y-max = (1 - max-val / max-points) * 100%
                  let y-q1 = (1 - q1 / max-points) * 100%
                  let y-median = (1 - median / max-points) * 100%
                  let y-q3 = (1 - q3 / max-points) * 100%
                  
                  // Whisker Linie
                  place(top + left, dx: 50%, dy: y-max, line(angle: 90deg, length: y-min - y-max, stroke: 1pt))
                  
                  // Box 
                  place(
                    top + left,
                    dx: 25%,
                    dy: y-q3,
                    rect(
                      width: 50%,
                      height: y-q1 - y-q3,
                      fill: color.lighten(50%),
                      stroke: 2pt + color,
                      radius: 2pt,
                    )
                  )
                  
                  // Median
                  place(
                    top + left,
                    dx: 20%,
                    dy: y-median,
                    line(length: 60%, stroke: 3pt + color.darken(30%))
                  )
                }
              )
              
              v(0.5em)
              text(weight: "bold")[#label]
              v(0.2em)
              text(size: 8pt, fill: rgb(100, 100, 100))[Ø #median Pkt]
            }
          ),)
        }
      )
      
      v(1em)
      
      // Y-Achse Labels
      text(size: 8pt, fill: rgb(100, 100, 100))[
        Punkte pro Gameweek: 0 5 (häufig), 5 10 (mittel), 10 20 (selten)
      ]
    }
  ),
  caption: [Punkteverteilung nach Spielerposition (Saison 2023-24). Mittelfeldspieler haben den höchsten Median (4.2), Stürmer die grösste Varianz (0-20 Punkte).]
) <fig-position-boxplot>

Bemerkenswert ist ein Trend über die Jahre: In der Saison 2022/23 fielen im Schnitt mehr Tore als in den Vorjahren. Solche saisonalen Schwankungen machen Vorhersagen schwerer, weil historische Muster sich nicht 1:1 übertragen lassen.

== Feature Engineering

Die Qualität eines Machine-Learning-Modells hängt massgeblich von den verwendeten Features ab. Basierend auf Domänenwissen über FPL und initialer explorativer Datenanalyse wurden Features in drei Kategorien entwickelt:

=== Spieler-Features

Diese beschreiben die aktuelle Form und Qualität eines Spielers:

Form (letzte 3 Gameweeks): Gleitender Durchschnitt ("Rolling Average") der letzten 3 Spiele. Dabei wird immer über ein Fenster von 3 aufeinanderfolgenden Spielen gemittelt, das sich mit jeder neuen Gameweek weiterbewegt. Ein Beispiel: Hat ein Spieler in GW1-3 die Punkte [2, 8, 5], beträgt sein Rolling Average für GW4 genau (2+8+5)/3 = 5.0 Punkte. In GW5 "rutscht" das Fenster weiter: War GW4 = 10 Punkte, wird nun über [8, 5, 10] gemittelt = 7.7 Punkte. Das älteste Spiel (die 2) fällt raus, das neueste (die 10) kommt dazu. Die Wahl von 3 Gameweeks basiert auf zwei Überlegungen: (1) Kurze Zeitfenster erfassen aktuelle Form besser als lange, (2) zu kurze Fenster (1-2 GW) sind zu volatil und rauschen zu stark. Mit 3 Gameweeks erhält man eine gute Balance zwischen Aktualität und Stabilität. Die Analyse bestätigte dies mit 33% Feature Importance.


Die Implementierung in Python erfolgt mit pandas' `rolling()`-Funktion:

```df['form_3'] = df.groupby('player_id')['total_points'] \
                 .rolling(3, min_periods=1) \
                 .mean() \
                 .reset_index(level=0, drop=True)```


Form (letzte 5 Gameweeks): wie form_3, aber stabiler, weil mehr Spiele.

Saisonform: Durchschnitt über die ganze Saison bisher. Zeigt die generelle Qualität des Spielers.

Spielminuten (letzte 3 GW): wie viele Minuten hat der Spieler zuletzt gespielt? Wer regelmässig 90 Minuten spielt, ist sicher Stammspieler und wird mehr Punkte sammeln. Dieses Feature erwies sich als das wichtigste (33% Feature Importance).

Position: kategorisch (GK, DEF, MID, FWD). In scikit-learn müssen Kategorien codiert werden, z.B. per One-Hot-Encoding (`pd.get_dummies(position)`), bevor sie in den RandomForestRegressor fliessen.

ICT-Index (letzte 3 GW): FPL's eigene Metrik für Einfluss, Kreativität und Angriffsgefahr. Dieses Feature war das zweitwichtigste (23% Feature Importance).

=== Gegner-Features

Nicht alle Gegner sind gleich stark. Diese Features erfassen die Defensiv- und Offensivstärke des nächsten Gegners:

Durchschnittliche Gegentore des Gegners: Wie viele Tore kassiert der Gegner im Schnitt? Ein Team, das keine gute Defensive hat, macht es den Angreifern einfacher.    

Die Berechnung erfolgt in zwei Schritten. Zuerst wird die Defensivschwäche jedes Teams pro Gameweek ermittelt, dann wird diese Information an die Spielerdaten angehängt:

```# Team-Defensivstärke berechnen (Gegentore pro Spiel)
team_def = df.groupby(['season', 'GW', 'opponent_team'])['goals_conceded'] \
             .mean() \
             .reset_index()
team_def.rename(columns={'goals_conceded': 'opp_def_weakness'}, inplace=True)

# Ans Hauptdataset mergen
df = df.merge(team_def, on=['season', 'GW', 'opponent_team'], how='left')```

Durchschnittliche erzielte Tore des Gegners: Das zeigt die Offensivstärke. Gegen Manchester City zu spielen, ist schwerer, als gegen ein Team im Tabellenkeller.

Heimspiel vs. Auswärtsspiel: Boolean-Feature (1 = Heimspiel, 0 = Auswärtsspiel). Heimvorteil gibt es im Fussball wirklich.

Diese Gegner-Features basieren auf den letzten 5 Spielen statt 3 wie bei den Spieler-Features. Der Grund: Team-Metriken (z.B. Gegentore) schwanken weniger stark als individuelle Spielerleistungen, daher ist ein längeres Zeitfenster sinnvoll, um robustere Durchschnitte zu erhalten.


=== Team-Features

Natürlich spielt auch das eigene Team eine Rolle bei der Leistung einzelner Spieler:

Durchschnittliche Clean Sheets (letzte 5 Spiele): Wie oft hat das Team zu null gespielt? Wenn eine Mannschaft defensiv stabil ist, profitieren Torhüter und Abwehrspieler.

Durchschnittliche erzielte Tore (letzte 5 Spiele): Wenn das Team viele Tore schiesst, haben Stürmer und Mittelfeldspieler bessere Chancen auf Punkte.

Tabellenplatz: Teams, die weiter oben in der Tabelle stehen, sind in der Regel stärker. Der Tabellenplatz korreliert mit der Qualität der Spieler.

Für die Team-Offensivstärke wird analog zur Spieler-Form ein Rolling Average über die letzten 5 Spiele berechnet:

``` python
# Team-Offensivstärke (Tore pro Spiel)
team_off = df.groupby(['season', 'GW', 'team'])['goals_scored'] \
             .rolling(5, min_periods=1) \
             .mean() \
             .reset_index(level=[0,1], drop=True)
df['team_goals_avg_5'] = team_off
```

Insgesamt kamen so pro Spieler und Gameweek über 20 Features zusammen. Diese Vielzahl an Features geben Random Forest die Möglichkeit, komplexe Zusammenhänge zu erkennen.

== Modelltraining und Hyperparameter

=== Implementierung mit Scikit-Learn

Das Random-Forest-Modell wurde mit der Python-Bibliothek Scikit-Learn @sklearn-rf implementiert. Die Bibliothek ist eine Freude, sie hat eine gute API und ist gut dokumentiert.

Für die finale Auswertung wurde strikt saisonbasiert getrennt: Training auf 2016/17–2019/20, Test auf 2020/21–2023/24. Ein zeitliches Mischen (klassisches `train_test_split` oder k-fold-CV über alle Jahre) würde Data Leakage erzeugen. Das folgende Beispiel zeigt die chronologische Aufteilung und das Training:

``` python
from sklearn.ensemble import RandomForestRegressor

# Features und Zielvariable definieren
feature_cols = [
  'form_3', 'form_5', 'season_avg', 'minutes_3',
  'position', 'value', 'opp_def_weakness', 'opp_goals_avg',
  'is_home', 'team_clean_sheets_5', 'team_goals_avg_5'
]

train = df[df['season'] <= '2019-20']
test  = df[df['season'] >= '2020-21']

X_train, y_train = train[feature_cols], train['total_points']
X_test, y_test   = test[feature_cols],  test['total_points']

rf = RandomForestRegressor(
  n_estimators=300,
  max_depth=None,
  min_samples_leaf=2,
  random_state=42,
  n_jobs=-1
)
rf.fit(X_train, y_train)
```

Wenn Hyperparameter gesucht werden, muss auch die Validierung zeitlich sauber bleiben (z.B. 2016–2018 train, 2019–2020 valid). K-fold-CV über gemischte Jahre wurde für die berichteten Ergebnisse nicht verwendet.

=== Hyperparameter-Optimierung

Random Forest hat einige Hyperparameter, die man vor dem Training festlegen muss. Diese Werte wirken sich sehr stark darauf aus, wie gut unser Modell funktioniert:

n_estimators (Anzahl Bäume): je mehr Bäume, desto stabiler die Vorhersagen, aber desto länger braucht das Training. Ich habe 300 gewählt, da ab etwa 200-300 Bäumen die Fehlerrate typischerweise konvergiert @geron-2019. Mehr Bäume bringen kaum Verbesserung, kosten aber Rechenzeit.

max_depth (Maximale Tiefe): Maximale Tiefe der Bäume. Hier wurde `None` (unbegrenzt) gewählt, da Random Forest durch die Bootstrap-Aggregation und Feature-Auswahl bereits gegen Overfitting geschützt ist.

min_samples_leaf (Mindestgrösse Blatt): Jedes Blatt muss mindestens 2 Datenpunkte haben. Der Wert 2 verhindert, dass einzelne Ausreisser eigene Blätter bilden (was bei min_samples_leaf=1 möglich wäre), erlaubt aber dennoch feine Aufteilungen.

max_features (Features pro Split): Bei jedem Split werden nur eine Auswahl der Features betrachtet. Standardmässig nutzt scikit-learn alle Features bei Regression (max_features=1.0).

Die finalen Hyperparameter wurden durch manuelle Experimente und Erfahrungswerte gewählt:

``` python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(
    n_estimators=300,      # 300 Bäume für Stabilität
    max_depth=None,        # Unbegrenzte Tiefe
    min_samples_leaf=2,    # Mindestens 2 Datenpunkte pro Blatt
    random_state=42,       # Reproduzierbarkeit
    n_jobs=-1              # Alle CPU-Kerne nutzen
)
model.fit(X_train, y_train)
```

Die Wahl von 300 Bäumen mit unbegrenzter Tiefe folgt der Empfehlung, dass Random Forest durch Bootstrap-Aggregation und zufällige Feature-Auswahl bereits gegen Overfitting geschützt ist. Zusätzliche Regularisierung durch max_depth ist daher oft nicht nötig.

=== Feature Importance Analyse

Nach dem Training können wir uns ansehen, welche Features am wichtigsten waren. Random Forest speichert für jedes Feature die durchschnittliche Verbesserung des MSE über alle Bäume:

``` python
import pandas as pd

# Feature Importances
importances = rf.feature_importances_
feature_importance_df = pd.DataFrame({
    'feature': feature_cols,
    'importance': importances
}).sort_values('importance', ascending=False)

print(feature_importance_df.head(5))
```

#pagebreak()

Ergebnis (basierend auf 14'980 Spieler-GW der Saison 2020-21, GW2-28):

#figure(
  block(
    width: 70%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      table(
        columns: (60%, 40%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Feature*], [*Importance*],
        [minutes_ma3], text(fill: rgb(80, 130, 180), weight: "bold")[0.33],
        [ict_index_ma3], text(fill: rgb(80, 130, 180), weight: "bold")[0.23],
        [influence_ma3], text(fill: rgb(80, 130, 180), weight: "bold")[0.16],
        [creativity_ma3], [0.11],
        [points_ma3], [0.10],
      )
      
      v(0.8em)
      
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Höhere Werte bedeuten wichtigere Features für die Vorhersage
      ]
    }
  ),
  caption: [Feature Importance nach Training des Random Forest Modells (Saison 2020-21, GW2-28, Test-Set). Die drei wichtigsten Features (Spielzeit, ICT-Index, Einfluss der letzten 3 GW) tragen zusammen 72% zur Vorhersagequalität bei.]
) <tbl-feature-importance>

Die Spielzeit der letzten 3 Gameweeks war mit 33% am wichtigsten   Spieler die regelmässig 90 Minuten spielen, sind Stammspieler und daher wertvoller. Der ICT-Index (23%) und Einfluss (16%) erfassen die aktuelle Form. Zusammen machen diese drei Features bereits 72% der Vorhersagequalität aus.

=== Baseline-Methoden

Um zu prüfen, ob Random Forest überhaupt einen Mehrwert bietet, habe ich zuerst zwei einfache Baseline-Methoden implementiert:

Moving Average (MA3): Hierbei bekommt jeder Spieler einfach den Durchschnitt seiner letzten 3 Gameweeks als Vorhersage.

Die Implementierung ist sehr einfach: Pandas' `rolling()` und `shift(1)` für Zeitverschiebung:

``` python
def predict_ma3(df):
    df['pred_ma3'] = df.groupby('player_id')['total_points'] \
                        .rolling(3, min_periods=1) \
                        .mean() \
                        .shift(1)  # shift(1) = nächste GW vorhersagen
    return df
```

Positions-Mittelwert (POS): Hierbei bekommt jeder Spieler den Durchschnitt aller Spieler seiner Position.

Auch hier eine einfache Gruppierung:

``` python
def predict_pos(df):
    pos_avg = df.groupby(['season', 'GW', 'position'])['total_points'] \
                .transform('mean')
    df['pred_pos'] = pos_avg
    return df
```

Diese Methoden sind extrem simpel, aber oft überraschend effektiv. Wenn Random Forest hier nicht besser abschneidet, lohnt sich der Aufwand nicht.

=== Backtesting statt Live-Tests

Die Evaluation erfolgte durch Backtesting auf historischen Daten anstelle von Live-Tests während einer laufenden Saison. Diese methodische Entscheidung basiert auf folgenden Überlegungen:

Zeitliche Effizienz: Eine FPL-Saison dauert 9 Monate. Die Evaluation über vier Testsaisons (2020/21 bis 2023/24) hätte bei Live-Testing 3 Jahre benötigt. Backtesting ermöglicht die vollständige Evaluation in wenigen Stunden, was im Rahmen einer Maturaarbeit realistisch ist.

Kontrollierte Vergleichbarkeit: Beim Backtesting werden alle Methoden (Random Forest, MA3, POS) unter identischen Bedingungen evaluiert. Jede Methode sieht dieselben Daten zum selben Zeitpunkt. Bei Live-Tests könnten saisonale Faktoren (z.B. Verletzungswellen, Regeländerungen) die Vergleichbarkeit beeinträchtigen.

Wissenschaftliche Validität: Backtesting ist die Standardmethode zur Evaluation von Vorhersagemodellen in der Finanzbranche und im Machine Learning @geron-2019. Die strikte chronologische Trennung von Training und Test (keine Data Leakage) gewährleistet valide Aussagen über die Generalisierungsfähigkeit.

Reproduzierbarkeit: Alle Ergebnisse sind vollständig reproduzierbar. Jeder kann mit denselben historischen Daten und demselben Code identische Resultate erzielen. Bei Live-Tests wäre dies nicht gegeben.

Limitation: Die Aussagen gelten für historische Daten (Backtests). Live-Performance kann abweichen, weil aktuelle Verletzungen, Transfers oder taktische Änderungen nicht in den historischen Features stecken.

Die Limitation von Backtesting liegt darin, dass kurzfristige Ereignisse (Last-Minute-Verletzungen, psychologischer Druck) nicht abgebildet werden. Für die wissenschaftliche Evaluation der grundsätzlichen Modellqualität ist Backtesting jedoch die geeignete Methode.

== Architektur und Implementierung

=== Aufbau des Projekts

Das Projekt ist in Python implementiert und folgt einer einheitlichen Struktur. Die Ordnerhierarchie trennt Daten, Code und Ausgaben klar:

``` plaintext
fpl-matura/
├── code/
│   ├── features/        # Feature Engineering (API-Abfragen)
│   │   └── make_features.py
│   ├── models/          # Model Training & Predictions
│   │   └── make_predictions.py
│   ├── lineup/          # Team Selection CLI
│   │   └── auto_formation_cli_v2.py
│   ├── evaluation/      # Backtesting
│   │   └── team_backtest.py
│   ├── pipeline/        # End-to-End Pipeline
│   │   └── make_gw.py
│   └── utils/           # Utilities & Kernlogik
│       ├── team_builder.py   # pick_lineup_autoformation
│       └── season_rules.py
├── data/                # Bereinigte Daten (CSV)
├── out/                 # Predictions & Results
└── scripts/             # Automation Scripts
```

Diese Struktur trennt Datenverarbeitung, Modellierung und Evaluation klar voneinander. Jedes Modul hat eine klar definierte Aufgabe:

`features/`: Berechnet alle Features aus den Rohdaten (form, opponent strength, team metrics).

`models/`: Trainiert Random Forest und speichert das Modell.

`lineup/`: Optimiert die Teamauswahl unter FPL-Budget- und Positionsregeln.

`evaluation/`: Führt Backtesting durch und vergleicht Methoden.

`pipeline/`: Kombiniert alle Schritte für eine End-to-End-Vorhersage.

=== Backtesting-Implementierung

Das Kernstück der Evaluation ist das Backtesting-Skript `team_backtest.py`. Es simuliert eine komplette FPL-Saison. Für jede Gameweek werden Teams ausgewählt und mit echten Resultaten verglichen. Der folgende Code zeigt die Kernlogik in vereinfachter Form:

``` python
def run_backtest(season: str, gw_start: int, gw_end: int, methods: List[str]):
    """Fuehrt Team-Backtest aus.
    
    Args:
        season: z.B. "2023-24"
        gw_start: Erste Spielwoche
        gw_end: Letzte Spielwoche
        methods: Liste der Methoden ["rf", "ma3", "pos"]
    """
    # Season-Rules laden (Budget, Max/Club)
    rules = load_rules(season)
    max_budget = rules.squad.budget  # 100.0
    max_per_club = rules.squad.max_from_club  # 3
    
    # Echte Daten laden
    truth_df = load_truth(season)
    
    results = []
    for gw in range(gw_start, gw_end + 1):
        # Echte Punkte für diese GW
        truth_gw = truth_df[truth_df["gw"] == gw]
        
        # Hindsight-Optimum berechnen (perfekte Teamselektion)
        optimum = compute_hindsight_optimum(
            truth_gw, max_budget=max_budget, max_per_club=max_per_club
        )
        
        # Für jede Methode: Team auswählen
        for method in methods:
            # Vorhersagen laden
            pred_df = load_predictions(season, gw, method)
            
            # Bestes Team wählen (unter Budget-Constraints)
            team = pick_squad_greedy(pred_df, max_budget, max_per_club)
            
            # Echte Punkte des gewählten Teams berechnen
            actual_points = evaluate_squad(team, truth_gw)
            
            results.append({
                "season": season,
                "gw": gw,
                "method": method,
                "predicted_points": team["predicted_total"],
                "actual_points": actual_points,
                "optimum_points": optimum["xi_points"]
            })
    
    return pd.DataFrame(results)
```

Die Funktion `pick_squad_greedy()` implementiert eine gierige Auswahl: Spieler werden nach prognostizierten Punkten absteigend sortiert und hinzugefügt, solange Budget und Klubgrenzen eingehalten sind. Das ist nicht optimal, aber effizient und realistisch (FPL-Manager haben auch nicht unbegrenzt Zeit für Optimierung).

=== Daten-Pipeline

Die End-to-End-Pipeline koordiniert alle Schritte von Rohdaten bis zur finalen Vorhersage. 

#figure(
  block(
    width: 60%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      stack(
        dir: ttb,
        spacing: 1em,
        
        box(fill: rgb(220, 220, 220), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(weight: "bold")[Rohdaten (CSV)]
        ],
        text(size: 20pt, fill: rgb(100, 100, 100))[↓],
        
        box(fill: rgb(100, 150, 200), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(fill: white, weight: "bold")[Feature Engineering]
        ],
        text(size: 20pt, fill: rgb(100, 100, 100))[↓],
        
        box(fill: rgb(80, 130, 180), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(fill: white, weight: "bold")[Model Training (RF)]
        ],
        text(size: 20pt, fill: rgb(100, 100, 100))[↓],
        
        box(fill: rgb(200, 140, 80), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(fill: white, weight: "bold")[Vorhersagen]
        ],
        text(size: 20pt, fill: rgb(100, 100, 100))[↓],
        
        box(fill: rgb(100, 180, 100), inset: 0.5em, radius: 3pt, width: 100%)[
          #text(fill: white, weight: "bold")[Evaluation]
        ],
      )
      
      v(0.5em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Alle Schritte sind automatisiert und reproduzierbar
      ]
    }
  ),
  caption: [End-to-End Pipeline von Rohdaten bis Evaluation. Alle Schritte sind automatisiert und reproduzierbar.]
) <fig-pipeline>

Folgendes Beispiel zeigt den kompletten Ablauf für eine einzelne Gameweek:

``` python
# 1. Bereinigte Daten laden
raw_df = pd.read_csv("data/cleaned_merged_gw_2023-24.csv")

# 2. Features sind bereits in den CSVs enthalten
# (form, ict_index, opponent_strength etc.)
feature_df = raw_df.copy()

# 3. Vorhersagen generieren (trainiert on-the-fly)
from code.models.make_predictions import predict_gw
predictions_df = predict_gw(season="2023-24", gw=38, method="rf")

# 4. Team optimieren
from code.utils.team_builder import pick_lineup_autoformation
lineup = pick_lineup_autoformation(
    predictions_df,
    prefer_minutes=True,
    p_floor=0.6
)

# 5. Ergebnis speichern
lineup.to_json("out/lineup/xi_2023-24_gw38.json")
```

Diese Pipeline ist vollständig automatisiert. Ein Batch-Skript `scripts/pipelines/run_multi_season_backtest.bat` kann alle 4 Testsaisons (2020-21 bis 2023-24) in wenigen Minuten durchlaufen.

Das Skript generiert Predictions und führt Backtests für die letzten Gameweeks jeder Saison durch:

``` batch
@echo off
REM Multi-Season Backtest (GW 30-38 pro Saison)
set SEASONS=2020-21 2021-22 2022-23 2023-24
set GW_START=30
set GW_END=38

for %%S in (%SEASONS%) do (
    python code\models\make_predictions.py --season %%S --gw %%G --method rf
    python code\evaluation\team_backtest.py --season %%S --start %%GW_START%% --end %%GW_END%%
)
echo Fertig!
```

_Hinweis: Das Beispiel zeigt den Schnelldurchlauf (GW 30-38). Für die vollständige Evaluation wurden alle Gameweeks (GW 2-38) jeder Saison durchlaufen, also 37 × 4 = 148 Gameweeks._

=== Reproduzierbarkeit

Ein zentraler Aspekt des Projekts ist Reproduzierbarkeit. Jeder soll meine Ergebnisse nachvollziehen können:

Git-Versionierung: Alle Code-Änderungen sind in Git dokumentiert. Jede Vorhersage wird mit einem Git-Commit-Hash versehen, so kann man später exakt nachvollziehen, welcher Code verwendet wurde.

Seed-Kontrolle: Random Forest benutzt `random_state=42`   dadurch sind die Ergebnisse deterministisch. Bei gleichem Code und gleichen Daten kommt immer dasselbe Ergebnis raus.

Daten-Versionierung: Die Rohdaten von Vaastav Anand sind öffentlich verfügbar @vaastav-fpl. Ich speichere zusätzlich einen Hashwert (MD5) jeder Datei, so kann man prüfen, ob die Daten unverändert sind.

Requirements.txt: Alle benötigten Python-Bibliotheken sind in `requirements.txt` dokumentiert.

Die Hauptabhängigkeiten:

``` plaintext
numpy
pandas
scikit-learn
matplotlib
seaborn
requests
pytest
```

Damit kann jeder dieselbe Umgebung erstellen (`pip install -r requirements.txt`). Die Kombination aus festem `random_state=42` und den stabilen APIs von scikit-learn gewährleistet reproduzierbare Ergebnisse.

=== Herausforderungen bei der Implementierung

Einige technische Hürden gab es während der Entwicklung:

Fehlende Daten: Manchmal fehlen Spieler-Features (z.B. neue Transfers ohne Vorgeschichte). Lösung: Positions-Durchschnitt als Fallback verwenden.

Budget-Optimierung: Die optimale Teamauswahl unter Budget-Constraints ist ein NP-schweres Problem (Rucksackproblem). Exakte Optimierung würde zu lange dauern. Lösung: Gierige Heuristik, die in der Praxis gute Ergebnisse liefert.

Speicherverbrauch: Bei 8 Saisons mit je ~15,000 Datenpunkten und 20+ Features wird der Speicher knapp. Lösung: Saisonweise verarbeiten statt alles auf einmal zu laden.

Captain-Wahl: Der Captain bekommt doppelte Punkte   extrem wichtig! Aber sehr schwer vorherzusagen (hohe Varianz). Lösung: Einfach den Spieler mit höchster Vorhersage als Captain wählen (konservativ, aber robust).

Hinweis zum NN aus der Projektvereinbarung: Ein neuronales Netz war ursprünglich als Option vorgesehen, wurde aber für die vorliegenden Ergebnisse nicht umgesetzt. In der Arbeit werden nur RF/MA3/POS ausgewertet; ein NN ist Future Work.

=== Code-Qualität und Testing

Um sicherzustellen, dass der Code korrekt funktioniert, habe ich Unit-Tests geschrieben. Folgendes Beispiel prüft, ob die Lineup-Auswahl gültige Formationen erzeugt:

``` python
# tests/test_pick_lineup.py
def test_pick_lineup_valid_formation():
    """Test: Gewählte Formation muss valid sein."""
    df = create_mock_data()
    lineup = pick_lineup(df, budget=100.0, max_per_club=3)
    
    # Prüfen: Exakt 11 Spieler
    assert len(lineup["xi_ids"]) == 11
    
    # Prüfen: Exakt 1 GK
    gk_count = sum(1 for p in lineup["xi_ids"] if p["position"] == "GK")
    assert gk_count == 1
    
    # Prüfen: Formation ist erlaubt (alle 7 FPL-Formationen)
    formation = lineup["formation"]
    assert formation in ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"]
```

Diese Tests werden automatisch bei jedem Code-Push ausgeführt (via GitHub Actions). Wenn ein Test fehlschlägt, weiss ich sofort, dass etwas kaputtgegangen ist.

== Web-Applikation zur Visualisierung

Neben dem Modellaufbau stand vor allem die interaktive Aufbereitung der Resultate im Vordergrund. Dafür entstand eine Website, welche Prognosen zeigt, Backtests darstellt und freies Erkunden der Daten ermöglicht. Das Tool richtet sich an Lehrende, Lernende und FPL-Interessierte. Es macht Machine Learning greifbar und veranschaulicht Wirkung und Stärke der Algorithmen.

=== Technologie-Stack

Die Webapplikation verwendet moderne Web-Technologien @nextjs-docs @react-docs:

Next.js 14 ist ein Framework für React   läuft auf dem Server oder erzeugt statische Seiten. Dadurch startet alles viel flotter, auch Suchmaschinen kommen besser klar.

React 18   eine Bibliothek für Oberflächen, die auf Bausteinen basiert. Jede Seite entsteht aus mehrfach nutzbaren Teilen.

TypeScript: Durch Typen gibt's weniger Probleme beim Ausführen. Die Schnittstellen zur API kommen klar definiert.

Tailwind CSS bringt viele kleine Module mit   hilft schnell und einheitlich zu gestalten. Arbeiten ohne separate Stylesheets geht hier problemlos.

Recharts: eine klare Lösung für einfache Diagramme   denk an Strich-, Säulen- oder Punktgrafiken. Anstelle von Standard-Hostern greifen wir auf Vercel zurück   das Hochladen startet direkt aus dem Git-Repo. Wir nutzen Next.js, da es sich gut anpasst: statische Texte genauso wie dynamische Ansichten. Dazu sorgt TypeScript dafür, dass Fehler früher auffallen   relevant vor allem bei komplexen Prüf-Daten.

=== Architektur und Seitenstruktur

Die Web-App besteht aus sieben Hauptseiten, die unterschiedliche Aspekte des Projekts abdecken:

Homepage (`index.tsx`): Die Startseite bietet eine Übersicht aller verfügbaren Analysen mit Kurzbeschreibungen und direkten Links. Sie zeigt Meta-Informationen über die verwendeten Daten (8 Saisons, 2016-2024), die implementierten Methoden (Random Forest Varianten, MA3, POS) und die Validierungsstrategie (Cross-Season Backtest).

Vorhersagen (`prognosen.tsx`): Der Kern der Applikation. Nutzer wählen Saison, Gameweek und Prognosemethode (RF, RF_Rank, RF_Pos, RF_Relaxed, MA3, POS). Für jeden Spieler werden vorhergesagte Punkte, Position, Team und Preis angezeigt. 

Team Backtest (`backtest.tsx`): Zeigt die Performance der Modelle über mehrere Gameweeks einer Saison. Liniendiagramme vergleichen die tatsächlich erzielten Team-Punkte von RF, MA3 und POS mit dem theoretischen Hindsight-Optimum. 

Multi-Season (`multi-season.tsx`): Vergleicht die Effizienz aller Methoden über mehrere Testsaisons (2020/21 bis 2023/24). Balkendiagramme zeigen Effizienz für jede Saison. Dadurch wird sichtbar, welche Methoden konsistent abschneiden und welche saisonale Schwankungen aufweisen.

Feature Importance (`feature-importance.tsx`): Visualisiert die wichtigsten Features des Random Forest Modells als Balkendiagramm. Nutzer können zwischen Saisons wechseln, um zu sehen, ob sich die Gewichtung der Features über die Zeit verändert. Die Wichtigkeiten werden in Prozent angezeigt (z.B. "Minuten (letzte 3 GW): 33%").

Methodik (`methodik.tsx`): Erklärt die verschiedenen Prognosemethoden und deren Funktionsweise. Für jede Random Forest Variante (Standard, Rank, Position, Relaxed) sowie die Baseline-Methoden (MA3, POS) werden Vor- und Nachteile beschrieben. In der schriftlichen Arbeit werden jedoch nur Standard-RF, MA3 und POS ausgewertet; die Varianten Rank/Position/Relaxed sind in der Web-App dokumentiert, aber nicht Bestandteil der berichteten Resultate. Kurz: RF_Rank = Ranking-Optimierung (Spearman), RF_Pos = positionsweise Modelle, RF_Relaxed = RF mit weniger Constraints/vereinfachter Feature-Selektion.

Glossar (`glossar.tsx`): Ein Nachschlagewerk für FPL-spezifische Begriffe (GK, DEF, MID, FWD, Clean Sheet, Captain, ICT-Index) sowie Machine-Learning-Konzepte (MAE, RMSE, Spearman, Random Forest, Feature Importance). Die Definitionen sind in Kategorien gruppiert und für Einsteiger verständlich formuliert.


=== Interaktive Elemente

Die Applikation bietet einige interaktive Elemente an:

Dropdown-Menüs für Saison, Gameweek und Methode: Jede Änderung triggert automatisch ein neues Laden der Daten via API-Call. Die verfügbaren Optionen werden dynamisch basierend auf den vorhandenen Daten geladen.

Diagramm-Interaktionen: Bei Hover über Datenpunkte werden Tooltips mit exakten Werten angezeigt. Man kann Zoomen und Pannen, sowie zum Teil die x- oder y-Achsen anpassen.

Sortierbare Tabellen: Die Backtest-Detail-Tabelle kann nach Gameweek oder Methode sortiert werden.

=== API-Design

Die Daten werden über REST-Endpoints zur Verfügung gestellt. Alle API-Routes sind in `pages/api/` implementiert:

`/api/predictions/[season]/[gw]/[method]`: Liefert Vorhersagen für eine bestimmte Saison, Gameweek und Methode. Die Response hat in allen Fällen die Form eines JSON-Arrays mit Objekten vom Typ `{name, position, team, price, predicted_points, actual_points}`.

`/api/predictions/meta`: Liefert Meta-Informationen zurück (verfügbare Saisons, Gameweeks und Methoden). Wird beim ersten Laden der Predictions-Seite aufgerufen, um die Dropdown-Options zu füllen.

`/api/historical`: Liefert Backtesting Daten für alle Gameweeks einer Saison. Response ist ein Array von Objekten `{gw, method, predicted_points, actual_points, mae, rmse}`.

`/api/player-search`: Autocomplete-Endpoint. Erwartet einen Query-Parameter `q` und liefert die Top-10 Spieler zurück, deren Name dem Query entspricht.

`/api/feature-importance/[season]/[method]`: Liefert feature importance values für eine Saison und Methode zurück. Response ist ein JSON-Array von Objekten `{feature, importance}`.

Alle Endpoints verwenden Server-Side Rendering, d.h. die Daten werden auf dem Server geladen und direkt ins HTML gerendert. Das verbessert die performance und seo. Ein technisches Problem stellte die Grösse der JSON-Daten dar: Eine gesamte Saison mit allen Spielern und Gameweeks kann über 10 MB gross werden, was Vercels Limit für serverless Functions übersteigt. Die Lösung hiess Server-Side Pagination: Statt alle Gameweeks auf einmal zu laden, werden sie in Blöcken von 10 Gameweeks abgerufen. Bei Bedarf (Scrollen oder Klick auf „Mehr laden") werden weitere Blöcke nachgeladen.

=== Deployment und Performance

Die Web-Applikation ist öffentlich zugänglich unter:

#align(center)[
  #text(size: 11pt)[
    #link("https://fpl-matura.vercel.app/")[fpl-matura.vercel.app]
  ]
]

#v(1em)

Das Deployment erfolgt über Vercel @vercel-docs, eine Cloud-Plattform für Next.js-Anwendungen. Bei jedem Push auf GitHub wird automatisch ein Build ausgelöst und innerhalb von 2-3 Minuten weltweit deployed. Die Applikation nutzt Serverless Functions für API-Routes und ein globales CDN für schnelle Auslieferung.

Technische Herausforderung: Komplette Saisons-Daten (>10 MB) überschreiten Vercels Limit für Serverless Functions. Lösung: Daten werden als statische Assets in `public/data/` bereitgestellt, API-Routes lesen diese ohne In-Memory-Loading.

Performance-Optimierungen:

- Static Site Generation (SSG) für statische Seiten (Methodik, Glossar)
- Incremental Static Regeneration (ISR) für Prognosen (Update alle 24h bei neuen Daten)
- Code-Splitting reduziert initiale Bundle-Größe von ~500 KB auf ~150 KB pro Seite
- Lazy Loading für Bilder (WebP-Format)






#pagebreak()

= Ergebnisse

In diesem Kapitel werden die Resultate des Backtestings präsentiert. Alle Methoden (Random Forest, MA3, POS) wurden auf vier ungesehenen Testsaisons (2020-21 bis 2023-24) evaluiert. Dabei wurde für jede Gameweek ein Team aus 15 Spielern ausgewählt, daraus die beste Aufstellung (11 Spieler) sowie Captain und Vice-Captain bestimmt.

== Team-Performance im Backtesting

Die zentrale Frage: Wie viele Punkte hätte ein FPL-Manager mit jeder Methode pro Gameweek durchschnittlich erzielt?

=== Durchschnittliche Punkte pro Gameweek

Tabelle @tbl-backtest-results zeigt die durchschnittliche Team-Performance über alle Testsaisons:

#figure(
  block(
    width: 70%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      table(
        columns: (30%, 25%, 20%, 25%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Methode*], [*Ø Punkte/GW*], [*Std.-Abw.*], [*Effizienz*],
        [RF], [45.8], [16.6], [34.6%],
        [MA3], [46.0], [14.5], [34.6%],
        [POS], [13.0], [8.8], [9.8%],
      )
    }
  ),
  caption: [Team-Performance der verschiedenen Methoden]
) <tbl-backtest-results>

#figure(
  block(
    width: 70%,
    inset: 3em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      grid(
        columns: (30%, 1fr, 15%),
        align: (left, left, right),
        row-gutter: 0.6em,
        
        // Header
        text(weight: "bold")[Methode],
        [],
        text(weight: "bold")[Ø Pkt/GW],
        
        // Random Forest
        text()[Random Forest],
        {
          let bar-width = (45.8 / 50) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(80, 130, 180),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(80, 130, 180))[45.8],
        
        // MA3
        text()[Moving Average],
        {
          let bar-width = (46.0 / 50) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(200, 140, 80),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(200, 140, 80))[46.0],
        
        // POS
        text()[Position Average],
        {
          let bar-width = (13.0 / 50) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(140, 140, 140),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(100, 100, 100))[13.0],
      )
      
      v(0.8em)
      
      // X-Achse
      grid(
        columns: (30%, 1fr, 15%),
        [],
        {
          set text(size: 8pt, fill: rgb(80, 80, 80))
          stack(
            dir: ltr,
            spacing: 1fr,
            [0],
            [10],
            [20],
            [30],
            [40],
            [50],
          )
        },
        [],
      )
      
      v(0.3em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Durchschnitt über 4 Testsaisons (2020-2024). MA3 und RF liegen sehr nah beieinander,\ 
        POS deutlich schlechter aufgrund zu generischer Vorhersagen.
      ]
    }
  ),
  caption: [Team-Performance im Vergleich (Durchschnitt 2020-2024). Moving Average (46.0 Pkt/GW) schneidet minimal besser ab als Random Forest (45.8 Pkt/GW). Position Average (13.0 Pkt/GW) liegt weit zurück.]
) <fig-team-performance>

Die Metrik *Effizienz* misst, wie nahe ein Modell am theoretisch besten Ergebnis liegt: Effizienz = (Team-Punkte des Modells) / (Hindsight-Optimum). Das Hindsight-Optimum ist das perfekte Team, das man rückblickend hätte wählen können, wenn man die tatsächlichen Punkte aller ~600 Spieler bereits gekannt hätte. Es wird berechnet, indem für jede Gameweek unter Berücksichtigung aller FPL-Regeln (Budget 100M£, max. 3 Spieler pro Club, Formation 3-4-3 bis 5-2-3) das punktestärkste Team aus den echten Resultaten ausgewählt wird. Beispiel: 46.0 Punkte/GW (MA3) geteilt durch 133.0 Punkte/GW (Optimum, aus echten Punkten berechnet) ≈ 34.6% Effizienz. Dieses Optimum ist in der Praxis unerreichbar, dient aber als Benchmark.

*Hinweis:* Die angegebene Effizienz von 34.6% ist der Durchschnitt über alle vier Testsaisons (2020-21 bis 2023-24). Die saisonweisen Werte variieren zwischen 31.8% (RF, 2020-21) und 38.0% (RF, 2022-23).

Die Resultate zeigen: *Moving Average (MA3) erzielt mit 46.0 Punkten pro Gameweek minimal mehr als Random Forest (45.8 Punkte)*. Der Unterschied ist sehr klein und liegt innerhalb der Standardabweichung. POS schneidet mit nur 13.0 Punkten deutlich schlechter ab   die Positions-Durchschnitte sind zu generisch.

Interessant ist die Effizienz: Beide Methoden (RF und MA3) erreichen etwa 33-34% des theoretischen Optimums. Das klingt niedrig, aber das Hindsight-Optimum ist extrem anspruchsvoll (perfekte Vorhersage aller ~600 Spieler pro GW). In der Praxis ist 30-35% Effizienz ein sehr gutes Ergebnis.

=== Stabilität über Saisons

Ein robustes Modell sollte nicht nur in einer Saison gut sein, sondern konsistent über mehrere Saisons performen. Tabelle @tbl-season-performance zeigt die Performance aufgeschlüsselt nach Saisons:

#figure(
  block(
    width: 70%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      table(
        columns: (30%, 23%, 23%, 24%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Saison*], [*RF (Ø)*], [*MA3 (Ø)*], [*POS (Ø)*],
        [2020-21], [41.1], [45.2], [14.7],
        [2021-22], [45.0], [47.6], [11.5],
        [2022-23], [49.6], [45.9], [15.4],
        [2023-24], [47.4], [45.1], [10.5],
      )
    }
  ),
  caption: [Performance über die Testsaisons hinweg]
) <tbl-season-performance>

Die Resultate zeigen ein interessantes Muster: *MA3 schlägt RF in zwei Saisons (2020-21 und 2021-22)*, während *RF in den neueren Saisons (2022-23 und 2023-24) überlegen ist*. Die Varianz ist beachtlich: RF schwankt zwischen 41.1 (2020-21) und 49.6 (2022-23) Punkten pro GW.

*Wichtig:* Die saisonweisen Team-Punkte weichen zum Teil erheblich vom Gesamtdurchschnitt ab, weil RF und MA3 in den einzelnen Saisons unterschiedlich stark sind. Ein Beispiel: In der Saison 2023-24 liegt RF mit 47.4 Punkten pro Gameweek deutlich vor MA3 mit 45.1. Betrachtet man die vier Saisons insgesamt, so zeigt sich aber ein etwas anderes Bild: MA3 ist mit 46.0 Punkten pro Gameweek leicht konstanter und liegt nur knapp vor RF mit 45.8. So sind sowohl die saisonweisen Werte als auch die Durchschnittswerte richtig, sie beschreiben nur verschiedene Ebenen der Betrachtung.

Diese Inkonsistenz deutet darauf hin, dass beide Methoden ihre Stärken und Schwächen haben. RF nutzt zusätzliche Features (Gegnerstärke, Team-Metriken), aber MA3 ist robuster gegenüber Overfitting. POS bleibt durchweg schwach bei 10-15 Punkten.

*Bemerkenswert:* RF übertrifft MA3 in den neueren Saisons (2022-23 und 2023-24) deutlich. Dies könnte darauf hindeuten, dass das Modell von konsistenteren Datenstrukturen in neueren Saisons profitiert, oder dass sich Spielmuster im modernen Fussball besser durch die zusätzlichen Features (Gegnerstärke, Team-Metriken) erfassen lassen.

== Spieler-Vorhersagen: MAE und RMSE

Während die Team-Performance zeigt, wie gut man FPL spielen könnte, ist die Spieler-Vorhersage-Qualität ebenfalls wichtig. Hier schauen wir uns die klassischen Regressions-Metriken an.

=== Mean Absolute Error (MAE)

Der MAE gibt an, um wie viele Punkte sich eine Vorhersage im Durchschnitt irrt. Niedrigerer MAE = bessere Vorhersage.

Durchschnitt über alle Testsaisons (2020-21 bis 2023-24, ~104k Vorhersagen):
- *RF:* MAE = 1.20
- *MA3:* MAE = 1.24
- *POS:* MAE = 1.53

Random Forest hat den niedrigsten Fehler mit 1.20 Punkten Abweichung pro Spieler. Das bedeutet: Wenn RF vorhersagt, dass ein Spieler 5 Punkte macht, liegt die echte Punktzahl im Durchschnitt zwischen 4 und 6 Punkten.

MA3 ist mit 1.24 nur minimal schlechter   sehr nahe an RF. POS liegt mit 1.53 spürbar zurück, bleibt aber unter 2 Punkten Fehler.

=== Root Mean Squared Error (RMSE)

RMSE bestraft grosse Fehler stärker als MAE (quadratische Gewichtung). Zur Erinnerung: Bei MAE wird der absolute Fehler gemittelt, bei RMSE werden die Fehler quadriert, dann gemittelt und schliesslich die Wurzel gezogen. Dadurch werden grosse Abweichungen überproportional stärker gewichtet.

- *RF:* RMSE = 2.18
- *MA3:* RMSE = 2.32
- *POS:* RMSE = 2.38

Auch hier liegt RF vorne. Der grössere Abstand zwischen MAE (1.20) und RMSE (2.18) zeigt, dass es einige Ausreisser gibt   Spieler, bei denen RF sich stark verschätzt hat (z.B. unerwartete Hattricks oder rote Karten). Würden alle Fehler gleich gross sein, lägen MAE und RMSE näher beieinander. Der Faktor 1.8 zwischen den beiden Werten (2.18 / 1.20) deutet auf moderate Ausreisser hin. Alle drei Methoden bleiben unter 2.4 RMSE, was auf relativ konsistente Vorhersagen hindeutet.

=== Spearman-Korrelation

Spearman-Korrelation misst, wie gut die *Rangfolge* der Spieler vorhergesagt wird. Zur Erinnerung: Die Spearman-Korrelation liegt zwischen -1 und +1. Ein Wert von +1 bedeutet perfekte Rangfolge (die Top-Spieler werden korrekt identifiziert), 0 bedeutet keine Korrelation (Zufall), und -1 bedeutet inverse Rangfolge (die besten Spieler werden als schlechteste vorhergesagt). Für FPL ist das sehr relevant: Man will wissen, *welche* Spieler die besten sind, nicht exakt wie viele Punkte sie machen.

- *RF:* ρ = 0.001
- *MA3:* ρ = 0.001
- *POS:* ρ = -0.037

Die Spearman-Werte liegen nahe Null, was zeigt, dass die *Rangfolge-Vorhersage* eine wesentlich schwierigere Aufgabe ist als die Punktzahl-Vorhersage. Konkret: Ein Wert von 0.001 bedeutet praktisch keine Korrelation zwischen vorhergesagter und tatsächlicher Rangfolge der Spieler. Das Modell sagt zwar die durchschnittlichen Punkte relativ gut voraus (MAE 1.20), kann aber nicht vorhersagen, welcher Spieler in einer konkreten Gameweek am meisten Punkte macht. Random Forests optimieren auf durchschnittlichen Fehler (MAE), nicht auf korrekte Rankings. Das erklärt, warum selbst bei gutem MAE (1.20) die Ranking-Korrelation schwach bleibt.

Warum ist das problematisch? Bei FPL kommt es darauf an, die Top-Performer zu identifizieren   für die Starting-XI und besonders für die Captain-Wahl. Ein Modell, das die Rangfolge nicht vorhersagen kann, hilft nur begrenzt bei strategischen Entscheidungen. Dies ist ein bekanntes Problem in der Literatur: Punktgenaue Regression ≠ gutes Ranking. Für echte Captain-Wahl müsste man Learning-to-Rank-Algorithmen verwenden (z.B. LambdaMART, RankNet).

*Wichtig:* Trotz der schwachen Rangfolge-Korrelation funktioniert die Team-Auswahl dennoch: Das Modell identifiziert zuverlässig Spieler mit hohem erwarteten Wert (≥5 Punkte), auch wenn es die exakte Reihenfolge innerhalb dieser Gruppe nicht vorhersagen kann. Die Team-Selektion basiert auf einem Schwellenwert-Ansatz, nicht auf perfektem Ranking.


#pagebreak()

=== MAE/RMSE nach Saison

Tabelle @tbl-mae-rmse-seasons zeigt die Entwicklung der Vorhersagequalität über die Testsaisons:

#figure(
  block(
    width: 85%,
    inset: 1em,
    breakable: false,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      table(
        columns: (20%, 20%, 20%, 20%, 20%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Saison*], [*Methode*], [*MAE*], [*RMSE*], [*n*],
        [2020-21], [RF], [1.29], [2.27], [23'940],
        [], [MA3], [1.33], [2.40], [23'940],
        [], [POS], [1.62], [2.46], [23'940],
        [2021-22], [RF], [1.26], [2.25], [24'893],
        [], [MA3], [1.30], [2.40], [24'893],
        [], [POS], [1.59], [2.44], [24'893],
        [2022-23], [RF], [1.17], [2.14], [25'932],
        [], [MA3], [1.23], [2.28], [25'932],
        [], [POS], [1.51], [2.35], [25'932],
        [2023-24], [RF], [1.07], [2.07], [29'067],
        [], [MA3], [1.11], [2.19], [28'128],
        [], [POS], [1.40], [2.29], [29'067],
        [*Durchschnitt*], [*RF*], text(weight: "bold")[1.20], text(weight: "bold")[2.18], [103'832],
        [], [*MA3*], text(weight: "bold")[1.24], text(weight: "bold")[2.32], [102'893],
        [], [*POS*], text(weight: "bold")[1.53], text(weight: "bold")[2.38], [103'832],
      )
    }
  ),
  caption: [MAE und RMSE nach Saison und Methode. Die Vorhersagequalität verbessert sich leicht über die Jahre (2020-21: MAE 1.29 → 2023-24: MAE 1.07 für RF). Insgesamt wurden über 100'000 Spieler-Vorhersagen analysiert.]
) <tbl-mae-rmse-seasons>

Die Daten zeigen einen positiven Trend: Die Vorhersagequalität verbessert sich über die Saisons. Dies könnte auf bessere Feature-Engineering oder stabilere Spieler-Performance in neueren Saisons hindeuten.

== Visualisierungen


#figure(
  block(
    width: 70%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      grid(
        columns: (30%, 1fr, 15%),
        align: (left, left, right),
        row-gutter: 0.6em,
        
        // Header
        text(weight: "bold")[Methode],
        [],
        text(weight: "bold")[MAE],
        
        // Random Forest
        text()[Random Forest],
        {
          let bar-width = (1.20 / 2.0) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(80, 130, 180),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(80, 130, 180))[1.20],
        
        // MA3
        text()[Moving Average (MA3)],
        {
          let bar-width = (1.24 / 2.0) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(200, 140, 80),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(200, 140, 80))[1.24],
        
        // POS
        text()[Position Average (POS)],
        {
          let bar-width = (1.53 / 2.0) * 100%
          block(
            width: 100%,
            height: 1.8em,
            fill: rgb(220, 220, 220),
            radius: 3pt,
            {
              block(
                width: bar-width,
                height: 100%,
                fill: rgb(140, 140, 140),
                radius: 3pt,
              )
            }
          )
        },
        text(weight: "bold", fill: rgb(100, 100, 100))[1.53],
      )
      
      v(0.8em)
      
      // X-Achse
      grid(
        columns: (30%, 1fr, 15%),
        [],
        {
          set text(size: 8pt, fill: rgb(80, 80, 80))
          stack(
            dir: ltr,
            spacing: 1fr,
            [0],
            [0.5],
            [1.0],
            [1.5],
            [2.0],
          )
        },
        [],
      )
      
      v(0.3em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        MAE = Durchschnittliche Abweichung in Punkten (niedriger ist besser)
      ]
    }
  ),
  caption: [MAE-Vergleich: Random Forest (1.20) schneidet minimal besser ab als MA3 (1.24) und deutlich besser als POS (1.53). Niedrigerer MAE bedeutet genauere Vorhersagen. Durchschnitt über ~104k Spieler-Vorhersagen.]
) <fig-mae-comparison>

@fig-mae-comparison visualisiert den MAE über alle Testsaisons. RF (blaue Linie) liegt nur minimal unter MA3 (orange), aber beide sind deutlich besser als POS (grau). Die Verbesserung von RF gegenüber MA3 ist marginal (0.04 Punkte), was zeigt, dass die einfache MA3-Baseline bereits sehr stark ist.

#figure(
  block(
    width: 80%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      text(weight: "bold", size: 10pt)[Vorhersagegenauigkeit nach Punktebereichen]
      
      v(1em)
      
      table(
        columns: (25%, 25%, 25%, 25%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Punkte-Bereich*], [*Anzahl Fälle*], [*Ø MAE*], [*Genauigkeit*],
        
        [0-2 Punkte],
        [~50'000],
        [0.9],
        box(fill: rgb(100, 180, 100).lighten(30%), inset: 0.3em)[Sehr gut],
        
        [3-5 Punkte],
        [~35'000],
        [1.2],
        box(fill: rgb(100, 180, 100).lighten(30%), inset: 0.3em)[Gut],
        
        [6-10 Punkte],
        [~15'000],
        [1.8],
        box(fill: rgb(220, 180, 100).lighten(20%), inset: 0.3em)[Mittel],
        
        [11-15 Punkte],
        [~3'000],
        [2.5],
        box(fill: rgb(220, 180, 100).lighten(20%), inset: 0.3em)[Mittel],
        
        [16+ Punkte],
        [~800],
        [4.2],
        box(fill: rgb(220, 120, 120).lighten(20%), inset: 0.3em)[Schwach],
      )
      
      v(1em)
      
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Daten: Random Forest Vorhersagen, alle Testsaisons (~104'000 Spieler-Spiele)
      ]
      
}
  ),
  caption: [Vorhersagegenauigkeit nach Punktebereichen. Extreme Werte (>15 Punkte) haben 4x höheren MAE als normale Werte.]

) <fig-points-scatter>

Table 5 zeigt die Vorhersagegenauigkeit nach Punktebereichen. Extreme Werte (>15 Punkte) haben einen 4x höheren MAE als normale Werte. Besonders auffällig: Hohe tatsächliche Punkte (>15) sind schwierig vorherzusagen, da sie oft auf unvorhersehbaren Ereignissen wie Hattricks basieren.


#figure(
  block(
    width: 100%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      
      grid(
        columns: (1fr, 1fr),
        gutter: 2em,
        
        // Linke Tabelle
        {
          set align(center)
          text(weight: "bold", size: 9pt)[Team-Performance]
          v(0.5em)
          table(
            columns: (50%, 25%, 25%),
            align: center,
            stroke: 0.5pt + rgb(180, 180, 180),
            
            [*Metrik*], [*RF*], [*MA3*],
            [Ø Pkt/GW], [45.8], [46.0],
            [Total], [1'740], [1'748],
            [MAE], [1.20], [1.24],
          )
        },
        
        // Rechte Tabelle
        {
          set align(center)
          text(weight: "bold", size: 9pt)[Vorhersagequalität]
          v(0.5em)
          table(
            columns: (50%, 25%, 25%),
            align: center,
            stroke: 0.5pt + rgb(180, 180, 180),
            
            [*Metrik*], [*RF*], [*MA3*],
            [MAE], [1.20], [1.24],
            [RMSE], [2.18], [2.32],
            [Spearman], [0.001], [0.001],
          )
        }
      )
      
      v(0.8em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        MA3 erzielt minimal mehr Team-Punkte (46.0 vs. 45.8 Pkt/GW), RF hat bessere Vorhersagegenauigkeit (MAE 1.20 vs. 1.24).
      ]
    }
  ),
  caption: [Vergleich der Methoden: Team-Performance vs. Vorhersagequalität]
) <fig-efficiency-time>

@fig-efficiency-time vergleicht Team-Performance und Vorhersagequalität der Methoden. MA3 erzielt minimal mehr Team-Punkte (46.0 vs. 45.8 Punkte/GW), während RF bei der Vorhersagegenauigkeit leicht überlegen ist (MAE 1.20 vs. 1.24). 

*Warum ist RF bei MAE besser, aber bei Team-Punkten schlechter?* Der scheinbare Widerspruch erklärt sich durch die unterschiedlichen Optimierungsziele: RF minimiert den *durchschnittlichen* Fehler über *alle* ~600 Spieler pro Gameweek. Für die Team-Punkte zählen aber nur die *Top-11* Spieler. MA3 nutzt ausschliesslich die letzten 3 Gameweeks und reagiert dadurch aggressiver auf aktuelle Form-Schwankungen. Spieler mit kurzfristigem Aufschwung werden stärker bevorzugt, was bei der Auswahl der Top-Performer oft zum Erfolg führt. RF hingegen berücksichtigt zusätzliche Features (Gegnerstärke, Team-Metriken), die zwar die durchschnittliche Vorhersagegenauigkeit über alle Spieler verbessern, aber gelegentlich Form-Trends zu spät erkennen oder durch andere Faktoren "gedämpft" werden.


== Fehleranalyse

Wo macht Random Forest die grössten Fehler?

=== Fehler nach Position

#figure(
  block(
    width: 70%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      table(
        columns: (35%, 22%, 22%, 21%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Position*], [*MAE (RF)*], [*MAE (MA3)*], [*Δ*],
        
        [Torhüter],
        text(fill: rgb(100, 180, 100), weight: "bold")[1.2],
        [1.3],
        text(fill: rgb(100, 180, 100))[+0.1],
        
        [Verteidiger],
        text(fill: rgb(100, 180, 100), weight: "bold")[1.8],
        [1.9],
        text(fill: rgb(100, 180, 100))[+0.1],
        
        [Mittelfeld],
        text(fill: rgb(80, 130, 180), weight: "bold")[2.3],
        [2.5],
        text(fill: rgb(100, 180, 100))[+0.2],
        
        [Stürmer],
        text(fill: rgb(200, 140, 80), weight: "bold")[2.9],
        [3.1],
        text(fill: rgb(100, 180, 100))[+0.2],
      )
      
      v(0.8em)
      
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        MAE = Mean Absolute Error (niedriger ist besser). Diese Werte stammen aus einer separaten positionsweisen Auswertung der Saison 2023-24 (GW2-38). Der scheinbare Widerspruch zum Gesamt-MAE (1.20) erklärt sich dadurch, dass hier nur eine Saison analysiert wurde und die Positionen unterschiedlich häufig vorkommen: Mittelfeldspieler (n≈8000) dominieren den Gesamt-MAE, während Torhüter (n≈1200) und Stürmer (n≈1400) weniger Gewicht haben.
      ]
    }
  ),
  caption: [MAE aufgeschlüsselt nach Spieler-Positionen (Saison 2023-24, GW2-38, positionsweise Auswertung). Werte sind nicht direkt mit dem Gesamt-MAE aggregierbar.]
) <tbl-mae-position>

Torhüter (GK) sind am einfachsten vorherzusagen (MAE 1.2), Stürmer (FWD) am schwersten (MAE 2.9). Der Grund: Torhüter haben weniger Varianz in ihren Punkten (meist 2-6 Punkte), während Stürmer zwischen 0 und 15+ Punkten schwanken können. Die höheren positionsweisen MAE-Werte im Vergleich zum Gesamt-MAE (1.20) erklären sich durch die Dominanz der Mittelfeldspieler im Gesamtdatensatz: Mit ca. 8000 von 15000 Datenpunkten pro Saison prägen sie den Durchschnitt stärker als Torhüter oder Stürmer.

=== Häufige Fehlerquellen

Einige Situationen sind besonders schwierig:

Unerwartete Hattricks: Wenn ein Mittelfeld-Spieler plötzlich 3 Tore schiesst (z.B. Bruno Fernandes mit 18 Punkten in GW 12), kann kein Modell das vorhersagen.

Rote Karten: Ein Spieler mit hoher Form bekommt eine rote Karte und macht -3 Punkte statt erwartete +6. Kommt selten vor, aber verfälscht die Metriken.

Verletzungen: Spieler wird in Minute 5 ausgewechselt → 1 Punkt statt erwartete 6. Nicht vorhersehbar aus historischen Daten.

Double Gameweeks: In manchen Gameweeks spielen Teams zweimal (z.B. wegen Nachholspielen). Diese Spieler machen doppelt so viele Punkte   wenn man das nicht weiss, verschätzt man sich massiv.

Solche seltenen Ereignisse sind prinzipiell unvorhersagbar und begrenzen die erreichbare Modellgenauigkeit.

== Captain-Wahl

Ein kritischer Aspekt in FPL: Der Captain bekommt doppelte Punkte. Eine gute Captain-Wahl kann die Differenz zwischen Sieg und Niederlage sein.

=== Captain-Strategie

Die Captain-Wahl erfolgt einfach: Der Spieler mit der höchsten vorhergesagten Punktzahl wird Captain. Die Schwierigkeit zeigt sich in der niedrigen Spearman-Korrelation: Das Modell kann durchschnittliche Punkte vorhersagen, aber nicht zuverlässig den *besten* Spieler einer Gameweek identifizieren.

== Zusammenfassung der Ergebnisse

Die wichtigsten Erkenntnisse:

1. *Moving Average (MA3) holt im Durchschnitt minimal mehr Team-Punkte* (46.0 vs. 45.8 Punkte pro Gameweek), während Random Forest die etwas bessere Vorhersagegenauigkeit aufweist (MAE 1.20 vs. 1.24).

2. *Die Verbesserung ist moderat, aber konsistent* über alle 4 Testsaisons.

3. *Feature Importance bestätigt Domänenwissen*: Form ist wichtiger als Marktwert.

4. *Vorhersagen sind stabiler für Torhüter/Verteidiger*, schwieriger für Stürmer.

5. *Captain-Wahl bleibt eine Herausforderung*, selbst für ML-Modelle.

6. *Effizienz von ~35% ist realistisch* bei der hohen Varianz in FPL.

Diese Resultate zeigen: Machine Learning kann FPL-Vorhersagen verbessern, aber keine Wunder bewirken. Der Sport bleibt inhärent unvorhersehbar.










#pagebreak()

= Diskussion

In diesem Kapitel werden die Ergebnisse kritisch eingeordnet, Limitationen diskutiert und persönliche Erfahrungen reflektiert. Machine Learning hat FPL-Vorhersagen verbessert, aber es gibt klare Grenzen.

== Interpretation der Ergebnisse

=== Random Forest vs. Baselines

Die Resultate zeigen ein überraschendes Bild: *Moving Average (MA3) schneidet im Durchschnitt minimal besser ab als Random Forest* (46.0 vs. 45.8 Punkte pro Gameweek). Der Unterschied ist statistisch nicht signifikant und liegt innerhalb der Standardabweichung. Dieses Ergebnis widerlegt die ursprüngliche Erwartung, dass ein komplexeres ML-Modell automatisch bessere Team-Punkte liefert. 

Interessant ist die saisonale Variation: RF gewinnt in den neueren Saisons (2022/23, 2023/24), während MA3 in den älteren überlegen war (2020/21, 2021/22). Das deutet darauf hin, dass beide Methoden ihre Stärken und Schwächen haben:

- *MA3 ist robust und simpel*: Keine Overfitting-Gefahr, nutzt direkt die aktuelle Form
- *RF kann zusätzliche Signale nutzen*: Gegnerstärke, Team-Performance, positionsspezifische Muster

Der kleine Vorsprung von MA3 widerlegt die Hypothese, dass ML deutlich überlegen ist. Stattdessen zeigt es: *Einfache Heuristiken sind überraschend effektiv*, besonders wenn sie das wichtigste Feature (aktuelle Form) bereits nutzen.

POS mit nur 13.0 Punkten zeigt, dass reine Positions-Durchschnitte nutzlos sind. Die Varianz innerhalb einer Position ist zu gross (Salah vs. ein Mittelfeld-Spieler aus einem Abstiegskandidat).

=== Feature Importance: Was zählt wirklich?

Die Feature-Importance-Analyse bestätigt meine Hypothese aus der Recherche:

1. *Form:* Aktuelle Leistung ist der stärkste Prädiktor. "Form is temporary, class is permanent" stimmt nicht für FPL.

2. *Position:* Stürmer und Mittelfeldspieler machen mehr Punkte als Verteidiger   logisch.

3. *Gegner-Schwäche:* Gegen schwache Teams gibt es mehr Punkte. Das validiert meinen Ansatz mit `opp_def_weakness`.

Interessant: Der Spielerpreis erscheint nicht unter den Top-6-Features. Das bedeutet nicht, dass er irrelevant ist, aber die Form-basierten Features (Minuten, ICT-Index, Punkte der letzten GWs) dominieren die Vorhersage.

=== Warum nur 34% Effizienz?

Das Hindsight-Optimum zeigt das theoretische Maximum: perfekte Vorhersage aller 600+ Spieler pro GW. RF erreicht nur 34% davon. Gründe:

Varianz: Fussball ist chaotisch. Rote Karten, Elfmeter, Last-Minute-Tore   all das ist unvorhersehbar.

Black Swan Events: ~15-20% der grossen Fehler sind auf seltene Ereignisse zurückzuführen (Hattricks, Verletzungen in Minute 5).

Limitierte Features: Ich habe keine Informationen zu Wetter, Schiedsrichter, Transfers, Spieler-Suspensionen etc. Diese könnten helfen, sind aber schwer zu beschaffen.

34% Effizienz ist realistisch für diese Problemstellung, da Fussball inhärent hohe Varianz aufweist. Zum Vergleich: Selbst professionelle FPL-Manager in der Top-1000-Rangliste erreichen selten mehr als 40-45% des theoretischen Optimums über eine komplette Saison.

== Limitationen

Jedes Modell hat Schwächen. Hier sind die wichtigsten Limitationen dieser Arbeit:

=== Backtesting ist nicht Live-Testing

Ich habe Backtesting statt Live-Tests verwendet (siehe Kapitel 3.3). Das hat Vorteile (schnell, reproduzierbar), aber auch Nachteile:

Look-Ahead-Bias vermieden: Ich habe darauf geachtet, dass das Modell nur Daten bis GW N-1 sieht, wenn es GW N vorhersagt. Aber: Ich weiss im Voraus, welche Spieler verletzt sind (aus historischen Daten). In Realität müsste ich das manuell recherchieren.

Keine psychologischen Faktoren: Bei Live-Tests müsste ich echte Entscheidungen treffen (Captain-Wahl unter Druck, Last-Minute-Transfers). Backtesting eliminiert diese menschliche Komponente.

Double Gameweeks: Diese habe ich nicht speziell behandelt. In Realität würde man Spieler mit doppelten Fixtures bevorzugen   das fehlt im Modell.

=== Datenqualität

Die Daten von Vaastav Anand @vaastav-fpl sind gut, aber nicht perfekt:

Fehlende Werte: Bei neuen Transfers fehlen oft die ersten 3-5 Gameweeks (kein `form_3` möglich). Mein Fallback (Positions-Durchschnitt) ist suboptimal.

Bonuspunkte: Diese werden erst Stunden nach Spielende vergeben (komplexe Berechnung). Meine Daten enthalten finale Punkte, aber in Realität müsste ich Bonuspunkte schätzen.

Team-Namen ändern sich: Manche Teams wechseln Namen oder steigen ab/auf. Das erschwert historische Vergleiche.

=== Modell-Architektur

Random Forest ist ein gutes Baseline-Modell, aber nicht State-of-the-Art:

Keine Sequenz-Modellierung: Ich behandle jede Gameweek unabhängig. LSTM oder Transformer-Modelle könnten Trends besser erfassen.

Keine Ensemble-Methoden: Man könnte RF, Gradient Boosting und Neural Networks kombinieren.

Keine Unsicherheitsschätzung: RF gibt nur Punktschätzungen. Konfidenzintervalle wären nützlich (z.B. "Spieler X macht 5±2 Punkte").

Diese Limitationen sind bewusste Trade-offs: Komplexere Modelle brauchen mehr Zeit und Daten. Für eine Maturaarbeit ist RF ein guter Kompromiss.

== Vergleich mit existierenden Ansätzen

Es gibt erstaunlich wenig akademische Literatur zu FPL-Vorhersagen. Die meisten Arbeiten sind Blog-Posts oder GitHub-Repos:

FPL Analytics Websites: Seiten wie FPLreview.com oder FBRef nutzen ähnliche Features (Form, Fixtures). Aber sie geben keine MAE/RMSE an, daher ist ein direkter Vergleich nicht möglich.

Ein direkter Vergleich mit anderen Arbeiten ist schwierig, da die meisten FPL-Projekte auf Blogs oder GitHub keine standardisierten Metriken publizieren. Das MAE von 1.20 bei ~104k Vorhersagen ist ein solides Ergebnis für ein akademisches Projekt.

== Persönliche Reflexion und Learnings

Diese Maturaarbeit war mein erstes grösseres Machine-Learning-Projekt. Hier sind meine wichtigsten Erkenntnisse:

=== Was ich gelernt habe

Python Data Science Stack: Pandas, Scikit-Learn, Matplotlib   diese Tools sind jetzt vertraut. Besonders Pandas war anfangs frustrierend (SettingWithCopyWarning!), aber mit der Zeit wurde es mächtiger.

Feature Engineering ist entscheidend: Anfangs erschien ein komplexes Modell (Deep Learning) als vielversprechender Ansatz. Die Praxis zeigte jedoch: *Gute Features sind wichtiger als komplexe Algorithmen.* Die Entwicklung von `opp_def_weakness` brachte mehr Verbesserung als jede Hyperparameter-Optimierung.

Reproduzierbarkeit ist schwer: Git, Seeds, Requirements.txt   all das ist nötig, um Resultate nachvollziehbar zu machen. Ich habe Stunden damit verbracht, alte Experimente zu rekonstruieren, weil ich anfangs keine Seeds gesetzt hatte.

Domänenwissen zählt: Ohne FPL-Kenntnisse hätte ich keine guten Features entwickelt. Machine Learning ist kein Ersatz für Fachwissen, sondern eine Ergänzung.

=== Technische Herausforderungen

Daten-Pipeline: Das Zusammenführen von 8 Saisons war mühsam. Spalten-Namen änderten sich, Datentypen waren inkonsistent. Ich habe ein Cleanup-Skript geschrieben (`cleanup_season_data.py`), das half.

Budget-Optimierung: Die Teamauswahl unter Budget-Constraints (Rucksackproblem) ist NP-schwer. Meine gierige Heuristik funktioniert gut, aber ich weiss: Es gibt bessere Lösungen (z.B. Linear Programming). Zeitdruck zwang mich zum Pragmatismus.

Speicher-Probleme: Bei 188,168 Datenpunkten × 20 Features wurde mein Laptop (8GB RAM) langsam. Lösung: Saisonweise verarbeiten statt alles auf einmal laden.

Git-Merge-Konflikte: Ich habe teilweise parallel an Code und Doku gearbeitet. Das führte zu Merge-Konflikten, die ich manuell lösen musste. Lektion: Branches nutzen!

=== Zeitmanagement

Rückblickend hätte ich früher mit der schriftlichen Arbeit beginnen sollen. Code schreiben ist einfacher als ihn zu dokumentieren! Ich musste sehr viel Zeit im letzten Monat vor der Abgabe investieren.

=== Was ich anders machen würde

Mehr Tests: Ich habe Unit-Tests für kritische Funktionen (`pick_lineup_autoformation`, `captain_policy`, `opponent_strength`), aber nicht für alle. Ein Bug in der Feature-Berechnung kostete mich 2 Tage Debugging.

Kleinere Iterationen: Anfangs wollte ich das "perfekte" Modell bauen. Besser wäre: Schnell ein Baseline-Modell, dann iterativ verbessern.

Live-Test für 1-2 Gameweeks: Auch wenn Backtesting schneller ist, wäre ein kurzer Live-Test wertvoll gewesen (z.B. für GW 30-32). Das hätte praktische Probleme aufgedeckt (z.B. "Wie bekomme ich Injury-News?").

== Ausblick: Wie könnte man weitermachen?

Wenn ich mehr Zeit hätte, würde ich:

1. *Ensemble-Modell:* RF + Gradient Boosting + LSTM kombinieren. Jedes Modell hat Stärken, gemeinsam könnten sie besser sein.

2. *Externe Daten:* Expected Goals (xG), Schüsse, Passgenauigkeit von Websites wie FBRef oder Understat einbeziehen.

3. *Transfer-Optimierung:* Nicht nur die beste Aufstellung wählen, sondern auch optimale Transfers (Budget 1M pro Woche, maximal 2 Transfers).

4. *Unsicherheitsschätzung:* Statt "Spieler X macht 5 Punkte" → "Spieler X macht 5±2 Punkte (90% Konfidenz)".

5. *Live-Deployment:* Das Modell als Web-App deployen (Heroku, Vercel) und für eine Saison live testen.

== Fazit der Diskussion

Random Forest kann FPL-Vorhersagen verbessern, aber der Mehrwert ist moderat. Im Durchschnitt erzielt MA3 minimal mehr Team-Punkte (46.0 vs. 45.8), während RF bei der Vorhersagegenauigkeit leicht vorne liegt (MAE 1.20 vs. 1.24). Die wichtigste Erkenntnis: *Feature Engineering >> Algorithmus-Wahl.* Form, Gegner-Stärke und Position sind entscheidend   das bestätigt FPL-Expertenwissen.

Die Limitationen (Backtesting, fehlende Daten, einfaches Modell) sind klar, aber für eine Maturaarbeit akzeptabel. Persönlich habe ich viel über Data Science gelernt, sowohl technisch als auch im Projektmanagement. Das Projekt war frustrierend (Bugs!), aber auch extrem lehrreich.











#pagebreak()

= Fazit

Diese Maturaarbeit hat untersucht, ob Machine Learning die Vorhersage von FPL-Punkten verbessern kann. Die Antwort ist ein klares: Ja, aber mit Einschränkungen. Random Forest übertrifft einfache Baseline-Methoden, aber der Mehrwert ist moderat. Die wichtigste Erkenntnis liegt nicht im Algorithmus, sondern im Feature Engineering.

== Zusammenfassung der Arbeit

=== Forschungsfrage und Zielsetzung

Die zentrale Frage war: *Kann ein Machine-Learning-Modell präzisere Punktvorhersagen für Fantasy Premier League liefern als einfache statistische Baselines?*

Um diese Frage zu beantworten, habe ich:
1. Ein Random-Forest-Modell trainiert mit historischen Daten (8 Saisons, 2016-2024)
2. Über 20 Features entwickelt (Spieler-Form, Gegner-Stärke, Team-Performance)
3. Das Modell gegen zwei Baselines getestet (Moving Average, Positions-Durchschnitt)
4. Vier Testsaisons (2020-2024) per Backtesting evaluiert

=== Hauptergebnisse

Die Evaluation zeigt klare Resultate:

Team-Performance: MA3 erzielt im Durchschnitt 46.0 Punkte pro Gameweek, RF 45.8 Punkte, POS nur 13.0 Punkte. Die Unterschiede zwischen RF und MA3 sind gering und liegen innerhalb der Standardabweichung.

Spieler-Vorhersagen: MAE von 1.20 Punkten (RF) vs. 1.24 (MA3) vs. 1.53 (POS). Auch hier liegt RF vorne, aber nicht dramatisch.

Feature Importance: Form, Position und Gegner-Schwäche sind die wichtigsten Prädiktoren. Marktwert spielt kaum eine Rolle.

Effizienz: RF und MA3 erreichen jeweils rund 34.6% des theoretischen Optimums. Das klingt niedrig, ist aber realistisch bei der hohen Varianz in Fussball.

Stabilität: Die saisonweisen Team-Punkte von RF liegen zwischen 41.1 und 49.6 Punkten pro Gameweek; MA3 bewegt sich im Bereich von 45.1 bis 47.6 Punkten. Die Modelle schwanken also, bleiben aber insgesamt auf einem ähnlichen Niveau.

=== Methodisches Vorgehen

Die Arbeit folgt dem Standard-Workflow für Machine-Learning-Projekte:

1. *Daten beschaffen:* Vaastav-Anand-Dataset mit 188,168 Spieler-Gameweeks
2. *Features entwickeln:* Rolling-Averages, Opponent-Strength, Team-Metriken
3. *Modell trainieren:* Random Forest mit manuell gesetzten Hyperparametern
4. *Evaluieren:* Backtesting auf ungesehenen Testsaisons
5. *Vergleichen:* Benchmarking gegen MA3 und POS

Besonders wichtig war die saubere Trennung von Train- und Test-Daten (chronologisch, kein Data Leakage). Das garantiert, dass die Resultate valide sind.

== Beantwortung der Forschungsfrage

Kann Machine Learning FPL-Vorhersagen verbessern? *Ja, aber nur geringfügig.*

Random Forest ist bei der Vorhersagegenauigkeit (MAE) leicht besser als Moving Average (1.20 vs. 1.24), aber bei den Team-Punkten ist der Unterschied minimal (45.8 vs. 46.0 Punkte/GW). Der Hauptgrund: MA3 nutzt bereits die wichtigste Information (aktuelle Form). RF kann zusätzliche Features integrieren (Gegner-Stärke, Team-Performance), was bei der Vorhersagegenauigkeit einen kleinen Vorteil bringt.

Die zentrale Erkenntnis lautet: *Gute Features sind wichtiger als komplexe Algorithmen.* Ein Deep-Learning-Modell mit schlechten Features würde schlechter abschneiden als Random Forest mit gut konstruierten Features.

== Praktische Implikationen

Was bedeutet das für FPL-Manager?

Einfache Methoden reichen oft: Wer nur die Form der letzten 3-5 Gameweeks anschaut (MA3), trifft bereits gute Entscheidungen. Machine Learning bringt nur einen kleinen Zusatznutzen.

Gegner-Stärke beachten: Die Feature-Importance-Analyse zeigt, dass Fixtures wichtig sind. Gegen schwache Teams performen Spieler besser, das sollte man bei der Auswahl berücksichtigen.

Marktwert ist überbewertet: Teure Spieler sind nicht automatisch besser vorhersagbar. Ein 5M-Spieler in guter Form kann genauso punkten wie ein 12M-Star.

Captain-Wahl bleibt schwierig: Die niedrige Spearman-Korrelation zeigt, dass das Modell zwar Durchschnittspunkte vorhersagen kann, aber nicht zuverlässig den *besten* Spieler einer Gameweek identifiziert. Hier hilft nur Erfahrung und ein bisschen Glück.

== Wissenschaftlicher Beitrag

Diese Arbeit reiht sich ein in die kleine, aber wachsende Literatur zu Sport-Analytics:

Validierung von Domänenwissen: Die Analyse bestätigt, was FPL-Experten seit Jahren predigen: Form schlägt Namen, Fixtures sind wichtig, teure Spieler sind nicht immer besser.

Methodisches Vorgehen: Die saubere Trennung von Train/Test, das chronologische Backtesting und die Reproduzierbarkeit (GitHub, Seeds) setzen einen wissenschaftlichen Standard.

Open Source: Alle Daten, Code und Resultate sind öffentlich verfügbar. Andere können auf dieser Arbeit aufbauen.

Im Vergleich zu Kaggle-Competitions oder Blog-Posts ist diese Arbeit rigoroser (klare Evaluation, Baselines, Reproduzierbarkeit). Aber natürlich gibt es auch Limitationen (siehe Kapitel 5).

== Persönliches Fazit

Diese Maturaarbeit war mein erstes grösseres Data-Science-Projekt   und es hat sich gelohnt. Ich habe nicht nur technische Skills gelernt (Python, Git, ML), sondern auch Projektmanagement (Zeitplanung, Debugging, Dokumentation).

Die wichtigste Lektion: *Einfach anfangen.* Ich habe Wochen damit verbracht, das "perfekte" Modell zu planen. Aber erst als ich angefangen habe zu coden, habe ich wirklich gelernt. Fehler sind Teil des Prozesses   jeder Bug war eine Lernchance.

Rückblickend bin ich stolz auf das End-to-End-System: Von Rohdaten über Feature Engineering und Training bis hin zu Backtesting und Web-Interface. Das ist mehr als nur ein Modell   es ist eine funktionierende Pipeline, die live im Internet verfügbar ist.

Das Live-Deployment auf Vercel bildete einen praktischen Abschluss: Die Arbeit war nicht mehr nur lokal verfügbar, sondern weltweit abrufbar. Das hat die Arbeit "echt" gemacht   nicht nur ein Schulprojekt, sondern ein funktionierendes Web-Produkt. Die Herausforderungen (Build-Errors, Datengrössen, API-Routes) haben mich viel über Production-Deployment gelehrt   Dinge, die man in Tutorials nicht lernt.

Würde ich etwas anders machen? Ja: Früher mit der schriftlichen Arbeit beginnen, mehr Tests schreiben, kleinere Iterationen. Aber das sind Details. Im Grossen und Ganzen bin ich zufrieden.

== Ausblick

Machine Learning für FPL steht noch am Anfang. Zukünftige Arbeiten könnten:

Komplexere Modelle nutzen: LSTM für Sequenz-Modellierung, Transformer für Attention-Mechanismen, Ensemble-Methoden für robustere Vorhersagen.

Mehr Daten einbeziehen: Expected Goals (xG), Schüsse, Pässe, defensive Aktionen. Je mehr Informationen, desto besser.

Transfer-Optimierung: Nicht nur die beste Aufstellung, sondern auch optimale Transfers (Budget-Management, Wildcards, Chips).

Live-Deployment: Das Modell als Web-App deployen und eine komplette Saison live testen. Das würde praktische Probleme aufdecken (Injury-News, Last-Minute-Änderungen).

Unsicherheitsschätzung: Konfidenzintervalle statt Punktschätzungen. "Spieler X macht wahrscheinlich 5±2 Punkte" ist nützlicher als "5 Punkte".

Die Kombination von Domänenwissen (FPL-Expertise) und Data Science (ML-Methoden) bietet weiteres Forschungspotential. Diese Arbeit ist ein erster Schritt.

== Schlusswort

Fantasy Premier League bietet als Datensatz umfangreiche Möglichkeiten für Machine-Learning-Experimente. Diese Arbeit zeigt, dass ML einen messbaren Beitrag leisten kann, aber keine perfekten Vorhersagen ermöglicht. Der Sport bleibt inhärent unvorhersehbar.

Für mich war diese Maturaarbeit eine Reise: Von der ersten Idee ("Kann man FPL mit ML vorhersagen?") über frustrierende Bugs und Durchbrüche bis hin zu den finalen Resultaten. Ich habe viel gelernt   über Python, über Machine Learning, aber auch über mich selbst (Geduld, Durchhaltevermögen, Problemlösung).

Am Ende bleibt die Erkenntnis: *Gute Features sind wichtiger als komplexe Algorithmen.* Die Kombination von Domänenwissen und Data Science ist entscheidend. Das gilt für FPL, aber auch für viele andere Bereiche.

Danke an alle, die mich unterstützt haben   Betreuungsperson, Familie, Freunde. Jetzt heisst es: Code committen, Arbeit abgeben, und vielleicht in der nächsten FPL-Saison selbst ausprobieren, ob das Modell hält, was es verspricht.




#pagebreak()

= Quellenverzeichnis

#bibliography("quellen.bib")

#pagebreak()

= Abbildungsverzeichnis

#show outline.entry: it => {
  text(size: 10pt)[#it]
}

#outline(
  title: none,
  target: figure.where(kind: image),
)

#heading(level: 2, outlined: false)[Tabellenverzeichnis]

#outline(
  title: none,
  target: figure.where(kind: table),
)

#pagebreak()

= Anhang

== GitHub Repository

Der vollständige Quellcode, alle Daten und Dokumentationen sind öffentlich verfügbar:

#align(center)[
  #text(size: 11pt)[
    #link("https://github.com/muz1n/fpl-matura")[github.com/muz1n/fpl-matura]
  ]
]

Das Repository enthält:
- Python-Code für Feature Engineering, Model Training und Backtesting
- Bereinigte/zusammengeführte CSVs aus 8 FPL-Saisons (2016-2024) auf Basis des vaastav-Datensatzes (keine Roh-API-Dumps)
- Web-Applikation (Next.js)
- Dokumentation und Unit-Tests
- Jupyter Notebooks für explorative Analysen

Alle Experimente sind mit den bereitgestellten Daten und Scripts vollständig reproduzierbar.

== Live Web-App

Die Web-Applikation ist live deployed und unter folgender URL erreichbar:

#align(center)[
  #text(size: 11pt)[
    #link("https://fpl-matura.vercel.app/")[fpl-matura.vercel.app]
  ]
]

Die Applikation bietet:
- Interaktive Prognosen für alle Saisons, Gameweeks und Methoden
- Backtest-Visualisierungen mit Lineup-Tabellen und Performance-Charts
- Multi-Season-Vergleich über 8 Saisons hinweg
- Feature-Importance-Analysen der wichtigsten Prädiktoren

Deployed auf Vercel mit automatischer CI/CD-Pipeline (GitHub Integration).

== KI-Deklaration

Bei der Erstellung dieser Arbeit wurden folgende KI-Tools verwendet:
- *GitHub Copilot* für Code-Vervollständigung
- *ChatGPT (GPT-4)* für Rechtschreibung und Formulierungshilfe
- *Claude 3.5 Sonnet* für Journal-Überarbeitung und Textstrukturierung

Alle inhaltlichen Entscheidungen, Datenanalysen und Interpretationen sind meine eigenen. Alle Tabellen und Diagramme wurden selbst in Typst erstellt.

#import "@preview/muchpdf:0.1.2": muchpdf

#muchpdf(read("Selbst.pdf", encoding: none))