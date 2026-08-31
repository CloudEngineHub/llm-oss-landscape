#!/usr/bin/env python3
"""Collect 2026 collaboration breadth and GitHub release cadence for the Top 100."""

from __future__ import annotations

import argparse
import csv
import json
import os
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SAMPLE = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-sample-top100-2607.csv"
)
DEFAULT_OUTPUT = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-repository-profile-2026.csv"
)
DEFAULT_RUN_OUTPUT = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-repository-profile-2026-run.json"
)
OBSERVATION_START = "2026-01-01T00:00:00Z"
OBSERVATION_END_EXCLUSIVE = "2026-08-30T00:00:00Z"
COLLABORATION_EVENT_TYPES = (
    "IssuesEvent",
    "PullRequestEvent",
    "IssueCommentEvent",
    "PullRequestReviewEvent",
    "PullRequestReviewCommentEvent",
)
OUTPUT_FIELDS = [
    "sample_rank",
    "repo_id",
    "repo_name",
    "observation_start",
    "observation_end_exclusive",
    "push_actors",
    "collaboration_actors",
    "github_releases",
    "github_stable_releases",
    "github_prereleases",
    "github_release_days",
    "github_stable_release_days",
    "github_release_median_gap_days",
    "github_release_day_median_gap_days",
    "github_first_release_at",
    "github_latest_release_at",
    "event_source",
    "release_source",
    "quality_flag",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN_OUTPUT)
    return parser.parse_args()


def read_sample(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 100:
        raise ValueError(f"Expected 100 sample repositories, found {len(rows)}")
    if len({row["repo_id"] for row in rows}) != 100:
        raise ValueError("Sample contains duplicate repository IDs")
    return rows


def clickhouse_profile(sample: list[dict[str, str]]) -> dict[str, dict[str, int]]:
    load_dotenv(ROOT / ".env")
    host = os.getenv("CLICKHOUSE_HOST")
    user = os.getenv("CLICKHOUSE_USER")
    password = os.getenv("CLICKHOUSE_PASSWORD")
    if not all((host, user, password)):
        raise RuntimeError("CLICKHOUSE_HOST, CLICKHOUSE_USER and CLICKHOUSE_PASSWORD are required")

    repo_ids = ",".join(row["repo_id"] for row in sample)
    event_types = ",".join(f"'{value}'" for value in COLLABORATION_EVENT_TYPES)
    query = f"""
SELECT
    repo_id,
    uniqExactIf(actor_id, actor_id != 0 AND type = 'PushEvent') AS push_actors,
    uniqExactIf(actor_id, actor_id != 0 AND type IN ({event_types})) AS collaboration_actors
FROM opensource.events
WHERE platform = 'GitHub'
  AND repo_id IN ({repo_ids})
  AND created_at >= '{OBSERVATION_START[:10]}'
  AND created_at < '{OBSERVATION_END_EXCLUSIVE[:10]}'
GROUP BY repo_id
FORMAT CSVWithNames
"""
    session = requests.Session()
    session.trust_env = False
    response = session.post(
        f"http://{host}:8123/",
        params={"query": query},
        auth=(user, password),
        timeout=90,
    )
    response.raise_for_status()
    rows = list(csv.DictReader(response.text.splitlines()))
    if len(rows) != 100:
        raise ValueError(f"Expected actor coverage for 100 repositories, found {len(rows)}")
    return {
        row["repo_id"]: {
            "push_actors": int(row["push_actors"]),
            "collaboration_actors": int(row["collaboration_actors"]),
        }
        for row in rows
    }


def github_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "agentic-ai-landscape-research",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def parse_github_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


RELEASE_QUERY = """
query($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    releases(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { id createdAt publishedAt isPrerelease isDraft }
      pageInfo { hasNextPage endCursor }
    }
  }
  rateLimit { remaining cost }
}
"""


def fetch_releases(
    repo_name: str, headers: dict[str, str]
) -> tuple[list[dict[str, Any]], int | None, int]:
    releases: list[dict[str, Any]] = []
    owner, name = repo_name.split("/", 1)
    cursor: str | None = None
    remaining: int | None = None
    requests_used = 0
    while True:
        response = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={
                "query": RELEASE_QUERY,
                "variables": {"owner": owner, "name": name, "cursor": cursor},
            },
            timeout=45,
        )
        response.raise_for_status()
        requests_used += 1
        payload = response.json()
        if payload.get("errors"):
            raise RuntimeError(f"GitHub GraphQL failed for {repo_name}: {payload['errors']}")
        remaining = int(payload["data"]["rateLimit"]["remaining"])
        connection = payload["data"]["repository"]["releases"]
        batch = [
            {
                "id": item["id"],
                "created_at": item["createdAt"],
                "published_at": item["publishedAt"],
                "prerelease": item["isPrerelease"],
                "draft": item["isDraft"],
            }
            for item in connection["nodes"]
        ]
        releases.extend(batch)
        if not connection["pageInfo"]["hasNextPage"]:
            break
        # GitHub orders this endpoint by release creation time. Once the oldest
        # item on a full page predates the study window, later pages cannot add
        # ordinary releases created inside the window. A long-lived draft that
        # was created before 2026 and only published in 2026 remains a documented
        # edge case.
        created_times = [
            parse_github_time(item["created_at"])
            for item in batch
            if item.get("created_at")
        ]
        if created_times and min(created_times) < parse_github_time(OBSERVATION_START):
            break
        cursor = connection["pageInfo"]["endCursor"]
    return releases, remaining, requests_used


def release_profile(releases: list[dict[str, Any]]) -> dict[str, Any]:
    start = parse_github_time(OBSERVATION_START)
    end = parse_github_time(OBSERVATION_END_EXCLUSIVE)
    published_by_id = {
        item["id"]: item
        for item in releases
        if item.get("id")
    }
    published = [
        item
        for item in published_by_id.values()
        if not item.get("draft")
        and item.get("published_at")
        and start <= parse_github_time(item["published_at"]) < end
    ]
    published.sort(key=lambda item: item["published_at"])
    gaps = [
        (
            parse_github_time(current["published_at"])
            - parse_github_time(previous["published_at"])
        ).total_seconds()
        / 86400
        for previous, current in zip(published, published[1:])
    ]
    release_days = sorted(
        {parse_github_time(item["published_at"]).date() for item in published}
    )
    stable_release_days = {
        parse_github_time(item["published_at"]).date()
        for item in published
        if not item.get("prerelease")
    }
    release_day_gaps = [
        (current - previous).days
        for previous, current in zip(release_days, release_days[1:])
    ]
    return {
        "github_releases": len(published),
        "github_stable_releases": sum(not item.get("prerelease") for item in published),
        "github_prereleases": sum(bool(item.get("prerelease")) for item in published),
        "github_release_days": len(release_days),
        "github_stable_release_days": len(stable_release_days),
        "github_release_median_gap_days": (
            round(statistics.median(gaps), 2) if gaps else ""
        ),
        "github_release_day_median_gap_days": (
            round(statistics.median(release_day_gaps), 2) if release_day_gaps else ""
        ),
        "github_first_release_at": published[0]["published_at"] if published else "",
        "github_latest_release_at": published[-1]["published_at"] if published else "",
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    sample = read_sample(args.sample)
    load_dotenv(ROOT / ".env")
    actor_profile = clickhouse_profile(sample)
    headers = github_headers()
    output_by_repo: dict[str, dict[str, Any]] = {}
    rate_limit_remaining: int | None = None
    github_requests = 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(fetch_releases, row["repo_name"], headers): row
            for row in sample
        }
        for index, future in enumerate(as_completed(futures), start=1):
            sample_row = futures[future]
            releases, remaining, requests_used = future.result()
            github_requests += requests_used
            if remaining is not None:
                rate_limit_remaining = (
                    remaining
                    if rate_limit_remaining is None
                    else min(rate_limit_remaining, remaining)
                )
            actors = actor_profile[sample_row["repo_id"]]
            output_by_repo[sample_row["repo_name"]] = {
                "sample_rank": sample_row["sample_rank"],
                "repo_id": sample_row["repo_id"],
                "repo_name": sample_row["repo_name"],
                "observation_start": OBSERVATION_START,
                "observation_end_exclusive": OBSERVATION_END_EXCLUSIVE,
                **actors,
                **release_profile(releases),
                "event_source": "OpenDigger ClickHouse opensource.events",
                "release_source": "GitHub GraphQL repository.releases",
                "quality_flag": "complete_top100_snapshot",
            }
            if index % 10 == 0:
                print(f"release profile: {index}/100", flush=True)

    output = [output_by_repo[row["repo_name"]] for row in sample]

    write_csv(args.output, output)
    run = {
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "sample": str(args.sample.relative_to(ROOT)),
        "output": str(args.output.relative_to(ROOT)),
        "repositories": len(output),
        "observation_start": OBSERVATION_START,
        "observation_end_exclusive": OBSERVATION_END_EXCLUSIVE,
        "github_requests": github_requests,
        "github_rate_limit_remaining": rate_limit_remaining,
        "definitions": {
            "push_actors": "Distinct actor_id values on PushEvent records; this identifies people/accounts that pushed, not every commit author.",
            "collaboration_actors": "Distinct actor_id values on Issue, Pull Request, comment, review and review-comment events.",
            "github_releases": "Non-draft GitHub Releases published inside the observation window, including prereleases.",
            "github_release_days": "Distinct UTC calendar days with at least one published GitHub Release; this reduces inflation from multi-package and canary automation.",
        },
        "limitations": [
            "PushEvent actor is the pusher and may differ from commit authors.",
            "Actor counts include public automation accounts and the two actor groups can overlap.",
            "GitHub Releases do not cover tags or releases published only to package registries.",
            "The Releases endpoint is paged until its creation-time order crosses the study-window boundary; a draft created before 2026 and published in 2026 could be missed.",
        ],
    }
    args.run_output.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, indent=2))


if __name__ == "__main__":
    main()
