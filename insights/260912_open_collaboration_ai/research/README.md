# 开源协作研究：从这里开始读

这个目录既有给人读的研究结论，也有供脚本复算的明细数据。不要按文件名从头翻。

## 先读这六份

1. **[实验到底怎么做的](how-the-study-was-run.md)**
   100 个仓库、2,000 条线程和 10 个深挖仓库分别怎么选，`线程`、`加权 PR`、`Agent marker` 分别是什么意思。

2. **[研究问题与证据矩阵](research-question-evidence-matrix.md)**
   用户提出的四个问题，当前回答到哪一步，哪些只是关联，哪些仍缺证据。

3. **[今年有多少合入代码可以公开归因给 Agent](collaboration-agent-code-findings.md)**
   直接回答 Agent commit、Agent-only PR 和最终新增行的公开证据下界，也列出误判修正和仍然缺失的 patch lineage。

4. **[不同类型仓库的比较](collaboration-strata-findings.md)**
   LLM-native、mixed、traditional，以及 Agent Application、Framework、Runtime Infra、Model Infra 是否存在显著差异。

5. **[10 个仓库的阶段变化](collaboration-deep-stage-findings.md)**
   同一仓库从 launch、2025 年末到 2026 年当前怎样变化；LangChain、Coder、PyTorch 等项目为什么不是同一条路径。

6. **[固定成熟度与长期对照](collaboration-fixed-90d-findings.md)**
   Top 100 与十二个长期软件仓库的 backlog、PR 处理和 merge flag 对照，解释为什么目前不能把效率变化直接归因给 Agent。

要核查纠错过程，再看 **[研究验证记录](collaboration-research-validation-log.md)**。

## 四个问题分别看哪里

| 研究问题 | 目前最有用的材料 |
| --- | --- |
| Agent 被采纳的比例有多高，做什么任务？ | [证据矩阵](research-question-evidence-matrix.md)、[Agent marker 变化](collaboration-agent-markers-260531-260829-findings.md)、`collaboration-agent-observed-tasks-2026.csv` |
| Agent 怎样进入 Issue、PR、review 和迭代？ | [线程结果](collaboration-thread-analysis-2026-findings.md)、[10 仓库阶段研究](collaboration-deep-stage-findings.md) |
| Agent 提高效率，还是增加维护者负担？ | [10 仓库阶段研究](collaboration-deep-stage-findings.md)、[固定成熟度对照](collaboration-fixed-90d-findings.md)、[Agent 结果比较](collaboration-agent-outcome-comparisons-2026-findings.md) |
| 代码变便宜后，什么贡献仍然稀缺？ | [Agent 代码归因实验](collaboration-agent-code-findings.md)、[证据矩阵](research-question-evidence-matrix.md) RQ4 |

## 当前主数据

- 100 个仓库，每仓库 20 条，共 2,000 条线程；
- 100 个仓库都启用 PR；98 个允许所有人创建，Codex 和 Claude Code 仅允许 collaborators 创建；
- 575 条 Issue、1,425 条 PR；
- 50,731 个公开 timeline、review comment 和 PR commit 事件；
- 10 个代表仓库，每仓库三个阶段、每阶段 30 条，共 900 条深挖线程；
- 主样本与深挖样本的 endpoint 请求均成功。Agent 代码归因实验另发现四个未合入 PR 的 commit 列表因持续更新或 250 条上限而不完整，已从 Agent-only 判定中排除。

cuDF 改名错误已经修复：样本和当前数据统一使用 `NVIDIA/cudf`。校验器当前通过。

## 想复算主样本

| 文件 | 作用 |
| --- | --- |
| `collaboration-sample-top100-2607.csv` | 100 个仓库及 LLM / 技术领域人工分类 |
| `collaboration-surfaces-top100-260829.csv` | 100 个仓库的 Issue / Discussion / PR 开关和 PR 创建策略 |
| `collaboration-contribution-policies-reviewed-260829.csv` | API 创建权限、贡献文档与人工复核后的政策分类 |
| `collaboration-thread-sample-2026.csv` | 2,000 条概率样本、抽样概率和权重 |
| `collaboration-thread-events-2026.csv` | GitHub timeline |
| `collaboration-thread-review-comments-2026.csv` | PR inline review comment |
| `collaboration-thread-pr-commits-2026.csv` | 带时间的 PR commit |
| `collaboration-actor-registry-2026.csv` | 参与者身份、Agent 角色和证据 |
| `collaboration-thread-analysis-2026.csv` | 每条线程的派生指标 |
| `collaboration-thread-analysis-2026-summary.csv` | 总体、仓库等权和分类汇总 |
| `collaboration-thread-estimates-bootstrap-2026.csv` | 仓库内 bootstrap 区间 |
| `collaboration-pr-code-metadata-2026.csv` | 1,425 个样本 PR 的最终增删行、commit 总数和完整披露检查 |
| `collaboration-agent-code-attribution-2026.csv` | 每个 PR 的 Agent-only、Agent-human mixed 与公开披露判定 |
| `collaboration-agent-code-estimates-2026.csv` | Agent 代码归因的概率加权估计与 bootstrap 区间 |
| `collaboration-agent-code-key-metrics-2026.csv` | 最需要阅读的五个核心数字 |

校验：

```bash
.venv/bin/python scripts/validate_collaboration_empirical.py
.venv/bin/python scripts/collect_collaboration_pr_code_metadata.py
.venv/bin/python scripts/analyze_collaboration_agent_code.py
```

## 想复算分类比较和深挖

| 文件 | 作用 |
| --- | --- |
| `collaboration-strata-comparison-2026.csv` | 每组仓库级估计与区间 |
| `collaboration-strata-tests-2026.csv` | 仓库级 permutation test 与 BH 修正 |
| `collaboration-deep-repositories-2026.csv` | 10 个仓库和选择理由 |
| `collaboration-deep-thread-sample-2026.csv` | 900 条分阶段概率样本 |
| `collaboration-deep-stage-metrics-2026.csv` | 每个仓库、每个阶段的指标 |
| `collaboration-deep-stage-changes-2026.csv` | 2025 年末到 2026 年当前的仓库内配对比较 |

对应脚本：

```bash
.venv/bin/python scripts/analyze_collaboration_strata.py
.venv/bin/python scripts/analyze_collaboration_deep_stages.py
```

## 证据边界

- `Agent marker` 是仓库里的 Agent 指令或配置，不等于实际使用率。
- GitHub `User` 是账号类型，不等于代码完全由人写。
- 可识别 Agent 参与率看不到开发者未披露的本地 AI 使用，因此是下界。
- `merged=true` 是 GitHub 把关信号，不是跨仓库通用的贡献质量分。
- 100 个仓库是活跃头部跟踪池，不是全部开源生态的随机样本。
- Agent 是否参与不是随机分配。描述性差异和时间变化不能直接写成因果结论。
