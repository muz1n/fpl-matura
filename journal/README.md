Enthält das Arbeitsjournal mit Fortschritt.

## Zweck
Das Journal dient der transparenten, nachvollziehbaren Dokumentation jeder Aenderung (Code, Doku, Web, Daten). Es ist Grundlage fuer die schriftliche Arbeit (Reproduzierbarkeit) und die Praesentation (Argumentationskette).

## Format je Eintrag
- Datum im Dateinamen (`YYYY-MM-DD.md`) und im Titel
- Abschnitte:
	- Arbeitsschritte (gerne mit Commit-Hashes/Dateien)
	- Nächste Schritte
	- Reflexion (kurz)
	- Entscheidung
	- Alternativen (kurz)
	- Warum so?
	- Fehler & Learnings

## Stil
- Deutsch, Schweizer Rechtschreibung
- Kurz, konkret, test- und datenbezogen
- Keine leeren Platzhalter – wenn nichts zu sagen ist, Abschnitt weglassen

## Workflow (empfohlen)
1) Aenderung durchfuehren (Code/Doku/…)
2) Journal-Eintrag am selben Tag ergaenzen/erstellen
3) Commit mit einfacher Schweizerdeutsch-Message
4) Push

Tools: In `tools/` liegen hilfreiche Skripte (z. B. `journal_from_git.py`, `journal_enrich.py`).
