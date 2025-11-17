# Analyse zum Thema Ranking im FPL-Projekt

## Was bedeutet Ranking im FPL?
Im Fantasy Premier League (FPL) geht es darum, Spieler in eine Reihenfolge zu bringen. Man will wissen, welcher Spieler besser ist als ein anderer. Das hilft bei der Auswahl der besten Spieler für die Aufstellung und für die Wahl des Captains.

## Warum ist ein Random Forest nicht speziell für Ranking gemacht?
Ein Random Forest Modell berechnet Werte, die den Fehler (MAE) zwischen Vorhersage und echtem Wert möglichst klein machen. Es achtet aber nicht darauf, ob die Reihenfolge der Spieler stimmt. Das Ranking ist also nicht direkt optimiert.

## Warum ist Spearman wichtig?
Der Spearman Wert zeigt, wie gut die Reihenfolge der Spieler stimmt. Für die Aufstellung und die Captainwahl ist die richtige Reihenfolge wichtiger als der genaue Wert. Ein gutes Ranking hilft, die besten Spieler zu finden.

## Beobachtung: Spearman Werte sind tiefer
In den Ergebnissen sieht man oft, dass der MAE gut aussieht, aber die Spearman Werte sind tiefer. Das bedeutet, das Modell sagt die Werte gut voraus, aber die Reihenfolge der Spieler stimmt nicht immer.

## Varianten im Projekt
- **rf_pos**: Hier werden Modelle für jede Position gemacht (Torwart, Verteidiger, Mittelfeld, Stürmer). Das soll helfen, die Spieler besser zu vergleichen.
- **rf_rank**: Hier wird die Rangordnung direkt berechnet. Die Werte werden in eine Reihenfolge gebracht, bevor das Modell trainiert wird.

## Fazit
Diese Methoden verbessern das Ranking nicht stark, aber sie zeigen das Problem klar. Für ein besseres Ranking müsste man in Zukunft auch die Minuten, Verletzungen und die Stärke des Gegners genauer modellieren.

Diese Analyse ist für Lehrpersonen und Mitschüler geschrieben, die kein Wissen über Machine Learning haben. Sie kann direkt in die schriftliche Arbeit übernommen werden.# Analyse zum Thema Ranking im FPL-Projekt

