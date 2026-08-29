#!/usr/bin/env python3
"""Create auditable summary tables for the open-collaboration report."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
MARKERS = RESEARCH / "collaboration-agent-markers-2022-2026-summary.csv"
MARKER_EVIDENCE = RESEARCH / "collaboration-agent-markers-2022-2026-evidence.csv"
SURFACES = RESEARCH / "collaboration-surfaces-top100-260829.csv"
REPOSITORY_YEAR = RESEARCH / "collaboration-repository-year-2022-2026.csv"
SUMMARY_OUTPUT = RESEARCH / "collaboration-five-year-summary-260829.csv"
TRANSITION_OUTPUT = RESEARCH / "collaboration-marker-transitions-2025-2026.csv"


SUMMARY_FIELDS = [
    "section",
    "metric",
    "segment",
    "period",
    "numerator",
    "denominator",
    "rate",
    "unit",
    "source",
    "quality_note",
]
TRANSITION_FIELDS = [
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "strict_2025",
    "strict_2026",
    "strict_transition",
    "any_active_2025",
    "any_active_2026",
    "any_active_transition",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def rate(numerator: int, denominator: int) -> str:
    return f"{numerator / denominator:.4f}" if denominator else ""


def add_summary(
    rows: list[dict[str, Any]],
    *,
    section: str,
    metric: str,
    segment: str,
    period: str,
    numerator: int | float,
    denominator: int | float,
    unit: str,
    source: str,
    quality_note: str,
) -> None:
    rows.append(
        {
            "section": section,
            "metric": metric,
            "segment": segment,
            "period": period,
            "numerator": numerator,
            "denominator": denominator,
            "rate": rate(int(numerator), int(denominator)) if denominator else "",
            "unit": unit,
            "source": source,
            "quality_note": quality_note,
        }
    )


def bool_value(value: str) -> bool:
    return value.strip().lower() in {"true", "yes", "1"}


def transition(before: bool, after: bool) -> str:
    if before and after:
        return "retained"
    if not before and after:
        return "added"
    if before and not after:
        return "removed"
    return "none"


def main() -> None:
    sample = read_csv(SAMPLE)
    markers = read_csv(MARKERS)
    evidence = read_csv(MARKER_EVIDENCE)
    surfaces = read_csv(SURFACES)
    repository_year = read_csv(REPOSITORY_YEAR)

    if len(sample) != 100 or len({row["repo_name"] for row in sample}) != 100:
        raise ValueError("Primary sample must contain 100 unique repositories")
    if len(markers) != 500 or len(
        {(row["repo_name"], row["snapshot_date"]) for row in markers}
    ) != 500:
        raise ValueError("Marker panel must contain 500 unique repository snapshots")
    if len(surfaces) != 100 or any(row["scan_status"] != "ok" for row in surfaces):
        raise ValueError("Surface refresh must contain 100 successful rows")
    if len(repository_year) != 500:
        raise ValueError("Repository-year panel must contain 500 rows")

    summary: list[dict[str, Any]] = []
    classification_counts = Counter(row["llm_native_manual"] for row in sample)
    for label, count in sorted(classification_counts.items()):
        add_summary(
            summary,
            section="classification",
            metric="llm_native_review",
            segment=label,
            period="2026-08-29",
            numerator=count,
            denominator=100,
            unit="repositories",
            source=str(SAMPLE.relative_to(ROOT)),
            quality_note="Researcher-reviewed label with confidence and reason per repository.",
        )

    mixed = classification_counts["mixed"]
    direct_date_contradictions = sum(
        (
            row["age_cohort"] == "created_before_2022_12"
            and row["llm_native_manual"] == "llm_native"
        )
        or (
            row["age_cohort"] == "created_2022_12_or_later"
            and row["llm_native_manual"] == "traditional"
        )
        for row in sample
    )
    add_summary(
        summary,
        section="classification",
        metric="date_split_insufficient",
        segment="mixed_or_direct_contradiction",
        period="2026-08-29",
        numerator=mixed + direct_date_contradictions,
        denominator=100,
        unit="repositories",
        source=str(SAMPLE.relative_to(ROOT)),
        quality_note="Includes 14 mixed projects and 5 direct contradictions to the date proxy.",
    )

    surface_metrics = {
        "issues_enabled": sum(bool_value(row["has_issues"]) for row in surfaces),
        "pull_requests_enabled": sum(
            bool_value(row["has_pull_requests"]) for row in surfaces
        ),
        "pull_request_creation_all": sum(
            row["pull_request_creation_policy"] == "ALL" for row in surfaces
        ),
        "pull_request_creation_collaborators_only": sum(
            row["pull_request_creation_policy"] == "COLLABORATORS_ONLY"
            for row in surfaces
        ),
        "discussions_enabled": sum(
            bool_value(row["has_discussions"]) for row in surfaces
        ),
        "contributing_path_observed": sum(
            bool(row["contributing_paths"]) for row in surfaces
        ),
        "issue_template_observed": sum(
            bool(row["issue_template_paths"]) for row in surfaces
        ),
        "pull_request_template_observed": sum(
            bool(row["pull_request_template_paths"]) for row in surfaces
        ),
    }
    for metric, count in surface_metrics.items():
        add_summary(
            summary,
            section="collaboration_surface",
            metric=metric,
            segment="top100",
            period="2026-08-29",
            numerator=count,
            denominator=100,
            unit="repositories",
            source=str(SURFACES.relative_to(ROOT)),
            quality_note="Current GitHub repository setting. Creation policy is separate from maintainer acceptance and merge outcomes.",
        )

    observable_markers = [
        row for row in markers if row["scan_status"] == "targeted_paths_ok"
    ]
    for year in range(2022, 2027):
        annual = [row for row in observable_markers if int(row["year"]) == year]
        for metric, field in (
            ("active_instruction", "has_active_instruction"),
            ("instruction_or_active_config", "has_any_active_marker"),
        ):
            count = sum(bool_value(row[field]) for row in annual)
            add_summary(
                summary,
                section="agent_marker",
                metric=metric,
                segment="observable_repositories",
                period=str(year),
                numerator=count,
                denominator=len(annual),
                unit="repositories",
                source=str(MARKERS.relative_to(ROOT)),
                quality_note="Targeted root and .github path scan; structural missing years excluded.",
            )

    current = [row for row in observable_markers if row["year"] == "2026"]
    for segment_field in ("llm_native_manual", "collaboration_niche"):
        groups: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in current:
            groups[row[segment_field]].append(row)
        for segment, group in sorted(groups.items()):
            count = sum(bool_value(row["has_active_instruction"]) for row in group)
            add_summary(
                summary,
                section="agent_marker_segment",
                metric="active_instruction",
                segment=f"{segment_field}={segment}",
                period="2026",
                numerator=count,
                denominator=len(group),
                unit="repositories",
                source=str(MARKERS.relative_to(ROOT)),
                quality_note="A marker proves machine-readable repository preparation; it does not prove use in a thread.",
            )

    tool_counts = Counter(
        (row["marker_tool"])
        for row in evidence
        if row["year"] == "2026"
        and row["evidence_level"] in {"active_instruction", "active_config"}
    )
    tool_repos: dict[str, set[str]] = defaultdict(set)
    for row in evidence:
        if row["year"] == "2026" and row["evidence_level"] in {
            "active_instruction",
            "active_config",
        }:
            tool_repos[row["marker_tool"]].add(row["repo_name"])
    for tool, repos in sorted(tool_repos.items(), key=lambda item: (-len(item[1]), item[0])):
        add_summary(
            summary,
            section="agent_marker_tool",
            metric="active_tool_repository_coverage",
            segment=tool,
            period="2026",
            numerator=len(repos),
            denominator=100,
            unit="repositories",
            source=str(MARKER_EVIDENCE.relative_to(ROOT)),
            quality_note=f"Repository coverage; {tool_counts[tool]} evidence rows may include more than one path per repository.",
        )

    repository_year_by_year: dict[int, list[dict[str, str]]] = defaultdict(list)
    for row in repository_year:
        if row["observation_status"] == "observed":
            repository_year_by_year[int(row["year"])].append(row)
    for year, annual in sorted(repository_year_by_year.items()):
        prs_opened = sum(int(float(row["prs_opened"] or 0)) for row in annual)
        missing_author = sum(
            int(float(row["prs_opened_author_missing"] or 0)) for row in annual
        )
        prs_merged = sum(int(float(row["prs_merged"] or 0)) for row in annual)
        duration_available = sum(
            int(float(row["prs_merged_with_duration"] or 0)) for row in annual
        )
        add_summary(
            summary,
            section="data_quality",
            metric="pr_author_payload_missing",
            segment="clickhouse_events",
            period=str(year),
            numerator=missing_author,
            denominator=prs_opened,
            unit="pull_requests",
            source=str(REPOSITORY_YEAR.relative_to(ROOT)),
            quality_note="Missing author payload cannot be interpreted as Bot.",
        )
        add_summary(
            summary,
            section="data_quality",
            metric="pr_merge_duration_available",
            segment="clickhouse_events",
            period=str(year),
            numerator=duration_available,
            denominator=prs_merged,
            unit="pull_requests",
            source=str(REPOSITORY_YEAR.relative_to(ROOT)),
            quality_note="Current-year merge-time analysis requires GitHub API supplementation.",
        )

    marker_index = {
        (row["repo_name"], row["year"]): row
        for row in observable_markers
    }
    transitions: list[dict[str, Any]] = []
    sample_index = {row["repo_name"]: row for row in sample}
    for repo in sorted(sample_index):
        before = marker_index.get((repo, "2025"))
        after = marker_index.get((repo, "2026"))
        if not before or not after:
            continue
        strict_before = bool_value(before["has_active_instruction"])
        strict_after = bool_value(after["has_active_instruction"])
        any_before = bool_value(before["has_any_active_marker"])
        any_after = bool_value(after["has_any_active_marker"])
        transitions.append(
            {
                "repo_name": repo,
                "llm_native_manual": sample_index[repo]["llm_native_manual"],
                "collaboration_niche": sample_index[repo]["collaboration_niche"],
                "strict_2025": str(strict_before).lower(),
                "strict_2026": str(strict_after).lower(),
                "strict_transition": transition(strict_before, strict_after),
                "any_active_2025": str(any_before).lower(),
                "any_active_2026": str(any_after).lower(),
                "any_active_transition": transition(any_before, any_after),
            }
        )

    write_csv(SUMMARY_OUTPUT, SUMMARY_FIELDS, summary)
    write_csv(TRANSITION_OUTPUT, TRANSITION_FIELDS, transitions)
    print(f"Wrote {len(summary)} summary rows to {SUMMARY_OUTPUT.relative_to(ROOT)}")
    print(f"Wrote {len(transitions)} transition rows to {TRANSITION_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
