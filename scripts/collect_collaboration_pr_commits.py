#!/usr/bin/env python3
"""Collect dated pull-request commits for the probability thread sample."""

from __future__ import annotations

import argparse
import csv
import json
import os
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collect_collaboration_thread_events import EVENT_FIELDS, normalize_commit, paginate
from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_STATUS = RESEARCH / "collaboration-thread-pr-commits-2026-status.csv"
DEFAULT_RUN = RESEARCH / "collaboration-thread-pr-commits-2026-run.json"
STATUS_FIELDS = ["sample_rank", "repo_name", "number", "commits", "pages", "endpoint_status", "scan_status", "error"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--status", type=Path, default=DEFAULT_STATUS)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    sample = [row for row in read_csv(args.sample) if row.get("item_type") == "pull_request"]
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in sample:
        grouped[row["repo_name"]].append(row)
    repos = sorted(grouped, key=lambda repo: int(grouped[repo][0]["sample_rank"]))
    if args.max_repos:
        repos = repos[: args.max_repos]

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)
    events = [] if args.fresh else read_csv(args.output)
    statuses = [] if args.fresh else read_csv(args.status)
    completed = {
        (row["repo_name"], row["number"])
        for row in statuses
        if row.get("scan_status") in {"ok", "missing_endpoint"}
    }
    started_at = datetime.now(UTC).isoformat()
    for index, repo in enumerate(repos, start=1):
        print(f"[{index}/{len(repos)}] {repo}", flush=True)
        repo_events = [row for row in events if row.get("repo_name") != repo]
        repo_status = [row for row in statuses if row.get("repo_name") != repo]
        for sample_row in grouped[repo]:
            key = repo, sample_row["number"]
            if key in completed:
                repo_events.extend(
                    row for row in events
                    if row.get("repo_name") == repo and row.get("number") == sample_row["number"]
                )
                repo_status.extend(
                    row for row in statuses
                    if row.get("repo_name") == repo and row.get("number") == sample_row["number"]
                )
                continue
            collected_at = datetime.now(UTC).isoformat()
            try:
                commits, pages, endpoint_status = paginate(
                    client, f"/repos/{repo}/pulls/{sample_row['number']}/commits"
                )
                repo_events.extend(normalize_commit(sample_row, item, collected_at) for item in commits)
                repo_status.append(
                    {
                        "sample_rank": sample_row["sample_rank"],
                        "repo_name": repo,
                        "number": sample_row["number"],
                        "commits": len(commits),
                        "pages": pages,
                        "endpoint_status": endpoint_status,
                        "scan_status": "ok" if endpoint_status == "ok" else "missing_endpoint",
                        "error": "",
                    }
                )
            except Exception as exc:
                repo_status.append(
                    {
                        "sample_rank": sample_row["sample_rank"],
                        "repo_name": repo,
                        "number": sample_row["number"],
                        "scan_status": "error",
                        "error": str(exc)[:500],
                    }
                )
        events = repo_events
        statuses = repo_status
        write_csv(args.output, EVENT_FIELDS, events)
        write_csv(args.status, STATUS_FIELDS, statuses)

    relevant = [row for row in statuses if row["repo_name"] in set(repos)]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(repos),
        "pull_requests": sum(len(grouped[repo]) for repo in repos),
        "threads_complete": sum(row.get("scan_status") == "ok" for row in relevant),
        "missing_endpoints": sum(row.get("scan_status") == "missing_endpoint" for row in relevant),
        "errors": [row for row in relevant if row.get("scan_status") == "error"],
        "commit_rows": len(events),
        "http_requests": client.requests,
        "outputs": [display_path(args.output), display_path(args.status)],
        "limitations": [
            "Commit dates use the Git commit committer timestamp returned by the PR commits endpoint.",
            "A commit after a review is an observable revision loop, not proof that the review caused the commit.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
