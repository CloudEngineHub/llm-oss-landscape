#!/usr/bin/env python3
"""Fail closed when the Open Collaboration empirical artifacts drift."""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"


def rows(name: str) -> list[dict[str, str]]:
    with (RESEARCH / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def key(row: dict[str, str]) -> tuple[str, str, str]:
    return row["repo_name"], row.get("item_type", "pull_request"), row["number"]


def main() -> None:
    repository_sample = rows("collaboration-sample-top100-2607.csv")
    repository_sampling_status = rows(
        "collaboration-thread-sample-2026-repositories.csv"
    )
    sample = rows("collaboration-thread-sample-2026.csv")
    timeline = rows("collaboration-thread-events-2026.csv")
    timeline_status = rows("collaboration-thread-events-2026-status.csv")
    review_comments = rows("collaboration-thread-review-comments-2026.csv")
    review_status = rows("collaboration-thread-review-comments-2026-status.csv")
    commits = rows("collaboration-thread-pr-commits-2026.csv")
    commit_status = rows("collaboration-thread-pr-commits-2026-status.csv")
    analysis = rows("collaboration-thread-analysis-2026.csv")
    summary = rows("collaboration-thread-analysis-2026-summary.csv")
    bootstrap = rows("collaboration-thread-estimates-bootstrap-2026.csv")
    sensitivity = rows("collaboration-agent-participation-sensitivity-2026.csv")
    pr_code_metadata = rows("collaboration-pr-code-metadata-2026.csv")
    agent_code_attribution = rows("collaboration-agent-code-attribution-2026.csv")
    agent_code_estimates = rows("collaboration-agent-code-estimates-2026.csv")
    agent_code_key_metrics = rows("collaboration-agent-code-key-metrics-2026.csv")
    collaboration_surfaces = rows("collaboration-surfaces-top100-260829.csv")
    contribution_policies = rows(
        "collaboration-contribution-policies-reviewed-260829.csv"
    )
    agent_code_run = json.loads(
        (RESEARCH / "collaboration-agent-code-analysis-2026-run.json").read_text(encoding="utf-8")
    )
    thread_analysis_run = json.loads(
        (RESEARCH / "collaboration-thread-analysis-2026-run.json").read_text(encoding="utf-8")
    )

    sample_keys = {key(row) for row in sample}
    analysis_keys = {key(row) for row in analysis}
    expected_repositories = 100
    items_per_repository = 50
    expected_threads = expected_repositories * items_per_repository
    repository_names = {row["repo_name"] for row in repository_sample}
    status_by_repository = {
        row["repo_name"]: row for row in repository_sampling_status
    }
    sample_count_by_repository = Counter(row["repo_name"] for row in sample)
    require(
        len(repository_sample) == expected_repositories,
        "Frozen repository sample must contain 100 repositories",
    )
    require(
        len(collaboration_surfaces) == expected_repositories
        and all(row["scan_status"] == "ok" for row in collaboration_surfaces),
        "Collaboration surfaces must contain 100 successful repository snapshots",
    )
    require(
        all(row["has_pull_requests"] == "true" for row in collaboration_surfaces),
        "A repository no longer has Pull Requests enabled; review the reported surface",
    )
    creation_policy_counts = Counter(
        row["pull_request_creation_policy"] for row in collaboration_surfaces
    )
    require(
        creation_policy_counts == Counter({"ALL": 98, "COLLABORATORS_ONLY": 2}),
        "Pull-request creation settings drifted; refresh and review the direct GraphQL fields",
    )
    restricted_creation_repositories = {
        row["repo_name"]
        for row in collaboration_surfaces
        if row["pull_request_creation_policy"] == "COLLABORATORS_ONLY"
    }
    require(
        restricted_creation_repositories
        == {"openai/codex", "anthropics/claude-code"},
        "The collaborators-only repository set drifted",
    )
    require(
        len(contribution_policies) == expected_repositories,
        "Reviewed contribution policy table must cover all 100 repositories",
    )
    reviewed_policy_counts = Counter(
        row["final_policy_class"] for row in contribution_policies
    )
    require(
        reviewed_policy_counts["collaborators_only"] == 2,
        "Direct collaborators-only settings were lost during policy review",
    )
    require(
        set(status_by_repository) == repository_names,
        "Repository sampling status does not match the frozen Top-100 sample; "
        "check renamed or stale repository paths",
    )
    incomplete_repositories = [
        repo
        for repo in sorted(repository_names)
        if status_by_repository[repo].get("scan_status") not in {"ok", "ok_supplemented"}
        or int(status_by_repository[repo].get("selected_items") or 0)
        != items_per_repository
    ]
    require(
        not incomplete_repositories,
        "Every frozen repository must contribute 50 threads. Incomplete: "
        + ", ".join(incomplete_repositories[:10]),
    )
    require(
        len(sample) == expected_threads,
        f"Thread sample must contain {expected_threads:,} threads",
    )
    require(len(sample_keys) == len(sample), "Fixed thread sample contains duplicate threads")
    require(
        set(sample_count_by_repository) == repository_names,
        "Thread sample repository set differs from the frozen Top-100 sample",
    )
    require(
        all(count == items_per_repository for count in sample_count_by_repository.values()),
        "Each repository must contribute exactly 50 sampled threads",
    )
    issue_count = sum(row["item_type"] == "issue" for row in sample)
    pull_request_count = sum(
        row["item_type"] == "pull_request" for row in sample
    )
    require(
        issue_count + pull_request_count == expected_threads,
        "Sample contains an unexpected item type",
    )
    require(analysis_keys == sample_keys, "Analysis and sample thread keys differ")

    for label, status_rows, expected in (
        ("timeline", timeline_status, expected_threads),
        ("review comments", review_status, pull_request_count),
        ("PR commits", commit_status, pull_request_count),
    ):
        require(len(status_rows) == expected, f"{label} status count drifted")
        failures = [row for row in status_rows if row["scan_status"] != "ok"]
        require(not failures, f"{label} contains {len(failures)} incomplete rows")

    require(all(row["created_at"] for row in commits), "PR commit timestamp is missing")
    total_events = len(timeline) + len(review_comments) + len(commits)
    require(total_events > 0, "No public thread events were collected")
    require(
        thread_analysis_run["window_end_inclusive"] == "2026-08-31",
        "Thread analysis window must remain fixed at 2026-08-31",
    )
    require(
        thread_analysis_run["events_input"] == total_events,
        "Thread analysis input-event count differs from collected event files",
    )
    require(
        thread_analysis_run["events_within_window"]
        + thread_analysis_run["events_excluded_after_window"]
        == total_events,
        "Within-window and excluded event counts do not reconcile",
    )
    require(
        not any(
            (row.get(field) or "") >= "2026-09-01"
            for row in analysis
            for field in ("closed_at", "merged_at")
        ),
        "A post-August close or merge leaked into the fixed-window analysis",
    )

    overall = next(row for row in summary if row["scope_type"] == "overall")
    probability_fields = [name for name in overall if "share" in name]
    for field in probability_fields:
        if overall[field]:
            value = float(overall[field])
            require(0 <= value <= 1, f"{field} is outside [0, 1]")

    strict, expanded = sensitivity
    require(strict["scenario"] == "strict_verified", "Strict sensitivity row missing")
    require(expanded["scenario"] == "expanded_agentlike_bot_upper_bound", "Expanded sensitivity row missing")
    strict_share = float(strict["sample_thread_share"])
    expanded_share = float(expanded["sample_thread_share"])
    require(expanded_share >= strict_share, "Expanded actor bound fell below strict estimate")
    require(expanded_share - strict_share < 0.01, "Actor uncertainty changes headline by at least 1pp")

    bootstrap_lookup = {
        (row["metric"], row["view"]): float(row["point_estimate"])
        for row in bootstrap
    }
    require(
        abs(bootstrap_lookup[("agent_participation_present", "sample_unweighted")] - strict_share)
        < 1e-9,
        "Bootstrap point estimate and strict sensitivity estimate differ",
    )
    require(
        float(overall["reviewed_pr_post_review_commit_share_weighted"]) > 0,
        "Post-review commit estimate is zero; check commit timestamps",
    )
    require(
        float(overall["maintainer_account_gate_share_resolved_with_visible_gate_weighted"]) > 0,
        "Maintainer gate estimate is zero; check association inference",
    )

    require(
        len(pr_code_metadata) == pull_request_count,
        "PR code metadata does not cover the fixed PR sample",
    )
    require(
        all(row["scan_status"] == "ok" for row in pr_code_metadata),
        "PR code metadata contains incomplete rows",
    )
    require(
        len({(row["repo_name"], row["number"]) for row in pr_code_metadata})
        == pull_request_count,
        "PR code metadata contains duplicate PRs",
    )
    require(
        len(agent_code_attribution) == pull_request_count,
        "Agent code attribution does not cover every sampled PR",
    )
    incomplete_agent_only = [
        row for row in agent_code_attribution
        if row["agent_only_traceable"] == "true"
        and row["commit_attribution_complete"] != "true"
    ]
    require(
        not incomplete_agent_only,
        "Agent-only classification includes a PR with incomplete commit attribution",
    )
    require(
        not any(
            row["ai_disclosure_candidate"] == "candidate"
            and "- [ ]" in row["ai_disclosure_evidence"]
            for row in pr_code_metadata
        ),
        "Unchecked AI disclosure template was classified as a disclosure",
    )
    estimate_lookup = {row["scenario"]: row for row in agent_code_estimates}
    strict_code = estimate_lookup["strict_agent_only"]
    touched_code = estimate_lookup["strict_agent_touched"]
    expanded_code = estimate_lookup["expanded_agent_touched"]
    require(
        int(strict_code["sample_positive_prs"]) > 0,
        "Strict Agent-only case set is empty; manually review identities and PR histories",
    )
    require(
        float(strict_code["sample_pr_share"])
        <= float(touched_code["sample_pr_share"])
        <= float(expanded_code["sample_pr_share"]),
        "Agent code attribution bounds are not ordered",
    )
    require(
        not agent_code_run["validation_errors"],
        "Agent code analysis contains validation errors",
    )
    require(
        len(agent_code_key_metrics) >= 5,
        "Agent code key metrics are incomplete",
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "threads": len(sample),
                "repositories": len(repository_names),
                "issues": issue_count,
                "pull_requests": pull_request_count,
                "public_events_within_window": thread_analysis_run["events_within_window"],
                "public_events_excluded_after_window": thread_analysis_run["events_excluded_after_window"],
                "agent_participation_sample_share": strict_share,
                "agent_participation_expanded_upper_bound": expanded_share,
                "post_review_commit_share": float(
                    overall["reviewed_pr_post_review_commit_share_weighted"]
                ),
                "maintainer_gate_share": float(
                    overall[
                        "maintainer_account_gate_share_resolved_with_visible_gate_weighted"
                    ]
                ),
                "agent_only_merged_pr_share": float(strict_code["sample_pr_share"]),
                "agent_only_final_addition_share": float(
                    strict_code["sample_addition_share"]
                ),
                "agent_code_validation_warnings": len(
                    agent_code_run["validation_warnings"]
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
