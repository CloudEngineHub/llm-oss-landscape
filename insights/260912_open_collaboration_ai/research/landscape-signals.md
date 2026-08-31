# Landscape 趋势信号：证据与图表映射

状态：01 Landscape 章节已验证的证据登记
快照日期：2026-08-29
读者：产品相关方与开源基础设施实践者
发布目标：`../report/online-report.md`

## 本章要回答什么

问题：除了相较 5 月跟踪池的变化，当前 Agentic AI 全景图还能说明哪些技术方向？

结论主线：

- 面向 Agent 的产品与模型基础设施，仍然是两套不同的工程栈。
- Agent Runtime 项目正在围绕“从上下文到外部实际影响”的执行路径聚集。
- OpenRouter 提供有限的使用侧交叉检查；Agent Sandbox、Kata Containers 和 OpenTelemetry 的官方材料用来核对 Runtime 需求是否已经进入相邻的开源基础设施生态。

## GitHub 数据来源与定义

来源：`data/agentic-ai-projects.csv`
入选条件：`landscape_action` 为 `keep` 或 `add`
总体：143 个仓库，其中 Agent Infra 84 个、Model Infra 59 个

- Stars：canonical 快照中的仓库 Star 数，衡量的是注意力，不是采用率。
- 主要语言：GitHub 的仓库级语言标签，不是源代码行数分布。
- 贡献者：字段 `contributors`，来自 GitHub REST `List repository contributors` endpoint 的当前计数，不包含匿名贡献者。它以 commit 作者为基础，且 GitHub 会缓存结果，因此可能滞后于近期活动。
- 贡献者散点图：2026 年 8 月 27 日刷新时，143 个入选仓库的贡献者计数都不为零。
- 相关性：`log10(stars + 1)` 与 `log10(contributors + 1)` 的 Pearson 相关系数为 0.19。该数值保留作研究检查，不作为标题数据展示。
- 范围：GitHub 文档说明，其贡献者图基于默认分支。它不是“所有发起 Issue、review PR 或以其他方式参与社区的人”的总数。

## 已验证的章节数据账本

本节是第 01 章的数字审计链。正式报告负责呈现解读；本文保留核验所需的输入、分组规则和数值。

### 总体与比较基线

| 指标 | 数值 |
| --- | ---: |
| 2026 年 5 月跟踪池 | 227 个仓库 |
| 当前 canonical 清单 | 277 个仓库 |
| 当前全景图入选项目 | 143 个仓库 |
| Agent Infra | 84 个仓库 |
| Model Infra | 59 个仓库 |
| 当前入选但不在 5 月跟踪池 | 31 个仓库 |
| 其中 Agent Infra | 23 个仓库 |
| 其中 Model Infra | 8 个仓库 |

“不在 5 月跟踪池”是在把 GitHub owner/name 转为小写后进行的仓库集合比较。它不表示仓库创建于 5 月之后；5 月跟踪池也不等同于对当时已发布全景图的完整重建。

### 层级分布

Agent Infra 的 section 汇总为 Application、Framework 和 Runtime；Model Infra 则按 `Serving`、`Pre-Train`、`Data`、`Compute` 与 `Post-Train` 前缀汇总。

| Agent Infra 层级 | 项目数 | 项目占比 | 7 月 OpenRank | OpenRank 占比 | 不在 5 月池 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Application | 32 | 38% | 2,057.8 | 55% | 7 |
| Framework | 21 | 25% | 859.5 | 23% | 3 |
| Runtime | 31 | 37% | 832.5 | 22% | 13 |

| Model Infra 层级 | 项目数 | 项目占比 | 7 月 OpenRank | OpenRank 占比 | 不在 5 月池 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serving | 15 | 25% | 1,229.9 | 44% | 3 |
| Pre-Train | 18 | 31% | 868.8 | 31% | 1 |
| Data | 13 | 22% | 369.4 | 13% | 1 |
| Compute | 4 | 7% | 158.9 | 6% | 0 |
| Post-Train | 9 | 15% | 140.2 | 5% | 3 |

### 项目年龄与主要语言

- 84 个 Agent Infra 项目中，46 个创建于 2025 年或之后，占 55%。
- 59 个 Model Infra 项目中，10 个创建于 2025 年或之后，占 17%。
- Agent Infra 有 33 个仓库的主要语言是 TypeScript，27 个是 Python。
- Model Infra 有 33 个仓库的主要语言是 Python，4 个是 TypeScript。
- GitHub 主要语言是仓库级标签，不是源代码行数分布。

### 4—7 月 OpenRank 增量

增量定义为 `7 月 OpenRank - 4 月 OpenRank`，使用 `openrank_trend_2508_2607` 的第 11 和第 8 个位置。报告展示绝对正向增量最大的 6 个项目，不从极小基数计算百分比增长。

| 项目 | Section | 4 月 | 7 月 | 变化 |
| --- | --- | ---: | ---: | ---: |
| Lark CLI | Tools, web & computer use | 95.47 | 179.37 | +83.90 |
| OpenViking | Memory, knowledge & context | 135.01 | 177.61 | +42.60 |
| DeepSeek Reasonix | Agentic coding | 1.60 | 26.06 | +24.46 |
| FlashInfer | Pre-Train · Compiler & accelerator | 127.11 | 147.83 | +20.72 |
| Orca | Multi-agent orchestration | 13.86 | 29.10 | +15.24 |
| Deer Flow | Multi-agent orchestration | 203.53 | 218.20 | +14.67 |

### 未进入发布章节：Stars 与 GitHub 贡献者

散点图使用全部 143 个入选仓库。`log10(stars + 1)` 与 `log10(contributors + 1)` 的 Pearson 相关系数为 0.1851，四舍五入报告为 0.19。该计算保留在这里用于审计，但图表已于 8 月 27 日从正式发布的第 01 章移除：仅凭这一相关性，不足以支持有力度的技术趋势判断。

| 项目 | 层级 | 贡献者数 | Stars |
| --- | --- | ---: | ---: |
| Pydantic AI | Agent Infra | 475 | 18,861 |
| Codex | Agent Infra | 471 | 102,090 |
| Vercel AI SDK | Agent Infra | 470 | 25,859 |
| LangChain | Agent Infra | 467 | 142,799 |
| Mastra | Agent Infra | 465 | 26,649 |
| TRL | Model Infra | 464 | 18,952 |

### Runtime 路径分组

五步路径是对现有 Runtime section 的编辑性解读，不是成熟度模型，也不是规定性架构。

| Runtime 角色 | 来源 section | 项目数 | 示例 |
| --- | --- | ---: | --- |
| Context | Memory, knowledge & context | 9 | OpenViking, Milvus |
| Interface | Protocols & interoperability | 8 | A2UI, MCP Context Forge |
| Action | Tools, web & computer use | 6 | Lark CLI, CUA |
| Isolation | Development sandboxes | 4 | Coder, Agent Sandbox |
| Evidence | Observability & evaluation | 4 | Langfuse, Opik |

## GitHub 之外的平台流量证据

### OpenRouter 应用与 Agent 排名

来源：<https://openrouter.ai/apps/>
核对日期：2026-08-29

- 当前 Top 20 中有 9 个应用可以直接对齐到 Agent Infra：Hermes Agent、Claude Code、pi、Kilo Code、Cline、Codex、OpenClaw、DeepSeek Harness、OpenHands。
- 其中 7 个进入 Top 10。DeepSeek Harness 位列第 10，并进入周增长最快列表，增长超过 999%。
- 覆盖范围仅限主动加入 OpenRouter 归因的公开应用。
- Token 数量表示平台流量，不是独立用户数或部署数。

### ZenMux 平台模型用量

来源：

- 冻结数据：`../../presentations/260807-CoC-KN/large-models-refresh/data/raw/zenmux_monthly_usage_snapshot.json`
- [ZenMux Model Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-leaderboard.html)
- [ZenMux App Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html)

时间窗：2026-06-01 至 2026-06-30

- ZenMux 单平台 Top 5 依次为 Claude Opus 4.8、DeepSeek V4 Pro、GLM 5.2、DeepSeek V4 Flash、Claude Opus 4.7。
- Top 4 中有 3 个 endpoint 能对应到官方公开权重仓库：DeepSeek V4 Pro、GLM 5.2、DeepSeek V4 Flash。
- 这是 ZenMux 单平台冻结数据，不是上次 CoC 分享使用的 OpenRouter + ZenMux 复合分数。
- OpenRouter 与 ZenMux 的原始 Token 数不相加。不同平台规模不同，直接相加会制造一个没有清晰含义的“总量”。
- ZenMux 目前还提供 App Leaderboard，按 token 或成本列出调用 ZenMux 的应用、Agent、客户端和 gateway；接口是 T-1 日聚合，但需要 Management API Key。本轮没有拿文档示例值冒充实时平台数据。

## 开放基础设施项目证据

### Agent Sandbox 与 Kata Containers

来源：

- <https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md>
- <https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md>
- <https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/>
- <https://openinfra.org/projects/>

- Agent Sandbox 提供 Sandbox、SandboxTemplate、SandboxClaim 和 SandboxWarmPool，分别处理环境定义、申请和预热分配。
- 项目威胁模型明确写明 Sandbox Pod 经常运行不可信的 LLM 生成代码，并建议通过 RuntimeClass 使用 gVisor 或 Kata Containers。
- Kata Containers 是 OpenInfra Foundation 托管的项目，并已作为 Agent Sandbox 的 VM-backed isolation 选项接入。这里能证明项目能力和集成方向，不能给出生态采用率。

### OpenTelemetry GenAI semantic conventions

来源：<https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md>

- 当前文档已经定义 agent、workflow、plan 和 execute-tool spans。
- 整份 agent span 规范仍标记为 Development。
- 这说明成熟 telemetry 项目正在补 Agent 语义层；它还不是已经稳定完成的标准。

### CNCF / OpenInfra 项目矩阵

| 作用 | 项目 | 证据强度 | 一手材料能证明什么 |
| --- | --- | --- | --- |
| 运行与隔离 | Kubernetes Agent Sandbox | 直接 | 为短期 Agent 环境提供 Sandbox、Template、Claim、WarmPool，威胁模型明确覆盖不可信 LLM 生成代码 |
| 运行与隔离 | Kata Containers | 直接 / OpenInfra | 已作为 Agent Sandbox 的 VM-backed isolation 接入 |
| 运行与隔离 | Confidential Containers | 相邻基础设施 | 为 confidential AI 提供 TEE 与 attestation；不是 Agent 专用项目 |
| 协调与运维 | kagent | 直接 | 在 Kubernetes 中运行 Agent，并提供操作 Kubernetes、Prometheus、Istio、Argo 的工具 |
| 协调与运维 | Dapr Agents | 直接 | durable workflow、state、retry、SPIFFE identity 与 multi-agent coordination |
| 协调与运维 | OpenChoreo | 直接 | 同一平台同时面向人和 Agent，Agent 通过 MCP 使用平台能力 |
| 连接与治理 | kgateway | 直接 | Kubernetes control plane 覆盖 AI gateway，v2.1 接入 agentgateway |
| 连接与治理 | agentgateway | 直接 / LF | data plane 明确覆盖 LLM、MCP tool、AI agent 与 inference traffic |
| 连接与治理 | Istio | 适配中 | 把 service-mesh 与 gateway 能力延伸到 AI / inference traffic；不是 Agent 专用项目 |
| 追踪与解释 | OpenTelemetry | 直接 / 规范开发中 | 定义 agent、workflow、execute-tool spans |
| 追踪与解释 | Jaeger | 适配中 | 基于 OpenTelemetry 扩展 Agent 执行路径、MCP / ACP / AG-UI 与 GenAI 可视化 |

这张表不把 Prometheus、Argo 直接计为“Agent Infra 项目”。更准确的关系是：kagent 已经把它们作为 Agent 可操作的现有系统。这证明 Agent 正在成为云原生平台的消费者，但不能证明这些项目自身已经围绕 Agent 完成重构。

## 图表映射

| 报告段落 | 问题 | 图表形式 | 字段 | 支持的结论 | 配色 |
| --- | --- | --- | --- | --- | --- |
| Landscape 总览 | 解读前，样本究竟包含什么？ | 可切换的完整 Agent Infra 与 Model Infra 图 | 入选仓库、层级、section、7 月 OpenRank | 两张图是后续发现的证据底座 | 现有全景图配色 |
| 工程栈 | 各层主要由哪些语言主导？ | 两张 100% 堆叠条形图 | 层级、主要语言、仓库数 | Agent 产品偏 TypeScript；Model Infra 以 Python 为主 | 粉、蓝、紫、墨色、中性色 |
| Runtime 路径 | Agent Runtime 正在哪里成形？ | 有序五步带状图 | Runtime section、项目数、示例 | Runtime 密度沿上下文、接口、行动、隔离与证据路径分布 | 粉至蓝的有序描边 |
| 平台流量证据 | 全景图上的应用是否也出现在外部调用中？ | OpenRouter Top 20 × Agent Infra 对照表 + ZenMux 单平台模型榜 | App 排名、Token、Landscape section、ZenMux 模型端点 | Coding 与 personal agent 不只获得仓库关注，也在独立平台流量中出现 | 紫色强调、平台分栏 |
| 开放基础设施项目证据 | 现有开源基础设施具体在接什么工作？ | 四条职责泳道 | 项目、职责、证据强度、一手链接 | 适配发生在隔离、协调、连接治理与追踪四个位置 | 粉蓝分层、克制标签 |

## 本轮未纳入的分析

- 开发者地域、雇主与角色：143 个入选项目尚无冻结并去重的贡献者画像样本。
- PyPI 与 npm 下载量：仓库到 package 的映射和 monorepo package 边界尚未冻结。
- ModelScope：适合补充中国生态覆盖，但本次发布尚未保存可复现快照。
- 全景图全部项目的 Issue / PR 协作模式：留待第 02 章的匹配仓库研究。
- Stars 与累计贡献者：已计算并保留在上文，但因为不足以支持有力度的技术趋势判断，没有进入正式发布章节。

这些内容应保留为后续研究任务，不能用推断值或临时手工抽样数字代替。
