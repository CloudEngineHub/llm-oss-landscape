#!/usr/bin/env python3
"""Analyze within-repository collaboration changes for the ten deep cases."""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from itertools import product
from pathlib import Path
from statistics import median
from typing import Callable

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
INPUT = RESEARCH / "collaboration-deep-thread-analysis-2026.csv"
MANIFEST = RESEARCH / "collaboration-deep-repositories-2026.csv"
OUTPUT = RESEARCH / "collaboration-deep-stage-metrics-2026.csv"
CHANGES = RESEARCH / "collaboration-deep-stage-changes-2026.csv"
FINDINGS = RESEARCH / "collaboration-deep-stage-findings.md"
CUTOFF = datetime(2026, 8, 29, 23, 59, 59, tzinfo=timezone.utc)

STAGE_ORDER = ["launch_120d", "previous_2025q4", "current_2026m5_m8"]
LABELS = {
    "launch_120d": "创建后 120 天",
    "previous_2025q4": "2025 年最后四个月",
    "current_2026m5_m8": "2026 年最近四个月",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def yes(row: dict[str, str], field: str) -> float:
    return 1.0 if row.get(field) == "yes" else 0.0


def parse_time(value: str) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def share(rows: list[dict[str, str]], field: str, predicate: Callable[[dict[str, str]], bool] = lambda _: True) -> float:
    eligible = [row for row in rows if predicate(row)]
    return float(np.mean([yes(row, field) for row in eligible])) if eligible else float("nan")


def within_30d(row: dict[str, str], event_field: str) -> float:
    created = parse_time(row.get("created_at", ""))
    event = parse_time(row.get(event_field, ""))
    if not created or CUTOFF - created < timedelta(days=30):
        return float("nan")
    return float(bool(event and (event - created).total_seconds() <= 30 * 86400))


def nanmean(values: list[float]) -> float:
    present = [value for value in values if not np.isnan(value)]
    return float(np.mean(present)) if present else float("nan")


def median_field(rows: list[dict[str, str]], field: str) -> float:
    values = [float(row[field]) for row in rows if row.get(field) not in {"", None}]
    return float(median(values)) if values else float("nan")


def sign_flip_p(differences: list[float]) -> float:
    values = np.asarray([value for value in differences if not np.isnan(value)], dtype=float)
    if len(values) == 0:
        return float("nan")
    observed = abs(float(values.mean()))
    exceed = 0
    total = 0
    for signs in product((-1.0, 1.0), repeat=len(values)):
        total += 1
        if abs(float(np.mean(values * np.asarray(signs)))) >= observed - 1e-15:
            exceed += 1
    return exceed / total


def bh_adjust(rows: list[dict[str, object]]) -> None:
    valid = [row for row in rows if not np.isnan(float(row["p_value_exact_sign_flip"]))]
    ordered = sorted(valid, key=lambda row: float(row["p_value_exact_sign_flip"]))
    running = 1.0
    count = len(ordered)
    for index in range(count - 1, -1, -1):
        rank = index + 1
        adjusted = min(running, float(ordered[index]["p_value_exact_sign_flip"]) * count / rank)
        ordered[index]["q_value_bh"] = round(adjusted, 6)
        ordered[index]["significant_q05"] = "yes" if adjusted < 0.05 else "no"
        running = adjusted


def main() -> None:
    rows = read_csv(INPUT)
    manifest = {row["repo_name"]: row for row in read_csv(MANIFEST)}
    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[(row["repo_name"], row["study_stage"])].append(row)
    if len(grouped) != 30 or any(len(value) != 30 for value in grouped.values()):
        raise SystemExit("Expected 10 repositories x 3 stages x 30 threads")

    metric_definitions = {
        "agent_participation_share": lambda r: share(r, "agent_participation_present"),
        "agent_response_share": lambda r: share(r, "agent_participation_response_present"),
        "human_conversation_share": lambda r: share(r, "human_account_present_in_conversation"),
        "maintainer_present_share": lambda r: share(r, "maintainer_account_present"),
        "automation_only_response_share": lambda r: share(r, "response_only_automation"),
        "external_pr_share": lambda r: share(r, "external_author", lambda x: x["item_type"] == "pull_request"),
        "visible_review_share": lambda r: share(r, "review_observed", lambda x: x["item_type"] == "pull_request"),
        "human_review_share": lambda r: share(r, "human_account_review_event_present", lambda x: x["item_type"] == "pull_request"),
        "agent_review_share": lambda r: share(r, "agent_review_event_present", lambda x: x["item_type"] == "pull_request"),
        "post_review_commit_share": lambda r: share(r, "post_review_commit_observed", lambda x: x["item_type"] == "pull_request" and x["review_observed"] == "yes"),
        "resolved_within_30d_share": lambda r: nanmean([within_30d(x, "closed_at") for x in r]),
        "pr_merged_within_30d_share": lambda r: nanmean([within_30d(x, "merged_at") for x in r if x["item_type"] == "pull_request"]),
        "median_first_human_response_hours": lambda r: median_field(r, "first_human_account_response_hours"),
        "median_first_maintainer_response_hours": lambda r: median_field(r, "first_maintainer_account_response_hours"),
    }
    labels = {
        "agent_participation_share": "Agent 参与线程",
        "agent_response_share": "Agent 参与回复",
        "human_conversation_share": "人类账号参与对话",
        "maintainer_present_share": "维护者账号参与",
        "automation_only_response_share": "回复只有自动化账号",
        "external_pr_share": "外部贡献者发起 PR",
        "visible_review_share": "存在可见 review",
        "human_review_share": "人类账号参与 review",
        "agent_review_share": "Agent 参与 review",
        "post_review_commit_share": "review 后继续提交",
        "resolved_within_30d_share": "30 天内关闭 Issue/PR",
        "pr_merged_within_30d_share": "30 天内合入 PR",
        "median_first_human_response_hours": "首次人类回复中位小时数",
        "median_first_maintainer_response_hours": "首次维护者回复中位小时数",
    }

    metric_rows: list[dict[str, object]] = []
    values_by_repo_stage: dict[tuple[str, str], dict[str, float]] = {}
    for (repo, stage), stage_rows in grouped.items():
        values = {metric: fn(stage_rows) for metric, fn in metric_definitions.items()}
        values_by_repo_stage[(repo, stage)] = values
        metric_rows.append(
            {
                "deep_rank": manifest[repo]["deep_rank"],
                "repo_name": repo,
                "llm_native_manual": manifest[repo]["llm_native_manual"],
                "collaboration_niche": manifest[repo]["collaboration_niche"],
                "study_stage": stage,
                "stage_label_zh": LABELS[stage],
                "threads": len(stage_rows),
                "issues": sum(row["item_type"] == "issue" for row in stage_rows),
                "pull_requests": sum(row["item_type"] == "pull_request" for row in stage_rows),
                **{metric: "" if np.isnan(value) else round(value, 6) for metric, value in values.items()},
            }
        )
    metric_rows.sort(key=lambda row: (int(row["deep_rank"]), STAGE_ORDER.index(str(row["study_stage"]))))
    write_csv(OUTPUT, metric_rows)

    change_rows: list[dict[str, object]] = []
    repos = sorted(manifest, key=lambda repo: int(manifest[repo]["deep_rank"]))
    for metric, label in labels.items():
        previous = [values_by_repo_stage[(repo, "previous_2025q4")][metric] for repo in repos]
        current = [values_by_repo_stage[(repo, "current_2026m5_m8")][metric] for repo in repos]
        differences = [right - left for left, right in zip(previous, current) if not np.isnan(left) and not np.isnan(right)]
        change_rows.append(
            {
                "metric": metric,
                "metric_label_zh": label,
                "paired_repositories": len(differences),
                "previous_repo_equal_mean": round(nanmean(previous), 6),
                "current_repo_equal_mean": round(nanmean(current), 6),
                "current_minus_previous": round(float(np.mean(differences)), 6) if differences else "",
                "repositories_increased": sum(value > 0 for value in differences),
                "repositories_decreased": sum(value < 0 for value in differences),
                "repositories_unchanged": sum(value == 0 for value in differences),
                "p_value_exact_sign_flip": round(sign_flip_p(differences), 6),
                "q_value_bh": "",
                "significant_q05": "",
            }
        )
    bh_adjust(change_rows)
    write_csv(CHANGES, change_rows)

    strongest = sorted(change_rows, key=lambda row: abs(float(row["current_minus_previous"] or 0)), reverse=True)
    significant = [row for row in change_rows if row["significant_q05"] == "yes"]
    lines = [
        "# 10 个代表仓库：协作方式如何随项目阶段变化",
        "",
        "这不是再做一遍 100 仓库的平均数。这里选了 10 个差异明显的仓库，每个仓库分别抽取创建后 120 天、2025 年最后四个月和 2026 年最近四个月的 30 条 Issue / PR，然后读取完整公开时间线。",
        "",
        "## 先说结论",
        "",
    ]
    if significant:
        lines.append(f"从 2025 年最后四个月到 2026 年最近四个月，{len(significant)} 项指标在仓库内配对比较并经过多重比较修正后仍达到 q < 0.05。")
    else:
        lines.append("从 2025 年最后四个月到 2026 年最近四个月，没有一项指标在 10 个仓库的配对比较并经过多重比较修正后达到 q < 0.05。能看到方向，但还不能把短期变化说成普遍规律。")
    lines.extend(["", "## 变化最大的指标", ""])
    for row in strongest[:8]:
        metric = str(row["metric"])
        is_hours = metric.startswith("median_")
        previous = float(row["previous_repo_equal_mean"])
        current = float(row["current_repo_equal_mean"])
        if is_hours:
            value_text = f"{previous:.1f} 小时 → {current:.1f} 小时"
        else:
            value_text = f"{previous:.1%} → {current:.1%}"
        lines.append(
            f"- **{row['metric_label_zh']}**：{value_text}；{row['repositories_increased']} 个仓库上升、{row['repositories_decreased']} 个下降；p={float(row['p_value_exact_sign_flip']):.4f}，q={float(row['q_value_bh']):.4f}。"
        )
    def pct(repo: str, stage: str, metric: str) -> str:
        return f"{values_by_repo_stage[(repo, stage)][metric]:.1%}"

    lines.extend(["", "## 仓库之间不是同一种变化", ""])
    lines.append(
        f"- **LangChain**：可见 Agent 参与从 {pct('langchain-ai/langchain', 'previous_2025q4', 'agent_participation_share')} 升到 {pct('langchain-ai/langchain', 'current_2026m5_m8', 'agent_participation_share')}；维护者账号参与从 {pct('langchain-ai/langchain', 'previous_2025q4', 'maintainer_present_share')} 降到 {pct('langchain-ai/langchain', 'current_2026m5_m8', 'maintainer_present_share')}。这是值得逐条读线程的高优先级案例，但 30 条样本不能直接解释成 Agent 替代维护者。"
    )
    lines.append(
        f"- **Coder**：可见 Agent 参与从 {pct('coder/coder', 'previous_2025q4', 'agent_participation_share')} 升到 {pct('coder/coder', 'current_2026m5_m8', 'agent_participation_share')}；30 天内合入 PR 反而从 {pct('coder/coder', 'previous_2025q4', 'pr_merged_within_30d_share')} 升到 {pct('coder/coder', 'current_2026m5_m8', 'pr_merged_within_30d_share')}。它是“Agent 增多不必然拖慢合入”的反例。"
    )
    lines.append(
        f"- **PyTorch**：可见 Agent 参与从 {pct('pytorch/pytorch', 'previous_2025q4', 'agent_participation_share')} 升到 {pct('pytorch/pytorch', 'current_2026m5_m8', 'agent_participation_share')}；维护者参与保持在 {pct('pytorch/pytorch', 'current_2026m5_m8', 'maintainer_present_share')}。传统治理并没有因为 Agent 出现就自动撤掉人的 gate。"
    )
    lines.append(
        f"- **Claude Code**：两个近期阶段的概率样本都没有抽到 PR，因此不能估计 review 或合入变化；Issue 中只有自动化账号回复的比例从 {pct('anthropics/claude-code', 'previous_2025q4', 'automation_only_response_share')} 降到 {pct('anthropics/claude-code', 'current_2026m5_m8', 'automation_only_response_share')}。这里应把“公开协作面如何设计”作为案例问题，而不是硬算一个 PR 效率。"
    )
    lines.extend(
        [
            "",
            "## 这轮实验能回答什么",
            "",
            "- 它能看同一个仓库在不同阶段是否改变了回复、review、维护者介入和 Agent 可见参与方式。",
            "- `30 天内关闭` 和 `30 天内合入` 只使用已经获得完整 30 天观察期的线程，避免把 2026 年 8 月刚创建的线程误判为 backlog。",
            "- 它仍然不能识别普通开发者账号背后的未披露 AI 使用，也不能把时间上的同时变化直接解释成 Agent 导致的变化。",
            "- 每个仓库每阶段 30 条适合找模式和反例，不适合对单个仓库给出精确排名。需要回到具体线程逐案解释时，应从这张概率样本继续做案例编码。",
            "",
        ]
    )
    FINDINGS.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(metric_rows)} repository-stage rows and {len(change_rows)} paired comparisons")


if __name__ == "__main__":
    main()
