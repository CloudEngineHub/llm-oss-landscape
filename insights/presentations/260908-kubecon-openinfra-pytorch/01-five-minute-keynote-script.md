# What AI Agents Need from Open Infrastructure

Speaker: Xiaoya Xia
Event: KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China
Date: 8 September 2026
Length: 5 minutes
Playback: `/presentations/260910_inclusion/open-infrastructure/present`

## Slide 1 · What AI Agents Need from Open Infrastructure · `0:00–0:15`

Good morning. Over the past few months, we have been tracking the open-source
projects growing around agentic AI. Today I want to use that map to ask a very
practical question: when an agent starts doing work, what does the infrastructure
underneath it have to carry?

## Slide 2 · The Agentic AI Landscape · `0:15–0:55`

Our current tracking pool contains 277 repositories. After technical and
editorial review, 143 appear on the two maps: 84 in Agent Infra and 59 in Model
Infra.

The Agent map covers applications, frameworks and runtime infrastructure. The
Model map follows data and training through PyTorch and into serving. Today I
want to draw your attention to the Runtime layer at the bottom of the Agent map.

## Slide 3 · Attention sits at the top. New demand is forming below · `0:55–1:30`

The application layer still accounts for about 55 percent of the selected
Agent Infra OpenRank. Coding agents and personal agents are where attention is
most visible.

The layer is also young: 55 percent of Agent Infra projects were created in
2025 or later. Thirteen of the 23 Agent Infra selections outside our May pool
sit in Runtime. This is an activity signal, not an adoption rate. New engineering
demand is accumulating around execution, tool control and context.

## Slide 4 · The process is temporary. The task is not · `1:30–2:20`

Why is that demand showing up now? In a conventional cloud-native workload, we
usually know the artifact when we deploy it. An agent can write code during a
task, call a model, fan out to several tools, wait, retry and then release the
environment.

That does not mean every agent is a high-QPS service. The more consistent
pattern is variability. Code can be unknown at startup. Traffic can arrive in
bursts. The process may be temporary while its authority, state and external
effects last longer. A retry is also different once a tool has already changed
another system.

## Slide 5 · Open projects are already moving into the task path · `2:20–3:10`

The response is already visible across the open infrastructure ecosystem.
Kubernetes Agent Sandbox turns a short-lived execution environment into a
lifecycle object. Kata Containers can put untrusted generated code behind a
dedicated guest-kernel boundary.

Elsewhere, Dapr Agents brings durable workflow and recovery. Agentgateway puts
model and tool traffic on a governed path. Kueue manages quota and heterogeneous
resources. OpenTelemetry is extending traces toward agent and tool execution.

Some were created for agents. Others are mature projects being adapted. That is
reuse and active engineering, not proof that the whole stack is production-ready.

## Slide 6 · The missing layer is task-wide control · `3:10–4:30`

The current stack already covers many pieces. The gaps appear between them.

Strong isolation still competes with startup time. A rate limit at one gateway
does not give the whole task a budget or stop work already running in another
tool. A workflow can retry a failed step, but the tool may repeat its side
effect. Workload identity names the caller; it does not carry the user's intent
and approved tools. A successful trace does not prove the final change was right.

I use “task envelope” as a working description. The identity, budget,
environment, state and evidence for one run need a shared lifecycle. Open
infrastructure has many building blocks, but that boundary does not yet travel
consistently across the stack.

## Slide 7 · Building an Agent Runtime with Open Infrastructure · `4:30–5:00`

This brings me directly to the next keynote.

Xu Wang will follow one task through a working open-source runtime. Kubernetes
Agent Sandbox manages its lifecycle. Kata Containers provides the guest-kernel
boundary. The rest of the chain executes the container and delivers its images
and model artifacts.

The landscape shows why this stack is becoming necessary. The demo will show
how the pieces can work together. Xu, over to you.

## Rehearsal notes

- Target speaking pace: 118–124 words per minute.
- Do not read the project matrix line by line. Point to one project in each
  lane, then move on.
- On Slide 2, keep Agent Infra selected. Switch to Model Infra only if the room
  or rehearsal timing makes the two-map relationship worth showing.
- The `55%` and `13/23` figures describe the current landscape selection and
  activity signals. Do not call them production adoption rates.
- Finish Slide 7 facing Xu Wang rather than returning to a generic closing
  statement.

## Evidence used in the talk

- Landscape data and definitions:
  `insights/260912_open_collaboration_ai/research/landscape-signals.md`
- Open-infrastructure evidence:
  `insights/260912_open_collaboration_ai/research/open-infrastructure-trends.md`
- [Kubernetes Agent Sandbox quickstart](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md)
- [Kubernetes Agent Sandbox threat model](https://github.com/kubernetes-sigs/agent-sandbox/blob/main/docs/security/threat_model.md)
- [Kata Containers and Agent Sandbox](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)
- [Agentgateway request and token rate limits](https://agentgateway.dev/docs/standalone/latest/configuration/resiliency/rate-limits/)
- [Dapr Agents v1.0](https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/)
- [Kueue overview](https://kueue.sigs.k8s.io/docs/overview/)
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai)
