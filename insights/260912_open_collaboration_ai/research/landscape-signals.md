# Landscape 趋势信号：证据与图表映射

状态：01 Landscape 章节已验证的证据登记
快照日期：2026-08-27
读者：产品相关方与开源基础设施实践者
发布目标：`../report/online-report.md`

## 本章要回答什么

问题：除了相较 5 月跟踪池的变化，当前 Agentic AI 全景图还能说明哪些技术方向？

结论主线：

- 面向 Agent 的产品与模型基础设施，仍然是两套不同的工程栈。
- Agent Runtime 项目正在围绕“从上下文到外部实际影响”的执行路径聚集。
- OpenRouter 和模型 Hub 的证据只提供有限的外部交叉检查；GitHub 仍是观察项目建设与协作的主要证据层。

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

## 外部证据

### OpenRouter 应用与 Agent 排名

来源：<https://openrouter.ai/apps/>
核对日期：2026-08-27

- DeepSeek Harness 在公开全球应用排名中位列第 5。
- 它还进入页面的周增长最快列表，增长超过 999%。
- 覆盖范围仅限主动加入 OpenRouter 归因的公开应用。
- Token 数量表示平台流量，不是独立用户数或部署数。

API 定义：<https://openrouter.ai/docs/api/api-reference/datasets/get-app-rankings>

### OpenRouter、ZenMux 与 Hugging Face 模型样本

来源：

- `insights/presentations/260807-CoC-KN/large-models-refresh/data/monthly_models_top50_open_closed.csv`
- `insights/presentations/260807-CoC-KN/large-models-refresh/data/monthly_source_summary.json`
- Hugging Face Hub API: <https://huggingface.co/docs/hub/en/api>

观察窗口：2026 年 6 月 1—30 日

- 综合使用排名前 10 的模型中，有 5 个能在 Hugging Face 上解析到官方公开权重仓库。
- 前 50 名中有 24 个满足同一条件。
- OpenRouter 与 ZenMux 的原始 Token 数先转换为平台内部百分位，再进行组合。
- Hugging Face 下载量未纳入跨模型使用综合指标。
- Open-weight 是访问条件分类，不是 OSI 许可证认定。

## 图表映射

| 报告段落 | 问题 | 图表形式 | 字段 | 支持的结论 | 配色 |
| --- | --- | --- | --- | --- | --- |
| Landscape 总览 | 解读前，样本究竟包含什么？ | 可切换的完整 Agent Infra 与 Model Infra 图 | 入选仓库、层级、section、7 月 OpenRank | 两张图是后续发现的证据底座 | 现有全景图配色 |
| 工程栈 | 各层主要由哪些语言主导？ | 两张 100% 堆叠条形图 | 层级、主要语言、仓库数 | Agent 产品偏 TypeScript；Model Infra 以 Python 为主 | 粉、蓝、紫、墨色、中性色 |
| Runtime 路径 | Agent Runtime 正在哪里成形？ | 有序五步带状图 | Runtime section、项目数、示例 | Runtime 密度沿上下文、接口、行动、隔离与证据路径分布 | 粉至蓝的有序描边 |
| GitHub 之外 | 外部平台是否推翻 GitHub 图景？ | 两张证据卡片 | 排名、周增长、权重访问 | 使用数据同样指向 Coding Agent 与开放权重模型 | 紫色强调、中性容器 |

## 本轮未纳入的分析

- 开发者地域、雇主与角色：143 个入选项目尚无冻结并去重的贡献者画像样本。
- PyPI 与 npm 下载量：仓库到 package 的映射和 monorepo package 边界尚未冻结。
- ModelScope：适合补充中国生态覆盖，但本次发布尚未保存可复现快照。
- 全景图全部项目的 Issue / PR 协作模式：留待第 02 章的匹配仓库研究。
- Stars 与累计贡献者：已计算并保留在上文，但因为不足以支持有力度的技术趋势判断，没有进入正式发布章节。

这些内容应保留为后续研究任务，不能用推断值或临时手工抽样数字代替。
