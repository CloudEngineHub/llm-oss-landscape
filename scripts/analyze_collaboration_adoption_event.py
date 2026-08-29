#!/usr/bin/env python3
"""Describe repository activity around candidate Agent-instruction adoption dates.

This is a falsification-oriented descriptive check, not a causal event study:
adding an instruction file is voluntary, may respond to activity, and does not
prove that an Agent began operating on that date.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from datetime import date
from pathlib import Path
from statistics import median
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_DATES = RESEARCH / "collaboration-agent-instruction-adoption-dates-2026.csv"
DEFAULT_MONTHS = RESEARCH / "collaboration-repository-month-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-adoption-event-activity-2026.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-adoption-event-activity-2026-summary.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-adoption-event-activity-2026-findings.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dates", type=Path, default=DEFAULT_DATES)
    parser.add_argument("--months", type=Path, default=DEFAULT_MONTHS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0]) if rows else []
    with path.open("w", newline="", encoding="utf-8") as handle:
        if not fields:
            return
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def shift_month(month: str, offset: int) -> str:
    year, value = map(int, month.split("-"))
    absolute = year * 12 + value - 1 + offset
    return f"{absolute // 12:04d}-{absolute % 12 + 1:02d}"


def main() -> None:
    args = parse_args()
    dates = [
        row
        for row in read_csv(args.dates)
        if row.get("scan_status") == "ok" and row.get("path_history_inconsistency") != "true"
    ]
    months = {
        (row["repo_name"], row["month"]): row for row in read_csv(args.months)
    }
    metrics = ["issues_opened_in_month", "prs_opened_in_month"]
    output: list[dict[str, Any]] = []
    for adoption in dates:
        repo = adoption["repo_name"]
        adoption_month = adoption["candidate_adoption_date"][:7]
        required = [shift_month(adoption_month, offset) for offset in (-2, -1, 1, 2)]
        if any(month > "2026-07" for month in required):
            # August was still live during collection and is not comparable to
            # the seven completed months.
            continue
        if not all((repo, month) in months for month in required):
            continue
        for metric in metrics:
            before = [float(months[(repo, month)][metric]) for month in required[:2]]
            after = [float(months[(repo, month)][metric]) for month in required[2:]]
            before_mean = sum(before) / 2
            after_mean = sum(after) / 2
            output.append(
                {
                    "repo_name": repo,
                    "llm_native_manual": adoption["llm_native_manual"],
                    "collaboration_niche": adoption["collaboration_niche"],
                    "candidate_adoption_date": adoption["candidate_adoption_date"],
                    "candidate_adoption_month": adoption_month,
                    "metric": metric,
                    "pre_minus_2": before[0],
                    "pre_minus_1": before[1],
                    "post_plus_1": after[0],
                    "post_plus_2": after[1],
                    "pre_two_month_mean": round(before_mean, 3),
                    "post_two_month_mean": round(after_mean, 3),
                    "post_minus_pre": round(after_mean - before_mean, 3),
                    "post_to_pre_ratio": round(after_mean / before_mean, 4) if before_mean else "",
                }
            )
    write_csv(args.output, output)

    summary: list[dict[str, Any]] = []
    for metric in metrics:
        values = [row for row in output if row["metric"] == metric]
        ratios = [float(row["post_to_pre_ratio"]) for row in values if row["post_to_pre_ratio"] != ""]
        summary.append(
            {
                "scope_type": "overall",
                "scope_value": "all",
                "metric": metric,
                "repositories": len(values),
                "median_post_to_pre_ratio": round(median(ratios), 4) if ratios else "",
                "repositories_higher_after": sum(ratio > 1 for ratio in ratios),
                "repositories_lower_after": sum(ratio < 1 for ratio in ratios),
                "repositories_same": sum(ratio == 1 for ratio in ratios),
            }
        )
        for niche in sorted({row["collaboration_niche"] for row in values}):
            subset = [row for row in values if row["collaboration_niche"] == niche]
            niche_ratios = [float(row["post_to_pre_ratio"]) for row in subset if row["post_to_pre_ratio"] != ""]
            summary.append(
                {
                    "scope_type": "collaboration_niche",
                    "scope_value": niche,
                    "metric": metric,
                    "repositories": len(subset),
                    "median_post_to_pre_ratio": round(median(niche_ratios), 4) if niche_ratios else "",
                    "repositories_higher_after": sum(ratio > 1 for ratio in niche_ratios),
                    "repositories_lower_after": sum(ratio < 1 for ratio in niche_ratios),
                    "repositories_same": sum(ratio == 1 for ratio in niche_ratios),
                }
            )
    write_csv(args.summary, summary)

    overall = {row["metric"]: row for row in summary if row["scope_type"] == "overall"}
    findings = f"""# Agent 指令文件出现前后，仓库活动发生了什么

状态：这是反证检查，不是因果估计。

只保留 adoption 前两个完整月和后两个完整月都有数据的仓库，排除 adoption 当月和仍在变化的 8 月，共 {overall['issues_opened_in_month']['repositories']} 个仓库。

- Issue 流入量后 / 前的仓库中位数：{overall['issues_opened_in_month']['median_post_to_pre_ratio']}。
- PR 流入量后 / 前的仓库中位数：{overall['prs_opened_in_month']['median_post_to_pre_ratio']}。

这个日期只是当前 Agent 指令路径最早一次公开提交，不是仓库第一次使用 Agent。仓库也可能因为贡献压力已经上升，才增加指令文件。因此，即使 adoption 前后出现断点，也可能来自反向因果、发布节奏或项目自然增长。这项检查可以推翻“放入规则文件就机械地减少协作流入”这种简单故事，不能估计生产率。
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(f"Wrote {len(output)} repository-metric rows and {len(summary)} summaries")


if __name__ == "__main__":
    main()
