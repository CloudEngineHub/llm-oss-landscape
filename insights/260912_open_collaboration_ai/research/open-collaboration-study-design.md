# Agent 参与之后，开源协作发生了什么？

## 研究设计

版本：2026-08-26 working design
研究对象：Agentic AI 开源项目与传统软件仓库对照组
公开输出：260910 在线研究报告、五分钟 Open Infrastructure keynote、十分钟 InclusionConf 分享

## 我们真正要回答的问题

Agent 已经进入写代码、处理 Issue、提交 PR 和执行测试的流程。代码产出增加，并不自动等于协作效率提高。维护者可能收到更多改动，也可能需要花更多时间判断这些改动是否正确、是否值得合并，以及出了问题以后由谁负责。

这项研究的核心问题是：

> AI 进入软件开发流程以后，它提高了协作效率，还是主要增加了代码产出，并把更多判断压力留给维护者？

这里的“协作效率”不能只用 commit 或 PR 数量代替。我们至少要同时看到贡献进入、审查过程、合并结果和维护者负担。

## 研究问题

### RQ1 · 产出增加在哪里

Agentic AI 项目是否产生更多 PR、Issue 和 commit？增长来自核心团队、外部贡献者、机器人，还是能够被公开证据确认的 AI agent？

需要的数据：

- repository-month 的 PR、Issue、commit 数量；
- 作者类型与首次贡献时间；
- PR 改动行数、文件数和类型；
- bot、automation 与明确 AI agent 的分层标记。

单独回答这个问题只能说明“产出发生了什么”，不能说明协作变好了。

### RQ2 · 外部贡献能否真正进入项目

公开代码、允许提交 PR、接受外部贡献和发展开放生态是不同选择。Agentic AI 项目的外部 PR 接受率、首次贡献者合并率和重复贡献率，与对照组有何差异？

需要的数据：

- 首次贡献者 PR 数量与合并率；
- 外部贡献者从第一次 PR 到第二次 PR 的留存；
- 关闭但未合并的 PR 及关闭理由；
- Issue、PR、Discussion 是否开放；
- CONTRIBUTING、CLA、贡献模板和公开路线图是否存在。

### RQ3 · 评审速度是否以更多维护者判断为代价

PR 更快关闭，可能是更快合并，也可能是批量拒绝。需要把首次响应、首次有效 review、修改轮次、合并时间和关闭结果放在一起。

需要的数据：

- time to first response；
- time to first review；
- time to merge / close；
- review comments、change requests 和 force-push 次数；
- 合并前 revision rounds；
- 无人工 review 的直接合并比例。

### RQ4 · 维护者负担如何变化

维护者是否在处理更多 PR？判断是否集中在少数人身上？自动化是否减少了机械工作，却增加了架构、安全和产品判断？

需要的数据：

- 每位 reviewer 每月处理的 PR 数；
- top 1 / top 5 reviewer share；
- reviewer Gini coefficient；
- 每个合并 PR 的人工 review 数与评论量；
- stale PR、reopen、revert 和 follow-up fix；
- 维护者在 Issue 与 PR 中的响应时间分布。

### RQ5 · 协作是否离开了 GitHub 的传统界面

有些项目公开仓库，却关闭 Issue 或不以 PR 为主要入口；协作可能转向插件市场、Discord、企业内部流程或下游仓库。研究需要记录协作表面，而不是把空白的 Issue/PR 页面直接解释为“没有社区”。

需要的数据：

- GitHub Issue、PR、Discussion 的启用状态；
- README 指向的贡献入口；
- plugin、skill、extension 或 marketplace 仓库；
- 外部社区链接和治理文件；
- 核心仓库与生态仓库之间的贡献分布。

### RQ6 · 机器可读规则是否改变贡献过程

AGENTS.md、CLAUDE.md、copilot-instructions、skill 或 repository instruction 是否与更低的失败率、更短的修改链条或更高的首次贡献合并率有关？

这个问题只能证明相关性。规则较完善的项目通常也有更成熟的维护团队，需要在模型中控制项目规模、年龄和维护者数量。

## 样本

### Agentic AI cohort

样本从 `data/agentic-ai-projects.csv` 产生，并保留纳入快照。进入实证样本的仓库需要满足：

1. 2024 年 1 月 1 日以后创建；
2. 与大语言模型或 agent 执行流程有直接工程关系；
3. 公开 GitHub 仓库可取得 Issue、PR、commit 和 contributor 记录；
4. 观察期内没有完全迁移或归档；
5. 排除只存放论文、模型权重列表或静态资料的仓库。

目标规模约 100 个仓库。最终数量由数据完整性决定，不能为了凑整而放宽定义。

### Traditional software controls

对照组从传统开发工具、云原生基础设施、数据库、可观测与开源应用中选择。每个 Agentic AI 仓库匹配一个或多个对照仓库，至少控制：

- 主要语言；
- 组织或个人所有者；
- 观察窗口开始时的 Stars 区间；
- 活跃贡献者数量；
- PR intake；
- 仓库年龄与治理成熟度。

传统项目不需要与 Agentic 项目同一天创建。比较使用等长的生命周期窗口，并另做同一自然月的稳健性检验，避免把生态年份差异误当成 Agent 效应。

## 观察窗口

主分析使用两个视角：

1. **Lifecycle view**：比较项目进入可观测协作阶段后的前 180 天；
2. **Calendar view**：在相同自然月比较活动规模相近的仓库。

对于发布前长期私有、一次性导入大量历史 commit 的仓库，需要用第一个公开 release、Issue 或 PR 活动重新确定协作起点，并保留判断依据。

## 身份与归因

不得根据代码风格、提交速度或账号名称推测某个 PR 由 AI 生成。

| 标记 | 允许使用的证据 |
| --- | --- |
| Confirmed AI agent | PR、commit、账号说明或项目文档明确说明由 agent 生成或提交 |
| Automation / bot | GitHub bot 类型、已知自动化账号或公开 workflow 证据 |
| Human account | 普通用户账号，且没有公开 AI 归因证据 |
| Unknown | 证据不足，保留未知，不强行分类 |

“Human account”只描述公开账号类型，不表示代码一定完全由人手写。

## 指标表

| 维度 | 主指标 | 必须同时展示的边界 |
| --- | --- | --- |
| Intake | opened PRs per repository-month | 仓库规模与观察期 |
| Acceptance | merged / closed external PRs | draft、bot 与 core team 分层 |
| Responsiveness | median time to first human response | P25/P75 与无人响应比例 |
| Review work | human reviews and revision rounds per PR | PR size 与文件类型 |
| Throughput | merged PRs per active maintainer | 不能用 close 数代替 merge |
| Contributor entry | first-time contributor merge rate | retained second contribution |
| Concentration | top-5 reviewer share and Gini | reviewer 总人数 |
| Quality aftermath | revert / follow-up fix within 30 days | 只能作为近似信号 |
| Collaboration surface | Issue/PR/Discussion and external entry points | 关闭功能不等于没有社区 |

所有中心趋势优先报告 median、IQR 和分布。Stars、OpenRank 和总量可以帮助描述样本，但不能代替协作结果。

## 分析方法

1. 保存样本纳入表和排除理由；
2. 为每个仓库生成统一的 repository-month、PR 和 contributor 表；
3. 在匹配前展示两组原始分布；
4. 用语言、所有者类型、起始 Stars、活跃贡献者与 PR intake 做匹配；
5. 对匹配后样本报告平衡性；
6. 主结果同时给出 absolute difference、ratio 与不确定性区间；
7. 对超大项目、新发布项目和关闭 Issue/PR 的项目做敏感性分析；
8. 用案例解释分布中的异常，不用案例代替总体结果。

## DeepSeek Harness case file

DeepSeek Harness 适合作为入口案例，因为它能把几个经常被混在一起的问题拆开：

- 代码是否公开；
- 外部贡献入口是否开放；
- 核心开发是否通过 Issue 和 PR 可见；
- 插件或扩展生态是否允许第三方参与；
- 发布热度是否已经转化为持续协作。

当前可以确认的是，它创建时间很新，发布期关注度高，尚没有完整月 OpenRank。Issue、PR、贡献规则和生态入口需要按固定 case schema 留存截图、API 快照和核对日期，不能凭一次页面观察直接下结论。

## Case schema

每个案例至少保存：

- repository and snapshot date；
- creation、first release、first Issue、first PR；
- Issue / PR / Discussion settings；
- CONTRIBUTING、governance、code owners 与 agent instructions；
- first-time contributor path；
- 一个合并案例、一个关闭案例及 review 时间线；
- 公开代码、外部贡献和生态扩展三项分别判断；
- 证据链接与无法确认的部分。

## 研究边界

- GitHub 数据看不到企业内部的开发流程；
- 公开账号无法可靠揭示 AI 辅助程度；
- Agentic AI 项目年轻，删失和发布期效应会很强；
- Stars 和 OpenRank描述关注与社区活动，不证明生产采用；
- 快速关闭可能表示高效处理，也可能表示拒绝外部贡献；
- revert 和 follow-up fix 只能近似描述后续质量问题。

报告必须让读者看到这些边界，而不是把它们留在附录里。
