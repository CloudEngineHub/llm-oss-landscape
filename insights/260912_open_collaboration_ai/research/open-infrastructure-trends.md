# Agent 参与之后，开源协作发生了什么？

## 趋势与开放基础设施研究底稿

> 数据核对日期：2026-08-29。全景图的 OpenRank 与参与者数据使用 2026-07 完整月；GitHub Stars、仓库状态与项目清单来自 2026-08-23 快照。OpenRouter、Agent Sandbox、Kata Containers 与 OpenTelemetry 保留各自的平台或项目口径，不能与 GitHub 项目热度混作一组采用率。

### 从 5 月基线看，图上发生了什么

5 月跟踪池包含 227 个仓库，当前 canonical 项目池包含 277 个，增加了 50 个。当前 Agent Infra 与 Model Infra 两张图选择了 143 个项目，其中 31 个不在 5 月跟踪池里。这个口径反映候选池与当前图上项目的变化，不能直接等同于 5 月发布图的逐项增删；精确的新增、移除与重分类仍需恢复 5 月发布图的机器可读清单。

当前选择中，Agent Infra 有 23 个项目不在 5 月跟踪池，Model Infra 有 8 个。Agent Infra 的这 23 个项目里有 13 个位于 Runtime。DeepSeek Harness、Kimi Code、T3 Code、Spec Kit 等项目继续把注意力吸引到软件研发流程；而 context、tool control、protocol 与 sandbox 的密度增加，说明增长并不只发生在应用入口。

分类变化反而更值得保留：AgentGateway 和 MCP Context Forge 从 Model API gateways 移入 Agent Infra 的 Protocols & interoperability。模型网关治理一次模型请求；agent gateway、MCP registry 和 tool runtime 需要处理工具发现、策略、凭据、隔离与审计。它们已经更接近 Agent 的控制面。

当前数据还给出四个可以继续讲的趋势：

1. **Coding 仍是最拥挤的入口。** Agentic coding 有 14 个项目，7 月 OpenRank 合计 821.77；Coding workflows & harnesses 有 8 个项目。DeepSeek Harness 创建于 8 月 13 日，发布期 Stars 上升很快，但尚无完整月 OpenRank，不能据此判断社区成熟度或生产采用。
2. **Context 开始成为独立的数据系统。** Memory, knowledge & context 已有 9 个项目，本轮新增 Headroom 和 Supermemory。OpenViking 的 OpenRank 从 4 月 135.01 上升至 7 月 177.61，增量 42.60。它把 memory、knowledge、RAG 和 skills 放进同一个 context database，说明 Agent 状态不再只被当成向量检索的附属物。
3. **工具入口与协议层一起变厚。** Tools, web & computer use 有 6 个项目；Lark CLI 4—7 月 OpenRank 从 95.47 上升到 179.37。Protocols & interoperability 当前有 8 个项目，其中一部分变化来自重新分类。这里的信号是开发者注意力，不是企业采用率。
4. **Model Infra 的压力仍集中在 serving 与加速。** Serving · Inference 的 8 个项目 7 月 OpenRank 合计 786.81；Pre-Train · Compiler & accelerator 的 8 个项目合计 267.35。FlashInfer 4—7 月 OpenRank 从 127.11 上升到 147.83。Agent 增加的多步调用会继续把成本、延迟和加速器利用率问题推到底层。

Apache 项目在新版图上的位置几乎没有变化：59 个 Model Infra 项目中有 6 个 Apache 项目，占 10.2%，分别位于 Data · Governance、Data · Integration、Compute & scheduling；Agent Infra 仍为 0。Iceberg、Hudi、Paimon、Gravitino、Airflow 和 Spark 没有变成 Agent 项目，但 Agent 的状态、数据处理和任务执行会继续落到这些长期运行的系统上。

## Agent 进入生产以后，开放基础设施要补什么

全景图里的 Runtime 层正在围绕 context、tool control、protocol、sandbox 和 observability 变厚。相邻生态里的项目已经在接这些工作，不需要用 Kubernetes 使用率或 OpenStack 核数来间接证明。这里需要把两类证据拆开：OpenRouter、ZenMux 说明工作负载确实出现在 GitHub 之外；CNCF、OpenInfra 项目的一手材料说明基础设施在具体改什么。

### 先说清楚：Agent 不是一种统一的“高频、大流量”工作负载

“Agent 会带来更高 QPS”目前只能算假设。OpenRouter 和 ZenMux 的 Token 排名能证明一些应用和模型端点确实承载了可见流量，却不能还原单个任务调用了多少次模型、并发了多少工具，也不能告诉我们峰值并发和重试放大率。现阶段更可靠的办法，是从公开项目已经实现的能力、威胁模型和仍在推进的 roadmap，反推生产环境正在碰到什么。

| 执行特征 | 直接证据 | 给基础设施带来的压力 | 证据边界 |
| --- | --- | --- | --- |
| 代码和依赖在任务开始后才出现 | Agent Sandbox 的威胁模型把不可信 LLM 生成代码列为主要风险对象 | 运行环境必须在不知道最终代码的情况下完成隔离、网络限制和清理 | 不能据此推断所有 Agent 都会执行代码 |
| 一个任务会连续或并行调用模型与工具 | agentgateway 同时为 HTTP、LLM 和 MCP 工具提供 request、token 与 per-tool rate limit | 平台需要按任务限制扇出、并发、Token 和费用，并在取消时停止下游工作 | 公开平台总 Token 不能证明单任务扇出或全局高 QPS |
| 进程短，任务和副作用可能持续更久 | Agent Sandbox 有 warm pool 和自动挂起/恢复 roadmap；Dapr Agents 强调 durable workflow、retry 与 persistent state | 任务需要 checkpoint、恢复和超时；对已经产生副作用的步骤不能盲目重试 | roadmap 表示需求正在形成，不代表能力已经成熟 |
| 任务会借用跨系统权限 | SPIFFE/SPIRE 提供 workload 与 delegated identity，并明确提示 impersonation 风险 | 身份之外还要表达用户意图、可调用工具、资源范围、额度、过期和人工审批点 | workload identity 本身并不等于完整的 Agent 授权模型 |
| 同一任务混合 CPU、GPU、网络和短期 sandbox | Kueue 管理异构资源、配额、弹性作业和训练/推理混部；Kubernetes DRA 管理专用设备 | 调度需要同时考虑启动延迟、拓扑、配额、空闲容量和任务级成本 | 这些项目服务广泛的 AI 工作负载，Agent 不是唯一驱动力 |
| “请求成功”不等于“事情做对了” | OpenTelemetry 已定义 Agent 和 execute-tool spans，但相关语义仍处于 Development | 证据必须把模型步骤、工具调用、sandbox 事件和外部结果串在一起 | 当前标准化进展不能证明已经形成完整的审计闭环 |

这组证据更接近一个真实的 workload profile：负载可能突发，但不一定持续高频；进程可以短命，但任务不是无状态的；失败也不只是返回错误码，还可能是重复发消息、重复改配置或把正确操作执行在错误对象上。

### 现有底座能接住一部分，缺口集中在任务边界

| Agent 在做什么 | 已有开放基础设施 | 还缺什么 |
| --- | --- | --- |
| 启动短期环境并执行未知代码 | Kubernetes lifecycle、Agent Sandbox、Kata Containers | 强隔离与低启动延迟之间的工程平衡；warm pool 的安全重置、租户隔离和可移植模板 |
| 调用模型、API 和 MCP 工具 | Gateway、service mesh、agentgateway | 跨模型与工具的任务级预算、扇出上限、背压和取消传播；准确的全局计数与成本归因 |
| 暂停、恢复或重试一个长任务 | Dapr workflow、消息与状态系统 | checkpoint、幂等、补偿和人工接管如何共同处理已经发生的外部副作用 |
| 代表用户或服务采取行动 | SPIFFE/SPIRE 与既有策略系统 | 把用户意图、工具范围、资源范围、有效期和审批状态绑定到同一个任务授权包 |
| 保存上下文并影响后续行动 | 数据库、对象存储、workflow 与 context 项目 | lineage、TTL、删除、继承、污染恢复，以及谁有权修改后续决策依据 |
| 解释任务为什么产生某个结果 | OpenTelemetry、Jaeger 与日志系统 | 从模型步骤到工具执行再到外部结果的因果链；关键证据不能只由 Agent 自己声明 |
| 为推理、工具和 sandbox 分配资源 | Kubernetes DRA、Kueue、推理与交付系统 | 跨 CPU/GPU/网络的任务级 SLO、容量预测和成本核算；冷启动与预留容量的取舍 |

这里说的“任务边界”不是一个新标准名词，而是研究中用来组织问题的工作概念：同一次 Agent 运行所借用的身份、预算、环境、状态和证据，应该有共同的生命周期。今天这些能力分散在多个控制面里，缺少一个可以跨组件传递和核对的共同对象。

Kubernetes SIG Apps 的 Agent Sandbox 把短期执行环境做成 Sandbox、SandboxTemplate、SandboxClaim 和 SandboxWarmPool。项目的威胁模型明确把经常运行不可信 LLM 生成代码的 Sandbox Pod 作为主要风险对象，并建议用 gVisor 或 Kata Containers 提供更强隔离。Kata Containers 是 OpenInfra Foundation 托管的项目，官方也已经把这项集成用于 secure code execution 和 AI agent runtimes。OpenTelemetry 则开始定义 agent、workflow 和 execute-tool spans。这些项目材料直接说明，现有开放基础设施正在把 Agent 当成新的工作负载来处理。[Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md) [Agent Sandbox threat model](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md) [Kata Containers and Agent Sandbox](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/) [OpenInfra projects](https://openinfra.org/projects/) [OpenTelemetry agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

### GitHub 之外：应用流量与模型流量分别看

2026 年 8 月 29 日核对 OpenRouter 公开 Global Top 20 时，有 9 个应用可以直接对齐到 Agent Infra，其中 7 个在 Top 10。这 9 个项目不是同一种产品：既有 Hermes Agent、OpenClaw 这样的个人 Agent，也有 Claude Code、Kilo Code、Cline、Codex、pi、OpenHands 这样的 coding agent，还有 DeepSeek Harness。这个对照比单独讲 DeepSeek Harness 的名次更有意义：Landscape 里最拥挤的 coding 与 personal agent 区域，也出现在一个独立平台的公开调用流量里。[OpenRouter App & Agent Rankings](https://openrouter.ai/apps/)

ZenMux 用来补充模型侧。研究仓库已经冻结了 2026 年 6 月 1—30 日的 ZenMux 单平台 Model Leaderboard：Claude Opus 4.8 排名第一，DeepSeek V4 Pro、GLM 5.2、DeepSeek V4 Flash 分列第二到第四，因此 Top 4 中有 3 个 endpoint 可以对应到官方公开权重仓库。这里不再沿用上次 CoC 分享的 OpenRouter + ZenMux 复合分数，也不把两个平台的 Token 相加。[ZenMux Model Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-leaderboard.html)

ZenMux 还提供 App Leaderboard，能够按 tokens 或 cost 观察 Claude Code、Codex、LiteLLM 等调用 ZenMux 的客户端与 Agent，数据按 T-1 日聚合。当前接口需要 Management API Key，本轮没有把文档里的示例返回值当成真实平台排名。正式发布前，如果拿到可发布的 App Leaderboard 快照，应优先补成与 OpenRouter 同结构的应用侧对照。[ZenMux App Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html)

### CNCF / OpenInfra 项目不是三件套，而是一条任务包络

目前能拿到一手项目证据的项目可以按四组理解：

1. **运行与隔离**：Kubernetes Agent Sandbox 管生命周期，Kata Containers 提供 VM 隔离；Confidential Containers 为敏感 AI 工作负载补 TEE 与 attestation，但它不是 Agent 专用项目。
2. **协调与运维**：kagent 在 Kubernetes 中运行 Agent，并已经提供 Kubernetes、Prometheus、Istio、Argo 工具；Dapr Agents 负责 durable workflow、state、retry、SPIFFE identity 与 multi-agent coordination；OpenChoreo 把人和 Agent 放进同一个平台治理模型，Agent 通过 MCP 使用平台能力。
3. **连接与治理**：kgateway v2.1 接入 agentgateway；后者的数据面明确覆盖 LLM、MCP tools、AI agents 与 inference workloads。Istio 则把既有 service mesh / gateway 能力延伸到 AI traffic，属于成熟基础设施适配，而不是新 Agent 项目。
4. **追踪与解释**：OpenTelemetry 在定义 Agent 语义；Jaeger 基于 OpenTelemetry 扩展 Agent 执行路径、MCP / ACP / AG-UI 和 GenAI 可视化。

一手来源：[kagent](https://www.cncf.io/blog/2025/04/15/kagent-bringing-agentic-ai-to-cloud-native/) [Dapr Agents](https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/) [OpenChoreo](https://www.cncf.io/blog/2026/07/21/platform-engineering-for-the-agentic-enterprise-managing-applications-resources-and-ai-agents/) [kgateway + agentgateway](https://www.cncf.io/blog/2025/11/18/kgateway-v2-1-is-released/) [Istio](https://www.cncf.io/announcements/2026/03/25/istio-brings-future-ready-service-mesh-to-the-ai-era-with-new-ambient-multicluster-gateway-api-inference-extension-and-more/) [Jaeger](https://www.cncf.io/blog/2026/05/26/how-jaeger-is-evolving-to-trace-ai-agents-with-opentelemetry/) [Confidential Containers](https://www.cncf.io/blog/2026/07/22/confidential-containers-becomes-a-cncf-incubating-project/)

这里要保留一个边界：Prometheus 与 Argo 是 kagent 已经能够操作的系统，这说明 Agent 正在成为云原生平台的新消费者；不能反过来写成 Prometheus、Argo 已经“转型成 Agent 项目”。

### 1. Sandbox 从开发工具变成运行时对象

传统服务在部署前已经知道要运行什么镜像和代码。Coding Agent 可能在任务中生成代码、安装依赖、打开浏览器或调用 shell。代码只运行几分钟，也足以访问文件、网络和凭据。

Agent Infra 图里已有 4 个 Development sandboxes：Coder、Agent Sandbox、OpenSandbox 和 Daytona。Kubernetes SIG Apps 的 Agent Sandbox 提供 Sandbox、SandboxTemplate、SandboxClaim 与 SandboxWarmPool；更强隔离可以接 gVisor 或 Kata Containers。它的威胁模型还默认限制 Sandbox 对 Kubernetes API、内部网络和云 metadata endpoint 的访问。这里已经出现清楚的分层：Kubernetes 管理 sandbox 生命周期与网络边界，Kata 提供不共享宿主机内核的 VM 隔离。[Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md) [Agent Sandbox threat model](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md) [Kata Containers and Agent Sandbox](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)

需要变化的不是 Kubernetes 的基本编排能力，而是调度对象。平台需要管理一个带稳定身份、可选持久卷、网络边界、预热池和自动回收时间的短期会话。

### 2. 工作负载身份要继续回答“这一次任务能做什么”

服务账号通常代表一个长期应用。Agent 在一次任务里可能跨越代码仓库、文档、消息和部署系统。生产治理需要把权限压缩到任务时长、工具范围和资源范围，并允许中途撤销。

当前 Protocols & interoperability 有 8 个项目。AgentGateway、MCP Context Forge、ToolHive 的共同点是把工具发现、代理、策略和运行管理放在模型调用之外。SPIFFE/SPIRE 已经提供工作负载身份，SPIRE 的 Delegated Identity API 也明确说明受信委托方可以代表其他工作负载取得身份；它同时警告这种委托带有 impersonation 风险。Agent 场景没有推翻 workload identity，但要求平台把委托范围、任务上下文和工具权限接进同一条授权链。[SPIRE Delegated Identity API](https://spiffe.io/docs/latest/deploying/spire_agent/)

### 3. 可观测对象从服务请求延伸到工具调用和实际后果

请求返回 200，无法说明 Agent 是否改对了代码、发对了消息，或把数据写到了正确的位置。运行记录需要把模型决策、工具调用、sandbox 生命周期和外部副作用接起来，而且关键日志不能只依赖 Agent 自己上报。

OpenTelemetry 已经单独建立 GenAI semantic conventions 仓库，覆盖 agent、workflow、plan、memory、MCP 与 execute-tool spans；截至本次核对，Agent spans 的状态仍是 Development，工具调用与模型决策之间的因果连接仍有开放议题。这里能看见一个具体变化：原有 telemetry 管道可以继续用，Agent 的语义层和取证边界还在建设中。[OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) [Agent span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

### 4. 任务进程结束以后，状态还要留下

Agent 运行环境可以回收，任务上下文、工具结果、生成的 artifacts 和审批记录不能一起消失。当前 Memory, knowledge & context 已有 9 个项目，OpenViking 是 4—7 月增长第二快的仓库。这里的工程问题已经超出一次 RAG 查询：哪些状态可以跨会话继承，哪些必须过期，谁能修改，怎样追溯它影响过的后续行动。

云原生的数据、对象存储和工作流系统可以承载持久化，但 context database 正在补语义与生命周期管理。新版图中 6 个 Apache 项目仍集中在治理、集成和计算，也说明成熟项目更可能作为长期数据底座被复用，而不是直接进入 Agent 产品层。

### 5. GPU 调度要同时面对推理、批任务和短促的 Agent 峰值

Agent 把一次用户请求拆成多次模型调用、检索和工具执行。资源压力既有持续推理，也有突然出现的批处理和代码运行。Kubernetes 1.34 已将 Dynamic Resource Allocation 核心 API 升为 GA，用属性和可选设备列表管理 GPU、FPGA 等专用资源。Kueue 支持训练与推理混部、动态配额、多集群分发，并以 topology-aware scheduling 减少网络拓扑带来的执行时间和资源碎片。[Kubernetes DRA GA](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/) [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/) [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/)

这部分能够证明的是：开放基础设施已经在适配 AI 的专用硬件与异构作业。它还不能单独证明 Agent 是这些改动的唯一驱动力。更稳妥的说法是，Agent 会把现有的推理、批任务和短期执行组合成更难预测的资源序列，因此让动态分配、拓扑感知和细粒度成本归因变得更重要。

### 6. 流量治理要从单次请求看到完整任务

Agent 流量的挑战不一定表现为持续高 QPS。一个任务可以先调用模型，再并行调用多个工具，因为超时触发重试，最后又把结果交给另一个模型。对平台来说，总量相同的两批流量，扇出、峰值、失败放大和费用结构可能完全不同。

agentgateway 已经分别提供 request 与 token rate limits，也能为不同 MCP tool 配置限流。它的文档同时保留了一个重要边界：本地计数不是精确的全局限流，进程重启后也不会保留计数。这个细节正好说明还缺什么——任务级预算需要跨 gateway、模型、工具和运行环境延续，取消或超支以后，下游工作也要一起停下来。[agentgateway rate limits](https://agentgateway.dev/docs/standalone/latest/configuration/resiliency/rate-limits/) [agentgateway MCP per-tool rate limits](https://agentgateway.dev/docs/kubernetes/2.2.x/mcp/rate-limit/)

### 7. 恢复不能等同于重复执行

Dapr Agents 把 durable workflows、automatic retries、failure recovery 和 persistent state 放在同一套生产能力里，这直接证明长任务和恢复已经是 Agent 基础设施的现实需求。但工具调用会产生副作用：重新运行一个失败步骤，可能重复创建资源、发送消息或修改外部系统。

因此，基础设施还需要区分“可以安全重放的计算”和“已经越过外部系统边界的动作”。幂等键、checkpoint、补偿操作、人工确认和外部结果核对，需要进入同一条恢复路径。现有 workflow 系统提供了积累，Agent 场景把语义判断和责任边界推到了更前面。[Dapr Agents v1.0](https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/)

## 第一部分暂定结论

从 5 月基线看，应用层最热的项目仍然是 coding agent 和 harness；而当前图中不在 5 月跟踪池的 Agent Infra 项目，超过一半位于 Runtime。真正与生产基础设施相接的变化更慢，也更具体：sandbox 被做成 Kubernetes 对象，Kata 被接到 Agent Sandbox 下面，AgentGateway 和 MCP 管理项目形成控制面，OpenTelemetry 开始定义 agent 与 tool spans，Kubernetes 和 Kueue 继续补齐专用硬件的动态调度。

云原生时代积累的编排、身份、可观测、数据与虚拟化能力都还在。Agent 让这些系统需要处理一种更难预先描述、会在多个系统之间借用权限、暂停恢复并留下副作用的工作负载。现有项目已经补上 sandbox、durable workflow、gateway 和 trace 的一部分能力；仍然空着的是它们之间的任务级控制：预算能否贯穿整条调用链，权限能否随任务到期，重试会不会重复产生副作用，证据能否独立还原最终结果。

第一部分因此不能只展示“开放基础设施已经准备了什么”。更完整的判断是：底座可以沿用，控制边界正在收缩到每一次任务，而跨组件的任务级治理还没有真正连起来。
