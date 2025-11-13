#!/usr/bin/env python3
"""
journal_enrich.py - Enrich journal entries with decision context.

Usage:
    python journal_enrich.py [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--limit-days N] [--dry-run]

Examples:
    python journal_enrich.py --since 2025-11-01
    python journal_enrich.py --limit-days 7 --dry-run
"""

import subprocess
import sys
import argparse
import re
from datetime import datetime, timedelta
from pathlib import Path


# Topic keywords for detection
TOPIC_KEYWORDS = {
    "rf_rank": ["rf_rank", "rank", "ranking"],
    "random_forest": ["randomforest", "rf", "random forest"],
    "predictions": ["make_predictions", "prediction", "predict"],
    "methods": ["ma3", "pos", "method"],
    "lineup": ["lineup", "formation", "team"],
    "api": ["api", "endpoint", "available", "methodsbygw"],
    "ui": ["ui", "fe", "frontend", "selector", "dropdown"],
    "validation": ["validation", "error_analysis", "spearman", "mae", "rmse"],
    "backtest": ["backtest", "team_backtest"],
    "docs": ["readme", "docs", "documentation"],
    "fixes": ["fix", "season guard", "legacy", "robust", "error handling"],
}


def run_git_command(args, check=True):
    """Run a git command and return output or None on failure."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            check=check,
            encoding="utf-8",
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def get_repo_root():
    """Get the root directory of the git repository."""
    output = run_git_command(["rev-parse", "--show-toplevel"], check=False)
    return Path(output) if output else None


def get_day_commits(date_str):
    """Get all commits for a specific day."""
    since = f"{date_str} 00:00:00"
    until = f"{date_str} 23:59:59"

    output = run_git_command(
        [
            "log",
            f"--since={since}",
            f"--until={until}",
            "--pretty=format:%H|%s",
            "--date=iso-local",
        ],
        check=False,
    )

    if not output:
        return []

    commits = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|", 1)
        if len(parts) == 2:
            commits.append({"sha": parts[0], "subject": parts[1]})

    return commits


def get_changed_files(sha):
    """Get list of changed files for a commit."""
    output = run_git_command(["show", "--name-only", "--pretty=", sha], check=False)
    if not output:
        return []
    return [line.strip() for line in output.split("\n") if line.strip()]


def detect_topics(commits):
    """Detect topics from commit subjects and changed files."""
    topics = set()
    all_text = []

    for commit in commits:
        all_text.append(commit["subject"].lower())
        files = get_changed_files(commit["sha"])
        all_text.extend([f.lower() for f in files])

    combined_text = " ".join(all_text)

    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword in combined_text:
                topics.add(topic)
                break

    return topics


def generate_entscheidung(topics, commits):
    """Generate Entscheidung section."""
    if "rf_rank" in topics:
        return "Ich schalte rf_rank als neue Vorhersage-Methode im UI frei."
    elif "api" in topics and "methods" in topics:
        return (
            "Ich baue methodenspezifische Predictions und dynamische Methoden-Auswahl."
        )
    elif "backtest" in topics:
        return "Ich teste verschiedene Methoden gegeneinander (Backtest GW30–38)."
    elif "validation" in topics:
        return "Ich validiere die Modelle systematisch (MAE, RMSE, Korrelation)."
    elif "lineup" in topics:
        return "Ich optimiere die Lineup-Auswahl und Formation."
    elif "ui" in topics:
        return "Ich verbessere die Benutzeroberfläche und Fehlerbehandlung."
    elif "docs" in topics:
        return "Ich dokumentiere Funktionen und Reproduzierbarkeit."
    elif len(commits) > 5:
        return "Ich baue mehrere Features parallel aus (siehe Arbeitsschritte)."
    elif commits:
        return f"Ich arbeite an: {commits[0]['subject'][:60]}..."

    return "[Bitte kurz präzisieren: Was war die Hauptentscheidung heute?]"


def generate_alternativen(topics):
    """Generate Alternativen section."""
    alternatives = []

    if "rf_rank" in topics:
        alternatives = [
            "Nur das bestehende RF-Modell tunen statt neues Ranking-Modell",
            "LambdaMART oder andere Ranking-Algorithmen testen",
            "Ranking-Feature erst nach der Abgabe implementieren",
        ]
    elif "api" in topics and "methods" in topics:
        alternatives = [
            "Alle Methoden in einer Predictions-Datei speichern",
            "Frontend hart auf eine Methode fixieren",
            "Methoden-Wahl nur via Config, nicht dynamisch",
        ]
    elif "backtest" in topics:
        alternatives = [
            "Nur die letzte Gameweek testen statt ganzer Range",
            "Manuell ausgewählte Lineups vergleichen",
            "Nur theoretische Metriken ohne echten Team-Test",
        ]
    elif "validation" in topics:
        alternatives = [
            "Nur eine Metrik (z.B. MAE) verwenden",
            "Validierung erst am Ende statt kontinuierlich",
            "Nur visuelle Plots ohne numerische Kennzahlen",
        ]
    elif "ui" in topics or "fixes" in topics:
        alternatives = [
            "Fehler ignorieren und nur Happy-Path testen",
            "Legacy-Support komplett entfernen",
            "Mehr Zeit für neue Features statt Stabilität",
        ]
    else:
        alternatives = [
            "[Alternative 1: Was hätte ich anders machen können?]",
            "[Alternative 2: Welcher Ansatz wäre einfacher gewesen?]",
        ]

    return alternatives[:3]


def generate_warum_so(topics):
    """Generate Warum so? section."""
    reasons = []

    if "rf_rank" in topics:
        reasons = [
            "Ranking ist schnell messbar mit Spearman-Korrelation",
            "Kein Risiko für Datenlecks wie bei Point-Prediction",
            "Passt zur Projektvereinbarung (Innovation zeigen)",
        ]
    elif "api" in topics and "methods" in topics:
        reasons = [
            "Flexibilität: neue Methoden ohne Code-Änderung hinzufügen",
            "Bessere Testbarkeit durch klare Trennung",
            "Legacy-Support für alte Predictions wichtig",
        ]
    elif "backtest" in topics:
        reasons = [
            "Realitätsnaher Test mit echten Constraints (Budget, Formation)",
            "Vergleichbarkeit mehrerer Methoden objektiv",
            "GW30–38 ist repräsentativ (End-of-Season Dynamik)",
        ]
    elif "validation" in topics:
        reasons = [
            "MAE/RMSE zeigen absolute Fehler, Spearman die Ranking-Qualität",
            "Wissenschaftlich fundiert für Maturaarbeit",
            "Reproduzierbarkeit durch klare Metriken",
        ]
    elif "ui" in topics or "fixes" in topics:
        reasons = [
            "Robustheit wichtiger als viele Features",
            "Besseres User-Feedback bei Fehlern",
            "Legacy-Support verhindert Datenverlust",
        ]
    else:
        reasons = [
            "[Grund 1: Was war der Hauptvorteil?]",
            "[Grund 2: Was spricht dafür?]",
        ]

    return reasons[:3]


def generate_fehler_learnings(topics, commits):
    """Generate Fehler & Learnings section."""
    learnings = []

    # Detect fixes from commit subjects
    subjects_lower = " ".join([c["subject"].lower() for c in commits])

    if "season guard" in subjects_lower or "season" in subjects_lower:
        learnings.append(
            "Ich habe Season-Guard eingebaut, gelernt: Datenintegrität prüfen!"
        )

    if "legacy" in subjects_lower:
        learnings.append(
            "Legacy-Handling nachgerüstet, gelernt: Abwärtskompatibilität frühzeitig planen"
        )

    if "robust" in subjects_lower or "error" in subjects_lower:
        learnings.append(
            "Fehlerbehandlung verbessert, gelernt: Edge-Cases nicht unterschätzen"
        )

    if "methodsbygw" in subjects_lower or "available" in subjects_lower:
        learnings.append(
            "Dynamische Verfügbarkeit gebaut, gelernt: Metadaten separat halten"
        )

    if "validation" in topics and not learnings:
        learnings.append(
            "Metriken implementiert, gelernt: Validation früh einbauen spart Debug-Zeit"
        )

    if "backtest" in topics and not learnings:
        learnings.append(
            "Backtest zeigt: MA3 performt besser als erwartet bei stabilen Spielern"
        )

    # Generic fallback
    if not learnings:
        if len(commits) > 8:
            learnings.append(
                "Viele kleine Commits, gelernt: öfter committen statt grosse Blöcke"
            )
        else:
            learnings.append("[Was lief schief? Was habe ich daraus gelernt?]")

    return learnings[:3]


def parse_journal_sections(content):
    """Parse existing journal file and return sections with their content."""
    sections = {}
    current_section = None
    current_content = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = line[3:].strip()
            current_content = []
        elif current_section:
            current_content.append(line)

    if current_section:
        sections[current_section] = "\n".join(current_content).strip()

    return sections


def section_is_empty(content):
    """Check if a section is empty (only dashes, whitespace, or generic placeholders)."""
    if not content:
        return True

    # Remove HTML comments, dashes, bullets, whitespace
    clean = re.sub(r"<!--.*?-->", "", content)
    clean = re.sub(r"[-\*\s]+", "", clean)

    return len(clean) < 5


def enrich_journal_file(filepath, date_str, dry_run=False):
    """Enrich a single journal file with decision context."""
    if not filepath.exists():
        return None

    # Read existing content
    with open(filepath, "r", encoding="utf-8") as f:
        original_content = f.read()

    # Parse sections
    sections = parse_journal_sections(original_content)

    # Get git data for the day
    commits = get_day_commits(date_str)
    if not commits:
        return None

    topics = detect_topics(commits)

    # Check which sections need enrichment
    sections_to_add = []

    if "Entscheidung" not in sections or section_is_empty(
        sections.get("Entscheidung", "")
    ):
        entscheidung = generate_entscheidung(topics, commits)
        sections_to_add.append(("Entscheidung", f"- {entscheidung}"))

    if "Alternativen (kurz)" not in sections or section_is_empty(
        sections.get("Alternativen (kurz)", "")
    ):
        alternativen = generate_alternativen(topics)
        alt_text = "\n".join([f"- {alt}" for alt in alternativen])
        sections_to_add.append(("Alternativen (kurz)", alt_text))

    if "Warum so?" not in sections or section_is_empty(sections.get("Warum so?", "")):
        warum = generate_warum_so(topics)
        warum_text = "\n".join([f"- {w}" for w in warum])
        sections_to_add.append(("Warum so?", warum_text))

    if "Fehler & Learnings" not in sections or section_is_empty(
        sections.get("Fehler & Learnings", "")
    ):
        learnings = generate_fehler_learnings(topics, commits)
        learn_text = "\n".join([f"- {learning}" for learning in learnings])
        sections_to_add.append(("Fehler & Learnings", learn_text))

    if not sections_to_add:
        return "skipped"

    # Build new content
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_sections_text = []

    for section_name, section_content in sections_to_add:
        new_sections_text.append(f"\n## {section_name}\n{section_content}")

    enriched_content = original_content.rstrip() + "\n" + "\n".join(new_sections_text)
    enriched_content += f"\n\n<!-- enrich:{timestamp} -->\n"

    if dry_run:
        print(f"\n{'='*60}")
        print(f"Would enrich: {filepath}")
        print(f"{'='*60}")
        print("NEW SECTIONS:")
        print("\n".join(new_sections_text))
        return "dry-run"

    # Write enriched content
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(enriched_content)

    return "enriched"


def main():
    parser = argparse.ArgumentParser(
        description="Enrich journal entries with decision context."
    )

    default_since = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    default_until = datetime.now().strftime("%Y-%m-%d")

    parser.add_argument(
        "--since",
        default=default_since,
        help=f"Start date (inclusive), format: YYYY-MM-DD (default: {default_since})",
    )
    parser.add_argument(
        "--until",
        default=default_until,
        help=f"End date (inclusive), format: YYYY-MM-DD (default: {default_until})",
    )
    parser.add_argument("--limit-days", type=int, help="Limit to N most recent days")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print changes instead of writing files"
    )

    args = parser.parse_args()

    # Get repo root
    repo_root = get_repo_root()
    if not repo_root:
        print(
            "Error: Not inside a git repository or git not available", file=sys.stderr
        )
        sys.exit(1)

    journal_dir = repo_root / "journal"
    if not journal_dir.exists():
        print(f"Error: Journal directory not found: {journal_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Repository: {repo_root}")
    print(f"Date range: {args.since} to {args.until}")
    if args.limit_days:
        print(f"Limit: {args.limit_days} most recent days")
    if args.dry_run:
        print("DRY RUN mode - no files will be written")
    print()

    # Find journal files in date range
    since_date = datetime.strptime(args.since, "%Y-%m-%d")
    until_date = datetime.strptime(args.until, "%Y-%m-%d")

    date_files = []
    current_date = since_date
    while current_date <= until_date:
        date_str = current_date.strftime("%Y-%m-%d")
        filepath = journal_dir / f"{date_str}.md"
        if filepath.exists():
            date_files.append((date_str, filepath))
        current_date += timedelta(days=1)

    if not date_files:
        print("No journal files found in the specified range.")
        return

    # Apply limit if specified
    if args.limit_days and len(date_files) > args.limit_days:
        date_files = date_files[-args.limit_days :]

    print(f"Found {len(date_files)} journal file(s) to process")

    # Process each file
    stats = {"enriched": 0, "skipped": 0, "dry-run": 0}

    for date_str, filepath in date_files:
        status = enrich_journal_file(filepath, date_str, args.dry_run)
        if status:
            stats[status] += 1
            if not args.dry_run:
                print(f"{date_str}: {status}")

    # Summary
    print(f"\n{'='*60}")
    print("Summary:")
    print(f"  Total files processed: {len(date_files)}")
    if args.dry_run:
        print(f"  Files that would be enriched: {stats['dry-run']}")
    else:
        print(f"  Files enriched: {stats['enriched']}")
        print(f"  Files skipped (already complete): {stats['skipped']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
