# Agent 进入开源协作：第一轮实证结果

日期：2026-08-29

状态：Top 100 全量入口与 marker 扫描完成；Issue / PR 处理效率仍在采样阶段

## 这轮研究覆盖了什么

主样本是 `data/agentic-ai-projects.csv` 中按 2026 年 7 月 OpenRank 排序的前 100 个仓库。OpenRank 只用于冻结头部样本，不作为后续结论的解释变量。

这一轮完成了四组数据：

- 100 个仓库的 LLM-native 人工判断，附置信度和逐仓库理由；
- 2022 年末至 2026 年 8 月的机器可读 Agent instruction / config 快照；
- 100 个仓库当前的 Issue、Pulls、Discussions 与贡献文档入口；
- ClickHouse `opensource.events` 的 500 行 repository-year 聚合，用来建立五年活动骨架并检查数据是否足以回答效率问题。

DeepSeek Harness 没有进入 OpenRank Top 100。它作为分母外案例保留，用来观察关闭核心 Issue / PR、同时把外部参与引向插件生态的做法。

## 创建日期无法替代项目身份判断

逐仓库判断的结果是：68 个 `llm_native`、18 个 `traditional`、14 个 `mixed`。

如果直接用 2022-12-01 切分，会漏掉三类重要情况：

- Megatron-LM、LangChain 和 TRL 创建得更早，但核心工作从一开始就围绕语言模型；
- ComfyUI 和 Apache Gravitino 创建在切分点之后，但核心并不依赖 LLM；
- 14 个 mixed 项目保留了完整的传统软件价值，同时把 Agent 变成新的产品表面，例如 n8n、Warp、OpenMetadata、DataHub 和 MLflow。

把 14 个 mixed 项目和 5 个直接违背日期代理的项目放在一起，19/100 个样本无法被一个二元日期切分准确表达。创建时间适合描述生态年龄，不适合单独决定项目身份。

## 传统的公开协作入口仍然是头部项目的默认选择

在 2026-08-29 的 Top 100 快照中：

| 公开入口或规则 | 仓库数 |
| --- | ---: |
| Issues enabled | 100 / 100 |
| Pull Requests 功能启用 | 100 / 100 |
| 任何人都可创建 PR（`ALL`） | 98 / 100 |
| 仅 collaborators 可创建 PR | 2 / 100 |
| Discussions enabled | 74 / 100 |
| 常见路径存在 CONTRIBUTING | 89 / 100 |
| 存在 Issue template | 95 / 100 |
| 存在 PR template | 84 / 100 |

GitHub 的直接设置已经能区分“PR 功能开启”和“谁有权创建 PR”：`openai/codex` 与 `anthropics/claude-code` 虽然启用了 PR，但创建策略是 `COLLABORATORS_ONLY`。维护者是否接受、响应和合并外部 PR，仍要通过文档政策和实际处理结果继续测量。

DeepSeek Harness 在这组分布之外：Issues 关闭，Pulls endpoint 连续返回 404，Discussions 开启；CONTRIBUTING 明确暂不接受外部 PR，并把贡献引向第三方插件。这不是“没有开放生态”，而是核心仓库与外部生态采用了不同入口。

## 仓库正在快速增加机器可读的协作规则

全量 marker 扫描只统计公开默认分支上的 active instruction 和 active config。`.gitignore` 中的残留名称不进入采用率。

| 快照 | 可观察仓库 | Active instruction | Instruction 或 active config |
| --- | ---: | ---: | ---: |
| 2022-12-31 | 28 | 0 | 0 |
| 2023-12-31 | 51 | 0 | 0 |
| 2024-12-31 | 62 | 0 | 0 |
| 2025-12-31 | 86 | 42（48.8%） | 48（55.8%） |
| 2026-08-29 | 100 | 86（86.0%） | 92（92.0%） |

为了排除新仓库进入样本造成的变化，我们只比较 2025、2026 两期都可观察的 86 个仓库：

- 42 个仓库保留 strict instruction；
- 32 个仓库在 2026 年新增 strict instruction；
- 12 个两期都没有；
- 没有仓库在目标路径中移除 strict instruction。

同仓库的 strict instruction 覆盖率因此从 42/86 上升到 74/86。这个变化发生在公开仓库规则层，不能直接解释为 Agent 已经参与了每个 Issue 或 PR。

## Agent instruction 已经扩散到模型和传统基础设施

2026 年 strict instruction 覆盖率：

| 技术生态位 | 覆盖率 |
| --- | ---: |
| Agent Framework | 20 / 21（95.2%） |
| Agent Runtime Infra | 14 / 15（93.3%） |
| Agent Application | 24 / 28（85.7%） |
| Model Infra | 28 / 36（77.8%） |

按项目身份看，LLM-native 是 59/68，mixed 是 14/14，traditional 是 13/18。传统基础设施并没有停留在 Agent 生态的下游：PyTorch、Spark、Iceberg、ONNX Runtime、Milvus、Triton、OpenVINO 等仓库都在 2026 快照中出现机器可读 instruction。

当前出现最多的工具信号是 cross-agent instruction（80 个仓库）和 Claude Code（71 个）；之后是 Codex（22）、GitHub Copilot（20）、Cursor（17）和 Gemini（12）。同一仓库可以同时出现多种工具。

这组数据不支持“Cursor 采用率大幅下降”。全量年末快照中 Cursor active marker 从 2025 年的 13 个仓库增加到 2026 年的 17 个；10 仓库的五月—八月递归 pilot 也只观察到一个新增 Cursor config。旧分析把 `.gitignore` 残留也计入采用率，才会把宽口径推到接近饱和。

## 机器可读规则覆盖的任务不只写代码

对 2026 instruction 文本做保守关键词编码，在 86 个存在 strict instruction 的仓库中：

- 81 个提到 implementation；
- 81 个提到 tests / validation；
- 80 个描述 repository context；
- 79 个涉及 Issue 或 planning；
- 79 个涉及 documentation；
- 72 个涉及 code review；
- 63 个涉及 release 或 dependency；
- 39 个涉及 security / compliance。

这些字段只说明仓库规则覆盖了哪些任务，不说明 Agent 实际完成了多少工作，也不说明任务质量。

## 现在还不能回答“效率是否提高”

ClickHouse 聚合成功生成 500 行 repository-year 面板：331 个仓库—年份可观察，167 个属于项目尚未公开的结构性缺失，2 个年份没有事件记录。

但当前 PR payload 的完整性发生了明显变化：

| 年份 | PR author 缺失率 | merged PR 可计算处理时长 |
| --- | ---: | ---: |
| 2022 | 0.0% | 99.4% |
| 2023 | 0.0% | 99.4% |
| 2024 | 0.0% | 99.7% |
| 2025 | 13.2% | 68.6% |
| 2026 YTD | 72.0% | 0.0% |

作者类型是枚举字段。缺失值如果不结合 author ID 检查，可能被误算成 `Bot`，从而制造一个虚假的“机器人参与已经超过人类”结论。2025、2026 的 PR 作者结构和 merge duration 不能直接使用 ClickHouse 事件表计算。

因此，当前可以发布入口状态、机器可读规则的增长和技术生态位差异；“Agent 是否提高了处理速度、合并率或维护者效率”仍需 GitHub API 的分层 thread 样本。下一轮会固定仓库、月份、Issue / PR、结果与 actor 类型的抽样权重，再计算首次人类响应、review cycle、merge / close 和 backlog。

## 数据文件

- `collaboration-sample-llm-native-review-260829.csv`：100 个项目的身份判断、置信度和理由；
- `collaboration-agent-markers-2022-2026-summary.csv`：500 个年度 marker 快照；
- `collaboration-agent-markers-2022-2026-evidence.csv`：694 条 marker 路径证据；
- `collaboration-surfaces-top100-260829.csv`：100 个仓库当前协作入口；
- `collaboration-repository-year-2022-2026.csv`：500 行 ClickHouse 年度活动骨架；
- `collaboration-five-year-summary-260829.csv`：供报告和图表使用的 44 行摘要；
- `collaboration-marker-transitions-2025-2026.csv`：86 个同仓库 marker 变化。
