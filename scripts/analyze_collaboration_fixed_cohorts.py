#!/usr/bin/env python3
"""Summarize fixed-maturity Issue/PR cohorts for Top 100 and benchmark projects."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from statistics import median
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_TOP = RESEARCH / "collaboration-top100-fixed-90d-cohorts-2026.csv"
DEFAULT_CONTROL = RESEARCH / "collaboration-control-panel-fixed-90d-cohorts.csv"
DEFAULT_MARKERS = RESEARCH / "collaboration-agent-markers-2022-2026-summary.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-fixed-90d-summary.csv"
DEFAULT_TRANSITIONS = RESEARCH / "collaboration-control-2022-2026-transitions.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-fixed-90d-findings.md"

COUNT_FIELDS = (
    "issues_opened",
    "issues_closed_by_90d",
    "issues_unresolved_at_90d",
    "prs_opened",
    "prs_closed_by_90d",
    "prs_merged_by_90d",
    "prs_unresolved_at_90d",
)

SUMMARY_FIELDS = [
    "panel",
    "scope_type",
    "scope_value",
    "year",
    "repositories",
    "issues_opened_median_repo",
    "prs_opened_median_repo",
    "issue_unresolved_share_median_repo",
    "issue_unresolved_share_event_weighted",
    "pr_unresolved_share_median_repo",
    "pr_unresolved_share_event_weighted",
    "github_merge_flag_share_resolved_median_repo",
    "github_merge_flag_share_resolved_event_weighted",
    "pr_to_issue_ratio_median_repo",
    "pr_to_issue_ratio_event_weighted",
]

TRANSITION_FIELDS = [
    "repo_name",
    "control_domain",
    "language_match_role",
    "issues_opened_2022",
    "issues_opened_2026",
    "issues_opened_change",
    "prs_opened_2022",
    "prs_opened_2026",
    "prs_opened_change",
    "issue_unresolved_share_2022",
    "issue_unresolved_share_2026",
    "issue_unresolved_share_change",
    "pr_unresolved_share_2022",
    "pr_unresolved_share_2026",
    "pr_unresolved_share_change",
    "github_merge_flag_share_resolved_2022",
    "github_merge_flag_share_resolved_2026",
    "github_merge_flag_share_resolved_change",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--top", type=Path, default=DEFAULT_TOP)
    parser.add_argument("--control", type=Path, default=DEFAULT_CONTROL)
    parser.add_argument("--markers", type=Path, default=DEFAULT_MARKERS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--transitions", type=Path, default=DEFAULT_TRANSITIONS)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def integer(value: str | int | float | None) -> int:
    return int(float(value or 0))


def aggregate_repositories(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, int], dict[str, Any]] = {}
    for row in rows:
        key = row["repo_name"], int(row["year"])
        target = grouped.setdefault(
            key,
            {
                "repo_name": row["repo_name"],
                "year": int(row["year"]),
                **{
                    field: row.get(field, "")
                    for field in (
                        "llm_native_manual",
                        "collaboration_niche",
                        "agent_proximity",
                        "control_domain",
                        "language_match_role",
                    )
                },
                **{field: 0 for field in COUNT_FIELDS},
            },
        )
        for field in COUNT_FIELDS:
            target[field] += integer(row.get(field))
    for row in grouped.values():
        row["issue_unresolved_share"] = (
            row["issues_unresolved_at_90d"] / row["issues_opened"] if row["issues_opened"] else None
        )
        row["pr_unresolved_share"] = (
            row["prs_unresolved_at_90d"] / row["prs_opened"] if row["prs_opened"] else None
        )
        row["github_merge_flag_share_resolved"] = (
            row["prs_merged_by_90d"] / row["prs_closed_by_90d"] if row["prs_closed_by_90d"] else None
        )
        row["pr_to_issue_ratio"] = row["prs_opened"] / row["issues_opened"] if row["issues_opened"] else None
    return list(grouped.values())


def med(rows: list[dict[str, Any]], field: str) -> float | None:
    values = [float(row[field]) for row in rows if row.get(field) is not None]
    return median(values) if values else None


def ratio(rows: list[dict[str, Any]], numerator: str, denominator: str) -> float | None:
    den = sum(int(row[denominator]) for row in rows)
    return sum(int(row[numerator]) for row in rows) / den if den else None


def rounded(value: float | None, digits: int = 4) -> str | float:
    return "" if value is None else round(value, digits)


def summarize(panel: str, scope_type: str, scope_value: str, year: int, rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "panel": panel,
        "scope_type": scope_type,
        "scope_value": scope_value,
        "year": year,
        "repositories": len(rows),
        "issues_opened_median_repo": rounded(med(rows, "issues_opened"), 2),
        "prs_opened_median_repo": rounded(med(rows, "prs_opened"), 2),
        "issue_unresolved_share_median_repo": rounded(med(rows, "issue_unresolved_share")),
        "issue_unresolved_share_event_weighted": rounded(ratio(rows, "issues_unresolved_at_90d", "issues_opened")),
        "pr_unresolved_share_median_repo": rounded(med(rows, "pr_unresolved_share")),
        "pr_unresolved_share_event_weighted": rounded(ratio(rows, "prs_unresolved_at_90d", "prs_opened")),
        "github_merge_flag_share_resolved_median_repo": rounded(med(rows, "github_merge_flag_share_resolved")),
        "github_merge_flag_share_resolved_event_weighted": rounded(ratio(rows, "prs_merged_by_90d", "prs_closed_by_90d")),
        "pr_to_issue_ratio_median_repo": rounded(med(rows, "pr_to_issue_ratio"), 2),
        "pr_to_issue_ratio_event_weighted": rounded(ratio(rows, "prs_opened", "issues_opened"), 2),
    }


def value(row: dict[str, Any], field: str) -> float | None:
    result = row.get(field)
    return float(result) if result is not None else None


def change(end: float | None, start: float | None) -> float | None:
    return None if end is None or start is None else end - start


def fmt_share(value: Any) -> str:
    return "n/a" if value in {"", None} else f"{float(value):.1%}"


def main() -> None:
    args = parse_args()
    top = aggregate_repositories(read_csv(args.top))
    control = aggregate_repositories(read_csv(args.control))
    markers = {
        row["repo_name"]: row
        for row in read_csv(args.markers)
        if row.get("snapshot_date") == "2026-08-31"
    }
    for row in top:
        row["has_active_instruction"] = markers.get(row["repo_name"], {}).get("has_active_instruction", "unknown")

    summaries: list[dict[str, Any]] = []
    top_2026 = [row for row in top if row["year"] == 2026]
    summaries.append(summarize("agentic_top100", "overall", "all", 2026, top_2026))
    for field, scope in (
        ("llm_native_manual", "project_identity"),
        ("collaboration_niche", "technical_niche"),
        ("agent_proximity", "agent_proximity"),
        ("has_active_instruction", "strict_instruction"),
    ):
        for scope_value in sorted({str(row.get(field, "")) for row in top_2026}):
            subset = [row for row in top_2026 if str(row.get(field, "")) == scope_value]
            summaries.append(summarize("agentic_top100", scope, scope_value, 2026, subset))
    for year in range(2022, 2027):
        subset = [row for row in control if row["year"] == year]
        summaries.append(summarize("long_lived_benchmark", "overall", "all", year, subset))

    transitions = []
    control_index = {(row["repo_name"], row["year"]): row for row in control}
    for repo in sorted({row["repo_name"] for row in control}):
        start = control_index[(repo, 2022)]
        end = control_index[(repo, 2026)]
        transitions.append(
            {
                "repo_name": repo,
                "control_domain": start.get("control_domain", ""),
                "language_match_role": start.get("language_match_role", ""),
                "issues_opened_2022": start["issues_opened"],
                "issues_opened_2026": end["issues_opened"],
                "issues_opened_change": end["issues_opened"] - start["issues_opened"],
                "prs_opened_2022": start["prs_opened"],
                "prs_opened_2026": end["prs_opened"],
                "prs_opened_change": end["prs_opened"] - start["prs_opened"],
                "issue_unresolved_share_2022": rounded(value(start, "issue_unresolved_share")),
                "issue_unresolved_share_2026": rounded(value(end, "issue_unresolved_share")),
                "issue_unresolved_share_change": rounded(change(value(end, "issue_unresolved_share"), value(start, "issue_unresolved_share"))),
                "pr_unresolved_share_2022": rounded(value(start, "pr_unresolved_share")),
                "pr_unresolved_share_2026": rounded(value(end, "pr_unresolved_share")),
                "pr_unresolved_share_change": rounded(change(value(end, "pr_unresolved_share"), value(start, "pr_unresolved_share"))),
                "github_merge_flag_share_resolved_2022": rounded(value(start, "github_merge_flag_share_resolved")),
                "github_merge_flag_share_resolved_2026": rounded(value(end, "github_merge_flag_share_resolved")),
                "github_merge_flag_share_resolved_change": rounded(change(value(end, "github_merge_flag_share_resolved"), value(start, "github_merge_flag_share_resolved"))),
            }
        )

    write_csv(args.output, SUMMARY_FIELDS, summaries)
    write_csv(args.transitions, TRANSITION_FIELDS, transitions)
    overall = summaries[0]
    control_2026 = next(row for row in summaries if row["panel"] == "long_lived_benchmark" and row["year"] == 2026)
    pr_increase = sum(float(row["prs_opened_change"]) > 0 for row in transitions)
    unresolved_increase = sum(float(row["pr_unresolved_share_change"]) > 0 for row in transitions if row["pr_unresolved_share_change"] != "")
    merge_flag_decrease = sum(float(row["github_merge_flag_share_resolved_change"]) < 0 for row in transitions if row["github_merge_flag_share_resolved_change"] != "")
    top_by_pr = sorted(top_2026, key=lambda row: row["prs_opened"], reverse=True)
    without_top5 = top_by_pr[5:]
    top5_merge = ratio(without_top5, "prs_merged_by_90d", "prs_closed_by_90d")
    findings = f"""# 固定成熟度：PR 是处理了，还是只是观察时间不够

只看 1—5 月创建的协作项，并在“月末 + 90 天”观察结果。每条线程因此有 90—120 天随访。所有年份使用同一规则，避免把 2026 年尚未成熟的线程误算成 backlog。

## 2026 年 Top 100

- 1—5 月，仓库中位数收到 {overall['issues_opened_median_repo']:.0f} 条 Issue 和 {overall['prs_opened_median_repo']:.0f} 条 PR。
- 固定成熟度时，仓库中位数仍有 {fmt_share(overall['issue_unresolved_share_median_repo'])} 的 Issue 和 {fmt_share(overall['pr_unresolved_share_median_repo'])} 的 PR 未解决。
- 已解决 PR 中，仓库中位数有 {fmt_share(overall['github_merge_flag_share_resolved_median_repo'])} 带 GitHub merged flag；按事件加权是 {fmt_share(overall['github_merge_flag_share_resolved_event_weighted'])}；去掉 PR 流入量最高的五个仓库后是 {fmt_share(top5_merge)}。
- 差异说明结果高度集中，不证明五个大仓库表现更差。PyTorch 等项目可能通过其他工作流落地变更，关闭 PR 但不设置 `merged=true`。

## 长期对照

- 2022 到 2026 年的 1—5 月队列中，{pr_increase}/12 个仓库 PR 流入增加。
- {unresolved_increase}/12 个仓库的 90 天未解决 PR 比例上升；{merge_flag_decrease}/12 个仓库的 resolved-PR merged flag 比例下降。
- 2026 年，对照组未解决 PR 的仓库中位数是 {fmt_share(control_2026['pr_unresolved_share_median_repo'])}，Agentic Top 100 是 {fmt_share(overall['pr_unresolved_share_median_repo'])}。

## 能说什么

PR 流入增加和 gate 压力上升并不是 Agentic AI 新项目独有。这个对照不能识别 AI 的因果作用；它只是阻止我们把所有协作压力都归因给 Agent。
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(findings)


if __name__ == "__main__":
    main()
