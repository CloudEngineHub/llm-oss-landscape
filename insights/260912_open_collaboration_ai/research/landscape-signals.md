# Landscape signals · evidence and chart map

Status: verified evidence register for the completed 01 Landscape chapter
Snapshot date: 27 August 2026
Audience: product stakeholders and open-source infrastructure practitioners
Publication target: `../report/online-report.md`

## Reporting job

Question: What does the current Agentic AI landscape say about the technical direction of the ecosystem, beyond changes against the May tracking pool?

Answer spine:

- Agent-facing products and model infrastructure remain distinct engineering stacks.
- Agent Runtime projects are clustering around the execution path that connects context to an external effect.
- OpenRouter and model-hub evidence provide narrow outside checks; GitHub remains the main evidence layer for project construction and collaboration.

## GitHub source and definitions

Source: `data/agentic-ai-projects.csv`
Selection: `landscape_action` is `keep` or `add`
Population: 143 repositories, comprising 84 Agent Infra and 59 Model Infra projects

- Stars: repository Star count in the canonical snapshot. It measures attention, not adoption.
- Primary language: GitHub's repository-level language label. It is not a source-line distribution.
- Contributors: `contributors`, the current count returned by GitHub's REST `List repository contributors` endpoint without anonymous contributors. It is based on commit authors and may lag recent activity because GitHub caches the result.
- Contributor scatter: all 143 selected repositories have a non-zero contributor count in the 27 August 2026 refresh.
- Correlation: Pearson correlation between `log10(stars + 1)` and `log10(contributors + 1)` is 0.19. The value is retained as a research check, not displayed as a headline statistic.
- Scope: GitHub documents its displayed contributors graph as default-branch based. This is not a count of everyone who opened an Issue, reviewed a pull request or participated elsewhere in the community.

## Verified chapter ledger

This section is the numerical audit trail for Chapter 01. The report carries
the interpretation; this file preserves the inputs, grouping rules and values
needed to check it.

### Population and comparison base

| Measure | Value |
| --- | ---: |
| May 2026 tracking pool | 227 repositories |
| Current canonical list | 277 repositories |
| Current landscape selection | 143 repositories |
| Agent Infra | 84 repositories |
| Model Infra | 59 repositories |
| Current selections outside the May pool | 31 repositories |
| Agent Infra selections outside the May pool | 23 repositories |
| Model Infra selections outside the May pool | 8 repositories |

“Outside the May pool” is a repository-set comparison after lower-casing the
GitHub owner/name. It does not mean that the repository was created after May,
and the May tracking pool is not identical to a reconstructed published map.

### Layer distribution

Agent Infra sections are grouped into Application, Framework and Runtime. Model
Infra sections are grouped by their `Serving`, `Pre-Train`, `Data`, `Compute`
and `Post-Train` prefixes.

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

### Age and primary language

- 46 of 84 Agent Infra projects were created in 2025 or later: 55%.
- 10 of 59 Model Infra projects were created in 2025 or later: 17%.
- TypeScript is primary for 33 Agent Infra repositories; Python is primary for 27.
- Python is primary for 33 Model Infra repositories; TypeScript is primary for four.
- GitHub primary language is a repository label, not a source-line distribution.

### April-to-July OpenRank increases

Growth is `July OpenRank - April OpenRank`, using positions 11 and 8 in
`openrank_trend_2508_2607`. The report shows the six largest positive absolute
changes. It does not calculate percentage growth from small baselines.

| Project | Section | April | July | Change |
| --- | --- | ---: | ---: | ---: |
| Lark CLI | Tools, web & computer use | 95.47 | 179.37 | +83.90 |
| OpenViking | Memory, knowledge & context | 135.01 | 177.61 | +42.60 |
| DeepSeek Reasonix | Agentic coding | 1.60 | 26.06 | +24.46 |
| FlashInfer | Pre-Train · Compiler & accelerator | 127.11 | 147.83 | +20.72 |
| Orca | Multi-agent orchestration | 13.86 | 29.10 | +15.24 |
| Deer Flow | Multi-agent orchestration | 203.53 | 218.20 | +14.67 |

### Excluded from the published chapter: Stars and GitHub contributors

The scatter uses all 143 selected repositories. The Pearson correlation between
`log10(stars + 1)` and `log10(contributors + 1)` is 0.1851, reported as 0.19.
The calculation is retained here for audit, but the chart was removed from the
published Chapter 01 on 27 August. The correlation alone did not support a
strong enough technical-trend finding.

| Project | Layer | Contributors | Stars |
| --- | --- | ---: | ---: |
| Pydantic AI | Agent Infra | 475 | 18,861 |
| Codex | Agent Infra | 471 | 102,090 |
| Vercel AI SDK | Agent Infra | 470 | 25,859 |
| LangChain | Agent Infra | 467 | 142,799 |
| Mastra | Agent Infra | 465 | 26,649 |
| TRL | Model Infra | 464 | 18,952 |

### Runtime path grouping

The five-step path is an editorial interpretation of the existing Runtime
sections. It is not a maturity model or a required architecture.

| Runtime role | Source section | Projects | Examples |
| --- | --- | ---: | --- |
| Context | Memory, knowledge & context | 9 | OpenViking, Milvus |
| Interface | Protocols & interoperability | 8 | A2UI, MCP Context Forge |
| Action | Tools, web & computer use | 6 | Lark CLI, CUA |
| Isolation | Development sandboxes | 4 | Coder, Agent Sandbox |
| Evidence | Observability & evaluation | 4 | Langfuse, Opik |

## External evidence

### OpenRouter App & Agent Rankings

Source: <https://openrouter.ai/apps/>
Checked: 27 August 2026

- DeepSeek Harness appeared fifth in the public global app ranking.
- It also appeared in the page's fastest-growing weekly list with growth above 999%.
- Coverage is limited to public applications opting into OpenRouter attribution.
- Token counts are platform traffic, not unique users or deployments.

API definition: <https://openrouter.ai/docs/api/api-reference/datasets/get-app-rankings>

### OpenRouter, ZenMux and Hugging Face model sample

Sources:

- `insights/presentations/260807-CoC-KN/large-models-refresh/data/monthly_models_top50_open_closed.csv`
- `insights/presentations/260807-CoC-KN/large-models-refresh/data/monthly_source_summary.json`
- Hugging Face Hub API: <https://huggingface.co/docs/hub/en/api>

Window: 1–30 June 2026

- Five of the top ten composite usage ranks had an official public-weight repository resolved on Hugging Face.
- Twenty-four of the top fifty met the same condition.
- OpenRouter and ZenMux raw token counts were converted to within-platform percentiles before combination.
- Hugging Face downloads were excluded from the cross-model usage composite.
- Open-weight is an access classification, not an OSI license determination.

## Chart map

| Report segment | Question | Visual | Fields | Supported claim | Palette |
| --- | --- | --- | --- | --- | --- |
| Landscape overview | What is included before we interpret it? | Switchable full Agent Infra and Model Infra maps | selected repository, layer, section, July OpenRank | The maps are the evidence base for the findings that follow | Existing landscape palettes |
| Engineering stack | Which languages dominate each layer? | Two 100% stacked bars | layer, primary language, repository count | Agent products lean TypeScript; Model Infra is Python-led | Pink, blue, violet, ink, neutral |
| Runtime path | Where is Agent Runtime taking shape? | Ordered five-step strip | runtime section, project count, examples | Runtime density follows context, interface, action, isolation and evidence | Ordered pink-to-blue keylines |
| Outside GitHub | Do external platforms contradict the GitHub picture? | Two evidence cards | ranking, weekly growth, weight access | Usage data also points toward coding agents and open-weight models | Violet emphasis, neutral containers |

## Omitted in this pass

- Developer geography, employer and role: no frozen, deduplicated contributor-profile sample exists for the 143-project selection.
- PyPI and npm downloads: repository-to-package mappings and monorepo package boundaries are not yet frozen.
- ModelScope: useful for China-specific coverage, but no reproducible snapshot has been stored for this release.
- Issue and pull-request collaboration modes across the full landscape: reserved for the matched repository study in chapter 02.
- Stars versus cumulative contributors: calculated and retained above, but excluded from the published chapter because it did not support a strong technical-trend finding.

These omissions should remain research follow-ups rather than be represented by inferred or manually sampled figures.
