# 这次实验到底是怎么做的

这份说明只讲实验设置。读完以后，你应该能知道：100 个仓库从哪里来，5,000 条 Issue / PR 怎么补到每库 50 条，为什么主结果不再做流量加权，为什么还要另选 10 个仓库深挖，以及结果能说到哪一步。

## 先说数据状态

主样本已经补到 5,000 条：

- 100 个仓库；
- 原来的每库 20 条、共 2,000 条全部保留；
- 每个仓库排除旧编号后再补 30 条，最终每库 50 条；
- 共 1,433 条 Issue、3,567 条 PR；
- 旧 2,000 个 thread key 全部仍在，新旧样本没有重复。

这是一次补样，不是重新抽 5,000 条。原样本截止到 8 月 29 日；新增 3,000 条覆盖完整的 1 月 1 日至 8 月 31 日。这个两阶段差异会保留在方法说明里，不能把它包装成同一天完成的一次性简单随机样本。

校验命令：

```bash
.venv/bin/python scripts/validate_collaboration_empirical.py
```

校验器要求 100 × 50 = 5,000，并逐条检查 timeline、review、commit 完整性；它也防止 review 后 commit 或 maintainer gate 再次异常退化成零。

## 第一层：100 个仓库的横截面

仓库总表是 [`data/agentic-ai-projects.csv`](../../../data/agentic-ai-projects.csv)。取样步骤是：

1. 保留有 2026 年 7 月 OpenRank 的项目；
2. 按 OpenRank 从高到低排序；
3. 取前 100 个；
4. 分数相同时按仓库名排序，保证重跑不变。

完整清单在 [`collaboration-sample-top100-2607.csv`](collaboration-sample-top100-2607.csv)。这不是随机抽取的 100 个开源项目，而是完整跟踪池中最活跃的 100 个。因此结果代表“我们跟踪的活跃头部项目”，不能直接外推到全部开源软件。

这 100 个仓库另外人工标了两组属性：

- 与大模型的关系：`llm_native`、`mixed`、`traditional`；
- 技术领域：Agent Application、Agent Framework、Agent Runtime Infra、Model Infra。

这样才能真正比较：传统项目和 LLM-native 项目是否不同，Agent 项目和基础设施项目是否不同。分组结果见 [`collaboration-strata-findings.md`](collaboration-strata-findings.md)。

这里不再设置所谓“Landscape sensitivity sample”。它没有帮助回答新的研究问题，反而让主样本和编辑入图名单混在一起。

## 每个仓库怎样补到 50 条

100 个仓库在 2026 年 1 月 1 日到 8 月 31 日共创建：

- 349,826 条 Issue；
- 606,741 条 PR；
- 合计 956,567 条公开协作项。

GitHub 的 Issue 和 PR 共用编号。抽样分两步：

1. 保留原来每库 20 条，不修改它们的仓库、编号、标题、作者、时间或 URL；
2. 在同一仓库完整八个月的编号范围里，先排除旧 20 条，再用固定随机种子打乱，跳过空号、已删除记录和窗口外记录，直到补满 30 条。

说人话就是：旧样本不动，再随机补 30 条；同一个 Issue 或 PR 不会被抽两次。补样脚本是 [`scripts/supplement_collaboration_threads.py`](../../../scripts/supplement_collaboration_threads.py)。

逐条样本和 GitHub 链接在 [`collaboration-thread-sample-2026.csv`](collaboration-thread-sample-2026.csv)。旧 2,000 条使用 `uniform_issue_number_rejection_sample`，新增 3,000 条使用 `supplemental_uniform_issue_number_rejection_sample`，因此可以逐条区分两个阶段。

## “线程”是什么，为什么不再展示“weighted thread”

一条“线程”就是一个 Issue 或 PR，加上它公开可见的评论、review、commit、关闭和合入事件。不是把每条评论单独算一条样本。

旧报告曾按各仓库的全年 Issue / PR 流量给样本加权，试图还原约 94 万条总体。这在统计上有用途，但读者需要同时理解抽样概率、逆概率权重和“大仓库为何代表更多线程”，解释成本太高，也容易把估计值误读成实际观察。

新报告不再这样做。5,000 条样本里每条线程只算一次：抽到了多少 Issue、多少 PR，看到多少 Agent 参与，就直接展示多少和占 5,000 条的比例。代价也要说清楚：每个仓库固定 50 条，所以这个结果代表“100 个头部仓库中、每库同样数量的协作切片”，不是整个生态按真实流量混在一起的分布。

补样以后，单个仓库的随机波动明显下降。样本 Issue 占比相对该仓库完整八个月总体的绝对误差，中位数从每库 20 条时的 5.96 个百分点降到每库 50 条时的 3.65 个百分点，90 分位从 18.34 降到 9.53。另一方面，5,000 条样本整体的 Issue 占比是 28.66%，完整 956,567 条总体是 36.57%。这个差异来自每库固定配额，不应再用加权数字掩盖；页面会把样本构成和总体构成分开说明。

## `Agent marker` 是什么

`Agent marker` 指仓库里公开存在的 Agent 指令或配置，例如 `AGENTS.md`、`CLAUDE.md`、`.cursor/`、`.claude/`。它说明仓库为 Agent 准备了上下文或规则，不等于 Agent 已经在 Issue / PR 中实际工作。

实际参与率来自公开线程里的 Bot、GitHub App、明确 Agent 身份和可核验归因。普通开发者私下用 Cursor、Claude Code 或 Codex，最后仍以 `User` 账号提交，公共数据看不出来。因此“可见 Agent 参与率”是下界。

## 为什么每库补到 50 条以后，仍然需要 10 个仓库深挖

从 20 条补到 50 条，能降低单个仓库抽到几条特殊线程就大幅改变比例的风险，但 50 条仍不足以复原一个大型仓库完整的协作史。为了解决时间阶段和项目机制问题，第二层另选了 10 个代表仓库：

- Agent Application：OpenAI Codex、Claude Code；
- Agent Framework：LangChain、Dify、n8n；
- Agent Runtime Infra：Langfuse、Coder、Milvus；
- Model Infra：vLLM、PyTorch。

它们同时覆盖 `llm_native`、`mixed` 和 `traditional`。清单与选择理由见 [`collaboration-deep-repositories-2026.csv`](collaboration-deep-repositories-2026.csv)。

每个仓库抽三个阶段，每阶段 30 条，共 900 条：

1. 仓库创建后的前 120 天；
2. 2025 年 9 月 1 日到 12 月 31 日；
3. 2026 年 5 月 1 日到 8 月 28 日。

900 条 timeline 全部成功，共 23,904 个 timeline 事件；535 条样本 PR 的 inline review 与 commit endpoint 全部成功。这样既能看同一仓库怎么变，也能比较仓库之间为何不同。结果见 [`collaboration-deep-stage-findings.md`](collaboration-deep-stage-findings.md)。

## 效率指标怎样避免“刚创建所以还没处理”的假 backlog

2026 年 8 月刚创建的线程，到采集日可能只有几天观察时间。直接拿 open / closed 比例和 2025 年比较，会把观察期短误认为处理慢。

深挖实验因此使用固定 30 天结果：只有已经获得完整 30 天观察期的线程，才进入“30 天内关闭”和“30 天内合入”计算。长期面板则使用固定 90 天成熟度，见 [`collaboration-fixed-90d-findings.md`](collaboration-fixed-90d-findings.md)。

## 现在能回答什么，不能回答什么

现在可以回答：

- 仓库是否公开了 Agent marker；
- 公开线程里可识别 Agent 出现在哪里、承担哪些任务；
- 不同项目类型的人类 review、自动化回复、维护者介入是否有明显差异；
- 10 个代表仓库在不同阶段呈现哪些不同路径。

现在还不能直接回答“Agent 让生产率提高了多少”。Agent 不是随机分配给线程的：复杂、重要或已经卡住的任务更可能主动引入 Agent。观察到关联，不等于 Agent 造成了结果。

这轮也没有完成“贡献价值”的最终度量。代码量、PR 数和合入速度已经不够，还需要继续验证返工、回退、测试证据、问题定义、长期维护和判断责任。
