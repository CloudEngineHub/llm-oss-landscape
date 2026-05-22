"""Build GitHub developer profile CSVs for a project set.

The script reads a project CSV with a ``repo_id`` column, ranks developers by
their monthly ``community_openrank`` contribution within those repositories,
and enriches the Top N with ClickHouse ``gh_user_info`` plus optional GitHub API
fallback when ClickHouse has no profile row for a user.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import clickhouse_connect
import requests
from dotenv import load_dotenv


BASE = Path(__file__).resolve().parents[1]
ENV_PATH = BASE / "scripts" / ".env"
DEFAULT_INPUT_CSV = BASE / "data" / "agentic-ai-projects.csv"

load_dotenv(ENV_PATH)


def bypass_local_proxy_for_hosts(*hosts: str) -> None:
    additions = [host for host in hosts if host] + ["127.0.0.1", "localhost"]
    for key in ("no_proxy", "NO_PROXY"):
        existing = [item.strip() for item in os.getenv(key, "").split(",") if item.strip()]
        for item in additions:
            if item not in existing:
                existing.append(item)
        os.environ[key] = ",".join(existing)

    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
        value = os.getenv(key, "")
        if "127.0.0.1" in value or "localhost" in value:
            os.environ.pop(key, None)


def get_client():
    host = os.getenv("CLICKHOUSE_HOST", "").strip()
    bypass_local_proxy_for_hosts(host, "api.github.com")
    return clickhouse_connect.get_client(
        host=host,
        port=8123,
        username=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
    )


def parse_month(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m").date().replace(day=1)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Expected month in YYYY-MM format") from exc


def previous_completed_month(today: date | None = None) -> date:
    today = today or date.today()
    first_day_this_month = today.replace(day=1)
    return (first_day_this_month - timedelta(days=1)).replace(day=1)


def add_months(month: date, months: int) -> date:
    year = month.year + (month.month - 1 + months) // 12
    new_month = (month.month - 1 + months) % 12 + 1
    return date(year, new_month, 1)


def q(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def relative_or_absolute(path: Path) -> str:
    try:
        return str(path.relative_to(BASE))
    except ValueError:
        return str(path)


def default_output_path(input_csv: Path, openrank_month: date, limit: int) -> Path:
    suffix = openrank_month.strftime("%y%m")
    return input_csv.with_name(f"{input_csv.stem}_developer_profiles_top{limit}_{suffix}.csv")


def read_projects(input_csv: Path) -> list[dict[str, str]]:
    with input_csv.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_repo_ids(input_csv: Path) -> list[int]:
    repo_ids = []
    for row in read_projects(input_csv):
        value = (row.get("repo_id") or "").strip()
        if value.isdigit():
            repo_ids.append(int(value))
    return sorted(set(repo_ids))


def describe_tables(client) -> None:
    for table in ("events", "community_openrank", "gh_user_info", "location_info"):
        print(f"\n--- opensource.{table} ---")
        result = client.query(f"DESCRIBE TABLE opensource.{table}")
        for row in result.result_rows:
            print("\t".join(str(item) for item in row[:3]))


def table_columns(client, table: str) -> set[str]:
    result = client.query(f"DESCRIBE TABLE opensource.{table}")
    return {row[0] for row in result.result_rows}


def first_existing(columns: set[str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None


def fetch_github_user(login: str, session: requests.Session, headers: dict[str, str]) -> dict[str, Any] | None:
    try:
        response = session.get(f"https://api.github.com/users/{login}", headers=headers, timeout=20)
        if response.status_code == 200:
            return response.json()
        print(f"GitHub API miss: {login} status={response.status_code}")
    except requests.RequestException as exc:
        print(f"GitHub API error: {login} {exc}")
    return None


def profile_value(profile: dict[str, Any], candidates: list[str]) -> Any:
    for candidate in candidates:
        value = profile.get(candidate)
        if value not in (None, ""):
            return value
    return ""


def build_outputs(
    client,
    input_csv: Path,
    output_csv: Path,
    openrank_month: date,
    period_start: date,
    period_end: date,
    limit: int,
    include_bots: bool,
    use_github_fallback: bool,
) -> dict[str, Any]:
    repo_ids = read_repo_ids(input_csv)
    if not repo_ids:
        raise RuntimeError(f"No repo_id values found in {input_csv}")

    repo_ids_sql = ", ".join(str(repo_id) for repo_id in repo_ids)
    openrank_date = openrank_month.strftime("%Y-%m-01")
    suffix = openrank_month.strftime("%y%m")
    openrank_field = f"openrank_{suffix}"
    top_repo_field = f"top_repo_name_{suffix}"
    top_repo_openrank_field = f"top_repo_openrank_{suffix}"
    bot_filter = "" if include_bots else "AND c.actor_login NOT LIKE '%[bot]' AND c.actor_login NOT LIKE '%bot'"
    event_bot_filter = "" if include_bots else "AND actor_login NOT LIKE '%[bot]' AND actor_login NOT LIKE '%bot'"

    gh_cols = table_columns(client, "gh_user_info")
    loc_cols = table_columns(client, "location_info")
    print(f"Loaded {len(repo_ids)} target repo ids from {relative_or_absolute(input_csv)}")

    total_developers_sql = f"""
        SELECT countDistinct(actor_id)
        FROM opensource.events
        WHERE platform = 'GitHub'
          AND repo_id IN ({repo_ids_sql})
          AND actor_id != 0
          {event_bot_filter}
          AND created_at >= '{period_start.isoformat()}'
          AND created_at < '{period_end.isoformat()}'
    """
    total_developers = client.command(total_developers_sql)

    top_sql = f"""
        WITH
        actor_repo AS (
            SELECT
                c.actor_id,
                any(c.actor_login) AS actor_login,
                c.repo_id,
                any(c.repo_name) AS repo_name,
                sum(c.openrank) AS repo_openrank
            FROM opensource.community_openrank c
            WHERE c.platform = 'GitHub'
              AND c.created_at = '{openrank_date}'
              AND c.repo_id IN ({repo_ids_sql})
              AND c.actor_id != 0
              {bot_filter}
            GROUP BY c.actor_id, c.repo_id
        ),
        actor_total AS (
            SELECT
                actor_id,
                any(actor_login) AS actor_login,
                sum(repo_openrank) AS openrank
            FROM actor_repo
            GROUP BY actor_id
        ),
        top_repo AS (
            SELECT
                actor_id,
                argMax(repo_name, repo_openrank) AS top_repo_name,
                max(repo_openrank) AS top_repo_openrank
            FROM actor_repo
            GROUP BY actor_id
        )
        SELECT
            a.actor_id,
            a.actor_login,
            round(a.openrank, 6) AS openrank,
            r.top_repo_name,
            round(r.top_repo_openrank, 6) AS top_repo_openrank
        FROM actor_total a
        LEFT JOIN top_repo r ON a.actor_id = r.actor_id
        ORDER BY a.openrank DESC
        LIMIT {int(limit)}
    """
    top_rows = list(client.query(top_sql).named_results())
    actor_ids = [int(row["actor_id"]) for row in top_rows]
    print(f"Fetched top {len(actor_ids)} developers by {openrank_month.strftime('%Y-%m')} community OpenRank")

    profile_by_id: dict[int, dict[str, Any]] = {}
    if actor_ids:
        actor_ids_sql = ", ".join(str(actor_id) for actor_id in actor_ids)
        profile_sql = f"""
            SELECT *
            FROM opensource.gh_user_info
            WHERE id IN ({actor_ids_sql})
        """
        for row in client.query(profile_sql).named_results():
            actor_id = row.get("id")
            if actor_id:
                profile_by_id[int(actor_id)] = row

    location_col = first_existing(gh_cols, ["location"])
    loc_key_col = first_existing(loc_cols, ["location", "raw_location", "input", "query", "name"])
    loc_city_col = first_existing(loc_cols, ["city", "standard_city", "normalized_city", "locality"])
    loc_country_col = first_existing(loc_cols, ["country", "standard_country", "country_name"])
    normalized_by_location: dict[str, dict[str, Any]] = {}
    raw_locations = sorted(
        {
            str(profile.get(location_col) or "").strip()
            for profile in profile_by_id.values()
            if location_col and str(profile.get(location_col) or "").strip()
        }
    )
    if raw_locations and loc_key_col:
        values = ", ".join(f"'{q(location)}'" for location in raw_locations)
        loc_sql = f"""
            SELECT *
            FROM opensource.location_info
            WHERE {loc_key_col} IN ({values})
        """
        try:
            for row in client.query(loc_sql).named_results():
                key = str(row.get(loc_key_col) or "").strip()
                if key:
                    normalized_by_location[key] = row
        except Exception as exc:
            print(f"location_info join skipped: {exc}")

    github_token = os.getenv("GITHUB_TOKEN", "").strip()
    gh_headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        gh_headers["Authorization"] = f"token {github_token}"
    session = requests.Session()
    session.trust_env = False

    output_rows = []
    github_fallback_count = 0
    for row in top_rows:
        actor_id = int(row["actor_id"])
        login = row["actor_login"]
        profile = profile_by_id.get(actor_id, {})
        source = "clickhouse" if profile else ""

        location = profile_value(profile, ["location"])
        bio = profile_value(profile, ["bio"])
        email = profile_value(profile, ["email"])
        company = profile_value(profile, ["company"])
        name = profile_value(profile, ["name", "login"])
        github_created_at = profile_value(profile, ["created_at", "createdAt"])

        if use_github_fallback and not profile:
            gh_user = fetch_github_user(str(login), session, gh_headers)
            if gh_user:
                github_fallback_count += 1
                source = "github_api"
                location = gh_user.get("location") or ""
                bio = gh_user.get("bio") or ""
                email = gh_user.get("email") or ""
                company = gh_user.get("company") or ""
                name = gh_user.get("name") or ""
                github_created_at = gh_user.get("created_at") or ""
                if github_fallback_count % 50 == 0:
                    time.sleep(2)

        loc_row = normalized_by_location.get(str(location).strip(), {}) if location else {}
        output_rows.append(
            {
                "actor_id": actor_id,
                "actor_login": login,
                openrank_field: row["openrank"],
                top_repo_field: row["top_repo_name"],
                top_repo_openrank_field: row["top_repo_openrank"],
                "location": location,
                "standard_city": loc_row.get(loc_city_col) if loc_city_col else "",
                "standard_country": loc_row.get(loc_country_col) if loc_country_col else "",
                "bio": bio,
                "email": email,
                "company": company,
                "name": name,
                "created_at": github_created_at,
                "profile_source": source or "missing",
            }
        )

    fieldnames = [
        "actor_id",
        "actor_login",
        openrank_field,
        top_repo_field,
        top_repo_openrank_field,
        "location",
        "standard_city",
        "standard_country",
        "bio",
        "email",
        "company",
        "name",
        "created_at",
        "profile_source",
    ]
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    summary: dict[str, Any] = {
        "input_csv": relative_or_absolute(input_csv),
        "output_csv": relative_or_absolute(output_csv),
        "repo_count": len(repo_ids),
        "period": {"start": period_start.isoformat(), "end_exclusive": period_end.isoformat()},
        "include_bots": include_bots,
        "developer_count_in_period": total_developers,
        "openrank_month": openrank_month.strftime("%Y-%m"),
        "top_developer_limit": limit,
        "top_developer_rows": len(output_rows),
        "github_fallback_count": github_fallback_count,
        "profile_sources": {},
        "location_join": {
            "location_info_key": loc_key_col,
            "city_column": loc_city_col,
            "country_column": loc_country_col,
        },
    }
    for output_row in output_rows:
        source = output_row["profile_source"]
        summary["profile_sources"][source] = summary["profile_sources"].get(source, 0) + 1
    return summary


def main() -> None:
    default_month = previous_completed_month()
    default_period_start = date(default_month.year, 1, 1)
    default_period_end = add_months(default_month, 1)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema", action="store_true", help="Print ClickHouse table schemas and exit.")
    parser.add_argument("--input-csv", type=Path, default=DEFAULT_INPUT_CSV, help="Project CSV with repo_id.")
    parser.add_argument("--output-csv", type=Path, help="Output developer profile CSV.")
    parser.add_argument("--openrank-month", type=parse_month, default=default_month, help="YYYY-MM month for community_openrank.")
    parser.add_argument("--period-start", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date(), default=default_period_start)
    parser.add_argument("--period-end", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date(), default=default_period_end)
    parser.add_argument("--limit", type=int, default=1000, help="Number of developers to output.")
    parser.add_argument("--exclude-bots", action="store_true", help="Exclude bot-looking logins.")
    parser.add_argument("--no-github-fallback", action="store_true", help="Do not call GitHub API for users missing in gh_user_info.")
    args = parser.parse_args()

    input_csv = args.input_csv if args.input_csv.is_absolute() else BASE / args.input_csv
    output_csv = args.output_csv if args.output_csv else default_output_path(input_csv, args.openrank_month, args.limit)
    if not output_csv.is_absolute():
        output_csv = BASE / output_csv

    client = get_client()
    if args.schema:
        describe_tables(client)
        return

    summary = build_outputs(
        client=client,
        input_csv=input_csv,
        output_csv=output_csv,
        openrank_month=args.openrank_month,
        period_start=args.period_start,
        period_end=args.period_end,
        limit=args.limit,
        include_bots=not args.exclude_bots,
        use_github_fallback=not args.no_github_fallback,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
