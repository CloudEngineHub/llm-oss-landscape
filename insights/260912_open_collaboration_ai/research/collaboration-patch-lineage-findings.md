# Agent 的第一版代码，最后留下了多少

版本：2026-08-30。可用于 online report 的小样本案例研究。

## 先说结论

我们把概率样本里 10 个“高置信 Agent 碰过代码、并且已经合入”的 PR 全部拿出来，逐个重放 commit。九个 PR 可以追踪文字行；Mooncake 的 Agent 署名只出现在一笔双父 merge commit 上，不能把合并进来的上游代码当作 Agent 代码，因此保留案例、退出逐行分母。

九个可追踪案例的第一笔有效 Agent patch 一共新增 1,225 个文字行：

| 最终去向 | 行数 | 占第一笔 Agent patch |
| --- | ---: | ---: |
| 原样留在 PR 最终 head | 765 | 62.4% |
| 被后续人类账号 commit 改写或删除 | 123 | 10.0% |
| 被 Agent 后续 commit 自己改写或删除 | 193 | 15.8% |
| 被无法解析 GitHub 作者的 commit 改写或删除 | 144 | 11.8% |

这个总数不能直接推广到所有开源 PR。样本只有九个，而且 ONNX Runtime 一个案例就贡献了 611 / 1,225 行。它回答的是这九条公开提交链里发生了什么，不是“Agent 代码平均有 62.4% 会保留”。

## 真正值得看的，是三种交接方式

### 1. Agent 先写，人类随后提交代码：5 个

这五个 PR 的第一笔 Agent patch 共 753 行，最终原样保留 610 行；123 行第一次被后续人类账号改写或删除，另外 20 行先被 Agent 自己改掉。

- 按行合并：原样保留 81.0%，人类改写 16.3%；
- 按案例看：原样保留率中位数 70.5%，人类改写率中位数 27.3%；
- 五个案例的保留率从 0% 到 100%，差异比平均数更重要。

这说明“人类接管”不等于把 Agent 的代码推倒重来。人类 commit 经常是在现有 patch 周围补测试、改接口或继续扩展；但 OpenHands 和 OpenMetadata 也展示了更重的重写链。

### 2. 代码 commit 都由 Agent 继续完成：3 个

- `vercel/ai#18818`：第一笔 172 行在后续 Agent 版本中全部被替换；
- `mlflow/mlflow#21621`：第一笔有效 patch 的 33 行全部原样保留；
- `mlflow/mlflow#22659`：5 行中保留 4 行，1 行由 Agent 自己修改。

所以，哪怕 PR 最终仍是 Agent-only，第一版也可能经历完整重写。只看最终 diff，会把 Agent 自己的迭代过程抹掉。

### 3. 后续 commit 作者无法解析：1 个

`mlflow/mlflow#19721` 的第一笔 Claude patch 有 262 行，最终原样保留 118 行；另外 144 行被没有可解析 GitHub author 的后续 commit 改掉。这里不能诚实地写成“人类重写”，只能保留为 unknown。

## 九个可追踪案例

| PR | 第一笔有效 Agent patch | 原样保留 | 人类改写 | Agent 自改 | 无法归因 | 路径 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `vercel/ai#18818` | 172 | 0 | 0 | 172 | 0 | Agent 持续迭代 |
| `warpdotdev/warp#13382` | 44 | 31 | 12 | 1 | 0 | Agent → 人类 |
| `open-metadata/OpenMetadata#25243` | 62 | 21 | 29 | 12 | 0 | Agent → 人类 |
| `microsoft/onnxruntime#28045` | 611 | 533 | 78 | 0 | 0 | Agent → 人类 |
| `OpenHands/software-agent-sdk#2614` | 11 | 0 | 4 | 7 | 0 | Agent → 人类 |
| `mlflow/mlflow#19721` | 262 | 118 | 0 | 0 | 144 | Agent → 无法归因 |
| `mlflow/mlflow#21621` | 33 | 33 | 0 | 0 | 0 | Agent 持续迭代 |
| `mlflow/mlflow#22355` | 25 | 25 | 0 | 0 | 0 | Agent → 人类 |
| `mlflow/mlflow#22659` | 5 | 4 | 0 | 1 | 0 | Agent 持续迭代 |

另一个案例 `kvcache-ai/Mooncake#2686` 不进入上表。Copilot 署名的第二笔 commit 有两个父节点；GitHub commit 页面按第一父节点显示 +5,992 / -1,732，而整个 PR 的最终 diff 只有 +10 / -10。这正好说明“署名给 Agent 的 commit 代码量”不等于“Agent 实际生成的代码量”。

## 怎么算的

1. 候选池固定为 `collaboration-agent-code-attribution-2026.csv` 中 `merged=true`、严格 `agent_touched=true` 的 10 个 PR，不再另外挑好看的案例；
2. Coding Agent 账号沿用 actor registry 的高置信身份。`OpenHands#2614` 和 `warp#13382` 额外保存了 PR 内服务别名的逐案说明；
3. “第一笔 Agent patch”不是第一笔 Agent SHA。Copilot 经常先提交一个没有代码的 `Initial plan`，因此从第一笔真正增加文字行的 Agent commit 开始；
4. 每个新增文字行得到一个 lineage token。后续 commit 如果原样保留该行，token 继续传递；第一次改写或删除时，按照该 commit 的公开作者身份记为 human、Agent、automation 或 unknown；
5. Git blame 用来复核重复行的精确来源；二进制和非 UTF-8 文件不进入文字行分母；
6. `source`、测试、文档、配置和其他文件分别保留在文件级结果中。本轮 1,225 行里有 1,091 行属于 source 文件。

## 这组结果不能证明什么

- GitHub User 账号可能在本地使用 Cursor、Claude Code 或 Copilot。这里的“人类账号改写”只表示公开 commit 身份，不表示代码一定由人手写；
- 精确文字行保留不是语义贡献。改一个函数名可能改变整段含义，新增测试也可能比保留实现更有价值；
- 这 10 个 PR 来自公开可归因的稀有案例，不是随机抽出的全部 AI 辅助 PR；
- force-push、merge commit 和缺失 author 会削弱可追踪性。Mooncake 因此被排除在逐行分母外；
- 小样本适合展示协作路径，不适合估计总体因果效果。

## 可复算文件

- `collaboration-patch-lineage-candidates-2026.csv`：10 个候选、纳入状态和别名说明；
- `collaboration-patch-lineage-cases-2026.csv`：每个 PR 的路径与去向汇总；
- `collaboration-patch-lineage-files-2026.csv`：每个文件、文件类型的去向；
- `collaboration-patch-lineage-2026-run.json`：本轮口径、合计、警告；
- `scripts/analyze_collaboration_patch_lineage.py`：从冻结输入重新抓取 Git 对象并复算。
