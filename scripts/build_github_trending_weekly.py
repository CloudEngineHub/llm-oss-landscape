#!/usr/bin/env python3
"""Build a weekly GitHub Trending archive from git-trending-rank snapshots."""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote


WEEK_FILE_RE = re.compile(r"trending-weekly-(\d{4})年第(\d+)周\.md$")
INTEGER_RE = re.compile(r"([\d,]+)")


@dataclass
class RepoCard:
    url: str = ""
    paragraphs: list[str] = field(default_factory=list)
    spans: list[str] = field(default_factory=list)
    weekly_gain_text: str = ""


class TrendingParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.cards: list[RepoCard] = []
        self.card: RepoCard | None = None
        self.card_depth = 0
        self.current_paragraph: list[str] | None = None
        self.current_span: list[str] | None = None
        self.weekly_gain_depth: int | None = None
        self.weekly_gain_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        classes = set((attr_map.get("class") or "").split())
        if tag == "div" and self.card is None and "repo-card" in classes:
            self.card = RepoCard()
            self.card_depth = 1
            return
        if self.card is None:
            return

        if tag == "div":
            self.card_depth += 1
            if "stars-today" in classes:
                self.weekly_gain_depth = self.card_depth
                self.weekly_gain_chunks = []
        elif tag == "a" and not self.card.url:
            self.card.url = attr_map.get("href") or ""
        elif tag == "p":
            self.current_paragraph = []
        elif tag == "span":
            self.current_span = []

    def handle_data(self, data: str) -> None:
        if self.card is None:
            return
        if self.current_paragraph is not None:
            self.current_paragraph.append(data)
        if self.current_span is not None:
            self.current_span.append(data)
        if self.weekly_gain_depth is not None:
            self.weekly_gain_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if self.card is None:
            return
        if tag == "p" and self.current_paragraph is not None:
            self.card.paragraphs.append(normalize_text(self.current_paragraph))
            self.current_paragraph = None
        elif tag == "span" and self.current_span is not None:
            self.card.spans.append(normalize_text(self.current_span))
            self.current_span = None
        elif tag == "div":
            if self.weekly_gain_depth == self.card_depth:
                self.card.weekly_gain_text = normalize_text(self.weekly_gain_chunks)
                self.weekly_gain_depth = None
                self.weekly_gain_chunks = []
            if self.card_depth == 1:
                self.cards.append(self.card)
                self.card = None
                self.card_depth = 0
            else:
                self.card_depth -= 1


def normalize_text(chunks: list[str]) -> str:
    return " ".join("".join(chunks).split())


def parse_integer(text: str) -> int | None:
    match = INTEGER_RE.search(text)
    return int(match.group(1).replace(",", "")) if match else None


def parse_snapshot(path: Path, year: int, week: int) -> list[dict[str, object]]:
    content = path.read_text(encoding="utf-8")
    date_match = re.search(r"^date:\s*([^\s]+)", content, flags=re.MULTILINE)
    if not date_match:
        raise ValueError(f"Missing snapshot date in {path}")
    snapshot = datetime.fromisoformat(date_match.group(1).replace("Z", "+00:00"))

    parser = TrendingParser()
    parser.feed(content)
    week_start = date.fromisocalendar(year, week, 1)
    week_end = date.fromisocalendar(year, week, 7)
    source_url = (
        "https://git-trending-rank.github.io/post/"
        + quote(f"trending-weekly-{year}年第{week}周")
        + "/"
    )

    rows: list[dict[str, object]] = []
    for rank, card in enumerate(parser.cards, start=1):
        repo = card.url.removeprefix("https://github.com/").strip("/")
        description = card.paragraphs[1] if len(card.paragraphs) > 1 else ""
        language = ""
        stars_at_snapshot = None
        forks_at_snapshot = None
        for span in card.spans:
            if span.startswith("🔠"):
                language = span.removeprefix("🔠").strip()
            elif span.startswith("⭐"):
                stars_at_snapshot = parse_integer(span)
            elif span.startswith("🔱"):
                forks_at_snapshot = parse_integer(span)
        rows.append(
            {
                "iso_week": f"{year}-W{week:02d}",
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "snapshot_at_utc": snapshot.isoformat(),
                "rank": rank,
                "repo": repo,
                "repo_url": card.url,
                "language": language,
                "stars_this_week_displayed": parse_integer(card.weekly_gain_text),
                "stars_at_snapshot": stars_at_snapshot,
                "forks_at_snapshot": forks_at_snapshot,
                "description": description,
                "source_url": source_url,
                "source_file": str(path),
            }
        )
    return rows


def write_csv(rows: list[dict[str, object]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def fmt_number(value: object) -> str:
    return f"{value:,}" if isinstance(value, int) else "n/a"


def write_summary(rows: list[dict[str, object]], output_path: Path) -> None:
    weeks = sorted({str(row["iso_week"]) for row in rows})
    top10 = [row for row in rows if int(row["rank"]) <= 10]
    appearances = Counter(str(row["repo"]) for row in top10)
    largest_gains = sorted(
        (row for row in rows if isinstance(row["stars_this_week_displayed"], int)),
        key=lambda row: int(row["stars_this_week_displayed"]),
        reverse=True,
    )[:10]

    lines = [
        "# GitHub Weekly Trending 周榜整理（2026-W21 至 W34）",
        "",
        (
            f"共 {len(weeks)} 个周榜快照、{len(rows)} 条上榜记录，涉及 "
            f"{len({str(row['repo']) for row in rows})} 个不同仓库。"
        ),
        "",
        (
            "口径：保留第三方归档的 GitHub 全语言 Weekly Trending 页面中的原始排名，"
            "以及页面当时显示的 `stars this week`。Trending 排名并非简单按 star 增量降序；"
            "该字段也不应替代每日总 star 快照计算出的净增长。W34 为截至 2026-08-20 的周中快照。"
        ),
        "",
        "## Top 10 中出现次数最多的项目",
        "",
        "| 项目 | 进入 Top 10 的周数 |",
        "|---|---:|",
    ]
    for repo, count in appearances.most_common(15):
        lines.append(f"| [{repo}](https://github.com/{repo}) | {count} |")

    lines.extend(
        [
            "",
            "## 页面显示的最大单周 star 增量",
            "",
            "| 周次 | 榜内排名 | 项目 | Stars this week |",
            "|---|---:|---|---:|",
        ]
    )
    for row in largest_gains:
        lines.append(
            f"| {row['iso_week']} | {row['rank']} | "
            f"[{row['repo']}]({row['repo_url']}) | "
            f"{fmt_number(row['stars_this_week_displayed'])} |"
        )

    for week in weeks:
        week_rows = [row for row in top10 if row["iso_week"] == week]
        snapshot_date = str(week_rows[0]["snapshot_at_utc"])[:10]
        source_url = str(week_rows[0]["source_url"])
        lines.extend(
            [
                "",
                f"## {week} ({snapshot_date})",
                "",
                f"[周榜归档页]({source_url})",
                "",
                "| 排名 | 项目 | 语言 | Stars this week |",
                "|---:|---|---|---:|",
            ]
        )
        for row in week_rows:
            lines.append(
                f"| {row['rank']} | [{row['repo']}]({row['repo_url']}) | "
                f"{row['language'] or 'n/a'} | {fmt_number(row['stars_this_week_displayed'])} |"
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Path to git-trending-rank repository")
    parser.add_argument("--start-week", type=int, default=21)
    parser.add_argument("--end-week", type=int, default=34)
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("data/github_trending_weekly_2026w21_w34.csv"),
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=Path("data/github_trending_weekly_top10_2026w21_w34.md"),
    )
    args = parser.parse_args()

    rows: list[dict[str, object]] = []
    for week in range(args.start_week, args.end_week + 1):
        path = args.source / "content" / "post" / f"trending-weekly-{args.year}年第{week}周.md"
        if not path.exists():
            raise FileNotFoundError(path)
        rows.extend(parse_snapshot(path, args.year, week))
    if not rows:
        raise RuntimeError("No weekly trending entries parsed")

    write_csv(rows, args.csv)
    write_summary(rows, args.summary)
    print(f"wrote {len(rows)} rows to {args.csv}")
    print(f"wrote top-10 summary to {args.summary}")


if __name__ == "__main__":
    main()
