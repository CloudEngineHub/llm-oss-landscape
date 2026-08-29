# 2022-2026 开源协作模式迁移研究

版本：2026-08-29 working design

执行状态：Top 100 身份复核、2022—2026 marker 快照、当前协作入口与 ClickHouse repository-year 骨架已完成。Issue / PR thread 的处理时长、人类响应和 review cycle 等待 GitHub API 分层样本。

## 研究目的

这部分研究不把“项目创建时间”当成协作模式。它要观察同一个仓库在五个自然年里的协作表面如何变化：外部入口是否还开放，机器可读规则何时出现，Issue / PR 中谁在说话，维护者怎样处理改动，以及 backlog 和处理周期是否发生变化。

五个观察年为 2022、2023、2024、2025 和 2026。2022-2025 使用完整自然年；2026 使用截至 2026-08-27 的 year-to-date 窗口，所有图表和统计都单独标注，不能与完整年度直接比较。

ChatGPT 于 2022 年 11 月公开发布，因此样本表把 2022-12-01 作为创建时间代理的操作性边界。这个边界只提供人工复核线索。正式分层使用 `llm_native_manual`，真正的“迁移”由仓库在年度窗口内可观察到的协作特征决定。

## 核心问题

1. 2022-2026 年间，Agentic AI 项目和长期活跃的传统项目，协作入口、响应速度和合并结果分别如何变化？
2. Agent marker、bot / agent actor 和人类维护者参与，是否在时间上形成可观察的先后关系？
3. 不同生态位是否沿着不同路径变化：Agent Application、Agent Framework、Agent Runtime Infra 和 Model Infra 的入口开放、机器规则和 review 负担是否不同？
4. 一个仓库最常见的变化是增加 Agent 辅助，还是限制核心入口、把贡献转移到插件、扩展或下游仓库？
5. 代码和 PR 数量变化之外，哪些可观察指标更能描述 Agent 时代的有效协作：人类响应、可合并结果、重复贡献、维护者判断轮次，还是问题的后续修复？

## 分析单位和时间切片

### 仓库—年份面板

每个仓库每个年份形成一行 `repository_year`。当仓库在某年尚未公开，保留结构化的 `not_public_yet`，不能当成零活动；当 GitHub API 或事件源无法覆盖该年份，使用 `not_observed`，也不能当成协作关闭。

每行至少包含：

- 年度协作入口：`has_issues`、Discussion、PR endpoint、外部 PR policy；
- 年度 Agent 信号：instruction、active config、workflow、首次发现日期；
- 年度活动：opened、closed、merged、closed-unmerged、月末 backlog；
- 年度过程：首次人类响应、首次维护者响应、首次 review、修改轮次和 response cycle；
- 年度参与：human、automation、confirmed AI agent、unknown 的 actor 和消息占比；
- 年度结果：外部 PR 合并率、首次贡献者重复贡献、reopen、revert 和 follow-up fix 近似信号；
- 证据状态：API 分页完成、历史 tree SHA、数据源和缺失原因。

Issue / PR 仍以 item 粒度保存，线程和 actor 仍以 event 粒度保存；`repository_year` 只是可回溯的年度汇总，不替代原始事件。

### 年度观察点

Agent marker 的历史树优先取每年 12 月 31 日前默认分支最后一个 commit：

| 年份 | marker 快照 | 活动窗口 |
| --- | --- | --- |
| 2022 | 2022-12-31 | 2022-01-01 至 2022-12-31 |
| 2023 | 2023-12-31 | 2023-01-01 至 2023-12-31 |
| 2024 | 2024-12-31 | 2024-01-01 至 2024-12-31 |
| 2025 | 2025-12-31 | 2025-01-01 至 2025-12-31 |
| 2026 | 2026-08-27 | 2026-01-01 至 2026-08-27 |

如果某个仓库在年末没有 commit，仍记录最近可取得的默认分支 SHA 和实际日期；如果没有公开仓库或无法读取历史树，记录原因。

## 协作模式状态

先计算连续的年度特征向量，再生成模式标签。这样不会因为一个仓库同时存在开放 PR、Agent 配置和自动化关闭，就被迫压成一个过度简单的类别。

### 年度特征向量

核心特征分为六组：

1. **入口**：Issue / PR / Discussion 是否可见，外部 PR 是否有明确限制，贡献是否被引向另一个仓库；
2. **规则**：是否存在强 Agent instruction、active config、workflow，以及当年首次出现的 marker；
3. **参与**：人类、automation、confirmed AI agent 和 unknown 的 actor / message / item share；
4. **处理**：首次人类响应、首次维护者响应、首次 review、merge / close 的中位数和删失率；
5. **审查**：每个 PR 的 review、change request、post-review commit 和 response cycle；
6. **结果**：merged、closed-unmerged、reopen、revert、follow-up fix、首次贡献者二次贡献。

比例优先于总量。活动量还要按 active repository、active maintainer、opened PR 或 active month 归一化，避免 PyTorch、Kubernetes 这类超大仓库决定总体趋势。

### 可解释的模式标签

模式标签是对年度向量的摘要，不是项目价值判断。正式阈值要在 pilot 后冻结，优先使用分位数和明确的可观测条件；低覆盖年份标记为 `insufficient_evidence`。

| 标签 | 可观察特征 | 研究含义 |
| --- | --- | --- |
| `open_human_gated` | Issue / PR 入口开放，未观察到强 Agent 规则或可确认 Agent 线程，维护者参与是主要协作路径 | 人类主导的开放协作基线 |
| `tool_assisted_human_gated` | 存在强 instruction 或 active config，同时线程中仍以人类作者、reviewer 和维护者为主 | Agent 先改变开发准备和局部执行，核心决策仍由人类完成 |
| `agent_visible_human_gated` | Issue / PR 中出现可确认的 Agent / bot 参与，且人类维护者仍执行 review、merge 或 close | 机器进入公开协作表面，但项目保留人类闸门 |
| `restricted_core_distributed` | Issue / PR 入口关闭或受限，贡献文档把参与引向插件、扩展、marketplace 或下游仓库 | 核心仓库与外部生态的协作面发生分离 |
| `automation_heavy_low_human_response` | 非人类 actor / message 占比高，且人类响应不足或结果主要是未合并关闭 | 检查自动化是否降低机械工作，或只是增加维护者筛选负担 |
| `mixed_or_insufficient_evidence` | 多种信号并存、年度活动不足或身份无法可靠分类 | 不强行解释，保留为混合状态 |

一个仓库可以同时具有 `tool_assisted_human_gated` 和 `restricted_core_distributed` 两个标签。为了绘制迁移图，再根据预先规定的优先级生成一个 `dominant_mode`，并同时公开完整的特征向量，避免图上的单一颜色遮蔽真实混合状态。

## 迁移的计算方式

迁移以同一仓库相邻年份的状态变化为单位：

- `mode_2022 -> mode_2023`；
- `mode_2023 -> mode_2024`；
- `mode_2024 -> mode_2025`；
- `mode_2025 -> mode_2026_ytd`。

主要输出包括：

- 每条转移边的仓库数、占可比较仓库的比例和 95% bootstrap 区间；
- 每个模式的进入率、退出率、平均停留年数和未观测比例；
- 按 ChatGPT-era proxy、语言、生态位和项目规模分层的转移矩阵；
- 首次出现 Agent marker 前后 180 天和 365 天的协作指标变化；
- 同一仓库的迁移轨迹，例如 `open_human_gated -> tool_assisted_human_gated -> agent_visible_human_gated`，或 `open_human_gated -> restricted_core_distributed`；
- 迁移前后外部 PR 合并率、人类响应、review cycle 和 backlog 的差异。

没有足够证据证明状态实际改变时，不使用“迁移”，只报告“年度快照不同”。例如，一个仓库在 2025 年没有 marker、2026 年有 marker，只能说明公开树中首次观察到 marker；不能证明团队在 2026 年才第一次使用 Agent。

## 五年动态比较

### Agentic AI 主样本

主样本仍是按 2026 年 7 月 OpenRank 排序的 Top 100。它适合回答头部 Agentic AI 仓库现在的协作状态和历史迁移，但不适合直接估计所有仓库的年度总体趋势。对 2022、2023 年没有公开仓库的项目要保留结构性缺失，不填零。

### 长期活跃对照

候选对照包括 Kubernetes、VS Code、Vue、Kata Containers、Prometheus、Envoy 和 Grafana。最终使用与主样本在语言、仓库年龄、活跃贡献者、PR intake 和规模上可比的仓库。PyTorch 已经属于 Model Infra 主样本，作为主样本分析对象和长期时间序列案例，不再把它重复计入独立对照组。

对照要同时做两种切片：

- **自然年切片**：回答 2022-2026 日历时间里的协作变化；
- **生命周期切片**：按仓库首次公开 release、Issue 或 PR 对齐前 180 天、后 180 天和后 365 天，降低项目年龄差异的影响。

自然年变化还会受 GitHub 产品、API 可见性、项目规模和宏观贡献热度影响。因此，只有在同仓库趋势和匹配对照都支持时，才讨论 Agent marker 与协作结果的关系；不把年份前后差异直接写成 Agent 造成的效果。

## 质量和可比性边界

1. 2026 是 YTD，不与完整年度的绝对量直接比较；使用月均、active month 和截至日期标记。
2. GitHub Search 只能用于发现或粗估，年度总量以 REST / GraphQL 可验证分页或 connection 为主。
3. ClickHouse `opensource.events` 适合做年度和月度方向交叉核对；事件类型存在选择性缺失时，不能把它作为 Issue / PR 全量真值。
4. 历史 Git tree 缺失、仓库未公开、账号删除和权限不足分别记录，不合并成“没有采用”或“没有人参与”。
5. `unknown` actor、右删失 item 和没有人类响应的 thread 都保留在分母中，并单独报告比例。
6. Agent instruction 证明仓库准备了机器可读规则；confirmed Agent actor 或公开归因才证明 Agent 出现在具体线程中。
7. 代码由普通开发者账号提交时，无法仅凭代码风格、提交速度或语言风格判断是否由 AI 生成。
8. 所有年度结论同时报告 repository-macro 和 event-weighted 两个口径，并做去除超大仓库的敏感性分析。

## 预期交付物

- `repository_year.csv`：100 个主样本和匹配对照的年度特征向量；
- `collaboration_mode_transitions.csv`：同仓库相邻年份的模式转移和证据状态；
- `agent-adoption-event-study.csv`：首次公开 marker 前后的窗口指标；
- 五年趋势图：入口开放、Agent marker、人类响应、PR 结果、backlog 和 review cycle；
- 至少三个案例：Agent visible human-gated、restricted core distributed、传统长期项目的协作演变；
- 一份证据边界说明，列出哪些变化可以确认，哪些只能作为相关性或待验证假设。
