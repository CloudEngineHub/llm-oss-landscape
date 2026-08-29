#!/usr/bin/env python3
"""Stratified bootstrap intervals for the fixed Top-100 thread sample.

The repository set is treated as fixed. Threads are resampled within each
repository, preserving the study's one-stratum-per-repository design. The
intervals therefore describe item-sampling uncertainty inside the frozen
Top-100, not uncertainty about every open-source repository.
"""

from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_INPUT = RESEARCH / "collaboration-thread-analysis-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-thread-estimates-bootstrap-2026.csv"
SEED = 260912


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--iterations", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=SEED)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def percentile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("Cannot calculate a percentile from an empty sample")
    index = (len(ordered) - 1) * probability
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = index - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def weighted_share(rows: list[dict[str, str]], positive: Callable[[dict[str, str]], bool]) -> float | None:
    denominator = sum(float(row["sampling_weight"]) for row in rows)
    if denominator <= 0:
        return None
    numerator = sum(float(row["sampling_weight"]) for row in rows if positive(row))
    return numerator / denominator


def macro_share(rows: list[dict[str, str]], positive: Callable[[dict[str, str]], bool]) -> float | None:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["repo_name"]].append(row)
    shares = [sum(positive(row) for row in values) / len(values) for values in grouped.values() if values]
    return sum(shares) / len(shares) if shares else None


def main() -> None:
    args = parse_args()
    rows = read_csv(args.input)
    if not rows:
        raise SystemExit("Thread analysis is empty")

    metric_specs: list[tuple[str, Callable[[dict[str, str]], bool], Callable[[dict[str, str]], bool], str]] = [
        ("agent_participation_present", lambda r: True, lambda r: r["agent_participation_present"] == "yes", "Verified Agent identity or App-mediated User action visible in thread"),
        ("agent_participation_opened_thread", lambda r: True, lambda r: r["agent_participation_opened_thread"] == "yes", "Verified Agent identity or App-mediated User action is opener"),
        ("agent_participation_response_present", lambda r: True, lambda r: r["agent_participation_response_present"] == "yes", "Verified Agent identity or App-mediated User action responds after opener"),
        ("known_automation_present", lambda r: True, lambda r: r["known_automation_bot_present"] == "yes", "Any confirmed Bot or automation service account visible"),
        ("human_account_response", lambda r: True, lambda r: r["no_human_account_response"] == "no", "GitHub User account responds after opener"),
        ("maintainer_account_response", lambda r: True, lambda r: r["no_maintainer_account_response"] == "no", "Maintainer-associated account responds after opener"),
        ("external_pr_author", lambda r: r["item_type"] == "pull_request", lambda r: r["external_author"] == "yes", "PR opener has external GitHub association"),
        ("pr_review_observed", lambda r: r["item_type"] == "pull_request", lambda r: r["review_observed"] == "yes", "PR has a visible review"),
        ("agent_review_event_present", lambda r: r["item_type"] == "pull_request", lambda r: r["agent_review_event_present"] == "yes", "PR has a visible Agent-attributed review event"),
        ("human_account_review_event_present", lambda r: r["item_type"] == "pull_request", lambda r: r["human_account_review_event_present"] == "yes", "PR has a visible GitHub User review event"),
        ("maintainer_account_review_event_present", lambda r: r["item_type"] == "pull_request", lambda r: r["maintainer_account_review_event_present"] == "yes", "PR has a visible maintainer-associated review event"),
        ("human_account_gate", lambda r: r["outcome"] != "open" and bool(r["gate_actor_login"]), lambda r: r["human_account_gate"] == "yes", "Resolved thread's last visible gate actor is a GitHub User"),
        ("maintainer_account_gate", lambda r: r["outcome"] != "open" and bool(r["gate_actor_login"]), lambda r: r["maintainer_account_gate"] == "yes", "Resolved thread's last visible gate actor is maintainer-associated"),
        ("agent_gate", lambda r: r["outcome"] != "open" and bool(r["gate_actor_login"]), lambda r: r["agent_gate"] == "yes", "Resolved thread's last visible gate action has verified Agent participation"),
        ("reviewed_pr_post_review_commit", lambda r: r["item_type"] == "pull_request" and r["review_observed"] == "yes", lambda r: r["post_review_commit_observed"] == "yes", "Reviewed PR adds a later commit"),
        ("change_request_followup_commit", lambda r: r["item_type"] == "pull_request" and r["change_request_observed"] == "yes", lambda r: r["change_request_followed_by_commit"] == "yes", "Change request is followed by a commit"),
        ("fixed_maturity_open", lambda r: r["fixed_maturity_eligible"] == "yes", lambda r: r["outcome"] == "open", "Jan-May item remains open at collection"),
        ("external_pr_github_merge_flag", lambda r: r["item_type"] == "pull_request" and r["fixed_maturity_eligible"] == "yes" and r["external_author"] == "yes" and r["outcome"] != "open", lambda r: r["outcome"] == "merged", "Resolved external PR has GitHub merged flag"),
        ("internal_pr_github_merge_flag", lambda r: r["item_type"] == "pull_request" and r["fixed_maturity_eligible"] == "yes" and r["external_author"] == "no" and r["outcome"] != "open", lambda r: r["outcome"] == "merged", "Resolved maintainer/member PR has GitHub merged flag"),
    ]

    rng = random.Random(args.seed)
    by_repo: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_repo[row["repo_name"]].append(row)

    output: list[dict[str, Any]] = []
    for metric, eligible, positive, interpretation in metric_specs:
        eligible_rows = [row for row in rows if eligible(row)]
        eligible_by_repo: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in eligible_rows:
            eligible_by_repo[row["repo_name"]].append(row)
        if not eligible_rows:
            continue

        bootstrap_weighted: list[float] = []
        bootstrap_macro: list[float] = []
        for _ in range(args.iterations):
            sampled: list[dict[str, str]] = []
            for repo_rows in eligible_by_repo.values():
                sampled.extend(rng.choice(repo_rows) for _ in range(len(repo_rows)))
            weighted = weighted_share(sampled, positive)
            macro = macro_share(sampled, positive)
            if weighted is not None:
                bootstrap_weighted.append(weighted)
            if macro is not None:
                bootstrap_macro.append(macro)

        for view, point, distribution in (
            ("population_weighted", weighted_share(eligible_rows, positive), bootstrap_weighted),
            ("equal_repository", macro_share(eligible_rows, positive), bootstrap_macro),
        ):
            output.append(
                {
                    "metric": metric,
                    "view": view,
                    "point_estimate": round(point or 0, 6),
                    "ci_low_95": round(percentile(distribution, 0.025), 6),
                    "ci_high_95": round(percentile(distribution, 0.975), 6),
                    "eligible_threads": len(eligible_rows),
                    "eligible_repositories": len(eligible_by_repo),
                    "bootstrap_iterations": args.iterations,
                    "seed": args.seed,
                    "interpretation": interpretation,
                }
            )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        fields = [
            "metric", "view", "point_estimate", "ci_low_95", "ci_high_95",
            "eligible_threads", "eligible_repositories", "bootstrap_iterations", "seed", "interpretation",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output)
    print(f"Wrote {len(output)} estimates to {args.output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
