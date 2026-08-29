#!/usr/bin/env python3
"""Compare Agent marker adoption and collaboration patterns across repository strata."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
THREADS = RESEARCH / "collaboration-thread-analysis-2026.csv"
MARKERS = RESEARCH / "collaboration-agent-markers-260531-260829-summary.csv"
OUTPUT = RESEARCH / "collaboration-strata-comparison-2026.csv"
TESTS = RESEARCH / "collaboration-strata-tests-2026.csv"
FINDINGS = RESEARCH / "collaboration-strata-findings.md"

SEED = 260912
BOOTSTRAPS = 4000
PERMUTATIONS = 10000

DIMENSIONS = {
    "llm_identity": "llm_native_manual",
    "technical_area": "collaboration_niche",
}

# Each thread metric is reduced to one share per repository before group tests.
# This keeps a high-volume repository from creating fake statistical precision.
THREAD_METRICS = {
    "agent_participation": ("Agent 参与线程", "agent_participation_present", "all"),
    "agent_opened_thread": ("Agent 发起线程", "agent_participation_opened_thread", "all"),
    "agent_response": ("Agent 参与回复", "agent_participation_response_present", "all"),
    "human_conversation": ("有人类账号参与对话", "human_account_present_in_conversation", "all"),
    "maintainer_present": ("维护者账号参与", "maintainer_account_present", "all"),
    "automation_only_response": ("回复只有自动化账号", "response_only_automation", "all"),
    "external_pr": ("外部贡献者发起 PR", "external_author", "pr"),
    "agent_review": ("Agent 参与 review", "agent_review_event_present", "pr"),
    "human_review": ("人类账号参与 review", "human_account_review_event_present", "pr"),
    "visible_review": ("存在可见 review", "review_observed", "pr"),
    "post_review_commit": ("review 后继续提交", "post_review_commit_observed", "reviewed_pr"),
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def yes(value: str) -> float:
    return 1.0 if value == "yes" else 0.0


def eligible(row: dict[str, str], scope: str) -> bool:
    if scope == "all":
        return True
    if scope == "pr":
        return row["item_type"] == "pull_request"
    if scope == "reviewed_pr":
        return row["item_type"] == "pull_request" and row["review_observed"] == "yes"
    raise ValueError(scope)


def bootstrap_ci(values: list[float], rng: np.random.Generator) -> tuple[float, float]:
    array = np.asarray(values, dtype=float)
    if len(array) == 1:
        return float(array[0]), float(array[0])
    draws = rng.choice(array, size=(BOOTSTRAPS, len(array)), replace=True).mean(axis=1)
    return tuple(float(x) for x in np.quantile(draws, [0.025, 0.975]))


def permutation_p(values: np.ndarray, labels: np.ndarray, rng: np.random.Generator) -> float:
    overall = float(values.mean())

    def between(group_labels: np.ndarray) -> float:
        score = 0.0
        for label in np.unique(group_labels):
            group = values[group_labels == label]
            score += len(group) * float((group.mean() - overall) ** 2)
        return score

    observed = between(labels)
    exceed = 0
    for _ in range(PERMUTATIONS):
        if between(rng.permutation(labels)) >= observed - 1e-15:
            exceed += 1
    return (exceed + 1) / (PERMUTATIONS + 1)


def bh_adjust(rows: list[dict[str, object]]) -> None:
    by_dimension: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        by_dimension[str(row["dimension"])].append(row)
    for dimension_rows in by_dimension.values():
        ordered = sorted(dimension_rows, key=lambda row: float(row["p_value"]))
        count = len(ordered)
        running = 1.0
        for index in range(count - 1, -1, -1):
            rank = index + 1
            adjusted = min(running, float(ordered[index]["p_value"]) * count / rank)
            ordered[index]["q_value_bh"] = round(adjusted, 6)
            ordered[index]["significant_q05"] = "yes" if adjusted < 0.05 else "no"
            running = adjusted


def main() -> None:
    rng = np.random.default_rng(SEED)
    sample = read_csv(SAMPLE)
    threads = read_csv(THREADS)
    markers = read_csv(MARKERS)
    sample_by_repo = {row["repo_name"]: row for row in sample}
    if len(sample_by_repo) != 100:
        raise SystemExit(f"Expected 100 repositories, found {len(sample_by_repo)}")

    latest_marker: dict[str, dict[str, str]] = {}
    for row in markers:
        repo = row["repo_name"]
        if repo not in latest_marker or row["snapshot_date"] > latest_marker[repo]["snapshot_date"]:
            latest_marker[repo] = row

    repo_values: dict[str, dict[str, float]] = defaultdict(dict)
    for repo in sample_by_repo:
        marker = latest_marker.get(repo, {})
        repo_values[repo]["agent_marker_instruction"] = yes(marker.get("has_active_instruction", "no"))
        repo_values[repo]["agent_marker_any"] = yes(marker.get("has_any_active_marker", "no"))

    threads_by_repo: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in threads:
        threads_by_repo[row["repo_name"]].append(row)
    for repo in sample_by_repo:
        if len(threads_by_repo[repo]) != 20:
            raise SystemExit(f"{repo} has {len(threads_by_repo[repo])} analyzed threads; expected 20")
        for metric, (_, field, scope) in THREAD_METRICS.items():
            rows = [row for row in threads_by_repo[repo] if eligible(row, scope)]
            repo_values[repo][metric] = float(np.mean([yes(row[field]) for row in rows])) if rows else float("nan")

    metric_labels = {
        "agent_marker_instruction": "仓库存在 Agent 指令文件",
        "agent_marker_any": "仓库存在任一活跃 Agent marker",
        **{key: label for key, (label, _, _) in THREAD_METRICS.items()},
    }

    comparison_rows: list[dict[str, object]] = []
    test_rows: list[dict[str, object]] = []
    for dimension, field in DIMENSIONS.items():
        groups = sorted({row[field] for row in sample})
        for metric, label in metric_labels.items():
            valid = [repo for repo in sample_by_repo if not np.isnan(repo_values[repo][metric])]
            values = np.asarray([repo_values[repo][metric] for repo in valid], dtype=float)
            labels = np.asarray([sample_by_repo[repo][field] for repo in valid], dtype=object)
            group_means: dict[str, float] = {}
            for group in groups:
                group_values = [repo_values[repo][metric] for repo in valid if sample_by_repo[repo][field] == group]
                if not group_values:
                    continue
                low, high = bootstrap_ci(group_values, rng)
                estimate = float(np.mean(group_values))
                group_means[group] = estimate
                comparison_rows.append(
                    {
                        "dimension": dimension,
                        "group": group,
                        "metric": metric,
                        "metric_label_zh": label,
                        "repositories": len(group_values),
                        "estimate_repo_equal": round(estimate, 6),
                        "ci_low_95": round(low, 6),
                        "ci_high_95": round(high, 6),
                        "unit": "repository-level share",
                    }
                )
            p_value = permutation_p(values, labels, rng)
            min_group = min(group_means, key=group_means.get)
            max_group = max(group_means, key=group_means.get)
            test_rows.append(
                {
                    "dimension": dimension,
                    "metric": metric,
                    "metric_label_zh": label,
                    "repositories": len(valid),
                    "min_group": min_group,
                    "min_estimate": round(group_means[min_group], 6),
                    "max_group": max_group,
                    "max_estimate": round(group_means[max_group], 6),
                    "max_minus_min_pp": round((group_means[max_group] - group_means[min_group]) * 100, 2),
                    "p_value": round(p_value, 6),
                    "q_value_bh": "",
                    "significant_q05": "",
                    "test": f"repository-level label permutation, {PERMUTATIONS} permutations",
                }
            )
    bh_adjust(test_rows)
    write_csv(OUTPUT, comparison_rows)
    write_csv(TESTS, test_rows)

    significant = [row for row in test_rows if row["significant_q05"] == "yes"]
    strongest = sorted(test_rows, key=lambda row: float(row["q_value_bh"]))[:8]
    lines = [
        "# 不同类型仓库的 Agent marker 与协作模式比较",
        "",
        "这里先把每个仓库的 20 条线程压成一个仓库级比例，再比较仓库类型。这样做是为了避免 PyTorch 一类大仓库因为线程总量大，就在统计上拥有几十倍于小仓库的话语权。",
        "",
        "## 先说结论",
        "",
    ]
    if significant:
        lines.append(f"在同时检验的 {len(test_rows)} 个比较中，经过多重比较修正后，{len(significant)} 个差异仍达到 q < 0.05。最值得继续解释的不是单个百分比，而是这些差异是否在更深的 10 仓库时间线研究中仍然成立。")
    else:
        lines.append(f"在同时检验的 {len(test_rows)} 个比较中，经过多重比较修正后，没有差异达到 q < 0.05。现有样本可以描述方向，但不能把类型差异说成已被统计确认。")
    lines.extend(["", "## 目前信号最强的差异", ""])
    for row in strongest:
        lines.append(
            f"- **{row['metric_label_zh']} / {row['dimension']}**：{row['min_group']} 为 {float(row['min_estimate']):.1%}，{row['max_group']} 为 {float(row['max_estimate']):.1%}，相差 {row['max_minus_min_pp']} 个百分点；p={float(row['p_value']):.4f}，BH 校正后 q={float(row['q_value_bh']):.4f}。"
        )
    lines.extend(
        [
            "",
            "## 怎么理解",
            "",
            "- `Agent marker` 只说明仓库公开了供 Agent 使用的指令或配置，不等于这些 Agent 已经在 Issue、PR 中实际工作。",
            "- `Agent 参与线程` 来自公开可识别的 Bot、GitHub App 或明确的 Agent 账号。开发者私下使用 Cursor、Claude Code、Codex 后仍以普通账号提交，GitHub 公共数据看不出来，因此这是可见参与率的下界。",
            "- 显著性检验以仓库为独立单位，并在每个比较维度内做 Benjamini-Hochberg 修正。它能减少把随机波动说成结论的风险，但不能替代因果识别。",
            "- mixed 组只有 14 个仓库，部分技术领域更小。方向性差异需要由 10 个代表仓库的阶段对比继续验证。",
            "",
        ]
    )
    FINDINGS.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(comparison_rows)} group estimates and {len(test_rows)} tests; {len(significant)} significant after BH correction")


if __name__ == "__main__":
    main()
