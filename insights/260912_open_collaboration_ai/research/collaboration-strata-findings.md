# 不同类型仓库的 Agent marker 与协作模式比较

这里把每个仓库的 50 条线程压成一个仓库级比例，再比较仓库类型。每个仓库的样本量相同，不再按仓库总流量加权。

## 先说结论

在同时检验的 26 个比较中，经过多重比较修正后，5 个差异仍达到 q < 0.05。最值得继续解释的不是单个百分比，而是这些差异是否在更深的 10 仓库时间线研究中仍然成立。

## 目前信号最强的差异

- **人类账号参与 review / technical_area**：agent_application 为 37.9%，model_infra 为 63.4%，相差 25.49 个百分点；p=0.0001，BH 校正后 q=0.0013。
- **人类账号参与 review / llm_identity**：llm_native 为 45.9%，traditional 为 69.2%，相差 23.24 个百分点；p=0.0019，BH 校正后 q=0.0247。
- **回复只有自动化账号 / technical_area**：model_infra 为 16.8%，agent_framework 为 30.7%，相差 13.83 个百分点；p=0.0058，BH 校正后 q=0.0251。
- **存在可见 review / technical_area**：agent_application 为 57.4%，agent_runtime_infra 为 76.5%，相差 19.1 个百分点；p=0.0053，BH 校正后 q=0.0251。
- **回复只有自动化账号 / llm_identity**：traditional 为 11.0%，llm_native 为 26.2%，相差 15.24 个百分点；p=0.0047，BH 校正后 q=0.0306。
- **Agent 发起线程 / technical_area**：agent_runtime_infra 为 0.0%，agent_framework 为 5.1%，相差 5.14 个百分点；p=0.0330，BH 校正后 q=0.1072。
- **Agent 参与线程 / llm_identity**：traditional 为 28.1%，mixed 为 56.3%，相差 28.17 个百分点；p=0.0346，BH 校正后 q=0.1499。
- **仓库存在 Agent 指令文件 / llm_identity**：traditional 为 72.2%，mixed 为 100.0%，相差 27.78 个百分点；p=0.0574，BH 校正后 q=0.1865。

## 怎么理解

- `Agent marker` 只说明仓库公开了供 Agent 使用的指令或配置，不等于这些 Agent 已经在 Issue、PR 中实际工作。
- `Agent 参与线程` 来自公开可识别的 Bot、GitHub App 或明确的 Agent 账号。开发者私下使用 Cursor、Claude Code、Codex 后仍以普通账号提交，GitHub 公共数据看不出来，因此这是可见参与率的下界。
- 显著性检验以仓库为独立单位，并在每个比较维度内做 Benjamini-Hochberg 修正。它能减少把随机波动说成结论的风险，但不能替代因果识别。
- mixed 组只有 14 个仓库，部分技术领域更小。方向性差异需要由 10 个代表仓库的阶段对比继续验证。
