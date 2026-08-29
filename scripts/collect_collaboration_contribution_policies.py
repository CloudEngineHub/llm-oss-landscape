#!/usr/bin/env python3
"""Collect broad, reviewable contribution-policy evidence for the Top 100 sample."""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from collaboration_github import GitHubClient, direct_network_setup


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_SAMPLE = RESEARCH / "collaboration-sample-top100-2607.csv"
DEFAULT_SURFACES = RESEARCH / "collaboration-surfaces-top100-260829.csv"
DEFAULT_OUTPUT = RESEARCH / "collaboration-contribution-policies-260829.csv"
DEFAULT_EVIDENCE = RESEARCH / "collaboration-contribution-policy-evidence-260829.csv"
DEFAULT_RUN = RESEARCH / "collaboration-contribution-policies-260829-run.json"

POLICY_PATH = re.compile(
    r"(?:^|/)(?:readme(?:\.[^/]+)?|contribut(?:e|ing)(?:\.[^/]+)?|governance(?:\.[^/]+)?|"
    r"pull_request_template(?:\.[^/]+)?|development(?:\.[^/]+)?|developer(?:\.[^/]+)?|"
    r"code[-_ ]?of[-_ ]?conduct(?:\.[^/]+)?)$",
    re.IGNORECASE,
)
PATH_HINT = re.compile(r"(?:contribut|pull.?request|governance|develop)", re.IGNORECASE)
TEXT_EXTENSIONS = {"", ".md", ".mdx", ".rst", ".txt", ".adoc"}
MAX_POLICY_FILES = 24
MAX_FILE_BYTES = 250_000

SIGNALS: dict[str, tuple[re.Pattern[str], ...]] = {
    "closed_to_external_pr": (
        re.compile(r"(?:do(?:es)?\s+not|not|no\s+longer)\s+accept(?:ing)?\s+(?:external\s+)?pull requests?", re.I),
        re.compile(
            r"(?:we\s+)?do\s+not\s+accept(?:\s+external)?(?:\s+code)?"
            r"(?:\s+contributions?\s+or)?\s+pull requests?",
            re.I,
        ),
        re.compile(r"pull requests?\s+(?:are|is)\s+not\s+accepted", re.I),
        re.compile(r"(?:external|community)\s+pull requests?\s+(?:will\s+be|are)\s+(?:closed|ignored|rejected)", re.I),
    ),
    "preapproval_or_issue_first": (
        re.compile(r"(?:open|file|create)\s+(?:an?\s+)?issue\s+(?:first|before)", re.I),
        re.compile(r"do\s+not\s+open\s+(?:a\s+)?pull request\s+as\s+(?:the\s+)?first step", re.I),
        re.compile(r"(?:discuss|discussion|approval|approved|agreement)\s+(?:is\s+)?(?:required|before)\s+(?:you\s+)?(?:open|submit|work|implement)", re.I),
        re.compile(r"pull requests?\s+without\s+(?:prior\s+)?(?:approval|discussion|an?\s+issue)", re.I),
        re.compile(r"before\s+(?:you\s+)?(?:start|begin)\s+(?:work|implementing).{0,80}(?:open|file|discuss).{0,40}(?:issue|proposal)", re.I | re.S),
    ),
    "invites_external_contribution": (
        re.compile(r"(?:we\s+)?welcome\s+(?:your\s+)?contributions?", re.I),
        re.compile(r"contributions?\s+(?:are|is)\s+welcome", re.I),
        re.compile(r"pull requests?\s+(?:are|is)\s+welcome", re.I),
        re.compile(r"(?:submit|open|create)\s+(?:an?\s+)?pull request", re.I),
    ),
    "requires_cla_or_dco": (
        re.compile(r"contributor\s+license\s+agreement|\bcla\b.{0,30}(?:sign|required|agreement)", re.I | re.S),
        re.compile(r"developer\s+certificate\s+of\s+origin|\bdco\b", re.I),
        re.compile(r"signed-off-by", re.I),
    ),
}

SUMMARY_FIELDS = [
    "sample_rank",
    "repo_name",
    "default_branch",
    "default_branch_commit",
    "policy_files_scanned",
    "closed_to_external_pr",
    "preapproval_or_issue_first",
    "invites_external_contribution",
    "requires_cla_or_dco",
    "policy_class",
    "manual_review_required",
    "scan_status",
    "error",
    "collected_at",
]

EVIDENCE_FIELDS = [
    "sample_rank",
    "repo_name",
    "path",
    "signal",
    "matched_text",
    "context",
    "html_url",
    "blob_sha",
    "collected_at",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument("--surfaces", type=Path, default=DEFAULT_SURFACES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--max-repos", type=int)
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def repo_metadata(client: GitHubClient, repo: str) -> dict[str, Any]:
    response = client.get(f"/repos/{repo}")
    return response.json()


def policy_paths(client: GitHubClient, repo: str, commit_sha: str) -> list[dict[str, Any]]:
    response = client.get(f"/repos/{repo}/git/trees/{commit_sha}", params={"recursive": "1"})
    payload = response.json()
    candidates = []
    for item in payload.get("tree", []):
        if item.get("type") != "blob" or int(item.get("size") or 0) > MAX_FILE_BYTES:
            continue
        path = str(item.get("path") or "")
        suffix = Path(path).suffix.lower()
        if suffix not in TEXT_EXTENSIONS:
            continue
        if POLICY_PATH.search(path) or (PATH_HINT.search(path) and len(Path(path).parts) <= 4):
            candidates.append(item)
    candidates.sort(
        key=lambda item: (
            0 if "contribut" in str(item.get("path", "")).lower() else 1,
            0 if str(item.get("path", "")).lower().startswith("readme") else 1,
            len(Path(str(item.get("path", ""))).parts),
            str(item.get("path", "")).lower(),
        )
    )
    return candidates[:MAX_POLICY_FILES]


def blob_text(client: GitHubClient, repo: str, sha: str) -> str:
    response = client.get(f"/repos/{repo}/git/blobs/{sha}")
    payload = response.json()
    if payload.get("encoding") != "base64":
        return ""
    return base64.b64decode(payload.get("content") or "").decode("utf-8", errors="replace")


def contents_text(
    client: GitHubClient, repo: str, path: str, commit_sha: str
) -> tuple[str, str, str] | None:
    response = client.get(
        f"/repos/{repo}/contents/{path}",
        params={"ref": commit_sha},
        allowed={200, 404},
    )
    if response.status_code == 404:
        return None
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("type") != "file":
        return None
    if payload.get("encoding") != "base64":
        return None
    text = base64.b64decode(payload.get("content") or "").decode("utf-8", errors="replace")
    return str(payload.get("path") or path), str(payload.get("sha") or ""), text


def readme_text(
    client: GitHubClient, repo: str, commit_sha: str
) -> tuple[str, str, str] | None:
    response = client.get(
        f"/repos/{repo}/readme",
        params={"ref": commit_sha},
        allowed={200, 404},
    )
    if response.status_code == 404:
        return None
    payload = response.json()
    if payload.get("encoding") != "base64":
        return None
    text = base64.b64decode(payload.get("content") or "").decode("utf-8", errors="replace")
    return str(payload.get("path") or "README.md"), str(payload.get("sha") or ""), text


def evidence_for_text(
    sample: dict[str, str], path: str, blob_sha: str, commit_sha: str, text: str, collected_at: str
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for signal, patterns in SIGNALS.items():
        for pattern in patterns:
            for match in pattern.finditer(text):
                start = max(0, match.start() - 120)
                end = min(len(text), match.end() + 180)
                context = " ".join(text[start:end].split())
                rows.append(
                    {
                        "sample_rank": sample["sample_rank"],
                        "repo_name": sample["repo_name"],
                        "path": path,
                        "signal": signal,
                        "matched_text": " ".join(match.group(0).split())[:300],
                        "context": context[:800],
                        "html_url": f"https://github.com/{sample['repo_name']}/blob/{commit_sha}/{path}",
                        "blob_sha": blob_sha,
                        "collected_at": collected_at,
                    }
                )
                break
    return rows


def policy_class(signals: set[str]) -> str:
    if "closed_to_external_pr" in signals:
        return "closed_candidate"
    if "preapproval_or_issue_first" in signals:
        return "gated_candidate"
    if "invites_external_contribution" in signals:
        return "inviting_candidate"
    return "undetermined"


def main() -> None:
    args = parse_args()
    sample = read_csv(args.sample)
    if len(sample) != 100:
        raise SystemExit(f"Expected 100 sample repositories, found {len(sample)}")
    if args.max_repos:
        sample = sample[: args.max_repos]
    surfaces = {row["repo_name"]: row for row in read_csv(args.surfaces)}
    if len(surfaces) != 100:
        raise SystemExit(f"Expected 100 frozen surface rows, found {len(surfaces)}")

    load_dotenv(ROOT / ".env")
    direct_network_setup()
    token = (os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "").strip()
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    client = GitHubClient(token)

    summary = [] if args.fresh else read_csv(args.output)
    evidence = [] if args.fresh else read_csv(args.evidence)
    completed = {row["repo_name"] for row in summary if row.get("scan_status") == "ok"}
    started_at = datetime.now(UTC).isoformat()

    for index, sample_row in enumerate(sample, start=1):
        repo = sample_row["repo_name"]
        if repo in completed:
            print(f"[{index}/{len(sample)}] {repo} (checkpoint)", flush=True)
            continue
        print(f"[{index}/{len(sample)}] {repo}", flush=True)
        collected_at = datetime.now(UTC).isoformat()
        try:
            surface = surfaces[repo]
            branch = surface["default_branch"]
            commit_sha = surface["default_branch_commit"]
            known_paths = {
                path
                for field in ("contributing_paths", "governance_paths", "pull_request_template_paths")
                for path in surface.get(field, "").split("|")
                if path
            }
            documents: list[tuple[str, str, str]] = []
            readme = readme_text(client, repo, commit_sha)
            if readme:
                documents.append(readme)
            for path in sorted(known_paths):
                document = contents_text(client, repo, path, commit_sha)
                if document:
                    documents.append(document)
            repo_evidence: list[dict[str, Any]] = []
            for path, blob_sha, text in documents:
                repo_evidence.extend(
                    evidence_for_text(
                        sample_row,
                        path,
                        blob_sha,
                        commit_sha,
                        text,
                        collected_at,
                    )
                )
            evidence = [row for row in evidence if row.get("repo_name") != repo] + repo_evidence
            signals = {row["signal"] for row in repo_evidence}
            classification = policy_class(signals)
            summary = [row for row in summary if row.get("repo_name") != repo]
            summary.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "default_branch": branch,
                    "default_branch_commit": commit_sha,
                    "policy_files_scanned": len(documents),
                    **{signal: str(signal in signals).lower() for signal in SIGNALS},
                    "policy_class": classification,
                    "manual_review_required": str(classification in {"closed_candidate", "gated_candidate"}).lower(),
                    "scan_status": "ok",
                    "error": "",
                    "collected_at": collected_at,
                }
            )
        except Exception as exc:
            summary = [row for row in summary if row.get("repo_name") != repo]
            summary.append(
                {
                    "sample_rank": sample_row["sample_rank"],
                    "repo_name": repo,
                    "scan_status": "error",
                    "error": str(exc)[:500],
                    "collected_at": collected_at,
                }
            )
        summary.sort(key=lambda row: int(row["sample_rank"]))
        evidence.sort(key=lambda row: (int(row["sample_rank"]), row["path"], row["signal"]))
        write_csv(args.output, SUMMARY_FIELDS, summary)
        write_csv(args.evidence, EVIDENCE_FIELDS, evidence)

    rate = client.get("/rate_limit").json()["resources"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "repositories": len(sample),
        "rows": len(summary),
        "evidence_rows": len(evidence),
        "errors": sum(row.get("scan_status") == "error" for row in summary),
        "http_requests": client.requests,
        "core_rate_limit": rate.get("core"),
        "outputs": [display_path(args.output), display_path(args.evidence)],
        "limitations": [
            "Phrase matches are review candidates, not final policy labels.",
            "A requirement to discuss an issue first is a gated contribution process, not a ban on external work.",
            "The scan covers the frozen README plus known CONTRIBUTING, GOVERNANCE and pull-request-template paths and can miss rules hosted elsewhere.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
