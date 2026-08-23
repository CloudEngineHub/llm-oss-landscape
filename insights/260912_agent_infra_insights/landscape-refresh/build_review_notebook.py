#!/usr/bin/env python3
"""Build and execute the global Agent/Model Infra landscape review notebook."""

from __future__ import annotations

from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient


HERE = Path(__file__).resolve().parent
NOTEBOOK_PATH = HERE / "landscape-review-260823.ipynb"


def code(source: str):
    return nbf.v4.new_code_cell(source.strip())


def markdown(source: str):
    return nbf.v4.new_markdown_cell(source.strip())


notebook = nbf.v4.new_notebook()
notebook["metadata"] = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {"name": "python", "version": "3"},
}

notebook["cells"] = [
    markdown(
        """
# Agent & Model Infra 全景图全局审校（2026-08-23）

## tl;dr

- 唯一事实源是 `data/agentic-ai-projects.csv`；首页把 `keep` 和 `add` 都视为当前入图项目。
- 当前全景图共 149 个项目：Agent Infra 88 个、Model Infra 61 个；不再使用任何活动或演讲目录里的快照作为维护入口。
- 首页现有的 25 个分区、粉蓝配色、固定画布和卡片视觉均保留。本轮只检查项目覆盖、密度、语义归位和数据质量。
- 建议先做少量下架观察、两项高置信新增和两项跨层归位，不建议重做分类体系。
"""
    ),
    markdown(
        """
## Context & Methods

### Key Assumptions

- “当前在图上”严格按首页代码的筛选口径：`landscape_action ∈ {keep, add}`。
- GitHub Stars、仓库更新时间与 2026-07 OpenRank/参与者是不同口径；前者用于规模和新鲜度参考，后者用于近期协作信号，不把任何一个指标单独解释为生产采用。
- 推荐同时考虑结构覆盖、近期协作、项目持续性、许可证可识别性和同类冗余；Stars 只作为辅助证据。
"""
    ),
    code(
        """
from pathlib import Path
import csv
import re
import pandas as pd
from IPython.display import display, Markdown

ROOT = Path.cwd().resolve()
while ROOT != ROOT.parent and not (ROOT / "data" / "agentic-ai-projects.csv").exists():
    ROOT = ROOT.parent

DATA_PATH = ROOT / "data" / "agentic-ai-projects.csv"
LOADER_PATH = ROOT / "apps" / "landscape-web" / "lib" / "landscape-data.ts"
REPORT_PATH = ROOT / "analysis" / "landscape-refresh" / "current-landscape-projects-and-review-260823.md"

df = pd.read_csv(DATA_PATH, keep_default_na=False)
selected = df[df["landscape_action"].isin(["keep", "add"])].copy()
selected["openrank_numeric"] = pd.to_numeric(selected["openrank_2607"], errors="coerce")
selected["participants_numeric"] = pd.to_numeric(selected["participants_2607"], errors="coerce")
selected["stars_numeric"] = pd.to_numeric(selected["stars"], errors="coerce")

print(f"source={DATA_PATH.relative_to(ROOT)}")
print(f"rows={len(df)}, selected={len(selected)}")
"""
    ),
    markdown("## Data quality checks"),
    code(
        """
loader_source = LOADER_PATH.read_text(encoding="utf-8")
allowed_sections = set(re.findall(r'zone:\\s*"([^"]+)"', loader_source))
selected_pairs = set(zip(selected["landscape_layer"], selected["landscape_section"]))
unknown_sections = sorted(section for _, section in selected_pairs if section not in allowed_sections)

quality = pd.DataFrame([
    {"check": "Rows", "result": len(df), "status": "pass"},
    {"check": "Unique repo_id", "result": df["repo_id"].nunique(), "status": "pass" if df["repo_id"].nunique() == len(df) else "fail"},
    {"check": "Unique repo_name (case-insensitive)", "result": df["repo_name"].str.lower().nunique(), "status": "pass" if df["repo_name"].str.lower().nunique() == len(df) else "fail"},
    {"check": "Selected rows", "result": len(selected), "status": "pass"},
    {"check": "Selected rows with unknown homepage section", "result": len(unknown_sections), "status": "pass" if not unknown_sections else "fail"},
    {"check": "Selected rows missing 2026-07 OpenRank", "result": int(selected["openrank_numeric"].isna().sum()), "status": "caveat"},
    {"check": "Selected rows with NOASSERTION license", "result": int((selected["license"] == "NOASSERTION").sum()), "status": "caveat"},
    {"check": "Selected rows with blank selection reason", "result": int((selected["selection_reason"].str.strip() == "").sum()), "status": "pass" if not (selected["selection_reason"].str.strip() == "").any() else "fail"},
])
display(quality)
assert len(df) == 277
assert df["repo_id"].nunique() == len(df)
assert df["repo_name"].str.lower().nunique() == len(df)
assert not unknown_sections
assert not (selected["selection_reason"].str.strip() == "").any()
"""
    ),
    markdown("## Current landscape composition"),
    code(
        """
layer_summary = (
    selected.groupby("landscape_layer", as_index=False)
    .agg(projects=("repo_name", "count"), sections=("landscape_section", "nunique"))
)
section_summary = (
    selected.groupby(["landscape_layer", "landscape_section"], as_index=False)
    .agg(
        projects=("repo_name", "count"),
        median_openrank=("openrank_numeric", "median"),
        participants=("participants_numeric", "sum"),
    )
    .sort_values(["landscape_layer", "projects"], ascending=[True, False])
)
display(layer_summary)
display(section_summary)
"""
    ),
    markdown("## Current Agent Infra project list"),
    code(
        """
agent_list = selected[selected["landscape_layer"] == "Agent Infra"][
    ["landscape_section", "repo_name", "landscape_action", "openrank_numeric", "participants_numeric", "stars_numeric"]
].sort_values(["landscape_section", "openrank_numeric", "repo_name"], ascending=[True, False, True])
display(agent_list.reset_index(drop=True))
"""
    ),
    markdown("## Current Model Infra project list"),
    code(
        """
model_list = selected[selected["landscape_layer"] == "Model Infra"][
    ["landscape_section", "repo_name", "landscape_action", "openrank_numeric", "participants_numeric", "stars_numeric"]
].sort_values(["landscape_section", "openrank_numeric", "repo_name"], ascending=[True, False, True])
display(model_list.reset_index(drop=True))
"""
    ),
    markdown(
        """
## Editorial recommendations

这里的“建议下架”是从主图退回观察池，不是从完整 CSV 删除。项目仍保留在 `agentic-ai-projects.csv`，后续数据满足条件时可重新进入。
"""
    ),
    code(
        """
recommendations = pd.DataFrame([
    {"priority": "P0", "decision": "move", "repo": "IBM/mcp-context-forge", "from": "Model Infra / Model API gateways", "to": "Agent Infra / Protocols & interoperability", "reason": "核心对象是 MCP gateway、registry、治理与可观测，不是模型 API 聚合。"},
    {"priority": "P0", "decision": "move", "repo": "agentgateway/agentgateway", "from": "Model Infra / Model API gateways", "to": "Agent Infra / Protocols & interoperability", "reason": "项目定位是 agentic proxy 与 MCP/agent 流量策略，应该进入 agent 控制面。"},
    {"priority": "P0", "decision": "watch", "repo": "withastro/flue", "from": "Agent Infra / Code-first frameworks", "to": "观察池", "reason": "当前 OpenRank 8.83、参与者 3；现有 selection_reason 也写明暂不作为核心代表。"},
    {"priority": "P0", "decision": "watch", "repo": "deepseek-ai/deepseek-harness", "from": "Agent Infra / Coding harnesses", "to": "观察池", "reason": "developer preview，2026-07 尚无 OpenRank，参与者为 0。"},
    {"priority": "P0", "decision": "watch", "repo": "openai/symphony", "from": "Agent Infra / Coding harnesses", "to": "观察池", "reason": "engineering preview，2026-07 尚无 OpenRank，参与者为 1。"},
    {"priority": "P0", "decision": "watch", "repo": "microsoft/SkillOpt", "from": "Agent Infra / Observability & evaluation", "to": "观察池", "reason": "当前 OpenRank 1.56、参与者 2，且 skill 优化并不等同于 observability/evaluation。"},
    {"priority": "P0", "decision": "watch", "repo": "allenai/olmocr", "from": "Model Infra / Data · Integration", "to": "观察池", "reason": "2026-07 OpenRank 缺失、参与者为 0；现有 caveat 也建议先作为数据层候选。"},
    {"priority": "P1", "decision": "watch", "repo": "alibaba/open-code-review", "from": "Agent Infra / Agentic coding", "to": "观察池", "reason": "定位清晰，但当前 OpenRank 2.96，外部采用与 benchmark 仍待验证。"},
    {"priority": "P1", "decision": "watch", "repo": "different-ai/openwork", "from": "Agent Infra / Workflow & agent builders", "to": "观察池", "reason": "当前 OpenRank 11.13、参与者 6，且许可证字段为 NOASSERTION；在拥挤的 builder 分区里先完成许可边界和持续性复核。"},
    {"priority": "P1", "decision": "watch", "repo": "Graphify-Labs/graphify", "from": "Agent Infra / Memory, knowledge & context", "to": "观察池", "reason": "与 codebase-memory-mcp 等代码知识图谱项目高度重叠，且项目历史很短。"},
    {"priority": "P1", "decision": "watch", "repo": "DeusData/codebase-memory-mcp", "from": "Agent Infra / Memory, knowledge & context", "to": "观察池", "reason": "同类代码知识图谱集中涌现，当前区已有 11 个项目，需要控制重复。"},
    {"priority": "P1", "decision": "watch", "repo": "NVIDIA/SkillSpector", "from": "Agent Infra / Observability & evaluation", "to": "观察池", "reason": "安全扫描是有价值的新方向，但当前没有合适分类，OpenRank 1.93、参与者 4，先积累同类项目。"},
    {"priority": "P1", "decision": "add", "repo": "NVIDIA-NeMo/RL", "from": "观察池", "to": "Model Infra / Post-Train · Reinforcement learning", "reason": "OpenRank 35.74、参与者 26，能补足成熟的分布式 post-training 工程实现。"},
    {"priority": "P1", "decision": "add", "repo": "agno-agi/agno", "from": "观察池", "to": "Agent Infra / Code-first frameworks", "reason": "OpenRank 33.49、参与者 24；若 Flue 下架，可作为不扩容的替换候选。"},
    {"priority": "P2", "decision": "add-after-structure", "repo": "stacklok/toolhive", "from": "观察池", "to": "Agent Infra / Protocols & interoperability", "reason": "OpenRank 16.71、参与者 11；只有在 gateway/control-plane 语义被明确后再加入，避免继续挤在 Model API gateway。"},
])
display(recommendations)
"""
    ),
    markdown(
        """
## Category adjustment recommendation

不重做首页的四阶段和 25 个分区，也不改变现有视觉语言。建议只做以下轻量语义修正：

1. 把 `IBM/mcp-context-forge` 和 `agentgateway/agentgateway` 从 Model Infra 迁到 Agent Infra；这是项目归位，不是新增视觉层。
2. `Coding harnesses` 可在下一版改名为 `Coding workflows & harnesses`，同一分区内同时容纳配置栈、控制面和 spec-driven workflow。
3. `Tool & browser use` 可改名为 `Tools, web & computer use`，覆盖 Lark CLI、Firecrawl、browser-use 和 CUA，避免再拆更多小格。
4. `Post-Train · Reinforcement learning` 可改名为 `Post-Train · RL & environments`，使 OpenEnv 的位置可解释。
5. 暂不新建 `Agent security` 分区；等同类项目至少形成 3 个持续活跃代表后再拆分。
"""
    ),
    code(
        """
def fmt_number(value):
    if pd.isna(value):
        return "—"
    return f"{int(value):,}" if float(value).is_integer() else f"{value:,.2f}"

lines = [
    "# Agent & Model Infra 当前项目清单与审校建议（2026-08-23）",
    "",
    "## 结论",
    "",
    f"- 当前首页按 `keep + add` 共展示 {len(selected)} 个项目：Agent Infra {len(agent_list)} 个、Model Infra {len(model_list)} 个。",
    "- 唯一事实源仍是 `data/agentic-ai-projects.csv`；本文是可审阅快照，不作为第二份手工数据源。",
    "- 保留首页现有四阶段、25 个分区和视觉组件；建议只做项目归位、局部改名和密度控制。",
    "- GitHub 元数据与 2026-07 OpenRank/参与者口径不同；本文不把 Stars、Trending 或社区活跃直接表述为生产采用。",
    "",
    "## 数据质量摘要",
    "",
]
for row in quality.to_dict("records"):
    lines.append(f"- {row['check']}：{row['result']}（{row['status']}）")

lines.extend(["", "## 建议变更", ""])
for row in recommendations.to_dict("records"):
    lines.append(f"- **{row['priority']} · {row['decision']} · `{row['repo']}`**：{row['from']} → {row['to']}。{row['reason']}")

lines.extend(["", "## 分类结构建议", ""])
lines.extend([
    "- 不重做四阶段和 25 个分区，不改首页粉蓝配色、固定画布、卡片与交互。",
    "- 两个 agent gateway 项目跨层归位到 Agent Infra；Model API gateways 回到模型 API 聚合语义。",
    "- 可仅改三个标签：`Coding workflows & harnesses`、`Tools, web & computer use`、`Post-Train · RL & environments`。",
    "- 暂不拆 `Agent security`；等至少 3 个持续活跃代表后再新增分区。",
])

for layer, layer_df in [("Agent Infra", agent_list), ("Model Infra", model_list)]:
    lines.extend(["", f"## 当前 {layer} 项目（{len(layer_df)}）", ""])
    for section, section_df in layer_df.groupby("landscape_section", sort=True):
        lines.extend([f"### {section}（{len(section_df)}）", ""])
        for row in section_df.to_dict("records"):
            lines.append(
                f"- `{row['repo_name']}` — {row['landscape_action']}; "
                f"OpenRank {fmt_number(row['openrank_numeric'])}; "
                f"参与者 {fmt_number(row['participants_numeric'])}; "
                f"Stars {fmt_number(row['stars_numeric'])}"
            )
        lines.append("")

REPORT_PATH.write_text("\\n".join(lines).rstrip() + "\\n", encoding="utf-8")
print(f"report={REPORT_PATH.relative_to(ROOT)}")
print(f"agent_count={len(agent_list)}, model_count={len(model_list)}")
"""
    ),
    markdown(
        """
## Takeaways

- 当前完整 CSV 和首页的联动是正确的；维护重点应从“另做一张图”转为“审校 canonical selection，再由首页自动生成两张图”。
- 先处理 2 个跨层错位、6 个 P0 观察项和缺失 logo，能够在不改变视觉语言的前提下提升可读性和解释成本。
- P1/P2 建议适合进入下一次编辑确认，不应在没有确认时直接覆盖主 CSV。
"""
    ),
]

nbf.write(notebook, NOTEBOOK_PATH)
client = NotebookClient(
    notebook,
    timeout=180,
    kernel_name="python3",
    resources={"metadata": {"path": str(HERE)}},
)
client.execute()
nbf.write(notebook, NOTEBOOK_PATH)
print(f"Wrote and executed {NOTEBOOK_PATH}")
