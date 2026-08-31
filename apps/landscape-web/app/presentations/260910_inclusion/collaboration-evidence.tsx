"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { CollaborationResearchStats } from "./research-data";
import styles from "./collaboration-evidence.module.css";

type Props = {
  research: CollaborationResearchStats;
};

const threadCases = [
  {
    id: "coder",
    project: "Coder",
    identity: "Mixed",
    kind: "Pull request",
    number: "#25800",
    outcome: "Merged",
    title: "Classify provider_disabled 503 as non-retryable",
    excerpt: "/coder-agents-review",
    detail:
      "A maintainer invoked the review swarm more than once. The bot reported 17 reviewers and a $62.66 spend; a human then acknowledged the result before merge.",
    href: "https://github.com/coder/coder/pull/25800",
    actors: [
      ["Contributor", "opens fix", "human"],
      ["Maintainer", "invokes review", "human"],
      ["Agent swarm", "checks the patch", "agent"],
      ["Maintainer", "accepts and merges", "human"],
    ],
  },
  {
    id: "onnx",
    project: "ONNX Runtime",
    identity: "Traditional",
    kind: "Pull request",
    number: "#28045",
    outcome: "Merged",
    title: "Add CUDA LabelEncoder support for numeric types",
    excerpt: "Please use std::stable_sort and remove duplicate keys.",
    detail:
      "Copilot opened the change and supplied four commits. Human review surfaced implementation and test gaps; eight later commits completed a 944-line change.",
    href: "https://github.com/microsoft/onnxruntime/pull/28045",
    actors: [
      ["Copilot", "opens + 4 commits", "agent"],
      ["Reviewers", "find semantic gaps", "human"],
      ["Author", "rewrites and tests", "human"],
      ["Maintainer", "merges", "human"],
    ],
  },
  {
    id: "langchain",
    project: "LangChain",
    identity: "LLM-native",
    kind: "Pull request",
    number: "#37607",
    outcome: "Closed",
    title: "Add float support to merge_dicts and merge_obj",
    excerpt: "Opening a PR is not an indication it will be accepted.",
    detail:
      "The repository bot closed an unassigned contribution. Automation handled the gate, but the rule being enforced came from the project’s human contribution policy.",
    href: "https://github.com/langchain-ai/langchain/pull/37607",
    actors: [
      ["Contributor", "opens patch", "human"],
      ["Policy bot", "checks assignment", "agent"],
      ["Policy", "requires prior scope", "system"],
      ["Bot", "closes PR", "agent"],
    ],
  },
  {
    id: "pytorch",
    project: "PyTorch",
    identity: "Traditional",
    kind: "Pull request",
    number: "#182986",
    outcome: "Deep review",
    title: "Inner-tree sum reduction",
    excerpt: "This is a fairly sweeping change.",
    detail:
      "Humans repeatedly called Claude for CI analysis and review. A contributor challenged one false positive with benchmarks; maintainers still required stronger justification.",
    href: "https://github.com/pytorch/pytorch/pull/182986",
    actors: [
      ["Contributor", "proposes optimization", "human"],
      ["Claude", "reviews and reads CI", "agent"],
      ["Contributor", "rebuts with benchmarks", "human"],
      ["Maintainer", "holds the gate", "human"],
    ],
  },
  {
    id: "supabase",
    project: "Supabase",
    identity: "Traditional",
    kind: "Issue",
    number: "#42193",
    outcome: "PR followed",
    title: "Community request moves from planning to implementation",
    excerpt: "The issue description is inaccurate.",
    detail:
      "CodeRabbit offered a plan, several people asked to take the work, and the issue author corrected the premise before a contributor opened a pull request.",
    href: "https://github.com/supabase/supabase/issues/42193",
    actors: [
      ["Reporter", "opens issue", "human"],
      ["CodeRabbit", "suggests a plan", "agent"],
      ["Community", "asks for assignment", "human"],
      ["Contributor", "opens PR", "human"],
    ],
  },
  {
    id: "gemini",
    project: "Gemini CLI",
    identity: "LLM-native",
    kind: "Issue",
    number: "#24026",
    outcome: "Closed duplicate",
    title: "Quota report is matched to known incidents",
    excerpt: "This issue appears to be a duplicate.",
    detail:
      "The Gemini bot surfaced related reports. A human then identified the quota and capacity pattern and closed the issue as a known duplicate.",
    href: "https://github.com/google-gemini/gemini-cli/issues/24026",
    actors: [
      ["User", "reports failure", "human"],
      ["Gemini bot", "finds related issues", "agent"],
      ["Maintainer", "matches incident", "human"],
      ["Maintainer", "closes duplicate", "human"],
    ],
  },
  {
    id: "n8n",
    project: "n8n",
    identity: "LLM-native",
    kind: "Issue",
    number: "#33411",
    outcome: "Fixed",
    title: "Public issue becomes an internal work item",
    excerpt: "Created Linear issue GHC-8844.",
    detail:
      "An assistant acknowledged the report and routed it into the team’s internal tracker. A human later returned to GitHub and closed the public issue as fixed.",
    href: "https://github.com/n8n-io/n8n/issues/33411",
    actors: [
      ["User", "reports bug", "human"],
      ["Assistant", "acknowledges", "agent"],
      ["Assistant", "creates work item", "agent"],
      ["Maintainer", "confirms fix", "human"],
    ],
  },
] as const;

const metricNotes: Record<string, string> = {
  agentParticipation:
    "Verified Agent presence grows sharply in several projects, but that does not mean the Agent authored the accepted code.",
  maintainerParticipation:
    "A falling visible maintainer share can mean delegated triage—or simply that public GitHub traces moved elsewhere.",
  mergedWithin30Days:
    "The 30-day GitHub merged flag is an outcome marker, not a productivity or quality score.",
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function CollaborationCasebook() {
  const [caseId, setCaseId] = useState<string>(threadCases[0].id);
  const active = threadCases.find((item) => item.id === caseId) ?? threadCases[0];

  return (
    <section className={styles.casebook} data-reveal>
      <header>
        <h3>Read the collaboration trace, not only the outcome.</h3>
        <p>
          Four cases come from the 2,000-thread sample and three from the ten-repository
          panels. They were selected because the public sequence is legible. They are
          examples of different coordination patterns, not representative rates.
        </p>
      </header>
      <div className={styles.caseTabs} role="tablist" aria-label="Issue and pull request cases">
        {threadCases.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={item.id === active.id}
            data-active={item.id === active.id}
            key={item.id}
            onClick={() => setCaseId(item.id)}
          >
            <span>{item.project}</span>
            <small>{item.kind} {item.number}</small>
          </button>
        ))}
      </div>
      <article className={styles.caseStage}>
        <div className={styles.caseCopy}>
          <div className={styles.caseMeta}>
            <span>{active.identity}</span>
            <span>{active.kind}</span>
            <span>{active.outcome}</span>
          </div>
          <h4>{active.title}</h4>
          <blockquote>“{active.excerpt}”</blockquote>
          <p>{active.detail}</p>
          <a href={active.href} target="_blank" rel="noreferrer">
            Open the public thread <ExternalLinkIcon aria-hidden="true" />
          </a>
        </div>
        <ol className={styles.actorTrace}>
          {active.actors.map(([actor, action, role], index) => (
            <li data-role={role} key={`${actor}-${action}-${index}`}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <div><strong>{actor}</strong><span>{action}</span></div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}

export function CollaborationEvolution({ research }: Props) {
  const [projectId, setProjectId] = useState(research.projectStages[0]?.project ?? "");
  const [metric, setMetric] = useState<"agentParticipation" | "maintainerParticipation" | "mergedWithin30Days">("agentParticipation");
  const project = research.projectStages.find((item) => item.project === projectId) ?? research.projectStages[0];
  const points = useMemo(() => {
    if (!project) return [];
    return project.stages.map((stage, index) => ({
      x: 92 + index * 292,
      y: stage[metric] === null ? null : 238 - stage[metric]! * 182,
      value: stage[metric],
      label: stage.label,
      pullRequests: stage.pullRequests,
    }));
  }, [metric, project]);
  const path = points.filter((point) => point.y !== null).map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <section className={styles.evolutionLab} data-reveal>
      <header>
        <h3>The same repository can change direction as it matures.</h3>
        <p>
          The full lifecycle panel contains 900 threads from ten repositories: 30 in each
          project&apos;s launch window, 30 in 2025 Q4 and 30 in May–August 2026. This chart
          shows four of those repositories so their stages remain readable. It compares
          change inside a project; it is not an ecosystem-wide rate.
        </p>
      </header>
      <div className={styles.evolutionControls}>
        <div role="tablist" aria-label="Project">
          {research.projectStages.map((item) => (
            <button type="button" data-active={item.project === project?.project} key={item.project} onClick={() => setProjectId(item.project)}>
              {item.project.split("/")[1]}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Measure">
          <button type="button" data-active={metric === "agentParticipation"} onClick={() => setMetric("agentParticipation")}>Agent present</button>
          <button type="button" data-active={metric === "maintainerParticipation"} onClick={() => setMetric("maintainerParticipation")}>Maintainer present</button>
          <button type="button" data-active={metric === "mergedWithin30Days"} onClick={() => setMetric("mergedWithin30Days")}>PR merged ≤30d</button>
        </div>
      </div>
      <div className={styles.stageChart}>
        <svg viewBox="0 0 760 300" role="img" aria-label={`${project?.project} stage trajectory`}>
          {[0, .25, .5, .75, 1].map((tick) => (
            <g key={tick}>
              <line x1="72" x2="700" y1={238 - tick * 182} y2={238 - tick * 182} />
              <text x="12" y={242 - tick * 182}>{Math.round(tick * 100)}%</text>
            </g>
          ))}
          {path ? <path d={path} className={styles.stageLine} /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <line className={styles.stageGuide} x1={point.x} x2={point.x} y1="56" y2="238" />
              {point.y === null ? (
                <text className={styles.noPoint} x={point.x} y="148" textAnchor="middle">no PRs</text>
              ) : (
                <>
                  <circle cx={point.x} cy={point.y} r="10" />
                  <text className={styles.pointValue} x={point.x} y={point.y - 18} textAnchor="middle">{percent(point.value!)}</text>
                </>
              )}
              <text className={styles.stageName} x={point.x} y="274" textAnchor="middle">{point.label}</text>
            </g>
          ))}
        </svg>
        <aside>
          <span>{project?.identity.replace("_", " ")} · {project?.niche.replaceAll("_", " ")}</span>
          <p>{metricNotes[metric]}</p>
          <dl>
            {project?.stages.map((stage) => (
              <div key={stage.stage}><dt>{stage.label}</dt><dd>{stage.pullRequests} PRs</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

export function CollaborationCommitAttribution({ research }: Props) {
  return (
    <section className={styles.lineageSection} data-reveal>
      <header>
        <strong>Who carried the patch after it opened?</strong>
        <span>Four examples from the 10-PR code-lineage subset</span>
      </header>
      <div className={styles.lineageRows}>
        {research.codeLineages.map((item) => (
          <a href={item.href} target="_blank" rel="noreferrer" key={`${item.project}-${item.number}`}>
            <div>
              <strong>{item.project} #{item.number}</strong>
              <small>+{item.additions} / −{item.deletions} · {item.commits} commits</small>
            </div>
            <div className={styles.commitBraid} aria-label={`${item.agentCommits} Agent-attributed and ${item.otherCommits} human or unattributed commits`}>
              {Array.from({ length: item.agentCommits }, (_, index) => <i data-role="agent" key={`a-${index}`} />)}
              {Array.from({ length: item.otherCommits }, (_, index) => <i data-role="other" key={`h-${index}`} />)}
            </div>
            <span>{item.agentCommits} Agent · {item.otherCommits} human / unknown</span>
          </a>
        ))}
      </div>
      <p>
        Commit identity is a narrow public signal. ONNX Runtime and OpenMetadata show a visible
        Agent-to-human handoff; Vercel AI SDK #18818 remains Agent-attributed throughout the sampled history.
      </p>
    </section>
  );
}
