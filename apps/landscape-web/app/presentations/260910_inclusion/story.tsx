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

type MarkerBarStyle = CSSProperties & {
  "--marker-delay": string;
  "--marker-rate": string;
};

type CollaborationBarStyle = CSSProperties & {
  "--collaboration-rate": string;
  "--collaboration-delay": string;
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

const markerTimeline = [
  { year: "2022", observed: 28, strict: 0, active: 0 },
  { year: "2023", observed: 51, strict: 0, active: 0 },
  { year: "2024", observed: 62, strict: 0, active: 0 },
  { year: "2025", observed: 86, strict: 42, active: 48 },
  { year: "2026", observed: 100, strict: 86, active: 92 },
] as const;

const markerNiches = [
  { label: "Agent frameworks", value: 20, total: 21 },
  { label: "Agent runtime infra", value: 14, total: 15 },
  { label: "Agent applications", value: 24, total: 28 },
  { label: "Model infra", value: 28, total: 36 },
] as const;

const markerTools = [
  ["Cross-agent", 80],
  ["Claude Code", 71],
  ["Codex", 22],
  ["GitHub Copilot", 20],
  ["Cursor", 17],
  ["Gemini", 12],
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
  const [markerMeasure, setMarkerMeasure] = useState<"strict" | "active">(
    "strict",
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
  const collaboration = stats.collaboration;
  const adoptionSteps = [
    {
      value: `${collaboration.strictInstructionRepositories}/100`,
      label: "Repositories with strict Agent instructions",
      rate: collaboration.strictInstructionRepositories,
    },
    {
      value: `${collaboration.observedParticipationRepositories}/${collaboration.activeRepositories}`,
      label: "Active repositories with Agent participation in the sample",
      rate:
        (collaboration.observedParticipationRepositories /
          collaboration.activeRepositories) *
        100,
    },
    {
      value: formatPercent(collaboration.participationThreadShare),
      label: "Weighted threads with visible Agent participation",
      rate: collaboration.participationThreadShare * 100,
    },
    {
      value: formatPercent(collaboration.participationOpenerShare, 1),
      label: "Weighted threads opened with visible Agent participation",
      rate: collaboration.participationOpenerShare * 100,
    },
  ];
  const threadRows = [
    {
      label: "Agent participation",
      tone: "agent",
      values: [
        collaboration.participationOpenerShare,
        collaboration.agentReviewShare,
        collaboration.agentGateShare,
      ],
    },
    {
      label: "GitHub User account",
      tone: "user",
      values: [null, collaboration.userReviewShare, collaboration.userGateShare],
    },
    {
      label: "Maintainer-associated account",
      tone: "maintainer",
      values: [
        null,
        collaboration.maintainerReviewShare,
        collaboration.maintainerGateShare,
      ],
    },
  ] as const;
  const taskFootprint = [
    { label: "Review", value: collaboration.agentTaskEvents.review },
    { label: "Triage & routing", value: collaboration.agentTaskEvents.triage },
    { label: "Discussion", value: collaboration.agentTaskEvents.discussion },
    { label: "Open a thread", value: collaboration.agentTaskEvents.openedThread },
    { label: "Attributed commit", value: collaboration.agentTaskEvents.codeCommit },
  ];
  const taskMaximum = Math.max(...taskFootprint.map((item) => item.value));
  const iterationSignals = [
    {
      label: "PRs with a visible review",
      value: collaboration.reviewedPrShare,
    },
    {
      label: "Reviewed PRs with a later commit",
      value: collaboration.reviewedPrFollowupCommitShare,
    },
    {
      label: "Change requests with a later commit",
      value: collaboration.changeRequestFollowupCommitShare,
    },
  ];

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
          <a href="#landscape">01 Landscape &amp; infrastructure</a>
          <a href="#collaboration">02 Open-source collaboration</a>
          <a href="#method">Method &amp; sources</a>
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
        <SectionTag index="01">Landscape &amp; open infrastructure</SectionTag>
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

        <div className={styles.subchapterMarker} data-reveal>
          <span>01A</span>
          <strong>The current maps</strong>
        </div>

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

        <div className={styles.subchapterMarker} data-reveal>
          <span>01B</span>
          <strong>Signals in the map</strong>
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

        <div className={styles.infrastructureSubchapter} id="infrastructure">
          <SectionTag index="01C">Open infrastructure</SectionTag>
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
        </div>
      </section>

      <section className={styles.chapter} id="collaboration">
        <SectionTag index="02">Open-source collaboration</SectionTag>
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

        <div className={styles.subchapterMarker} data-reveal>
          <span>02A</span>
          <strong>Agent participation</strong>
        </div>

        <div className={styles.adoptionSequence} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationAdoptionTitle" />
            <EditableText as="p" copyKey="collaborationAdoptionBody" />
          </header>
          <div className={styles.adoptionSteps}>
            {adoptionSteps.map((item, index) => (
              <div className={styles.adoptionStep} key={item.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.value}</strong>
                <p>{item.label}</p>
                <i
                  style={
                    {
                      "--collaboration-delay": `${index * 100}ms`,
                      "--collaboration-rate": `${Math.max(item.rate, 0.8)}%`,
                    } as CollaborationBarStyle
                  }
                />
              </div>
            ))}
          </div>
          <small>
            Readiness, repository detection and weighted thread share use
            different denominators. The progression is descriptive, not a
            conversion funnel.
          </small>
        </div>

        <div className={styles.taskFootprint} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationTasksTitle" />
            <EditableText as="p" copyKey="collaborationTasksBody" />
          </header>
          <div className={styles.taskFootprintRows}>
            {taskFootprint.map((item, index) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <i>
                  <em
                    style={
                      {
                        "--collaboration-delay": `${index * 90}ms`,
                        "--collaboration-rate": `${Math.max(
                          (item.value / taskMaximum) * 100,
                          1,
                        )}%`,
                      } as CollaborationBarStyle
                    }
                  />
                </i>
                <strong>{item.value.toLocaleString("en-US")}</strong>
              </div>
            ))}
          </div>
          <div className={styles.automationSplit}>
            <header>
              <strong>Automation is broader than Agent use</strong>
              <span>Probability-weighted thread presence</span>
            </header>
            {collaboration.automationByItem.map((item) => (
              <div key={item.label}>
                <b>{item.label}</b>
                <p>
                  <strong>{formatPercent(item.knownAutomation, 1)}</strong>
                  <span>Any known Bot or App</span>
                </p>
                <p>
                  <strong>{formatPercent(item.verifiedAgent, 1)}</strong>
                  <span>Verified Agent participation</span>
                </p>
                <p>
                  <strong>{formatPercent(item.conventionalAutomation, 1)}</strong>
                  <span>Conventional automation</span>
                </p>
                <p>
                  <strong>{formatPercent(item.automationOnly, 2)}</strong>
                  <span>No visible GitHub User account</span>
                </p>
              </div>
            ))}
          </div>
          <small>
            Counts are Agent-attributed public events across the probability
            sample, not shares of labour. One thread can contain several tasks.
            Bot/App and Agent columns overlap because many Agent services use a
            GitHub App or Bot identity.
          </small>
        </div>

        <MarkerAdoption
          measure={markerMeasure}
          onMeasureChange={setMarkerMeasure}
        />

        <div className={styles.markerSpread} data-reveal>
          <header>
            <span>WHERE THE RULES APPEAR</span>
            <h3>Agent instructions have already moved into model infrastructure.</h3>
            <p>
              Strict instruction coverage is highest in frameworks, but it is
              already present in 28 of 36 Model Infra repositories. The same
              files now sit beside compilers, runtimes, data systems and model
              serving code.
            </p>
          </header>
          <div className={styles.markerNicheRows}>
            {markerNiches.map((item, index) => {
              const rate = Math.round((item.value / item.total) * 100);
              return (
                <div className={styles.markerNicheRow} key={item.label}>
                  <span>{item.label}</span>
                  <div>
                    <i
                      style={
                        {
                          "--marker-delay": `${index * 90}ms`,
                          "--marker-rate": `${rate}%`,
                        } as MarkerBarStyle
                      }
                    />
                  </div>
                  <b>
                    {item.value}/{item.total}
                  </b>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.threadMap} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationEntryTitle" />
            <EditableText as="p" copyKey="collaborationEntryBody" />
          </header>
          <div className={styles.threadMapTable}>
            <div className={styles.threadMapHead}>
              <span>Visible actor</span>
              <b>Open</b>
              <b>Review</b>
              <b>Gate</b>
            </div>
            {threadRows.map((row, rowIndex) => (
              <div
                className={styles.threadMapRow}
                data-tone={row.tone}
                key={row.label}
              >
                <strong>{row.label}</strong>
                {row.values.map((value, columnIndex) => (
                  <div
                    data-stage={["Open", "Review", "Gate"][columnIndex]}
                    key={`${row.label}-${columnIndex}`}
                  >
                    {value === null ? (
                      <span className={styles.notEstimated}>Not estimated</span>
                    ) : (
                      <>
                        <span>{formatPercent(value, 1)}</span>
                        <i
                          style={
                            {
                              "--collaboration-delay": `${
                                rowIndex * 100 + columnIndex * 70
                              }ms`,
                              "--collaboration-rate": `${Math.max(
                                value * 100,
                                0.8,
                              )}%`,
                            } as CollaborationBarStyle
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <small>
            Open uses all {collaboration.sampleThreads.toLocaleString("en-US")} sampled threads. Review uses {collaboration.samplePullRequests.toLocaleString("en-US")} PRs. Gate
            uses resolved threads with a visible final close, merge or reopen
            actor. Rows overlap when an App mediates a User action.
          </small>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02B</span>
          <strong>The contribution process</strong>
        </div>

        <div className={styles.iterationLoop} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationIterationTitle" />
            <EditableText as="p" copyKey="collaborationIterationBody" />
          </header>
          <div className={styles.iterationSignals}>
            {iterationSignals.map((item, index) => (
              <div key={item.label}>
                <strong>{formatPercent(item.value, 1)}</strong>
                <span>{item.label}</span>
                <i>
                  <em
                    style={
                      {
                        "--collaboration-delay": `${index * 100}ms`,
                        "--collaboration-rate": `${item.value * 100}%`,
                      } as CollaborationBarStyle
                    }
                  />
                </i>
              </div>
            ))}
          </div>
          <p className={styles.iterationSensitivity}>
            After a change request, a later commit is visible in {formatPercent(
              collaboration.agentChangeRequestFollowupCommitShare,
              1,
            )} of Agent-attributed cases and {formatPercent(
              collaboration.humanChangeRequestFollowupCommitShare,
              1,
            )} of GitHub User cases. Only 63 sampled PRs contain a visible
            change request; the difference is descriptive, not an efficiency
            estimate.
          </p>
        </div>

        <div className={styles.governanceLedger} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationGovernanceTitle" />
            <EditableText as="p" copyKey="collaborationGovernanceBody" />
          </header>
          <div className={styles.governanceRail} aria-label="Contribution policy scan">
            <i
              data-policy="invite"
              style={{ width: `${collaboration.explicitInvitations}%` }}
            />
            <i
              data-policy="gate"
              style={{ width: `${collaboration.gatedPolicies}%` }}
            />
            <i
              data-policy="unspecified"
              style={{ width: `${collaboration.noDetectedPolicySignal}%` }}
            />
            <i
              data-policy="closed"
              style={{ width: `${collaboration.restrictedCreationPolicies}%` }}
            />
          </div>
          <dl className={styles.governanceLegend}>
            <div data-policy="invite">
              <dt>{collaboration.explicitInvitations}</dt>
              <dd>Explicitly invite contribution</dd>
            </div>
            <div data-policy="gate">
              <dt>{collaboration.gatedPolicies}</dt>
              <dd>Issue-first or scoped pre-approval</dd>
            </div>
            <div data-policy="unspecified">
              <dt>{collaboration.noDetectedPolicySignal}</dt>
              <dd>No restrictive policy signal detected</dd>
            </div>
            <div data-policy="closed">
              <dt>{collaboration.restrictedCreationPolicies}</dt>
              <dd>Restrict pull-request creation to collaborators</dd>
            </div>
          </dl>
          <small>
            GitHub creation settings first; frozen README, CONTRIBUTING,
            GOVERNANCE and PR-template candidates manually reviewed.
          </small>
        </div>

        <div className={styles.caseGrid} data-reveal>
          <article className={styles.caseNarrative}>
            <EditableText as="h3" copyKey="caseTitle" />
            <EditableText as="blockquote" copyKey="caseQuote" />
            <EditableText as="p" copyKey="caseBody" />
          </article>
          <aside className={styles.caseEvidence}>
            <h3>DeepSeek Harness · checked 29 Aug 2026</h3>
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

        <div className={styles.outcomeEvidence} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationBurdenTitle" />
            <EditableText as="p" copyKey="collaborationBurdenBody" />
          </header>
          <div className={styles.outcomeColumns}>
            <article>
              <span>90+ day resolved PRs · GitHub merged flag</span>
              <div className={styles.outcomeBar}>
                <b>External author</b>
                <i>
                  <em style={{ width: `${collaboration.externalMergeFlagShare * 100}%` }} />
                </i>
                <strong>{formatPercent(collaboration.externalMergeFlagShare, 1)}</strong>
              </div>
              <div className={styles.outcomeBar}>
                <b>Maintainer or member</b>
                <i>
                  <em style={{ width: `${collaboration.internalMergeFlagShare * 100}%` }} />
                </i>
                <strong>{formatPercent(collaboration.internalMergeFlagShare, 1)}</strong>
              </div>
              <small>
                {formatPercent(collaboration.externalPrShare, 1)} of weighted PR
                intake comes from external-association accounts.
              </small>
            </article>
            <article>
              <span>Fixed 90-day maturity · median repository</span>
              <div className={styles.maturityCompare}>
                <p>
                  <strong>{formatPercent(collaboration.top100PrUnresolvedMedian, 1)}</strong>
                  <small>Top 100 unresolved PR share</small>
                </p>
                <p>
                  <strong>{formatPercent(collaboration.controlPrUnresolvedMedian, 1)}</strong>
                  <small>12 long-lived controls</small>
                </p>
              </div>
              <p className={styles.controlSignal}>
                {collaboration.controlsWithRisingPrBacklog} of {collaboration.controlsTotal}
                {" "}controls also have a higher unresolved share in 2026 than
                in 2022. Review pressure is wider than the Agentic AI sample.
              </p>
            </article>
          </div>
        </div>

        <div className={styles.scarcityStatement} data-reveal>
          <EditableText as="h3" copyKey="collaborationScarcityTitle" />
          <EditableText as="p" copyKey="collaborationScarcityBody" />
          <div>
            <span>PR intake</span>
            <strong>{formatPercent(collaboration.externalPrShare, 1)} external</strong>
            <span>Visible Agent review</span>
            <strong>{formatPercent(collaboration.agentReviewShare, 1)} of PRs</strong>
            <span>Visible GitHub User gate</span>
            <strong>{formatPercent(collaboration.userGateShare, 1)} of resolved threads</strong>
          </div>
        </div>

        <div className={styles.studyFrame} data-reveal>
          <header>
            <span>WHAT THE DATA CAN SUPPORT</span>
            <EditableText as="h3" copyKey="studyTitle" />
          </header>
          <div>
            <p>
              <strong>Complete</strong>
              <span>100 repository surfaces, {collaboration.sampleThreads.toLocaleString("en-US")} sampled threads, {collaboration.publicEventsAnalyzed.toLocaleString("en-US")} timeline, review-comment and PR-commit events, and twelve long-lived controls</span>
            </p>
            <p>
              <strong>Observed</strong>
              <span>Repository rules, public actor identities, review loops, external author association, fixed-maturity outcomes and visible gate actions</span>
            </p>
            <p>
              <strong>Still not causal</strong>
              <span>Agent participation is voluntary and selected. Public traces cannot reveal undisclosed local AI use or private maintainer work.</span>
            </p>
          </div>
          <EditableText as="small" copyKey="studyNote" />
        </div>
      </section>

      <section className={styles.closing}>
        <EditableText as="p" copyKey="closingQuestion" />
        <EditableText as="small" copyKey="closingNote" />
      </section>

      <section className={styles.methodology} id="method">
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
            <p>
              The Collaboration chapter freezes the tracked-pool Top 100 by
              July OpenRank, then treats OpenRank only as a sampling rule. The
              current entry-surface refresh uses GitHub REST and GraphQL. Annual
              marker snapshots inspect declared instruction and config paths on
              the default branch. The ClickHouse event panel is retained for
              historical scale and quality checks, but its 2025–2026 PR author
              and merge-time payload is incomplete and is not used for a claim
              about productivity.
            </p>
          </div>
        </details>
      </section>

      <ResearchTrail groups={references} />
      </ReportCopyEditor>
    </main>
  );
}

function MarkerAdoption({
  measure,
  onMeasureChange,
}: {
  measure: "strict" | "active";
  onMeasureChange: (measure: "strict" | "active") => void;
}) {
  const title =
    measure === "strict"
      ? "Active instruction"
      : "Instruction or active config";

  return (
    <div className={styles.markerPanel} data-reveal>
      <header>
        <span>MACHINE-READABLE COLLABORATION RULES</span>
        <h3>The repository contract changed quickly.</h3>
        <p>
          Among the 86 repositories observable in both years, 42 kept a strict
          instruction and 32 added one. None removed it from the declared target
          paths. Structural missing years are excluded from each denominator.
        </p>
        <div className={styles.markerToggle} aria-label="Marker definition">
          <button
            type="button"
            data-active={measure === "strict"}
            onClick={() => onMeasureChange("strict")}
          >
            Strict instruction
          </button>
          <button
            type="button"
            data-active={measure === "active"}
            onClick={() => onMeasureChange("active")}
          >
            + active config
          </button>
        </div>
      </header>
      <div className={styles.markerChart}>
        <div className={styles.markerChartTitle}>
          <strong>{title}</strong>
          <span>repositories / observable repositories</span>
        </div>
        <div className={styles.markerTimelineRows}>
          {markerTimeline.map((item, index) => {
            const value = item[measure];
            const rate = Math.round((value / item.observed) * 100);
            return (
              <div className={styles.markerTimelineRow} key={item.year}>
                <b>{item.year}</b>
                <div>
                  <i
                    style={
                      {
                        "--marker-delay": `${index * 100}ms`,
                        "--marker-rate": `${rate}%`,
                      } as MarkerBarStyle
                    }
                  />
                </div>
                <span>
                  {value}/{item.observed}
                </span>
              </div>
            );
          })}
        </div>
        <div className={styles.markerTools} aria-label="Current marker tools">
          {markerTools.map(([tool, repositories]) => (
            <span key={tool}>
              <b>{repositories}</b> {tool}
            </span>
          ))}
        </div>
        <small>
          Latest commit at or before each snapshot on the current default
          branch. Target paths cover common root and .github instructions and
          config directories. .gitignore residuals are excluded.
        </small>
      </div>
    </div>
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

function formatPercent(value: number, digits = 0) {
  const scale = 10 ** digits;
  const rounded = Math.round((value * 100 + Number.EPSILON) * scale) / scale;
  return `${rounded.toFixed(digits)}%`;
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
