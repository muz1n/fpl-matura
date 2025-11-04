#set text(lang: "CH")
#let einleitung() = [
= Punkte vorhersagen in Fantasy Premier League: Eine einfache ML-Pipeline zum Verstehen und Anwenden

== Einleitung

=== Ausgangslage
Fantasy Premier League (FPL) ist ein Managerspiel. Man stellt jede Woche ein Team aus realen Spielern zusammen. Punkte gibt es für echte Leistungen wie Tore, Assists oder zu Null spielen. 
Die Entscheidungen sind komplex: viele Spieler, viele Zahlen, dazu Unsicherheiten wie Form, Verletzungen oder Gegnerstärke.

=== Problem
Aus dem Bauch zu entscheiden führt oft zu schwankenden Ergebnissen. Es fehlt eine klare, nachvollziehbare Methode. 
Eine einfache Daten- und ML-Pipeline kann helfen, bessere und konsistente Entscheidungen zu treffen.

=== Ziel der Arbeit
- Eine verständliche Pipeline aufbauen: Daten sammeln, aufbereiten, Merkmale (Features) bilden, Modell trainieren, Ergebnisse prüfen.
- Punkte einzelner Spieler vorhersagen und aus den Prognosen einfache Entscheidungshilfen ableiten.
- Ergebnisse so zeigen, dass Laien sie verstehen (klare Texte, klare Achsen, kurze Lesesätze zu jeder Grafik).
- Reproduzierbarkeit sicherstellen (Schritte, Datenquellen und Code sind dokumentiert).
- Grenzen ehrlich benennen (z. B. kleine Datenmenge, Modellfehler, Regeländerungen).

=== Forschungsfragen
- F1: Wie gut lassen sich FPL-Punkte mit einem einfachen, robusten ML-Modell (z. B. Random Forest) vorhersagen?
- F2: Welche Merkmale tragen am meisten zur Vorhersage bei?
- F3: Wie schlägt sich das ML-Modell gegen einfache Baselines (z. B. Durchschnitt der letzten Spiele)?
- F4: Wie bereitet man die Resultate so auf, dass Laien sie sicher lesen und verstehen?

=== Abgrenzung
- Fokus auf Punktprognosen einzelner Spieler und einfache Ableitung für Team-Entscheidungen.
- Öffentliche, frei zugängliche Daten; keine Live-Schnittstellen mit Zugangsbeschränkungen.
- Mathematik nur so tief wie nötig; im Zweifel einfache Beispiele statt Formeln.

=== Aufbau
1. Grundlagen: FPL kurz erklärt, Datenquellen, wichtige Begriffe, ML-Grundidee.  
2. Daten und Features: Datensatz, Bereinigung, Merkmalbildung, Qualität.  
3. Modell: Wahl, Training, Hyperparameter, Überanpassung (Overfitting) vermeiden.  
4. Evaluation: Baselines, Kennzahlen (z. B. MAE), Ergebnisse, Deutung.  
5. Anwendung: Von Prognosen zur Aufstellung.  
6. Grenzen und Ausblick: Was noch fehlt, was als Nächstes kommt.

=== Mini-Glossar
*Feature*: eine messbare Eingabe fürs Modell, z. B. Torschüsse pro Spiel.  
*Modell*: Verfahren, das aus Daten Regeln für Vorhersagen lernt.  
*Baseline*: einfache Vergleichsmethode, z. B. Durchschnitt der letzten 3 Spiele.  
*MAE*: mittlerer absoluter Fehler, misst die durchschnittliche Abweichung der Prognosen.  
*Overfitting*: Modell passt zu stark auf Trainingsdaten, wird auf neuen Daten schlechter.  
*Reproduzierbarkeit*: Andere können mit denselben Daten und Schritten das Ergebnis nachbauen.
]