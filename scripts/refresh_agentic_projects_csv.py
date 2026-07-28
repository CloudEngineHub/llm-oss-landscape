#!/usr/bin/env python3
"""Refresh GitHub and OpenDigger fields in the canonical Agentic AI project CSV.

The refresh is keyed by GitHub repository ID so repository transfers and
renames can be resolved through the GitHub API. OpenRank trends include the
current month and the preceding 11 months; the covered months are encoded in
the trend column name.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import clickhouse_connect
import requests
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "agentic-ai-projects.csv"
README_PATH = ROOT / "data" / "project_readmes.json"
SHORTLIST_PATH = (
    ROOT
    / "presentations"
    / "260807-CoC-KN"
    / "landscape-refresh"
    / "data"
    / "human_review_shortlist.csv"
)
QUALITY_PATH = (
    ROOT
    / "presentations"
    / "260807-CoC-KN"
    / "landscape-refresh"
    / "data"
    / "csv_refresh_quality.json"
)
ENV_PATH = ROOT / "scripts" / ".env"

INITIAL_REFRESH_RENAMES = [
    {
        "repo_id": "200722670",
        "old_name": "NVIDIA-NeMo/NeMo",
        "new_name": "NVIDIA-NeMo/Speech",
    },
    {
        "repo_id": "1136590548",
        "old_name": "affaan-m/everything-claude-code",
        "new_name": "affaan-m/ECC",
    },
    {
        "repo_id": "1118085970",
        "old_name": "alibaba/OpenSandbox",
        "new_name": "opensandbox-group/OpenSandbox",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--workers",
        type=int,
        default=12,
        help="Concurrent GitHub requests.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build and validate the snapshot without replacing canonical files.",
    )
    return parser.parse_args()


def direct_network_setup() -> None:
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)
    host = os.getenv("CLICKHOUSE_HOST", "").strip()
    bypass = [
        item
        for item in os.getenv("NO_PROXY", "").split(",")
        if item.strip()
    ]
    for item in (host, "api.github.com", "github.com", "127.0.0.1", "localhost"):
        if item and item not in bypass:
            bypass.append(item)
    os.environ["NO_PROXY"] = ",".join(bypass)
    os.environ["no_proxy"] = os.environ["NO_PROXY"]


def parse_repo_id(value: Any) -> int:
    text = str(value or "").strip()
    if not text:
        return 0
    return int(float(text))


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "agentic-ai-landscape-refresh",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip() or os.getenv("GH_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def github_get(url: str, *, timeout: int = 30) -> requests.Response:
    last_response: requests.Response | None = None
    for attempt in range(3):
        try:
            response = requests.get(
                url,
                headers=github_headers(),
                timeout=timeout,
            )
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(2**attempt)
            continue
        last_response = response
        if response.status_code == 200:
            return response
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            time.sleep(2**attempt)
            continue
        return response
    assert last_response is not None
    return last_response


def fetch_metadata(repo_id: int, fallback_name: str) -> dict[str, Any]:
    response = github_get(f"https://api.github.com/repositories/{repo_id}")
    if response.status_code == 404 and fallback_name:
        response = github_get(f"https://api.github.com/repos/{fallback_name}")
    if response.status_code != 200:
        return {
            "repo_id": repo_id,
            "repo_name": fallback_name,
            "github_status": f"http_{response.status_code}",
        }
    item = response.json()
    return {
        "repo_id": int(item["id"]),
        "repo_name": item.get("full_name") or fallback_name,
        "description": item.get("description") or "",
        "stars": int(item.get("stargazers_count") or 0),
        "forks": int(item.get("forks_count") or 0),
        "open_issues": int(item.get("open_issues_count") or 0),
        "license": (item.get("license") or {}).get("spdx_id") or "NOASSERTION",
        "archived": bool(item.get("archived")),
        "pushed_at": item.get("pushed_at") or "",
        "language": item.get("language") or "",
        "created_at": (item.get("created_at") or "")[:10],
        "topics": ",".join(item.get("topics") or []),
        "github_status": "ok",
    }


def fetch_readme(repo_name: str) -> str:
    if not repo_name:
        return ""
    response = github_get(
        f"https://api.github.com/repos/{repo_name}/readme",
        timeout=45,
    )
    if response.status_code != 200:
        return ""
    payload = response.json()
    try:
        return base64.b64decode(payload.get("content", "")).decode(
            "utf-8",
            errors="replace",
        )[:50000]
    except (ValueError, TypeError):
        return ""


def month_context() -> tuple[str, list[str], str, str]:
    now = datetime.now().astimezone()
    current_month_start = now.replace(day=1)
    latest_month = current_month_start.strftime("%Y-%m")
    months = [
        (current_month_start - relativedelta(months=offset)).strftime("%Y-%m")
        for offset in range(11, -1, -1)
    ]
    start = f"{latest_month}-01"
    end = (current_month_start + relativedelta(months=1)).strftime("%Y-%m-%d")
    return latest_month, months, start, end


def query_metrics(
    repo_ids: list[int],
    months: list[str],
    participant_start: str,
    participant_end: str,
) -> tuple[
    dict[int, dict[str, float]],
    dict[int, int],
    list[dict[str, Any]],
]:
    client = clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "").strip(),
        port=8123,
        username=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
    )
    ids = ",".join(str(repo_id) for repo_id in repo_ids)
    first_month = months[0]
    openrank_result = client.query(
        f"""
        SELECT
            repo_id,
            formatDateTime(created_at, '%Y-%m') AS month,
            round(sum(openrank), 2) AS score
        FROM opensource.global_openrank
        WHERE platform = 'GitHub'
          AND type = 'Repo'
          AND repo_id IN ({ids})
          AND created_at >= '{first_month}-01'
          AND created_at < '{participant_end}'
        GROUP BY repo_id, month
        ORDER BY repo_id, month
        """
    )
    openrank: dict[int, dict[str, float]] = {}
    for repo_id, month, score in openrank_result.result_rows:
        openrank.setdefault(int(repo_id), {})[str(month)] = float(score)

    participant_result = client.query(
        f"""
        SELECT repo_id, count(DISTINCT actor_id) AS participants
        FROM opensource.events
        WHERE platform = 'GitHub'
          AND repo_id IN ({ids})
          AND type IN (
            'IssuesEvent',
            'IssueCommentEvent',
            'PullRequestEvent',
            'PullRequestReviewEvent',
            'PullRequestReviewCommentEvent'
          )
          AND created_at >= '{participant_start}'
          AND created_at < '{participant_end}'
        GROUP BY repo_id
        """
    )
    participants = {
        int(repo_id): int(count)
        for repo_id, count in participant_result.result_rows
    }

    coverage_start = months[-3]
    coverage_result = client.query(
        f"""
        SELECT
            toYYYYMM(created_at) AS month,
            count() AS rows,
            uniqExact(repo_id) AS repos,
            round(sum(openrank), 2) AS total_openrank
        FROM opensource.global_openrank
        WHERE platform = 'GitHub'
          AND type = 'Repo'
          AND created_at >= '{coverage_start}-01'
          AND created_at < '{participant_end}'
        GROUP BY month
        ORDER BY month
        """
    )
    coverage = [
        {
            "month": str(month),
            "rows": int(rows),
            "repos": int(repos),
            "total_openrank": float(total),
        }
        for month, rows, repos, total in coverage_result.result_rows
    ]
    return openrank, participants, coverage


def reviewed_shortlist_names() -> list[str]:
    _, shortlist = read_csv(SHORTLIST_PATH)
    return [row["repo_name"].strip() for row in shortlist]


def build_snapshot(
    rows: list[dict[str, str]],
    metadata: dict[int, dict[str, Any]],
    openrank: dict[int, dict[str, float]],
    participants: dict[int, int],
    latest_openrank_month: str,
    participant_month: str,
    months: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    openrank_suffix = latest_openrank_month.replace("-", "")[2:]
    participant_suffix = participant_month.replace("-", "")[2:]
    openrank_field = f"openrank_{openrank_suffix}"
    trend_field = (
        f"openrank_trend_{months[0].replace('-', '')[2:]}"
        f"_{months[-1].replace('-', '')[2:]}"
    )
    participants_field = f"participants_{participant_suffix}"
    output: list[dict[str, Any]] = []
    renames = []

    for source in rows:
        repo_id = parse_repo_id(source.get("repo_id"))
        current = metadata.get(repo_id, {})
        old_name = source.get("repo_name", "")
        current_name = str(current.get("repo_name") or old_name)
        if current_name.lower() != old_name.lower():
            renames.append(
                {
                    "repo_id": str(repo_id),
                    "old_name": old_name,
                    "new_name": current_name,
                }
            )
        repo_openrank = openrank.get(repo_id, {})
        trend = [repo_openrank.get(month) for month in months]
        latest_openrank = repo_openrank.get(latest_openrank_month)
        github_ok = current.get("github_status") == "ok"
        row = {
            "repo_id": repo_id,
            "repo_name": current_name,
            "description": (
                current.get("description") or source.get("description", "")
                if github_ok
                else source.get("description", "")
            ),
            "stars": (
                current.get("stars")
                if github_ok
                else int(float(source.get("stars") or 0))
            ),
            "forks": current.get("forks", source.get("forks", "")),
            "open_issues": current.get(
                "open_issues",
                source.get("open_issues", ""),
            ),
            "license": current.get("license", source.get("license", "")),
            "archived": (
                str(bool(current.get("archived"))).lower()
                if github_ok
                else source.get("archived", "")
            ),
            "pushed_at": current.get("pushed_at", source.get("pushed_at", "")),
            openrank_field: latest_openrank if latest_openrank is not None else "",
            trend_field: json.dumps(
                trend,
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            participants_field: participants.get(repo_id, 0),
            "language": current.get("language", source.get("language", "")),
            "created_at": current.get("created_at", source.get("created_at", "")),
            "topics": current.get("topics", source.get("topics", "")),
            "landscape_action": source.get("landscape_action", ""),
            "landscape_layer": source.get("landscape_layer", ""),
            "landscape_section": source.get("landscape_section", ""),
            "selection_reason": source.get("selection_reason", ""),
            "selection_caveat": source.get("selection_caveat", ""),
            "github_status": current.get("github_status", "unavailable"),
        }
        output.append(row)
    return output, renames


def validate_snapshot(
    rows: list[dict[str, Any]],
    original_count: int,
) -> dict[str, Any]:
    ids = [parse_repo_id(row["repo_id"]) for row in rows]
    names = [str(row["repo_name"]).strip().lower() for row in rows]
    duplicate_ids = len(ids) - len(set(ids))
    duplicate_names = len(names) - len(set(names))
    blank_required = {
        field: sum(1 for row in rows if not str(row.get(field, "")).strip())
        for field in ("repo_id", "repo_name", "description", "license")
    }
    blank_description_projects = [
        str(row.get("repo_name", ""))
        for row in rows
        if not str(row.get("description", "")).strip()
    ]
    expected_count = original_count
    failures = []
    if len(rows) != expected_count:
        failures.append(f"row_count expected {expected_count}, got {len(rows)}")
    if duplicate_ids:
        failures.append(f"duplicate repo_id rows: {duplicate_ids}")
    if duplicate_names:
        failures.append(f"duplicate canonical repo_name rows: {duplicate_names}")
    if blank_required["repo_id"] or blank_required["repo_name"]:
        failures.append(f"blank keys: {blank_required}")
    if blank_required["description"]:
        failures.append(f"blank descriptions: {blank_required['description']}")
    if blank_required["license"]:
        failures.append(f"blank licenses: {blank_required['license']}")
    return {
        "passed": not failures,
        "failures": failures,
        "row_count": len(rows),
        "expected_row_count": expected_count,
        "duplicate_repo_ids": duplicate_ids,
        "duplicate_repo_names": duplicate_names,
        "blank_required": blank_required,
        "blank_description_projects": blank_description_projects,
        "github_status_counts": {
            status: sum(1 for row in rows if row.get("github_status") == status)
            for status in sorted({str(row.get("github_status")) for row in rows})
        },
    }


def write_csv_atomic(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)
    temp_path.replace(path)


def main() -> None:
    args = parse_args()
    load_dotenv(ENV_PATH)
    direct_network_setup()

    original_fields, existing_rows = read_csv(CSV_PATH)
    reviewed_projects = reviewed_shortlist_names()
    merged_rows = [dict(row) for row in existing_rows]
    participant_month, months, participant_start, participant_end = month_context()

    repo_names = {
        parse_repo_id(row["repo_id"]): row["repo_name"]
        for row in merged_rows
    }
    metadata: dict[int, dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(fetch_metadata, repo_id, repo_name): repo_id
            for repo_id, repo_name in repo_names.items()
        }
        for index, future in enumerate(as_completed(futures), 1):
            repo_id = futures[future]
            try:
                metadata[repo_id] = future.result()
            except Exception as exc:
                metadata[repo_id] = {
                    "repo_id": repo_id,
                    "repo_name": repo_names[repo_id],
                    "github_status": f"error_{type(exc).__name__}",
                }
            if index % 25 == 0 or index == len(futures):
                print(f"GitHub metadata: {index}/{len(futures)}")

    repo_ids = sorted(repo_names)
    openrank, participants, coverage = query_metrics(
        repo_ids,
        months,
        participant_start,
        participant_end,
    )
    available_openrank_months = [
        month
        for month in months
        if any(month in repo_months for repo_months in openrank.values())
    ]
    latest_openrank_month = (
        available_openrank_months[-1]
        if available_openrank_months
        else participant_month
    )
    openrank_suffix = latest_openrank_month.replace("-", "")[2:]
    participant_suffix = participant_month.replace("-", "")[2:]
    snapshot, renames = build_snapshot(
        merged_rows,
        metadata,
        openrank,
        participants,
        latest_openrank_month,
        participant_month,
        months,
    )
    validation = validate_snapshot(snapshot, len(existing_rows))

    readmes: dict[int, str] = {}
    if validation["passed"]:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(fetch_readme, row["repo_name"]): parse_repo_id(
                    row["repo_id"]
                )
                for row in snapshot
                if row["github_status"] == "ok"
            }
            for index, future in enumerate(as_completed(futures), 1):
                repo_id = futures[future]
                try:
                    readmes[repo_id] = future.result()
                except Exception:
                    readmes[repo_id] = ""
                if index % 25 == 0 or index == len(futures):
                    print(f"GitHub READMEs: {index}/{len(futures)}")

    fieldnames = [
        "repo_id",
        "repo_name",
        "description",
        "stars",
        "forks",
        "open_issues",
        "license",
        "archived",
        "pushed_at",
        f"openrank_{openrank_suffix}",
        (
            f"openrank_trend_{months[0].replace('-', '')[2:]}"
            f"_{months[-1].replace('-', '')[2:]}"
        ),
        f"participants_{participant_suffix}",
        "language",
        "created_at",
        "topics",
        "landscape_action",
        "landscape_layer",
        "landscape_section",
        "selection_reason",
        "selection_caveat",
        "github_status",
    ]
    openrank_field = f"openrank_{openrank_suffix}"
    participants_field = f"participants_{participant_suffix}"
    quality = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_columns": original_fields,
        "output_columns": fieldnames,
        "latest_openrank_month": latest_openrank_month,
        "participant_month": participant_month,
        "trend_months": months,
        "validation": validation,
        "initial_refresh_summary": {
            "baseline_projects": 227,
            "reviewed_shortlist_projects": len(reviewed_projects),
            "canonical_projects_after_refresh": len(snapshot),
        },
        "reviewed_shortlist": reviewed_projects,
        "initial_refresh_renames": INITIAL_REFRESH_RENAMES,
        "renames": renames,
        "github_metadata_ok": sum(
            1 for row in snapshot if row["github_status"] == "ok"
        ),
        "github_readmes_found": sum(1 for text in readmes.values() if text),
        "openrank_latest_non_null": sum(
            1 for row in snapshot if row[openrank_field] != ""
        ),
        "participants_nonzero": sum(
            1 for row in snapshot if int(row[participants_field]) > 0
        ),
        "openrank_global_coverage": coverage,
        "known_limitations": [
            (
                f"Repo OpenRank is only available through {latest_openrank_month}; "
                f"the {participant_month} point remains null in the 12-month trend."
            ),
            "participants_2607 uses visible GitHub issue and pull-request events through the current month and is also backfill-sensitive.",
            "GitHub stars are a 2026-07-28 attention snapshot, not a community-health measure.",
            "Landscape placement is an editorial decision and is not derived from OpenRank alone.",
        ],
    }
    QUALITY_PATH.write_text(
        json.dumps(quality, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if not validation["passed"]:
        print(json.dumps(quality, ensure_ascii=False, indent=2))
        raise SystemExit("Snapshot validation failed; canonical CSV was not replaced.")

    if args.dry_run:
        print(json.dumps(quality, ensure_ascii=False, indent=2))
        print("Dry run complete; canonical files unchanged.")
        return

    write_csv_atomic(CSV_PATH, snapshot, fieldnames)
    readme_rows = [
        {
            "repo_id": row["repo_id"],
            "repo_name": row["repo_name"],
            "description": row["description"],
            "stars": row["stars"],
            "language": row["language"],
            "created_at": row["created_at"],
            "topics": row["topics"],
            "readme": readmes.get(parse_repo_id(row["repo_id"]), ""),
        }
        for row in snapshot
    ]
    README_PATH.write_text(
        json.dumps(readme_rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(quality, ensure_ascii=False, indent=2))
    print(f"Updated {CSV_PATH}")
    print(f"Updated {README_PATH}")


if __name__ == "__main__":
    main()
