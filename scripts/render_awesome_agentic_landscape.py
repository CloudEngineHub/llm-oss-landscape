#!/usr/bin/env python3
"""Render the curated Awesome x Agentic AI logo landscape."""

from __future__ import annotations

import csv
import html
import re
import shutil
import time
from pathlib import Path
from urllib.parse import quote

import requests


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "awesome-agentic" / "projects.csv"
OUTPUT_DIR = ROOT / "outputs" / "awesome-agentic-landscape-260729" / "landscape"
HTML_PATH = OUTPUT_DIR / "awesome_agentic_landscape_2026.html"
ASSET_DIR = OUTPUT_DIR / "assets" / "github-avatars"
WEB_OUTPUT_DIR = ROOT / "apps" / "landscape-web" / "public" / "awesome"
WEB_HTML_PATH = WEB_OUTPUT_DIR / "awesome_agentic_landscape_2026.html"
WEB_ASSET_DIR = WEB_OUTPUT_DIR / "assets" / "github-avatars"


CATEGORIES = [
    {
        "name": "Curated collections",
        "label": "Directories and ecosystem maps",
        "accent": "#EAA9CC",
    },
    {
        "name": "Skills & plugins",
        "label": "Capabilities an agent can load",
        "accent": "#9EBBE8",
    },
    {
        "name": "Domain playbooks",
        "label": "Reusable knowledge for a specific job",
        "accent": "#B69ADD",
    },
    {
        "name": "Workflows & methods",
        "label": "Ways to plan, review, and operate",
        "accent": "#8BC8AF",
    },
]


def read_rows() -> list[dict[str, str]]:
    with DATA_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 28:
        raise ValueError(f"Expected 28 curated projects, found {len(rows)}")
    return rows


def owner_name(repo_name: str) -> str:
    return repo_name.split("/", 1)[0]


def project_name(repo_name: str) -> str:
    return repo_name.split("/", 1)[1]


def avatar_filename(owner: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", owner.lower()).strip("-") + ".png"


def prepare_avatar(owner: str) -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    destination = ASSET_DIR / avatar_filename(owner)
    if destination.exists() and destination.stat().st_size > 100:
        return
    legacy = (
        ROOT
        / "presentations"
        / "260807-CoC-KN"
        / "landscape-refresh"
        / "assets"
        / "github-avatars"
        / avatar_filename(owner)
    )
    if legacy.exists() and legacy.stat().st_size > 100:
        shutil.copy2(legacy, destination)
        return

    session = requests.Session()
    url = f"https://github.com/{quote(owner)}.png?size=128"
    last_error = ""
    for attempt in range(3):
        try:
            response = session.get(
                url,
                timeout=20,
                headers={"User-Agent": "awesome-agentic-landscape/2.0"},
            )
            response.raise_for_status()
            if not response.headers.get("content-type", "").startswith("image/"):
                raise ValueError("GitHub avatar response is not an image")
            destination.write_bytes(response.content)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Unable to prepare avatar for {owner}: {last_error}")


def project_item(row: dict[str, str]) -> str:
    repo_name = row["repo_name"]
    owner = owner_name(repo_name)
    return f"""
      <a class="project" href="{html.escape(row['html_url'])}" target="_blank" rel="noreferrer">
        <img src="assets/github-avatars/{html.escape(avatar_filename(owner))}" alt="">
        <span class="project-name">{html.escape(project_name(repo_name))}</span>
        <span class="project-owner">{html.escape(owner)}</span>
      </a>
    """


def category_panel(category: dict[str, str], rows: list[dict[str, str]]) -> str:
    selected = [row for row in rows if row["category"] == category["name"]]
    items = "".join(project_item(row) for row in selected)
    density = "compact" if len(selected) >= 9 else "relaxed"
    return f"""
      <section class="category {density}" style="--accent:{category['accent']};--count:{len(selected)}">
        <header class="category-header">
          <div>
            <h2>{html.escape(category['name'])}</h2>
            <p>{html.escape(category['label'])}</p>
          </div>
          <strong>{len(selected)}</strong>
        </header>
        <div class="project-grid">{items}</div>
      </section>
    """


def build_html(rows: list[dict[str, str]]) -> str:
    panels = "".join(category_panel(category, rows) for category in CATEGORIES)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Awesome × Agentic AI Landscape</title>
  <style>
    * {{ box-sizing: border-box; }}
    :root {{ --scale: 1; }}
    html, body {{ width: 100%; height: 100%; margin: 0; overflow: hidden; }}
    body {{ position: relative; background: #e9ebee; color: #111318; font-family: Inter, "PingFang SC", "Helvetica Neue", Arial, sans-serif; }}
    .canvas {{
      position: absolute;
      left: 50%; top: 50%;
      width: 1920px; height: 1080px;
      padding: 42px 54px 32px;
      display: grid;
      grid-template-rows: 82px 1fr 28px;
      gap: 18px;
      background: #ffffff;
      transform: translate(-50%, -50%) scale(var(--scale));
      transform-origin: center;
    }}
    .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #111318; }}
    h1 {{ margin: 0; font-size: 38px; line-height: 1; letter-spacing: -1.1px; font-weight: 850; }}
    .topbar p {{ margin: 10px 0 0; color: #5b626c; font-size: 15px; font-weight: 600; }}
    .snapshot {{ padding-top: 4px; text-align: right; color: #5b626c; font-size: 13px; line-height: 1.5; font-weight: 650; }}
    .landscape {{ display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 18px; min-height: 0; }}
    .category {{ min-width: 0; min-height: 0; border: 2px solid #1f2329; display: grid; grid-template-rows: 72px 1fr; background: #ffffff; }}
    .category-header {{ padding: 12px 18px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1f2329; background: color-mix(in srgb, var(--accent) 76%, #ffffff); }}
    .category-header h2 {{ margin: 0; font-size: 23px; line-height: 1; font-weight: 850; }}
    .category-header p {{ margin: 7px 0 0; font-size: 13px; color: #353a42; font-weight: 650; }}
    .category-header strong {{ width: 42px; height: 42px; display: grid; place-items: center; border: 2px solid #1f2329; border-radius: 50%; background: #ffffff; font-size: 17px; }}
    .project-grid {{ min-height: 0; padding: 12px 14px 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 8px 12px; }}
    .relaxed .project-grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }}
    .project {{ min-width: 0; padding: 8px 10px; display: grid; grid-template-columns: 42px 1fr; grid-template-rows: 22px 18px; column-gap: 10px; align-content: center; border-left: 4px solid var(--accent); background: #f5f6f7; color: #111318; text-decoration: none; transition: background 120ms ease, transform 120ms ease; }}
    .project:hover, .project:focus-visible {{ background: color-mix(in srgb, var(--accent) 20%, #ffffff); transform: translateY(-1px); outline: 2px solid #111318; outline-offset: 1px; }}
    .project img {{ grid-row: 1 / span 2; width: 42px; height: 42px; border: 1px solid #c9cdd2; border-radius: 9px; object-fit: cover; background: #ffffff; }}
    .project-name {{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; line-height: 22px; font-weight: 800; }}
    .project-owner {{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #626973; font-size: 11px; line-height: 18px; font-weight: 650; }}
    .relaxed .project {{ grid-template-columns: 48px 1fr; grid-template-rows: 25px 19px; padding: 10px 12px; }}
    .relaxed .project img {{ width: 48px; height: 48px; border-radius: 10px; }}
    .relaxed .project-name {{ font-size: 18px; line-height: 25px; }}
    .relaxed .project-owner {{ font-size: 12px; line-height: 19px; }}
    footer {{ display: flex; align-items: center; justify-content: space-between; color: #5b626c; font-size: 12px; font-weight: 650; }}
    footer strong {{ color: #111318; }}
  </style>
</head>
<body>
  <main class="canvas">
    <header class="topbar">
      <div>
        <h1>Awesome × Agentic AI Landscape</h1>
        <p>Strictly selected repositories that package reusable curation, skills, playbooks, or working methods.</p>
      </div>
      <div class="snapshot">28 projects<br>Updated 2026-08-23</div>
    </header>
    <section class="landscape" aria-label="Curated Awesome and Agentic AI projects">{panels}</section>
    <footer>
      <span><strong>Selection rule:</strong> reusable repository artifact + distinct role + evidence beyond a single popularity spike</span>
      <span>antgroup/agentic-ai-landscape</span>
    </footer>
  </main>
  <script>
    function fit() {{
      const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      document.documentElement.style.setProperty("--scale", String(scale));
    }}
    window.addEventListener("resize", fit);
    fit();
  </script>
</body>
</html>
"""


def main() -> None:
    rows = read_rows()
    for owner in sorted({owner_name(row["repo_name"]) for row in rows}):
        prepare_avatar(owner)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    HTML_PATH.write_text(build_html(rows), encoding="utf-8")
    WEB_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    WEB_HTML_PATH.write_text(build_html(rows), encoding="utf-8")
    WEB_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for avatar in ASSET_DIR.glob("*.png"):
        shutil.copy2(avatar, WEB_ASSET_DIR / avatar.name)
    print(HTML_PATH)
    print(WEB_HTML_PATH)


if __name__ == "__main__":
    main()
