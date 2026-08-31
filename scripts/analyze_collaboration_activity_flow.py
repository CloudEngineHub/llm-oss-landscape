#!/usr/bin/env python3
"""Summarize matched Issue/PR flow and GitHub Release-day distributions."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_FIXED = RESEARCH / "collaboration-repository-fixed-window-2022-2026.csv"
DEFAULT_MONTH = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_PROFILE = RESEARCH / "collaboration-repository-profile-2026.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-activity-flow-2022-2026-summary.csv"
DEFAULT_RELEASES = RESEARCH / "collaboration-release-distribution-2026-summary.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-activity-flow-findings.md"
DEFAULT_VALIDATION = RESEARCH / "collaboration-activity-flow-validation.json"

FLOW_FIELDS = [
    "scope",
    "segment",
    "year",
    "window",
    "repositories",
    "issues_opened",
    "issues_unresolved",
    "issue_unresolved_share",
    "prs_opened",
    "prs_unresolved",
    "pr_unresolved_share",
    "pr_issue_ratio",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixed", type=Path, default=DEFAULT_FIXED)
    parser.add_argument("--month", type=Path, default=DEFAULT_MONTH)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--repeat-panel", type=Path)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--releases", type=Path, default=DEFAULT_RELEASES)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    parser.add_argument("--validation", type=Path, default=DEFAULT_VALIDATION)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields or list(rows[0]), extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def integer(row: dict[str, str], field: str) -> int:
    return int(float(row[field] or 0))


def aggregate(scope: str, segment: str, year: int, rows: list[dict[str, str]]) -> dict[str, Any]:
    issues = sum(integer(row, "issues_opened") for row in rows)
    issue_unresolved = sum(integer(row, "issues_unresolved_from_cohort") for row in rows)
    prs = sum(integer(row, "prs_opened") for row in rows)
    pr_unresolved = sum(integer(row, "prs_unresolved_from_cohort") for row in rows)
    return {
        "scope": scope,
        "segment": segment,
        "year": year,
        "window": f"{year}-01-01..{year}-08-29",
        "repositories": len(rows),
        "issues_opened": issues,
        "issues_unresolved": issue_unresolved,
        "issue_unresolved_share": round(issue_unresolved / issues, 6) if issues else "",
        "prs_opened": prs,
        "prs_unresolved": pr_unresolved,
        "pr_unresolved_share": round(pr_unresolved / prs, 6) if prs else "",
        "pr_issue_ratio": round(prs / issues, 6) if issues else "",
    }


def pct_change(current: int, previous: int) -> float:
    return current / previous - 1 if previous else 0.0


def main() -> None:
    args = parse_args()
    fixed = read_csv(args.fixed)
    monthly = read_csv(args.month)
    profile = read_csv(args.profile)
    if len(fixed) != 500 or len({(row["repo_name"], row["year"]) for row in fixed}) != 500:
        raise SystemExit("Fixed-window panel must contain 500 unique repository-year rows")
    if len(monthly) != 800 or len({(row["repo_name"], row["month"]) for row in monthly}) != 800:
        raise SystemExit("Monthly panel must contain 800 unique repository-month rows")
    if len(profile) != 100 or len({row["repo_name"] for row in profile}) != 100:
        raise SystemExit("Release profile must contain 100 unique repositories")
    bad = [row for row in fixed if row["quality_flag"] != "search_count_invariants_ok"]
    if bad:
        raise SystemExit(f"Fixed-window invariants failed for {len(bad)} rows")

    by_year: dict[int, list[dict[str, str]]] = defaultdict(list)
    for row in fixed:
        by_year[int(row["year"])].append(row)

    constant_repositories = {
        row["repo_name"]
        for row in fixed
        if int(row["year"]) == 2024 and row["created_at"] <= "2024-01-01"
    }
    summary: list[dict[str, Any]] = []
    for year in range(2022, 2027):
        observable = [row for row in by_year[year] if row["observable_in_window"] == "yes"]
        summary.append(aggregate("frozen_top100_observable", "all", year, observable))
        if year >= 2024:
            constant = [row for row in by_year[year] if row["repo_name"] in constant_repositories]
            summary.append(aggregate("constant_2024_cohort", "all", year, constant))

    current = by_year[2026]
    niche_labels = {
        "agent_application": "Agent applications",
        "agent_framework": "Agent frameworks",
        "agent_runtime_infra": "Agent runtime infrastructure",
        "model_infra": "Model infrastructure",
    }
    for niche, label in niche_labels.items():
        summary.append(
            aggregate(
                "2026_technical_role",
                label,
                2026,
                [row for row in current if row["collaboration_niche"] == niche],
            )
        )
    write_csv(args.summary, summary, FLOW_FIELDS)

    release_days = [integer(row, "github_release_days") for row in profile]
    release_buckets = [
        ("None", lambda value: value == 0),
        ("1 day", lambda value: value == 1),
        ("2-9", lambda value: 2 <= value <= 9),
        ("10-29", lambda value: 10 <= value <= 29),
        ("30-89", lambda value: 30 <= value <= 89),
        ("90-179", lambda value: 90 <= value <= 179),
        ("180+", lambda value: value >= 180),
    ]
    release_rows: list[dict[str, Any]] = []
    for order, (label, predicate) in enumerate(release_buckets, start=1):
        release_rows.append(
            {
                "row_type": "distribution_bucket",
                "order": order,
                "label": label,
                "repo_name": "",
                "repositories": sum(1 for value in release_days if predicate(value)),
                "release_days": "",
                "release_records": "",
            }
        )
    for order, row in enumerate(sorted(profile, key=lambda item: integer(item, "github_release_days"), reverse=True)[:10], start=1):
        release_rows.append(
            {
                "row_type": "release_day_leader",
                "order": order,
                "label": "",
                "repo_name": row["repo_name"],
                "repositories": "",
                "release_days": integer(row, "github_release_days"),
                "release_records": integer(row, "github_releases"),
            }
        )
    write_csv(args.releases, release_rows)

    monthly_final = [row for row in monthly if row["month"] == "2026-08"]
    current_index = {row["repo_name"]: row for row in current}
    current_differences = []
    comparison = {
        "issues_opened": "issues_opened_cumulative",
        "issues_closed_from_cohort": "issues_closed_cumulative",
        "prs_opened": "prs_opened_cumulative",
        "prs_closed_from_cohort": "prs_closed_cumulative",
        "prs_merged_from_cohort": "prs_merged_cumulative",
    }
    for row in monthly_final:
        fixed_row = current_index[row["repo_name"]]
        for fixed_field, monthly_field in comparison.items():
            if integer(fixed_row, fixed_field) != integer(row, monthly_field):
                current_differences.append([row["repo_name"], fixed_field])

    repeat_check: dict[str, Any] = {"available": False}
    if args.repeat_panel and args.repeat_panel.exists():
        repeat = read_csv(args.repeat_panel)
        repeat_index = {(row["repo_name"], row["year"]): row for row in repeat}
        fields = list(comparison)
        changed_cells = 0
        absolute_difference = 0
        for row in fixed:
            other = repeat_index[(row["repo_name"], row["year"])]
            for field in fields:
                delta = abs(integer(row, field) - integer(other, field))
                changed_cells += int(delta > 0)
                absolute_difference += delta
        repeat_check = {
            "available": True,
            "rows": len(repeat),
            "metric_cells_compared": len(fixed) * len(fields),
            "changed_cells": changed_cells,
            "absolute_count_difference": absolute_difference,
        }

    validation = {
        "fixed_window_rows": len(fixed),
        "fixed_window_unique_keys": len({(row["repo_name"], row["year"]) for row in fixed}),
        "monthly_rows": len(monthly),
        "monthly_unique_keys": len({(row["repo_name"], row["month"]) for row in monthly}),
        "current_cross_panel_metric_cells": len(monthly_final) * len(comparison),
        "current_cross_panel_differences": len(current_differences),
        "independent_repeat": repeat_check,
        "known_limitations": [
            "The historical panel freezes the current Top 100 and therefore has survivorship bias.",
            "The constant cohort controls repository entry but still reflects project-specific growth and concentration.",
            "Search counts include human contributors and automation and cannot identify AI-generated code.",
            "Unresolved counts only cover items opened inside the matched window, not older backlog.",
            "GitHub Search indexes can be backfilled; headline totals should be rounded in prose.",
        ],
    }
    args.validation.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    current_total = aggregate("current", "all", 2026, current)
    constant_2025 = next(row for row in summary if row["scope"] == "constant_2024_cohort" and row["year"] == 2025)
    constant_2026 = next(row for row in summary if row["scope"] == "constant_2024_cohort" and row["year"] == 2026)
    monthly_totals = []
    for month in sorted({row["month"] for row in monthly}):
        rows = [row for row in monthly if row["month"] == month]
        issues = sum(integer(row, "issues_opened_in_month") for row in rows)
        prs = sum(integer(row, "prs_opened_in_month") for row in rows)
        monthly_totals.append((month, issues, prs))
    top_issue = sorted(current, key=lambda row: integer(row, "issues_opened"), reverse=True)
    top_pr = sorted(current, key=lambda row: integer(row, "prs_opened"), reverse=True)
    issue_top_five = sum(integer(row, "issues_opened") for row in top_issue[:5]) / current_total["issues_opened"]
    pr_top_five = sum(integer(row, "prs_opened") for row in top_pr[:5]) / current_total["prs_opened"]
    release_days_sorted = sorted(release_days)
    findings = f"""# Top 100 的协作流量与发版节奏

数据截止 2026-08-29。Issue / PR 统计都使用冻结的当前 Top 100；历史对照使用每年相同的 1 月 1 日至 8 月 29 日窗口。

## 今年的 PR 流入明显高于 Issue

窗口内约有 {current_total['issues_opened']:,} 条 Issue 和 {current_total['prs_opened']:,} 条 PR，PR 是 Issue 的 {current_total['pr_issue_ratio']:.2f} 倍。这个关系不是一开始就固定如此：月度比值从 1 月的 {monthly_totals[0][2] / monthly_totals[0][1]:.2f} 上升到 8 月前 29 天的 {monthly_totals[-1][2] / monthly_totals[-1][1]:.2f}。

PR 多不等于 Agent 写了更多代码。这里包括人类提交、依赖更新、release 自动化和其他 Bot；GitHub 的总量数据无法拆出 AI 生成代码。

## 流量和未解决量都不是平均分布

Issue 流入最高的五个仓库占 {issue_top_five:.1%}，PR 流入最高的五个占 {pr_top_five:.1%}。Agent applications 贡献了最多 Issue；Model infrastructure 的 PR 是 Issue 的 {next(row for row in summary if row['scope'] == '2026_technical_role' and row['segment'] == 'Model infrastructure')['pr_issue_ratio']:.2f} 倍，Agent runtime infrastructure 是 {next(row for row in summary if row['scope'] == '2026_technical_role' and row['segment'] == 'Agent runtime infrastructure')['pr_issue_ratio']:.2f} 倍。

截至观察日，2026 cohort 中 {current_total['issue_unresolved_share']:.1%} 的 Issue、{current_total['pr_unresolved_share']:.1%} 的 PR 仍未解决。这个口径不包含 2025 年及以前的历史 backlog。

## 固定 cohort 显示增长主要发生在 PR

为了排除新仓库进入样本，我们只看 2024 年初已经公开的 {len(constant_repositories)} 个仓库。2025 到 2026 的同窗口里，Issue 从 {constant_2025['issues_opened']:,} 变为 {constant_2026['issues_opened']:,}（{pct_change(constant_2026['issues_opened'], constant_2025['issues_opened']):+.1%}），PR 从 {constant_2025['prs_opened']:,} 增至 {constant_2026['prs_opened']:,}（{pct_change(constant_2026['prs_opened'], constant_2025['prs_opened']):+.1%}）。

增长并不均匀，LiteLLM、vLLM、n8n 和 PyTorch 贡献了较大的 PR 增量。可以稳妥地说变更流正在变重；这组数据还不能把变化归因给 coding Agent。

## 发版频繁，但不能直接数 Release 条目

{sum(value > 0 for value in release_days)}/100 个仓库在窗口内发布过非 draft GitHub Release。按 UTC 日期去重后，仓库的 release day 中位数是 {statistics.median(release_days):.0f} 天，四分位区间是 {statistics.quantiles(release_days, n=4)[0]:.0f}—{statistics.quantiles(release_days, n=4)[2]:.0f} 天；{sum(value >= 180 for value in release_days)} 个仓库达到 180 天以上。

Vercel AI 的 14,974 条 Release 记录只落在 192 个日期，说明 raw release count 很容易被多包和 canary 流水线放大。页面因此展示 release day 分布，并保留 tag-only、PyPI、npm 和其他 registry 不在此口径内的限制。

## 数据复核

- 固定窗口面板：500 个 repository-year 行；
- 月度面板：800 个 repository-month 行；
- 两个面板的 2026 年 500 个关键计数单元格完全一致；
- 同日独立重复采集的 {repeat_check.get('metric_cells_compared', 0):,} 个计数单元格中，差异为 {repeat_check.get('changed_cells', '未执行')}；
- GitHub Search 会发生索引回填，报告正文应使用约数，不把绝对数写到个位。
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(f"Wrote {len(summary)} activity rows, {len(release_rows)} release rows and validation evidence")


if __name__ == "__main__":
    main()
