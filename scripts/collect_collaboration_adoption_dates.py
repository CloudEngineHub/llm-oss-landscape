#!/usr/bin/env python3
"""Estimate first public commit dates for strict Agent instructions added in 2026."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_TRANSITIONS = RESEARCH / "collaboration-marker-transitions-2025-2026.csv"
DEFAULT_EVIDENCE = RESEARCH / "collaboration-agent-markers-2022-2026-evidence.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-agent-instruction-adoption-dates-2026.csv"
DEFAULT_PATHS = RESEARCH / "collaboration-agent-instruction-adoption-paths-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-agent-instruction-adoption-dates-2026-run.json"
CUTOFF = "2026-08-31T23:59:59Z"

OUTPUT_FIELDS = [
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "candidate_adoption_date",
    "candidate_adoption_commit",
    "candidate_adoption_path",
    "instruction_paths_checked",
    "path_history_inconsistency",
    "scan_status",
    "error",
    "collected_at",
]
PATH_FIELDS = [
    "repo_name",
    "marker_path",
    "marker_tool",
    "oldest_path_commit_date",
    "oldest_path_commit_sha",
    "path_commit_count_lower_bound",
    "history_pages",
    "scan_status",
    "error",
    "collected_at",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--transitions", type=Path, default=DEFAULT_TRANSITIONS)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--paths-output", type=Path, default=DEFAULT_PATHS)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def oldest_path_commit(client: GitHubClient, repo: str, path: str) -> tuple[dict[str, Any] | None, int, int]:
    first = client.get(
        f"/repos/{repo}/commits",
        params={"path": path, "until": CUTOFF, "per_page": 100},
        allowed={200, 409},
    )
    if first.status_code == 409:
        return None, 1, 0
    payload = first.json()
    if not payload:
        return None, 1, 0
    last_url = first.links.get("last", {}).get("url")
    pages = 1
    if last_url:
        response = client.get(last_url)
        payload = response.json()
        pages = int(last_url.split("page=")[-1].split("&")[0]) if "page=" in last_url else 2
    oldest = payload[-1]
    lower_bound = (pages - 1) * 100 + len(payload)
    return oldest, pages, lower_bound


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    transitions = [
        row for row in read_csv(args.transitions) if row.get("strict_transition") == "added"
    ]
    if args.max_repos:
        transitions = transitions[: args.max_repos]
    repo_set = {row["repo_name"] for row in transitions}
    evidence = [
        row
        for row in read_csv(args.evidence)
        if row["repo_name"] in repo_set
        and row.get("snapshot_date") == "2026-08-31"
        and row.get("evidence_level") == "active_instruction"
    ]
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in evidence:
        grouped.setdefault(row["repo_name"], []).append(row)

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)
    summaries = [] if args.fresh else read_csv(args.output)
    path_rows = [] if args.fresh else read_csv(args.paths_output)
    completed = {row["repo_name"] for row in summaries if row.get("scan_status") == "ok"}
    started_at = datetime.now(UTC).isoformat()
    for index, transition in enumerate(transitions, start=1):
        repo = transition["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(transitions)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(transitions)}] {repo}", flush=True)
        collected_at = datetime.now(UTC).isoformat()
        repo_paths: list[dict[str, Any]] = []
        try:
            path_markers: dict[str, set[str]] = {}
            for row in grouped.get(repo, []):
                path_markers.setdefault(row["marker_path"], set()).add(row["marker_tool"])
            if not path_markers:
                raise RuntimeError("No strict 2026 instruction evidence path")
            candidates: list[tuple[datetime, str, str]] = []
            for path, tools in sorted(path_markers.items()):
                try:
                    oldest, pages, count = oldest_path_commit(client, repo, path)
                    commit_data = (oldest or {}).get("commit", {})
                    author_data = commit_data.get("author") or commit_data.get("committer") or {}
                    commit_date = str(author_data.get("date") or "")
                    commit_sha = str((oldest or {}).get("sha") or "")
                    if commit_date:
                        candidates.append((datetime.fromisoformat(commit_date.replace("Z", "+00:00")), commit_sha, path))
                    repo_paths.append(
                        {
                            "repo_name": repo,
                            "marker_path": path,
                            "marker_tool": "|".join(sorted(tools)),
                            "oldest_path_commit_date": commit_date,
                            "oldest_path_commit_sha": commit_sha,
                            "path_commit_count_lower_bound": count,
                            "history_pages": pages,
                            "scan_status": "ok",
                            "error": "",
                            "collected_at": collected_at,
                        }
                    )
                except Exception as exc:
                    repo_paths.append(
                        {
                            "repo_name": repo,
                            "marker_path": path,
                            "marker_tool": "|".join(sorted(tools)),
                            "scan_status": "error",
                            "error": str(exc)[:500],
                            "collected_at": collected_at,
                        }
                    )
            if not candidates:
                raise RuntimeError("No path commit history could establish a candidate date")
            adoption_date, adoption_sha, adoption_path = min(candidates, key=lambda value: value[0])
            inconsistency = adoption_date.date().isoformat() <= "2025-12-31"
            summaries = [row for row in summaries if row.get("repo_name") != repo]
            summaries.append(
                {
                    "repo_name": repo,
                    "llm_native_manual": transition.get("llm_native_manual", ""),
                    "collaboration_niche": transition.get("collaboration_niche", ""),
                    "candidate_adoption_date": adoption_date.isoformat(),
                    "candidate_adoption_commit": adoption_sha,
                    "candidate_adoption_path": adoption_path,
                    "instruction_paths_checked": len(path_markers),
                    "path_history_inconsistency": str(inconsistency).lower(),
                    "scan_status": "ok",
                    "error": "",
                    "collected_at": collected_at,
                }
            )
        except Exception as exc:
            summaries = [row for row in summaries if row.get("repo_name") != repo]
            summaries.append(
                {
                    "repo_name": repo,
                    "llm_native_manual": transition.get("llm_native_manual", ""),
                    "collaboration_niche": transition.get("collaboration_niche", ""),
                    "scan_status": "error",
                    "error": str(exc)[:500],
                    "collected_at": collected_at,
                }
            )
        path_rows = [row for row in path_rows if row.get("repo_name") != repo] + repo_paths
        summaries.sort(key=lambda row: row["repo_name"].lower())
        path_rows.sort(key=lambda row: (row["repo_name"].lower(), row.get("marker_path", "")))
        write_csv(args.output, OUTPUT_FIELDS, summaries)
        write_csv(args.paths_output, PATH_FIELDS, path_rows)

    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(transitions),
        "repositories_complete": sum(row.get("scan_status") == "ok" for row in summaries),
        "errors": [row for row in summaries if row.get("scan_status") == "error"],
        "path_rows": len(path_rows),
        "http_requests": client.requests,
        "outputs": [display_path(args.output), display_path(args.paths_output)],
        "limitations": [
            "The oldest commit returned for a current instruction path is a candidate adoption date, not proof of first tool use.",
            "Renames, copied files and history rewriting can make current-path history later or earlier than the actual adoption event.",
            "Dates inconsistent with the 2025 snapshot are flagged and excluded from event-study claims.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
