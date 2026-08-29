#!/usr/bin/env python3
"""Shared GitHub client and small helpers for the open-collaboration pipeline."""

from __future__ import annotations

import json
import os
import time
from typing import Any

import requests


API_VERSION = "2026-03-10"

RESIDUAL_TERMS = {
    "claude_code": ("claude", ".claude"),
    "codex": ("codex", ".codex"),
    "cursor": ("cursor", ".cursor"),
    "gemini": ("gemini", ".gemini"),
    "windsurf": ("windsurf", ".windsurf"),
    "cline": ("cline", ".cline"),
    "roo_code": ("roo", ".roo"),
    "continue": ("continue", ".continue"),
}

TASK_TERMS = {
    "implementation": ("implement", "code", "source", "refactor", "bug"),
    "tests_validation": ("test", "lint", "validate", "verification", "check"),
    "documentation": ("document", "docs", "readme"),
    "code_review": ("review", "pull request", "pr "),
    "issue_planning": ("issue", "triage", "plan", "spec"),
    "release_dependency": ("release", "dependency", "version", "changelog"),
    "security_compliance": ("security", "vulnerability", "compliance", "secret"),
    "repository_context": ("architecture", "repository", "directory", "module"),
}


def direct_network_setup() -> None:
    """Avoid inheriting a stale local proxy for direct GitHub API collection."""
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)


class GitHubClient:
    """Small checkpoint-friendly REST and GraphQL client with bounded retries."""

    def __init__(self, token: str) -> None:
        self.session = requests.Session()
        self.session.trust_env = False
        self.headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
            "User-Agent": "agentic-ai-open-collaboration-research",
        }
        self.requests = 0
        self.blob_cache: dict[tuple[str, str], str | None] = {}

    def get(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        allowed: set[int] | None = None,
    ) -> requests.Response:
        allowed = allowed or {200}
        url = path if path.startswith("http") else f"https://api.github.com{path}"
        last_error = ""
        for attempt in range(5):
            try:
                response = self.session.get(
                    url,
                    headers=self.headers,
                    params=params,
                    timeout=45,
                )
                self.requests += 1
            except requests.RequestException as exc:
                self.requests += 1
                last_error = str(exc)
                time.sleep(2**attempt)
                continue
            if response.status_code in allowed:
                return response
            last_error = f"HTTP {response.status_code}: {response.text[:240]}"
            if response.status_code not in {403, 429, 500, 502, 503, 504}:
                break
            delay = int(response.headers.get("retry-after", 0)) or 2**attempt
            time.sleep(delay)
        raise RuntimeError(f"GET {path} failed: {last_error}")

    def graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        message = ""
        for attempt in range(5):
            try:
                response = self.session.post(
                    "https://api.github.com/graphql",
                    headers=self.headers,
                    json={"query": query, "variables": variables},
                    timeout=60,
                )
                self.requests += 1
            except requests.RequestException as exc:
                self.requests += 1
                message = str(exc)
                time.sleep(2**attempt)
                continue
            if response.status_code == 200:
                payload = response.json()
                if not payload.get("errors"):
                    return payload["data"]
                message = json.dumps(payload["errors"], ensure_ascii=False)[:300]
            else:
                message = response.text[:300]
            if response.status_code not in {403, 429, 500, 502, 503, 504}:
                break
            delay = int(response.headers.get("retry-after", 0)) or 2**attempt
            time.sleep(delay)
        raise RuntimeError(f"GraphQL failed: {message}")


def probe_pull_surface(client: GitHubClient, repo: str) -> tuple[int, str, str]:
    statuses = []
    for attempt in range(2):
        response = client.get(
            f"/repos/{repo}/pulls",
            params={"state": "all", "per_page": 1},
            allowed={200, 404, 410},
        )
        statuses.append(response.status_code)
        if response.status_code == 200:
            break
        if attempt == 0:
            time.sleep(1)
    observed = "yes" if 200 in statuses else "no"
    return statuses[-1], "|".join(str(status) for status in statuses), observed


def infer_tasks(content: str | None) -> str:
    if not content:
        return ""
    lowered = content.lower()
    return "|".join(
        task
        for task, terms in TASK_TERMS.items()
        if any(term in lowered for term in terms)
    )
