# When agents joined in, what happened to open-source collaboration?

Status: mother manuscript · Landscape, Open Infrastructure and Collaboration first empirical pass complete
Release: 260910_InclusionConf
Primary question: Does AI improve collaboration, or mainly increase code output and leave more judgment to maintainers?

## Editorial contract

This manuscript is the source for the online research report. The ten-minute Inclusion Conference talk and the five-minute Open Infrastructure keynote are shorter views of the same study.

Every published finding needs evidence beside it. Stars describe attention. OpenRank describes open-source activity. Neither establishes production use. Repository-level claims about AI participation remain open until the comparison cohorts and contribution labels are frozen.

The local report page includes a visual copy editor. Its editable fields are
stored in `web-copy.json`; charts, metrics, links and evidence labels remain
locked. The editor is available only from the localhost preview.

The report follows two questions. The first starts with the landscape and asks what its growth signals mean for the open infrastructure already carrying AI workloads. The second enters the repository and asks what changes when agents participate in Issues, pull requests and review.

Five reading chapters keep that structure visible:

1. **01A · The current maps** — which projects and layers hold activity;
2. **01B · Signals in the map** — growth, age, language and external usage checks;
3. **01C · Open infrastructure** — how established projects are adapting to agent execution;
4. **02A · Agent participation** — where agents appear in repository work;
5. **02B · The contribution process** — review, governance, maintainer pressure and the contribution that remains scarce.

---

# Opening

## Headline

When agents joined in, what happened to open-source collaboration?

## Byline

Produced By Ant Open Source & InclusionAI · September 2026

## Standfirst

We studied an open-source ecosystem built around coding agents, harnesses, runtimes, gateways, memory systems and sandboxes. These projects are young, highly visible and unusually close to the daily work of producing software.

An agent can alter a software system at two different moments. During execution, it can write and run code, use credentials and leave effects that outlive the task. Inside the repository, it can also read rules, make changes and respond to review. This report follows the infrastructure that contains the first kind of action and the maintainers who judge the second.

## Snapshot

- 227 repositories in the May 2026 tracking pool;
- 277 repositories in the current canonical project list;
- 143 projects selected for the current Agent Infra and Model Infra maps;
- 84 Agent Infra projects and 59 Model Infra projects;
- 31 current selections were not present in the May tracking pool.

These counts define the project universe used in the landscape analysis. They are sample boundaries for the findings that follow.

Label: ecosystem selection · not production adoption

## Opening voices

- Zhengyu He · CTO — quote to be confirmed before publication;
- Xu Wang · Chairman — quote to be confirmed before publication.

Do not draft or infer either quote from the report. Add the final wording only
after the speaker and attribution have been confirmed.

---

# 01 · Landscape and Open Infrastructure

The landscape is the starting point for this study. It shows where open-source work is accumulating before we examine what agents ask of production infrastructure and how they change development collaboration. The current selection contains 143 repositories: 84 in Agent Infra and 59 in Model Infra. They are drawn from a 277-repository canonical list and compared with a 227-repository tracking pool preserved in May 2026.

The two maps describe different parts of the system. Agent Infra covers applications, development frameworks and the runtime services an agent uses while completing a task. Model Infra covers model serving, training, data and compute. A place on either map is an editorial ecosystem selection. It does not establish production adoption.

## 01A · The current maps

### Agent applications lead the activity. Runtime is where the map is filling in

The current maps contain 84 Agent Infra and 59 Model Infra projects. Applications hold 55% of Agent Infra's July OpenRank, while Runtime accounts for 13 of the 23 Agent Infra selections outside the May tracking pool. Model Infra remains an older, Python-led systems base, with Serving holding 44% of its July OpenRank. The findings below follow recent growth, project age, primary language and the runtime path from context to evidence.

### Start with the two current maps

The Agent Infra map is much younger. Forty-six of its 84 projects were created in 2025 or later, and 23 were absent from the May tracking pool. Its July OpenRank leaders were OpenClaw, Hermes Agent, Deer Flow, Lark CLI and OpenViking.

Model Infra is more established. Ten of its 59 projects were created in 2025 or later, and eight were absent from the May pool. PyTorch, SGLang, vLLM, Ollama and FlashInfer led the selected projects by July OpenRank.

These leader lists describe activity within the selected repositories. [OpenRank](https://open-digger.cn/en/docs/user_docs/metrics/openrank) combines several forms of open-source activity into a monthly project score; it should not be read as market share or deployment volume.

### Figure 01 · Agent Infra and Model Infra Landscape 2026

The interactive report presents the complete Agent Infra and Model Infra maps at this point, before the analytical findings. Readers can switch between them and inspect each selected repository's section, GitHub metadata and July OpenRank. The summary below each map shows its share of projects created since 2025 and the share of July OpenRank held by its five activity leaders.

## 01B · Signals in the map

### Applications hold the activity. Runtime holds more of the new selections

Since May, ongoing ecosystem review has expanded the tracked pool from 227 to 277 repositories. Applications still hold most of the visible Agent Infra activity: 32 projects account for 55% of the layer's combined July OpenRank. Runtime has almost the same number of selected projects, but a much smaller share of activity. It contains 31 projects and 22% of Agent Infra OpenRank.

Projects entered the tracking pool through activity-based discovery, targeted GitHub searches and editorial review. Inclusion in the pool does not mean automatic selection for the landscape.

The newer selections are concentrated lower in the stack. Runtime accounts for 13 of the 23 Agent Infra projects that were not in the May tracking pool. Application accounts for seven and Framework for three. The pattern suggests that ecosystem coverage is filling in around context, tool control, interoperability and execution, even while attention remains concentrated in products close to users.

### Figure 02 · Selected projects and July OpenRank by layer

| Agent Infra layer | Projects | Project share | July OpenRank | OpenRank share | Outside May pool |
| --- | ---: | ---: | ---: | ---: | ---: |
| Application | 32 | 38% | 2,057.8 | 55% | 7 |
| Framework | 21 | 25% | 859.5 | 23% | 3 |
| Runtime | 31 | 37% | 832.5 | 22% | 13 |

| Model Infra layer | Projects | Project share | July OpenRank | OpenRank share | Outside May pool |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serving | 15 | 25% | 1,229.9 | 44% | 3 |
| Pre-Train | 18 | 31% | 868.8 | 31% | 1 |
| Data | 13 | 22% | 369.4 | 13% | 1 |
| Compute | 4 | 7% | 158.9 | 6% | 0 |
| Post-Train | 9 | 15% | 140.2 | 5% | 3 |

Model Infra has a similar concentration of activity. Serving and Pre-Train together hold 75% of its July OpenRank. Serving alone contributes 44%, led by inference projects such as SGLang, vLLM, Ollama and FlashInfer. The model stack may be older, but serving remains the part carrying the most visible systems work.

### Coding is the first large field test for delegated software work

The current map contains 14 Agentic coding projects and eight coding workflows or harnesses. This is the largest application cluster. Code gives an agent a defined workspace, executable tests, a visible diff and a review path. Few other agent use cases offer such a complete feedback loop.

The rest of the map shows why coding is only the entry point. Nine selected projects manage memory, knowledge or context; eight focus on protocols and interoperability; six provide tool, web or computer use. Four projects provide development sandboxes and another four focus on observability and evaluation. Once an agent can edit code, the surrounding system has to decide what context it may use, which tools it can call, where the work can run and what evidence survives afterward.

DeepSeek Harness also exposes a governance distinction that the next chapter studies directly. Publishing source code, accepting outside changes and supporting a wider plugin ecosystem are separate choices.

### Figure 03 · Coding entry points and the adjacent Runtime stack

| Landscape section | Layer | Selected projects |
| --- | --- | ---: |
| Agentic coding | Application | 14 |
| Coding workflows & harnesses | Application | 8 |
| Memory, knowledge & context | Runtime | 9 |
| Protocols & interoperability | Runtime | 8 |
| Tools, web & computer use | Runtime | 6 |
| Development sandboxes | Runtime | 4 |
| Observability & evaluation | Runtime | 4 |

### Recent activity is appearing around tools, context and inference efficiency

The strongest positive OpenRank changes between April and July did not all come from the most crowded categories. Lark CLI gained 83.90 points in Tools, web & computer use. OpenViking gained 42.60 in Memory, knowledge & context. DeepSeek Reasonix, FlashInfer, Orca and Deer Flow completed the six largest increases in the selected landscape.

### Figure 04 · Largest April-to-July OpenRank increases

| Project | Section | April | July | Change |
| --- | --- | ---: | ---: | ---: |
| Lark CLI | Tools, web & computer use | 95.47 | 179.37 | +83.90 |
| OpenViking | Memory, knowledge & context | 135.01 | 177.61 | +42.60 |
| DeepSeek Reasonix | Agentic coding | 1.60 | 26.06 | +24.46 |
| FlashInfer | Pre-Train · Compiler & accelerator | 127.11 | 147.83 | +20.72 |
| Orca | Multi-agent orchestration | 13.86 | 29.10 | +15.24 |
| Deer Flow | Multi-agent orchestration | 203.53 | 218.20 | +14.67 |

These are absolute OpenRank point changes over two complete months, not percentage growth. The metric captures community activity and contribution signals. It does not show how many organisations deployed the software.

### The agent layer is young. The infrastructure below it is not

Forty-six of the 84 selected Agent Infra projects were created in 2025 or later, compared with ten of 59 Model Infra projects. That is 55% of Agent Infra and 17% of Model Infra.

The age split is visible in the engineering questions each map carries. Agent interfaces and runtimes are being designed during the current wave. Model serving engines, training frameworks, schedulers and data systems bring years of existing engineering practice. Agent workloads are now asking that established base to handle short-lived code, delegated tool access and state that may outlive a process.

### Figure 05 · Age of selected projects

| Landscape | Created in 2025 or later | Selected projects | Share |
| --- | ---: | ---: | ---: |
| Agent Infra | 46 | 84 | 55% |
| Model Infra | 10 | 59 | 17% |

### Agent products lean TypeScript. Model infrastructure still speaks Python

TypeScript is the primary language for 33 of the 84 Agent Infra repositories. Python leads 33 of the 59 Model Infra repositories. OpenClaw, Dify and Vercel AI SDK sit close to product interfaces and developer workflows; vLLM, PyTorch and SGLang remain anchored in the Python-centred model stack.

### Figure 06 · GitHub primary language of selected repositories

| Primary language | Agent Infra | Model Infra |
| --- | ---: | ---: |
| TypeScript | 33 | 4 |
| Python | 27 | 33 |
| Go | 8 | 5 |
| C++ | 1 | 7 |
| Other | 15 | 10 |

The field is GitHub's repository-level primary-language label. It is useful for comparing the two populations, but it is not a source-line distribution and does not represent every language used inside a repository.

### Runtime projects follow the path an agent takes through a task

The 31 Runtime projects can be read as an execution path. An agent retrieves context, crosses an interface, calls a tool, runs the work in an isolated environment and leaves evidence that someone can inspect later.

### Figure 07 · The Agent Runtime path

| Runtime role | Selected projects | Examples |
| --- | ---: | --- |
| Context | 9 | OpenViking, Milvus |
| Interface | 8 | A2UI, MCP Context Forge |
| Action | 6 | Lark CLI, CUA |
| Isolation | 4 | Coder, Agent Sandbox |
| Evidence | 4 | Langfuse, Opik |

This sequence is an editorial reading of the current map, not a prescribed architecture or maturity model. It is useful because each step becomes an infrastructure responsibility when agent actions reach production. Context needs a lifecycle, interfaces need policy, tool calls need scoped authority, generated code needs isolation and the resulting effect needs a durable trace.

### What the map establishes

User-facing applications still hold the largest share of Agent Infra activity, while newer selections are filling in the Runtime layer. Agent Infra is also much younger and more TypeScript-heavy than Model Infra. The map cannot tell us by itself which workloads have reached an external platform or how established infrastructure projects are responding.

“Outside the May pool” means a repository was absent from the preserved 227-project tracking list; it does not prove that the repository itself was newly created. OpenRank uses the complete July 2026 month. Stars use the canonical snapshot updated on 23 August, and contributor counts were refreshed on 27 August. None of these measures establishes production adoption.

## 01C · Open infrastructure

### Agent execution is variable, stateful and capable of side effects

An agent can generate code after a task starts, fan out across model and tool calls, pause, retry and change an external system. Some runs are short. Others wait on a person or a remote service. Public token totals show that traffic exists, but they do not reveal task-level fan-out, peak concurrency or QPS. The stable infrastructure problem is broader: the task has to keep its isolation, authority, budget, state and evidence while its processes come and go.

This is where the current landscape meets established open infrastructure. The evidence needs two separate views. Platform traffic checks whether the applications on the map are also being called. Project documentation shows which parts of the cloud-native and OpenInfra stack are being extended for agent work.

### The same workload is visible beyond repository activity

Nine of the twenty applications in OpenRouter's public, opt-in [global ranking](https://openrouter.ai/apps/) on 29 August 2026 map directly to the current Agent Infra landscape. Seven are in the Top 10. The overlap is not confined to one launch: it includes personal agents, coding tools and a coding harness.

### Figure 08 · Platform traffic outside GitHub

| OpenRouter rank | App on the current landscape | Agent Infra section | Attributed tokens |
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

OpenRouter measures traffic attributed to public apps that opt into tracking. It does not measure unique users, deployments or traffic routed elsewhere. The value of the alignment is narrower: the application categories drawing repository activity are also visible in one independent usage channel.

ZenMux provides a second, deliberately separate lens. In the frozen ZenMux platform export for 1–30 June 2026, three of the four most-used model endpoints linked to official public weight repositories: DeepSeek V4 Pro, GLM 5.2 and DeepSeek V4 Flash. Claude Opus 4.8 ranked first. The ranking below is from ZenMux alone; it is not the cross-platform composite used in the previous CommunityOverCode analysis.

| ZenMux rank | Model endpoint | June tokens | Weight access |
| ---: | --- | ---: | --- |
| 1 | Claude Opus 4.8 | 283.6B | Closed / no public weights resolved |
| 2 | DeepSeek V4 Pro | 265.2B | Public weights |
| 3 | GLM 5.2 | 143.3B | Public weights |
| 4 | DeepSeek V4 Flash | 140.9B | Public weights |
| 5 | Claude Opus 4.7 | 125.4B | Closed / no public weights resolved |

ZenMux now exposes [app](https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html) and [model](https://zenmux.ai/docs/api/platform/statistics-leaderboard.html) leaderboards with daily aggregation. The June values above come from the study's frozen platform export and should be refreshed before publication. OpenRouter and ZenMux token totals are never added together.

### Open infrastructure is taking on the task in several places

The response is broader than sandboxing. Eleven projects provide direct or adjacent evidence across four jobs. The table distinguishes projects built explicitly for agents from established infrastructure adapting to them.

### Figure 09 · Open infrastructure projects around the task

| Runtime job | Projects | What the primary material shows |
| --- | --- | --- |
| Run and isolate | Kubernetes Agent Sandbox; Kata Containers; Confidential Containers | Sandbox lifecycle and warm pools; VM-backed isolation; an attested confidential-computing substrate for sensitive AI workloads |
| Coordinate and operate | kagent; Dapr Agents; OpenChoreo | Agents operating Kubernetes, Prometheus, Istio and Argo; durable workflows, state, retries and SPIFFE identity; one platform serving humans and agents through different interfaces |
| Connect and govern | kgateway; agentgateway; Istio | Control and data planes for LLM, MCP and agent traffic; service-mesh and gateway policy extending toward AI workloads |
| Trace and explain | OpenTelemetry; Jaeger | Agent, workflow and execute-tool semantics; an established tracing project adapting its UI and protocol layer to agent execution paths |

Not every project in this table is an Agent project. Confidential Containers is an AI-relevant isolation substrate, and Istio is an established service mesh adapting its traffic layer. Prometheus and Argo appear because kagent ships tools that operate them; that is evidence that agents are becoming consumers of the existing stack, not evidence that Prometheus or Argo were redesigned around agents.

### A production agent needs a task envelope

| Agent behaviour | Established open infrastructure | Work still open |
| --- | --- | --- |
| Start an environment and run unknown code | Kubernetes lifecycle, Agent Sandbox and Kata isolation | strong isolation with low startup latency; safe warm-pool reset and portable profiles |
| Call models, APIs and MCP tools | gateways, service mesh and agentgateway | task-wide budgets, fan-out limits, backpressure and cancellation across the whole chain |
| Pause, resume or retry long work | Dapr workflows, messaging and state systems | checkpoints, idempotency and compensation after a tool has already produced an effect |
| Borrow authority for one task | SPIFFE/SPIRE workload identity and policy systems | delegation bound to user intent, tools, resources, approval state and expiry |
| Carry context across processes | databases, object storage and context projects | lineage, TTL, deletion, inheritance and recovery from poisoned context |
| Change an external system | OpenTelemetry and Jaeger trace pipelines | causal evidence from model work to tool execution and the external result |
| Mix inference, tools and sandbox compute | Kubernetes DRA and Kueue | task-level SLOs, capacity prediction and cost attribution across heterogeneous resources |

This table is a working synthesis, not a new standard or maturity model. “Task envelope” means that the identity, budget, environment, state and evidence for one run share a lifecycle. Today those controls live in different systems and do not yet travel as one object.

### The workload is bursty before it is simply “large”

The available public evidence does not support a universal claim that Agents always create high-QPS workloads. A more defensible pattern is task-level variability. One run may make a serial model call, fan out to several tools, retry after a timeout and then wait for approval. The same total traffic can therefore have very different peaks, failure amplification and cost.

Agentgateway already exposes request and token limits, plus per-tool limits for MCP. Its documentation also states that local counters are not exact global limits and do not survive a restart. That leaves an open systems problem: a task budget has to remain valid across gateways, model calls, tools and execution environments, and cancellation has to reach the work already in flight.

### Recovery cannot mean repeating every step

Dapr Agents packages durable workflows, retries, failure recovery and persistent state as production capabilities. This confirms that long-running and interrupted tasks are already an infrastructure concern. The remaining difficulty appears when a failed step has changed another system. Retrying may create the same resource twice, send the same message twice or repeat a deployment action.

Open workflow systems already provide useful machinery. Agent runtimes still need a shared way to distinguish replayable computation from an action that requires an idempotency key, compensation, external verification or human approval.

### Sandboxes become runtime objects

The current Agent Infra selection contains four development sandbox projects. Kubernetes Agent Sandbox exposes Sandbox, SandboxTemplate, SandboxClaim and SandboxWarmPool. It can use gVisor or Kata Containers for stronger isolation.

The scheduling object is the important change. The platform manages a short-lived session with identity, storage, network policy, warm capacity and an expiry time. The code may not exist when the surrounding application is deployed.

### Telemetry has to reach the effect

A successful HTTP response does not show whether the agent changed the correct file or sent the correct message. OpenTelemetry provides the pipeline. Its GenAI semantic conventions cover agents and tool execution, while parts of that semantic layer remain in Development.

The useful trace begins before the tool call and ends at the external effect.

---

# 02 · Open-source Collaboration

## 02A · Agent participation

The study freezes the 100 highest-OpenRank repositories in the 277-project tracking pool. OpenRank decides the sample and does no further analytical work. Each repository was then reviewed as `llm_native`, `traditional` or `mixed`, with a confidence level and a short reason.

The review produced 68 LLM-native projects, 18 traditional projects and 14 mixed projects. `Mixed` means the repository still has a complete non-LLM purpose, while AI or agents have become a substantial product surface; n8n, Warp and MLflow fall into this group. A binary creation-date rule would miss 19 projects: 14 genuinely span both worlds, and five directly contradict the date proxy. LangChain, Megatron-LM and TRL predate ChatGPT but were built around language models. ComfyUI and Apache Gravitino were created later, yet their core value does not depend on an LLM.

### What is in the Top 100?

| Lens | Distribution |
| --- | --- |
| Technical role | 36 Model Infra · 28 Agent applications · 21 Agent frameworks · 15 Agent runtime infrastructure |
| Project identity, manually reviewed | 68 LLM-native · 18 traditional · 14 mixed |
| Repository creation | 72 created in December 2022 or later · 28 created earlier |
| GitHub primary language | 44 Python · 26 TypeScript · 11 Go · 19 other languages |

The sample is a highly visible, active slice of the tracked ecosystem. It should not be read as the typical open-source repository.

### The report uses one repository frame and six derived pools

The denominator changes when the question changes. The online report now keeps charts from the same pool together and marks each change before the next group begins.

| Sample pool | How it was selected | What it is used for |
| --- | --- | --- |
| Top 100 repository frame | The 100 highest-July-2026-OpenRank repositories inside the 277-project tracking pool | Repository profile, contribution settings and policies, coding-agent files, release activity and complete 2026 Issue/PR counts |
| Fixed 53-repository historical cohort | The current Top 100 mechanically filtered to repositories already public by 1 January 2024 | Compare the same January–August activity window in 2024, 2025 and 2026 while keeping repository membership fixed; it still has survivor bias |
| 2,000-thread probability sample | 20 randomly sampled Issues or pull requests from each Top 100 repository, created from 1 January to 29 August 2026; 575 Issues and 1,425 PRs | Visible Agent activity, review and gate behavior, task types and revision loops; 50,731 public events belong to these same threads |
| 10-PR code-lineage subset | Every merged PR inside the 1,425 sampled PRs where a high-confidence coding-Agent identity changed code | Who changed the first Agent patch and how much exact text remained; nine PRs are line-traceable and one remains a non-traceable case |
| Ten-repository matched panels | A deliberately varied set spanning project age, LLM relationship and technical role | A 900-thread lifecycle panel across three project stages, plus an 840-thread fixed-window panel across 2024–2026 |
| Seven illustrative cases | Four threads from the 2,000-thread sample and three from the ten-repository panels, chosen because the public sequence is legible | Explain different coordination patterns; these cases do not estimate prevalence |
| Twelve long-lived controls | Kubernetes, VS Code, Vue, Kata Containers, Prometheus, Envoy, Grafana, Arrow, Rust, pandas, FastAPI and Kafka | Check whether rising PR intake and unresolved work also appear in established non-Agentic repositories; this is a comparison set, not a matched causal control |

The Top 100 is not random. The ten-repository set is also not random. Only the 20 threads drawn inside each repository use probability sampling, and population estimates apply repository-specific weights.

### Pull requests are arriving faster than issues

Between 1 January and 29 August 2026, the Top 100 opened about 346,600 Issues and 599,900 pull requests. That is 1.73 pull requests for every Issue. The monthly ratio rose from 1.35 in January to 2.10 in the first 29 days of August.

The gap remains after controlling for repository entry. We mechanically filtered the current Top 100 to the 53 repositories that were already public on or before 1 January 2024, then compared the same 1 January–29 August window in each year. This keeps repository membership fixed, but it does not remove survivorship bias: these are long-lived repositories in today's Top 100, not the repositories that ranked highest in 2024.

| Fixed 53-repository cohort | Issues opened | Pull requests opened | PR / Issue |
| --- | ---: | ---: | ---: |
| 2024 | 52,993 | 96,341 | 1.82× |
| 2025 | 72,072 | 124,314 | 1.72× |
| 2026 | 67,967 | 243,837 | 3.59× |

Across the fixed cohort, PR intake rose from 124,314 in 2025 to 243,837 in 2026. That is a 96.1% increase. Issue intake fell 5.7% over the same period. The result supports a narrow claim: the visible change stream became heavier. It does not tell us how much came from coding Agents, dependency bots or human contributors.

| 2026 intake by technical role | Repositories | Issues | Issue cohort unresolved | Pull requests | PR cohort unresolved | PR / Issue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent applications | 28 | 249,400 | 24.6% | 261,105 | 21.2% | 1.05× |
| Agent frameworks | 21 | 33,826 | 33.2% | 100,424 | 18.8% | 2.97× |
| Agent runtime infrastructure | 15 | 15,365 | 29.1% | 47,494 | 13.6% | 3.09× |
| Model infrastructure | 36 | 47,994 | 35.0% | 190,847 | 22.8% | 3.98× |

Model infrastructure has the highest unresolved Issue share: 35.0% of Issues opened inside the window were still open at the cutoff. The unresolved figures only follow items opened during this study window; they are not the repositories' full historical backlog. The flow is also concentrated. Claude Code, OpenClaw, Hermes Agent, OpenCode and Codex account for 54.5% of Issue intake, while the five PR leaders account for 34.7% of pull requests.

### Some repositories publish GitHub Releases almost every day

From 1 January to 29 August 2026—a 241-day window—98 repositories published at least one non-draft GitHub Release. A release day is a UTC date with at least one such record. The median repository published on 34 distinct days; the middle half spans 15 to 102 days, and six repositories published on at least 180 days.

Release records use the same 2026 window; they are not all-time repository totals. Vercel AI's 14,974 records fall on 192 dates, reflecting a multi-package and canary pipeline. llama.cpp published 2,002 records across 239 of the 241 days. At this frequency the metric mainly describes release automation, not a human product-release cadence. It still misses tag-only releases and versions published only to PyPI, npm or another registry.

### Open collaboration is still the default surface

All 100 repositories have Issues and Pull Requests enabled. The creation setting is not identical: 98 allow anyone to create a pull request, while Codex and Claude Code restrict creation to collaborators. Discussions are enabled in 74. A common-path scan found a CONTRIBUTING file in 89 repositories, an Issue template in 95 and a pull-request template in 84.

### Figure 10 · Current collaboration surface of the Top 100

| Surface | Repositories |
| --- | ---: |
| Issues enabled | 100 / 100 |
| Pull Requests enabled | 100 / 100 |
| Anyone can create a pull request | 98 / 100 |
| Creation restricted to collaborators | 2 / 100 |
| Discussions enabled | 74 / 100 |
| CONTRIBUTING found | 89 / 100 |
| Issue template found | 95 / 100 |
| Pull-request template found | 84 / 100 |

GitHub's repository settings directly answer whether Pull Requests are enabled and who can create one. They do not tell us whether maintainers will accept or merge an outside change. Creation permission, declared contribution policy and actual outcomes require separate evidence.

We therefore read the API settings first, froze common contribution documents, and manually reviewed every candidate phrase that looked restrictive. Forty-eight repositories explicitly invite contribution. Twelve ask for an Issue first, prior agreement or a change within a stated scope. Thirty-eight contain no restrictive signal in the reviewed files. The remaining two — Codex and Claude Code — leave Pull Requests visible but set creation access to collaborators only.

The distinction is visible in individual repositories. Mastra asks code contributors to open an Issue before a Pull Request. Open WebUI applies that gate to first-time contributors except for localization work. “No restrictive signal detected” only reports what the scan found; it is not the same as an explicit invitation.

DeepSeek Harness sits outside this Top 100 denominator. Its MIT-licensed core keeps Issues and Pull Requests closed while directing outside development toward plugins. It is a useful comparison because open source code, an open core contribution path and an extension ecosystem are separate choices.

### 92 repositories have set up files or folders for coding agents

In 92 of the Top 100 repositories, the default branch contains something created for a coding-agent workflow. This includes instruction files such as `AGENTS.md` and `CLAUDE.md`, as well as tool folders such as `.claude`, `.cursor`, `.codex` and `.gemini`.

We count both forms as repository-level adoption. The project has added files or folders specifically for a coding agent, so the report presents them as one measure.

The current files show a clear hierarchy. Eighty repositories publish instructions that more than one coding agent can follow. Seventy-one include Claude Code files, 22 Codex, 20 GitHub Copilot, 17 Cursor and 12 Gemini. A repository can support several agents at once.

| Files found on the default branch | Repositories |
| --- | ---: |
| Instructions that work across coding agents | 80 / 100 |
| Claude Code | 71 / 100 |
| Codex | 22 / 100 |
| GitHub Copilot | 20 / 100 |
| Cursor | 17 / 100 |
| Gemini | 12 / 100 |

LobeHub, Opik, Cline and OmniRoute each publish files for four agent-specific formats. This is the visible repository surface that maintainers choose to support; it should not be read as a ranking of actual tool usage.

This evidence does not support a large decline in Cursor adoption. The full annual scan moves from 13 repositories in 2025 to 17 in 2026. The earlier 92% estimate used a broader definition that included `.gitignore` residue. The current 92% count requires an actual instruction file or tool-specific folder on the default branch; `.gitignore` residue is excluded.

### The rules have moved into Model Infra

Coding-agent files or folders appear in 20 of 21 Agent Framework repositories, all 15 Agent Runtime Infra repositories and 32 of 36 Model Infra repositories.

### Figure 11 · Coding-agent setup by technical niche

| Technical niche | Coverage |
| --- | ---: |
| Agent Framework | 20 / 21（95.2%） |
| Agent Runtime Infra | 15 / 15（100.0%） |
| Agent Application | 25 / 28（89.3%） |
| Model Infra | 32 / 36（88.9%） |

PyTorch, Spark, Iceberg, ONNX Runtime, Milvus, Triton and OpenVINO all carry machine-readable instructions in the current snapshot. The change is therefore wider than the repositories that sell an Agent experience directly.

The instruction text also covers more than implementation. Among the 86 repositories where we could read explicit instructions, 81 mention tests or validation, 79 mention Issue work or planning, 72 mention code review and 63 mention release or dependency work. These counts describe what the files ask an agent to do; they do not show how often the work happened.

### The 2,000-thread sample follows public collaboration in detail

This part of the study uses a repository-stratified probability sample rather than a convenience sample of prominent pull requests. All 100 repositories contribute 20 threads created between 1 January and 29 August 2026. The natural Issue/PR mix is 575 Issues and 1,425 pull requests. Those 2,000 threads link to 50,731 public timeline, review-comment and PR-commit events.

Each sampled thread represents a different number of items in its repository. Population-weighted estimates therefore use the repository's full Issue/PR count divided by 20. This lets the study describe the full 940,690-item sampling frame without letting a busy repository contribute more hand-reviewed examples than a smaller one.

### Agents rarely open the conversation. Most visible Agent work happens later.

A coding or review agent left a visible action in 856 of the 2,000 Issues and pull requests we reviewed. We saw this in 89 of the 100 repositories. Only 29 Issues or pull requests were opened by an Agent account or App. After adjusting for different sampling rates in large and small repositories, visible Agent activity appears in 40.35% of the full sampling frame, while Agent-opened work accounts for 0.9%.

On GitHub, this usually looks like CodeRabbit reviewing a pull request, Gemini Code Assist leaving review comments, or OpenHands acting through its GitHub App. Agent activity responds after the opener in 36.5% of weighted Issues and pull requests and appears in review events in 32.7% of pull requests. The public trail is therefore concentrated after submission, not at the point where work first enters the project.

#### How we counted visible Agent activity

We counted an action only when GitHub named a known coding or review Agent, exposed the GitHub App behind the action, or the contribution explicitly said it was Agent-generated. Dependabot, GitHub Actions, release bots and other conventional automation are classified separately.

The registry behind this count contains 58 public identities tied to coding, review, security review or support Agent work. Fifty are GitHub Bot accounts. Eight are User accounts with additional service or App evidence. Forty-seven identities have direct identity or App evidence; eleven rely on documented function.

This method deliberately leaves ordinary User accounts unclassified. A developer can use Cursor, Claude Code or Codex locally and submit the result through a normal GitHub account, and GitHub usually exposes no reliable provenance for that path. Wording, timing and code style are not treated as proof. These figures therefore describe Agent work that is visible on GitHub, not all AI-assisted development and not the amount of code generated with AI.

### Figure 12A · Where verified Agent participation appears

| Visible stage | Agent | GitHub User account | Maintainer-associated account |
| --- | ---: | ---: | ---: |
| Opens the thread | 0.9% | Not estimated | Not estimated |
| Reviews a pull request | 32.7% | 43.9% | 25.7% |
| Performs the final visible gate action | 3.9% | 78.5% | 36.0% |

Rows can overlap when an App mediates a User action, and `GitHub User` is an account type, not proof that no AI assisted the work. Among resolved threads with a visible final gate actor, a User account performs most gate actions. Agent participation is common in review but unusual at the final visible decision.

The event mix supports the same interpretation. Verified Agent identities produced 2,535 review events, 735 discussion comments and 568 triage or routing events in the sample, compared with 29 thread-opening events and 24 publicly attributed commit events. Event counts are not shares of labour — one review bot can emit many events — but they identify the kinds of work that leave a public trace.

Agent services are only one part of repository automation. GitHub Actions, project automation, Codecov, merge queues and dependency bots remain the most widely visible conventional layer. Coding Agents include Copilot, Codex, Cursor, Claude, Devin, Gemini CLI, Kilo Code and Warp service identities; review Agents include CodeRabbit, Gemini Code Assist, Greptile and similar services; support and security roles include Dosu, automated triage and security-review Apps. Identity and functional role are preserved separately in the actor registry.

### Figure 12A.1 · Bot/App and Agent participation by thread type

| Weighted thread presence | Issues | Pull requests |
| --- | ---: | ---: |
| Any known Bot or App account | 71.0% | 82.7% |
| Verified Agent participation | 16.7% | 54.8% |
| Conventional automation | 47.7% | 59.7% |
| No visible GitHub User account anywhere in the thread | 0.00% | 0.05% |

The first three rows overlap: an Agent service often acts through a Bot or GitHub App. The last row is deliberately strict. A thread with a User opener and only Bot responses is not labelled automation-only; it is captured separately as no visible User response after the opener. This prevents the study from erasing the developer who initiated the work.

## 02B · The contribution process

### Review creates revision loops; it does not by itself prove saved labour

A visible review appears in 59.7% of weighted pull requests. Among reviewed PRs, 54.2% add a commit after the first review. Among the 63 sampled PRs with a visible `CHANGES_REQUESTED` review, 72.7% add a later commit.

### Figure 12B · Observable review-to-revision loops

| Signal | Weighted estimate | 95% bootstrap interval |
| --- | ---: | ---: |
| PR has a visible review | 59.7% | 54.9–64.6% |
| Reviewed PR adds a later commit | 54.2% | 49.4–59.5% |
| Change request is followed by a later commit | 72.7% | 63.2–82.5% |

Agent-attributed change requests are followed by a later commit in 80.5% of weighted cases, compared with 71.1% for GitHub User change requests. The denominator is small and participation is selected. This is evidence of an iteration loop, not evidence that an Agent caused the revision or reduced maintainer effort.

### Most of the first Agent patch stayed. The route to merge still varied.

The probability sample contains ten merged PRs where a verified Coding Agent opened the contribution or authored a commit. We reviewed all ten rather than selecting the cleanest examples. Nine expose a line-traceable Agent patch. The tenth, [Mooncake #2686](https://github.com/kvcache-ai/Mooncake/pull/2686), attaches the Agent identity to a two-parent merge commit: its first-parent commit diff includes thousands of upstream lines while the whole PR changes only twenty. It remains in the casebook but not in the line denominator.

Across the nine traceable PRs, the first effective Agent commits added 1,225 text lines. Of those, 765 lines — 62.4% — remain as exact text in the final PR head. Later human-account commits first changed or removed 123 lines; later Agent commits changed 193; 144 were changed by commits without a resolvable GitHub author.

### Figure 12B.1 · What happened to the first observable Agent patch

| Disposition | Lines | Share of first Agent patch |
| --- | ---: | ---: |
| Exact text retained | 765 | 62.4% |
| Changed or removed by a later human-account commit | 123 | 10.0% |
| Changed or removed by a later Agent commit | 193 | 15.8% |
| Later commit author unresolved | 144 | 11.8% |

Five cases follow a visible Agent-to-human code handoff. Their pooled line retention is 81.0%, although ONNX Runtime contributes 611 of the 753 starting lines. The case-level median is more useful here: 70.5% of the first patch survives unchanged, while 27.3% is later changed by a human account. The five cases range from no exact lines retained to the entire first patch retained.

| Pull request | First Agent patch | Exact retained | Human-account change | Later Agent change | Unresolved | Path |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| [vercel/ai #18818](https://github.com/vercel/ai/pull/18818) | 172 | 0 | 0 | 172 | 0 | Agent iterates to merge |
| [warpdotdev/warp #13382](https://github.com/warpdotdev/warp/pull/13382) | 44 | 31 | 12 | 1 | 0 | Agent → human |
| [OpenMetadata #25243](https://github.com/open-metadata/OpenMetadata/pull/25243) | 62 | 21 | 29 | 12 | 0 | Agent → human |
| [ONNX Runtime #28045](https://github.com/microsoft/onnxruntime/pull/28045) | 611 | 533 | 78 | 0 | 0 | Agent → human |
| [OpenHands #2614](https://github.com/OpenHands/software-agent-sdk/pull/2614) | 11 | 0 | 4 | 7 | 0 | Agent → human |
| [MLflow #19721](https://github.com/mlflow/mlflow/pull/19721) | 262 | 118 | 0 | 0 | 144 | Agent → unresolved author |
| [MLflow #21621](https://github.com/mlflow/mlflow/pull/21621) | 33 | 33 | 0 | 0 | 0 | Agent iterates to merge |
| [MLflow #22355](https://github.com/mlflow/mlflow/pull/22355) | 25 | 25 | 0 | 0 | 0 | Agent → human |
| [MLflow #22659](https://github.com/mlflow/mlflow/pull/22659) | 5 | 4 | 0 | 1 | 0 | Agent iterates to merge |

This small case study changes the question. A human commit after an Agent does not necessarily replace the Agent patch; it may add around it. An Agent-only commit chain can still rewrite its own first attempt completely. Final diff ownership hides both paths.

The unit here is an exact text line added by the first attributable Agent commit that contains code; empty planning commits are skipped. Each line is carried through subsequent PR commits, and the first commit that changes or removes it receives the public account attribution. Git blame resolves duplicate-line alignment. This does not measure semantic authorship: a GitHub User may have used private AI assistance, and an unchanged line may still be functionally wrong or trivial. The ten cases are an audit of rare public traces, not a population estimate.

The outcome trace later returns to actual submissions. The historical window contains at least one external-association PR in 99 of 100 repositories. This is behavior evidence, not a substitute for the current creation setting. External accounts represent 73.35% of the weighted PR population (95% interval 69.68–76.64%).

### DeepSeek Harness makes a different governance choice

DeepSeek Harness does not enter the Top 100 denominator. It remains useful as a case outside the distribution. The repository was opened on 13 August 2026 and reached 204,176 GitHub stars and 23,597 forks by 30 August, seventeen days later. The code is released under MIT and Discussions are open. Issues are disabled, the Pulls endpoint returned 404 in two checks, and the contribution guide says that external pull requests are not being accepted for now. Community development is directed towards third-party plugins.

### Figure 12C · DeepSeek Harness contribution surface

| Surface | Current state |
| --- | --- |
| Source code | Public · MIT |
| Issues | Off |
| Pull requests | Off |
| Discussions | On |
| Extension path | Plugins |

Open code, open core contribution and a wider plugin ecosystem are three separate governance choices.

### Ten repositories provide the longer comparison

The deeper panel contains Codex, Claude Code, LangChain, Dify, n8n, Langfuse, Coder, Milvus, vLLM and PyTorch. They were chosen to cover different project ages, LLM relationships, technical roles and contribution models. This is a contrast set, not a random Top 10.

The lifecycle panel samples 30 threads from each repository in three stages: its first 120 days, 2025 Q4 and May–August 2026. That produces 900 threads. It is used to compare one repository with itself as it matures. The online chart shows four repositories at a time so the trajectories remain readable; the underlying panel contains all ten.

The efficiency panel asks a different question and uses fixed calendar windows. It samples 30 threads per repository from 1 May to 28 August in 2024, 2025 and 2026. Codex and Claude Code did not yet exist in the 2024 window, so the full panel contains 240 threads in 2024 and 300 in each later year, or 840 in total. The visible 2025–2026 comparison therefore uses 600 threads. The 2026 early-Agent comparison uses 300 threads before applying metric-specific seven- and 30-day eligibility rules.

### Agents expanded throughput. Human attention did not scale with it.

We sampled the same ten repositories in the same 1 May–28 August window in 2024, 2025 and 2026. The matched panel contains 840 Issues and pull requests, with complete public timelines for every thread. Response is measured within seven days and outcomes within 30 days; threads that remained unanswered or unresolved stay in the denominator.

The ten-repository intake grew from 38,429 threads in 2025 to 101,853 in 2026, an increase of 165%. Visible Agent participation rose from 33.5% to 54.4%; coding and review agents alone rose from 13.1% to 34.5%. Human response within seven days fell from 60.3% to 46.9%, while maintainer response fell from 42.9% to 20.0%. Thirty-day Issue closure fell from 48.7% to 38.4%. Thirty-day PR merge fell from 70.8% to 54.6%.

Maintainer activity per thread stayed nearly flat, 1.48 actions in 2025 and 1.44 in 2026. The incoming population was 2.65 times larger, so the volume-weighted estimate of visible maintainer actions rose from roughly 48,000 to 77,000. The total is an estimate with a wide interval, not a census. The pattern is clearer than the exact count: maintainers spent no more attention on an average thread while facing much more work overall.

Inside the 2026 sample, PRs with a coding or review Agent visible in the first 24 hours had a 48.7% 30-day merge rate, compared with 47.2% when no Agent was visible. They also had more conversation runs, maintainer reviews and commits after the first review. The Agent comparison remains observational: difficult or important threads may be more likely to attract an Agent. It shows denser iteration without a clear outcome advantage.

### Seven public threads show what the hand-offs look like

The interactive casebook contains Coder #25800, ONNX Runtime #28045, LangChain #37607, PyTorch #182986, Supabase #42193, Gemini CLI #24026 and n8n #33411. Four come from the 2,000-thread sample and three from the ten-repository panels. They were chosen because the public sequence is easy to follow and because they show different coordination patterns. They are placed after the quantitative panels and should not be read as representative rates.

### Figure 13 · Fixed-maturity pressure is not unique to Agentic AI

| Panel | Median unresolved PR share at fixed maturity |
| --- | ---: |
| Agentic AI Top 100 · 2026 Jan–May cohorts | 9.2% |
| Twelve long-lived controls · 2026 Jan–May cohorts | 8.2% |

Nine of the twelve controls also have a higher fixed-maturity unresolved PR share in 2026 than in 2022, and eleven receive more PRs. Review pressure is wider than the Agentic AI sample. This weakens any claim that Agents alone created the backlog.

Human judgment has not disappeared. A GitHub User account responds after the opener in 50.9% of the weighted thread population; a maintainer-associated account responds in 28.9%. Among classifiable responding threads, 37.0% show only automation after the opener. Fully automation-only visible threads are much rarer, 0.03%, because nearly every thread still contains a User account somewhere. The burden question is therefore not simply whether humans remain present, but how much of the remaining work is selection, exception handling and final judgment.

### When code is cheap, repository fit and a defensible decision remain scarce

External accounts create most pull requests, but the gate filters them differently. At the fixed-maturity checkpoint, GitHub's merged flag appears on 40.6% of resolved external PRs (95% interval 37.3–44.0%) and 78.5% of resolved maintainer or member PRs (74.9–82.0%). This is not a quality score: projects use GitHub's merge flag differently, and some accepted work lands through another commit or branch. It is still direct evidence that producing a PR and moving a change through the repository's gate are different contributions.

The first empirical pass therefore answers the four research questions with different confidence:

1. **Coding-agent adoption is already widespread.** Ninety-two repositories carry coding-agent files or folders. Named Agent accounts or Apps appear in an estimated 40.4% of Issues and pull requests, mostly in review, triage and replies rather than opening the work.
2. **Collaboration remains a hand-off process.** External developers supply most PR intake, Agents are common in the middle, and User or maintainer-associated accounts still dominate the visible gate.
3. **Agents expanded iteration capacity without improving timely outcomes in the matched panel.** Intake and Agent participation rose, while human response, Issue closure and PR merge fell. Early Agent-visible threads produced more review and revision activity, but no clear merge-rate advantage.
4. **The scarce contribution is not another patch.** It is a well-chosen problem, repository fit, evidence that reduces uncertainty, review that moves work toward a decision, and an accountable gate that survives later scrutiny.

The last answer is an interpretation grounded in the observed supply-and-filtering pattern, not a finished universal contribution metric. A publication-grade metric would also need post-merge reverts, follow-up fixes, contributor return and durable test or benchmark evidence.

---

# Method and evidence boundaries

- The current project list comes from `data/agentic-ai-projects.csv`.
- The May baseline comes from `data/history_snapshot/2605_agentic_projects.csv`.
- OpenRank uses the complete July 2026 month.
- Stars and GitHub primary-language labels use the canonical project snapshot updated on 23 August 2026.
- OpenRouter App & Agent rankings are public and opt-in. The Top 20 alignment was checked on 29 August 2026 and will move as platform traffic changes.
- ZenMux figures use a frozen single-platform export for 1–30 June 2026. Weight access means an official public weight repository was resolved; it is not an OSI license determination. The values are not combined with OpenRouter traffic.
- Agent Sandbox, Kata Containers, kagent, Dapr Agents, OpenChoreo, kgateway, agentgateway, Istio, OpenTelemetry and Jaeger are cited as project-level evidence of engineering work around agent execution. Confidential Containers is labelled as an adjacent AI substrate. Their documentation does not establish how widely those capabilities are deployed.
- Collaboration estimates use a frozen Top 100 and a repository-stratified probability sample of 2,000 threads from 100 repositories. Bootstrap intervals resample threads within repository and describe sampling uncertainty inside this selected Top 100, not all open source.
- Public actor labels separate verified Agent services, conventional automation, App-mediated User actions and GitHub User account types. They cannot observe undisclosed local AI use.
- Review-to-commit sequence uses dedicated PR commit timestamps. Timeline commit rows without a timestamp are not interpreted as no later revision.
- GitHub's merged flag is reported as an observable gate signal, not a universal accepted-contribution or quality label.
- The May tracking pool is not identical to the published May map. Exact add, remove and reclassification claims require a reconstructed machine-readable May map inventory.
- GitHub attention, open-source collaboration and production adoption remain separate labels throughout the report.
- DeepSeek Harness repository settings and contribution guidance need a final publication-date recheck.

Detailed study design: `../research/open-collaboration-study-design.md`
Landscape evidence and chart map: `../research/landscape-signals.md`
Open infrastructure evidence: `../research/open-infrastructure-trends.md`

---

# References

- [GitHub REST API documentation](https://docs.github.com/en/rest/repos/repos)
- [OpenRank metric documentation](https://open-digger.cn/en/docs/user_docs/metrics/openrank)
- [OpenRouter App & Agent Rankings](https://openrouter.ai/apps/)
- [ZenMux App Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html)
- [ZenMux Model Leaderboard API](https://zenmux.ai/docs/api/platform/statistics-leaderboard.html)
- [Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md)
- [Agent Sandbox threat model](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md)
- [Kata Containers Agent Sandbox integration](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)
- [OpenInfra Foundation projects](https://openinfra.org/projects/)
- [Deploying the SPIRE Agent](https://spiffe.io/docs/latest/deploying/spire_agent/)
- [OpenTelemetry GenAI agent span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)
- [Kagent: Bringing Agentic AI to Cloud Native](https://www.cncf.io/blog/2025/04/15/kagent-bringing-agentic-ai-to-cloud-native/)
- [Dapr Agents v1.0](https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/)
- [OpenChoreo and the agentic enterprise](https://www.cncf.io/blog/2026/07/21/platform-engineering-for-the-agentic-enterprise-managing-applications-resources-and-ai-agents/)
- [Kgateway v2.1 and agentgateway](https://www.cncf.io/blog/2025/11/18/kgateway-v2-1-is-released/)
- [Istio in the AI era](https://www.cncf.io/announcements/2026/03/25/istio-brings-future-ready-service-mesh-to-the-ai-era-with-new-ambient-multicluster-gateway-api-inference-extension-and-more/)
- [Jaeger tracing AI agents with OpenTelemetry](https://www.cncf.io/blog/2026/05/26/how-jaeger-is-evolving-to-trace-ai-agents-with-opentelemetry/)
- [Confidential Containers becomes a CNCF incubating project](https://www.cncf.io/blog/2026/07/22/confidential-containers-becomes-a-cncf-incubating-project/)
- [Kubernetes v1.34 Dynamic Resource Allocation updates](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/)
- [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/)
- [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness contribution guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
- [OpenViking repository](https://github.com/volcengine/OpenViking)
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [We are Changing our Developer Productivity Experiment Design](https://metr.org/blog/2026-02-24-uplift-update/)
- [AIDev: Studying AI Coding Agents on GitHub](https://arxiv.org/abs/2602.09185)
- [On the Use of Agentic Coding: An Empirical Study of Pull Requests on GitHub](https://arxiv.org/abs/2509.14745)
- [Where Do AI Coding Agents Fail?](https://arxiv.org/abs/2601.15195)
- [From Industry Claims to Empirical Reality: An Empirical Study of Code Review Agents in Pull Requests](https://arxiv.org/abs/2604.03196)
- [Security in the Age of AI Teammates](https://arxiv.org/abs/2601.00477)
- [Understanding the Rejection of Fixes Generated by Agentic Pull Requests](https://arxiv.org/abs/2606.13468)
- [AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates](https://arxiv.org/abs/2607.04697)
- [State of Open Source AI](https://stateofopensource.ai/)
