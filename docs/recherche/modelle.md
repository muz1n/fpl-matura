# ML-Modelle für die Prognose von FPL-Spielerpunkten

## Ziel der Recherche

Ziel dieser Recherche war es herauszufinden, welche Arten von Machine-Learning-Modellen für die Vorhersage von Spielerpunkten in der Fantasy Premier League (FPL) eingesetzt werden können. Dabei ging es nicht nur um die Modellarten selbst, sondern auch darum, wie aufwändig ihre Anwendung ist, welche Vor- und Nachteile sie haben und welches Modell am besten zu diesem Projekt passt.

## Ergebnisse und Einordnung

Ich habe drei Haupttypen von Modellen gefunden, die in bisherigen FPL-Projekten verwendet wurden:

1. **Ensemble-Modelle** (z. B. Random Forest, XGBoost):  
   Diese bestehen aus vielen Entscheidungsbäumen, die zu einem Gesamtergebnis kombiniert werden. Sie funktionieren gut mit kleineren bis mittelgrossen Datensätzen, sind relativ einfach zu trainieren und liefern stabile Ergebnisse. Ein grosser Vorteil ist die sogenannte *Feature Importance*: Das Modell zeigt, welche Eingabedaten besonders entscheidend für die Vorhersage waren.  
   Eine Schwäche ist, dass Ensemble-Modelle keine zeitlichen Abfolgen (wie Formverläufe) direkt erfassen können. Zudem können sie bei schlecht gewählten Features überangepasst (overfitted) sein oder nicht flexibel genug für komplexe Zusammenhänge.

2. **Neuronale Netze** (z. B. MLP, LSTM, CNN):  
   Diese Modelle können sehr komplexe Muster erkennen, z. B. wie sich die Leistung eines Spielers über mehrere Spieltage hinweg entwickelt. Besonders LSTMs sind dafür geeignet, da sie mit Sequenzen arbeiten können.  
   Der Nachteil ist der hohe Aufwand: Man braucht mehr Daten, längere Trainingszeiten und oft auch eine GPU. Zusätzlich sind die Modelle schwer zu interpretieren. Wenn das Ergebnis schlechter als erwartet ist, ist es deutlich schwieriger zu verstehen, woran es lag. Für ein Projekt mit begrenzter Zeit und kleinem Datensatz ist das ein grosses Risiko.

3. **Modelle mit zusätzlichen Datenquellen** (z. B. News, Social Media):  
   Diese Modelle kombinieren FPL-Daten mit externen Informationen wie Verletzungsnews oder Meinungen aus sozialen Netzwerken. Ein Beispielprojekt, das so gearbeitet hat, kam in die Top 0.5 % aller FPL-Spieler. Die Integration dieser Daten ist aber technisch sehr anspruchsvoll. Man muss die Texte verarbeiten (NLP), passende Datenquellen finden und diese mit dem restlichen Datensatz kombinieren. Für ein Maturaprojekt ist dieser Weg nur dann machbar, wenn man viel Zeit und Erfahrung hat.

Nach allem, was ich recherchiert habe, ist Random Forest die sinnvollste Wahl für mein Projekt. Mein Datensatz ist relativ klein und Random Forest kann damit gut umgehen. Ich kann es lokal auf meinem Laptop oder PC trainieren, ohne GPU oder Cloud. Die Trainingszeit ist kurz, und die Ergebnisse lassen sich nachvollziehbar erklären. Ausserdem kann ich mit Feature Importance zeigen, welche Eingabedaten wichtig waren. Das ist besonders nützlich für die Analyse im schriftlichen Teil der Arbeit. Auch andere Projekte, die erfolgreich waren, haben Random Forest oder XGBoost verwendet.  
XGBoost wäre eventuell ein nächster Schritt, wenn ich Zeit habe. Es braucht aber mehr Tuning und reagiert empfindlicher auf falsche Einstellungen. Für den Einstieg ist Random Forest deshalb besser geeignet.

Ich habe drei grundsätzliche Modelltypen verglichen. Neuronale Netze und komplexe Hybridmodelle sind zwar leistungsfähig, aber in meinem Fall zu aufwändig und riskant. Ensemble-Modelle wie Random Forest bieten eine gute Balance aus Genauigkeit, Einfachheit und Erklärbarkeit. Deshalb wähle ich Random Forest als mein erstes Modell. Es ist stabil, leicht umzusetzen und passt gut zum Umfang dieses Projekts. Falls später noch Zeit ist, kann ich XGBoost oder ein neuronales Netz zum Vergleich ergänzen.
