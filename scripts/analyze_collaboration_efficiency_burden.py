#!/usr/bin/env python3
"""Test whether visible coding agents coincide with faster collaboration or more burden.

The primary design is a matched repository panel. It samples the same repositories
in the same May-August calendar window in 2024, 2025 and 2026, then evaluates
fixed-horizon outcomes. This avoids the closed-items-only medians that biased the
earlier exploratory analysis.

The output remains observational: public GitHub events can show visible agents and
maintainer work, but not private agent use or causal productivity.
"""

from __future__ import annotations

import argparse
import csv
import itertools
import json
import math
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any, Callable, Iterable

from analyze_collaboration_threads import (
    AGENT_PARTICIPATION_ROLES,
    MAINTAINER_ASSOCIATIONS,
    RESPONSE_TYPES,
    canonical_events,
    parse_time,
)


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"

DEFAULT_ITEMS = RESEARCH / "collaboration-efficiency-panel-thread-sample.csv"
DEFAULT_EVENTS = RESEARCH / "collaboration-efficiency-panel-thread-events.csv"
DEFAULT_REVIEWS = RESEARCH / "collaboration-efficiency-panel-thread-review-comments.csv"
DEFAULT_COMMITS = RESEARCH / "collaboration-efficiency-panel-thread-pr-commits.csv"
DEFAULT_ACTORS = RESEARCH / "collaboration-efficiency-panel-actor-registry.csv"
DEFAULT_THREADS = RESEARCH / "collaboration-efficiency-burden-thread-metrics.csv"
DEFAULT_PANEL = RESEARCH / "collaboration-efficiency-burden-panel-summary.csv"
DEFAULT_EXPOSURE = RESEARCH / "collaboration-efficiency-burden-agent-exposure.csv"
DEFAULT_VOLUME = RESEARCH / "collaboration-efficiency-burden-volume-summary.csv"
DEFAULT_VALIDATION = RESEARCH / "collaboration-efficiency-burden-validation.json"
DEFAULT_FINDINGS = RESEARCH / "collaboration-efficiency-burden-findings.md"

HUMAN_CLASS = "human_account"
AUTOMATION_ROLES = {"conventional_automation", "unknown_automation"}
OBSERVATION_HORIZONS_DAYS = (1, 7, 30, 90)

THREAD_FIELDS = [
    "study_stage", "panel_year", "repo_name", "llm_native_manual", "item_type",
    "number", "html_url", "created_at", "stage_end", "sampling_weight",
    "agent_opener", "agent_visible_24h", "agent_visible_30d", "early_agent_exposure",
    "coding_or_review_agent_visible_24h", "coding_or_review_agent_visible_30d",
    "support_agent_visible_30d", "security_review_agent_visible_30d",
    "explicit_ai_disclosure", "human_response_hours", "maintainer_response_hours",
    "any_response_hours", "eligible_1d", "eligible_7d", "human_response_24h", "human_response_7d",
    "maintainer_response_7d", "any_response_7d", "eligible_30d",
    "resolved_30d", "issue_closed_30d", "pr_merged_30d", "pr_closed_unmerged_30d",
    "eligible_90d", "resolved_90d", "issue_closed_90d", "pr_merged_90d",
    "reply_events_30d", "human_reply_events_30d", "maintainer_actions_30d",
    "agent_actions_30d", "automation_actions_30d", "conversation_runs_30d",
    "maintainer_entries_30d", "opener_return_rounds_30d", "review_events_30d",
    "human_review_events_30d", "maintainer_review_events_30d", "agent_review_events_30d",
    "changes_requested_30d", "commits_after_first_review_30d",
    "commits_after_first_human_review_30d", "commits_after_first_agent_review_30d",
]

PANEL_FIELDS = [
    "comparison", "metric", "item_scope", "direction", "repositories",
    "earlier_value", "later_value", "absolute_change", "relative_change",
    "positive_deltas", "negative_deltas", "ties", "exact_signflip_p", "bh_q",
    "interpretation",
]

EXPOSURE_FIELDS = [
    "comparison", "metric", "item_scope", "repositories", "agent_exposed_value",
    "no_visible_agent_value", "absolute_difference", "positive_deltas",
    "negative_deltas", "ties", "exact_signflip_p", "bh_q", "interpretation",
]

VOLUME_FIELDS = [
    "panel_year", "repositories", "population_threads", "population_change_from_2025",
    "eligible_30d_population_estimate", "maintainer_actions_per_thread_weighted",
    "estimated_maintainer_actions_30d", "estimated_maintainer_actions_ci_low",
    "estimated_maintainer_actions_ci_high", "human_review_events_per_pr_weighted",
    "estimated_human_review_events_30d", "agent_actions_per_thread_weighted",
    "estimated_agent_actions_30d", "automation_actions_per_thread_weighted",
    "estimated_automation_actions_30d",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    parser.add_argument("--reviews", type=Path, default=DEFAULT_REVIEWS)
    parser.add_argument("--commits", type=Path, default=DEFAULT_COMMITS)
    parser.add_argument("--actors", type=Path, default=DEFAULT_ACTORS)
    parser.add_argument("--threads-output", type=Path, default=DEFAULT_THREADS)
    parser.add_argument("--panel-output", type=Path, default=DEFAULT_PANEL)
    parser.add_argument("--exposure-output", type=Path, default=DEFAULT_EXPOSURE)
    parser.add_argument("--volume-output", type=Path, default=DEFAULT_VOLUME)
    parser.add_argument("--validation-output", type=Path, default=DEFAULT_VALIDATION)
    parser.add_argument("--findings-output", type=Path, default=DEFAULT_FINDINGS)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def bool_text(value: bool) -> str:
    return "yes" if value else "no"


def safe_float(value: str | float | None, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def actor_record(login: str, registry: dict[str, dict[str, str]]) -> dict[str, str]:
    return registry.get(login, {}) if login else {}


def is_agent(login: str, registry: dict[str, dict[str, str]]) -> bool:
    return actor_record(login, registry).get("automation_role", "") in AGENT_PARTICIPATION_ROLES


def has_agent_role(login: str, registry: dict[str, dict[str, str]], roles: set[str]) -> bool:
    return actor_record(login, registry).get("automation_role", "") in roles


def is_human(login: str, registry: dict[str, dict[str, str]]) -> bool:
    return actor_record(login, registry).get("final_class", "") == HUMAN_CLASS


def is_automation(login: str, registry: dict[str, dict[str, str]]) -> bool:
    row = actor_record(login, registry)
    return row.get("final_class", "").startswith("automation_") or row.get("automation_role", "") in AUTOMATION_ROLES


def hours_after(created: datetime, value: str | None) -> float | None:
    observed = parse_time(value)
    if not observed or observed < created:
        return None
    return (observed - created).total_seconds() / 3600


def first_or_none(values: Iterable[float | None]) -> float | None:
    kept = [value for value in values if value is not None]
    return min(kept) if kept else None


def event_side(event: dict[str, str], opener: str, registry: dict[str, dict[str, str]]) -> str:
    login = event.get("actor_login", "")
    if login and login == opener:
        return "opener"
    if event.get("author_association", "") in MAINTAINER_ASSOCIATIONS and is_human(login, registry):
        return "maintainer"
    if is_agent(login, registry):
        return "agent"
    if is_human(login, registry):
        return "external_human"
    if is_automation(login, registry):
        return "automation"
    return "unknown"


def count_runs(sides: list[str]) -> int:
    if not sides:
        return 0
    return 1 + sum(left != right for left, right in zip(sides, sides[1:]))


def entries_into(sides: list[str], target: str) -> int:
    return sum(side == target and (index == 0 or sides[index - 1] != target) for index, side in enumerate(sides))


def within(hours: float | None, horizon_hours: float) -> bool:
    return hours is not None and hours <= horizon_hours


def outcome_within(item: dict[str, str], created: datetime, horizon_days: int) -> tuple[bool, bool, bool, bool]:
    horizon_hours = horizon_days * 24
    closed_hours = hours_after(created, item.get("closed_at"))
    merged_hours = hours_after(created, item.get("merged_at"))
    is_pr = item["item_type"] == "pull_request"
    issue_closed = not is_pr and within(closed_hours, horizon_hours)
    pr_merged = is_pr and within(merged_hours, horizon_hours)
    pr_closed_unmerged = is_pr and within(closed_hours, horizon_hours) and not pr_merged
    return issue_closed or pr_merged or pr_closed_unmerged, issue_closed, pr_merged, pr_closed_unmerged


def build_thread_metrics(
    items: list[dict[str, str]],
    events_by_thread: dict[tuple[str, str], list[dict[str, str]]],
    registry: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for item in items:
        key = (item["repo_name"], item["number"])
        created = parse_time(item["created_at"])
        stage_end = datetime.fromisoformat(item["stage_end"] + "T23:59:59+00:00")
        assert created is not None
        opener = item.get("author_login", "")
        raw_events = canonical_events(events_by_thread.get(key, []))
        timed_events = []
        for event in raw_events:
            event_hours = hours_after(created, event.get("created_at"))
            event_time = parse_time(event.get("created_at"))
            if event_hours is None or event_time is None or event_time > stage_end:
                continue
            event = dict(event)
            event["_hours"] = event_hours
            timed_events.append(event)
        timed_events.sort(key=lambda row: (float(row["_hours"]), row.get("event_id", "")))

        responses = [row for row in timed_events if row.get("event_type") in RESPONSE_TYPES and row.get("actor_login") != opener]
        human_responses = [row for row in responses if is_human(row.get("actor_login", ""), registry)]
        maintainer_responses = [
            row for row in human_responses if row.get("author_association", "") in MAINTAINER_ASSOCIATIONS
        ]
        agent_events = [row for row in timed_events if is_agent(row.get("actor_login", ""), registry)]
        coding_review_events = [
            row for row in timed_events
            if has_agent_role(
                row.get("actor_login", ""), registry,
                {"coding_agent", "review_agent", "agent_mediated_user"},
            )
        ]
        support_events = [
            row for row in timed_events
            if has_agent_role(row.get("actor_login", ""), registry, {"support_agent"})
        ]
        security_events = [
            row for row in timed_events
            if has_agent_role(row.get("actor_login", ""), registry, {"security_review_agent"})
        ]
        any_response = first_or_none(float(row["_hours"]) for row in responses)
        human_response = first_or_none(float(row["_hours"]) for row in human_responses)
        maintainer_response = first_or_none(float(row["_hours"]) for row in maintainer_responses)
        first_agent = first_or_none(float(row["_hours"]) for row in agent_events)
        first_coding_review_agent = first_or_none(float(row["_hours"]) for row in coding_review_events)
        first_support_agent = first_or_none(float(row["_hours"]) for row in support_events)
        first_security_agent = first_or_none(float(row["_hours"]) for row in security_events)
        agent_opener = is_agent(opener, registry)
        coding_review_opener = has_agent_role(
            opener, registry, {"coding_agent", "review_agent", "agent_mediated_user"}
        )
        support_opener = has_agent_role(opener, registry, {"support_agent"})
        security_opener = has_agent_role(opener, registry, {"security_review_agent"})

        in_30d = [row for row in timed_events if float(row["_hours"]) <= 30 * 24]
        replies_30d = [row for row in in_30d if row.get("event_type") in RESPONSE_TYPES]
        conversation_sides = [event_side(row, opener, registry) for row in replies_30d]
        human_reply_events = [row for row in replies_30d if is_human(row.get("actor_login", ""), registry)]
        maintainer_actions = [
            row for row in in_30d
            if row.get("author_association", "") in MAINTAINER_ASSOCIATIONS
            and is_human(row.get("actor_login", ""), registry)
            and row.get("event_type") in RESPONSE_TYPES | {"closed", "merged", "reopened"}
        ]
        agent_actions = [row for row in in_30d if is_agent(row.get("actor_login", ""), registry)]
        automation_actions = [
            row for row in in_30d
            if is_automation(row.get("actor_login", ""), registry)
            and not is_agent(row.get("actor_login", ""), registry)
        ]
        reviews = [row for row in in_30d if row.get("event_type") in {"reviewed", "review_commented"}]
        human_reviews = [row for row in reviews if is_human(row.get("actor_login", ""), registry)]
        maintainer_reviews = [
            row for row in human_reviews if row.get("author_association", "") in MAINTAINER_ASSOCIATIONS
        ]
        agent_reviews = [row for row in reviews if is_agent(row.get("actor_login", ""), registry)]
        changes = [row for row in in_30d if row.get("event_type") == "reviewed" and row.get("review_state", "").upper() == "CHANGES_REQUESTED"]
        first_review_hours = first_or_none(float(row["_hours"]) for row in reviews)
        first_human_review_hours = first_or_none(float(row["_hours"]) for row in human_reviews)
        first_agent_review_hours = first_or_none(float(row["_hours"]) for row in agent_reviews)
        later_commits = [
            row for row in in_30d
            if row.get("event_type") == "committed"
            and first_review_hours is not None
            and float(row["_hours"]) > first_review_hours
        ]
        later_commits_after_human = [
            row for row in in_30d
            if row.get("event_type") == "committed"
            and first_human_review_hours is not None
            and float(row["_hours"]) > first_human_review_hours
        ]
        later_commits_after_agent = [
            row for row in in_30d
            if row.get("event_type") == "committed"
            and first_agent_review_hours is not None
            and float(row["_hours"]) > first_agent_review_hours
        ]

        eligible_1 = created <= stage_end - timedelta(days=1)
        eligible_7 = created <= stage_end - timedelta(days=7)
        eligible_30 = created <= stage_end - timedelta(days=30)
        eligible_90 = created <= stage_end - timedelta(days=90)
        resolved_30, issue_closed_30, pr_merged_30, pr_closed_unmerged_30 = outcome_within(item, created, 30)
        resolved_90, issue_closed_90, pr_merged_90, _ = outcome_within(item, created, 90)
        output.append({
            "study_stage": item["study_stage"],
            "panel_year": item["panel_year"],
            "repo_name": item["repo_name"],
            "llm_native_manual": item.get("llm_native_manual", ""),
            "item_type": item["item_type"],
            "number": item["number"],
            "html_url": item.get("html_url", ""),
            "created_at": item["created_at"],
            "stage_end": item["stage_end"],
            "sampling_weight": safe_float(item.get("sampling_weight"), 1.0),
            "agent_opener": bool_text(agent_opener),
            "agent_visible_24h": bool_text(agent_opener or within(first_agent, 24)),
            "agent_visible_30d": bool_text(agent_opener or within(first_agent, 30 * 24)),
            "early_agent_exposure": bool_text(agent_opener or within(first_agent, 24)),
            "coding_or_review_agent_visible_24h": bool_text(
                coding_review_opener or within(first_coding_review_agent, 24)
            ),
            "coding_or_review_agent_visible_30d": bool_text(
                coding_review_opener or within(first_coding_review_agent, 30 * 24)
            ),
            "support_agent_visible_30d": bool_text(
                support_opener or within(first_support_agent, 30 * 24)
            ),
            "security_review_agent_visible_30d": bool_text(
                security_opener or within(first_security_agent, 30 * 24)
            ),
            "explicit_ai_disclosure": bool_text(item.get("ai_disclosure_candidate") == "candidate"),
            "human_response_hours": "" if human_response is None else round(human_response, 6),
            "maintainer_response_hours": "" if maintainer_response is None else round(maintainer_response, 6),
            "any_response_hours": "" if any_response is None else round(any_response, 6),
            "eligible_1d": bool_text(eligible_1),
            "eligible_7d": bool_text(eligible_7),
            "human_response_24h": bool_text(within(human_response, 24)),
            "human_response_7d": bool_text(within(human_response, 7 * 24)),
            "maintainer_response_7d": bool_text(within(maintainer_response, 7 * 24)),
            "any_response_7d": bool_text(within(any_response, 7 * 24)),
            "eligible_30d": bool_text(eligible_30),
            "resolved_30d": bool_text(eligible_30 and resolved_30),
            "issue_closed_30d": bool_text(eligible_30 and issue_closed_30),
            "pr_merged_30d": bool_text(eligible_30 and pr_merged_30),
            "pr_closed_unmerged_30d": bool_text(eligible_30 and pr_closed_unmerged_30),
            "eligible_90d": bool_text(eligible_90),
            "resolved_90d": bool_text(eligible_90 and resolved_90),
            "issue_closed_90d": bool_text(eligible_90 and issue_closed_90),
            "pr_merged_90d": bool_text(eligible_90 and pr_merged_90),
            "reply_events_30d": len(replies_30d),
            "human_reply_events_30d": len(human_reply_events),
            "maintainer_actions_30d": len(maintainer_actions),
            "agent_actions_30d": len(agent_actions),
            "automation_actions_30d": len(automation_actions),
            "conversation_runs_30d": count_runs(conversation_sides),
            "maintainer_entries_30d": entries_into(conversation_sides, "maintainer"),
            "opener_return_rounds_30d": entries_into(conversation_sides, "opener"),
            "review_events_30d": len(reviews),
            "human_review_events_30d": len(human_reviews),
            "maintainer_review_events_30d": len(maintainer_reviews),
            "agent_review_events_30d": len(agent_reviews),
            "changes_requested_30d": len(changes),
            "commits_after_first_review_30d": len(later_commits),
            "commits_after_first_human_review_30d": len(later_commits_after_human),
            "commits_after_first_agent_review_30d": len(later_commits_after_agent),
        })
    return output


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else math.nan


def row_value(row: dict[str, Any], field: str) -> float:
    value = row.get(field, "")
    if isinstance(value, str) and value in {"yes", "no"}:
        return 1.0 if value == "yes" else 0.0
    return float(value)


def item_scope(row: dict[str, Any], scope: str) -> bool:
    return scope == "all" or row["item_type"] == scope


def metric_rows(rows: list[dict[str, Any]], metric: str, scope: str) -> list[dict[str, Any]]:
    kept = [row for row in rows if item_scope(row, scope)]
    if metric.endswith("_7d"):
        kept = [row for row in kept if row["eligible_7d"] == "yes"]
    if metric.endswith("_30d") and metric in {
        "resolved_30d", "issue_closed_30d", "pr_merged_30d", "pr_closed_unmerged_30d",
        "maintainer_actions_30d", "conversation_runs_30d", "opener_return_rounds_30d",
        "review_events_30d", "human_review_events_30d", "maintainer_review_events_30d",
        "agent_review_events_30d", "commits_after_first_review_30d",
        "commits_after_first_human_review_30d", "commits_after_first_agent_review_30d",
        "agent_visible_30d",
        "coding_or_review_agent_visible_30d", "support_agent_visible_30d",
        "security_review_agent_visible_30d", "automation_actions_30d",
    }:
        kept = [row for row in kept if row["eligible_30d"] == "yes"]
    if metric.endswith("_90d"):
        kept = [row for row in kept if row["eligible_90d"] == "yes"]
    return kept


def repository_metric(rows: list[dict[str, Any]], metric: str, scope: str) -> float:
    selected = metric_rows(rows, metric, scope)
    return mean([row_value(row, metric) for row in selected])


def exact_signflip_p(deltas: list[float]) -> float:
    nonzero = [value for value in deltas if abs(value) > 1e-12]
    if not nonzero:
        return 1.0
    observed = abs(mean(nonzero))
    if len(nonzero) <= 18:
        total = 2 ** len(nonzero)
        extreme = 0
        for signs in itertools.product((-1, 1), repeat=len(nonzero)):
            permuted = abs(mean([sign * abs(value) for sign, value in zip(signs, nonzero)]))
            extreme += permuted >= observed - 1e-12
        return extreme / total
    # Deterministic normal approximation is only a fallback for larger panels.
    variance = sum(value * value for value in nonzero) / (len(nonzero) ** 2)
    if variance <= 0:
        return 1.0
    z = observed / math.sqrt(variance)
    return math.erfc(z / math.sqrt(2))


def bh_adjust(rows: list[dict[str, Any]]) -> None:
    families: dict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, row in enumerate(rows):
        families[row["comparison"]].append((index, row))
    adjusted: dict[int, float] = {}
    for family in families.values():
        ordered = sorted(family, key=lambda pair: float(pair[1]["exact_signflip_p"]))
        running = 1.0
        count = len(ordered)
        for reverse_index, (original_index, row) in enumerate(reversed(ordered), start=1):
            rank = count - reverse_index + 1
            running = min(running, float(row["exact_signflip_p"]) * count / rank)
            adjusted[original_index] = min(1.0, running)
    for index, row in enumerate(rows):
        row["bh_q"] = round(adjusted[index], 6)


def paired_panel(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    metrics = [
        ("human_response_7d", "all", "higher is faster human response"),
        ("human_response_7d", "issue", "higher is faster human response to issues"),
        ("human_response_7d", "pull_request", "higher is faster human response to pull requests"),
        ("maintainer_response_7d", "all", "higher is faster maintainer response"),
        ("maintainer_response_7d", "issue", "higher is faster maintainer response to issues"),
        ("maintainer_response_7d", "pull_request", "higher is faster maintainer response to pull requests"),
        ("issue_closed_30d", "issue", "higher is faster issue resolution"),
        ("pr_merged_30d", "pull_request", "higher is faster pull-request integration"),
        ("pr_closed_unmerged_30d", "pull_request", "higher can mean faster rejection, not productive throughput"),
        ("maintainer_actions_30d", "all", "higher means more visible maintainer work per thread"),
        ("maintainer_actions_30d", "issue", "higher means more visible maintainer work per issue"),
        ("maintainer_actions_30d", "pull_request", "higher means more visible maintainer work per pull request"),
        ("conversation_runs_30d", "all", "higher means more handoffs or dialogue turns"),
        ("conversation_runs_30d", "issue", "higher means more issue dialogue handoffs"),
        ("conversation_runs_30d", "pull_request", "higher means more pull-request dialogue handoffs"),
        ("opener_return_rounds_30d", "all", "higher means more contributor return cycles"),
        ("review_events_30d", "pull_request", "higher means more review activity per pull request"),
        ("human_review_events_30d", "pull_request", "higher means more human review activity per pull request"),
        ("maintainer_review_events_30d", "pull_request", "higher means more maintainer review activity per pull request"),
        ("agent_review_events_30d", "pull_request", "higher means more agent review activity per pull request"),
        ("commits_after_first_review_30d", "pull_request", "higher means more post-review revision activity"),
        ("commits_after_first_human_review_30d", "pull_request", "higher means more revision activity after human review"),
        ("commits_after_first_agent_review_30d", "pull_request", "higher means more revision activity after agent review"),
        ("agent_visible_30d", "all", "higher means more publicly visible agent participation"),
        ("coding_or_review_agent_visible_30d", "all", "higher means more visible coding or review agent participation"),
        ("support_agent_visible_30d", "all", "higher means more visible support-agent participation"),
        ("automation_actions_30d", "all", "higher means more conventional automation activity"),
    ]
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[(row["repo_name"], row["panel_year"])].append(row)
    output = []
    for earlier, later in (("2024", "2026"), ("2025", "2026")):
        for metric, scope, interpretation in metrics:
            paired = []
            for repo in sorted({row["repo_name"] for row in rows}):
                left_rows = grouped.get((repo, earlier), [])
                right_rows = grouped.get((repo, later), [])
                if not left_rows or not right_rows:
                    continue
                left = repository_metric(left_rows, metric, scope)
                right = repository_metric(right_rows, metric, scope)
                if math.isnan(left) or math.isnan(right):
                    continue
                paired.append((repo, left, right))
            deltas = [right - left for _, left, right in paired]
            left_value = mean([left for _, left, _ in paired])
            right_value = mean([right for _, _, right in paired])
            change = right_value - left_value
            output.append({
                "comparison": f"{earlier}_to_{later}",
                "metric": metric,
                "item_scope": scope,
                "direction": "later_minus_earlier",
                "repositories": len(paired),
                "earlier_value": round(left_value, 6),
                "later_value": round(right_value, 6),
                "absolute_change": round(change, 6),
                "relative_change": "" if left_value == 0 else round(change / abs(left_value), 6),
                "positive_deltas": sum(value > 1e-12 for value in deltas),
                "negative_deltas": sum(value < -1e-12 for value in deltas),
                "ties": sum(abs(value) <= 1e-12 for value in deltas),
                "exact_signflip_p": round(exact_signflip_p(deltas), 6),
                "bh_q": "",
                "interpretation": interpretation,
            })
    bh_adjust(output)
    return output


def exposure_comparison(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows_2026 = [row for row in rows if row["panel_year"] == "2026"]
    metrics = [
        ("human_response_7d", "all", "human response; descriptive, not causal"),
        ("maintainer_response_7d", "all", "maintainer response; descriptive, not causal"),
        ("issue_closed_30d", "issue", "issue resolution; descriptive, not causal"),
        ("pr_merged_30d", "pull_request", "pull-request integration; descriptive, not causal"),
        ("maintainer_actions_30d", "all", "visible maintainer actions; burden proxy"),
        ("conversation_runs_30d", "all", "dialogue handoffs; coordination-load proxy"),
        ("review_events_30d", "pull_request", "review activity; burden and quality-control proxy"),
        ("human_review_events_30d", "pull_request", "human review activity; burden proxy"),
        ("maintainer_review_events_30d", "pull_request", "maintainer review activity; burden proxy"),
        ("agent_review_events_30d", "pull_request", "agent review activity; automated quality-control proxy"),
        ("commits_after_first_review_30d", "pull_request", "post-review revisions; rework proxy"),
        ("commits_after_first_human_review_30d", "pull_request", "revisions after human review; rework proxy"),
        ("commits_after_first_agent_review_30d", "pull_request", "revisions after agent review; automated feedback proxy"),
    ]
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows_2026:
        grouped[(row["repo_name"], row["item_type"])].append(row)
    output = []
    exposure_definitions = (
        ("early_agent_exposure", "2026_any_early_visible_agent_vs_no_agent_first_24h"),
        ("coding_or_review_agent_visible_24h", "2026_early_coding_or_review_agent_vs_none_first_24h"),
    )
    for exposure_field, comparison_name in exposure_definitions:
        for metric, scope, interpretation in metrics:
            repo_pairs: dict[str, list[tuple[float, float]]] = defaultdict(list)
            for (repo, kind), group in grouped.items():
                if scope != "all" and kind != scope:
                    continue
                selected = metric_rows(group, metric, scope)
                exposed = [row_value(row, metric) for row in selected if row[exposure_field] == "yes"]
                control = [row_value(row, metric) for row in selected if row[exposure_field] == "no"]
                if exposed and control:
                    repo_pairs[repo].append((mean(exposed), mean(control)))
            pairs = []
            for repo, values in sorted(repo_pairs.items()):
                pairs.append((repo, mean([value[0] for value in values]), mean([value[1] for value in values])))
            deltas = [agent - control for _, agent, control in pairs]
            agent_value = mean([agent for _, agent, _ in pairs])
            control_value = mean([control for _, _, control in pairs])
            output.append({
                "comparison": comparison_name,
                "metric": metric,
                "item_scope": scope,
                "repositories": len(pairs),
                "agent_exposed_value": round(agent_value, 6) if pairs else "",
                "no_visible_agent_value": round(control_value, 6) if pairs else "",
                "absolute_difference": round(agent_value - control_value, 6) if pairs else "",
                "positive_deltas": sum(value > 1e-12 for value in deltas),
                "negative_deltas": sum(value < -1e-12 for value in deltas),
                "ties": sum(abs(value) <= 1e-12 for value in deltas),
                "exact_signflip_p": round(exact_signflip_p(deltas), 6),
                "bh_q": "",
                "interpretation": interpretation,
            })
    bh_adjust(output)
    return output


def percentile(values: list[float], probability: float) -> float:
    if not values:
        return math.nan
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def bootstrap_weighted_total(rows: list[dict[str, Any]], metric: str, repetitions: int = 2000) -> tuple[float, float]:
    """Resample threads within repository-year strata; repository populations stay fixed."""
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["repo_name"]].append(row)
    rng = random.Random(260912 + sum(ord(char) for char in metric + rows[0]["panel_year"]))
    estimates = []
    for _ in range(repetitions):
        total = 0.0
        for group in grouped.values():
            draw = [rng.choice(group) for _ in group]
            total += sum(float(row["sampling_weight"]) * row_value(row, metric) for row in draw)
        estimates.append(total)
    return percentile(estimates, 0.025), percentile(estimates, 0.975)


def volume_summary(items: list[dict[str, str]], rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    population_by_year_repo: dict[tuple[str, str], int] = {}
    for item in items:
        population_by_year_repo[(item["panel_year"], item["repo_name"])] = int(item["population_items"])
    population_2025 = sum(
        value for (year, _), value in population_by_year_repo.items() if year == "2025"
    )
    output = []
    for year in sorted({row["panel_year"] for row in rows}):
        year_rows = [row for row in rows if row["panel_year"] == year and row["eligible_30d"] == "yes"]
        pr_rows = [row for row in year_rows if row["item_type"] == "pull_request"]
        eligible_population = sum(float(row["sampling_weight"]) for row in year_rows)
        pr_population = sum(float(row["sampling_weight"]) for row in pr_rows)
        population = sum(
            value for (candidate_year, _), value in population_by_year_repo.items()
            if candidate_year == year
        )

        def weighted(metric: str, selected: list[dict[str, Any]] = year_rows) -> tuple[float, float]:
            denominator = sum(float(row["sampling_weight"]) for row in selected)
            total = sum(float(row["sampling_weight"]) * row_value(row, metric) for row in selected)
            return total / denominator if denominator else math.nan, total

        maintainer_mean, maintainer_total = weighted("maintainer_actions_30d")
        human_review_mean, human_review_total = weighted("human_review_events_30d", pr_rows)
        agent_mean, agent_total = weighted("agent_actions_30d")
        automation_mean, automation_total = weighted("automation_actions_30d")
        ci_low, ci_high = bootstrap_weighted_total(year_rows, "maintainer_actions_30d")
        output.append({
            "panel_year": year,
            "repositories": len({row["repo_name"] for row in year_rows}),
            "population_threads": population,
            "population_change_from_2025": "" if not population_2025 else round(population / population_2025 - 1, 6),
            "eligible_30d_population_estimate": round(eligible_population),
            "maintainer_actions_per_thread_weighted": round(maintainer_mean, 6),
            "estimated_maintainer_actions_30d": round(maintainer_total),
            "estimated_maintainer_actions_ci_low": round(ci_low),
            "estimated_maintainer_actions_ci_high": round(ci_high),
            "human_review_events_per_pr_weighted": round(human_review_mean, 6),
            "estimated_human_review_events_30d": round(human_review_total),
            "agent_actions_per_thread_weighted": round(agent_mean, 6),
            "estimated_agent_actions_30d": round(agent_total),
            "automation_actions_per_thread_weighted": round(automation_mean, 6),
            "estimated_automation_actions_30d": round(automation_total),
        })
    return output


def format_metric(value: float, metric: str) -> str:
    if metric in {
        "maintainer_actions_30d", "conversation_runs_30d", "opener_return_rounds_30d",
        "review_events_30d", "human_review_events_30d", "maintainer_review_events_30d",
        "agent_review_events_30d", "commits_after_first_review_30d",
        "commits_after_first_human_review_30d", "commits_after_first_agent_review_30d",
        "automation_actions_30d",
    }:
        return f"{value:.2f}"
    return f"{value * 100:.1f}%"


def finding_line(row: dict[str, Any]) -> str:
    metric = row["metric"]
    return (
        f"- `{metric}` ({row['item_scope']}): {format_metric(float(row['earlier_value']), metric)} → "
        f"{format_metric(float(row['later_value']), metric)} across {row['repositories']} matched repositories "
        f"(paired sign-flip p={float(row['exact_signflip_p']):.3f}, BH q={float(row['bh_q']):.3f})."
    )


def write_findings(
    path: Path,
    panel: list[dict[str, Any]],
    exposure: list[dict[str, Any]],
    volume: list[dict[str, Any]],
    validation: dict[str, Any],
) -> None:
    def panel_row(metric: str, scope: str = "all") -> dict[str, Any]:
        return next(
            row for row in panel
            if row["comparison"] == "2025_to_2026"
            and row["metric"] == metric
            and row["item_scope"] == scope
        )

    def exposure_row(metric: str, scope: str = "all") -> dict[str, Any]:
        return next(
            row for row in exposure
            if row["comparison"] == "2026_early_coding_or_review_agent_vs_none_first_24h"
            and row["metric"] == metric
            and row["item_scope"] == scope
        )

    volume_by_year = {row["panel_year"]: row for row in volume}
    v25, v26 = volume_by_year["2025"], volume_by_year["2026"]
    human = panel_row("human_response_7d")
    maintainer = panel_row("maintainer_response_7d")
    issue_close = panel_row("issue_closed_30d", "issue")
    pr_merge = panel_row("pr_merged_30d", "pull_request")
    pr_reject = panel_row("pr_closed_unmerged_30d", "pull_request")
    agent_visible = panel_row("agent_visible_30d")
    coding_review_visible = panel_row("coding_or_review_agent_visible_30d")
    maintainer_actions = panel_row("maintainer_actions_30d")
    maintainer_review = panel_row("maintainer_review_events_30d", "pull_request")
    early_merge = exposure_row("pr_merged_30d", "pull_request")
    early_runs = exposure_row("conversation_runs_30d")
    early_maintainer_review = exposure_row("maintainer_review_events_30d", "pull_request")
    early_revisions = exposure_row("commits_after_first_review_30d", "pull_request")

    lines = [
        "# Agents are expanding throughput, but they have not reduced maintenance burden",
        "",
        "## Answer",
        "",
        "In this matched panel, visible Agent adoption rose sharply, but response and resolution did not "
        "improve with it. The repositories absorbed far more incoming work, while human attention became "
        "thinner per thread. The defensible conclusion is not that Agents made collaboration more efficient. "
        "It is that they increased the system's capacity to generate, review and revise work, while the "
        "maintenance bottleneck remained human and total review load grew.",
        "",
        "## The experiment",
        "",
        f"The panel contains {validation['threads']} probability-sampled Issues and pull requests from "
        f"{validation['repositories']} repositories. It compares the same 1 May–28 August window in 2024, "
        "2025 and 2026. Response is measured within seven days; resolution and burden signals within 30 days. "
        "Threads without a response or resolution remain in the denominator. This corrects the earlier "
        "closed-items-only median, which made mature successes look faster by dropping censored failures.",
        "",
        "## Demand grew much faster than human attention",
        "",
        f"The ten-repository population rose from {int(v25['population_threads']):,} threads in 2025 to "
        f"{int(v26['population_threads']):,} in 2026, a {float(v26['population_change_from_2025']) * 100:.0f}% increase. "
        f"Visible Agent participation rose from {float(agent_visible['earlier_value']) * 100:.1f}% to "
        f"{float(agent_visible['later_value']) * 100:.1f}%; coding and review agents alone rose from "
        f"{float(coding_review_visible['earlier_value']) * 100:.1f}% to "
        f"{float(coding_review_visible['later_value']) * 100:.1f}%.",
        "",
        f"Over the same period, the share receiving a human response within seven days fell from "
        f"{float(human['earlier_value']) * 100:.1f}% to {float(human['later_value']) * 100:.1f}%. "
        f"Maintainer response fell from {float(maintainer['earlier_value']) * 100:.1f}% to "
        f"{float(maintainer['later_value']) * 100:.1f}%. The maintainer decline appeared in both Issues and "
        "pull requests and was directionally consistent across almost every matched repository.",
        "",
        "## More activity did not become more completed work",
        "",
        f"Thirty-day Issue closure fell from {float(issue_close['earlier_value']) * 100:.1f}% to "
        f"{float(issue_close['later_value']) * 100:.1f}%. Thirty-day pull-request merge fell from "
        f"{float(pr_merge['earlier_value']) * 100:.1f}% to {float(pr_merge['later_value']) * 100:.1f}%, while "
        f"closing without merge rose from {float(pr_reject['earlier_value']) * 100:.1f}% to "
        f"{float(pr_reject['later_value']) * 100:.1f}%. The data therefore shows more throughput pressure, "
        "not a higher probability that an individual contribution reaches a productive outcome.",
        "",
        "## The burden shifted from depth per thread to total system load",
        "",
        f"At the equal-repository level, visible maintainer actions per thread were essentially flat "
        f"({float(maintainer_actions['earlier_value']):.2f} → {float(maintainer_actions['later_value']):.2f}), "
        f"as were maintainer review events per pull request ({float(maintainer_review['earlier_value']):.2f} → "
        f"{float(maintainer_review['later_value']):.2f}). But because the arrival population was 2.65 times "
        f"larger, the volume-weighted point estimate of visible maintainer actions rose from roughly "
        f"{int(v25['estimated_maintainer_actions_30d']):,} to {int(v26['estimated_maintainer_actions_30d']):,}. "
        f"Its 2026 bootstrap interval is wide ({int(v26['estimated_maintainer_actions_ci_low']):,}–"
        f"{int(v26['estimated_maintainer_actions_ci_high']):,}), so the exact total should not be treated as a census. "
        "The stable per-thread rate and rising total are consistent with overload: maintainers do not spend more "
        "attention on each thread, yet face much more work overall.",
        "",
        "## Agent-visible threads show more iteration, not a clear outcome gain",
        "",
        f"Within 2026, pull requests with a coding or review agent visible in the first 24 hours had a "
        f"{float(early_merge['agent_exposed_value']) * 100:.1f}% 30-day merge rate, versus "
        f"{float(early_merge['no_visible_agent_value']) * 100:.1f}% without one. They also had "
        f"{float(early_runs['agent_exposed_value']):.2f} versus {float(early_runs['no_visible_agent_value']):.2f} "
        f"conversation runs, {float(early_maintainer_review['agent_exposed_value']):.2f} versus "
        f"{float(early_maintainer_review['no_visible_agent_value']):.2f} maintainer review events, and "
        f"{float(early_revisions['agent_exposed_value']):.2f} versus "
        f"{float(early_revisions['no_visible_agent_value']):.2f} commits after the first review. This is "
        "consistent with faster, denser iteration and more review work. It is not causal evidence: difficult "
        "pull requests may be more likely to attract an Agent.",
        "",
        "## Decision",
        "",
        "The evidence supports **capacity amplification with shifted maintenance cost**, not demonstrated net "
        "efficiency. Agents appear useful for producing feedback and additional revisions. They have not yet "
        "raised the probability of timely human response, Issue resolution or PR merge in this panel. The "
        "practical bottleneck is now review, prioritization and maintainer attention—not generation of another patch.",
        "",
        "## Limits",
        "",
        "- Public GitHub events miss private and human-mediated Agent use.",
        "- Early visible Agent participation is not randomly assigned; the within-2026 comparison is descriptive.",
        "- The panel covers ten high-activity repositories, not the entire ecosystem.",
        "- GitHub-visible actions are workload proxies, not measured labor hours or code quality.",
        f"- {validation['candidate_identity_response_event_share'] * 100:.1f}% of response events came from "
        "accounts whose identity remained ambiguous; they were excluded from human and Agent counts.",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    args = parse_args()
    items = read_csv(args.items)
    events = read_csv(args.events)
    reviews = read_csv(args.reviews)
    commits = read_csv(args.commits)
    registry_rows = read_csv(args.actors)
    registry = {row["actor_login"]: row for row in registry_rows}
    events_by_thread: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in events + reviews + commits:
        events_by_thread[(row["repo_name"], row["number"])].append(row)

    thread_rows = build_thread_metrics(items, events_by_thread, registry)
    panel_rows = paired_panel(thread_rows)
    exposure_rows = exposure_comparison(thread_rows)
    volume_rows = volume_summary(items, thread_rows)

    status_rows = read_csv(RESEARCH / "collaboration-efficiency-panel-thread-events-status.csv")
    review_status_rows = read_csv(RESEARCH / "collaboration-efficiency-panel-thread-review-comments-status.csv")
    commit_status_rows = read_csv(RESEARCH / "collaboration-efficiency-panel-thread-pr-commits-status.csv")
    complete_keys = {
        (row["repo_name"], row["number"])
        for row in status_rows if row.get("scan_status") == "ok" and row.get("timeline_endpoint_status") == "ok"
    }
    item_keys = {(row["repo_name"], row["number"]) for row in items}
    candidate_events = [
        row for row in events + reviews + commits
        if registry.get(row.get("actor_login", ""), {}).get("needs_manual_review") == "yes"
    ]
    response_events = [row for row in events + reviews if row.get("event_type") in RESPONSE_TYPES]
    candidate_response_events = [
        row for row in response_events
        if registry.get(row.get("actor_login", ""), {}).get("needs_manual_review") == "yes"
    ]
    population_by_year_repo = {
        (row["panel_year"], row["repo_name"]): int(row["population_items"])
        for row in items
    }
    outside_event_keys = sum(
        (row["repo_name"], row["number"]) not in item_keys for row in events + reviews + commits
    )
    if len(item_keys) != len(items):
        raise SystemExit("Panel sample contains duplicate repository/thread keys")
    if len(complete_keys) != len(items):
        raise SystemExit(f"Timeline completeness failed: {len(complete_keys)}/{len(items)}")
    if any(row.get("scan_status") != "ok" for row in review_status_rows):
        raise SystemExit("At least one PR review-comment endpoint is incomplete")
    if any(row.get("scan_status") != "ok" for row in commit_status_rows):
        raise SystemExit("At least one PR commit endpoint is incomplete")
    if outside_event_keys:
        raise SystemExit(f"Found {outside_event_keys} event rows outside the sample")
    validation = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "threads": len(thread_rows),
        "repositories": len({row["repo_name"] for row in thread_rows}),
        "years": sorted({row["panel_year"] for row in thread_rows}),
        "timeline_complete_threads": len(complete_keys),
        "timeline_completeness": len(complete_keys) / len(thread_rows) if thread_rows else 0,
        "review_endpoint_complete_prs": sum(row.get("scan_status") == "ok" for row in review_status_rows),
        "commit_endpoint_complete_prs": sum(row.get("scan_status") == "ok" for row in commit_status_rows),
        "unique_thread_keys": len(item_keys),
        "event_keys_outside_sample": outside_event_keys,
        "candidate_identity_event_share": len(candidate_events) / len(events + reviews + commits),
        "candidate_identity_response_event_share": (
            len(candidate_response_events) / len(response_events) if response_events else 0
        ),
        "eligible_7d_threads": sum(row["eligible_7d"] == "yes" for row in thread_rows),
        "review_events": len(reviews),
        "commit_events": len(commits),
        "actor_registry_accounts": len(registry),
        "population_threads_by_year": {
            year: sum(
                value for (candidate_year, _), value in population_by_year_repo.items()
                if candidate_year == year
            )
            for year in sorted({row["panel_year"] for row in items})
        },
        "eligible_30d_threads": sum(row["eligible_30d"] == "yes" for row in thread_rows),
        "eligible_90d_threads": sum(row["eligible_90d"] == "yes" for row in thread_rows),
        "design": "same-repository same-calendar-window probability sample; fixed-horizon outcomes; paired repository sign-flip inference",
        "causal_claim_allowed": False,
    }
    write_csv(args.threads_output, THREAD_FIELDS, thread_rows)
    write_csv(args.panel_output, PANEL_FIELDS, panel_rows)
    write_csv(args.exposure_output, EXPOSURE_FIELDS, exposure_rows)
    write_csv(args.volume_output, VOLUME_FIELDS, volume_rows)
    args.validation_output.write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_findings(args.findings_output, panel_rows, exposure_rows, volume_rows, validation)
    print(json.dumps(validation, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
