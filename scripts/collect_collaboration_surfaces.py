#!/usr/bin/env python3
"""Refresh current Issue, PR, Discussion, and contribution-policy surfaces."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import (
    GitHubClient,
    direct_network_setup,
    probe_pull_surface,
)


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-surfaces-top100-260829.csv"
DEFAULT_RUN = RESEARCH / "collaboration-surfaces-run-260829.json"
POLICY_PATHS = (
    "CONTRIBUTING.md",
    "contributing.md",
    ".github/CONTRIBUTING.md",
    ".github/contributing.md",
    "docs/CONTRIBUTING.md",
    "docs/contributing.md",
    "GOVERNANCE.md",
    ".github/ISSUE_TEMPLATE",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/pull_request_template.md",
    "PULL_REQUEST_TEMPLATE.md",
)
RESTRICTION_TERMS = (
    "not accepting pull requests",
    "do not submit pull requests",
    "pull requests are not accepted",
    "we don't accept pull requests",
    "we do not accept pull requests",
    "external pull requests are not accepted",
)
INVITATION_TERMS = (
    "pull requests are welcome",
    "we welcome contributions",
    "contributions are welcome",
    "submit a pull request",
    "open a pull request",
)

OUTPUT_FIELDS = [
    "sample_rank",
    "repo_name",
    "snapshot_at",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "archived",
    "is_fork",
    "default_branch",
    "default_branch_commit",
    "has_issues",
    "has_discussions",
    "has_pull_requests",
    "pull_request_creation_policy",
    "pull_request_creation_access",
    "pull_endpoint_status",
    "pull_endpoint_checks",
    "pull_surface_observed",
    "contributing_paths",
    "governance_paths",
    "issue_template_paths",
    "pull_request_template_paths",
    "contribution_policy_signal",
    "contribution_policy_evidence",
    "scan_status",
    "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=OUTPUT_FIELDS,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


def repository_metadata(client: GitHubClient, repo: str) -> dict[str, Any]:
    owner, name = repo.split("/", 1)
    query = """
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        isArchived
        isFork
        hasIssuesEnabled
        hasDiscussionsEnabled
        hasPullRequestsEnabled
        pullRequestCreationPolicy
        defaultBranchRef {
          name
          target { ... on Commit { oid } }
        }
      }
    }
    """
    return client.graphql(query, {"owner": owner, "name": name})["repository"]


def pull_request_creation_access(metadata: dict[str, Any]) -> str:
    if not metadata.get("hasPullRequestsEnabled"):
        return "disabled"
    policy = metadata.get("pullRequestCreationPolicy")
    if policy == "COLLABORATORS_ONLY":
        return "collaborators_only"
    if policy == "ALL":
        return "anyone_can_create"
    return "unknown"


def policy_objects(
    client: GitHubClient, repo: str, commit_sha: str
) -> dict[str, dict[str, Any] | None]:
    owner, name = repo.split("/", 1)
    aliases: dict[str, str] = {}
    fields = []
    for index, path in enumerate(POLICY_PATHS):
        alias = f"p{index}"
        aliases[alias] = path
        expression = json.dumps(f"{commit_sha}:{path}")
        fields.append(
            f"{alias}: object(expression: {expression}) {{ "
            "__typename ... on Blob { oid byteSize text } ... on Tree { oid } }"
        )
    query = f"""
    query($owner: String!, $name: String!) {{
      repository(owner: $owner, name: $name) {{ {' '.join(fields)} }}
    }}
    """
    objects = client.graphql(query, {"owner": owner, "name": name})["repository"]
    return {aliases[alias]: objects.get(alias) for alias in aliases}


def classify_policy(
    objects: dict[str, dict[str, Any] | None]
) -> tuple[str, str]:
    candidates = []
    invitations = []
    for path, item in objects.items():
        if not item or item.get("__typename") != "Blob":
            continue
        text = item.get("text") or ""
        lowered = text.lower()
        for term in RESTRICTION_TERMS:
            if term in lowered:
                candidates.append(f"{path}: {term}")
        for term in INVITATION_TERMS:
            if term in lowered:
                invitations.append(f"{path}: {term}")
    if candidates:
        return "restriction_candidate", " | ".join(candidates[:3])
    if invitations:
        return "explicit_invitation", " | ".join(invitations[:3])
    return "no_explicit_signal", ""


def main() -> None:
    args = parse_args()
    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 sample repositories, found {len(sample)}")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    rows = [] if args.fresh else read_csv(args.output)
    completed = {row["repo_name"] for row in rows if row.get("scan_status") == "ok"}
    started_at = datetime.now(UTC).isoformat()
    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/100] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/100] {repo}", flush=True)
        base = {
            "sample_rank": sample_row["sample_rank"],
            "repo_name": repo,
            "snapshot_at": datetime.now(UTC).isoformat(),
            "llm_native_manual": sample_row["llm_native_manual"],
            "collaboration_niche": sample_row["collaboration_niche"],
            "agent_proximity": sample_row["agent_proximity"],
        }
        try:
            metadata = repository_metadata(client, repo)
            branch = metadata.get("defaultBranchRef")
            if not branch:
                raise RuntimeError("Repository has no default branch")
            objects = policy_objects(client, repo, branch["target"]["oid"])
            pull_status, pull_checks, pull_observed = probe_pull_surface(
                client, repo
            )
            existing_paths = [path for path, item in objects.items() if item]
            policy_signal, policy_evidence = classify_policy(objects)
            rows.append(
                {
                    **base,
                    "archived": str(bool(metadata["isArchived"])).lower(),
                    "is_fork": str(bool(metadata["isFork"])).lower(),
                    "default_branch": branch["name"],
                    "default_branch_commit": branch["target"]["oid"],
                    "has_issues": str(bool(metadata["hasIssuesEnabled"])).lower(),
                    "has_discussions": str(
                        bool(metadata["hasDiscussionsEnabled"])
                    ).lower(),
                    "has_pull_requests": str(
                        bool(metadata["hasPullRequestsEnabled"])
                    ).lower(),
                    "pull_request_creation_policy": metadata.get(
                        "pullRequestCreationPolicy"
                    ) or "",
                    "pull_request_creation_access": pull_request_creation_access(
                        metadata
                    ),
                    "pull_endpoint_status": pull_status,
                    "pull_endpoint_checks": pull_checks,
                    "pull_surface_observed": pull_observed,
                    "contributing_paths": "|".join(
                        path
                        for path in existing_paths
                        if "contributing" in path.lower()
                    ),
                    "governance_paths": "|".join(
                        path
                        for path in existing_paths
                        if "governance" in path.lower()
                    ),
                    "issue_template_paths": "|".join(
                        path for path in existing_paths if "issue_template" in path.lower()
                    ),
                    "pull_request_template_paths": "|".join(
                        path
                        for path in existing_paths
                        if "pull_request_template" in path.lower()
                    ),
                    "contribution_policy_signal": policy_signal,
                    "contribution_policy_evidence": policy_evidence,
                    "scan_status": "ok",
                    "error": "",
                }
            )
        except Exception as exc:
            rows.append({**base, "scan_status": "error", "error": str(exc)[:500]})
        write_csv(args.output, rows)

    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(sample),
        "rows": len(rows),
        "errors": sum(row.get("scan_status") == "error" for row in rows),
        "http_requests": client.requests,
        "core_rate_limit": rate.get("core"),
        "outputs": [str(args.output.relative_to(ROOT))],
        "limitations": [
            "hasPullRequestsEnabled and pullRequestCreationPolicy are direct repository settings and are the primary evidence for who can create PRs.",
            "The pulls endpoint remains a diagnostic only and must not replace pullRequestCreationPolicy.",
            "A creation policy of ALL proves that an external user can create a PR; it does not prove maintainers will accept or merge it.",
            "Contribution policy signals use an explicit phrase list and remain review candidates rather than final policy labels.",
            "The path scan covers common contribution and template locations and may miss project-specific documentation paths.",
        ],
    }
    args.run_output.write_text(
        json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
