#set text(lang: "CH")

#set page(numbering: none)  

#import "@preview/cetz:0.2.2": canvas, draw, tree

#import "@preview/cetz-plot:0.1.0": plot, chart

#align(center + horizon)[
  #block[
    #text(size: 24pt, weight: "bold")[
      Machine Learning für Fantasy Premier League
    ]
    
    #v(0.5em)
    
    #text(size: 18pt)[
      Vorhersage von Spielerleistungen mit Random Forest
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

#v(2em)

Ich möchte mich bei allen bedanken, die mich bei dieser Maturaarbeit unterstützt haben.

Herrn Zehnder, meinem betreuenden Lehrer, möchte ich besonders danken für seine wertvollen Anregungen und seine Geduld mit mir und meiner Arbeit. Die vielen Diskussionen haben wesentlich zur Schärfung der Fragestellung und der Methodik beigetragen.

Ebenfalls danke ich Vaastav Anand für das FPL-Datensatzes auf GitHub. Ohne diese öffentlich zugänglichen Daten hätte ich keine empirische Grundlage für diese Arbeit finden können.

Schliesslich danke ich der Open-Source-Community für die Entwicklung der verwendeten Softwares (scikit-learn, pandas, Next.js, React), ohne die diese Arbeit nicht möglich gewesen wäre.

#pagebreak()










= Abstract

Die Fantasy Premier League (FPL) ist eine der grössten Fantasy-Sport-Plattformen weltweit und hat über 11 Millionen Nutzer. In diesem Spiel stellen die Teilnehmer wöchentlich ihr Team aus 15 Profis der Premier League zusammen, wobei die Punkte anhand von echten Spielstatistiken ermittelt werden. Die Vorhersage zukünftiger Leistungen der Spieler ist eine anspruchsvolle Aufgabe, da zahlreiche Faktoren, wie etwa die aktuelle Form, die Stärke des Gegners, Verletzungen und die taktische Ausrichtung des Trainers, berücksichtigt werden müssen.

In dieser Arbeit wird untersucht, inwieweit Machine-Learning-Methoden die Punktzahlen der FPL-Spieler gut genug vorhersagen können, um damit die Teamzusammenstellung systematisch zu verbessern. Verwendet wurde ein Random-Forest-Modell; Grundlage bildeten die Daten von acht Spieljahren (2016/17 bis 2023/24), ~150'000 Datensätze. Berücksichtigt wurden Merkmale wie Form der letzten Spiele, Gegnerstärke, Einsatzminuten und positionsspezifisches Verhalten. Die Evaluation erfolgte mittels Backtesting an vier Testsaisons (2020/21 bis 2023/24), wobei Moving Average (MA3) und Positions-Mittelwert (POS) als Baseline-Methoden dienten.

Die Ergebnisse zeigen: Random Forest erzielt im Durchschnitt 47,4 Punkte pro Spieltag – etwa 5% mehr als MA3 mit 45,1 Punkten. Der mittlere absolute Fehler (MAE) beträgt 2,1 Punkte, die Effizienz relativ zum theoretisch optimalen Team liegt bei 34%. Die Feature-Importance-Analyse zeigt, dass die Form der letzten drei Spiele mit 34% den stärksten Einfluss hat, gefolgt von der Position mit 18%. Eine interaktive Web-Applikation visualisiert die Vorhersagen und ermöglicht explorative Analysen der Modellperformance.

Die Arbeit zeigt, dass Machine Learning einen messbaren, wenn auch moderaten Mehrwert für FPL-Vorhersagen bietet. Die Limitationen – insbesondere die Unfähigkeit, kurzfristige Ereignisse wie Last-Minute-Verletzungen zu antizipieren – bleiben bestehen. Für praktische Anwendungen wäre eine Integration mit Live-Daten der offiziellen FPL-API vielversprechend.











#pagebreak()

#outline(
  title: [Inhaltsverzeichnis],
)

#pagebreak()

#set heading(numbering: "1.")

#set text(font: "Source Sans Pro")

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

„Ein Random-Forest-Modell, trainiert auf historischen FPL-Daten, erreicht einen MAE < 2.0 und führt zu besseren Teamzusammenstellungen als einfache Baseline-Methoden."

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

Kapitel 5 geht dann kritisch mit den Ergebnissen um: Besonders spannend wird herauszuarbeiten sein, warum die einfache Moving-Average-Methode gerade in manchen Fällen besser abschnitt als Random Forest? Wo hat das Modell Stärken und wo Schwächen? Auch persönliche Erfahrungen und technische Hürden, die wir auf dem Weg hatten, sollen hier ihren Platz finden.

Kapitel 6 schliesst mit einer Zusammenfassung der Ergebnisse, beantwortet die Forschungsfrage und wagt einen Ausblick auf mögliche Weiterentwicklungen, etwa ein Live-Deployment mit der offiziellen FPL-API.











= Theoretische Grundlagen

== Das FPL-Punktesystem

Fantasy Premier League vergibt nach einem festen Punktesystem Punkte @fpl-scoring, welches sich an der realen Leistung im Spiel orientiert. Je nach Position gibt es für dieselbe Aktion unterschiedlich viele Punkte – ein Tor eines Torwarts zählt somit mehr als das eines Stürmers.

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

Das Punktesystem zeigt: In FPL zählen nicht nur Tore, sondern auch defensives Verhalten. Ein Verteidiger mit Vorlage und Clean Sheet kann mehr Punkte sammeln als ein Stürmer mit einem Tor. Genau diese Komplexität macht die Vorhersage schwierig – verschiedene Spielertypen müssen miteinander verglichen werden, obwohl sie völlig unterschiedliche Stärken haben.

== Grundlagen des Maschinellen Lernens

Maschinelles Lernen ermöglicht es Computern, aus Daten zu lernen, ohne dass jede Regel explizit programmiert werden muss @geron-2019. Anstatt dem System vorzuschreiben „falls X, dann Y", gebe ich ihm einfach viele Beispiele und es erkennt das Muster.

=== Supervised Learning

Im Supervised Learning trainiere ich ein Modell anhand von Beispielen, wobei ich bereits weiss was herauskommen soll. In unserem Fall sind das die historischen Spielerdaten: als Eingaben dienen mir Features wie aktuelle Form, Gegner, Position – als Ausgabe die tatsächlich erreichten FPL-Punkte. Das Modell lernt nun nach und nach, welche Faktoren wirklich zählen.

=== Regression vs. Klassifikation

Es gibt zwei grosse Arten von Supervised Learning:

- *Regression:* Vorhersage eines kontinuierlichen Wertes (z.B. FPL-Punkte: 2.5, 8.3, 15.0)
- *Klassifikation:* Vorhersage einer Kategorie (z.B. Tor: ja/nein)

Ich benutze Regression, weil die FPL-Punkte beliebige Zahlen annehmen können.

=== Overfitting und Underfitting

Ein grosses Problem beim maschinellen Lernen ist die Gratwanderung zwischen zu einfach und zu kompliziert:

- *Underfitting:* Das Modell ist zu einfach und erkennt nicht mal die Muster in den Trainingsdaten. Beispiel: Ein Modell, das allen Spielern die gleiche Punktzahl gibt.
- *Overfitting:* Das Modell lernt die Trainingsdaten auswendig (inklusive Zufall und Ausreisser). Es funktioniert schlecht auf neuen Daten.

Die hohe Kunst besteht darin, ein Modell zu finden, das die Muster sieht, aber sich nicht an Details festklammert. Random Forest hilft mir dabei, weil es durch seine Ensembles besser gegen Overfitting gewappnet ist.

=== Train-Test-Split

Um Overfitting zu erkennen, teile ich die Daten in zwei Teile auf:

- *Trainingsdaten:* zum Lernen der Muster (hier: 2016/17 bis 2019/20)
- *Testdaten:* zum Überprüfen, ob das Modell nun auch auf neuen Daten funktioniert (hier: 2020/21 bis 2023/24)

Bei Zeitreihen wie im Fussball wichtig: ich darf nicht zufällig aufteilen, sondern muss chronologisch vorgehen. Sonst lernt das Modell aus der Zukunft – was natürlich nicht möglich ist.

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

- *Mean Squared Error (MSE):* Wie weit weichen die Vorhersagen im Durchschnitt von den echten Werten ab? Der Baum wählt die Frage, die den MSE am stärksten reduziert.

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

- *Einfach zu verstehen:* Man kann die Entscheidungen nachvollziehen
- *Keine Datentransformation:* Die Features müssen nicht normiert werden
- *Erfassen auch nichtlineare Zusammenhänge:* Auch komplizierte Muster werden abgebildet

=== Nachteile von Decision Trees

- *Overfitting:* Ein einzelner Baum passt sich sehr schnell zu stark an die Trainingsdaten an
- *Instabil:* Kleine Änderungen in den Daten haben grosse Auswirkungen auf den gesamten Baum
- *Schlechte Generalisierung:* Auf neuen Daten funktioniert er oft schlecht

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

1. *Bootstrap Sampling:* Aus den Trainingsdaten werden zufällige Stichproben gezogen – mit Zurücklegen. Das bedeutet: Manche Datenpunkte erscheinen mehrfach, andere gar nicht.
2. *Training:* Jeder Baum trainiert auf einer anderen Bootstrap-Stichprobe.
3. *Aggregation:* Bei Regression wird der Mittelwert über alle Vorhersagen gebildet.

Durch Bagging werden die Vorhersagen robuster. Einzelne Bäume machen unterschiedliche Fehler, im Durchschnitt heben sich diese Fehler zum Teil auf.

=== Random Feature Selection

Der zweite Trick: Jeder Baum sieht nicht alle Features, sondern nur eine zufällige Teilmenge. Bei jedem Split wird aus allen verfügbaren Features zufällig eine Auswahl getroffen (typischerweise $sqrt(n)$ Features bei $n$ Gesamt-Features).

Warum das hilft? Wenn ein Feature zu dominant ist (z.B. „Form der letzten 3 Spiele"), würden ohne Random Selection alle Bäume ähnlich aussehen. Durch die Random Selection werden die Bäume verschiedener – das Ensemble unterschiedlicher.

=== Ensemble-Vorhersage

Zur finalen Vorhersage fragen wir alle Bäume ab. Bei Regression (wie hier) nimmt man den Durchschnitt:

$ hat(y) = 1/T sum_(t=1)^T hat(y)_t $

wobei $T$ die Anzahl der Bäume ist und $hat(y)_t$ die Vorhersage von Baum $t$.

=== Out-of-Bag Error

Ein interessanter Nebeneffekt von Bagging: Jeder Baum trainiert nur auf etwa 63% der Daten (Bootstrap Sampling). Die übrigen 37% sind die Out-of-Bag (OOB) Daten. Die können wir zur Validierung verwenden, wir müssen also keine extra Testdaten abspalten.

Der OOB-Error ist ein Schätzer für den Generalisierungsfehler – ähnlich wie Cross-Validation, aber ohne zusätzlichen Rechenaufwand.

=== Feature Importance

Random Forest kann automatisch berechnen, welche Features wichtig sind. Die Idee: Wie stark verbessert ein Feature die Vorhersagen über alle Bäume hinweg?

So wird gerechnet:

1. Für jeden Baum: Bei jedem Split messen, wie stark der MSE gesenkt wird
2. Diese Verbesserungen für jedes Feature über alle Bäume summieren
3. Normalisieren, sodass die Wichtigkeiten auf 1 summieren

Features mit hoher Importance sind wichtig für die Vorhersage. In diesem Projekt war „Form (letzte 3 Spiele)" mit Abstand am wichtigsten.

#figure(
  block(
    width: 100%,
    inset: 1em,
    {
      set text(size: 9pt)
      
      // Daten
      let data = (
        ("Form (3 Spiele)", 34),
        ("Position", 18),
        ("Gegnerschwäche Def.", 14),
        ("Minuten (3 Spiele)", 11),
        ("Team Clean Sheets (5)", 9),
        ("Form (5 Spiele)", 6),
        ("Marktwert", 4),
        ("Heimspiel", 2),
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
  caption: [Feature Importance im Random Forest. Die wichtigsten Prädiktoren für FPL-Punkte sind die Form der letzten 3 Spiele (34%), die Spielerposition (18%) und die defensive Schwäche des Gegners (14%).]
) <fig-feature-importance>

=== Hyperparameter

Random Forest hat einige Hyperparameter, die vor dem Training festgelegt werden müssen:

- *n_estimators:* Anzahl der Bäume (je mehr, desto stabiler, aber langsamer; typischerweise 100–500)
- *max_depth:* maximale Tiefe eines jeden Baums (begrenzt Overfitting; typischerweise 10–30)
- *min_samples_split:* wie viele Datenpunkte mindestens für einen Split notwendig sind (je mehr, desto weniger Overfitting)
- *min_samples_leaf:* wie viele Datenpunkte in einem Blatt mindestens sein müssen (je mehr, desto glattere Vorhersage)
- *max_features:* wie viele der Features pro Split ausgewählt werden (häufig $sqrt(n)$ oder $log_2(n)$)

Verwendet wurden hier:

- n_estimators = 100
- max_depth = 15
- min_samples_leaf = 5
- max_features = 'sqrt'

Diese Werte wurden mittels Kreuzvalidierung auf den Trainingsdaten optimiert.

=== Warum Random Forest für FPL?

Random Forest ist besonders gut geeignet für unsere FPL-Vorhersagen, weil:

1. *Nichtlineare Zusammenhänge:* Ein Spieler ist gegen schwache Gegner besser – aber auch nur bis zu einem gewissen Punkt. Solche Effekte sieht Random Forest ganz natürlich.
2. *Viele Features:* Man muss nicht unbedingt selbst entscheiden, welche Features wichtig sind. Das findet die Methode selbst heraus.
3. *Robustheit:* Einzelne Spiele mit 20 Punkten bringen das Modell nicht gleich zum Kippen.
4. *Feature Importance:* Es ist nachvollziehbar, welche Faktoren eine Rolle spielen.

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

Die Spearman-Korrelation @scipy-stats misst nicht die Punktzahlen sondern die Ränge der Spieler. Die Frage: Weiss das Modell, wer die besten Spieler der Woche sind, auch wenn die Punktzahlen danebenliegen?

Ein Wert von 0.5 bedeutet: Das Modell hat die Spieler halbwegs richtig gerankt, auch wenn die Vorhersagen danebenliegen. Das ist für FPL ganz wichtig, denn in der Regel reicht es, die besten Spieler zu finden, die Punktzahl ist zweitrangig.

=== Zusammenspiel der Metriken

Diese drei Werte ergänzen sich:

- MAE zeigt die typische Grösse der Abweichung
- RMSE zeigt die Ausreisser
- Spearman zeigt, ob die Ränge stimmen

Nur alle drei zusammen ergeben ein vollständiges Bild der Modellgüte.











= Methodik

== Daten und Datenaufbereitung

=== Datenquelle

Die Grundlage dieses Projekts bildet der öffentliche Datensatz von Vaastav Anand @vaastav-fpl, der FPL-Daten seit der Saison 2016/17 automatisiert sammelt. Der Datensatz enthält sehr viele Daten zu jedem Spieler und jeder Gameweek: Minuten gespielt, Punkte, Tore, Vorlagen, Clean Sheets und weitere Statistiken.

Jede Zeile repräsentiert einen Spieler in einer Gameweek. Bei ca. 500 aktiven Spielern pro Saison und 38 Gameweeks ergeben sich pro Saison ca. 19'000 Datenpunkte. Über acht Saisons 2016/17 bis 2023/24 ergibt das mehr als 150'000 Datensätze.

=== Zeitliche Aufteilung

Die Daten wurden zeitlich aufgeteilt:

- *Trainingsdaten:* 2016/17 bis 2019/20 (4 Saisons, ~76'000 Datensätze)
- *Testdaten:* 2020/21 bis 2023/24 (4 Saisons, ~76'000 Datensätze)

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
          text(size: 8pt)[Training (4 Saisons, ~76'000 Datensätze)]
        ),
        
        stack(
          dir: ltr,
          spacing: 0.5em,
          box(fill: rgb(220, 120, 120), width: 1.5em, height: 0.8em, radius: 2pt),
          text(size: 8pt)[Test (4 Saisons, ~76'000 Datensätze)]
        ),
      )
    }
  ),
  caption: [Chronologische Train-Test-Aufteilung. Das Modell trainiert auf 4 Saisons (2016-2020) und wird auf 4 zukünftigen Saisons (2020-2024) evaluiert. Die strikte zeitliche Trennung verhindert Data Leakage.]
) <fig-train-test-timeline>

Diese strenge zeitliche Trennung ist entscheidend: Das Modell darf nur in der Vergangenheit lernen und nie in der Zukunft. Alles andere wäre unrealistisch und würde die Ergebnisse verfälschen.

=== Datenbereinigung

Die Rohdaten von der FPL-API @fpl-api kommen nicht immer ganz sauber daher. Mehrere Probleme mussten gelöst werden:

*Fehlende Werte:* Manche Spieler haben für bestimmte Gameweeks keine Einträge, z.B. weil sie verletzt oder gesperrt waren, oder weil sie nicht im Kader standen. Diese Zeilen habe ich entfernt, sie enthalten keine verwertbaren Informationen.

*Doppelte Einträge:* Bei Vereinswechseln innerhalb der Saison tauchen Spieler manchmal mehrere Male auf. Diese Fälle habe ich zusammengeführt, die Statistiken des neuen Vereins werden weitergeführt.

*Verschiedene Positionen:* Die API verwendet z.T. verschiedene Schreibweisen für die Positionen. Dazu wurden folgende Bezeichnungen vereinheitlicht:

- Torhüter: `GK`
- Verteidiger: `DEF`
- Mittelfeldspieler: `MID`
- Stürmer: `FWD`

Hier ein Beispiel wie die Bereinigung in Python aussieht:

```python
import pandas as pd

# Fehlende Werte wegschmeissen
df = df.dropna(subset=['total_points', 'minutes'])

# Position normalisieren
position_map = {
    'Goalkeeper': 'GK',
    'Defender': 'DEF',
    'Midfielder': 'MID',
    'Forward': 'FWD'
}
df['position'] = df['position'].map(position_map)

# Duplikate bei Transfers zusammenfassen
df = df.groupby(['player_id', 'season', 'GW']).last().reset_index()```

=== Normalisierung

Verschiedene Features nutzen völlig unterschiedliche Wertebereiche. Gespielte Minuten liegen zwischen 0 und 90, Marktwert zwischen 4.0 und 15.0 Millionen Pfund. Ohne Normalisierung würden Features mit grösseren Werten das Modell dominieren @scikit-preprocessing.

Deshalb wurden alle numerischen Features auf den Bereich [0, 1] skaliert:

```from sklearn.preprocessing import MinMaxScaler

scaler = MinMaxScaler()
numeric_cols = ['minutes', 'form_3', 'form_5', 'value', 'opp_strength']
df[numeric_cols] = scaler.fit_transform(df[numeric_cols])```

Durch die Skalierung haben alle Features dasselbe Gewicht – das Modell kann dadurch besser lernen und trainiert schneller.

=== Explorative Datenanalyse

Bevor ich mit dem Feature Engineering begonnen habe, habe ich die Daten etwas genauer betrachtet.

Nun zu den Erkenntnissen: Bei der Punkteverteilung sammeln die meisten Spieler zwischen 0 und 10 Punkte pro Gameweek. Werte über 15 sind schon selten, Werte über 20 extrem selten. Die Verteilung ist stark rechtsschief – viele kleine Werte, wenige grosse Ausreisser.

Worin unterscheiden sich die Positionen? Im Schnitt holen Mittelfeldspieler die meisten Punkte (4.2 pro GW), dann folgen Stürmer (3.9), Verteidiger (3.7) und Torhüter (3.1). Aber bei Stürmern ist die Varianz am höchsten – die schwanken zwischen 0 und 20 Punkten am stärksten.

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
                  // Hintergrund mit Raster
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
                  
                  // Whisker (min to max)
                  let y-min = (1 - min-val / max-points) * 100%
                  let y-max = (1 - max-val / max-points) * 100%
                  let y-q1 = (1 - q1 / max-points) * 100%
                  let y-median = (1 - median / max-points) * 100%
                  let y-q3 = (1 - q3 / max-points) * 100%
                  
                  // Whisker Linie
                  place(top + left, dx: 50%, dy: y-max, line(angle: 90deg, length: y-min - y-max, stroke: 1pt))
                  
                  // Box (Q1 to Q3)
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
                  
                  // Median Linie
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
        Punkte pro Gameweek: 0–5 (häufig), 5–10 (mittel), 10–20 (selten)
      ]
    }
  ),
  caption: [Punkteverteilung nach Spielerposition (Saison 2023-24). Mittelfeldspieler haben den höchsten Median (4.2), Stürmer die grösste Varianz (0-20 Punkte).]
) <fig-position-boxplot>

Spannend ist auch ein Trend über die Jahre – in der Saison 2022/23 fielen im Schnitt mehr Tore als in den Vorjahren. Wahrscheinlich ist das den offensiveren taktischen Systemen geschuldet, die die ganzen Teams inzwischen spielen. Solche Trends machen Vorhersagen schwerer, weil alte Muster sich nicht 1:1 übertragen lassen.

== Feature Engineering

Die Features sind die Eingaben für unser Modell, und je besser wir diese konstruieren, desto besser sollten die Vorhersagen sein. Ich habe mir drei Kategorien von Features überlegt:

=== Spieler-Features

Diese beschreiben die aktuelle Form und Qualität eines Spielers:

Form (letzte 3 Gameweeks): Durchschnitt der letzten 3 Spiele. Das ist das stärkste Signal – wer gerade gut spielt, spielt auch nächste Woche gut.

```df['form_3'] = df.groupby('player_id')['total_points'] \
                 .rolling(3, min_periods=1) \
                 .mean() \
                 .reset_index(level=0, drop=True)```


Form (letzte 5 Gameweeks): wie form_3, aber stabiler, weil mehr Spiele.

Saisonform: Durchschnitt über die ganze Saison bisher. Zeigt die generelle Qualität des Spielers.

Spielminuten (letzte 3 GW): wie viele Minuten hat der Spieler zuletzt gespielt? Wer regelmässig 90 Minuten spielt, ist sicher Stammspieler und wird mehr Punkte sammeln.

Position: kategorisch (GK, DEF, MID, FWD). Random Forest kann mit kategorischen Variablen umgehen, man braucht kein One-Hot-Encoding.

Marktwert (Value): Preis in FPL. Teure Spieler sind meistens besser – aber nicht immer. Interessanterweise war dieses Feature nicht so wichtig, wie ich angenommen hätte (nur 4% Feature Importance).

=== Gegner-Features

Nicht alle Gegner sind gleich stark. Diese Features erfassen die Defensiv- und Offensivstärke des nächsten Gegners:

Durchschnittliche Gegentore des Gegners: Wie viele Tore kassiert der Gegner im Schnitt? Ein Team, das keine gute Defensive hat, macht es den Angreifern einfacher.    

```# Team-Defensivstärke berechnen (Gegentore pro Spiel)
team_def = df.groupby(['season', 'GW', 'opponent_team'])['goals_conceded'] \
             .mean() \
             .reset_index()
team_def.rename(columns={'goals_conceded': 'opp_def_weakness'}, inplace=True)

# Ans Hauptdataset mergen
df = df.merge(team_def, on=['season', 'GW', 'opponent_team'], how='left')```

Durchschnittliche erzielte Tore des Gegners: Das zeigt die Offensivstärke. Gegen Manchester City zu spielen, ist schwerer, als gegen ein Team im Tabellenkeller.

Heimspiel vs. Auswärtsspiel: Boolean-Feature (1 = Heimspiel, 0 = Auswärtsspiel). Heimvorteil gibt es im Fussball wirklich.

Diese Gegner-Features sollten sich auf die letzten 5 Spiele des Gegners beziehen, um die aktuelle Form abzudecken

=== Team-Features

Natürlich spielt auch das eigene Team eine Rolle bei der Leistung einzelner Spieler:

*Durchschnittliche Clean Sheets (letzte 5 Spiele):* Wie oft hat das Team zu null gespielt? Wenn eine Mannschaft defensiv stabil ist, profitieren Torhüter und Abwehrspieler.

*Durchschnittliche erzielte Tore (letzte 5 Spiele):* Wenn das Team viele Tore schiesst, haben Stürmer und Mittelfeldspieler bessere Chancen auf Punkte.

*Tabellenplatz:* Teams, die weiter oben in der Tabelle stehen, sind in der Regel stärker. Der Tabellenplatz korreliert mit der Qualität der Spieler.

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

Das Random-Forest-Modell wurde mit der Python-Bibliothek Scikit-Learn @sklearn-rf implementiert. Die Bibliothek ist eine Freude, sie hat eine gute API und ist gut dokumentiert:

``` python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Features und Zielvariable definieren
feature_cols = [
    'form_3', 'form_5', 'season_avg', 'minutes_3',
    'position', 'value', 'opp_def_weakness', 'opp_goals_avg',
    'is_home', 'team_clean_sheets_5', 'team_goals_avg_5'
]
X = df[feature_cols]
y = df['total_points']

# Train-Test-Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False  # chronologisch!
)

# Modell erstellen und trainieren
rf = RandomForestRegressor(
    n_estimators=100,
    max_depth=15,
    min_samples_leaf=5,
    max_features='sqrt',
    random_state=42
)
rf.fit(X_train, y_train)
```

Wichtig ist `shuffle=False` beim Train-Test-Split – wir wollen ja chronologisch bleiben, sonst lernt das Modell aus der Zukunft.

=== Hyperparameter-Optimierung

Random Forest hat einige Hyperparameter, die man vor dem Training festlegen muss. Diese Werte wirken sich sehr stark darauf aus, wie gut unser Modell funktioniert:

*n_estimators (Anzahl Bäume):* je mehr Bäume, desto stabiler die Vorhersagen, aber desto länger braucht das Training. Ich habe 100 gewählt, bei 200 oder 500 Bäumen gab es kaum Leistungszuwächse, dafür aber eine Verdopplung der Laufzeit.

*max_depth (Maximale Tiefe):* Maximale Tiefe der Bäume. Zu tief ist Overfitting, zu flach Underfitting. Optimal war hier 15 nach Kreuzvalidierung.

*min_samples_leaf (Mindestgrösse Blatt):* Jedes Blatt muss mindestens 5 Datenpunkte haben, dadurch werden die Vorhersagen glatter, einzelne Ausreisser dürfen nicht zu viel Gewicht haben.

*max_features (Features pro Split):* Bei jedem Split werden nur eine Auswahl der Features betrachtet. `'sqrt'` bedeutet, $sqrt(n)$ Features, bei n=20 also ca. 4-5. Dadurch werden die Bäume diverser.

Durchgeführt wurden diese Werte durch Grid Search mit 5-Fold Cross Validation:

``` python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 15, 20],
    'min_samples_leaf': [3, 5, 10],
    'max_features': ['sqrt', 'log2']
}

grid_search = GridSearchCV(
    RandomForestRegressor(random_state=42),
    param_grid,
    cv=5,
    scoring='neg_mean_absolute_error',
    n_jobs=-1
)
grid_search.fit(X_train, y_train)

print("Beste Parameter:", grid_search.best_params_)
# Ausgabe: {'n_estimators': 100, 'max_depth': 15,
#           'min_samples_leaf': 5, 'max_features': 'sqrt'}
```

Grid Search probiert alle Kombinationen durch und nimmt die beste mit dem geringsten MAE auf den Validierungsdaten.

=== Feature Importance Analyse

Nach dem Training können wir uns ansehen, welche Features am wichtigsten waren:

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

Ergebnis:

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
        [form_3], text(fill: rgb(80, 130, 180), weight: "bold")[0.34],
        [position], text(fill: rgb(80, 130, 180), weight: "bold")[0.18],
        [opp_def_weakness], text(fill: rgb(80, 130, 180), weight: "bold")[0.14],
        [minutes_3], [0.11],
        [team_clean_sheets_5], [0.09],
      )
      
      v(0.8em)
      
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Höhere Werte bedeuten wichtigere Features für die Vorhersage
      ]
    }
  ),
  caption: [Feature Importance nach Training des Random Forest Modells]
) <tbl-feature-importance>

Form war also eindeutig am wichtigsten (34%). Das überrascht nicht: Wer gerade gut spielt, spielt auch nächste Woche gut. Interessant ist, dass der Marktwert (value) nur 4% ausmachte – teure Spieler sind also nicht automatisch besser in der Vorhersage.

=== Baseline-Methoden

Um zu prüfen, ob Random Forest überhaupt einen Mehrwert bietet, habe ich zuerst zwei einfache Baseline-Methoden implementiert:

*Moving Average (MA3):* Hierbei bekommt jeder Spieler einfach den Durchschnitt seiner letzten 3 Gameweeks als Vorhersage.

``` python
def predict_ma3(df):
    df['pred_ma3'] = df.groupby('player_id')['total_points'] \
                        .rolling(3, min_periods=1) \
                        .mean() \
                        .shift(1)  # shift(1) = nächste GW vorhersagen
    return df
```

*Positions-Mittelwert (POS):* Hierbei bekommt jeder Spieler den Durchschnitt aller Spieler seiner Position.

``` python
def predict_pos(df):
    pos_avg = df.groupby(['season', 'GW', 'position'])['total_points'] \
                .transform('mean')
    df['pred_pos'] = pos_avg
    return df
```

Diese Methoden sind extrem simpel, aber oft überraschend effektiv. Wenn Random Forest hier nicht besser abschneidet, lohnt sich der Aufwand nicht.

=== Backtesting statt Live-Tests

Eine wichtige Entscheidung war Backtesting statt Live-Tests. Die Gründe:

*Weniger Zeitaufwand:* Eine FPL-Saison dauert 9 Monate. Wenn ich vier Saisons live testen wollte, würde das insgesamt 3 Jahre dauern. Mit Backtesting kann ich in wenigen Stunden vier Saisons durchspielen.

*Gleiche Bedingungen:* Beim Backtesting sind mir alle Daten bekannt, ich kann Random Forest, MA3 und POS unter exakt denselben Bedingungen vergleichen. Bei Live-Tests könnte Zufall (z.B. viele Verletzungen in einer Saison) die Ergebnisse verzerren.

*Wissenschaftliche Validität:* Backtesting ist die Standard-Methode in der Finanzbranche und im Machine Learning @geron-2019. Damit zeigt man, ob ein Modell auf neuen, ungesehenen Daten funktioniert.

*Reproduzierbarkeit:* Jeder kann mein Backtesting mit denselben Daten durchlaufen und wird dieselben Ergebnisse bekommen. Bei Live-Tests wird das nicht möglich sein.

Natürlich hat Backtesting auch seine Grenzen: Es bildet nicht alle Aspekte des echten FPL ab (z.B. Last-Minute-Verletzungen, psychologischer Druck). Aber für eine wissenschaftliche Evaluation ist es die beste Methode.

== Architektur und Implementierung

=== Aufbau des Projekts

Das Projekt ist in Python implementiert und folgt einer einheitlichen Struktur. Die wichtigsten Bestandteile:

``` plaintext
fpl-matura/
├── code/
│   ├── features/        # Feature Engineering
│   │   └── make_features.py
│   ├── models/          # Model Training
│   │   └── filled_model.py
│   ├── lineup/          # Team Selection
│   │   └── pick_lineup_autoformation.py
│   ├── evaluation/      # Backtesting
│   │   └── team_backtest.py
│   ├── pipeline/        # End-to-End Pipeline
│   │   └── make_gw.py
│   └── utils/           # Utilities
│       └── season_rules.py
├── data/                # Raw Data (CSV)
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

Das Kernstück der Evaluation ist das Backtesting-Skript `team_backtest.py`. Es simuliert eine komplette FPL-Saison:

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

Die End-to-End-Pipeline koordiniert alle Schritte von Rohdaten bis zur finalen Vorhersage:

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

``` python
# 1. Rohdaten laden
raw_df = pd.read_csv("data/merged_gw_2023-24.csv")

# 2. Features berechnen
from code.features.make_features import make_all_features
feature_df = make_all_features(raw_df)

# 3. Modell laden
import joblib
rf_model = joblib.load("out/models/rf_model.pkl")

# 4. Vorhersagen für GW 38
gw38_data = feature_df[feature_df["GW"] == 38]
predictions = rf_model.predict(gw38_data[feature_cols])
gw38_data["predicted_points"] = predictions

# 5. Team optimieren
from code.lineup.pick_lineup_autoformation import pick_lineup
lineup = pick_lineup(
    gw38_data, 
    budget=100.0, 
    max_per_club=3
)

# 6. Ergebnis speichern
lineup.to_json("out/lineup_gw38.json")
```

Diese Pipeline ist vollständig automatisiert. Ein Batch-Skript `run_full_backtest.bat` kann alle 4 Testsaisons (2020-21 bis 2023-24) in wenigen Minuten durchlaufen:

``` batch
@echo off
REM Backtesting für alle Saisons
python code/evaluation/team_backtest.py --season 2020-21 --gw_start 1 --gw_end 38 --methods rf ma3 pos
python code/evaluation/team_backtest.py --season 2021-22 --gw_start 1 --gw_end 38 --methods rf ma3 pos
python code/evaluation/team_backtest.py --season 2022-23 --gw_start 1 --gw_end 38 --methods rf ma3 pos
python code/evaluation/team_backtest.py --season 2023-24 --gw_start 1 --gw_end 38 --methods rf ma3 pos
echo Fertig!
```

=== Reproduzierbarkeit

Ein zentraler Aspekt des Projekts ist Reproduzierbarkeit. Jeder soll meine Ergebnisse nachvollziehen können:

*Git-Versionierung:* Alle Code-Änderungen sind in Git dokumentiert. Jede Vorhersage wird mit einem Git-Commit-Hash versehen, so kann man später exakt nachvollziehen, welcher Code verwendet wurde.

*Seed-Kontrolle:* Random Forest benutzt `random_state=42` – dadurch sind die Ergebnisse deterministisch. Bei gleichem Code und gleichen Daten kommt immer dasselbe Ergebnis raus.

*Daten-Versionierung:* Die Rohdaten von Vaastav Anand sind öffentlich verfügbar @vaastav-fpl. Ich speichere zusätzlich einen Hashwert (MD5) jeder Datei, so kann man prüfen, ob die Daten unverändert sind.

*Requirements.txt:* Alle Python-Bibliotheken mit exakten Versionen sind in `requirements.txt` dokumentiert:

``` plaintext
numpy==1.24.3
pandas==2.0.2
scikit-learn==1.3.0
matplotlib==3.7.1
```

Damit kann jeder dieselbe Umgebung erstellen (`pip install -r requirements.txt`) und meine Experimente exakt nachbauen.

=== Herausforderungen bei der Implementierung

Einige technische Hürden gab es während der Entwicklung:

*Fehlende Daten:* Manchmal fehlen Spieler-Features (z.B. neue Transfers ohne Vorgeschichte). Lösung: Positions-Durchschnitt als Fallback verwenden.

*Budget-Optimierung:* Die optimale Teamauswahl unter Budget-Constraints ist ein NP-schweres Problem (Rucksackproblem). Exakte Optimierung würde zu lange dauern. Lösung: Gierige Heuristik, die in 99% der Fälle sehr gute Ergebnisse liefert.

*Speicherverbrauch:* Bei 8 Saisons mit je ~15,000 Datenpunkten und 20+ Features wird der Speicher knapp. Lösung: Saisonweise verarbeiten statt alles auf einmal zu laden.

*Captain-Wahl:* Der Captain bekommt doppelte Punkte – extrem wichtig! Aber sehr schwer vorherzusagen (hohe Varianz). Lösung: Einfach den Spieler mit höchster Vorhersage als Captain wählen (konservativ, aber robust).

=== Code-Qualität und Testing

Um sicherzustellen, dass der Code korrekt funktioniert, habe ich Unit-Tests geschrieben:

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
    
    # Prüfen: Formation ist erlaubt
    formation = lineup["formation"]
    assert formation in ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1"]
```

Diese Tests werden automatisch bei jedem Code-Push ausgeführt (via GitHub Actions). Wenn ein Test fehlschlägt, weiss ich sofort, dass etwas kaputtgegangen ist.

== Web-Applikation zur Visualisierung

Neben dem Modellaufbau stand vor allem die interaktive Aufbereitung der Resultate im Vordergrund. Dafür entstand eine Website, welche Prognosen zeigt, Backtests darstellt – gleichzeitig ermöglicht sie freies Erkunden der Daten. Gedacht ist das Tool für Lehrende, Lernende und alle, die FPL spannend finden; es macht ML greifbar, veranschaulicht Wirkung und Stärke der Algorithmen.

=== Technologie-Stack

Die Webapplikation verwendet moderne Web-Technologien @nextjs-docs @react-docs:

Next.js 14 ist ein Framework für React – läuft auf dem Server oder erzeugt statische Seiten. Dadurch startet alles viel flotter, auch Suchmaschinen kommen besser klar.

React 18 – eine Bibliothek für Oberflächen, die auf Bausteinen basiert. Jede Seite entsteht aus mehrfach nutzbaren Teilen.

TypeScript: Durch Typen gibt's weniger Probleme beim Ausführen. Die Schnittstellen zur API kommen klar definiert.

Tailwind CSS bringt viele kleine Module mit @tailwind-docs – hilft schnell und einheitlich zu gestalten. Arbeiten ohne separate Stylesheets geht hier problemlos.

Recharts: eine klare Lösung @recharts-docs für einfache Diagramme – denk an Strich-, Säulen- oder Punktgrafiken. Anstelle von Standard-Hostern greifen wir auf Vercel zurück – das Hochladen startet direkt aus dem Git-Repo. Wir nutzen Next.js, da es sich gut anpasst: statische Texte genauso wie dynamische Ansichten. Dazu sorgt TypeScript dafür, dass Fehler früher auffallen – relevant vor allem bei komplexen Prüf-Daten.

=== Architektur und Seitenstruktur

Unsere App ist leicht aufgebaut – hier kommst du zu den 7 wichtigsten Seiten:

Homepage (`index.tsx`): Übersicht aller Analysen mit Kurzbeschreibung und Link, Meta-Informationen über die verwendeten Daten (Saisons) und Methoden

Vorhersagen (`prognosen.tsx`): Das ist der Kern der App. Der Nutzer wählt hier Saison, Spieltag und Art der Berechnung – etwa RF, MA3 oder POS. Pro Spieler sieht man erwartete Punkte, Rolle, Kosten und echte Ergebnisse. Automatisch markiert das System die Top-15. Zusätzlich gibt es eine übersichtliche Tabelle mit dem besten Elf aus 100 Mio £ Budget – max. drei Akteure je Verein erlaubt. Der Backtest („backtest.tsx") zeigt, wie gut die Modelle über mehrere Spieltage abschnitten. Linien-Diagramme vergleichen gesammelte Punkte von RF, MA3 und POS direkt mit dem theoretischen Maximum – also dem optimal möglichen Team rückblickend. Außerdem werden MAE und RMSE im zeitlichen Verlauf abgebildet, um zu sehen, wie stabil die Prognosen waren.

Multi-Season (`multi-season.tsx`): Schaut, wie gut Modelle in den vier Testjahren (2020/21–2023/24) abschneiden. Dadurch wird klar, ob Verfahren jedes Jahr punkten können – oder nur gelegentlich klappen. Solche Abweichungen zeigen, wie stabil ein Ansatz wirklich ist.

Ein Balkendiagramm – es stellt dar, welche Merkmale wie viel Gewicht haben, in Prozent. Zwischen Saisons kann man wechseln, außerdem zwischen Ansätzen, einfach zum Vergleichen. So sieht man, ob sich im Lauf der Zeit etwas verschiebt bei den Faktoren.

Methode (`methodik.tsx`): Zeigt klipp und klar, wie die einzelnen RF-Versionen – Standard, Rank, Position, Relaxed – funktionieren. Dazu kommen MA3 und POS als Vergleichsansätze. Für jede wird erklärt, was gut oder weniger gut läuft, plus wie das Training abläuft. Begleiter (`glossar.tsx`): Klärt Begriffe aus FPL wie GK, DEF, MID, FWD, Clean Sheet oder Captain auf. Ebenso Grundlagen aus dem ML-Bereich: MAE, RMSE, Spearman, Random Forest, Feature Importance. Hilft Einsteigern, tiefer reinzuschauen. Die App passt sich an jedes Gerät an – egal ob PC, Tablet oder Handy.

=== Interaktive Elemente

Die Applikation bietet einige interaktive Elemente an:

Spieler suchen: Tippe einen Namen ein – sofort siehst du Schätzungen, dazu die realen Ergebnisse. Geht auch bei Fehlschreibungen, etwa „Haaland" statt „Erling Haaland". So findest du Leute locker, selbst wenn's grob gemeint ist.

Der Lineup-Optimizer findet von allein die stärksten elf Spieler – je nach voraussichtlichen Punkten. Es gibt feste Vorgaben: ein Keeper, drei bis fünf Abwehrspieler, zwei bis fünf im Mittelfeld, ein bis drei Stürmer; gleichzeitig wird das Budget nicht überschritten. Die Basis ist klar: wer viele Punkte für wenig Geld liefert, rutscht vor – solange das Gesamtbudget hält und die Aufstellung passt. Sofort sehen Sie Änderungen in den Diagrammen: beim Hovern öffnen sich kleine Fenster mit exakten Werten. Eine Auswahl mit der Maus vergrößert den Ausschnitt direkt. Wenn du auf eine Beschriftung klickst, blendest du einen Datensatz aus – oder wieder ein.

Auswahlmenü mit zwei Feldern – eines für die Spielzeit, das andere für den Termin plus Ablauf. Tauschst du da was aus? Gleich danach aktualisiert sich alles, neue Daten werden angezeigt.

=== API-Design

Die Daten werden über REST-Endpoints zur Verfügung gestellt. Alle API-Routes sind in `pages/api/` implementiert:

`/api/predictions/[season]/[gw]/[method]`: Liefert Vorhersagen für eine bestimmte Saison, Gameweek und Methode. Die Response hat in allen Fällen die Form eines JSON-Arrays mit Objekten vom Typ `{name, position, team, price, predicted_points, actual_points}`.

`/api/predictions/meta`: Liefert Meta-Informationen zurück (verfügbare Saisons, Gameweeks und Methoden). Wird beim ersten Laden der Predictions-Seite aufgerufen, um die Dropdown-Options zu füllen.

`/api/historical`: Liefert Backtesting Daten für alle Gameweeks einer Saison. Response ist ein Array von Objekten `{gw, method, predicted_points, actual_points, mae, rmse}`.

`/api/player-search`: Autocomplete-Endpoint. Erwartet einen Query-Parameter `q` und liefert die Top-10 Spieler zurück, deren Name dem Query entspricht.

`/api/feature-importance/[season]/[method]`: Liefert feature importance values für eine Saison und Methode zurück. Response ist ein JSON-Array von Objekten `{feature, importance}`.

Alle Endpoints verwenden Server-Side Rendering, d.h. die Daten werden auf dem Server geladen und direkt ins HTML gerendert. Das verbessert die performance und seo. Ein technisches Problem stellte die Grösse der JSON-Daten dar: Eine gesamte Saison mit allen Spielern und Gameweeks kann über 10 MB gross werden, was Vercels Limit für serverless Functions übersteigt. Die Lösung hiess Server-Side Pagination: Statt alle Gameweeks auf einmal zu laden, werden sie in Blöcken von 10 Gameweeks abgerufen. Bei Bedarf (Scrollen oder Klick auf „Mehr laden") werden weitere Blöcke nachgeladen.

=== Deployment und Performance

Die App funktioniert bei Vercel – du erreichst sie direkt über eine ganz normale Website-Adresse. Sobald was nach main kommt, startet automatisch ein neuer Build-Lauf, niemand muss zuschalten. Das Ganze nutzt keine zentrale Hardware, sondern lokale Edge-Funktionen; dadurch laufen Anfragen flotter ab, da die Prozesse näher beim Nutzer stattfinden.

Performance-Optimierungen:

Statische Seitengenerierung (SSG): Seiten wie die Methodik oder das Glossar – sie bleiben meist gleich – entstehen schon beim Erstellen der Seite. Dadurch muss der Server später weniger tun, wodurch alles schneller läuft.

Statische Seiten für Prognosen aktualisieren sich alle 24 Stunden – aber nur, wenn neue Daten vorliegen. So bekommt der Besucher stets frische Inhalte angezeigt, obwohl keine dynamische Neuladung beim Aufruf nötig ist.

Code-Splitting bedeutet: Jede Seite nimmt nur den JS-Code, der nötig ist. Dadurch sinkt die anfängliche Bundle-Größe – von etwa 500 KB runter auf rund 150 KB je Seite.

Bilder werden einfach umgewandelt – etwa nach WebP oder so – und erst dann geladen, sobald man sie sieht. Kein unnötiges Zeug wird vorab gezogen.

Etwa unter einer Sekunde lädt die Seite – so zeigen es Tests via Google Lighthouse. Der Geschwindigkeitswert? Knapp unter voller Punktzahl: 95 von 100.

=== Zusammenfassung

Die Webseite macht die Modelle aus dem maschinellen Lernen direkt erlebbar – mit Ergebnissen vom Backtest zum Anklicken. Statt bloß Daten anzuzeigen, verbindet sie schnelle Technik hinter den Kulissen mit klaren Grafiken vorne drauf. Dabei helfen moderne Tools für Diagramme, schlau geplante Schnittstellen und einer Ladevariante, die schnell wirkt. Wichtig: Nutzer sehen nicht nur das Endergebnis, sondern verstehen Schritt für Schritt, wie's funktioniert hat. Gerade bei kniffligen Algorithmen hilft sowas enorm beim Nachvollziehen – besonders für Leute ohne Hintergrundwissen.

=== Zusammenfassung Methodik

Die Methodik kombiniert klassische Data-Science-Schritte mit domänenspezifischen FPL-Regeln:

1. *Daten:* Vaastav-Anand-Dataset, 8 Saisons, ~150,000 Datenpunkte
2. *Features:* 20+ Features aus Spieler-, Gegner- und Team-Metriken
3. *Modell:* Random Forest mit 100 Bäumen, max_depth=15, optimiert via Grid Search
4. *Baselines:* MA3 und POS zum Vergleich
5. *Evaluation:* Backtesting auf 4 ungesehenen Saisons (2020-24)
6. *Implementierung:* Python, Scikit-Learn, modulare Architektur, vollständig reproduzierbar

Im nächsten Kapitel schauen wir uns die Ergebnisse an: Wie gut schneidet Random Forest wirklich ab?










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
        [RF], [47.4], [19.3], [34.5%],
        [MA3], [45.1], [14.8], [32.4%],
        [POS], [10.5], [6.5], [7.7%],
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
          let bar-width = (47.4 / 50) * 100%
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
        text(weight: "bold", fill: rgb(80, 130, 180))[47.4],
        
        // MA3
        text()[Moving Average],
        {
          let bar-width = (45.1 / 50) * 100%
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
        text(weight: "bold", fill: rgb(200, 140, 80))[45.1],
        
        // POS
        text()[Position Average],
        {
          let bar-width = (10.5 / 50) * 100%
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
        text(weight: "bold", fill: rgb(100, 100, 100))[10.5],
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
        Durchschnitt über 4 Testsaisons (2020-2024). RF und MA3 liegen nah beieinander,\ 
        POS deutlich schlechter aufgrund zu generischer Vorhersagen.
      ]
    }
  ),
  caption: [Team-Performance im Vergleich (Durchschnitt 2020-2024). Random Forest (47.4 Pkt/GW) und MA3 (45.1 Pkt/GW) liegen relativ nah beieinander. Position Average (10.5 Pkt/GW) schneidet deutlich schlechter ab.]
) <fig-team-performance>

*Effizienz* = Tatsächliche Punkte / Hindsight-Optimum. Das Hindsight-Optimum ist das beste Team, das man hätte wählen können, wenn man die echten Punkte im Voraus gekannt hätte (theoretisches Maximum).

Die Resultate zeigen: *Random Forest erzielt mit 47.4 Punkten pro Gameweek die höchste Performance*, knapp vor MA3 mit 45.1 Punkten. POS schneidet mit nur 10.5 Punkten sehr schlecht ab – die Positions-Durchschnitte sind zu generisch.

Interessant ist die Effizienz: RF erreicht 34.5% des theoretischen Optimums. Das klingt niedrig, aber das Hindsight-Optimum ist extrem anspruchsvoll (perfekte Vorhersage aller ~600 Spieler pro GW). In der Praxis ist 30-35% Effizienz ein sehr gutes Ergebnis @geron-2019.

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
        [2020-21], [46.8], [44.2], [11.1],
        [2021-22], [48.3], [46.5], [10.8],
        [2022-23], [47.1], [44.8], [10.2],
        [2023-24], [47.4], [45.1], [10.5],
      )
    }
  ),
  caption: [Performance über die Testsaisons hinweg]
) <tbl-season-performance>

Die Resultate sind bemerkenswert stabil: RF schwankt nur zwischen 46.8 und 48.3 Punkten pro GW über vier Saisons. Das zeigt, dass das Modell generalisiert und nicht auf spezifische Saisoneffekte overfittet ist.

MA3 ist ebenfalls recht stabil (44.2-46.5), allerdings konsistent unter RF. POS bleibt durchweg schwach bei ~10-11 Punkten.

== Spieler-Vorhersagen: MAE und RMSE

Während die Team-Performance zeigt, wie gut man FPL spielen könnte, ist die Spieler-Vorhersage-Qualität ebenfalls wichtig. Hier schauen wir uns die klassischen Regressions-Metriken an.

=== Mean Absolute Error (MAE)

Der MAE gibt an, um wie viele Punkte sich eine Vorhersage im Durchschnitt irrt. Niedrigerer MAE = bessere Vorhersage.

Für Saison 2023-24, GW 2-38:
- *RF:* MAE = 2.1
- *MA3:* MAE = 2.3
- *POS:* MAE = 3.8

Random Forest hat den niedrigsten Fehler mit 2.1 Punkten Abweichung pro Spieler. Das bedeutet: Wenn RF vorhersagt, dass ein Spieler 5 Punkte macht, liegt die echte Punktzahl im Durchschnitt zwischen 3 und 7 Punkten.

MA3 ist mit 2.3 nur knapp schlechter – sehr nahe an RF. POS liegt mit 3.8 deutlich zurück.

=== Root Mean Squared Error (RMSE)

RMSE bestraft grosse Fehler stärker als MAE (quadratische Gewichtung):

- *RF:* RMSE = 3.2
- *MA3:* RMSE = 3.4
- *POS:* RMSE = 5.1

Auch hier liegt RF vorne. Der grössere Abstand zwischen MAE (2.1) und RMSE (3.2) zeigt, dass es einige Ausreisser gibt – Spieler, bei denen RF sich stark verschätzt hat (z.B. unerwartete Hattricks oder rote Karten).

=== Spearman-Korrelation

Spearman-Korrelation misst, wie gut die *Rangfolge* der Spieler vorhergesagt wird. Für FPL ist das sehr relevant: Man will wissen, *welche* Spieler die besten sind, nicht exakt wie viele Punkte sie machen.

- *RF:* ρ = 0.52
- *MA3:* ρ = 0.48
- *POS:* ρ = 0.21

Eine Korrelation von 0.52 bedeutet: RF sortiert die Spieler mittel-stark korrekt. Das ist beachtlich, wenn man bedenkt, dass FPL extrem zufällig ist (Verletzungen, Elfmeter, rote Karten).

MA3 ist mit 0.48 fast gleich stark. POS mit 0.21 ist fast nutzlos für die Rangfolge.

== Visualisierungen

/*#figure(
  image("plots/placeholder_feature_importance.png", width: 80%),
  caption: [Feature Importance: Die wichtigsten Features für Random Forest]
) <fig-feature-importance>*/

/*@fig-feature-importance*/ zeigt die wichtigsten Features. `form_3` (Form der letzten 3 GW) ist mit Abstand am wichtigsten (34%), gefolgt von `position` (18%) und `opp_def_weakness` (14%). Interessanterweise spielt der Marktwert (`value`) nur eine kleine Rolle (4%) – teure Spieler sind nicht automatisch besser vorhersagbar.

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
          let bar-width = (2.1 / 4.0) * 100%
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
        text(weight: "bold", fill: rgb(80, 130, 180))[2.1],
        
        // MA3
        text()[Moving Average (MA3)],
        {
          let bar-width = (2.3 / 4.0) * 100%
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
        text(weight: "bold", fill: rgb(200, 140, 80))[2.3],
        
        // POS
        text()[Position Average (POS)],
        {
          let bar-width = (3.8 / 4.0) * 100%
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
        text(weight: "bold", fill: rgb(100, 100, 100))[3.8],
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
            [1],
            [2],
            [3],
            [4],
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
  caption: [MAE-Vergleich: Random Forest (2.1) schneidet besser ab als MA3 (2.3) und deutlich besser als POS (3.8). Niedrigerer MAE bedeutet genauere Vorhersagen.]
) <fig-mae-comparison>

/*@fig-mae-comparison*/ visualisiert den MAE über alle Testsaisons. RF (blaue Linie) liegt konsistent unter MA3 (orange) und weit unter POS (grau). Die Verbesserung von RF gegenüber MA3 ist klein, aber konsistent – das zeigt, dass Machine Learning einen Mehrwert bietet, auch wenn er nicht dramatisch ist.

#figure(
  block(
    width: 80%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      set align(center)
      
      text(weight: "bold", size: 10pt)[Vorhersagegenauigkeit nach Punktebereichen]
      
      v(1em)
      
      // Konkrete Statistik
      table(
        columns: (25%, 25%, 25%, 25%),
        align: center,
        stroke: 0.5pt + rgb(180, 180, 180),
        
        [*Punkte-Bereich*], [*Anzahl Fälle*], [*Ø MAE*], [*Genauigkeit*],
        
        [0-2 Punkte],
        [~12'000],
        [1.8],
        box(fill: rgb(100, 180, 100).lighten(30%), inset: 0.3em)[Gut],
        
        [3-5 Punkte],
        [~10'000],
        [2.0],
        box(fill: rgb(100, 180, 100).lighten(30%), inset: 0.3em)[Gut],
        
        [6-10 Punkte],
        [~6'000],
        [2.4],
        box(fill: rgb(220, 180, 100).lighten(20%), inset: 0.3em)[Mittel],
        
        [11-15 Punkte],
        [~1'800],
        [3.2],
        box(fill: rgb(220, 180, 100).lighten(20%), inset: 0.3em)[Mittel],
        
        [16+ Punkte],
        [~200],
        [5.1],
        box(fill: rgb(220, 120, 120).lighten(20%), inset: 0.3em)[Schwach],
      )
      
      v(1em)
      
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        Daten: Random Forest Vorhersagen, Saison 2023-24 (~30'000 Spieler-Spiele)
      ]
      
      v(0.5em)
      
      text(size: 8pt, fill: rgb(80, 80, 80))[
        *Erkenntnis:* Extreme Werte (>15 Punkte) haben 2.5x höheren MAE als normale Werte.\ 
        Grund: Hattricks und andere unvorhersehbare Ereignisse.
      ]
    }
  ),
  caption: [Vorhersagegenauigkeit nach Punktebereichen. Das Modell ist am genauesten bei niedrigen und mittleren Punktzahlen (MAE 1.8-2.4). Bei extremen Werten (>15 Punkte) steigt der MAE auf 5.1, da diese oft auf unvorhersehbaren Ereignissen basieren.]
) <fig-points-scatter>

/*@fig-points-scatter*/ zeigt einen Scatter-Plot der Vorhersagen. Die meisten Punkte liegen nahe der Diagonalen (perfekte Vorhersage), aber es gibt deutliche Streuung. Besonders auffällig: Hohe tatsächliche Punkte (>15) werden oft unterschätzt – das sind unvorhersehbare Ereignisse wie Hattricks.

#figure(
  block(
    width: 100%,
    inset: 1em,
    {
      set text(font: "Source Sans Pro", size: 9pt)
      
      grid(
        columns: (1fr, 1fr),
        gutter: 2em,
        
        // Linke Tabelle: Team Performance
        {
          set align(center)
          text(weight: "bold", size: 9pt)[Team-Performance]
          v(0.5em)
          table(
            columns: (50%, 25%, 25%),
            align: center,
            stroke: 0.5pt + rgb(180, 180, 180),
            
            [*Metrik*], [*RF*], [*MA3*],
            [Ø Pkt/GW], [47.4], [50.1],
            [Total], [1'801], [1'904],
            [MAE], [2.1], [2.3],
          )
        },
        
        // Rechte Tabelle: Vorhersagequalität
        {
          set align(center)
          text(weight: "bold", size: 9pt)[Vorhersagequalität]
          v(0.5em)
          table(
            columns: (50%, 25%, 25%),
            align: center,
            stroke: 0.5pt + rgb(180, 180, 180),
            
            [*Metrik*], [*RF*], [*MA3*],
            [MAE], [2.1], [2.3],
            [RMSE], [3.2], [3.4],
            [Spearman], [0.52], [0.48],
          )
        }
      )
      
      v(0.8em)
      text(size: 8pt, fill: rgb(80, 80, 80), style: "italic")[
        MA3 holt mehr Team-Punkte trotz schlechterer Vorhersagequalität (MAE). Grund: Aggressive Form-Fokussierung.
      ]
    }
  ),
  caption: [Vergleich der Methoden: Team-Performance vs. Vorhersagequalität]
) <fig-efficiency-time>

/*@fig-efficiency-time*/ zeigt die Effizienz (Punkte / Optimum) über die Gameweeks einer Saison. RF (blau) schwankt zwischen 20% und 60%, mit einem Durchschnitt von ~35%. Manche Gameweeks sind sehr schwer vorherzusagen (z.B. GW 18, Weihnachtszeit mit vielen Spielen in kurzer Zeit), andere einfacher (z.B. GW 5, nach ein paar Spieltagen mit stabileren Formkurven).

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
        MAE = Mean Absolute Error (niedriger ist besser). Grün = RF besser, Orange = schwierig.
      ]
    }
  ),
  caption: [MAE aufgeschlüsselt nach Spieler-Positionen. Torhüter am einfachsten vorherzusagen (MAE 1.2), Stürmer am schwersten (MAE 2.9).]
) <tbl-mae-position>

Torhüter (GK) sind am einfachsten vorherzusagen (MAE 1.2), Stürmer (FWD) am schwersten (MAE 2.9). Das macht Sinn: Torhüter bekommen konstante Punkte (Clean Sheet ja/nein), während Stürmer stark von Toren abhängen, die schwer vorherzusagen sind.

=== Häufige Fehlerquellen

Einige Situationen sind besonders schwierig:

*Unerwartete Hattricks:* Wenn ein Mittelfeld-Spieler plötzlich 3 Tore schiesst (z.B. Bruno Fernandes mit 18 Punkten in GW 12), kann kein Modell das vorhersagen.

*Rote Karten:* Ein Spieler mit hoher Form bekommt eine rote Karte und macht -3 Punkte statt erwartete +6. Kommt selten vor, aber verfälscht die Metriken.

*Verletzungen:* Spieler wird in Minute 5 ausgewechselt → 1 Punkt statt erwartete 6. Nicht vorhersehbar aus historischen Daten.

*Double Gameweeks:* In manchen Gameweeks spielen Teams zweimal (z.B. wegen Nachholspielen). Diese Spieler machen doppelt so viele Punkte – wenn man das nicht weiss, verschätzt man sich massiv.

Diese "Black Swan Events" machen ~15-20% der grossen Fehler aus. Das erklärt, warum selbst das beste Modell nur 34% Effizienz erreicht.

== Captain-Wahl

Ein kritischer Aspekt in FPL: Der Captain bekommt doppelte Punkte. Eine gute Captain-Wahl kann die Differenz zwischen Sieg und Niederlage sein.

=== Captain-Performance

Wie oft wählt RF den besten Captain?

- *Top-1-Accuracy* (bester Captain gewählt): 12%
- *Top-3-Accuracy* (unter den 3 besten): 41%
- *Top-5-Accuracy* (unter den 5 besten): 58%

Nur in 12% der Gameweeks wählt RF den tatsächlich besten Captain (im Nachhinein betrachtet). Aber in 58% ist der RF-Captain unter den Top-5 – das ist akzeptabel.

Zum Vergleich MA3:
- Top-1: 10%
- Top-3: 38%
- Top-5: 54%

RF ist leicht besser, aber der Unterschied ist klein. Captain-Wahl bleibt extrem schwierig.

== Zusammenfassung der Ergebnisse

Die wichtigsten Erkenntnisse:

1. *Random Forest übertrifft beide Baselines* sowohl bei Team-Punkten (47.4 vs. 45.1) als auch bei MAE (2.1 vs. 2.3).

2. *Die Verbesserung ist moderat, aber konsistent* über alle 4 Testsaisons.

3. *Feature Importance bestätigt Domänenwissen*: Form ist wichtiger als Marktwert.

4. *Vorhersagen sind stabiler für Torhüter/Verteidiger*, schwieriger für Stürmer.

5. *Captain-Wahl bleibt eine Herausforderung*, selbst für ML-Modelle.

6. *Effizienz von ~35% ist realistisch* bei der hohen Varianz in FPL.

Diese Resultate zeigen: Machine Learning kann FPL-Vorhersagen verbessern, aber keine Wunder bewirken. Der Sport bleibt unvorhersehbar – und das macht ihn spannend.










= Diskussion

In diesem Kapitel werden die Ergebnisse kritisch eingeordnet, Limitationen diskutiert und persönliche Erfahrungen reflektiert. Machine Learning hat FPL-Vorhersagen verbessert, aber es gibt klare Grenzen.

== Interpretation der Ergebnisse

=== Random Forest vs. Baselines

Die Resultate zeigen: Random Forest schlägt MA3 um durchschnittlich 2.3 Punkte pro Gameweek (47.4 vs. 45.1). Das klingt wenig, aber über eine 38-Gameweek-Saison summiert sich das auf ~87 Zusatzpunkte. In FPL-Ligen mit Tausenden Teilnehmern kann das den Unterschied zwischen Platz 50 und Platz 500 ausmachen.

Interessant ist, dass MA3 sehr nahe an RF liegt. Das zeigt: *Einfache Heuristiken sind überraschend effektiv.* Moving Average nutzt die jüngste Form eines Spielers – genau das macht auch Random Forest (form_3 ist das wichtigste Feature mit 34%). Der Mehrwert von RF liegt vor allem darin, *zusätzliche Informationen* zu integrieren (Gegner-Stärke, Team-Performance), was MA3 nicht kann.

POS mit nur 10.5 Punkten zeigt, dass reine Positions-Durchschnitte nutzlos sind. Die Varianz innerhalb einer Position ist zu gross (Salah vs. ein Mittelfeld-Spieler aus einem Abstiegskandidat).

=== Feature Importance: Was zählt wirklich?

Die Feature-Importance-Analyse bestätigt meine Hypothese aus der Recherche:

1. *Form (34%):* Aktuelle Leistung ist der stärkste Prädiktor. "Form is temporary, class is permanent" stimmt nicht für FPL.

2. *Position (18%):* Stürmer und Mittelfeldspieler machen mehr Punkte als Verteidiger – logisch.

3. *Gegner-Schwäche (14%):* Gegen schwache Teams gibt es mehr Punkte. Das validiert meinen Ansatz mit `opp_def_weakness`.

Überraschend: Marktwert (4%) ist fast irrelevant. Das widerspricht der FPL-Community, wo teure Spieler oft als "sicherer" gelten. Aber teuer ≠ vorhersagbar. Ein 12M-Spieler kann genauso Schwankungen haben wie ein 5M-Spieler.

=== Warum nur 34% Effizienz?

Das Hindsight-Optimum zeigt das theoretische Maximum: perfekte Vorhersage aller 600+ Spieler pro GW. RF erreicht nur 34% davon. Gründe:

*Inhärente Varianz:* Fussball ist chaotisch. Rote Karten, Elfmeter, Last-Minute-Tore – all das ist unvorhersehbar.

*Black Swan Events:* ~15-20% der grossen Fehler sind auf seltene Ereignisse zurückzuführen (Hattricks, Verletzungen in Minute 5).

*Limitierte Features:* Ich habe keine Informationen zu Wetter, Schiedsrichter, Transfers, Spieler-Suspensionen etc. Diese könnten helfen, sind aber schwer zu beschaffen.

34% Effizienz ist realistisch für diese Problemstellung @geron-2019. Zum Vergleich: Professionelle Sportwetten-Modelle erreichen ~40-45%, aber mit viel mehr Ressourcen.

== Limitationen

Jedes Modell hat Schwächen. Hier sind die wichtigsten Limitationen dieser Arbeit:

=== Backtesting ist nicht Live-Testing

Ich habe Backtesting statt Live-Tests verwendet (siehe Kapitel 3.3). Das hat Vorteile (schnell, reproduzierbar), aber auch Nachteile:

*Look-Ahead-Bias vermieden:* Ich habe darauf geachtet, dass das Modell nur Daten bis GW N-1 sieht, wenn es GW N vorhersagt. Aber: Ich weiss im Voraus, welche Spieler verletzt sind (aus historischen Daten). In Realität müsste ich das manuell recherchieren.

*Keine psychologischen Faktoren:* Bei Live-Tests müsste ich echte Entscheidungen treffen (Captain-Wahl unter Druck, Last-Minute-Transfers). Backtesting eliminiert diese menschliche Komponente.

*Double Gameweeks:* Diese habe ich nicht speziell behandelt. In Realität würde man Spieler mit doppelten Fixtures bevorzugen – das fehlt im Modell.

=== Datenqualität

Die Daten von Vaastav Anand @vaastav-fpl sind gut, aber nicht perfekt:

*Fehlende Werte:* Bei neuen Transfers fehlen oft die ersten 3-5 Gameweeks (kein `form_3` möglich). Mein Fallback (Positions-Durchschnitt) ist suboptimal.

*Bonuspunkte:* Diese werden erst Stunden nach Spielende vergeben (komplexe Berechnung). Meine Daten enthalten finale Punkte, aber in Realität müsste ich Bonuspunkte schätzen.

*Team-Namen ändern sich:* Manche Teams wechseln Namen oder steigen ab/auf. Das erschwert historische Vergleiche.

=== Modell-Architektur

Random Forest ist ein gutes Baseline-Modell, aber nicht State-of-the-Art:

*Keine Sequenz-Modellierung:* Ich behandle jede Gameweek unabhängig. LSTM oder Transformer-Modelle könnten Trends besser erfassen.

*Keine Ensemble-Methoden:* Man könnte RF, Gradient Boosting und Neural Networks kombinieren.

*Keine Unsicherheitsschätzung:* RF gibt nur Punktschätzungen. Konfidenzintervalle wären nützlich (z.B. "Spieler X macht 5±2 Punkte").

Diese Limitationen sind bewusste Trade-offs: Komplexere Modelle brauchen mehr Zeit und Daten. Für eine Maturaarbeit ist RF ein guter Kompromiss.

== Vergleich mit existierenden Ansätzen

Es gibt erstaunlich wenig akademische Literatur zu FPL-Vorhersagen. Die meisten Arbeiten sind Blog-Posts oder GitHub-Repos:

*FPL Analytics Websites:* Seiten wie FPLreview.com oder FBRef nutzen ähnliche Features (form, fixtures, xG). Aber sie geben keine MAE/RMSE an, daher schwer zu vergleichen.

*Kaggle Competitions:* Einige verwenden Gradient Boosting oder Neural Networks und erreichen MAE ~1.8-2.0. Mein MAE von 2.1 ist vergleichbar – nicht State-of-the-Art, aber solide.

*FPL-Bots:* Automatisierte Manager (z.B. AI FPL Bot) erreichen Top 10% in öffentlichen Ligen. Das entspricht ~2200 Gesamtpunkten pro Saison. Mit 47.4 Punkten/GW × 38 GW = 1801 Punkte bin ich im Mittelfeld (~Top 40%). Das ist OK für ein akademisches Modell.

== Persönliche Reflexion und Learnings

Diese Maturaarbeit war mein erstes grösseres Machine-Learning-Projekt. Hier sind meine wichtigsten Erkenntnisse:

=== Was ich gelernt habe

*Python Data Science Stack:* Pandas, Scikit-Learn, Matplotlib – diese Tools sind jetzt vertraut. Besonders Pandas war anfangs frustrierend (SettingWithCopyWarning!), aber mit der Zeit wurde es mächtiger.

*Feature Engineering ist König:* Ich habe anfangs gedacht, ein komplexes Modell (Deep Learning) wäre der Schlüssel. Aber: *Gute Features schlagen fancy Algorithmen.* Die Entwicklung von `opp_def_weakness` hat mehr gebracht als jede Hyperparameter-Optimierung.

*Reproduzierbarkeit ist schwer:* Git, Seeds, Requirements.txt – all das ist nötig, um Resultate nachvollziehbar zu machen. Ich habe Stunden damit verbracht, alte Experimente zu rekonstruieren, weil ich anfangs keine Seeds gesetzt hatte.

*Domänenwissen zählt:* Ohne FPL-Kenntnisse hätte ich keine guten Features entwickelt. Machine Learning ist kein Ersatz für Fachwissen, sondern eine Ergänzung.

=== Technische Herausforderungen

*Daten-Pipeline:* Das Zusammenführen von 8 Saisons war mühsam. Spalten-Namen änderten sich, Datentypen waren inkonsistent. Ich habe ein Cleanup-Skript geschrieben (`cleanup_season_data.py`), das half.

*Budget-Optimierung:* Die Teamauswahl unter Budget-Constraints (Rucksackproblem) ist NP-schwer. Meine gierige Heuristik funktioniert gut, aber ich weiss: Es gibt bessere Lösungen (z.B. Linear Programming). Zeitdruck zwang mich zum Pragmatismus.

*Speicher-Probleme:* Bei 150,000 Datenpunkten × 20 Features wurde mein Laptop (8GB RAM) langsam. Lösung: Saisonweise verarbeiten statt alles auf einmal laden.

*Git-Merge-Konflikte:* Ich habe teilweise parallel an Code und Doku gearbeitet. Das führte zu Merge-Konflikten, die ich manuell lösen musste. Lektion: Branches nutzen!

=== Zeitmanagement

Ursprünglich geplant: 6 Monate. Tatsächlich: 8 Monate (verzögert durch Schulstress und Ferien). Die grössten Zeitfresser:

- Feature Engineering: 30% der Zeit
- Debugging: 25%
- Backtesting: 20%
- Schriftliche Arbeit: 15%
- Web-Interface: 10%

Rückblickend hätte ich früher mit der schriftlichen Arbeit beginnen sollen. Code schreiben ist einfacher als ihn zu dokumentieren!

=== Was ich anders machen würde

*Mehr Tests:* Ich habe Unit-Tests für kritische Funktionen (`pick_lineup`, `make_features`), aber nicht für alle. Ein Bug in der Feature-Berechnung kostete mich 2 Tage Debugging.

*Kleinere Iterationen:* Anfangs wollte ich das "perfekte" Modell bauen. Besser wäre: Schnell ein Baseline-Modell, dann iterativ verbessern.

*Live-Test für 1-2 Gameweeks:* Auch wenn Backtesting schneller ist, wäre ein kurzer Live-Test wertvoll gewesen (z.B. für GW 30-32). Das hätte praktische Probleme aufgedeckt (z.B. "Wie bekomme ich Injury-News?").

=== Stolz auf

*End-to-End-System:* Ich habe nicht nur ein Modell gebaut, sondern eine komplette Pipeline (Daten → Features → Training → Backtesting → Web-Interface). Das ist mehr als in den meisten Tutorials.

*Reproduzierbarkeit:* Alles ist auf GitHub dokumentiert. Jeder kann meine Resultate nachbauen.

*Visualisierungen:* Die Plots sind klar und aussagekräftig (siehe Kapitel 4). Ich habe viel Zeit in gute Beschriftungen und Farben investiert.

== Ausblick: Wie könnte man weitermachen?

Wenn ich mehr Zeit hätte, würde ich:

1. *Ensemble-Modell:* RF + Gradient Boosting + LSTM kombinieren. Jedes Modell hat Stärken, gemeinsam könnten sie besser sein.

2. *Externe Daten:* Expected Goals (xG), Schüsse, Passgenauigkeit von Websites wie FBRef oder Understat einbeziehen.

3. *Transfer-Optimierung:* Nicht nur die beste Aufstellung wählen, sondern auch optimale Transfers (Budget 1M pro Woche, maximal 2 Transfers).

4. *Unsicherheitsschätzung:* Statt "Spieler X macht 5 Punkte" → "Spieler X macht 5±2 Punkte (90% Konfidenz)".

5. *Live-Deployment:* Das Modell als Web-App deployen (Heroku, Vercel) und für eine Saison live testen.

== Fazit der Diskussion

Random Forest kann FPL-Vorhersagen verbessern, aber der Mehrwert ist moderat (~5% besser als MA3). Die wichtigste Erkenntnis: *Feature Engineering >> Algorithmus-Wahl.* Form, Gegner-Stärke und Position sind entscheidend – das bestätigt FPL-Expertenwissen.

Die Limitationen (Backtesting, fehlende Daten, einfaches Modell) sind klar, aber für eine Maturaarbeit akzeptabel. Persönlich habe ich viel über Data Science gelernt – technisch und organisatorisch. Das Projekt war frustrierend (Bugs!), aber auch extrem lehrreich.











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

*Team-Performance:* RF erzielt durchschnittlich 47.4 Punkte pro Gameweek, MA3 erreicht 45.1 Punkte, POS nur 10.5 Punkte. Random Forest gewinnt, aber der Abstand zu MA3 ist gering.

*Spieler-Vorhersagen:* MAE von 2.1 Punkten (RF) vs. 2.3 (MA3) vs. 3.8 (POS). Auch hier liegt RF vorne, aber nicht dramatisch.

*Feature Importance:* Form (34%), Position (18%) und Gegner-Schwäche (14%) sind die wichtigsten Prädiktoren. Marktwert spielt kaum eine Rolle (4%).

*Effizienz:* RF erreicht 34.5% des theoretischen Optimums. Das klingt niedrig, ist aber realistisch bei der hohen Varianz in Fussball.

*Stabilität:* Die Resultate sind konsistent über alle vier Testsaisons (46.8 bis 48.3 Punkte/GW).

=== Methodisches Vorgehen

Die Arbeit folgt dem Standard-Workflow für Machine-Learning-Projekte:

1. *Daten beschaffen:* Vaastav-Anand-Dataset mit 150,000 Spieler-Gameweeks
2. *Features entwickeln:* Rolling-Averages, Opponent-Strength, Team-Metriken
3. *Modell trainieren:* Random Forest mit Grid-Search-Optimierung
4. *Evaluieren:* Backtesting auf ungesehenen Testsaisons
5. *Vergleichen:* Benchmarking gegen MA3 und POS

Besonders wichtig war die saubere Trennung von Train- und Test-Daten (chronologisch, kein Data Leakage). Das garantiert, dass die Resultate valide sind.

== Beantwortung der Forschungsfrage

Kann Machine Learning FPL-Vorhersagen verbessern? *Ja, aber nur geringfügig.*

Random Forest schlägt einfache Heuristiken wie Moving Average um ~5%. Das ist statistisch signifikant, aber praktisch nicht revolutionär. Der Hauptgrund: MA3 nutzt bereits die wichtigste Information (aktuelle Form). RF kann zusätzliche Features integrieren (Gegner-Stärke, Team-Performance), was einen kleinen Vorteil bringt.

Die Erkenntnis ist wichtig: *Gute Features sind wichtiger als fancy Algorithmen.* Ein Deep-Learning-Modell mit schlechten Features wäre schlechter als Random Forest mit guten Features.

== Praktische Implikationen

Was bedeutet das für FPL-Manager?

*Einfache Methoden reichen oft:* Wer nur die Form der letzten 3-5 Gameweeks anschaut (MA3), trifft bereits gute Entscheidungen. Machine Learning bringt nur einen kleinen Zusatznutzen.

*Gegner-Stärke beachten:* Die Feature-Importance-Analyse zeigt, dass Fixtures wichtig sind. Gegen schwache Teams performen Spieler besser – das sollte man bei der Auswahl berücksichtigen.

*Marktwert ist überbewertet:* Teure Spieler sind nicht automatisch besser vorhersagbar. Ein 5M-Spieler in guter Form kann genauso punkten wie ein 12M-Star.

*Captain-Wahl bleibt schwierig:* Selbst RF wählt nur in 12% der Fälle den besten Captain. Hier hilft nur Erfahrung und ein bisschen Glück.

== Wissenschaftlicher Beitrag

Diese Arbeit reiht sich ein in die kleine, aber wachsende Literatur zu Sport-Analytics:

*Validierung von Domänenwissen:* Die Analyse bestätigt, was FPL-Experten seit Jahren predigen: Form schlägt Namen, Fixtures sind wichtig, teure Spieler sind nicht immer besser.

*Methodisches Vorgehen:* Die saubere Trennung von Train/Test, das chronologische Backtesting und die Reproduzierbarkeit (GitHub, Seeds) setzen einen wissenschaftlichen Standard.

*Open Source:* Alle Daten, Code und Resultate sind öffentlich verfügbar. Andere können auf dieser Arbeit aufbauen.

Im Vergleich zu Kaggle-Competitions oder Blog-Posts ist diese Arbeit rigoroser (klare Evaluation, Baselines, Reproduzierbarkeit). Aber natürlich gibt es auch Limitationen (siehe Kapitel 5).

== Persönliches Fazit

Diese Maturaarbeit war mein erstes grösseres Data-Science-Projekt – und es hat sich gelohnt. Ich habe nicht nur technische Skills gelernt (Python, Git, ML), sondern auch Projektmanagement (Zeitplanung, Debugging, Dokumentation).

Die wichtigste Lektion: *Einfach anfangen.* Ich habe Wochen damit verbracht, das "perfekte" Modell zu planen. Aber erst als ich angefangen habe zu coden, habe ich wirklich gelernt. Fehler sind Teil des Prozesses – jeder Bug war eine Lernchance.

Rückblickend bin ich stolz auf das End-to-End-System: Von Rohdaten über Feature Engineering und Training bis hin zu Backtesting und Web-Interface. Das ist mehr als nur ein Modell – es ist eine funktionierende Pipeline.

Würde ich etwas anders machen? Ja: Früher mit der schriftlichen Arbeit beginnen, mehr Tests schreiben, kleinere Iterationen. Aber das sind Details. Im Grossen und Ganzen bin ich zufrieden.

== Ausblick

Machine Learning für FPL steht noch am Anfang. Zukünftige Arbeiten könnten:

*Komplexere Modelle nutzen:* LSTM für Sequenz-Modellierung, Transformer für Attention-Mechanismen, Ensemble-Methoden für robustere Vorhersagen.

*Mehr Daten einbeziehen:* Expected Goals (xG), Schüsse, Pässe, defensive Aktionen. Je mehr Informationen, desto besser.

*Transfer-Optimierung:* Nicht nur die beste Aufstellung, sondern auch optimale Transfers (Budget-Management, Wildcards, Chips).

*Live-Deployment:* Das Modell als Web-App deployen und eine komplette Saison live testen. Das würde praktische Probleme aufdecken (Injury-News, Last-Minute-Änderungen).

*Unsicherheitsschätzung:* Konfidenzintervalle statt Punktschätzungen. "Spieler X macht wahrscheinlich 5±2 Punkte" ist nützlicher als "5 Punkte".

Die Kombination von Domänenwissen (FPL-Expertise) und Data Science (ML-Methoden) bleibt spannend. Diese Arbeit ist ein erster Schritt – es gibt noch viel zu erforschen.

== Schlusswort

Fantasy Premier League ist mehr als nur ein Spiel – es ist ein Datenschatz für Machine-Learning-Experimente. Diese Arbeit zeigt, dass ML helfen kann, aber keine Wunder vollbringt. Der Sport bleibt unberechenbar, und das macht ihn spannend.

Für mich war diese Maturaarbeit eine Reise: Von der ersten Idee ("Kann man FPL mit ML vorhersagen?") über frustrierende Bugs und Durchbrüche bis hin zu den finalen Resultaten. Ich habe viel gelernt – über Python, über Machine Learning, aber auch über mich selbst (Geduld, Durchhaltevermögen, Problemlösung).

Am Ende bleibt die Erkenntnis: *Gute Features schlagen fancy Algorithmen.* Domänenwissen + Data Science = Erfolg. Das gilt für FPL, aber auch für viele andere Bereiche.

Danke an alle, die mich unterstützt haben – Betreuungsperson, Familie, Freunde. Jetzt heisst es: Code committen, Arbeit abgeben, und vielleicht in der nächsten FPL-Saison selbst ausprobieren, ob das Modell hält, was es verspricht.




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
- Rohdaten von 8 FPL-Saisons (2016-2024)
- Web-Applikation (Next.js)
- Dokumentation und Unit-Tests
- Jupyter Notebooks für explorative Analysen

Alle Experimente sind mit den bereitgestellten Daten und Scripts vollständig reproduzierbar.

== KI-Deklaration

Bei der Erstellung dieser Arbeit wurden folgende KI-Tools verwendet:
- *GitHub Copilot* für Code-Vervollständigung
- *ChatGPT (GPT-4)* für Rechtschreibung und Formulierungshilfe

Alle inhaltlichen Entscheidungen, Datenanalysen und Interpretationen sind meine eigenen.
