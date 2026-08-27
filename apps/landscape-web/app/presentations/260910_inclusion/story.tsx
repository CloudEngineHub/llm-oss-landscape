"use client";

import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon, PlayIcon } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import LandscapeLogo from "@/app/components/landscape-logo";
import type { ReportCopy, ReportCopyKey } from "@/lib/inclusion-report-copy";
import type { ReportReferenceGroup } from "@/lib/inclusion-report-references";

import type {
  InclusionResearchStats,
  LanguageMixGroup,
  MacroGroup,
  RuntimePathPoint,
} from "./research-data";
import { EditableText, ReportCopyEditor } from "./report-copy-editor";
import styles from "./page.module.css";

type StoryProject = {
  name: string;
  repo: string;
  layer: "agent" | "model";
  zone: string;
  openrank: number | null;
  stars: number;
  language: string;
  createdAt: string;
  signals: Array<"new" | "rising">;
};

type BarStyle = CSSProperties & {
  "--bar-delay": string;
  "--bar-width": string;
};

const infraShifts = [
  {
    id: "execution",
    label: "Session runtime",
    before: "A deployed service starts from a known artifact",
    after: "An agent can create and run code inside the task",
    detail:
      "The environment may last only a few minutes, yet it still needs isolation, network policy, a stable task identity, warm-start latency and reliable cleanup.",
    mapSignal:
      "4 development sandboxes. Kubernetes Agent Sandbox adds declarative claims, templates and warm pools.",
    openInfra:
      "Kubernetes manages the sandbox lifecycle; Kata Containers supplies a VM-backed boundary for untrusted code.",
    href: "https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md",
  },
  {
    id: "identity",
    label: "Task authority",
    before: "A service account represents a long-running application",
    after: "Authority has to be scoped to one task and its tools",
    detail:
      "One run may cross a repository, a document store and a deployment system. The platform needs bounded delegation, expiry and revocation while the run is still active.",
    mapSignal:
      "Protocols & interoperability grew from 5 to 8 projects; two agent gateways moved out of Model API gateways.",
    openInfra:
      "SPIFFE/SPIRE already provides workload identity and delegated identity, while explicitly warning about impersonation risk.",
    href: "https://spiffe.io/docs/latest/deploying/spire_agent/",
  },
  {
    id: "state",
    label: "Durable context",
    before: "State is attached to a service or database transaction",
    after: "Task context outlives several short-lived environments",
    detail:
      "Context, artifacts and tool results need a durable home, plus rules for expiry, inheritance and who may alter the record that guides a later action.",
    mapSignal:
      "9 memory and context projects. OpenViking gained 42.6 OpenRank points from April to July.",
    openInfra:
      "Existing data, object-storage and workflow systems remain the durable substrate; context databases add agent-specific semantics.",
    href: "https://github.com/volcengine/OpenViking",
  },
  {
    id: "observability",
    label: "Action trace",
    before: "Teams inspect service requests, logs and resources",
    after: "Teams need to reconstruct a decision and its side effect",
    detail:
      "A successful request does not show whether the agent made the right change. Useful evidence links model work, tool execution, sandbox events and the external result.",
    mapSignal:
      "4 agent observability projects; the category is stable, while tool and protocol layers are growing around it.",
    openInfra:
      "OpenTelemetry is widely deployed, but its GenAI agent and tool conventions are still marked Development.",
    href: "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md",
  },
  {
    id: "scheduling",
    label: "Accelerators",
    before: "Services reserve a relatively predictable resource profile",
    after: "One task mixes inference, tools and short bursts of compute",
    detail:
      "The sequence is harder to forecast and may span CPU, GPU and network-sensitive distributed work. Allocation, topology and per-task cost become scheduling inputs.",
    mapSignal:
      "Serving inference leads Model Infra with 786.8 combined July OpenRank; FlashInfer gained 20.7 from April to July.",
    openInfra:
      "Kubernetes DRA is GA; Kueue combines quota, topology-aware placement and training/inference workloads.",
    href: "https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/",
  },
] as const;

const outsideGithubSignals = [
  {
    source: "OPENROUTER · PUBLIC APP RANKING",
    value: "#5",
    label: "DeepSeek Harness in the current global app ranking",
    note: "It also appears in the fastest-growing list for the week, above 999%. Public, attributed OpenRouter traffic only; checked 27 Aug 2026.",
    href: "https://openrouter.ai/apps/",
  },
  {
    source: "OPENROUTER + ZENMUX · HUGGING FACE",
    value: "5 / 10",
    label: "Top usage ranks with an official public-weight repository",
    note: "June 2026 composite usage sample. Weight access was resolved on Hugging Face; open-weight does not imply an OSI-approved license.",
    href: "https://huggingface.co/docs/hub/en/api",
  },
] as const;

export default function InclusionConfStory({
  initialCopy,
  references,
  stats,
  projects,
}: {
  initialCopy: ReportCopy;
  references: ReportReferenceGroup[];
  stats: InclusionResearchStats;
  projects: StoryProject[];
}) {
  const pageRef = useRef<HTMLElement>(null);
  const [layer, setLayer] = useState<"agent" | "model">("agent");
  const [shiftId, setShiftId] = useState<(typeof infraShifts)[number]["id"]>(
    "execution",
  );

  const layerProjects = useMemo(
    () => projects.filter((project) => project.layer === layer),
    [layer, projects],
  );
  const leaders = useMemo(
    () =>
      [...layerProjects]
        .filter((project) => project.openrank !== null)
        .sort((a, b) => (b.openrank ?? 0) - (a.openrank ?? 0))
        .slice(0, 5),
    [layerProjects],
  );
  const layerStats =
    layer === "agent"
      ? { count: stats.agent, recent: stats.agentRecent }
      : { count: stats.model, recent: stats.modelRecent };
  const recentShare = Math.round((layerStats.recent / layerStats.count) * 100);
  const activeShift = infraShifts.find((shift) => shift.id === shiftId)!;

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const revealTargets = [...page.querySelectorAll<HTMLElement>("[data-reveal]")];
    page.dataset.motionReady = "true";

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => {
        target.dataset.visible = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -4%", threshold: 0.08 },
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page} lang="en" ref={pageRef}>
      <ReportCopyEditor initialCopy={initialCopy}>
      <nav className={styles.nav} aria-label="Talk chapters">
        <Link className={styles.brand} href="/">
          <LandscapeLogo className={styles.brandMark} />
          <span>Agentic AI Landscape</span>
        </Link>
        <div className={styles.chapterNav}>
          <a href="#landscape">01 Landscape</a>
          <a href="#collaboration">02 Collaboration</a>
          <a href="#infrastructure">03 Open infrastructure</a>
        </div>
        <div className={styles.navActions} aria-label="Play presentations">
          <Link
            className={`${styles.playLink} ${styles.playInfra}`}
            href="/presentations/260910_inclusion/open-infrastructure/present"
          >
            <PlayIcon aria-hidden="true" />
            <span>5 MIN</span>
            <strong>Open Infrastructure</strong>
          </Link>
          <Link
            className={`${styles.playLink} ${styles.playCollaboration}`}
            href="/presentations/260910_inclusion/present"
          >
            <PlayIcon aria-hidden="true" />
            <span>10 MIN</span>
            <strong>Collaboration</strong>
          </Link>
          <Link className={styles.navBack} href="/">
            <ArrowLeftIcon aria-hidden="true" />
            <span>Landscape</span>
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          <EditableText copyKey="heroPrefix" />
          {" "}
          <EditableText className={styles.heroAgent} copyKey="heroAgent" />
          {" "}
          <EditableText copyKey="heroSuffix" />
          {" "}
          <EditableText as="em" copyKey="heroFocus" />
        </h1>
        <EditableText as="p" className={styles.heroSummary} copyKey="heroLede" />
      </header>

      <section
        className={styles.axisBand}
        aria-label="Two questions"
        data-reveal
      >
        <article>
          <span>THE MERGE GATE</span>
          <EditableText as="h2" copyKey="mergeGateTitle" />
          <EditableText as="p" copyKey="mergeGateBody" />
        </article>
        <article>
          <span>THE EXECUTION GATE</span>
          <EditableText as="h2" copyKey="executionGateTitle" />
          <EditableText as="p" copyKey="executionGateBody" />
        </article>
      </section>

      <section
        className={styles.metricBand}
        aria-label="Landscape summary"
        data-reveal
      >
        <Metric value={stats.mayTracked} label="Tracked in May 2026" />
        <Metric value={stats.currentTracked} label="Tracked now" />
        <Metric value={stats.total} label="Selected for the current maps" />
        <Metric
          value={stats.selectedOutsideMay}
          label="Selected projects outside the May pool"
        />
      </section>

      <section
        className={`${styles.chapter} ${styles.landscapeChapter}`}
        id="landscape"
      >
        <SectionTag index="01">Landscape findings</SectionTag>
        <EditableText
          as="h2"
          className={styles.chapterTitle}
          copyKey="landscapeOverviewTitle"
        />
        <EditableText
          as="p"
          className={styles.chapterLede}
          copyKey="landscapeOverviewBody"
        />

        <div className={styles.landscapeLens} data-reveal>
          <div className={styles.lensHeader}>
            <div className={styles.lensToggle} aria-label="Choose a landscape">
              {(["agent", "model"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  data-layer={item}
                  data-active={layer === item}
                  onClick={() => setLayer(item)}
                >
                  {item === "agent" ? "Agent Infra" : "Model Infra"}
                </button>
              ))}
            </div>
            <p>Switch views · projects ordered by July 2026 OpenRank</p>
          </div>
          <iframe
            className={styles.landscapeFrame}
            key={layer}
            title={`${layer} infrastructure landscape 2026`}
            src={`/embed/${layer}-infra`}
          />
          <div className={styles.lensEvidence}>
            <div>
              <strong>{recentShare}%</strong>
              <span>Created in 2025 or later</span>
            </div>
            <div>
              <strong>
                {layer === "agent"
                  ? stats.agentOutsideMay
                  : stats.selectedOutsideMay - stats.agentOutsideMay}
              </strong>
              <span>Selected projects outside the May tracking pool</span>
            </div>
            <div className={styles.leaderList}>
              {leaders.map((project) => (
                <a
                  href={`https://github.com/${project.repo}`}
                  key={project.repo}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{project.name}</span>
                  <b>{project.openrank?.toFixed(1)}</b>
                </a>
              ))}
            </div>
          </div>
        </div>

        <EditableText
          as="h2"
          className={styles.landscapeFindingTitle}
          copyKey="landscapeTitle"
        />

        <p className={styles.chapterLede}>
          The tracked pool grew by {stats.trackedDelta} projects since May.
          Applications still attract most of the visible activity. Runtime now
          holds almost the same number of selected projects, and it accounts for{" "}
          {stats.runtimeOutsideMay} of the {stats.agentOutsideMay} Agent
          Infra projects that were not in the May tracking pool.
        </p>

        <div className={styles.macroEvidence} data-reveal>
          <MacroComparison
            titleKey="agentChartTitle"
            groups={stats.agentMacro}
            accent="agent"
          />
          <MacroComparison
            titleKey="modelChartTitle"
            groups={stats.modelMacro}
            accent="model"
          />
        </div>

        <div className={styles.growthPanel} data-reveal>
          <div className={styles.growthSummary}>
            <strong>APR→JUL</strong>
            <EditableText as="p" copyKey="growthSummary" />
          </div>
          <div className={styles.growthList}>
            {stats.growthLeaders.map((project, index) => {
              const maxGrowth = stats.growthLeaders[0]?.growth ?? 1;
              return (
                <div className={styles.growthRow} key={project.repo}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <a
                    href={`https://github.com/${project.repo}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {project.name}
                  </a>
                  <span className={styles.projectMeta}>{project.zone}</span>
                  <div className={styles.growthBar} aria-hidden="true">
                    <i
                      style={
                        {
                          "--bar-delay": `${index * 90}ms`,
                          "--bar-width": `${(project.growth / maxGrowth) * 100}%`,
                        } as BarStyle
                      }
                    />
                  </div>
                  <b className={styles.growthValue}>+{project.growth.toFixed(1)}</b>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.ageFinding} data-reveal>
          <div>
            <span>CREATED IN 2025 OR LATER</span>
            <strong>{Math.round((stats.agentRecent / stats.agent) * 100)}%</strong>
            <p>Agent Infra · {stats.agentRecent} of {stats.agent} projects</p>
          </div>
          <div>
            <span>CREATED IN 2025 OR LATER</span>
            <strong>{Math.round((stats.modelRecent / stats.model) * 100)}%</strong>
            <p>Model Infra · {stats.modelRecent} of {stats.model} projects</p>
          </div>
          <EditableText as="p" copyKey="ageFinding" />
        </div>

        <article className={styles.languageSignal} data-reveal>
          <header>
            <span className={styles.signalEyebrow}>PRIMARY LANGUAGE</span>
            <EditableText as="h3" copyKey="languageTitle" />
            <EditableText as="p" copyKey="languageBody" />
          </header>
          <LanguageMixChart
            groups={stats.languageMix}
            agentTotal={stats.agent}
            modelTotal={stats.model}
          />
        </article>

        <div className={styles.runtimePath} data-reveal>
          <header>
            <span className={styles.signalEyebrow}>AGENT RUNTIME</span>
            <EditableText as="h3" copyKey="runtimePathTitle" />
            <EditableText as="p" copyKey="runtimePathBody" />
          </header>
          <RuntimePath points={stats.runtimePath} />
        </div>

        <aside className={styles.outsideGithub} data-reveal>
          <header>
            <span className={styles.signalEyebrow}>OUTSIDE GITHUB</span>
            <EditableText as="h3" copyKey="outsideGithubTitle" />
            <EditableText as="p" copyKey="outsideGithubBody" />
          </header>
          <div className={styles.outsideGithubSignals}>
            {outsideGithubSignals.map((signal) => (
              <a
                href={signal.href}
                key={signal.source}
                target="_blank"
                rel="noreferrer"
              >
                <span>{signal.source}</span>
                <strong>{signal.value}</strong>
                <b>{signal.label}</b>
                <small>{signal.note}</small>
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.chapter} id="collaboration">
        <SectionTag index="02">Collaboration</SectionTag>
        <EditableText
          as="h2"
          className={styles.chapterTitle}
          copyKey="collaborationTitle"
        />
        <EditableText
          as="p"
          className={styles.chapterLede}
          copyKey="collaborationLede"
        />

        <div className={styles.caseGrid} data-reveal>
          <article className={styles.caseNarrative}>
            <EditableText as="h3" copyKey="caseTitle" />
            <EditableText as="blockquote" copyKey="caseQuote" />
            <EditableText as="p" copyKey="caseBody" />
          </article>
          <aside className={styles.caseEvidence}>
            <h3>DeepSeek Harness · checked 25 Aug 2026</h3>
            <dl className={styles.caseFacts}>
              <CaseFact label="Created" value="13 Aug" />
              <CaseFact label="License" value="MIT" />
              <CaseFact label="Issues" value="Off" state="off" />
              <CaseFact label="Pull requests" value="Off" state="off" />
              <CaseFact label="Discussions" value="On" state="on" />
              <CaseFact label="Plugin discovery" value="dsh-plugin" state="on" />
            </dl>
            <a
              className={styles.sourceLink}
              href="https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
            >
              Read the contribution guide
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          </aside>
        </div>
        <div
          className={styles.questionStrip}
          aria-label="Governance choices"
          data-reveal
        >
          <EditableText as="p" copyKey="governanceInterface" />
          <EditableText as="p" copyKey="governanceDiscovery" />
          <EditableText as="p" copyKey="governanceRevocation" />
        </div>
        <div className={styles.studyFrame} data-reveal>
          <header>
            <span>QUESTION UNDER TEST</span>
            <EditableText as="h3" copyKey="studyTitle" />
          </header>
          <div>
            <p>
              <strong>Output</strong>
              <span>PRs and commits per repository-month</span>
            </p>
            <p>
              <strong>Entry</strong>
              <span>First-time contributor merge and return</span>
            </p>
            <p>
              <strong>Judgment</strong>
              <span>Human review time and revision rounds</span>
            </p>
            <p>
              <strong>Pressure</strong>
              <span>Review load per active maintainer</span>
            </p>
          </div>
          <EditableText as="small" copyKey="studyNote" />
        </div>
      </section>

      <section className={styles.chapter} id="infrastructure">
        <SectionTag index="03">Open infrastructure</SectionTag>
        <EditableText
          as="h2"
          className={styles.chapterTitle}
          copyKey="infrastructureTitle"
        />
        <EditableText
          as="p"
          className={styles.chapterLede}
          copyKey="infrastructureLede"
        />
        <div className={styles.infraBaseline} data-reveal>
          <a
            href="https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>82%</strong>
            <span>Kubernetes in production among container users</span>
            <small>CNCF 2025 survey</small>
          </a>
          <a
            href="https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>66%</strong>
            <span>GenAI-hosting organisations using Kubernetes for inference</span>
            <small>CNCF 2025 survey</small>
          </a>
          <a
            href="https://openinfra.org/annual-report/2025/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>55M+</strong>
            <span>Documented OpenStack cores in production</span>
            <small>OpenInfra 2025 annual report</small>
          </a>
        </div>
        <div className={styles.shiftModule} data-reveal>
          <div
            className={styles.shiftTabs}
            role="tablist"
            aria-label="Infrastructure assumptions"
          >
            {infraShifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                role="tab"
                aria-selected={shift.id === shiftId}
                data-active={shift.id === shiftId}
                onClick={() => setShiftId(shift.id)}
              >
                {shift.label}
              </button>
            ))}
          </div>
          <div className={styles.shiftCompare}>
            <article>
              <span>A common infrastructure assumption</span>
              <h3>{activeShift.before}</h3>
            </article>
            <article>
              <span>What the agent changes</span>
              <h3>{activeShift.after}</h3>
              <p>{activeShift.detail}</p>
            </article>
          </div>
          <div className={styles.shiftEvidence}>
            <article>
              <span>Signal in the current landscape</span>
              <p>{activeShift.mapSignal}</p>
            </article>
            <article>
              <span>What established open infrastructure contributes</span>
              <p>{activeShift.openInfra}</p>
              <a href={activeShift.href} target="_blank" rel="noreferrer">
                Inspect the primary source
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <EditableText as="p" copyKey="closingQuestion" />
        <EditableText as="small" copyKey="closingNote" />
      </section>

      <section className={styles.methodology}>
        <details>
          <summary>Methodology and data boundaries</summary>
          <div className={styles.methodologyBody}>
            <p>
              The current maps contain {stats.total} repositories marked keep or
              add in data/agentic-ai-projects.csv. The May baseline is the
              {stats.mayTracked}-repository tracking pool preserved in
              data/history_snapshot/2605_agentic_projects.csv. OpenRank and
              participant counts use the complete July 2026 month.
            </p>
            <p>
              OpenRank, stars, forks and participant counts describe different
              signals. Primary language is GitHub&apos;s repository-level label,
              not a count of source lines. The OpenRouter app ranking is public
              and opt-in; Hugging Face downloads are artifact requests, not
              unique users. None of these measures establishes production
              adoption, revenue or technical superiority.
            </p>
          </div>
        </details>
      </section>

      <ResearchTrail groups={references} />
      </ReportCopyEditor>
    </main>
  );
}

function ResearchTrail({ groups }: { groups: ReportReferenceGroup[] }) {
  const references = groups.flatMap((group) => group.items);

  return (
    <section className={styles.referenceLibrary} id="references">
      <header className={styles.referenceHeader}>
        <h2>References</h2>
        <span>{references.length} sources</span>
      </header>
      <ul className={styles.referenceList}>
        {references.map((item) => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              <span>{item.title}</span>
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.metric}>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function MacroComparison({
  titleKey,
  groups,
  accent,
}: {
  titleKey: ReportCopyKey;
  groups: MacroGroup[];
  accent: "agent" | "model";
}) {
  return (
    <article className={styles.macroChart} data-accent={accent}>
      <EditableText as="h3" copyKey={titleKey} />
      <div className={styles.macroLegend}>
        <span>
          <i data-series="projects" />
          Project share
        </span>
        <span>
          <i data-series="openrank" />
          OpenRank share
        </span>
      </div>
      <div className={styles.macroRows}>
        {groups.map((group, index) => (
          <div className={styles.macroRow} key={group.label}>
            <div>
              <strong>{group.label}</strong>
              <span>
                {group.projects} projects · {group.newlyTracked} outside May
                pool
              </span>
            </div>
            <div className={styles.macroBars}>
              <i
                data-series="projects"
                style={
                  {
                    "--bar-delay": `${index * 110}ms`,
                    "--bar-width": `${group.projectShare}%`,
                  } as BarStyle
                }
              />
              <i
                data-series="openrank"
                style={
                  {
                    "--bar-delay": `${index * 110 + 70}ms`,
                    "--bar-width": `${group.openrankShare}%`,
                  } as BarStyle
                }
              />
            </div>
            <b>
              {group.projectShare}% / {group.openrankShare}%
            </b>
          </div>
        ))}
      </div>
    </article>
  );
}

function LanguageMixChart({
  groups,
  agentTotal,
  modelTotal,
}: {
  groups: LanguageMixGroup[];
  agentTotal: number;
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
      <small>
        GitHub primary language by repository, not share of source lines. Other
        includes Rust, Java, Shell and smaller groups.
      </small>
    </div>
  );
}

function RuntimePath({ points }: { points: RuntimePathPoint[] }) {
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

function SectionTag({
  index,
  children,
}: {
  index: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.sectionTag}>
      <b>{index}</b>
      {children}
    </div>
  );
}

function CaseFact({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: "on" | "off";
}) {
  return (
    <div className={styles.caseFact}>
      <dt>{label}</dt>
      <dd data-state={state}>{value}</dd>
    </div>
  );
}
