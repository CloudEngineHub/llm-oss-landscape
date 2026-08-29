#!/usr/bin/env python3
"""Build an evidence-preserving actor registry for sampled collaboration threads."""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from collect_collaboration_items import strict_ai_disclosure_evidence


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_ITEMS = RESEARCH / "collaboration-thread-sample-2026.csv"
DEFAULT_EVENTS = RESEARCH / "collaboration-thread-events-2026.csv"
DEFAULT_REVIEW_EVENTS = RESEARCH / "collaboration-thread-review-comments-2026.csv"
DEFAULT_COMMIT_EVENTS = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-actor-registry-2026.csv"

FIELDS = [
    "actor_login",
    "github_types",
    "observed_as_opener",
    "observed_in_timeline",
    "observed_in_review",
    "observed_in_review_comment",
    "observed_in_commit",
    "repository_count",
    "thread_count",
    "performed_via_apps",
    "explicit_ai_disclosure_count",
    "explicit_ai_disclosure_examples",
    "ai_assistance_disclosed_by_actor",
    "bot_name_signal",
    "agent_name_signal",
    "automation_role",
    "automation_role_evidence",
    "automation_role_confidence",
    "initial_class",
    "final_class",
    "evidence_grade",
    "needs_manual_review",
    "manual_evidence_url",
    "manual_note",
]

BOT_NAME = re.compile(r"(?:\[bot\]$|[-_]?bot\d*$|^bot[-_])", re.IGNORECASE)
AGENT_NAME = re.compile(r"(?:copilot|codex|claude|cursor|devin|sweep|agent|roboclaw|coderabbit)", re.IGNORECASE)

# Exact identities or GitHub App slugs observed in the sample. These labels
# describe the function visible in repository collaboration; they do not claim
# that every action was autonomous or that the underlying code was AI-written.
KNOWN_AUTOMATION_ROLES = {
    "Copilot": ("coding_agent", "exact GitHub Bot identity", "high"),
    "coderabbitai[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "chatgpt-codex-connector[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "cursor[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "claude[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "clawsweeper[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "devin-ai-integration[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "warp-agent-staging[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "dynamo-review-agent[bot]": ("review_agent", "exact bot identity", "high"),
    "coder-agents-review[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "coderagents[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "opencode-agent[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "superagent-security[bot]": ("security_review_agent", "exact GitHub App bot identity", "high"),
    "omni-resolve-agent[bot]": ("coding_agent", "exact bot identity", "high"),
    "oss-pr-review-agent-shin[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "vllm-omni-review-bot": ("review_agent", "exact account identity", "medium"),
    "all-hands-bot": ("coding_agent", "OpenHands GitHub App attribution", "high"),
    "gemini-code-assist[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "gemini-cli[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "greptile-apps[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "sourcery-ai[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "cubic-dev-ai[bot]": ("review_agent", "exact bot identity", "medium"),
    "zeroclaw-reviewer[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "autogpt-pr-reviewer[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "autogpt-pr-reviewer-in-dev[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "qodo-code-review[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "gitar-bot[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "astrpluginreviewer[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "alwaysmeticulous[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "macroscopeapp[bot]": ("review_agent", "exact GitHub App bot identity", "high"),
    "warp-for-oss[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "linear-code[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "open-swe[bot]": ("coding_agent", "exact bot identity", "medium"),
    "codeflash-ai[bot]": ("coding_agent", "exact bot identity", "medium"),
    "kilo-code-bot[bot]": ("coding_agent", "exact bot identity", "medium"),
    "ellipsis-dev[bot]": ("coding_agent", "exact bot identity", "medium"),
    "cline-for-jetbrains-workflow[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "ai-sdk-factory[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "commitperclip[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "dane-ai-mastra[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "cherry-ai-bot[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "t3-code[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "t3code-tarik02[bot]": ("coding_agent", "exact bot identity", "medium"),
    "qoderai[bot]": ("coding_agent", "exact GitHub App bot identity", "high"),
    "aikido-autofix[bot]": ("security_review_agent", "exact bot identity", "medium"),
    "depthfirst-app[bot]": ("security_review_agent", "exact bot identity", "medium"),
    "socket-security[bot]": ("security_review_agent", "exact GitHub App bot identity", "high"),
    "dosubot": ("support_agent", "exact account identity", "medium"),
    "dosu-bot": ("support_agent", "exact account identity", "medium"),
    "dosubot[bot]": ("support_agent", "exact GitHub App bot identity", "high"),
    "n8n-assistant[bot]": ("support_agent", "exact GitHub App bot identity", "high"),
    "langchain-oss-automated-triage[bot]": ("support_agent", "exact GitHub App bot identity", "high"),
    "copilotkit-support-bot[bot]": ("support_agent", "exact GitHub App bot identity", "high"),
}

CONVENTIONAL_AUTOMATION = re.compile(
    r"(?:dependabot|renovate|codecov|cla(?:-|_)bot|merge(?:-|_)?bot|ci(?:-|_)?bot|"
    r"release(?:-|_)?bot|pytorchbot|pytorchmergebot|sre-ci-robot|qwen-code-ci-bot|"
    r"flashinfer-bot|lobehubbot|vllm-bot|BrewTestBot|aws-airflow-bot|sglang-npu-bot|"
    r"github-actions|vercel|github-project-automation|mergify|copy-pr-bot|changeset-bot|"
    r"github-merge-queue|pull-request-size|copybara|boring-cyborg|sonarqubecloud|"
    r"codspeed|datadog|linear\[bot\]|mintlify|stale\[bot\]|easycla|azure-pipelines|"
    r"auto-assign|chromatic|github-advanced-security|github-code-quality|policy-service|"
    r"pytorch-bot|paddle-bot|omnigent-ci|owui-terminator|pkg-pr-new|google-cla|nx-cloud|"
    r"meta-codesync|datahub-connector-tests|gitguardian|pre-commit-ci|issue-sync)",
    re.IGNORECASE,
)


def automation_role(login: str, apps: set[str], github_bot: bool) -> tuple[str, str, str]:
    known = KNOWN_AUTOMATION_ROLES.get(login)
    if known:
        return known
    if "openhands-ai" in apps:
        if github_bot:
            return "coding_agent", "OpenHands GitHub App attribution", "high"
        return "agent_mediated_user", "OpenHands GitHub App attribution", "high"
    if CONVENTIONAL_AUTOMATION.search(login):
        return "conventional_automation", "account-name function signal", "medium"
    if github_bot:
        return "unknown_automation", "GitHub Bot type only", "low"
    return "not_automation", "", ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    parser.add_argument(
        "--extra-events",
        type=Path,
        action="append",
        default=None,
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if args.extra_events is None:
        args.extra_events = [DEFAULT_REVIEW_EVENTS, DEFAULT_COMMIT_EVENTS]
    return args


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def main() -> None:
    args = parse_args()
    items = read_csv(args.items)
    events = read_csv(args.events)
    for path in args.extra_events:
        events.extend(read_csv(path))
    if not items:
        raise SystemExit("Thread sample is empty")

    records: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "types": set(),
            "repositories": set(),
            "threads": set(),
            "apps": set(),
            "sources": set(),
            "disclosures": [],
        }
    )

    for row in items:
        login = row.get("author_login", "")
        if not login:
            continue
        record = records[login]
        record["types"].add(row.get("author_github_type", ""))
        record["repositories"].add(row["repo_name"])
        record["threads"].add((row["repo_name"], row["number"]))
        record["sources"].add("opener")
        if row.get("performed_via_github_app"):
            record["apps"].add(row["performed_via_github_app"])
        evidence = row.get("ai_disclosure_evidence", "")
        if row.get("ai_disclosure_candidate") == "candidate" and strict_ai_disclosure_evidence(evidence):
            record["disclosures"].append(evidence)

    for row in events:
        login = row.get("actor_login", "")
        if not login:
            continue
        record = records[login]
        record["types"].add(row.get("actor_github_type", ""))
        record["repositories"].add(row["repo_name"])
        record["threads"].add((row["repo_name"], row["number"]))
        record["sources"].add(row.get("event_source", ""))
        if row.get("performed_via_github_app"):
            record["apps"].add(row["performed_via_github_app"])
        evidence = row.get("ai_disclosure_evidence", "")
        if row.get("ai_disclosure_candidate") == "candidate" and strict_ai_disclosure_evidence(evidence):
            record["disclosures"].append(evidence)

    output = []
    for login, record in sorted(records.items(), key=lambda item: item[0].lower()):
        types = {item for item in record["types"] if item}
        bot_name = bool(BOT_NAME.search(login))
        agent_name = bool(AGENT_NAME.search(login))
        github_bot = "Bot" in types or login.lower().endswith("[bot]")
        disclosures = [item for item in record["disclosures"] if item]
        role, role_evidence, role_confidence = automation_role(login, record["apps"], github_bot)
        if github_bot:
            initial = "automation_bot"
            final = "automation_bot"
            grade = "A"
            review = "yes" if role == "unknown_automation" else "no"
        elif role == "agent_mediated_user" and "User" in types:
            initial = "human_account_agent_mediated"
            final = "human_account"
            grade = "A_account_type_and_app"
            review = "no"
        elif role != "not_automation":
            initial = "automation_service_account"
            final = "automation_service_account"
            grade = "B_identity_function"
            review = "yes" if role_confidence == "low" else "no"
        elif bot_name or agent_name:
            initial = "identity_candidate"
            final = "candidate_review"
            grade = "name_only"
            review = "yes"
        elif "User" in types:
            initial = "human_account"
            final = "human_account"
            grade = "A_account_type"
            review = "no"
        else:
            initial = "unknown"
            final = "unknown"
            grade = "insufficient"
            review = "yes"
        output.append(
            {
                "actor_login": login,
                "github_types": "|".join(sorted(types)),
                "observed_as_opener": str("opener" in record["sources"]).lower(),
                "observed_in_timeline": str("timeline" in record["sources"]).lower(),
                "observed_in_review": str("pull_review" in record["sources"]).lower(),
                "observed_in_review_comment": str(
                    "pull_review_comment" in record["sources"]
                ).lower(),
                "observed_in_commit": str("pull_commit" in record["sources"]).lower(),
                "repository_count": len(record["repositories"]),
                "thread_count": len(record["threads"]),
                "performed_via_apps": "|".join(sorted(record["apps"])),
                "explicit_ai_disclosure_count": len(disclosures),
                "explicit_ai_disclosure_examples": " || ".join(dict.fromkeys(disclosures))[:1000],
                "ai_assistance_disclosed_by_actor": str(bool(disclosures)).lower(),
                "bot_name_signal": str(bot_name).lower(),
                "agent_name_signal": str(agent_name).lower(),
                "automation_role": role,
                "automation_role_evidence": role_evidence,
                "automation_role_confidence": role_confidence,
                "initial_class": initial,
                "final_class": final,
                "evidence_grade": grade,
                "needs_manual_review": review,
                "manual_evidence_url": "",
                "manual_note": "",
            }
        )

    write_csv(args.output, output)
    print(f"Wrote {len(output)} actors to {display_path(args.output)}")
    print(f"Manual review candidates: {sum(row['needs_manual_review'] == 'yes' for row in output)}")


if __name__ == "__main__":
    main()
