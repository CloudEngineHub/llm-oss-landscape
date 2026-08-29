#!/usr/bin/env python3
"""Apply documented human review to contribution-policy phrase candidates."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
SUMMARY = RESEARCH / "collaboration-contribution-policies-260829.csv"
EVIDENCE = RESEARCH / "collaboration-contribution-policy-evidence-260829.csv"
OUTPUT = RESEARCH / "collaboration-contribution-policies-reviewed-260829.csv"
SURFACES = RESEARCH / "collaboration-surfaces-top100-260829.csv"


OVERRIDES = {
    "volcengine/OpenViking": ("conditional_gate", "public interfaces and persisted behavior", "Discussion is requested before changes affecting public semantics."),
    "mastra-ai/mastra": ("issue_first", "code contributions", "The README asks code contributors to discuss an Issue before a PR."),
    "pydantic/pydantic-ai": ("conditional_gate", "ambiguous bug fixes", "Well-scoped bugs need no Issue; ambiguous fixes should open one first."),
    "google-gemini/gemini-cli": ("conditional_restriction", "maintainers-only Issues", "The rejection applies to Issues explicitly reserved for maintainers, not all external PRs."),
    "omnigent-ai/omnigent": ("conditional_gate", "larger changes", "Issues and PRs are welcomed; larger changes should be discussed first."),
    "CopilotKit/CopilotKit": ("issue_first", "planned code changes", "The contribution guide and PR template ask contributors to file an Issue first."),
    "farion1231/cc-switch": ("conditional_gate", "new features", "New features require an Issue first; this is not a blanket PR closure."),
    "marimo-team/marimo": ("conditional_gate", "substantial changes", "The guide recommends early consensus before substantial changes."),
    "Arize-ai/phoenix": ("conditional_gate", "non-trivial changes", "Non-trivial changes should open an Issue first."),
    "aaif-goose/goose": ("conditional_gate", "significant architecture changes", "Significant architectural changes require prior discussion."),
    "open-webui/open-webui": ("issue_first", "first-time contributors and non-localization changes", "The PR template directs first-time contributors to start with an Issue; it does not close all PRs."),
    "livekit/agents": ("conditional_gate", "new features", "New features should be discussed for viability and scope before work."),
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    summary = read_csv(SUMMARY)
    evidence = read_csv(EVIDENCE)
    surfaces = {row["repo_name"]: row for row in read_csv(SURFACES)}
    evidence_by_repo: dict[str, list[dict[str, str]]] = {}
    for row in evidence:
        evidence_by_repo.setdefault(row["repo_name"], []).append(row)

    output: list[dict[str, Any]] = []
    for row in summary:
        repo = row["repo_name"]
        automated = row["policy_class"]
        surface = surfaces.get(repo, {})
        has_pull_requests = surface.get("has_pull_requests", "")
        creation_policy = surface.get("pull_request_creation_policy", "")
        access_class = surface.get("pull_request_creation_access", "unknown")
        if has_pull_requests == "false":
            final_class = "pull_requests_disabled"
            scope = "pull request creation"
            note = "GitHub hasPullRequestsEnabled is false."
            selected = {}
            review_status = "api_setting"
        elif creation_policy == "COLLABORATORS_ONLY":
            final_class = "collaborators_only"
            scope = "pull request creation"
            note = "GitHub pullRequestCreationPolicy is COLLABORATORS_ONLY."
            selected = {}
            review_status = "api_setting"
        elif repo in OVERRIDES:
            final_class, scope, note = OVERRIDES[repo]
            candidates = [
                item for item in evidence_by_repo.get(repo, [])
                if item["signal"] in {"closed_to_external_pr", "preapproval_or_issue_first"}
            ]
            selected = candidates[0] if candidates else {}
            review_status = "manually_reviewed"
        else:
            final_class = {
                "inviting_candidate": "explicit_invitation",
                "undetermined": "no_detected_policy_signal",
            }.get(automated, "unreviewed_candidate")
            scope = ""
            note = "No restrictive candidate required manual review."
            selected = {}
            review_status = "automatic_nonrestrictive"
        output.append(
            {
                "sample_rank": row["sample_rank"],
                "repo_name": repo,
                "automated_policy_class": automated,
                "has_pull_requests": has_pull_requests,
                "pull_request_creation_policy": creation_policy,
                "pull_request_creation_access": access_class,
                "final_policy_class": final_class,
                "gating_scope": scope,
                "manual_review_status": review_status,
                "review_note": note,
                "evidence_url": selected.get("html_url", ""),
                "evidence_context": selected.get("context", ""),
                "evidence_grade": (
                    "A_api_setting"
                    if review_status == "api_setting"
                    else "B_declared_policy"
                    if selected
                    else "B_scan_no_restrictive_match"
                ),
            }
        )

    unresolved = [row for row in output if row["final_policy_class"] == "unreviewed_candidate"]
    if unresolved:
        raise SystemExit(f"Unreviewed policy candidates remain: {[row['repo_name'] for row in unresolved]}")
    fields = list(output[0])
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output)
    counts: dict[str, int] = {}
    for row in output:
        counts[row["final_policy_class"]] = counts.get(row["final_policy_class"], 0) + 1
    print(counts)


if __name__ == "__main__":
    main()
