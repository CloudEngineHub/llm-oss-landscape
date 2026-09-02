#!/usr/bin/env python3
"""Build the 2022-2026 repository-year collaboration backbone from ClickHouse."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SAMPLE = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-sample-top100-2607.csv"
)
DEFAULT_OUTPUT = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-repository-year-2022-2026.csv"
)
DEFAULT_RUN_OUTPUT = ROOT / (
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-repository-year-run-260829.json"
)
YEARS = range(2022, 2027)
OBSERVATION_END_EXCLUSIVE = "2026-09-01"


OUTPUT_FIELDS = [
    "sample_rank",
    "repo_id",
    "repo_name",
    "year",
    "observation_status",
    "observation_end",
    "created_at",
    "llm_native_manual",
    "llm_native_confidence",
    "collaboration_niche",
    "agent_proximity",
    "language",
    "first_event_at",
    "last_event_at",
    "event_rows",
    "event_rows_from_api",
    "active_actors",
    "push_events",
    "push_commits",
    "issues_opened",
    "issues_closed",
    "issues_reopened",
    "issues_opened_author_missing",
    "issues_opened_by_bot",
    "issues_opened_by_human",
    "issues_opened_by_external",
    "issue_median_close_days",
    "issues_closed_with_duration",
    "prs_opened",
    "pr_events_from_api",
    "prs_merged",
    "prs_closed_unmerged",
    "prs_reopened",
    "prs_opened_author_missing",
    "prs_opened_by_bot",
    "prs_opened_by_human",
    "prs_opened_by_external",
    "pr_median_merge_days",
    "prs_merged_with_duration",
    "pr_median_close_unmerged_days",
    "prs_closed_unmerged_with_duration",
    "issue_pr_comment_events",
    "comment_events_author_missing",
    "comment_events_by_bot",
    "comment_events_by_human",
    "pr_review_events",
    "reviews_approved",
    "reviews_changes_requested",
    "review_events_by_maintainer",
    "pr_review_comment_events",
    "review_comment_events_author_missing",
    "review_comment_events_by_bot",
    "review_comment_events_by_human",
    "non_human_public_events",
    "human_public_events",
    "source",
    "quality_flag",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN_OUTPUT)
    return parser.parse_args()


def read_sample(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 100:
        raise ValueError(f"Expected 100 sample repositories, found {len(rows)}")
    if len({row["repo_id"] for row in rows}) != len(rows):
        raise ValueError("Sample contains duplicate repo_id values")
    if any(not row.get("llm_native_manual") for row in rows):
        raise ValueError("Sample classification is incomplete")
    return rows


def build_query(repo_ids: list[int]) -> str:
    ids = ",".join(str(repo_id) for repo_id in repo_ids)
    return f"""
SELECT
    repo_id,
    argMax(repo_name, created_at) AS repo_name,
    toYear(created_at) AS year,
    min(created_at) AS first_event_at,
    max(created_at) AS last_event_at,
    count() AS event_rows,
    countIf(from_api = 1) AS event_rows_from_api,
    uniqExactIf(actor_id, actor_id != 0) AS active_actors,
    countIf(type = 'PushEvent') AS push_events,
    sumIf(push_size, type = 'PushEvent') AS push_commits,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'opened') AS issues_opened,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'closed') AS issues_closed,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'reopened') AS issues_reopened,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'opened' AND issue_author_id = 0) AS issues_opened_author_missing,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'Bot') AS issues_opened_by_bot,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'User') AS issues_opened_by_human,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_association IN ('NONE', 'CONTRIBUTOR')) AS issues_opened_by_external,
    round(quantileExactIf(0.5)(dateDiff('second', issue_created_at, issue_closed_at) / 86400.0,
        type = 'IssuesEvent' AND action = 'closed' AND issue_created_at IS NOT NULL AND issue_closed_at IS NOT NULL AND issue_closed_at >= issue_created_at), 2) AS issue_median_close_days,
    uniqExactIf(issue_id, type = 'IssuesEvent' AND action = 'closed' AND issue_created_at IS NOT NULL AND issue_closed_at IS NOT NULL AND issue_closed_at >= issue_created_at) AS issues_closed_with_duration,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'opened') AS prs_opened,
    countIf(type = 'PullRequestEvent' AND from_api = 1) AS pr_events_from_api,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 1) AS prs_merged,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 0) AS prs_closed_unmerged,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'reopened') AS prs_reopened,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id = 0) AS prs_opened_author_missing,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'Bot') AS prs_opened_by_bot,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'User') AS prs_opened_by_human,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_association IN ('NONE', 'CONTRIBUTOR')) AS prs_opened_by_external,
    round(quantileExactIf(0.5)(dateDiff('second', issue_created_at, pull_merged_at) / 86400.0,
        type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 1 AND issue_created_at IS NOT NULL AND pull_merged_at IS NOT NULL AND pull_merged_at >= issue_created_at), 2) AS pr_median_merge_days,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 1 AND issue_created_at IS NOT NULL AND pull_merged_at IS NOT NULL AND pull_merged_at >= issue_created_at) AS prs_merged_with_duration,
    round(quantileExactIf(0.5)(dateDiff('second', issue_created_at, issue_closed_at) / 86400.0,
        type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 0 AND issue_created_at IS NOT NULL AND issue_closed_at IS NOT NULL AND issue_closed_at >= issue_created_at), 2) AS pr_median_close_unmerged_days,
    uniqExactIf(issue_id, type = 'PullRequestEvent' AND action = 'closed' AND pull_merged = 0 AND issue_created_at IS NOT NULL AND issue_closed_at IS NOT NULL AND issue_closed_at >= issue_created_at) AS prs_closed_unmerged_with_duration,
    countIf(type = 'IssueCommentEvent') AS issue_pr_comment_events,
    countIf(type = 'IssueCommentEvent' AND issue_comment_author_id = 0) AS comment_events_author_missing,
    countIf(type = 'IssueCommentEvent' AND issue_comment_author_id != 0 AND issue_comment_author_type = 'Bot') AS comment_events_by_bot,
    countIf(type = 'IssueCommentEvent' AND issue_comment_author_id != 0 AND issue_comment_author_type = 'User') AS comment_events_by_human,
    countIf(type = 'PullRequestReviewEvent') AS pr_review_events,
    countIf(type = 'PullRequestReviewEvent' AND pull_review_state = 'approved') AS reviews_approved,
    countIf(type = 'PullRequestReviewEvent' AND pull_review_state = 'changes_requested') AS reviews_changes_requested,
    countIf(type = 'PullRequestReviewEvent' AND actor_id != 0 AND pull_review_author_association IN ('OWNER', 'MEMBER', 'COLLABORATOR')) AS review_events_by_maintainer,
    countIf(type = 'PullRequestReviewCommentEvent') AS pr_review_comment_events,
    countIf(type = 'PullRequestReviewCommentEvent' AND pull_review_comment_author_id = 0) AS review_comment_events_author_missing,
    countIf(type = 'PullRequestReviewCommentEvent' AND pull_review_comment_author_id != 0 AND pull_review_comment_author_type = 'Bot') AS review_comment_events_by_bot,
    countIf(type = 'PullRequestReviewCommentEvent' AND pull_review_comment_author_id != 0 AND pull_review_comment_author_type = 'User') AS review_comment_events_by_human,
    countIf(
        (type = 'IssuesEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'Bot') OR
        (type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'Bot') OR
        (type = 'IssueCommentEvent' AND issue_comment_author_id != 0 AND issue_comment_author_type = 'Bot') OR
        (type = 'PullRequestReviewCommentEvent' AND pull_review_comment_author_id != 0 AND pull_review_comment_author_type = 'Bot')
    ) AS non_human_public_events,
    countIf(
        (type = 'IssuesEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'User') OR
        (type = 'PullRequestEvent' AND action = 'opened' AND issue_author_id != 0 AND issue_author_type = 'User') OR
        (type = 'IssueCommentEvent' AND issue_comment_author_id != 0 AND issue_comment_author_type = 'User') OR
        (type = 'PullRequestReviewCommentEvent' AND pull_review_comment_author_id != 0 AND pull_review_comment_author_type = 'User')
    ) AS human_public_events
FROM opensource.events
WHERE platform = 'GitHub'
  AND repo_id IN ({ids})
  AND created_at >= '2022-01-01'
  AND created_at < '{OBSERVATION_END_EXCLUSIVE}'
GROUP BY repo_id, year
ORDER BY repo_id, year
FORMAT JSONEachRow
"""


def query_clickhouse(query: str) -> tuple[list[dict[str, Any]], dict[str, str]]:
    load_dotenv(ROOT / ".env")
    host = os.getenv("CLICKHOUSE_HOST")
    user = os.getenv("CLICKHOUSE_USER")
    password = os.getenv("CLICKHOUSE_PASSWORD")
    if not host or not user or not password:
        raise RuntimeError("ClickHouse credentials are incomplete in .env")

    session = requests.Session()
    session.trust_env = False
    response = session.post(
        f"http://{host}:8123/",
        params={"query": query, "max_execution_time": 300},
        auth=(user, password),
        timeout=360,
    )
    response.raise_for_status()
    rows = [json.loads(line) for line in response.text.splitlines() if line.strip()]
    metadata = {
        "query_id": response.headers.get("X-ClickHouse-Query-Id", ""),
        "summary": response.headers.get("X-ClickHouse-Summary", ""),
    }
    return rows, metadata


def normalize_metric(value: Any) -> str | int | float:
    if value is None:
        return ""
    return value


def build_panel(
    sample: list[dict[str, str]], aggregates: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    indexed = {
        (str(row["repo_id"]), int(row["year"])): row for row in aggregates
    }
    panel: list[dict[str, Any]] = []
    for repo in sample:
        created = datetime.strptime(repo["created_at"], "%Y-%m-%d").date()
        for year in YEARS:
            aggregate = indexed.get((repo["repo_id"], year))
            year_end = date(year, 12, 31)
            if created > year_end:
                status = "not_public_yet"
                quality_flag = "structural_missing_not_zero"
            elif aggregate:
                status = "observed"
                pr_opened = float(aggregate.get("prs_opened", 0) or 0)
                pr_author_missing = float(
                    aggregate.get("prs_opened_author_missing", 0) or 0
                )
                pr_merged = float(aggregate.get("prs_merged", 0) or 0)
                pr_duration = float(
                    aggregate.get("prs_merged_with_duration", 0) or 0
                )
                flags = ["clickhouse_event_aggregate"]
                if pr_opened and pr_author_missing / pr_opened > 0.1:
                    flags.append("pr_author_payload_incomplete")
                if pr_merged and pr_duration / pr_merged < 0.9:
                    flags.append("pr_merge_duration_incomplete")
                quality_flag = "|".join(flags)
            else:
                status = "not_observed"
                quality_flag = "no_event_rows_not_equivalent_to_no_activity"

            output: dict[str, Any] = {
                "sample_rank": repo["sample_rank"],
                "repo_id": repo["repo_id"],
                "repo_name": repo["repo_name"],
                "year": year,
                "observation_status": status,
                "observation_end": (
                    "2026-08-31" if year == 2026 else f"{year}-12-31"
                ),
                "created_at": repo["created_at"],
                "llm_native_manual": repo["llm_native_manual"],
                "llm_native_confidence": repo["llm_native_confidence"],
                "collaboration_niche": repo["collaboration_niche"],
                "agent_proximity": repo["agent_proximity"],
                "language": repo["language"],
                "source": "OpenDigger ClickHouse opensource.events",
                "quality_flag": quality_flag,
            }
            for field in OUTPUT_FIELDS:
                if field not in output:
                    output[field] = normalize_metric(
                        aggregate.get(field) if aggregate else ""
                    )
            panel.append(output)
    return panel


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    sample = read_sample(args.sample)
    query = build_query([int(row["repo_id"]) for row in sample])
    aggregates, metadata = query_clickhouse(query)
    panel = build_panel(sample, aggregates)
    write_csv(args.output, panel)

    observed = [row for row in panel if row["observation_status"] == "observed"]
    run = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "sample": str(args.sample.relative_to(ROOT)),
        "output": str(args.output.relative_to(ROOT)),
        "observation_end_exclusive": OBSERVATION_END_EXCLUSIVE,
        "sample_repositories": len(sample),
        "panel_rows": len(panel),
        "observed_repository_years": len(observed),
        "not_public_yet_repository_years": sum(
            row["observation_status"] == "not_public_yet" for row in panel
        ),
        "not_observed_repository_years": sum(
            row["observation_status"] == "not_observed" for row in panel
        ),
        "clickhouse_query_id": metadata["query_id"],
        "clickhouse_summary": metadata["summary"],
        "limitations": [
            "2026 is year-to-date through 2026-08-31.",
            "No event row is not interpreted as zero collaboration.",
            "ClickHouse aggregates support trends and cross-checks; item-level GitHub APIs remain the source for current Issue and PR truth.",
            "Bot counts only use public actor types on author and comment fields and do not infer undisclosed AI assistance.",
        ],
    }
    args.run_output.write_text(
        json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(run, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
