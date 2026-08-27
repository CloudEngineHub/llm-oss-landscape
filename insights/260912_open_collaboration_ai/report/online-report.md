# When agents joined in, what happened to open-source collaboration?

Status: mother manuscript · ecosystem sections drafted · repository findings pending
Release: 260910_InclusionConf
Primary question: Does AI improve collaboration, or mainly increase code output and leave more judgment to maintainers?

## Editorial contract

This is the source manuscript for the online report. It is not a transcript of either talk. The five-minute keynote and ten-minute conference presentation are temporary views of this work and will be rebuilt after the repository study is complete.

The report can publish a claim only when the evidence is attached to the same section. GitHub attention, open-source collaboration and production adoption use different labels throughout the page.

What the current material can establish:

- how the selected Agent Infra and Model Infra landscapes changed between the CommunityOverCode and 23 August snapshots;
- where new open-source projects are forming around agent execution;
- which parts of the cloud-native and OpenInfra substrate are being reused;
- the study design for comparing Agentic AI repositories with traditional software projects.

What it cannot yet establish:

- that AI-authored pull requests are more or less likely to merge;
- that maintainers are carrying more review work;
- that a popular repository has production adoption;
- that a repository with few public Issues or PRs has no external ecosystem.

## Opening screen

### Headline

When agents joined in, what happened to open-source collaboration?

### Standfirst

We studied a new set of open-source projects built around agents: coding tools, harnesses, runtimes, gateways, memory systems and sandboxes. They are young, highly visible and unusually close to the daily work of producing software.

The landscape is the entry point, not the answer. The harder question sits inside the repositories. When AI writes code and enters Issue and pull-request workflows, does collaboration become faster, or does the review burden simply move to maintainers?

### Snapshot strip

- 143 selected projects in the current landscape
- 84 Agent Infra projects
- 59 Model Infra projects
- 55% of selected Agent Infra projects created in 2025 or later
- 17% of selected Model Infra projects created in 2025 or later

Label: selected ecosystem sample · not production adoption

## How to read this report

The online edition has three connected modes:

1. **Explore the map** — inspect the selected projects, categories and attention signals;
2. **Read the evidence** — follow the ecosystem and repository findings in sequence;
3. **Open a case file** — see the exact repository settings, Issue, pull request or document behind a claim.

The default reading path should reach the main research question before loading either full landscape. The maps remain available as expandable evidence, not as a gate in front of the story.

---

# 01 · Twenty days later, the map is still pointing at coding

The CommunityOverCode snapshot contained 126 projects: 69 in Agent Infra and 57 in Model Infra. The current review contains 143 projects: 84 in Agent Infra and 59 in Model Infra.

Seventeen projects were added. Thirteen entered Agent Infra and four entered Model Infra. Seven of the thirteen Agent Infra additions are coding tools, coding workflows, harnesses or code-first frameworks. DeepSeek Harness, Kimi Code, T3 Code and Spec Kit arrived in a part of the map which was already crowded.

The new names matter, but the category changes are more revealing. AgentGateway and MCP Context Forge moved out of Model API gateways and into Protocols & interoperability. A model gateway governs a model request. An agent gateway or MCP registry has to deal with tools, policy, credentials and runtime behaviour. It sits closer to the control surface of an acting system.

## Figure 01 · Landscape delta

Required view:

- paired Agent Infra and Model Infra counts for the two snapshots;
- additions grouped by section;
- reclassifications shown separately from new projects;
- toggle between project count and July OpenRank;
- visible note that DeepSeek Harness has no complete July OpenRank month.

Source: `data/agentic-ai-projects.csv` and the 23 August landscape review.

## Four signals worth carrying forward

### Coding remains the busiest entry point

Agentic coding contains 14 selected projects with 821.77 combined July OpenRank. Coding workflows and harnesses contains eight. DeepSeek Harness was created on 13 August and gained attention quickly at launch, but it has no complete OpenRank month. Launch attention and community maturity stay separate in the report.

### Context is separating from retrieval

Memory, knowledge & context now contains nine projects. OpenViking rose from 135.01 OpenRank in April to 177.61 in July. The category is beginning to treat memory, knowledge, RAG and skills as a managed context system rather than a single retrieval step.

### Tool entry points are becoming a control layer

Protocols & interoperability grew from five selected projects in the CommunityOverCode version to eight in the current map. Two of those changes came from reclassification. The layer now includes gateways and registries whose work is policy and runtime management, not model routing alone.

### Serving still carries the systems weight

The eight selected Serving · Inference projects hold 786.81 combined July OpenRank. FlashInfer rose from 127.11 in April to 147.83 in July. Multi-step agent workloads can add model calls and increase pressure on latency, cache reuse and accelerator utilisation. The landscape shows the pressure; it does not isolate agents as the only cause.

---

# 02 · The infrastructure is familiar. The task boundary is not.

Agents generate code during a task, run tools and leave effects in external systems. A process may last four minutes. The pull request, message or deployment it creates lasts longer.

CNCF's 2025 survey reports that 82% of container users run Kubernetes in production. Among organisations hosting generative AI, 66% use Kubernetes for some or all inference workloads. OpenInfra's 2025 annual report documents more than 55 million OpenStack production cores. This is the installed substrate. These numbers do not measure agent adoption.

## Figure 02 · Existing base, new control point

Show three installed-base figures beside one task timeline:

- 82% Kubernetes in production among container users;
- 66% of GenAI-hosting organisations using Kubernetes for inference;
- 55M+ documented OpenStack production cores;
- one short-lived agent task that writes code, runs it, calls a tool and leaves an external effect.

The graphic should make the boundary visible: the runtime can disappear while authority, context and evidence still need a lifecycle.

## Sandboxes become runtime objects

The current Agent Infra selection contains four development sandbox projects. Kubernetes Agent Sandbox exposes Sandbox, SandboxTemplate, SandboxClaim and SandboxWarmPool. It can use gVisor or Kata Containers for stronger isolation.

The important change is the scheduling object. A platform now has to manage a short-lived session with identity, storage, network policy, warm capacity and an expiry time. The code may not exist when the surrounding application is deployed.

## Authority has to expire with the task

Long-running services often use a stable service account. An agent task may cross a repository, browser, document system and deployment tool. SPIFFE and SPIRE already provide workload identity. The open question is how delegated identity is narrowed to one task, one tool and one period of time, with revocation still possible.

## Telemetry has to reach the effect

A successful HTTP response does not tell us whether the agent changed the correct file or sent the correct message. OpenTelemetry already provides the pipeline. Its GenAI semantic conventions now cover agents and tool execution, while parts of that semantic layer remain in Development.

The useful trace begins before a tool call and ends at the external effect. Critical evidence cannot depend only on what the agent chooses to report.

## Context outlives compute

The sandbox can be deleted while task context, tool results, generated artifacts and approvals remain relevant. The engineering question is no longer a single retrieval query. It is which state may cross sessions, when it expires, who may change it and how later actions can be traced back to it.

## Figure 03 · The task envelope

| Agent behaviour | Established open infrastructure | Work still open |
| --- | --- | --- |
| Run short-lived, untrusted code | Kubernetes lifecycle and Kata isolation | Fast, portable sandbox profiles |
| Borrow authority for one task | SPIFFE/SPIRE workload identity | Delegation bound to tools, scope and expiry |
| Carry context across processes | Open data and workflow systems | Context lifecycle and provenance |
| Change an external system | OpenTelemetry trace pipeline | Causal evidence from decision to effect |

This table is a working synthesis, not a new standard or maturity model.

Full evidence and source links: `../research/open-infrastructure-trends.md`.

---

# 03 · More code is not the same as better collaboration

The landscape gives us a cohort of young repositories where software agents, contribution rules and development automation are being tested in public. The repository study asks whether the increased output changes collaboration itself.

The primary question is deliberately practical:

> Does AI improve collaborative throughput, or mainly produce more code and leave more judgment to maintainers?

Answering it requires more than counting commits. A project can close pull requests quickly by rejecting them. It can publish source code while keeping core development private. It can disable Issues and still support a plugin ecosystem elsewhere.

## The six questions inside the study

1. Where does the additional code and PR volume come from?
2. Do first-time and outside contributors get merged and return?
3. Are reviews faster, and how many revision rounds do they require?
4. Is reviewer work spreading out or concentrating on a small maintainer group?
5. Has collaboration moved outside the core repository?
6. Do machine-readable repository instructions change contribution outcomes?

These questions become navigation on the findings page only after the data is available. They should not appear as six equal marketing cards.

---

# 04 · How we compare young Agentic AI projects with traditional repositories

The Agentic AI cohort comes from the canonical landscape CSV. Eligible projects were created after 1 January 2024, have a direct engineering relationship with LLM or agent execution, and expose enough GitHub activity for repository-level analysis. Static paper lists, weight-only repositories and incomplete mirrors are excluded.

The target is roughly one hundred Agentic AI repositories. The final number follows data quality rather than a round-number promise.

Each repository is matched with traditional software controls using language, owner type, starting attention, active contributor scale, pull-request intake and repository maturity. The main comparison uses equal lifecycle windows. A separate calendar-time view checks whether a result is mostly caused by the unusual growth period of 2025–2026.

## Figure 04 · Sample construction

Required flow:

1. canonical landscape projects;
2. created after 2024 filter;
3. repository-data availability and exclusion reasons;
4. matching variables;
5. final Agentic AI and control cohorts.

Every exclusion count must be reproducible from a saved table.

## What counts as AI participation

We label a contribution as AI-agent activity only when the PR, commit, account description or project documentation says so explicitly. A bot account proves automation, not necessarily AI. A normal user account may use AI assistance, but the public data cannot establish that.

The report keeps four states: confirmed AI agent, automation/bot, human account and unknown. “Human account” describes the public account type; it does not claim the code was written without AI.

## Core metrics

| Question | Primary measure | Guardrail |
| --- | --- | --- |
| Contribution intake | opened PRs per repository-month | show project scale |
| External entry | first-time contributor merge rate | show return contribution |
| Review speed | time to first human review | include no-response share |
| Review work | reviews and revision rounds per PR | control PR size |
| Maintainer pressure | merged PRs per active maintainer | show reviewer concentration |
| Aftermath | revert or follow-up fix within 30 days | label as a proxy |

Full design: `../research/open-collaboration-study-design.md`.

---

# 05 · Findings

Status: awaiting the frozen sample and repository tables.

This section must be written from the distributions, not filled with expected conclusions. The online structure is ready for four finding modules:

## Finding A · Output and acceptance

Required evidence:

- PR and commit distributions for matched cohorts;
- merged, closed-unmerged and still-open outcomes;
- core, first-time contributor, bot and confirmed-agent layers;
- sensitivity analysis excluding launch month.

Do not write “AI increased productivity” unless higher output is accompanied by a defined collaboration outcome.

## Finding B · Review time and revision

Required evidence:

- first response and first human review distributions;
- merge and close time shown separately;
- review comments and revision rounds by PR size;
- share of PRs receiving no human review.

## Finding C · Maintainer concentration

Required evidence:

- active maintainers and reviewers per repository-month;
- top-five reviewer share and Gini distribution;
- review load per active maintainer;
- stale, reverted and follow-up-fix rates as bounded proxies.

## Finding D · Where collaboration happens

Required evidence:

- Issue, PR and Discussion availability;
- visible contribution rules;
- links to plugin, skill or extension ecosystems;
- case comparison between core repository and ecosystem repositories.

Each module should lead with the measured result, show the control comparison and end with one case that complicates the aggregate pattern.

---

# 06 · DeepSeek Harness is a useful case because the choices separate

DeepSeek Harness entered the landscape with a strong launch signal and no complete OpenRank month. It is useful here because three decisions are often collapsed into one:

1. publishing source code;
2. accepting outside contributions into the core repository;
3. allowing an ecosystem to form around plugins, skills or integrations.

The case file will preserve the repository settings, contribution documents and public activity at a named snapshot date. A quiet Issue or PR surface is evidence about that surface only. It is not enough to conclude that no community exists elsewhere.

## Case interaction

The reader can switch among three layers:

- **CODE** — licence, release history and visible development activity;
- **CONTRIBUTION** — Issue, PR, Discussion and contributor path;
- **ECOSYSTEM** — extensions, plugins, downstream repositories and external entry points.

Every state links to the exact public artifact used as evidence.

---

# 07 · What this means for our own software governance

The report is meant to inform internal development and deployment practice. Recommendations wait for the findings, but the decision areas are already clear.

## Repository governance

Teams need to say whether machine-generated contributions are allowed, what evidence must accompany them and who owns the final judgment. A repository instruction file can help an agent run the right tests. It cannot replace review ownership.

## Review capacity

If AI increases PR intake faster than review capacity, merge time is not the only warning. Reviewer concentration, unreviewed changes and follow-up fixes may move first. Internal dashboards should keep code output and human review capacity on the same page.

## Deployment boundary

Agent-generated code may be created after the surrounding service was deployed. The execution environment, delegated authority and resulting external effect need a shared task identity. Evidence should remain after the sandbox is gone.

## Open-source strategy

Publishing code, accepting contributions and supporting an ecosystem require separate decisions. Projects should state which form of openness they intend to support instead of leaving contributors to infer it from an empty or disabled interface.

Final recommendations will be tied to measured findings and named repository cases.

---

# 08 · Quotes

The release is expected to include one CTO quote and one chair quote. No placeholder prose should be presented as a quotation.

Required before publication:

- approved wording;
- approved speaker name and title;
- permission for the online report and event presentation;
- final placement agreed after the main finding is known.

---

# 09 · Methods, sources and limitations

The methods drawer should expose:

- landscape snapshot and editorial inclusion rules;
- repository sample and exclusion table;
- control matching variables and balance plots;
- metric definitions and query versions;
- AI attribution rules;
- incomplete data and API limitations;
- source links for every CNCF, OpenInfra, Kubernetes, Kata, SPIFFE and OpenTelemetry claim.

The limitation summary stays visible in the main reading path:

- public GitHub data cannot observe internal development;
- ordinary accounts do not reveal how much AI assistance was used;
- young repositories have strong launch and censoring effects;
- attention metrics do not prove production adoption;
- disabled repository features do not prove the absence of an external community.

## Publication gate

The report is ready for public release only when:

1. the final sample and exclusion table are frozen;
2. every chart can be regenerated from saved code and data;
3. findings distinguish correlation from attribution;
4. DeepSeek Harness and other cases have snapshot dates and direct links;
5. quote text and attribution are approved;
6. the five-minute and ten-minute presentations have been re-derived from the final findings;
7. the web implementation passes desktop, mobile, accessibility and source-link QA.
