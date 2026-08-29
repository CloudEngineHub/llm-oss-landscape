# Open Collaboration 数据采集与识别协议

版本：2026-08-29

状态：第二轮采集完成。`rapidsai/cudf` 迁移为 `NVIDIA/cudf` 造成的 GitHub Search 假零值已经修复；主样本 100 个仓库、2,000 条线程，全部 endpoint 完整并通过校验。

## 数据源优先级

1. GitHub REST / GraphQL API：仓库设置、Issue、PR、comment、review、commit 和 timeline 的主证据；
2. Git 对象与默认分支历史：Agent marker 的当前状态和历史状态；
3. 仓库文档：外部贡献政策、机器可读规则和替代协作入口；
4. ClickHouse opensource.events：月度发现、交叉核对和历史趋势，不作为 2026 年单个 Issue / PR 的唯一真值；
5. 人工 case file：API 无法表达的限制条件和上下文。

GitHub API 的结果必须保存抓取时间、API 版本、HTTP 状态和分页完成情况。ClickHouse 中 2026 年部分事件类型存在选择性缺失，正式统计前要按月份和事件类型做完整性检查。

## 第一阶段：100 个仓库的协作入口

所有主样本仓库均采集：

- repository id、默认分支、archived、fork、created / pushed timestamp；
- has_issues；
- Discussion 是否启用；
- `hasPullRequestsEnabled`：仓库是否启用 Pull Requests；
- `pullRequestCreationPolicy`：允许所有人创建 PR，还是仅限 collaborators；
- CONTRIBUTING、README、CODEOWNERS、Issue / PR template、governance 文件；
- 是否明确拒绝、暂停或限制外部 PR；
- README 是否把贡献引向 plugin、extension、marketplace、Discord 或另一个仓库。

### PR 入口、创建权限、接受政策和实际结果必须分开

GitHub GraphQL API 直接提供 `hasPullRequestsEnabled` 和 `pullRequestCreationPolicy`。前者回答 PR 功能是否开启，后者回答谁能创建 PR。它们必须作为创建权限的第一证据，不能再用“历史上是否出现过外部作者 PR”代替。维护者是否接受、响应和合并外部贡献，则要继续读取仓库政策和实际线程。

因此保留以下六类字段：

| 字段 | 含义 |
| --- | --- |
| has_pull_requests | PR 功能是否启用，对应 GraphQL `hasPullRequestsEnabled` |
| pull_request_creation_policy | `ALL` 或 `COLLABORATORS_ONLY`，对应 GraphQL `pullRequestCreationPolicy` |
| external_pr_policy | 文档写明 accept / restricted / not accepted / unclear |
| external_pr_observed_2026 | 2026 年是否实际出现非核心作者 PR |
| external_pr_merged_2026 | 2026 年是否实际合并非核心作者 PR |
| pull_surface_observed | REST Pulls endpoint 是否可访问，仅作诊断，不再作为开放策略字段 |

DeepSeek Harness 等例外需要保存页面截图、API 响应和贡献文档原文位置，不能只保存人工判断。

## 第二阶段：Agent marker 扫描

### 时间点

- 2026-05-31：重建五月比较点；
- 2026-08-27：当前快照。

每个时间点先找默认分支在截止日前最后一个 commit，再读取对应 Git tree。递归 tree 返回 truncated=true 时，按子树继续抓取，不能把截断结果当作“未发现 marker”。

### Marker 证据表

| 工具或协议 | 强证据示例 | 配置证据示例 | 弱证据 |
| --- | --- | --- | --- |
| Cross-agent | AGENTS.md、AGENT.md | .agents/、.agent/ | README 只提到 agent |
| Claude Code | CLAUDE.md | .claude/ | .gitignore 中的 .claude |
| Codex | AGENTS.md 中明确 Codex 规则 | .codex/ | ignore / 文档提及 |
| Cursor | .cursor/rules/、.cursorrules | .cursor/ 其他配置 | ignore 中的 .cursor |
| GitHub Copilot | .github/copilot-instructions.md | agent / workflow 配置 | README badge |
| Gemini | GEMINI.md | .gemini/ | ignore 中的 .gemini |
| Windsurf | .windsurfrules、.windsurf/rules/ | .windsurf/ | ignore 中的名称 |
| Cline / Roo / Continue | 对应 rules 或 instructions | 对应配置目录 | ignore 中的名称 |

主采用率只计算强证据。配置证据单独报告；弱证据只用于复算五月宽口径。

Pilot 后补充两条排除规则：

- 任意位置的单数 agent.md 可能只是业务领域文档，不作为 marker；
- tests、fixtures、snapshots、vendor 和 third_party 下的 instruction 文件不计入仓库采用。

### 五月与八月如何比较

需要同时给出两张表：

1. **Repeated cross-section**：五月 Top 100 与七月 Top 100 各自在当时的 marker；
2. **Repository panel**：两个样本交集仓库在五月和八月的 marker 变化。

第一张表会受到样本换入换出的影响，第二张表才能描述同一仓库的采用变化。只有五月总比例、没有仓库级旧结果时，要从历史 Git tree 重新扫描，不能直接拿旧总数和新总数解释工具兴衰。

### Agent 任务分类

读取 instruction 文件后做多标签编码：

- implementation；
- tests / validation；
- documentation；
- code review；
- Issue triage / planning；
- release / dependency maintenance；
- security / compliance；
- repository navigation / context。

模型可以辅助抽取，但需要人工复核：

- 全部低置信度记录；
- 每个任务标签至少 20 个样本；
- 其余记录随机抽取 20%；
- 报告多标签 precision / recall 或 reviewer agreement。

## 第三阶段：Issue 和 PR population frame

主窗口为 2026-01-01T00:00:00Z 至快照时间。仓库级别保留逐月 Issue / PR population count、窗口 cohort backlog 和 outcome；线程级元数据使用概率抽样，不把 API 能否完整分页误写成 census。

本轮 GitHub Search population count 已做两类复核：十个仓库的重复采集在 350 个已结束月份单元格中完全一致；OpenClaw、Hermes Agent、PyTorch 和 Codex 又与 repository connection total 交叉核对。八月仍是 live window，重复采集出现 1–5 条的自然变化，因此只把一月至七月当作冻结月份。

### Issue / PR 协作项

| 字段组 | 字段 |
| --- | --- |
| Identity | repo、number、node id、issue / PR |
| Time | created、updated、closed、merged |
| Outcome | open、closed、merged、closed-unmerged、draft |
| Author | login、GitHub type、author association |
| Size | commits、changed files、additions、deletions |
| Discussion | issue comments、review comments、reviews、participants |
| Classification | external / core、bot / agent / human / unknown |
| Evidence | labels、body disclosure、commit trailers、performed via GitHub App |

当前 backlog 指标仅追踪研究窗口内创建的 cohort，不含 2026 年以前的 opening backlog。这个边界会与指标同时展示：

window_cohort_backlog = opened_since_2026_01_01 - closed_from_same_cohort

### 处理时间

- first response：创建后第一条非作者、非纯状态事件；
- first human response：第一条 human account 的 comment / review；
- first maintainer response：第一条 OWNER、MEMBER 或 COLLABORATOR 的 comment / review；
- resolution：Issue closed；
- PR outcome：merged 或 closed-unmerged；
- open item：在快照日右删失。

时间结果使用分位数，并同时报告未关闭比例。跨年 outcome 比较另取一月至五月的月 cohort，在当月月末后继续观察 90 天；每条记录因此获得 90 到约 120 天的随访。只计算已关闭记录会系统性忽略最难处理的 backlog。

## 第四阶段：线程和 review 过程

GitHub timeline 可以返回 Issue 与 PR 的 comment、review、commit、force-push、reopen、merge 等事件。Pilot 曾显示 timeline 与专用 endpoint 的摘要数量一致，但正式样本暴露出一个关键限制：timeline 的 commit 事件包含 SHA，却没有足够的 commit timestamp，无法判断提交是否发生在 review 之后。因而最终分析使用三条互补链路：timeline 保留线程状态与 gate，Pull Request review-comment endpoint 补齐 inline review，Pull Request commits endpoint 提供带日期的提交。不能把 timeline 中缺失日期的 commit 解释为“没有 review 后修改”。

最终完整性结果：2,000/2,000 条线程 timeline 成功；1,425/1,425 个 PR 的 review comments 成功；1,425/1,425 个 PR 的 commits 成功；缺失 endpoint 与采集错误均为零。合并后进入分析的公开事件为 50,731 条。

### 线程指标

| 指标 | 定义 |
| --- | --- |
| visible_messages | Issue comment、review body、review comment |
| unique_actors | 所有可见事件 actor 去重 |
| human_messages | human account 产生的消息 |
| bot_messages | automation 或 confirmed agent 产生的消息 |
| actor_class_switches | 时间序列中 actor class 的切换次数 |
| maintainer_response_rounds | 外部作者更新后出现维护者响应的轮数 |
| change_request_cycles | CHANGES_REQUESTED 后又出现 commit / force-push 的周期 |
| post_review_commits | 首次有效 review 之后新增的 commit |

“对话轮数”需要同时报告 message count 和 response cycle，不能把 bot 连续发送十条状态更新解释成十轮协作。

### 数据量过大时的处理

100 个仓库的 repository-month 流量和 cohort backlog 保持完整 count。评论、review 和 timeline 采用 repository-stratified probability sample。

冻结窗口包含 344,781 个 Issue 和 595,909 个 PR。逐条调用 timeline 不能扩展到全 population。因此：

- repository-month 使用重复验证的 GitHub Search count，并以 connection total 做独立 sanity check；
- 对 100 个仓库各抽取 20 条线程；`NVIDIA/cudf` canonical 名称已经写回主数据和当前研究产物；
- 样本保留自然 Issue / PR 构成，最终为 575 个 Issue、1,425 个 PR；每条记录保存 inclusion probability 和 inverse-probability weight；
- confirmed Agent / bot thread 另设明确标注的 discovery top-up，只用于过程案例，不混入采用率分母；
- 抽样种子、抽样概率和权重必须保存；
- macro view 对仓库等权，event-weighted view 使用 sampling weight；两者并列，不能选择更符合预期的一种；
- 不能简单设置“每个仓库前 100 条”，那会系统性偏向最近月份或某种结果。

GitHub 认证用户的 REST API 通常有每小时 5,000 次主限额，同时存在 secondary rate limit。采集器需要读取 rate-limit headers、串行控制高成本 endpoint、指数退避并支持断点续跑。

## 第五阶段：Bot、Agent 和人类账号

### 参与者登记表

每个唯一 actor 保存：

- login、database id、公开 type；
- 是否以 [bot] 结尾；
- performed_via_github_app；
- author association；
- 已知 bot / agent registry 命中；
- 人工核对链接和日期；
- 最终类别与证据等级。

### 最终类别

1. confirmed_ai_agent；
2. automation_bot；
3. human_account；
4. unknown。

Dependabot、Renovate 和 release bot 属于 automation，不自动算 AI Agent。GitHub Copilot coding agent、明确的 coding agent service account 或带有公开生成声明的账号可以进入 confirmed Agent。

### AI 生成代码

普通账号提交的代码只有在出现下列公开证据时才标记：

- PR body 或 label 明确说明由某 Agent 生成；
- commit trailer / author 明确归因；
- 公开 workflow 或 GitHub App 记录；
- 项目文档给出可核对的提交约定。

仓库存在 AGENTS.md 只能证明仓库准备了机器可读规则，不能证明每个 PR 都由 Agent 生成。

### 仅自动化参与的线程

一个 Issue / PR 只有在以下可见 actor 全部不是人类账号时，才标记为 automation_only：

- opener；
- comment author；
- reviewer；
- commit / force-push actor；
- close / merge actor。

缺失 actor 或 deleted user 会进入 unknown_identity_present，不能强行归入 automation-only。

## 第六阶段：分析表

采集后生成六张标准表：

| 表 | 粒度 | 主要用途 |
| --- | --- | --- |
| repository_snapshot | repository × snapshot | 协作入口、规模、分层 |
| agent_marker | repository × snapshot × marker | Agent 采用与任务 |
| issue_pr_item | Issue / PR | outcome、latency、删失 |
| timeline_event | thread event | 对话、身份和轮次 |
| actor_registry | actor | Bot / Agent / human 证据 |
| repository_month | repository × month | intake、throughput、backlog、负担 |

所有派生结果都能回溯到 GitHub URL、API node id 或 commit SHA。

## 数据质量闸门

正式制图前逐项检查：

1. 100 个样本是否全部完成 repository snapshot；
2. tree 是否截断，marker 文件是否实际读取；
3. Search population count 是否通过重复采集和 connection total sanity check；
4. timeline / review 是否存在 endpoint 截断或权限缺口；
5. actor registry 的 unknown 比例，以及 expanded unknown-actor upper bound 是否改变结论；
6. 每个时间指标的删失比例；
7. 2026 月度总量与 ClickHouse 是否方向一致，差异能否解释；
8. LLM identity 与技术领域的分组差异是否以仓库为独立单位检验；
9. macro average 与 event-weighted 结果是否被少数大仓库拉开；
10. 所有“Agent 提升效率”的表述是否有合适的对照和 adoption 时间证据。

当前闸门结果：严格 Agent 参与估计为 40.353%，加入两类 unresolved agent-like bot 的上界为 40.378%，主结论不敏感；population-weighted 与 equal-repository 估计并列发布；Agent 可见结果差异仅作描述，不进入因果表述。

## 官方 API 参考

- [Repository endpoints](https://docs.github.com/en/rest/repos/repos)
- [Issue endpoints](https://docs.github.com/en/rest/issues)
- [Timeline events](https://docs.github.com/en/rest/issues/timeline)
- [Issue event types](https://docs.github.com/en/rest/using-the-rest-api/issue-event-types)
- [Pull request endpoints](https://docs.github.com/en/rest/pulls/pulls)
- [Pull request reviews](https://docs.github.com/en/rest/pulls/reviews)
- [Pull request review comments](https://docs.github.com/en/rest/pulls/comments)
- [Git trees](https://docs.github.com/en/rest/git/trees)
- [REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GraphQL rate and query limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
