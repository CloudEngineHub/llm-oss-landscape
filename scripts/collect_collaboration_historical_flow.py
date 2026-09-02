#!/usr/bin/env python3
"""Collect comparable Jan-Aug collaboration flows for the frozen Top 100."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-top100-flow-2024-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-top100-flow-2024-2026-run.json"
YEARS = (2024, 2025, 2026)
FIELDS = [
    "sample_rank",
    "repo_id",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "year",
    "window_start",
    "window_end",
    "issues_opened",
    "issues_closed_during_window",
    "issue_flow_balance",
    "prs_opened",
    "prs_closed_during_window",
    "prs_merged_during_window",
    "prs_closed_unmerged_during_window",
    "pr_flow_balance",
    "currently_open_issues_from_vintage",
    "currently_open_prs_from_vintage",
    "graphql_cost",
    "graphql_remaining",
    "collected_at",
    "quality_flag",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--fresh", action="store_true")
    parser.add_argument("--max-repos", type=int)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def search(alias: str, query: str) -> str:
    return f"{alias}: search(type: ISSUE, query: {json.dumps(query)}, first: 1) {{ issueCount }}"


def build_query(repo: str) -> tuple[str, dict[str, tuple[int, str]]]:
    fields: list[str] = []
    aliases: dict[str, tuple[int, str]] = {}
    for year in YEARS:
        end = "2026-08-31" if year == 2026 else f"{year}-08-31"
        window = f"{year}-01-01..{end}"
        definitions = {
            "issues_opened": f"repo:{repo} is:issue created:{window}",
            "issues_closed_during_window": f"repo:{repo} is:issue closed:{window}",
            "prs_opened": f"repo:{repo} is:pr created:{window}",
            "prs_closed_during_window": f"repo:{repo} is:pr closed:{window}",
            "prs_merged_during_window": f"repo:{repo} is:pr is:merged merged:{window}",
            "currently_open_issues_from_vintage": f"repo:{repo} is:issue is:open created:{window}",
            "currently_open_prs_from_vintage": f"repo:{repo} is:pr is:open created:{window}",
        }
        for metric, query in definitions.items():
            alias = f"y{year}_{metric}"
            aliases[alias] = year, metric
            fields.append(search(alias, query))
    return "query { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }", aliases


def collect_repo(client: GitHubClient, sample: dict[str, str]) -> list[dict[str, Any]]:
    query, aliases = build_query(sample["repo_name"])
    data = client.graphql(query, {})
    grouped: dict[int, dict[str, int]] = {year: {} for year in YEARS}
    for alias, (year, metric) in aliases.items():
        grouped[year][metric] = int(data[alias]["issueCount"])
    rate = data["rateLimit"]
    collected_at = datetime.now(UTC).isoformat()
    rows: list[dict[str, Any]] = []
    for year in YEARS:
        counts = grouped[year]
        issue_balance = counts["issues_opened"] - counts["issues_closed_during_window"]
        pr_balance = counts["prs_opened"] - counts["prs_closed_during_window"]
        closed_unmerged = counts["prs_closed_during_window"] - counts["prs_merged_during_window"]
        flags: list[str] = []
        if closed_unmerged < 0:
            flags.append("merged_exceeds_closed")
        rows.append(
            {
                **{key: sample.get(key, "") for key in ("sample_rank", "repo_id", "repo_name", "llm_native_manual", "collaboration_niche")},
                "year": year,
                "window_start": f"{year}-01-01",
                "window_end": f"{year}-08-31",
                **counts,
                "issue_flow_balance": issue_balance,
                "prs_closed_unmerged_during_window": closed_unmerged,
                "pr_flow_balance": pr_balance,
                "graphql_cost": rate["cost"],
                "graphql_remaining": rate["remaining"],
                "collected_at": collected_at,
                "quality_flag": "|".join(flags) if flags else "search_count_invariants_ok",
            }
        )
    return rows


def main() -> None:
    args = parse_args()
    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 sample repositories, found {len(sample)}")
    if args.max_repos:
        sample = sample[: args.max_repos]
    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)
    rows = [] if args.fresh else read_csv(args.output)
    completed = {
        repo
        for repo in {row["repo_name"] for row in rows}
        if sum(row["repo_name"] == repo and int(row["year"]) in YEARS for row in rows) == len(YEARS)
    }
    errors: list[dict[str, str]] = []
    started_at = datetime.now(UTC).isoformat()
    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        try:
            repo_rows = collect_repo(client, sample_row)
            rows = [row for row in rows if row["repo_name"] != repo] + repo_rows
            rows.sort(key=lambda row: (int(row["sample_rank"]), int(row["year"])))
            write_csv(args.output, rows)
        except Exception as exc:
            errors.append({"repo_name": repo, "error": str(exc)[:500]})
    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(sample),
        "years": list(YEARS),
        "rows": len(rows),
        "errors": errors,
        "http_requests": client.requests,
        "token_pool_size": client.token_pool_size,
        "token_switches": client.token_switches,
        "graphql_rate_limit": rate.get("graphql"),
        "output": str(args.output.relative_to(ROOT)),
        "definitions": {
            "flow_balance": "items opened during Jan-Aug minus items closed during Jan-Aug; closures may belong to older vintages",
            "currently_open_vintage": "items created in the named Jan-Aug vintage that were still open when this script ran",
        },
        "limitations": [
            "GitHub Search evaluates current state. The vintage backlog is a collection-time snapshot, not a historical month-end snapshot.",
            "Flow balance is a queue-pressure measure, not a direct reconstruction of backlog stock.",
            "Counts do not identify whether a human or an Agent created the work.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
