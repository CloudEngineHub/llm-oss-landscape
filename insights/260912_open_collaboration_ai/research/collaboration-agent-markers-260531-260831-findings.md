# May–August 2026 public Agent-marker panel

Date: 2026-08-31

The panel reconstructs the latest commit at or before 31 May and 31 August for the same Top 100 research sample. Ninety-nine repositories existed at both dates; one repository was not public by the May snapshot.

## What changed in the paired repositories

| Measure | May | August | Added | Removed | Percentage-point change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Strict instruction | 75 / 99 | 85 / 99 | 10 | 0 | +10.10 |
| Instruction or active config | 85 / 99 | 91 / 99 | 6 | 0 | +6.06 |

The strict paired change has an exact sign-test p-value of 0.0020. This describes a directional change in the fixed panel. It does not establish how frequently an Agent actually acted in the repositories.

## The Cursor decline hypothesis is not supported

Cursor active markers moved from 16 to 17 repositories in the paired panel: 15 retained, 2 added and 1 removed. The exact sign-test p-value is 1.0000. A large decline is absent under the strict active-path definition.

The `.gitignore` residual is reported separately. A residual name can outlive the configuration and is not an adoption event.

## Declared task scope

| Task named in an active instruction | May repositories | August repositories |
| --- | ---: | ---: |
| code_review | 62 | 72 |
| documentation | 68 | 79 |
| implementation | 72 | 81 |
| issue_planning | 66 | 79 |
| release_dependency | 54 | 63 |
| repository_context | 67 | 80 |
| security_compliance | 33 | 40 |
| tests_validation | 72 | 81 |

These counts describe what repository instructions tell an Agent to consider. They do not measure completed Agent tasks. Thread-level evidence is still required for observed use.

## Self-challenge and alternative explanations

- The current Top 100 was used for both historical snapshots. This is a survivor and popularity-conditioned panel, not a representative estimate of all repositories that existed in May.
- The scan uses declared root and `.github` target paths. A project may keep valid instructions deeper in the tree; repeated use of the same path set makes the change comparison more stable than the absolute level.
- A new instruction may record a workflow that was already happening privately. The observed date is the first public marker in the scanned path, not necessarily the true adoption date.
- Tool removal can mean migration, consolidation into a cross-agent file or path movement. Each removal remains a review candidate instead of being interpreted automatically as abandonment.
- Repository readiness can increase while Agent participation in public Issues and pull requests remains low. The next stage must test that possibility directly.
