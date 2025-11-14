#!/usr/bin/env python3
"""
journal_from_git.py - Generate daily journal markdown files from git history.

Usage:
    python journal_from_git.py [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--author PATTERN] [--dry-run]

Examples:
    python journal_from_git.py --since 2025-10-01
    python journal_from_git.py --since 2025-11-01 --until 2025-11-14 --dry-run
    python journal_from_git.py --author "John Doe"
"""

import subprocess
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict


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
    except subprocess.CalledProcessError as e:
        if check:
            print(f"Git command failed: git {' '.join(args)}", file=sys.stderr)
            print(f"Error: {e.stderr}", file=sys.stderr)
            sys.exit(1)
        return None
    except FileNotFoundError:
        print("Error: git is not installed or not in PATH", file=sys.stderr)
        sys.exit(1)


def check_git_repo():
    """Verify we're inside a git repository."""
    result = run_git_command(["rev-parse", "--git-dir"], check=False)
    if result is None:
        print("Error: Not inside a git repository", file=sys.stderr)
        sys.exit(1)


def get_repo_root():
    """Get the root directory of the git repository."""
    result = run_git_command(["rev-parse", "--show-toplevel"], check=False)
    if result is None:
        print("Error: Unable to determine repository root", file=sys.stderr)
        sys.exit(1)
    return Path(result)


def get_commits(since_date, until_date, author=None):
    """
    Retrieve commits between since_date and until_date.
    Returns list of (sha, datetime, subject) tuples.
    """
    args = [
        "log",
        f"--since={since_date}",
        f"--until={until_date} 23:59:59",
        "--pretty=format:%H|%ad|%s",
        "--date=iso-local",
    ]

    if author:
        args.append(f"--author={author}")

    output = run_git_command(args)
    if not output:
        return []

    commits = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|", 2)
        if len(parts) != 3:
            continue

        sha, date_str, subject = parts
        # Parse ISO date: "2025-11-14 15:30:45 +0100"
        dt = datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")
        commits.append((sha, dt, subject))

    return commits


def get_changed_files(sha):
    """Get list of changed files for a commit."""
    output = run_git_command(["show", "--name-only", "--pretty=", sha])
    if not output:
        return []
    return [line.strip() for line in output.split("\n") if line.strip()]


def classify_bucket(filepath):
    """Classify a file path into a bucket [web], [code], [docs], [out], [other]."""
    parts = filepath.replace("\\", "/").split("/")
    if not parts:
        return "other"

    top_dir = parts[0].lower()

    if top_dir == "web":
        return "web"
    elif top_dir == "code":
        return "code"
    elif top_dir in ("docs", "doc", "documentation"):
        return "docs"
    elif top_dir in ("out", "output", "build", "dist"):
        return "out"
    else:
        return "other"


def group_commits_by_day(commits):
    """Group commits by calendar day. Returns dict: date_str -> [(time, sha, subject, buckets)]."""
    days = defaultdict(list)

    for sha, dt, subject in commits:
        date_key = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M")

        # Get changed files and determine buckets
        changed_files = get_changed_files(sha)
        buckets = set()
        for filepath in changed_files:
            bucket = classify_bucket(filepath)
            buckets.add(bucket)

        # Sort buckets for consistent output
        bucket_list = sorted(buckets)

        days[date_key].append((time_str, sha[:7], subject, bucket_list))

    return days


def format_journal_content(date_str, commits_data):
    """
    Format journal content for a given day.
    commits_data: list of (time, short_sha, subject, buckets)
    """
    lines = []
    lines.append(f"# {date_str} – Projektjournal\n")
    lines.append("## Arbeitsschritte\n")

    # Group by bucket
    bucket_groups = defaultdict(list)
    for time_str, sha, subject, buckets in commits_data:
        if not buckets:
            buckets = ["other"]
        for bucket in buckets:
            bucket_groups[bucket].append((time_str, sha, subject))

    # Output in order: web, code, docs, out, other
    bucket_order = ["web", "code", "docs", "out", "other"]

    for bucket in bucket_order:
        if bucket not in bucket_groups:
            continue

        lines.append(f"**[{bucket}]**\n")
        for time_str, sha, subject in bucket_groups[bucket]:
            # Sanitize subject (remove special markdown chars that could break formatting)
            safe_subject = subject.replace("[", "\\[").replace("]", "\\]")
            lines.append(f"- {time_str} ({sha}): {safe_subject}\n")
        lines.append("")

    lines.append("## Nächste Schritte\n")
    lines.append("- \n")
    lines.append("- \n")
    lines.append("- \n")
    lines.append("")

    lines.append("## Reflexion (kurz)\n")
    lines.append("- \n")
    lines.append("- \n")
    lines.append("- \n")

    return "".join(lines)


def write_journal_file(journal_dir, date_str, content, dry_run=False):
    """Write or append to a journal file."""
    filepath = journal_dir / f"{date_str}.md"

    if dry_run:
        print(f"\n{'='*60}")
        print(f"Would write to: {filepath}")
        print(f"{'='*60}")
        print(content)
        return "dry-run"

    # Create journal directory if needed
    journal_dir.mkdir(parents=True, exist_ok=True)

    if filepath.exists():
        # Append mode
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(filepath, "a", encoding="utf-8") as f:
            f.write("\n\n---\n\n")
            f.write(f"## Aus Git rekonstruiert (Run: {timestamp})\n\n")
            # Extract just the Arbeitsschritte section
            lines = content.split("\n")
            in_arbeitsschritte = False
            for line in lines:
                if line.startswith("## Arbeitsschritte"):
                    in_arbeitsschritte = True
                elif line.startswith("## Nächste Schritte"):
                    break
                elif in_arbeitsschritte:
                    f.write(line + "\n")
        return "updated"
    else:
        # Create new file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return "created"


def main():
    parser = argparse.ArgumentParser(
        description="Generate daily journal markdown files from git history."
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
    parser.add_argument("--author", help="Filter commits by author (partial match)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print to console instead of writing files",
    )

    args = parser.parse_args()

    # Verify git and repo
    check_git_repo()
    repo_root = get_repo_root()
    journal_dir = repo_root / "journal"

    print(f"Repository: {repo_root}")
    print(f"Date range: {args.since} to {args.until}")
    if args.author:
        print(f"Author filter: {args.author}")
    if args.dry_run:
        print("DRY RUN mode - no files will be written")
    print()

    # Get commits
    commits = get_commits(args.since, args.until, args.author)
    if not commits:
        print("No commits found in the specified range.")
        return

    print(f"Found {len(commits)} commit(s)")

    # Group by day
    days = group_commits_by_day(commits)

    # Sort days descending (newest first)
    sorted_days = sorted(days.keys(), reverse=True)

    # Process each day
    stats = {"created": 0, "updated": 0, "dry-run": 0}

    for date_str in sorted_days:
        commits_data = days[date_str]
        content = format_journal_content(date_str, commits_data)
        status = write_journal_file(journal_dir, date_str, content, args.dry_run)
        stats[status] += 1

        if not args.dry_run:
            print(f"{date_str}: {status} ({len(commits_data)} commit(s))")

    # Summary
    print(f"\n{'='*60}")
    print("Summary:")
    print(f"  Total commits processed: {len(commits)}")
    print(f"  Days with commits: {len(sorted_days)}")
    if args.dry_run:
        print(f"  Files that would be created/updated: {len(sorted_days)}")
    else:
        print(f"  Files created: {stats['created']}")
        print(f"  Files updated: {stats['updated']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
