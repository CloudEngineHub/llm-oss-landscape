# GitHub Events: May Comparison, 2022-2026

## Scope

- Source: ClickHouse `opensource.events`
- Platform: `platform = 'GitHub'`
- Baseline: `from_api = 0`, matching the raw GH Archive-derived event stream
- Window: the complete month of May in 2022, 2023, 2024, 2025 and 2026
- Query date: 2026-09-05
- Main aggregate query ID: `821e78a8-9ced-4b7f-952f-e2ce77bfc29b`
- API-backfill audit query ID: `a4d2470d-1227-416d-b909-b0ba13cf913c`
- Daily-coverage audit query ID: `666d903a-3f39-4fec-ad17-f6b705458098`

All five windows begin on May 1 and end on May 31 at second-level precision. Every archive event type has records on all 31 days in every window. The archive baseline contains 10 event types; two additional types, `DiscussionEvent` and `IssuesReactionEvent`, occur only in `from_api = 1` backfills and are therefore excluded from the comparable baseline.

## Event Counts

| Event | 2022-05 | 2023-05 | 2024-05 | 2025-05 | 2026-05 | 2022-26 |
|---|---:|---:|---:|---:|---:|---:|
| All GitHub archive rows | 79,036,612 | 92,357,487 | 121,043,586 | 127,073,260 | 97,641,384 | +23.5% |
| PushEvent | 52,190,861 | 62,301,566 | 90,728,773 | 96,049,206 | 88,682,757 | +69.9% |
| PullRequestEvent | 8,569,944 | 8,565,748 | 9,229,572 | 10,005,633 | 3,493,300 | -59.2% |
| IssueCommentEvent | 5,357,069 | 5,163,112 | 5,647,866 | 5,943,381 | 1,447,346 | -73.0% |
| IssuesEvent | 2,022,727 | 2,338,097 | 2,343,631 | 2,358,153 | 1,206,550 | -40.4% |
| WatchEvent | 4,610,347 | 6,399,831 | 6,009,020 | 5,407,592 | 986,355 | -78.6% |
| PullRequestReviewEvent | 2,156,300 | 2,542,823 | 2,728,746 | 2,962,456 | 662,201 | -69.3% |
| PullRequestReviewCommentEvent | 1,516,035 | 1,683,435 | 1,822,486 | 2,147,972 | 639,993 | -57.8% |
| ForkEvent | 1,500,573 | 1,497,920 | 1,590,775 | 1,266,446 | 248,401 | -83.4% |
| ReleaseEvent | 535,885 | 633,487 | 818,387 | 819,797 | 242,247 | -54.8% |
| CommitCommentEvent | 576,871 | 1,231,468 | 124,330 | 112,624 | 32,234 | -94.4% |

## API-only Event Types

These are present in the ClickHouse table but absent from the `from_api = 0` archive baseline. They are shown for type completeness and must not be added to the table above without changing the metric definition.

| Event | 2022-05 | 2023-05 | 2024-05 | 2025-05 | 2026-05 |
|---|---:|---:|---:|---:|---:|
| DiscussionEvent | 1,133 | 2,018 | 3,374 | 1,895 | 892 |
| IssuesReactionEvent | 3,615 | 1,467 | 1,527 | 2,189 | 4,781 |

## Year-over-year Change

| Event | 2023 vs 2022 | 2024 vs 2023 | 2025 vs 2024 | 2026 vs 2025 |
|---|---:|---:|---:|---:|
| All GitHub archive rows | +16.9% | +31.1% | +5.0% | -23.2% |
| PushEvent | +19.4% | +45.6% | +5.9% | -7.7% |
| PullRequestEvent | -0.0% | +7.7% | +8.4% | -65.1% |
| IssueCommentEvent | -3.6% | +9.4% | +5.2% | -75.6% |
| IssuesEvent | +15.6% | +0.2% | +0.6% | -48.8% |
| WatchEvent | +38.8% | -6.1% | -10.0% | -81.8% |
| PullRequestReviewEvent | +17.9% | +7.3% | +8.6% | -77.6% |
| PullRequestReviewCommentEvent | +11.0% | +8.3% | +17.9% | -70.2% |
| ForkEvent | -0.2% | +6.2% | -20.4% | -80.4% |
| ReleaseEvent | +18.2% | +29.2% | +0.2% | -70.5% |
| CommitCommentEvent | +113.5% | -89.9% | -9.4% | -71.4% |

## Reading the Result

The May totals rise from 79.0 million rows in 2022 to 127.1 million in 2025, then fall to 97.6 million in 2026. That headline decline is not evenly distributed. `PushEvent` falls only 7.7% year over year, while all non-Push events combined fall from 31.0 million to 9.0 million, or 71.1%. As a result, the Push share rises from 66.0% in 2022 and 75.6% in 2025 to 90.8% in 2026.

This is a data-lineage finding before it is an ecosystem finding. The simultaneous 2026 collapse of Watch, PR, review, issue-comment, fork and release events, alongside a much smaller Push decline, indicates selective loss or filtering in the upstream archive stream. These figures should not be used to claim that GitHub collaboration itself fell by the same percentages. For 2026 collaboration studies, use repository-authorized API collection or another independently validated source for issue, PR, review and star histories; retain this table as evidence of the archive stream's changing composition.

The detailed CSV stores each year's count, within-year share and year-over-year change. The companion SQL preserves the exact filters and audit queries.
