"""Build GitHub developer profile CSVs for a project set.

The script reads a project CSV with a ``repo_id`` column, ranks developers by
their monthly or period OpenRank contribution within those repositories, and
enriches the Top N with ClickHouse ``gh_user_info`` plus optional GitHub API
fallback when ClickHouse has no profile row for a user.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import time
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import clickhouse_connect
import requests
from dotenv import load_dotenv


BASE = Path(__file__).resolve().parents[1]
ENV_PATH = BASE / "scripts" / ".env"
DEFAULT_INPUT_CSV = BASE / "data" / "agentic-ai-projects.csv"

load_dotenv(ENV_PATH, override=True)


def bypass_local_proxy_for_hosts(*hosts: str) -> None:
    additions = [host for host in hosts if host] + ["127.0.0.1", "localhost"]
    for key in ("no_proxy", "NO_PROXY"):
        existing = [item.strip() for item in os.getenv(key, "").split(",") if item.strip()]
        for item in additions:
            if item not in existing:
                existing.append(item)
        os.environ[key] = ",".join(existing)

    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
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


def month_sequence(start: date, end_exclusive: date) -> list[date]:
    months = []
    current = date(start.year, start.month, 1)
    while current < end_exclusive:
        months.append(current)
        current = add_months(current, 1)
    return months


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
    for table in ("events", "community_openrank", "normalized_community_openrank", "gh_user_info", "location_info"):
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


BOT_LOGIN_RE = re.compile(
    r"(\[bot\]$|bot$|^bot-|(^|[-_])bot([-_]|$)|^app/|github-actions|dependabot|renovate|"
    r"coderabbit|codecov|sonarcloud|pre-commit-ci|stale|vercel|netlify|"
    r"cicd|(^|[-_])ci([-_]|$)|robot-?ci|jenkins|buildkite|automation|"
    r"automated|actions$|^actions[-_]|mergebot|merge-bot|release-bot|cla-assistant)",
    re.IGNORECASE,
)


def bot_reason(login: str, profile: dict[str, Any] | None = None) -> str:
    if BOT_LOGIN_RE.search(login or ""):
        return "login_pattern"
    profile = profile or {}
    status = str(profile.get("status") or "").lower()
    if status == "bot":
        return "profile_status"
    return ""


def as_json_array(value: Any) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value
    try:
        return json.dumps(list(value), ensure_ascii=False)
    except TypeError:
        return json.dumps(value, ensure_ascii=False)


def social_accounts_by_provider(names: Any, providers: Any) -> tuple[dict[str, str], str]:
    if not names or not providers:
        return {}, ""
    try:
        names_list = list(names)
        providers_list = list(providers)
    except TypeError:
        return {}, ""

    grouped: dict[str, list[str]] = {}
    other: list[str] = []
    for provider, name in zip(providers_list, names_list):
        provider_key = str(provider or "").strip().lower()
        account = str(name or "").strip()
        if not provider_key or not account:
            continue
        if provider_key in {"twitter", "linkedin"}:
            grouped.setdefault(provider_key, [])
            if account not in grouped[provider_key]:
                grouped[provider_key].append(account)
        else:
            item = f"{provider_key}: {account}"
            if item not in other:
                other.append(item)

    flattened = {provider: "; ".join(accounts) for provider, accounts in grouped.items()}
    return flattened, "; ".join(other)


def openrank_int(value: Any) -> int:
    return int(round(float(value or 0)))


def build_outputs(
    client,
    input_csv: Path,
    output_csv: Path,
    openrank_month: date | None,
    period_start: date,
    period_end: date,
    limit: int,
    include_bots: bool,
    use_github_fallback: bool,
    openrank_table: str,
) -> dict[str, Any]:
    repo_ids = read_repo_ids(input_csv)
    if not repo_ids:
        raise RuntimeError(f"No repo_id values found in {input_csv}")

    repo_ids_sql = ", ".join(str(repo_id) for repo_id in repo_ids)
    months = month_sequence(period_start, period_end)
    if not months:
        raise RuntimeError("period-start must be earlier than period-end")
    suffix = f"{months[0].strftime('%y%m')}_{months[-1].strftime('%y%m')}"
    openrank_total_field = f"openrank_total_{suffix}"
    month_fields = [f"openrank_{month.strftime('%y%m')}" for month in months]
    bot_sql_pattern = (
        "(\\\\[bot\\\\]$|bot$|^bot-|(^|[-_])bot([-_]|$)|^app/|github-actions|dependabot|renovate|"
        "coderabbit|codecov|sonarcloud|pre-commit-ci|stale|vercel|netlify|"
        "cicd|(^|[-_])ci([-_]|$)|robot-?ci|jenkins|buildkite|automation|"
        "automated|actions$|^actions[-_]|mergebot|merge-bot|release-bot|cla-assistant)"
    )
    bot_filter = "" if include_bots else (
        "AND NOT match(lower(c.actor_login), "
        f"'{bot_sql_pattern}')"
    )
    event_bot_filter = "" if include_bots else (
        "AND NOT match(lower(actor_login), "
        f"'{bot_sql_pattern}')"
    )

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

    yyyymm_expr = "c.yyyymm" if openrank_table == "normalized_community_openrank" else "toYYYYMM(c.created_at)"
    month_selects = []
    for month, field in zip(months, month_fields):
        yyyymm = month.year * 100 + month.month
        month_selects.append(f"round(sumIf(repo_month_openrank, yyyymm = {yyyymm}), 6) AS {field}")
    month_select_sql = ",\n                ".join(month_selects)
    final_month_select_sql = ",\n            ".join(f"m.{field} AS {field}" for field in month_fields)
    candidate_limit = int(limit if include_bots else limit * 3)
    top_sql = f"""
        WITH
        actor_repo_month AS (
            SELECT
                c.actor_id,
                any(c.actor_login) AS actor_login,
                c.repo_id,
                any(c.repo_name) AS repo_name,
                {yyyymm_expr} AS yyyymm,
                sum(c.openrank) AS repo_month_openrank
            FROM opensource.{openrank_table} c
            WHERE c.platform = 'GitHub'
              AND c.created_at >= '{period_start.isoformat()}'
              AND c.created_at < '{period_end.isoformat()}'
              AND c.repo_id IN ({repo_ids_sql})
              AND c.actor_id != 0
              {bot_filter}
            GROUP BY c.actor_id, c.repo_id, yyyymm
        ),
        actor_repo AS (
            SELECT
                actor_id,
                any(actor_login) AS actor_login,
                repo_id,
                any(repo_name) AS repo_name,
                sum(repo_month_openrank) AS repo_openrank
            FROM actor_repo_month
            GROUP BY actor_id, repo_id
        ),
        actor_total AS (
            SELECT
                actor_id,
                any(actor_login) AS actor_login,
                round(sum(repo_openrank), 6) AS openrank_total,
                countDistinct(repo_id) AS repo_count
            FROM actor_repo
            GROUP BY actor_id
        ),
        actor_month AS (
            SELECT
                actor_id,
                {month_select_sql},
                countDistinct(yyyymm) AS active_months
            FROM actor_repo_month
            GROUP BY actor_id
        ),
        top_repo AS (
            SELECT
                actor_id,
                argMax(repo_name, repo_openrank) AS top_repo_name,
                round(max(repo_openrank), 6) AS top_repo_openrank_total
            FROM actor_repo
            GROUP BY actor_id
        )
        SELECT
            a.actor_id AS actor_id,
            a.actor_login AS actor_login,
            a.openrank_total AS openrank_total,
            {final_month_select_sql},
            a.repo_count AS repo_count,
            r.top_repo_name AS top_repo_name,
            r.top_repo_openrank_total AS top_repo_openrank_total
        FROM actor_total a
        LEFT JOIN actor_month m ON a.actor_id = m.actor_id
        LEFT JOIN top_repo r ON a.actor_id = r.actor_id
        ORDER BY a.openrank_total DESC
        LIMIT {candidate_limit}
    """
    top_rows = list(client.query(top_sql).named_results())
    actor_ids = [int(row["actor_id"]) for row in top_rows]
    print(f"Fetched top {len(actor_ids)} developers by {period_start.isoformat()}..{period_end.isoformat()} {openrank_table}")

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
    loc_admin1_col = first_existing(loc_cols, ["administrative_area_level_1"])
    loc_admin2_col = first_existing(loc_cols, ["administrative_area_level_2"])
    loc_longitude_col = first_existing(loc_cols, ["longitude"])
    loc_latitude_col = first_existing(loc_cols, ["latitude"])
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
        reason = bot_reason(str(login), profile)
        if reason and not include_bots:
            continue
        source = "clickhouse" if profile else ""

        location = profile_value(profile, ["location"])
        bio = profile_value(profile, ["bio"])
        email = profile_value(profile, ["email"])
        company = profile_value(profile, ["company"])
        name = profile_value(profile, ["name", "login"])
        github_created_at = profile_value(profile, ["created_at", "createdAt"])
        profile_updated_at = profile_value(profile, ["updated_at", "updatedAt"])
        twitter_username = profile_value(profile, ["twitter_username"])
        social_names = profile_value(profile, ["social_accounts.name"])
        social_providers = profile_value(profile, ["social_accounts.provider"])
        social_fields, social_other = social_accounts_by_provider(social_names, social_providers)

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
                profile_updated_at = gh_user.get("updated_at") or ""
                twitter_username = gh_user.get("twitter_username") or ""
                if github_fallback_count % 50 == 0:
                    time.sleep(2)

        loc_row = normalized_by_location.get(str(location).strip(), {}) if location else {}
        out = {
            "rank": len(output_rows) + 1,
            "actor_id": actor_id,
            "actor_login": login,
            openrank_total_field: openrank_int(row["openrank_total"]),
            "monthly_openrank": json.dumps(
                [openrank_int(row.get(field)) for field in month_fields],
                ensure_ascii=False,
            ),
        }
        twitter = twitter_username or social_fields.get("twitter", "")
        out.update(
            {
                "repo_count": row.get("repo_count", ""),
                "top_repo_name": row["top_repo_name"],
                "top_repo_openrank_total": openrank_int(row["top_repo_openrank_total"]),
                "name": name,
                "company": company,
                "email": email,
                "twitter": twitter,
                "linkedin": social_fields.get("linkedin", ""),
                "other_social_accounts": social_other,
                "blog": profile_value(profile, ["blog"]),
                "standard_city": loc_row.get(loc_city_col) if loc_city_col else "",
                "standard_country": loc_row.get(loc_country_col) if loc_country_col else "",
                "bio": bio,
                "github_created_at": github_created_at,
                "github_updated_at": profile_updated_at,
                "profile_source": source or "missing",
                "is_likely_bot": bool(reason),
                "bot_reason": reason,
            }
        )
        output_rows.append(
            out
        )
        if len(output_rows) >= limit:
            break

    fieldnames = [
        "rank",
        "actor_id",
        "actor_login",
        openrank_total_field,
        "monthly_openrank",
        "repo_count",
        "top_repo_name",
        "top_repo_openrank_total",
        "name",
        "company",
        "email",
        "twitter",
        "linkedin",
        "other_social_accounts",
        "blog",
        "standard_city",
        "standard_country",
        "bio",
        "github_created_at",
        "github_updated_at",
        "profile_source",
        "is_likely_bot",
        "bot_reason",
    ]
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    country_counts = Counter(str(row.get("standard_country") or "").strip() for row in output_rows if row.get("standard_country"))
    city_counts = Counter(str(row.get("standard_city") or "").strip() for row in output_rows if row.get("standard_city"))
    summary: dict[str, Any] = {
        "input_csv": relative_or_absolute(input_csv),
        "output_csv": relative_or_absolute(output_csv),
        "repo_count": len(repo_ids),
        "period": {"start": period_start.isoformat(), "end_exclusive": period_end.isoformat()},
        "openrank_table": openrank_table,
        "include_bots": include_bots,
        "developer_count_in_period": total_developers,
        "top_developer_limit": limit,
        "top_developer_rows": len(output_rows),
        "github_fallback_count": github_fallback_count,
        "missing_email": sum(1 for row in output_rows if not row.get("email")),
        "missing_bio": sum(1 for row in output_rows if not row.get("bio")),
        "missing_standard_location": sum(
            1 for row in output_rows if not row.get("standard_country") and not row.get("standard_city")
        ),
        "standardized_location_rows": sum(1 for row in output_rows if row.get("standard_country") or row.get("standard_city")),
        "top_countries": country_counts.most_common(20),
        "top_cities": city_counts.most_common(20),
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
    parser.add_argument("--openrank-month", type=parse_month, default=None, help="Legacy single month hint. Period ranking is controlled by --period-start/--period-end.")
    parser.add_argument("--openrank-table", default="community_openrank", choices=["community_openrank", "normalized_community_openrank"])
    parser.add_argument("--period-start", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date(), default=default_period_start)
    parser.add_argument("--period-end", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date(), default=default_period_end)
    parser.add_argument("--limit", type=int, default=1000, help="Number of developers to output.")
    parser.add_argument("--exclude-bots", action="store_true", help="Exclude bot-looking logins.")
    parser.add_argument("--no-github-fallback", action="store_true", help="Do not call GitHub API for users missing in gh_user_info.")
    parser.add_argument("--summary-json", type=Path, help="Optional JSON summary output path.")
    args = parser.parse_args()

    input_csv = args.input_csv if args.input_csv.is_absolute() else BASE / args.input_csv
    output_csv = args.output_csv if args.output_csv else default_output_path(input_csv, args.openrank_month or default_month, args.limit)
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
        openrank_table=args.openrank_table,
    )
    if args.summary_json:
        summary_json = args.summary_json if args.summary_json.is_absolute() else BASE / args.summary_json
        summary_json.parent.mkdir(parents=True, exist_ok=True)
        summary_json.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
