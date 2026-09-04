"use client";

import type { CSSProperties, ReactNode } from "react";

import type {
  InclusionResearchStats,
  LanguageMixGroup,
  RuntimePathPoint,
} from "./research-data";
import styles from "./page.module.css";

type BarStyle = CSSProperties & {
  "--bar-delay": string;
  "--bar-width": string;
};

type FlowRevealStyle = CSSProperties & {
  "--flow-delay": string;
};

export function LanguageMixChart({
  agentTotal,
  groups,
  modelTotal,
}: {
  agentTotal: number;
  groups: LanguageMixGroup[];
  modelTotal: number;
}) {
  const rows = [
    { label: "Agent Infra", total: agentTotal, key: "agent" as const },
    { label: "Model Infra", total: modelTotal, key: "model" as const },
  ];

  return (
    <div className={styles.languageChart}>
      <div className={styles.languageRows}>
        {rows.map((row) => (
          <div className={styles.languageRow} key={row.key}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.total} repositories</span>
            </div>
            <div
              className={styles.languageBar}
              role="img"
              aria-label={`${row.label} primary-language mix`}
            >
              {groups.map((group, index) => (
                <i
                  data-language={group.label.toLowerCase()}
                  key={group.label}
                  style={
                    {
                      "--bar-delay": `${index * 80}ms`,
                      "--bar-width": `${(group[row.key] / row.total) * 100}%`,
                    } as BarStyle
                  }
                  title={`${group.label}: ${group[row.key]} repositories`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.languageLegend} aria-label="Language legend">
        {groups.map((group) => (
          <span key={group.label}>
            <i data-language={group.label.toLowerCase()} />
            {group.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RuntimePath({ points }: { points: RuntimePathPoint[] }) {
  return (
    <div className={styles.runtimePathSteps}>
      {points.map((point, index) => (
        <article key={point.label}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{point.shortLabel}</strong>
          <b>{point.projects}</b>
          <small>{point.label}</small>
          <div>
            {point.examples.map((project) => (
              <a
                href={`https://github.com/${project.repo}`}
                key={project.repo}
                target="_blank"
                rel="noreferrer"
              >
                {project.name}
              </a>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MonthlyFlowPanel({
  activityFlow,
  body,
  title,
}: {
  activityFlow: InclusionResearchStats["collaboration"]["activityFlow"];
  body: ReactNode;
  title: ReactNode;
}) {
  const monthlyFlowMaximum = Math.max(
    ...activityFlow.monthly.flatMap((item) => [
      item.issues,
      item.pullRequests,
    ]),
  );

  return (
    <section className={styles.monthlyFlowPanel} data-visible="true">
      <div className={styles.activityPanelHeading}>
        <div>
          <h4>{title}</h4>
        </div>
        <p>{body}</p>
      </div>
      <div className={styles.monthlyFlowChart}>
        {activityFlow.monthly.map((item, index) => (
          <div
            className={styles.monthlyFlowColumn}
            key={item.month}
            style={{ "--flow-delay": `${index * 65}ms` } as FlowRevealStyle}
            tabIndex={0}
          >
            <div className={styles.monthlyFlowBars}>
              <i
                data-flow="issue"
                style={{ height: `${(item.issues / monthlyFlowMaximum) * 100}%` }}
              />
              <i
                data-flow="pull-request"
                style={{
                  height: `${(item.pullRequests / monthlyFlowMaximum) * 100}%`,
                }}
              />
            </div>
            <strong>{item.label}</strong>
            <span role="tooltip">
              {item.issues.toLocaleString("en-US")} Issues ·{" "}
              {item.pullRequests.toLocaleString("en-US")} PRs ·{" "}
              {item.ratio.toFixed(2)}×
            </span>
          </div>
        ))}
      </div>
      <div className={styles.flowLegend}>
        <span data-flow="issue">Issues</span>
        <span data-flow="pull-request">Pull requests</span>
      </div>
    </section>
  );
}

export function PressurePanel({
  body,
  pressure,
  title,
}: {
  body: ReactNode;
  pressure: InclusionResearchStats["collaboration"]["systemPressure"];
  title: ReactNode;
}) {
  const pressure2025 = pressure.history.find((item) => item.year === 2025)!;
  const pressure2026 = pressure.history.find((item) => item.year === 2026)!;
  const pressurePullRequestGrowth =
    ((pressure2026.pullRequestsOpened - pressure2025.pullRequestsOpened) /
      pressure2025.pullRequestsOpened) *
    100;
  const pressureRoleMaximum = Math.max(
    ...pressure.roleFlows.map((item) => item.pullRequestBalance),
  );

  return (
    <section className={styles.pressurePanel}>
      <div className={styles.activityPanelHeading}>
        <div>
          <h4>{title}</h4>
        </div>
        <p>{body}</p>
      </div>

      <div className={styles.pressureStory}>
        <section>
          <header>
            <div>
              <span>Pull requests opened · same 55 repositories</span>
              <h5>Incoming code doubled in one year.</h5>
            </div>
            <strong>+{Math.round(pressurePullRequestGrowth)}%</strong>
          </header>
          <div className={styles.pressureTrend}>
            {pressure.history.map((item) => (
              <div key={item.year}>
                <span>{item.year}</span>
                <i>
                  <em
                    style={{
                      width: `${(item.pullRequestsOpened / pressure2026.pullRequestsOpened) * 100}%`,
                    }}
                  />
                </i>
                <b>{formatCompact(item.pullRequestsOpened)}</b>
              </div>
            ))}
          </div>
        </section>
        <aside>
          <h5>More of that code waited.</h5>
          <dl>
            <div>
              <dt>PR queue added</dt>
              <dd>
                {formatSignedCompact(pressure2025.pullRequestBalance)} <i>→</i>{" "}
                {formatSignedCompact(pressure2026.pullRequestBalance)}
              </dd>
            </div>
            <div>
              <dt>Still open after 90 days</dt>
              <dd>
                {formatPercent(pressure2025.pullRequestUnresolved90dShare, 1)}{" "}
                <i>→</i>{" "}
                {formatPercent(pressure2026.pullRequestUnresolved90dShare, 1)}
              </dd>
            </div>
            <div>
              <dt>Median merged within 90 days</dt>
              <dd>
                {formatPercent(
                  pressure2025.repositoryMedianPullRequestMerged90dShare,
                  1,
                )}{" "}
                <i>→</i>{" "}
                {formatPercent(
                  pressure2026.repositoryMedianPullRequestMerged90dShare,
                  1,
                )}
              </dd>
            </div>
          </dl>
          <p>
            Issue intake changed little, and these repositories closed slightly
            more Issues than they opened in 2026. The growing queue is
            concentrated in PRs.
          </p>
        </aside>
      </div>

      <div className={styles.pressureRoleSummary}>
        <header>
          <h5>The PR queue grew in 54 of 55 repositories.</h5>
          <p>
            Every technical group added more pull requests than it closed during
            January–August 2026.
          </p>
        </header>
        <div>
          {pressure.roleFlows.map((item) => (
            <p key={item.key}>
              <span>{item.label}</span>
              <i>
                <em
                  style={{
                    width: `${(item.pullRequestBalance / pressureRoleMaximum) * 100}%`,
                  }}
                />
              </i>
              <b>{formatSignedCompact(item.pullRequestBalance)}</b>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatPercent(value: number, digits = 0) {
  const scale = 10 ** digits;
  const rounded = Math.round((value * 100 + Number.EPSILON) * scale) / scale;
  return `${rounded.toFixed(digits)}%`;
}

function formatCompact(value: number) {
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatSignedCompact(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatCompact(Math.abs(value))}`;
}
