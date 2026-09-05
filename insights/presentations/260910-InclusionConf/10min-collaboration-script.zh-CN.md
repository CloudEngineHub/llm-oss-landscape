# 《Agent 进入开源协作之后》15 分钟演讲稿

对应页面：`/presentations/260910_inclusion/present`

说明：文件名沿用历史命名，内容已按当前 12 页 PPT 更新为 15 分钟版本。

## 01｜开场（00:50）

大家好，我是夏小雅，来自蚂蚁开源。

今天这 15 分钟，我想把 Agentic AI 放回开源协作的现场来看。过去一年，大家看到很多 Agent 产品、模型基础设施和开发者工具长出来。它们让写代码、改代码、跑任务变得更容易。

但开源项目不止有代码。仓库里还有 Issue、PR、Review、验证、合入，以及长期维护。我们这次看的是：Agent 进入这些公开协作记录之后，项目里的工作到底发生了什么变化。

我会先从两张 landscape 开始，看技术生态往哪里长；然后进入仓库，看这些新增的代码请求有没有被同样快地处理掉。

## 02｜Agent Infra 全景（02:05）

操作：先展示完整 Agent Infra；讲完第一段后按下一页，显示应用层趋势；再按下一页，显示 Runtime 趋势。

这是 2026 年这版 Agent Infra Landscape。84 个项目放在同一张图里，现场不用逐个点名，重点是看它们在技术链路里的位置。

最上面是应用层，比如 coding agent、个人助手、聊天工作区；中间是 framework 和编排；下面是 runtime，包含上下文、协议、工具调用、沙箱和可观测评估。这个结构说明，Agent 生态正在从入口工具往完整任务链延伸。

先按一下，看第一个趋势。

当前最强的活跃信号仍然在应用层。7 月 OpenRank 里，Agent Application 贡献了 55%。这不奇怪，应用层最容易被用户感知，也最容易形成传播。Coding Agent 和个人助手，是这批项目里最容易被开发者直接试用的方向。

再按一下，看第二个趋势。

我更在意的是图的下半部分。Runtime 这一层虽然没有应用层那么热闹，却在快速变密。上下文、协议、工具调用、沙箱和证据这几类项目连在一起，才让 Agent 的一次任务更像可运行的工程。

换句话说，Agent Infra 的问题已经进入任务执行这一层。一个 Agent 不能只会生成答案，它还要知道自己拿到了什么上下文，调用了哪个系统，动作有没有边界，结果能不能被检查。这个趋势会直接影响后面的开源协作：代码进入仓库以后，也需要类似的规则、证据和责任边界。

## 03｜Model Infra 全景（01:05）

操作：先展示完整 Model Infra；讲完第一段后按下一页，显示重点观察。

第二张是 Model Infra。它和 Agent Infra 的气质很不一样。这里很少是一批新项目突然冒出来，更多是已有模型系统继续往工程深处走。

这张图里一共有 59 个项目。Serving 是最集中的部分，7 月 OpenRank 占到 44%。vLLM、SGLang、Ollama、FlashInfer 这些项目背后，其实都在回答一个很具体的问题：模型怎样在更高并发、更低延迟、更复杂调用里稳定跑起来。

按一下之后，重点会落在 Serving。Agent 频繁调用模型以后，模型基础设施就不能只看单次推理。上下文变长、工具调用变多、任务链路变复杂，最后都会回到 serving、调度、缓存、推理效率这些老问题上。

所以这两张 landscape 合在一起看，Agent Infra 在补任务链，Model Infra 在补承载能力。一个靠近工作流，一个靠近底层性能。

## 04｜语言分布作为过渡（00:50）

全景图看完以后，我想用语言分布做一个过渡。

Agent 产品更偏 TypeScript，Model Infra 仍然以 Python 为主。在 GitHub 主语言里，Agent Infra 有 33 个 TypeScript 项目；Model Infra 有 33 个 Python 项目。

这背后更像是项目位置的差异。Agent 产品贴近 IDE、浏览器、前端工作流和 SaaS 集成，TypeScript 自然会多起来。Model Infra 继续围着训练、推理、模型服务和 Python 生态展开。

下一页开始看仓库协作：当这些工具、代码和 Agent 工作流真的进入公共项目，仓库里的 Issue、PR 和 Review 会发生什么变化。

## 05｜先说清楚样本和入口（00:45）

从这里开始，我们离开 landscape，进入具体仓库。

后半部分的分析从 Agentic AI Top 100 仓库开始。我们先检查 2026 年 1 月到 8 月公开入口里的 Issue 和 PR；后面再用同一批固定仓库做年度对比，并抽样 5,000 条线程，看 Agent 在协作链路里出现在哪里。

这一页先不做对比，只把今年进入仓库的工作量列出来：新开 Issue 是 349.8K，新开 PR 是 606.7K。

这个数字的量级已经很大了。Issue 更像问题、需求和讨论；PR 更接近具体代码改动。先记住这两个数：35 万左右的问题入口，60 万以上的代码入口。

接下来我们再看它们在时间上怎么变化。

## 06｜PR 的流入速度快过 Issue（01:10）

这一页看月度节奏。

年初的时候，PR 和 Issue 的比例大概是 1.35。到 8 月，这个比例来到 2.1 左右。中间有波动，但方向很清楚：进入仓库的新增工作，越来越多落在代码这一侧。

这件事对维护者的压力是不一样的。Issue 可以先讨论、归类、关闭；PR 需要看代码、跑验证、判断方向，还要决定要不要合进主线。

所以当 PR 比 Issue 增长得更快时，仓库里的变化已经超过“消息更多了”。更麻烦的是，更多工作直接进入 Review 和合入判断。

这也是下一页的重点：代码请求变多以后，项目有没有同样快地处理它们。

## 07｜PR 数量上来了，处理速度没有跟上（01:40）

这一页左边是同一批仓库的年度 PR 流入。2024 年是 97.8K，2025 年是 129.6K，到了 2026 年变成 265.4K。和去年同期相比，同一批仓库收到的 PR 增长了 105%。

如果只看左边，故事会很乐观：更多人、更多工具、更多代码进入项目。

但右边的处理结果没有同步变好。未处理 PR 的净增，从 2025 年的 +4.5K 变成 2026 年的 +42.8K，差不多扩大了 10 倍。90 天后仍然开放的比例，从 5.5% 到 11.3%，也接近翻倍。

还有两个更接近维护者日常的指标。维护者 7 天内响应的比例，从 37.1% 降到 31.1%。仓库中位 90 天合入率，从 77.0% 降到 68.4%。

所以这里真正值得讲的是处理压力。代码供给变快了，项目消化这些代码的速度没有跟上。Review、验证、方向判断和合入，开始成为更明显的瓶颈。

## 08｜仓库入口开始分层（01:25）

到了这里，我们再看仓库自己是怎么设置入口的。

100 个高活跃仓库里，92 个已经在默认分支上写了 Agent instruction、工具目录或者相关配置。也就是说，大多数项目已经在告诉 Agent：你进来以后该怎么工作。

贡献入口要分开看。这里有 48 个仓库明确邀请外部贡献；12 个要求先开 Issue、先获得项目方同意，或只接受指定类型的贡献；38 个没有检测到明显限制；还有 2 个把创建 PR 限定给 collaborators。

这 12 个仓库分别是 OpenViking、Mastra、Pydantic AI、Gemini CLI、Omnigent、CopilotKit、CC Switch、marimo、Phoenix、goose、Open WebUI 和 LiveKit Agents。现场可以挑下面三个例子来讲，不必逐个念名单：

- **Mastra** 对所有代码贡献都要求先讨论。README 原文是：“If you are a developer and would like to contribute with code, please open an issue to discuss before opening a Pull Request.” 也就是先用 Issue 确认这项代码改动是否值得做，再开 PR。([原文](https://github.com/mastra-ai/mastra/blob/75dd419e613fe9c39f846ffc500716141b74fda6/README.md#L86))
- **OpenViking** 限定的是会改变公共语义或持久化行为的修改。CONTRIBUTING 原文先写：“Open an issue or start a discussion before implementing a change that affects:”，下面列出的第一类是“public REST, SDK, CLI, MCP, or configuration semantics”。它没有拦住所有贡献，公共接口这类影响面较大的改动需要先讨论。([原文](https://github.com/volcengine/OpenViking/blob/cd8580c6f8a50ec44593618b3102799ab0b553fd/CONTRIBUTING.md#L55-L60))
- **Gemini CLI** 明确保留了一部分只供维护者处理的 Issue。CONTRIBUTING 原文是：“If an issue is tagged as `🔒Maintainers only`, this means it is reserved for project maintainers. We will not accept pull requests related to these issues.” 外部贡献者可以提交 PR，但不能认领带有 `Maintainers only` 标签的工作。([原文](https://github.com/google-gemini/gemini-cli/blob/0bd1d439751478771c45d3d0895a6a9760554bf4/CONTRIBUTING.md#L218-L220))

更靠近 Agent 入口的项目，开始主动限制传统的协作入口。DeepSeek Harness 只开放 Discussion，关闭 Issue 和 PR；Codex 和 Claude Code 启用了只有仓库协作者才能创建 PR 的功能。

这里不能只用“开放”或“封闭”概括。一个项目可以开放代码，也可以谨慎管理核心仓库的改动入口。Agentic era 里，贡献到底意味着什么，好的协作是什么，社区由什么组成，这些问题会重新浮出来。

## 09｜Agent 一般出现在协作途中（01:25）

这一页看 GitHub 公开记录里的账号角色。

我们把一条公开协作链分成四个位置：谁发起工作，谁参与回应，谁参与 Review，谁执行最后的关闭或合入动作。

结果很清楚。Agent 很少出现在开头。5,000 条样本里，由可识别 Agent 或 App 直接打开的线程只有 87 条，大约 1.7%。最后的状态动作里，Agent 的比例也很低。

Agent 更常出现在中间。回应、讨论、triage、Review 这些位置，是它的主要公开痕迹。尤其在 PR Review 里，Agent / App 的出现比例明显高得多。

这也符合很多项目的直觉：发起需求、决定是否接受一个改动，仍然主要由人类账号完成。Agent 更像是在协作途中补充信息、提出修改、参与判断，很少直接代表项目做最后决定。

这里还有一个口径要说明：我们只数 GitHub 公开记录里能识别出来的 Agent 或 App。开发者在本地用 Codex、Claude Code、Cursor，然后用自己的账号提交，这类情况不会被算进 Agent 列。

## 10｜Agent Review 能不能推动修改（01:25）

我们把每条已 Review 的 PR 按时间排列，找到第一次正式 Review，再看后面有没有新 commit。

再按第一次正式 Review 由谁完成来分组。具名 Agent 或 App 首先 Review 的 1,249 条 PR 中，有 834 条后续又有 commit，占 66.8%；GitHub User 首先 Review 的 1,111 条 PR 中，有 457 条继续提交，占 41.1%。两组相差 25.7 个百分点。其余 161 条的第一次 reviewer 是常规自动化或无法归类的账号，没有放进比较。

再看一组更明确的 Review：161 条 PR 收到过 `CHANGES_REQUESTED`，其中 123 条随后又有 commit，占 76.4%。由 Agent 提出修改要求的是 17 条，其中 13 条继续提交，占 76.5%；由 GitHub User 提出修改要求的是 137 条，其中 106 条继续提交，占 77.4%。两组几乎一样。

Agent Review 已经进入真实的修改循环。第一次 reviewer 是 Agent 的 PR，后续提交更多；当 Review 明确指出需要改什么，Agent 和 GitHub User 推动下一轮提交的比例几乎一样。

下一页再看这些反复修改的代码，最后有多少真正留在了仓库里。

## 11｜第一笔 Agent patch 最后怎样了（01:35）

操作：这一页有三个案例，用翻页笔继续向下翻，不用鼠标点。第一次显示 MLflow，第二次显示 ONNX Runtime，第三次显示 Vercel AI SDK。切换案例时，左侧总体数据保持不动，只有右侧案例更新。

我们追踪了 10 条 Agent 改过代码、最后已经合并的 PR。其中 9 条可以还原行级历史。

第一笔 Agent patch 一共有 1,225 行。合入版本里，765 行原样保留，占 62.4%；123 行后来由人类账号修改；193 行由后续 Agent 修改；还有 144 行作者无法确定。

先看第一个例子，MLflow #21621。第一笔 Agent patch 有 33 行，合入时 33 行全部原样保留，没有被人类或后续 Agent 改写。Agent 给出的第一版完整进入了最终版本。

按下一页。

第二个例子是 ONNX Runtime #28045。第一笔 Agent patch 有 611 行，合入时 533 行原样保留，另外 78 行后来由人类账号修改。代码大部分保留下来，也经过了人的后续调整。

再按下一页。

第三个例子是 Vercel AI SDK #18818。最初 172 行全部被后续 Agent commit 替换。这个例子展示的是另一条路径：Agent 先给出一版，再由后续 Agent 继续修改，直到进入最终版本。

所以这页我想带走的结论是：Agent 写的代码不会一次性贴进仓库就结束。它可能被保留，也可能被人改掉，也可能被 Agent 后续重写。开源协作真正关心的是，它在 Review 和修订之后能不能进入一个项目愿意维护的状态。

## 12｜结尾（00:45）

最后收回来。

公开记录里的 Agent patch 正在增多，Agent Review 也已经进入真实的修改循环。第一次正式 Review 来自 Agent 的 PR，66.8% 后续继续提交；Agent 第一笔 patch 也有六成左右能原样保留到合入版本。

但另一边也很明显。PR 增长更快，维护者响应变慢，未处理队列变长。Agent 很少发起工作，也很少执行最后的关闭或合入动作。它更多出现在协作途中。

所以 Agentic AI 对开源协作带来的问题，会继续往后走：这些代码进入仓库后，谁来 Review，谁来验证，谁来做最终判断，谁愿意长期维护。

Agentic era 里，贡献可能不再只是一段 patch。好的协作也不等于更快地产生改动，它还要让项目能判断哪些改动值得留下，并且有足够的人和规则继续维护它们。

谢谢大家。
