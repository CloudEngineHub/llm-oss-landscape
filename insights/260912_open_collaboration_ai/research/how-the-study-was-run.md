# 这次实验到底是怎么做的

这份说明只讲实验设置。读完以后，你应该能知道：100 个仓库从哪里来，2,000 条 Issue / PR 怎么抽，为什么还要另选 10 个仓库深挖，以及结果能说到哪一步。

## 先说数据状态

主样本现在是完整的：

- 100 个仓库；
- 每个仓库随机抽 20 条，共 2,000 条线程；
- 575 条 Issue、1,425 条 PR；
- 2,000 条 timeline 全部成功；
- 1,425 条 PR 的 inline review comment 和 commit endpoint 全部成功；
- 合并后进入分析的公开事件共 50,731 条。

上一轮只有 99 个仓库、1,980 条，是仓库改名造成的数据错误。样本里写的是 `rapidsai/cudf`，GitHub 当前 canonical 名称是 `NVIDIA/cudf`。普通仓库 API 会跳转，GitHub Search 使用旧名称却返回零。现在已经统一改名、补抽 20 条并重算全部结果。

校验命令：

```bash
.venv/bin/python scripts/validate_collaboration_empirical.py
```

当前校验结果是通过。校验器要求 100 × 20 = 2,000，检查 timeline、review、commit 完整性，也防止 review 后 commit 或 maintainer gate 再次异常退化成零。

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

## 每个仓库怎样抽 20 条

主样本只看 2026 年 1 月 1 日到 8 月 29 日创建的 Issue / PR。100 个仓库在这个窗口里共有：

- 344,781 条 Issue；
- 595,909 条 PR；
- 合计 940,690 条公开协作项。

GitHub 的 Issue 和 PR 共用编号。脚本找到窗口内最早和最晚的编号，用固定随机种子打乱，然后逐个访问；空号、已删除或不在时间窗内的编号跳过，直到抽满 20 条。

这叫 `uniform_issue_number_rejection_sample`。说人话就是：随机打乱可能的编号，碰到空号就跳过，拿够 20 条为止。

逐条样本、GitHub 链接、抽样概率和权重在 [`collaboration-thread-sample-2026.csv`](collaboration-thread-sample-2026.csv)。代码在 [`scripts/sample_collaboration_threads.py`](../../../scripts/sample_collaboration_threads.py)。

## “线程”和“加权 PR”是什么意思

一条“线程”就是一个 Issue 或 PR，加上它公开可见的评论、review、commit、关闭和合入事件。不是把每条评论单独算一条样本。

“加权 PR”也不是一种特殊 PR。因为每个仓库都只抽 20 条，大仓库里一条样本代表的真实协作项更多。比如某仓库窗口内有 2,000 条、抽了 20 条，那么每条样本权重约为 100。按权重计算的 PR 比例是在估计 94 万条总体中的分布。

报告同时保留两个视角：

- 仓库等权：每个仓库算一票，回答“典型仓库怎样”；
- 按总体量加权：每条真实协作项算一票，回答“全部活动放在一起怎样”。

不能只放加权结果，否则 PyTorch、OpenClaw 一类大仓库会定义整个结论。

## `Agent marker` 是什么

`Agent marker` 指仓库里公开存在的 Agent 指令或配置，例如 `AGENTS.md`、`CLAUDE.md`、`.cursor/`、`.claude/`。它说明仓库为 Agent 准备了上下文或规则，不等于 Agent 已经在 Issue / PR 中实际工作。

实际参与率来自公开线程里的 Bot、GitHub App、明确 Agent 身份和可核验归因。普通开发者私下用 Cursor、Claude Code 或 Codex，最后仍以 `User` 账号提交，公共数据看不出来。因此“可见 Agent 参与率”是下界。

## 为什么 20 条不够回答项目差异

每仓库 20 条可以回答整体分布，不能给单个仓库定性。为了解决这个问题，第二层另选了 10 个代表仓库：

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
