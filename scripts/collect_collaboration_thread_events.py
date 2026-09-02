#!/usr/bin/env python3
"""Collect timeline events for the fixed 50-threads-per-repository sample."""

from __future__ import annotations

import argparse
import csv
import json
import os
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collect_collaboration_items import ai_disclosure, app_identity, initial_actor_class
from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_EVENTS = RESEARCH / "collaboration-thread-events-2026.csv"
DEFAULT_STATUS = RESEARCH / "collaboration-thread-events-2026-status.csv"
DEFAULT_RUN = RESEARCH / "collaboration-thread-events-2026-run.json"

EVENT_FIELDS = [
    "sample_rank",
    "repo_name",
    "item_type",
    "number",
    "event_source",
    "event_type",
    "event_id",
    "created_at",
    "actor_login",
    "actor_github_type",
    "author_association",
    "actor_initial_class",
    "performed_via_github_app",
    "ai_disclosure_candidate",
    "ai_disclosure_evidence",
    "review_state",
    "commit_sha",
    "commit_author_login",
    "commit_committer_login",
    "collected_at",
]

STATUS_FIELDS = [
    "sample_rank",
    "repo_name",
    "item_type",
    "number",
    "timeline_events",
    "timeline_comment_events",
    "timeline_review_events",
    "timeline_commit_events",
    "timeline_endpoint_status",
    "review_events",
    "review_endpoint_status",
    "commit_events",
    "commit_endpoint_status",
    "timeline_pages",
    "review_pages",
    "commit_pages",
    "scan_status",
    "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    parser.add_argument("--status", type=Path, default=DEFAULT_STATUS)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument(
        "--include-pr-details",
        action="store_true",
        help="Also collect dedicated review and commit endpoints; timeline-only is the rate-efficient default.",
    )
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


def paginate(client: GitHubClient, path: str) -> tuple[list[dict[str, Any]], int, str]:
    rows: list[dict[str, Any]] = []
    next_url: str | None = path
    pages = 0
    while next_url:
        params = {"per_page": 100} if pages == 0 else None
        response = client.get(next_url, params=params, allowed={200, 404, 410})
        pages += 1
        if response.status_code in {404, 410}:
            return [], pages, f"http_{response.status_code}"
        payload = response.json()
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected list payload for {path}")
        rows.extend(payload)
        next_url = response.links.get("next", {}).get("url")
        if pages > 100:
            raise RuntimeError(f"Pagination safety limit reached for {path}")
    return rows, pages, "ok"


def actor(item: dict[str, Any]) -> dict[str, Any] | None:
    for key in ("actor", "user", "author"):
        value = item.get(key)
        if isinstance(value, dict) and (value.get("login") or value.get("type")):
            return value
    return None


def normalize_timeline(sample: dict[str, str], item: dict[str, Any], collected_at: str) -> dict[str, Any]:
    user = actor(item)
    disclosure, evidence = ai_disclosure(item.get("body"))
    return {
        "sample_rank": sample["sample_rank"],
        "repo_name": sample["repo_name"],
        "item_type": sample["item_type"],
        "number": sample["number"],
        "event_source": "timeline",
        "event_type": item.get("event") or "commented",
        "event_id": item.get("id", ""),
        "created_at": item.get("created_at") or item.get("submitted_at") or "",
        "actor_login": (user or {}).get("login", ""),
        "actor_github_type": (user or {}).get("type", ""),
        "author_association": item.get("author_association", ""),
        "actor_initial_class": initial_actor_class(user),
        "performed_via_github_app": app_identity(item),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": evidence,
        "review_state": item.get("state", "") if item.get("event") == "reviewed" else "",
        "commit_sha": item.get("sha", ""),
        "collected_at": collected_at,
    }


def normalize_review(sample: dict[str, str], item: dict[str, Any], collected_at: str) -> dict[str, Any]:
    user = item.get("user")
    disclosure, evidence = ai_disclosure(item.get("body"))
    return {
        "sample_rank": sample["sample_rank"],
        "repo_name": sample["repo_name"],
        "item_type": sample["item_type"],
        "number": sample["number"],
        "event_source": "pull_review",
        "event_type": "reviewed",
        "event_id": item.get("id", ""),
        "created_at": item.get("submitted_at", ""),
        "actor_login": (user or {}).get("login", ""),
        "actor_github_type": (user or {}).get("type", ""),
        "author_association": item.get("author_association", ""),
        "actor_initial_class": initial_actor_class(user),
        "performed_via_github_app": app_identity(item),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": evidence,
        "review_state": item.get("state", ""),
        "commit_sha": item.get("commit_id", ""),
        "collected_at": collected_at,
    }


def normalize_commit(sample: dict[str, str], item: dict[str, Any], collected_at: str) -> dict[str, Any]:
    author = item.get("author") if isinstance(item.get("author"), dict) else None
    committer = item.get("committer") if isinstance(item.get("committer"), dict) else None
    git_commit = item.get("commit") if isinstance(item.get("commit"), dict) else {}
    git_committer = git_commit.get("committer") if isinstance(git_commit.get("committer"), dict) else {}
    disclosure, evidence = ai_disclosure(git_commit.get("message"))
    return {
        "sample_rank": sample["sample_rank"],
        "repo_name": sample["repo_name"],
        "item_type": sample["item_type"],
        "number": sample["number"],
        "event_source": "pull_commit",
        "event_type": "committed",
        "event_id": item.get("sha", ""),
        "created_at": git_committer.get("date", ""),
        "actor_login": (committer or author or {}).get("login", ""),
        "actor_github_type": (committer or author or {}).get("type", ""),
        "author_association": "",
        "actor_initial_class": initial_actor_class(committer or author),
        "performed_via_github_app": "",
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": evidence,
        "review_state": "",
        "commit_sha": item.get("sha", ""),
        "commit_author_login": (author or {}).get("login", ""),
        "commit_committer_login": (committer or {}).get("login", ""),
        "collected_at": collected_at,
    }


def main() -> None:
    args = parse_args()
    samples = read_csv(args.sample)
    if not samples:
        raise SystemExit("Thread sample is empty")
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in samples:
        grouped[row["repo_name"]].append(row)
    repos = sorted(grouped, key=lambda repo: int(grouped[repo][0]["sample_rank"]))
    if args.max_repos:
        repos = repos[: args.max_repos]

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    thread_local = threading.local()
    worker_clients: list[GitHubClient] = []
    clients_lock = threading.Lock()

    def worker_client() -> GitHubClient:
        client = getattr(thread_local, "client", None)
        if client is None:
            client = GitHubClient(token)
            thread_local.client = client
            with clients_lock:
                worker_clients.append(client)
        return client

    def collect_one(sample: dict[str, str]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        client = worker_client()
        collected_at = datetime.now(UTC).isoformat()
        try:
            timeline, timeline_pages, timeline_status = paginate(
                client, f"/repos/{sample['repo_name']}/issues/{sample['number']}/timeline"
            )
            reviews: list[dict[str, Any]] = []
            commits: list[dict[str, Any]] = []
            review_pages = 0
            commit_pages = 0
            review_status = "not_collected"
            commit_status = "not_collected"
            if sample["item_type"] == "pull_request" and args.include_pr_details:
                reviews, review_pages, review_status = paginate(
                    client, f"/repos/{sample['repo_name']}/pulls/{sample['number']}/reviews"
                )
                commits, commit_pages, commit_status = paginate(
                    client, f"/repos/{sample['repo_name']}/pulls/{sample['number']}/commits"
                )
            collected_events = [normalize_timeline(sample, item, collected_at) for item in timeline]
            collected_events.extend(normalize_review(sample, item, collected_at) for item in reviews)
            collected_events.extend(normalize_commit(sample, item, collected_at) for item in commits)
            status = {
                "sample_rank": sample["sample_rank"],
                "repo_name": sample["repo_name"],
                "item_type": sample["item_type"],
                "number": sample["number"],
                "timeline_events": len(timeline),
                "timeline_comment_events": sum((item.get("event") or "commented") == "commented" for item in timeline),
                "timeline_review_events": sum(item.get("event") == "reviewed" for item in timeline),
                "timeline_commit_events": sum(item.get("event") == "committed" for item in timeline),
                "timeline_endpoint_status": timeline_status,
                "review_events": len(reviews),
                "review_endpoint_status": review_status,
                "commit_events": len(commits),
                "commit_endpoint_status": commit_status,
                "timeline_pages": timeline_pages,
                "review_pages": review_pages,
                "commit_pages": commit_pages,
                "scan_status": "ok" if timeline_status == "ok" else "missing_timeline",
                "error": "",
            }
            return collected_events, status
        except Exception as exc:
            return [], {
                "sample_rank": sample["sample_rank"],
                "repo_name": sample["repo_name"],
                "item_type": sample["item_type"],
                "number": sample["number"],
                "scan_status": "error",
                "error": str(exc)[:500],
            }

    events = [] if args.fresh else read_csv(args.events)
    statuses = [] if args.fresh else read_csv(args.status)
    completed = {
        (row["repo_name"], row["number"])
        for row in statuses
        if row.get("scan_status") == "ok"
    }
    started_at = datetime.now(UTC).isoformat()

    for index, repo in enumerate(repos, start=1):
        print(f"[{index}/{len(repos)}] {repo}", flush=True)
        repo_events = [row for row in events if row.get("repo_name") != repo]
        repo_statuses = [row for row in statuses if row.get("repo_name") != repo]
        pending = []
        for sample in grouped[repo]:
            key = (repo, sample["number"])
            if key in completed:
                repo_events.extend(row for row in events if row.get("repo_name") == repo and row.get("number") == sample["number"])
                repo_statuses.extend(row for row in statuses if row.get("repo_name") == repo and row.get("number") == sample["number"])
                continue
            pending.append(sample)
        if pending:
            with ThreadPoolExecutor(max_workers=args.workers) as executor:
                for collected_events, status in executor.map(collect_one, pending):
                    repo_events.extend(collected_events)
                    repo_statuses.append(status)
        events = repo_events
        statuses = repo_statuses
        write_csv(args.events, EVENT_FIELDS, events)
        write_csv(args.status, STATUS_FIELDS, statuses)

    repo_set = set(repos)
    relevant_status = [row for row in statuses if row["repo_name"] in repo_set]
    rate_client = GitHubClient(token)
    rate = rate_client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories_requested": len(repos),
        "threads_requested": sum(len(grouped[repo]) for repo in repos),
        "threads_complete": sum(row.get("scan_status") == "ok" for row in relevant_status),
        "threads_missing_timeline": sum(
            row.get("scan_status") == "missing_timeline" for row in relevant_status
        ),
        "thread_errors": [row for row in relevant_status if row.get("scan_status") == "error"],
        "events": sum(1 for row in events if row["repo_name"] in repo_set),
        "http_requests": sum(client.requests for client in worker_clients) + rate_client.requests,
        "core_rate_limit": rate.get("core"),
        "outputs": [display_path(args.events), display_path(args.status)],
        "limitations": [
            "Timeline actors and review actors are public observations; a human-typed GitHub account may still be operating an Agent.",
            "The default collection uses the Issue timeline for comments, reviews and commit events. Dedicated PR review and commit endpoints are optional because they materially increase API cost.",
            "Commit author and committer are saved separately. Missing GitHub account links remain unknown rather than human.",
            "The actor registry and disclosure review must run before automation-only and human-present thread labels are final.",
            "Deleted or no-longer-visible timeline endpoints are recorded as missing evidence, not as empty collaboration.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
