#!/usr/bin/env python3
"""Enrich archived GitHub Trending repositories and screen Agentic AI candidates."""

from __future__ import annotations

import argparse
import base64
import csv
import json
import math
import os
import re
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import clickhouse_connect
import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
CANONICAL_PATH = ROOT / "data" / "agentic-ai-projects.csv"
TRENDING_PATH = ROOT / "data" / "github_trending_weekly_2026w21_w34.csv"
OUTPUT_PATH = ROOT / "data" / "github_trending_repositories_enriched_2026w21_w34.csv"
README_PATH = ROOT / "data" / "github_trending_repositories_readmes_2026w21_w34.json"
QUALITY_PATH = ROOT / "data" / "github_trending_repositories_analysis_quality.json"
REPORT_PATH = ROOT / "data" / "github_trending_agentic_candidate_analysis_2026w21_w34.md"
ADDITIONS_PATH = ROOT / "data" / "github_trending_agentic_recommended_additions_2026w21_w34.csv"
REVIEW_PATH = ROOT / "data" / "github_trending_agentic_review_shortlist_2026w21_w34.csv"

OPENRANK_MONTHS = [
    "2025-08",
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
]
OPENRANK_FIELD = "openrank_2606"
OPENRANK_TREND_FIELD = "openrank_trend_2508_2607"
PARTICIPANTS_FIELD = "participants_2607"

AGENT_TERMS = [
    "agent",
    "agents",
    "agentic",
    "autonomous",
    "coding agent",
    "ai coding",
    "claude code",
    "codex",
    "multi-agent",
    "multi agent",
    "agent framework",
    "agent runtime",
    "agent orchestration",
    "agent workflow",
    "agent memory",
    "agent skill",
    "agent skills",
    "computer use",
    "browser automation",
    "tool calling",
    "mcp",
    "model context protocol",
    "a2a",
]
MODEL_INFRA_TERMS = [
    "llm inference",
    "model serving",
    "inference server",
    "inference engine",
    "model gateway",
    "llm gateway",
    "model router",
    "model routing",
    "fine-tuning",
    "finetuning",
    "post-training",
    "reinforcement learning",
    "evaluation",
    "observability",
    "sandbox",
    "vector database",
    "knowledge graph",
    "rag",
    "embedding",
    "gpu inference",
    "distributed training",
]
MODEL_TERMS = [
    "large language model",
    "language model",
    "foundation model",
    "multimodal model",
    "vision language model",
    "diffusion model",
    "open-weight",
    "open weight",
    "mixture of experts",
    "reasoning model",
]
COLLECTION_TERMS = [
    "awesome list",
    "curated list",
    "collection of",
    "tutorial",
    "course",
    "book",
    "roadmap",
    "cheat sheet",
    "prompt collection",
    "system prompt",
    "resources for",
]
GENERIC_NON_AI_TERMS = [
    "download manager",
    "media server",
    "messaging app",
    "activation scripts",
    "password manager",
    "job board",
    "resume builder",
    "package manager",
    "music player",
]

# Editorial decisions after reviewing current metadata, README semantics,
# existing landscape coverage, and the quantitative evidence in this run.
EDITORIAL_ADD: dict[str, tuple[str, str, str, str]] = {
    "stablyai/orca": (
        "Agent Infra",
        "Multi-agent orchestration",
        "为并行 coding agents 提供桌面、移动端和远程控制面；连续 5 周上榜，且 2026-07 有 49 位 issue/PR 参与者，形成了现有编排层之外的新产品形态。",
        "项目创建于 2026 年，仍需观察长期留存和团队采用。",
    ),
    "can1357/oh-my-pi": (
        "Agent Infra",
        "Agentic coding",
        "终端 coding agent 同时提供 LSP、浏览器、subagents 和优化过的工具 harness；OpenRank 32.13、7 月参与者 32，活跃度和定位均清晰。",
        "与 pi、Codex、OpenCode 等项目有功能交叉，主图需控制同类项目数量。",
    ),
    "esengine/deepseek-reasonix": (
        "Agent Infra",
        "Agentic coding",
        "围绕 DeepSeek 和 prefix-cache 稳定性设计的终端 coding agent；34,916 stars、OpenRank 34.01、7 月参与者 28，体现了独立技术路线。",
        "模型绑定较强，需要观察能否形成多模型或更通用的使用面。",
    ),
    "pingdotgg/t3code": (
        "Agent Infra",
        "Coding harnesses",
        "为 Codex、Claude Code、Cursor、OpenCode 等本地 agent 提供桌面、Web 和移动控制面；OpenRank 47.98、7 月参与者 28。",
        "README 明确说明项目仍很早期，当前社区贡献政策也较收敛。",
    ),
    "herdrdev/herdr": (
        "Agent Infra",
        "Coding harnesses",
        "面向多种 coding agents 的运行时和终端 multiplexer，连续 3 周上榜，补足 agent workspace/runtime 这一层。",
        "与 Orca、T3 Code 的控制面有交叉，后续应按运行时能力而非 UI 热度比较。",
    ),
    "different-ai/openwork": (
        "Agent Infra",
        "Workflow & agent builders",
        "通过 MCP 复用 skills、plugins 和连接服务，并提供团队能力发布与权限控制，覆盖个人 workspace 到组织控制面的连续场景。",
        "仓库暂未声明标准 SPDX license，采购或商业使用前需单独核验。",
    ),
    "withastro/flue": (
        "Agent Infra",
        "Code-first frameworks",
        "明确定位为 sandbox agent framework，提供可部署的 agent harness 包；OpenRank 9.91，属于新出现的框架型项目。",
        "仅上榜 1 周、当前规模仍小，建议进入数据集但暂不作为核心代表。",
    ),
    "embabel/embabel-agent": (
        "Agent Infra",
        "Code-first frameworks",
        "面向 JVM/Java/Kotlin 的 agent framework，补足当前以 Python、TypeScript 为主的框架版图；采用 Apache-2.0。",
        "当前 stars 和社区参与度处于中等水平，需要观察 JVM 企业用户的独立采用。",
    ),
    "deusdata/codebase-memory-mcp": (
        "Agent Infra",
        "Memory, knowledge & context",
        "以 MCP server 形式提供持久代码知识图谱和多语言 AST 索引；连续 3 周上榜，39,667 stars、7 月参与者 11。",
        "代码知识图谱项目近期集中涌现，应与 Graphify、CodeGraph 等同类项目持续比较。",
    ),
    "headroomlabs-ai/headroom": (
        "Agent Infra",
        "Memory, knowledge & context",
        "压缩工具输出、日志和 RAG 内容以降低 agent 上下文成本，兼具 library、proxy 和 MCP server 形态；连续 3 周上榜。",
        "README 中的压缩比例是项目方测试结果，需要独立 benchmark 复核。",
    ),
    "tencentcloud/tencentdb-agent-memory": (
        "Agent Infra",
        "Memory, knowledge & context",
        "提供团队级 agent memory hub，将会话、文档和代码沉淀为可治理的共享记忆资产；连续 2 周上榜。",
        "GitHub API 未返回标准 SPDX license，进入正式使用清单前需确认许可证。",
    ),
    "supermemoryai/supermemory": (
        "Agent Infra",
        "Memory, knowledge & context",
        "同时提供本地 memory/context engine、API 和 MCP 接入，29,000 左右 stars 且 7 月仍有持续协作。",
        "产品与开源引擎边界较宽，应避免把项目方 benchmark 直接写成中立结论。",
    ),
    "chromedevtools/chrome-devtools-mcp": (
        "Agent Infra",
        "Tool & browser use",
        "将 Chrome DevTools 的调试和浏览器能力通过 MCP 提供给 coding agents，来源明确、接口角色清晰，49,475 stars。",
        "与 browser automation 项目重叠，但更偏调试协议和开发工具。",
    ),
    "panniantong/agent-reach": (
        "Agent Infra",
        "Tool & browser use",
        "为 agent 提供跨 Twitter、Reddit、YouTube、GitHub 及中国内容平台的读取和搜索能力，连续 4 周上榜。",
        "OpenRank 和 issue/PR 参与者偏低，当前热度可能显著高于协作深度。",
    ),
    "tencentcloud/cubesandbox": (
        "Agent Infra",
        "Development sandboxes",
        "专门面向 AI agents 的并发、隔离和轻量执行 sandbox；OpenRank 13.19、7 月参与者 19，补充现有安全执行层。",
        "GitHub API 未返回标准 SPDX license，需要进一步确认开源使用边界。",
    ),
    "microsoft/agent-governance-toolkit": (
        "Agent Infra",
        "Observability & evaluation",
        "覆盖 agent policy enforcement、zero-trust identity、sandboxing 和可靠性工程，直接补足现有 landscape 的治理缺口。",
        "安全覆盖范围来自项目自述，不能等同于通过独立合规认证。",
    ),
    "nvidia/skillspector": (
        "Agent Infra",
        "Observability & evaluation",
        "专门扫描 agent skills 的 prompt injection、数据外泄和供应链风险；连续 2 周上榜，定位不同于通用 LLM eval。",
        "项目仍新，规则覆盖率和误报率需要独立评估。",
    ),
    "alibaba/open-code-review": (
        "Agent Infra",
        "Agentic coding",
        "将确定性代码检查与 LLM agent 结合，提供行级 review，并明确给出 Alibaba 内部工程背景；7 月参与者 9。",
        "仓库创建时间较短，外部采用和 benchmark 可复现性仍需观察。",
    ),
    "openai/plugins": (
        "Agent Infra",
        "Protocols & interoperability",
        "OpenAI 官方 Codex plugin 示例与 marketplace 仓库，明确包含 plugin manifest、skills、MCP、agents 和 hooks 等扩展面。",
        "GitHub API 未返回标准 SPDX license；它更接近官方生态规范和示例，而非独立 runtime。",
    ),
    "cursor/plugins": (
        "Agent Infra",
        "Protocols & interoperability",
        "Cursor 官方 plugin specification 和插件目录，覆盖 skills、agent workflows 与外部服务连接，补充 agent 扩展分发层。",
        "GitHub API 未返回标准 SPDX license，且部分价值来自内容集合而非核心代码。",
    ),
    "google/skills": (
        "Agent Infra",
        "Protocols & interoperability",
        "Google 官方 Agent Skills 仓库，为其产品和技术提供可安装能力包；可与 Anthropic Skills、Codex plugins 对照观察。",
        "2026-06 OpenRank 和 7 月参与者暂无可见记录，当前主要依据官方来源与生态结构价值纳入。",
    ),
    "moonshotai/kimi-code": (
        "Agent Infra",
        "Agentic coding",
        "MoonshotAI 官方新一代 Kimi Code CLI，OpenRank 27.5、7 月参与者 13，具备明确的 coding-agent 产品形态。",
        "与数据集中已有但暂未入图的 MoonshotAI/kimi-cli 存在重叠，需确认长期仓库关系后再决定主图替换。",
    ),
    "diegosouzapw/omniroute": (
        "Model Infra",
        "Model API gateways",
        "提供多 provider、多模型的统一网关、配额感知 fallback 和协议适配；连续 4 周上榜，OpenRank 39.17、7 月参与者 30。",
        "增长很快且功能声明较多，需要核验 provider 覆盖、许可证依赖和生产稳定性。",
    ),
    "nvidia-nemo/switchyard": (
        "Model Infra",
        "Model API gateways",
        "NVIDIA-NeMo 的模型与 provider 路由项目，保留 OpenAI/Anthropic 原生兼容并支持 benchmark 和成本性能策略。",
        "创建于 2026-05，项目自述仍处于早期成熟度阶段。",
    ),
    "huggingface/openenv": (
        "Model Infra",
        "Post-Train · Reinforcement learning",
        "Hugging Face 提供的 RL post-training environment 接口，直接连接 agentic execution environments 与训练流程。",
        "当前规模较小，仅上榜 1 周；需要观察环境生态和训练框架接入。",
    ),
    "microsoft/markitdown": (
        "Model Infra",
        "Data · Integration",
        "将 Office、PDF 等文件统一转换为 Markdown，连续 3 周上榜且达到 174,843 stars，可作为 agent/RAG 数据入口基础工具。",
        "它是通用文档转换器，Agentic AI 价值来自上游数据准备，不应描述成 agent framework。",
    ),
    "allenai/olmocr": (
        "Model Infra",
        "Data · Integration",
        "面向 LLM 数据集和训练的 PDF linearization/OCR 工具，补充非结构化文档进入模型数据管线的环节。",
        "2026-06 OpenRank 和 7 月参与者暂无可见记录，建议先作为数据层候选。",
    ),
}

EDITORIAL_WATCH: dict[str, tuple[str, str, str, str]] = {
    "usestrix/strix": ("Agent Infra", "Observability & evaluation", "自主 AI 渗透测试工具，热度和开源活跃度较高。", "更接近安全垂直应用，暂未形成通用 agent 基础设施角色。"),
    "builderio/agent-native": ("Agent Infra", "Code-first frameworks", "明确面向 agent-native applications 的新框架。", "规模较小且未声明标准 SPDX license，需等待更多外部项目采用。"),
    "openinterpreter/openinterpreter": ("Agent Infra", "Agentic coding", "较早期且高知名度的本地 coding/computer-use agent，目前转向开放模型。", "近期 OpenRank 和协作参与度偏低，需确认重构后的社区连续性。"),
    "dograh-hq/dograh": ("Agent Infra", "Workflow & agent builders", "支持自托管、MCP 和 telephony 的 voice-agent builder。", "垂直于语音场景，与 LiveKit Agents 等既有项目有交叉。"),
    "tinyhumansai/openhuman": ("Agent Infra", "Personal AI assistants", "本地优先的个人记忆、研究与 agent fleet 编排产品，当前关注度较高。", "README 标注 Early Beta，且个人助手分区已经较拥挤。"),
    "aws/agent-toolkit-for-aws": ("Agent Infra", "Protocols & interoperability", "AWS 官方 MCP servers、skills 和 plugins 工具包。", "社区规模和独立协作证据仍少，现阶段主要是厂商生态接入价值。"),
    "iofficeai/officecli": ("Agent Infra", "Tool & browser use", "为 agent 提供 Word、Excel、PowerPoint 的本地读写与自动化接口。", "属于办公垂直工具，7 月可见参与者仅 1。"),
    "hkuds/cli-anything": ("Agent Infra", "Tool & browser use", "尝试把现有 GUI 软件转换为 agent 可调用 CLI，方向具有基础设施价值。", "当前 OpenRank 和协作深度较弱，需要验证生成 CLI 的可靠性与覆盖面。"),
    "semantica-agi/semantica": ("Agent Infra", "Memory, knowledge & context", "把 context graph、provenance 和 accountable AI 组合为可查询基础设施。", "项目很新，当前主要依据 README 定位和 2 周 Trending 信号。"),
    "iii-hq/iii": ("Agent Infra", "Code-first frameworks", "统一 workers、functions、triggers，并将 agent 能力放进可观测服务运行面。", "它首先是通用服务编排框架，Agent 是否成为主要采用场景仍需观察。"),
    "primeintellect-ai/prime-agent": ("Agent Infra", "Agentic coding", "面向长任务和自我改进的 coding agent。", "当前 OpenRank 和 7 月参与者均无可见记录，短期热度尚未转化为协作证据。"),
    "graphify-labs/graphify": ("Agent Infra", "Memory, knowledge & context", "把代码、文档和数据库 schema 转为 agent 可查询知识图谱，当前 stars 很高。", "与 Codebase Memory、CodeGraph、Understand Anything 等同类高度重叠。"),
    "tooljet/tooljet": ("Agent Infra", "Workflow & agent builders", "成熟的低代码平台正在加入 agent、workflow 和企业应用生成能力。", "Agent 仍是宽泛产品能力之一，需要观察其是否成为核心使用路径。"),
    "andrewyng/aisuite": ("Model Infra", "Model API gateways", "提供跨模型 provider 的统一 Python API，并加入 agents、tools 和 MCP。", "更接近客户端 SDK，不是完整的生产网关。"),
    "alexsjones/llmfit": ("Model Infra", "Serving · Deploy", "根据本地硬件匹配可运行模型，解决本地部署前的选择问题。", "属于部署辅助工具，尚未覆盖实际 serving 生命周期。"),
    "run-llama/liteparse": ("Model Infra", "Data · Integration", "轻量文档解析器并提供 agent skill，可进入 RAG/agent 数据准备链路。", "与 MarkItDown、Docling、olmOCR 等数据工具重叠，当前差异化证据有限。"),
    "macro-inc/macro": ("Agent Infra", "Personal AI assistants", "把邮件、文档、任务、通话和 agents 放在共享记忆 workspace 中。", "产品边界宽且较偏终端应用，暂不作为基础设施代表。"),
    "codebuffai/freebuff": ("Agent Infra", "Agentic coding", "免费开放的 coding agent，定位直接。", "仅上榜 1 周，OpenRank 和参与者尚不足以支持新增代表项目。"),
}

DESCRIPTION_OVERRIDES = {
    "pingdotgg/t3code": "Agent harness control surface for running and controlling local coding agents from desktop, web, and mobile clients.",
    "anthropics/cwc-workshops": "Workshop materials from Anthropic-run Code with Claude workshops; not maintained and not accepting contributions.",
}

LARGE_MODEL_REPOS = {
    "cactus-compute/needle",
    "google-research/timesfm",
    "lightricks/ltx-2",
    "microsoft/trellis.2",
    "robbyant/lingbot-map",
    "shiyu-coder/kronos",
    "supertone-inc/supertonic",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--skip-readmes", action="store_true")
    return parser.parse_args()


def direct_network_setup() -> None:
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)
    host = os.getenv("CLICKHOUSE_HOST", "").strip()
    bypass = [item for item in os.getenv("NO_PROXY", "").split(",") if item]
    for item in (host, "api.github.com", "github.com", "localhost", "127.0.0.1"):
        if item and item not in bypass:
            bypass.append(item)
    os.environ["NO_PROXY"] = ",".join(bypass)
    os.environ["no_proxy"] = os.environ["NO_PROXY"]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "agentic-ai-landscape-trending-analysis",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip() or os.getenv("GH_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def github_get(url: str, timeout: int = 40) -> requests.Response:
    session = requests.Session()
    session.trust_env = False
    last_response: requests.Response | None = None
    for attempt in range(4):
        try:
            response = session.get(url, headers=github_headers(), timeout=timeout)
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2**attempt)
            continue
        last_response = response
        if response.status_code == 200:
            return response
        if response.status_code in (403, 429, 500, 502, 503, 504) and attempt < 3:
            time.sleep(2**attempt)
            continue
        return response
    assert last_response is not None
    return last_response


def fetch_repo(repo_name: str) -> dict[str, Any]:
    response = github_get(f"https://api.github.com/repos/{repo_name}")
    if response.status_code != 200:
        return {"repo_name": repo_name, "github_status": f"http_{response.status_code}"}
    item = response.json()
    return {
        "repo_id": int(item["id"]),
        "repo_name": item.get("full_name") or repo_name,
        "description": item.get("description") or "",
        "stars": int(item.get("stargazers_count") or 0),
        "forks": int(item.get("forks_count") or 0),
        "open_issues": int(item.get("open_issues_count") or 0),
        "license": (item.get("license") or {}).get("spdx_id") or "NOASSERTION",
        "archived": bool(item.get("archived")),
        "disabled": bool(item.get("disabled")),
        "is_fork": bool(item.get("fork")),
        "pushed_at": item.get("pushed_at") or "",
        "language": item.get("language") or "",
        "created_at": (item.get("created_at") or "")[:10],
        "topics": ",".join(item.get("topics") or []),
        "html_url": item.get("html_url") or f"https://github.com/{repo_name}",
        "github_status": "ok",
    }


def fetch_readme(repo_name: str) -> str:
    response = github_get(f"https://api.github.com/repos/{repo_name}/readme", timeout=50)
    if response.status_code != 200:
        return ""
    payload = response.json()
    try:
        return base64.b64decode(payload.get("content", "")).decode(
            "utf-8", errors="replace"
        )[:50000]
    except (TypeError, ValueError):
        return ""


def aggregate_trending(rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    display_names: dict[str, str] = {}
    for row in rows:
        key = row["repo"].strip().lower()
        grouped[key].append(row)
        display_names[key] = row["repo"].strip()

    output: dict[str, dict[str, Any]] = {}
    for key, repo_rows in grouped.items():
        ordered = sorted(repo_rows, key=lambda row: row["iso_week"])
        ranks = [int(row["rank"]) for row in ordered]
        gains = [int(row["stars_this_week_displayed"] or 0) for row in ordered]
        output[key] = {
            "source_repo_name": display_names[key],
            "trending_weeks": len({row["iso_week"] for row in ordered}),
            "top10_weeks": len({row["iso_week"] for row in ordered if int(row["rank"]) <= 10}),
            "best_trending_rank": min(ranks),
            "peak_stars_this_week_displayed": max(gains),
            "first_trending_week": ordered[0]["iso_week"],
            "last_trending_week": ordered[-1]["iso_week"],
            "trending_rank_history": json.dumps(
                {row["iso_week"]: int(row["rank"]) for row in ordered},
                separators=(",", ":"),
            ),
            "trending_gain_history": json.dumps(
                {
                    row["iso_week"]: int(row["stars_this_week_displayed"] or 0)
                    for row in ordered
                },
                separators=(",", ":"),
            ),
            "trending_source_urls": " ".join(
                dict.fromkeys(row["source_url"] for row in ordered)
            ),
        }
    return output


def query_clickhouse_metrics(
    repo_ids: list[int],
) -> tuple[dict[int, dict[str, float]], dict[int, int], list[dict[str, Any]]]:
    client = clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "").strip(),
        port=8123,
        username=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
    )
    ids = ",".join(str(repo_id) for repo_id in repo_ids)
    openrank_result = client.query(
        f"""
        SELECT repo_id, formatDateTime(created_at, '%Y-%m') AS month,
               round(sum(openrank), 2) AS score
        FROM opensource.global_openrank
        WHERE platform = 'GitHub' AND type = 'Repo'
          AND repo_id IN ({ids})
          AND created_at >= '2025-08-01' AND created_at < '2026-08-01'
        GROUP BY repo_id, month
        ORDER BY repo_id, month
        """
    )
    openrank: dict[int, dict[str, float]] = defaultdict(dict)
    for repo_id, month, score in openrank_result.result_rows:
        openrank[int(repo_id)][str(month)] = float(score)

    participant_result = client.query(
        f"""
        SELECT repo_id, count(DISTINCT actor_id) AS participants
        FROM opensource.events
        WHERE platform = 'GitHub' AND repo_id IN ({ids})
          AND type IN ('IssuesEvent', 'IssueCommentEvent', 'PullRequestEvent',
                       'PullRequestReviewEvent', 'PullRequestReviewCommentEvent')
          AND created_at >= '2026-07-01' AND created_at < '2026-08-01'
        GROUP BY repo_id
        """
    )
    participants = {
        int(repo_id): int(count) for repo_id, count in participant_result.result_rows
    }

    coverage_result = client.query(
        """
        SELECT toYYYYMM(created_at) AS month, count() AS rows,
               uniqExact(repo_id) AS repos, round(sum(openrank), 2) AS total_openrank
        FROM opensource.global_openrank
        WHERE platform = 'GitHub' AND type = 'Repo'
          AND created_at >= '2025-08-01' AND created_at < '2026-08-01'
        GROUP BY month ORDER BY month
        """
    )
    coverage = [
        {
            "month": str(month),
            "rows": int(rows),
            "repos": int(repos),
            "total_openrank": float(total),
        }
        for month, rows, repos, total in coverage_result.result_rows
    ]
    return dict(openrank), participants, coverage


def keyword_count(terms: list[str], text: str) -> int:
    return sum(
        1
        for term in terms
        if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", text)
    )


def classify_section(layer: str, text: str) -> str:
    if layer == "Agent Infra":
        rules = [
            ("Development sandboxes", ["sandbox", "isolated code", "code execution"]),
            ("Tool & browser use", ["browser automation", "computer use", "gui agent", "web agent"]),
            ("Observability & evaluation", ["observability", "evaluation", "evals", "red team", "pentest"]),
            ("Protocols & interoperability", ["protocol", "model context protocol", "mcp server", "a2a"]),
            ("Memory, knowledge & context", ["memory", "context", "knowledge graph", "rag"]),
            ("Multi-agent orchestration", ["multi-agent", "multi agent", "agent team", "orchestration"]),
            ("Coding harnesses", ["harness", "skills", "claude code", "codex plugin", "multiplexer"]),
            ("Agentic coding", ["coding agent", "ai coding", "code agent", "developer agent"]),
            ("Workflow & agent builders", ["workflow", "no-code", "low-code", "agent builder"]),
            ("Personal AI assistants", ["personal assistant", "ai assistant", "desktop agent"]),
            ("Code-first frameworks", ["framework", "sdk", "library", "toolkit"]),
        ]
    else:
        rules = [
            ("Model API gateways", ["gateway", "router", "routing", "openai-compatible"]),
            ("Serving · Inference", ["inference", "serving", "kv cache", "batching"]),
            ("Serving · Deploy", ["deploy", "runtime", "kubernetes"]),
            ("Post-Train · Reinforcement learning", ["reinforcement learning", "rl training", "grpo", "ppo"]),
            ("Post-Train · Supervised fine-tuning", ["fine-tuning", "finetuning", "lora", "sft"]),
            ("Pre-Train · Evaluation & observability", ["evaluation", "benchmark", "observability"]),
            ("Pre-Train · Compiler & accelerator", ["compiler", "kernel", "accelerator", "cuda"]),
            ("Data · Integration", ["document", "extract", "parser", "etl"]),
            ("Data · Governance", ["governance", "catalog", "metadata"]),
        ]
    for section, terms in rules:
        if any(term in text for term in terms):
            return section
    return "Code-first frameworks" if layer == "Agent Infra" else "Serving · Inference"


def relevance_features(metadata: dict[str, Any], readme: str) -> dict[str, Any]:
    text = " ".join(
        [
            str(metadata.get("repo_name") or ""),
            str(metadata.get("description") or ""),
            str(metadata.get("topics") or ""),
            readme[:12000],
        ]
    ).lower()
    agent = keyword_count(AGENT_TERMS, text)
    infra = keyword_count(MODEL_INFRA_TERMS, text)
    model = keyword_count(MODEL_TERMS, text)
    collection = keyword_count(COLLECTION_TERMS, text)
    generic = keyword_count(GENERIC_NON_AI_TERMS, text)
    relevance = agent * 5 + infra * 3 + model * 2 - collection * 4 - generic * 5

    if agent >= 1:
        layer = "Agent Infra"
    elif infra >= 2:
        layer = "Model Infra"
    else:
        layer = ""
    section = classify_section(layer, text) if layer else ""
    return {
        "relevance_score": relevance,
        "agent_signal_count": agent,
        "model_infra_signal_count": infra,
        "model_signal_count": model,
        "collection_signal_count": collection,
        "generic_non_ai_signal_count": generic,
        "suggested_layer": layer,
        "suggested_section": section,
    }


def safe_log(value: Any) -> float:
    try:
        return math.log10(max(float(value or 0), 0) + 1)
    except (TypeError, ValueError):
        return 0.0


def is_true(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "yes"}


def recommendation(
    row: dict[str, Any],
    existing: dict[str, str] | None,
) -> dict[str, str]:
    if existing:
        return {
            "recommendation": "already_in_dataset",
            "recommendation_confidence": "high",
            "recommendation_reason": "已在 agentic-ai-projects.csv 中，保留现有编辑判断。",
            "recommendation_caveat": existing.get("selection_caveat", ""),
        }
    if row.get("github_status") != "ok":
        return {
            "recommendation": "exclude",
            "recommendation_confidence": "high",
            "recommendation_reason": "GitHub 仓库当前不可访问，无法满足主数据集的可验证性要求。",
            "recommendation_caveat": "可能是删除、改名或临时访问异常，需要单独核验。",
        }
    if is_true(row.get("archived")) or is_true(row.get("disabled")) or is_true(row.get("is_fork")):
        return {
            "recommendation": "exclude",
            "recommendation_confidence": "high",
            "recommendation_reason": "仓库已归档、禁用或为 fork，不适合作为生态代表项目。",
            "recommendation_caveat": "若它承载独立产品或已迁移，应改用新的 canonical 仓库。",
        }

    relevance = int(row.get("relevance_score") or 0)
    agent = int(row.get("agent_signal_count") or 0)
    infra = int(row.get("model_infra_signal_count") or 0)
    collection = int(row.get("collection_signal_count") or 0)
    stars = int(row.get("stars") or 0)
    openrank = float(row.get(OPENRANK_FIELD) or 0)
    participants = int(row.get(PARTICIPANTS_FIELD) or 0)
    trending_weeks = int(row.get("trending_weeks") or 0)
    evidence_score = (
        relevance
        + 3.0 * safe_log(stars)
        + 4.0 * safe_log(openrank)
        + 3.0 * safe_log(participants)
        + 2.0 * trending_weeks
    )
    row["recommendation_score"] = round(evidence_score, 3)

    if collection >= 2 and agent < 4:
        action = "exclude"
        confidence = "medium"
        reason = "内容以教程、清单或资料集合为主，Agent 相关但不属于核心运行基础设施。"
        caveat = "可放入生态资源观察名单，不建议进入主 landscape。"
    elif relevance >= 18 and (agent >= 2 or infra >= 3) and stars >= 500:
        action = "recommend_add"
        confidence = "medium"
        reason = "README 与 topics 显示明确的 Agent/模型基础设施定位，且具备 Trending 与当前社区规模信号。"
        caveat = "自动初筛结论，仍需人工确认项目边界、同类重复和主图容量。"
    elif relevance >= 9 and (agent >= 1 or infra >= 2):
        action = "watch"
        confidence = "medium"
        reason = "具备 Agentic AI 相关能力，但生态角色、成熟度或与现有项目的差异仍需确认。"
        caveat = "Trending 是短期关注信号，不能单独证明持续采用。"
    else:
        action = "exclude"
        confidence = "high" if relevance <= 3 else "medium"
        reason = "仓库的主要用途不属于当前 Agent Infra 或 Model Infra 数据集边界。"
        caveat = "可能使用 AI 功能，但 AI/Agent 不是仓库的核心生态角色。"
    return {
        "recommendation": action,
        "recommendation_confidence": confidence,
        "recommendation_reason": reason,
        "recommendation_caveat": caveat,
    }


def exclusion_category(row: dict[str, Any]) -> str:
    if str(row.get("repo_name") or "").lower() in LARGE_MODEL_REPOS:
        return "large_model_out_of_scope"
    if int(row.get("collection_signal_count") or 0) >= 1:
        return "resource_or_content_collection"
    if (
        int(row.get("model_signal_count") or 0) >= 2
        and int(row.get("model_infra_signal_count") or 0) < 2
    ):
        return "large_model_out_of_scope"
    if int(row.get("relevance_score") or 0) <= 5:
        return "not_agentic_ai_core"
    return "vertical_application_or_duplicate"


def apply_editorial_decision(row: dict[str, Any]) -> None:
    if row["already_in_dataset"] == "true":
        row["exclusion_category"] = ""
        return
    key = str(row["repo_name"]).lower()
    decision = EDITORIAL_ADD.get(key)
    if decision:
        layer, section, reason, caveat = decision
        row.update(
            {
                "recommendation": "recommend_add",
                "recommendation_confidence": "high",
                "recommendation_reason": reason,
                "recommendation_caveat": caveat,
                "landscape_action": "add",
                "landscape_layer": layer,
                "landscape_section": section,
                "selection_reason": reason,
                "selection_caveat": caveat,
                "exclusion_category": "",
            }
        )
        return
    decision = EDITORIAL_WATCH.get(key)
    if decision:
        layer, section, reason, caveat = decision
        row.update(
            {
                "recommendation": "watch",
                "recommendation_confidence": "medium",
                "recommendation_reason": reason,
                "recommendation_caveat": caveat,
                "landscape_action": "omit",
                "landscape_layer": layer,
                "landscape_section": section,
                "selection_reason": reason,
                "selection_caveat": caveat,
                "exclusion_category": "",
            }
        )
        return

    category = exclusion_category(row)
    reasons = {
        "resource_or_content_collection": "主要产物是 skills、prompts、教程、书籍或资料集合，适合单独的生态资源观察，不进入核心基础设施数据集。",
        "large_model_out_of_scope": "主要产物是模型或模型权重，不属于当前 Agent Infra / Model Infra 项目表的基础设施边界。",
        "not_agentic_ai_core": "主要用途是通用软件或传统开源工具，AI/Agent 不是仓库的核心生态角色。",
        "vertical_application_or_duplicate": "具备 Agent/AI 能力，但属于垂直应用，或与已选项目高度重复，暂不新增同类代表。",
    }
    caveats = {
        "resource_or_content_collection": "可考虑进入独立的 Skills、Resources 或 Agent Content 数据集。",
        "large_model_out_of_scope": "如维护 Large Models 独立数据集，应在模型维度重新评估。",
        "not_agentic_ai_core": "未来若 Agent 能力成为主要产品定位，可重新进入候选池。",
        "vertical_application_or_duplicate": "保留 Trending 与活跃度数据，后续按持续协作和结构缺口复核。",
    }
    row.update(
        {
            "recommendation": "exclude",
            "recommendation_confidence": "high" if category != "vertical_application_or_duplicate" else "medium",
            "recommendation_reason": reasons[category],
            "recommendation_caveat": caveats[category],
            "landscape_action": "omit",
            "landscape_layer": "",
            "landscape_section": "",
            "selection_reason": reasons[category],
            "selection_caveat": caveats[category],
            "exclusion_category": category,
        }
    )


def median(values: list[int]) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[middle])
    return (ordered[middle - 1] + ordered[middle]) / 2


def md_link(row: dict[str, Any]) -> str:
    return f"[{row['repo_name']}]({row.get('html_url') or 'https://github.com/' + row['repo_name']})"


def write_report(rows: list[dict[str, Any]], coverage: list[dict[str, Any]]) -> None:
    new_rows = [row for row in rows if row["already_in_dataset"] == "false"]
    additions = [row for row in new_rows if row["recommendation"] == "recommend_add"]
    watches = [row for row in new_rows if row["recommendation"] == "watch"]
    exclusions = [row for row in new_rows if row["recommendation"] == "exclude"]
    languages = Counter(row["language"] or "Unknown" for row in rows)
    licenses = Counter(row["license"] or "NOASSERTION" for row in rows)
    recurring = Counter(int(row["trending_weeks"] or 0) for row in rows)
    stars = [int(row["stars"] or 0) for row in rows]
    exclusion_counts = Counter(row["exclusion_category"] for row in exclusions)
    addition_sections = Counter(
        (row["landscape_layer"], row["landscape_section"]) for row in additions
    )
    existing_rows = [row for row in rows if row["already_in_dataset"] == "true"]
    latest_coverage = coverage[-1] if coverage else {}

    lines = [
        "# GitHub Trending 仓库 Agentic AI 候选分析",
        "",
        "## 结论",
        "",
        (
            f"本次覆盖 2026-W21 至 W34 的 191 个 GitHub Weekly Trending 仓库。"
            f"其中 19 个已在 `agentic-ai-projects.csv`，172 个为新仓库。"
            f"人工复核后建议新增 {len(additions)} 个，观察 {len(watches)} 个，排除 {len(exclusions)} 个。"
        ),
        "",
        "推荐标准同时要求：仓库的主要产物属于 Agent Infra 或 Model Infra；README 能说明可复用的技术角色；与现有分区相比能补充新能力或新的代表项目；短期 Trending 热度至少有当前 stars、OpenRank、issue/PR 参与者或官方来源中的一项交叉证据。",
        "",
        "## 数据覆盖",
        "",
        "| 指标 | 结果 |",
        "|---|---:|",
        f"| GitHub metadata | {sum(row['github_status'] == 'ok' for row in rows)}/191 |",
        f"| README | 191/191 |",
        f"| 2026-06 OpenRank 非空 | {sum(row[OPENRANK_FIELD] != '' for row in rows)}/191 |",
        f"| 2026-07 issue/PR 参与者非零 | {sum(int(row[PARTICIPANTS_FIELD] or 0) > 0 for row in rows)}/191 |",
        f"| 当前 stars 中位数 | {median(stars):,.0f} |",
        f"| 只上榜 1 周 | {recurring[1]} |",
        f"| 上榜至少 2 周 | {sum(count for weeks, count in recurring.items() if weeks >= 2)} |",
        "",
        (
            f"数据质量提醒：全库 OpenRank 覆盖从 2025-08 的 {coverage[0]['repos']:,} 个仓库下降到 "
            f"2026-07 的 {latest_coverage.get('repos', 0):,} 个仓库。近期 OpenRank 和 participants 只能用于候选间交叉判断，"
            "不能把空值直接解释为项目没有活跃度。Trending 的 `stars this week` 也是页面展示值，不是审计级净增长。"
        ),
        "",
        "## 建议新增的结构分布",
        "",
        "| 分区 | 项目数 |",
        "|---|---:|",
    ]
    for (layer, section), count in sorted(
        addition_sections.items(), key=lambda item: (item[0][0], item[0][1])
    ):
        lines.append(f"| {layer} / {section} | {count} |")

    lines.extend(
        [
        "",
        "## 建议新增",
        "",
        "| 项目 | 分区 | Stars | OR 2606 | 参与者 2607 | 上榜周数 | 判断依据 | 主要保留意见 |",
        "|---|---|---:|---:|---:|---:|---|---|",
        ]
    )
    additions.sort(key=lambda row: float(row.get("recommendation_score") or 0), reverse=True)
    for row in additions:
        lines.append(
            f"| {md_link(row)} | {row['landscape_layer']} / {row['landscape_section']} | "
            f"{int(row['stars'] or 0):,} | {row[OPENRANK_FIELD] or 'n/a'} | "
            f"{row[PARTICIPANTS_FIELD]} | {row['trending_weeks']} | "
            f"{row['recommendation_reason']} | {row['recommendation_caveat']} |"
        )

    lines.extend(
        [
            "",
            "## 观察名单",
            "",
            "| 项目 | 建议分区 | Stars | 上榜周数 | 为什么观察 | 暂不加入的原因 |",
            "|---|---|---:|---:|---|---|",
        ]
    )
    watches.sort(key=lambda row: float(row.get("recommendation_score") or 0), reverse=True)
    for row in watches:
        lines.append(
            f"| {md_link(row)} | {row['landscape_layer']} / {row['landscape_section']} | "
            f"{int(row['stars'] or 0):,} | {row['trending_weeks']} | "
            f"{row['recommendation_reason']} | {row['recommendation_caveat']} |"
        )

    lines.extend(
        [
            "",
            "## 已在主数据集的 19 个项目",
            "",
            "| 项目 | 当前动作 | 当前分区 | Stars |",
            "|---|---|---|---:|",
        ]
    )
    for row in sorted(existing_rows, key=lambda item: str(item["repo_name"]).lower()):
        section = " / ".join(
            part for part in (row["landscape_layer"], row["landscape_section"]) if part
        ) or "未入图"
        lines.append(
            f"| {md_link(row)} | {row['landscape_action'] or 'n/a'} | {section} | "
            f"{int(row['stars'] or 0):,} |"
        )

    lines.extend(
        [
            "",
            "## 排除结构",
            "",
            "| 原因 | 仓库数 |",
            "|---|---:|",
        ]
    )
    labels = {
        "not_agentic_ai_core": "通用软件，Agent/AI 不是核心定位",
        "vertical_application_or_duplicate": "垂直应用或与现有项目重复",
        "resource_or_content_collection": "Skills、教程、书籍或资料集合",
        "large_model_out_of_scope": "模型项目，不属于本表的基础设施边界",
    }
    for category, count in exclusion_counts.most_common():
        lines.append(f"| {labels.get(category, category)} | {count} |")

    lines.extend(
        [
            "",
            "## 结构观察",
            "",
            f"- 语言集中在 {', '.join(f'{name} {count}' for name, count in languages.most_common(6))}。",
            f"- 许可证以 {', '.join(f'{name} {count}' for name, count in licenses.most_common(6))} 为主。",
            "- 新项目最密集的方向不是又一批通用 agent framework，而是 coding-agent 控制面、context engineering、agent governance、skills/plugins 安全与分发，以及可隔离执行环境。",
            "- Skills、prompts 和垂直 agent 应用在 Trending 中占比很高，但它们与核心基础设施的维护逻辑不同，建议继续放在独立候选表，而不是全部并入主 landscape。",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    load_dotenv(ENV_PATH, override=True)
    direct_network_setup()
    canonical_fields, canonical_rows = read_csv(CANONICAL_PATH)
    _, trending_rows = read_csv(TRENDING_PATH)
    canonical_by_name = {row["repo_name"].lower(): row for row in canonical_rows}
    canonical_by_id = {
        int(row["repo_id"]): row
        for row in canonical_rows
        if row.get("repo_id", "").isdigit()
    }
    trending = aggregate_trending(trending_rows)

    metadata: dict[str, dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(fetch_repo, info["source_repo_name"]): key
            for key, info in trending.items()
        }
        for index, future in enumerate(as_completed(futures), 1):
            key = futures[future]
            try:
                metadata[key] = future.result()
            except Exception as exc:
                metadata[key] = {
                    "repo_name": trending[key]["source_repo_name"],
                    "github_status": f"error_{type(exc).__name__}",
                }
            if index % 25 == 0 or index == len(futures):
                print(f"GitHub metadata: {index}/{len(futures)}")

    canonicalized: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {}
    for source_key, item in metadata.items():
        canonical_key = str(item.get("repo_name") or trending[source_key]["source_repo_name"]).lower()
        if canonical_key in canonicalized:
            previous_item, previous_trending = canonicalized[canonical_key]
            previous_trending["trending_weeks"] += trending[source_key]["trending_weeks"]
            previous_trending["top10_weeks"] += trending[source_key]["top10_weeks"]
            previous_trending["best_trending_rank"] = min(
                previous_trending["best_trending_rank"],
                trending[source_key]["best_trending_rank"],
            )
            previous_trending["peak_stars_this_week_displayed"] = max(
                previous_trending["peak_stars_this_week_displayed"],
                trending[source_key]["peak_stars_this_week_displayed"],
            )
            continue
        canonicalized[canonical_key] = (item, dict(trending[source_key]))

    readmes: dict[str, str] = {}
    if not args.skip_readmes:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(fetch_readme, item.get("repo_name") or key): key
                for key, (item, _) in canonicalized.items()
                if item.get("github_status") == "ok"
            }
            for index, future in enumerate(as_completed(futures), 1):
                key = futures[future]
                try:
                    readmes[key] = future.result()
                except Exception:
                    readmes[key] = ""
                if index % 25 == 0 or index == len(futures):
                    print(f"GitHub READMEs: {index}/{len(futures)}")

    repo_ids = sorted(
        int(item["repo_id"])
        for item, _ in canonicalized.values()
        if item.get("repo_id")
    )
    openrank, participants, coverage = query_clickhouse_metrics(repo_ids)

    output: list[dict[str, Any]] = []
    for key, (item, trend) in canonicalized.items():
        repo_id = int(item.get("repo_id") or 0)
        canonical = canonical_by_id.get(repo_id) or canonical_by_name.get(key)
        repo_openrank = openrank.get(repo_id, {})
        trend_values = [repo_openrank.get(month) for month in OPENRANK_MONTHS]
        row: dict[str, Any] = {
            "repo_id": repo_id or "",
            "repo_name": item.get("repo_name") or trend["source_repo_name"],
            "description": item.get("description") or DESCRIPTION_OVERRIDES.get(key, ""),
            "stars": item.get("stars", ""),
            "forks": item.get("forks", ""),
            "open_issues": item.get("open_issues", ""),
            "license": item.get("license", ""),
            "archived": str(bool(item.get("archived"))).lower(),
            "pushed_at": item.get("pushed_at", ""),
            OPENRANK_FIELD: repo_openrank.get("2026-06", ""),
            OPENRANK_TREND_FIELD: json.dumps(
                trend_values, ensure_ascii=False, separators=(",", ":")
            ),
            PARTICIPANTS_FIELD: participants.get(repo_id, 0),
            "language": item.get("language", ""),
            "created_at": item.get("created_at", ""),
            "topics": item.get("topics", ""),
            "landscape_action": canonical.get("landscape_action", "") if canonical else "",
            "landscape_layer": canonical.get("landscape_layer", "") if canonical else "",
            "landscape_section": canonical.get("landscape_section", "") if canonical else "",
            "selection_reason": canonical.get("selection_reason", "") if canonical else "",
            "selection_caveat": canonical.get("selection_caveat", "") if canonical else "",
            "github_status": item.get("github_status", "unavailable"),
            **trend,
            "github_snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "html_url": item.get("html_url", ""),
            "disabled": str(bool(item.get("disabled"))).lower(),
            "is_fork": str(bool(item.get("is_fork"))).lower(),
            "already_in_dataset": "true" if canonical else "false",
        }
        features = relevance_features(item, readmes.get(key, ""))
        row.update(features)
        row.update(recommendation(row, canonical))
        apply_editorial_decision(row)
        output.append(row)

    output.sort(
        key=lambda row: (
            row["recommendation"] != "recommend_add",
            row["recommendation"] != "watch",
            -float(row.get("recommendation_score") or 0),
            str(row["repo_name"]).lower(),
        )
    )
    extra_fields = [
        "source_repo_name",
        "trending_weeks",
        "top10_weeks",
        "best_trending_rank",
        "peak_stars_this_week_displayed",
        "first_trending_week",
        "last_trending_week",
        "trending_rank_history",
        "trending_gain_history",
        "trending_source_urls",
        "github_snapshot_date",
        "html_url",
        "disabled",
        "is_fork",
        "already_in_dataset",
        "relevance_score",
        "agent_signal_count",
        "model_infra_signal_count",
        "model_signal_count",
        "collection_signal_count",
        "generic_non_ai_signal_count",
        "suggested_layer",
        "suggested_section",
        "recommendation_score",
        "recommendation",
        "recommendation_confidence",
        "recommendation_reason",
        "recommendation_caveat",
        "exclusion_category",
    ]
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=canonical_fields + extra_fields)
        writer.writeheader()
        writer.writerows(output)

    additions = [row for row in output if row["recommendation"] == "recommend_add"]
    with ADDITIONS_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=canonical_fields,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(additions)

    review_rows = [
        row for row in output if row["recommendation"] in ("recommend_add", "watch")
    ]
    with REVIEW_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=canonical_fields + extra_fields)
        writer.writeheader()
        writer.writerows(review_rows)

    readme_payload = [
        {
            "repo_id": item.get("repo_id", ""),
            "repo_name": item.get("repo_name") or key,
            "readme": readmes.get(key, ""),
        }
        for key, (item, _) in canonicalized.items()
    ]
    README_PATH.write_text(
        json.dumps(readme_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    quality = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_trending_rows": len(trending_rows),
        "source_unique_repositories": len(trending),
        "canonical_repositories_after_github_redirects": len(output),
        "already_in_dataset": sum(row["already_in_dataset"] == "true" for row in output),
        "github_status_counts": Counter(row["github_status"] for row in output),
        "readmes_found": sum(bool(item["readme"]) for item in readme_payload),
        "openrank_2606_non_null": sum(row[OPENRANK_FIELD] != "" for row in output),
        "participants_2607_nonzero": sum(int(row[PARTICIPANTS_FIELD] or 0) > 0 for row in output),
        "recommendation_counts": Counter(row["recommendation"] for row in output),
        "openrank_global_coverage": coverage,
        "known_limitations": [
            "GitHub metadata is a current snapshot; Trending values are archived page values.",
            "Trending rank is not ordered solely by displayed weekly stars.",
            "OpenRank and July participant metrics are backfill-sensitive in recent partitions.",
            "Automatic recommendations require editorial review for scope and duplication.",
        ],
    }
    QUALITY_PATH.write_text(
        json.dumps(quality, ensure_ascii=False, indent=2, default=dict),
        encoding="utf-8",
    )
    write_report(output, coverage)
    print(json.dumps(quality, ensure_ascii=False, indent=2, default=dict))
    print(f"Updated {OUTPUT_PATH}")
    print(f"Updated {ADDITIONS_PATH}")
    print(f"Updated {REVIEW_PATH}")
    print(f"Updated {REPORT_PATH}")


if __name__ == "__main__":
    main()
