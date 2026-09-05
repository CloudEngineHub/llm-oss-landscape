"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PlayIcon,
} from "lucide-react";
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
  MacroGroup,
} from "./research-data";
import { CollaborationCasebook } from "./collaboration-evidence";
import { EditableText, ReportCopyEditor } from "./report-copy-editor";
import { LanguageMixChart, RuntimePath } from "./report-figures";
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

type AgentCoverageStyle = CSSProperties & {
  "--agent-coverage": string;
  "--agent-coverage-delay": string;
};

type LineageBarStyle = CSSProperties & {
  "--lineage-width": string;
  "--lineage-delay": string;
};

type ProfileBarStyle = CSSProperties & {
  "--profile-width": string;
  "--profile-delay": string;
};

type FlowRevealStyle = CSSProperties & {
  "--flow-delay": string;
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
    openChallenge:
      "Strong isolation still competes with startup time. Warm pools need safe reset, tenant separation, capacity limits and portable templates.",
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
    openChallenge:
      "An identity says who the workload is. The task still needs to carry which tools and resources it may use, who approved it, how much it may spend and when that authority expires.",
    href: "https://spiffe.io/docs/latest/deploying/spire_agent/",
  },
  {
    id: "state",
    label: "State & recovery",
    before: "State is attached to a service or database transaction",
    after: "A task can pause, retry and resume across several environments",
    detail:
      "Context, artifacts and tool results need a durable home. A retry also has to know whether an earlier tool call already changed an external system.",
    mapSignal:
      "9 memory and context projects. OpenViking gained 42.6 OpenRank points from April to July.",
    openInfra:
      "Dapr Agents packages durable workflows, retries and persistent state; data and context systems remain the durable substrate.",
    openChallenge:
      "Safe resume needs checkpoints, idempotency and compensation. Context also needs lineage, expiry, deletion and recovery from bad state.",
    href: "https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/",
  },
  {
    id: "observability",
    label: "Action trace",
    before: "Teams inspect service requests, logs and resources",
    after: "Teams need to reconstruct a decision and its side effect",
    detail:
      "A successful request confirms transport, while the useful question is whether the Agent made the intended change. Answering it requires a trace from model work through tool execution and sandbox events to the external result.",
    mapSignal:
      "4 agent observability projects; the category is stable, while tool and protocol layers are growing around it.",
    openInfra:
      "OpenTelemetry is widely deployed, but its GenAI agent and tool conventions are still marked Development.",
    openChallenge:
      "The trace still has to connect model work, tool execution and the external result. Independent platform records are essential when the Agent itself is one of the actors being audited.",
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
    openChallenge:
      "Platforms still need task-level SLOs and cost attribution across CPU, GPU, network and sandbox time, while balancing cold starts against reserved capacity.",
    href: "https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/",
  },
  {
    id: "traffic",
    label: "Traffic & budgets",
    before: "A request follows a bounded downstream path",
    after: "One task can fan out across models and tools",
    detail:
      "Calls may be serial, parallel or retried. Public token totals combine those patterns, so task-level QPS, concurrency and fan-out remain hidden inside the aggregate.",
    mapSignal:
      "Tools, protocols and gateways are filling in around the application layer. Nine OpenRouter Top 20 apps align to the current landscape.",
    openInfra:
      "Agentgateway supports request and token limits, plus per-tool limits for MCP traffic.",
    openChallenge:
      "Budgets, fan-out caps, backpressure and cancellation need to cross gateway, model, tool and runtime boundaries. Agentgateway's local counters reset with the process, leaving task-wide limits to be coordinated across components.",
    href: "https://agentgateway.dev/docs/standalone/latest/configuration/resiliency/rate-limits/",
  },
] as const;

const openRouterLandscapeMatches = [
  { rank: 1, name: "Hermes Agent", tokens: "1.65T", zone: "Personal assistants" },
  { rank: 3, name: "Claude Code", tokens: "485B", zone: "Agentic coding" },
  { rank: 4, name: "pi", tokens: "367B", zone: "Agentic coding" },
  { rank: 5, name: "Kilo Code", tokens: "341B", zone: "Agentic coding" },
  { rank: 6, name: "Cline", tokens: "253B", zone: "Agentic coding" },
  { rank: 7, name: "Codex", tokens: "190B", zone: "Agentic coding" },
  { rank: 9, name: "OpenClaw", tokens: "150B", zone: "Personal assistants" },
  { rank: 10, name: "DeepSeek Harness", tokens: "125B", zone: "Coding harnesses" },
  { rank: 18, name: "OpenHands", tokens: "33.2B", zone: "Agentic coding" },
] as const;

const zenMuxModelSnapshot = [
  { rank: 1, name: "Claude Opus 4.8", tokens: "283.6B", openWeight: false, share: 100 },
  { rank: 2, name: "DeepSeek V4 Pro", tokens: "265.2B", openWeight: true, share: 94 },
  { rank: 3, name: "GLM 5.2", tokens: "143.3B", openWeight: true, share: 51 },
  { rank: 4, name: "DeepSeek V4 Flash", tokens: "140.9B", openWeight: true, share: 50 },
  { rank: 5, name: "Claude Opus 4.7", tokens: "125.4B", openWeight: false, share: 44 },
] as const;

const openInfrastructureProjects = [
  {
    role: "Run & isolate",
    summary: "Create short-lived environments and put a harder boundary under generated code.",
    projects: [
      {
        name: "Kubernetes Agent Sandbox",
        note: "Sandbox lifecycle, claims and warm pools",
        badge: "DIRECT",
        href: "https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md",
      },
      {
        name: "Kata Containers",
        note: "VM-backed isolation under Agent Sandbox",
        badge: "OPENINFRA",
        href: "https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/",
      },
      {
        name: "Confidential Containers",
        note: "Attested confidential-computing substrate",
        badge: "AI SUBSTRATE",
        href: "https://www.cncf.io/blog/2026/07/22/confidential-containers-becomes-a-cncf-incubating-project/",
      },
    ],
  },
  {
    role: "Coordinate & operate",
    summary: "Keep state, recover work and let agents operate the cloud-native stack.",
    projects: [
      {
        name: "kagent",
        note: "Agents for Kubernetes, Prometheus, Istio and Argo",
        badge: "DIRECT",
        href: "https://www.cncf.io/blog/2025/04/15/kagent-bringing-agentic-ai-to-cloud-native/",
      },
      {
        name: "Dapr Agents",
        note: "Durable workflows, state, retries and identity",
        badge: "DIRECT",
        href: "https://www.cncf.io/announcements/2026/03/23/general-availability-of-dapr-agents-delivers-production-reliability-for-enterprise-ai/",
      },
      {
        name: "OpenChoreo",
        note: "One platform for human and agent operations",
        badge: "DIRECT",
        href: "https://www.cncf.io/blog/2026/07/21/platform-engineering-for-the-agentic-enterprise-managing-applications-resources-and-ai-agents/",
      },
    ],
  },
  {
    role: "Connect & govern",
    summary: "Route model, MCP and agent traffic through policy-aware control points.",
    projects: [
      {
        name: "kgateway",
        note: "Kubernetes control plane for AI traffic",
        badge: "DIRECT",
        href: "https://www.cncf.io/blog/2025/11/18/kgateway-v2-1-is-released/",
      },
      {
        name: "agentgateway",
        note: "Data plane for LLMs, MCP tools and agents",
        badge: "LF / KGATEWAY",
        href: "https://www.cncf.io/blog/2025/11/18/kgateway-v2-1-is-released/",
      },
      {
        name: "Istio",
        note: "Service-mesh policy extended to AI traffic",
        badge: "ADAPTING",
        href: "https://www.cncf.io/announcements/2026/03/25/istio-brings-future-ready-service-mesh-to-the-ai-era-with-new-ambient-multicluster-gateway-api-inference-extension-and-more/",
      },
    ],
  },
  {
    role: "Trace & explain",
    summary: "Carry agent, tool and sandbox activity into the existing telemetry path.",
    projects: [
      {
        name: "OpenTelemetry",
        note: "Agent, workflow and execute-tool semantics",
        badge: "IN DEVELOPMENT",
        href: "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md",
      },
      {
        name: "Jaeger",
        note: "Agent execution paths built on OpenTelemetry",
        badge: "ADAPTING",
        href: "https://www.cncf.io/blog/2026/05/26/how-jaeger-is-evolving-to-trace-ai-agents-with-opentelemetry/",
      },
    ],
  },
] as const;

const markerNiches = [
  { label: "Agent frameworks", value: 20, total: 21 },
  { label: "Agent runtime infra", value: 15, total: 15 },
  { label: "Agent applications", value: 25, total: 28 },
  { label: "Model infra", value: 32, total: 36 },
] as const;

const patchLineageSegments = [
  { id: "retained", label: "Exact text retained", lines: 765, share: 62.4 },
  { id: "human", label: "Changed by a human account", lines: 123, share: 10.0 },
  { id: "agent", label: "Changed by a later Agent commit", lines: 193, share: 15.8 },
  { id: "unknown", label: "Later author unresolved", lines: 144, share: 11.8 },
] as const;

const patchLineageCases = [
  {
    id: "vercel-ai-18818",
    repo: "vercel/ai",
    number: 18818,
    href: "https://github.com/vercel/ai/pull/18818",
    path: "Agent iterates to merge",
    initial: 172,
    retained: 0,
    human: 0,
    agent: 172,
    unknown: 0,
    note: "The first 172-line patch was fully replaced by later Agent revisions.",
  },
  {
    id: "warp-13382",
    repo: "warpdotdev/warp",
    number: 13382,
    href: "https://github.com/warpdotdev/warp/pull/13382",
    path: "Agent → human",
    initial: 44,
    retained: 31,
    human: 12,
    agent: 1,
    unknown: 0,
    note: "The human handoff kept 31 of 44 first-patch lines unchanged.",
  },
  {
    id: "openmetadata-25243",
    repo: "open-metadata/OpenMetadata",
    number: 25243,
    href: "https://github.com/open-metadata/OpenMetadata/pull/25243",
    path: "Agent → human",
    initial: 62,
    retained: 21,
    human: 29,
    agent: 12,
    unknown: 0,
    note: "The handoff is visible in the code: 29 lines changed under later human-account commits.",
  },
  {
    id: "onnxruntime-28045",
    repo: "microsoft/onnxruntime",
    number: 28045,
    href: "https://github.com/microsoft/onnxruntime/pull/28045",
    path: "Agent → human",
    initial: 611,
    retained: 533,
    human: 78,
    agent: 0,
    unknown: 0,
    note: "The largest case kept 533 of 611 first-patch lines; it also dominates the pooled total.",
  },
  {
    id: "openhands-2614",
    repo: "OpenHands/software-agent-sdk",
    number: 2614,
    href: "https://github.com/OpenHands/software-agent-sdk/pull/2614",
    path: "Agent → human",
    initial: 11,
    retained: 0,
    human: 4,
    agent: 7,
    unknown: 0,
    note: "All 11 first-patch lines changed before merge: seven under Agent commits and four under human accounts.",
  },
  {
    id: "mlflow-19721",
    repo: "mlflow/mlflow",
    number: 19721,
    href: "https://github.com/mlflow/mlflow/pull/19721",
    path: "Agent → unresolved author",
    initial: 262,
    retained: 118,
    human: 0,
    agent: 0,
    unknown: 144,
    note: "The later commits do not expose a resolvable GitHub author, so 144 changed lines remain unattributed.",
  },
  {
    id: "mlflow-21621",
    repo: "mlflow/mlflow",
    number: 21621,
    href: "https://github.com/mlflow/mlflow/pull/21621",
    path: "Agent iterates to merge",
    initial: 33,
    retained: 33,
    human: 0,
    agent: 0,
    unknown: 0,
    note: "All 33 lines in the first effective patch remained unchanged.",
  },
  {
    id: "mlflow-22355",
    repo: "mlflow/mlflow",
    number: 22355,
    href: "https://github.com/mlflow/mlflow/pull/22355",
    path: "Agent → human",
    initial: 25,
    retained: 25,
    human: 0,
    agent: 0,
    unknown: 0,
    note: "Human commits followed, but none removed or rewrote the 25 first-patch lines.",
  },
  {
    id: "mlflow-22659",
    repo: "mlflow/mlflow",
    number: 22659,
    href: "https://github.com/mlflow/mlflow/pull/22659",
    path: "Agent iterates to merge",
    initial: 5,
    retained: 4,
    human: 0,
    agent: 1,
    unknown: 0,
    note: "Four of five lines remained; the Agent revised the fifth.",
  },
  {
    id: "mooncake-2686",
    repo: "kvcache-ai/Mooncake",
    number: 2686,
    href: "https://github.com/kvcache-ai/Mooncake/pull/2686",
    path: "Merge commit · lineage unresolved",
    initial: null,
    retained: null,
    human: null,
    agent: null,
    unknown: null,
    note: "Copilot is attached to a two-parent merge commit. Its first-parent diff includes upstream history, so the case stays in the review but outside the line denominator.",
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
  const [lineageCaseId, setLineageCaseId] = useState<
    (typeof patchLineageCases)[number]["id"]
  >(
    patchLineageCases[0].id,
  );
  const [profileRepository, setProfileRepository] = useState(
    stats.collaboration.repositoryProfile.repositoryItems[0]?.repo ?? "",
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
  const layerOpenrank = layerProjects.reduce(
    (total, project) => total + (project.openrank ?? 0),
    0,
  );
  const leaderOpenrankShare = layerOpenrank
    ? Math.round(
        (leaders.reduce(
          (total, project) => total + (project.openrank ?? 0),
          0,
        ) /
          layerOpenrank) *
          100,
      )
    : 0;
  const activeShift = infraShifts.find((shift) => shift.id === shiftId)!;
  const activeLineageCase = patchLineageCases.find(
    (item) => item.id === lineageCaseId,
  )!;
  const collaboration = stats.collaboration;
  const activityFlow = collaboration.activityFlow;
  const pressure = collaboration.systemPressure;
  const threadPanel = collaboration.threadPanel;
  const monthlyFlowMaximum = Math.max(
    ...activityFlow.monthly.flatMap((item) => [item.issues, item.pullRequests]),
  );
  const pressure2025 = pressure.history.find((item) => item.year === 2025)!;
  const pressure2026 = pressure.history.find((item) => item.year === 2026)!;
  const threadPanel2025 = threadPanel.years.find((item) => item.year === 2025)!;
  const threadPanel2026 = threadPanel.years.find((item) => item.year === 2026)!;
  const pressurePullRequestGrowth =
    (pressure2026.pullRequestsOpened / pressure2025.pullRequestsOpened - 1) * 100;
  const push2025 = pressure.pushHistory.find((item) => item.year === 2025)!;
  const push2026 = pressure.pushHistory.find((item) => item.year === 2026)!;
  const pushBenchmarkMaximum = Math.max(
    ...pressure.pushBenchmarks.map((item) => item.pushActors),
  );
  const pressureRoleMaximum = Math.max(
    ...pressure.roleFlows.map((item) => item.pullRequestBalance),
  );
  const releaseBucketMaximum = Math.max(
    ...activityFlow.releases.buckets.map((item) => item.count),
  );
  const activeProfileRepository =
    collaboration.repositoryProfile.repositoryItems.find(
      (item) => item.repo === profileRepository,
    ) ?? collaboration.repositoryProfile.repositoryItems[0];
  const openedStage = collaboration.threadParticipationStages.find(
    (stage) => stage.id === "opened",
  )!;
  const reviewStage = collaboration.threadParticipationStages.find(
    (stage) => stage.id === "review",
  )!;
  const finalStateStage = collaboration.threadParticipationStages.find(
    (stage) => stage.id === "final-state",
  )!;
  const taskFootprint = [
    { label: "Review", value: collaboration.agentTaskEvents.review },
    { label: "Triage & routing", value: collaboration.agentTaskEvents.triage },
    { label: "Discussion", value: collaboration.agentTaskEvents.discussion },
  ];
  const taskMaximum = Math.max(...taskFootprint.map((item) => item.value));
  const iterationSignals = [
    {
      label: "Formal review recorded · 2,521 / 3,567 PRs",
      value: collaboration.reviewedPrShare,
    },
    {
      label: "Agent review or inline review comment · 1,342 / 3,567 PRs",
      value: collaboration.agentReviewShare,
    },
    {
      label: "Another commit after first formal review · 1,385 / 2,521 PRs",
      value: collaboration.reviewedPrFollowupCommitShare,
    },
  ];
  const reviewerFollowupComparison = [
    {
      id: "agent",
      label: "First formal review by a named Agent or App",
      followups: collaboration.firstReviewAgentFollowupCommits,
      total: collaboration.firstReviewAgentPrs,
      value: collaboration.firstReviewAgentFollowupShare,
    },
    {
      id: "user",
      label: "First formal review by a GitHub User account",
      followups: collaboration.firstReviewGithubUserFollowupCommits,
      total: collaboration.firstReviewGithubUserPrs,
      value: collaboration.firstReviewGithubUserFollowupShare,
    },
  ];
  const changeRequestComparison = [
    {
      id: "all",
      label: "All CHANGES_REQUESTED reviews",
      followups: collaboration.changeRequestFollowupCommits,
      total: collaboration.changeRequestPrs,
      value: collaboration.changeRequestFollowupCommitShare,
    },
    {
      id: "agent",
      label: "Request from a named Agent or App",
      followups: collaboration.agentChangeRequestFollowupCommits,
      total: collaboration.agentChangeRequestPrs,
      value: collaboration.agentChangeRequestFollowupCommitShare,
    },
    {
      id: "user",
      label: "Request from a GitHub User account",
      followups: collaboration.humanChangeRequestFollowupCommits,
      total: collaboration.humanChangeRequestPrs,
      value: collaboration.humanChangeRequestFollowupCommitShare,
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
        <div className={styles.navActions} aria-label="Download the report">
          <a
            className={`${styles.downloadLink} ${styles.downloadEnglish}`}
            href="/reports/agentic-open-source-collaboration-2026.en.pdf"
            download
          >
            <DownloadIcon aria-hidden="true" />
            <span>English PDF</span>
          </a>
          <a
            className={`${styles.downloadLink} ${styles.downloadChinese}`}
            href="/reports/agentic-open-source-collaboration-2026.zh-CN.pdf"
            download
          >
            <DownloadIcon aria-hidden="true" />
            <span>中文 PDF</span>
          </a>
          <Link className={styles.navBack} href="/">
            <ArrowLeftIcon aria-hidden="true" />
            <span>Landscape</span>
          </Link>
        </div>
      </nav>

      <aside className={styles.reportToc} aria-label="Report structure" tabIndex={0}>
        <span className={styles.reportTocLabel}>Report structure</span>
        <div className={styles.reportTocLinks}>
          <a href="#landscape"><span>01</span> Landscape</a>
          <a href="#infrastructure"><span>01A</span> Open infrastructure</a>
          <a href="#collaboration"><span>02</span> Collaboration</a>
          <a href="#collaboration-flow"><span>02A</span> Workload</a>
          <a href="#agent-setup"><span>02B</span> Agent setup</a>
          <a href="#agent-workflow"><span>02C</span> Public workflow</a>
          <a href="#method"><span>03</span> Method</a>
          <a href="#references"><span>04</span> Sources</a>
        </div>
      </aside>

      <aside
        className={styles.floatingPresentations}
        aria-label="Open presentation mode"
      >
        <Link
          className={`${styles.playLink} ${styles.playInfra}`}
          href="/presentations/260910_inclusion/open-infrastructure/present"
        >
          <PlayIcon aria-hidden="true" />
          <span>SLIDES</span>
          <strong>Open Infrastructure</strong>
        </Link>
        <Link
          className={`${styles.playLink} ${styles.playCollaboration}`}
          href="/presentations/260910_inclusion/present"
        >
          <PlayIcon aria-hidden="true" />
          <span>SLIDES</span>
          <strong>Collaboration</strong>
        </Link>
      </aside>

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
        <EditableText as="p" className={styles.heroByline} copyKey="heroByline" />
        <EditableText as="p" className={styles.heroSummary} copyKey="heroLede" />
        <div
          className={styles.heroCredits}
          aria-label="Ant Open Source and InclusionAI"
        >
          <Image
            className={styles.heroAntLogo}
            src="/community-logos/ant-open-source.png"
            alt="Ant Open Source"
            width={1282}
            height={389}
            priority
          />
          <span aria-hidden="true" />
          <Image
            className={styles.heroInclusionLogo}
            src="/community-logos/inclusionai.png"
            alt="InclusionAI"
            width={1612}
            height={466}
            priority
          />
        </div>
      </header>

      <section className={styles.executiveSummary} data-reveal>
        <h2>What this report finds</h2>
        <div>
          <article>
            <h3>Runtime work is catching up with the applications people already use.</h3>
            <p>
              Applications hold 55% of Agent Infra&apos;s July OpenRank. Runtime
              accounts for 13 of the 23 Agent Infra selections absent from the
              May tracking pool, filling in around context, interoperability,
              tool control and execution.
            </p>
          </article>
          <article>
            <h3>PR intake doubled. Completion did not keep pace.</h3>
            <p>
              Across the same 55 repositories, PR intake rose from 129,563 in
              2025 to 265,447 in 2026. The share still open after 90 days doubled
              to 11.3%, while the repository-median merge rate fell to 68.4%.
            </p>
          </article>
          <article>
            <h3>Agents expanded review and revision, not the final decision path.</h3>
            <p>
              Only {collaboration.participationOpenerSampleThreads.toLocaleString("en-US")} of {collaboration.sampleThreads.toLocaleString("en-US")} sampled Issues and pull requests were opened
              by a named Agent or App, while {reviewStage.agent.toLocaleString("en-US")} PRs received an Agent review. A GitHub User account performed {formatPercent(finalStateStage.user / finalStateStage.denominator, 1)} of final visible state changes.
            </p>
          </article>
        </div>
      </section>

      <section
        className={styles.axisBand}
        aria-label="Two ways agents change software systems"
        data-reveal
      >
        <article>
          <span>WHAT INFRASTRUCTURE HAS TO HANDLE</span>
          <EditableText as="h2" copyKey="executionGateTitle" />
          <EditableText as="p" copyKey="executionGateBody" />
        </article>
        <article>
          <span>WHAT CHANGES IN SOFTWARE DEVELOPMENT</span>
          <EditableText as="h2" copyKey="mergeGateTitle" />
          <EditableText as="p" copyKey="mergeGateBody" />
        </article>
      </section>

      <section
        className={styles.metricSection}
        aria-labelledby="landscape-snapshot-title"
      >
        <header className={styles.metricIntro}>
          <span id="landscape-snapshot-title">LANDSCAPE SNAPSHOT</span>
          <p>
            These four numbers define the project universe used in the next
            section: the preserved May baseline, the current project pool, the
            two landscape selections and the projects added since that baseline.
          </p>
        </header>
        <div className={styles.metricBand} data-reveal>
          <Metric
            value={stats.mayTracked}
            label="Repositories in the preserved May 2026 baseline"
          />
          <Metric
            value={stats.currentTracked}
            label="Repositories in the current canonical project pool"
          />
          <Metric
            value={stats.total}
            label="Projects shown across Agent Infra and Model Infra"
          />
          <Metric
            value={stats.selectedOutsideMay}
            label="Current map selections absent from the May baseline"
          />
        </div>
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
              <strong>{leaderOpenrankShare}%</strong>
              <span>July OpenRank held by the five projects listed here</span>
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
          Since May, ongoing ecosystem review has expanded the tracked pool from{" "}
          {stats.mayTracked} to {stats.currentTracked} repositories.
          Applications still attract most of the visible activity. Runtime now
          holds almost the same number of selected projects, and it accounts for{" "}
          {stats.runtimeOutsideMay} of the {stats.agentOutsideMay} Agent
          Infra projects that were not in the May tracking pool. Projects enter
          the pool through activity-based discovery and editorial review;
          a second editorial pass decides which tracked projects belong on the map.
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
            <EditableText as="h3" copyKey="runtimePathTitle" />
            <EditableText as="p" copyKey="runtimePathBody" />
          </header>
          <RuntimePath points={stats.runtimePath} />
        </div>

        <aside className={styles.platformEvidence} data-reveal>
          <header>
            <EditableText as="h3" copyKey="outsideGithubTitle" />
            <EditableText as="p" copyKey="outsideGithubBody" />
          </header>
          <div className={styles.platformEvidenceGrid}>
            <section className={styles.openRouterPanel}>
              <div className={styles.platformPanelHeading}>
                <div>
                  <span>OPENROUTER · GLOBAL TOP 20</span>
                  <strong>9 / 20</strong>
                </div>
                <p>
                  Nine public apps in the current Top 20 map directly to projects
                  in Agent Infra.
                </p>
              </div>
              <div className={styles.openRouterRows}>
                {openRouterLandscapeMatches.map((app) => (
                  <div key={app.name}>
                    <span>#{app.rank}</span>
                    <b>{app.name}</b>
                    <small>{app.zone}</small>
                    <strong>{app.tokens}</strong>
                  </div>
                ))}
              </div>
              <a href="https://openrouter.ai/apps/" target="_blank" rel="noreferrer">
                OpenRouter App & Agent Rankings
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </section>

            <section className={styles.zenMuxPanel}>
              <div className={styles.platformPanelHeading}>
                <div>
                  <span>ZENMUX · JUNE 2026 MODEL TRAFFIC</span>
                  <strong>3 / 4</strong>
                </div>
                <p>
                  Three of the four most-used model endpoints in the frozen June
                  snapshot linked to public weights.
                </p>
              </div>
              <div className={styles.zenMuxRows}>
                {zenMuxModelSnapshot.map((model) => (
                  <div key={model.name}>
                    <span>#{model.rank}</span>
                    <b>{model.name}</b>
                    <i aria-hidden="true">
                      <em
                        data-open-weight={model.openWeight}
                        style={{ "--usage-width": `${model.share}%` } as CSSProperties}
                      />
                    </i>
                    <strong>{model.tokens}</strong>
                    <small>{model.openWeight ? "PUBLIC WEIGHTS" : "CLOSED"}</small>
                  </div>
                ))}
              </div>
              <a
                href="https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html"
                target="_blank"
                rel="noreferrer"
              >
                Explore ZenMux app and model analytics
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </section>
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
          <aside className={styles.infrastructureProjectMap} data-reveal>
            <header>
              <EditableText as="h3" copyKey="infrastructureProjectTitle" />
              <EditableText as="p" copyKey="infrastructureProjectBody" />
            </header>
            <div className={styles.infrastructureProjectLanes}>
              {openInfrastructureProjects.map((lane) => (
                <section key={lane.role}>
                  <span>{lane.role}</span>
                  <p>{lane.summary}</p>
                  <div>
                    {lane.projects.map((project) => (
                      <a
                        href={project.href}
                        key={project.name}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <b>{project.name}</b>
                        <small>{project.note}</small>
                        <em>{project.badge}</em>
                        <ExternalLinkIcon aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
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
              <article>
                <span>What remains unresolved</span>
                <p>{activeShift.openChallenge}</p>
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

        <section className={styles.chapterArgument} data-reveal>
          <div>
            <h3>One Top 100, read at two levels.</h3>
            <p>
              Every result begins with the same 100 repositories. Complete records
              show how much work arrived and what happened to it. Fifty public
              threads per repository show the sequence of response and review.
              Historical charts keep the same 55 repositories; their 2026 threads
              are reused from the main sample.
            </p>
          </div>
          <div className={styles.evidenceLayers}>
            <article>
              <header>
                <span>Complete repository record</span>
                <strong>Top 100</strong>
              </header>
              <p>
                All public Issues and pull requests in the fixed windows, plus
                repository profile, contribution policy, Agent files and releases.
                This is where workload, backlog and outcome figures come from.
              </p>
              <div>
                <span>Historical comparison</span>
                <b>Same {pressure.matchedRepositories} repositories</b>
                <p>
                  A subset of the Top 100 with comparable activity in 2024, 2025
                  and 2026. The membership stays fixed across the three years.
                </p>
              </div>
            </article>
            <article>
              <header>
                <span>Public thread timelines</span>
                <strong>{collaboration.sampleThreads.toLocaleString("en-US")} in 2026</strong>
              </header>
              <p>
                Fifty Issues or pull requests from each repository, including
                {" "}{collaboration.publicEventsAnalyzed.toLocaleString("en-US")} linked public events. This is where response,
                review and revision are read in sequence.
              </p>
              <div>
                <span>Historical comparison</span>
                <b>5,500 matched threads</b>
                <p>
                  Fifty threads from each of the same 55 repositories in 2025 and
                  2026 create a like-for-like view of response, review and completion.
                </p>
              </div>
            </article>
          </div>
          <aside className={styles.evidenceDrilldown}>
            <strong>Closer look inside the 2026 thread sample</strong>
            <p>
              We followed the ten merged pull requests in which a named coding
              Agent changed code. Nine expose a clean line history, letting us see
              what remained and who revised it before merge.
            </p>
          </aside>
        </section>

        <div
          className={styles.repositoryProfile}
          data-reveal
          id="repository-profile"
        >
          <header>
            <EditableText as="h3" copyKey="collaborationProfileTitle" />
            <EditableText as="p" copyKey="collaborationProfileBody" />
          </header>
          <div className={styles.repositoryProfileBody}>
            <section className={styles.repositoryTilePanel}>
              <div className={styles.repositoryTileExplorer}>
                <div
                  className={styles.repositoryTiles}
                  aria-label="100 repositories grouped by technical role"
                >
                  {collaboration.repositoryProfile.repositoryItems.map((item) => (
                    <a
                      aria-label={`${item.repo} on GitHub`}
                      data-active={activeProfileRepository?.repo === item.repo}
                      data-profile={item.technicalRoleKey}
                      href={`https://github.com/${item.repo}`}
                      key={item.repo}
                      onFocus={() => setProfileRepository(item.repo)}
                      onMouseEnter={() => setProfileRepository(item.repo)}
                      rel="noreferrer"
                      target="_blank"
                      title={`${item.repo} · ${item.technicalRoleLabel} · ${item.identityLabel}`}
                    />
                  ))}
                </div>
                {activeProfileRepository ? (
                  <a
                    className={styles.repositoryTileReadout}
                    href={`https://github.com/${activeProfileRepository.repo}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <strong>{activeProfileRepository.repo}</strong>
                    <span>
                      {activeProfileRepository.technicalRoleLabel}
                      {" · "}
                      {activeProfileRepository.identityLabel}
                    </span>
                    <small>
                      July OpenRank {activeProfileRepository.openrank.toFixed(1)}
                      {" · "}
                      {activeProfileRepository.stars.toLocaleString("en-US")} Stars
                      {" ↗"}
                    </small>
                  </a>
                ) : null}
              </div>
              <dl className={styles.repositoryTileLegend}>
                {collaboration.repositoryProfile.technicalRoles.map((group) => (
                  <div data-profile={group.key} key={group.key}>
                    <dt>{group.label}</dt>
                    <dd>{group.count}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <div className={styles.repositoryProfileDimensions}>
              <ProfileDistribution
                label="Project identity · manual review"
                items={collaboration.repositoryProfile.identities}
                total={collaboration.repositoryProfile.repositories}
              />
              <ProfileDistribution
                label="Repository creation"
                items={collaboration.repositoryProfile.ageCohorts}
                total={collaboration.repositoryProfile.repositories}
              />
              <ProfileDistribution
                label="GitHub primary language"
                items={collaboration.repositoryProfile.languages}
                total={collaboration.repositoryProfile.repositories}
              />
            </div>
          </div>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02A</span>
          <strong>More code for repositories to absorb</strong>
        </div>

        <div className={styles.activityFlow} data-reveal id="collaboration-flow">
          <header>
            <h3>Pull requests are arriving faster than issues.</h3>
            <p>
              From 1 January to 31 August 2026, the Top 100 opened about {formatCompact(activityFlow.pullRequestsOpened)} pull requests and {formatCompact(activityFlow.issuesOpened)} issues. That is {activityFlow.pullRequestIssueRatio.toFixed(2)} pull requests for every issue. The totals include human work and automation; they do not measure AI-generated code.
            </p>
          </header>

          <section className={styles.monthlyFlowPanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>The PR-to-Issue ratio rose from {activityFlow.monthly[0].ratio.toFixed(2)} to {activityFlow.monthly.at(-1)?.ratio.toFixed(2)}.</h4>
              </div>
              <p>January through August are complete calendar months. Bar height uses one shared scale; hover or focus a month to read exact counts.</p>
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
                      style={{ height: `${(item.pullRequests / monthlyFlowMaximum) * 100}%` }}
                    />
                  </div>
                  <strong>{item.label}</strong>
                  <span role="tooltip">
                    {item.issues.toLocaleString("en-US")} Issues · {item.pullRequests.toLocaleString("en-US")} PRs · {item.ratio.toFixed(2)}×
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.flowLegend}>
              <span data-flow="issue">Issues</span>
              <span data-flow="pull-request">Pull requests</span>
            </div>
          </section>

          <section className={styles.pressurePanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>PR intake doubled. The review queue did not keep up.</h4>
              </div>
              <p>
                This comparison follows the same {pressure.matchedRepositories} repositories
                in every year. Counts cover all public Issues and pull requests opened or
                closed from January through August—not a thread sample.
              </p>
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
                        <em style={{ width: `${(item.pullRequestsOpened / pressure2026.pullRequestsOpened) * 100}%` }} />
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
                    <dd>{formatSignedCompact(pressure2025.pullRequestBalance)} <i>→</i> {formatSignedCompact(pressure2026.pullRequestBalance)}</dd>
                  </div>
                  <div>
                    <dt>Still open after 90 days</dt>
                    <dd>{formatPercent(pressure2025.pullRequestUnresolved90dShare, 1)} <i>→</i> {formatPercent(pressure2026.pullRequestUnresolved90dShare, 1)}</dd>
                  </div>
                  <div>
                    <dt>Median merged within 90 days</dt>
                    <dd>{formatPercent(pressure2025.repositoryMedianPullRequestMerged90dShare, 1)} <i>→</i> {formatPercent(pressure2026.repositoryMedianPullRequestMerged90dShare, 1)}</dd>
                  </div>
                </dl>
                <p>
                  Issue intake changed little, and these repositories closed slightly
                  more Issues than they opened in 2026. The growing queue is concentrated in PRs.
                </p>
              </aside>
            </div>

            <div className={styles.pressureRoleSummary}>
              <header>
                <h5>The PR queue grew in 54 of 55 repositories.</h5>
                <p>Every technical group added more pull requests than it closed during January–August 2026.</p>
              </header>
              <div>
                {pressure.roleFlows.map((item) => (
                  <p key={item.key}>
                    <span>{item.label}</span>
                    <i><em style={{ width: `${(item.pullRequestBalance / pressureRoleMaximum) * 100}%` }} /></i>
                    <b>{formatSignedCompact(item.pullRequestBalance)}</b>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.efficiencyStudy} data-reveal>
            <header>
              <h3>Agent activity reached more PRs, while fewer finished within 30 days.</h3>
              <p>
                The full repository counts above show the growing queue. To see
                what happened inside it, we compared 2,750 threads from
                January–August 2025 with 2,750 from the same 55 repositories in
                2026. Each repository contributes 50 threads in each year.
              </p>
            </header>

            <div className={styles.efficiencyReport}>
              <div className={styles.reportTableWrap}>
                <table className={styles.efficiencyTable}>
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>2025</th>
                      <th>2026</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Threads where a named Agent or App appeared",
                        earlier: threadPanel2025.agentParticipationShare,
                        later: threadPanel2026.agentParticipationShare,
                      },
                      {
                        label: "A repository maintainer responded within 7 days",
                        earlier: threadPanel2025.maintainerResponseWithin7dShare,
                        later: threadPanel2026.maintainerResponseWithin7dShare,
                      },
                      {
                        label: "Pull requests resolved within 30 days",
                        earlier: threadPanel2025.pullRequestResolvedWithin30dShare,
                        later: threadPanel2026.pullRequestResolvedWithin30dShare,
                      },
                      {
                        label: "Pull requests with a visible review",
                        earlier: threadPanel2025.pullRequestReviewedShare,
                        later: threadPanel2026.pullRequestReviewedShare,
                      },
                    ].map((row) => (
                      <tr key={row.label}>
                        <th>{row.label}</th>
                        <td>{formatPercent(row.earlier, 1)}</td>
                        <td>{formatPercent(row.later, 1)}</td>
                        <td data-direction={row.later >= row.earlier ? "up" : "down"}>
                          {row.later >= row.earlier ? "+" : ""}
                          {((row.later - row.earlier) * 100).toFixed(1)} pp
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.reportNarrative}>
                <p>
                  Named Agents appeared in more than twice as many threads, and
                  review reached a larger share of PRs. At the same time,
                  first-week maintainer response fell from {formatPercent(threadPanel2025.maintainerResponseWithin7dShare, 1)} to {formatPercent(threadPanel2026.maintainerResponseWithin7dShare, 1)}, and 30-day PR completion fell from {formatPercent(threadPanel2025.pullRequestResolvedWithin30dShare, 1)} to {formatPercent(threadPanel2026.pullRequestResolvedWithin30dShare, 1)}. Agents helped more changes reach review; repositories still had to find the attention and authority to finish them.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.pushConcentration} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>More accounts entered the push path, while integration stayed concentrated.</h4>
              </div>
              <p>
                In the same 55 repositories, the median number of accounts with a
                PushEvent rose from {push2025.pushActors} to {push2026.pushActors}.
                Yet the median number producing half of all pushes stayed at
                {" "}{push2026.actorsForHalfOfPushes}. More people reached the integration
                path; most integration activity still sat with a small core.
              </p>
            </div>
            <div className={styles.pushBenchmarkGrid}>
              <header>
                <strong>2026 comparison</strong>
                <span>repository medians</span>
              </header>
              {pressure.pushBenchmarks.map((item) => (
                <article key={item.label}>
                  <div>
                    <strong>{item.label.replace(" benchmark", "")}</strong>
                    <span>{item.repositories} active repositories</span>
                  </div>
                  <p>
                    <i style={{ width: `${(item.pushActors / pushBenchmarkMaximum) * 100}%` }} />
                    <b>{item.pushActors}</b>
                    <span>accounts pushed</span>
                  </p>
                  <p>
                    <i style={{ width: `${(item.actorsForHalfOfPushes / 3) * 100}%` }} />
                    <b>{item.actorsForHalfOfPushes}</b>
                    <span>accounts made half the pushes</span>
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.releaseFlowPanel}>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>Some repositories publish GitHub Releases almost every day.</h4>
              </div>
              <p>From 1 January to 31 August 2026 ({activityFlow.releases.observationDays} days), {activityFlow.releases.repositoriesWithRelease}/100 repositories published a non-draft GitHub Release. Release days deduplicate those records by UTC date; frequent records often reflect automation. Prereleases are included, while tag-only and package-registry publication are outside this view.</p>
            </div>
            <div className={styles.releaseFlowGrid}>
              <div className={styles.releaseHistogram} aria-label="Repositories by number of release days">
                {activityFlow.releases.buckets.map((item) => (
                  <div key={item.label}>
                    <span><i style={{ width: `${(item.count / releaseBucketMaximum) * 100}%` }} /></span>
                    <strong>{item.label}</strong>
                    <b>{item.count}</b>
                  </div>
                ))}
              </div>
              <div className={styles.releaseLeaderTable}>
                <div className={styles.releaseLeadersHeader} aria-hidden="true">
                  <span>Repository</span>
                  <span>Release days</span>
                  <span>Release records</span>
                </div>
                <ol className={styles.releaseLeaders}>
                  {activityFlow.releases.leaders.map((item) => (
                    <li key={item.repo}>
                      <a href={`https://github.com/${item.repo}/releases`} target="_blank" rel="noreferrer">{item.repo}</a>
                      <span>{item.releaseDays} / {activityFlow.releases.observationDays} days</span>
                      <small>{item.releaseRecords.toLocaleString("en-US")} records</small>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02B</span>
          <strong>Contribution access and Agent setup</strong>
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
          <div className={styles.governanceExamples}>
            <article>
              <span>THE TWO RESTRICTED REPOSITORIES</span>
              <p>
                <a href="https://github.com/openai/codex" target="_blank" rel="noreferrer">Codex</a>
                {" and "}
                <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noreferrer">Claude Code</a>
                {" "}leave Pull Requests enabled, while GitHub only permits collaborators to create them.
              </p>
            </article>
            <article>
              <span>ALIGN BEFORE CODING</span>
              <p>
                <a href="https://github.com/mastra-ai/mastra/blob/75dd419e613fe9c39f846ffc500716141b74fda6/README.md" target="_blank" rel="noreferrer">Mastra</a>
                {" asks code contributors to open an Issue first. "}
                <a href="https://github.com/open-webui/open-webui/blob/d3e8bf3405e848cfba377814d0aa7ba7290e414d/.github/pull_request_template.md" target="_blank" rel="noreferrer">Open WebUI</a>
                {" applies the same gate to first-time contributors, except localization changes."}
              </p>
            </article>
            <article>
              <span>OUTSIDE THE TOP 100</span>
              <p>
                <a href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noreferrer">DeepSeek Harness</a>
                {" publishes its core under MIT, keeps core Issues and Pull Requests closed, and points outside development toward plugins."}
              </p>
            </article>
          </div>
          <details className={styles.governanceMethod}>
            <summary>How the contribution policy was classified</summary>
            <p>
              We read GitHub&apos;s <code>has_pull_requests</code> and <code>pull_request_creation_policy</code> first, then reviewed frozen copies of README, CONTRIBUTING, GOVERNANCE and Pull Request templates. Repositories enter “No restrictive signal detected” when this scan finds neither an explicit invitation nor a stated gate.
            </p>
          </details>
        </div>

        <div className={styles.caseGrid} data-reveal>
          <article className={styles.caseNarrative}>
            <EditableText as="h3" copyKey="caseTitle" />
            <EditableText as="blockquote" copyKey="caseQuote" />
            <EditableText as="p" copyKey="caseBody" />
            <div className={styles.caseSurfaceMap} aria-label="DeepSeek Harness contribution surfaces">
              <div data-surface="public">
                <span>Core code</span>
                <strong>Public</strong>
                <small>MIT licensed</small>
              </div>
              <div data-surface="closed">
                <span>Core contribution</span>
                <strong>Closed</strong>
                <small>Issues and PRs</small>
              </div>
              <div data-surface="open">
                <span>Extension ecosystem</span>
                <strong>Open</strong>
                <small>Discussions and plugins</small>
              </div>
            </div>
          </article>
          <aside className={styles.caseEvidence}>
            <a
              className={styles.caseRepoLink}
              href="https://github.com/deepseek-ai/deepseek-harness"
              target="_blank"
              rel="noreferrer"
            >
              <h3>DeepSeek Harness</h3>
              <ExternalLinkIcon aria-hidden="true" />
            </a>
            <p className={styles.caseLaunchDate}>Open-sourced 13 Aug 2026</p>
            <div className={styles.caseAttention}>
              <strong>204K+</strong>
              <span>GitHub stars in its first 17 days</span>
              <small>23.6K forks</small>
            </div>
            <p className={styles.caseClosedSurface}>
              with <strong>Issues</strong> and <strong>Pull Requests</strong> closed
            </p>
            <dl className={styles.caseFacts}>
              <CaseFact label="License" value="MIT" />
              <CaseFact label="Discussions" value="On" state="on" />
              <CaseFact label="Extension path" value="dsh-plugin" state="on" />
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

        <div className={styles.adoptionSequence} data-reveal id="agent-setup">
          <header>
            <EditableText as="h3" copyKey="collaborationAdoptionTitle" />
            <EditableText as="p" copyKey="collaborationAdoptionBody" />
          </header>
          <div className={styles.agentSetupSummary}>
            <article>
              <strong>{collaboration.codingAgentRepositories}/100</strong>
              <p>
                repositories publish a coding-agent instruction file or tool folder
                on the default branch. This setup is already common in every technical group.
              </p>
            </article>
            <div className={styles.agentRoleCoverage}>
              <h4>Repositories with coding-agent setup</h4>
              {markerNiches.map((item, index) => {
                const rate = Math.round((item.value / item.total) * 100);
                return (
                  <p key={item.label}>
                    <span>{item.label}</span>
                    <i>
                      <em
                        style={
                          {
                            "--marker-delay": `${index * 90}ms`,
                            "--marker-rate": `${rate}%`,
                          } as MarkerBarStyle
                        }
                      />
                    </i>
                    <b>{item.value}/{item.total}</b>
                  </p>
                );
              })}
            </div>
          </div>
          <details className={styles.agentFormatDetails}>
            <summary>Which instruction files and tool folders were found</summary>
            <div className={styles.agentCoverageChart}>
              {collaboration.agentMarkerCoverage.map((item, index) => (
                <p key={item.key}>
                  <span>{item.label}</span>
                  <i>
                    <em
                      style={
                        {
                          "--agent-coverage": `${item.count}%`,
                          "--agent-coverage-delay": `${index * 85}ms`,
                        } as AgentCoverageStyle
                      }
                    />
                  </i>
                  <strong>{item.count}</strong>
                </p>
              ))}
            </div>
          </details>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02C</span>
          <strong>Where Agents enter the public workflow</strong>
        </div>

        <SamplePoolHeader
          label="Thread sample"
          title="5,000 Issues and pull requests"
          body={`Between 1 January and 31 August 2026, we sampled 50 Issues or pull requests from each of the Top 100 repositories: ${(collaboration.sampleThreads - collaboration.samplePullRequests).toLocaleString("en-US")} Issues and ${collaboration.samplePullRequests.toLocaleString("en-US")} pull requests. The charts show what happened in these ${collaboration.sampleThreads.toLocaleString("en-US")} threads and their ${collaboration.publicEventsAnalyzed.toLocaleString("en-US")} linked public events. Each thread counts once.`}
        />

        <section className={styles.visibleAgentActivity} data-reveal id="agent-workflow">
          <header>
            <EditableText as="h3" copyKey="collaborationEntryTitle" />
            <EditableText as="p" copyKey="collaborationEntryBody" />
          </header>
          <div className={styles.agentHandoff}>
            <article>
              <span>Opened by a named Agent or App</span>
              <strong>{formatPercent(openedStage.agent / openedStage.denominator, 1)}</strong>
              <p>{openedStage.agent.toLocaleString("en-US")} of {openedStage.denominator.toLocaleString("en-US")} sampled Issues and PRs</p>
            </article>
            <article>
              <span>Received an Agent review</span>
              <strong>{formatPercent(reviewStage.agent / reviewStage.denominator, 1)}</strong>
              <p>{reviewStage.agent.toLocaleString("en-US")} of {reviewStage.denominator.toLocaleString("en-US")} sampled PRs</p>
            </article>
            <article>
              <span>Ended with a GitHub User action</span>
              <strong>{formatPercent(finalStateStage.user / finalStateStage.denominator, 1)}</strong>
              <p>{finalStateStage.user.toLocaleString("en-US")} of {finalStateStage.denominator.toLocaleString("en-US")} resolved threads</p>
            </article>
          </div>
          <div className={styles.agentWorkProfile}>
            <div>
              <h4>What named Agents did in public</h4>
              <p>Review dominates the visible record; triage and discussion follow.</p>
            </div>
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
          </div>
          <details className={styles.participationDefinitions}>
            <summary>What counts as a named Agent action</summary>
            <div>
              <section>
                <h4>GitHub names the Agent or App</h4>
                <p>Examples include a CodeRabbit review, a Gemini Code Assist comment or an OpenHands App action. Conventional CI, dependency and release bots are kept separate.</p>
              </section>
              <section>
                <h4>Local Agent use is not visible here</h4>
                <p>Work done with Cursor, Claude Code or Codex usually appears under the developer&apos;s normal GitHub User account unless the public record adds a separate attribution.</p>
              </section>
              <section>
                <h4>The final action is a public state change</h4>
                <p>It is the latest visible merge, close or reopen event. It shows which account completed the public workflow, not who made every earlier decision.</p>
              </section>
            </div>
          </details>
        </section>

        <div className={styles.iterationLoop} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationIterationTitle" />
            <EditableText as="p" copyKey="collaborationIterationBody" />
          </header>
          <div className={styles.reviewerFollowupComparison}>
            <header>
              <h4>66.8% after an Agent-first review, versus 41.1% after a User-first review.</h4>
              <p>
                Each reviewed PR is assigned to the account behind its first formal
                review, then followed through the next commit. The gap is 25.7 percentage points.
              </p>
            </header>
            <div>
              {reviewerFollowupComparison.map((item, index) => (
                <article key={item.id} data-reviewer={item.id}>
                  <span>{item.label}</span>
                  <i>
                    <em
                      style={
                        {
                          "--collaboration-delay": `${(index + 2) * 100}ms`,
                          "--collaboration-rate": `${item.value * 100}%`,
                        } as CollaborationBarStyle
                      }
                    />
                  </i>
                  <strong>{formatPercent(item.value, 1)}</strong>
                  <small>{item.followups} of {item.total} PRs received another commit</small>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.changeRequestComparison}>
            <header>
              <h4>An explicit request for changes is followed by another commit three quarters of the time.</h4>
              <p>
                Once the review state is CHANGES_REQUESTED, the Agent and User groups are nearly identical.
              </p>
            </header>
            <div>
              {changeRequestComparison.map((item) => (
                <article key={item.id} data-reviewer={item.id}>
                  <span>{item.label}</span>
                  <strong>{formatPercent(item.value, 1)}</strong>
                  <small>{item.followups} of {item.total} PRs received another commit</small>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.iterationSignals} aria-label="Review sample context">
            {iterationSignals.map((item) => (
              <div key={item.label}>
                <strong>{formatPercent(item.value, 1)}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="patch-lineage" className={styles.lineageStudy} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationLineageTitle" />
            <EditableText as="p" copyKey="collaborationLineageBody" />
          </header>

          <div className={styles.lineageOverview}>
            <div className={styles.lineageHeadline}>
              <strong>62.4%</strong>
              <span>of the first Agent-patch lines remained as exact text</span>
              <small>765 of 1,225 text lines · 9 traceable PRs</small>
            </div>
            <div className={styles.lineageStack} aria-label="Disposition of first Agent-patch lines">
              {patchLineageSegments.map((segment, index) => (
                <i
                  key={segment.id}
                  data-lineage={segment.id}
                  style={
                    {
                      "--lineage-width": `${segment.share}%`,
                      "--lineage-delay": `${index * 110}ms`,
                    } as LineageBarStyle
                  }
                  title={`${segment.label}: ${segment.lines} lines (${segment.share}%)`}
                />
              ))}
            </div>
            <dl className={styles.lineageLegend}>
              {patchLineageSegments.map((segment) => (
                <div key={segment.id} data-lineage={segment.id}>
                  <dt>{segment.share}%</dt>
                  <dd>{segment.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={styles.lineageCasebook}>
            <nav aria-label="Patch lineage cases">
              {patchLineageCases.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  data-active={item.id === lineageCaseId}
                  onClick={() => setLineageCaseId(item.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.repo}</strong>
                  <em>#{item.number}</em>
                </button>
              ))}
            </nav>
            <article key={activeLineageCase.id}>
              <header>
                <div>
                  <span>{activeLineageCase.path}</span>
                  <h4>{activeLineageCase.repo} #{activeLineageCase.number}</h4>
                </div>
                <a href={activeLineageCase.href} target="_blank" rel="noreferrer">
                  Open PR <ExternalLinkIcon aria-hidden="true" />
                </a>
              </header>
              {activeLineageCase.initial === null ? (
                <div className={styles.lineageUnresolved}>
                  <strong>Not line-traceable</strong>
                  <p>{activeLineageCase.note}</p>
                </div>
              ) : (
                <>
                  <div className={styles.caseLineageBar}>
                    {(
                      [
                        ["retained", activeLineageCase.retained],
                        ["human", activeLineageCase.human],
                        ["agent", activeLineageCase.agent],
                        ["unknown", activeLineageCase.unknown],
                      ] as const
                    ).map(([tone, value], index) =>
                      value ? (
                        <i
                          key={tone}
                          data-lineage={tone}
                          style={
                            {
                              "--lineage-width": `${(value / activeLineageCase.initial) * 100}%`,
                              "--lineage-delay": `${index * 100}ms`,
                            } as LineageBarStyle
                          }
                        />
                      ) : null,
                    )}
                  </div>
                  <div className={styles.caseLineageNumbers}>
                    <p><strong>{activeLineageCase.initial}</strong><span>First Agent-patch lines</span></p>
                    <p><strong>{activeLineageCase.retained}</strong><span>Exact text retained</span></p>
                    <p><strong>{activeLineageCase.human}</strong><span>Changed by human account</span></p>
                    <p><strong>{activeLineageCase.agent}</strong><span>Changed by later Agent</span></p>
                    <p><strong>{activeLineageCase.unknown}</strong><span>Author unresolved</span></p>
                  </div>
                  <p className={styles.caseLineageNote}>{activeLineageCase.note}</p>
                </>
              )}
            </article>
          </div>
        </div>

        <div className={styles.casebookIntro} data-reveal>
          <span>Seven public threads</span>
          <h3>The hand-off looks different in every repository.</h3>
          <p>These cases show who opened the work, where an Agent entered, who revised it and who closed the loop.</p>
        </div>

        <CollaborationCasebook />

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
              signals. Primary language comes from GitHub&apos;s repository-level
              label. The OpenRouter app ranking is public and opt-in. Agent Sandbox,
              Kata Containers and OpenTelemetry provide project-level evidence for
              concrete engineering work around Agent execution. Revenue, deployment
              scale and technical performance require separate sources.
            </p>
            <p>
              The Collaboration chapter freezes the tracked-pool Top 100 by
              July OpenRank, then treats OpenRank only as a sampling rule. Every
              2026 collaboration measure stops at 31 August; September collection
              and publication dates do not extend that window. The current
              entry-surface refresh uses GitHub REST and GraphQL. Annual
              marker snapshots inspect coding-agent instruction files and
              tool-specific folders on the default branch. The ClickHouse event panel is retained for
              historical scale and quality checks, but its 2025–2026 PR author
              and merge-time payload is incomplete and is not used for a claim
              about productivity.
            </p>
            <p>
              The public-thread analysis samples 50 Issues or pull requests from
              each of the Top 100 repositories between 1 January and 31 August
              2026. Every thread counts once. Actor labels follow the identity or
              App attribution GitHub exposes; undisclosed local Agent use remains
              under the developer&apos;s ordinary User account.
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

function ProfileDistribution({
  label,
  items,
  total,
}: {
  label: string;
  items: Array<{
    key: string;
    label: string;
    count: number;
    description?: string;
  }>;
  total: number;
}) {
  return (
    <section className={styles.profileDistribution}>
      <span>{label}</span>
      <div className={styles.profileDistributionBar}>
        {items.map((item, index) => (
          <i
            data-profile={item.key}
            key={item.key}
            style={
              {
                "--profile-delay": `${index * 90}ms`,
                "--profile-width": `${(item.count / total) * 100}%`,
              } as ProfileBarStyle
            }
          />
        ))}
      </div>
      <dl>
        {items.map((item) => (
          <div
            aria-label={item.description ? `${item.label}: ${item.description}` : undefined}
            className={item.description ? styles.profileDefinition : undefined}
            data-profile={item.key}
            key={item.key}
            tabIndex={item.description ? 0 : undefined}
          >
            <dt>{item.label}</dt>
            <dd>{item.count}</dd>
            {item.description ? (
              <span role="tooltip">{item.description}</span>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
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

function SamplePoolHeader({
  label,
  title,
  body,
  details,
}: {
  label: string;
  title: string;
  body: string;
  details?: ReactNode;
}) {
  return (
    <div className={styles.samplePoolHeader} data-reveal>
      <span>{label}</span>
      <strong>{title}</strong>
      <div>
        <p>{body}</p>
        {details ? (
          <details>
            <summary>Which repositories and why</summary>
            {details}
          </details>
        ) : null}
      </div>
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
