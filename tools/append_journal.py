import pathlib

journal_path = pathlib.Path(
    "c:/Users/$/Documents/Schule/matura/fpl-matura/journal/2025-12-02.md"
)
content = journal_path.read_text(encoding="utf-8")

new_section = """

---

## Session: Vollständige Spieler-Datenbank (Nachmittag, 2. Dezember)

### Problem
Web-App hatte nur ~35 Demo-Spieler und 10 Teams. User fordert:
- ✅ Alle 20 Premier League Teams für 2023-24
- ✅ Alle Spieler (~865) statt nur Demo-Daten

### Lösung
1. **Export-Script**: `tools/export_players_for_web.py`
   - Liest `cleaned_merged_gw_2023-24.csv` (28.744 Zeilen)
   - Extrahiert 865 unique Spieler mit xP (predicted_points)
   - Exportiert als JSON: `web/data/players_2023-24.json`

2. **API erweitert**: `player-search.ts` lädt nun JSON statt Hardcoded Demo-Daten
   - `fs.readFileSync()` für players_2023-24.json
   - Alle Filter funktionieren (Position, Team, Preis, Suche)

3. **Team-Filter komplett**: Alle 20 Teams alphabetisch
   - Arsenal, Aston Villa, Bournemouth, Brentford, Brighton, Burnley
   - Chelsea, Crystal Palace, Everton, Fulham, Liverpool, Luton
   - Man City, Man Utd, Newcastle, Nott'm Forest, Sheffield Utd
   - Spurs, West Ham, Wolves

### Fehler & Learnings
- **File Corruption**: create_file auf existierender Datei führte zu dupliziertem Content
  - Lösung: Python pathlib.Path().write_text() statt VS Code Tools
- **PowerShell PSReadline Bug**: Lange Commands werfen Exception (harmlos)
- **Preis-Konvertierung**: CSV hat Preis in 0.1M-Einheiten → durch 10 teilen für £M

### Resultat
✅ **865 Spieler** aus 20 Teams vollständig durchsuchbar
✅ **Alle Teams** im Filter verfügbar
✅ **Umlaut-Normalisierung** funktioniert (Ødegaard, Schär)
✅ **Keine TypeScript-Fehler**

---
"""

journal_path.write_text(content + new_section, encoding="utf-8")
print("✅ Journal-Eintrag hinzugefügt")
