#!/usr/bin/env python3
"""Freeze reproducible repository samples for the open collaboration study."""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path


DEFAULT_INPUT = Path("data/agentic-ai-projects.csv")
DEFAULT_PRIMARY_OUTPUT = Path(
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-sample-top100-2607.csv"
)
DEFAULT_CLASSIFICATION_REVIEW = Path(
    "insights/260912_open_collaboration_ai/research/"
    "collaboration-sample-llm-native-review-260829.csv"
)
CHATGPT_LAUNCH_BOUNDARY = "2022-12-01"
LLM_NATIVE_LABELS = {"llm_native", "traditional", "mixed", "uncertain"}

APPLICATION_SECTIONS = {
    "Agentic coding",
    "Coding workflows & harnesses",
    "Personal AI assistants",
    "Chatbot workspaces",
}
FRAMEWORK_SECTIONS = {
    "Code-first frameworks",
    "Multi-agent orchestration",
    "Workflow & agent builders",
}
RUNTIME_SECTIONS = {
    "Memory, knowledge & context",
    "Protocols & interoperability",
    "Tools, web & computer use",
    "Observability & evaluation",
    "Development sandboxes",
}

# These repositories are in the tracked Agentic AI pool but omitted from the
# current maps for editorial reasons. The study still needs an analytical niche.
MANUAL_NICHES = {
    "langchain-ai/deepagents": (
        "agent_framework",
        "Code-first frameworks",
        "Agent package in the LangChain/LangGraph project family.",
    ),
    "vllm-project/vllm-ascend": (
        "model_infra",
        "Serving - Inference",
        "Hardware integration in the vLLM serving project family.",
    ),
    "OpenHands/software-agent-sdk": (
        "agent_framework",
        "Code-first frameworks",
        "SDK split from the OpenHands project family.",
    ),
    "omnigent-ai/omnigent": (
        "agent_framework",
        "Multi-agent orchestration",
        "Agent harness and governance layer.",
    ),
    "coze-dev/coze-loop": (
        "agent_runtime_infra",
        "Observability & evaluation",
        "Agent observability and evaluation platform.",
    ),
    "NVIDIA/OpenShell": (
        "agent_runtime_infra",
        "Development sandboxes",
        "Execution and sandbox layer for agent workloads.",
    ),
    "marimo-team/marimo": (
        "agent_application",
        "Agentic coding",
        "AI-enabled developer workspace; direct Agentic AI scope needs review.",
    ),
    "weaviate/weaviate": (
        "agent_runtime_infra",
        "Memory, knowledge & context",
        "Data and retrieval substrate used by agent applications.",
    ),
    "Significant-Gravitas/AutoGPT": (
        "agent_application",
        "Personal AI assistants",
        "Autonomous agent application.",
    ),
    "siyuan-note/siyuan": (
        "agent_application",
        "Chatbot workspaces",
        "AI-enabled knowledge workspace; direct Agentic AI scope needs review.",
    ),
    "eosphoros-ai/DB-GPT": (
        "agent_framework",
        "Workflow & agent builders",
        "Framework for data-oriented agent applications.",
    ),
    "router-for-me/CLIProxyAPI": (
        "agent_runtime_infra",
        "Model API gateways",
        "Model API access layer used by coding agents and agent applications.",
    ),
}

OUTPUT_FIELDS = [
    "sample_rank",
    "sample_basis",
    "repo_id",
    "repo_name",
    "openrank_2607",
    "stars",
    "contributors",
    "participants_2607",
    "created_at",
    "age_boundary",
    "age_cohort",
    "age_interpretation",
    "llm_native_manual",
    "llm_native_confidence",
    "llm_native_reason",
    "language",
    "collaboration_niche",
    "agent_proximity",
    "study_section",
    "niche_source",
    "niche_review_note",
    "current_landscape_selected",
    "landscape_action",
    "landscape_layer",
    "landscape_section",
    "license",
    "archived",
    "pushed_at",
    "github_status",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--primary-output", type=Path, default=DEFAULT_PRIMARY_OUTPUT)
    parser.add_argument(
        "--classification-review", type=Path, default=DEFAULT_CLASSIFICATION_REVIEW
    )
    parser.add_argument("--top-n", type=int, default=100)
    parser.add_argument("--metric", default="openrank_2607")
    parser.add_argument("--age-cutoff", default=CHATGPT_LAUNCH_BOUNDARY)
    return parser.parse_args()


def read_rows(path: Path, metric: str) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    for row in rows:
        try:
            row["_ranking_value"] = float(row[metric])
        except (TypeError, ValueError, KeyError):
            row["_ranking_value"] = None
    return rows


def derive_niche(row: dict[str, str]) -> tuple[str, str, str, str]:
    repo = row["repo_name"]
    layer = row.get("landscape_layer", "")
    section = row.get("landscape_section", "")

    if layer == "Model Infra":
        return "model_infra", "supporting_infrastructure", section, "landscape"
    if section in APPLICATION_SECTIONS:
        return "agent_application", "direct_agent_experience", section, "landscape"
    if section in FRAMEWORK_SECTIONS:
        return "agent_framework", "agent_building", section, "landscape"
    if section in RUNTIME_SECTIONS:
        return (
            "agent_runtime_infra",
            "supporting_infrastructure",
            section,
            "landscape",
        )

    if repo not in MANUAL_NICHES:
        raise ValueError(f"No study niche mapping for {repo}")

    niche, study_section, note = MANUAL_NICHES[repo]
    proximity = {
        "agent_application": "direct_agent_experience",
        "agent_framework": "agent_building",
        "agent_runtime_infra": "supporting_infrastructure",
        "model_infra": "supporting_infrastructure",
    }[niche]
    return niche, proximity, study_section, f"manual: {note}"


def make_sample(
    rows: list[dict[str, str]],
    *,
    top_n: int,
    metric: str,
    age_cutoff: str,
    classifications: dict[str, dict[str, str]],
) -> list[dict[str, str]]:
    eligible = [row for row in rows if row["_ranking_value"] is not None]

    eligible.sort(key=lambda row: (-row["_ranking_value"], row["repo_name"].lower()))
    selected = eligible[:top_n]
    if len(selected) != top_n:
        raise ValueError(f"Expected {top_n} repositories, found {len(selected)}")

    sample_basis = f"tracked_pool_top_{top_n}_by_{metric}"
    output = []
    for rank, row in enumerate(selected, start=1):
        repo = row["repo_name"]
        niche, proximity, study_section, source = derive_niche(row)
        manual_note = ""
        niche_source = source
        if source.startswith("manual:"):
            niche_source = "study_manual_mapping"
            manual_note = source.removeprefix("manual: ")

        created_at = row.get("created_at", "")
        is_new = created_at >= age_cutoff
        classification = classifications.get(repo, {})
        output.append(
            {
                "sample_rank": rank,
                "sample_basis": sample_basis,
                "repo_id": row.get("repo_id", ""),
                "repo_name": row["repo_name"],
                "openrank_2607": row.get(metric, ""),
                "stars": row.get("stars", ""),
                "contributors": row.get("contributors", ""),
                "participants_2607": row.get("participants_2607", ""),
                "created_at": created_at,
                "age_boundary": age_cutoff,
                "age_cohort": (
                    "created_2022_12_or_later"
                    if is_new
                    else "created_before_2022_12"
                ),
                "age_interpretation": (
                    "post_chatgpt_launch_creation_proxy"
                    if is_new
                    else "pre_chatgpt_launch_creation_proxy"
                ),
                "llm_native_manual": classification.get("llm_native_manual", ""),
                "llm_native_confidence": classification.get(
                    "llm_native_confidence", ""
                ),
                "llm_native_reason": classification.get("llm_native_reason", ""),
                "language": row.get("language", "") or "Unknown",
                "collaboration_niche": niche,
                "agent_proximity": proximity,
                "study_section": study_section,
                "niche_source": niche_source,
                "niche_review_note": manual_note,
                "current_landscape_selected": (
                    "yes"
                    if row.get("landscape_action") in {"keep", "add"}
                    else "no"
                ),
                "landscape_action": row.get("landscape_action", ""),
                "landscape_layer": row.get("landscape_layer", ""),
                "landscape_section": row.get("landscape_section", ""),
                "license": row.get("license", ""),
                "archived": row.get("archived", ""),
                "pushed_at": row.get("pushed_at", ""),
                "github_status": row.get("github_status", ""),
            }
        )
    return output


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def read_manual_annotations(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {
            row["repo_name"]: row.get("llm_native_manual", "")
            for row in csv.DictReader(handle)
            if row.get("repo_name")
        }


def restore_manual_annotations(
    rows: list[dict[str, str]], annotations: dict[str, str]
) -> None:
    for row in rows:
        annotation = annotations.get(row["repo_name"], "")
        if annotation:
            row["llm_native_manual"] = annotation


def read_classification_review(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Missing classification review: {path}")
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    classifications: dict[str, dict[str, str]] = {}
    for row in rows:
        repo = row.get("repo_name", "").strip()
        label = row.get("llm_native_manual", "").strip()
        confidence = row.get("llm_native_confidence", "").strip()
        reason = row.get("llm_native_reason", "").strip()
        if not repo:
            raise ValueError("Classification review contains a row without repo_name")
        if repo in classifications:
            raise ValueError(f"Duplicate classification review for {repo}")
        if label not in LLM_NATIVE_LABELS:
            raise ValueError(f"Invalid llm_native_manual={label!r} for {repo}")
        if confidence not in {"high", "medium", "low"}:
            raise ValueError(f"Invalid confidence={confidence!r} for {repo}")
        if not reason:
            raise ValueError(f"Missing classification reason for {repo}")
        classifications[repo] = {
            "llm_native_manual": label,
            "llm_native_confidence": confidence,
            "llm_native_reason": reason,
        }
    return classifications


def validate_primary_classifications(
    rows: list[dict[str, str]], classifications: dict[str, dict[str, str]]
) -> None:
    sample_repos = {row["repo_name"] for row in rows}
    review_repos = set(classifications)
    missing = sorted(sample_repos - review_repos)
    extra = sorted(review_repos - sample_repos)
    if missing or extra:
        raise ValueError(
            "Classification review does not match primary sample: "
            f"missing={missing}, extra={extra}"
        )


def print_summary(label: str, rows: list[dict[str, str]]) -> None:
    print(f"{label}: {len(rows)} repositories")
    print(f"  cutoff OpenRank: {rows[-1]['openrank_2607']}")
    for field in ("age_cohort", "language", "collaboration_niche", "agent_proximity"):
        counts = Counter(row[field] for row in rows)
        formatted = ", ".join(f"{key}={value}" for key, value in counts.most_common())
        print(f"  {field}: {formatted}")


def main() -> None:
    args = parse_args()
    classifications = read_classification_review(args.classification_review)
    primary_annotations = read_manual_annotations(args.primary_output)
    rows = read_rows(args.input, args.metric)
    primary = make_sample(
        rows,
        top_n=args.top_n,
        metric=args.metric,
        age_cutoff=args.age_cutoff,
        classifications=classifications,
    )
    validate_primary_classifications(primary, classifications)
    restore_manual_annotations(primary, primary_annotations)
    write_csv(args.primary_output, primary)
    print_summary("primary", primary)


if __name__ == "__main__":
    main()
