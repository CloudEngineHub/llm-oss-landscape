#!/usr/bin/env python3
"""Analyze the paired May-August public Agent-marker panel."""

from __future__ import annotations

import argparse
import csv
import math
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SUMMARY = RESEARCH / "collaboration-agent-markers-260531-260829-summary.csv"
DEFAULT_EVIDENCE = RESEARCH / "collaboration-agent-markers-260531-260829-evidence.csv"
DEFAULT_METRICS = RESEARCH / "collaboration-agent-markers-260531-260829-metrics.csv"
DEFAULT_TRANSITIONS = RESEARCH / "collaboration-agent-markers-260531-260829-transitions.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-agent-markers-260531-260829-findings.md"
MAY = "2026-05-31"
AUGUST = "2026-08-29"
TOOLS = (
    "cross_agent",
    "claude_code",
    "codex",
    "github_copilot",
    "cursor",
    "gemini",
    "cline",
    "windsurf",
    "roo_code",
    "continue",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE)
    parser.add_argument("--metrics", type=Path, default=DEFAULT_METRICS)
    parser.add_argument("--transitions", type=Path, default=DEFAULT_TRANSITIONS)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def active_tools(row: dict[str, str]) -> set[str]:
    return {item for item in row.get("distinct_active_tools", "").split("|") if item}


def exact_sign_p(additions: int, removals: int) -> float:
    discordant = additions + removals
    if not discordant:
        return 1.0
    tail = min(additions, removals)
    probability = sum(math.comb(discordant, k) for k in range(tail + 1)) / (2**discordant)
    return min(1.0, probability * 2)


def transition_counts(before: list[bool], after: list[bool]) -> dict[str, int]:
    counts = Counter(zip(before, after, strict=True))
    return {
        "retained": counts[(True, True)],
        "added": counts[(False, True)],
        "removed": counts[(True, False)],
        "absent": counts[(False, False)],
    }


def metric_row(
    metric: str,
    segment: str,
    before: list[bool],
    after: list[bool],
) -> dict[str, Any]:
    if len(before) != len(after):
        raise ValueError("Paired vectors must be the same length")
    counts = transition_counts(before, after)
    denominator = len(before)
    may_count = sum(before)
    august_count = sum(after)
    return {
        "metric": metric,
        "segment": segment,
        "paired_repositories": denominator,
        "may_count": may_count,
        "may_rate": round(may_count / denominator, 4),
        "august_count": august_count,
        "august_rate": round(august_count / denominator, 4),
        "percentage_point_change": round((august_count - may_count) / denominator * 100, 2),
        **counts,
        "exact_p": round(exact_sign_p(counts["added"], counts["removed"]), 6),
    }


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    summaries = read_csv(args.summary)
    evidence = read_csv(args.evidence)
    if len(summaries) != 200:
        raise SystemExit(f"Expected 200 summary rows, found {len(summaries)}")

    panel: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    for row in summaries:
        key = (row["repo_name"], row["snapshot_date"])
        if row["snapshot_date"] in panel[row["repo_name"]]:
            raise SystemExit(f"Duplicate repository snapshot: {key}")
        panel[row["repo_name"]][row["snapshot_date"]] = row

    paired = {
        repo: snapshots
        for repo, snapshots in panel.items()
        if snapshots.get(MAY, {}).get("history_available") == "yes"
        and snapshots.get(AUGUST, {}).get("history_available") == "yes"
    }
    if len(paired) != 99:
        raise SystemExit(f"Expected 99 paired repositories, found {len(paired)}")

    transition_rows: list[dict[str, Any]] = []
    for repo, snapshots in sorted(paired.items(), key=lambda item: int(item[1][AUGUST]["sample_rank"])):
        may = snapshots[MAY]
        august = snapshots[AUGUST]
        may_tools = active_tools(may)
        august_tools = active_tools(august)
        transition_rows.append(
            {
                "sample_rank": august["sample_rank"],
                "repo_name": repo,
                "llm_native_manual": august["llm_native_manual"],
                "collaboration_niche": august["collaboration_niche"],
                "agent_proximity": august["agent_proximity"],
                "may_strict_instruction": may["has_active_instruction"],
                "august_strict_instruction": august["has_active_instruction"],
                "may_any_active_marker": may["has_any_active_marker"],
                "august_any_active_marker": august["has_any_active_marker"],
                "may_active_tools": "|".join(sorted(may_tools)),
                "august_active_tools": "|".join(sorted(august_tools)),
                "tools_added": "|".join(sorted(august_tools - may_tools)),
                "tools_removed": "|".join(sorted(may_tools - august_tools)),
            }
        )

    metric_rows: list[dict[str, Any]] = []
    ordered = list(paired.values())
    metric_rows.append(
        metric_row(
            "strict_instruction",
            "all_paired",
            [row[MAY]["has_active_instruction"] == "yes" for row in ordered],
            [row[AUGUST]["has_active_instruction"] == "yes" for row in ordered],
        )
    )
    metric_rows.append(
        metric_row(
            "any_active_marker",
            "all_paired",
            [row[MAY]["has_any_active_marker"] == "yes" for row in ordered],
            [row[AUGUST]["has_any_active_marker"] == "yes" for row in ordered],
        )
    )
    for tool in TOOLS:
        metric_rows.append(
            metric_row(
                "active_tool",
                tool,
                [tool in active_tools(row[MAY]) for row in ordered],
                [tool in active_tools(row[AUGUST]) for row in ordered],
            )
        )
    for dimension in ("llm_native_manual", "collaboration_niche"):
        segments = sorted({row[AUGUST][dimension] for row in ordered})
        for segment in segments:
            subset = [row for row in ordered if row[AUGUST][dimension] == segment]
            metric_rows.append(
                metric_row(
                    "strict_instruction",
                    f"{dimension}={segment}",
                    [row[MAY]["has_active_instruction"] == "yes" for row in subset],
                    [row[AUGUST]["has_active_instruction"] == "yes" for row in subset],
                )
            )

    task_repositories: dict[str, dict[str, set[str]]] = {
        MAY: defaultdict(set),
        AUGUST: defaultdict(set),
    }
    for row in evidence:
        if row["snapshot_date"] not in task_repositories:
            continue
        if row["evidence_level"] != "active_instruction":
            continue
        for task in filter(None, row["tasks"].split("|")):
            task_repositories[row["snapshot_date"]][task].add(row["repo_name"])

    metric_fields = list(metric_rows[0])
    transition_fields = list(transition_rows[0])
    write_csv(args.metrics, metric_fields, metric_rows)
    write_csv(args.transitions, transition_fields, transition_rows)

    strict = metric_rows[0]
    active = metric_rows[1]
    cursor = next(row for row in metric_rows if row["segment"] == "cursor")
    task_names = sorted(set(task_repositories[MAY]) | set(task_repositories[AUGUST]))
    task_lines = "\n".join(
        f"| {task} | {len(task_repositories[MAY][task])} | {len(task_repositories[AUGUST][task])} |"
        for task in task_names
    )
    findings = f"""# May–August 2026 public Agent-marker panel

Date: 2026-08-29

The panel reconstructs the latest commit at or before 31 May and 29 August for the same Top 100 research sample. Ninety-nine repositories existed at both dates; one repository was not public by the May snapshot.

## What changed in the paired repositories

| Measure | May | August | Added | Removed | Percentage-point change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Strict instruction | {strict['may_count']} / {strict['paired_repositories']} | {strict['august_count']} / {strict['paired_repositories']} | {strict['added']} | {strict['removed']} | {strict['percentage_point_change']:+.2f} |
| Instruction or active config | {active['may_count']} / {active['paired_repositories']} | {active['august_count']} / {active['paired_repositories']} | {active['added']} | {active['removed']} | {active['percentage_point_change']:+.2f} |

The strict paired change has an exact sign-test p-value of {strict['exact_p']:.4f}. This describes a directional change in the fixed panel. It does not establish how frequently an Agent actually acted in the repositories.

## The Cursor decline hypothesis is not supported

Cursor active markers moved from {cursor['may_count']} to {cursor['august_count']} repositories in the paired panel: {cursor['retained']} retained, {cursor['added']} added and {cursor['removed']} removed. The exact sign-test p-value is {cursor['exact_p']:.4f}. A large decline is absent under the strict active-path definition.

The `.gitignore` residual is reported separately. A residual name can outlive the configuration and is not an adoption event.

## Declared task scope

| Task named in an active instruction | May repositories | August repositories |
| --- | ---: | ---: |
{task_lines}

These counts describe what repository instructions tell an Agent to consider. They do not measure completed Agent tasks. Thread-level evidence is still required for observed use.

## Self-challenge and alternative explanations

- The current Top 100 was used for both historical snapshots. This is a survivor and popularity-conditioned panel, not a representative estimate of all repositories that existed in May.
- The scan uses declared root and `.github` target paths. A project may keep valid instructions deeper in the tree; repeated use of the same path set makes the change comparison more stable than the absolute level.
- A new instruction may record a workflow that was already happening privately. The observed date is the first public marker in the scanned path, not necessarily the true adoption date.
- Tool removal can mean migration, consolidation into a cross-agent file or path movement. Each removal remains a review candidate instead of being interpreted automatically as abandonment.
- Repository readiness can increase while Agent participation in public Issues and pull requests remains low. The next stage must test that possibility directly.
"""
    args.findings.write_text(findings, encoding="utf-8")
    print(f"Wrote {len(metric_rows)} metrics to {args.metrics.relative_to(ROOT)}")
    print(f"Wrote {len(transition_rows)} transitions to {args.transitions.relative_to(ROOT)}")
    print(f"Wrote findings to {args.findings.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
