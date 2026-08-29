# 不同类型仓库的 Agent marker 与协作模式比较

这里先把每个仓库的 20 条线程压成一个仓库级比例，再比较仓库类型。这样做是为了避免 PyTorch 一类大仓库因为线程总量大，就在统计上拥有几十倍于小仓库的话语权。

## 先说结论

在同时检验的 26 个比较中，经过多重比较修正后，3 个差异仍达到 q < 0.05。最值得继续解释的不是单个百分比，而是这些差异是否在更深的 10 仓库时间线研究中仍然成立。

## 目前信号最强的差异

- **人类账号参与 review / technical_area**：agent_application 为 37.6%，model_infra 为 64.2%，相差 26.59 个百分点；p=0.0002，BH 校正后 q=0.0026。
- **人类账号参与 review / llm_identity**：llm_native 为 45.7%，traditional 为 69.8%，相差 24.12 个百分点；p=0.0020，BH 校正后 q=0.0260。
- **回复只有自动化账号 / llm_identity**：traditional 为 10.0%，llm_native 为 25.5%，相差 15.51 个百分点；p=0.0056，BH 校正后 q=0.0364。
- **回复只有自动化账号 / technical_area**：model_infra 为 16.0%，agent_framework 为 29.3%，相差 13.31 个百分点；p=0.0104，BH 校正后 q=0.0676。
- **存在可见 review / technical_area**：agent_application 为 57.1%，model_infra 为 75.4%，相差 18.39 个百分点；p=0.0170，BH 校正后 q=0.0737。
- **Agent 发起线程 / technical_area**：agent_runtime_infra 为 0.0%，agent_framework 为 4.0%，相差 4.05 个百分点；p=0.0243，BH 校正后 q=0.0790。
- **Agent 参与线程 / llm_identity**：traditional 为 28.6%，mixed 为 57.5%，相差 28.89 个百分点；p=0.0280，BH 校正后 q=0.1213。
- **仓库存在 Agent 指令文件 / llm_identity**：traditional 为 72.2%，mixed 为 100.0%，相差 27.78 个百分点；p=0.0574，BH 校正后 q=0.1504。

## 怎么理解

- `Agent marker` 只说明仓库公开了供 Agent 使用的指令或配置，不等于这些 Agent 已经在 Issue、PR 中实际工作。
- `Agent 参与线程` 来自公开可识别的 Bot、GitHub App 或明确的 Agent 账号。开发者私下使用 Cursor、Claude Code、Codex 后仍以普通账号提交，GitHub 公共数据看不出来，因此这是可见参与率的下界。
- 显著性检验以仓库为独立单位，并在每个比较维度内做 Benjamini-Hochberg 修正。它能减少把随机波动说成结论的风险，但不能替代因果识别。
- mixed 组只有 14 个仓库，部分技术领域更小。方向性差异需要由 10 个代表仓库的阶段对比继续验证。
