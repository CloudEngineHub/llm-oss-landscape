#!/usr/bin/env python3
"""Scan annual Git trees for public development-agent instructions and configs."""

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
    RESIDUAL_TERMS,
    direct_network_setup,
    infer_tasks,
)


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-agent-markers-2022-2026-summary.csv"
DEFAULT_EVIDENCE = RESEARCH / "collaboration-agent-markers-2022-2026-evidence.csv"
DEFAULT_RUN = RESEARCH / "collaboration-agent-markers-run-260831.json"
DEFAULT_SNAPSHOTS = (
    "2022-12-31",
    "2023-12-31",
    "2024-12-31",
    "2025-12-31",
    "2026-08-31",
)

INSTRUCTION_PATHS = {
    "AGENTS.md": "cross_agent",
    "agents.md": "cross_agent",
    "CLAUDE.md": "claude_code",
    "claude.md": "claude_code",
    "GEMINI.md": "gemini",
    "gemini.md": "gemini",
    ".cursorrules": "cursor",
    ".windsurfrules": "windsurf",
    ".github/copilot-instructions.md": "github_copilot",
}
INSTRUCTION_DIRS = {
    ".cursor/rules": "cursor",
    ".github/instructions": "github_copilot",
}
CONFIG_PATHS = {
    ".agent": "cross_agent",
    ".agents": "cross_agent",
    ".claude": "claude_code",
    ".cline": "cline",
    ".codex": "codex",
    ".continue": "continue",
    ".cursor": "cursor",
    ".gemini": "gemini",
    ".roo": "roo_code",
    ".windsurf": "windsurf",
}
TARGET_PATHS = tuple(
    dict.fromkeys(
        [*INSTRUCTION_PATHS, *INSTRUCTION_DIRS, *CONFIG_PATHS, ".gitignore"]
    )
)


SUMMARY_FIELDS = [
    "sample_rank",
    "repo_name",
    "snapshot_date",
    "year",
    "created_at",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "history_available",
    "scan_status",
    "error",
    "default_branch",
    "commit_sha",
    "commit_date",
    "tree_sha",
    "tree_entries",
    "tree_truncated",
    "active_instruction_count",
    "active_config_count",
    "residual_mention_count",
    "has_active_instruction",
    "has_any_active_marker",
    "distinct_active_tools",
    "distinct_residual_tools",
]

EVIDENCE_FIELDS = [
    "sample_rank",
    "repo_name",
    "snapshot_date",
    "year",
    "llm_native_manual",
    "collaboration_niche",
    "commit_sha",
    "marker_tool",
    "evidence_level",
    "marker_path",
    "blob_sha",
    "size_bytes",
    "tasks",
    "content_read",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument(
        "--snapshots",
        default=",".join(DEFAULT_SNAPSHOTS),
        help="Comma-separated ISO snapshot dates (YYYY-MM-DD).",
    )
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def parse_snapshots(raw: str) -> tuple[str, ...]:
    snapshots = tuple(dict.fromkeys(item.strip() for item in raw.split(",") if item.strip()))
    if not snapshots:
        raise SystemExit("At least one snapshot date is required")
    for snapshot in snapshots:
        try:
            datetime.strptime(snapshot, "%Y-%m-%d")
        except ValueError as exc:
            raise SystemExit(f"Invalid snapshot date: {snapshot}") from exc
    return snapshots


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fields,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


def deduplicate_rows(
    rows: list[dict[str, str]], key_fields: tuple[str, ...]
) -> list[dict[str, str]]:
    indexed: dict[tuple[str, ...], dict[str, str]] = {}
    for row in rows:
        indexed[tuple(row.get(field, "") for field in key_fields)] = row
    return list(indexed.values())


def structural_missing(row: dict[str, str], snapshot: str) -> dict[str, Any]:
    return {
        "sample_rank": row["sample_rank"],
        "repo_name": row["repo_name"],
        "snapshot_date": snapshot,
        "year": snapshot[:4],
        "created_at": row["created_at"],
        "llm_native_manual": row["llm_native_manual"],
        "collaboration_niche": row["collaboration_niche"],
        "agent_proximity": row["agent_proximity"],
        "history_available": "not_public_yet",
        "scan_status": "structural_missing",
        "error": "",
        "has_active_instruction": "",
        "has_any_active_marker": "",
    }


def enrich_summary(
    row: dict[str, str],
    snapshot: str,
    default_branch: str,
    summary: dict[str, Any],
) -> dict[str, Any]:
    instruction_count = int(summary.get("active_instruction_count") or 0)
    config_count = int(summary.get("active_config_count") or 0)
    return {
        **summary,
        "sample_rank": row["sample_rank"],
        "repo_name": row["repo_name"],
        "snapshot_date": snapshot,
        "year": snapshot[:4],
        "created_at": row["created_at"],
        "llm_native_manual": row["llm_native_manual"],
        "collaboration_niche": row["collaboration_niche"],
        "agent_proximity": row["agent_proximity"],
        "scan_status": "ok",
        "error": "",
        "default_branch": default_branch,
        "has_active_instruction": "yes" if instruction_count else "no",
        "has_any_active_marker": (
            "yes" if instruction_count + config_count else "no"
        ),
    }


def enrich_evidence(
    row: dict[str, str], snapshot: str, evidence: dict[str, Any]
) -> dict[str, Any]:
    return {
        **evidence,
        "sample_rank": row["sample_rank"],
        "repo_name": row["repo_name"],
        "snapshot_date": snapshot,
        "year": snapshot[:4],
        "llm_native_manual": row["llm_native_manual"],
        "collaboration_niche": row["collaboration_niche"],
    }


def snapshot_commits(
    client: GitHubClient, repo: str, snapshots: tuple[str, ...]
) -> tuple[str, dict[str, dict[str, str] | None]]:
    owner, name = repo.split("/", 1)
    history_fields = []
    for index, snapshot in enumerate(snapshots):
        cutoff = f"{snapshot}T23:59:59Z"
        history_fields.append(
            f's{index}: history(first: 1, until: "{cutoff}") '
            "{ nodes { oid committedDate } }"
        )
    query = f"""
    query($owner: String!, $name: String!) {{
      repository(owner: $owner, name: $name) {{
        defaultBranchRef {{
          name
          target {{
            ... on Commit {{
              {' '.join(history_fields)}
            }}
          }}
        }}
      }}
    }}
    """
    repository = client.graphql(
        query, {"owner": owner, "name": name}
    )["repository"]
    branch = repository["defaultBranchRef"]
    if not branch:
        raise RuntimeError("Repository has no default branch")
    target = branch["target"]
    commits: dict[str, dict[str, str] | None] = {}
    for index, snapshot in enumerate(snapshots):
        nodes = target[f"s{index}"]["nodes"]
        commits[snapshot] = nodes[0] if nodes else None
    return branch["name"], commits


def scan_target_paths(
    client: GitHubClient,
    repo: str,
    commits: dict[str, dict[str, str] | None],
    snapshots: tuple[str, ...],
) -> dict[tuple[str, str], dict[str, Any] | None]:
    owner, name = repo.split("/", 1)
    fields = []
    aliases: dict[str, tuple[str, str]] = {}
    for snapshot_index, snapshot in enumerate(snapshots):
        commit = commits.get(snapshot)
        if not commit:
            continue
        for path_index, path in enumerate(TARGET_PATHS):
            alias = f"s{snapshot_index}p{path_index}"
            aliases[alias] = (snapshot, path)
            expression = json.dumps(f"{commit['oid']}:{path}")
            fields.append(
                f"{alias}: object(expression: {expression}) {{ "
                "__typename "
                "... on Blob { oid byteSize text } "
                "... on Tree { oid } "
                "}"
            )
    if not fields:
        return {}
    query = f"""
    query($owner: String!, $name: String!) {{
      repository(owner: $owner, name: $name) {{
        {' '.join(fields)}
      }}
    }}
    """
    objects = client.graphql(
        query, {"owner": owner, "name": name}
    )["repository"]
    return {aliases[alias]: objects.get(alias) for alias in aliases}


def marker_evidence(
    row: dict[str, str],
    snapshot: str,
    commit_sha: str,
    objects: dict[tuple[str, str], dict[str, Any] | None],
) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for path in TARGET_PATHS:
        item = objects.get((snapshot, path))
        if not item:
            continue
        if path == ".gitignore":
            content = item.get("text") or ""
            lowered = content.lower()
            for tool, terms in RESIDUAL_TERMS.items():
                if any(term in lowered for term in terms):
                    evidence.append(
                        {
                            "commit_sha": commit_sha,
                            "marker_tool": tool,
                            "evidence_level": "residual_gitignore",
                            "marker_path": path,
                            "blob_sha": item.get("oid", ""),
                            "size_bytes": item.get("byteSize", ""),
                            "tasks": "",
                            "content_read": "yes",
                        }
                    )
            continue

        if path in INSTRUCTION_PATHS:
            tool = INSTRUCTION_PATHS[path]
            level = "active_instruction"
        elif path in INSTRUCTION_DIRS:
            tool = INSTRUCTION_DIRS[path]
            level = "active_instruction"
        else:
            tool = CONFIG_PATHS[path]
            level = "active_config"
        content = item.get("text") or ""
        if path.lower() in {"agents.md", "agent.md"} and "codex" in content.lower():
            tool = "codex"
        evidence.append(
            {
                "commit_sha": commit_sha,
                "marker_tool": tool,
                "evidence_level": level,
                "marker_path": path,
                "blob_sha": item.get("oid", ""),
                "size_bytes": item.get("byteSize", ""),
                "tasks": infer_tasks(content),
                "content_read": "yes" if item.get("__typename") == "Blob" else "no",
            }
        )
    return evidence


def targeted_summary(
    row: dict[str, str],
    snapshot: str,
    default_branch: str,
    commit: dict[str, str] | None,
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    if commit is None:
        return {
            **structural_missing(row, snapshot),
            "history_available": "no_commit_before_snapshot",
            "scan_status": "no_history",
            "default_branch": default_branch,
        }
    active = [
        item for item in evidence if item["evidence_level"] != "residual_gitignore"
    ]
    instructions = [
        item for item in active if item["evidence_level"] == "active_instruction"
    ]
    configs = [
        item for item in active if item["evidence_level"] == "active_config"
    ]
    residual = [
        item for item in evidence if item["evidence_level"] == "residual_gitignore"
    ]
    return {
        "sample_rank": row["sample_rank"],
        "repo_name": row["repo_name"],
        "snapshot_date": snapshot,
        "year": snapshot[:4],
        "created_at": row["created_at"],
        "llm_native_manual": row["llm_native_manual"],
        "collaboration_niche": row["collaboration_niche"],
        "agent_proximity": row["agent_proximity"],
        "history_available": "yes",
        "scan_status": "targeted_paths_ok",
        "error": "",
        "default_branch": default_branch,
        "commit_sha": commit["oid"],
        "commit_date": commit["committedDate"],
        "tree_sha": "",
        "tree_entries": "",
        "tree_truncated": "not_applicable_targeted_scan",
        "active_instruction_count": len(instructions),
        "active_config_count": len(configs),
        "residual_mention_count": len(residual),
        "has_active_instruction": "yes" if instructions else "no",
        "has_any_active_marker": "yes" if active else "no",
        "distinct_active_tools": "|".join(
            sorted({item["marker_tool"] for item in active})
        ),
        "distinct_residual_tools": "|".join(
            sorted({item["marker_tool"] for item in residual})
        ),
    }


def main() -> None:
    args = parse_args()
    snapshots = parse_snapshots(args.snapshots)
    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 repositories, found {len(sample)}")
    if any(not row.get("llm_native_manual") for row in sample):
        raise SystemExit("LLM-native classification is incomplete")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")

    client = GitHubClient(token)
    summaries = [] if args.fresh else deduplicate_rows(
        read_csv(args.summary), ("repo_name", "snapshot_date")
    )
    evidence_rows = [] if args.fresh else deduplicate_rows(
        read_csv(args.evidence),
        (
            "repo_name",
            "snapshot_date",
            "commit_sha",
            "marker_tool",
            "evidence_level",
            "marker_path",
        ),
    )
    completed = {
        (row["repo_name"], row["snapshot_date"])
        for row in summaries
        if row.get("scan_status")
        in {"ok", "targeted_paths_ok", "structural_missing", "no_history"}
    }
    started_at = datetime.now(UTC).isoformat()

    for index, row in enumerate(sample, start=1):
        repo = row["repo_name"]
        pending = [
            snapshot
            for snapshot in snapshots
            if (repo, snapshot) not in completed
        ]
        if not pending:
            print(f"[{index}/100] {repo} (checkpoint)", flush=True)
            continue

        print(f"[{index}/100] {repo}", flush=True)
        try:
            default_branch, commits = snapshot_commits(client, repo, snapshots)
            objects = scan_target_paths(client, repo, commits, snapshots)
            for snapshot in pending:
                if row["created_at"] > snapshot:
                    summaries.append(structural_missing(row, snapshot))
                    continue
                commit = commits.get(snapshot)
                evidence = marker_evidence(
                    row,
                    snapshot,
                    commit["oid"] if commit else "",
                    objects,
                )
                summaries.append(
                    targeted_summary(
                        row,
                        snapshot,
                        default_branch,
                        commit,
                        evidence,
                    )
                )
                evidence_rows.extend(
                    enrich_evidence(row, snapshot, item) for item in evidence
                )
        except Exception as exc:  # keep the panel auditable and resumable
            for snapshot in pending:
                summaries.append(
                    {
                        **structural_missing(row, snapshot),
                        "history_available": "unknown",
                        "scan_status": "error",
                        "error": str(exc)[:500],
                        "default_branch": "",
                    }
                )
        write_csv(args.summary, SUMMARY_FIELDS, summaries)
        write_csv(args.evidence, EVIDENCE_FIELDS, evidence_rows)

    rate = client.get("/rate_limit").json()["resources"]
    write_csv(args.summary, SUMMARY_FIELDS, summaries)
    write_csv(args.evidence, EVIDENCE_FIELDS, evidence_rows)
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "sample": str(args.sample.relative_to(ROOT)),
        "snapshots": list(snapshots),
        "repositories": len(sample),
        "summary_rows": len(summaries),
        "evidence_rows": len(evidence_rows),
        "scan_errors": sum(row.get("scan_status") == "error" for row in summaries),
        "truncated_trees": 0,
        "http_requests": client.requests,
        "core_rate_limit": rate.get("core"),
        "limitations": [
            "A public instruction or config proves repository preparation for agents; it does not prove use in a specific Issue or PR.",
            "The scan observes the latest commit at or before each snapshot date on the current default branch.",
            "The full-sample scan checks a declared set of root and .github instruction/config paths instead of downloading every recursive Git tree.",
            "Structural missing years are not treated as zero adoption.",
            "Residual .gitignore mentions are excluded from strict adoption rates.",
        ],
    }
    args.run_output.write_text(
        json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
