#!/usr/bin/env python3
"""Refresh GitHub contributor counts in the canonical and landscape CSVs."""

from __future__ import annotations

import argparse
import csv
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
CANONICAL_PATH = ROOT / "data" / "agentic-ai-projects.csv"
DERIVED_PATHS = (
    ROOT / "data" / "agent_infra_landscape_projects.csv",
    ROOT / "data" / "model_infra_landscape_projects.csv",
)
API_VERSION = "2026-03-10"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Concurrent GitHub requests. Keep this small to avoid secondary limits.",
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


def github_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN", "").strip() or os.getenv("GH_TOKEN", "").strip()
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "agentic-ai-landscape-contributor-refresh",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def contributor_count(repo: str, headers: dict[str, str]) -> int:
    url = f"https://api.github.com/repos/{repo}/contributors"
    last_error = ""
    for attempt in range(4):
        response = requests.get(
            url,
            headers=headers,
            params={"per_page": 1},
            timeout=30,
        )
        if response.status_code == 204:
            return 0
        if response.status_code == 200:
            last_url = response.links.get("last", {}).get("url")
            if last_url:
                pages = parse_qs(urlparse(last_url).query).get("page", [])
                if pages:
                    return int(pages[0])
            payload = response.json()
            return len(payload) if isinstance(payload, list) else 0

        last_error = f"HTTP {response.status_code}: {response.text[:180]}"
        if response.status_code not in {429, 500, 502, 503, 504}:
            break
        time.sleep(2**attempt)
    raise RuntimeError(f"{repo}: {last_error}")


def with_contributors_field(fields: list[str]) -> list[str]:
    if "contributors" in fields:
        return fields
    index = fields.index("stars") + 1
    return [*fields[:index], "contributors", *fields[index:]]


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fields,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(path)


def main() -> None:
    args = parse_args()
    if args.workers < 1 or args.workers > 8:
        raise SystemExit("--workers must be between 1 and 8")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    fields, rows = read_csv(CANONICAL_PATH)
    headers = github_headers()
    counts: dict[str, int] = {}

    print(f"Fetching contributor counts for {len(rows)} repositories...")
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(contributor_count, row["repo_name"], headers): row["repo_name"]
            for row in rows
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            repo = futures[future]
            counts[repo.lower()] = future.result()
            if completed % 25 == 0 or completed == len(futures):
                print(f"  {completed}/{len(futures)}")

    output_fields = with_contributors_field(fields)
    for row in rows:
        row["contributors"] = str(counts[row["repo_name"].lower()])
    write_csv(CANONICAL_PATH, output_fields, rows)

    for path in DERIVED_PATHS:
        derived_fields, derived_rows = read_csv(path)
        for row in derived_rows:
            row["contributors"] = str(counts[row["repo_name"].lower()])
        write_csv(path, with_contributors_field(derived_fields), derived_rows)

    selected = [
        row
        for row in rows
        if row["landscape_action"].strip().lower() in {"keep", "add"}
    ]
    selected_counts = [int(row["contributors"]) for row in selected]
    print(f"Updated {CANONICAL_PATH.relative_to(ROOT)} and {len(DERIVED_PATHS)} derived CSVs")
    print(
        "Selected landscape contributor range: "
        f"{min(selected_counts):,} to {max(selected_counts):,}"
    )


if __name__ == "__main__":
    main()
