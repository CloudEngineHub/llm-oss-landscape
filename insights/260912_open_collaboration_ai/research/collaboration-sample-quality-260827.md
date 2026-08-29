# Top 100 样本质量检查

更新：2026-08-29

## 当前状态

| 检查 | 结果 |
| --- | --- |
| 仓库数 | 100 |
| repo_id / repo_name 唯一 | 100 / 100 |
| rank | 1—100，无重复 |
| OpenRank、创建时间、语言、技术领域 | 100% 完整 |
| GitHub 状态 | 100 个均为 `ok` |
| LLM identity 人工分类 | 68 llm_native、14 mixed、18 traditional |
| 主线程样本 | 每仓库 20 条，共 2,000 条 |
| endpoint 完整性 | timeline 2,000/2,000；review 和 commit 1,425/1,425 |
| 实证校验器 | 通过 |

## 已修复：cuDF 改名造成假零值

第一轮样本使用 `rapidsai/cudf`。仓库已经迁移到 `NVIDIA/cudf`，普通仓库 API 会跳转，GitHub Search 使用旧名称却返回零。它因此被误判为“没有活动”，主样本少了 20 条。

当前数据已统一使用 `NVIDIA/cudf`，重新采集月度计数、固定成熟度 cohort、线程、timeline、review 和 commit。修正后是 100 个仓库、2,000 条线程，不能再引用旧的 99 / 1,980。

## 仍需长期注意

### 每仓库 20 条不是单仓库结论

20 条是覆盖 100 个仓库和 API 成本之间的取舍，适合估计整体分布，不适合给某个仓库排名或下定论。项目差异另用 10 个代表仓库、三个阶段、每阶段 30 条的深挖设计回答。

### OpenRank 选择的是活跃头部

这 100 个仓库来自完整跟踪池中 2026 年 7 月 OpenRank 最高的项目，不是全部开源软件的随机样本。结果只能描述活跃头部跟踪池。

### 大仓库会拉动总体加权结果

报告同时给出仓库等权和按总体活动量加权结果。前者回答“典型仓库怎样”，后者回答“全部公开活动放在一起怎样”。不能选择更符合预期的一种。

### 当前不再保留 Landscape sensitivity sample

入图是编辑选择，不是新的实验总体。额外的 Landscape-only Top 100 会让主样本和版面选择混在一起，已经从设计和生成脚本移除。

## 可复现命令

```bash
.venv/bin/python scripts/build_open_collaboration_sample.py
.venv/bin/python scripts/validate_collaboration_empirical.py
```
