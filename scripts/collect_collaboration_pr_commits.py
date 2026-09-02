#!/usr/bin/env python3
"""Collect dated commits for PRs in the fixed repository sample."""

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

from collect_collaboration_thread_events import EVENT_FIELDS, normalize_commit, paginate
from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_STATUS = RESEARCH / "collaboration-thread-pr-commits-2026-status.csv"
DEFAULT_RUN = RESEARCH / "collaboration-thread-pr-commits-2026-run.json"
STATUS_FIELDS = ["sample_rank", "repo_name", "number", "commits", "pages", "endpoint_status", "scan_status", "error"]

GRAPHQL_QUERY = """
query PullRequestCommits($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on PullRequest {
      id
      commits(first: 100) {
        totalCount
        nodes {
          commit {
            oid
            committedDate
            message
            author { user { login __typename } }
            committer { user { login __typename } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
"""

GRAPHQL_PAGED_QUERY = """
query PullRequestCommitsPage($id: ID!, $cursor: String) {
  node(id: $id) {
    ... on PullRequest {
      commits(first: 100, after: $cursor) {
        nodes {
          commit {
            oid
            committedDate
            message
            author { user { login __typename } }
            committer { user { login __typename } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--status", type=Path, default=DEFAULT_STATUS)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--transport", choices=("rest", "graphql"), default="rest")
    parser.add_argument("--batch-size", type=int, default=40)
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


def chunks(rows: list[dict[str, str]], size: int) -> list[list[dict[str, str]]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def graphql_commit_event(sample_row: dict[str, str], node: dict[str, Any], collected_at: str) -> dict[str, Any]:
    commit = node.get("commit") if isinstance(node.get("commit"), dict) else {}
    author_user = ((commit.get("author") or {}).get("user") or {})
    committer_user = ((commit.get("committer") or {}).get("user") or {})
    author = {"login": author_user.get("login", ""), "type": author_user.get("__typename", "")}
    committer = {"login": committer_user.get("login", ""), "type": committer_user.get("__typename", "")}
    return normalize_commit(
        sample_row,
        {
            "sha": commit.get("oid", ""),
            "author": author if author.get("login") else None,
            "committer": committer if committer.get("login") else None,
            "commit": {
                "message": commit.get("message", ""),
                "committer": {"date": commit.get("committedDate", "")},
            },
        },
        collected_at,
    )


def collect_graphql_commit_pages(
    client: GitHubClient, sample_row: dict[str, str], collected_at: str
) -> tuple[list[dict[str, Any]], int]:
    cursor: str | None = None
    rows: list[dict[str, Any]] = []
    pages = 0
    while True:
        data = client.graphql(GRAPHQL_PAGED_QUERY, {"id": sample_row["node_id"], "cursor": cursor})
        connection = ((data.get("node") or {}).get("commits") or {})
        rows.extend(graphql_commit_event(sample_row, item, collected_at) for item in connection.get("nodes") or [])
        pages += 1
        page_info = connection.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            return rows, pages
        cursor = page_info.get("endCursor")
        if not cursor or pages >= 100:
            raise RuntimeError("GraphQL commit pagination did not terminate")


def collect_graphql(args: argparse.Namespace, sample: list[dict[str, str]], token: str) -> None:
    client = GitHubClient(token)
    existing_events = [] if args.fresh else read_csv(args.output)
    existing_statuses = [] if args.fresh else read_csv(args.status)
    completed = {
        (row["repo_name"], row["number"])
        for row in existing_statuses
        if row.get("scan_status") in {"ok", "missing_endpoint"}
    }
    pending = [row for row in sample if (row["repo_name"], row["number"]) not in completed]
    events_by_key: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in existing_events:
        events_by_key[(row["repo_name"], row["number"])].append(row)
    status_by_key = {(row["repo_name"], row["number"]): row for row in existing_statuses}
    started_at = datetime.now(UTC).isoformat()
    batches = chunks(pending, args.batch_size)
    for index, batch in enumerate(batches, start=1):
        print(f"[{index}/{len(batches)}] {len(batch)} pull requests via GraphQL", flush=True)
        collected_at = datetime.now(UTC).isoformat()
        try:
            data = client.graphql(GRAPHQL_QUERY, {"ids": [row["node_id"] for row in batch]})
            nodes = data.get("nodes") or []
            for sample_row, node in zip(batch, nodes, strict=False):
                key = sample_row["repo_name"], sample_row["number"]
                connection = (node or {}).get("commits") or {}
                if not node:
                    status_by_key[key] = {
                        "sample_rank": sample_row["sample_rank"], "repo_name": sample_row["repo_name"],
                        "number": sample_row["number"], "scan_status": "error", "error": "GraphQL PR node missing",
                    }
                    continue
                pages = 1
                if (connection.get("pageInfo") or {}).get("hasNextPage"):
                    collected, pages = collect_graphql_commit_pages(client, sample_row, collected_at)
                else:
                    collected = [graphql_commit_event(sample_row, item, collected_at) for item in connection.get("nodes") or []]
                events_by_key[key] = collected
                status_by_key[key] = {
                    "sample_rank": sample_row["sample_rank"], "repo_name": sample_row["repo_name"],
                    "number": sample_row["number"], "commits": len(collected), "pages": pages,
                    "endpoint_status": "ok", "scan_status": "ok", "error": "",
                }
        except Exception as exc:
            for sample_row in batch:
                key = sample_row["repo_name"], sample_row["number"]
                status_by_key[key] = {
                    "sample_rank": sample_row["sample_rank"], "repo_name": sample_row["repo_name"],
                    "number": sample_row["number"], "scan_status": "error", "error": str(exc)[:500],
                }
        ordered_events = [event for row in sample for event in events_by_key.get((row["repo_name"], row["number"]), [])]
        ordered_status = [status_by_key[(row["repo_name"], row["number"])] for row in sample if (row["repo_name"], row["number"]) in status_by_key]
        write_csv(args.output, EVENT_FIELDS, ordered_events)
        write_csv(args.status, STATUS_FIELDS, ordered_status)

    relevant = [status_by_key[(row["repo_name"], row["number"])] for row in sample if (row["repo_name"], row["number"]) in status_by_key]
    ordered_events = [event for row in sample for event in events_by_key.get((row["repo_name"], row["number"]), [])]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "transport": "graphql",
        "repositories": len({row["repo_name"] for row in sample}),
        "pull_requests": len(sample),
        "threads_complete": sum(row.get("scan_status") == "ok" for row in relevant),
        "missing_endpoints": sum(row.get("scan_status") == "missing_endpoint" for row in relevant),
        "errors": [row for row in relevant if row.get("scan_status") == "error"],
        "commit_rows": len(ordered_events),
        "http_requests": client.requests,
        "outputs": [display_path(args.output), display_path(args.status)],
        "limitations": [
            "GraphQL batches collect the first 100 commits and paginate larger PRs individually.",
            "A commit after a review is an observable revision loop, not proof that the review caused the commit.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


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
    if args.transport == "graphql":
        collect_graphql(args, sample, token)
        return
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

    def collect_one(sample_row: dict[str, str]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        collected_at = datetime.now(UTC).isoformat()
        try:
            commits, pages, endpoint_status = paginate(
                worker_client(), f"/repos/{sample_row['repo_name']}/pulls/{sample_row['number']}/commits"
            )
            return [normalize_commit(sample_row, item, collected_at) for item in commits], {
                "sample_rank": sample_row["sample_rank"],
                "repo_name": sample_row["repo_name"],
                "number": sample_row["number"],
                "commits": len(commits),
                "pages": pages,
                "endpoint_status": endpoint_status,
                "scan_status": "ok" if endpoint_status == "ok" else "missing_endpoint",
                "error": "",
            }
        except Exception as exc:
            return [], {
                "sample_rank": sample_row["sample_rank"],
                "repo_name": sample_row["repo_name"],
                "number": sample_row["number"],
                "scan_status": "error",
                "error": str(exc)[:500],
            }
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
        pending = []
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
            pending.append(sample_row)
        if pending:
            with ThreadPoolExecutor(max_workers=args.workers) as executor:
                for collected_events, status in executor.map(collect_one, pending):
                    repo_events.extend(collected_events)
                    repo_status.append(status)
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
        "http_requests": sum(client.requests for client in worker_clients),
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
