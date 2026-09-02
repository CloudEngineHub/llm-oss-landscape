#!/usr/bin/env python3
"""Sample the frozen Top 100 at a fixed per-repository quota for one year."""

from __future__ import annotations

import argparse
import calendar
import csv
import json
import os
import random
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup
from collect_collaboration_items import parse_time
from sample_collaboration_threads import ITEM_FIELDS, normalize_item


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_MANIFEST = RESEARCH / "collaboration-sample-top100-2607.csv"
STATUS_FIELDS = [
    "sample_rank", "repo_name", "year", "population_items", "target_items", "selected_items",
    "frame_min_number", "frame_max_number", "attempted_numbers", "scan_status", "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--items-per-repo", type=int, default=50)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--status", type=Path)
    parser.add_argument("--run-output", type=Path)
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


def frame(client: GitHubClient, repo: str, year: int) -> tuple[int, int, int]:
    end = "08-31"
    period = f"created:{year}-01-01..{year}-{end}"
    oldest_query = json.dumps(f"repo:{repo} {period} sort:created-asc")
    newest_query = json.dumps(f"repo:{repo} {period} sort:created-desc")
    query = f"""
    query {{
      oldest: search(type: ISSUE, query: {oldest_query}, first: 1) {{
        issueCount
        nodes {{ ... on Issue {{ number }} ... on PullRequest {{ number }} }}
      }}
      newest: search(type: ISSUE, query: {newest_query}, first: 1) {{
        nodes {{ ... on Issue {{ number }} ... on PullRequest {{ number }} }}
      }}
      rateLimit {{ cost remaining resetAt }}
    }}
    """
    data = client.graphql(query, {})
    population = int(data["oldest"]["issueCount"])
    if not population:
        return 0, 0, 0
    return population, int(data["oldest"]["nodes"][0]["number"]), int(data["newest"]["nodes"][0]["number"])


def search_fallback(
    client: GitHubClient, repo: str, year: int, population: int, target: int, seed: int
) -> list[dict[str, Any]]:
    """Draw a reproducible sample across all eight months in one GraphQL request."""
    rng = random.Random(f"{seed}:{repo}:monthly-search")
    fragments: list[str] = []
    for month in range(1, 9):
        start = f"{year}-{month:02d}-01"
        end = f"{year}-{month:02d}-{calendar.monthrange(year, month)[1]:02d}"
        order = "asc" if rng.random() < 0.5 else "desc"
        query = json.dumps(f"repo:{repo} created:{start}..{end} sort:created-{order}")
        fragments.append(
            f'''m{month}: search(type: ISSUE, query: {query}, first: 100) {{
              issueCount
              nodes {{
                ... on Issue {{
                  number id url state createdAt updatedAt closedAt authorAssociation
                  author {{ login __typename }}
                }}
                ... on PullRequest {{
                  number id url state createdAt updatedAt closedAt mergedAt authorAssociation
                  author {{ login __typename }}
                }}
              }}
            }}'''
        )
    data = client.graphql("query {" + "\n".join(fragments) + "\nrateLimit { cost remaining resetAt }\n}", {})
    weighted_candidates: list[tuple[float, dict[str, Any]]] = []
    seen: set[int] = set()
    for month in range(1, 9):
        payload = data[f"m{month}"]
        candidates = payload.get("nodes", [])
        month_total = int(payload.get("issueCount") or 0)
        if not candidates or not month_total:
            continue
        month_weight = month_total / len(candidates)
        for node in candidates:
            number = int(node["number"])
            if number in seen:
                continue
            seen.add(number)
            author = node.get("author") or {}
            candidate = {
                "number": number,
                "node_id": node.get("id", ""),
                "html_url": node.get("url", ""),
                "state": str(node.get("state") or "").lower(),
                "created_at": node.get("createdAt", ""),
                "updated_at": node.get("updatedAt", ""),
                "closed_at": node.get("closedAt", ""),
                "body": "",
                "author_association": node.get("authorAssociation", ""),
                "user": {"login": author.get("login", ""), "type": author.get("__typename", "")},
                "comments": 0,
                "labels": [],
            }
            if "mergedAt" in node:
                candidate["pull_request"] = {"merged_at": node.get("mergedAt", "")}
            key = rng.random() ** (1.0 / month_weight)
            weighted_candidates.append((key, candidate))
    return [candidate for _, candidate in sorted(weighted_candidates, reverse=True)[:target]]


def main() -> None:
    args = parse_args()
    if args.year < 2008 or args.year > 2026:
        raise SystemExit("Year must be between 2008 and 2026")
    output = args.output or (RESEARCH / f"collaboration-thread-sample-{args.year}.csv")
    status_path = args.status or (RESEARCH / f"collaboration-thread-sample-{args.year}-status.csv")
    run_path = args.run_output or (RESEARCH / f"collaboration-thread-sample-{args.year}-run.json")
    manifest = read_csv(args.manifest)
    if len(manifest) != 100:
        raise SystemExit(f"Expected 100 repositories, found {len(manifest)}")
    if args.max_repos:
        manifest = manifest[: args.max_repos]
    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)
    items = [] if args.fresh else read_csv(output)
    statuses = [] if args.fresh else read_csv(status_path)
    completed = {row["repo_name"] for row in statuses if row.get("scan_status") in {"ok", "no_items"}}
    since = parse_time(f"{args.year}-01-01T00:00:00Z")
    until = parse_time(f"{args.year}-08-31T23:59:59Z")
    seed = 260900 + args.year
    started_at = datetime.now(UTC).isoformat()
    for index, sample_row in enumerate(manifest, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(manifest)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(manifest)}] {repo}", flush=True)
        items = [row for row in items if row.get("repo_name") != repo]
        statuses = [row for row in statuses if row.get("repo_name") != repo]
        attempted: set[int] = set()
        selected_payloads: list[dict[str, Any]] = []
        sampling_method = "annual_uniform_issue_number_rejection_sample"
        try:
            population, frame_min, frame_max = frame(client, repo, args.year)
            target = min(args.items_per_repo, population)
            if target:
                numbers = list(range(frame_min, frame_max + 1))
                random.Random(f"{seed}:{repo}").shuffle(numbers)
                # Historical repositories often have sparse Issue-number ranges.
                # The month-stratified Search path is both faster and covers the
                # full January-August window, so it is the default for this panel.
                max_attempts = 0
                for number in numbers[:max_attempts]:
                    attempted.add(number)
                    response = client.get(f"/repos/{repo}/issues/{number}", allowed={200, 404, 410})
                    if response.status_code != 200:
                        continue
                    payload = response.json()
                    created_at = parse_time(str(payload.get("created_at") or ""))
                    if not (since <= created_at <= until):
                        continue
                    selected_payloads.append(payload)
                    if len(selected_payloads) == target:
                        break
                if len(selected_payloads) != target:
                    selected_payloads = search_fallback(
                        client, repo, args.year, population, target, seed
                    )
                    sampling_method = "annual_github_search_fallback_sample"
                if len(selected_payloads) != target:
                    raise RuntimeError(f"Selected {len(selected_payloads)} of {target} target items")
            collected_at = datetime.now(UTC).isoformat()
            for payload in selected_payloads:
                row = normalize_item(
                    sample_row,
                    payload,
                    population=population,
                    selected=len(selected_payloads),
                    frame_min=frame_min,
                    frame_max=frame_max,
                    collected_at=collected_at,
                )
                row["sampling_seed"] = seed
                row["sampling_method"] = sampling_method
                items.append(row)
            statuses.append(
                {
                    "sample_rank": sample_row["sample_rank"], "repo_name": repo, "year": args.year,
                    "population_items": population, "target_items": target, "selected_items": len(selected_payloads),
                    "frame_min_number": frame_min, "frame_max_number": frame_max,
                    "attempted_numbers": len(attempted), "scan_status": "ok" if target else "no_items", "error": "",
                }
            )
        except Exception as exc:
            statuses.append(
                {
                    "sample_rank": sample_row["sample_rank"], "repo_name": repo, "year": args.year,
                    "population_items": "", "target_items": args.items_per_repo,
                    "selected_items": len(selected_payloads), "frame_min_number": "", "frame_max_number": "",
                    "attempted_numbers": len(attempted), "scan_status": "error", "error": str(exc)[:500],
                }
            )
        items.sort(key=lambda row: (int(row["sample_rank"]), int(row["number"])))
        statuses.sort(key=lambda row: int(row["sample_rank"]))
        write_csv(output, ITEM_FIELDS, items)
        write_csv(status_path, STATUS_FIELDS, statuses)

    relevant = {row["repo_name"] for row in manifest}
    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "year": args.year,
        "window": f"{args.year}-01-01..{args.year}-08-31",
        "repositories": len(manifest),
        "repositories_complete": sum(row.get("scan_status") in {"ok", "no_items"} and row["repo_name"] in relevant for row in statuses),
        "sample_items": sum(row["repo_name"] in relevant for row in items),
        "items_per_repository_target": args.items_per_repo,
        "http_requests": client.requests,
        "token_pool_size": client.token_pool_size,
        "token_switches": client.token_switches,
        "core_rate_limit": rate.get("core"),
        "errors": [row for row in statuses if row.get("scan_status") == "error" and row["repo_name"] in relevant],
        "outputs": [str(output.relative_to(ROOT)), str(status_path.relative_to(ROOT))],
        "limitations": [
            "The historical panel selects up to 50 accessible threads per repository across January-August, drawing candidates from every active month.",
            "Each repository contributes the same target count; the panel describes those sampled threads and does not reproduce ecosystem traffic share.",
        ],
    }
    run_path.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
