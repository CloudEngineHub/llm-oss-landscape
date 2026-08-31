# Top 100 的协作流量与发版节奏

数据截止 2026-08-29。Issue / PR 统计都使用冻结的当前 Top 100；历史对照使用每年相同的 1 月 1 日至 8 月 29 日窗口。

## 今年的 PR 流入明显高于 Issue

窗口内约有 346,585 条 Issue 和 599,870 条 PR，PR 是 Issue 的 1.73 倍。这个关系不是一开始就固定如此：月度比值从 1 月的 1.35 上升到 8 月前 29 天的 2.10。

PR 多不等于 Agent 写了更多代码。这里包括人类提交、依赖更新、release 自动化和其他 Bot；GitHub 的总量数据无法拆出 AI 生成代码。

## 流量和未解决量都不是平均分布

Issue 流入最高的五个仓库是 Claude Code、OpenClaw、Hermes Agent、OpenCode 和 Codex，合计占 54.5%。PR 流入最高的五个仓库是 OpenClaw、Hermes Agent、PyTorch、SGLang 和 OpenCode，合计占 34.7%。两组 Top 5 是分别计算的。这个分布说明 Top 100 总量很容易受少数超活跃仓库影响，而且 Issue 比 PR 更集中。Agent applications 贡献了最多 Issue；Model infrastructure 的 PR 是 Issue 的 3.98 倍，Agent runtime infrastructure 是 3.09 倍。

截至观察日，2026 cohort 中 27.1% 的 Issue、20.7% 的 PR 仍未解决。这个口径不包含 2025 年及以前的历史 backlog。

## 固定 cohort 显示增长主要发生在 PR

为了排除新仓库陆续创建带来的样本进入效应，我们从当前冻结的 Top 100 中，机械筛出在 2024 年 1 月 1 日或之前已经公开的 53 个仓库，并在每一年比较同一个 1 月 1 日至 8 月 29 日窗口。2025 到 2026 年，Issue 从 72,072 变为 67,967（-5.7%），PR 从 124,314 增至 243,837（+96.1%）。这 53 个仓库不是人工挑选的，也不是 2024 年当时的 Top 53；它仍然带有“今天还能进入 Top 100”的幸存者偏差。

增长并不均匀，LiteLLM、vLLM、n8n 和 PyTorch 贡献了较大的 PR 增量。可以稳妥地说变更流正在变重；这组数据还不能把变化归因给 coding Agent。

## 有些仓库几乎每天都在自动生成 GitHub Release

2026 年 1 月 1 日至 8 月 29 日共 241 天，98/100 个仓库在这个窗口内发布过非 draft GitHub Release。release day 指至少出现一条这类记录的 UTC 日期。仓库的 release day 中位数是 34 天，四分位区间是 15—102 天；6 个仓库达到 180 天以上。

release records 使用同一个 2026 年窗口，不是仓库历史累计值。Vercel AI 的 14,974 条记录落在 192 个日期；llama.cpp 的 2,002 条记录落在 241 天中的 239 天。这样的频率主要反映自动化发布流水线，不能直接解释成人工产品发版节奏。tag-only、PyPI、npm 和其他 registry 不在此口径内。

## 数据复核

- 固定窗口面板：500 个 repository-year 行；
- 月度面板：800 个 repository-month 行；
- 两个面板的 2026 年 500 个关键计数单元格完全一致；
- 同日独立重复采集的 2,500 个计数单元格中，差异为 0；
- GitHub Search 会发生索引回填，报告正文应使用约数，不把绝对数写到个位。
