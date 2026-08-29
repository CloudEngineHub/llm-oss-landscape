#!/usr/bin/env python3
"""Collect Jan-May Issue/PR cohorts with at least 90 days of outcome follow-up."""

from __future__ import annotations

import argparse
import csv
import json
import os
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-control-panel.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-control-panel-fixed-90d-cohorts.csv"
DEFAULT_RUN = RESEARCH / "collaboration-control-panel-fixed-90d-cohorts-run.json"
METADATA_FIELDS = [
    "sample_rank",
    "control_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "control_domain",
    "language_match_role",
]
FIELDS = METADATA_FIELDS + [
    "year",
    "cohort_month",
    "cohort_start",
    "cohort_end",
    "followup_end",
    "issues_opened",
    "issues_closed_by_90d",
    "issues_unresolved_at_90d",
    "prs_opened",
    "prs_closed_by_90d",
    "prs_merged_by_90d",
    "prs_closed_unmerged_by_90d",
    "prs_unresolved_at_90d",
    "pr_merge_share_resolved_90d",
    "graphql_cost",
    "graphql_remaining",
    "quality_flag",
    "collected_at",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--years", default="2022,2023,2024,2025,2026")
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


def search_field(alias: str, query: str) -> str:
    return f"{alias}: search(type: ISSUE, query: {json.dumps(query)}, first: 1) {{ issueCount }}"


def cohorts(years: list[int]) -> list[tuple[int, int, date, date, date]]:
    rows = []
    for year in years:
        for month in range(1, 6):
            start = date(year, month, 1)
            end = date(year, month, monthrange(year, month)[1])
            followup = end + timedelta(days=90)
            rows.append((year, month, start, end, followup))
    return rows


def build_query(repo: str, years: list[int]) -> tuple[str, dict[str, tuple[int, int, str]]]:
    fields: list[str] = []
    aliases: dict[str, tuple[int, int, str]] = {}
    for year, month, start, end, followup in cohorts(years):
        created = f"created:{start.isoformat()}..{end.isoformat()}"
        definitions = {
            "issues_opened": f"repo:{repo} is:issue {created}",
            "issues_closed_by_90d": f"repo:{repo} is:issue is:closed {created} closed:<={followup.isoformat()}",
            "prs_opened": f"repo:{repo} is:pr {created}",
            "prs_closed_by_90d": f"repo:{repo} is:pr is:closed {created} closed:<={followup.isoformat()}",
            "prs_merged_by_90d": f"repo:{repo} is:pr is:merged {created} merged:<={followup.isoformat()}",
        }
        for metric, search in definitions.items():
            alias = f"y{year}m{month}_{metric}"
            aliases[alias] = (year, month, metric)
            fields.append(search_field(alias, search))
    return "query { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }", aliases


def collect_repo(client: GitHubClient, sample: dict[str, str], years: list[int]) -> list[dict[str, Any]]:
    query, aliases = build_query(sample["repo_name"], years)
    data = client.graphql(query, {})
    grouped: dict[tuple[int, int], dict[str, int]] = {}
    for alias, (year, month, metric) in aliases.items():
        grouped.setdefault((year, month), {})[metric] = int(data[alias]["issueCount"])
    rate = data["rateLimit"]
    collected_at = datetime.now(UTC).isoformat()
    rows = []
    for (year, month), counts in sorted(grouped.items()):
        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        followup = end + timedelta(days=90)
        issue_opened = counts["issues_opened"]
        issue_closed = counts["issues_closed_by_90d"]
        pr_opened = counts["prs_opened"]
        pr_closed = counts["prs_closed_by_90d"]
        pr_merged = counts["prs_merged_by_90d"]
        flags = []
        if issue_closed > issue_opened or pr_closed > pr_opened or pr_merged > pr_closed:
            flags.append("count_invariant_failed")
        rows.append(
            {
                **{field: sample.get(field, "") for field in METADATA_FIELDS},
                "year": year,
                "cohort_month": f"{year}-{month:02d}",
                "cohort_start": start.isoformat(),
                "cohort_end": end.isoformat(),
                "followup_end": followup.isoformat(),
                **counts,
                "issues_unresolved_at_90d": issue_opened - issue_closed,
                "prs_closed_unmerged_by_90d": pr_closed - pr_merged,
                "prs_unresolved_at_90d": pr_opened - pr_closed,
                "pr_merge_share_resolved_90d": round(pr_merged / pr_closed, 6) if pr_closed else "",
                "graphql_cost": rate["cost"],
                "graphql_remaining": rate["remaining"],
                "quality_flag": "|".join(flags) if flags else "search_count_invariants_ok",
                "collected_at": collected_at,
            }
        )
    return rows


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    years = [int(value.strip()) for value in args.years.split(",") if value.strip()]
    if not years or min(years) < 2008 or max(years) > 2026:
        raise SystemExit("Years must be between 2008 and 2026")
    sample = read_csv(args.sample)
    if not sample or any(not row.get("repo_name") for row in sample):
        raise SystemExit("Sample must contain repo_name")
    if args.max_repos:
        sample = sample[: args.max_repos]
    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)
    rows = [] if args.fresh else read_csv(args.output)
    expected = len(years) * 5
    completed = {
        repo
        for repo in {row["repo_name"] for row in rows}
        if sum(row["repo_name"] == repo and int(row["year"]) in years for row in rows) == expected
    }
    started_at = datetime.now(UTC).isoformat()
    errors = []
    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        try:
            rows = [row for row in rows if row["repo_name"] != repo] + collect_repo(client, sample_row, years)
            rows.sort(key=lambda row: (int(row.get("sample_rank") or row.get("control_rank") or 0), int(row["year"]), row["cohort_month"]))
            write_csv(args.output, rows)
        except Exception as exc:
            errors.append({"repo_name": repo, "error": str(exc)[:500]})
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "years": years,
        "cohort_months_each_year": [1, 2, 3, 4, 5],
        "followup_days": 90,
        "repositories": len(sample),
        "rows": len(rows),
        "errors": errors,
        "http_requests": client.requests,
        "output": display_path(args.output),
        "limitations": [
            "Search is evaluated at collection time; later reopen events can revise historical closed-state counts.",
            "Each monthly cohort is observed at month-end plus 90 days, so items receive 90 to roughly 120 days of follow-up; this removes the partial-2026 follow-up bias but does not identify Agent participation.",
            "The comparison panel remains purposive; the Top 100 and control panel are not a causal matched design.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
