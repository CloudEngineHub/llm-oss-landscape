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

- `report/` contains publication material: the reader-facing manuscript, web reading structure, page copy and published reference library.
- `report/online-report.md` is the mother manuscript. Completed analysis belongs here in full prose.
- `report/interactive-report-outline.md` contains interaction and reading-path notes, not research findings.
- `report/web-copy.json` contains short editable page copy derived from the manuscript.
- `report/references.json` is the reader-facing source library used by the web report.
- `research/` contains the audit trail: definitions, calculations, source notes, study design and evidence boundaries. It supports the report without duplicating its narrative.
- `research/README.md` is the human reading guide. Start there instead of opening the 109 research artifacts one by one.
- `research/landscape-signals.md` is the evidence register for Chapter 01.
- `research/open-infrastructure-trends.md` contains sourced ecosystem and infrastructure evidence.
- `research/open-collaboration-study-design.md` contains questions, cohorts, metrics and evidence rules.
- `research/collaboration-mode-migration-design-2022-2026.md` defines the five-year collaboration-mode panel; the identity review, annual marker panel and ClickHouse activity backbone are now complete.
- `research/open-collaboration-data-protocol.md` defines the GitHub collection, actor classification and data-quality gates.
- `research/research-question-evidence-matrix.md` maps the four user research questions to the completed measurements, current answers and remaining causal limits.
- `research/collaboration-research-validation-log.md` records rejected assumptions and design corrections, including the timeline timestamp gap and actor-class sensitivity test.
- `research/collaboration-thread-sample-2026.csv`, `research/collaboration-thread-events-2026.csv`, `research/collaboration-thread-review-comments-2026.csv` and `research/collaboration-thread-pr-commits-2026.csv` form the auditable 2,000-thread event sample.
- `research/collaboration-thread-analysis-2026-summary.csv` and `research/collaboration-thread-estimates-bootstrap-2026.csv` are the primary estimate and uncertainty tables consumed by Chapter 02.
- `scripts/validate_collaboration_empirical.py` fails closed if the sample, endpoint completeness, event total, bootstrap point estimates or corrected review/gate metrics drift.
- `research/collaboration-sample-top100-2607.csv` freezes the primary OpenRank Top 100 cohort and contains the editable `llm_native_manual` review column.
- `research/collaboration-strata-findings.md` compares LLM identity and technical-area groups at repository level.
- `research/collaboration-deep-stage-findings.md` summarizes the 10-repository, three-stage deep study.
- `research/collaboration-sample-quality-260827.md` records the sample checks, risks and refresh requirements.
- `research/collaboration-sample-llm-native-review-260829.csv` records the 100 project identity decisions with confidence and a short reason.
- `research/collaboration-five-year-findings-260829.md` is the first evidence-backed findings note for the Collaboration chapter.
- `research/collaboration-five-year-summary-260829.csv` is the compact chart and report summary table.
- `research/collaboration-agent-markers-2022-2026-summary.csv` and `research/collaboration-agent-markers-2022-2026-evidence.csv` preserve the annual machine-readable rule scan.
- `research/collaboration-surfaces-top100-260829.csv` refreshes the current Issue, Pulls, Discussions and contribution-document surfaces.
- `research/collaboration-repository-year-2022-2026.csv` is the ClickHouse activity backbone; its 2025-2026 PR payload warnings are documented in the findings note.
- `research/collaboration-pilot-10-260827.csv` freezes the ten-repository method pilot plus the DeepSeek Harness case anchor.
- `research/collaboration-pilot-findings-260827.md` records pilot findings and collection changes before the Top 100 run.
- `working-notes/01-open-infrastructure-keynote.md` — provisional five-minute extraction.
- `working-notes/02-open-collaboration-talk.md` — provisional ten-minute extraction.

Working rule: write the conclusion once in `report/online-report.md`; keep the
numbers and derivation needed to verify it in the corresponding `research/`
file. Talks and UI copy are shortened derivatives of those two layers.
- `landscape-refresh/` — landscape review notebook and supporting data work.

The material under `working-notes/` remains provisional until the repository study is complete. At that point, event-specific presentation sources should be derived into distinct directories under `insights/presentations/`.

## Planned presentation routes

- Full ten-minute presentation: `/presentations/260910_inclusion/present`
- Five-minute infrastructure presentation: `/presentations/260910_inclusion/open-infrastructure/present`

The route retains `260910_inclusion` for link compatibility. The visible release name is `260910_InclusionConf`.

The code for these routes remains under `apps/landscape-web/`. It should consume conclusions from this study rather than becoming a second manuscript.
