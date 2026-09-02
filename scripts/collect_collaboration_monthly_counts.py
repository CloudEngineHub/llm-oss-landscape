#!/usr/bin/env python3
"""Collect monthly 2026 Issue/PR cohort flows and backlog counts via GitHub Search."""

from __future__ import annotations

import argparse
import csv
import json
import os
from calendar import monthrange
from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-repository-month-2026-run.json"
WINDOW_START = date(2026, 1, 1)
WINDOW_END = date(2026, 8, 31)

FIELDS = [
    "sample_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "month",
    "month_end",
    "issues_opened_cumulative",
    "issues_closed_cumulative",
    "issues_window_cohort_backlog",
    "prs_opened_cumulative",
    "prs_closed_cumulative",
    "prs_merged_cumulative",
    "prs_closed_unmerged_cumulative",
    "prs_window_cohort_backlog",
    "issues_opened_in_month",
    "issues_closed_in_month",
    "prs_opened_in_month",
    "prs_closed_in_month",
    "prs_merged_in_month",
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
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--fresh", action="store_true")
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


def month_ends() -> list[date]:
    ends = []
    for month in range(1, WINDOW_END.month + 1):
        end = date(2026, month, monthrange(2026, month)[1])
        ends.append(min(end, WINDOW_END))
    return ends


def search_field(alias: str, query: str) -> str:
    return f"{alias}: search(type: ISSUE, query: {json.dumps(query)}, first: 1) {{ issueCount }}"


def build_query(repo: str) -> tuple[str, dict[str, dict[str, str]]]:
    fields = []
    aliases: dict[str, dict[str, str]] = {}
    for index, end in enumerate(month_ends(), start=1):
        end_text = end.isoformat()
        created = f"created:{WINDOW_START.isoformat()}..{end_text}"
        definitions = {
            "issues_opened_cumulative": f"repo:{repo} is:issue {created}",
            "issues_closed_cumulative": f"repo:{repo} is:issue is:closed {created} closed:<={end_text}",
            "prs_opened_cumulative": f"repo:{repo} is:pr {created}",
            "prs_closed_cumulative": f"repo:{repo} is:pr is:closed {created} closed:<={end_text}",
            "prs_merged_cumulative": f"repo:{repo} is:pr is:merged {created} merged:<={end_text}",
        }
        for metric, query in definitions.items():
            alias = f"m{index}_{metric}"
            aliases[alias] = {"month_end": end_text, "metric": metric}
            fields.append(search_field(alias, query))
    query = "query { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }"
    return query, aliases


def collect_repo(client: GitHubClient, sample: dict[str, str]) -> list[dict[str, Any]]:
    query, aliases = build_query(sample["repo_name"])
    data = client.graphql(query, {})
    rate = data["rateLimit"]
    by_month: dict[str, dict[str, Any]] = {}
    for alias, definition in aliases.items():
        month_end = definition["month_end"]
        by_month.setdefault(month_end, {})[definition["metric"]] = int(data[alias]["issueCount"])

    rows = []
    previous = {
        "issues_opened_cumulative": 0,
        "issues_closed_cumulative": 0,
        "prs_opened_cumulative": 0,
        "prs_closed_cumulative": 0,
        "prs_merged_cumulative": 0,
    }
    collected_at = datetime.now(UTC).isoformat()
    for month_end, counts in sorted(by_month.items()):
        issues_opened = counts["issues_opened_cumulative"]
        issues_closed = counts["issues_closed_cumulative"]
        prs_opened = counts["prs_opened_cumulative"]
        prs_closed = counts["prs_closed_cumulative"]
        prs_merged = counts["prs_merged_cumulative"]
        flags = []
        if issues_closed > issues_opened:
            flags.append("issues_closed_exceeds_opened")
        if prs_closed > prs_opened:
            flags.append("prs_closed_exceeds_opened")
        if prs_merged > prs_closed:
            flags.append("prs_merged_exceeds_closed")
        rows.append(
            {
                **{key: sample[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
                "month": month_end[:7],
                "month_end": month_end,
                **counts,
                "issues_window_cohort_backlog": issues_opened - issues_closed,
                "prs_closed_unmerged_cumulative": prs_closed - prs_merged,
                "prs_window_cohort_backlog": prs_opened - prs_closed,
                "issues_opened_in_month": issues_opened - previous["issues_opened_cumulative"],
                "issues_closed_in_month": issues_closed - previous["issues_closed_cumulative"],
                "prs_opened_in_month": prs_opened - previous["prs_opened_cumulative"],
                "prs_closed_in_month": prs_closed - previous["prs_closed_cumulative"],
                "prs_merged_in_month": prs_merged - previous["prs_merged_cumulative"],
                "graphql_cost": rate["cost"],
                "graphql_remaining": rate["remaining"],
                "collected_at": collected_at,
                "quality_flag": "|".join(flags) if flags else "search_count_invariants_ok",
            }
        )
        previous = counts
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
        for repo, count in Counter(row["repo_name"] for row in rows).items()
        if count == len(month_ends())
    }
    started_at = datetime.now(UTC).isoformat()
    errors: list[dict[str, str]] = []
    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        try:
            repo_rows = collect_repo(client, sample_row)
            rows = [row for row in rows if row["repo_name"] != repo]
            rows.extend(repo_rows)
            write_csv(args.output, rows)
        except Exception as exc:
            errors.append({"repo_name": repo, "error": str(exc)[:500]})

    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "sample": str(args.sample.resolve().relative_to(ROOT)),
        "window_start": WINDOW_START.isoformat(),
        "window_end": WINDOW_END.isoformat(),
        "repositories_requested": len(sample),
        "repositories_complete": len({row["repo_name"] for row in rows} & {item["repo_name"] for item in sample}),
        "rows": len(rows),
        "errors": errors,
        "http_requests": client.requests,
        "graphql_rate_limit": rate.get("graphql"),
        "output": str(args.output.resolve().relative_to(ROOT)),
        "limitations": [
            "GitHub Search counts are used for repository-month flow and must be replicated on a validation sample before publication.",
            "Backlog is limited to items created inside the 2026 study window; older opening backlog is not included.",
            "A later reopen can change current search state and slightly revise an earlier month-end count; timeline samples measure this risk.",
            "Counts do not identify Agent participation. Actor and thread evidence are collected separately.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
