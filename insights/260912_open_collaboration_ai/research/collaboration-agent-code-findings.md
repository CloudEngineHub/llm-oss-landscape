# 今年有多少合入代码可以公开归因给 Agent

版本：2026-08-29。第一轮结果，暂不用于外部发布。

## 先说答案

公开 GitHub 数据可以给出一个下界。在当前 Top 100 样本里：

| 口径 | 样本中观察到 | 概率加权估计 | 怎么理解 |
| --- | ---: | ---: | --- |
| Agent-only 已合入 PR | 3 / 852 | 0.37% | 高置信 Coding Agent 发起，当前全部 commit 都能归因给 Agent |
| Agent-only 最终新增代码行 | 318 / 409,782 | 0.14% | 只统计上述 PR 最终留在 diff 中的新增行 |
| 直接归因给 Agent 的 commit | 23 / 3,729 | 0.67% | commit author 是高置信 Coding Agent |
| Agent 碰过代码的已合入 PR | 10 / 852 | 1.01% | Agent 发起 PR 或至少提交过一个 commit，后来可能有人类改写 |
| 加入中等置信 Agent 身份 | 11 / 852 | 1.17% | 把 `kilo-code-bot[bot]` 等身份纳入敏感性上界 |
| 再加入普通账号的完整 AI 生成声明 | 14 / 852 | 1.37% | 包含 PR 正文明确声明由 AI / Agent 完整生成的案例 |

这里的 0.14% 是目前最接近“完全由 AI 生成并进入主分支”的公开证据下界。它不是实际 AI 代码占比。开发者在本地使用 Cursor、Claude Code、Copilot 或 Codex，最后用普通账号提交时，GitHub 看不到代码来源。

## 样本怎么来的

- 研究窗口：2026 年 1 月 1 日至 8 月 29 日；
- 仓库：已经冻结的 100 个 Agentic AI、Model Infra 和传统对照仓库；
- 线程概率样本：每个仓库 20 条，共 2,000 条；
- 其中 PR 1,425 条，已合入 PR 852 条；
- 这些已合入 PR 当前共有 3,729 个 commit；
- 采样权重来自每个仓库在窗口内的 Issue / PR 总体量，因此正文使用概率加权比例。

这一轮又通过 GraphQL 补齐了全部 1,425 个 PR 的最终 additions、deletions、changed files、commit 总数和完整 PR body。元数据 1,425 / 1,425 成功，没有缺失。

## “Agent-only”是怎么判的

一个 PR 同时满足下面四项才进入严格下界：

1. PR 发起人是 actor registry 中高置信的 Coding Agent；
2. 当前 PR commit 列表采集完整；
3. 每个 commit 的 author 都能直接对应高置信 Coding Agent，或与已确认的 Agent opener 是同一个服务身份；
4. 没有观察到普通账号或无法归因账号提交代码。

人类 review、评论和点击 merge 不会取消 Agent-only。只要人类直接提交了代码，这个 PR 就进入 `Agent-human mixed`，不再把整个 diff 算成 AI 生成。

## 严格下界里的三个 PR

| 仓库与 PR | 最终增删行 | 公开归因 |
| --- | ---: | --- |
| `vercel/ai#18818` | +250 / -29 | `ai-sdk-factory[bot]` 发起；6 个当前 commit 均对应同一 Agent 服务身份 |
| `mlflow/mlflow#22659` | +10 / -0 | Copilot 发起；3 个 commit 均由 Copilot author |
| `mlflow/mlflow#21621` | +58 / -25 | Copilot 发起；3 个 commit 均由 Copilot author |

`Kilo-Org/kilocode#9698` 也满足完整 Agent commit 链，但当前 actor registry 对 `kilo-code-bot[bot]` 的功能证据为 medium confidence，因此只进入敏感性上界，不进入最高置信下界。

## Agent 碰过代码，不代表整个 PR 都是 Agent 写的

另外七个已合入 PR 能看到高置信 Agent commit，但也出现了普通账号提交。例如：

- `microsoft/onnxruntime#28045` 前四个 commit 的 author 是 Copilot，后续八个 commit 来自普通账号；
- `open-metadata/OpenMetadata#25243` 有四个 Copilot commit，随后发生了较长的人类修改链；
- `OpenHands/software-agent-sdk#2614` 由 Agent 入口发起，但当前 commit 历史里同时有 Agent、GitHub Actions 和普通账号。

这些 PR 的最终增删行只能说“Agent 参与过”，暂时不能按整包代码归给 AI。下一轮需要逐行追踪哪些 Agent 初始代码保留到了最终版本。

## 普通账号的公开声明

完整 PR body 里还找到了普通账号主动声明 AI 参与的案例。已合入样本中有三个完整生成声明：

- `OpenHands/software-agent-sdk#3427` 明确写明 PR 由 OpenHands Agent 代表用户创建；
- `agno-agi/agno#9635` 勾选“整个 PR 由 AI 生成”；
- `agno-agi/agno#9693` 使用同一声明。

它们进入“公开披露范围”，不进入最高置信 Agent-only。普通账号的自我声明能证明公开归因，不能证明每一行都没有人工改写。

## 这轮推翻了哪些旧判断

### 未勾选模板不再算 AI 披露

上一版正则会把 PR 模板中的 `- [ ] AI-generated` 当成披露。Hugging Face TRL 的多个 PR 因此被误判。新规则先删除所有未勾选选项，再识别明确声明。

“如果存在 AI 代码，作者已经逐行检查”也不是存在 AI 代码的肯定陈述。Pydantic AI 模板中的这类条件句已经排除。

### commit endpoint 成功不代表列表完整

四个未合入 PR 的 GraphQL commit 总数与 REST commit 行数不一致：

- 两个 open PR 在两次采集之间继续发生变化；
- `activepieces/activepieces#13548` 有 1,605 个 commit，REST endpoint 只返回 250 个；
- `NVIDIA/Megatron-LM#4523` 有 501 个 commit，同样只返回 250 个。

它们没有进入已合入代码估计，也不会被判成 Agent-only。以后报告 endpoint 完整度时，要把“请求成功”和“commit 归因完整”分开。

## 结果稳不稳

还不稳。最高置信 Agent-only 只有三个样本 PR，仓库内 bootstrap 的 95% 区间为：

- 已合入 PR 占比：0%—0.83%；
- 最终新增行占比：0%—0.40%；
- 最终增删行占比：0%—0.37%。

区间下界为零，说明当前样本只能证明“公开可见比例很低”，还不能给出稳定的小数点后数字。

另一个检查是极大 PR。已合入 PR 的增删行 p99 约为 8,297 行。把每个 PR 的代码量截到 p99 后，Agent-only 增删行占比从 0.12% 变成 0.14%，方向没有被单个超大 PR 推翻。

## 现在能回答什么

第一轮支持三点：

- 公开可归因的 Agent commit 已经存在，但在头部样本的已合入代码中仍然很少；
- Agent 参与过代码的 PR 比完整 Agent-only 多约三倍，协作中的修改和接管比“一次生成直接合入”更常见；
- 公开 GitHub 身份只能看到 Agent 工作的一小部分。这个实验测到的是可审计的来源，不是实际 AI 使用率。

## Patch lineage 已经补到哪一步

严格 `agent_touched` 的 10 个已合入 PR 已经完成逐案复核和 patch lineage。九个案例可逐行追踪；Mooncake 的 Agent 署名只出现在双父 merge commit，退出逐行分母。结果见 `collaboration-patch-lineage-findings.md`。

还缺两项：

1. 对普通账号主动披露 AI 生成的另外 4 个候选继续做 case review；
2. 在 10 个深挖仓库中做全年 census，验证每仓库 20 条线程的稀有事件估计是否稳定。

外部报告仍只能写“公开证据下界”和 10 个案例中的协作路径，不宜写“今年有 X% 的开源代码由 AI 完全生成”。
