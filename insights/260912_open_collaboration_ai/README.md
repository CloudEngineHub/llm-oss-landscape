# 260910 InclusionConf

This directory is the canonical source for one research project with three audience-facing outputs. Evidence is collected and interpreted here first. The talks and web implementation are derived views; neither is the source of truth for the research.

## Event sequence

### 7–9 September · KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China

Five-minute keynote: **What AI Agents Need from Open Infrastructure**

The keynote uses Agentic AI, CNCF and OpenInfra ecosystem data to explain how the workload changes when agents generate code, call tools and carry state. It should end with a small number of infrastructure responses that the audience can connect to Kubernetes, OpenStack, Kata Containers, OpenTelemetry and adjacent open projects.

Official event page: <https://www.lfopensource.cn/kubecon-cloudnativecon-openinfra-summit-pytorch-conference-china/>

### 10 September · The Inclusion Conference

Ten-minute talk: **When agents joined in, what happened to open-source collaboration?**

The talk opens with the updated Agent Infra and Model Infra maps. The open-infrastructure findings remain one part of the trend section. The additional research asks what happens inside repositories when AI participates in coding, Issues, pull requests and review.

### 260910 release · interactive research report

The report is the durable version of the work. It will combine the landscapes, repository-level evidence, comparable control repositories, case studies and sourced quotes from the CTO and chair. Quote text and attribution remain placeholders until approved copy is supplied.

## Repository structure

- `report/online-report.md` — the mother manuscript and editorial contract.
- `report/interactive-report-outline.md` — interaction and reading-path notes.
- `research/open-infrastructure-trends.md` — sourced ecosystem and infrastructure evidence.
- `research/open-collaboration-study-design.md` — questions, cohorts, metrics and evidence rules.
- `working-notes/01-open-infrastructure-keynote.md` — provisional five-minute extraction.
- `working-notes/02-open-collaboration-talk.md` — provisional ten-minute extraction.
- `landscape-refresh/` — landscape review notebook and supporting data work.

The material under `working-notes/` remains provisional until the repository study is complete. At that point, event-specific presentation sources should be derived into distinct directories under `insights/presentations/`.

## Planned presentation routes

- Full ten-minute presentation: `/presentations/260910_inclusion/present`
- Five-minute infrastructure presentation: `/presentations/260910_inclusion/open-infrastructure/present`

The route retains `260910_inclusion` for link compatibility. The visible release name is `260910_InclusionConf`.

The code for these routes remains under `apps/landscape-web/`. It should consume conclusions from this study rather than becoming a second manuscript.
