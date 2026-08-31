# What AI Agents Need from Open Infrastructure

> Working extraction from the mother research. Timing and slide language may change as the evidence is completed.

> The event-specific rehearsal script is now maintained at
> `insights/presentations/260908-kubecon-openinfra-pytorch/01-five-minute-keynote-script.md`.
> This file remains the working extraction from the mother research.

Speaker: Xiaoya Xia
Format: five-minute keynote
Event: KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China
Date window: 7–9 September 2026

## Submitted abstract

AI agents write and execute code, call external tools, and carry state across tasks. Their infrastructure must handle code that did not exist at deployment time and environments that may last only a few minutes.

Drawing on new ecosystem data from Agentic AI and Cloud Native Infra, this keynote examines where demand is forming around agent infrastructure and how established open-source technologies are being pulled into the stack. It offers a macro view of which capabilities are becoming essential and where the current ecosystem still has gaps.

## Five-minute focus

- `0:00–1:15` · How agent behavior changes the workload
- `1:15–3:30` · What ecosystem data from Agentic AI, CNCF, and OpenInfra signals
- `3:30–5:00` · Where open infrastructure can respond

## Interactive keynote

Playback route: `/presentations/260910_inclusion/open-infrastructure/present`

Controls: arrow keys, page up/down or space to advance; number keys `1–7` to
jump; `Enter` for fullscreen.

## Slide map and speaker notes

### 1. What AI Agents Need from Open Infrastructure · `0:00–0:20`

AI agents do more than serve a prediction. They write code, run it and act on
external systems. That changes the workload which open infrastructure has to
carry.

### 2. The code can appear after deployment · `0:20–1:15`

In the cloud-native model, we usually know the workload when we deploy it. An
agent can write a new program inside a task, run it for four minutes, open a pull
request and then release its environment. The task process and its environment
may already be gone, while the effect remains. Even that short-lived environment needs isolation, narrowly
scoped authority and a record which survives cleanup.

### 3. The agent layer is young. The base below it is not · `1:15–2:15`

Ongoing ecosystem review expanded the tracked project pool from 227 repositories
in May to 277 in the current review. Projects entered through activity-based
discovery, targeted GitHub searches and editorial review; the pool is broader
than the final landscape selection. Agent Infra is the younger layer: 55 percent
of its selected projects were created in 2025 or later, compared with 17 percent
in Model Infra. Thirteen of the 23 Agent Infra selections outside the May
tracking pool sit in Runtime.
The visible attention is still concentrated near applications, while the map is
becoming denser around isolated execution, tool control and durable context.
These counts describe ecosystem activity, not production adoption.

### 4. The cloud-native stack is becoming the task envelope · `2:15–3:05`

The change is visible across several project roles, not just in infrastructure
surveys. Kubernetes Agent Sandbox and Kata Containers handle lifecycle and
isolation. Kagent, Dapr Agents and OpenChoreo connect agents to cloud-native
operations, durable state and recovery. Kgateway and agentgateway put LLM, MCP
and agent traffic behind a control and data plane. OpenTelemetry and Jaeger are
working on the record needed to reconstruct agent execution. Some of these
projects were built for agents; others are mature infrastructure projects
adding an agent-specific interface or semantic layer. Together they show where
the established stack is being pulled, without pretending this is already an
ecosystem-wide adoption rate.

### 5. A production agent needs a task envelope · `3:05–4:35`

I would frame the answer as a task envelope. To run, agents can build on
Kubernetes lifecycle management and Kata isolation, but they need fast,
portable sandbox profiles. To act, they can build on workload identity, but
delegation must be tied to a tool, a scope and an expiry time. To remember, they
need an explicit lifecycle and provenance for context. And to prove what
happened, OpenTelemetry gives us the pipeline, while agent and tool semantics
still need to connect a decision to its external effect. The foundations are
familiar. The unit of control is changing.

### 6. Its evidence should not disappear · `4:35–5:00`

A sandbox can disappear in minutes. Its evidence should not. Open
infrastructure already has most of the building blocks. The task boundary is
where runtime, authority, context and evidence now need to meet.

## Current argument

Established open infrastructure is already being adapted for agent execution. The agent-specific pressure appears at the task boundary: short-lived execution, delegated authority, durable context and evidence of what a tool actually changed.

The talk needs one connected path through the evidence. Sandbox orchestration is the strongest opening example because it links a new Agent Infra category directly to Kubernetes Agent Sandbox and Kata Containers. The broader four-role matrix prevents the keynote from implying that isolation is the only response. OpenTelemetry and Jaeger give a second concrete example: the telemetry pipeline is established, while agent and tool-call semantics are still under development.

Accelerator scheduling belongs in the supporting data. Kubernetes DRA and Kueue show that open infrastructure is already adapting to scarce devices and mixed AI workloads, although that work cannot be attributed to agents alone.

## Evidence boundary

- GitHub Stars and OpenRank describe attention and community activity. They do not establish production use.
- Agent Sandbox, Kata Containers, kagent, Dapr Agents, OpenChoreo, kgateway, agentgateway, OpenTelemetry and Jaeger document capabilities or integration paths; they do not establish production adoption rates.
- Confidential Containers and Istio are labelled as established or adjacent infrastructure adapting toward AI workloads, not Agent-specific projects.
- OpenTelemetry's GenAI agent semantics are still in Development and should not be described as a finished standard.
- Any claim that an existing project is being changed specifically for agents needs a project source, release note or maintainer statement.
