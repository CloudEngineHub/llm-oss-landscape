#!/usr/bin/env python3
"""Collect the 2026 Issue and pull-request item census for the Top 100 sample."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_ITEMS = RESEARCH / "collaboration-items-2026.csv"
DEFAULT_REPOSITORIES = RESEARCH / "collaboration-items-2026-repositories.csv"
DEFAULT_RUN = RESEARCH / "collaboration-items-2026-run.json"
DEFAULT_SINCE = "2026-01-01T00:00:00Z"
DEFAULT_UNTIL = "2026-08-31T23:59:59Z"

ITEM_FIELDS = [
    "sample_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "item_type",
    "number",
    "node_id",
    "html_url",
    "state",
    "outcome",
    "draft",
    "created_at",
    "updated_at",
    "closed_at",
    "merged_at",
    "resolution_at",
    "resolution_hours",
    "author_login",
    "author_github_type",
    "author_association",
    "author_initial_class",
    "performed_via_github_app",
    "ai_disclosure_candidate",
    "ai_disclosure_evidence",
    "comments_count",
    "labels",
    "locked",
    "source_endpoint",
    "collected_at",
]

REPOSITORY_FIELDS = [
    "sample_rank",
    "repo_name",
    "llm_native_manual",
    "collaboration_niche",
    "agent_proximity",
    "window_start",
    "window_end",
    "issues_collected",
    "prs_collected",
    "issue_pages",
    "pr_pages",
    "issue_pagination_complete",
    "pr_pagination_complete",
    "oldest_issue_created_at",
    "oldest_pr_created_at",
    "scan_status",
    "error",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--repositories", type=Path, default=DEFAULT_REPOSITORIES)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--since", default=DEFAULT_SINCE)
    parser.add_argument("--until", default=DEFAULT_UNTIL)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument(
        "--max-items-per-type",
        type=int,
        help="Stop after this many Issue or PR list items per repository; for API-cost pilots only.",
    )
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


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


def initial_actor_class(user: dict[str, Any] | None) -> str:
    if not user:
        return "unknown"
    login = str(user.get("login") or "")
    github_type = str(user.get("type") or "")
    if github_type == "Bot" or login.lower().endswith("[bot]"):
        return "automation_bot"
    if github_type == "User" and login:
        return "human_account"
    return "unknown"


def duration_hours(start: str, end: str) -> float | str:
    if not start or not end:
        return ""
    delta = parse_time(end) - parse_time(start)
    if delta.total_seconds() < 0:
        return ""
    return round(delta.total_seconds() / 3600, 3)


AI_DISCLOSURE_PATTERNS = (
    re.compile(r"\bai[- ]assisted by\b", re.IGNORECASE),
    re.compile(
        r"(?<![A-Za-z0-9])this\s+(?:pr|pull request|issue|change|code|commit)\s+"
        r"(?:was|is|contains\s+code\s+that\s+was)\s+"
        r"(?:mostly\s+or\s+fully\s+)?(?:assisted\s+or\s+generated|generated|authored|written|created)\s+"
        r"by\s+(?:an?\s+)?(?:ai(?:\s+agent|\s+tool)?|agent|copilot|codex|claude|cursor|devin|roboclaw|sweep)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\bthis\s+was\s+generated\s+by\s+ai\s+during\s+triage\b", re.IGNORECASE),
    re.compile(
        r"(?:^|\n|\s)[-*]\s*\[[xX]\].{0,120}"
        r"(?:this\s+pr\s+was\s+entirely\s+ai[- ]generated|"
        r"ai[- ]assisted\s*:|"
        r"this\s+pr\s+contains\s+code\s+that\s+was\s+assisted\s+or\s+generated\s+by\s+an?\s+ai\s+tool|"
        r"including\s+ai[- ]assisted\s+work)",
        re.IGNORECASE,
    ),
    re.compile(r"\bdeveloped with (?:copilot|codex|claude|cursor|devin|roboclaw|sweep)\b", re.IGNORECASE),
)


UNCHECKED_CHECKBOX_LINE = re.compile(r"^\s*[-*]\s*\[\s\].*$", re.MULTILINE)


def disclosure_search_text(text: str | None) -> str:
    """Remove unchecked template choices before looking for AI disclosure.

    Many repositories include an unchecked ``AI-generated`` checkbox in every
    pull-request body.  The label is a question posed by the template, not a
    disclosure by the contributor.
    """
    if not text:
        return ""
    return UNCHECKED_CHECKBOX_LINE.sub("", text)


def strict_ai_disclosure_evidence(text: str | None) -> bool:
    searchable = disclosure_search_text(text)
    return bool(searchable and any(pattern.search(searchable) for pattern in AI_DISCLOSURE_PATTERNS))


def ai_disclosure(body: str | None) -> tuple[str, str]:
    searchable = disclosure_search_text(body)
    if not searchable:
        return "no", ""
    for pattern in AI_DISCLOSURE_PATTERNS:
        match = pattern.search(searchable)
        if not match:
            continue
        start = max(0, match.start() - 60)
        end = min(len(searchable), match.end() + 100)
        excerpt = " ".join(searchable[start:end].split())
        return "candidate", excerpt[:240]
    return "no", ""


def app_identity(item: dict[str, Any]) -> str:
    app = item.get("performed_via_github_app")
    if not isinstance(app, dict):
        return ""
    return str(app.get("slug") or app.get("name") or app.get("id") or "")


def paginate_created_window(
    client: GitHubClient,
    path: str,
    *,
    since: datetime,
    until: datetime,
    item_kind: str,
    max_items: int | None = None,
) -> tuple[list[dict[str, Any]], int, bool, str]:
    rows: list[dict[str, Any]] = []
    page = 0
    complete = False
    oldest = ""
    next_url: str | None = path
    while True:
        params: dict[str, Any] | None = None
        if page == 0:
            params = {
                "state": "all",
                "sort": "created",
                "direction": "desc",
                "per_page": 100,
            }
        if next_url is None:
            complete = True
            break
        response = client.get(next_url, params=params)
        page += 1
        payload = response.json()
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected {item_kind} payload")
        if not payload:
            complete = True
            break

        page_dates = [parse_time(str(item["created_at"])) for item in payload]
        oldest = min(page_dates).isoformat()
        for item in payload:
            created = parse_time(str(item["created_at"]))
            if since <= created <= until:
                rows.append(item)
                if max_items and len(rows) >= max_items:
                    return rows[:max_items], page, False, oldest
        if min(page_dates) < since:
            complete = True
            break
        next_url = response.links.get("next", {}).get("url")
        if page > 1000:
            raise RuntimeError(f"Pagination safety limit reached for {path}")
    return rows, page, complete, oldest


def normalize_issue(sample: dict[str, str], item: dict[str, Any], collected_at: str) -> dict[str, Any]:
    closed_at = str(item.get("closed_at") or "")
    state = str(item.get("state") or "")
    user = item.get("user")
    disclosure, disclosure_evidence = ai_disclosure(item.get("body"))
    return {
        **{key: sample[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
        "item_type": "issue",
        "number": item.get("number", ""),
        "node_id": item.get("node_id", ""),
        "html_url": item.get("html_url", ""),
        "state": state,
        "outcome": "closed" if state == "closed" else "open",
        "draft": "",
        "created_at": item.get("created_at", ""),
        "updated_at": item.get("updated_at", ""),
        "closed_at": closed_at,
        "merged_at": "",
        "resolution_at": closed_at,
        "resolution_hours": duration_hours(str(item.get("created_at") or ""), closed_at),
        "author_login": (user or {}).get("login", ""),
        "author_github_type": (user or {}).get("type", ""),
        "author_association": item.get("author_association", ""),
        "author_initial_class": initial_actor_class(user),
        "performed_via_github_app": app_identity(item),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": disclosure_evidence,
        "comments_count": item.get("comments", ""),
        "labels": "|".join(sorted(str(label.get("name") or "") for label in item.get("labels", []) if label.get("name"))),
        "locked": str(bool(item.get("locked"))).lower(),
        "source_endpoint": "issues",
        "collected_at": collected_at,
    }


def normalize_pr(sample: dict[str, str], item: dict[str, Any], collected_at: str) -> dict[str, Any]:
    closed_at = str(item.get("closed_at") or "")
    merged_at = str(item.get("merged_at") or "")
    state = str(item.get("state") or "")
    user = item.get("user")
    disclosure, disclosure_evidence = ai_disclosure(item.get("body"))
    if merged_at:
        outcome = "merged"
        resolution_at = merged_at
    elif state == "closed":
        outcome = "closed_unmerged"
        resolution_at = closed_at
    else:
        outcome = "open"
        resolution_at = ""
    return {
        **{key: sample[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
        "item_type": "pull_request",
        "number": item.get("number", ""),
        "node_id": item.get("node_id", ""),
        "html_url": item.get("html_url", ""),
        "state": state,
        "outcome": outcome,
        "draft": str(bool(item.get("draft"))).lower(),
        "created_at": item.get("created_at", ""),
        "updated_at": item.get("updated_at", ""),
        "closed_at": closed_at,
        "merged_at": merged_at,
        "resolution_at": resolution_at,
        "resolution_hours": duration_hours(str(item.get("created_at") or ""), resolution_at),
        "author_login": (user or {}).get("login", ""),
        "author_github_type": (user or {}).get("type", ""),
        "author_association": item.get("author_association", ""),
        "author_initial_class": initial_actor_class(user),
        "performed_via_github_app": app_identity(item),
        "ai_disclosure_candidate": disclosure,
        "ai_disclosure_evidence": disclosure_evidence,
        "comments_count": "",
        "labels": "",
        "locked": str(bool(item.get("locked"))).lower(),
        "source_endpoint": "pulls",
        "collected_at": collected_at,
    }


def deduplicate_items(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    indexed: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in rows:
        indexed[(str(row["repo_name"]), str(row["item_type"]), str(row["number"]))] = row
    return list(indexed.values())


def main() -> None:
    args = parse_args()
    since = parse_time(args.since)
    until = parse_time(args.until)
    if since >= until:
        raise SystemExit("--since must be earlier than --until")

    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 sample repositories, found {len(sample)}")
    if args.max_repos:
        sample = sample[: args.max_repos]

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    existing_items = [] if args.fresh else read_csv(args.items)
    repository_rows = [] if args.fresh else read_csv(args.repositories)
    completed = {row["repo_name"] for row in repository_rows if row.get("scan_status") == "ok"}
    started_at = datetime.now(UTC).isoformat()

    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        collected_at = datetime.now(UTC).isoformat()
        try:
            issue_payload, issue_pages, issue_complete, oldest_issue = paginate_created_window(
                client,
                f"/repos/{repo}/issues",
                since=since,
                until=until,
                item_kind="issue",
                max_items=args.max_items_per_type,
            )
            issue_payload = [item for item in issue_payload if "pull_request" not in item]
            pr_payload, pr_pages, pr_complete, oldest_pr = paginate_created_window(
                client,
                f"/repos/{repo}/pulls",
                since=since,
                until=until,
                item_kind="pull request",
                max_items=args.max_items_per_type,
            )
            repo_items = [normalize_issue(sample_row, item, collected_at) for item in issue_payload]
            repo_items.extend(normalize_pr(sample_row, item, collected_at) for item in pr_payload)
            existing_items = [row for row in existing_items if row.get("repo_name") != repo]
            existing_items.extend(repo_items)
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    **{key: sample_row[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
                    "window_start": args.since,
                    "window_end": args.until,
                    "issues_collected": len(issue_payload),
                    "prs_collected": len(pr_payload),
                    "issue_pages": issue_pages,
                    "pr_pages": pr_pages,
                    "issue_pagination_complete": str(issue_complete).lower(),
                    "pr_pagination_complete": str(pr_complete).lower(),
                    "oldest_issue_created_at": oldest_issue,
                    "oldest_pr_created_at": oldest_pr,
                    "scan_status": "ok",
                    "error": "",
                }
            )
        except Exception as exc:
            repository_rows = [row for row in repository_rows if row.get("repo_name") != repo]
            repository_rows.append(
                {
                    **{key: sample_row[key] for key in ("sample_rank", "repo_name", "llm_native_manual", "collaboration_niche", "agent_proximity")},
                    "window_start": args.since,
                    "window_end": args.until,
                    "scan_status": "error",
                    "error": str(exc)[:500],
                }
            )
        write_csv(args.items, ITEM_FIELDS, deduplicate_items(existing_items))
        write_csv(args.repositories, REPOSITORY_FIELDS, repository_rows)

    items = deduplicate_items(existing_items)
    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "sample": str(args.sample.resolve().relative_to(ROOT)),
        "window_start": args.since,
        "window_end": args.until,
        "repositories_requested": len(sample),
        "repositories_complete": sum(row.get("scan_status") == "ok" for row in repository_rows if row.get("repo_name") in {item["repo_name"] for item in sample}),
        "repository_errors": sum(row.get("scan_status") == "error" for row in repository_rows if row.get("repo_name") in {item["repo_name"] for item in sample}),
        "items": len(items),
        "issues": sum(row["item_type"] == "issue" for row in items),
        "pull_requests": sum(row["item_type"] == "pull_request" for row in items),
        "http_requests": client.requests,
        "core_rate_limit": rate.get("core"),
        "outputs": [
            str(args.items.resolve().relative_to(ROOT)),
            str(args.repositories.resolve().relative_to(ROOT)),
        ],
        "limitations": [
            "The census contains items created inside the study window; it is not the full opening backlog.",
            "A max-items pilot is intentionally truncated and cannot be used for repository totals.",
            "Issue and pull-request list endpoints provide item identity and outcome but not the complete discussion or review process.",
            "Bot is an initial GitHub account-type classification. Confirmed AI agents require the actor registry and public attribution evidence.",
            "Historical reopen and state-transition events require the thread timeline sample.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
