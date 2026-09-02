#!/usr/bin/env python3
"""Keep the existing 20-thread sample and add 30 new threads per repository."""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup
from collect_collaboration_items import parse_time
from sample_collaboration_threads import (
    ITEM_FIELDS,
    REPOSITORY_FIELDS,
    normalize_item,
)


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_MONTHLY = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_REPOSITORIES = RESEARCH / "collaboration-thread-sample-2026-repositories.csv"
DEFAULT_RUN = RESEARCH / "collaboration-thread-sample-2026-run.json"
SINCE = "2026-01-01T00:00:00Z"
UNTIL = "2026-08-31T23:59:59Z"
SUPPLEMENT_SEED = 260831
TARGET_PER_REPOSITORY = 50


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--monthly", type=Path, default=DEFAULT_MONTHLY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--repositories", type=Path, default=DEFAULT_REPOSITORIES)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def number_frame(client: GitHubClient, repo: str) -> tuple[int, int]:
    period = "created:2026-01-01..2026-08-31"
    oldest_query = json.dumps(f"repo:{repo} {period} sort:created-asc")
    newest_query = json.dumps(f"repo:{repo} {period} sort:created-desc")
    query = f"""
    query {{
      oldest: search(type: ISSUE, query: {oldest_query}, first: 1) {{
        nodes {{
          ... on Issue {{ number }}
          ... on PullRequest {{ number }}
        }}
      }}
      newest: search(type: ISSUE, query: {newest_query}, first: 1) {{
        nodes {{
          ... on Issue {{ number }}
          ... on PullRequest {{ number }}
        }}
      }}
      rateLimit {{ cost remaining resetAt }}
    }}
    """
    data = client.graphql(query, {})
    oldest = data["oldest"]["nodes"]
    newest = data["newest"]["nodes"]
    if not oldest or not newest:
        raise RuntimeError("No Issue or pull request found in the complete eight-month window")
    return int(oldest[0]["number"]), int(newest[0]["number"])


def main() -> None:
    args = parse_args()
    repositories = read_csv(args.sample)
    if len(repositories) != 100:
        raise SystemExit(f"Expected 100 repositories, found {len(repositories)}")
    if args.max_repos:
        repositories = repositories[: args.max_repos]

    monthly = [row for row in read_csv(args.monthly) if row["month"] == "2026-08"]
    populations = {
        row["repo_name"]: int(row["issues_opened_cumulative"]) + int(row["prs_opened_cumulative"])
        for row in monthly
    }
    item_rows = read_csv(args.output)
    repository_rows = read_csv(args.repositories)
    initial_counts = Counter(row["repo_name"] for row in item_rows)
    unexpected = {
        repo: count
        for repo, count in initial_counts.items()
        if repo in {row["repo_name"] for row in repositories} and count not in {20, TARGET_PER_REPOSITORY}
    }
    if unexpected:
        raise SystemExit(f"Expected the preserved 20-thread base or a completed 50-thread sample: {unexpected}")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    since = parse_time(SINCE)
    until = parse_time(UNTIL)
    started_at = datetime.now(UTC).isoformat()
    errors: list[dict[str, str]] = []

    for index, sample_row in enumerate(repositories, start=1):
        repo = sample_row["repo_name"]
        existing = [row for row in item_rows if row["repo_name"] == repo]
        if len(existing) == TARGET_PER_REPOSITORY:
            print(f"[{index}/{len(repositories)}] {repo} (50 preserved)", flush=True)
            continue
        if len(existing) != 20:
            errors.append({"repo_name": repo, "error": f"expected 20 base rows, found {len(existing)}"})
            continue

        print(f"[{index}/{len(repositories)}] {repo}: adding 30", flush=True)
        population = populations[repo]
        existing_numbers = {int(row["number"]) for row in existing}
        selected_payloads: list[dict[str, Any]] = []
        attempted: set[int] = set()
        collected_at = datetime.now(UTC).isoformat()
        try:
            frame_min, frame_max = number_frame(client, repo)
            frame_numbers = [number for number in range(frame_min, frame_max + 1) if number not in existing_numbers]
            rng = random.Random(f"{SUPPLEMENT_SEED}:supplement:{repo}")
            rng.shuffle(frame_numbers)
            required = TARGET_PER_REPOSITORY - len(existing)
            max_attempts = min(len(frame_numbers), max(required * 25, required + 100))
            for number in frame_numbers[:max_attempts]:
                attempted.add(number)
                response = client.get(f"/repos/{repo}/issues/{number}", allowed={200, 404, 410})
                if response.status_code != 200:
                    continue
                item = response.json()
                created_at = parse_time(str(item.get("created_at") or ""))
                if not (since <= created_at <= until):
                    continue
                selected_payloads.append(item)
                if len(selected_payloads) == required:
                    break
            if len(selected_payloads) != required:
                raise RuntimeError(f"Selected {len(selected_payloads)} of {required} supplemental items")

            supplemental_rows = []
            for item in selected_payloads:
                row = normalize_item(
                    sample_row,
                    item,
                    population=population,
                    selected=TARGET_PER_REPOSITORY,
                    frame_min=frame_min,
                    frame_max=frame_max,
                    collected_at=collected_at,
                )
                row.update(
                    {
                        "inclusion_probability": "",
                        "sampling_weight": 1,
                        "sampling_seed": SUPPLEMENT_SEED,
                        "sampling_method": "supplemental_uniform_issue_number_rejection_sample",
                    }
                )
                supplemental_rows.append(row)

            for row in existing:
                row.update(
                    {
                        "population_items": population,
                        "selected_items": TARGET_PER_REPOSITORY,
                        "inclusion_probability": "",
                        "sampling_weight": 1,
                    }
                )
            item_rows = [row for row in item_rows if row["repo_name"] != repo]
            item_rows.extend(existing + supplemental_rows)
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "population_items": population,
                    "frame_min_number": frame_min,
                    "frame_max_number": frame_max,
                    "frame_slots": frame_max - frame_min + 1,
                    "target_items": TARGET_PER_REPOSITORY,
                    "selected_items": TARGET_PER_REPOSITORY,
                    "attempted_numbers": len(attempted),
                    "missing_or_ineligible_numbers": len(attempted) - len(selected_payloads),
                    "scan_status": "ok_supplemented",
                    "error": "",
                }
            )
            write_csv(args.output, ITEM_FIELDS, item_rows)
            write_csv(args.repositories, REPOSITORY_FIELDS, repository_rows)
        except Exception as exc:
            errors.append({"repo_name": repo, "error": str(exc)[:500]})

    final_counts = Counter(row["repo_name"] for row in item_rows)
    complete = sum(final_counts[row["repo_name"]] == TARGET_PER_REPOSITORY for row in repositories)
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "study_window": f"{SINCE}..{UNTIL}",
        "base_sample_preserved": 2000,
        "supplemental_items_added": sum(max(0, final_counts[row["repo_name"]] - 20) for row in repositories),
        "sample_items": sum(final_counts[row["repo_name"]] for row in repositories),
        "items_per_repository": TARGET_PER_REPOSITORY,
        "repositories_complete": complete,
        "repository_errors": errors,
        "sampling_seed": SUPPLEMENT_SEED,
        "http_requests": client.requests,
        "analysis_weighting": "none; every sampled thread counts once",
        "limitations": [
            "The original 20 threads per repository were preserved; 30 more were sampled without replacement from numbers not already selected.",
            "The first-stage sample ended on 2026-08-29 and the supplement uses the complete window through 2026-08-31.",
            "Results are descriptive of these 5,000 sampled threads and are not population-weighted estimates.",
            "Equal repository quotas make cross-repository coverage easier to inspect but do not reproduce the ecosystem-wide distribution of repository traffic.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)
    if complete != len(repositories) or errors:
        raise SystemExit("Supplement did not complete for all repositories")


if __name__ == "__main__":
    main()
