# 今年有多少合入代码可以公开归因给 Agent

版本：2026-09-01。统计窗口为 2026 年 1 月 1 日至 8 月 31 日。

## 先说答案

公开 GitHub 数据只能给出一个可审计的下界。在 Top 100 的 5,000 条样本中：

| 口径 | 样本中观察到 | 样本占比 | 怎么理解 |
| --- | ---: | ---: | --- |
| Agent-only 已合入 PR | 8 / 2,125 | 0.38% | 高置信 Coding Agent 发起，当前可见的全部 commit 都能归因给 Agent |
| Agent-only 最终新增行 | 952 / 1,568,653 | 0.06% | 只统计上述 8 个 PR 最终 diff 里的新增行 |
| 直接归因给 Agent 的 commit | 55 / 10,935 | 0.50% | commit author 是高置信 Coding Agent |
| Agent 碰过代码的已合入 PR | 26 / 2,125 | 1.22% | Agent 发起 PR 或至少提交过一个 commit，后来可能有人类改写 |
| 加入中等置信 Agent 身份 | 28 / 2,125 | 1.32% | 身份敏感性上界 |
| 再加入普通账号的完整 AI 生成声明 | 31 / 2,125 | 1.46% | PR 正文明确声明由 AI / Agent 完整生成 |

这里的 0.06% 不是“实际 AI 代码占比”。开发者在本地使用 Cursor、Claude Code、Copilot 或 Codex，再用普通账号提交时，GitHub 通常看不到代码来源。这个实验测到的是公开可归因的代码，不是所有 AI 辅助开发。

## 样本怎么来的

- 仓库：冻结的 Top 100；
- 时间：2026 年前八个月；
- 线程：每个仓库 50 条，共 5,000 条；原来的 20 条保留，再补 30 条；
- 其中 PR 3,567 条，已合入 PR 2,125 条；
- 所有比例直接按样本实际数量计算，不做仓库流量加权；
- 3,567 个 PR 的 additions、deletions、changed files、commit 总数和完整 PR body 都已补齐。

## “Agent-only”怎么判

一个 PR 同时满足下面四项，才进入严格下界：

1. PR 发起人是 actor registry 中高置信的 Coding Agent；
2. 当前 PR commit 列表可以完整归因；
3. 每个 commit 的 author 都能对应高置信 Coding Agent，或与已经确认的 Agent opener 是同一个服务身份；
4. 没有普通账号或无法归因账号直接提交代码。

人类 review、评论和点击 merge 不会取消 Agent-only。只要人类直接提交了代码，这个 PR 就进入 `Agent-human mixed`，不能再把整个 diff 算给 AI。

## 严格下界里的八个已合入 PR

| 仓库与 PR | 最终增删行 | 当前 commit 数 | 公开归因 |
| --- | ---: | ---: | --- |
| `vercel/ai#18818` | +250 / -29 | 6 | `ai-sdk-factory[bot]` |
| `vercel/ai#18793` | +130 / -2 | 3 | `ai-sdk-factory[bot]` |
| `mastra-ai/mastra#21936` | +464 / -0 | 4 | `devin-ai-integration[bot]` |
| `pingdotgg/t3code#7157` | +9 / -87 | 2 | `t3-code[bot]` |
| `mlflow/mlflow#22659` | +10 / -0 | 3 | Copilot |
| `mlflow/mlflow#21621` | +58 / -25 | 3 | Copilot |
| `mlflow/mlflow#20297` | +18 / -0 | 2 | Copilot |
| `mlflow/mlflow#20828` | +13 / -1 | 4 | Copilot |

八个案例分布在四个仓库，不能据此推断所有仓库都有同样比例。Vercel AI 一家贡献了其中两个案例，也提醒我们不要只读总数。

## Agent 碰过代码，不代表整个 PR 都是 Agent 写的

高置信 Agent 发起或提交过代码的已合入 PR 一共有 26 个，其中只有 8 个满足 Agent-only。其余 PR 能看到人类或无法归因账号继续提交。例如 ONNX Runtime #28045 和 OpenMetadata #25243 都有 Agent commit，后面也有人类修改链。

这就是为什么 `Agent touched` 只能说明 Agent 进入过代码路径，不能把整个最终 diff 归给 Agent。逐行保留情况需要另做 patch lineage。

## 普通账号的公开声明

完整 PR body 中还发现 8 个 `generated_claim`：普通账号明确写明 PR 由 AI / Agent 生成。这类声明能证明作者主动公开了 AI 参与，但不能证明每一行没有人工修改，因此进入披露范围，不进入最高置信 Agent-only。

未勾选的 PR 模板选项仍然不算披露。“如果存在 AI 代码，作者已经检查”这类条件句也不算肯定陈述。

## 一个必须保留的数据限制：超大 PR 最多暴露 250 个 commit

GitHub 的 PR commit connection 对超大 PR 最多返回 250 条。当前有 15 个 PR 的 GraphQL `commits.totalCount` 与可逐条读取的 commit 数不一致；其中包括超过 1,000 个 commit 的 PR。

这不等于 endpoint 失败。请求成功，只是完整 commit 历史没有全部暴露。因此：

- 这些 PR 可以进入 `Agent touched` 下界，因为已经看到的 Agent commit 是真实公开记录；
- 它们不能进入严格 Agent-only，除非 commit 归因完整；
- commit 占比使用 GitHub 报告的总数作分母，因此对 Agent commit 是保守下界。

## 结果稳不稳

比 2,000 条时稳定，但稀有事件仍然不算多。仓库内 bootstrap 的 95% 区间为：

- Agent-only 已合入 PR 占比：0.14%—0.66%；
- Agent-only 最终新增行占比：0.01%—0.16%；
- Agent-only 最终增删行占比：0.01%—0.13%。

已合入 PR 的增删行 p99 约为 10,449 行。把每个 PR 的代码量截到 p99 后，Agent-only 增删行占比从 0.05% 变为 0.09%。方向没有被单个超大 PR 推翻，但小数点后的精度仍不适合被包装成“全行业 AI 代码率”。

## Patch lineage 到哪一步

原 2,000 条样本里发现的 10 个已合入 Agent-touched PR 已经完成逐案复核。九个可以逐行追踪；Mooncake #2686 的 Agent 署名只出现在双父 merge commit，不进入逐行分母。这个十案审计保持原样，避免补样后重新挑案例造成事后选择。

结果见 [`collaboration-patch-lineage-findings.md`](collaboration-patch-lineage-findings.md)。它回答“第一批 Agent patch 最后保留多少”，不代表 2,125 个已合入 PR 的总体保留率。

## 现在可以怎么说

- 公开可归因的 Agent commit 已经进入主分支，但在这 2,125 个已合入样本 PR 中仍然少；
- Agent 参与过代码的 PR 明显多于完整 Agent-only，协作中的接管和修改比“一次生成直接合入”更常见；
- 最诚实的表述是“公开证据下界”，不能写成“今年有 X% 的开源代码由 AI 完全生成”。
