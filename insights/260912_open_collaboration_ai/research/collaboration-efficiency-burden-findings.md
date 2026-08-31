# Agents are expanding throughput, but they have not reduced maintenance burden

## Answer

In this matched panel, visible Agent adoption rose sharply, but response and resolution did not improve with it. The repositories absorbed far more incoming work, while human attention became thinner per thread. The defensible conclusion is not that Agents made collaboration more efficient. It is that they increased the system's capacity to generate, review and revise work, while the maintenance bottleneck remained human and total review load grew.

## The experiment

The panel contains 840 probability-sampled Issues and pull requests from 10 repositories. It compares the same 1 May–28 August window in 2024, 2025 and 2026. Response is measured within seven days; resolution and burden signals within 30 days. Threads without a response or resolution remain in the denominator. This corrects the earlier closed-items-only median, which made mature successes look faster by dropping censored failures.

## Demand grew much faster than human attention

The ten-repository population rose from 38,429 threads in 2025 to 101,853 in 2026, a 165% increase. Visible Agent participation rose from 33.5% to 54.4%; coding and review agents alone rose from 13.1% to 34.5%.

Over the same period, the share receiving a human response within seven days fell from 60.3% to 46.9%. Maintainer response fell from 42.9% to 20.0%. The maintainer decline appeared in both Issues and pull requests and was directionally consistent across almost every matched repository.

## More activity did not become more completed work

Thirty-day Issue closure fell from 48.7% to 38.4%. Thirty-day pull-request merge fell from 70.8% to 54.6%, while closing without merge rose from 18.1% to 33.0%. The data therefore shows more throughput pressure, not a higher probability that an individual contribution reaches a productive outcome.

## The burden shifted from depth per thread to total system load

At the equal-repository level, visible maintainer actions per thread were essentially flat (1.48 → 1.44), as were maintainer review events per pull request (1.37 → 1.42). But because the arrival population was 2.65 times larger, the volume-weighted point estimate of visible maintainer actions rose from roughly 48,261 to 76,811. Its 2026 bootstrap interval is wide (44,556–116,184), so the exact total should not be treated as a census. The stable per-thread rate and rising total are consistent with overload: maintainers do not spend more attention on each thread, yet face much more work overall.

## Agent-visible threads show more iteration, not a clear outcome gain

Within 2026, pull requests with a coding or review agent visible in the first 24 hours had a 48.7% 30-day merge rate, versus 47.2% without one. They also had 4.67 versus 3.00 conversation runs, 1.60 versus 0.86 maintainer review events, and 3.94 versus 0.76 commits after the first review. This is consistent with faster, denser iteration and more review work. It is not causal evidence: difficult pull requests may be more likely to attract an Agent.

## Decision

The evidence supports **capacity amplification with shifted maintenance cost**, not demonstrated net efficiency. Agents appear useful for producing feedback and additional revisions. They have not yet raised the probability of timely human response, Issue resolution or PR merge in this panel. The practical bottleneck is now review, prioritization and maintainer attention—not generation of another patch.

## Limits

- Public GitHub events miss private and human-mediated Agent use.
- Early visible Agent participation is not randomly assigned; the within-2026 comparison is descriptive.
- The panel covers ten high-activity repositories, not the entire ecosystem.
- GitHub-visible actions are workload proxies, not measured labor hours or code quality.
- 1.7% of response events came from accounts whose identity remained ambiguous; they were excluded from human and Agent counts.
