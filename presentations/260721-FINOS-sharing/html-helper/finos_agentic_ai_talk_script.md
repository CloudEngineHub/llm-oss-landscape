# FINOS AI Readiness SIG Talk Script

Event: FINOS AI Readiness SIG, 21 July 2026  
Speaker: Yaya Xia, Ant Open Source  
Length: about 15-17 minutes

## Opening

Hi everyone. I am Yaya Xia from Ant Open Source. I also work closely with InclusionAI.

Today I want to share a piece of work I have been working on for the past two years. We track the open-source AI ecosystem and publish it as a landscape report.

I will first explain why I do this work and how we build it. Then I will share a few findings from the latest data. 

I will also introduce AMP, the Agentic Mobile Protocol from Alipay+. Ant Group is a fintech company, so payments give us a very clear example of the trust problem around agents.

At the end, I will briefly introduce InclusionAI. Richard will then share the latest progress on the Ant Ling model family, which is the fundemental part of the Landscape of inclusionAI.

## The ecosystem moves faster than our categories

I started this work because the AI ecosystem moves very fast.

A new repository can get thousands of stars in a few days. Project descriptions also change quickly. A RAG project may start calling itself a memory system. A workflow tool may become an agent platform this year.

Some of these changes reflect real engineering work. Some follow the latest trend. It can be hard to tell the difference.

So I wanted a more stable way to read the ecosystem.

Last year, when we published the first report, it looked more like a toolchain around large language models. As we kept updating it, the old categories became less useful.

Agents were using tools and working on longer tasks. More infrastructure was growing around them.

The landscape helps us answer a few simple questions. Which projects have active communities? Which areas are growing?


## How we build the landscape

We begin with public data, mainly GitHub, and also some public signals from HuggingFace and OpenRouter.

Stars tell us where attention is going. OpenRank looks at collaboration around issues and pull requests. This helps us see whether people are actually building and discussing the project.

Then we read the projects. READMEs show how maintainers describe the work. Releases show what is changing. Issues often show the problems users meet in real life.

We still review everything by hand. Repository tags can be messy. A project may also belong to more than one category. The categories still need human judgment to some extent.

The final result has two views. The landscape shows the structure of the ecosystem. It was last updated at the end of May, and the full open-source project list, with detailed information and metrics, is now under a workflow that we try to update weekly in the GitHub repo.

There is also a project leaderboard on the InclusionAI website. It tracks current activity and changes more often.

## Three-layer architecture

In the latest 2026 report, we studied more than 200 projects. We organized them into three layers.

Agent Infra is where agents do work. It gives them tools, context, and environments.

Model Infra makes model capability practical to run. This is where routing and cost become important.

The model layer still decides what the whole system can do, it decides the capability boundry.

The three layers push one another. Agents create longer workloads. Infrastructure makes those workloads easier to run. Better models let agents handle more difficult tasks.

This is the architecture we formulated in May.

The April OpenRank ranking showed that agents and infrastructure are co-centers of the ecosystem. OpenClaw was number one. vLLM and PyTorch were second and third. Claude Code was fourth.


## The Agent Infra landscape

Now let us look at the top layer first. This is where a person stops only asking a model a question and starts asking an agent to do something.

Agent Infra is the busiest part of the landscape. This is where we see coding agents, agent workspaces, and the tools that connect agents to real tasks.

Coding agents are an early entry point for agentic AI. Because coding by native privdes agents a clear place to work. There are files, tests, and a review history. An agent can propose a patch, and a human can check the diff.

We tracked 78 coding-agent projects. It is the largest category in this layer.

We also tracked 59 MCP-related projects, that's the label that projects tend to tag themselves.

The activity is spreading beyond the visible agent interface. The runtime around the agent is growing: context, tools, sandbox, memory, permissions, and evaluation.


## The Model Infra landscape

The next layer is Model Infra. It is the model training-to-serving pipeline: from data, to pre-training, to post-training, to serving.

Once an agent works on a longer task, one user request can create many model calls. Cost starts to behave like an operating expense.

In the LiteLLM repository, we found 76 issues or pull requests related to spend tracking. Budget routing appeared 37 times.

These are very practical questions. How much did this task cost? Which model should handle the next step? When should the system use a cheaper model?

There is also some research pointing in the same direction. 
RouteLLM and IPR are papers published separately on ICLR and EMNLP, together, they show that model routing can use lightweight quality estimation to match each request with a model that is good enough, rather than defaulting to the strongest one. In both research and production settings, this proves routing is a practical way to balance response quality and operating cost.


## The large-model landscape

Then we come to the model layer.

Models still set the capability boundary. But real products rarely have only one type of work.

So it falls back to the same question.

A coding agent may need a strong reasoning model. A small internal task may need a cheaper or locally deployed model. A financial workflow may need a model that works well with domain knowledge and policy controls.

So the useful question is: which model fits this task, this budget, and this level of risk?

This is why the landscape shows many model families and many deployment choices. The infrastructure layer helps teams choose between them.

That's all the three layers.

Every time we publish it, we try to keep the map selective. It should be easy to read. Every project needs a clear reason to be there.

Why do we keep doing this work?

Internally, it helps with technology decisions. We can ask: which open-source projects are worth watching? Which infrastructure layer is heating up? Where should we contribute or collaborate?

Externally, we also hope this can become a useful open resource for the community. Open source in the AI era is not only about code. It is also about making intelligent infrastructure understandable and auditable.

## What we found

Here are some interesting findings.

Ninety-six of the 226 projects had changed the way they described themselves.

The word "agent" appeared most often among the new terms. We also saw words such as "harness" and "context."

Some projects that used to describe themselves as chat or research tools now talk about agent runtimes. Their language is following a real change in the product.

The coding-agent data gives us another view of the same change.

We scanned the file trees of the Top 100 Agentic AI projects. Ninety-two percent used at least one coding agent. Claude Code appeared in 81 percent. Gemini CLI had traces of eight coding-agent tools. Some were removed from the repo, but we still found traces in `.gitignore`.

So coding agents are already part of project maintenance. These projects are using the tools in their own work.

## Software activity keeps expanding around AI

The ecosystem is also much larger than it may look from a few popular projects.

GitHub reported more than 180 million developers last year, Hugging Face now has more than two million public models.

Automated participation is growing too. The number of bot or app actors grew more than 100 times over the past 10 years. We also identified 198 likely bot or app accounts in the Top 10,000. They were doing more than basic CI work. Some were connected to code review or automated fixes. So automated actors are already entering the same collaboration network as human developers

The Top 10,000 contributors came from many kinds of organizations. NVIDIA had the largest known company group in our data. Microsoft and GitHub, Intel, and Google were also visible.

The network is global. Among profiles with a known location, the largest groups were in the United States and China. India and Germany were also active.


## Agents need visible authority and evidence

Now finished with the ecosystem observation, In the next part, I want to discuss a concrete scenario faced by Agentic AI era.

For financial services, especially the kind of work FINOS cares about, agents raise a very direct question: who allowed this agent to act?

And after permission is given, the system still needs to know the approved scope. What can the agent do? What is the limit? And if something goes wrong, do we have enough evidence to review the action later?

Luca shared several FINOS leading projects with me earlier, and I believe they already cover parts of this problem. You probably know these projects much better than I do. So I am not trying to explain them in detail. I am just trying to map them back to the story: when agents move into real workflows, authority and evidence become part of the infrastructure.


## Payments expose the agent trust gap

Payments make the trust problem easy to see.

In a normal mobile payment, the user sees the transaction and confirms it.

With an agent, the user may say, "Find me a flight under this budget. Book it if the timing works."

The agent may finish the task later. The merchant and wallet still need to know what the user approved.

They need to check the budget and the conditions. They also need to know whether the final order stayed inside that scope.

## AMP carries trust context above existing payment rails

AMP, the Agentic Mobile Protocol, is the open-source application-layer protocol developed by Alipay+, and it carries the trust context above existing payment rails.

I probably cannot introduce AMP better than the project team themselves, so I will keep this part very brief. My understanding is that AMP is not trying to replace existing payment rails. It is trying to carry the trust context above them: who is acting, under whose authorization, within what scope, and with what evidence.

The whitepaper describes two payment patterns the protocal defines.

The first is real-time approval. The agent prepares the order. The user checks it and confirms the payment.

The second is pre-authorized intent. The user approves the goal and the limits earlier. The agent can continue later. The final transaction must stay inside those limits.

The protocol still needs input from different parts of the payment ecosystem.

Banks can test delegated intent against their risk policies. Wallets can look at user approval and control. Card networks can examine authorization and merchant integration.

From the ecosystem side, AMP is also looking for the right kind of partnership and governance home. One possible path is to work with the Linux Foundation ecosystem: AAIF can support upstream agent calls, while FINOS can support the integration of downstream wallets and card networks.

## The first useful work might simply be an integration case

To be honest, this part is more of a thought starter. Codex helped me look for possible collaboration angles, but I have not validated the feasibility or the technical details. So please treat this as me rambling a little bit, not as a concrete proposal.

If people are interested, maybe next time we can invite the AMP team to do a proper introduction and talk through where a real integration case could make sense.


## An open stack for inclusive AGI

In the final session, let me close with the wider InclusionAI picture.

InclusionAI is Ant Group's open AGI initiative. The basic idea is that intelligence should be something more people can understand, use, adapt, and improve.

The way we think about this is quite close to the landscape I just showed. InclusionAI expands across the full AI stack. aside from the model effort, it also includes model infrastructure, agent infrastructure, and real service scenarios.

On the infrastructure side, one project I would mention is AReaL, which is our reinforcement learning infrastructure for reasoning and agentic models. It is now part of the PyTorch ecosystem and is moving toward a PyTorch foundation hosted project.

On the model side, 

Ant Ling is the main model series. I would describe it as our exploration of general model capability across language, reasoning, and multimodal use. It is the base capability layer.

LingBot model series are Embodied Intelligence Models. It explores the boundries of bringing AI to  physical or semi-physical environments.

Richard can give a much deeper update on the Ant Ling models. I just wanted to place them in the same map: InclusionAI is trying to explore capability, modality, real-world scenarios, embodied intelligence, and efficiency together, and we want to do this in the open and inclusive way.

Thank you, and Now I'll hand over to Richard.

## Optional cut

For a shorter version, skip the employer and location details in "Software activity keeps expanding around AI." In the FINOS section, keep AI Governance, Fluxnova, and CALM.
