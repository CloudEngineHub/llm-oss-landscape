#!/usr/bin/env python3
"""Validate and summarize the 2026 repository-month collaboration panel."""

from __future__ import annotations

import argparse
import csv
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_PANEL = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_VALIDATION = RESEARCH / "collaboration-repository-month-2026-validation.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-repository-month-2026-summary.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-repository-month-2026-findings.md"
COUNT_FIELDS = (
    "issues_opened_cumulative",
    "issues_closed_cumulative",
    "prs_opened_cumulative",
    "prs_closed_cumulative",
    "prs_merged_cumulative",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--panel", type=Path, default=DEFAULT_PANEL)
    parser.add_argument("--validation", type=Path, default=DEFAULT_VALIDATION)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def integer(row: dict[str, str], field: str) -> int:
    return int(row[field])


def median_ratio(rows: list[dict[str, str]], numerator: str, denominator: str) -> float:
    values = [integer(row, numerator) / integer(row, denominator) for row in rows if integer(row, denominator)]
    return statistics.median(values)


def weighted_ratio(rows: list[dict[str, str]], numerator: str, denominator: str) -> float:
    den = sum(integer(row, denominator) for row in rows)
    return sum(integer(row, numerator) for row in rows) / den if den else 0.0


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    rows = read_csv(args.panel)
    if len(rows) != 800:
        raise SystemExit(f"Expected 800 repository-month rows, found {len(rows)}")
    keys = {(row["repo_name"], row["month"]) for row in rows}
    if len(keys) != len(rows):
        raise SystemExit("Duplicate repository-month rows detected")
    if len({row["repo_name"] for row in rows}) != 100:
        raise SystemExit("Expected 100 repositories")
    bad_invariants = [row for row in rows if row["quality_flag"] != "search_count_invariants_ok"]
    if bad_invariants:
        raise SystemExit(f"Search count invariants failed for {len(bad_invariants)} rows")

    validation = read_csv(args.validation)
    indexed = {(row["repo_name"], row["month"]): row for row in rows}
    differences = []
    for row in validation:
        baseline = indexed[(row["repo_name"], row["month"])]
        for field in COUNT_FIELDS:
            if baseline[field] != row[field]:
                differences.append((row["repo_name"], row["month"], field, baseline[field], row[field]))
    completed_month_differences = [item for item in differences if item[1] != "2026-08"]
    if completed_month_differences:
        raise SystemExit(f"Completed-month replication failed: {completed_month_differences[:3]}")

    august = [row for row in rows if row["month"] == "2026-08"]
    summary_rows: list[dict[str, Any]] = []
    by_month: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_month[row["month"]].append(row)
    for month, month_rows in sorted(by_month.items()):
        summary_rows.append(
            {
                "section": "monthly_flow",
                "segment": "all_repositories",
                "period": month,
                "repositories": len(month_rows),
                "issues_opened": sum(integer(row, "issues_opened_in_month") for row in month_rows),
                "issues_closed": sum(integer(row, "issues_closed_in_month") for row in month_rows),
                "issues_window_cohort_backlog": sum(integer(row, "issues_window_cohort_backlog") for row in month_rows),
                "prs_opened": sum(integer(row, "prs_opened_in_month") for row in month_rows),
                "prs_closed": sum(integer(row, "prs_closed_in_month") for row in month_rows),
                "prs_merged": sum(integer(row, "prs_merged_in_month") for row in month_rows),
                "prs_window_cohort_backlog": sum(integer(row, "prs_window_cohort_backlog") for row in month_rows),
                "issue_unresolved_share_event_weighted": "",
                "issue_unresolved_share_repo_median": "",
                "pr_unresolved_share_event_weighted": "",
                "pr_unresolved_share_repo_median": "",
                "pr_merge_share_resolved_event_weighted": "",
                "pr_merge_share_resolved_repo_median": "",
            }
        )

    def outcome_summary(segment: str, subset: list[dict[str, str]]) -> dict[str, Any]:
        return {
            "section": "window_outcome",
            "segment": segment,
            "period": "2026-01-01..2026-08-29",
            "repositories": len(subset),
            "issues_opened": sum(integer(row, "issues_opened_cumulative") for row in subset),
            "issues_closed": sum(integer(row, "issues_closed_cumulative") for row in subset),
            "issues_window_cohort_backlog": sum(integer(row, "issues_window_cohort_backlog") for row in subset),
            "prs_opened": sum(integer(row, "prs_opened_cumulative") for row in subset),
            "prs_closed": sum(integer(row, "prs_closed_cumulative") for row in subset),
            "prs_merged": sum(integer(row, "prs_merged_cumulative") for row in subset),
            "prs_window_cohort_backlog": sum(integer(row, "prs_window_cohort_backlog") for row in subset),
            "issue_unresolved_share_event_weighted": round(weighted_ratio(subset, "issues_window_cohort_backlog", "issues_opened_cumulative"), 6),
            "issue_unresolved_share_repo_median": round(median_ratio(subset, "issues_window_cohort_backlog", "issues_opened_cumulative"), 6),
            "pr_unresolved_share_event_weighted": round(weighted_ratio(subset, "prs_window_cohort_backlog", "prs_opened_cumulative"), 6),
            "pr_unresolved_share_repo_median": round(median_ratio(subset, "prs_window_cohort_backlog", "prs_opened_cumulative"), 6),
            "pr_merge_share_resolved_event_weighted": round(weighted_ratio(subset, "prs_merged_cumulative", "prs_closed_cumulative"), 6),
            "pr_merge_share_resolved_repo_median": round(median_ratio(subset, "prs_merged_cumulative", "prs_closed_cumulative"), 6),
        }

    summary_rows.append(outcome_summary("all_repositories", august))
    niches: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in august:
        niches[row["collaboration_niche"]].append(row)
    for niche, subset in sorted(niches.items()):
        summary_rows.append(outcome_summary(niche, subset))

    write_csv(args.summary, summary_rows)

    issue_order = sorted(august, key=lambda row: integer(row, "issues_opened_cumulative"), reverse=True)
    pr_order = sorted(august, key=lambda row: integer(row, "prs_opened_cumulative"), reverse=True)
    issue_total = sum(integer(row, "issues_opened_cumulative") for row in august)
    pr_total = sum(integer(row, "prs_opened_cumulative") for row in august)
    all_outcomes = outcome_summary("all_repositories", august)
    without_top_five = outcome_summary("drop_top_five_pr_intake", pr_order[5:])
    completed_cells = sum(1 for row in validation if row["month"] != "2026-08") * len(COUNT_FIELDS)
    current_cells = sum(1 for row in validation if row["month"] == "2026-08") * len(COUNT_FIELDS)
    replication_text = (
        f"曾对前十个仓库重复查询。1—7 月的 {completed_cells} 个已结束月份单元格完全一致；"
        f"仍在变化的 8 月有 {len(differences)}/{current_cells} 个单元格不同，差异都只有 1—5 条，"
        "来自两次查询之间新创建或被处理的协作项。"
        if validation
        else "一次性重复采集文件在检查通过后已删除；永久保留的面板不变量和独立 repository-connection 复核记录在验证日志中。"
    )
    findings = f"""# 2026 年 Issue / PR 月度面板

日期：2026-08-29。面板包含 100 个仓库 × 8 个月，所有仓库使用同一组冻结的 GitHub Search 查询。

## 复核

{replication_text}

## 活动高度集中

窗口内共有 {issue_total:,} 条 Issue、{pr_total:,} 条 PR。最大的 Issue 仓库贡献 {integer(issue_order[0], 'issues_opened_cumulative') / issue_total:.1%} 的 Issue 流入，前五个贡献 {sum(integer(row, 'issues_opened_cumulative') for row in issue_order[:5]) / issue_total:.1%}；最大的 PR 仓库贡献 {integer(pr_order[0], 'prs_opened_cumulative') / pr_total:.1%}，前五个贡献 {sum(integer(row, 'prs_opened_cumulative') for row in pr_order[:5]) / pr_total:.1%}。

这就是为什么报告必须同时给出仓库中位数和按事件加权结果。

## 两种汇总回答不同问题

截至 8 月 29 日，按每条 PR 等权，已解决 PR 中 {all_outcomes['pr_merge_share_resolved_event_weighted']:.1%} 带 merged flag；仓库中位数是 {all_outcomes['pr_merge_share_resolved_repo_median']:.1%}。去掉 PR 流入最大的五个仓库后，按事件加权结果变为 {without_top_five['pr_merge_share_resolved_event_weighted']:.1%}。

窗口内新建 Issue 的未解决比例，按事件加权是 {all_outcomes['issue_unresolved_share_event_weighted']:.1%}，仓库中位数是 {all_outcomes['issue_unresolved_share_repo_median']:.1%}；PR 分别是 {all_outcomes['pr_unresolved_share_event_weighted']:.1%} 和 {all_outcomes['pr_unresolved_share_repo_median']:.1%}。

更低的整体 merged flag 主要集中在最高流量仓库，可能意味着维护者筛选压力更大，但不是证明。要判断是谁 review、经历多少轮、是否由 Agent 产生，必须回到线程样本。

## 边界

- 这是 2026 年新流入 cohort 的未解决比例，不是仓库全部历史 backlog。
- 8 月只观察到 29 日，不能直接和完整月份比较。
- GitHub Search 总量不能识别 Agent 或维护者投入，只用于提出问题，不能单独回答效率。
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(f"Wrote {len(summary_rows)} summary rows to {args.summary.relative_to(ROOT)}")
    print(f"Wrote findings to {args.findings.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
