"use client";

import Image from "next/image";
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
import {
  CollaborationCasebook,
  CollaborationCommitAttribution,
  CollaborationEvolution,
} from "./collaboration-evidence";
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

type EfficiencyDotStyle = CSSProperties & {
  "--agent-position": string;
  "--comparison-position": string;
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
      "Identity does not carry user intent. Tool scope, resource scope, approval state, budget and expiry still need to travel with the task.",
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
      "A successful request does not show whether the agent made the right change. Useful evidence links model work, tool execution, sandbox events and the external result.",
    mapSignal:
      "4 agent observability projects; the category is stable, while tool and protocol layers are growing around it.",
    openInfra:
      "OpenTelemetry is widely deployed, but its GenAI agent and tool conventions are still marked Development.",
    openChallenge:
      "A trace still has to connect model work, tool execution and the external result. Critical evidence cannot depend only on the agent's own account.",
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
      "Calls may be serial, parallel or retried. The traffic is often bursty at task level, but public token totals do not reveal QPS, concurrency or fan-out.",
    mapSignal:
      "Tools, protocols and gateways are filling in around the application layer. Nine OpenRouter Top 20 apps align to the current landscape.",
    openInfra:
      "Agentgateway supports request and token limits, plus per-tool limits for MCP traffic.",
    openChallenge:
      "Budgets, fan-out caps, backpressure and cancellation need to cross gateway, model, tool and runtime boundaries. Local counters are not exact global limits.",
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
  const [efficiencyLens, setEfficiencyLens] = useState<"panel" | "threads">(
    "panel",
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
  const efficiency = collaboration.efficiencyExperiment;
  const activityFlow = collaboration.activityFlow;
  const monthlyFlowMaximum = Math.max(
    ...activityFlow.monthly.flatMap((item) => [item.issues, item.pullRequests]),
  );
  const historyFlowMaximum = Math.max(
    ...activityFlow.history.flatMap((item) => [item.issues, item.pullRequests]),
  );
  const fixedCohortPullRequestGrowth =
    ((activityFlow.history[2].pullRequests - activityFlow.history[1].pullRequests) /
      activityFlow.history[1].pullRequests) *
    100;
  const historyPullRequestGrowth = activityFlow.history.map((item, index) => {
    if (index === 0) return null;
    const previous = activityFlow.history[index - 1].pullRequests;
    return ((item.pullRequests - previous) / previous) * 100;
  });
  const releaseBucketMaximum = Math.max(
    ...activityFlow.releases.buckets.map((item) => item.count),
  );
  const activeProfileRepository =
    collaboration.repositoryProfile.repositoryItems.find(
      (item) => item.repo === profileRepository,
    ) ?? collaboration.repositoryProfile.repositoryItems[0];
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
          tracking does not guarantee selection for the map.
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

        <SamplePoolHeader
          label="Repository frame"
          title="100 repositories"
          body="The July 2026 OpenRank Top 100 inside the 277-project tracking pool. Repository profiles, contribution policies, Agent files, release activity and complete 2026 Issue/PR counts all use this frozen list. The historical chart keeps the 53 repositories that were already public by January 2024. A separate 12-project long-lived control set checks whether backlog pressure also appears outside Agentic AI."
        />

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

        <div className={styles.activityFlow} data-reveal id="collaboration-flow">
          <header>
            <h3>Pull requests are arriving faster than issues.</h3>
            <p>
              From 1 January to 29 August 2026, the Top 100 opened about {formatCompact(activityFlow.pullRequestsOpened)} pull requests and {formatCompact(activityFlow.issuesOpened)} issues. That is {activityFlow.pullRequestIssueRatio.toFixed(2)} pull requests for every issue. The totals include human work and automation; they do not measure AI-generated code.
            </p>
          </header>

          <div className={styles.activityFlowTotals}>
            <article data-flow="issue">
              <span>ISSUES OPENED</span>
              <strong>{formatCompact(activityFlow.issuesOpened)}</strong>
            </article>
            <article data-flow="pull-request">
              <span>PULL REQUESTS OPENED</span>
              <strong>{formatCompact(activityFlow.pullRequestsOpened)}</strong>
            </article>
            <aside className={styles.activityConcentration}>
              <div className={styles.activityConcentrationStats}>
                <section data-flow="issue">
                  <span>ISSUE TOP 5</span>
                  <strong>{formatPercent(activityFlow.issueTopFiveShare)}</strong>
                </section>
                <section data-flow="pull-request">
                  <span>PR TOP 5</span>
                  <strong>{formatPercent(activityFlow.pullRequestTopFiveShare)}</strong>
                </section>
              </div>
              <p>
                Share of 2026 intake produced by the five busiest repositories
                for each measure. Issue activity is more concentrated, so its
                Top 100 total is more sensitive to a few unusually active projects.
              </p>
            </aside>
          </div>

          <section className={styles.monthlyFlowPanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>The PR-to-Issue ratio rose from {activityFlow.monthly[0].ratio.toFixed(2)} to {activityFlow.monthly.at(-1)?.ratio.toFixed(2)}.</h4>
              </div>
              <p>August ends on the 29th. Bar height uses one shared scale; hover or focus a month to read exact counts.</p>
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

          <section className={styles.historyFlowPanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>The same repositories opened {Math.round(fixedCohortPullRequestGrowth)}% more PRs than last year.</h4>
              </div>
              <p>These 53 repositories were already public by 1 January 2024, and each year uses the same 1 January–29 August window. Their PR intake rose from {formatCompact(activityFlow.history[1].pullRequests)} in 2025 to {formatCompact(activityFlow.history[2].pullRequests)} in 2026, while Issue intake fell slightly from {formatCompact(activityFlow.history[1].issues)} to {formatCompact(activityFlow.history[2].issues)}.</p>
            </div>
            <div className={styles.historyFlowChart}>
              {activityFlow.history.map((item, index) => (
                <article
                  data-year={item.year}
                  key={item.year}
                  style={{ "--flow-delay": `${index * 130}ms` } as FlowRevealStyle}
                >
                  <strong>{item.year}</strong>
                  <div>
                    <span data-flow="issue" style={{ width: `${(item.issues / historyFlowMaximum) * 100}%` }}>
                      Issues {formatCompact(item.issues)}
                    </span>
                    <span data-flow="pull-request" style={{ width: `${(item.pullRequests / historyFlowMaximum) * 100}%` }}>
                      PRs {formatCompact(item.pullRequests)}
                    </span>
                  </div>
                  <em
                    aria-label={
                      historyPullRequestGrowth[index] === null
                        ? "Baseline year"
                        : `${Math.round(historyPullRequestGrowth[index]!)} percent more pull requests than in ${item.year - 1}`
                    }
                    className={styles.historyGrowth}
                    data-growth={historyPullRequestGrowth[index] === null ? "baseline" : "increase"}
                  >
                    {historyPullRequestGrowth[index] === null
                      ? "→ baseline"
                      : `↗ ${Math.round(historyPullRequestGrowth[index]!)}%`}
                  </em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.nicheFlowPanel}>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>Infrastructure projects receive three to four PRs per Issue.</h4>
              </div>
              <p>Unresolved means still open at the cutoff among items created inside this window. It excludes older backlog.</p>
            </div>
            <div className={styles.nicheFlowTable} role="table" aria-label="Issue and pull request intake by technical role">
              <div className={styles.nicheFlowHeader} role="row">
                <span role="columnheader">Repository group</span>
                <span role="columnheader">Issues</span>
                <span role="columnheader">PRs</span>
                <span role="columnheader">PR / Issue</span>
              </div>
              {activityFlow.niches.map((item) => (
                <div key={item.key} role="row">
                  <strong role="cell">{item.label}<small>{item.repositories} repositories</small></strong>
                  <span role="cell">{formatCompact(item.issues)}<small>{formatPercent(item.issueUnresolvedShare)} unresolved</small></span>
                  <span role="cell">{formatCompact(item.pullRequests)}<small>{formatPercent(item.pullRequestUnresolvedShare)} unresolved</small></span>
                  <b role="cell">{item.ratio.toFixed(2)}×</b>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.releaseFlowPanel}>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>Some repositories publish GitHub Releases almost every day.</h4>
              </div>
              <p>From 1 January to 29 August 2026 ({activityFlow.releases.observationDays} days), {activityFlow.releases.repositoriesWithRelease}/100 repositories published a non-draft GitHub Release. Release days deduplicate those records by UTC date; frequent records often reflect automation. Prereleases are included, while tag-only and package-registry publication are outside this view.</p>
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
              We read GitHub&apos;s <code>has_pull_requests</code> and <code>pull_request_creation_policy</code> first, then reviewed frozen copies of README, CONTRIBUTING, GOVERNANCE and Pull Request templates. “No restrictive signal detected” means that this scan found no gate; it does not mean the project explicitly invited a contribution.
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

        <div className={styles.subchapterMarker} data-reveal>
          <span>02A</span>
          <strong>How repositories prepare for coding agents</strong>
        </div>

        <div className={styles.adoptionSequence} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationAdoptionTitle" />
            <EditableText as="p" copyKey="collaborationAdoptionBody" />
          </header>
          <div className={styles.agentSetupPanel}>
            <div className={styles.agentSetupNumbers}>
              <article>
                <strong>{collaboration.codingAgentRepositories}%</strong>
                <span>keep coding-agent files or folders on the default branch</span>
              </article>
              <article>
                <strong>{collaboration.agentMarkerCoverage[0].count}%</strong>
                <span>include instructions that more than one coding agent can follow</span>
              </article>
              <article>
                <strong>{collaboration.agentMarkerCoverage[1].count}%</strong>
                <span>include files specifically written for Claude Code</span>
              </article>
              <article>
                <strong>{collaboration.agentMarkerCoverage[2].count}%</strong>
                <span>include files specifically written for Codex</span>
              </article>
            </div>
            <div className={styles.agentCoverageChart}>
              <h4>Repositories publishing each kind of coding-agent file</h4>
              <div>
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
                    <strong>{item.count}%</strong>
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.agentSetupLeaders}>
            <h4>Projects supporting the most agent-specific formats</h4>
            <ol>
              {collaboration.agentMarkerLeaders.map((item) => (
                <li key={item.repo}>
                  <a href={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer">
                    {item.repo}
                  </a>
                  <small>{item.labels.join(" · ")}</small>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ol>
          </div>

        </div>

        <div className={styles.markerSpread} data-reveal>
          <header>
            <h3>Coding-agent files now appear inside model infrastructure.</h3>
            <p>
              Explicit instruction files are most common in frameworks, but they
              already appear in 28 of 36 Model Infra repositories. Coding agents
              are therefore being given project-specific rules beside compilers,
              runtimes, data systems and model-serving code—not only inside apps.
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

        <div className={styles.subchapterMarker} data-reveal>
          <span>02B</span>
          <strong>Visible Agent activity in public threads</strong>
        </div>

        <SamplePoolHeader
          label="Thread sample"
          title="2,000 Issues and pull requests"
          body="We randomly sampled 20 threads from each repository between 1 January and 29 August 2026: 575 Issues and 1,425 pull requests. The charts in this group all use those same threads and the 50,731 public events attached to them. Results are weighted so that a thread from a busy repository does not count the same as one from a smaller repository."
        />

        <section className={styles.visibleAgentActivity} data-reveal>
          <header>
            <h3>Agents rarely open the conversation. Most visible Agent work happens later.</h3>
            <p>
              We found coding and review agents replying, reviewing or changing code in
              {" "}{collaboration.participationSampleThreads.toLocaleString("en-US")} of
              the {collaboration.sampleThreads.toLocaleString("en-US")} Issues and pull
              requests we reviewed. Only {collaboration.participationOpenerSampleThreads}
              {" "}were opened by an Agent account or App.
            </p>
          </header>
          <div className={styles.visibleAgentNumbers}>
            <article>
              <strong>
                {collaboration.participationSampleThreads.toLocaleString("en-US")}
                {" / "}
                {collaboration.sampleThreads.toLocaleString("en-US")}
              </strong>
              <span>Issues and PRs where a named Agent or App left a visible action</span>
            </article>
            <article>
              <strong>{collaboration.observedParticipationRepositories}/100</strong>
              <span>repositories where this happened at least once in the reviewed set</span>
            </article>
            <article>
              <strong>
                {collaboration.participationOpenerSampleThreads}
                {" / "}
                {collaboration.sampleThreads.toLocaleString("en-US")}
              </strong>
              <span>Issues and PRs opened by an Agent account or App</span>
            </article>
          </div>
          <div className={styles.visibleAgentPlainNote}>
            <p>
              <strong>What this looks like on GitHub:</strong> CodeRabbit reviewing a PR,
              Gemini Code Assist leaving review comments, or OpenHands acting through its
              GitHub App.
            </p>
            <p>
              After adjusting for different sampling rates in large and small repositories,
              visible Agent activity appears in {formatPercent(collaboration.participationThreadShare, 1)}
              {" "}of Issues and PRs; Agent-opened work accounts for{" "}
              {formatPercent(collaboration.participationOpenerShare, 1)}.
            </p>
          </div>
          <details className={styles.visibleAgentMethod}>
            <summary>How we counted visible Agent activity</summary>
            <p>
              We counted an action only when GitHub named a known coding or review Agent,
              exposed the GitHub App behind the action, or the contribution explicitly said
              it was Agent-generated. Ordinary User accounts stay unclassified unless one of
              those public clues is present. That means work done locally in Cursor, Claude
              Code or Codex is usually invisible here.
            </p>
          </details>
        </section>

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

        <SamplePoolHeader
          label="Code-lineage subset"
          title="10 merged pull requests"
          body="These are all merged PRs inside the 1,425 sampled PRs where a high-confidence coding-Agent identity changed the code. Nine can be followed line by line and form the 62.4% result below. Mooncake #2686 remains a case, but its two-parent merge commit prevents a clean line-level comparison. This is a small case study, not an ecosystem-wide rate."
        />

        <CollaborationCommitAttribution research={collaboration} />

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

        <SamplePoolHeader
          label="Matched repository panels"
          title="10 repositories selected for contrast"
          body="This is a deliberately varied set, not a random Top 10. It covers new and established projects, LLM-native and traditional software, and applications, frameworks, runtimes and model infrastructure. The lifecycle panel uses 900 threads across three stages. The fixed-window panel uses 840 threads across 2024–2026."
          details={(
            <ul>
              <li>openai/codex</li>
              <li>anthropics/claude-code</li>
              <li>langchain-ai/langchain</li>
              <li>langgenius/dify</li>
              <li>n8n-io/n8n</li>
              <li>langfuse/langfuse</li>
              <li>coder/coder</li>
              <li>milvus-io/milvus</li>
              <li>vllm-project/vllm</li>
              <li>pytorch/pytorch</li>
            </ul>
          )}
        />

        <CollaborationEvolution research={collaboration} />

        <section className={styles.efficiencyStudy} data-reveal>
          <header>
            <EditableText as="h3" copyKey="collaborationBurdenTitle" />
            <EditableText as="p" copyKey="collaborationBurdenBody" />
          </header>

          <div className={styles.efficiencyLens}>
            <div role="group" aria-label="Efficiency comparison">
              <button
                type="button"
                data-active={efficiencyLens === "panel"}
                onClick={() => setEfficiencyLens("panel")}
              >
                Same repositories · 2025 / 2026
              </button>
              <button
                type="button"
                data-active={efficiencyLens === "threads"}
                onClick={() => setEfficiencyLens("threads")}
              >
                Early Agent visible / none
              </button>
            </div>
            <p>
              {efficiencyLens === "panel"
                ? "600 sampled threads · 10 repositories · May–Aug 2025 / 2026"
                : "300 sampled threads · 2026 only · matched within repository and item type"}
            </p>
          </div>

          {efficiencyLens === "panel" ? (
            <div className={styles.efficiencyPanel}>
              <div className={styles.pressureRail}>
                <article data-signal="intake">
                  <h4>Incoming Issues and pull requests</h4>
                  <div>
                    <span><b>2025</b><strong>{formatCompact(efficiency.population.earlier)}</strong></span>
                    <i aria-hidden="true" />
                    <span><b>2026</b><strong>{formatCompact(efficiency.population.later)}</strong></span>
                  </div>
                  <p>{(efficiency.population.later / efficiency.population.earlier).toFixed(2)}× as many threads</p>
                </article>
                <article data-signal="agent">
                  <h4>Threads with a visible Agent</h4>
                  <div>
                    <span><b>2025</b><strong>{formatPercent(efficiency.adoption.allAgentsEarlier, 1)}</strong></span>
                    <i aria-hidden="true" />
                    <span><b>2026</b><strong>{formatPercent(efficiency.adoption.allAgentsLater, 1)}</strong></span>
                  </div>
                  <p>Coding and review agents: {formatPercent(efficiency.adoption.codingReviewEarlier, 1)} → {formatPercent(efficiency.adoption.codingReviewLater, 1)}</p>
                </article>
              </div>

              <div className={styles.efficiencySlopeGrid}>
                {efficiency.panel
                  .filter((item) => item.direction === "efficiency")
                  .map((item) => {
                    const maximum = Math.max(item.earlier, item.later, 0.01);
                    const earlierY = 38 - (item.earlier / maximum) * 27;
                    const laterY = 38 - (item.later / maximum) * 27;
                    return (
                      <article key={item.key}>
                        <h4>{item.label}</h4>
                        <div>
                          <strong>{formatExperimentValue(item.earlier, item.format)}</strong>
                          <svg viewBox="0 0 120 48" aria-hidden="true">
                            <line x1="14" y1={earlierY} x2="106" y2={laterY} />
                            <circle cx="14" cy={earlierY} r="5" />
                            <circle cx="106" cy={laterY} r="5" />
                          </svg>
                          <strong>{formatExperimentValue(item.later, item.format)}</strong>
                        </div>
                        <p><span>2025</span><span>2026</span></p>
                      </article>
                    );
                  })}
              </div>

              <div className={styles.attentionEquation}>
                <article>
                  <strong>{formatExperimentValue(efficiency.panel.find((item) => item.key === "maintainer_actions_30d")?.earlier ?? 0, "count")}</strong>
                  <span>maintainer actions per thread</span>
                  <b>2025</b>
                </article>
                <i aria-hidden="true" />
                <article>
                  <strong>{formatExperimentValue(efficiency.panel.find((item) => item.key === "maintainer_actions_30d")?.later ?? 0, "count")}</strong>
                  <span>maintainer actions per thread</span>
                  <b>2026</b>
                </article>
                <div>
                  <strong>{formatCompact(efficiency.maintainerActionEstimate.earlier)} → {formatCompact(efficiency.maintainerActionEstimate.later)}</strong>
                  <p>estimated visible maintainer actions across the full 30-day-eligible intake</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.exposurePanel}>
              <div className={styles.exposureLegend}>
                <span data-series="agent">Coding or review Agent visible in first 24h</span>
                <span data-series="comparison">No visible Agent in first 24h</span>
              </div>
              <div className={styles.exposureRows}>
                {efficiency.exposure.map((item) => {
                  const maximum = Math.max(item.agentVisible, item.noVisibleAgent, 0.01) * 1.08;
                  return (
                    <article key={item.key}>
                      <h4>{item.label}</h4>
                      <div
                        className={styles.exposureTrack}
                        style={
                          {
                            "--agent-position": `${(item.agentVisible / maximum) * 100}%`,
                            "--comparison-position": `${(item.noVisibleAgent / maximum) * 100}%`,
                          } as EfficiencyDotStyle
                        }
                      >
                        <i data-series="agent" />
                        <i data-series="comparison" />
                      </div>
                      <p>
                        <strong data-series="agent">{formatExperimentValue(item.agentVisible, item.format)}</strong>
                        <strong data-series="comparison">{formatExperimentValue(item.noVisibleAgent, item.format)}</strong>
                      </p>
                    </article>
                  );
                })}
              </div>
              <p className={styles.exposureReadout}>
                The merge rate barely moves. Conversation, maintainer review and
                post-review commits all increase when a coding or review Agent is
                visible early. Harder threads may also be more likely to attract an Agent.
              </p>
            </div>
          )}

          <div className={styles.efficiencyConclusion}>
            <strong>More work moved through the repositories. The human gate did not get faster.</strong>
            <p>
              Agent activity expanded feedback and revision capacity. Timely human
              response, Issue closure and PR merge did not improve in this panel.
            </p>
          </div>

          <details className={styles.efficiencyMethod}>
            <summary>How this comparison was built</summary>
            <p>
              We sampled the same ten repositories in the same 1 May–28 August
              window in 2024, 2025 and 2026. The full three-year panel contains
              {" "}{efficiency.sampleThreads} threads: {efficiency.eligibleSevenDayThreads}
              {" "}have a complete seven-day response window and {efficiency.eligibleThirtyDayThreads}
              {" "}have a complete 30-day outcome window. The tab above states the smaller
              subset used by each visible comparison. All timeline endpoints were complete.
              Visible Agent use is observational, not randomly assigned.
            </p>
          </details>
        </section>

        <SamplePoolHeader
          label="Illustrative cases"
          title="7 public collaboration traces"
          body="Four cases come from the 2,000-thread sample and three come from the ten-repository panels. We chose them because the public sequence is easy to follow and each shows a different coordination pattern. They explain how collaboration can unfold; they do not estimate how often each pattern occurs."
        />

        <CollaborationCasebook />

        <div className={styles.studyFrame} data-reveal>
          <header>
            <EditableText as="h3" copyKey="studyTitle" />
            <EditableText as="p" copyKey="studyNote" />
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
              and opt-in. Agent Sandbox, Kata Containers and OpenTelemetry are
              used as project evidence, not as measures of ecosystem-wide Agent
              adoption. None of these sources establishes revenue or technical
              superiority.
            </p>
            <p>
              The Collaboration chapter freezes the tracked-pool Top 100 by
              July OpenRank, then treats OpenRank only as a sampling rule. The
              current entry-surface refresh uses GitHub REST and GraphQL. Annual
              marker snapshots inspect coding-agent instruction files and
              tool-specific folders on the default branch. The ClickHouse event panel is retained for
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

function formatCompact(value: number) {
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatExperimentValue(
  value: number,
  format: "percent" | "count",
) {
  return format === "percent" ? formatPercent(value, 1) : value.toFixed(2);
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
