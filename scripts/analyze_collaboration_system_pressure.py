#!/usr/bin/env python3
"""Synthesize full-population queue pressure, outcomes, and contributor concentration."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_FLOW = RESEARCH / "collaboration-top100-flow-2024-2026.csv"
DEFAULT_MATURITY = RESEARCH / "collaboration-top100-fixed-90d-cohorts-2024-2026.csv"
DEFAULT_PUSH = RESEARCH / "collaboration-push-concentration-repositories-2024-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-system-pressure-summary-2024-2026.csv"
DEFAULT_REPOSITORIES = RESEARCH / "collaboration-system-pressure-repositories-2024-2026.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-system-pressure-findings.md"
DEFAULT_VALIDATION = RESEARCH / "collaboration-system-pressure-validation.json"
YEARS = (2024, 2025, 2026)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--flow", type=Path, default=DEFAULT_FLOW)
    parser.add_argument("--maturity", type=Path, default=DEFAULT_MATURITY)
    parser.add_argument("--push", type=Path, default=DEFAULT_PUSH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--repositories", type=Path, default=DEFAULT_REPOSITORIES)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    parser.add_argument("--validation", type=Path, default=DEFAULT_VALIDATION)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def integer(row: dict[str, Any], field: str) -> int:
    return int(float(row.get(field) or 0))


def ratio(numerator: int, denominator: int) -> float | str:
    return round(numerator / denominator, 6) if denominator else ""


def aggregate_maturity(rows: list[dict[str, str]]) -> dict[tuple[str, int], Counter[str]]:
    output: dict[tuple[str, int], Counter[str]] = defaultdict(Counter)
    fields = (
        "issues_opened", "issues_closed_by_90d", "issues_unresolved_at_90d",
        "prs_opened", "prs_closed_by_90d", "prs_merged_by_90d",
        "prs_closed_unmerged_by_90d", "prs_unresolved_at_90d",
    )
    for row in rows:
        target = output[(row["repo_name"], int(row["year"]))]
        for field in fields:
            target[field] += integer(row, field)
    return output


def matched_repositories(maturity: dict[tuple[str, int], Counter[str]]) -> set[str]:
    repositories = {repo for repo, _ in maturity}
    return {
        repo
        for repo in repositories
        if all(
            maturity[(repo, year)]["issues_opened"] + maturity[(repo, year)]["prs_opened"] > 0
            for year in YEARS
        )
    }


def summarize_flow(rows: list[dict[str, str]], panel: str, scope: str, scope_value: str) -> list[dict[str, Any]]:
    output = []
    for year in YEARS:
        subset = [row for row in rows if int(row["year"]) == year]
        issue_opened = sum(integer(row, "issues_opened") for row in subset)
        issue_closed = sum(integer(row, "issues_closed_during_window") for row in subset)
        pr_opened = sum(integer(row, "prs_opened") for row in subset)
        pr_closed = sum(integer(row, "prs_closed_during_window") for row in subset)
        issue_balance_shares = [
            integer(row, "issue_flow_balance") / integer(row, "issues_opened")
            for row in subset if integer(row, "issues_opened")
        ]
        pr_balance_shares = [
            integer(row, "pr_flow_balance") / integer(row, "prs_opened")
            for row in subset if integer(row, "prs_opened")
        ]
        output.append(
            {
                "section": "queue_flow",
                "panel": panel,
                "scope": scope,
                "scope_value": scope_value,
                "year": year,
                "repositories": len(subset),
                "issues_opened": issue_opened,
                "issues_closed": issue_closed,
                "issues_open_at_cutoff": sum(integer(row, "currently_open_issues_from_vintage") for row in subset),
                "issue_flow_balance": issue_opened - issue_closed,
                "issue_flow_balance_share": ratio(issue_opened - issue_closed, issue_opened),
                "repositories_with_positive_issue_balance": sum(integer(row, "issue_flow_balance") > 0 for row in subset),
                "repo_median_issue_flow_balance_share": round(statistics.median(issue_balance_shares), 6) if issue_balance_shares else "",
                "prs_opened": pr_opened,
                "prs_closed": pr_closed,
                "prs_open_at_cutoff": sum(integer(row, "currently_open_prs_from_vintage") for row in subset),
                "prs_merged": sum(integer(row, "prs_merged_during_window") for row in subset),
                "pr_flow_balance": pr_opened - pr_closed,
                "pr_flow_balance_share": ratio(pr_opened - pr_closed, pr_opened),
                "repositories_with_positive_pr_balance": sum(integer(row, "pr_flow_balance") > 0 for row in subset),
                "repo_median_pr_flow_balance_share": round(statistics.median(pr_balance_shares), 6) if pr_balance_shares else "",
                "issue_unresolved_90d_share": "",
                "pr_unresolved_90d_share": "",
                "pr_merged_90d_share": "",
                "repo_median_pr_merged_90d_share": "",
                "repo_median_issue_unresolved_90d_share": "",
                "repo_median_pr_unresolved_90d_share": "",
                "median_push_actors": "",
                "median_actors_for_50pct_pushes": "",
                "median_top_5_actor_share": "",
            }
        )
    return output


def summarize_maturity(
    aggregate: dict[tuple[str, int], Counter[str]], repositories: set[str], panel: str,
    scope: str = "all", scope_value: str = "all",
) -> list[dict[str, Any]]:
    output = []
    for year in YEARS:
        values = [aggregate[(repo, year)] for repo in sorted(repositories)]
        issue_opened = sum(value["issues_opened"] for value in values)
        pr_opened = sum(value["prs_opened"] for value in values)
        repo_merge_shares = [value["prs_merged_by_90d"] / value["prs_opened"] for value in values if value["prs_opened"]]
        repo_issue_open_shares = [value["issues_unresolved_at_90d"] / value["issues_opened"] for value in values if value["issues_opened"]]
        repo_pr_open_shares = [value["prs_unresolved_at_90d"] / value["prs_opened"] for value in values if value["prs_opened"]]
        output.append(
            {
                "section": "fixed_90d_outcome",
                "panel": panel,
                "scope": scope,
                "scope_value": scope_value,
                "year": year,
                "repositories": len(values),
                "issues_opened": issue_opened,
                "issues_closed": sum(value["issues_closed_by_90d"] for value in values),
                "issues_open_at_cutoff": "",
                "issue_flow_balance": "",
                "issue_flow_balance_share": "",
                "repositories_with_positive_issue_balance": "",
                "repo_median_issue_flow_balance_share": "",
                "prs_opened": pr_opened,
                "prs_closed": sum(value["prs_closed_by_90d"] for value in values),
                "prs_open_at_cutoff": "",
                "prs_merged": sum(value["prs_merged_by_90d"] for value in values),
                "pr_flow_balance": "",
                "pr_flow_balance_share": "",
                "repositories_with_positive_pr_balance": "",
                "repo_median_pr_flow_balance_share": "",
                "issue_unresolved_90d_share": ratio(sum(value["issues_unresolved_at_90d"] for value in values), issue_opened),
                "pr_unresolved_90d_share": ratio(sum(value["prs_unresolved_at_90d"] for value in values), pr_opened),
                "pr_merged_90d_share": ratio(sum(value["prs_merged_by_90d"] for value in values), pr_opened),
                "repo_median_pr_merged_90d_share": round(statistics.median(repo_merge_shares), 6) if repo_merge_shares else "",
                "repo_median_issue_unresolved_90d_share": round(statistics.median(repo_issue_open_shares), 6) if repo_issue_open_shares else "",
                "repo_median_pr_unresolved_90d_share": round(statistics.median(repo_pr_open_shares), 6) if repo_pr_open_shares else "",
                "median_push_actors": "",
                "median_actors_for_50pct_pushes": "",
                "median_top_5_actor_share": "",
            }
        )
    return output


def summarize_push(rows: list[dict[str, str]], matched: set[str]) -> list[dict[str, Any]]:
    output = []
    cohorts = sorted({row["cohort"] for row in rows})
    for cohort in cohorts:
        for year in YEARS:
            subset = [
                row for row in rows
                if row["cohort"] == cohort and int(row["year"]) == year and integer(row, "push_events") > 0
            ]
            panel = "current_benchmark"
            if cohort == "Agentic AI Top 100":
                subset = [row for row in subset if row["repo_name"] in matched]
                panel = "matched_top100"
            output.append(
                {
                    "section": "push_concentration",
                    "panel": panel,
                    "scope": "cohort",
                    "scope_value": cohort,
                    "year": year,
                    "repositories": len(subset),
                    "issues_opened": "", "issues_closed": "", "issue_flow_balance": "", "issue_flow_balance_share": "",
                    "issues_open_at_cutoff": "",
                    "repositories_with_positive_issue_balance": "", "repo_median_issue_flow_balance_share": "",
                    "prs_opened": "", "prs_closed": "", "prs_open_at_cutoff": "", "prs_merged": "", "pr_flow_balance": "", "pr_flow_balance_share": "",
                    "repositories_with_positive_pr_balance": "", "repo_median_pr_flow_balance_share": "",
                    "issue_unresolved_90d_share": "", "pr_unresolved_90d_share": "", "pr_merged_90d_share": "",
                    "repo_median_pr_merged_90d_share": "",
                    "repo_median_issue_unresolved_90d_share": "", "repo_median_pr_unresolved_90d_share": "",
                    "median_push_actors": round(statistics.median(integer(row, "push_actors") for row in subset), 2) if subset else "",
                    "median_actors_for_50pct_pushes": round(statistics.median(integer(row, "actors_for_50pct_pushes") for row in subset), 2) if subset else "",
                    "median_top_5_actor_share": round(statistics.median(float(row["top_5_actor_share"]) for row in subset), 6) if subset else "",
                }
            )
    return output


def main() -> None:
    args = parse_args()
    flow = read_csv(args.flow)
    maturity_rows = read_csv(args.maturity)
    push = read_csv(args.push)
    if len(flow) != 300 or len(maturity_rows) != 1500:
        raise SystemExit(f"Unexpected panel sizes: flow={len(flow)}, maturity={len(maturity_rows)}")
    maturity = aggregate_maturity(maturity_rows)
    matched = matched_repositories(maturity)
    if not matched:
        raise SystemExit("Matched repository panel is empty")
    current = [row for row in flow if int(row["year"]) == 2026]
    matched_flow = [row for row in flow if row["repo_name"] in matched]
    summary: list[dict[str, Any]] = []
    summary.extend(summarize_flow(flow, "current_top100", "all", "all"))
    summary.extend(summarize_flow(matched_flow, "matched_top100", "all", "all"))
    for niche in sorted({row["collaboration_niche"] for row in current}):
        niche_rows = [row for row in current if row["collaboration_niche"] == niche]
        summary.extend(summarize_flow(niche_rows, "current_top100", "technical_role", niche))
    all_repositories = {repo for repo, _ in maturity}
    summary.extend(summarize_maturity(maturity, matched, "matched_top100"))
    summary.extend(summarize_maturity(maturity, all_repositories, "current_top100"))
    current_role = {row["repo_name"]: row["collaboration_niche"] for row in current}
    for niche in sorted(set(current_role.values())):
        repositories = {repo for repo, role in current_role.items() if role == niche}
        summary.extend(
            summarize_maturity(
                maturity, repositories, "current_top100", "technical_role", niche
            )
        )
    summary.extend(summarize_push(push, matched))
    write_csv(args.output, summary)

    repository_rows: list[dict[str, Any]] = []
    flow_index = {(row["repo_name"], int(row["year"])): row for row in flow}
    push_index = {(row["repo_name"], int(row["year"])): row for row in push if row["cohort"] == "Agentic AI Top 100"}
    for repo in sorted({row["repo_name"] for row in flow}):
        for year in YEARS:
            flow_row = flow_index[(repo, year)]
            mature = maturity[(repo, year)]
            push_row = push_index.get((repo, year), {})
            repository_rows.append(
                {
                    "repo_name": repo,
                    "year": year,
                    "matched_historical_panel": "yes" if repo in matched else "no",
                    "collaboration_niche": flow_row["collaboration_niche"],
                    "issues_opened": integer(flow_row, "issues_opened"),
                    "issues_closed_during_window": integer(flow_row, "issues_closed_during_window"),
                    "issues_open_at_cutoff": integer(flow_row, "currently_open_issues_from_vintage"),
                    "issue_flow_balance": integer(flow_row, "issue_flow_balance"),
                    "prs_opened": integer(flow_row, "prs_opened"),
                    "prs_closed_during_window": integer(flow_row, "prs_closed_during_window"),
                    "prs_open_at_cutoff": integer(flow_row, "currently_open_prs_from_vintage"),
                    "pr_flow_balance": integer(flow_row, "pr_flow_balance"),
                    "issue_unresolved_90d_share": ratio(mature["issues_unresolved_at_90d"], mature["issues_opened"]),
                    "pr_unresolved_90d_share": ratio(mature["prs_unresolved_at_90d"], mature["prs_opened"]),
                    "pr_merged_90d_share": ratio(mature["prs_merged_by_90d"], mature["prs_opened"]),
                    "push_actors": push_row.get("push_actors", ""),
                    "actors_for_50pct_pushes": push_row.get("actors_for_50pct_pushes", ""),
                    "top_5_actor_share": push_row.get("top_5_actor_share", ""),
                }
            )
    write_csv(args.repositories, repository_rows)

    lookup = {(row["section"], row["panel"], row["scope"], row["scope_value"], int(row["year"])): row for row in summary}
    flow_2025 = lookup[("queue_flow", "matched_top100", "all", "all", 2025)]
    flow_2026 = lookup[("queue_flow", "matched_top100", "all", "all", 2026)]
    out_2025 = lookup[("fixed_90d_outcome", "matched_top100", "all", "all", 2025)]
    out_2026 = lookup[("fixed_90d_outcome", "matched_top100", "all", "all", 2026)]
    push_2024 = lookup[("push_concentration", "matched_top100", "cohort", "Agentic AI Top 100", 2024)]
    push_2026 = lookup[("push_concentration", "matched_top100", "cohort", "Agentic AI Top 100", 2026)]
    cloud_2026 = lookup[("push_concentration", "current_benchmark", "cohort", "Cloud Native benchmark", 2026)]
    big_2026 = lookup[("push_concentration", "current_benchmark", "cohort", "Big Data benchmark", 2026)]
    findings = f"""# Agent 时代的协作压力：全量队列、固定结果窗口与核心参与者

## 先回答问题

在公开 GitHub 记录里，Agentic AI 仓库今年接住了更多代码变更，但还看不到单条 PR 更容易被及时处理或合入。压力集中在 PR 队列：同一组 {len(matched)} 个仓库中，2026 年 1—8 月新开 {int(flow_2026['prs_opened']):,} 条 PR、处理 {int(flow_2026['prs_closed']):,} 条，净增 {int(flow_2026['pr_flow_balance']):,} 条；Issue 则新开 {int(flow_2026['issues_opened']):,} 条、关闭 {int(flow_2026['issues_closed']):,} 条，基本打平。

固定给每条协作项 90—120 天观察时间后，PR 的差距仍然存在。2025 到 2026 年，90 天仍未解决的 PR 从 {float(out_2025['pr_unresolved_90d_share']):.1%} 升至 {float(out_2026['pr_unresolved_90d_share']):.1%}；仓库中位 90 天合入率从 {float(out_2025['repo_median_pr_merged_90d_share']):.1%} 降至 {float(out_2026['repo_median_pr_merged_90d_share']):.1%}。这不是“8 月刚开所以来不及处理”造成的。

## 队列发生了什么

- 同一批仓库的 PR 流入从 2025 年的 {int(flow_2025['prs_opened']):,} 增至 2026 年的 {int(flow_2026['prs_opened']):,}。
- 2026 年 Issue 流入和关闭量相差 {abs(int(flow_2026['issue_flow_balance'])):,} 条；PR 流入比处理量多 {int(flow_2026['pr_flow_balance']):,} 条。
- 在当前 Top 100 的四种技术角色里，Agent Application 的 Issue 和 PR 队列都在增长；三类基础设施仓库的 Issue 基本可控，PR 仍然净增长。

因此，新增负担不是“所有问题都处理不动”。更准确的说法是：代码变更的供给扩张得更快，review 和合入这一段没有同步扩容。

## 核心参与者有没有变多

用 ClickHouse 的完整 PushEvent 记录计算，每个仓库按推送次数排序，直到累计覆盖一半推送。相同 {len(matched)} 个 Agentic AI 仓库的中位数从 2024 年的 {push_2024['median_actors_for_50pct_pushes']:.0f} 个账号增至 2026 年的 {push_2026['median_actors_for_50pct_pushes']:.0f} 个；同期全部 PushEvent 参与账号中位数也从 {push_2024['median_push_actors']:.0f} 增至 {push_2026['median_push_actors']:.0f}。

2026 横截面上，Agentic AI 仓库完成一半推送需要的账号中位数为 {push_2026['median_actors_for_50pct_pushes']:.0f}，云原生对照为 {cloud_2026['median_actors_for_50pct_pushes']:.0f}，大数据对照为 {big_2026['median_actors_for_50pct_pushes']:.0f}。Agentic AI 的核心推送圈没有收缩，反而比两组传统技术对照更宽。这里的账号是 pusher，不等同于 commit author；它能说明写入权限和集成工作分散到多少公开账号，不能直接换算成人数或工时。

## 研究口径

- 当前画像使用冻结的 2026 年 7 月 OpenRank Top 100；流量与状态来自 GitHub Search 全量计数。
- 历史比较只使用这 100 个仓库中在 2024、2025、2026 年 1—5 月都存在完整协作项的 {len(matched)} 个仓库。同一名单贯穿队列、90 天结果和 PushEvent 趋势，不再维护多个任意小面板。
- `flow balance` 是同年 1—8 月新开量减去处理量。处理量包含关闭旧 backlog，因此它反映队列压力，但不是精确的历史月末库存。
- 90 天结果只取 1—5 月创建的协作项，并在月末后继续观察 90 天；合入率以 GitHub merged flag 为准。PyTorch 等特殊合入流程会让该标记低估实际接纳，需要结合仓库级分布阅读。
- 云原生和大数据对照来自 OpenDigger technology labels，再按 2026 年 7 月 OpenRank 取活跃头部仓库，并排除已进入前一组的仓库。
"""
    args.findings.write_text(findings, encoding="utf-8")
    validation = {
        "generated_at": datetime.now(UTC).isoformat(),
        "flow_rows": len(flow),
        "maturity_rows": len(maturity_rows),
        "matched_repositories": len(matched),
        "summary_rows": len(summary),
        "repository_rows": len(repository_rows),
        "invariants": {
            "flow_unique_keys": len({(row['repo_name'], row['year']) for row in flow}) == len(flow),
            "maturity_unique_keys": len({(row['repo_name'], row['cohort_month']) for row in maturity_rows}) == len(maturity_rows),
            "matched_present_all_years": all(all((repo, year) in maturity for year in YEARS) for repo in matched),
            "no_negative_fixed_outcomes": all(
                integer(row, "issues_unresolved_at_90d") >= 0 and integer(row, "prs_unresolved_at_90d") >= 0
                for row in maturity_rows
            ),
        },
        "sources": [str(path.relative_to(ROOT)) for path in (args.flow, args.maturity, args.push)],
    }
    args.validation.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
