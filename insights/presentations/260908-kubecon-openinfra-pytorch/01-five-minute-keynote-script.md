# What AI Agents Need from Open Infrastructure

Speaker: Yaya Xia
Event: KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China
Date: 8 September 2026
Length: 5 minutes
Playback: `/presentations/260910_inclusion/open-infrastructure/present`

## Slide 1 · `0:00–0:35`

Good morning, everyone. I'm Yaya, and I work on Ant Group's open source team. For a
while now we've been tracking the open-source projects growing up around
agentic AI, and putting together landscape maps to keep track of the ecosystem.
So today I want to use those maps to get at something pretty practical: when an
agent actually goes into production, what does the infrastructure underneath it
have to hold up—and what's still missing?

## Slide 2A · `0:35–1:30`

> Playback: show the full Agent Infra map. After “84 projects,” advance once to
> isolate Application. Advance again before “But look at the bottom” to isolate
> the complete Agent Runtime Infra layer.

We looked at hundreds of thousands of repos, scored them, and narrowed it down
to just over 100 for these two maps. Start with Agent Infra—84 projects.
Thirty-two of those are applications, but here's the thing: they account for
more than half the activity, measured by July OpenRank. So most of what people
are actually paying attention to is still at the top—coding agents, personal
assistants, the stuff you can see and use directly.

But look at the bottom of the map. Thirty-one projects now sit in what we call
Runtime—context, tools, sandboxed execution, evidence. That's the layer I want
you to remember, because that's where things get interesting.

## Slide 2B · `1:30–2:30`

> Playback: advance once to show the full Model Infra map. After “59 projects,”
> advance to show the age comparison without dimming the map. Advance again for
> serving and pre-training, then once more for PyTorch and the Apache foundation.

Now, Model Infra. These 59 projects are a lot older on average. Only 17 percent
were created in 2025 or later, versus 55 percent on the Agent Infra side. The
agent layer is young; the model stack underneath it is much more established.

The activity is concentrated too. Three quarters of July OpenRank sits in
serving and pre-training. Then follow the stack further down: PyTorch anchors
the training layer, while six Apache projects sit across data and compute.

So here's the point: agents are a new kind of workload, but they don't get a
new stack to run on. They still run through this same, older infrastructure.
Which means whatever new pressure agents create, it has to show up somewhere
else.

## Slide 3 · `2:30–3:02`

Put these two maps side by side and you can actually see where that pressure
lands. Of the 23 new Agent Infra projects that showed up since our last review
in May, 13 of them landed in Runtime. So you've got attention sitting at the
top, old infrastructure sitting at the bottom, and right in the middle—that's
where much of the new building is happening.

## Slide 4 · What Agents Need, and Where the Gap Is · `3:02–4:30`

So why there, why Runtime? Think about a normal cloud-native workload—you
usually know what you're deploying before you deploy it. An agent's different:
it writes code mid-task, calls a model, calls a few tools, waits, retries, and
then the process disappears. But what it *did* along the way—the permissions it
used, the state it changed, its effects on other systems—that sticks around a
lot longer than the process itself. A short-lived process with long-lived
consequences—that's the real problem agents bring.

And the cloud-native ecosystem is already reacting. Projects like Kubernetes
Agent Sandbox and Kata Containers give these short-lived, untrusted executions
a proper lifecycle and a safer boundary.

So, going back to where I started—what does infrastructure actually need to
carry? I'd call it a task envelope: the tenant and policy boundary, runtime
profile, artifacts and state, and the evidence and cleanup for a single run.
The pieces for this already exist in open infrastructure. What doesn't exist
yet is something that carries that boundary all the way through, consistently.

## Slide 5 · Closing · `4:30–4:50`

Which is a good place to hand off. Xu Wang is going to walk you through an
end-to-end agent runtime with a complete open delivery chain—one real attempt
at closing that gap.

Thank you.

## Rehearsal notes

- Current draft: approximately 583 spoken words.
- At 118–124 words per minute, expect about `4:42–4:56`. The slide timings now
  leave a small pause for each reveal and keep the complete handoff under five
  minutes.
- On Slide 2A, use the full map for the pool size. The first reveal isolates
  Application for `32 / 84` and `55%`; the second isolates the complete Runtime
  layer for `31`. Advance at about `1:30` to reveal the full Model Infra map.
- On Slide 2B, use the full map for the project count. The first reveal compares
  project age without dimming the map; the second isolates serving and
  pre-training for `75%`; the third points to the training, data and compute
  foundation for PyTorch and the six Apache projects. Advance at about `2:30`
  to leave the landscape slide.
- Do not read either map section by section. The spoken point is the contrast:
  a young Agent layer is forming above a more established model, data and
  compute stack.
- On Slide 3, read the page vertically: visible attention at the top, `13 of
  23` new projects in Runtime, and the established model stack underneath. The
  project names are there for reference; do not read all thirteen aloud.
- On Slide 4, trace the short-lived process into its long-lived consequences,
  then point to the named project groups. Finish on the task-envelope paragraph.
- The `55%` on the Agent Infra map describes July OpenRank activity. The `13 of
  23` on Slide 3 describes additions to this landscape selection since May.
  Neither is a production-adoption rate.
- Finish Slide 5 facing Xu Wang. Say “Thank you” and leave the stage.

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
- [CNCF TAB reference architecture #147](https://github.com/cncf/tab/issues/147)
