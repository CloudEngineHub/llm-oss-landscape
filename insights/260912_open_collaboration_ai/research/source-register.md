# Source register and citation rules

The published source list lives in `../report/references.json`. The web report reads that file directly. This note defines how sources should be added as the collaboration study grows.

## Citation families

| Prefix | Family | Examples |
| --- | --- | --- |
| D | Data and platform signals | GitHub, OpenDigger, OpenRouter, Hugging Face |
| R | Surveys and ecosystem reports | CNCF survey, OpenInfra annual report |
| S | Open infrastructure and standards | Kubernetes, SPIFFE, OpenTelemetry |
| C | Project cases | Repository settings, contribution guides, governance material |
| P | Research papers | Peer-reviewed papers and clearly labelled preprints |
| E | Editorial and interaction references | Web-report or visual references, never used as finding evidence |

IDs are stable once published. New items take the next number within their family. Do not renumber existing references to close a gap.

## Minimum record

Every published reference needs:

- a stable ID;
- the source title and publisher;
- a direct HTTPS link;
- the publication date or access date;
- one sentence stating which claim, method or design decision it informed.

The `usedFor` field is deliberately reader-facing. It should name the actual use and should not say only “background research”.

## Evidence rules

1. Prefer a primary API, specification, repository, paper or foundation report.
2. Put the source close to a material claim when the page offers a natural link. The bottom reference library is the complete audit trail, not a substitute for nearby attribution.
3. Record platform boundaries. OpenRouter public app data is opt-in; Hugging Face downloads are artifact requests; Stars are attention; none of them is a user count or production-adoption measure.
4. Separate observation from interpretation. A repository setting can be verified directly. Its governance consequences are an interpretation and should be written as such.
5. For papers, record version, venue and DOI or arXiv identifier. Label preprints. When several papers disagree, cite the competing result rather than selecting one silently.
6. Keep editorial references in the E family. They can inform interaction and reading structure, but they cannot support ecosystem findings.

## Future Collaboration chapter

The repository-level study should attach references at three levels:

- **measurement** — prior work defining review load, contribution quality or human–AI collaboration measures;
- **method** — papers supporting matched controls, causal limits and bot or agent attribution;
- **interpretation** — empirical studies that help explain the observed result without replacing the repository evidence.

A paper belongs in the published list only after it is read closely enough to state what it contributes and what it does not establish.
