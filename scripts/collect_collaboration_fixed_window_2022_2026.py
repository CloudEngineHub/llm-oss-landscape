#!/usr/bin/env python3
"""Collect matched Jan 1-Aug 29 Issue/PR cohorts for the frozen Top 100."""

from __future__ import annotations

import argparse
import csv
import json
import os
from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-repository-fixed-window-2022-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-repository-fixed-window-2022-2026-run.json"
YEARS = range(2022, 2027)

FIELDS = [
    "sample_rank",
    "repo_name",
    "created_at",
    "llm_native_manual",
    "collaboration_niche",
    "year",
    "window_start",
    "window_end",
    "observable_in_window",
    "issues_opened",
    "issues_closed_from_cohort",
    "issues_unresolved_from_cohort",
    "prs_opened",
    "prs_closed_from_cohort",
    "prs_merged_from_cohort",
    "prs_closed_unmerged_from_cohort",
    "prs_unresolved_from_cohort",
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


def display_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(ROOT))
    except ValueError:
        return str(resolved)


def search_field(alias: str, query: str) -> str:
    return f"{alias}: search(type: ISSUE, query: {json.dumps(query)}, first: 1) {{ issueCount }}"


def build_query(repo: str) -> tuple[str, dict[str, tuple[int, str]]]:
    fields: list[str] = []
    aliases: dict[str, tuple[int, str]] = {}
    for year in YEARS:
        start = f"{year}-01-01"
        end = f"{year}-08-29"
        created = f"created:{start}..{end}"
        definitions = {
            "issues_opened": f"repo:{repo} is:issue {created}",
            "issues_closed_from_cohort": f"repo:{repo} is:issue is:closed {created} closed:<={end}",
            "prs_opened": f"repo:{repo} is:pr {created}",
            "prs_closed_from_cohort": f"repo:{repo} is:pr is:closed {created} closed:<={end}",
            "prs_merged_from_cohort": f"repo:{repo} is:pr is:merged {created} merged:<={end}",
        }
        for metric, search in definitions.items():
            alias = f"y{year}_{metric}"
            aliases[alias] = (year, metric)
            fields.append(search_field(alias, search))
    query = "query { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }"
    return query, aliases


def collect_repo(client: GitHubClient, sample: dict[str, str]) -> list[dict[str, Any]]:
    query, aliases = build_query(sample["repo_name"])
    data = client.graphql(query, {})
    rate = data["rateLimit"]
    counts: dict[int, dict[str, int]] = {year: {} for year in YEARS}
    for alias, (year, metric) in aliases.items():
        counts[year][metric] = int(data[alias]["issueCount"])

    created_at = date.fromisoformat(sample["created_at"])
    collected_at = datetime.now(UTC).isoformat()
    rows: list[dict[str, Any]] = []
    for year in YEARS:
        values = counts[year]
        issues_opened = values["issues_opened"]
        issues_closed = values["issues_closed_from_cohort"]
        prs_opened = values["prs_opened"]
        prs_closed = values["prs_closed_from_cohort"]
        prs_merged = values["prs_merged_from_cohort"]
        flags: list[str] = []
        if issues_closed > issues_opened:
            flags.append("issues_closed_exceeds_opened")
        if prs_closed > prs_opened:
            flags.append("prs_closed_exceeds_opened")
        if prs_merged > prs_closed:
            flags.append("prs_merged_exceeds_closed")
        observable = created_at <= date(year, 8, 29)
        if not observable and any(values.values()):
            flags.append("activity_before_repository_creation")
        rows.append(
            {
                **{key: sample[key] for key in ("sample_rank", "repo_name", "created_at", "llm_native_manual", "collaboration_niche")},
                "year": year,
                "window_start": f"{year}-01-01",
                "window_end": f"{year}-08-29",
                "observable_in_window": "yes" if observable else "no",
                **values,
                "issues_unresolved_from_cohort": issues_opened - issues_closed,
                "prs_closed_unmerged_from_cohort": prs_closed - prs_merged,
                "prs_unresolved_from_cohort": prs_opened - prs_closed,
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
        repo for repo, count in Counter(row["repo_name"] for row in rows).items() if count == len(YEARS)
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

    current_rows = [row for row in rows if int(row["year"]) == 2026]
    monthly_rows = {
        row["repo_name"]: row
        for row in read_csv(RESEARCH / "collaboration-repository-month-2026.csv")
        if row["month"] == "2026-08"
    }
    validation_differences: list[dict[str, Any]] = []
    comparison = {
        "issues_opened": "issues_opened_cumulative",
        "issues_closed_from_cohort": "issues_closed_cumulative",
        "prs_opened": "prs_opened_cumulative",
        "prs_closed_from_cohort": "prs_closed_cumulative",
        "prs_merged_from_cohort": "prs_merged_cumulative",
    }
    for row in current_rows:
        baseline = monthly_rows.get(row["repo_name"])
        if not baseline:
            validation_differences.append({"repo_name": row["repo_name"], "metric": "missing_baseline"})
            continue
        for field, baseline_field in comparison.items():
            if int(row[field]) != int(baseline[baseline_field]):
                validation_differences.append(
                    {
                        "repo_name": row["repo_name"],
                        "metric": field,
                        "fixed_window": row[field],
                        "monthly_panel": baseline[baseline_field],
                    }
                )

    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "sample": str(args.sample.resolve().relative_to(ROOT)),
        "windows": [f"{year}-01-01..{year}-08-29" for year in YEARS],
        "repositories_requested": len(sample),
        "repositories_complete": len({row["repo_name"] for row in rows} & {item["repo_name"] for item in sample}),
        "rows": len(rows),
        "errors": errors,
        "http_requests": client.requests,
        "graphql_rate_limit": rate.get("graphql"),
        "2026_replication_differences": validation_differences,
        "output": display_path(args.output),
        "limitations": [
            "The panel freezes the current Top 100 and therefore has survivorship bias; it is not a historical Top 100 for each year.",
            "Repository creation dates determine structural non-observation before a repository became public.",
            "GitHub Search counts are aggregate results. The complete 2026 row is replicated against the independently collected monthly panel.",
            "Unresolved counts follow the matched cohort opened inside each Jan 1-Aug 29 window and exclude older backlog.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
