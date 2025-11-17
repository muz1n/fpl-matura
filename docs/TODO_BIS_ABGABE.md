# Offene Punkte vor Präsentation & Schriftlicher Arbeit

**Stand:** 17. November 2025  
**Endabgabe:** 5. Dezember 2025  
**Präsentation:** Januar 2026

---

## ✅ Was bereits erledigt ist

### Code & Repo
- ✅ Projekt-Struktur aufgeräumt (code/, data/, out/, docs/, journal/, tests/, web/)
- ✅ Tests laufen (25 Python-Tests passing, Web-Tests konfiguriert)
- ✅ Dokumentation vorhanden (CODE_STRUCTURE.md, README.md, code/README.md)
- ✅ Journal standardisiert (2025-06 bis 2025-11, Policy dokumentiert)
- ✅ Commits & Pushes sauber (Schweizerdeutsch, konsistent)

### Modelle & Evaluation
- ✅ Mehrere Modellvarianten (rf, ma3, pos, rf_pos, rf_rank)
- ✅ Evaluation-Skripte (MAE, RMSE, Spearman)
- ✅ Backtests für 2022-23 (team_backtest, rf_rank_boost_summary)
- ✅ Baselines dokumentiert (docs/baselines.md)

### Web-App
- ✅ Next.js 15 + React 18 + TypeScript
- ✅ API-Endpoints (predictions, lineup, historical, backtests)
- ✅ Zod-Schemas aligned
- ✅ Theme-Toggle (Dark/Light Mode)
- ✅ ECharts integriert (TopPlayersBar, TrendLine)
- ✅ Historisch-Demo (GW30–38 2022-23)
- ✅ Multi-Saison Backtests-Übersicht

### Schriftliche Arbeit (Typst)
- ✅ Kapitel-Struktur (01–10) angelegt
- ✅ Grundlagen, Daten, Features, Pipeline, Evaluationsplan, Reproduzierbarkeit, Frontend, Anwendung, Grenzen, KI-Quellen
- ✅ Reproduzierbarkeitsplan (random_state, Versionierung, Journal-Verknüpfung)

---

## 🚧 Was noch zu tun ist (bis 5. Dezember)

### 1. Schriftliche Arbeit finalisieren
**Priorität:** HOCH  
**Zeit:** ~2 Wochen intensiv

- [ ] **Typst main.typ erstellen** – Master-Datei, die alle Kapitel zusammenfügt
- [ ] **Alle Kapitel durchschreiben** (01–10):
  - [ ] 01 Einleitung: Kontext, Ziel, Hypothese (MAE < 2)
  - [ ] 02 Grundlagen: FPL-Regeln, ML-Basics (Random Forest), Metriken
  - [ ] 03 Daten & Features: Datenquellen (vaastav), Feature-Engineering, Zeiträume
  - [ ] 04 Pipeline & Modell: Trainings-Setup, Modellvarianten, Hyperparameter
  - [ ] 05 Evaluationsplan: Testset-Split, Metriken, Vergleich Baselines vs. Modell
  - [ ] 06 Reproduzierbarkeit: (bereits gut vorbereitet, finalisieren)
  - [ ] 07 Frontend-Konzept: Web-App-Architektur, Design-Entscheidungen, Charts
  - [ ] 08 Anwendung: Team-Backtest, reale Anwendung (falls FPL-Team geführt)
  - [ ] 09 Grenzen & Risiken: Fehleranalyse, Limitationen, Cold-Start
  - [ ] 10 KI-Quellen: Verwendete Tools (GitHub Copilot, ChatGPT), Eigenanteil

- [ ] **Grafiken & Tabellen einfügen**:
  - MAE-Vergleich (rf vs. ma3 vs. pos)
  - Backtest-Charts (team_backtest_*.png)
  - Feature-Wichtigkeit (falls vorhanden)
  - Fehleranalyse (Residuals, Position-Breakdown)

- [ ] **Literaturverzeichnis & Quellen**:
  - vaastav/Fantasy-Premier-League (GitHub)
  - Scikit-learn Dokumentation
  - FPL-Regeln (offizielle Website)
  - Verwendete KI-Tools

- [ ] **Abstract & Zusammenfassung** (am Schluss)
- [ ] **Korrekturlesen** (Rechtschreibung, Schweizer Schreibweise, Klarheit)
- [ ] **PDF generieren** (via Typst) und prüfen

**Zeitziel:** Bis 30. November Rohfassung, bis 5. Dezember finalisiert.

---

### 2. Präsentation vorbereiten (Januar 2026)
**Priorität:** MITTEL (nach Arbeit)  
**Zeit:** ~1 Woche im Dezember

- [ ] **Folien erstellen** (PowerPoint / Google Slides / Typst-Slides):
  - Titel & Einstieg
  - Ausgangslage & Fragestellung (Was ist FPL?)
  - Datenbasis (vaastav, CSVs, Beispiel-Tabelle)
  - Modell & Vorgehen (rf, ma3, pos, rf_pos, rf_rank – einfach erklärt)
  - Evaluation (MAE, RMSE, Spearman – Tabelle & Plots zeigen)
  - Team-Backtest (Grafik, Budget 100.0, max. 3 pro Club)
  - WebApp Demo (Screenshot oder Live-Demo vorbereiten)
  - Grenzen & Limitationen (Fehleranalyse, Daten-Lücken)
  - Fazit & persönliche Reflexion

- [ ] **Demo vorbereiten**:
  - Web-App lokal lauffähig
  - Historisch-Seite mit Charts zeigen
  - Predictions-Seite mit Top-15 & Lineup
  - Optional: Live-Daten für aktuelle Saison (falls verfügbar)

- [ ] **Präsentation üben** (15–20 Min)
- [ ] **Backup-Plan** (falls Live-Demo technisch nicht klappt: Screenshots/Video)

**Zeitziel:** Bis 15. Dezember Folien fertig, bis Januar mehrfach geübt.

---

### 3. Code & Daten finalisieren
**Priorität:** MITTEL  
**Zeit:** ~3 Tage

- [ ] **Backtests für 2023-24 & 2024-25 generieren**:
  - Skript laufen lassen: `team_backtest.py` für beide Saisons
  - PNGs & CSVs in `out/` ablegen
  - Web-App Backtests-Seite aktualisiert sich automatisch

- [ ] **Zusätzliche Metriken/Plots** (optional):
  - Residuals-Plot (predicted vs. actual)
  - Feature-Wichtigkeit (RF feature_importances_)
  - Breakdown nach Position (GK/DEF/MID/FWD)

- [ ] **README.md aktualisieren**:
  - Installation & Setup
  - Wie man Predictions generiert
  - Wie man Web-App startet
  - Link zu Dokumentation (docs/)

- [ ] **requirements.txt prüfen** (alle Dependencies aktuell?)

**Zeitziel:** Bis 25. November.

---

### 4. Web-App UI-Verbesserungen (optional)
**Priorität:** NIEDRIG (Nice-to-have)  
**Zeit:** ~2 Tage

- [ ] **Report/Study-Layout finalisieren**:
  - Kompakte Filterbar
  - Klare Sektionen (Summary → Lineup → Top 15 → Charts)
  - Bessere Chart-Legenden/Labels

- [ ] **Team-Input UI ersetzen** (ID → Namenssuche + XI-Grid):
  - Suchfeld für Spieler
  - 11er-Grid mit Captain-Selector
  - Optional: Bench-Ansicht

- [ ] **Materialien-Sektion** (Downloads):
  - Historisch-Seite: CSV-Links, PNG-Vorschau
  - Falls Zeit: Predictions-Seite auch

**Zeitziel:** Nur falls Zeit bleibt (nach Arbeit).

---

### 5. Journal aktualisieren
**Priorität:** HOCH  
**Zeit:** laufend

- [ ] **Heute (17. Nov)** Journal-Eintrag:
  - ECharts-Integration
  - Dark-Mode Theme
  - TrendLine-Komponente
  - Nächste Schritte: Schriftliche Arbeit finalisieren

- [ ] **Weitere Einträge** bis 5. Dezember:
  - Mind. 1x pro Woche
  - Arbeitsschritte, Nächste Schritte, Reflexion, Entscheidungen

**Zeitziel:** Laufend.

---

## 📋 Checkliste vor Abgabe (5. Dezember)

### Schriftliche Arbeit
- [ ] Alle Kapitel fertig geschrieben
- [ ] Grafiken & Tabellen eingefügt
- [ ] Literaturverzeichnis vollständig
- [ ] Abstract/Zusammenfassung vorhanden
- [ ] Korrektur gelesen (Rechtschreibung, Schweizer Schreibweise)
- [ ] PDF generiert und geprüft
- [ ] Dateiname: `Maturaarbeit_Vorname_Nachname_2025.pdf`

### Code & Repo
- [ ] Alle wichtigen Ergebnisse in `out/` vorhanden
- [ ] Backtests für alle Saisons generiert
- [ ] README.md aktuell
- [ ] Journal vollständig (bis Abgabedatum)
- [ ] Commits sauber & nachvollziehbar
- [ ] GitHub-Repo öffentlich / Zugriff für LukZeh

### Präsentation (Januar 2026)
- [ ] Folien fertig
- [ ] Demo vorbereitet (Web-App lauffähig oder Screenshots)
- [ ] Präsentation geübt (15–20 Min)

---

## 🎯 Zeitplan (letzte 3 Wochen)

| Woche | Priorität | Aufgaben |
|-------|-----------|----------|
| **18.–24. Nov** | Schriftliche Arbeit | Kapitel 01–05 durchschreiben, Grafiken sammeln |
| **25. Nov–1. Dez** | Schriftliche Arbeit | Kapitel 06–10 finalisieren, Korrektur, PDF |
| **2.–5. Dez** | Finale Checks | Journal, README, Repo-Check, Abgabe |
| **6.–15. Dez** | Präsentation | Folien, Demo, Üben |

---

## 🔗 Wichtige Links & Ressourcen

- **Zeitplan:** `docs/zeitplan.md`
- **Reproduzierbarkeit:** `docs/schriftliche_maturaarbeit/06_reproduzierbarkeit.typ`
- **Präsentation-Outline:** `docs/praesentation_outline.md`
- **Journal-Policy:** `journal/README.md`
- **CODE_STRUCTURE:** `CODE_STRUCTURE.md`

---

## ℹ️ Wichtige Hinweise

1. **Hypothese (aus Projektvereinbarung):**  
   MAE < 2 Punkte pro Spieler – prüfe, ob erreicht (aus Evaluations-Ergebnissen).

2. **FPL-Team (falls geführt):**  
   Realitätsbezug für Kapitel 08 (Anwendung). Falls kein Team geführt: Fokus auf Backtest-Simulation.

3. **KI-Transparenz (Kapitel 10):**  
   Klar dokumentieren, welche Teile mit GitHub Copilot / ChatGPT erstellt wurden, welche eigenständig.

4. **Typst-Build:**  
   Prüfe, ob alle `.typ`-Dateien korrekt eingebunden sind. Falls `main.typ` fehlt, erstelle sie jetzt.

---

**Viel Erfolg! 🚀**
