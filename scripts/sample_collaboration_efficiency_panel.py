#!/usr/bin/env python3
"""Build matched May-August thread samples for the collaboration efficiency study."""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup
from collect_collaboration_items import parse_time
from sample_collaboration_threads import ITEM_FIELDS, normalize_item


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
MANIFEST = RESEARCH / "collaboration-deep-repositories-2026.csv"
CURRENT_SAMPLE = RESEARCH / "collaboration-deep-thread-sample-2026.csv"
OUTPUT = RESEARCH / "collaboration-efficiency-panel-thread-sample.csv"
STATUS = RESEARCH / "collaboration-efficiency-panel-thread-sample-status.csv"
RUN = RESEARCH / "collaboration-efficiency-panel-thread-sample-run.json"
SEED = 260912
TARGET = 30

PERIODS = [
    ("year_2024_m5_m8", 2024, "2024-05-01", "2024-08-28"),
    ("year_2025_m5_m8", 2025, "2025-05-01", "2025-08-28"),
    ("year_2026_m5_m8", 2026, "2026-05-01", "2026-08-28"),
]

PANEL_FIELDS = ["study_stage", "panel_year", "stage_start", "stage_end"]
OUTPUT_FIELDS = PANEL_FIELDS + ITEM_FIELDS
STATUS_FIELDS = [
    "deep_rank",
    "repo_name",
    "study_stage",
    "panel_year",
    "stage_start",
    "stage_end",
    "population_items",
    "target_items",
    "selected_items",
    "frame_min_number",
    "frame_max_number",
    "attempted_numbers",
    "sample_source",
    "scan_status",
    "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--current-sample", type=Path, default=CURRENT_SAMPLE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--status", type=Path, default=STATUS)
    parser.add_argument("--run-output", type=Path, default=RUN)
    parser.add_argument("--items-per-period", type=int, default=TARGET)
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
        writer = csv.DictWriter(
            handle,
            fieldnames=fields,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


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
    return (
        population,
        int(data["oldest"]["nodes"][0]["number"]),
        int(data["newest"]["nodes"][0]["number"]),
    )


def current_rows_by_repo(path: Path) -> dict[str, list[dict[str, str]]]:
    rows: dict[str, list[dict[str, str]]] = {}
    for row in read_csv(path):
        if row.get("study_stage") != "current_2026m5_m8":
            continue
        rows.setdefault(row["repo_name"], []).append(row)
    return rows


def main() -> None:
    args = parse_args()
    manifest = read_csv(args.manifest)
    if len(manifest) != 10:
        raise SystemExit(f"Expected 10 deep repositories, found {len(manifest)}")
    existing_current = current_rows_by_repo(args.current_sample)
    if len(existing_current) != 10:
        raise SystemExit("Validated 2026 deep sample is incomplete")

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
        for row in status
        if row.get("scan_status") in {"ok", "no_items", "reused"}
    }
    started = datetime.now(UTC).isoformat()

    for repo_index, manifest_row in enumerate(manifest, start=1):
        repo = manifest_row["repo_name"]
        sample_row = {
            "sample_rank": manifest_row["sample_rank"],
            "repo_name": repo,
            "llm_native_manual": manifest_row["llm_native_manual"],
            "collaboration_niche": manifest_row["collaboration_niche"],
            "agent_proximity": "efficiency_panel_case",
        }
        for period_index, (stage, year, start, end) in enumerate(PERIODS, start=1):
            key = repo, stage
            if key in completed:
                print(f"[{repo_index}/10 {period_index}/3] {repo} {stage} (checkpoint)", flush=True)
                continue
            print(f"[{repo_index}/10 {period_index}/3] {repo} {stage}", flush=True)
            output = [
                row
                for row in output
                if not (row.get("repo_name") == repo and row.get("study_stage") == stage)
            ]
            status = [
                row
                for row in status
                if not (row.get("repo_name") == repo and row.get("study_stage") == stage)
            ]

            if year == 2026:
                selected = existing_current[repo]
                for item in selected:
                    row = dict(item)
                    row.update(
                        {
                            "study_stage": stage,
                            "panel_year": year,
                            "stage_start": start,
                            "stage_end": end,
                            "agent_proximity": "efficiency_panel_case",
                        }
                    )
                    output.append(row)
                status.append(
                    {
                        "deep_rank": manifest_row["deep_rank"],
                        "repo_name": repo,
                        "study_stage": stage,
                        "panel_year": year,
                        "stage_start": start,
                        "stage_end": end,
                        "population_items": selected[0].get("population_items", ""),
                        "target_items": len(selected),
                        "selected_items": len(selected),
                        "frame_min_number": selected[0].get("frame_min_number", ""),
                        "frame_max_number": selected[0].get("frame_max_number", ""),
                        "attempted_numbers": "",
                        "sample_source": "validated_deep_sample_2026",
                        "scan_status": "reused",
                        "error": "",
                    }
                )
                write_csv(args.output, OUTPUT_FIELDS, output)
                write_csv(args.status, STATUS_FIELDS, status)
                continue

            attempted: set[int] = set()
            selected_items: list[dict[str, Any]] = []
            try:
                population, frame_min, frame_max = frame(client, repo, start, end)
                target = min(args.items_per_period, population)
                if population:
                    numbers = list(range(frame_min, frame_max + 1))
                    random.Random(f"{SEED}:{repo}:{stage}").shuffle(numbers)
                    max_attempts = min(len(numbers), max(target * 30, target + 100))
                    since = parse_time(start + "T00:00:00Z")
                    until = parse_time(end + "T23:59:59Z")
                    for number in numbers[:max_attempts]:
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
                        selected_items.append(item)
                        if len(selected_items) == target:
                            break
                    if len(selected_items) != target:
                        raise RuntimeError(
                            f"Selected {len(selected_items)} of {target} target items"
                        )

                collected_at = datetime.now(UTC).isoformat()
                for item in selected_items:
                    normalized = normalize_item(
                        sample_row,
                        item,
                        population=population,
                        selected=len(selected_items),
                        frame_min=frame_min,
                        frame_max=frame_max,
                        collected_at=collected_at,
                    )
                    normalized.update(
                        {
                            "study_stage": stage,
                            "panel_year": year,
                            "stage_start": start,
                            "stage_end": end,
                        }
                    )
                    output.append(normalized)
                status.append(
                    {
                        "deep_rank": manifest_row["deep_rank"],
                        "repo_name": repo,
                        "study_stage": stage,
                        "panel_year": year,
                        "stage_start": start,
                        "stage_end": end,
                        "population_items": population,
                        "target_items": target,
                        "selected_items": len(selected_items),
                        "frame_min_number": frame_min,
                        "frame_max_number": frame_max,
                        "attempted_numbers": len(attempted),
                        "sample_source": "github_probability_sample",
                        "scan_status": "ok" if population else "no_items",
                        "error": "",
                    }
                )
            except Exception as exc:
                status.append(
                    {
                        "deep_rank": manifest_row["deep_rank"],
                        "repo_name": repo,
                        "study_stage": stage,
                        "panel_year": year,
                        "stage_start": start,
                        "stage_end": end,
                        "selected_items": len(selected_items),
                        "attempted_numbers": len(attempted),
                        "sample_source": "github_probability_sample",
                        "scan_status": "error",
                        "error": str(exc)[:500],
                    }
                )
            write_csv(args.output, OUTPUT_FIELDS, output)
            write_csv(args.status, STATUS_FIELDS, status)

    errors = [row for row in status if row.get("scan_status") == "error"]
    run = {
        "started_at": started,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(manifest),
        "repository_periods": len(status),
        "sample_items": len(output),
        "items_per_period_target": args.items_per_period,
        "errors": errors,
        "http_requests": client.requests,
        "design": [
            "same ten repository cases in each observable year",
            "same May 1 through August 28 calendar window",
            "uniform Issue-number rejection sample within each repository-period",
            "2026 rows reuse the previously validated deep sample",
        ],
    }
    args.run_output.write_text(
        json.dumps(run, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(run, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
