#!/usr/bin/env python3
"""Collect code-volume metadata and full-body AI disclosures for sampled PRs."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collect_collaboration_items import ai_disclosure
from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-pr-code-metadata-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-pr-code-metadata-2026-run.json"

FIELDS = [
    "sample_rank",
    "repo_name",
    "number",
    "node_id",
    "html_url",
    "state",
    "is_draft",
    "merged",
    "merged_at",
    "additions",
    "deletions",
    "changed_files",
    "commits_total",
    "author_login",
    "author_github_type",
    "author_association",
    "base_ref_oid",
    "head_ref_oid",
    "merge_commit_oid",
    "ai_disclosure_candidate",
    "ai_disclosure_evidence",
    "scan_status",
    "error",
    "collected_at",
]

QUERY = """
query PullRequestCodeMetadata($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on PullRequest {
      id
      number
      url
      state
      isDraft
      merged
      mergedAt
      additions
      deletions
      changedFiles
      body
      author { login __typename }
      authorAssociation
      baseRefOid
      headRefOid
      mergeCommit { oid }
      commits { totalCount }
    }
  }
}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--max-prs", type=int)
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
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def chunks(rows: list[dict[str, str]], size: int) -> list[list[dict[str, str]]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def normalize(sample: dict[str, str], node: dict[str, Any] | None, collected_at: str) -> dict[str, Any]:
    if not node:
        return {
            "sample_rank": sample["sample_rank"],
            "repo_name": sample["repo_name"],
            "number": sample["number"],
            "node_id": sample["node_id"],
            "html_url": sample["html_url"],
            "scan_status": "missing_node",
            "error": "GraphQL node was null or was not a PullRequest",
            "collected_at": collected_at,
        }
    author = node.get("author") if isinstance(node.get("author"), dict) else {}
    disclosure, evidence = ai_disclosure(node.get("body"))
    return {
        "sample_rank": sample["sample_rank"],
        "repo_name": sample["repo_name"],
        "number": sample["number"],
        "node_id": node.get("id", sample["node_id"]),
        "html_url": node.get("url", sample["html_url"]),
        "state": str(node.get("state") or "").lower(),
        "is_draft": str(bool(node.get("isDraft"))).lower(),
        "merged": str(bool(node.get("merged"))).lower(),
        "merged_at": node.get("mergedAt") or "",
        "additions": node.get("additions", ""),
        "deletions": node.get("deletions", ""),
        "changed_files": node.get("changedFiles", ""),
        "commits_total": (node.get("commits") or {}).get("totalCount", ""),
        "author_login": author.get("login", ""),
        "author_github_type": author.get("__typename", ""),
        "author_association": node.get("authorAssociation", ""),
        "base_ref_oid": node.get("baseRefOid") or "",
        "head_ref_oid": node.get("headRefOid") or "",
        "merge_commit_oid": (node.get("mergeCommit") or {}).get("oid", ""),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": evidence,
        "scan_status": "ok",
        "error": "",
        "collected_at": collected_at,
    }


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    sample = [row for row in read_csv(args.sample) if row.get("item_type") == "pull_request"]
    if args.max_prs:
        sample = sample[: args.max_prs]
    if not sample:
        raise SystemExit("Pull-request sample is empty")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    existing = [] if args.fresh else read_csv(args.output)
    rows_by_id = {row["node_id"]: row for row in existing if row.get("node_id")}
    pending = [row for row in sample if rows_by_id.get(row["node_id"], {}).get("scan_status") != "ok"]
    started_at = datetime.now(UTC).isoformat()

    for index, batch in enumerate(chunks(pending, args.batch_size), start=1):
        print(f"[{index}/{len(chunks(pending, args.batch_size))}] {len(batch)} pull requests", flush=True)
        collected_at = datetime.now(UTC).isoformat()
        try:
            data = client.graphql(QUERY, {"ids": [row["node_id"] for row in batch]})
            nodes = data.get("nodes") or []
            for sample_row, node in zip(batch, nodes, strict=False):
                rows_by_id[sample_row["node_id"]] = normalize(sample_row, node, collected_at)
            if len(nodes) < len(batch):
                for sample_row in batch[len(nodes) :]:
                    rows_by_id[sample_row["node_id"]] = normalize(sample_row, None, collected_at)
        except Exception as exc:
            for sample_row in batch:
                row = normalize(sample_row, None, collected_at)
                row["scan_status"] = "error"
                row["error"] = str(exc)[:500]
                rows_by_id[sample_row["node_id"]] = row
        ordered = [rows_by_id[row["node_id"]] for row in sample if row["node_id"] in rows_by_id]
        write_csv(args.output, ordered)

    ordered = [rows_by_id[row["node_id"]] for row in sample if row["node_id"] in rows_by_id]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "sample_pull_requests": len(sample),
        "complete": sum(row.get("scan_status") == "ok" for row in ordered),
        "errors": [row for row in ordered if row.get("scan_status") != "ok"],
        "http_requests": client.requests,
        "output": display_path(args.output),
        "notes": [
            "Additions and deletions are the final pull-request diff reported by GitHub.",
            "Unchecked AI-generated checkboxes are removed before disclosure classification.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
