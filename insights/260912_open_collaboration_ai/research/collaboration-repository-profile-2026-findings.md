# Top 100 仓库的 2026 年协作画像

数据截止到 2026 年 8 月 29 日。这个文件保留仓库级采集口径。页面上的 Top 100 画像只说明样本的技术角色、项目身份、创建时间和语言；Issue / PR 流量与发版节奏已经拆成独立 insight，详见 `collaboration-activity-flow-findings.md`。参与人数本轮不展示。

## 为什么不用 Release 总数

100 个仓库在窗口内一共有 27,775 条 GitHub Release。这个数字不适合放在页面上。Vercel AI 一家就有 14,974 条，主要来自多包和 canary 自动发布；llama.cpp 也有 2,002 条。总量更像发布流水线的事件量，不像读者理解的“发了多少版本”。

独立 insight 使用 release day 分布：98 个仓库今年至少发布过一次 GitHub Release；按 UTC 日期去重，仓库中位数是 34 个 release days，四分位区间是 15—102 天。这个指标仍然看不到只打 tag、只发 PyPI/npm 或在其他发布系统中完成的版本。

## 为什么暂不展示参与人数

此前的 `participants_2607` 只覆盖 7 月可见事件，而且受回填影响，不能代表仓库参与者规模。这次改为在同一个 2026 年窗口里重新计算两组公开账号：

- `push_actors`：在 `PushEvent` 中出现的不同账号；
- `collaboration_actors`：在 Issue、PR、评论和 review 事件中出现的不同账号。

Push actor 是推送者，不一定是 commit 作者；两组人可以重叠；公开事件里也有 Bot 和 App。它不适合在样本画像中直接写成“贡献者 / 参与者”，本轮页面先不展示。

## 贡献政策怎么分

先读取 GitHub 的 `has_pull_requests` 和 `pull_request_creation_policy`，再冻结并扫描 README、CONTRIBUTING、GOVERNANCE 和 PR template。所有疑似限制贡献的文本都做人工复核。

- 48 个仓库明确邀请外部贡献；
- 12 个要求先开 Issue、先取得共识，或只接受限定范围的修改；
- 38 个没有检测到限制性政策；
- Codex 和 Claude Code 两个仓库把 PR 创建权限设为 collaborators only。

“没有检测到限制性政策”不是“明确欢迎贡献”。Mastra 是 Issue-first 的直接例子；Open WebUI 对首次贡献者使用同样的门槛，但本地化修改除外。DeepSeek Harness 不在 Top 100 分母里，它作为对照案例保留：核心代码以 MIT 发布，核心 Issue 和 PR 关闭，外部开发被引向插件。

## 可复算文件

- `collaboration-repository-month-2026.csv`：Issue、PR 月度新流入与同 cohort backlog；
- `collaboration-repository-fixed-window-2022-2026.csv`：历史同窗口和固定 cohort 对照；
- `collaboration-activity-flow-findings.md`：页面独立 insight 的主要结果；
- `collaboration-contribution-policies-reviewed-260829.csv`：贡献政策分类和逐仓库证据；
- `collaboration-repository-profile-2026.csv`：actor 和 GitHub Release 的逐仓库结果；
- `collaboration-repository-profile-2026-run.json`：窗口、定义、请求量和限制；
- `scripts/collect_collaboration_repository_profile_2026.py`：可重复执行的采集脚本。
