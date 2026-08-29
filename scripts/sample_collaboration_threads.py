#!/usr/bin/env python3
"""Draw a reproducible probability sample of 2026 Issue/PR items by repository."""

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

from collect_collaboration_items import (
    ai_disclosure,
    app_identity,
    initial_actor_class,
    parse_time,
)
from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_MONTHLY = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_REPOSITORIES = RESEARCH / "collaboration-thread-sample-2026-repositories.csv"
DEFAULT_RUN = RESEARCH / "collaboration-thread-sample-2026-run.json"
SINCE = "2026-01-01T00:00:00Z"
UNTIL = "2026-08-29T23:59:59Z"
SEED = 260829

ITEM_FIELDS = [
    "sample_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "item_type",
    "number",
    "node_id",
    "html_url",
    "state",
    "outcome",
    "created_at",
    "updated_at",
    "closed_at",
    "merged_at",
    "author_login",
    "author_github_type",
    "author_association",
    "author_initial_class",
    "performed_via_github_app",
    "ai_disclosure_candidate",
    "ai_disclosure_evidence",
    "comments_count",
    "labels",
    "population_items",
    "selected_items",
    "inclusion_probability",
    "sampling_weight",
    "frame_min_number",
    "frame_max_number",
    "sampling_seed",
    "sampling_method",
    "collected_at",
]

REPOSITORY_FIELDS = [
    "sample_rank",
    "repo_name",
    "population_items",
    "frame_min_number",
    "frame_max_number",
    "frame_slots",
    "target_items",
    "selected_items",
    "attempted_numbers",
    "missing_or_ineligible_numbers",
    "scan_status",
    "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--monthly", type=Path, default=DEFAULT_MONTHLY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--repositories", type=Path, default=DEFAULT_REPOSITORIES)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--items-per-repo", type=int, default=20)
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


def number_frame(client: GitHubClient, repo: str) -> tuple[int, int]:
    period = "created:2026-01-01..2026-08-29"
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
        raise RuntimeError("No Issue or pull request found in the study window")
    return int(oldest[0]["number"]), int(newest[0]["number"])


def outcome(item: dict[str, Any]) -> tuple[str, str]:
    pull = item.get("pull_request")
    if isinstance(pull, dict):
        merged_at = str(pull.get("merged_at") or "")
        if merged_at:
            return "pull_request", "merged"
        if item.get("state") == "closed":
            return "pull_request", "closed_unmerged"
        return "pull_request", "open"
    if item.get("state") == "closed":
        return "issue", "closed"
    return "issue", "open"


def normalize_item(
    sample: dict[str, str],
    item: dict[str, Any],
    *,
    population: int,
    selected: int,
    frame_min: int,
    frame_max: int,
    collected_at: str,
) -> dict[str, Any]:
    item_type, item_outcome = outcome(item)
    user = item.get("user")
    disclosure, disclosure_evidence = ai_disclosure(item.get("body"))
    pull = item.get("pull_request") if isinstance(item.get("pull_request"), dict) else {}
    return {
        **{key: sample[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
        "item_type": item_type,
        "number": item.get("number", ""),
        "node_id": item.get("node_id", ""),
        "html_url": item.get("html_url", ""),
        "state": item.get("state", ""),
        "outcome": item_outcome,
        "created_at": item.get("created_at", ""),
        "updated_at": item.get("updated_at", ""),
        "closed_at": item.get("closed_at", ""),
        "merged_at": pull.get("merged_at", ""),
        "author_login": (user or {}).get("login", ""),
        "author_github_type": (user or {}).get("type", ""),
        "author_association": item.get("author_association", ""),
        "author_initial_class": initial_actor_class(user),
        "performed_via_github_app": app_identity(item),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": disclosure_evidence,
        "comments_count": item.get("comments", ""),
        "labels": "|".join(sorted(str(label.get("name") or "") for label in item.get("labels", []) if label.get("name"))),
        "population_items": population,
        "selected_items": selected,
        "inclusion_probability": round(selected / population, 8) if population else "",
        "sampling_weight": round(population / selected, 6) if selected else "",
        "frame_min_number": frame_min,
        "frame_max_number": frame_max,
        "sampling_seed": SEED,
        "sampling_method": "uniform_issue_number_rejection_sample",
        "collected_at": collected_at,
    }


def main() -> None:
    args = parse_args()
    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 repositories, found {len(sample)}")
    if args.max_repos:
        sample = sample[: args.max_repos]

    monthly = [row for row in read_csv(args.monthly) if row["month"] == "2026-08"]
    populations = {
        row["repo_name"]: int(row["issues_opened_cumulative"]) + int(row["prs_opened_cumulative"])
        for row in monthly
    }
    missing_population = [row["repo_name"] for row in sample if row["repo_name"] not in populations]
    if missing_population:
        raise SystemExit(f"Missing monthly population counts for {missing_population[:5]}")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    item_rows = [] if args.fresh else read_csv(args.output)
    repository_rows = [] if args.fresh else read_csv(args.repositories)
    completed = {
        row["repo_name"]
        for row in repository_rows
        if row.get("scan_status") in {"ok", "no_eligible_items"}
    }
    started_at = datetime.now(UTC).isoformat()
    since = parse_time(SINCE)
    until = parse_time(UNTIL)

    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        population = populations[repo]
        target = min(args.items_per_repo, population)
        collected_at = datetime.now(UTC).isoformat()
        attempted: set[int] = set()
        selected_payloads: list[dict[str, Any]] = []
        if target == 0:
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "population_items": population,
                    "target_items": 0,
                    "selected_items": 0,
                    "attempted_numbers": 0,
                    "missing_or_ineligible_numbers": 0,
                    "scan_status": "no_eligible_items",
                    "error": "",
                }
            )
            write_csv(args.repositories, REPOSITORY_FIELDS, repository_rows)
            continue
        try:
            frame_min, frame_max = number_frame(client, repo)
            frame_numbers = list(range(frame_min, frame_max + 1))
            rng = random.Random(f"{SEED}:{repo}")
            rng.shuffle(frame_numbers)
            max_attempts = min(len(frame_numbers), max(target * 20, target + 50))
            for number in frame_numbers[:max_attempts]:
                attempted.add(number)
                response = client.get(
                    f"/repos/{repo}/issues/{number}",
                    allowed={200, 404, 410},
                )
                if response.status_code != 200:
                    continue
                item = response.json()
                created_at = parse_time(str(item.get("created_at") or ""))
                if not (since <= created_at <= until):
                    continue
                selected_payloads.append(item)
                if len(selected_payloads) >= target:
                    break
            if len(selected_payloads) < target:
                raise RuntimeError(f"Selected {len(selected_payloads)} of {target} target items")

            item_rows = [row for row in item_rows if row.get("repo_name") != repo]
            item_rows.extend(
                normalize_item(
                    sample_row,
                    item,
                    population=population,
                    selected=len(selected_payloads),
                    frame_min=frame_min,
                    frame_max=frame_max,
                    collected_at=collected_at,
                )
                for item in selected_payloads
            )
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "population_items": population,
                    "frame_min_number": frame_min,
                    "frame_max_number": frame_max,
                    "frame_slots": frame_max - frame_min + 1,
                    "target_items": target,
                    "selected_items": len(selected_payloads),
                    "attempted_numbers": len(attempted),
                    "missing_or_ineligible_numbers": len(attempted) - len(selected_payloads),
                    "scan_status": "ok",
                    "error": "",
                }
            )
        except Exception as exc:
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "population_items": population,
                    "target_items": target,
                    "attempted_numbers": len(attempted),
                    "selected_items": len(selected_payloads),
                    "scan_status": "error",
                    "error": str(exc)[:500],
                }
            )
        write_csv(args.output, ITEM_FIELDS, item_rows)
        write_csv(args.repositories, REPOSITORY_FIELDS, repository_rows)

    sample_repos = {row["repo_name"] for row in sample}
    counts = Counter(row["repo_name"] for row in item_rows if row["repo_name"] in sample_repos)
    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories_requested": len(sample),
        "repositories_complete": sum(
            row.get("scan_status") in {"ok", "no_eligible_items"}
            and row["repo_name"] in sample_repos
            for row in repository_rows
        ),
        "repository_errors": [row for row in repository_rows if row.get("scan_status") == "error" and row["repo_name"] in sample_repos],
        "sample_items": sum(counts.values()),
        "items_per_repository_target": args.items_per_repo,
        "sampling_seed": SEED,
        "http_requests": client.requests,
        "core_rate_limit": rate.get("core"),
        "outputs": [str(args.output.resolve().relative_to(ROOT)), str(args.repositories.resolve().relative_to(ROOT))],
        "limitations": [
            "The natural sample is uniform over accessible Issue-number slots inside each repository, with rejection of missing or out-of-window numbers.",
            "Repository weights use the GitHub Search population count and require the separate Search-count stability check.",
            "The sample preserves the natural Issue/PR mix. Rare item types may need a separately labelled top-up sample for process comparison.",
            "Item metadata alone does not establish human-Agent collaboration; timeline and review events are collected next.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
