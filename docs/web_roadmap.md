# Web-Roadmap: Startseite, LocalStorage, RF-Kurzbericht

## Was wurde umgesetzt?

**Startseite mit drei Aktionen:**
- Karte "Prognosen ansehen" → Link zu `/predictions`
- Karte "Neue Prognose laden" → GW-Input + Fetch-Logik mit Validierung
- Karte "Mannschaft merken" → LocalStorage-Squad anzeigen

**Toolbar auf /predictions:**
- GW-Eingabe + "Neu laden"-Button → dynamisches Nachladen
- Toggle "LocalStorage-Mannschaft anwenden" (Platzhalter für zukünftige Squad-Override-Funktion)
- "Mannschaft speichern"-Button → persistiert aktuelle Lineup in LocalStorage

**LocalStorage-Integration:**
- Zod-validierte Squad-Daten (Formation, XI, Bench, Captain/Vice)
- Helper-Modul `lib/squad-storage.ts` mit Save/Load/Clear-Funktionen
- Jest-Tests für alle Storage-Operationen (8 Tests, alle bestanden)

## Warum diese Änderungen?

- **UX-Verbesserung:** Einfachere Navigation, klare Aktionen auf Startseite
- **Flexibilität:** Nutzer können beliebige Gameweeks laden
- **Offline-First:** LocalStorage ermöglicht Arbeit ohne Server/Login
- **Qualitätssicherung:** Zod-Validierung verhindert ungültige Daten

## Wie funktioniert es?

1. User öffnet `/` → wählt Aktion (Prognose laden, Squad anzeigen)
2. `/predictions?gw=X` → lädt Daten via API-Route
3. "Mannschaft speichern" → schreibt in localStorage (validiert)
4. "Letzte Mannschaft anzeigen" auf `/` → liest aus localStorage

## Nächste To-dos

- **Squad-Override:** Toggle-Logik implementieren (LocalStorage → Lineup ersetzen)
- **Export/Import:** Squad als JSON herunterladen/hochladen
- **FPL-Team-ID Input:** Optional echte FPL-Daten abrufen (API-Integration)
- **Vergleichsansicht:** Mehrere GWs nebeneinander vergleichen
- **Mobile Optimierung:** Touch-Gesten, kleinere Tabellen
- **Favoriten:** Spieler markieren und filtern

## RF-Kurzbericht

Parallel wurde `code/rf_report.py` erstellt:
- GroupKFold-CV (kein GW-Leakage)
- Baselines: Positions-Durchschnitt, MA3
- Metriken: MAE, RMSE, R²
- Plots: Lernkurve, Feature Importance
- Kurzbericht: `docs/rf_kurzbericht.md`

Ziel: reproduzierbare Modell-Evaluation für Maturaarbeit.
