#!/usr/bin/env python3
"""Build the strictly curated Awesome x Agentic AI project registry.

The registry starts with the 26 projects selected for the 2026-07-29
landscape. Later Trending repositories are added only through the explicit
ADDITIONS mapping below; the full discovery pools are never merged into the
formal project list.
"""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = (
    ROOT
    / "outputs"
    / "awesome-agentic-landscape-260729"
    / "data"
    / "editorial_shortlist.csv"
)
TRENDING_PATH = ROOT / "data" / "github_trending_repositories_enriched_2026w21_w34.csv"
OUTPUT_PATH = ROOT / "data" / "awesome-agentic" / "projects.csv"


CATEGORY_ORDER = {
    "Curated collections": 1,
    "Skills & plugins": 2,
    "Domain playbooks": 3,
    "Workflows & methods": 4,
}


CATEGORIES = {
    # Curated collections
    "sindresorhus/awesome": "Curated collections",
    "e2b-dev/awesome-ai-agents": "Curated collections",
    "Shubhamsaboo/awesome-llm-apps": "Curated collections",
    "hesreallyhim/awesome-claude-code": "Curated collections",
    "punkpeye/awesome-mcp-servers": "Curated collections",
    "github/awesome-copilot": "Curated collections",
    "ComposioHQ/awesome-claude-skills": "Curated collections",
    "composio-community/awesome-codex-skills": "Curated collections",
    "VoltAgent/awesome-agent-skills": "Curated collections",
    # Skills & plugins
    "anthropics/skills": "Skills & plugins",
    "openai/skills": "Skills & plugins",
    "vercel-labs/skills": "Skills & plugins",
    "addyosmani/agent-skills": "Skills & plugins",
    "google/skills": "Skills & plugins",
    "anthropics/claude-plugins-official": "Skills & plugins",
    "wshobson/agents": "Skills & plugins",
    # Domain playbooks
    "VoltAgent/awesome-design-md": "Domain playbooks",
    "freestylefly/awesome-gpt-image-2": "Domain playbooks",
    "enescingoz/awesome-n8n-templates": "Domain playbooks",
    "cathrynlavery/diagram-design": "Domain playbooks",
    # Workflows & methods
    "affaan-m/ECC": "Workflows & methods",
    "obra/superpowers": "Workflows & methods",
    "github/spec-kit": "Workflows & methods",
    "garrytan/gstack": "Workflows & methods",
    "shanraisshan/claude-code-best-practice": "Workflows & methods",
    "sickn33/agentic-awesome-skills": "Workflows & methods",
    "rohitg00/awesome-claude-code-toolkit": "Workflows & methods",
    "virgiliojr94/book-to-skill": "Workflows & methods",
}


ADDITIONS = {
    "virgiliojr94/book-to-skill": {
        "selected_at": "2026-08-23",
        "selection_source": "GitHub Trending 2026-W31 to W32",
        "selection_reason": (
            "Turns a technical book into a reusable Claude Code skill; "
            "adds a distinct knowledge-to-skill form and appeared in two weekly lists."
        ),
    },
    "cathrynlavery/diagram-design": {
        "selected_at": "2026-08-23",
        "selection_source": "GitHub Trending 2026-W33 to W34",
        "selection_reason": (
            "Ships 38 reusable editorial diagram patterns for coding agents; "
            "ranked first in two consecutive weekly lists."
        ),
    },
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def normalize_base(row: dict[str, str]) -> dict[str, str]:
    repo_name = row["repo_name"]
    return {
        "repo_id": row["repo_id"],
        "repo_name": repo_name,
        "html_url": row["html_url"],
        "description": row["description"],
        "category": CATEGORIES[repo_name],
        "selected_at": "2026-07-29",
        "selection_source": "Awesome landscape 2026-07-29",
        "selection_reason": row["editorial_reason"],
        "stars": row["stars_current"],
        "participants": row["participants_3m"],
        "openrank": row["openrank_3m"],
        "github_snapshot_date": row["github_snapshot_date"],
        "language": row["language"],
        "license": row["license"],
    }


def normalize_addition(row: dict[str, str]) -> dict[str, str]:
    repo_name = row["repo_name"]
    addition = ADDITIONS[repo_name]
    return {
        "repo_id": row["repo_id"],
        "repo_name": repo_name,
        "html_url": row["html_url"],
        "description": row["description"],
        "category": CATEGORIES[repo_name],
        "selected_at": addition["selected_at"],
        "selection_source": addition["selection_source"],
        "selection_reason": addition["selection_reason"],
        "stars": row["stars"],
        "participants": row["participants_2607"],
        "openrank": row["openrank_2606"],
        "github_snapshot_date": row["github_snapshot_date"],
        "language": row["language"],
        "license": row["license"],
    }


def main() -> None:
    base_rows = read_csv(BASE_PATH)
    trending_by_name = {row["repo_name"]: row for row in read_csv(TRENDING_PATH)}
    output = [normalize_base(row) for row in base_rows]
    for repo_name in ADDITIONS:
        output.append(normalize_addition(trending_by_name[repo_name]))

    expected = set(CATEGORIES)
    actual = {row["repo_name"] for row in output}
    if actual != expected:
        raise ValueError(
            f"Curated registry mismatch: missing={sorted(expected - actual)}, "
            f"extra={sorted(actual - expected)}"
        )
    if len(actual) != len(output):
        raise ValueError("Curated registry contains duplicate repositories.")

    output.sort(
        key=lambda row: (
            CATEGORY_ORDER[row["category"]],
            row["selected_at"],
            row["repo_name"].lower(),
        )
    )
    for index, row in enumerate(output, 1):
        row["selection_order"] = str(index)

    fieldnames = [
        "selection_order",
        "repo_id",
        "repo_name",
        "html_url",
        "description",
        "category",
        "selected_at",
        "selection_source",
        "selection_reason",
        "stars",
        "participants",
        "openrank",
        "github_snapshot_date",
        "language",
        "license",
    ]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output)

    print(f"Wrote {len(output)} curated projects to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
