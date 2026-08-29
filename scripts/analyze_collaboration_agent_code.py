#!/usr/bin/env python3
"""Estimate publicly attributable Agent code in the 2026 PR sample."""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
import re
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_COMMITS = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_COMMIT_STATUS = RESEARCH / "collaboration-thread-pr-commits-2026-status.csv"
DEFAULT_ACTORS = RESEARCH / "collaboration-actor-registry-2026.csv"
DEFAULT_METADATA = RESEARCH / "collaboration-pr-code-metadata-2026.csv"
DEFAULT_DETAIL = RESEARCH / "collaboration-agent-code-attribution-2026.csv"
DEFAULT_ESTIMATES = RESEARCH / "collaboration-agent-code-estimates-2026.csv"
DEFAULT_KEY_METRICS = RESEARCH / "collaboration-agent-code-key-metrics-2026.csv"
DEFAULT_STRATA = RESEARCH / "collaboration-agent-code-strata-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-agent-code-analysis-2026-run.json"

DETAIL_FIELDS = [
    "sample_rank",
    "repo_name",
    "number",
    "html_url",
    "llm_native_manual",
    "collaboration_niche",
    "outcome",
    "sampling_weight",
    "additions",
    "deletions",
    "change_lines",
    "changed_files",
    "commits_total",
    "observed_commit_rows",
    "commit_attribution_complete",
    "opener_login",
    "opener_automation_role",
    "opener_automation_confidence",
    "agent_opened",
    "expanded_agent_opened",
    "direct_agent_commit_count",
    "expanded_agent_commit_count",
    "pr_linked_agent_commit_count",
    "human_or_unknown_commit_count",
    "agent_only_traceable",
    "expanded_agent_only_traceable",
    "agent_touched",
    "expanded_agent_touched",
    "ai_disclosure_class",
    "ai_disclosure_evidence",
    "attribution_class",
    "attribution_evidence",
]

ESTIMATE_FIELDS = [
    "scenario",
    "scope",
    "sample_positive_prs",
    "sample_merged_prs",
    "repositories_with_positive_pr",
    "weighted_pr_share",
    "weighted_pr_share_ci_low",
    "weighted_pr_share_ci_high",
    "weighted_addition_share",
    "weighted_addition_share_ci_low",
    "weighted_addition_share_ci_high",
    "weighted_change_line_share",
    "weighted_change_line_share_ci_low",
    "weighted_change_line_share_ci_high",
    "winsorized_change_line_share_p99",
    "weighted_commits_in_positive_pr_share",
    "interpretation",
]

STRATA_FIELDS = [
    "dimension",
    "stratum",
    "scenario",
    "sample_merged_prs",
    "sample_positive_prs",
    "repositories",
    "weighted_pr_share",
    "weighted_change_line_share",
]

KEY_METRIC_FIELDS = ["metric", "value", "sample_numerator", "sample_denominator", "note"]

GENERATED_DISCLOSURE = re.compile(
    r"(?:this\s+pr\s+was\s+created\s+by\s+an?\s+ai\s+agent|"
    r"this\s+pr\s+was\s+entirely\s+ai[- ]generated|"
    r"entirely\s+ai[- ]generated)",
    re.IGNORECASE,
)
ASSISTED_DISCLOSURE = re.compile(
    r"(?:ai[- ]assisted\s*:|assisted\s+or\s+generated\s+by\s+an?\s+ai\s+tool|"
    r"including\s+ai[- ]assisted\s+work)",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--commits", type=Path, default=DEFAULT_COMMITS)
    parser.add_argument("--commit-status", type=Path, default=DEFAULT_COMMIT_STATUS)
    parser.add_argument("--actors", type=Path, default=DEFAULT_ACTORS)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    parser.add_argument("--detail-output", type=Path, default=DEFAULT_DETAIL)
    parser.add_argument("--estimates-output", type=Path, default=DEFAULT_ESTIMATES)
    parser.add_argument("--key-metrics-output", type=Path, default=DEFAULT_KEY_METRICS)
    parser.add_argument("--strata-output", type=Path, default=DEFAULT_STRATA)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--bootstrap-replicates", type=int, default=2000)
    parser.add_argument("--bootstrap-seed", type=int, default=260912)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def as_int(value: str | int | None) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def as_float(value: str | float | None) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def identity_key(login: str | None) -> str:
    return re.sub(r"\[bot\]$", "", (login or "").strip().lower())


def disclosure_class(evidence: str) -> str:
    if GENERATED_DISCLOSURE.search(evidence or ""):
        return "generated_claim"
    if ASSISTED_DISCLOSURE.search(evidence or ""):
        return "assisted_claim"
    return "none"


def percentile(values: list[float], probability: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def ratio(rows: list[dict[str, Any]], positive: Callable[[dict[str, Any]], bool], field: str) -> float:
    denominator = sum(row["sampling_weight"] * row[field] for row in rows)
    if denominator <= 0:
        return 0.0
    numerator = sum(row["sampling_weight"] * row[field] for row in rows if positive(row))
    return numerator / denominator


def bootstrap_interval(
    all_sample_rows: list[dict[str, Any]],
    positive: Callable[[dict[str, Any]], bool],
    field: str,
    replicates: int,
    seed: int,
) -> tuple[float, float]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in all_sample_rows:
        grouped[row["repo_name"]].append(row)
    rng = random.Random(seed)
    estimates: list[float] = []
    for _ in range(replicates):
        resample: list[dict[str, Any]] = []
        for repo_rows in grouped.values():
            resample.extend(rng.choice(repo_rows) for _ in range(len(repo_rows)))
        estimates.append(ratio(resample, positive, field))
    return percentile(estimates, 0.025), percentile(estimates, 0.975)


def scenario_estimate(
    scenario: str,
    interpretation: str,
    all_rows: list[dict[str, Any]],
    merged_rows: list[dict[str, Any]],
    positive: Callable[[dict[str, Any]], bool],
    replicates: int,
    seed: int,
    p99: float,
) -> dict[str, Any]:
    positives = [row for row in merged_rows if positive(row)]
    pr_share = ratio(all_rows, positive, "merged_indicator")
    additions_share = ratio(all_rows, positive, "additions")
    change_share = ratio(all_rows, positive, "change_lines")
    commits_share = ratio(all_rows, positive, "commits_total")
    pr_low, pr_high = bootstrap_interval(all_rows, positive, "merged_indicator", replicates, seed)
    add_low, add_high = bootstrap_interval(all_rows, positive, "additions", replicates, seed + 1)
    line_low, line_high = bootstrap_interval(all_rows, positive, "change_lines", replicates, seed + 2)
    winsor_rows = [dict(row, winsorized_change_lines=min(row["change_lines"], p99)) for row in all_rows]
    winsor_share = ratio(winsor_rows, positive, "winsorized_change_lines")
    return {
        "scenario": scenario,
        "scope": "2026-01-01_to_2026-08-29_top100_probability_sample",
        "sample_positive_prs": len(positives),
        "sample_merged_prs": len(merged_rows),
        "repositories_with_positive_pr": len({row["repo_name"] for row in positives}),
        "weighted_pr_share": round(pr_share, 6),
        "weighted_pr_share_ci_low": round(pr_low, 6),
        "weighted_pr_share_ci_high": round(pr_high, 6),
        "weighted_addition_share": round(additions_share, 6),
        "weighted_addition_share_ci_low": round(add_low, 6),
        "weighted_addition_share_ci_high": round(add_high, 6),
        "weighted_change_line_share": round(change_share, 6),
        "weighted_change_line_share_ci_low": round(line_low, 6),
        "weighted_change_line_share_ci_high": round(line_high, 6),
        "winsorized_change_line_share_p99": round(winsor_share, 6),
        "weighted_commits_in_positive_pr_share": round(commits_share, 6),
        "interpretation": interpretation,
    }


def main() -> None:
    args = parse_args()
    sample = read_csv(args.sample)
    commits = read_csv(args.commits)
    commit_status = read_csv(args.commit_status)
    actor_rows = read_csv(args.actors)
    metadata_rows = read_csv(args.metadata)
    if not sample or not commits or not actor_rows or not metadata_rows:
        raise SystemExit("Required sample, commit, actor, or metadata input is empty")

    actors = {row["actor_login"]: row for row in actor_rows}
    expanded_coding_agents = {
        login for login, row in actors.items()
        if row.get("automation_role") == "coding_agent"
    }
    coding_agents = {
        login for login in expanded_coding_agents
        if actors[login].get("automation_role_confidence") == "high"
    }
    coding_agent_keys = {identity_key(login) for login in coding_agents}
    expanded_coding_agent_keys = {identity_key(login) for login in expanded_coding_agents}
    metadata = {(row["repo_name"], row["number"]): row for row in metadata_rows}
    commits_by_pr: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in commits:
        commits_by_pr[(row["repo_name"], row["number"])].append(row)

    details: list[dict[str, Any]] = []
    analysis_rows: list[dict[str, Any]] = []
    errors: list[str] = []
    warnings: list[str] = []
    pr_samples = [row for row in sample if row.get("item_type") == "pull_request"]
    if len(metadata) != len(pr_samples):
        errors.append(f"metadata rows {len(metadata)} != sampled PRs {len(pr_samples)}")
    if any(row.get("scan_status") != "ok" for row in metadata_rows):
        errors.append("PR metadata contains incomplete rows")
    if any(row.get("scan_status") != "ok" for row in commit_status):
        errors.append("PR commit endpoint contains incomplete rows")

    for item in sample:
        weight = as_float(item.get("sampling_weight"))
        base = {
            "repo_name": item["repo_name"],
            "sampling_weight": weight,
            "merged_indicator": 0,
            "additions": 0,
            "deletions": 0,
            "change_lines": 0,
            "commits_total": 0,
            "agent_only_traceable": False,
            "agent_touched": False,
            "expanded_agent_only_traceable": False,
            "expanded_agent_touched": False,
            "generated_disclosed": False,
            "any_ai_disclosed": False,
            "direct_agent_commits": 0,
            "linked_agent_commits": 0,
        }
        if item.get("item_type") != "pull_request":
            analysis_rows.append(base)
            continue
        key = item["repo_name"], item["number"]
        meta = metadata.get(key)
        if not meta:
            errors.append(f"missing metadata for {key[0]}#{key[1]}")
            analysis_rows.append(base)
            continue
        pr_commits = commits_by_pr.get(key, [])
        opener = item.get("author_login", "")
        opener_role = actors.get(opener, {}).get("automation_role", "not_automation")
        opener_confidence = actors.get(opener, {}).get("automation_role_confidence", "")
        agent_opened = opener_role == "coding_agent" and opener_confidence == "high"
        expanded_agent_opened = opener_role == "coding_agent"
        opener_key = identity_key(opener) if agent_opened else ""
        expanded_opener_key = identity_key(opener) if expanded_agent_opened else ""
        direct_agent_commits = 0
        expanded_agent_commits = 0
        linked_agent_commits = 0
        expanded_linked_agent_commits = 0
        human_or_unknown_commits = 0
        expanded_human_or_unknown_commits = 0
        for commit in pr_commits:
            author = commit.get("commit_author_login") or commit.get("actor_login") or ""
            author_key = identity_key(author)
            if author in coding_agents or author_key in coding_agent_keys:
                direct_agent_commits += 1
            elif opener_key and author_key == opener_key:
                linked_agent_commits += 1
            else:
                human_or_unknown_commits += 1
            if author in expanded_coding_agents or author_key in expanded_coding_agent_keys:
                expanded_agent_commits += 1
            elif expanded_opener_key and author_key == expanded_opener_key:
                expanded_linked_agent_commits += 1
            else:
                expanded_human_or_unknown_commits += 1
        agent_touched = agent_opened or direct_agent_commits > 0
        expanded_agent_touched = expanded_agent_opened or expanded_agent_commits > 0
        additions = as_int(meta.get("additions"))
        deletions = as_int(meta.get("deletions"))
        merged = meta.get("merged") == "true"
        commit_total = as_int(meta.get("commits_total"))
        commit_attribution_complete = commit_total == len(pr_commits)
        agent_only = bool(
            agent_opened
            and pr_commits
            and commit_attribution_complete
            and human_or_unknown_commits == 0
            and direct_agent_commits + linked_agent_commits == len(pr_commits)
        )
        expanded_agent_only = bool(
            expanded_agent_opened
            and pr_commits
            and commit_attribution_complete
            and expanded_human_or_unknown_commits == 0
            and expanded_agent_commits + expanded_linked_agent_commits == len(pr_commits)
        )
        disclosure = disclosure_class(meta.get("ai_disclosure_evidence", ""))
        attribution_class = "no_public_agent_code_signal"
        evidence = ""
        if agent_only:
            attribution_class = "agent_only_traceable"
            evidence = "verified Coding Agent opener; every current PR commit is directly or PR-linked Agent attributed"
        elif agent_touched:
            attribution_class = "agent_human_mixed_or_partial"
            evidence = "verified Coding Agent opener or commit; at least one commit is human or not attributable"
        elif expanded_agent_touched:
            attribution_class = "medium_confidence_agent_signal"
            evidence = "Coding Agent identity is medium confidence; excluded from the strict lower bound"
        elif disclosure == "generated_claim":
            attribution_class = "human_account_generated_claim"
            evidence = "PR body explicitly claims full AI or Agent generation"
        elif disclosure == "assisted_claim":
            attribution_class = "human_account_assisted_claim"
            evidence = "PR body explicitly discloses AI assistance"

        if commit_total != len(pr_commits):
            warnings.append(
                f"commit attribution incomplete {key[0]}#{key[1]}: metadata={commit_total}, rows={len(pr_commits)}"
            )
        detail = {
            "sample_rank": item["sample_rank"],
            "repo_name": item["repo_name"],
            "number": item["number"],
            "html_url": item["html_url"],
            "llm_native_manual": item.get("llm_native_manual", ""),
            "collaboration_niche": item.get("collaboration_niche", ""),
            "outcome": "merged" if merged else item.get("outcome", ""),
            "sampling_weight": item.get("sampling_weight", ""),
            "additions": additions,
            "deletions": deletions,
            "change_lines": additions + deletions,
            "changed_files": meta.get("changed_files", ""),
            "commits_total": commit_total,
            "observed_commit_rows": len(pr_commits),
            "commit_attribution_complete": str(commit_attribution_complete).lower(),
            "opener_login": opener,
            "opener_automation_role": opener_role,
            "opener_automation_confidence": opener_confidence,
            "agent_opened": str(agent_opened).lower(),
            "expanded_agent_opened": str(expanded_agent_opened).lower(),
            "direct_agent_commit_count": direct_agent_commits,
            "expanded_agent_commit_count": expanded_agent_commits,
            "pr_linked_agent_commit_count": linked_agent_commits,
            "human_or_unknown_commit_count": human_or_unknown_commits,
            "agent_only_traceable": str(agent_only).lower(),
            "expanded_agent_only_traceable": str(expanded_agent_only).lower(),
            "agent_touched": str(agent_touched).lower(),
            "expanded_agent_touched": str(expanded_agent_touched).lower(),
            "ai_disclosure_class": disclosure,
            "ai_disclosure_evidence": meta.get("ai_disclosure_evidence", ""),
            "attribution_class": attribution_class,
            "attribution_evidence": evidence,
        }
        details.append(detail)
        analysis_rows.append(
            {
                **base,
                "merged_indicator": int(merged),
                "additions": additions if merged else 0,
                "deletions": deletions if merged else 0,
                "change_lines": additions + deletions if merged else 0,
                "commits_total": commit_total if merged else 0,
                "agent_only_traceable": agent_only,
                "agent_touched": agent_touched,
                "expanded_agent_only_traceable": expanded_agent_only,
                "expanded_agent_touched": expanded_agent_touched,
                "generated_disclosed": disclosure == "generated_claim",
                "any_ai_disclosed": disclosure in {"generated_claim", "assisted_claim"},
                "direct_agent_commits": direct_agent_commits if merged else 0,
                "linked_agent_commits": linked_agent_commits if merged else 0,
                "llm_native_manual": item.get("llm_native_manual", ""),
                "collaboration_niche": item.get("collaboration_niche", ""),
            }
        )

    write_csv(args.detail_output, DETAIL_FIELDS, details)
    merged_rows = [row for row in analysis_rows if row["merged_indicator"]]
    p99 = percentile([row["change_lines"] for row in merged_rows], 0.99)
    scenarios = [
        (
            "strict_agent_only",
            lambda row: row["agent_only_traceable"],
            "严格下界：已确认 Coding Agent 发起，且当前 PR 的全部 commit 均可归因给 Agent。",
        ),
        (
            "strict_agent_touched",
            lambda row: row["agent_touched"],
            "高置信 Agent 参与范围：Agent 发起或提交过代码，可能包含后续人类改写；不能把全部代码行算作 AI 生成。",
        ),
        (
            "expanded_agent_touched",
            lambda row: row["expanded_agent_touched"],
            "加入中等置信度 Coding Agent 身份的敏感性上界。",
        ),
        (
            "verified_or_generated_claim",
            lambda row: row["expanded_agent_touched"] or row["generated_disclosed"],
            "加入普通账号明确声明完整 AI/Agent 生成的 PR。",
        ),
        (
            "verified_or_any_ai_disclosure",
            lambda row: row["expanded_agent_touched"] or row["any_ai_disclosed"],
            "最宽公开证据范围，包含 AI-assisted 声明；不等于完全由 AI 生成。",
        ),
    ]
    estimates = [
        scenario_estimate(
            name,
            interpretation,
            analysis_rows,
            merged_rows,
            positive,
            args.bootstrap_replicates,
            args.bootstrap_seed + index * 10,
            p99,
        )
        for index, (name, positive, interpretation) in enumerate(scenarios)
    ]
    write_csv(args.estimates_output, ESTIMATE_FIELDS, estimates)

    total_weighted_commits = sum(row["sampling_weight"] * row["commits_total"] for row in merged_rows)
    direct_weighted_commits = sum(
        row["sampling_weight"] * row["direct_agent_commits"] for row in merged_rows
    )
    linked_weighted_commits = sum(
        row["sampling_weight"] * row["linked_agent_commits"] for row in merged_rows
    )
    strict_estimate = estimates[0]
    touched_estimate = estimates[1]
    expanded_touched_estimate = estimates[2]
    key_metrics = [
        {
            "metric": "strict_agent_only_merged_pr_share",
            "value": strict_estimate["weighted_pr_share"],
            "sample_numerator": strict_estimate["sample_positive_prs"],
            "sample_denominator": strict_estimate["sample_merged_prs"],
            "note": "Probability-weighted share; every current commit is Agent attributed.",
        },
        {
            "metric": "strict_agent_only_final_addition_share",
            "value": strict_estimate["weighted_addition_share"],
            "sample_numerator": sum(
                row["additions"] for row in merged_rows if row["agent_only_traceable"]
            ),
            "sample_denominator": sum(row["additions"] for row in merged_rows),
            "note": "Strict public lower bound for final added lines in merged PRs.",
        },
        {
            "metric": "verified_agent_touched_merged_pr_share",
            "value": touched_estimate["weighted_pr_share"],
            "sample_numerator": touched_estimate["sample_positive_prs"],
            "sample_denominator": touched_estimate["sample_merged_prs"],
            "note": "Agent opened the PR or authored at least one current commit; may include human rewrites.",
        },
        {
            "metric": "expanded_agent_touched_merged_pr_share",
            "value": expanded_touched_estimate["weighted_pr_share"],
            "sample_numerator": expanded_touched_estimate["sample_positive_prs"],
            "sample_denominator": expanded_touched_estimate["sample_merged_prs"],
            "note": "Sensitivity bound adding medium-confidence Coding Agent identities.",
        },
        {
            "metric": "directly_attributed_agent_commit_share",
            "value": round(direct_weighted_commits / total_weighted_commits, 6)
            if total_weighted_commits else 0,
            "sample_numerator": sum(row["direct_agent_commits"] for row in merged_rows),
            "sample_denominator": sum(row["commits_total"] for row in merged_rows),
            "note": "Commit author identity is a confirmed Coding Agent; weighted within sampled merged PRs.",
        },
        {
            "metric": "direct_or_pr_linked_agent_commit_share",
            "value": round((direct_weighted_commits + linked_weighted_commits) / total_weighted_commits, 6)
            if total_weighted_commits else 0,
            "sample_numerator": sum(
                row["direct_agent_commits"] + row["linked_agent_commits"] for row in merged_rows
            ),
            "sample_denominator": sum(row["commits_total"] for row in merged_rows),
            "note": "Adds commit identities matching the verified Agent opener after normalizing the [bot] suffix.",
        },
    ]
    write_csv(args.key_metrics_output, KEY_METRIC_FIELDS, key_metrics)

    strata_rows: list[dict[str, Any]] = []
    for dimension in ("llm_native_manual", "collaboration_niche"):
        values = sorted({row.get(dimension, "") for row in merged_rows if row.get(dimension, "")})
        for value in values:
            subset = [row for row in analysis_rows if row.get(dimension, "") == value]
            merged_subset = [row for row in subset if row["merged_indicator"]]
            for name, positive, _ in scenarios[:2]:
                strata_rows.append(
                    {
                        "dimension": dimension,
                        "stratum": value,
                        "scenario": name,
                        "sample_merged_prs": len(merged_subset),
                        "sample_positive_prs": sum(positive(row) for row in merged_subset),
                        "repositories": len({row["repo_name"] for row in merged_subset}),
                        "weighted_pr_share": round(ratio(subset, positive, "merged_indicator"), 6),
                        "weighted_change_line_share": round(ratio(subset, positive, "change_lines"), 6),
                    }
                )
    write_csv(args.strata_output, STRATA_FIELDS, strata_rows)

    run = {
        "completed_at": datetime.now(UTC).isoformat(),
        "sample_threads": len(sample),
        "sample_pull_requests": len(pr_samples),
        "sample_merged_pull_requests": len(merged_rows),
        "commit_rows": len(commits),
        "coding_agent_identities": len(coding_agents),
        "expanded_coding_agent_identities": len(expanded_coding_agents),
        "metadata_complete": len(metadata) == len(pr_samples),
        "commit_endpoints_complete": all(row.get("scan_status") == "ok" for row in commit_status),
        "validation_errors": errors,
        "validation_warnings": warnings,
        "p99_merged_pr_change_lines": p99,
        "outputs": [
            str(args.detail_output.relative_to(ROOT)),
            str(args.estimates_output.relative_to(ROOT)),
            str(args.key_metrics_output.relative_to(ROOT)),
            str(args.strata_output.relative_to(ROOT)),
        ],
        "limitations": [
            "Public GitHub attribution cannot observe AI used locally under a normal user account without disclosure.",
            "Agent-touched PR code volume is not the same as AI-generated code volume when humans also committed.",
            "PR additions and deletions include tests, documentation, generated files, lockfiles, and other non-source changes.",
            "Agent-only is based on current PR commits; exact line survival across mixed Agent-human histories requires patch lineage.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"run": run, "estimates": estimates}, ensure_ascii=False, indent=2), flush=True)
    if errors:
        raise SystemExit(f"validation failed with {len(errors)} error(s)")


if __name__ == "__main__":
    main()
