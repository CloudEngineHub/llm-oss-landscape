#!/usr/bin/env python3
"""Bound Agent-participation estimates under actor-role ambiguity."""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_ITEMS = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_EVENTS = RESEARCH / "collaboration-thread-events-2026.csv"
DEFAULT_REVIEW_EVENTS = RESEARCH / "collaboration-thread-review-comments-2026.csv"
DEFAULT_COMMIT_EVENTS = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_ACTORS = RESEARCH / "collaboration-actor-registry-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-agent-participation-sensitivity-2026.csv"
DEFAULT_CANDIDATES = RESEARCH / "collaboration-agentlike-unknown-actors-2026.csv"
STRICT_ROLES = {"coding_agent", "review_agent", "security_review_agent", "support_agent", "agent_mediated_user"}
AGENTLIKE = re.compile(
    r"(?:^|[-_])(ai|agent|assistant|review|swe|coder?|codex|claude|cursor|gemini|"
    r"copilot|gitar|qodo|qoder|meticulous|macroscope|cline)(?:$|[-_\[])|"
    r"(?:pr-review|code-review|autofix|factory)",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    parser.add_argument(
        "--extra-events",
        type=Path,
        action="append",
        default=None,
    )
    parser.add_argument("--actors", type=Path, default=DEFAULT_ACTORS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--candidates", type=Path, default=DEFAULT_CANDIDATES)
    args = parser.parse_args()
    if args.extra_events is None:
        args.extra_events = [DEFAULT_REVIEW_EVENTS, DEFAULT_COMMIT_EVENTS]
    return args


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
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


def main() -> None:
    args = parse_args()
    items = read_csv(args.items)
    events = read_csv(args.events)
    for path in args.extra_events:
        events.extend(read_csv(path))
    actors = {row["actor_login"]: row for row in read_csv(args.actors)}

    strict = {login for login, row in actors.items() if row.get("automation_role") in STRICT_ROLES}
    candidate_rows = [
        row for row in actors.values()
        if row.get("automation_role") == "unknown_automation"
        and AGENTLIKE.search(f"{row['actor_login']} {row.get('performed_via_apps', '')}")
    ]
    candidates = {row["actor_login"] for row in candidate_rows}
    write_csv(
        args.candidates,
        [
            {
                "actor_login": row["actor_login"],
                "github_types": row["github_types"],
                "repository_count": row["repository_count"],
                "thread_count": row["thread_count"],
                "performed_via_apps": row["performed_via_apps"],
                "reason": "Agent-like Bot/App identity without manually confirmed function",
            }
            for row in sorted(candidate_rows, key=lambda value: int(value["thread_count"]), reverse=True)
        ],
    )

    actors_by_thread: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in items:
        if row.get("author_login"):
            actors_by_thread[(row["repo_name"], row["number"])].add(row["author_login"])
    for row in events:
        if row.get("actor_login"):
            actors_by_thread[(row["repo_name"], row["number"])].add(row["actor_login"])

    output = []
    for scenario, identities in (
        ("strict_verified", strict),
        ("expanded_agentlike_bot_upper_bound", strict | candidates),
    ):
        positives = []
        opener_positives = []
        per_repo: dict[str, list[bool]] = defaultdict(list)
        for row in items:
            present = bool(actors_by_thread[(row["repo_name"], row["number"])] & identities)
            per_repo[row["repo_name"]].append(present)
            if present:
                positives.append(row)
            if row.get("author_login") in identities:
                opener_positives.append(row)
        total_weight = sum(float(row["sampling_weight"]) for row in items)
        positive_weight = sum(float(row["sampling_weight"]) for row in positives)
        opener_weight = sum(float(row["sampling_weight"]) for row in opener_positives)
        macro = sum(sum(values) / len(values) for values in per_repo.values()) / len(per_repo)
        output.append(
            {
                "scenario": scenario,
                "actor_identities": len(identities),
                "candidate_identities_added": 0 if scenario == "strict_verified" else len(candidates),
                "threads_with_participation": len(positives),
                "weighted_thread_share": round(positive_weight / total_weight, 6),
                "equal_repository_thread_share": round(macro, 6),
                "repositories_with_observed_participation": sum(any(values) for values in per_repo.values()),
                "opener_threads": len(opener_positives),
                "weighted_opener_share": round(opener_weight / total_weight, 6),
            }
        )
    write_csv(args.output, output)
    print(output)


if __name__ == "__main__":
    main()
