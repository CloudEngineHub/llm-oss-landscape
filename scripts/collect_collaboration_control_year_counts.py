#!/usr/bin/env python3
"""Collect GitHub Search cohort outcomes for a long-lived comparison panel."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-control-panel.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-control-panel-year-2022-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-control-panel-year-2022-2026-run.json"
WINDOWS = {
    2022: (date(2022, 1, 1), date(2022, 12, 31)),
    2023: (date(2023, 1, 1), date(2023, 12, 31)),
    2024: (date(2024, 1, 1), date(2024, 12, 31)),
    2025: (date(2025, 1, 1), date(2025, 12, 31)),
    2026: (date(2026, 1, 1), date(2026, 8, 29)),
}

FIELDS = [
    "control_rank",
    "repo_name",
    "control_domain",
    "language_match_role",
    "year",
    "window_start",
    "window_end",
    "issues_opened",
    "issues_closed_from_cohort",
    "issues_unresolved_from_cohort",
    "prs_opened",
    "prs_closed_from_cohort",
    "prs_merged_from_cohort",
    "prs_closed_unmerged_from_cohort",
    "prs_unresolved_from_cohort",
    "pr_merge_share_resolved",
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


def build_query(repo: str) -> tuple[str, dict[str, tuple[int, str]]]:
    fields: list[str] = []
    aliases: dict[str, tuple[int, str]] = {}
    for year, (start, end) in WINDOWS.items():
        created = f"created:{start.isoformat()}..{end.isoformat()}"
        closed = f"closed:<={end.isoformat()}"
        merged = f"merged:<={end.isoformat()}"
        definitions = {
            "issues_opened": f"repo:{repo} is:issue {created}",
            "issues_closed_from_cohort": f"repo:{repo} is:issue is:closed {created} {closed}",
            "prs_opened": f"repo:{repo} is:pr {created}",
            "prs_closed_from_cohort": f"repo:{repo} is:pr is:closed {created} {closed}",
            "prs_merged_from_cohort": f"repo:{repo} is:pr is:merged {created} {merged}",
        }
        for metric, search in definitions.items():
            alias = f"y{year}_{metric}"
            aliases[alias] = (year, metric)
            fields.append(search_field(alias, search))
    return "query { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }", aliases


def collect_repo(client: GitHubClient, sample: dict[str, str]) -> list[dict[str, Any]]:
    query, aliases = build_query(sample["repo_name"])
    data = client.graphql(query, {})
    grouped: dict[int, dict[str, int]] = {}
    for alias, (year, metric) in aliases.items():
        grouped.setdefault(year, {})[metric] = int(data[alias]["issueCount"])
    rate = data["rateLimit"]
    collected_at = datetime.now(UTC).isoformat()
    rows = []
    for year, counts in sorted(grouped.items()):
        start, end = WINDOWS[year]
        issues_opened = counts["issues_opened"]
        issues_closed = counts["issues_closed_from_cohort"]
        prs_opened = counts["prs_opened"]
        prs_closed = counts["prs_closed_from_cohort"]
        prs_merged = counts["prs_merged_from_cohort"]
        flags = []
        if issues_closed > issues_opened or prs_closed > prs_opened or prs_merged > prs_closed:
            flags.append("count_invariant_failed")
        if issues_opened >= 1000 or prs_opened >= 1000:
            flags.append("search_count_above_result_retrieval_cap")
        rows.append(
            {
                **{key: sample[key] for key in ("control_rank", "repo_name", "control_domain", "language_match_role")},
                "year": year,
                "window_start": start.isoformat(),
                "window_end": end.isoformat(),
                **counts,
                "issues_unresolved_from_cohort": issues_opened - issues_closed,
                "prs_closed_unmerged_from_cohort": prs_closed - prs_merged,
                "prs_unresolved_from_cohort": prs_opened - prs_closed,
                "pr_merge_share_resolved": round(prs_merged / prs_closed, 6) if prs_closed else "",
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
    sample = read_csv(args.sample)
    if not sample:
        raise SystemExit("Control panel is empty")
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
        if sum(row["repo_name"] == repo for row in rows) == len(WINDOWS)
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
            rows = [row for row in rows if row["repo_name"] != repo] + collect_repo(client, sample_row)
            rows.sort(key=lambda row: (int(row["control_rank"]), int(row["year"])))
            write_csv(args.output, rows)
        except Exception as exc:
            errors.append({"repo_name": repo, "error": str(exc)[:500]})
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(sample),
        "rows": len(rows),
        "errors": errors,
        "http_requests": client.requests,
        "output": display_path(args.output),
        "limitations": [
            "The comparison panel is purposively selected for long-lived, active projects and is not a causal matched control group.",
            "Each annual denominator is the cohort created inside that calendar-year window; older backlog is excluded.",
            "GitHub Search counts can be revised by later reopen events, so direction and magnitude require a repeat collection before publication.",
            "The 2026 window ends on 29 August and is not directly comparable to a full calendar year without monthly normalization.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
