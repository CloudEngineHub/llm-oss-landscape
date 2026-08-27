# GitHub 生态数据来源与可用性说明

> 数据核验时间：2026-08-23。ClickHouse 数字来自 `opensource` 数据库当前快照；外部事实以 GitHub、GH Archive 和 OpenDigger 公开资料为准。

## 给团队的结论

当前 ClickHouse 的 `opensource.events` 不能被解释为“GitHub 全量历史数据库”。其中 `from_api=0` 的 GitHub 数据主要是 GH Archive 对 GitHub 公共 Activity Events API 的小时级归档经结构化清洗后的结果；`from_api=1` 则是针对部分仓库调用 GitHub API 补采并转换到同一事件结构中的数据。公共 Events 流从 2025 年 5 月开始出现持续性缺失，2025 年 10 月又发生短期近乎断流和 payload 大幅裁剪，2026 年 Star、PR 等事件的缺失进一步加重。因此，全域数据仍适合观察长期基线、项目发现、相对趋势和开发者关系，但不应再直接用于声称精确的 Star 增长、PR 总量或全网绝对贡献量。对于通过 antoss/GitHub App 获得账号权限的仓库，可以绕过公共事件流，通过仓库级 REST/GraphQL API 补采 Issue、PR、评论、Review 和部分 Star 明细，仍可开展接近全量的内部项目分析。数据库还包含开发者画像、地理位置、企业与基金会标签、依赖关系、Issue/PR 语义标注和代码 Diff 等数据，它们仍有独立价值，但使用时需要标明其来源是否继承了事件日志缺口。

## GH Archive 的数据到底来自哪里

2015 年以来，GH Archive 采集的是 GitHub REST API 中的公共事件时间线：

```text
GitHub Activity Events API
GET https://api.github.com/events
              |
              v
GH Archive 定时轮询并保存原始 JSON
按小时生成 YYYY-MM-DD-H.json.gz
              |
              v
OpenDigger 解析和结构化
opensource.events, from_api = 0
```

GH Archive 自己的说明和采集器代码都明确写明：2011-2014 年来自已经废弃的 Timeline API；2015 年起来自 Events API，采集器定期轮询 `/events` 并归档原始响应，本身不做额外加工。[GH Archive](https://www.gharchive.org/)、[Crawler README](https://github.com/igrigorik/gharchive.org/tree/master/crawler)

这和日常使用的仓库级 API 不是同一种数据面：

| 数据接口 | 数据形态 | 覆盖范围 | 主要限制 |
| --- | --- | --- | --- |
| Activity Events API `/events` | 全站公共活动的滚动事件流 | 所有公开仓库，但不是完整数据库 | 最多返回 300 条事件，只保留近 30 天，延迟可能为 30 秒至 6 小时；漏过后无法从该接口补回 |
| 仓库级 REST API | Issue、PR、Commit、Release、Stargazer 等资源对象 | 单个仓库 | 需要逐仓库分页查询，受权限和速率限制 |
| GraphQL API | 按实体关系查询仓库资源 | 有权限的仓库 | 受节点、查询复杂度和权限限制，不提供全站历史事件流 |
| Webhook | GitHub 主动推送新事件 | 安装 GitHub App 或配置 Webhook 的仓库 | 只能覆盖授权后的未来事件，不能获得全网事件 |

GitHub 官方对 Events API 的定义也是“站内 Activity Stream”，并明确说明时间线最多包含 300 条、仅覆盖近 30 天，且该接口不面向实时场景。[GitHub Events API](https://docs.github.com/en/rest/activity/events)

因此，GH Archive 的价值在于把一个短暂的公共滚动窗口持续保存成历史，而不是从 GitHub 获得了一份官方全量日志。只要 GitHub 返回的事件不完整、缓存未刷新，或者 GH Archive 采集器没有及时取到某一页，缺失就会永久进入后续数据集。

## 缺失是怎样发生的

### 1. 公共事件流本身没有完整性承诺

GH Archive 的 crawler 当前只不断请求 `/events` 的最新响应并依靠事件 ID 去重。GitHub 公开接口每页最多 100 条、总时间线最多 300 条；在事件产生速度高于刷新或翻页速度时，旧事件可能在被采集前滑出窗口。GitHub 对该接口也没有提供全量性、顺序性或可回放承诺。

早在 2023 年，GH Archive 就有人报告过一个真实案例：某个 PR 的 `opened` 事件、对应 Issue 事件和多条评论在 GitHub 页面存在，但没有进入应出现的小时归档。[GH Archive #294](https://github.com/igrigorik/gharchive.org/issues/294)

### 2. 2025 年 5 月后出现系统性下降

GH Archive 社区从 2025-05-23 起观察到事件总量明显下降。OpenDigger 在 2026 年 6 月的缺失修复讨论中将 2025-05 视为断点，估计此后日志总量、Push 和 PR 等宏观计数整体缺失约 40%，活跃开发者和活跃仓库等去重指标缺失约 15%。这些比例是 OpenDigger 当前的模型估计，不是 GitHub 给出的官方完整率，应作为修复参考而非确定真值。[GH Archive #310](https://github.com/igrigorik/gharchive.org/issues/310)、[OpenDigger #1787](https://github.com/X-lab2017/open-digger/issues/1787)

### 3. 2025 年 10 月发生近乎断流

GH Archive BigQuery 的日事件量在 2025-10-08 为 2,769,429 条，10 月 9 日和 10 日分别只剩 18,906 和 18,864 条，下降约 99.3%。社区转述的 GitHub Support 回复确认，当时 Events API 新引入的缓存导致部分用户持续收到陈旧事件，GitHub 随后临时关闭了该缓存。断流期间没有被采集到的事件无法事后从公共 Events API 完整恢复。[GH Archive #312](https://github.com/igrigorik/gharchive.org/issues/312)

### 4. 2025 年 10 月起 payload 被正式裁剪

GitHub 在 2025-10-07 正式缩减 Activity Events API payload：PushEvent 不再提供 commit 摘要和数量；PullRequestEvent 移除一批需要额外数据库查询的字段；PR、Issue、Review、Comment 等事件的 `author_association` 也被移除。GitHub 的解释是详细字段仍可通过仓库级 REST API 单独查询，但 GH Archive 不会自动替每条事件再次调用这些接口。[GitHub Changelog](https://github.blog/changelog/2025-08-08-upcoming-changes-to-github-events-api-payloads/)

ClickHouse 中的字段填充率清楚反映了这次变化：

| 日志字段 | 2025-09 | 2025-10 | 2025-11 起 |
| --- | ---: | ---: | ---: |
| PushEvent `push_size` 有值 | 99.87% | 31.15% | 0% |
| PushEvent commit message 数组有值 | 99.87% | 31.15% | 0% |
| PullRequestEvent `body` 有值 | 78.00% | 32.11% | 0% |
| PullRequestEvent `pull_additions` 有值 | 96.66% | 39.79% | 0% |

这意味着表结构中的列仍然存在，但 2025 年 11 月后的 GH Archive 日志已经无法提供这些内容。分析代码如果只检查“有没有这一列”，会得到错误的可用性判断。

### 5. 2026 年 Star 和 PR 事件出现选择性坍缩

以下数字来自 ClickHouse `opensource.events`，限定 `platform='GitHub' AND from_api=0`。先以 2025-04 作为公共事件流系统性下降前的最后一个完整月，与核验时最新的完整月 2026-07 对比：

| 事件 | 2025-04 | 2026-07 | 变化 | 在当月日志中的占比变化 |
| --- | ---: | ---: | ---: | ---: |
| 全部 GitHub 日志 | 137,344,607 | 113,744,888 | -17.2% | - |
| WatchEvent | 5,965,504 | 79,895 | **-98.7%** | 4.34% -> 0.07% |
| PullRequestEvent | 10,564,376 | 333,048 | **-96.8%** | 7.69% -> 0.29% |
| PushEvent | 104,380,746 | 112,891,188 | **+8.2%** | 76.00% -> 99.25% |

事件总量只下降了约 17%，但 WatchEvent 和 PullRequestEvent 几乎消失，PushEvent 占比升至 99.25%。这说明近期公共事件流不是等比例抽样，不能用简单的统一放大系数修复所有事件类型。

为了排除不同月份可能带来的季节性影响，再对比 2025 年 7 月和 2026 年 7 月：

| 事件 | 2025-07 | 2026-07 | 同比变化 | 在当月日志中的占比变化 |
| --- | ---: | ---: | ---: | ---: |
| 全部 GitHub 日志 | 96,210,906 | 113,744,888 | **+18.2%** | - |
| WatchEvent | 4,104,820 | 79,895 | **-98.1%** | 4.27% -> 0.07% |
| PullRequestEvent | 8,147,910 | 333,048 | **-95.9%** | 8.47% -> 0.29% |
| PushEvent | 71,747,586 | 112,891,188 | **+57.3%** | 74.57% -> 99.25% |

同月同比下，GitHub 日志总量增加了 18.2%，WatchEvent 和 PullRequestEvent 却分别减少 98.1% 和 95.9%，而 PushEvent 增加 57.3%。因此，这一变化不能由月份差异或日志整体缩量解释，事件类型之间的缺失程度明显不同。需要注意的是，2025-07 已处于 2025 年 5 月之后的缺失期，不能视为完整真值；这组同比数据说明的是 2026 年选择性缺失在已有缺口上进一步加重。

GH Archive 社区还使用仍可访问时的 Stargazers API 对两个仓库做过逐月核验：`google/osv.dev` 和 `facebook/stylex` 的 WatchEvent 捕获率在早期约为 95%-100%，2025 年 6 月后持续下降，2026 年 2 月后多个月只有 0%-21%。这是小样本验证，但与 ClickHouse 的全局事件结构变化方向一致。[GH Archive #320](https://github.com/igrigorik/gharchive.org/issues/320)

## Stargazer API 并不是“全部关闭”

需要对团队使用更精确的表述：

- GitHub 仍在公开仓库元数据中提供当前 `stargazers_count`，所以今天有多少 Star 仍可查询。
- 2026 年 6 月 30 日以后，`/repos/{owner}/{repo}/stargazers` 这一“列出谁在什么时间 Star”的接口和对应 UI 被限制为仓库管理员或协作者访问。普通用户对不受自己管理的公共仓库可能收到空结果、403 或 404。[GitHub Changelog](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/)
- 因此，对无权限的公共仓库，无法再通过官方 API 回溯每一颗 Star 的 `starred_at`；如果过去没有保存明细或定期快照，只能依赖残缺的 WatchEvent、既有第三方存量或从现在开始记录总数快照。
- 对账号有管理员/协作者权限的仓库，Stargazer 明细仍可能访问。2026-08-23 实测，同一个本地 GitHub 凭证访问 `inclusionAI/AReaL` 可以返回 `starred_at`，访问无权限的 `facebook/react` 返回 404；两个仓库的当前 `stargazers_count` 都仍能通过仓库元数据 API 获取。

## ClickHouse 目前仍然有什么价值

### 全域公共数据仍适合做什么

1. **历史基线和长期结构研究**：2015 年至 2025 年 5 月前的数据仍是难以替代的公共事件历史，可用于项目生命周期、开发者迁移、组织协作和技术生态演化研究。
2. **项目发现和方向性趋势**：近期数据仍能发现活跃仓库、Push 活动和部分新事件，但结果应标注为“观测到的公共事件”，不能解释为全量。
3. **开发者关系和社区结构**：去重后的开发者、仓库和协作网络对随机缺失相对更稳健，但 2025 年 5 月后仍应做断点修正和多源交叉验证。
4. **OpenRank 等综合指标**：仍可用于趋势和相对比较，但近期值会继承日志缺失。OpenDigger 给出的实验估计是，在 40% 随机日志缺失下，OpenRank 整体缺失约 13.3%，头部仓库约 8.3%；当前缺失并非完全随机，因此不能把这一数字当作所有仓库的固定误差上限。

### 有账号权限的仓库可以做得更完整

`opensource.events` 有明确的 `from_api` 字段：`0` 表示日志采集，`1` 表示 API 采集。数据库中还有 `github_app_repo_list`，当前包含 3,171 个仓库和 62 个 GitHub App installation；其中包括 `antgroup` 71 个仓库、`inclusionAI` 66 个仓库，Issue/PR 游标最近更新到 2026-08-22 至 23 日。

这类仓库可以通过仓库级 API 补采并持续更新：

- Issue、PR 的创建、关闭、合并、作者、Assignee、Label 和正文；
- Issue/PR Comment、Review、Review Comment 和 Reaction；
- PR commit 数、增删行数、changed files、合入者和分支信息；
- 在权限允许时获取 Stargazer 账号和 `starred_at`；
- 结合 Webhook 或定期 API 同步，建立授权之后更完整的增量历史。

当前 API 补采数据也保留了公共 Events payload 已经删除的字段。例如，`from_api=1` 的 `antgroup` PR 数据中，97.31% 的记录仍有 additions 信息；`inclusionAI` 为 98.02%。这部分适合项目内部治理、社区运营和精确贡献分析，但不能直接外推为全 GitHub 的完整率。

### 其他仍可使用的数据资产

截至 2026-08-23，`opensource` 数据库当前可见的主要资产包括：

| 数据 | 当前规模 | 主要用途 |
| --- | ---: | --- |
| `events` | 92.25 亿行、13 类事件 | 历史事件、协作网络、趋势发现；需区分 `from_api` |
| `global_openrank` | 2.07 亿行 | 项目和开发者影响力趋势 |
| `community_openrank` | 4.32 亿行 | 社区内贡献影响力和开发者结构 |
| `gh_user_info` | 5,649 万行 | GitHub 用户画像、公司、Location 等 |
| `location_info` | 58.33 万行 | 国家、地区和城市归一化 |
| `labels` / `flatten_labels` | 5,682 个标签、31,220 个映射 | 企业、基金会、技术、项目和社区分类 |
| `issue_info` / `pull_info` | 309.65 万 / 230.04 万行 | Issue/PR 语义与质量分析 |
| `pull_diff` | 1,338.80 万行 | PR 代码变更内容和语言分析 |
| `repo_dependencies` | 4,839.51 万行 | 包依赖、技术采用和上下游关系 |

这些表不是全部独立于 GH Archive。OpenRank、参与者和一部分 Issue/PR 派生指标会继承事件缺失；用户画像、标签、地理位置、API 补采的仓库资源以及依赖数据有不同的数据来源和更新链路，应该分别说明。

## 建议统一采用的分析口径

1. 所有结果都标注 `from_api=0`、`from_api=1` 或混合来源，混合时先按事件或资源 ID 去重。
2. 将 2025-05、2025-10 和 2026-02 设为数据质量断点；跨断点比较优先看事件类型占比、活跃实体和多源一致性，不直接比较绝对行数。
3. `WatchEvent` 只能作为 Star 发现信号，2025 年 5 月后不能作为准确 Star 增长；对无权限仓库从现在开始定期保存 `stargazers_count` 快照。
4. 2025 年 11 月后的公共 PushEvent 不再用于 commit message、commit 数量分析；公共 PullRequestEvent 不再用于正文、增删行数和 changed files 分析。
5. 对 antoss 已授权仓库建立 API/Webhook 优先链路，用 GitHub App 权限补齐 Issue、PR、Review、Comment、Star 和仓库元数据，并保存每日快照。
6. 为公共事件流建立月度质量监控：总事件量、各事件类型占比、字段填充率、与授权仓库 API 真值的捕获率，以及异常小时文件数量。

对外材料中建议使用这样的表述：**数据覆盖 GitHub 公共事件历史，并对部分授权仓库进行 API 补采；2025 年 5 月后 GitHub 公共 Events API 出现系统性缺失和字段裁剪，因此近期全域指标用于趋势观察，不代表平台全量。授权仓库的 Issue、PR、评论、Review 等指标由仓库级 API 补充，可用于更精确的项目分析。**
