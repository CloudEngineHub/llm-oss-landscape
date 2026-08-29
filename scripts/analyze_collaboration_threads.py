#!/usr/bin/env python3
"""Analyze sampled Issue/PR timelines without overstating account identity."""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any, Iterable

from collect_collaboration_items import strict_ai_disclosure_evidence


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_ITEMS = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_EVENTS = RESEARCH / "collaboration-thread-events-2026.csv"
DEFAULT_REVIEW_EVENTS = RESEARCH / "collaboration-thread-review-comments-2026.csv"
DEFAULT_COMMIT_EVENTS = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_STATUS = RESEARCH / "collaboration-thread-events-2026-status.csv"
DEFAULT_ACTORS = RESEARCH / "collaboration-actor-registry-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-analysis-2026.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-thread-analysis-2026-summary.csv"
DEFAULT_FINDINGS = RESEARCH / "collaboration-thread-analysis-2026-findings.md"
DEFAULT_RUN = RESEARCH / "collaboration-thread-analysis-2026-run.json"
DEFAULT_AGENT_TASKS = RESEARCH / "collaboration-agent-observed-tasks-2026.csv"

MAINTAINER_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}
EXTERNAL_ASSOCIATIONS = {"NONE", "CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR"}
RESPONSE_TYPES = {"commented", "reviewed", "review_commented"}
GATE_TYPES = {"closed", "merged", "reopened"}
AUTOMATION_CLASSES = {"automation_bot", "automation_service_account"}
AGENT_ROLES = {"coding_agent", "review_agent", "security_review_agent", "support_agent"}
AGENT_PARTICIPATION_ROLES = AGENT_ROLES | {"agent_mediated_user"}

THREAD_FIELDS = [
    "study_stage",
    "stage_start",
    "stage_end",
    "sample_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "item_type",
    "number",
    "html_url",
    "outcome",
    "created_at",
    "closed_at",
    "merged_at",
    "author_login",
    "author_association",
    "opener_class",
    "explicit_ai_assistance_disclosure",
    "known_automation_bot_present",
    "agent_participation_present",
    "coding_agent_present",
    "review_agent_present",
    "support_or_security_agent_present",
    "conventional_automation_present",
    "agent_participation_opened_thread",
    "agent_participation_response_present",
    "agent_review_event_present",
    "human_account_review_event_present",
    "maintainer_account_review_event_present",
    "agent_change_request_present",
    "human_account_change_request_present",
    "agent_gate_event_present",
    "agent_visible_events",
    "identity_candidate_present",
    "human_account_present_any",
    "human_account_present_in_conversation",
    "maintainer_account_present",
    "automation_only_visible_thread",
    "response_only_automation",
    "no_human_account_response",
    "no_maintainer_account_response",
    "visible_response_events",
    "comments",
    "reviews",
    "changes_requested_reviews",
    "review_observed",
    "post_review_commit_observed",
    "change_request_observed",
    "change_request_followed_by_commit",
    "conversation_actor_count",
    "conversation_class_switches",
    "first_visible_response_hours",
    "first_human_account_response_hours",
    "first_maintainer_account_response_hours",
    "commits",
    "commits_after_first_review",
    "gate_actor_login",
    "gate_actor_class",
    "gate_actor_role",
    "gate_actor_association",
    "human_account_gate",
    "maintainer_account_gate",
    "agent_gate",
    "external_author",
    "fixed_maturity_eligible",
    "resolution_days",
    "sampling_weight",
]

SUMMARY_FIELDS = [
    "scope_type",
    "scope_value",
    "threads",
    "estimated_population_weight",
    "explicit_ai_assistance_disclosure_share_weighted",
    "known_automation_bot_present_share_weighted",
    "known_automation_bot_present_share_macro_repository",
    "agent_participation_present_share_weighted",
    "agent_participation_present_share_macro_repository",
    "agent_participation_opened_thread_share_weighted",
    "agent_participation_response_present_share_weighted",
    "agent_review_event_present_share_pr_weighted",
    "human_account_review_event_present_share_pr_weighted",
    "maintainer_account_review_event_present_share_pr_weighted",
    "agent_change_request_present_share_change_requested_pr_weighted",
    "agent_change_requested_pr_followup_commit_share_weighted",
    "human_change_requested_pr_followup_commit_share_weighted",
    "human_account_gate_share_resolved_with_visible_gate_weighted",
    "maintainer_account_gate_share_resolved_with_visible_gate_weighted",
    "agent_gate_share_resolved_with_visible_gate_weighted",
    "agent_gate_event_present_share_weighted",
    "conventional_automation_present_share_weighted",
    "human_account_present_any_share_weighted",
    "human_account_response_share_weighted",
    "human_account_response_share_macro_repository",
    "maintainer_account_response_share_weighted",
    "maintainer_account_response_share_macro_repository",
    "automation_only_visible_thread_share_weighted",
    "automation_only_visible_thread_share_macro_repository",
    "response_only_automation_share_weighted",
    "response_only_automation_share_macro_repository",
    "external_pr_author_share_weighted",
    "external_pr_author_share_macro_repository",
    "open_share_fixed_maturity_weighted",
    "open_share_fixed_maturity_macro_repository",
    "github_merge_flag_share_resolved_pr_fixed_maturity_weighted",
    "github_merge_flag_share_resolved_pr_fixed_maturity_macro_repository",
    "external_pr_github_merge_flag_share_resolved_fixed_maturity_weighted",
    "internal_pr_github_merge_flag_share_resolved_fixed_maturity_weighted",
    "pr_review_observed_share_weighted",
    "reviewed_pr_post_review_commit_share_weighted",
    "change_requested_pr_followup_commit_share_weighted",
    "median_first_human_account_response_hours",
    "median_first_maintainer_account_response_hours",
    "median_resolution_days_closed_items",
    "median_reviews_pr",
    "median_changes_requested_pr",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    parser.add_argument(
        "--extra-events",
        type=Path,
        action="append",
        default=None,
        help="Additional event CSVs. Defaults to the dedicated PR review-comment and commit collections.",
    )
    parser.add_argument("--status", type=Path, default=DEFAULT_STATUS)
    parser.add_argument("--actors", type=Path, default=DEFAULT_ACTORS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--findings", type=Path, default=DEFAULT_FINDINGS)
    parser.add_argument("--agent-tasks", type=Path, default=DEFAULT_AGENT_TASKS)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    args = parser.parse_args()
    if args.extra_events is None:
        args.extra_events = [DEFAULT_REVIEW_EVENTS, DEFAULT_COMMIT_EVENTS]
    return args


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def hours_between(start: datetime | None, end: datetime | None) -> float | None:
    if not start or not end or end < start:
        return None
    return (end - start).total_seconds() / 3600


def actor_class(login: str, registry: dict[str, dict[str, str]]) -> str:
    if not login:
        return "unknown"
    row = registry.get(login)
    return row.get("final_class", "unknown") if row else "unknown"


def actor_role(login: str, registry: dict[str, dict[str, str]]) -> str:
    if not login:
        return "not_automation"
    row = registry.get(login)
    return row.get("automation_role", "not_automation") if row else "not_automation"


def tri_state(all_classes: list[str]) -> str:
    if not all_classes:
        return "unknown"
    if any(item == "human_account" for item in all_classes):
        return "no"
    if any(item in {"candidate_review", "unknown"} for item in all_classes):
        return "unknown"
    return "yes" if all(item in AUTOMATION_CLASSES for item in all_classes) else "unknown"


def bool_text(value: bool) -> str:
    return "yes" if value else "no"


def event_key(row: dict[str, str]) -> tuple[str, str]:
    return row["repo_name"], row["number"]


def canonical_events(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Use rich endpoint rows for reviews/commits and timeline rows for other events."""
    output: list[dict[str, str]] = []
    seen_review: set[str] = set()
    seen_commit: set[str] = set()
    has_rich_reviews = any(
        row.get("event_type") == "reviewed" and row.get("event_source") == "pull_review"
        for row in rows
    )
    has_rich_commits = any(
        row.get("event_type") == "committed" and row.get("event_source") == "pull_commit"
        for row in rows
    )
    for row in rows:
        source = row.get("event_source", "")
        event_type = row.get("event_type", "")
        if event_type == "reviewed":
            if has_rich_reviews and source != "pull_review":
                continue
            key = row.get("event_id", "")
            if key and key in seen_review:
                continue
            seen_review.add(key)
        elif event_type == "committed":
            if has_rich_commits and source != "pull_commit":
                continue
            key = row.get("commit_sha", "") or row.get("event_id", "")
            if key and key in seen_commit:
                continue
            seen_commit.add(key)
        output.append(row)
    return output


def agent_task(event_type: str) -> str:
    if event_type in {"commented"}:
        return "discussion_comment"
    if event_type in {"reviewed", "review_commented", "review_dismissed"}:
        return "code_review"
    if event_type == "committed":
        return "code_commit"
    if event_type in {"closed", "merged", "reopened", "added_to_merge_queue", "removed_from_merge_queue"}:
        return "gate_or_merge_management"
    if event_type in {"labeled", "unlabeled", "assigned", "unassigned", "milestoned", "demilestoned", "issue_type_added"}:
        return "triage_and_routing"
    if event_type in {"review_requested", "review_request_removed"}:
        return "review_routing"
    if event_type in {"referenced", "cross-referenced", "mentioned", "connected", "sub_issue_added"}:
        return "work_linking"
    if event_type in {"deployed"}:
        return "deployment_signal"
    if event_type in {"copilot_work_started"}:
        return "agent_work_started"
    return "other_visible_automation"


def first_time(rows: Iterable[dict[str, str]], predicate) -> datetime | None:
    values = [parse_time(row.get("created_at")) for row in rows if predicate(row)]
    present = [value for value in values if value is not None]
    return min(present) if present else None


def weighted_share(rows: list[dict[str, Any]], field: str, positive: set[str] = {"yes"}) -> float | None:
    eligible = [row for row in rows if str(row.get(field, "")) not in {"", "unknown"}]
    denominator = sum(float(row["sampling_weight"]) for row in eligible)
    if denominator <= 0:
        return None
    numerator = sum(float(row["sampling_weight"]) for row in eligible if str(row.get(field)) in positive)
    return numerator / denominator


def weighted_outcome_share(rows: list[dict[str, Any]], outcomes: set[str]) -> float | None:
    denominator = sum(float(row["sampling_weight"]) for row in rows)
    if denominator <= 0:
        return None
    numerator = sum(float(row["sampling_weight"]) for row in rows if row.get("outcome") in outcomes)
    return numerator / denominator


def macro_repository_share(
    rows: list[dict[str, Any]], field: str, positive: set[str] = {"yes"}
) -> float | None:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if str(row.get(field, "")) not in {"", "unknown"}:
            grouped[str(row["repo_name"])].append(row)
    repo_shares = [
        sum(str(row.get(field)) in positive for row in values) / len(values)
        for values in grouped.values()
        if values
    ]
    return sum(repo_shares) / len(repo_shares) if repo_shares else None


def macro_repository_outcome_share(rows: list[dict[str, Any]], outcomes: set[str]) -> float | None:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row["repo_name"])].append(row)
    repo_shares = [
        sum(row.get("outcome") in outcomes for row in values) / len(values)
        for values in grouped.values()
        if values
    ]
    return sum(repo_shares) / len(repo_shares) if repo_shares else None


def numeric_median(rows: list[dict[str, Any]], field: str) -> float | None:
    values = [float(row[field]) for row in rows if row.get(field) not in {"", None}]
    return median(values) if values else None


def rounded(value: float | None, digits: int = 4) -> str | float:
    return "" if value is None or math.isnan(value) else round(value, digits)


def summarize(scope_type: str, scope_value: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    prs = [row for row in rows if row["item_type"] == "pull_request"]
    mature = [row for row in rows if row["fixed_maturity_eligible"] == "yes"]
    mature_prs = [row for row in mature if row["item_type"] == "pull_request"]
    mature_resolved_prs = [row for row in mature_prs if row["outcome"] != "open"]
    mature_external_resolved_prs = [
        row for row in mature_resolved_prs if row["external_author"] == "yes"
    ]
    mature_internal_resolved_prs = [
        row for row in mature_resolved_prs if row["external_author"] == "no"
    ]
    reviewed_prs = [row for row in prs if row["review_observed"] == "yes"]
    change_requested_prs = [row for row in prs if row["change_request_observed"] == "yes"]
    agent_change_requested_prs = [row for row in prs if row["agent_change_request_present"] == "yes"]
    human_change_requested_prs = [row for row in prs if row["human_account_change_request_present"] == "yes"]
    closed = [row for row in rows if row["outcome"] not in {"open"}]
    closed_with_gate = [row for row in closed if row.get("gate_actor_login")]
    return {
        "scope_type": scope_type,
        "scope_value": scope_value,
        "threads": len(rows),
        "estimated_population_weight": round(sum(float(row["sampling_weight"]) for row in rows), 2),
        "explicit_ai_assistance_disclosure_share_weighted": rounded(weighted_share(rows, "explicit_ai_assistance_disclosure")),
        "known_automation_bot_present_share_weighted": rounded(weighted_share(rows, "known_automation_bot_present")),
        "known_automation_bot_present_share_macro_repository": rounded(macro_repository_share(rows, "known_automation_bot_present")),
        "agent_participation_present_share_weighted": rounded(weighted_share(rows, "agent_participation_present")),
        "agent_participation_present_share_macro_repository": rounded(macro_repository_share(rows, "agent_participation_present")),
        "agent_participation_opened_thread_share_weighted": rounded(weighted_share(rows, "agent_participation_opened_thread")),
        "agent_participation_response_present_share_weighted": rounded(weighted_share(rows, "agent_participation_response_present")),
        "agent_review_event_present_share_pr_weighted": rounded(weighted_share(prs, "agent_review_event_present")),
        "human_account_review_event_present_share_pr_weighted": rounded(weighted_share(prs, "human_account_review_event_present")),
        "maintainer_account_review_event_present_share_pr_weighted": rounded(weighted_share(prs, "maintainer_account_review_event_present")),
        "agent_change_request_present_share_change_requested_pr_weighted": rounded(weighted_share(change_requested_prs, "agent_change_request_present")),
        "agent_change_requested_pr_followup_commit_share_weighted": rounded(weighted_share(agent_change_requested_prs, "change_request_followed_by_commit")),
        "human_change_requested_pr_followup_commit_share_weighted": rounded(weighted_share(human_change_requested_prs, "change_request_followed_by_commit")),
        "human_account_gate_share_resolved_with_visible_gate_weighted": rounded(weighted_share(closed_with_gate, "human_account_gate")),
        "maintainer_account_gate_share_resolved_with_visible_gate_weighted": rounded(weighted_share(closed_with_gate, "maintainer_account_gate")),
        "agent_gate_share_resolved_with_visible_gate_weighted": rounded(weighted_share(closed_with_gate, "agent_gate")),
        "agent_gate_event_present_share_weighted": rounded(weighted_share(rows, "agent_gate_event_present")),
        "conventional_automation_present_share_weighted": rounded(weighted_share(rows, "conventional_automation_present")),
        "human_account_present_any_share_weighted": rounded(weighted_share(rows, "human_account_present_any")),
        "human_account_response_share_weighted": rounded(weighted_share(rows, "no_human_account_response", {"no"})),
        "human_account_response_share_macro_repository": rounded(macro_repository_share(rows, "no_human_account_response", {"no"})),
        "maintainer_account_response_share_weighted": rounded(weighted_share(rows, "no_maintainer_account_response", {"no"})),
        "maintainer_account_response_share_macro_repository": rounded(macro_repository_share(rows, "no_maintainer_account_response", {"no"})),
        "automation_only_visible_thread_share_weighted": rounded(weighted_share(rows, "automation_only_visible_thread")),
        "automation_only_visible_thread_share_macro_repository": rounded(macro_repository_share(rows, "automation_only_visible_thread")),
        "response_only_automation_share_weighted": rounded(weighted_share(rows, "response_only_automation")),
        "response_only_automation_share_macro_repository": rounded(macro_repository_share(rows, "response_only_automation")),
        "external_pr_author_share_weighted": rounded(weighted_share(prs, "external_author")),
        "external_pr_author_share_macro_repository": rounded(macro_repository_share(prs, "external_author")),
        "open_share_fixed_maturity_weighted": rounded(weighted_outcome_share(mature, {"open"})),
        "open_share_fixed_maturity_macro_repository": rounded(macro_repository_outcome_share(mature, {"open"})),
        "github_merge_flag_share_resolved_pr_fixed_maturity_weighted": rounded(
            weighted_outcome_share(mature_resolved_prs, {"merged"})
        ),
        "github_merge_flag_share_resolved_pr_fixed_maturity_macro_repository": rounded(
            macro_repository_outcome_share(mature_resolved_prs, {"merged"})
        ),
        "external_pr_github_merge_flag_share_resolved_fixed_maturity_weighted": rounded(
            weighted_outcome_share(mature_external_resolved_prs, {"merged"})
        ),
        "internal_pr_github_merge_flag_share_resolved_fixed_maturity_weighted": rounded(
            weighted_outcome_share(mature_internal_resolved_prs, {"merged"})
        ),
        "pr_review_observed_share_weighted": rounded(weighted_share(prs, "review_observed")),
        "reviewed_pr_post_review_commit_share_weighted": rounded(
            weighted_share(reviewed_prs, "post_review_commit_observed")
        ),
        "change_requested_pr_followup_commit_share_weighted": rounded(
            weighted_share(change_requested_prs, "change_request_followed_by_commit")
        ),
        "median_first_human_account_response_hours": rounded(numeric_median(rows, "first_human_account_response_hours"), 2),
        "median_first_maintainer_account_response_hours": rounded(numeric_median(rows, "first_maintainer_account_response_hours"), 2),
        "median_resolution_days_closed_items": rounded(numeric_median(closed, "resolution_days"), 2),
        "median_reviews_pr": rounded(numeric_median(prs, "reviews"), 2),
        "median_changes_requested_pr": rounded(numeric_median(prs, "changes_requested_reviews"), 2),
    }


def fmt_share(value: Any) -> str:
    if value in {"", None}:
        return "not estimable"
    return f"{float(value):.1%}"


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    items = read_csv(args.items)
    events = read_csv(args.events)
    for path in args.extra_events:
        events.extend(read_csv(path))
    statuses = {event_key(row): row for row in read_csv(args.status)}
    actors = {row["actor_login"]: row for row in read_csv(args.actors)}
    if not items or not events or not actors:
        raise SystemExit("Items, events, and actor registry must all be non-empty")

    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in events:
        grouped[event_key(row)].append(row)
    repo_actor_associations: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in items:
        if row.get("author_login") and row.get("author_association"):
            repo_actor_associations[(row["repo_name"], row["author_login"])].add(
                row["author_association"].upper()
            )
    for row in events:
        if row.get("actor_login") and row.get("author_association"):
            repo_actor_associations[(row["repo_name"], row["actor_login"])].add(
                row["author_association"].upper()
            )

    thread_rows: list[dict[str, Any]] = []
    agent_task_records: list[dict[str, Any]] = []
    excluded_missing_timeline = 0
    for item in items:
        key = item["repo_name"], item["number"]
        status = statuses.get(key)
        if status and status.get("scan_status") in {"missing_timeline", "error"}:
            excluded_missing_timeline += 1
            continue
        item_events = canonical_events(grouped.get(key, []))
        created = parse_time(item.get("created_at"))
        opener = actor_class(item.get("author_login", ""), actors)
        opener_role = actor_role(item.get("author_login", ""), actors)
        if opener_role in AGENT_PARTICIPATION_ROLES:
            agent_task_records.append(
                {
                    "automation_role": opener_role,
                    "task": f"opened_{item['item_type']}",
                    "repo_name": item["repo_name"],
                    "number": item["number"],
                    "sampling_weight": float(item.get("sampling_weight", 0) or 0),
                }
            )

        conversation_events = [
            row for row in item_events if row.get("event_type") in RESPONSE_TYPES
        ]
        for row in item_events:
            row["resolved_actor_class"] = actor_class(row.get("actor_login", ""), actors)
            row["resolved_actor_role"] = actor_role(row.get("actor_login", ""), actors)
        for row in conversation_events:
            row["resolved_actor_class"] = actor_class(row.get("actor_login", ""), actors)
            row["resolved_actor_role"] = actor_role(row.get("actor_login", ""), actors)

        response_events = [
            row
            for row in conversation_events
            if row.get("actor_login")
            and row.get("actor_login") != item.get("author_login", "")
        ]

        conversation_classes = [opener] + [
            row["resolved_actor_class"] for row in conversation_events
        ]
        any_classes = [opener] + [
            row["resolved_actor_class"] for row in item_events if row.get("actor_login")
        ]
        response_classes = [row["resolved_actor_class"] for row in response_events]
        all_roles = [opener_role] + [
            row["resolved_actor_role"] for row in item_events if row.get("actor_login")
        ]
        agent_events = [
            row for row in item_events if row.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES
        ]
        for row in agent_events:
            agent_task_records.append(
                {
                    "automation_role": row["resolved_actor_role"],
                    "task": agent_task(row.get("event_type", "")),
                    "repo_name": item["repo_name"],
                    "number": item["number"],
                    "sampling_weight": float(item.get("sampling_weight", 0) or 0),
                }
            )
        agent_response_events = [
            row for row in response_events if row.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES
        ]

        human_response_time = first_time(
            response_events,
            lambda row: row["resolved_actor_class"] == "human_account",
        )
        maintainer_response_time = first_time(
            response_events,
            lambda row: row.get("author_association", "").upper() in MAINTAINER_ASSOCIATIONS,
        )
        any_response_time = first_time(response_events, lambda row: True)

        ordered_conversation = sorted(
            [row for row in conversation_events if parse_time(row.get("created_at"))],
            key=lambda row: parse_time(row.get("created_at")) or created,
        )
        class_sequence = [opener] + [row["resolved_actor_class"] for row in ordered_conversation]
        switches = sum(left != right for left, right in zip(class_sequence, class_sequence[1:]))

        reviews = [row for row in conversation_events if row.get("event_type") == "reviewed"]
        comments = [
            row
            for row in conversation_events
            if row.get("event_type") in {"commented", "review_commented"}
        ]
        commits = [row for row in item_events if row.get("event_type") == "committed"]
        first_review = first_time(reviews, lambda row: True)
        commits_after_review = sum(
            1
            for row in commits
            if first_review and parse_time(row.get("created_at")) and parse_time(row.get("created_at")) > first_review
        )
        change_request_times = sorted(
            parse_time(row.get("created_at"))
            for row in reviews
            if str(row.get("review_state", "")).upper() == "CHANGES_REQUESTED"
            and parse_time(row.get("created_at"))
        )
        change_request_followed = any(
            review_time
            and any(
                parse_time(commit.get("created_at"))
                and parse_time(commit.get("created_at")) > review_time
                for commit in commits
            )
            for review_time in change_request_times
        )

        gate_events = sorted(
            [row for row in item_events if row.get("event_type") in GATE_TYPES and parse_time(row.get("created_at"))],
            key=lambda row: parse_time(row.get("created_at")) or created,
        )
        gate = gate_events[-1] if gate_events else {}
        gate_login = gate.get("actor_login", "")
        gate_associations = set()
        if gate.get("author_association"):
            gate_associations.add(gate["author_association"].upper())
        if gate_login:
            gate_associations.update(repo_actor_associations.get((item["repo_name"], gate_login), set()))
        finished = parse_time(item.get("merged_at")) or parse_time(item.get("closed_at"))
        disclosed = (
            item.get("ai_disclosure_candidate") == "candidate"
            and strict_ai_disclosure_evidence(item.get("ai_disclosure_evidence", ""))
        ) or any(
            row.get("ai_disclosure_candidate") == "candidate"
            and strict_ai_disclosure_evidence(row.get("ai_disclosure_evidence", ""))
            for row in item_events
        )
        maintainer_present = item.get("author_association", "").upper() in MAINTAINER_ASSOCIATIONS or any(
            row.get("author_association", "").upper() in MAINTAINER_ASSOCIATIONS for row in item_events
        )

        thread_rows.append(
            {
                **{field: item.get(field, "") for field in THREAD_FIELDS},
                "opener_class": opener,
                "explicit_ai_assistance_disclosure": bool_text(disclosed),
                "known_automation_bot_present": bool_text(any(value in AUTOMATION_CLASSES for value in any_classes)),
                "agent_participation_present": bool_text(any(value in AGENT_PARTICIPATION_ROLES for value in all_roles)),
                "coding_agent_present": bool_text(any(value in {"coding_agent", "agent_mediated_user"} for value in all_roles)),
                "review_agent_present": bool_text("review_agent" in all_roles),
                "support_or_security_agent_present": bool_text(
                    any(value in {"support_agent", "security_review_agent"} for value in all_roles)
                ),
                "conventional_automation_present": bool_text("conventional_automation" in all_roles),
                "agent_participation_opened_thread": bool_text(opener_role in AGENT_PARTICIPATION_ROLES),
                "agent_participation_response_present": bool_text(bool(agent_response_events)),
                "agent_review_event_present": bool_text(
                    any(
                        row.get("event_type") in {"reviewed", "review_commented"}
                        and row.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES
                        for row in item_events
                    )
                ),
                "human_account_review_event_present": bool_text(
                    any(
                        row.get("event_type") in {"reviewed", "review_commented"}
                        and row.get("resolved_actor_class") == "human_account"
                        for row in item_events
                    )
                ),
                "maintainer_account_review_event_present": bool_text(
                    any(
                        row.get("event_type") in {"reviewed", "review_commented"}
                        and row.get("author_association", "").upper() in MAINTAINER_ASSOCIATIONS
                        for row in item_events
                    )
                ),
                "agent_change_request_present": bool_text(
                    any(
                        row.get("event_type") == "reviewed"
                        and str(row.get("review_state", "")).upper() == "CHANGES_REQUESTED"
                        and row.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES
                        for row in item_events
                    )
                ),
                "human_account_change_request_present": bool_text(
                    any(
                        row.get("event_type") == "reviewed"
                        and str(row.get("review_state", "")).upper() == "CHANGES_REQUESTED"
                        and row.get("resolved_actor_class") == "human_account"
                        for row in item_events
                    )
                ),
                "agent_gate_event_present": bool_text(
                    any(
                        row.get("event_type") in GATE_TYPES
                        and row.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES
                        for row in item_events
                    )
                ),
                "agent_visible_events": len(agent_events),
                "identity_candidate_present": bool_text(any(value in {"candidate_review", "unknown"} for value in any_classes)),
                "human_account_present_any": bool_text("human_account" in any_classes),
                "human_account_present_in_conversation": bool_text("human_account" in conversation_classes),
                "maintainer_account_present": bool_text(maintainer_present),
                "automation_only_visible_thread": tri_state(any_classes),
                "response_only_automation": tri_state(response_classes),
                "no_human_account_response": bool_text("human_account" not in response_classes),
                "no_maintainer_account_response": bool_text(maintainer_response_time is None),
                "visible_response_events": len(response_events),
                "comments": len(comments),
                "reviews": len(reviews),
                "changes_requested_reviews": sum(
                    str(row.get("review_state", "")).upper() == "CHANGES_REQUESTED" for row in reviews
                ),
                "review_observed": bool_text(bool(reviews)),
                "post_review_commit_observed": bool_text(bool(commits_after_review)),
                "change_request_observed": bool_text(bool(change_request_times)),
                "change_request_followed_by_commit": bool_text(change_request_followed),
                "conversation_actor_count": len(
                    (
                        {item.get("author_login", "")}
                        | {row.get("actor_login", "") for row in conversation_events}
                    )
                    - {""}
                ),
                "conversation_class_switches": switches,
                "first_visible_response_hours": rounded(hours_between(created, any_response_time), 3),
                "first_human_account_response_hours": rounded(hours_between(created, human_response_time), 3),
                "first_maintainer_account_response_hours": rounded(hours_between(created, maintainer_response_time), 3),
                "commits": len(commits),
                "commits_after_first_review": commits_after_review,
                "gate_actor_login": gate_login,
                "gate_actor_class": gate.get("resolved_actor_class", ""),
                "gate_actor_role": gate.get("resolved_actor_role", ""),
                "gate_actor_association": "|".join(sorted(gate_associations)),
                "human_account_gate": bool_text(gate.get("resolved_actor_class") == "human_account"),
                "maintainer_account_gate": bool_text(
                    bool(gate_associations & MAINTAINER_ASSOCIATIONS)
                ),
                "agent_gate": bool_text(gate.get("resolved_actor_role") in AGENT_PARTICIPATION_ROLES),
                "external_author": bool_text(
                    item.get("author_association", "").upper() in EXTERNAL_ASSOCIATIONS
                ),
                "fixed_maturity_eligible": bool_text(
                    bool(created and created.date().isoformat() <= "2026-05-31")
                ),
                "resolution_days": rounded((hours_between(created, finished) or 0) / 24, 3) if finished else "",
                "sampling_weight": item.get("sampling_weight", ""),
            }
        )

    summaries = [summarize("overall", "all", thread_rows)]
    for field, scope in (
        ("item_type", "item_type"),
        ("llm_native_manual", "project_identity"),
        ("collaboration_niche", "collaboration_niche"),
        ("agent_proximity", "agent_proximity"),
        ("study_stage", "study_stage"),
    ):
        for value in sorted({str(row[field]) for row in thread_rows if str(row.get(field, ""))}):
            subset = [row for row in thread_rows if str(row[field]) == value]
            summaries.append(summarize(scope, value, subset))

    write_csv(args.output, THREAD_FIELDS, thread_rows)
    write_csv(args.summary, SUMMARY_FIELDS, summaries)
    task_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in agent_task_records:
        task_groups[(row["automation_role"], row["task"])].append(row)
    task_rows = []
    for (role, task), values in sorted(task_groups.items()):
        unique_threads = {
            (row["repo_name"], row["number"]): row["sampling_weight"] for row in values
        }
        task_rows.append(
            {
                "automation_role": role,
                "task": task,
                "observed_events": len(values),
                "threads": len(unique_threads),
                "repositories": len({row["repo_name"] for row in values}),
                "weighted_thread_presence": round(sum(unique_threads.values()), 2),
            }
        )
    write_csv(
        args.agent_tasks,
        ["automation_role", "task", "observed_events", "threads", "repositories", "weighted_thread_presence"],
        task_rows,
    )
    overall = summaries[0]
    repositories_with_prs = {
        row["repo_name"] for row in thread_rows if row["item_type"] == "pull_request"
    }
    repositories_with_external_pr = {
        row["repo_name"]
        for row in thread_rows
        if row["item_type"] == "pull_request" and row["external_author"] == "yes"
    }
    findings = f"""# 2,000 条 Issue / PR 线程告诉了我们什么

状态：100 个仓库的概率样本已经完整采集并通过校验。账号标签只描述 GitHub 上公开可见的身份，不判断每一行代码究竟由谁输入。

## 样本覆盖

- {len(thread_rows):,} 条 Issue / PR，来自 {len({row['repo_name'] for row in thread_rows})} 个仓库。
- {sum(row['item_type'] == 'issue' for row in thread_rows):,} 条 Issue，{sum(row['item_type'] == 'pull_request' for row in thread_rows):,} 条 PR。
- 合并 timeline、inline review comment 和 PR commit 后，进入分析的公开事件共 {len(events):,} 条。

## Agent 已经进入协作，但很少独自跑完整流程

- 可确认的 coding、review、security-review、support Agent 和 App 代理行为，出现在加权总体的 {fmt_share(overall['agent_participation_present_share_weighted'])}。这是公开可见参与率的下界，不是“多少代码由 AI 写”的比例。
- Agent 发起 {fmt_share(overall['agent_participation_opened_thread_share_weighted'])} 的线程，在 {fmt_share(overall['agent_participation_response_present_share_weighted'])} 的线程里参与后续回复。
- GitHub `User` 账号在 {fmt_share(overall['human_account_present_any_share_weighted'])} 的线程里至少出现一次；发起之后有人类账号回复的比例是 {fmt_share(overall['human_account_response_share_weighted'])}，有维护者关联账号回复的比例是 {fmt_share(overall['maintainer_account_response_share_weighted'])}。
- 在能看到最终 gate 账号的已解决线程中，GitHub `User` 执行 {fmt_share(overall['human_account_gate_share_resolved_with_visible_gate_weighted'])} 的 gate，维护者关联账号执行 {fmt_share(overall['maintainer_account_gate_share_resolved_with_visible_gate_weighted'])}，可确认 Agent 执行 {fmt_share(overall['agent_gate_share_resolved_with_visible_gate_weighted'])}。App 代理 User 时，这些类别可能重叠。

## 外部贡献仍然真实存在，但 patch 和通过 gate 不是一回事

- 在有 PR 样本的仓库里，{len(repositories_with_external_pr)}/{len(repositories_with_prs)} 至少抽到一条外部贡献者 PR。这是概率样本证据，不是仓库全量普查。
- 外部账号占加权 PR 流入的 {fmt_share(overall['external_pr_author_share_weighted'])}；仓库等权结果是 {fmt_share(overall['external_pr_author_share_macro_repository'])}。
- 到固定成熟度时，已解决外部 PR 中 {fmt_share(overall['external_pr_github_merge_flag_share_resolved_fixed_maturity_weighted'])} 带 GitHub merged flag；维护者或成员 PR 是 {fmt_share(overall['internal_pr_github_merge_flag_share_resolved_fixed_maturity_weighted'])}。这反映 gate 选择，不是质量分，也不能解释成 Agent 的因果效果。

## Review 是反复修改，不是点一下 approve

- {fmt_share(overall['pr_review_observed_share_weighted'])} 的加权 PR 出现可见 review。
- 在出现 review 的 PR 中，{fmt_share(overall['reviewed_pr_post_review_commit_share_weighted'])} 在第一次 review 后继续提交代码。
- 在收到 `CHANGES_REQUESTED` 的 PR 中，{fmt_share(overall['change_requested_pr_followup_commit_share_weighted'])} 之后又有 commit。这个数字说明修改循环真实存在，但不能单独证明 review 是人还是 Agent 发起，也不能证明修改有效。

## 不能越过的边界

- GitHub `User` 只表示公开账号类型，不表示工作完全没有 AI 辅助。
- `Agent marker` 是仓库里的 Agent 指令或配置，不等于实际使用率。
- 加权结果回答全部活动怎样，仓库等权结果回答典型仓库怎样；两者必须并排看。
- Agent 参与不是随机分配，当前数据能说明关联和流程位置，不能直接声称生产率提升。
"""
    args.findings.write_text(findings, encoding="utf-8")
    run = {
        "threads": len(thread_rows),
        "repositories": len({row["repo_name"] for row in thread_rows}),
        "events_input": len(events),
        "actor_registry_rows": len(actors),
        "threads_excluded_missing_timeline": excluded_missing_timeline,
        "threads_with_zero_visible_events": sum(event_key(item) not in grouped for item in items),
        "outputs": [
            display_path(args.output),
            display_path(args.summary),
            display_path(args.agent_tasks),
            display_path(args.findings),
        ],
        "limitations": [
            "GitHub User accounts are labelled human_account only at the public account-type level; undisclosed AI assistance remains unobservable.",
            "Explicit disclosure candidates do not establish autonomous Agent authorship without manual evidence review.",
            "Weighted estimates inherit the repository-stratified rejection-sample design and must be paired with equal-repository sensitivity results.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
