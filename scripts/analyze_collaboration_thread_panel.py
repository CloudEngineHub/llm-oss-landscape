#!/usr/bin/env python3
"""Compare response and revision behavior in one fixed Top-100 thread panel."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from statistics import median
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--matched-repositories",
        type=Path,
        default=RESEARCH / "collaboration-system-pressure-repositories-2024-2026.csv",
    )
    parser.add_argument("--years", type=int, nargs="+", default=[2025, 2026])
    parser.add_argument(
        "--output",
        type=Path,
        default=RESEARCH / "collaboration-thread-panel-summary-2025-2026.csv",
    )
    parser.add_argument(
        "--repository-output",
        type=Path,
        default=RESEARCH / "collaboration-thread-panel-repositories-2025-2026.csv",
    )
    parser.add_argument(
        "--findings",
        type=Path,
        default=RESEARCH / "collaboration-thread-panel-findings.md",
    )
    parser.add_argument(
        "--run-output",
        type=Path,
        default=RESEARCH / "collaboration-thread-panel-run.json",
    )
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        raise ValueError(f"No rows to write: {path}")
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def yes(value: str) -> bool:
    return value.strip().lower() == "yes"


def number(value: str) -> float | None:
    if value in {"", None}:  # type: ignore[comparison-overlap]
        return None
    return float(value)


def share(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def numeric_median(values: list[float]) -> float | None:
    return median(values) if values else None


def revision_cycles(
    review_rows: list[dict[str, str]], commit_rows: list[dict[str, str]]
) -> dict[tuple[str, str], int]:
    """Count visible request-change / new-commit loops, not raw review records."""
    events: dict[tuple[str, str], list[tuple[str, str]]] = defaultdict(list)
    for row in review_rows:
        if row.get("event_type") != "reviewed":
            continue
        if row.get("review_state", "").upper() != "CHANGES_REQUESTED":
            continue
        created = row.get("created_at", "")
        if created:
            events[(row["repo_name"], row["number"])].append((created, "request"))
    for row in commit_rows:
        if row.get("event_type") != "committed":
            continue
        created = row.get("created_at", "")
        if created:
            events[(row["repo_name"], row["number"])].append((created, "commit"))

    output: dict[tuple[str, str], int] = {}
    for key, sequence in events.items():
        cycles = 0
        commit_since_request = False
        has_request = False
        for _, kind in sorted(sequence):
            if kind == "commit":
                if has_request:
                    commit_since_request = True
                continue
            if not has_request or commit_since_request:
                cycles += 1
                has_request = True
                commit_since_request = False
        output[key] = cycles
    return output


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    threads = len(rows)
    issues = [row for row in rows if row["item_type"] == "issue"]
    prs = [row for row in rows if row["item_type"] == "pull_request"]
    reviewed_prs = [row for row in prs if yes(row["review_observed"])]
    requested_prs = [row for row in prs if int(row["requested_revision_cycles"]) > 0]

    human_7d = sum(
        (value := number(row["first_human_account_response_hours"])) is not None
        and value <= 24 * 7
        for row in rows
    )
    maintainer_7d = sum(
        (value := number(row["first_maintainer_account_response_hours"])) is not None
        and value <= 24 * 7
        for row in rows
    )
    issue_30d = sum(
        row["outcome"] != "open"
        and (value := number(row["resolution_days"])) is not None
        and value <= 30
        for row in issues
    )
    pr_30d = sum(
        row["outcome"] != "open"
        and (value := number(row["resolution_days"])) is not None
        and value <= 30
        for row in prs
    )
    requested_followup = sum(yes(row["change_request_followed_by_commit"]) for row in requested_prs)
    cycles = [int(row["requested_revision_cycles"]) for row in prs]
    post_review_commits = [
        float(row["commits_after_first_review"])
        for row in reviewed_prs
        if row["commits_after_first_review"] != ""
    ]
    agent_participation = sum(yes(row["agent_participation_present"]) for row in rows)
    return {
        "threads": threads,
        "issues": len(issues),
        "pull_requests": len(prs),
        "repositories": len({row["repo_name"] for row in rows}),
        "agent_participation_count": agent_participation,
        "agent_participation_share": share(agent_participation, threads),
        "human_response_within_7d_count": human_7d,
        "human_response_within_7d_share": share(human_7d, threads),
        "maintainer_response_within_7d_count": maintainer_7d,
        "maintainer_response_within_7d_share": share(maintainer_7d, threads),
        "issue_resolved_within_30d_count": issue_30d,
        "issue_resolved_within_30d_share": share(issue_30d, len(issues)),
        "pr_resolved_within_30d_count": pr_30d,
        "pr_resolved_within_30d_share": share(pr_30d, len(prs)),
        "pr_reviewed_count": len(reviewed_prs),
        "pr_reviewed_share": share(len(reviewed_prs), len(prs)),
        "pr_requested_revision_count": len(requested_prs),
        "pr_requested_revision_share": share(len(requested_prs), len(prs)),
        "requested_revision_followed_by_commit_count": requested_followup,
        "requested_revision_followed_by_commit_share": share(requested_followup, len(requested_prs)),
        "pr_zero_requested_revision_share": share(sum(value == 0 for value in cycles), len(cycles)),
        "pr_one_requested_revision_share": share(sum(value == 1 for value in cycles), len(cycles)),
        "pr_two_plus_requested_revision_share": share(sum(value >= 2 for value in cycles), len(cycles)),
        "median_requested_revision_cycles_among_requested_prs": numeric_median(
            [float(value) for value in cycles if value > 0]
        ),
        "median_commits_after_first_review": numeric_median(post_review_commits),
    }


def main() -> None:
    args = parse_args()
    matched = {
        row["repo_name"]
        for row in read_csv(args.matched_repositories)
        if row.get("matched_historical_panel") == "yes"
    }
    if len(matched) != 55:
        raise SystemExit(f"Expected 55 matched repositories, found {len(matched)}")

    summary_rows: list[dict[str, Any]] = []
    repository_rows: list[dict[str, Any]] = []
    source_rows: dict[int, int] = {}
    for year in args.years:
        analysis_path = RESEARCH / f"collaboration-thread-analysis-{year}.csv"
        event_path = RESEARCH / f"collaboration-thread-events-{year}.csv"
        commit_path = RESEARCH / f"collaboration-thread-pr-commits-{year}.csv"
        rows = [row for row in read_csv(analysis_path) if row["repo_name"] in matched]
        source_rows[year] = len(rows)
        cycles = revision_cycles(read_csv(event_path), read_csv(commit_path))
        for row in rows:
            row["requested_revision_cycles"] = cycles.get((row["repo_name"], row["number"]), 0)

        summary_rows.append({"scope": "matched_panel", "scope_value": "all", "year": year, **summarize(rows)})
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[row["repo_name"]].append(row)
        for repo, repo_rows in sorted(grouped.items()):
            repository_rows.append(
                {"scope": "repository", "scope_value": repo, "year": year, **summarize(repo_rows)}
            )

    write_csv(args.output, summary_rows)
    write_csv(args.repository_output, repository_rows)

    by_year = {int(row["year"]): row for row in summary_rows}
    y0, y1 = args.years[0], args.years[-1]
    a, b = by_year[y0], by_year[y1]
    pct = lambda value: "—" if value is None else f"{value:.1%}"
    findings = f"""# 统一线程样本：真人响应与 PR 修改循环

## 这组数据回答什么

这里继续使用冻结 Top 100，并只比较贯穿 {y0}—{y1} 年的同一组 55 个仓库。每个仓库、每年最多抽取 50 条 Issue 或 PR；不按仓库流量加权，每条线程只计算一次。全量队列和 90 天合入结果以 GitHub 全量计数为准；这组样本只用来观察完整时间线里谁先响应、是否进入修改循环。

## 真人响应

- 出现具名 Agent 或 App 的线程：{pct(a['agent_participation_share'])} → {pct(b['agent_participation_share'])}。
- 七天内收到非作者、非自动化账号响应的线程：{pct(a['human_response_within_7d_share'])} → {pct(b['human_response_within_7d_share'])}。
- 七天内收到仓库 Owner、Member 或 Collaborator 响应的线程：{pct(a['maintainer_response_within_7d_share'])} → {pct(b['maintainer_response_within_7d_share'])}。
- 30 天内解决的 Issue：{pct(a['issue_resolved_within_30d_share'])} → {pct(b['issue_resolved_within_30d_share'])}；30 天内解决的 PR：{pct(a['pr_resolved_within_30d_share'])} → {pct(b['pr_resolved_within_30d_share'])}。

## PR 如何进入修改循环

- 有公开 review 记录的 PR：{pct(a['pr_reviewed_share'])} → {pct(b['pr_reviewed_share'])}。
- 至少收到一次正式 changes requested 的 PR：{pct(a['pr_requested_revision_share'])} → {pct(b['pr_requested_revision_share'])}。
- 收到修改要求后又提交代码的 PR：{pct(a['requested_revision_followed_by_commit_share'])} → {pct(b['requested_revision_followed_by_commit_share'])}。
- 两轮或更多“修改要求—新提交”循环的 PR：{pct(a['pr_two_plus_requested_revision_share'])} → {pct(b['pr_two_plus_requested_revision_share'])}。

这里的“轮”不是 review 条数。第一次 changes requested 记为一轮；作者提交新代码后再次收到 changes requested，才进入下一轮。这样更接近读者所理解的修改迭代。
"""
    args.findings.write_text(findings, encoding="utf-8")

    run = {
        "generated_at": datetime.now(UTC).isoformat(),
        "years": args.years,
        "matched_repositories": len(matched),
        "source_analysis_rows": source_rows,
        "summary_rows": len(summary_rows),
        "repository_rows": len(repository_rows),
        "weighting": "none; every sampled thread counts once",
        "revision_cycle_definition": (
            "first CHANGES_REQUESTED review starts a cycle; another starts a new cycle only after an intervening commit"
        ),
        "outputs": [
            str(args.output.relative_to(ROOT)),
            str(args.repository_output.relative_to(ROOT)),
            str(args.findings.relative_to(ROOT)),
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
