#!/usr/bin/env python3
"""Refresh canonical OpenRank trends and issue/PR participants from ClickHouse."""

from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import datetime
from pathlib import Path

import clickhouse_connect
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "agentic-ai-projects.csv"
ENV_PATH = ROOT / ".env"


def parse_args() -> argparse.Namespace:
    previous_month = datetime.now().replace(day=1) - relativedelta(months=1)
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--month",
        default=previous_month.strftime("%Y-%m"),
        help="Latest complete metric month in YYYY-MM format.",
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


def month_range(latest_month: str) -> list[str]:
    latest = datetime.strptime(latest_month, "%Y-%m")
    return [
        (latest - relativedelta(months=offset)).strftime("%Y-%m")
        for offset in range(11, -1, -1)
    ]


def read_csv() -> tuple[list[str], list[dict[str, str]]]:
    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def replace_metric_fields(
    fields: list[str],
    openrank_field: str,
    trend_field: str,
    participants_field: str,
) -> list[str]:
    output = []
    seen = {"openrank": False, "trend": False, "participants": False}
    for field in fields:
        if field.startswith("openrank_trend_"):
            if not seen["trend"]:
                output.append(trend_field)
                seen["trend"] = True
        elif field.startswith("openrank_"):
            if not seen["openrank"]:
                output.append(openrank_field)
                seen["openrank"] = True
        elif field.startswith("participants_"):
            if not seen["participants"]:
                output.append(participants_field)
                seen["participants"] = True
        else:
            output.append(field)
    if not all(seen.values()):
        raise SystemExit(f"Expected one field for each metric family, got {seen}")
    return output


def query_metrics(
    repo_ids: list[int],
    months: list[str],
) -> tuple[dict[int, dict[str, float]], dict[int, int], int]:
    client = clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "").strip(),
        port=int(os.getenv("CLICKHOUSE_PORT") or 8123),
        username=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
    )
    ids = ",".join(str(repo_id) for repo_id in repo_ids)
    start = f"{months[0]}-01"
    end = (datetime.strptime(months[-1], "%Y-%m") + relativedelta(months=1)).strftime(
        "%Y-%m-%d"
    )
    openrank_result = client.query(
        f"""
        SELECT repo_id, formatDateTime(created_at, '%Y-%m') AS month,
               round(sum(openrank), 2) AS score
        FROM opensource.global_openrank
        WHERE platform = 'GitHub' AND type = 'Repo'
          AND repo_id IN ({ids})
          AND created_at >= '{start}' AND created_at < '{end}'
        GROUP BY repo_id, month
        ORDER BY repo_id, month
        """
    )
    openrank: dict[int, dict[str, float]] = {}
    for repo_id, month, score in openrank_result.result_rows:
        openrank.setdefault(int(repo_id), {})[str(month)] = float(score)

    participants_result = client.query(
        f"""
        SELECT repo_id, count(DISTINCT actor_id) AS participants
        FROM opensource.events
        WHERE platform = 'GitHub'
          AND repo_id IN ({ids})
          AND type IN (
            'IssuesEvent', 'IssueCommentEvent', 'PullRequestEvent',
            'PullRequestReviewEvent', 'PullRequestReviewCommentEvent'
          )
          AND created_at >= '{months[-1]}-01' AND created_at < '{end}'
        GROUP BY repo_id
        """
    )
    participants = {
        int(repo_id): int(count)
        for repo_id, count in participants_result.result_rows
    }

    coverage = client.query(
        f"""
        SELECT uniqExact(repo_id)
        FROM opensource.global_openrank
        WHERE platform = 'GitHub' AND type = 'Repo'
          AND created_at >= '{months[-1]}-01' AND created_at < '{end}'
        """
    ).result_rows[0][0]
    return openrank, participants, int(coverage)


def write_csv_atomic(fields: list[str], rows: list[dict[str, object]]) -> None:
    temp_path = CSV_PATH.with_suffix(".csv.tmp")
    with temp_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fields,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)
    temp_path.replace(CSV_PATH)


def main() -> None:
    args = parse_args()
    months = month_range(args.month)
    suffix = args.month.replace("-", "")[2:]
    openrank_field = f"openrank_{suffix}"
    trend_field = (
        f"openrank_trend_{months[0].replace('-', '')[2:]}_"
        f"{months[-1].replace('-', '')[2:]}"
    )
    participants_field = f"participants_{suffix}"

    load_dotenv(ENV_PATH)
    direct_network_setup()
    old_fields, rows = read_csv()
    fields = replace_metric_fields(
        old_fields,
        openrank_field,
        trend_field,
        participants_field,
    )
    repo_ids = [int(row["repo_id"]) for row in rows]
    openrank, participants, coverage = query_metrics(repo_ids, months)

    refreshed: list[dict[str, object]] = []
    for source in rows:
        repo_id = int(source["repo_id"])
        repo_metrics = openrank.get(repo_id, {})
        row: dict[str, object] = {
            field: value
            for field, value in source.items()
            if not field.startswith("openrank_")
            and not field.startswith("participants_")
        }
        row[openrank_field] = repo_metrics.get(args.month, "")
        row[trend_field] = json.dumps(
            [repo_metrics.get(month) for month in months],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        row[participants_field] = participants.get(repo_id, 0)
        refreshed.append(row)

    ids = [str(row["repo_id"]) for row in refreshed]
    names = [str(row["repo_name"]).lower() for row in refreshed]
    if len(ids) != len(set(ids)) or len(names) != len(set(names)):
        raise SystemExit("Refreshed CSV contains duplicate repository keys.")
    if any(not str(row.get(field, "")).strip() for row in refreshed for field in ("repo_id", "repo_name")):
        raise SystemExit("Refreshed CSV contains blank repository keys.")

    write_csv_atomic(fields, refreshed)
    latest_non_null = sum(row[openrank_field] != "" for row in refreshed)
    participants_nonzero = sum(int(row[participants_field]) > 0 for row in refreshed)
    print(f"Rows: {len(refreshed)}")
    print(f"Trend: {months[0]} through {months[-1]}")
    print(f"Global {args.month} OpenRank coverage: {coverage}")
    print(f"Canonical {openrank_field} non-null: {latest_non_null}")
    print(f"Canonical {participants_field} nonzero: {participants_nonzero}")


if __name__ == "__main__":
    main()
