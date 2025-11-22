"""Einfaches Fortschritts-Monitoring fuer laufende Full-Season Pipelines.

Deutschsprachige Ausgabe, ASCII-only (keine Unicode Symbole) wegen Windows cp1252 Encoding.

Log-Dateien werden wie folgt erwartet (Standard oder Restart):
  logs/pipeline_<season>.log
  logs/pipeline_<season>_restart.log
  logs/pipeline_<season>_restart2.log

Erkannte Schritte:
  Schritt 1/5: RF Vorhersagen
  Schritt 2/5: RF_RELAXED Vorhersagen
  Schritt 3/5: MA3 Vorhersagen
  Schritt 4/5: POS Vorhersagen
  Schritt 5/5: Team Backtest

Wir parsen:
  - GW Range (Start/End) aus der Kopfzeile
  - Letzte verarbeitete GW pro Methode
  - Ob Summary (Backtest) bereits geschrieben wurde

Ausgabe zeigt Prozent-Fortschritt je Methode und Gesamtstatus.

Verwendung:
  python tools/monitor_pipeline_progress.py [--seasons 2020-21 2021-22 2023-24]
Fehlt --seasons -> bekannte Seasons aus einer Liste werden versucht.
"""

from __future__ import annotations
import argparse
import re
from pathlib import Path
from typing import Dict, Optional, Any

LOG_DIR = Path("logs")
DEFAULT_SEASONS = ["2020-21", "2021-22", "2023-24", "2022-23"]
METHOD_PATTERNS: Dict[str, re.Pattern] = {}
for m in ["rf", "rf_relaxed", "ma3", "pos"]:
    token = m.upper()
    # Sonderfall rf_relaxed Grossschreibung
    if m == "rf_relaxed":
        token = "RF_RELAXED"
    METHOD_PATTERNS[m] = re.compile(
        rf"\[GW(\d+)\]\s+Generiere\s+{token}\s+Vorhersagen", re.IGNORECASE
    )
SUMMARY_PATTERN = re.compile(r"OK Saved summary:")
GW_RANGE_PATTERN = re.compile(r"GW Range:\s*(\d+)\s*-\s*(\d+)")
BACKTEST_PATTERN = re.compile(r"Schritt 5/5: Team Backtest")


def find_log_file(season: str) -> Optional[Path]:
    candidates = [
        LOG_DIR / f"pipeline_{season}_restart2.log",
        LOG_DIR / f"pipeline_{season}_restart.log",
        LOG_DIR / f"pipeline_{season}.log",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def parse_log(path: Path) -> Dict[str, Any]:
    # Zeilenweise lesen, robust gegen Encoding Bruchstellen
    # Binary lesen und latin-1 decodieren um OEM Codepage Artefakte unveraendert zu behalten
    raw = path.read_bytes().decode("latin-1", errors="ignore")
    lines = raw.splitlines()
    text_full = "\n".join(lines)
    gw_start, gw_end = 2, 38
    m = GW_RANGE_PATTERN.search(text_full)
    if m:
        gw_start, gw_end = int(m.group(1)), int(m.group(2))

    result = {
        "log_file": str(path),
        "gw_start": gw_start,
        "gw_end": gw_end,
        "methods": {},
        "backtest_started": any(BACKTEST_PATTERN.search(line) for line in lines),
        "backtest_completed": any(SUMMARY_PATTERN.search(line) for line in lines),
    }

    for method in METHOD_PATTERNS.keys():
        result["methods"][method] = {
            "last_gw": None,
            "progress_pct": 0.0,
            "phase": "pending",
        }

    # Mapping von Methode zu Erkennungstext
    token_map = {
        "rf": "Generiere RF Vorhersagen",
        "rf_relaxed": "Generiere RF_RELAXED Vorhersagen",
        "ma3": "Generiere MA3 Vorhersagen",
        "pos": "Generiere POS Vorhersagen",
    }

    for line in lines:
        # Schnelle Vorauswahl
        if "Generiere" not in line or "Vorhersagen" not in line:
            continue
        gw_match = re.search(r"\[GW(\d+)]", line)
        if not gw_match:
            continue
        gw_num = int(gw_match.group(1))
        for method, token in token_map.items():
            if token in line:
                info = result["methods"][method]
                if info["last_gw"] is None or gw_num > info["last_gw"]:
                    span = gw_end - gw_start + 1
                    pct = max(0.0, min(100.0, (gw_num - gw_start + 1) / span * 100.0))
                    info.update(
                        {
                            "last_gw": gw_num,
                            "progress_pct": round(pct, 1),
                            "phase": "running" if gw_num < gw_end else "completed",
                        }
                    )
                break

    return result


def format_report(data: Dict[str, Any]) -> str:
    lines = []
    lines.append(f"Season: {Path(data['log_file']).stem.replace('pipeline_', '')}")
    lines.append(f"Log: {data['log_file']}")
    lines.append(f"GW Range: {data['gw_start']} - {data['gw_end']}")
    lines.append("")
    lines.append("Methoden-Fortschritt:")
    for method, info in data["methods"].items():
        last = info["last_gw"] if info["last_gw"] is not None else "-"
        lines.append(
            f"  {method:10s} GW={last:>3}  {info['progress_pct']:>5.1f}%  Status={info['phase']}"
        )
    lines.append("")
    lines.append(
        f"Backtest: started={data['backtest_started']} completed={data['backtest_completed']}"
    )
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Monitor Pipeline Fortschritt")
    parser.add_argument(
        "--seasons",
        nargs="*",
        default=None,
        help="Liste von Seasons (z.B. 2020-21 2021-22)",
    )
    args = parser.parse_args()

    seasons = args.seasons if args.seasons else DEFAULT_SEASONS
    existing = []
    for season in seasons:
        log = find_log_file(season)
        if not log:
            print(f"Season {season}: Keine Logdatei gefunden")
            continue
        parsed = parse_log(log)
        print("=" * 60)
        print(format_report(parsed))
        existing.append(parsed)

    if not existing:
        print("Keine Logs gefunden. Stelle sicher, dass Pipelines laufen.")
    else:
        print("=" * 60)
        print(
            "Hinweis: Prozent bezieht sich nur auf jeweilige Vorhersage-Phase, nicht Gesamtpipeline."
        )
        print(
            "Gesamt-Abschluss wenn alle vier Methoden completed und Backtest completed."
        )


if __name__ == "__main__":
    main()
