#!/usr/bin/env python3
"""Describe outcomes by observed Agent participation without causal language."""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path
from statistics import median
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_INPUT = RESEARCH / "collaboration-thread-analysis-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-agent-outcome-comparisons-2026.csv"
DEFAULT_PAIRED = RESEARCH / "collaboration-agent-outcome-paired-repositories-2026.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-agent-outcome-comparisons-2026-findings.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--paired-output", type=Path, default=DEFAULT_PAIRED)
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


def num(row: dict[str, str], field: str) -> float | None:
    value = row.get(field, "")
    return float(value) if value not in {"", None} else None


def weighted_share(rows: list[dict[str, str]], predicate: Callable[[dict[str, str]], bool]) -> float | None:
    denominator = sum(float(row["sampling_weight"]) for row in rows)
    if denominator <= 0:
        return None
    return sum(float(row["sampling_weight"]) for row in rows if predicate(row)) / denominator


def med(rows: list[dict[str, str]], field: str) -> float | None:
    values = [value for row in rows if (value := num(row, field)) is not None]
    return median(values) if values else None


def clean(value: float | None, digits: int = 4) -> str | float:
    return "" if value is None else round(value, digits)


def summarize(comparison: str, group: str, rows: list[dict[str, str]]) -> dict[str, Any]:
    resolved_prs = [row for row in rows if row["item_type"] == "pull_request" and row["outcome"] != "open"]
    return {
        "comparison": comparison,
        "group": group,
        "threads": len(rows),
        "repositories": len({row["repo_name"] for row in rows}),
        "estimated_population_weight": round(sum(float(row["sampling_weight"]) for row in rows), 2),
        "open_share_weighted": clean(weighted_share(rows, lambda row: row["outcome"] == "open")),
        "github_merge_flag_share_resolved_pr_weighted": clean(
            weighted_share(resolved_prs, lambda row: row["outcome"] == "merged")
        ),
        "median_resolution_days_resolved": clean(med([row for row in rows if row["outcome"] != "open"], "resolution_days"), 2),
        "median_first_maintainer_response_hours": clean(med(rows, "first_maintainer_account_response_hours"), 2),
        "median_visible_response_events": clean(med(rows, "visible_response_events"), 2),
        "median_comments": clean(med(rows, "comments"), 2),
        "median_reviews_pr": clean(med([row for row in rows if row["item_type"] == "pull_request"], "reviews"), 2),
        "median_commits_pr": clean(med([row for row in rows if row["item_type"] == "pull_request"], "commits"), 2),
    }


def main() -> None:
    args = parse_args()
    rows = read_csv(args.input)
    if not rows:
        raise SystemExit("Thread analysis is empty")

    mature = [row for row in rows if row["fixed_maturity_eligible"] == "yes"]
    comparisons = [
        (
            "mature_agent_opener_vs_user_opener",
            mature,
            {
                "agent_opener": lambda row: row["agent_participation_opened_thread"] == "yes",
                "github_user_opener": lambda row: row["opener_class"] == "human_account",
            },
        ),
        (
            "all_agent_visible_vs_not_visible",
            rows,
            {
                "agent_visible": lambda row: row["agent_participation_present"] == "yes",
                "agent_not_visible": lambda row: row["agent_participation_present"] == "no",
            },
        ),
        (
            "pr_agent_review_visible_vs_not_visible",
            [row for row in rows if row["item_type"] == "pull_request"],
            {
                "agent_review_visible": lambda row: row["agent_review_event_present"] == "yes",
                "agent_review_not_visible": lambda row: row["agent_review_event_present"] == "no",
            },
        ),
    ]
    output: list[dict[str, Any]] = []
    for comparison, frame, groups in comparisons:
        for label, predicate in groups.items():
            output.append(summarize(comparison, label, [row for row in frame if predicate(row)]))
    write_csv(args.output, output)

    paired_rows: list[dict[str, Any]] = []
    by_repo: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in mature:
        by_repo[row["repo_name"]].append(row)
    for repo, values in by_repo.items():
        agent = [row for row in values if row["agent_participation_opened_thread"] == "yes"]
        user = [row for row in values if row["opener_class"] == "human_account"]
        if not agent or not user:
            continue
        agent_open = sum(row["outcome"] == "open" for row in agent) / len(agent)
        user_open = sum(row["outcome"] == "open" for row in user) / len(user)
        paired_rows.append(
            {
                "repo_name": repo,
                "agent_opener_threads": len(agent),
                "github_user_opener_threads": len(user),
                "agent_opener_open_share": round(agent_open, 4),
                "github_user_opener_open_share": round(user_open, 4),
                "open_share_difference_agent_minus_user": round(agent_open - user_open, 4),
                "agent_opener_median_resolution_days": clean(med([row for row in agent if row["outcome"] != "open"], "resolution_days"), 2),
                "github_user_opener_median_resolution_days": clean(med([row for row in user if row["outcome"] != "open"], "resolution_days"), 2),
            }
        )
    write_csv(args.paired_output, paired_rows)

    paired_differences = [float(row["open_share_difference_agent_minus_user"]) for row in paired_rows]
    findings = f"""# 可见 Agent 参与和线程结果的比较

状态：只做描述。Agent 不是随机进入线程的，也可能在任务变难以后才被引入。

- 获得足够观察期的样本中，有 {sum(row['agent_participation_opened_thread'] == 'yes' for row in mature)} 条由可确认 Agent 身份或 App 代理行为发起，{sum(row['opener_class'] == 'human_account' for row in mature)} 条由 GitHub `User` 发起。两类身份在 actor registry 中分开保存。
- 概率样本中有 {len(paired_rows)} 个仓库同时出现两类发起者。
- 在仓库内部比较，Agent 发起减去 GitHub User 发起的 open share 差值中位数是 {clean(median(paired_differences) if paired_differences else None, 4)}。

这些数据可以看 Agent 参与集中在哪里，是否同时伴随更多 review 或更慢处理；不能证明效率效果。要做因果估计，需要随机分配、可信的 adoption 断点，或者比当前公开轨迹更强的前趋势和选择控制。
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(f"Wrote {len(output)} comparison rows and {len(paired_rows)} paired repositories")


if __name__ == "__main__":
    main()
