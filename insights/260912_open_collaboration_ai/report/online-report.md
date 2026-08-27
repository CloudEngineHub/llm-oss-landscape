# When agents joined in, what happened to open-source collaboration?

Status: mother manuscript · Landscape chapter complete · collaboration findings pending
Release: 260910_InclusionConf
Primary question: Does AI improve collaboration, or mainly increase code output and leave more judgment to maintainers?

## Editorial contract

This manuscript is the source for the online research report. The ten-minute Inclusion Conference talk and the five-minute Open Infrastructure keynote are shorter views of the same study.

Every published finding needs evidence beside it. Stars describe attention. OpenRank describes open-source activity. Neither establishes production use. Repository-level claims about AI participation remain open until the comparison cohorts and contribution labels are frozen.

The local report page includes a visual copy editor. Its editable fields are
stored in `web-copy.json`; charts, metrics, links and evidence labels remain
locked. The editor is available only from the localhost preview.

The report follows three connected parts:

1. **Landscape** — where agents are entering the software system;
2. **Collaboration** — what happens when an agent can propose a change;
3. **Open Infrastructure** — what has to manage the change once an agent can act in production.

---

# Opening

## Headline

When agents joined in, what happened to open-source collaboration?

## Standfirst

We studied an open-source ecosystem built around coding agents, harnesses, runtimes, gateways, memory systems and sandboxes. These projects are young, highly visible and unusually close to the daily work of producing software.

Agents now enter software in two places. Before merge, they can act as contributors. After deployment, they can act as workloads and operators. The first boundary is governed by maintainers. The second is governed by infrastructure.

## Snapshot

- 227 repositories in the May 2026 tracking pool;
- 277 repositories in the current canonical project list;
- 143 projects selected for the current Agent Infra and Model Infra maps;
- 84 Agent Infra projects and 59 Model Infra projects;
- 31 current selections were not present in the May tracking pool.

Label: ecosystem selection · not production adoption

## Opening voices

- Zhengyu He · CTO — quote to be confirmed before publication;
- Xu Wang · Chairman — quote to be confirmed before publication.

Do not draft or infer either quote from the report. Add the final wording only
after the speaker and attribution have been confirmed.

---

# 01 · Landscape

The landscape is the starting point for this study. It shows where open-source work is accumulating before we ask whether agents are changing collaboration or production infrastructure. The current selection contains 143 repositories: 84 in Agent Infra and 59 in Model Infra. They are drawn from a 277-repository canonical list and compared with a 227-repository tracking pool preserved in May 2026.

The two maps describe different parts of the system. Agent Infra covers applications, development frameworks and the runtime services an agent uses while completing a task. Model Infra covers model serving, training, data and compute. A place on either map is an editorial ecosystem selection. It does not establish production adoption.

## Agent applications lead the activity. Runtime is where the map is filling in

The current maps contain 84 Agent Infra and 59 Model Infra projects. Applications hold 55% of Agent Infra's July OpenRank, while Runtime accounts for 13 of the 23 Agent Infra selections outside the May tracking pool. Model Infra remains an older, Python-led systems base, with Serving holding 44% of its July OpenRank. The findings below follow recent growth, project age, primary language and the runtime path from context to evidence.

## Start with the two current maps

The Agent Infra map is much younger. Forty-six of its 84 projects were created in 2025 or later, and 23 were absent from the May tracking pool. Its July OpenRank leaders were OpenClaw, Hermes Agent, Deer Flow, Lark CLI and OpenViking.

Model Infra is more established. Ten of its 59 projects were created in 2025 or later, and eight were absent from the May pool. PyTorch, SGLang, vLLM, Ollama and FlashInfer led the selected projects by July OpenRank.

These leader lists describe activity within the selected repositories. [OpenRank](https://open-digger.cn/en/docs/user_docs/metrics/openrank) combines several forms of open-source activity into a monthly project score; it should not be read as market share or deployment volume.

### Figure 01 · Agent Infra and Model Infra Landscape 2026

The interactive report presents the complete Agent Infra and Model Infra maps at this point, before the analytical findings. Readers can switch between them and inspect each selected repository's section, GitHub metadata and July OpenRank.

## Applications hold the activity. Runtime holds more of the new selections

The tracked pool grew by 50 repositories between May and the current review. Applications still hold most of the visible Agent Infra activity: 32 projects account for 55% of the layer's combined July OpenRank. Runtime has almost the same number of selected projects, but a much smaller share of activity. It contains 31 projects and 22% of Agent Infra OpenRank.

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

## Coding is the first large field test for delegated software work

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

## Recent activity is appearing around tools, context and inference efficiency

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

## The agent layer is young. The infrastructure below it is not

Forty-six of the 84 selected Agent Infra projects were created in 2025 or later, compared with ten of 59 Model Infra projects. That is 55% of Agent Infra and 17% of Model Infra.

The age split is visible in the engineering questions each map carries. Agent interfaces and runtimes are being designed during the current wave. Model serving engines, training frameworks, schedulers and data systems bring years of existing engineering practice. Agent workloads are now asking that established base to handle short-lived code, delegated tool access and state that may outlive a process.

### Figure 05 · Age of selected projects

| Landscape | Created in 2025 or later | Selected projects | Share |
| --- | ---: | ---: | ---: |
| Agent Infra | 46 | 84 | 55% |
| Model Infra | 10 | 59 | 17% |

## Agent products lean TypeScript. Model infrastructure still speaks Python

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

## Runtime projects follow the path an agent takes through a task

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

## Signals outside GitHub support two narrower observations

GitHub is the main evidence source for how these projects are built. It cannot show every use of an application or model. We therefore used two external checks, with their coverage limits kept visible.

OpenRouter's public, opt-in [App & Agent ranking](https://openrouter.ai/apps/) placed DeepSeek Harness fifth globally when checked on 27 August 2026. The same page listed it among the week's fastest-growing applications, above 999%. This shows attributed usage on OpenRouter alongside the project's rapid GitHub attention. It does not estimate total users, revenue or production deployments.

The second check combines a frozen June 2026 model-usage sample from OpenRouter and ZenMux with official model repositories on Hugging Face. Five of the top ten composite usage ranks had a resolved public-weight repository; 24 of the top 50 met the same condition. OpenRouter and ZenMux token counts were converted to within-platform percentiles before combination, so a larger platform did not dominate the score. Hugging Face downloads were excluded from the usage ranking.

The result is evidence that public-weight models remain competitive within this two-platform sample. “Public-weight” describes access to model weights. It does not mean that every model meets the Open Source Initiative's definition of open-source AI.

### Figure 08 · What the external signals cover

| Evidence | Observed signal | Coverage boundary |
| --- | --- | --- |
| OpenRouter App & Agent ranking | DeepSeek Harness ranked fifth globally and appeared above 999% in weekly growth | Public, attributed OpenRouter traffic only |
| OpenRouter + ZenMux + Hugging Face sample | 5 of the top 10 and 24 of the top 50 usage ranks had a resolved public-weight repository | June 2026 two-platform sample; weight access is not an open-source license test |

## What this chapter establishes

User-facing applications still hold the largest share of Agent Infra activity, while newer selections are filling in the Runtime layer. Agent Infra is also much younger and more TypeScript-heavy than Model Infra. The external usage checks support the direction of the map, but remain narrower than the GitHub project evidence.

The boundaries matter just as much. “Outside the May pool” means a repository was absent from the preserved 227-project tracking list; it does not prove that the repository itself was newly created. OpenRank uses the complete July 2026 month. Stars use the canonical snapshot updated on 23 August, and contributor counts were refreshed on 27 August. OpenRouter rankings cover public applications that opt into attribution. The two-platform model sample covers June 2026. None of these measures establishes production adoption.

---

# 02 · Collaboration

## Open code, outside contributions and ecosystem growth are separate choices

DeepSeek Harness was released under the MIT License. Discussions are enabled. Issues and pull requests are disabled. Its contribution guide directs community work toward plugins and states that external pull requests are not being accepted for now.

The repository is public. The core contribution path is closed. The ecosystem surface sits in third-party extensions.

### Figure 09 · DeepSeek Harness contribution surface

| Surface | Current state |
| --- | --- |
| Source code | Public · MIT |
| Issues | Off |
| Pull requests | Off |
| Discussions | On |
| Extension path | Plugins |

This is one governance choice, not a maturity score. It raises practical questions about interface ownership, plugin discovery and how an unsafe or abandoned extension is handled.

## More code does not tell us whether collaboration improved

The main repository study asks whether AI improves collaborative throughput or mainly increases output while moving more judgment onto maintainers.

The answer cannot come from commit totals alone. A project can close pull requests quickly by rejecting them. It can merge more code while concentrating review work on a small group. It can disable core contributions and still support a broad plugin ecosystem.

### Figure 10 · What the study measures

| Research dimension | Primary measure | Guardrail |
| --- | --- | --- |
| Output | PRs and commits per repository-month | show project scale |
| External entry | first-time contributor merge rate | show return contribution |
| Human judgment | time to first human review | include no-response share |
| Revision | review comments and revision rounds | control PR size |
| Maintainer pressure | merged PRs per active maintainer | show reviewer concentration |
| Aftermath | revert or follow-up fix within 30 days | label as a proxy |

## The answer needs a matched control group

The Agentic AI cohort comes from the canonical landscape list. Eligible repositories were created after 1 January 2024, have a direct engineering relationship with LLM or agent execution and expose enough GitHub activity for repository-level analysis.

Each repository is matched with a traditional software control using language, owner type, starting attention, active contributor scale, pull-request intake and repository age. The main comparison uses equal lifecycle windows.

### Figure 11 · Sample construction

1. Canonical landscape pool;
2. post-2024 and engineering-relevance filters;
3. repository-data availability and exclusion reasons;
4. matched traditional-software controls;
5. final comparison cohorts.

## What counts as AI participation

A contribution is labelled AI-agent activity only when the pull request, commit, account description or project documentation says so explicitly. A bot account establishes automation, not necessarily AI. A normal user account may use AI assistance, but public data cannot prove it.

The study keeps four states: confirmed AI agent, automation or bot, human account and unknown.

## Findings

Status: awaiting the frozen cohorts and repository tables. The findings section will be written from distributions and case evidence. It will not be pre-filled with expected conclusions.

---

# 03 · Open Infrastructure

## The runtime can disappear while its authority and effects remain

An agent can generate code during a task, run it in a short-lived environment and change an external system. The sandbox may last four minutes. The pull request, message or deployment it creates lasts longer.

The infrastructure boundary therefore extends beyond the lifetime of a process. Authority needs an expiry. Context and evidence need their own lifecycle.

## The installed base is already carrying AI

CNCF's 2025 survey reports that 82% of container users run Kubernetes in production. Among organisations hosting generative AI, 66% use Kubernetes for some or all inference workloads. OpenInfra's 2025 annual report documents more than 55 million OpenStack production cores.

These figures establish the substrate. They do not measure agent adoption.

### Figure 12 · Existing base, new task boundary

Place the three installed-base figures beside one agent task: generate code, start an isolated environment, borrow authority, call a tool, leave an external effect, then delete the environment while retaining evidence.

## A production agent needs a task envelope

| Agent behaviour | Established open infrastructure | Work still open |
| --- | --- | --- |
| Run short-lived, untrusted code | Kubernetes lifecycle and Kata isolation | fast, portable sandbox profiles |
| Borrow authority for one task | SPIFFE/SPIRE workload identity | delegation bound to tools, scope and expiry |
| Carry context across processes | open data and workflow systems | context lifecycle and provenance |
| Change an external system | OpenTelemetry trace pipeline | causal evidence from decision to effect |

This table is a working synthesis. It is not a new standard or maturity model.

## Sandboxes become runtime objects

The current Agent Infra selection contains four development sandbox projects. Kubernetes Agent Sandbox exposes Sandbox, SandboxTemplate, SandboxClaim and SandboxWarmPool. It can use gVisor or Kata Containers for stronger isolation.

The scheduling object is the important change. The platform manages a short-lived session with identity, storage, network policy, warm capacity and an expiry time. The code may not exist when the surrounding application is deployed.

## Telemetry has to reach the effect

A successful HTTP response does not show whether the agent changed the correct file or sent the correct message. OpenTelemetry provides the pipeline. Its GenAI semantic conventions cover agents and tool execution, while parts of that semantic layer remain in Development.

The useful trace begins before the tool call and ends at the external effect.

---

# Method and evidence boundaries

- The current project list comes from `data/agentic-ai-projects.csv`.
- The May baseline comes from `data/history_snapshot/2605_agentic_projects.csv`.
- OpenRank uses the complete July 2026 month.
- Stars and GitHub primary-language labels use the canonical project snapshot updated on 23 August 2026.
- OpenRouter App & Agent rankings are public and opt-in. The cited application rank was checked on 27 August 2026.
- The open-weight usage comparison uses the frozen June 2026 OpenRouter and ZenMux sample, with weight access resolved through official Hugging Face repositories.
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
- [OpenRouter App Rankings API](https://openrouter.ai/docs/api/api-reference/datasets/get-app-rankings)
- [Hugging Face Hub API](https://huggingface.co/docs/hub/en/api)
- [ZenMux](https://zenmux.ai/)
- [Annual Cloud Native Survey 2025](https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/)
- [OpenInfra Annual Report 2025](https://openinfra.org/annual-report/2025/)
- [Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md)
- [Kata Containers Agent Sandbox integration](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)
- [Deploying the SPIRE Agent](https://spiffe.io/docs/latest/deploying/spire_agent/)
- [OpenTelemetry GenAI agent span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)
- [Kubernetes v1.34 Dynamic Resource Allocation updates](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/)
- [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/)
- [DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness contribution guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
- [OpenViking repository](https://github.com/volcengine/OpenViking)
- [State of Open Source AI](https://stateofopensource.ai/)
