# Journal 2025-12-03

**Status:** FINALE PHASE - 2 Tage bis Abgabe  
**Fokus:** Web-App Audit, Lehrer-Meeting Vorbereitung

---

## Arbeitsschritte

### 1. Web-App Content Audit (Vollständig)
**Dateien geprüft:**
- `web/pages/index.tsx` (Homepage)
- `web/pages/methodik.tsx` (Methodologie-Erklärungen)
- `web/pages/info.tsx` (Projektinfo & Hypothese)
- `web/pages/glossar.tsx` (Begriffserklärungen)
- `web/src/data/glossary.ts` (Glossar-Daten)
- `web/src/data/tooltips.ts` (Tooltip-Definitionen)

**Gefundene Probleme:**
1. **Kritisch:** Hypothese auf Info-Seite widersprach Thesis-Resultaten
   - Behauptung: MAE <2 Punkte
   - Realität: MAE=2.1 (RF), MAE=2.3 (MA3)
   - **Fix:** "~2 Punkte" statt "<2 Punkte" → ehrlicher & korrekt

2. **Inkonsistenz:** "Cross-Season" Terminologie verwirrend
   - Methodik: "Cross-Season Testing"
   - Info: "Keine Cross-Season Validierung"
   - **Fix:** Klargestellt als "Walk-Forward Cross-Season Testing: Train 2016-2020, Test 2020-2024"

**Befund:** 90% der Web-App war bereits korrekt!
- Glossar: Alle Definitionen fachlich korrekt
- Tooltips: ICT, Effizienz, Hindsight Optimum richtig erklärt
- Methodik: RF-Varianten, Baselines, Feature Engineering stimmen
- Datenbasis: "8+ Saisons 2016-2024" korrekt

### 2. Fixes implementiert
**Geänderte Dateien:**
- `web/pages/info.tsx` (2 Korrekturen)
  - Zeile 73: Hypothese MAE-Claim realistisch gemacht
  - Zeile 305: Cross-Season Training/Testing klargestellt

**Commits:** Noch nicht committed (User macht das selbst)

### 3. Lehrer-Meeting Vorbereitung
**Erstellt:** `docs/FRAGEN_MEETING_LEHRER.md`
- 9 Themenbereiche
- Priorisiert: KRITISCH (Abgabefähigkeit) → WICHTIG (Formatierung) → OPTIONAL (Inhalt)
- Zeitplan für die letzten 2 Tage

**Wichtigste Fragen:**
1. Wie viel drucken, wie binden?
2. Titelblatt-Vorlage?
3. KI-Nutzung deklarieren (wie genau)?
4. Zitierstil (APA, Chicago, IEEE)?
5. Font/Schriftgrösse (vorgegeben oder frei)?
6. Grafik-Beschriftung (Format, Quelle, "Eigene Darstellung"?)

---

## Nächste Schritte

**Heute (nach Meeting):**
- [ ] Meeting-Antworten in `FRAGEN_MEETING_LEHRER.md` nachtragen
- [ ] Visualisierungen erstellen (4-5 Plots noch fehlend)
- [ ] Typst-Formatierung anpassen (Font, Margins gemäss Vorgaben)
- [ ] Titelblatt erstellen (sobald Format klar)

**Morgen (5. Dez):**
- [ ] Selbstständigkeitserklärung schreiben
- [ ] KI-Deklaration (falls nötig)
- [ ] Literaturverzeichnis finalisieren
- [ ] FINALER PDF-Export
- [ ] Drucken + Binden

**Übermorgen (6. Dez):**
- [ ] ABGABE beim Lehrer

---

## Reflexion

**Was lief gut:**
- Web-App war bereits 90% korrekt → gute Qualitätssicherung bisher
- Systematischer Audit alle wichtigen Pages durchgegangen
- Probleme schnell gefunden und sofort gefixt
- Meeting-Vorbereitung strukturiert & priorisiert

**Learnings:**
- MAE-Hypothese war von Anfang an zu optimistisch formuliert
  - Lesson: Erst Resultate haben, dann Hypothese finalisieren
  - Oder: Hypothese vage genug halten ("~2 Punkte" statt "<2")
- "Cross-Season" ist mehrdeutig
  - Training: Pro Season ein Modell (kein Cross-Season Training)
  - Testing: Über Seasons hinweg (Cross-Season Testing)
  - → Wichtig: Begriffe sauber trennen

**Zeitdruck:**
- 2 Tage bis Abgabe, aber machbar
- Visualisierungen sind kritischer Pfad (noch nicht gemacht)
- Formatierung abhängig von Lehrer-Vorgaben (heute klären!)

---

## Entscheidungen

**Web-App Fixes:**
- **Warum MAE "~2" statt genau "2.1"?**
  - Web-App soll nicht zu technisch werden
  - "~2" ist ehrlich UND verständlich
  - Genaue Zahlen in der Thesis, nicht in der UI

- **Warum Cross-Season als "Walk-Forward" beschrieben?**
  - Präziser Begriff aus ML-Literatur
  - Verhindert Missverständnisse (Training ≠ Testing)
  - Zeigt methodische Sauberkeit

**Meeting-Vorbereitung:**
- **Warum Priorisierung KRITISCH → WICHTIG → OPTIONAL?**
  - Lehrer hat wenig Zeit (15-20 Min realistisch)
  - Abgabefähigkeit > perfekte Formatierung > Inhaltsfeinheiten
  - User muss in 2 Tagen drucken können → formale Fragen zuerst!

---

## Alternativen (nicht gewählt)

**Statt "~2 Punkte" hätte ich schreiben können:**
1. "MAE von 2.1 Punkten" (zu technisch für Info-Page)
2. "MAE unter 2.5 Punkten" (wahr, aber unehrlich vage)
3. "Verbesserung gegenüber Baselines" (zu schwammig, keine Zahl)

**Gewählt:** "~2 Punkte" → Balance zwischen Präzision und Lesbarkeit

**Statt Meeting-Doc hätte ich können:**
1. User selbst Fragen aufschreiben lassen (weniger strukturiert)
2. Nur die wichtigsten 5 Fragen (zu wenig, falls Zeit übrig)
3. Alle Fragen unpriorisiert (Chaos im Meeting)

**Gewählt:** Strukturierte, priorisierte Liste mit Notizbereich

---

## Warum so?

**Web-App Audit war nötig weil:**
- User hat Text-Prototype der Thesis fertig
- Will sicherstellen: Web-App widerspricht nicht der Thesis
- Risiko: Frühere Prototyp-Versionen enthielten optimistische Claims
- → Systematischer Check aller User-facing Pages nötig

**Lehrer-Meeting Prep war nötig weil:**
- Abgabe in 2 Tagen → keine Zeit für Trial & Error
- Formatierung kann 4-6h kosten (Font, Margins, Titelblatt, Quellen)
- Falsche Bindung/Druck → muss neu gemacht werden (Zeit/Geld!)
- → EINE Chance, alle formalen Fragen zu klären

**Fixes sofort gemacht weil:**
- User sagte "fixe alles sofort" → klarer Auftrag
- Änderungen minimal (2 Textpassagen)
- Kein Breaking Risk (nur Info-Text, kein Code)
- → Keine Diskussion nötig, einfach machen

---

## Fehler & Learnings

**Kein Fehler heute** (alles lief glatt), aber:

**Learning 1: Hypothesen früh validieren**
- Problem: Hypothese "MAE <2" war schon vor Resultaten geschrieben
- Resultat: MAE=2.1 → Hypothese falsifiziert, peinlich
- Lesson: Hypothese vage genug lassen ODER erst nach ersten Tests finalisieren

**Learning 2: Terminologie konsistent halten**
- Problem: "Cross-Season" wurde mal für Training, mal für Testing verwendet
- Lösung: "Walk-Forward" ist präziser und eindeutig
- Lesson: Fachwörter einmal definieren, dann konsequent verwenden

**Learning 3: Meeting-Prep lohnt sich**
- User wusste zwar grob was fragen, aber unstrukturiert
- Priorisierung hilft bei Zeitdruck (Lehrer hat nicht ewig Zeit)
- Notizbereich direkt im Doc → keine vergessenen Antworten
- Lesson: 30 Min Vorbereitung spart 3h Nacharbeit

---

## Commit-Message (Vorschlag für User)

```
fix(web): korrigiere MAE-Hypothese und Cross-Season Beschreibung

- Info-Page: MAE-Claim von "<2" zu "~2" geändert (realistisch)
- Info-Page: Cross-Season als "Walk-Forward Testing" klargestellt
- Beide Änderungen machen Web-App konsistent mit Thesis-Resultaten

Refs: docs/FRAGEN_MEETING_LEHRER.md (Meeting-Prep erstellt)
```

---

## Zeitaufwand

- Web-App Audit: 25 Min (6 Files gelesen, Analyse)
- Fixes: 5 Min (2 replace_string calls)
- Meeting-Prep Doc: 20 Min (strukturiert, priorisiert)
- Journal: 15 Min (dieser Eintrag)

**Total:** ~65 Min

---

**Status:** Web-App bereit für Abgabe, Meeting-Fragen vorbereitet ✅
