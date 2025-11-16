# Vorgehen beim Machine-Learning-Modell

## 1. Ziel und Fragestellung

Das Ziel dieses Projekts ist es, die Punktzahl von Fussballspielern im Fantasy Premier League (FPL) Spiel vorherzusagen. Fantasy Premier League ist ein Online-Spiel, bei dem man ein virtuelles Team aus echten Premier League Spielern zusammenstellt. Die Spieler bekommen Punkte basierend auf ihrer Leistung in realen Spielen (Tore, Assists, Clean Sheets usw.). Die Herausforderung besteht darin, vorherzusagen, welche Spieler in der naechsten Spielrunde (Gameweek) am meisten Punkte erzielen werden.

Konkret soll das Machine-Learning-Modell fuer jeden Spieler eine Prognose erstellen, wie viele FPL-Punkte er in der naechsten Gameweek voraussichtlich erzielen wird. Diese Prognose dient dann als Grundlage fuer die Auswahl der besten Startaufstellung.

In der Projektvereinbarung wurde als Hypothese formuliert, dass das Modell einen mittleren absoluten Fehler (MAE) von weniger als 2 Punkten pro Spieler erreichen soll. Zusaetzlich soll das Modell besser abschneiden als einfache Baselines wie der gleitende Durchschnitt der letzten drei Spieltage (ma3) oder eine positionsbasierte Heuristik (pos). Das Gesamtziel ist es, eine datenbasierte Methode zu entwickeln, die zuverlaessiger ist als simple Faustregeln und die dabei hilft, eine erfolgreichere Aufstellung zu waehlen.

## 2. Datenbasis

Die Grundlage fuer das Training und die Evaluation des Modells bilden historische FPL-Daten aus mehreren Premier League Saisons. Diese Daten wurden hauptsaechlich aus dem oeffentlichen GitHub-Repository von vaastav/Fantasy-Premier-League bezogen. Dort sind die offiziellen FPL-Statistiken fuer vergangene Saisons systematisch gesammelt und als CSV-Dateien verfuegbar.

Im Ordner `data/` des Projekts befinden sich mehrere zusammengefuehrte Datensaetze. Die wichtigsten Dateien sind:

- **merged_gw_2022-23.csv**: Enthaelt alle Spieler-Gameweek-Daten der Saison 2022-23. Jede Zeile beschreibt die Leistung eines Spielers in einer bestimmten Gameweek.
- **merged_gw_2024-25.csv**: Entsprechende Daten fuer die Saison 2024-25 (diese Datei wird fuer neuere Vorhersagen und aktuelle Analysen verwendet).
- **2023-24_player_gw.csv**: Spieler-Gameweek-Daten fuer die Saison 2023-24, die als zusaetzliches Testfenster dienen koennen.

Jede Zeile in diesen Dateien repraesentiert einen Spieler in einer bestimmten Gameweek und enthaelt unter anderem folgende Informationen:

- **player_id** (oder element): Eindeutige Spielernummer
- **gw** (oder round): Nummer der Gameweek
- **points** (oder total_points): Tatsaechlich erzielte FPL-Punkte in dieser Gameweek
- **minutes**: Gespielte Minuten
- **position** (oder pos): Position des Spielers (GK = Torhueter, DEF = Verteidiger, MID = Mittelfeld, FWD = Stuermer)
- **team**: Verein, fuer den der Spieler spielt
- **price** (oder now_cost): Preis des Spielers im FPL-System
- **ict_index**, **influence**, **creativity**, **threat**: Vom FPL-System berechnete Leistungsindikatoren
- **was_home** (oder home): Gibt an, ob der Spieler zu Hause oder auswaerts gespielt hat

Diese Daten bieten einen detaillierten Einblick in die historische Leistung jedes Spielers ueber eine ganze Saison hinweg. Die Informationen sind bereits bereinigt und standardisiert, sodass sie direkt fuer die Feature-Berechnung und das Modelltraining verwendet werden koennen.

Ein wichtiger Punkt ist, dass die Daten streng pro Saison organisiert sind. Das bedeutet, dass fuer jede Vorhersage nur Daten aus derselben Saison verwendet werden, um sicherzustellen, dass keine Informationen aus zukuenftigen Gameweeks (Data Leakage) in die Vorhersage einfliessen. Dies wird im Code konsequent umgesetzt, indem fuer jede Gameweek nur Daten aus frueheren Gameweeks derselben Saison herangezogen werden.

## 3. Feature-Engineering

Beim Feature-Engineering werden aus den Rohdaten diejenigen Merkmale abgeleitet, die dem Modell helfen, gute Vorhersagen zu treffen. Die Idee ist, dass nicht nur die Punktzahl der letzten Woche relevant ist, sondern auch Trends ueber mehrere Wochen, die Einsatzwahrscheinlichkeit eines Spielers, die Staerke des Gegners und andere Faktoren.

Im Projekt werden folgende Features berechnet:

**Gleitende Durchschnitte (Rolling Means):**
Fuer zentrale Statistiken wie Punkte, gespielte Minuten, ict_index, influence, creativity und threat wird jeweils ein gleitender Durchschnitt ueber die letzten drei Gameweeks berechnet. Zum Beispiel wird `points_ma3` (Moving Average 3) als Durchschnitt der Punkte aus den letzten drei Spielen vor der aktuellen Gameweek ermittelt. Wichtig ist dabei, dass diese Durchschnitte immer aus vergangenen Daten gebildet werden. Im Code wird dies durch `shift(1)` sichergestellt, sodass die aktuelle Gameweek nicht in die Berechnung einfliesst (kein Data Leakage).

**Heim/Auswaerts-Indikator:**
Ein Spieler spielt entweder zu Hause oder auswaerts. Dies wird als binäres Merkmal kodiert: 1 fuer Heimspiel, 0 fuer Auswaertsspiel. Heimspiele koennen statistisch gesehen zu mehr Punkten fuehren, daher ist diese Information wertvoll.

**Gegnerstärke:**
Falls verfuegbar, wird die Staerke des gegnerischen Teams als numerisches Feature (`opponent_strength`) einbezogen. Ein starker Gegner bedeutet in der Regel weniger Chancen auf Punkte, ein schwacher Gegner mehr. Wenn diese Information fehlt, wird ein neutraler Standardwert (z.B. 3.0) angenommen.

**Interaktionsterme:**
Manchmal kombiniert man Features miteinander, um Zusammenhaenge besser zu erfassen. Ein Beispiel ist `minutes_x_ict`, das Produkt aus den durchschnittlichen Minuten und dem durchschnittlichen ict_index. Dieses Feature soll abbilden, dass Spieler, die regelmaessig viel spielen und dabei gute Leistungswerte haben, besonders wertvoll sind.

**Position als Kategorie:**
Die Spielerposition (GK, DEF, MID, FWD) wird entweder als kategorisches Feature direkt verwendet oder ueber One-Hot-Encoding in binaere Variablen umgewandelt (z.B. `pos_GK`, `pos_DEF` usw.). So kann das Modell lernen, dass verschiedene Positionen unterschiedliche typische Punktzahlen haben.

Alle Features werden pro Spieler und Gameweek berechnet. Spieler, die zu wenig Einsatzzeit hatten (zum Beispiel weniger als eine bestimmte Mindest-Minutenzahl), koennen gefiltert werden, um die Datenqualitaet zu erhoehen. Ziel des Feature-Engineerings ist es, dem Modell moeglichst aussagekraeftige und zuverlaessige Informationen zu geben, damit es Muster in den Daten erkennen und auf zukuenftige Gameweeks uebertragen kann.

## 4. Modellwahl und Varianten

Als Hauptmodell fuer die Vorhersage der FPL-Punkte wird ein **Random Forest Regressor** verwendet. Ein Random Forest ist ein Ensemble-Verfahren, das viele Entscheidungsbaeume trainiert und deren Vorhersagen zu einer gemeinsamen Prognose kombiniert. Random Forests sind robust gegenueber Ausreissern, koennen komplexe nichtlineare Zusammenhaenge lernen und arbeiten gut mit gemischten Features (numerisch und kategorial).

Der Grundgedanke ist folgender: Jeder Baum im Forest lernt auf einer leicht unterschiedlichen Teilmenge der Daten und trifft eigenstaendige Entscheidungen. Die finale Vorhersage ist dann der Durchschnitt aller Baeume. Dadurch wird das Risiko von Overfitting (Ueberanpassung an die Trainingsdaten) reduziert und die Vorhersage wird stabiler.

Im Projekt werden mehrere Varianten des Modells eingesetzt und verglichen:

**rf (Random Forest Baseline):**
Dies ist die einfachste Variante, ein Standard-Random-Forest-Modell, das auf allen Positionen gleich arbeitet. Es nutzt die Rolling Features und andere berechnete Merkmale, um die Punkte zu prognostizieren. Die Hyperparameter (z.B. Anzahl der Baeume, maximale Tiefe der Baeume) sind auf Standardwerte oder leicht optimierte Werte gesetzt.

**rf_pos (Positionsspezifisches Random Forest):**
Diese Variante trainiert nicht nur ein Modell fuer alle Spieler, sondern fuer jede Position (GK, DEF, MID, FWD) ein eigenes Modell. Der Vorteil ist, dass jedes Modell speziell auf die Charakteristiken seiner Position abgestimmt werden kann. Stuermer (FWD) und Verteidiger (DEF) haben unterschiedliche Punkteverteilungen und Einflussfaktoren. Daher wurden fuer FWD und DEF gezielt optimierte Hyperparameter verwendet (z.B. `n_estimators=100`, `max_depth=4`, `min_samples_leaf=3`), waehrend fuer MID und GK die Standardeinstellungen beibehalten wurden, da dort keine robuste Verbesserung durch Tuning nachgewiesen werden konnte. Diese bewusste Auswahl verhindert Overfitting und erhoht die Gesamtqualitaet des Systems.

**rf_rank (Random Forest mit Ranking-Optimierung):**
Ein Problem bei der Vorhersage ist, dass nicht nur der absolute Fehler (MAE) wichtig ist, sondern auch die Rangfolge der Spieler. Fuer die Aufstellung zaehlt vor allem, welche Spieler am besten abschneiden werden, also wer auf den obersten Raengen landet. Die Variante `rf_rank` versucht, genau diese Rangfolge zu verbessern. Sie nutzt aehnliche Features wie rf und rf_pos, legt aber besonderen Wert auf die Spearman-Korrelation, ein Mass dafuer, wie gut die vorhergesagte Reihenfolge mit der tatsaechlichen uebereinstimmt. Auch wenn der MAE hier leicht niedriger ist, bleibt die Spearman-Korrelation eine Herausforderung, was darauf hindeutet, dass Random Forests nicht direkt auf Ranking optimieren, sondern primaer auf Punktgenauigkeit.

Neben den Random-Forest-Modellen werden auch einfache **Baselines** verwendet, um die Leistung der Machine-Learning-Modelle einzuordnen:

**ma3 (Moving Average 3):**
Diese Baseline nimmt einfach den Durchschnitt der Punkte aus den letzten drei Gameweeks eines Spielers als Vorhersage. Sie ist sehr einfach, aber ueberraschend effektiv, weil sie die kurzfristige Form abbildet.

**pos (Positionsbasierte Heuristik):**
Hier wird der Durchschnitt der Punkte aller Spieler derselben Position ueber die letzten fuenf Gameweeks berechnet. Diese Baseline ignoriert individuelle Spielerunterschiede und nutzt nur die durchschnittliche Leistung der Position.

Die Baselines dienen als Vergleichsmassstaebe. Wenn das Random-Forest-Modell nicht besser abschneidet als diese einfachen Methoden, waere es nicht sinnvoll, ein komplexes Modell zu verwenden. Tatsaechlich zeigen die Evaluationsergebnisse, dass rf und ma3 oft aehnliche MAE-Werte erreichen, waehrend pos in manchen Faellen sogar leicht besser ist. Dies unterstreicht, dass die Wahl des richtigen Features und die korrekte Validierung wichtiger sind als komplexe Modelle allein.

## 5. Trainings- und Validierungssetup

Das Trainings- und Validierungssetup folgt einer strikten zeitlichen Trennung, um realistische Bedingungen zu simulieren. Das bedeutet, dass die Daten chronologisch aufgeteilt werden: Fruehe Gameweeks dienen zum Training, spaetere Gameweeks zum Testen.

**Zeitbasierte Aufteilung:**
Fuer die Evaluation wird typischerweise ein bestimmtes Testfenster gewaehlt, zum Beispiel Gameweek 30 bis 38 der Saison 2022-23. Alle Daten vor Gameweek 30 werden zum Training verwendet. Das Modell lernt also nur aus den ersten 29 Gameweeks und wird dann auf die verbleibenden 9 Gameweeks getestet. Diese Methode ist realistischer als eine zufaellige Aufteilung, weil sie die tatsaechliche Anwendung widerspiegelt: Man trainiert auf vergangenen Daten und sagt die Zukunft voraus.

**Metriken zur Bewertung:**
Um die Qualitaet der Vorhersagen zu messen, werden drei Metriken verwendet:

- **MAE (Mean Absolute Error)**: Der mittlere absolute Fehler gibt an, um wie viele Punkte die Vorhersage im Durchschnitt von der Realitaet abweicht. Ein MAE von 1.4 bedeutet, dass die Prognose im Schnitt um 1.4 Punkte daneben liegt. Je kleiner der MAE, desto besser.

- **RMSE (Root Mean Squared Error)**: Der RMSE gewichtet grosse Fehler staerker als der MAE, weil die Abweichungen quadriert werden, bevor man den Durchschnitt bildet. Ein hoher RMSE im Vergleich zum MAE weist auf vereinzelte grosse Ausreisser hin.

- **Spearman-Korrelation (ρ)**: Dieses Mass bewertet die Rangfolge der Vorhersagen. Ein Wert nahe 1 bedeutet, dass die vorhergesagte Reihenfolge gut mit der tatsaechlichen uebereinstimmt. Ein Wert nahe 0 oder negativ bedeutet, dass die Rangfolge praktisch zufaellig ist. Die Spearman-Korrelation ist wichtig fuer die Teamauswahl, weil es darauf ankommt, welche Spieler auf den Top-Plaetzen landen.

**Evaluation mit evaluate.py:**
Das Skript `code/evaluate.py` fuehrt die Evaluation systematisch durch. Es laedt die Daten, berechnet Baselines und Modellvorhersagen fuer jede Gameweek im Testfenster und vergleicht diese mit den tatsaechlichen Punkten. Die Ergebnisse werden als Tabellen und Grafiken gespeichert. So kann man auf einen Blick sehen, wie sich rf, ma3 und pos schlagen.

**Hyperparameter-Tuning:**
Fuer rf_pos wurden die Hyperparameter fuer bestimmte Positionen gezielt optimiert. Hyperparameter sind Einstellungen des Random Forest, zum Beispiel die Anzahl der Baeume (`n_estimators`), die maximale Tiefe der Baeume (`max_depth`) oder die minimale Anzahl von Beispielen pro Blatt (`min_samples_leaf`). Durch systematisches Ausprobieren (Tuning) findet man heraus, welche Werte die beste Balance zwischen Genauigkeit und Stabilitaet bieten. Im Projekt wurde Tuning fuer FWD und DEF durchgefuehrt und die Verbesserungen uebernommen. Fuer MID und GK wurde bewusst auf Tuning verzichtet, da keine stabilen Verbesserungen erzielt werden konnten. Diese Entscheidung verhindert, dass das Modell durch uebermaessiges Tuning auf Testdaten ueberangepasst wird.

Insgesamt sorgt dieses Setup dafuer, dass die Modellleistung fair und realistisch bewertet wird. Die strikte zeitliche Trennung und die Verwendung mehrerer Metriken geben ein umfassendes Bild davon, wie gut das Modell in der Praxis funktionieren wuerde.

## 6. Backtesting und Teamoptimierung

Waehrend die bisherigen Schritte sich auf die Vorhersage einzelner Spieler konzentrieren, geht es im Backtesting darum, diese Vorhersagen in eine konkrete Aufstellung umzusetzen und zu bewerten, wie gut das daraus resultierende Team abschneidet.

**Von Prognosen zur Aufstellung:**
Das Skript `team_backtest.py` simuliert den Prozess der Teamauswahl. Fuer jede Gameweek im Testfenster laedt es die Vorhersagen (z.B. aus `predictions_gw30_rf.json`) und die tatsaechlichen Punkte der Spieler. Dann wird aus den vorhergesagten Punkten eine Aufstellung gebildet.

**15er Kader und Startelf:**
In FPL hat man einen Kader von 15 Spielern: 2 Torhueter (GK), 5 Verteidiger (DEF), 5 Mittelfeldspieler (MID) und 3 Stuermer (FWD). Aus diesen 15 Spielern waehlt man jede Woche eine Startelf (11 Spieler), die in einer gueltigen Formation aufgestellt werden muss. Gueltige Formationen sind zum Beispiel 3-4-3, 4-4-2 oder 5-3-2 (Verteidiger-Mittelfeld-Stuermer).

Im Backtest wird zunaechst ein Kandidatenpool aus den besten Spielern pro Position gebildet (Top 2 GK, Top 5 DEF, Top 5 MID, Top 3 FWD nach vorhergesagten Punkten). Aus diesem Pool wird dann die beste Startelf ausgewaehlt, die eine gueltige Formation ergibt und die FPL-Regel respektiert, dass maximal 3 Spieler vom selben Verein in der Startelf stehen duerfen.

**Captain-Auswahl:**
In FPL kann man einen Spieler zum Captain ernennen, der dann doppelte Punkte bekommt. Im Backtest wird der Spieler mit der hoechsten vorhergesagten Punktzahl als Captain gewaehlt. Das bedeutet, wenn der Captain 10 Punkte erzielt, zaehlen diese als 20 Punkte fuer das Team. Die Wahl des richtigen Captains ist daher entscheidend fuer den Erfolg.

**Vereinfachungen im Backtest:**
Das aktuelle Backtesting-Setup ist bewusst vereinfacht. Es gibt kein vollstaendiges Budgetmodell, das heisst, es wird nicht beruecksichtigt, dass jeder Spieler einen bestimmten Preis hat und man nur ein begrenztes Gesamtbudget zur Verfuegung hat. Ausserdem werden Transfers (Spielerwechsel von Woche zu Woche) und Autosubs (automatischer Ersatz von Spielern, die nicht spielen) nicht vollstaendig simuliert. Diese Vereinfachungen machen das Backtest schneller und einfacher, bedeuten aber auch, dass die realen Teamresultate bei voller Nutzung aller FPL-Features moeglicherweise anders ausfallen wuerden.

**Bewertung der Teamleistung:**
Fuer jede Gameweek wird die Gesamtpunktzahl des Teams (Startelf plus Captain-Bonus) berechnet. Diese Werte werden ueber alle Testwochen gemittelt und verglichen. So kann man sehen, ob rf im Durchschnitt mehr Teampunkte pro Gameweek liefert als ma3 oder pos. Die Ergebnisse werden als Tabelle und Grafik ausgegeben, um die Unterschiede zwischen den Methoden anschaulich zu machen.

**Vergleich mit Baselines:**
Neben den Modellmethoden werden auch Team-Baselines definiert, zum Beispiel B1 und B2, die auf einfachen Regeln basieren. Diese Baselines dienen wieder als Referenz, um zu pruefen, ob die Machine-Learning-Ansaetze tatsaechlich einen Mehrwert bieten.

Das Backtesting ist ein wichtiger Schritt, um zu verstehen, wie sich die Vorhersagequalitaet in der Praxis auswirkt. Ein Modell kann einen niedrigen MAE haben, aber wenn es die falschen Spieler fuer die Startelf auswaehlt, nuetzt das wenig. Umgekehrt kann ein Modell mit leicht hoeherem MAE trotzdem bessere Teamresultate liefern, wenn es die richtigen Top-Spieler identifiziert.

## 7. Grenzen und Limitationen

Obwohl das Projekt ein funktionierendes System zur Vorhersage und Teamoptimierung entwickelt hat, gibt es mehrere Einschraenkungen, die beruecksichtigt werden muessen.

**Datenqualitaet und Verfuegbarkeit:**
Die Daten stammen aus oeffentlichen Quellen und sind zwar umfassend, aber nicht perfekt. Manche Informationen wie detaillierte Verletzungsberichte, Trainingsleistung oder taktische Aenderungen durch den Trainer sind nicht in den Daten enthalten. Das Modell kennt diese Faktoren nicht und kann sie daher nicht beruecksichtigen. Wenn ein wichtiger Spieler kurzfristig verletzt ausfaellt oder ein neuer Trainer eine andere Taktik einfuehrt, kann das die tatsaechlichen Punkte stark beeinflussen, ohne dass das Modell davon weiss.

**Keine explizite Modellierung von Verletzungen und News:**
Verletzungen und aktuelle News sind entscheidend fuer FPL-Entscheidungen. Ein Spieler, der laut Prognose top ist, aber kurz vor dem Spiel ausfaellt, bringt null Punkte. Im aktuellen Projekt werden solche Informationen nicht automatisch einbezogen. Das bedeutet, dass die Vorhersagen immer mit aktuellen News abgeglichen werden muessen, bevor man sie nutzt.

**Vereinfachtes Budgetmodell im Backtest:**
In echtem FPL hat jeder Spieler einen Preis und man muss mit einem begrenzten Budget haushalten. Das Backtest im Projekt ignoriert das Budget weitgehend, was bedeutet, dass die simulierte Aufstellung moeglicherweise unrealistisch teuer waere. Ebenso werden Transfers (man darf pro Woche nur begrenzt Spieler wechseln) und Autosubs (Ersatzspieler ruecken nach, wenn ein Starter nicht spielt) nicht vollstaendig abgebildet. Diese Vereinfachungen machen das Backtest weniger realistisch, aber auch einfacher zu implementieren und zu verstehen.

**Random Forest optimiert nicht direkt auf Ranking:**
Random Forests sind darauf ausgelegt, den durchschnittlichen Fehler der Punktvorhersage zu minimieren, nicht die Rangfolge der Spieler. Daher sind die Spearman-Korrelationswerte in der Evaluation oft niedrig. Das bedeutet, dass das Modell zwar den Punktewert gut schaetzt, aber nicht zwingend die Top-Spieler richtig identifiziert. Dies erklaert, warum einfache Baselines manchmal aehnlich gut oder sogar besser abschneiden. Eine moegliche Verbesserung waere der Einsatz von Learning-to-Rank Algorithmen, die speziell auf Rangfolgen trainiert werden.

**Overfitting und Generalisierung:**
Bei der Hyperparameter-Optimierung besteht immer die Gefahr, dass man das Modell zu sehr auf die Testdaten anpasst (Overfitting). Im Projekt wurde deshalb bewusst nur fuer bestimmte Positionen (FWD, DEF) Tuning betrieben und die Ergebnisse kritisch geprueft. Fuer MID und GK wurde auf Tuning verzichtet, weil keine stabilen Verbesserungen nachweisbar waren. Diese Vorsicht hilft, die Generalisierungsfaehigkeit des Modells zu erhalten.

**Saisonale Schwankungen und kleine Datenbasis:**
Die Premier League hat nur etwa 38 Gameweeks pro Saison. Das Testfenster von 9 Gameweeks ist relativ klein, was bedeutet, dass einzelne unvorhersehbare Ereignisse (z.B. ein ueberraschender Hattrick oder eine Verletzung) die Ergebnisse stark beeinflussen koennen. Die statistischen Aussagen haben daher eine gewisse Unsicherheit.

**Reflexion und Ausblick:**
Diese Limitationen werden in der schriftlichen Maturaarbeit im Kapitel Reflexion und Fazit ausfuehrlich diskutiert. Sie sind kein Zeichen fuer ein schlechtes Projekt, sondern Teil der ehrlichen wissenschaftlichen Arbeit. Jedes Modell hat Grenzen, und es ist wichtig, diese transparent zu machen. Zukuenftige Verbesserungen koennten eine Integration von Live-News, ein realistisches Budgetmodell oder den Einsatz spezialisierter Ranking-Algorithmen umfassen.
