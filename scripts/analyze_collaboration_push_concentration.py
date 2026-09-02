#!/usr/bin/env python3
"""Compare PushEvent contributor concentration across three repository cohorts."""

from __future__ import annotations

import argparse
import csv
import json
import os
import statistics
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_AGENTIC = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_MANIFEST = RESEARCH / "collaboration-push-concentration-cohorts.csv"
DEFAULT_REPOSITORIES = RESEARCH / "collaboration-push-concentration-repositories-2024-2026.csv"
DEFAULT_SUMMARY = RESEARCH / "collaboration-push-concentration-summary-2024-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-push-concentration-run.json"
YEARS = (2024, 2025, 2026)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agentic", type=Path, default=DEFAULT_AGENTIC)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--repositories", type=Path, default=DEFAULT_REPOSITORIES)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


class ClickHouse:
    def __init__(self) -> None:
        load_dotenv(ROOT / ".env")
        self.host = os.getenv("CLICKHOUSE_HOST")
        self.auth = (os.getenv("CLICKHOUSE_USER"), os.getenv("CLICKHOUSE_PASSWORD"))
        if not self.host or not all(self.auth):
            raise RuntimeError("ClickHouse credentials are incomplete")
        self.session = requests.Session()
        self.session.trust_env = False
        self.query_ids: list[str] = []

    def query(self, sql: str) -> list[dict[str, str]]:
        response = self.session.post(
            f"http://{self.host}:8123/",
            params={"query": sql + "\nFORMAT CSVWithNames", "max_execution_time": 600},
            auth=self.auth,
            timeout=660,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"ClickHouse HTTP {response.status_code}: {response.text[:1200]}")
        self.query_ids.append(response.headers.get("X-ClickHouse-Query-Id", ""))
        return list(csv.DictReader(response.text.splitlines()))


def control_query(label_prefix: str, excluded: set[int]) -> str:
    excluded_sql = ",".join(str(value) for value in sorted(excluded)) or "0"
    return f"""
WITH labeled AS (
    SELECT DISTINCT entity_id AS repo_id
    FROM opensource.flatten_labels
    WHERE platform = 'GitHub'
      AND entity_type = 'Repo'
      AND id LIKE '{label_prefix}%'
)
SELECT
    g.repo_id,
    argMax(g.repo_name, g.created_at) AS repo_name,
    round(sum(g.openrank), 4) AS openrank_2607
FROM opensource.global_openrank AS g
INNER JOIN labeled AS l ON g.repo_id = l.repo_id
WHERE g.platform = 'GitHub'
  AND g.type = 'Repo'
  AND toYYYYMM(g.created_at) = 202607
  AND g.repo_id NOT IN ({excluded_sql})
GROUP BY g.repo_id
HAVING openrank_2607 > 0
ORDER BY openrank_2607 DESC, repo_name ASC
LIMIT 100
"""


def build_manifest(ch: ClickHouse, agentic_path: Path) -> list[dict[str, Any]]:
    agentic_source = read_csv(agentic_path)
    manifest: list[dict[str, Any]] = [
        {
            "cohort": "Agentic AI Top 100",
            "rank": int(row["sample_rank"]),
            "repo_id": int(row["repo_id"]),
            "repo_name": row["repo_name"],
            "openrank_2607": row["openrank_2607"],
            "selection": "Frozen July 2026 Agentic AI tracking Top 100",
        }
        for row in agentic_source
    ]
    excluded = {int(row["repo_id"]) for row in manifest}
    for cohort, prefix in (
        ("Cloud Native benchmark", ":technology/cloud_native/"),
        ("Big Data benchmark", ":technology/big_data/"),
    ):
        rows = ch.query(control_query(prefix, excluded))
        if not rows:
            raise RuntimeError(f"No repositories found for {cohort}")
        for rank, row in enumerate(rows, start=1):
            manifest.append(
                {
                    "cohort": cohort,
                    "rank": rank,
                    "repo_id": int(row["repo_id"]),
                    "repo_name": row["repo_name"],
                    "openrank_2607": row["openrank_2607"],
                    "selection": f"Top July 2026 OpenRank repositories under {prefix}, excluding earlier cohorts",
                }
            )
            excluded.add(int(row["repo_id"]))
    return manifest


def push_query(manifest: list[dict[str, Any]], year: int) -> str:
    ids = ",".join(str(row["repo_id"]) for row in manifest)
    return f"""
SELECT
    repo_id,
    toYear(created_at) AS year,
    actor_id,
    argMax(actor_login, created_at) AS actor_login_latest,
    count() AS push_events
FROM opensource.events
WHERE platform = 'GitHub'
  AND type = 'PushEvent'
  AND repo_id IN ({ids})
  AND created_at >= '{year}-01-01'
  AND created_at < '{year}-09-01'
  AND actor_id != 0
  AND actor_login NOT LIKE '%[bot]'
  AND actor_login NOT LIKE '%-bot'
  AND actor_login NOT LIKE '%_bot'
GROUP BY repo_id, year, actor_id
ORDER BY repo_id, year, push_events DESC, actor_id ASC
"""


def n_for_share(values: list[int], share: float) -> int:
    if not values:
        return 0
    threshold = sum(values) * share
    running = 0
    for index, value in enumerate(sorted(values, reverse=True), start=1):
        running += value
        if running >= threshold:
            return index
    return len(values)


def quantile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def main() -> None:
    args = parse_args()
    ch = ClickHouse()
    manifest = build_manifest(ch, args.agentic)
    manifest_fields = ["cohort", "rank", "repo_id", "repo_name", "openrank_2607", "selection"]
    write_csv(args.manifest, manifest_fields, manifest)
    actors: list[dict[str, str]] = []
    for cohort in ("Agentic AI Top 100", "Cloud Native benchmark", "Big Data benchmark"):
        cohort_manifest = [row for row in manifest if row["cohort"] == cohort]
        for year in YEARS:
            actors.extend(ch.query(push_query(cohort_manifest, year)))
    grouped: dict[tuple[int, int], list[int]] = defaultdict(list)
    for row in actors:
        grouped[(int(row["repo_id"]), int(row["year"]))].append(int(row["push_events"]))
    repo_fields = [
        "cohort", "rank", "repo_id", "repo_name", "year", "push_events", "push_actors",
        "actors_for_50pct_pushes", "top_actor_share", "top_5_actor_share", "quality_flag",
    ]
    repository_rows: list[dict[str, Any]] = []
    for repo in manifest:
        for year in YEARS:
            values = grouped.get((int(repo["repo_id"]), year), [])
            total = sum(values)
            repository_rows.append(
                {
                    **{key: repo[key] for key in ("cohort", "rank", "repo_id", "repo_name")},
                    "year": year,
                    "push_events": total,
                    "push_actors": len(values),
                    "actors_for_50pct_pushes": n_for_share(values, 0.5),
                    "top_actor_share": round(values[0] / total, 6) if total and values else "",
                    "top_5_actor_share": round(sum(values[:5]) / total, 6) if total else "",
                    "quality_flag": "observed" if total else "no_push_events_observed",
                }
            )
    write_csv(args.repositories, repo_fields, repository_rows)

    summary_fields = [
        "cohort", "year", "repositories", "repositories_with_pushes", "push_events",
        "median_push_actors", "median_actors_for_50pct_pushes", "p25_actors_for_50pct_pushes",
        "p75_actors_for_50pct_pushes", "median_top_actor_share", "median_top_5_actor_share",
    ]
    summary_rows: list[dict[str, Any]] = []
    for cohort in ("Agentic AI Top 100", "Cloud Native benchmark", "Big Data benchmark"):
        for year in YEARS:
            subset = [row for row in repository_rows if row["cohort"] == cohort and row["year"] == year]
            observed = [row for row in subset if row["push_events"]]
            n50 = [float(row["actors_for_50pct_pushes"]) for row in observed]
            summary_rows.append(
                {
                    "cohort": cohort,
                    "year": year,
                    "repositories": len(subset),
                    "repositories_with_pushes": len(observed),
                    "push_events": sum(int(row["push_events"]) for row in observed),
                    "median_push_actors": round(statistics.median(float(row["push_actors"]) for row in observed), 2) if observed else "",
                    "median_actors_for_50pct_pushes": round(statistics.median(n50), 2) if n50 else "",
                    "p25_actors_for_50pct_pushes": round(quantile(n50, 0.25) or 0, 2) if n50 else "",
                    "p75_actors_for_50pct_pushes": round(quantile(n50, 0.75) or 0, 2) if n50 else "",
                    "median_top_actor_share": round(statistics.median(float(row["top_actor_share"]) for row in observed), 6) if observed else "",
                    "median_top_5_actor_share": round(statistics.median(float(row["top_5_actor_share"]) for row in observed), 6) if observed else "",
                }
            )
    write_csv(args.summary, summary_fields, summary_rows)
    run = {
        "generated_at": datetime.now(UTC).isoformat(),
        "window_each_year": "1 January through 31 August",
        "cohorts": {cohort: sum(row["cohort"] == cohort for row in manifest) for cohort in {row["cohort"] for row in manifest}},
        "actor_rows": len(actors),
        "query_ids": ch.query_ids,
        "outputs": [str(path.relative_to(ROOT)) for path in (args.manifest, args.repositories, args.summary)],
        "definitions": {
            "actors_for_50pct_pushes": "smallest number of non-obvious-bot PushEvent actors whose PushEvents make up at least half of a repository's Jan-Aug total",
            "benchmark_selection": "top 100 repositories by July 2026 OpenRank within the OpenDigger technology label, excluding repositories already assigned to an earlier cohort",
        },
        "limitations": [
            "PushEvent actors are pushers, not commit authors, and one push may carry several commits.",
            "Bot exclusion uses public login patterns; service accounts without those patterns can remain.",
            "The cohorts describe active head projects in each label, not every repository in the domain.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
