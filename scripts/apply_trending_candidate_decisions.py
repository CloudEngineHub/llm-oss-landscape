#!/usr/bin/env python3
"""Apply explicit ADD decisions from the Trending candidate review to the canonical CSV."""

from __future__ import annotations

import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DECISIONS_PATH = ROOT / "data" / "github_trending_agentic_candidate_analysis_2026w21_w34.md"
SOURCE_PATH = ROOT / "data" / "github_trending_agentic_review_shortlist_2026w21_w34.csv"
TARGET_PATH = ROOT / "data" / "agentic-ai-projects.csv"

REQUIRED_FIELDS = (
    "repo_id",
    "repo_name",
    "description",
    "stars",
    "forks",
    "open_issues",
    "license",
    "archived",
    "pushed_at",
    "language",
    "created_at",
    "landscape_layer",
    "landscape_section",
    "selection_reason",
    "selection_caveat",
    "github_status",
)


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def selected_repo_names() -> list[str]:
    selected: list[str] = []
    for line in DECISIONS_PATH.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| ["):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if not cells or cells[-1].upper() != "ADD":
            continue
        match = re.search(r"\[([^]]+)\]", cells[0])
        if match:
            selected.append(match.group(1))
    return selected


def write_csv_atomic(
    path: Path,
    fieldnames: list[str],
    rows: list[dict[str, str]],
) -> None:
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
    selected = selected_repo_names()
    if not selected:
        raise SystemExit("No rows are explicitly marked ADD in the review Markdown.")

    target_fields, target_rows = read_csv(TARGET_PATH)
    _, source_rows = read_csv(SOURCE_PATH)
    source_by_name = {row["repo_name"].lower(): row for row in source_rows}
    existing_ids = {row["repo_id"].strip() for row in target_rows}
    existing_names = {row["repo_name"].strip().lower() for row in target_rows}

    missing_sources = [name for name in selected if name.lower() not in source_by_name]
    if missing_sources:
        raise SystemExit(f"Selected repositories missing from source CSV: {missing_sources}")

    additions: list[dict[str, str]] = []
    skipped_existing: list[str] = []
    for name in selected:
        source = source_by_name[name.lower()]
        repo_id = source["repo_id"].strip()
        canonical_name = source["repo_name"].strip()
        if repo_id in existing_ids or canonical_name.lower() in existing_names:
            skipped_existing.append(canonical_name)
            continue

        row = {field: source.get(field, "") for field in target_fields}
        row["landscape_action"] = "add"
        missing_required = [field for field in REQUIRED_FIELDS if not row[field].strip()]
        if missing_required:
            raise SystemExit(
                f"{canonical_name} is missing required fields: {missing_required}"
            )
        additions.append(row)
        existing_ids.add(repo_id)
        existing_names.add(canonical_name.lower())

    merged_rows = target_rows + additions
    merged_ids = [row["repo_id"].strip() for row in merged_rows]
    merged_names = [row["repo_name"].strip().lower() for row in merged_rows]
    if len(merged_ids) != len(set(merged_ids)):
        raise SystemExit("Merge would create duplicate repo_id values.")
    if len(merged_names) != len(set(merged_names)):
        raise SystemExit("Merge would create duplicate repo_name values.")

    write_csv_atomic(TARGET_PATH, target_fields, merged_rows)
    print(f"Selected: {len(selected)}")
    print(f"Added: {len(additions)}")
    print(f"Skipped existing: {len(skipped_existing)}")
    print(f"Canonical rows: {len(target_rows)} -> {len(merged_rows)}")
    for row in additions:
        print(f"  + {row['repo_name']}")


if __name__ == "__main__":
    main()
