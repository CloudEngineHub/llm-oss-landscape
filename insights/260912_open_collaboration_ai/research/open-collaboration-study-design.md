# Agent 参与之后，开源协作发生了什么？

## 研究设计

版本：2026-09-01 · 主统计窗口更新到完整八个月，线程样本补到 5,000 条

数据状态：`rapidsai/cudf` 改名为 `NVIDIA/cudf` 造成的 GitHub Search 假零值已经修复。主样本保留原 2,000 条，再补 3,000 条，最终为 100 个仓库各 50 条。主报告直接呈现 5,000 条样本中的实际计数和比例，不再按仓库流量加权。实验过程的白话说明见 [这次实验到底是怎么做的](how-the-study-was-run.md)。

研究对象：头部 Agentic AI 开源仓库、长期活跃的软件仓库对照组

公开输出：260910 在线研究报告、五分钟 Open Infrastructure keynote、十分钟 InclusionConf 分享

## 这项研究要判断什么

Agent 已经进入写代码、处理 Issue、提交 PR 和执行测试的流程。代码产出增加，并不自动等于协作效率提高。维护者可能收到更多改动，也可能需要花更多时间判断这些改动是否正确、是否值得合并，以及出了问题以后由谁负责。

研究围绕四个问题展开：

1. 头部 Agentic AI 仓库采用开发 Agent 的比例有多高，Agent 主要承担什么任务？
2. Agent 如何进入 Issue、PR、review 和代码迭代，哪些环节仍然依赖人类开发者？
3. Agent 参与以后，处理速度、合并结果和 backlog 是否改善，维护者承担的判断工作是否增加？
4. 当代码生成越来越便宜时，仓库真正稀缺的贡献是什么？

第四个问题不能靠价值判断回答。它需要从真实仓库中观察：哪些工作最容易自动化，哪些 PR 最终能进入项目，维护者把时间花在什么地方，哪些机器产生的改动没有获得任何人类响应。

## 主样本

### 抽样框

主样本来自 `data/agentic-ai-projects.csv`。当前文件包含 277 个持续跟踪的 Agentic AI 生态仓库，其中 225 个拥有 2026 年 7 月 OpenRank。仓库按照 `openrank_2607` 降序排列，固定前 100 个作为主样本；并列时按仓库全名排序。

这个规则不设置年代、语言或生态位配额。人为配额会让样本失去“头部 100”的含义。年代、语言和生态位被保留为预先登记的分层变量，在分析中控制和交叉比较。

冻结表：`collaboration-sample-top100-2607.csv`

入样门槛：OpenRank 20.65

仓库状态：100 个仓库在项目池快照中均未归档，GitHub 状态均为 `ok`

### 样本分布

| 维度 | 分布 |
| --- | --- |
| 创建年代代理 | 2022-12-01 及以后 72；更早 28 |
| 主要语言 | Python 44；TypeScript 26；Go 11；Rust 7；C++ 7；Java 3；Scala 1；MLIR 1 |
| 技术生态位 | Agent Application 28；Agent Framework 21；Agent Runtime Infra 15；Model Infra 36 |
| 与 Agent 的距离 | 直接面向 Agent 使用者 28；Agent 构建层 21；支撑型基础设施 51 |

`created_at >= 2022-12-01` 只生成一个基于 ChatGPT 公开发布时点的候选分组。它不能证明仓库是 LLM-native：较早创建的仓库可能在之后完成 LLM 重构，较新的仓库也可能是成熟项目拆分出来的组件。

样本表的 `llm_native_manual` 已完成逐仓库复核。允许值为 `llm_native`、`traditional`、`mixed`、`uncertain`；本轮结果为 68、18、14、0。每个判断附置信度和一句理由，保存在 `collaboration-sample-llm-native-review-260829.csv`。后续分层以这份复核结果为准，创建时间代理只用于检查项目身份与发布时间是否一致。

### 技术生态位

生态位用于检验一个预先提出的假设：直接面向 Agent 使用者的产品，可能比运行时和模型基础设施更快改变协作入口、机器可读规则和贡献方式。

| 研究分层 | 包含内容 |
| --- | --- |
| Agent Application | coding agent、coding harness、个人 Agent、对话工作台 |
| Agent Framework | code-first framework、多 Agent 编排、workflow builder |
| Agent Runtime Infra | context、协议、工具执行、sandbox、observability |
| Model Infra | 数据、训练、推理、部署、调度和模型网关 |

88 个主样本仓库直接继承 landscape 分类。12 个未进入当前地图的仓库使用研究专用映射，映射依据和人工复核说明保存在样本表中。研究不再另设 Landscape sensitivity sample：编辑入图状态不是新的分析总体，会混淆实验。

### 样本代表什么

OpenRank 会选择协作活跃、受到社区关注的仓库，因此这项研究描述的是头部 Agentic AI 开源项目，不代表所有 AI 仓库。Stars、OpenRank 和 participant 数用于描述样本，不能代替协作结果。

## 研究问题与可观察指标

### RQ1 · 仓库在哪里采用 Agent

仓库树中的机器可读文件用于识别开发 Agent 的公开采用信号。证据分三层：

| 证据层 | 例子 | 是否计入主采用率 |
| --- | --- | --- |
| Active instruction | `AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、`.cursor/rules/` | 是 |
| Active workflow/config | `.codex/`、`.claude/`、`.gemini/`、MCP 或 agent workflow 配置 | 单独报告 |
| Residual mention | `.gitignore` 中出现 Cursor、Codex、Claude 等名称，但对应配置已不存在 | 否 |

五月分析把 `.gitignore` 痕迹也用于识别工具，得到 92% 的“至少一种 Coding Agent”覆盖率。新分析会保留旧口径以便复算，同时增加严格口径。这样才能判断 Cursor 等工具的变化究竟来自真实采用，还是来自残留的 ignore 规则。

Agent 承担的任务从文件路径和明确指令中做多标签编码，包括代码修改、测试、文档、review、Issue 处理、发布和依赖维护。模型辅助分类必须经过人工抽样复核，不能仅凭文件名推断任务。

主要输出：

- 严格口径与宽口径的 Agent 采用率；
- 每个 Agent 工具的仓库覆盖率；
- 每个仓库的 Agent 配置数量及任务分布；
- 2026 年 5 月与 8 月的重复横截面对比；
- 同一仓库在两个时间点的新增、保留和删除配置。

当前结果：92/100 个仓库存在 coding-agent 指令文件或工具目录，其中 86 个能读到具体 instruction file。5,000 条线程样本在 95/100 个仓库中观察到可验证 Agent 身份或 App 代理行为，共 2,158 条、占样本 43.16%。仓库准备度与公开可见参与仍然不能互换。

### RQ2 · 仓库是否仍然接受外部协作

Issue、PR 和 Discussion 需要分开判断。GitHub GraphQL API 的 `hasPullRequestsEnabled` 可以判断 PR 功能是否开启，`pullRequestCreationPolicy` 可以直接判断是任何人都能创建，还是仅限 collaborators。这两个仓库设置不能回答维护者是否接受或合并外部贡献，因此政策与结果仍需单独测量。

每个仓库记录四层事实：

1. GitHub 是否启用 Issue、PR 和 Discussion；
2. `pullRequestCreationPolicy` 允许任何人还是仅 collaborators 创建 PR；
3. `CONTRIBUTING`、README 或模板是否限制外部 PR；
4. 2026 年是否实际出现外部作者提交的 PR；
5. 外部 PR 是否被响应、合并，贡献者是否再次提交。

DeepSeek Harness 是入口案例，不代表总体。它用于说明公开代码、开放核心 PR 和发展插件生态是三个独立选择。

主要输出：

- Issue、PR、Discussion 的可用状态；
- 明示不接受或限制外部 PR 的仓库比例；
- 外部 PR 的首次响应率、合并率和重复贡献率；
- 关闭传统协作入口后，README 指向的插件、扩展或外部社区入口。

当前结果：Top 100 全部启用 Issue 和 PR 功能；98 个仓库的 PR 创建策略为 `ALL`，2 个为 `COLLABORATORS_ONLY`，分别是 `openai/codex` 与 `anthropics/claude-code`。人工复核政策后，48 个明确邀请贡献，12 个要求先开 Issue、获得预批准或只在限定范围内贡献，38 个未检测到限制信号。概率样本在 99/100 个仓库中观察到外部作者 PR；这一历史行为只用于分析实际协作，不再替代当前创建权限。DeepSeek Harness 作为分母外的治理反例保留。

### RQ3 · Issue 和 PR 是变快了，还是堆积得更多

2026 年以来创建的 Issue 和 PR 按仓库、年代、语言和生态位统计。开放项目存在右删失，不能只对已经关闭的项目计算平均处理时间。

Issue 指标：

- opened、closed 和月末 backlog；
- backlog 的年龄分布；
- 首次人类响应时间；
- resolve / close 时间的 Kaplan-Meier 中位数；
- 无人类响应、只有 bot 活动、reopen 的比例。

PR 指标：

- opened、merged、closed-unmerged 和月末 backlog；
- 首次人类响应、首次 review、merge / close 时间；
- review 数、change request、review 后新增 commit 和修改轮次；
- 外部首次贡献者的合并率；
- 合并后 30 天内 revert 或明确 follow-up fix 的近似信号。

“关闭更快”不能单独解释为效率提升。它必须和 merged / rejected 结果、无人响应比例及 backlog 变化一起展示。

当前结果：3,567 个样本 PR 中，70.7% 有 visible review；其中 55.0% 在首次 review 后增加 commit，161 个收到 `CHANGES_REQUESTED` 的 PR 中有 123 个后来又提交，占 76.4%。Top 100 固定成熟度 PR unresolved 中位数为 9.1%，12 个长期对照为 8.2%；9/12 个对照也比 2022 年恶化。结果支持“存在迭代和更广泛 review pressure”，不支持把变化单独归因给 Agent。

### RQ4 · 人和 Bot 如何共同参与线程

Issue、PR、comment、review 和 merge actor 按公开证据分层：

| 身份 | 判断规则 |
| --- | --- |
| Confirmed AI agent | GitHub 账号、PR、commit trailer、标签或项目文档明确说明由 Agent 生成或提交 |
| Automation / bot | GitHub `Bot` 类型、GitHub App、已知自动化账号或 workflow 证据 |
| Human account | 普通 GitHub 用户账号，且没有公开的 Agent 归因证据 |
| Unknown | 账号或归因证据不足 |

`Human account` 不表示代码完全由人手写。普通账号使用 Copilot、Cursor 或本地模型生成代码通常无法从公开 GitHub 数据可靠识别。研究只报告 confirmed / disclosed AI assistance，不根据代码风格、提交速度或文本语气猜测。

线程参与结构至少分为：

- automation-only：所有可见 actor 均为 Bot / Agent，没有人类账号评论、review 或执行合并；
- human-present：至少一名人类账号参与；
- maintainer-present：至少一名 `OWNER`、`MEMBER` 或 `COLLABORATOR` 参与；
- unresolved-identity：存在无法分类账号。

对话不能只用 comment 数量表示。Issue 记录独立 actor、身份切换次数和维护者响应轮次；PR 另外记录 review 后的代码更新和 change-request cycle。

当前结果：Agent participation 打开了 87/5,000 条线程，占 1.74%；在 38.28% 的样本线程中响应、在 37.62% 的样本 PR 中参与 review。在 4,098 个已解决且能看到最终 actor 的线程中，GitHub User account 执行 88.48% 的 visible gate，maintainer-associated account 执行 52.37%，verified Agent participation 执行 1.93%。类别在 App-mediated User action 时可重叠。

### RQ5 · Agent 是否降低协作成本

跨仓库相关性无法回答因果问题。研究使用三种比较：

1. **同仓库时间比较**：在可确认的 Agent adoption 时间点前后，比较相同长度窗口；
2. **同仓库 PR 比较**：在同一仓库和相近月份内，匹配规模、文件类型相近的 confirmed Agent PR 与普通账号 PR；
3. **长期活跃仓库对照**：从传统开发工具、云原生基础设施和开源应用中匹配语言、PR intake、贡献者规模和仓库年龄相近的仓库。

如果 adoption 前趋势不平行，或者 Agent PR 数量太少，报告只写关联，不使用“提升”“导致”等因果措辞。

第一轮判定：因果门槛未通过。Agent-visible threads 的 comments、reviews 和 GitHub merged flag 更高，但 Agent 使用是主动选择且可能发生在更重要或更困难的线程中；balanced adoption window 只有 11 个仓库，且 PR intake 在采用后更高，存在反向因果。所有效率结果降级为 descriptive association。

效率与负担分别观察：

| 结果 | 改善信号 | 负担信号 |
| --- | --- | --- |
| Intake | 有效外部贡献增加 | 低响应 Issue / PR 增加 |
| Review | 首次有效 review 更快 | 每个 merged PR 的人类 review 和修改轮次增加 |
| Throughput | merged PR / active maintainer 上升 | backlog 增长或 closed-unmerged 上升 |
| Quality aftermath | follow-up fix / revert 不增加 | 合并后补救工作增加 |
| Contributor entry | 首次贡献者被合并并再次贡献 | 一次性提交增加、重复贡献下降 |

## 传统软件与历史对照

对照不是一张随意挑选的知名项目名单。候选项目可以包括 Kubernetes、VS Code、Vue、Kata Containers、Prometheus、Envoy 和 Grafana，但最终需要按语言、PR intake、活跃贡献者和仓库年龄匹配。

PyTorch 已经属于主样本的 Model Infra 层，不能同时作为独立对照组使用。它可以承担两个角色：

- 在主样本中代表 2022-12-01 前创建的成熟模型基础设施；
- 在自身 2022-2026 时间序列中观察协作变化。

长期项目按自然年比较 2022、2023、2024、2025 和 2026 年。自然年变化同时受到 GitHub 产品变化、项目生命周期和宏观贡献趋势影响，因此还要查看各项目首次确认采用 Agent 的时间点。完整的年度迁移定义、状态向量和转移分析见 `collaboration-mode-migration-design-2022-2026.md`。

## 观察窗口

整个研究的 2026 年观察窗口冻结于 2026-08-31。9 月发生的数据采集、校验和发布不改变任何统计截止时间。

- 仓库设置与 Agent marker：2026-05-31 快照口径复算，对比 2026-08-31 的默认分支；
- Issue / PR 主窗口：2026-01-01 至 2026-08-31；
- backlog：主指标追踪窗口内新建但截至 8 月 31 日仍未解决的 cohort；更早存量不混入该比例；
- 长期对照：2022-01-01 至 2026-08-31，2026 年按 year-to-date 单独标记；
- adoption event study：采用日前后各 90 天或 180 天，按数据量预先固定。

发布前长期私有、一次性导入 commit 或从其他仓库拆分的项目，需要以第一个公开 release、Issue 或 PR 活动重新确定协作起点，并保留判断依据。

## 统计原则

1. 保存样本纳入表、人工映射和排除理由；
2. 所有比例同时给出分母，所有时间指标报告 median、IQR 和删失比例；
3. 仓库是主要分析单位，不能让 PyTorch 等大仓库用事件总量淹没小仓库；
4. 主样本每条线程只计一次；如需展示仓库之间的离散程度，另外给出仓库级分布，不再把流量权重混入主结论；
5. 分层分析预先固定创建年代、语言、技术生态位和 Agent proximity；
6. 样本量不足的层合并或只做描述，不追求显著性；
7. 对超大项目、新发布项目、关闭 Issue/PR 的项目和边缘 Agentic 项目做敏感性分析；
8. 用案例解释异常分布，不用案例代替总体结果。

## 能回答与不能回答的部分

这项研究可以回答公开 GitHub 协作表面发生了什么：入口是否开放、Agent 信号是否出现、Issue/PR 如何流转、人类是否参与、backlog 和处理时间怎样变化。

公开数据无法稳定识别普通开发者是否在本地使用 AI，也看不到企业内部 review、私有 issue tracker 和线下决策。Agent adoption 与协作结果之间还可能同时受到团队规模、融资、发布期和项目成熟度影响。报告需要把这些限制放在结果旁边，而不是藏在附录里。
