#!/usr/bin/env python3
"""Sample three comparable collaboration stages for ten representative repositories."""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collect_collaboration_items import parse_time
from collaboration_github import GitHubClient, direct_network_setup
from sample_collaboration_threads import ITEM_FIELDS, normalize_item


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
MANIFEST = RESEARCH / "collaboration-deep-repositories-2026.csv"
OUTPUT = RESEARCH / "collaboration-deep-thread-sample-2026.csv"
STATUS = RESEARCH / "collaboration-deep-thread-sample-2026-status.csv"
RUN = RESEARCH / "collaboration-deep-thread-sample-2026-run.json"
SEED = 260912
TARGET = 30

STAGE_FIELDS = ["study_stage", "stage_start", "stage_end"]
OUTPUT_FIELDS = STAGE_FIELDS + ITEM_FIELDS
STATUS_FIELDS = [
    "deep_rank", "repo_name", "study_stage", "stage_start", "stage_end",
    "population_items", "target_items", "selected_items", "frame_min_number",
    "frame_max_number", "attempted_numbers", "scan_status", "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--status", type=Path, default=STATUS)
    parser.add_argument("--run-output", type=Path, default=RUN)
    parser.add_argument("--items-per-stage", type=int, default=TARGET)
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


def iso_day(value: date) -> str:
    return value.isoformat()


def stages(row: dict[str, str]) -> list[tuple[str, str, str]]:
    created = date.fromisoformat(row["created_at"][:10])
    launch_end = created + timedelta(days=119)
    return [
        ("launch_120d", iso_day(created), iso_day(launch_end)),
        ("previous_2025q4", "2025-09-01", "2025-12-31"),
        ("current_2026m5_m8", "2026-05-01", "2026-08-28"),
    ]


def frame(client: GitHubClient, repo: str, start: str, end: str) -> tuple[int, int, int]:
    period = f"created:{start}..{end}"
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
    if population == 0:
        return 0, 0, 0
    return population, int(data["oldest"]["nodes"][0]["number"]), int(data["newest"]["nodes"][0]["number"])


def main() -> None:
    args = parse_args()
    manifest = read_csv(args.manifest)
    if len(manifest) != 10:
        raise SystemExit(f"Expected 10 deep repositories, found {len(manifest)}")
    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    output = [] if args.fresh else read_csv(args.output)
    status = [] if args.fresh else read_csv(args.status)
    completed = {
        (row["repo_name"], row["study_stage"])
        for row in status if row.get("scan_status") in {"ok", "no_items"}
    }
    started = datetime.now(UTC).isoformat()
    for repo_index, row in enumerate(manifest, start=1):
        repo = row["repo_name"]
        sample_row = {
            "sample_rank": row["sample_rank"],
            "repo_name": repo,
            "llm_native_manual": row["llm_native_manual"],
            "collaboration_niche": row["collaboration_niche"],
            "agent_proximity": "deep_representative_case",
        }
        for stage_index, (stage, start, end) in enumerate(stages(row), start=1):
            key = repo, stage
            if key in completed:
                print(f"[{repo_index}/10 {stage_index}/3] {repo} {stage} (checkpoint)", flush=True)
                continue
            print(f"[{repo_index}/10 {stage_index}/3] {repo} {stage}", flush=True)
            attempted: set[int] = set()
            selected: list[dict[str, Any]] = []
            try:
                population, frame_min, frame_max = frame(client, repo, start, end)
                target = min(args.items_per_stage, population)
                if population:
                    numbers = list(range(frame_min, frame_max + 1))
                    random.Random(f"{SEED}:{repo}:{stage}").shuffle(numbers)
                    max_attempts = min(len(numbers), max(target * 30, target + 100))
                    since = parse_time(start + "T00:00:00Z")
                    until = parse_time(end + "T23:59:59Z")
                    for number in numbers[:max_attempts]:
                        attempted.add(number)
                        response = client.get(f"/repos/{repo}/issues/{number}", allowed={200, 404, 410})
                        if response.status_code != 200:
                            continue
                        item = response.json()
                        created_at = parse_time(str(item.get("created_at") or ""))
                        if not (since <= created_at <= until):
                            continue
                        selected.append(item)
                        if len(selected) == target:
                            break
                    if len(selected) != target:
                        raise RuntimeError(f"Selected {len(selected)} of {target} target items")

                output = [item for item in output if not (item.get("repo_name") == repo and item.get("study_stage") == stage)]
                collected_at = datetime.now(UTC).isoformat()
                for item in selected:
                    normalized = normalize_item(
                        sample_row,
                        item,
                        population=population,
                        selected=len(selected),
                        frame_min=frame_min,
                        frame_max=frame_max,
                        collected_at=collected_at,
                    )
                    normalized.update({"study_stage": stage, "stage_start": start, "stage_end": end})
                    output.append(normalized)
                status = [item for item in status if not (item.get("repo_name") == repo and item.get("study_stage") == stage)]
                status.append(
                    {
                        "deep_rank": row["deep_rank"], "repo_name": repo, "study_stage": stage,
                        "stage_start": start, "stage_end": end, "population_items": population,
                        "target_items": target, "selected_items": len(selected), "frame_min_number": frame_min,
                        "frame_max_number": frame_max, "attempted_numbers": len(attempted),
                        "scan_status": "ok" if population else "no_items", "error": "",
                    }
                )
            except Exception as exc:
                status = [item for item in status if not (item.get("repo_name") == repo and item.get("study_stage") == stage)]
                status.append(
                    {
                        "deep_rank": row["deep_rank"], "repo_name": repo, "study_stage": stage,
                        "stage_start": start, "stage_end": end, "selected_items": len(selected),
                        "attempted_numbers": len(attempted), "scan_status": "error", "error": str(exc)[:500],
                    }
                )
            write_csv(args.output, OUTPUT_FIELDS, output)
            write_csv(args.status, STATUS_FIELDS, status)

    errors = [row for row in status if row.get("scan_status") == "error"]
    run = {
        "started_at": started,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(manifest),
        "repository_stages": len(status),
        "sample_items": len(output),
        "items_per_stage_target": args.items_per_stage,
        "errors": errors,
        "http_requests": client.requests,
        "design": [
            "launch: first 120 calendar days after repository creation",
            "previous: 2025-09-01 through 2025-12-31",
            "current: 2026-05-01 through 2026-08-28",
            "uniform Issue-number rejection sample within each repository-stage",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
