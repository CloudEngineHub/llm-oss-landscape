#!/usr/bin/env python3
"""Trace the first observable Agent patch through ten merged pull requests.

The input cases are the strict, merged ``agent_touched`` pull requests produced
by ``analyze_collaboration_agent_code.py``.  For each case, this script follows
every text line added by the first attributable Agent commit through the later
PR commits.  A line is retained only when its exact text survives; the first
later commit that removes or changes it receives the disposition attribution.

This is a line-history study, not semantic code authorship detection.  Moves,
formatting changes, squashes and locally used AI tools remain important limits.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "insights/260912_open_collaboration_ai/research"
DEFAULT_ATTRIBUTION = RESEARCH / "collaboration-agent-code-attribution-2026.csv"
DEFAULT_COMMITS = RESEARCH / "collaboration-thread-pr-commits-2026.csv"
DEFAULT_ACTORS = RESEARCH / "collaboration-actor-registry-2026.csv"
DEFAULT_METADATA = RESEARCH / "collaboration-pr-code-metadata-2026.csv"
DEFAULT_CASES = RESEARCH / "collaboration-patch-lineage-cases-2026.csv"
DEFAULT_FILES = RESEARCH / "collaboration-patch-lineage-files-2026.csv"
DEFAULT_CANDIDATES = RESEARCH / "collaboration-patch-lineage-candidates-2026.csv"
DEFAULT_RUN = RESEARCH / "collaboration-patch-lineage-2026-run.json"

# These two aliases are visible service identities inside PRs opened by a
# separately named, high-confidence Agent bot.  They are kept explicit rather
# than generalized from the word "agent".
CASE_AGENT_ALIASES = {
    ("OpenHands/software-agent-sdk", "2614"): {"openhands-agent"},
    ("warpdotdev/warp", "13382"): {"oz-agent"},
}

CASE_ALIAS_NOTES = {
    ("OpenHands/software-agent-sdk", "2614"): (
        "PR opened by all-hands-bot; openhands-agent is the code-producing service identity in the PR commit chain."
    ),
    ("warpdotdev/warp", "13382"): (
        "PR opened by warp-agent-staging[bot]; oz-agent is the code-producing service identity before the human handoff."
    ),
}

CASE_FIELDS = [
    "repo_name",
    "number",
    "html_url",
    "llm_native_manual",
    "collaboration_niche",
    "first_agent_commit_sha",
    "first_agent_commit_author",
    "first_agent_commit_index",
    "commits_before_first_agent",
    "later_agent_commits",
    "later_human_commits",
    "later_automation_commits",
    "later_unknown_commits",
    "text_lines_in_first_agent_patch",
    "retained_exact_lines",
    "human_rewritten_or_removed_lines",
    "agent_revised_or_removed_lines",
    "automation_rewritten_or_removed_lines",
    "unknown_rewritten_or_removed_lines",
    "retained_exact_share",
    "human_rewrite_share",
    "agent_revision_share",
    "automation_revision_share",
    "unknown_revision_share",
    "collaboration_path",
    "lineage_status",
    "lineage_note",
]

FILE_FIELDS = [
    "repo_name",
    "number",
    "html_url",
    "first_agent_commit_sha",
    "file_path_at_agent_commit",
    "final_file_path",
    "file_type",
    "text_lines_in_first_agent_patch",
    "retained_exact_lines",
    "human_rewritten_or_removed_lines",
    "agent_revised_or_removed_lines",
    "automation_rewritten_or_removed_lines",
    "unknown_rewritten_or_removed_lines",
]

CANDIDATE_FIELDS = [
    "repo_name",
    "number",
    "html_url",
    "attribution_class",
    "opener_login",
    "opener_automation_confidence",
    "commits_total",
    "first_agent_commit_sha",
    "first_agent_commit_author",
    "manual_alias_used",
    "manual_alias_note",
    "included",
    "exclusion_reason",
]


@dataclass(frozen=True)
class CommitRow:
    sha: str
    author: str
    committer: str
    created_at: str
    role: str


@dataclass
class LineToken:
    token_id: int
    initial_path: str
    current_path: str
    file_type: str
    text: str
    disposition: str = "retained_exact"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--attribution", type=Path, default=DEFAULT_ATTRIBUTION)
    parser.add_argument("--commits", type=Path, default=DEFAULT_COMMITS)
    parser.add_argument("--actors", type=Path, default=DEFAULT_ACTORS)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    parser.add_argument("--cases-output", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--files-output", type=Path, default=DEFAULT_FILES)
    parser.add_argument("--candidates-output", type=Path, default=DEFAULT_CANDIDATES)
    parser.add_argument("--run-output", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--cache-dir", type=Path)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def identity_key(login: str | None) -> str:
    return re.sub(r"\[bot\]$", "", (login or "").strip().lower())


def truthy(value: str | bool | None) -> bool:
    return str(value or "").lower() == "true"


def git(
    repo_dir: Path,
    *args: str,
    text: bool = True,
    check: bool = True,
    timeout: int = 180,
) -> str | bytes:
    environment = os.environ.copy()
    environment.setdefault("GIT_HTTP_LOW_SPEED_LIMIT", "1000")
    environment.setdefault("GIT_HTTP_LOW_SPEED_TIME", "30")
    result = subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=text,
        timeout=timeout,
        env=environment,
    )
    return result.stdout


def ensure_repo(repo_dir: Path, repo_name: str, head_sha: str, depth: int) -> None:
    if not (repo_dir / ".git").exists():
        repo_dir.mkdir(parents=True, exist_ok=True)
        git(repo_dir, "init", "-q")
        git(repo_dir, "remote", "add", "origin", f"https://github.com/{repo_name}.git")
    fetched = subprocess.run(
        ["git", "-C", str(repo_dir), "cat-file", "-e", f"{head_sha}^{{commit}}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if fetched.returncode != 0:
        git(
            repo_dir,
            "fetch",
            "--quiet",
            "--no-tags",
            "--filter=blob:none",
            f"--depth={depth}",
            "origin",
            head_sha,
        )


def file_bytes(repo_dir: Path, sha: str, path: str) -> bytes | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_dir), "show", f"{sha}:{path}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        return None
    if result.returncode != 0:
        return None
    return result.stdout


def text_lines(repo_dir: Path, sha: str, path: str) -> list[str] | None:
    payload = file_bytes(repo_dir, sha, path)
    if payload is None or b"\x00" in payload:
        return None
    try:
        return payload.decode("utf-8").splitlines()
    except UnicodeDecodeError:
        return None


def changed_paths(repo_dir: Path, parent: str, commit: str) -> list[tuple[str, str, str]]:
    output = str(git(repo_dir, "diff", "--name-status", "-M", parent, commit))
    rows: list[tuple[str, str, str]] = []
    for line in output.splitlines():
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") and len(parts) == 3:
            rows.append((status, parts[1], parts[2]))
        elif len(parts) == 2:
            rows.append((status, parts[1], parts[1]))
    return rows


def classify_file(path: str) -> str:
    lower = path.lower()
    name = Path(lower).name
    if name in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "uv.lock", "cargo.lock"}:
        return "lockfile"
    if any(part in lower for part in ("/test/", "/tests/", "__tests__", ".test.", ".spec.")):
        return "test"
    if lower.endswith((".md", ".mdx", ".rst", ".txt")) or "/docs/" in lower:
        return "documentation"
    if name in {"dockerfile", "makefile"} or lower.endswith((".yml", ".yaml", ".toml", ".ini", ".cfg", ".json")):
        return "configuration"
    if any(part in lower for part in ("generated", "dist/", "vendor/")):
        return "generated_or_vendor"
    if lower.endswith(
        (
            ".py", ".pyi", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt",
            ".kts", ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".swift",
            ".scala", ".sh", ".bash", ".zsh", ".sql", ".proto", ".vue", ".svelte",
        )
    ):
        return "source"
    return "other"


def commit_role(
    row: dict[str, str],
    coding_agent_keys: set[str],
    conventional_automation_logins: set[str],
    case_aliases: set[str],
) -> str:
    author = row.get("commit_author_login") or row.get("actor_login") or ""
    key = identity_key(author)
    if key in coding_agent_keys or key in {identity_key(alias) for alias in case_aliases}:
        return "agent"
    # Do not strip ``[bot]`` for conventional automation.  GitHub can contain
    # both ``name`` (User) and ``name[bot]`` (Bot), and they are not the same
    # actor.  Coding Agent aliases are normalized separately and deliberately.
    if author.strip().lower() in conventional_automation_logins:
        return "automation"
    if not key:
        return "unknown"
    return "human"


def first_parent(repo_dir: Path, sha: str) -> str:
    return str(git(repo_dir, "rev-parse", f"{sha}^1")).strip()


def parent_count(repo_dir: Path, sha: str) -> int:
    line = str(git(repo_dir, "rev-list", "--parents", "-n", "1", sha)).strip()
    return max(0, len(line.split()) - 1)


def initialize_tokens(
    repo_dir: Path,
    parent: str,
    agent_commit: str,
) -> tuple[dict[str, tuple[list[str], list[int | None]]], dict[int, LineToken], list[str]]:
    tracked: dict[str, tuple[list[str], list[int | None]]] = {}
    tokens: dict[int, LineToken] = {}
    exclusions: list[str] = []
    next_token = 1
    for status, old_path, new_path in changed_paths(repo_dir, parent, agent_commit):
        old = [] if status.startswith("A") else text_lines(repo_dir, parent, old_path)
        new = [] if status.startswith("D") else text_lines(repo_dir, agent_commit, new_path)
        if old is None or new is None:
            exclusions.append(new_path)
            continue
        aligned: list[int | None] = [None] * len(new)
        matcher = difflib.SequenceMatcher(a=old, b=new, autojunk=False)
        for tag, _a1, _a2, b1, b2 in matcher.get_opcodes():
            if tag not in {"insert", "replace"}:
                continue
            for index in range(b1, b2):
                token = LineToken(
                    token_id=next_token,
                    initial_path=new_path,
                    current_path=new_path,
                    file_type=classify_file(new_path),
                    text=new[index],
                )
                tokens[next_token] = token
                aligned[index] = next_token
                next_token += 1
        tracked[new_path] = (new, aligned)
    return tracked, tokens, exclusions


def carry_tokens(
    repo_dir: Path,
    parent: str,
    commit: str,
    role: str,
    tracked: dict[str, tuple[list[str], list[int | None]]],
    tokens: dict[int, LineToken],
) -> None:
    changes = changed_paths(repo_dir, parent, commit)
    renames = {old: new for status, old, new in changes if status.startswith("R")}
    touched_old = {old for _status, old, _new in changes}

    for old_path in list(tracked):
        if old_path not in touched_old:
            continue
        old_lines, old_tokens = tracked.pop(old_path)
        new_path = renames.get(old_path, old_path)
        status_rows = [row for row in changes if row[1] == old_path]
        status = status_rows[0][0] if status_rows else "M"
        new_lines = [] if status.startswith("D") else text_lines(repo_dir, commit, new_path)
        parent_lines = text_lines(repo_dir, parent, old_path)
        if parent_lines is None or new_lines is None:
            for token_id in (token for token in old_tokens if token is not None):
                if tokens[token_id].disposition == "retained_exact":
                    tokens[token_id].disposition = f"{role}_revised"
            continue

        # The tracked snapshot should match the commit's first parent.  When it
        # does not, use the parent content and preserve only exact aligned lines.
        if old_lines != parent_lines:
            remap: list[int | None] = [None] * len(parent_lines)
            matcher = difflib.SequenceMatcher(a=old_lines, b=parent_lines, autojunk=False)
            for tag, a1, a2, b1, b2 in matcher.get_opcodes():
                if tag == "equal":
                    remap[b1:b2] = old_tokens[a1:a2]
                else:
                    for token_id in (token for token in old_tokens[a1:a2] if token is not None):
                        if tokens[token_id].disposition == "retained_exact":
                            tokens[token_id].disposition = "unknown_revised"
            old_lines, old_tokens = parent_lines, remap

        new_tokens: list[int | None] = [None] * len(new_lines)
        matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines, autojunk=False)
        for tag, a1, a2, b1, b2 in matcher.get_opcodes():
            if tag == "equal":
                new_tokens[b1:b2] = old_tokens[a1:a2]
                for token_id in (token for token in old_tokens[a1:a2] if token is not None):
                    tokens[token_id].current_path = new_path
            else:
                for token_id in (token for token in old_tokens[a1:a2] if token is not None):
                    if tokens[token_id].disposition == "retained_exact":
                        tokens[token_id].disposition = f"{role}_revised"
        if not status.startswith("D"):
            tracked[new_path] = (new_lines, new_tokens)


def reconcile_exact_origins_with_blame(
    repo_dir: Path,
    final_sha: str,
    agent_sha: str,
    tracked: dict[str, tuple[list[str], list[int | None]]],
    tokens: dict[int, LineToken],
) -> int:
    """Use Git blame to resolve duplicate-line alignment missed by SequenceMatcher."""
    recovered = 0
    available: dict[tuple[str, str], list[int]] = defaultdict(list)
    for token in tokens.values():
        if token.disposition != "retained_exact":
            available[(token.current_path, token.text)].append(token.token_id)

    header = re.compile(r"^([0-9a-f]{40}) \d+ \d+(?: \d+)?$")
    for path, (lines, aligned) in tracked.items():
        result = subprocess.run(
            ["git", "-C", str(repo_dir), "blame", "--line-porcelain", final_sha, "--", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=120,
        )
        if result.returncode != 0:
            continue
        origins = [match.group(1) for line in result.stdout.splitlines() if (match := header.match(line))]
        if len(origins) != len(lines):
            continue
        for index, origin in enumerate(origins):
            if origin != agent_sha:
                continue
            token_id = aligned[index]
            if token_id is not None and tokens[token_id].disposition == "retained_exact":
                continue
            candidates = available.get((path, lines[index]), [])
            while candidates and tokens[candidates[-1]].disposition == "retained_exact":
                candidates.pop()
            if not candidates:
                continue
            recovered_token = candidates.pop()
            tokens[recovered_token].disposition = "retained_exact"
            aligned[index] = recovered_token
            recovered += 1
    return recovered


def collaboration_path(commits: list[CommitRow], first_agent_index: int) -> str:
    before = {commit.role for commit in commits[:first_agent_index]}
    after = {commit.role for commit in commits[first_agent_index + 1 :]}
    if "human" in before:
        return "human_then_agent"
    if "human" in after:
        return "agent_then_human"
    if "unknown" in after:
        return "agent_then_unattributed"
    if "agent" in after:
        return "agent_iterates_to_merge"
    return "single_agent_patch"


def unresolved_case_row(candidate: dict[str, str], reason: str) -> dict[str, object]:
    """Keep reviewed but non-traceable PRs visible in the case-level audit table."""
    return {
        "repo_name": candidate["repo_name"],
        "number": candidate["number"],
        "html_url": candidate["html_url"],
        "llm_native_manual": candidate["llm_native_manual"],
        "collaboration_niche": candidate["collaboration_niche"],
        "first_agent_commit_sha": "",
        "first_agent_commit_author": "",
        "first_agent_commit_index": "",
        "commits_before_first_agent": "",
        "later_agent_commits": "",
        "later_human_commits": "",
        "later_automation_commits": "",
        "later_unknown_commits": "",
        "text_lines_in_first_agent_patch": "",
        "retained_exact_lines": "",
        "human_rewritten_or_removed_lines": "",
        "agent_revised_or_removed_lines": "",
        "automation_rewritten_or_removed_lines": "",
        "unknown_rewritten_or_removed_lines": "",
        "retained_exact_share": "",
        "human_rewrite_share": "",
        "agent_revision_share": "",
        "automation_revision_share": "",
        "unknown_revision_share": "",
        "collaboration_path": "unresolved",
        "lineage_status": "not_line_traceable",
        "lineage_note": reason,
    }


def ratio(value: int, total: int) -> float:
    return round(value / total, 6) if total else 0.0


def main() -> None:
    args = parse_args()
    attribution = read_csv(args.attribution)
    commit_rows = read_csv(args.commits)
    actors = read_csv(args.actors)
    metadata_rows = read_csv(args.metadata)

    actor_by_key = {identity_key(row["actor_login"]): row for row in actors}
    coding_agent_keys = {
        identity_key(row["actor_login"])
        for row in actors
        if row.get("automation_role") == "coding_agent"
        and row.get("automation_role_confidence") == "high"
    }
    conventional_automation_logins = {
        row["actor_login"].strip().lower()
        for row in actors
        if row.get("final_class") == "automation_bot"
        and row.get("automation_role") != "coding_agent"
    }
    metadata = {(row["repo_name"], row["number"]): row for row in metadata_rows}
    commits_by_case: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in commit_rows:
        commits_by_case[(row["repo_name"], row["number"])].append(row)
    for rows in commits_by_case.values():
        rows.sort(key=lambda row: (row.get("created_at", ""), row.get("commit_sha", "")))

    candidates = [
        row for row in attribution
        if row.get("outcome") == "merged" and truthy(row.get("agent_touched"))
    ]
    candidates.sort(key=lambda row: (int(row["sample_rank"]), int(row["number"])))
    if len(candidates) != 10:
        raise SystemExit(f"Expected 10 strict merged Agent-touched cases, found {len(candidates)}")

    cache_root = args.cache_dir
    temporary: tempfile.TemporaryDirectory[str] | None = None
    if cache_root is None:
        temporary = tempfile.TemporaryDirectory(prefix="collaboration-patch-lineage-")
        cache_root = Path(temporary.name)
    cache_root.mkdir(parents=True, exist_ok=True)

    candidate_output: list[dict[str, Any]] = []
    case_output: list[dict[str, Any]] = []
    file_output: list[dict[str, Any]] = []
    warnings: list[str] = []
    started_at = datetime.now(UTC).isoformat()

    try:
        for position, candidate in enumerate(candidates, start=1):
            repo_name = candidate["repo_name"]
            number = candidate["number"]
            key = repo_name, number
            meta = metadata[key]
            rows = commits_by_case[key]
            aliases = CASE_AGENT_ALIASES.get(key, set())
            commits = [
                CommitRow(
                    sha=row["commit_sha"],
                    author=row.get("commit_author_login") or row.get("actor_login") or "",
                    committer=row.get("commit_committer_login") or "",
                    created_at=row.get("created_at", ""),
                    role=commit_role(row, coding_agent_keys, conventional_automation_logins, aliases),
                )
                for row in rows
            ]
            agent_indices = [index for index, commit in enumerate(commits) if commit.role == "agent"]
            if not agent_indices:
                exclusion_reason = "No attributable Agent-authored commit after case-level alias review."
                candidate_output.append(
                    {
                        "repo_name": repo_name,
                        "number": number,
                        "html_url": candidate["html_url"],
                        "attribution_class": candidate["attribution_class"],
                        "opener_login": candidate["opener_login"],
                        "opener_automation_confidence": candidate["opener_automation_confidence"],
                        "commits_total": candidate["commits_total"],
                        "manual_alias_used": "false",
                        "manual_alias_note": CASE_ALIAS_NOTES.get(key, ""),
                        "included": "false",
                        "exclusion_reason": exclusion_reason,
                    }
                )
                case_output.append(unresolved_case_row(candidate, exclusion_reason))
                warnings.append(f"{repo_name}#{number}: {exclusion_reason}")
                continue

            print(f"[{position}/10] {repo_name}#{number}", flush=True)
            head_sha = meta["head_ref_oid"]
            repo_dir = cache_root / repo_name.replace("/", "__")
            ensure_repo(repo_dir, repo_name, head_sha, max(50, len(commits) + 10))
            first_agent_index = -1
            first_agent: CommitRow | None = None
            tracked: dict[str, tuple[list[str], list[int | None]]] = {}
            tokens: dict[int, LineToken] = {}
            binary_exclusions: list[str] = []
            skipped_merge_agent_commit = False
            # Coding Agents often create an empty "initial plan" commit.  The
            # comparable starting point is the first Agent commit that actually
            # adds a textual line, not merely the first Agent-authored SHA.
            for index in agent_indices:
                proposed = commits[index]
                if parent_count(repo_dir, proposed.sha) > 1:
                    skipped_merge_agent_commit = True
                    continue
                parent = first_parent(repo_dir, proposed.sha)
                proposed_tracked, proposed_tokens, proposed_exclusions = initialize_tokens(
                    repo_dir, parent, proposed.sha
                )
                if proposed_tokens:
                    first_agent_index = index
                    first_agent = proposed
                    tracked = proposed_tracked
                    tokens = proposed_tokens
                    binary_exclusions = proposed_exclusions
                    break
            if first_agent is None:
                exclusion_reason = (
                    "Agent attribution is attached only to a merge commit; first-parent additions include upstream history, so line authorship is unresolved."
                    if skipped_merge_agent_commit
                    else "Attributable Agent commits contain no retrievable textual additions."
                )
                candidate_output.append(
                    {
                        "repo_name": repo_name,
                        "number": number,
                        "html_url": candidate["html_url"],
                        "attribution_class": candidate["attribution_class"],
                        "opener_login": candidate["opener_login"],
                        "opener_automation_confidence": candidate["opener_automation_confidence"],
                        "commits_total": candidate["commits_total"],
                        "manual_alias_used": "false",
                        "manual_alias_note": CASE_ALIAS_NOTES.get(key, ""),
                        "included": "false",
                        "exclusion_reason": exclusion_reason,
                    }
                )
                case_output.append(unresolved_case_row(candidate, exclusion_reason))
                warnings.append(f"{repo_name}#{number}: {exclusion_reason}")
                continue

            alias_used = identity_key(first_agent.author) in {
                identity_key(alias) for alias in aliases
            }
            candidate_output.append(
                {
                    "repo_name": repo_name,
                    "number": number,
                    "html_url": candidate["html_url"],
                    "attribution_class": candidate["attribution_class"],
                    "opener_login": candidate["opener_login"],
                    "opener_automation_confidence": candidate["opener_automation_confidence"],
                    "commits_total": candidate["commits_total"],
                    "first_agent_commit_sha": first_agent.sha,
                    "first_agent_commit_author": first_agent.author,
                    "manual_alias_used": str(alias_used).lower(),
                    "manual_alias_note": CASE_ALIAS_NOTES.get(key, ""),
                    "included": "true",
                    "exclusion_reason": "",
                }
            )
            for excluded in binary_exclusions:
                warnings.append(f"{repo_name}#{number}: excluded binary/non-UTF8 path {excluded}")

            current_sha = first_agent.sha
            for later in commits[first_agent_index + 1 :]:
                later_parent = first_parent(repo_dir, later.sha)
                if later_parent != current_sha:
                    warnings.append(
                        f"{repo_name}#{number}: non-linear PR chain at {later.sha[:12]}; first-parent remap applied"
                    )
                carry_tokens(repo_dir, later_parent, later.sha, later.role, tracked, tokens)
                current_sha = later.sha
            if current_sha != head_sha:
                warnings.append(
                    f"{repo_name}#{number}: PR head differs from last sampled commit; final remap classified unknown"
                )
                carry_tokens(repo_dir, current_sha, head_sha, "unknown", tracked, tokens)

            blame_recovered = reconcile_exact_origins_with_blame(
                repo_dir, head_sha, first_agent.sha, tracked, tokens
            )
            if blame_recovered:
                warnings.append(
                    f"{repo_name}#{number}: Git blame recovered {blame_recovered} exact-origin line(s) from duplicate-line alignment"
                )

            dispositions = Counter(token.disposition for token in tokens.values())
            total = len(tokens)
            retained = dispositions["retained_exact"]
            human = dispositions["human_revised"]
            agent = dispositions["agent_revised"]
            automation = dispositions["automation_revised"]
            unknown = dispositions["unknown_revised"]
            if retained + human + agent + automation + unknown != total:
                raise RuntimeError(f"Disposition total mismatch for {repo_name}#{number}")

            later_roles = Counter(commit.role for commit in commits[first_agent_index + 1 :])
            lineage_note_parts = []
            if binary_exclusions:
                lineage_note_parts.append(f"Excluded {len(binary_exclusions)} binary/non-UTF8 file(s).")
            if first_agent_index:
                lineage_note_parts.append(
                    f"The first attributable Agent patch appears after {first_agent_index} earlier PR commit(s)."
                )
            if unknown:
                lineage_note_parts.append(
                    "Some changed lines were first replaced by a commit without a resolvable GitHub author."
                )
            case_output.append(
                {
                    "repo_name": repo_name,
                    "number": number,
                    "html_url": candidate["html_url"],
                    "llm_native_manual": candidate["llm_native_manual"],
                    "collaboration_niche": candidate["collaboration_niche"],
                    "first_agent_commit_sha": first_agent.sha,
                    "first_agent_commit_author": first_agent.author,
                    "first_agent_commit_index": first_agent_index + 1,
                    "commits_before_first_agent": first_agent_index,
                    "later_agent_commits": later_roles["agent"],
                    "later_human_commits": later_roles["human"],
                    "later_automation_commits": later_roles["automation"],
                    "later_unknown_commits": later_roles["unknown"],
                    "text_lines_in_first_agent_patch": total,
                    "retained_exact_lines": retained,
                    "human_rewritten_or_removed_lines": human,
                    "agent_revised_or_removed_lines": agent,
                    "automation_rewritten_or_removed_lines": automation,
                    "unknown_rewritten_or_removed_lines": unknown,
                    "retained_exact_share": ratio(retained, total),
                    "human_rewrite_share": ratio(human, total),
                    "agent_revision_share": ratio(agent, total),
                    "automation_revision_share": ratio(automation, total),
                    "unknown_revision_share": ratio(unknown, total),
                    "collaboration_path": collaboration_path(commits, first_agent_index),
                    "lineage_status": "ok" if total else "no_text_additions",
                    "lineage_note": " ".join(lineage_note_parts),
                }
            )

            grouped_tokens: dict[tuple[str, str, str], list[LineToken]] = defaultdict(list)
            for token in tokens.values():
                grouped_tokens[(token.initial_path, token.current_path, token.file_type)].append(token)
            for (initial_path, final_path, file_type), file_tokens in sorted(grouped_tokens.items()):
                file_counts = Counter(token.disposition for token in file_tokens)
                file_output.append(
                    {
                        "repo_name": repo_name,
                        "number": number,
                        "html_url": candidate["html_url"],
                        "first_agent_commit_sha": first_agent.sha,
                        "file_path_at_agent_commit": initial_path,
                        "final_file_path": final_path,
                        "file_type": file_type,
                        "text_lines_in_first_agent_patch": len(file_tokens),
                        "retained_exact_lines": file_counts["retained_exact"],
                        "human_rewritten_or_removed_lines": file_counts["human_revised"],
                        "agent_revised_or_removed_lines": file_counts["agent_revised"],
                        "automation_rewritten_or_removed_lines": file_counts["automation_revised"],
                        "unknown_rewritten_or_removed_lines": file_counts["unknown_revised"],
                    }
                )
            # A slow repository should not erase completed cases.  These files
            # are checkpoints and are overwritten with the full validated set
            # after the loop.
            write_csv(args.candidates_output, CANDIDATE_FIELDS, candidate_output)
            write_csv(args.cases_output, CASE_FIELDS, case_output)
            write_csv(args.files_output, FILE_FIELDS, file_output)
    finally:
        if temporary is not None:
            temporary.cleanup()

    write_csv(args.candidates_output, CANDIDATE_FIELDS, candidate_output)
    write_csv(args.cases_output, CASE_FIELDS, case_output)
    write_csv(args.files_output, FILE_FIELDS, file_output)

    analyzed_output = [row for row in case_output if row["lineage_status"] == "ok"]
    totals = Counter()
    for row in analyzed_output:
        for field in (
            "text_lines_in_first_agent_patch",
            "retained_exact_lines",
            "human_rewritten_or_removed_lines",
            "agent_revised_or_removed_lines",
            "automation_rewritten_or_removed_lines",
            "unknown_rewritten_or_removed_lines",
        ):
            totals[field] += int(row[field])
    denominator = totals["text_lines_in_first_agent_patch"]
    run = {
        "started_at": started_at,
        "completed_at": datetime.now(UTC).isoformat(),
        "candidate_rule": "Merged PR with strict high-confidence agent_touched=true in the frozen 2026 probability sample.",
        "candidate_cases": len(candidates),
        "analyzed_cases": len(analyzed_output),
        "text_lines_in_first_agent_patches": denominator,
        "retained_exact_lines": totals["retained_exact_lines"],
        "human_rewritten_or_removed_lines": totals["human_rewritten_or_removed_lines"],
        "agent_revised_or_removed_lines": totals["agent_revised_or_removed_lines"],
        "automation_rewritten_or_removed_lines": totals["automation_rewritten_or_removed_lines"],
        "unknown_rewritten_or_removed_lines": totals["unknown_rewritten_or_removed_lines"],
        "retained_exact_share": ratio(totals["retained_exact_lines"], denominator),
        "human_rewrite_share": ratio(totals["human_rewritten_or_removed_lines"], denominator),
        "agent_revision_share": ratio(totals["agent_revised_or_removed_lines"], denominator),
        "automation_revision_share": ratio(totals["automation_rewritten_or_removed_lines"], denominator),
        "unknown_revision_share": ratio(totals["unknown_rewritten_or_removed_lines"], denominator),
        "collaboration_paths": dict(Counter(row["collaboration_path"] for row in analyzed_output)),
        "manual_alias_cases": [f"{repo}#{number}" for repo, number in CASE_AGENT_ALIASES],
        "warnings": warnings,
        "outputs": [
            str(args.candidates_output.relative_to(ROOT)),
            str(args.cases_output.relative_to(ROOT)),
            str(args.files_output.relative_to(ROOT)),
        ],
        "method": [
            "The unit is a text line added by the first publicly attributable Agent commit in each PR.",
            "Exact lines are carried across subsequent PR commits with a sequence diff; the first commit that changes or removes a line receives the disposition attribution.",
            "The result measures exact textual survival, not semantic authorship or functional contribution.",
            "GitHub User accounts are treated as human-visible accounts for commit attribution, but may still have used private AI assistance.",
        ],
    }
    args.run_output.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(run, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
