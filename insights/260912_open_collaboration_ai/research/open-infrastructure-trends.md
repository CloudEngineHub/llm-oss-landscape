# Agent 参与之后，开源协作发生了什么？

## 趋势与开放基础设施研究底稿

> 数据核对日期：2026-08-26。全景图的 OpenRank 与参与者数据使用 2026-07 完整月；GitHub Stars、仓库状态与项目清单来自 2026-08-23 快照。CNCF、OpenInfra 数据分别保留其原始调查或报告口径，不能与 GitHub 项目热度混作一组采用率。

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

先把两个事实放在一起。CNCF 2025 年调查显示，82% 的容器用户已在生产环境运行 Kubernetes；在托管生成式 AI 的组织中，66% 使用 Kubernetes 管理部分或全部推理负载。另一方面，只有 7% 的组织每天部署生成式 AI 模型。现有底座已经进入生产，AI 的持续交付和运行成熟度仍有明显距离。[CNCF Annual Cloud Native Survey 2025](https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/)

OpenInfra 的数据给出另一个尺度。2025 年年报记录的 OpenStack 生产环境规模超过 5500 万核；同一份年报把 Kata Containers 与 Google Agent Sandbox 的集成列为年度进展。成熟基础设施没有被 Agent 替代，它们正被拉进新的执行边界。[OpenInfra 2025 Annual Report](https://openinfra.org/annual-report/2025/)

### 1. Sandbox 从开发工具变成运行时对象

传统服务在部署前已经知道要运行什么镜像和代码。Coding Agent 可能在任务中生成代码、安装依赖、打开浏览器或调用 shell。代码只运行几分钟，也足以访问文件、网络和凭据。

Agent Infra 图里已有 4 个 Development sandboxes：Coder、Agent Sandbox、OpenSandbox 和 Daytona。Kubernetes SIG Apps 的 Agent Sandbox 提供 Sandbox、SandboxTemplate、SandboxClaim 与 SandboxWarmPool；更强隔离可以接 gVisor 或 Kata Containers。这里已经出现清楚的分层：Kubernetes 管理 sandbox 生命周期，Kata 提供不共享宿主机内核的 VM 隔离。[Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md) [Kata Containers and Agent Sandbox](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)

需要变化的不是 Kubernetes 的基本编排能力，而是调度对象。平台需要管理一个带稳定身份、可选持久卷、网络边界、预热池和自动回收时间的短期会话。

### 2. 工作负载身份要继续回答“这一次任务能做什么”

服务账号通常代表一个长期应用。Agent 在一次任务里可能跨越代码仓库、文档、消息和部署系统。生产治理需要把权限压缩到任务时长、工具范围和资源范围，并允许中途撤销。

当前 Protocols & interoperability 有 8 个项目。AgentGateway、MCP Context Forge、ToolHive 的共同点是把工具发现、代理、策略和运行管理放在模型调用之外。SPIFFE/SPIRE 已经提供工作负载身份，SPIRE 的 Delegated Identity API 也明确说明受信委托方可以代表其他工作负载取得身份；它同时警告这种委托带有 impersonation 风险。Agent 场景没有推翻 workload identity，但要求平台把委托范围、任务上下文和工具权限接进同一条授权链。[SPIRE Delegated Identity API](https://spiffe.io/docs/latest/deploying/spire_agent/)

### 3. 可观测对象从服务请求延伸到工具调用和实际后果

请求返回 200，无法说明 Agent 是否改对了代码、发对了消息，或把数据写到了正确的位置。运行记录需要把模型决策、工具调用、sandbox 生命周期和外部副作用接起来，而且关键日志不能只依赖 Agent 自己上报。

CNCF 调查中 OpenTelemetry 的生产使用率为 49%，另有 26% 正在评估。OpenTelemetry 已经单独建立 GenAI semantic conventions 仓库，覆盖 agent、workflow、plan、memory、MCP 与 execute tool spans；截至本次核对，Agent spans 的状态仍是 Development，工具调用与模型决策之间的因果连接仍有开放议题。这组事实说明旧的 telemetry 管道可以复用，Agent 的语义层和取证边界还在建设中。[CNCF survey project results](https://www.cncf.io/wp-content/uploads/2026/01/CNCF_Annual_Survey_Report_final.pdf) [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) [Agent span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

### 4. 短期计算消失以后，任务状态还要留下

Agent 运行环境可以回收，任务上下文、工具结果、生成的 artifacts 和审批记录不能一起消失。当前 Memory, knowledge & context 已有 9 个项目，OpenViking 是 4—7 月增长第二快的仓库。这里的工程问题已经超出一次 RAG 查询：哪些状态可以跨会话继承，哪些必须过期，谁能修改，怎样追溯它影响过的后续行动。

云原生的数据、对象存储和工作流系统可以承载持久化，但 context database 正在补语义与生命周期管理。新版图中 6 个 Apache 项目仍集中在治理、集成和计算，也说明成熟项目更可能作为长期数据底座被复用，而不是直接进入 Agent 产品层。

### 5. GPU 调度要同时面对推理、批任务和短促的 Agent 峰值

Agent 把一次用户请求拆成多次模型调用、检索和工具执行。资源压力既有持续推理，也有突然出现的批处理和代码运行。Kubernetes 1.34 已将 Dynamic Resource Allocation 核心 API 升为 GA，用属性和可选设备列表管理 GPU、FPGA 等专用资源。Kueue 支持训练与推理混部、动态配额、多集群分发，并以 topology-aware scheduling 减少网络拓扑带来的执行时间和资源碎片。[Kubernetes DRA GA](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/) [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/) [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/)

这部分能够证明的是：开放基础设施已经在适配 AI 的专用硬件与异构作业。它还不能单独证明 Agent 是这些改动的唯一驱动力。更稳妥的说法是，Agent 会把现有的推理、批任务和短期执行组合成更难预测的资源序列，因此让动态分配、拓扑感知和细粒度成本归因变得更重要。

## 第一部分暂定结论

从 5 月基线看，应用层最热的项目仍然是 coding agent 和 harness；而当前图中不在 5 月跟踪池的 Agent Infra 项目，超过一半位于 Runtime。真正与生产基础设施相接的变化更慢，也更具体：sandbox 被做成 Kubernetes 对象，Kata 被接到 Agent Sandbox 下面，AgentGateway 和 MCP 管理项目形成控制面，OpenTelemetry 开始定义 agent 与 tool spans，Kubernetes 和 Kueue 继续补齐专用硬件的动态调度。

云原生时代积累的编排、身份、可观测、数据与虚拟化能力都还在。Agent 让这些系统需要处理一种更短命、更难预先描述、能够跨系统产生副作用的工作负载。第一部分的主线可以据此落在一句朴素的判断上：底座沿用，控制边界前移到每一次任务。
