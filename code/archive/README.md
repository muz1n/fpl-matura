# Archiv

Dieser Ordner enthält Code, der **nicht mehr aktiv verwendet** wird, aber für die Dokumentation oder Referenz aufbewahrt wird.

## Inhalt

### cold_start_offline.py
- **Zweck:** Früher Cold-Start-Prototyp für GW1-Teamauswahl
- **Status:** Ersetzt durch `mvp_picker.py`
- **Datum:** ~August 2025
- **Warum archiviert:** Wurde durch verbesserte Heuristik ersetzt

### tuning/
Hyperparameter-Tuning-Skripte, die **nur einmal** ausgeführt wurden, um optimale Parameter zu finden.

- **rf_pos_tuning_def.py:** Tuning für Verteidiger (DEF)
- **rf_pos_tuning_fwd.py:** Tuning für Stürmer (FWD)
- **rf_pos_tuning_mid.py:** Tuning für Mittelfeld (MID, nicht verwendet)

**Ergebnisse:** Die gefundenen optimalen Parameter sind jetzt hardcoded in `code/rf_pos_models.py`:
- DEF: `n_estimators=100, max_depth=4, min_samples_leaf=3`
- FWD: `n_estimators=100, max_depth=4, min_samples_leaf=3`
- MID/GK: Standard-Parameter

**Warum archiviert:** Tuning ist abgeschlossen, Skripte werden nicht mehr gebraucht.

### old_lineup/
Alte Versionen von Lineup-Optimierungs-Skripten.

- **auto_formation_cli.py:** Alte Version (1046 Zeilen), ersetzt durch `auto_formation_cli_v2.py` (404 Zeilen)

**Warum archiviert:** Refactoring, neue Version ist kürzer und wartbarer.

## Hinweis

Diese Dateien sind **nicht im aktiven Code-Pfad**, werden aber für die Maturaarbeit aufbewahrt, um den Entwicklungsprozess zu dokumentieren.
