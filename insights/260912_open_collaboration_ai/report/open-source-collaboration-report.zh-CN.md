# Agent 时代的开源协作

[English version](open-source-collaboration-report.en.md) · 蚂蚁开源与 InclusionAI 联合出品 · 2026 年 9 月

这份报告从 143 个全景图项目、100 个高活跃仓库和 5,000 条公开 Issue / PR 出发，观察 Agent 正在怎样进入开源软件。项目全景图正在补齐 Runtime、工具、隔离和可追溯性；在 GitHub 上，Agent 很少发起工作，却已经大量进入评审、讨论、分流和修改代码的环节，而合并、关闭或重新打开线程的最后一个公开动作，绝大多数仍由 GitHub User 账号完成。

这其实是同一个系统问题的两面。执行任务时，Agent 会编写和运行代码、临时取得权限，并留下可能比进程存活更久的外部影响；进入仓库后，它需要阅读贡献规则、修改补丁并回应评审。开放基础设施约束前一种行动，开源协作决定后一种变化是否值得由社区长期承担。

## 摘要

**基础设施正在追赶已经形成的应用需求。** Application 占 Agent Infra 7 月 OpenRank 的 55%；相较 5 月 tracking pool 新纳入的 23 个 Agent Infra 项目中，13 个属于 Runtime。新增项目正在补齐上下文、互操作、工具控制和执行环境。

**仓库已经开始为 Agent 准备贡献入口，但 Agent 很少发起工作。** Top 100 中有 92 个仓库发布了 coding-agent 文件或目录。在 5,000 条抽样线程中，只有 87 条由具名 Agent 账号或 App 发起，但 2,158 条出现了 Agent。Agent 的公开痕迹主要发生在工作进入仓库之后：评审、讨论、分流和代码修改。

**Agent 活动和工作队列一起增长，维护者注意力没有同步增长。** 在同一组 10 个仓库中，2026 年同期进入的 Issue / PR 比 2025 年增长 165%，维护者 7 天内响应率却从 42.9% 降至 20.0%，30 天 Issue 关闭率和 PR 合并率也同时下降。在更大的 5,000 条线程样本中，88.5% 的最后一个解决动作仍由 GitHub User 账号完成。

## 研究范围

- 2026 年 5 月 tracking pool：227 个仓库；
- 当前 canonical project list：277 个仓库；
- 当前 Agent Infra 与 Model Infra 全景图：143 个项目；
- Agent Infra：84 个；Model Infra：59 个；
- 当前入选但不在 5 月 tracking pool 中：31 个。

这些数字定义了全景图分析的项目范围。协作分析则从其中选取 7 月 OpenRank 最高的 100 个仓库，并进一步构造不同的分析样本。

---

# 01 · Landscape 与 Open Infrastructure

全景图是本研究的起点。它先回答开源工作正在聚集在哪里，再进一步讨论 Agent 对生产基础设施提出了什么要求，以及它如何改变开发协作。Agent Infra 覆盖应用、开发框架和 Agent 完成任务时使用的 Runtime；Model Infra 覆盖模型服务、训练、数据和计算。

## 01A · 当前全景图

### 应用承载了最多活跃度，Runtime 正在快速补齐

当前全景图包括 84 个 Agent Infra 项目和 59 个 Model Infra 项目。Application 占 Agent Infra 7 月 OpenRank 的 55%，而 Runtime 占 5 月 tracking pool 之外 23 个 Agent Infra 项目中的 13 个。Model Infra 更成熟、以 Python 为主，其中 Serving 占 7 月 OpenRank 的 44%。

### 图 01 · Agent Infra 与 Model Infra Landscape 2026

| 全景图 | 入选项目 | 创建于 2025 年或之后 | 7 月 OpenRank 前五 |
| --- | ---: | ---: | --- |
| Agent Infra | 84 | 46（55%） | OpenClaw · Hermes Agent · Deer Flow · Lark CLI · OpenViking |
| Model Infra | 59 | 10（17%） | PyTorch · SGLang · vLLM · Ollama · FlashInfer |

交互式报告提供两张完整全景图，可以查看每个仓库的分区、GitHub 元数据和 7 月 OpenRank。这里的入选代表项目通过了本报告对相应生态位置的编辑与活跃度审查，不等同于生产采用证明。

## 01B · 全景图中的信号

### Application 仍然最活跃，新增项目更多出现在 Runtime

自 5 月以来，持续的生态发现把 tracking pool 从 227 个仓库扩展到 277 个。Agent Infra 中，32 个 Application 项目贡献 55% 的 7 月 OpenRank；31 个 Runtime 项目贡献 22%。新增项目则更集中在下层：23 个 5 月池外的 Agent Infra 项目中，Runtime 有 13 个，Application 有 7 个，Framework 有 3 个。

项目先通过活跃度发现和定向 GitHub 搜索进入 tracking pool，再由编辑复核决定是否进入发布版全景图。因此，“不在 5 月池中”表示本次研究覆盖范围有所扩展，既可能是新项目，也可能是后来被纳入研究的老项目。

### 图 02 · 各层项目数量与 7 月 OpenRank

| Agent Infra 层 | 项目数 | 项目占比 | 7 月 OpenRank | OpenRank 占比 | 不在 5 月池中 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Application | 32 | 38% | 2,057.8 | 55% | 7 |
| Framework | 21 | 25% | 859.5 | 23% | 3 |
| Runtime | 31 | 37% | 832.5 | 22% | 13 |

| Model Infra 层 | 项目数 | 项目占比 | 7 月 OpenRank | OpenRank 占比 | 不在 5 月池中 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serving | 15 | 25% | 1,229.9 | 44% | 3 |
| Pre-Train | 18 | 31% | 868.8 | 31% | 1 |
| Data | 13 | 22% | 369.4 | 13% | 1 |
| Compute | 4 | 7% | 158.9 | 6% | 0 |
| Post-Train | 9 | 15% | 140.2 | 5% | 3 |

Serving 与 Pre-Train 合计占 Model Infra 7 月 OpenRank 的 75%。Model Infra 虽然更成熟，但推理服务仍然承载着最集中的系统工程活动。

### Coding 是委托式软件工作的第一个大规模试验场

当前全景图包含 14 个 Agentic coding 项目和 8 个 coding workflow / harness 项目，是最大的应用集群。代码工作给 Agent 提供了明确的工作区、可执行测试、可见 diff 和评审路径，形成了其他 Agent 场景很少具备的完整反馈回路。

相邻的 Runtime 项目说明 coding 只是入口：9 个项目负责 memory、knowledge 或 context，8 个负责 protocol 与 interoperability，6 个负责 tool、web 或 computer use，4 个提供 development sandbox，另有 4 个负责 observability 与 evaluation。Agent 能修改代码之后，系统还要决定它可以读取什么、调用什么、在哪里运行，以及任务结束后留下什么证据。

### 图 03 · Coding 入口及其相邻 Runtime

| 全景图分区 | 层 | 入选项目 |
| --- | --- | ---: |
| Agentic coding | Application | 14 |
| Coding workflows & harnesses | Application | 8 |
| Memory, knowledge & context | Runtime | 9 |
| Protocols & interoperability | Runtime | 8 |
| Tools, web & computer use | Runtime | 6 |
| Development sandboxes | Runtime | 4 |
| Observability & evaluation | Runtime | 4 |

### 活跃度增长正在出现在工具、上下文和推理效率周围

### 图 04 · 4 月至 7 月 OpenRank 增长前六

| 项目 | 分区 | 4 月 | 7 月 | 增长 |
| --- | --- | ---: | ---: | ---: |
| Lark CLI | Tools, web & computer use | 95.47 | 179.37 | +83.90 |
| OpenViking | Memory, knowledge & context | 135.01 | 177.61 | +42.60 |
| DeepSeek Reasonix | Agentic coding | 1.60 | 26.06 | +24.46 |
| FlashInfer | Pre-Train · Compiler & accelerator | 127.11 | 147.83 | +20.72 |
| Orca | Multi-agent orchestration | 13.86 | 29.10 | +15.24 |
| Deer Flow | Multi-agent orchestration | 203.53 | 218.20 | +14.67 |

这里比较的是完整月度 OpenRank 的绝对变化。增长最快的项目并不全部来自最拥挤的类别，工具使用、上下文管理和推理效率都出现了明显活动增量。

### Agent 层很年轻，承接它的基础设施并不年轻

### 图 05 · 入选项目的创建时间

| 全景图 | 创建于 2025 年或之后 | 入选项目 | 占比 |
| --- | ---: | ---: | ---: |
| Agent Infra | 46 | 84 | 55% |
| Model Infra | 10 | 59 | 17% |

Agent 接口和 Runtime 正在这一轮浪潮中形成；模型服务、训练框架、调度器和数据系统则带着多年工程经验进入 Agent stack。新工作负载要求这些成熟系统处理短生命周期代码、委托式工具访问，以及可能比单个进程存活更久的状态。

### Agent 产品更偏 TypeScript，模型基础设施仍以 Python 为主

### 图 06 · GitHub primary language

| 主要语言 | Agent Infra | Model Infra |
| --- | ---: | ---: |
| TypeScript | 33 | 4 |
| Python | 27 | 33 |
| Go | 8 | 5 |
| C++ | 1 | 7 |
| 其他 | 15 | 10 |

这是 GitHub 的仓库级 primary-language 标签。它便于横向比较，但一个多语言仓库仍只会落在 GitHub 标记的单一主要语言下。

### Runtime 项目对应一条完整的 Agent 任务路径

### 图 07 · Agent Runtime 路径

| Runtime 角色 | 项目数 | 示例 |
| --- | ---: | --- |
| Context | 9 | OpenViking, Milvus |
| Interface | 8 | A2UI, MCP Context Forge |
| Action | 6 | Lark CLI, CUA |
| Isolation | 4 | Coder, Agent Sandbox |
| Evidence | 4 | Langfuse, Opik |

一项 Agent 任务会检索上下文、跨过接口、调用工具、在隔离环境中执行，并留下可供检查的证据。沿着这条路径，应用问题逐步变成基础设施责任：上下文需要生命周期，接口需要策略，工具调用需要有限权限，生成代码需要隔离，外部影响需要留下可追溯记录。

## 01C · 开放基础设施

### Agent 执行具有波动性、状态性和外部影响

Agent 可以在任务开始后生成代码，扇出为多次模型和工具调用，暂停、重试并改变外部系统。有的任务很短，有的会等待人或远端服务。平台 token 总量能够证明流量存在，却不能给出单个任务的扇出、峰值并发或 QPS。更稳定的基础设施问题是：当组成任务的进程不断出现和消失时，隔离、权限、预算、状态和证据如何始终绑定在同一个任务上。

### 同一批工作负载也出现在 GitHub 之外

2026 年 8 月 29 日，OpenRouter 公开且自愿归因的全球应用榜 Top 20 中，有 9 个应用能与当前 Agent Infra 全景图直接对应，其中 7 个进入 Top 10。

### 图 08 · GitHub 之外的平台流量

| OpenRouter 排名 | 全景图中的应用 | Agent Infra 分区 | 归因 token |
| ---: | --- | --- | ---: |
| 1 | Hermes Agent | Personal AI assistants | 1.65T |
| 3 | Claude Code | Agentic coding | 485B |
| 4 | pi | Agentic coding | 367B |
| 5 | Kilo Code | Agentic coding | 341B |
| 6 | Cline | Agentic coding | 253B |
| 7 | Codex | Agentic coding | 190B |
| 9 | OpenClaw | Personal AI assistants | 150B |
| 10 | DeepSeek Harness | Coding workflows & harnesses | 125B |
| 18 | OpenHands | Agentic coding | 33.2B |

这个对照为仓库全景图增加了一条独立的使用信号：一批在开源仓库中高度活跃的应用，也在公开平台上产生了可见调用量。

ZenMux 提供了另一个单平台视角。其 2026 年 6 月 1–30 日冻结导出中，使用量前四的模型端点里有三个能够链接到官方公开权重仓库：DeepSeek V4 Pro、GLM 5.2 和 DeepSeek V4 Flash。

| ZenMux 排名 | 模型端点 | 6 月 token | 权重可得性 |
| ---: | --- | ---: | --- |
| 1 | Claude Opus 4.8 | 283.6B | 未找到公开权重 |
| 2 | DeepSeek V4 Pro | 265.2B | 公开权重 |
| 3 | GLM 5.2 | 143.3B | 公开权重 |
| 4 | DeepSeek V4 Flash | 140.9B | 公开权重 |
| 5 | Claude Opus 4.7 | 125.4B | 未找到公开权重 |

OpenRouter 反映 Agent 应用需求，ZenMux 则显示另一个平台上的模型流量中，开放权重模型承担了相当份额。两个平台的 token 不做相加。

### 开放基础设施正在从多个位置承接 Agent 任务

### 图 09 · 围绕任务的开放基础设施项目

| Runtime 任务 | 项目 | 一手材料显示的能力 |
| --- | --- | --- |
| 运行与隔离 | Kubernetes Agent Sandbox；Kata Containers；Confidential Containers | Sandbox 生命周期和 warm pool；VM 级隔离；面向敏感 AI 工作负载的机密计算基础 |
| 协调与运行 | kagent；Dapr Agents；OpenChoreo | Agent 操作 Kubernetes、Prometheus、Istio 和 Argo；durable workflow、状态、重试和 SPIFFE identity；同一平台以不同接口服务人和 Agent |
| 连接与治理 | kgateway；agentgateway；Istio | LLM、MCP 和 Agent 流量的控制面与数据面；service mesh 和 gateway policy 延伸到 AI 工作负载 |
| 追踪与解释 | OpenTelemetry；Jaeger | Agent、workflow 和 execute-tool 语义；成熟 tracing 项目把 UI 与协议层扩展到 Agent 执行路径 |

这些项目并不都以 Agent 为核心定位。Confidential Containers 提供与 AI 相关的隔离基础，Istio 正在把成熟服务网格能力延伸到 AI 流量；Prometheus 和 Argo 出现在 kagent 的工具链中，说明 Agent 正在成为既有基础设施的消费者。

### 生产 Agent 需要一个 task envelope

本报告用 “task envelope” 指一项任务共同拥有并应当共同结束的 identity、budget、environment、state 和 evidence。

| 任务需要 | 已有开放组件 | 仍然存在的接口缺口 |
| --- | --- | --- |
| 创建短生命周期环境 | Agent Sandbox、Kubernetes scheduler、Kueue、DRA | 跨 CPU / GPU、模型和数据局部性的联合 placement |
| 隔离不可信代码 | Kata Containers、Confidential Containers | 根据动作风险选择隔离等级，并保留证明 |
| 取得有限权限 | SPIFFE / SPIRE、service account、gateway policy | 面向单任务、短时、按工具限制的委托 |
| 控制模型与工具成本 | agentgateway、kgateway、service-mesh telemetry | 汇总重试、扇出、模型、工具和 sandbox 的统一预算 |
| 暂停、恢复和重试 | Dapr Agents、workflow state、checkpoint | 带外部副作用任务的幂等恢复和安全取消 |
| 改变外部系统 | OpenTelemetry、Jaeger | 从模型工作、工具执行一直连接到外部结果的完整记录 |

当前组件已经覆盖了大量基础能力，缺口主要出现在任务级的连接处：预算、取消、安全恢复和证据仍然容易停在组件边界。Agent 工作负载也不是简单的“更大流量”，而是短时高峰、并行扇出、等待与重试交织，且错误可能已经改变外部世界。Sandbox 因此不再只是启动一个容器，而是需要可创建、claim、预热、回收并保留审计记录的 Runtime 对象。

---

# 02 · 开源协作

## 02A · Agent 参与

研究首先冻结 277 个 tracking pool 中 7 月 OpenRank 最高的 100 个仓库。OpenRank 只用于确定样本，后续判断不再使用它。每个仓库再根据技术角色和与 LLM 的关系进行人工复核。

人工复核得到 68 个 LLM-native、18 个 traditional 和 14 个 mixed 项目。`mixed` 指仓库仍然保有完整的非 LLM 用途，但 AI 或 Agent 已经成为重要产品表面，例如 n8n、Warp 和 MLflow。这个判断不能简单用创建时间代替：LangChain、Megatron-LM 和 TRL 早于 ChatGPT，却本来就围绕语言模型构建；ComfyUI 与 Apache Gravitino 创建得更晚，核心价值却不依赖 LLM。

### Top 100 是怎样的一组仓库？

| 观察维度 | 分布 |
| --- | --- |
| 技术角色 | 36 Model Infra · 28 Agent Application · 21 Agent Framework · 15 Agent Runtime Infra |
| 项目身份，人工复核 | 68 LLM-native · 18 traditional · 14 mixed |
| 仓库创建时间 | 72 个创建于 2022 年 12 月或之后 · 28 个更早 |
| GitHub primary language | 44 Python · 26 TypeScript · 11 Go · 19 其他 |

这组样本代表 tracking pool 中最活跃的一部分，而不是所有开源项目的普查。仓库规模、发版频率和贡献量都应当在这个范围内理解。

### 本章使用一个仓库框架和六组衍生样本

不同问题需要不同分母。下表先把每组数据的选择方法和用途说明清楚，后面的图表按样本顺序排列。

| 样本 | 如何选择 | 用途 |
| --- | --- | --- |
| Top 100 仓库框架 | 277 个 tracking pool 中 2026 年 7 月 OpenRank 最高的 100 个仓库 | 仓库画像、贡献规则、coding-agent 文件、release 和 2026 年完整 Issue / PR 总量 |
| 固定 53 仓库同期样本 | 当前 Top 100 中在 2024 年 1 月 1 日前已公开的仓库 | 固定成员，比较 2024、2025、2026 年 1–8 月；仍保留 survivor bias |
| 5,000 条仓库平衡样本 | 每个 Top 100 仓库抽取 50 条互不重复、创建于 2026 年 1 月 1 日至 8 月 31 日的 Issue / PR | 具名 Agent 的公开活动、评审、gate、任务类型和修改循环 |
| 代码 lineage 子集 | 抽样中 10 个由高置信 coding Agent 改动代码并已合并的 PR；其中 9 个可以干净追踪行级历史 | 第一版 Agent patch 保留多少，后续由谁修改 |
| 10 仓库 matched panels | 有意覆盖不同年龄、LLM 关系和技术角色的 10 个仓库 | 三个阶段的 900 条生命周期样本，以及跨 2024–2026 的 840 条固定窗口样本 |
| 7 个公开案例 | 4 个来自 5,000 条样本，3 个来自 10 仓库面板；选择公开顺序清楚的线程 | 展示 contributor、Agent、automation 与 maintainer 的具体交接 |
| 12 个长期对照仓库 | Kubernetes、VS Code、Vue、Kata Containers、Prometheus、Envoy、Grafana、Arrow、Rust、pandas、FastAPI、Kafka | 检查 PR 增长和未解决工作是否也出现在成熟的非 Agentic 仓库 |

5,000 条样本保持每个仓库 50 条，不按仓库流量重新加权。这样不会让最大的几个仓库吞掉其余结果，也保证所有 100 个仓库都在统计中留下可比的一段记录。

### PR 正在比 Issue 增长得更快

2026 年 1 月 1 日至 8 月 31 日，Top 100 共开启 349,826 条 Issue 和 606,741 条 PR，平均每条 Issue 对应 1.73 条 PR。月度比值从 1 月的 1.35 上升到完整 8 月的 2.11。

| 月份 | 新开 Issue | 新开 PR | PR / Issue |
| --- | ---: | ---: | ---: |
| 1 月 | 26,320 | 35,540 | 1.35× |
| 2 月 | 35,543 | 50,329 | 1.42× |
| 3 月 | 49,896 | 74,831 | 1.50× |
| 4 月 | 50,167 | 71,173 | 1.42× |
| 5 月 | 44,040 | 78,753 | 1.79× |
| 6 月 | 41,604 | 83,082 | 2.00× |
| 7 月 | 49,274 | 101,482 | 2.06× |
| 8 月 | 52,982 | 111,551 | 2.11× |

固定 53 个仓库之后，变化更明显。这些仓库都在 2024 年 1 月 1 日前已经公开，并且今天仍在 Top 100 中，因此三年比较保持同一组成员。

| 固定 53 仓库 · 1–8 月 | 新开 Issue | 新开 PR | PR / Issue |
| --- | ---: | ---: | ---: |
| 2024 | 53,330 | 97,018 | 1.82× |
| 2025 | 72,302 | 124,712 | 1.72× |
| 2026 | 68,512 | 246,006 | 3.59× |

2025 到 2026 年，固定样本的 PR 增长 97.3%，Issue 则下降 5.2%。进入仓库的公开代码变更明显变重，而不是所有协作流量一起等比例增长。

| 2026 年技术角色 | 仓库 | Issue | 窗口内 Issue 未解决 | PR | 窗口内 PR 未解决 | PR / Issue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent Application | 28 | 251,584 | 24.6% | 264,586 | 21.5% | 1.05× |
| Agent Framework | 21 | 34,321 | 33.2% | 101,575 | 18.8% | 2.96× |
| Agent Runtime Infra | 15 | 15,513 | 28.4% | 47,869 | 13.7% | 3.09× |
| Model Infra | 36 | 48,408 | 35.0% | 192,711 | 23.0% | 3.98× |

这里的 unresolved 只跟踪本研究八个月窗口内开启、截至 8 月 31 日仍未解决的项目，不是仓库全部历史 backlog。Model Infra 的 PR / Issue 比和窗口内 Issue 未解决率最高，显示代码改动的供给和问题消化并不均匀分布在各类仓库中。

### 一部分仓库几乎每天都在发布 GitHub Release

2026 年 1 月 1 日至 8 月 31 日共 243 天。Top 100 中有 98 个仓库至少发布过一次 non-draft GitHub Release。`Release day` 指至少存在一条这类记录的 UTC 日期；中位仓库有 34 个 release day，六个仓库达到 180 天以上。

| 243 天窗口中的 release days | 仓库数 |
| --- | ---: |
| 0 | 2 |
| 1 | 2 |
| 2–9 | 13 |
| 10–29 | 26 |
| 30–89 | 27 |
| 90–179 | 24 |
| 180+ | 6 |

| 仓库 | Release days | GitHub Release records |
| --- | ---: | ---: |
| ggml-org/llama.cpp | 241 / 243 | 2,041 |
| QwenLM/qwen-code | 222 / 243 | 492 |
| openai/codex | 208 / 243 | 681 |
| router-for-me/CLIProxyAPI | 203 / 243 | 440 |
| vercel/ai | 194 / 243 | 15,232 |
| flashinfer-ai/flashinfer | 185 / 243 | 221 |

llama.cpp 在 243 天中的 241 天发布了 GitHub Release。Vercel AI 的 15,232 条记录分布在 194 天，反映 multi-package 与 canary pipeline。这个频率下，release days 更接近自动化交付节奏，而不是偶发的大版本里程碑。仅有 tag、或只发布到 PyPI / npm 等 registry 的版本不在这里。

### 开放协作仍是默认入口

### 图 10 · Top 100 当前协作表面

| 协作表面 | 仓库 |
| --- | ---: |
| Issues 已启用 | 100 / 100 |
| Pull Requests 已启用 | 100 / 100 |
| 任何人可以创建 PR | 98 / 100 |
| 仅 collaborators 可以创建 PR | 2 / 100 |
| Discussions 已启用 | 74 / 100 |
| 找到 CONTRIBUTING | 89 / 100 |
| 找到 Issue template | 95 / 100 |
| 找到 PR template | 84 / 100 |

API 设置、贡献文档和实际结果描述的是三个不同层面：能不能打开 PR、项目希望贡献者怎样参与，以及最终哪些变化被接受。人工检查发现，48 个仓库明确邀请外部贡献，12 个要求先开 Issue、事先取得同意或限定贡献范围，38 个未发现限制性信号；Codex 和 Claude Code 两个仓库保留可见的 Pull Requests，但只允许 collaborators 创建。

Mastra 要求代码贡献者先开 Issue。Open WebUI 对首次贡献者设置相同门槛，但本地化工作除外。DeepSeek Harness 不在 Top 100 分母内，它公开 MIT 代码并开放 Discussions，却关闭核心仓库的 Issues 与 PR，把外部开发引向插件。

### 92 个仓库已经为 coding agent 放入文件或目录

在 Top 100 的默认分支上，有 92 个仓库存在专为 coding-agent workflow 创建的内容，包括 `AGENTS.md`、`CLAUDE.md` 等 instruction file，以及 `.claude`、`.cursor`、`.codex`、`.gemini` 等工具目录。报告把两类内容合并为“仓库已经为 coding agent 做过设置”，并排除只残留在 `.gitignore` 中的名字。

| 默认分支上的文件 | 仓库 |
| --- | ---: |
| 多种 coding agent 可共用的 instructions | 80 / 100 |
| Claude Code | 71 / 100 |
| Codex | 22 / 100 |
| GitHub Copilot | 20 / 100 |
| Cursor | 17 / 100 |
| Gemini | 12 / 100 |

一个仓库可以同时支持多个工具。LobeHub、Opik、Cline 和 OmniRoute 都发布了四种 agent-specific 格式。这个数字衡量维护者已经提交到默认分支的兼容工作，不代表各种工具的实际使用频率相同。

### 这些规则已经进入 Model Infra

### 图 11 · 不同技术类型的 coding-agent 设置

| 技术类型 | 覆盖 |
| --- | ---: |
| Agent Framework | 20 / 21（95.2%） |
| Agent Runtime Infra | 15 / 15（100.0%） |
| Agent Application | 25 / 28（89.3%） |
| Model Infra | 32 / 36（88.9%） |

PyTorch、Spark、Iceberg、ONNX Runtime、Milvus、Triton 和 OpenVINO 都已经出现这类文件。Agent instructions 不只告诉工具怎样写代码：在 86 个可以读取明确 instruction 的仓库里，81 个提到测试或验证，79 个提到 Issue 或计划，72 个提到 code review，63 个提到 release 或 dependency 工作。维护者正在把整个贡献循环写成 Agent 可以读取的规则。

### 5,000 条线程样本追踪公开协作细节

每个仓库抽取 50 条互不重复的线程，最终得到 1,433 条 Issue 和 3,567 条 PR，共 5,000 条。它们来自八个月窗口中的 956,567 条 Issue / PR。每条线程只计算一次，不按仓库总流量加权。

### Agent 主要在提交之后进入，最明显的入口是评审

具名 coding 或 review Agent 在 2,158 / 5,000 条线程中留下了公开动作，覆盖 95 / 100 个仓库；只有 87 条线程由 Agent 账号或 App 发起。也就是说，样本中 43.16% 出现 Agent，而 Agent 发起只占 1.74%。常见形式是 CodeRabbit 评审 PR、Gemini Code Assist 留下 review comment，或 OpenHands 通过 GitHub App 行动。

本报告只在 GitHub 明确显示 Agent、显示 App，或贡献记录明确声明由 Agent 生成时进行归因。Dependabot、GitHub Actions、release bot 等传统自动化另行分类。开发者在本地使用 Cursor、Claude Code 或 Codex，通常仍显示为普通 User 账号；没有额外公开痕迹时，不根据文风、时间或代码风格猜测。

### 图 12A · 一条公开 Issue / PR 的不同阶段出现了谁

| 阶段 | 本行分母 | 具名 Agent 或 Agent-attributed App | GitHub User 账号 | 仓库团队账号 | 含义 |
| --- | --- | ---: | ---: | ---: | --- |
| 开启 Issue / PR | 5,000 条 | 87（1.7%） | 4,730（94.6%） | 1,380（27.6%） | Agent 很少发起，绝大多数工作由 User 账号带入仓库 |
| 开启后有人响应 | 5,000 条 | 1,914（38.3%） | 3,005（60.1%） | 1,936（38.7%） | Agent 已进入讨论和分流，同时仍有大量 User 与团队账号参与 |
| PR 出现评审 | 3,567 条 PR | 1,342（37.6%） | 1,934（54.2%） | 1,257（35.2%） | Review 是 Agent 最明确的公开参与点 |
| 解决线程的最后一个公开动作 | 4,098 条可识别 actor 的已解决线程 | 79（1.9%） | 3,626（88.5%） | 2,146（52.4%） | 合并、关闭或 reopen 的最后公开动作大多由 User 账号完成 |

`GitHub User 账号` 是 GitHub 报告 actor type 为 `User` 的账号；`仓库团队账号` 是 GitHub 将其与仓库关联为 `OWNER`、`MEMBER` 或 `COLLABORATOR`。列之间可以重叠，因为团队账号通常也是 User，App 也可能中介 User 的动作。

Agent 产生的公开事件进一步说明它们在做什么：

| Agent-attributed 事件 | 公开事件数 |
| --- | ---: |
| Review | 5,363 |
| Discussion comment | 1,915 |
| Triage / routing | 1,448 |
| Commit | 114 |
| 开启线程 | 87 |

这里的单位是事件，因此一条线程可能贡献多次 review 或 reply。它不能换算为劳动份额，但能够直接显示具名 Agent 服务集中在工作流的哪些位置。

### 图 12A.1 · Issue 与 PR 中 Bot / App 和 Agent 的出现比例

| 抽样线程占比 | Issue | PR |
| --- | ---: | ---: |
| 出现任一已知 Bot 或 App | 60.2% | 87.9% |
| 出现已验证 Agent | 19.1% | 52.8% |
| 出现传统自动化 | 47.3% | 71.6% |
| 整条线程中没有可见 GitHub User 账号 | 0.14% | 0.73% |

前三行会重叠，因为 Agent 服务经常通过 Bot 或 GitHub App 行动。最后一行强调的是：即使自动化已经非常普遍，整条公开线程完全没有 User 账号的情况仍然很少。

## 02B · 贡献过程

### 明确的 change request 往往会带来下一次提交

我们按时间排列 3,567 条抽样 PR 的 review 和 commit。2,522 条出现过 review，其中 1,386 条在第一次 review 后又提交了 commit。161 条收到明确 `CHANGES_REQUESTED` 的 PR 中，123 条随后出现新 commit。

### 图 12B · 可见的 review-to-revision 循环

| 信号 | 样本占比 | 95% 样本内 bootstrap 区间 |
| --- | ---: | ---: |
| 出现任意 review · 2,522 / 3,567 PR | 70.7% | 69.4–72.0% |
| 第一次 review 后又有 commit · 1,386 / 2,522 reviewed PR | 55.0% | 53.1–56.8% |
| `CHANGES_REQUESTED` 后又有 commit · 123 / 161 PR | 76.4% | 70.8–81.4% |

17 个由 Agent 发出 change request 的案例中，有 13 个随后提交新 commit；137 个由 GitHub User 发出 change request 的案例中，有 106 个随后提交。两者分别为 76.5% 与 77.4%。在这组公开记录里，Agent 提出的明确修改要求同样会进入真实修改循环；但 Agent 案例数量仍然较小。

### 第一版 Agent patch 常常会保留，也可能被人或另一个 Agent 重写

我们追踪了 10 个已合并、且由高置信 coding Agent 发起贡献或编写 commit 的 PR。其中 9 个可以从第一版有效 Agent patch 一直追到 PR 最终 head；Mooncake #2686 的 Agent commit 是 two-parent merge，first-parent diff 混入大量上游行，因此保留在案例册中，但不计入行级分母。

9 个可追踪 PR 的第一版 Agent commit 共新增 1,225 行文本；最终 head 中 765 行（62.4%）仍是完全相同的文本，123 行先被后续 human-account commit 修改或删除，193 行被后续 Agent commit 修改，144 行的后续作者无法解析。

### 图 12B.1 · 第一版可观察 Agent patch 后来发生了什么

| 去向 | 行数 | 第一版 Agent patch 占比 |
| --- | ---: | ---: |
| 完全文本保留 | 765 | 62.4% |
| 被后续 human-account commit 修改或删除 | 123 | 10.0% |
| 被后续 Agent commit 修改或删除 | 193 | 15.8% |
| 后续 commit 作者无法解析 | 144 | 11.8% |

| Pull request | 第一版 Agent patch | 完全保留 | 人类账号修改 | 后续 Agent 修改 | 作者不明 | 路径 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| [vercel/ai #18818](https://github.com/vercel/ai/pull/18818) | 172 | 0 | 0 | 172 | 0 | Agent 继续迭代直至合并 |
| [warpdotdev/warp #13382](https://github.com/warpdotdev/warp/pull/13382) | 44 | 31 | 12 | 1 | 0 | Agent → human |
| [OpenMetadata #25243](https://github.com/open-metadata/OpenMetadata/pull/25243) | 62 | 21 | 29 | 12 | 0 | Agent → human |
| [ONNX Runtime #28045](https://github.com/microsoft/onnxruntime/pull/28045) | 611 | 533 | 78 | 0 | 0 | Agent → human |
| [OpenHands #2614](https://github.com/OpenHands/software-agent-sdk/pull/2614) | 11 | 0 | 4 | 7 | 0 | Agent → human |
| [MLflow #19721](https://github.com/mlflow/mlflow/pull/19721) | 262 | 118 | 0 | 0 | 144 | Agent → 未解析作者 |
| [MLflow #21621](https://github.com/mlflow/mlflow/pull/21621) | 33 | 33 | 0 | 0 | 0 | Agent 继续迭代直至合并 |
| [MLflow #22355](https://github.com/mlflow/mlflow/pull/22355) | 25 | 25 | 0 | 0 | 0 | Agent → human |
| [MLflow #22659](https://github.com/mlflow/mlflow/pull/22659) | 5 | 4 | 0 | 1 | 0 | Agent 继续迭代直至合并 |

这组行级记录揭示了合并结果背后的不同交接。在 ONNX Runtime #28045 中，611 行第一版 patch 有 533 行保留，78 行被后续 User 账号修改；Vercel AI #18818 的 172 行则全部被后续 Agent commit 替换。仅看最终 merged diff，会错过补丁究竟被保留、由人修改，还是由另一个 Agent 重写。

统计单位是第一条可归因 Agent commit 中新增的精确文本行，空的 planning commit 被跳过。每一行沿后续 commit 继续追踪，第一个修改或删除它的 commit 获得公开账号归因。这是文本级的可复现比较，不等于语义作者权，也看不到普通 User 账号背后的未披露 AI 使用。

### DeepSeek Harness 选择了不同的开放治理方式

DeepSeek Harness 不在 Top 100 中，但提供了一个有价值的对照。仓库于 2026 年 8 月 13 日公开，至 8 月 30 日达到 204,176 Stars 和 23,597 forks。代码采用 MIT，Discussions 开放；Issues 关闭，两次检查中 Pulls endpoint 返回 404，贡献指南把社区开发引向第三方插件，同时暂不开放核心 PR。

### 图 12C · DeepSeek Harness 的贡献表面

| 表面 | 当前状态 |
| --- | --- |
| 源代码 | 公开 · MIT |
| Issues | 关闭 |
| Pull requests | 关闭 |
| Discussions | 开放 |
| 扩展路径 | Plugins |

代码可读、核心代码可贡献、以及存在开放扩展生态，是三个不同的治理选择。

### 10 个仓库提供更长的同期比较

这个面板包括 Codex、Claude Code、LangChain、Dify、n8n、Langfuse、Coder、Milvus、vLLM 和 PyTorch，覆盖新旧项目、Agent Application、Framework、Runtime 与 Model Infra。

生命周期面板从每个仓库的三个阶段各抽取 30 条线程：公开后的前 120 天、2025 Q4 和 2026 年 5–8 月，共 900 条，用来观察同一个仓库随成熟度变化的轨迹。效率面板使用固定日历窗口：每个仓库从 2024、2025、2026 年 5 月 1 日至 8 月 28 日各抽取 30 条。Codex 和 Claude Code 在 2024 年尚不存在，因此三年分别是 240、300、300 条，共 840 条；2025–2026 的可见同期比较使用 600 条。

### 进入仓库的工作增长快于可见维护者注意力

10 个仓库的同期 intake 从 2025 年 38,429 条增长到 2026 年 101,853 条，增长 165%。可见 Agent 参与从 33.5% 上升到 54.4%，其中 coding / review Agent 从 13.1% 上升到 34.5%。与此同时，人类 7 天内响应率从 60.3% 降到 46.9%，维护者 7 天内响应率从 42.9% 降到 20.0%；30 天 Issue 关闭率和 PR 合并率也同时下降。

| 同一组 10 个仓库 · 5 月 1 日–8 月 28 日 | 2025 | 2026 |
| --- | ---: | ---: |
| 进入的 Issue 与 PR | 38,429 | 101,853 |
| 出现可见 Agent 的线程 | 33.5% | 54.4% |
| 出现 coding / review Agent 的线程 | 13.1% | 34.5% |
| 7 天内人类响应 | 60.3% | 46.9% |
| 7 天内维护者响应 | 42.9% | 20.0% |
| 30 天内 Issue 关闭 | 48.7% | 38.4% |
| 30 天内 PR 合并 | 70.8% | 54.6% |
| 每条抽样线程的维护者动作 | 1.48 | 1.44 |

每条抽样线程的维护者动作几乎不变，但完整 intake 变成 2.65 倍。相近的公开维护者注意力被分摊到大得多的队列中。

在 2026 年样本内，前 24 小时出现 coding / review Agent 的 PR，30 天合并率为 48.7%；没有出现 Agent 的 PR 为 47.2%。前者有更多讨论轮次、维护者 review，以及第一次 review 之后的 commit。最明显的区别是公开修改轮次增加，而不是 30 天内接受率提高。

### 7 条公开线程展示了具体交接

交互式案例册包括 [Coder #25800](https://github.com/coder/coder/pull/25800)、[ONNX Runtime #28045](https://github.com/microsoft/onnxruntime/pull/28045)、[LangChain #37607](https://github.com/langchain-ai/langchain/pull/37607)、[PyTorch #182986](https://github.com/pytorch/pytorch/pull/182986)、[Supabase #42193](https://github.com/supabase/supabase/issues/42193)、[Gemini CLI #24026](https://github.com/google-gemini/gemini-cli/issues/24026) 和 [n8n #33411](https://github.com/n8n-io/n8n/issues/33411)。每条线程都能清楚看到谁提出工作、Agent 在哪里进入、谁修改，以及谁最终结束公开流程。

### 图 13 · 固定成熟度下的压力并非 Agentic AI 独有

| 面板 | 固定成熟度下 PR 未解决率中位数 |
| --- | ---: |
| Agentic AI Top 100 · 2026 年 1–5 月 cohorts | 9.2% |
| 12 个长期对照仓库 · 2026 年 1–5 月 cohorts | 8.2% |

12 个对照仓库中，有 9 个在 2026 年的固定成熟度 PR 未解决率高于 2022 年，11 个接收了更多 PR。评审压力并非只存在于 Agentic AI 样本，也不能简单归因于 Agent。

### 外部账号提供大多数 PR，User 账号仍然执行最终公开动作

外部账号创建了抽样 PR 的 66.8%。在固定成熟度检查点，已解决 external PR 中 57.2% 显示为 merged；maintainer / member PR 为 82.8%。代码供给可以来自广泛外部参与者，但仓库权限、上下文和持续关系仍然影响变更怎样通过 gate。

GitHub User 账号在 60.1% 的抽样线程中于 opener 之后响应，维护者关联账号为 38.7%。27.6% 的线程在 opener 之后只看到自动化响应；整条线程完全没有 User 账号的情况只有 0.56%。自动化承担了更多分流和响应工作，但例外处理和仓库状态改变仍然集中在 User 账号上。

## Agent 可以生产 patch，开源协作决定哪些变化值得由社区承担

公开记录显示，一种新的分工已经出现。越来越多仓库发布 Agent 可以直接读取的规则；Agent 在绝大多数样本仓库中参与 review、triage、discussion 和 revision；外部账号继续提供大多数 PR；而 merge、close 或 reopen 的最后一个公开动作，仍然主要由 GitHub User 账号完成。

10 仓库同期面板把这项变化带来的压力展示得更清楚：进入的工作和 Agent 参与快速增长，及时的维护者响应与 30 天结果却走弱。行级案例进一步说明，第一版 Agent patch 可能原样保留、被人修改，也可能被另一个 Agent 完全替换。生成 patch 正在变得更容易；判断它是否适合项目、证明它有效，并愿意对它承担后续责任，仍然需要共同注意力。

下一项值得跟踪的指标从仓库 gate 之后开始：已接受的变化是否被 revert、是否需要 follow-up fix、贡献者是否再次参与，以及它能否继续经受测试和 benchmark。

在 Agent 时代，patch 只是一次贡献的开头。贡献还意味着理解项目认可的问题、遵守它的规则、回应评审，并留下其他人愿意继续维护的代码。**开源协作的价值，是把越来越充足的 Agent 生成变更，转化为一个社区愿意共同拥有的软件。**

---

# 方法与数据口径

- 当前项目列表来自 `data/agentic-ai-projects.csv`；5 月基线来自 `data/history_snapshot/2605_agentic_projects.csv`。
- OpenRank 使用完整的 2026 年 7 月；Stars 和 GitHub primary language 使用 8 月 23 日更新的 canonical snapshot。
- OpenRouter App & Agent ranking 公开且为 opt-in；Top 20 对照检查于 2026 年 8 月 29 日。
- ZenMux 数字来自 2026 年 6 月 1–30 日冻结的单平台导出；“公开权重”表示找到官方 public-weight repository，不是 OSI license 判断；不与 OpenRouter 流量相加。
- 开放基础设施部分引用项目文档证明相应工程能力正在出现，不把项目合作、文档或社区活动写成生产部署范围。
- 协作研究冻结 Top 100，并从每个仓库抽取 50 条互不重复的 Issue / PR，共 5,000 条。每条线程计算一次，不按仓库流量重新加权。
- 样本内 bootstrap 按仓库内线程重抽样，只表达这组已选样本中的不确定性，不外推到所有开源项目。
- 公开 actor 标签区分已验证 Agent 服务、传统自动化、App-mediated User action 和 GitHub User account。普通 User 账号背后的未披露本地 AI 使用不可见。
- Review-to-commit 顺序使用专门的 PR commit timestamp；没有 timestamp 的 timeline commit row 不被解释为“没有后续修改”。
- GitHub 的 merged flag 是可观察 gate 信号，不等同于普适的贡献质量判断。
- GitHub 关注度、公开协作和生产采用在报告中始终是不同概念。
- DeepSeek Harness 的仓库设置和贡献指南需要在正式发布日再次检查。

详细研究设计：`../research/open-collaboration-study-design.md`
Landscape 数据与图表映射：`../research/landscape-signals.md`
Open infrastructure 证据：`../research/open-infrastructure-trends.md`

---

# References

## 数据、平台与 GitHub

- [GitHub REST API documentation](https://docs.github.com/en/rest/repos/repos)
- [GitHub GraphQL pull request types](https://docs.github.com/en/graphql/reference/pulls)
- [GitHub timeline events API](https://docs.github.com/en/rest/issues/timeline)
- [OpenRank metric documentation](https://open-digger.cn/en/docs/user_docs/metrics/openrank)
- [OpenRouter App & Agent Rankings](https://openrouter.ai/apps/)
- [ZenMux App Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html)
- [ZenMux Model Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-leaderboard.html)

## Open infrastructure

- [Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md)
- [Agent Sandbox threat model](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md)
- [Kubernetes Agent Sandbox roadmap](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/roadmap.md)
- [Kata Containers Agent Sandbox integration](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)
- [OpenInfra Foundation projects](https://openinfra.org/projects/)
- [Deploying the SPIRE Agent](https://spiffe.io/docs/latest/deploying/spire_agent/)
- [OpenTelemetry GenAI agent span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)
- [Kagent: Bringing Agentic AI to Cloud Native](https://www.cncf.io/blog/2025/04/15/kagent-bringing-agentic-ai-to-cloud-native/)
- [Dapr Agents v1.0](https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/)
- [OpenChoreo and the agentic enterprise](https://www.cncf.io/blog/2026/07/21/platform-engineering-for-the-agentic-enterprise-managing-applications-resources-and-ai-agents/)
- [Kgateway v2.1 and agentgateway](https://www.cncf.io/blog/2025/11/18/kgateway-v2-1-is-released/)
- [Agentgateway request and token rate limits](https://agentgateway.dev/docs/standalone/latest/configuration/resiliency/rate-limits/)
- [Agentgateway MCP per-tool rate limits](https://agentgateway.dev/docs/kubernetes/2.2.x/mcp/rate-limit/)
- [Istio in the AI era](https://www.cncf.io/announcements/2026/03/25/istio-brings-future-ready-service-mesh-to-the-ai-era-with-new-ambient-multicluster-gateway-api-inference-extension-and-more/)
- [Jaeger tracing AI agents with OpenTelemetry](https://www.cncf.io/blog/2026/05/26/how-jaeger-is-evolving-to-trace-ai-agents-with-opentelemetry/)
- [Confidential Containers becomes a CNCF incubating project](https://www.cncf.io/blog/2026/07/22/confidential-containers-becomes-a-cncf-incubating-project/)
- [Kubernetes v1.34 Dynamic Resource Allocation updates](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/)
- [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/)

## 协作治理与研究

- [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness contribution guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [We are Changing our Developer Productivity Experiment Design](https://metr.org/blog/2026-02-24-uplift-update/)
- [AIDev: Studying AI Coding Agents on GitHub](https://arxiv.org/abs/2602.09185)
- [AIDev open dataset](https://huggingface.co/datasets/hao-li/AIDev)
- [On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub](https://arxiv.org/abs/2509.14745)
- [Where Do AI Coding Agents Fail?](https://arxiv.org/abs/2601.15195)
- [From Industry Claims to Empirical Reality: An Empirical Study of Code Review Agents in Pull Requests](https://arxiv.org/abs/2604.03196)
- [Security in the Age of AI Teammates](https://arxiv.org/abs/2601.00477)
- [Understanding the Rejection of Fixes Generated by Agentic Pull Requests](https://arxiv.org/abs/2606.13468)
- [AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates](https://arxiv.org/abs/2607.04697)
- [State of Open Source AI](https://stateofopensource.ai/)
