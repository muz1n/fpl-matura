# Baselines

## Was ist eine Baseline und warum brauche ich sie
Eine Baseline dient als Referenzpunkt. Wenn mein Verfahren besser ist als diese Referenz, kann ich zeigen, dass meine Arbeit einen echten Mehrwert bringt und nicht nur zufällig gut aussieht.

Ohne Baseline ist eine einzelne Fehlerzahl schwer einzuordnen. Beispiel, ein MAE von 1.8 Punkten klingt gut oder schlecht, je nachdem womit ich vergleiche. Mit Baselines habe ich eine klare Messlatte.

---

## Warum ich zwei Ebenen messe

Mein Projekt hat zwei getrennte Ergebnisse, die ich klar und fair bewerte: die **Punktprognosen pro Spieler** und die **Team-Auswahl unter FPL-Regeln**. Ich trenne das, weil eine gute Einzelprognose nicht automatisch ein gutes Team ergibt und umgekehrt.

### Ebene 1: Spieler-Prognosen (Punkte pro Spieler)
- **Was ich messe:** die mittlere absolute Abweichung (MAE) pro Spieler, zusätzlich getrennt nach Positionen, über eine definierte Testspanne von Spielwochen.
- **Wie ich vergleiche:** Ich stelle meinen MAE den MAEs der Spieler-Baselines A1 (Vorjahr p90 mit Minuten-Anpassung) und A2 (Rolling p90) gegenüber.
- **Ziel:** Mein MAE ist kleiner als der der Baselines. So zeige ich, dass meine Punktprognosen pro Spieler genauer sind als sehr einfache Referenzen.

### Ebene 2: Team-Auswahl (regelkonformes Team aus den Prognosen)
- **Gemeinsame Regeln (fair für alle Teams):** Ich wende die **offiziellen FPL-Regeln** in der jeweils gültigen Fassung an (Kadergrösse, positionsbezogene Limits, Club-Limits, Budget, erlaubte Formationen, Bench-/Captain-Logik usw.). Damit ist der Vergleich fair, weil alle Teams unter denselben **offiziellen** Rahmenbedingungen erzeugt und bewertet werden.
- **Formation aktuell:** Ich nutze **fest 3-5-2**, weil ich die automatische Formationswahl noch nicht implementiert habe. 3-5-2 gilt laut gängiger Praxis als starke Startformation und ist daher eine transparente Annahme für den Start.
- **Geplante Erweiterung:** Die **beste Formation soll künftig automatisch mitgewählt** werden. Dafür werde ich die zulässigen Formationen systematisch prüfen und die Auswahl in die Optimierung einbauen, damit die Formation kein fixer Parameter mehr ist.
- **Was ich messe:** die **realen Team-Punkte pro Spielwoche** für mein Modell-Team.
- **Wie ich vergleiche:** Ich vergleiche die Punkte meines Modell-Teams mit den Punkten der Team-Baselines B1 (Preis+Ownership+p90_last, mein Cold-Start-Prototyp) und B2 (Value p90_last pro Preis), über dieselbe Testspanne und unter denselben Regeln.
- **Ziel:** Mein Team holt im Durchschnitt **mehr Punkte** als die Baseline-Teams. So zeige ich, dass meine Auswahl auf Basis der Prognosen einen echten Mehrwert liefert.

### Warum diese Trennung wichtig ist
Regeln, Budget, Club-Limits und Positionsvorgaben machen die Team-Auswahl zu einem eigenen Problem. Ein niedriger MAE nützt wenig, wenn die Rangfolge der relevanten Spieler nicht gut genug ist oder die Regeln die beste Kombination verhindern. Umgekehrt kann eine einfache Team-Heuristik kurzfristig gut treffen, obwohl die Einzelprognosen nicht perfekt sind. Darum messe ich **beide Ebenen getrennt** und unter **einheitlichen, fairen Bedingungen**.

---

## Warum mehrere Baselines pro Ebene
Ich wähle pro Ebene genau zwei Baselines, die unterschiedliche Gedanken abdecken.

- Bei **Spielern** will ich eine langfristige Sicht auf Leistung und eine kurzfristige Formsicht.  
- Bei **Teams** will ich eine regelbasierte Bauchlogik, die ich in meinem Cold-Start tatsächlich genutzt habe, und eine einfache Effizienzsicht auf Preis und Leistung.

Mehr Baselines füge ich nur hinzu, wenn sie eine neue, deutlich andere Sicht bringen, zum Beispiel Quoten. Zu viele Baselines würden die Auswertung aufblähen, ohne neue Erkenntnisse.

---

## Ebene A: Spieler-Baselines

### A1. Vorjahr p90 mit Minuten-Anpassung
**Idee**  
Ich nehme Punkte pro 90 Minuten aus der Vorsaison und passe für die Zielwoche die erwartete Einsatzzeit an. So verbinde ich eine langfristige Leistungszahl mit einer realistischen Spielzeit.

**Begriffe**  
- **p90** bedeutet Punkte pro 90 Minuten.  
- **Minuten-Anpassung** bedeutet, dass ich nicht automatisch 90 Minuten ansetze, sondern die voraussichtliche Einsatzzeit schätze.

**Formel**  
1. `p90_last = (total_points_last_season / minutes_last_season) * 90`  
2. `expected_minutes = Durchschnitt der letzten 3 Einsätze dieser Saison, begrenzt auf 0 bis 90`  
3. `baseline_points = p90_last * expected_minutes / 90`

**Warum diese Baseline sinnvoll ist**  
- Sie ist extrem einfach und sofort prüfbar.  
- Vorjahr liefert eine robuste Näherung an die Spielstärke des Spielers.  
- Die Minuten-Anpassung verhindert, dass Bankspieler künstlich hoch wirken.

**Bezug zu meinem Code**  
- In `mvp_picker.py` nutze ich **p90_last** bereits als Teil meiner Cold-Start-Heuristik.  
- Hier definiere ich p90_last bewusst als eigenständige Referenz für Punktprognosen, unabhängig von der Teamwahl.

**Grenzen und Fallbacks**  
- Rollenwechsel und Verletzungen werden vom Vorjahr schlecht erfasst.  
- Wenn zu wenige aktuelle Einsätze vorhanden sind, setze ich einen neutralen Fallback, zum Beispiel `expected_minutes = 60`. Diesen Fallback protokolliere ich in der Evaluation, damit klar ist, wie oft er gebraucht wurde.

---

### A2. Rolling p90 aus den letzten Spielen
**Idee**  
Ich bilde eine sehr einfache Formschätzung aus den letzten Spielen und passe wieder die Spielzeit an.

**Formel**  
1. Fenster `r = 3` Spiele. Wenn nur 1 oder 2 Spiele vorhanden sind, nutze ich, was da ist.  
2. `p90_roll = Durchschnitt der Punkte pro 90 im Fenster r`  
3. `expected_minutes = Durchschnitt der Minuten im Fenster r, begrenzt auf 0 bis 90`  
4. `baseline_points = p90_roll * expected_minutes / 90`

**Warum diese Baseline sinnvoll ist**  
- Sie bildet kurzfristige Form ab, ohne Vorjahresdaten zu brauchen.  
- Sie ist genauso transparent wie A1 und schnell nachzurechnen.

**Grenzen und Fallbacks**  
- Bei kleinem Fenster rauscht die Schätzung stärker.  
- Früh in der Saison ist sie instabil. Ich dokumentiere, wie oft das Fenster weniger als 3 Einsätze hat.

**Umsetzung**  
- Ich rechne diese Baseline zentral in `code/evaluate.py`, damit sie unter denselben Regeln wie das Modell ausgewertet wird.

---

## Ebene B: Team-Baselines

### Gemeinsame Regeln (FPL) und Formationswahl

- **Regelrahmen:** Ich wende die **offiziellen FPL-Regeln** in der jeweils gültigen Fassung an (Kadergrösse, Budget, Club-Limits, Positionsvorgaben, erlaubte Formationen, Bench-/Captain-Logik). So sind alle Teams unter denselben offiziellen Bedingungen vergleichbar.
- **Formationswahl durch Algorithmus:** Ich prüfe **alle von FPL erlaubten Formationen**. Für jede Formation baue ich ein Team nach denselben Regeln und berechne die **erwartete Team-Punktzahl**. Ich wähle die Formation mit dem höchsten erwarteten Wert.  
  *Deterministischer Tie-Break:* Bei exakt gleicher Punktzahl entscheide ich stabil (z. B. zuerst höherer prognostizierter Einzelwert, dann tiefere Spieler-ID), damit Ergebnisse reproduzierbar sind.
- **Captain/Bench (einheitlich):** Captain ist der Spieler mit der höchsten prognostizierten Punktzahl, Vice-Captain der zweitbeste; Bench-Reihenfolge richte ich nach den Prognosen, ebenfalls deterministisch. Diese einfachen Regeln gelten für **alle** Teams gleich.
- **Aktueller Stand:** Solange die automatische Formationswahl noch nicht fertig ist, setze ich **3-5-2** als transparente Startannahme. In der Evaluation kennzeichne ich klar, ob 3-5-2 fix war oder die Formationswahl aktiv war, damit alle Vergleiche fair und nachvollziehbar bleiben.
- **Auswahlverfahren (derzeit):** Ich nutze einen einfachen **Greedy-Prozess**: Ich gehe eine sortierte Liste (nach Score/Prognose) von oben nach unten durch, prüfe Budget und Club-Limits und fülle zuerst die Pflichtpositionen. Die gleiche Logik nutze ich sowohl für mein Modell-Team als auch für die Team-Baselines.

> **Fairness-Hinweis:** Die **genau gleiche** Regellogik (FPL-Rahmen, Formationsprüfung bzw. 3-5-2-Fix, Greedy, Captain/Bench, Tie-Breaks) gilt für mein Modell-Team **und** die Team-Baselines B1 und B2. Nur so ist der Vergleich sauber.


---

### B1. Preis plus Ownership plus p90_last (mein Cold-Start-Prototyp)
**Idee**  
Ich kombiniere drei einfache Signale in einen Score: Preis-Perzentil, Ownership-Perzentil, p90_last-Perzentil. Daraus wähle ich das Team unter den Regeln.

**Score**  
1. `preis_pct`, `ownership_pct`, `p90_last_pct` sind pro Position auf Werte zwischen 0 und 1 skaliert.  
2. `hybrid_score = 0.4 * preis_pct + 0.3 * ownership_pct + 0.3 * p90_last_pct`

**Teamwahl**  
Ich sortiere nach `hybrid_score` absteigend und wähle greedy ein Team nach den gemeinsamen Regeln.

**Bezug zu meinem Code**  
- Das ist meine reale, früh genutzte Heuristik aus dem Cold-Start in `mvp_picker.py`.  
- Ich nehme sie als Team-Baseline, weil sie meinen ersten funktionierenden Ansatz zur Teamfindung darstellt.

**Warum ich genau diese Heuristik und nicht Alternativen nehme**  
- Nur Preis ignoriert Leistung und Hype.  
- Nur Ownership spiegelt Hype und FOMO, ist aber nicht kausal.  
- Nur p90_last ignoriert Budget und Verteilung.  
Die Kombination ist eine einfache, aber realistische Manager-Logik, die ich tatsächlich verwendet habe. Darum ist sie eine faire Baseline.

**Grenzen**  
- Ownership folgt Trends und kann in die Irre führen.  
- Der Score ist kein Punktewert. Ich vergleiche hier nur reale Team-Punkte pro Spielwoche.

---

### B2. Value p90_last pro Preis
**Idee**  
Ich bewerte die Budgeteffizienz. Je mehr p90_last pro Preis, desto attraktiver ist der Spieler.

**Score und Teamwahl**  
1. `value = p90_last / preis_mio`  
2. Sortieren nach `value` absteigend und greedy wählen unter denselben Regeln.

**Bezug zu meinem Code**  
- Ich setze diese Baseline in `code/evaluate.py` um, parallel zur Hybrid-Heuristik.

**Warum diese Baseline sinnvoll ist**  
- Sie ist glasklar und leicht prüfbar.  
- Sie betont eine häufige Manager-Frage, hole ich mehr Punkte für weniger Budget.

**Grenzen und Fallbacks**  
- p90_last verzerrt bei sehr wenigen Vorjahres-Minuten.  
- Ich setze eine Mindestminute im Vorjahr, zum Beispiel 900. Liegt ein Spieler darunter, reduziere ich seinen p90_last anteilig, zum Beispiel `p90_last_adj = p90_last * (minutes_last_season / 900)` bis maximal 1. So bleiben Spieler mit wenigen Vorjahresminuten realistisch eingeordnet.

---

## Einheitliche Auswertung und Fairness
Damit die Vergleiche fair sind, berechne ich alles zentral über `code/evaluate.py`. Das hat drei Vorteile.

1) **Gleiche Datenbasis**  
   Alle Methoden sehen dieselben Features und dieselbe Zielwoche. Es gibt keinen versteckten Vorteil für eine Methode.

2) **Gleiche Zeitlogik**  
   Ich trainiere immer bis zur Vorwoche und teste in der Zielwoche. So gibt es keine Leaks durch Zukunftsdaten. Das gilt auch, wenn ein Script intern eine eigene Baseline berechnet. Für den Vergleich zählt nur, was über `evaluate.py` unter denselben Bedingungen gerechnet wird.

3) **Gleiche Metriken und Berichte**  
   Spieler-Baselines bewerte ich mit MAE pro Spieler und zusätzlich pro Position.  
   Team-Baselines bewerte ich mit realen Team-Punkten pro Woche.  
   Ich zeige Linienplots über Wochen, Verteilungsplots der Fehler und nenne die durchschnittlichen Differenzen.

---

## Was diese Auswahl abdeckt und was nicht
- A1 bildet langfristige Spielstärke ab und koppelt sie an aktuelle Einsatzzeit.  
- A2 bildet kurzfristige Form ab und reagiert schneller.  
- B1 ist meine echte Cold-Start-Regel und bildet eine einfache, real genutzte Managerlogik ab.  
- B2 misst Budgeteffizienz.  

Damit decke ich vier Sichtweisen ab, die sich nicht doppeln. Wenn mein Modell bei Spieler-MAE und bei Team-Punkten gegen beide Baselines klar besser ist, kann ich sauber behaupten, dass meine Methode einen echten Fortschritt bringt.

---

## Verbindung zur restlichen Arbeit
- Die genaue Train-Test-Aufteilung und die Metriken beschreibe ich in `docs/evaluation/metrics.md`.  
- Alle Plots und Tabellen schreibe ich nach `docs/plots/` und `out/`.  
- Die Teamregeln sind im README zusammengefasst und im Code klar kommentiert.

## Kurzfazit
Baselines machen meine Ergebnisse vergleichbar und fair. Zwei Ebenen sind nötig, weil eine gute Einzelprognose nicht automatisch ein gutes Team ergibt. Mit je zwei einfachen, unterschiedlichen Baselines pro Ebene decke ich langfristige Leistung, kurzfristige Form, reale Managerlogik und Budgeteffizienz ab. So kann ich klar zeigen, dass mein Ansatz über beide Ebenen hinweg überzeugt.
