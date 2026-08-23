#!/usr/bin/env python3
"""Apply the 2026-08-23 global homepage curation decisions."""

from __future__ import annotations

import csv
import io
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "agentic-ai-projects.csv"

SECTION_RENAMES = {
    "Coding harnesses": "Coding workflows & harnesses",
    "Tool & browser use": "Tools, web & computer use",
    "Post-Train · Reinforcement learning": "Post-Train · RL & environments",
}

REMOVE_TO_WATCH = {
    "withastro/flue": (
        "当前 OpenRank 8.83、7 月参与者 3；Code-first frameworks 已有更活跃的代表项目。",
        "保留在完整项目池中观察；本次退图是密度控制，不等于否定项目价值。",
    ),
    "openai/symphony": (
        "仍处于 engineering preview，2026-07 OpenRank 缺失、参与者为 1。",
        "等公开协作和长期维护信号稳定后再评估。",
    ),
    "microsoft/SkillOpt": (
        "当前 OpenRank 1.56、参与者 2，且 skill 优化不等同于 observability/evaluation。",
        "保留为 agent improvement 候选；未来形成独立类别时再复核。",
    ),
    "allenai/olmocr": (
        "2026-07 OpenRank 缺失、参与者为 0；Data · Integration 已有 Docling 和 MarkItDown。",
        "继续作为模型数据准备候选观察。",
    ),
    "alibaba/open-code-review": (
        "定位清晰，但当前 OpenRank 2.96，外部采用和 benchmark 仍待验证。",
        "项目仍保留在完整项目池，后续按持续协作复核。",
    ),
    "different-ai/openwork": (
        "当前 OpenRank 11.13、参与者 6，且许可证字段为 NOASSERTION；builder 分区已经较拥挤。",
        "完成许可边界和持续性复核后可重新进入。",
    ),
    "Graphify-Labs/graphify": (
        "与 codebase-memory-mcp 等代码知识图谱项目高度重叠，项目历史也较短。",
        "保留在观察池，等待独立采用和持续协作证据。",
    ),
    "DeusData/codebase-memory-mcp": (
        "同类代码知识图谱项目集中涌现，Memory/context 分区需要控制重复。",
        "保留在观察池，与 Graphify、CodeGraph 等同类持续比较。",
    ),
    "NVIDIA/SkillSpector": (
        "Agent security 是值得跟踪的方向，但当前没有合适分类，OpenRank 1.93、参与者 4。",
        "等至少三个持续活跃的安全项目形成稳定分区后再拆类。",
    ),
}

ADD_PROJECTS = {
    "NVIDIA-NeMo/RL": (
        "Model Infra",
        "Post-Train · RL & environments",
        "OpenRank 35.74、7 月参与者 26，补足成熟的分布式 post-training 工程实现。",
        "NVIDIA 在 Model Infra 已有多个项目；这里表达独立的 post-training 角色，不外推为采用结论。",
    ),
    "agno-agi/agno": (
        "Agent Infra",
        "Code-first frameworks",
        "OpenRank 33.49、7 月参与者 24；替换 Flue 后不增加 framework 分区密度。",
        "与现有 Python agent frameworks 有交叉，后续继续按独立社区和能力边界复核。",
    ),
    "stacklok/toolhive": (
        "Agent Infra",
        "Protocols & interoperability",
        "提供 MCP server runtime、registry、policy、隔离和 Kubernetes 运维，补足协议落地后的控制面。",
        "当前社区规模小于头部 gateway 项目；入图依据是独立的运行与治理角色。",
    ),
}

MOVE_PROJECTS = {
    "IBM/mcp-context-forge": (
        "Agent Infra",
        "Protocols & interoperability",
        "MCP gateway、registry、治理与可观测属于 agent 协议控制面，不是模型 API 聚合。",
    ),
    "agentgateway/agentgateway": (
        "Agent Infra",
        "Protocols & interoperability",
        "Agentic proxy 覆盖 MCP 与 agent 流量策略，归入 agent 协议与互操作层。",
    ),
}

METRIC_UPDATES = {
    "deepseek-ai/deepseek-harness": {
        "stars": "187253",
        "forks": "20809",
        "open_issues": "0",
        "license": "MIT",
        "archived": "false",
        "pushed_at": "2026-08-21T12:35:08Z",
    },
    "stablyai/orca": {
        "stars": "51638",
        "forks": "3575",
        "open_issues": "4344",
        "license": "MIT",
        "archived": "false",
        "pushed_at": "2026-08-23T14:44:08Z",
    },
    "volcengine/OpenViking": {
        "stars": "32361",
        "forks": "2471",
        "open_issues": "497",
        "license": "AGPL-3.0",
        "archived": "false",
        "pushed_at": "2026-08-23T15:02:23Z",
    },
    "larksuite/cli": {
        "stars": "16671",
        "forks": "1333",
        "open_issues": "570",
        "license": "MIT",
        "archived": "false",
        "pushed_at": "2026-08-23T14:50:58Z",
    },
    "NVIDIA-NeMo/RL": {
        "stars": "1946",
        "forks": "527",
        "open_issues": "983",
        "license": "Apache-2.0",
        "archived": "false",
        "pushed_at": "2026-08-23T15:11:25Z",
    },
    "agno-agi/agno": {
        "stars": "41850",
        "forks": "5810",
        "open_issues": "1288",
        "license": "Apache-2.0",
        "archived": "false",
        "pushed_at": "2026-08-23T15:16:42Z",
    },
    "stacklok/toolhive": {
        "stars": "2035",
        "forks": "284",
        "open_issues": "380",
        "license": "Apache-2.0",
        "archived": "false",
        "pushed_at": "2026-08-23T01:56:53Z",
    },
}

SIGNALS = {
    "volcengine/OpenViking": (
        "rising",
        "2026-04 至 2026-07 OpenRank 135.01 → 142.45 → 161.17 → 177.61，连续上升。",
    ),
    "larksuite/cli": (
        "rising",
        "2026-04 至 2026-07 OpenRank 95.47 → 138.25 → 168.45 → 179.37，连续上升。",
    ),
    "stablyai/orca": (
        "rising",
        "2026-04 至 2026-07 OpenRank 13.86 → 21.31 → 26.42 → 29.10，连续上升。",
    ),
    "deepseek-ai/deepseek-harness": (
        "new+rising",
        "NEW：created_at 2026-08-13；按 2026-08 月度快照口径，创建日期在 2026-05-01 及以后。 RISING：发布期 Stars 快速累积；该标记不代表社区成熟度或生产采用。",
    ),
    "MoonshotAI/kimi-code": (
        "new",
        "NEW：created_at 2026-05-22；按 2026-08 月度快照口径，创建日期在 2026-05-01 及以后。",
    ),
}

CLEAR_SIGNALS = {
    "docling-project/docling",
    "diegosouzapw/OmniRoute",
    "microsoft/SkillOpt",
}

NEW_SIGNAL_CONTEXT = {
    "MoonshotAI/kimi-code": "5—7 月 OpenRank 12.26 / 27.50 / 19.27。",
    "omnigent-ai/omnigent": "6—7 月 OpenRank 29.98 → 32.65。",
    "vercel/eve": "6—7 月 OpenRank 5.68 → 12.88。",
    "xai-org/grok-build": "短期 attention 很强，持续协作尚待验证。",
}


def split_csv_record(record: str) -> list[str]:
    """Split one CSV record while retaining each field's original quoting."""
    fields: list[str] = []
    start = 0
    index = 0
    quoted = False
    while index < len(record):
        char = record[index]
        if char == '"':
            if quoted and index + 1 < len(record) and record[index + 1] == '"':
                index += 2
                continue
            quoted = not quoted
        elif char == "," and not quoted:
            fields.append(record[start:index])
            start = index + 1
        index += 1
    fields.append(record[start:])
    return fields


def encode_csv_field(value: str) -> str:
    if value == "":
        return ""
    output = io.StringIO()
    csv.writer(output, lineterminator="").writerow([value])
    return output.getvalue()


def main() -> None:
    baseline = subprocess.check_output(
        ["git", "show", "HEAD:data/agentic-ai-projects.csv"],
        cwd=ROOT,
        text=True,
    )
    raw_records = baseline.rstrip("\n").splitlines()
    reader = csv.DictReader(io.StringIO(baseline))
    fields = list(reader.fieldnames or [])
    rows = list(reader)
    original_rows = {row["repo_name"]: dict(row) for row in rows}
    raw_by_name = {
        parsed["repo_name"]: raw
        for raw, parsed in zip(raw_records[1:], rows, strict=True)
    }

    by_name = {row["repo_name"]: row for row in rows}
    expected = (
        set(REMOVE_TO_WATCH)
        | set(ADD_PROJECTS)
        | set(MOVE_PROJECTS)
        | set(METRIC_UPDATES)
        | set(SIGNALS)
        | CLEAR_SIGNALS
    )
    missing = sorted(expected - set(by_name))
    if missing:
        raise SystemExit(f"Missing repositories: {missing}")

    for row in rows:
        section = row.get("landscape_section", "")
        if section in SECTION_RENAMES:
            row["landscape_section"] = SECTION_RENAMES[section]

    for repo, (reason, caveat) in REMOVE_TO_WATCH.items():
        row = by_name[repo]
        row["landscape_action"] = "remove"
        row["selection_reason"] = reason
        row["selection_caveat"] = caveat

    for repo, (layer, section, reason, caveat) in ADD_PROJECTS.items():
        row = by_name[repo]
        row["landscape_action"] = "add"
        row["landscape_layer"] = layer
        row["landscape_section"] = section
        row["selection_reason"] = reason
        row["selection_caveat"] = caveat

    for repo, (layer, section, reason) in MOVE_PROJECTS.items():
        row = by_name[repo]
        row["landscape_layer"] = layer
        row["landscape_section"] = section
        row["selection_reason"] = reason

    deepseek = by_name["deepseek-ai/deepseek-harness"]
    deepseek["selection_reason"] = (
        "DeepSeek AI 官方 agent harness，以插件架构提供可扩展的 coding-agent 运行与工具体系；发布期 Stars 增长显著。"
    )
    deepseek["selection_caveat"] = (
        "项目仍处于 developer preview；RISING 只描述发布期关注增长，不表示社区成熟度或生产采用。"
    )

    for repo, updates in METRIC_UPDATES.items():
        by_name[repo].update(updates)

    for repo in CLEAR_SIGNALS:
        by_name[repo]["trend_signal"] = ""
        by_name[repo]["trend_signal_reason"] = ""
    for repo, (signal, reason) in SIGNALS.items():
        by_name[repo]["trend_signal"] = signal
        by_name[repo]["trend_signal_reason"] = reason

    new_cutoff = "2026-05-01"
    for row in rows:
        signals = {
            signal.strip()
            for signal in row["trend_signal"].replace(",", "+").split("+")
            if signal.strip()
        }
        signals.discard("new")
        if row["created_at"] and row["created_at"] >= new_cutoff:
            signals.add("new")
            new_reason = (
                f"NEW：created_at {row['created_at']}；按 2026-08 月度快照口径，"
                f"创建日期在 {new_cutoff} 及以后。"
            )
            context = NEW_SIGNAL_CONTEXT.get(row["repo_name"])
            if context:
                new_reason = f"{new_reason} {context}"
            row["trend_signal_reason"] = (
                f"{new_reason} RISING：发布期 Stars 快速累积；"
                "该标记不代表社区成熟度或生产采用。"
                if "rising" in signals
                else new_reason
            )
        elif not signals:
            row["trend_signal_reason"] = ""
        row["trend_signal"] = "+".join(
            signal for signal in ("new", "rising") if signal in signals
        )

    selected = [
        row for row in rows if row["landscape_action"] in {"keep", "add"}
    ]
    selected_names = {row["repo_name"].lower() for row in selected}
    if len(selected_names) != len(selected):
        raise SystemExit("Duplicate selected repositories after curation.")
    if len(selected) != 143:
        raise SystemExit(f"Expected 143 selected repositories, got {len(selected)}")

    rendered = [raw_records[0]]
    for row in rows:
        raw_fields = split_csv_record(raw_by_name[row["repo_name"]])
        original = original_rows[row["repo_name"]]
        if len(raw_fields) != len(fields):
            raise SystemExit(f"Malformed raw CSV row: {row['repo_name']}")
        for index, field in enumerate(fields):
            if row[field] != original[field]:
                raw_fields[index] = encode_csv_field(row[field])
        rendered.append(",".join(raw_fields))

    temp_path = CSV_PATH.with_suffix(".csv.tmp")
    temp_path.write_text("\n".join(rendered) + "\n", encoding="utf-8")
    temp_path.replace(CSV_PATH)

    print(f"Rows: {len(rows)}")
    print(f"Selected: {len(selected)}")
    print(
        "Agent / Model:",
        sum(row["landscape_layer"] == "Agent Infra" for row in selected),
        "/",
        sum(row["landscape_layer"] == "Model Infra" for row in selected),
    )
    print(
        "Signals:",
        sorted(
            (row["repo_name"], row["trend_signal"])
            for row in selected
            if row["trend_signal"]
        ),
    )


if __name__ == "__main__":
    main()
