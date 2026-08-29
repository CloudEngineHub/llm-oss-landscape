# When agents joined in, what happened to open-source collaboration?

Status: mother manuscript · Landscape and Collaboration first empirical pass complete · Open Infrastructure in revision
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

The study freezes the 100 highest-OpenRank repositories in the 277-project tracking pool. OpenRank decides the sample and does no further analytical work. Each repository was then reviewed as `llm_native`, `traditional` or `mixed`, with a confidence level and a short reason.

The review produced 68 LLM-native projects, 18 traditional projects and 14 mixed projects. A binary creation-date rule would miss 19 of them: 14 projects genuinely span both worlds, and five directly contradict the date proxy. LangChain, Megatron-LM and TRL predate ChatGPT but were built around language models. ComfyUI and Apache Gravitino were created later, yet their core value does not depend on an LLM.

The thread study uses a repository-stratified probability sample rather than a convenience sample of prominent pull requests. All 100 repositories contribute 20 sampled threads. The result is 2,000 Issues and pull requests, linked to 50,731 public timeline, review-comment and PR-commit events. Population-weighted estimates and an equal-repository view are reported together so that a handful of very large repositories cannot silently define the whole ecosystem.

## Open collaboration is still the default surface

All 100 repositories have Issues and Pull Requests enabled. The creation setting is not identical: 98 allow anyone to create a pull request, while Codex and Claude Code restrict creation to collaborators. Discussions are enabled in 74. A common-path scan found a CONTRIBUTING file in 89 repositories, an Issue template in 95 and a pull-request template in 84.

### Figure 09 · Current collaboration surface of the Top 100

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

## Machine-readable collaboration rules arrived in 2025 and spread fast

The annual scan looks for active repository instructions and config directories on the latest default-branch commit at or before each snapshot. `.gitignore` mentions are treated as residue and excluded.

### Figure 10 · Public Agent instructions and active config

| Snapshot | Observable repositories | Active instruction | Instruction or active config |
| --- | ---: | ---: | ---: |
| 2022-12-31 | 28 | 0 | 0 |
| 2023-12-31 | 51 | 0 | 0 |
| 2024-12-31 | 62 | 0 | 0 |
| 2025-12-31 | 86 | 42（48.8%） | 48（55.8%） |
| 2026-08-29 | 100 | 86（86.0%） | 92（92.0%） |

The cleanest comparison uses the 86 repositories observable in both 2025 and 2026. Forty-two retained a strict instruction, 32 added one and 12 had none in either snapshot. None removed the instruction from the declared target paths.

The most common current signals are cross-agent instructions in 80 repositories and Claude Code files in 71. Codex appears in 22, GitHub Copilot in 20, Cursor in 17 and Gemini in 12. A repository can carry more than one tool signal.

This evidence does not support a large decline in Cursor adoption. The full annual scan moves from 13 repositories in 2025 to 17 in 2026. The earlier 92% estimate used a broader definition that included `.gitignore` residue; the new 92% figure requires an active instruction or config.

## The rules have moved into Model Infra

Strict instruction coverage reaches 20 of 21 Agent Framework repositories and 14 of 15 Agent Runtime Infra repositories. It is also present in 28 of 36 Model Infra repositories.

### Figure 11 · Strict instruction coverage by technical niche

| Technical niche | Coverage |
| --- | ---: |
| Agent Framework | 20 / 21（95.2%） |
| Agent Runtime Infra | 14 / 15（93.3%） |
| Agent Application | 24 / 28（85.7%） |
| Model Infra | 28 / 36（77.8%） |

PyTorch, Spark, Iceberg, ONNX Runtime, Milvus, Triton and OpenVINO all carry machine-readable instructions in the current snapshot. The change is therefore wider than the repositories that sell an Agent experience directly.

The instruction text also covers more than implementation. Among the 86 repositories with a strict instruction, 81 mention tests or validation, 79 mention Issue work or planning, 72 mention code review and 63 mention release or dependency work. These are rulebook signals, not observed task completions.

## Agents are widely visible, but mostly after a thread has begun

Readiness and use are different measurements. Verified coding, review, security-review and support Agent identities — including separately labelled App-mediated User actions — appear in 89 of the 100 repositories in the probability sample. They are visible in an estimated 40.35% of threads (95% bootstrap interval 36.99–43.70%). The equal-repository estimate is 42.8%, so the result is not an artefact of the largest repositories.

Only 0.9% of weighted threads are opened by a verified Agent identity. Agent participation responds after the opener in 36.5% and appears in review events in 32.7% of pull requests. The public footprint is therefore concentrated in the middle of collaboration, not at the entrance.

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

## Review creates revision loops; it does not by itself prove saved labour

A visible review appears in 59.7% of weighted pull requests. Among reviewed PRs, 54.2% add a commit after the first review. Among the 63 sampled PRs with a visible `CHANGES_REQUESTED` review, 72.7% add a later commit.

### Figure 12B · Observable review-to-revision loops

| Signal | Weighted estimate | 95% bootstrap interval |
| --- | ---: | ---: |
| PR has a visible review | 59.7% | 54.9–64.6% |
| Reviewed PR adds a later commit | 54.2% | 49.4–59.5% |
| Change request is followed by a later commit | 72.7% | 63.2–82.5% |

Agent-attributed change requests are followed by a later commit in 80.5% of weighted cases, compared with 71.1% for GitHub User change requests. The denominator is small and participation is selected. This is evidence of an iteration loop, not evidence that an Agent caused the revision or reduced maintainer effort.

## Open contribution remains the norm, with alignment gates around it

Repository settings come first: 98 repositories use `ALL`, while Codex and Claude Code use `COLLABORATORS_ONLY`. A frozen scan of README, CONTRIBUTING, GOVERNANCE and PR-template text was then followed by manual review of every restrictive phrase candidate. Forty-eight repositories explicitly invite contribution. Twelve ask for an Issue first, pre-approval or a change within a specified scope. Thirty-eight have no restrictive signal in the reviewed files. No repository disables the Pull Request feature, but two restrict who can create one.

The outcome trace shows that external contribution is real across most of the sample: the historical window contains at least one external-association PR in 99 of 100 repositories. This is behavior evidence, not a substitute for the current creation setting. External accounts represent 73.35% of the weighted PR population (95% interval 69.68–76.64%).

## DeepSeek Harness makes a different governance choice

DeepSeek Harness does not enter the Top 100 denominator. It remains useful as a case outside the distribution. The code is released under MIT and Discussions are open. Issues are disabled, the Pulls endpoint returned 404 in two checks, and the contribution guide says that external pull requests are not being accepted for now. Community development is directed towards third-party plugins.

### Figure 12 · DeepSeek Harness contribution surface

| Surface | Current state |
| --- | --- |
| Source code | Public · MIT |
| Issues | Off |
| Pull requests | Off |
| Discussions | On |
| Extension path | Plugins |

Open code, open core contribution and a wider plugin ecosystem are three separate governance choices.

## Agent-visible threads look different. That is not yet an efficiency effect.

Agent-visible threads carry more visible work: their median sample thread has four comments and two reviews, compared with one comment and one review when no verified Agent is visible. Their resolved PRs also carry GitHub's merged flag more often, 56.5% versus 47.1%. The open share is lower, 11.3% versus 25.2%.

It would be tempting to call this a productivity gain. The comparison does not support that conclusion. Agent participation is voluntary, can occur after a thread becomes important or difficult, and is more common in some repository types than others. Only 15 mature sampled threads were opened by an Agent identity, across ten repositories. There is no random assignment and no adequate pre-trend for thread-level use.

The repository adoption check points to the same selection problem. Among eleven repositories with a confirmed first-instruction date and two complete months on each side, median Issue intake is almost unchanged after adoption (1.01×), while median PR intake is 1.34× higher. A repository may adopt Agent rules because contribution pressure is already increasing. The observed sequence cannot tell us which direction causes the other.

### Figure 13 · Fixed-maturity pressure is not unique to Agentic AI

| Panel | Median unresolved PR share at fixed maturity |
| --- | ---: |
| Agentic AI Top 100 · 2026 Jan–May cohorts | 9.2% |
| Twelve long-lived controls · 2026 Jan–May cohorts | 8.2% |

Nine of the twelve controls also have a higher fixed-maturity unresolved PR share in 2026 than in 2022, and eleven receive more PRs. Review pressure is wider than the Agentic AI sample. This weakens any claim that Agents alone created the backlog.

Human judgment has not disappeared. A GitHub User account responds after the opener in 50.9% of the weighted thread population; a maintainer-associated account responds in 28.9%. Among classifiable responding threads, 37.0% show only automation after the opener. Fully automation-only visible threads are much rarer, 0.03%, because nearly every thread still contains a User account somewhere. The burden question is therefore not simply whether humans remain present, but how much of the remaining work is selection, exception handling and final judgment.

## When code is cheap, repository fit and a defensible decision remain scarce

External accounts create most pull requests, but the gate filters them differently. At the fixed-maturity checkpoint, GitHub's merged flag appears on 40.6% of resolved external PRs (95% interval 37.3–44.0%) and 78.5% of resolved maintainer or member PRs (74.9–82.0%). This is not a quality score: projects use GitHub's merge flag differently, and some accepted work lands through another commit or branch. It is still direct evidence that producing a PR and moving a change through the repository's gate are different contributions.

The first empirical pass therefore answers the four research questions with different confidence:

1. **Adoption is high at the repository boundary and substantial in public traces.** Eighty-six repositories publish strict instructions; verified Agent participation is visible in 40.4% of weighted threads, mostly in review, triage and discussion rather than opening work.
2. **Collaboration remains a hand-off process.** External developers supply most PR intake, Agents are common in the middle, and User or maintainer-associated accounts still dominate the visible gate.
3. **Iteration is observable; an efficiency gain is not identified.** Reviews often lead to new commits, but voluntary Agent use, rising intake and long-lived control trends prevent a causal productivity claim. The evidence is consistent with both useful automation and more judgment pressure.
4. **The scarce contribution is not another patch.** It is a well-chosen problem, repository fit, evidence that reduces uncertainty, review that moves work toward a decision, and an accountable gate that survives later scrutiny.

The last answer is an interpretation grounded in the observed supply-and-filtering pattern, not a finished universal contribution metric. A publication-grade metric would also need post-merge reverts, follow-up fixes, contributor return and durable test or benchmark evidence.

---

# 03 · Open Infrastructure

## The runtime can disappear while its authority and effects remain

An agent can generate code during a task, run it in a short-lived environment and change an external system. The sandbox may last four minutes. The pull request, message or deployment it creates lasts longer.

The infrastructure boundary therefore extends beyond the lifetime of a process. Authority needs an expiry. Context and evidence need their own lifecycle.

## The installed base is already carrying AI

CNCF's 2025 survey reports that 82% of container users run Kubernetes in production. Among organisations hosting generative AI, 66% use Kubernetes for some or all inference workloads. OpenInfra's 2025 annual report documents more than 55 million OpenStack production cores.

These figures establish the substrate. They do not measure agent adoption.

### Figure 14 · Existing base, new task boundary

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
