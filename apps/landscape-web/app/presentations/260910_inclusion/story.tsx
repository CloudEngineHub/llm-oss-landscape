"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
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
import type {
  ReportCopy,
  ReportCopyKey,
  ReportLocale,
} from "@/lib/inclusion-report-copy";
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
  locale,
  references,
  stats,
  projects,
}: {
  initialCopy: ReportCopy;
  locale: ReportLocale;
  references: ReportReferenceGroup[];
  stats: InclusionResearchStats;
  projects: StoryProject[];
}) {
  const isChinese = locale === "zh-CN";
  const t = (english: string, chinese: string) =>
    isChinese ? chinese : english;
  const numberLocale = isChinese ? "zh-CN" : "en-US";
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
    <main className={styles.page} lang={locale} ref={pageRef}>
      <ReportCopyEditor initialCopy={initialCopy} locale={locale}>
      <nav className={styles.nav} aria-label={locale === "zh-CN" ? "报告导航" : "Report navigation"}>
        <Link className={styles.brand} href="/">
          <LandscapeLogo className={styles.brandMark} />
          <span>Agentic AI Landscape</span>
        </Link>
        <div className={styles.navActions} aria-label={locale === "zh-CN" ? "切换报告语言" : "Switch report language"}>
          <Link
            aria-current={locale === "en" ? "page" : undefined}
            className={`${styles.downloadLink} ${styles.downloadEnglish}`}
            data-active={locale === "en"}
            href="/presentations/260910_inclusion"
            lang="en"
          >
            <span>English</span>
          </Link>
          <Link
            aria-current={locale === "zh-CN" ? "page" : undefined}
            className={`${styles.downloadLink} ${styles.downloadChinese}`}
            data-active={locale === "zh-CN"}
            href="/presentations/260910_inclusion/zh-CN"
            lang="zh-CN"
          >
            <span>中文</span>
          </Link>
          <Link className={styles.navBack} href="/">
            <ArrowLeftIcon aria-hidden="true" />
            <span>{locale === "zh-CN" ? "全景图" : "Landscape"}</span>
          </Link>
        </div>
      </nav>

      <aside className={styles.reportToc} aria-label={t("Report structure", "报告结构")} tabIndex={0}>
        <span className={styles.reportTocLabel}>{t("Report structure", "报告结构")}</span>
        <div className={styles.reportTocLinks}>
          <a href="#landscape"><span>01</span> {t("Landscape", "全景图")}</a>
          <a href="#infrastructure"><span>01A</span> {t("Open infrastructure", "开放基础设施")}</a>
          <a href="#collaboration"><span>02</span> {t("Collaboration", "开源协作")}</a>
          <a href="#collaboration-flow"><span>02A</span> {t("Workload", "工作量")}</a>
          <a href="#agent-setup"><span>02B</span> {t("Agent setup", "Agent 设置")}</a>
          <a href="#agent-workflow"><span>02C</span> {t("Public workflow", "公开流程")}</a>
          <a href="#method"><span>03</span> {t("Method", "方法")}</a>
          <a href="#references"><span>04</span> {t("Sources", "来源")}</a>
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
          <span>{t("SLIDES", "演讲")}</span>
          <strong>{t("Open Infrastructure", "开放基础设施")}</strong>
        </Link>
        <Link
          className={`${styles.playLink} ${styles.playCollaboration}`}
          href="/presentations/260910_inclusion/present"
        >
          <PlayIcon aria-hidden="true" />
          <span>{t("SLIDES", "演讲")}</span>
          <strong>{t("Collaboration", "开源协作")}</strong>
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
        <h2>{t("What this report finds", "这份报告发现了什么")}</h2>
        <div>
          <article>
            <h3>{t("Runtime work is catching up with the applications people already use.", "Runtime 正在追赶已经形成的应用需求。")}</h3>
            <p>
              {t(
                "Applications hold 55% of Agent Infra's July OpenRank. Runtime accounts for 13 of the 23 Agent Infra selections absent from the May tracking pool, filling in around context, interoperability, tool control and execution.",
                "Application 占 Agent Infra 7 月 OpenRank 的 55%；相较 5 月 tracking pool 新纳入的 23 个 Agent Infra 项目中，13 个属于 Runtime。新增项目正在补齐上下文、互操作、工具控制和执行环境。",
              )}
            </p>
          </article>
          <article>
            <h3>{t("PR intake doubled. Completion did not keep pace.", "PR 流入翻倍，完成速度没有跟上。")}</h3>
            <p>
              {t(
                "Across the same 55 repositories, PR intake rose from 129,563 in 2025 to 265,447 in 2026. The share still open after 90 days doubled to 11.3%, while the repository-median merge rate fell to 68.4%.",
                "同一组 55 个仓库中，PR 流入从 2025 年的 129,563 条增加到 2026 年的 265,447 条。90 天后仍保持 open 的比例翻倍至 11.3%，仓库中位合入率则降至 68.4%。",
              )}
            </p>
          </article>
          <article>
            <h3>{t("Agents expanded review and revision, not the final decision path.", "Agent 扩大了评审与修改能力，却没有接过最终决定。")}</h3>
            <p>
              {isChinese
                ? `5,000 条抽样 Issue / PR 中，只有 ${collaboration.participationOpenerSampleThreads.toLocaleString(numberLocale)} 条由具名 Agent 或 App 发起；${reviewStage.agent.toLocaleString(numberLocale)} 条 PR 收到了 Agent review。最终可见状态变化中，${formatPercent(finalStateStage.user / finalStateStage.denominator, 1)} 仍由 GitHub User 账号完成。`
                : `Only ${collaboration.participationOpenerSampleThreads.toLocaleString(numberLocale)} of ${collaboration.sampleThreads.toLocaleString(numberLocale)} sampled Issues and pull requests were opened by a named Agent or App, while ${reviewStage.agent.toLocaleString(numberLocale)} PRs received an Agent review. A GitHub User account performed ${formatPercent(finalStateStage.user / finalStateStage.denominator, 1)} of final visible state changes.`}
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
          <span>{t("WHAT INFRASTRUCTURE HAS TO HANDLE", "基础设施必须处理什么")}</span>
          <EditableText as="h2" copyKey="executionGateTitle" />
          <EditableText as="p" copyKey="executionGateBody" />
        </article>
        <article>
          <span>{t("WHAT CHANGES IN SOFTWARE DEVELOPMENT", "软件开发中的协作发生了什么变化")}</span>
          <EditableText as="h2" copyKey="mergeGateTitle" />
          <EditableText as="p" copyKey="mergeGateBody" />
        </article>
      </section>

      <section
        className={styles.metricSection}
        aria-labelledby="landscape-snapshot-title"
      >
        <header className={styles.metricIntro}>
          <span id="landscape-snapshot-title">{t("LANDSCAPE SNAPSHOT", "全景图范围")}</span>
          <p>
            {t(
              "These four numbers define the project universe used in the next section: the preserved May baseline, the current project pool, the two landscape selections and the projects added since that baseline.",
              "这四个数字定义了下一部分的项目范围：保留的 5 月基线、当前项目池、两张全景图的入选项目，以及基线之后新纳入的项目。",
            )}
          </p>
        </header>
        <div className={styles.metricBand} data-reveal>
          <Metric
            value={stats.mayTracked}
            label={t("Repositories in the preserved May 2026 baseline", "2026 年 5 月基线中的仓库")}
          />
          <Metric
            value={stats.currentTracked}
            label={t("Repositories in the current canonical project pool", "当前 canonical project pool 中的仓库")}
          />
          <Metric
            value={stats.total}
            label={t("Projects shown across Agent Infra and Model Infra", "Agent Infra 与 Model Infra 的入选项目")}
          />
          <Metric
            value={stats.selectedOutsideMay}
            label={t("Current map selections absent from the May baseline", "5 月基线之外的新入选项目")}
          />
        </div>
      </section>

      <section
        className={`${styles.chapter} ${styles.landscapeChapter}`}
        id="landscape"
      >
        <SectionTag index="01">{t("Landscape & open infrastructure", "全景图与开放基础设施")}</SectionTag>
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
          <strong>{t("The current maps", "当前全景图")}</strong>
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
            <p>{t("Switch views · projects ordered by July 2026 OpenRank", "切换视图 · 项目按 2026 年 7 月 OpenRank 排序")}</p>
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
              <span>{t("Created in 2025 or later", "创建于 2025 年或之后")}</span>
            </div>
            <div>
              <strong>{leaderOpenrankShare}%</strong>
              <span>{t("July OpenRank held by the five projects listed here", "下列五个项目占 7 月 OpenRank 的比例")}</span>
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
          <strong>{t("Signals in the map", "全景图中的信号")}</strong>
        </div>

        <EditableText
          as="h2"
          className={styles.landscapeFindingTitle}
          copyKey="landscapeTitle"
        />

        <p className={styles.chapterLede}>
          {isChinese
            ? `从 5 月以来，持续的生态复核把 tracking pool 从 ${stats.mayTracked} 个仓库扩展到 ${stats.currentTracked} 个。Application 仍然吸引最多可见活跃度；Runtime 的入选项目数已经接近 Application，并占 5 月池之外 ${stats.agentOutsideMay} 个 Agent Infra 项目中的 ${stats.runtimeOutsideMay} 个。项目先通过活跃度发现和编辑复核进入项目池，再经过第二轮判断决定是否进入发布版全景图。`
            : `Since May, ongoing ecosystem review has expanded the tracked pool from ${stats.mayTracked} to ${stats.currentTracked} repositories. Applications still attract most of the visible activity. Runtime now holds almost the same number of selected projects, and it accounts for ${stats.runtimeOutsideMay} of the ${stats.agentOutsideMay} Agent Infra projects that were not in the May tracking pool. Projects enter the pool through activity-based discovery and editorial review; a second editorial pass decides which tracked projects belong on the map.`}
        </p>

        <div className={styles.macroEvidence} data-reveal>
          <MacroComparison
            titleKey="agentChartTitle"
            groups={stats.agentMacro}
            accent="agent"
            locale={locale}
          />
          <MacroComparison
            titleKey="modelChartTitle"
            groups={stats.modelMacro}
            accent="model"
            locale={locale}
          />
        </div>

        <div className={styles.growthPanel} data-reveal>
          <div className={styles.growthSummary}>
            <strong>{t("APR→JUL", "4 月→7 月")}</strong>
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
            <span>{t("CREATED IN 2025 OR LATER", "创建于 2025 年或之后")}</span>
            <strong>{Math.round((stats.agentRecent / stats.agent) * 100)}%</strong>
            <p>Agent Infra · {stats.agentRecent} / {stats.agent} {t("projects", "个项目")}</p>
          </div>
          <div>
            <span>{t("CREATED IN 2025 OR LATER", "创建于 2025 年或之后")}</span>
            <strong>{Math.round((stats.modelRecent / stats.model) * 100)}%</strong>
            <p>Model Infra · {stats.modelRecent} / {stats.model} {t("projects", "个项目")}</p>
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
            locale={locale}
            modelTotal={stats.model}
          />
        </article>

        <div className={styles.runtimePath} data-reveal>
          <header>
            <EditableText as="h3" copyKey="runtimePathTitle" />
            <EditableText as="p" copyKey="runtimePathBody" />
          </header>
          <RuntimePath points={stats.runtimePath} locale={locale} />
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
                  <span>{t("OPENROUTER · GLOBAL TOP 20", "OPENROUTER · 全球 TOP 20")}</span>
                  <strong>9 / 20</strong>
                </div>
                <p>
                  {t("Nine public apps in the current Top 20 map directly to projects in Agent Infra.", "当前 Top 20 中有 9 个公开应用可直接对应到 Agent Infra 项目。")}
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
                  <span>{t("ZENMUX · JUNE 2026 MODEL TRAFFIC", "ZENMUX · 2026 年 6 月模型流量")}</span>
                  <strong>3 / 4</strong>
                </div>
                <p>
                  {t("Three of the four most-used model endpoints in the frozen June snapshot linked to public weights.", "6 月冻结快照中，使用量前四的模型端点有三个可以链接到公开权重。")}
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
                    <small>{model.openWeight ? t("PUBLIC WEIGHTS", "公开权重") : t("CLOSED", "闭源")}</small>
                  </div>
                ))}
              </div>
              <a
                href="https://zenmux.ai/docs/api/platform/statistics-app-leaderboard.html"
                target="_blank"
                rel="noreferrer"
              >
                {t("Explore ZenMux app and model analytics", "查看 ZenMux 应用与模型统计")}
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </section>
          </div>
        </aside>

        <div className={styles.infrastructureSubchapter} id="infrastructure">
          <SectionTag index="01C">{t("Open infrastructure", "开放基础设施")}</SectionTag>
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
                  <span>{isChinese ? translateInfrastructureText(lane.role) : lane.role}</span>
                  <p>{isChinese ? translateInfrastructureText(lane.summary) : lane.summary}</p>
                  <div>
                    {lane.projects.map((project) => (
                      <a
                        href={project.href}
                        key={project.name}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <b>{project.name}</b>
                        <small>{isChinese ? translateInfrastructureText(project.note) : project.note}</small>
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
              aria-label={t("Infrastructure assumptions", "基础设施假设")}
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
                  {isChinese ? translateShiftLabel(shift.label) : shift.label}
                </button>
              ))}
            </div>
            <div className={styles.shiftCompare}>
              <article>
                <span>{t("A common infrastructure assumption", "常见的基础设施假设")}</span>
                <h3>{isChinese ? translateShiftText(activeShift.before) : activeShift.before}</h3>
              </article>
              <article>
                <span>{t("What the agent changes", "Agent 改变了什么")}</span>
                <h3>{isChinese ? translateShiftText(activeShift.after) : activeShift.after}</h3>
                <p>{isChinese ? translateShiftText(activeShift.detail) : activeShift.detail}</p>
              </article>
            </div>
            <div className={styles.shiftEvidence}>
              <article>
                <span>{t("Signal in the current landscape", "当前全景图中的信号")}</span>
                <p>{isChinese ? translateShiftText(activeShift.mapSignal) : activeShift.mapSignal}</p>
              </article>
              <article>
                <span>{t("What established open infrastructure contributes", "成熟开放基础设施能够提供什么")}</span>
                <p>{isChinese ? translateShiftText(activeShift.openInfra) : activeShift.openInfra}</p>
                <a href={activeShift.href} target="_blank" rel="noreferrer">
                  {t("Inspect the primary source", "查看一手来源")}
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              </article>
              <article>
                <span>{t("What remains unresolved", "仍未解决的问题")}</span>
                <p>{isChinese ? translateShiftText(activeShift.openChallenge) : activeShift.openChallenge}</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.chapter} id="collaboration">
        <SectionTag index="02">{t("Open-source collaboration", "开源协作")}</SectionTag>
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
            <h3>{t("One Top 100, read at two levels.", "同一组 Top 100，两层证据。")}</h3>
            <p>
              {t(
                "Every result begins with the same 100 repositories. Complete records show how much work arrived and what happened to it. Fifty public threads per repository show the sequence of response and review. Historical charts keep the same 55 repositories; their 2026 threads are reused from the main sample.",
                "所有结果都从同一组 100 个仓库出发。仓库全量记录回答多少工作进入、最后发生了什么；每仓库 50 条公开线程用于还原响应与评审的顺序。历史图表固定使用同一组 55 个仓库，2026 年线程直接复用主样本。",
              )}
            </p>
          </div>
          <div className={styles.evidenceLayers}>
            <article>
              <header>
                <span>{t("Complete repository record", "仓库全量记录")}</span>
                <strong>Top 100</strong>
              </header>
              <p>
                {t("All public Issues and pull requests in the fixed windows, plus repository profile, contribution policy, Agent files and releases. This is where workload, backlog and outcome figures come from.", "包括固定窗口内全部公开 Issue / PR，以及仓库画像、贡献政策、Agent 文件和 Release。工作量、积压和结果数据都来自这一层。")}
              </p>
              <div>
                <span>{t("Historical comparison", "历史对比")}</span>
                <b>{t("Same", "固定同一组")} {pressure.matchedRepositories} {t("repositories", "个仓库")}</b>
                <p>
                  {t("A subset of the Top 100 with comparable activity in 2024, 2025 and 2026. The membership stays fixed across the three years.", "从 Top 100 中选出在 2024、2025 和 2026 年都有可比活动的仓库，三年始终使用同一份名单。")}
                </p>
              </div>
            </article>
            <article>
              <header>
                <span>{t("Public thread timelines", "公开线程时间线")}</span>
                <strong>{collaboration.sampleThreads.toLocaleString(numberLocale)} {t("in 2026", "条（2026 年）")}</strong>
              </header>
              <p>
                {isChinese ? `每个仓库抽取 50 条 Issue / PR，并串联 ${collaboration.publicEventsAnalyzed.toLocaleString(numberLocale)} 条公开事件，用于按顺序分析响应、评审和修改。` : `Fifty Issues or pull requests from each repository, including ${collaboration.publicEventsAnalyzed.toLocaleString(numberLocale)} linked public events. This is where response, review and revision are read in sequence.`}
              </p>
              <div>
                <span>{t("Historical comparison", "历史对比")}</span>
                <b>{t("5,500 matched threads", "5,500 条同口径线程")}</b>
                <p>
                  {t("Fifty threads from each of the same 55 repositories in 2025 and 2026 create a like-for-like view of response, review and completion.", "从同一组 55 个仓库中，每仓库、每年抽取 50 条线程，对比响应、评审和完成情况。")}
                </p>
              </div>
            </article>
          </div>
          <aside className={styles.evidenceDrilldown}>
            <strong>{t("Closer look inside the 2026 thread sample", "继续下钻 2026 年线程样本")}</strong>
            <p>
              {t("We followed the ten merged pull requests in which a named coding Agent changed code. Nine expose a clean line history, letting us see what remained and who revised it before merge.", "我们进一步跟踪了 10 条由具名 Coding Agent 修改代码并最终合入的 PR。其中 9 条具有清晰的行级历史，可以观察哪些内容被保留，以及合入前由谁继续修改。")}
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
                  aria-label={t("100 repositories grouped by technical role", "按技术角色分组的 100 个仓库")}
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
                      {isChinese ? translateDataLabel(activeProfileRepository.technicalRoleLabel) : activeProfileRepository.technicalRoleLabel}
                      {" · "}
                      {isChinese ? translateDataLabel(activeProfileRepository.identityLabel) : activeProfileRepository.identityLabel}
                    </span>
                    <small>
                      {t("July OpenRank", "7 月 OpenRank")} {activeProfileRepository.openrank.toFixed(1)}
                      {" · "}
                      {activeProfileRepository.stars.toLocaleString(numberLocale)} {t("Stars", "Stars")}
                      {" ↗"}
                    </small>
                  </a>
                ) : null}
              </div>
              <dl className={styles.repositoryTileLegend}>
                {collaboration.repositoryProfile.technicalRoles.map((group) => (
                  <div data-profile={group.key} key={group.key}>
                    <dt>{isChinese ? translateDataLabel(group.label) : group.label}</dt>
                    <dd>{group.count}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <div className={styles.repositoryProfileDimensions}>
              <ProfileDistribution
                label={t("Project identity · manual review", "项目属性 · 人工复核")}
                items={collaboration.repositoryProfile.identities}
                locale={locale}
                total={collaboration.repositoryProfile.repositories}
              />
              <ProfileDistribution
                label={t("Repository creation", "仓库创建时间")}
                items={collaboration.repositoryProfile.ageCohorts}
                locale={locale}
                total={collaboration.repositoryProfile.repositories}
              />
              <ProfileDistribution
                label={t("GitHub primary language", "GitHub 主要语言")}
                items={collaboration.repositoryProfile.languages}
                locale={locale}
                total={collaboration.repositoryProfile.repositories}
              />
            </div>
          </div>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02A</span>
          <strong>{t("More code for repositories to absorb", "仓库需要吸收更多代码")}</strong>
        </div>

        <div className={styles.activityFlow} data-reveal id="collaboration-flow">
          <header>
            <h3>{t("Pull requests are arriving faster than issues.", "PR 正在比 Issue 增长得更快。")}</h3>
            <p>
              {isChinese ? `2026 年 1 月 1 日至 8 月 31 日，Top 100 共开启约 ${formatCompact(activityFlow.pullRequestsOpened)} 条 PR 和 ${formatCompact(activityFlow.issuesOpened)} 条 Issue，平均每条 Issue 对应 ${activityFlow.pullRequestIssueRatio.toFixed(2)} 条 PR。总量同时包含真人工作与自动化，不能据此推断 AI 生成代码的比例。` : `From 1 January to 31 August 2026, the Top 100 opened about ${formatCompact(activityFlow.pullRequestsOpened)} pull requests and ${formatCompact(activityFlow.issuesOpened)} issues. That is ${activityFlow.pullRequestIssueRatio.toFixed(2)} pull requests for every issue. The totals include human work and automation; they do not measure AI-generated code.`}
            </p>
          </header>

          <section className={styles.monthlyFlowPanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>{t("The PR-to-Issue ratio rose from", "PR / Issue 比例从")} {activityFlow.monthly[0].ratio.toFixed(2)} {t("to", "升至")} {activityFlow.monthly.at(-1)?.ratio.toFixed(2)}。</h4>
              </div>
              <p>{t("January through August are complete calendar months. Bar height uses one shared scale; hover or focus a month to read exact counts.", "1 月至 8 月均为完整自然月。柱高使用同一比例尺；悬停或聚焦月份可查看准确数量。")}</p>
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
                  <strong>{isChinese ? translateMonth(item.label) : item.label}</strong>
                  <span role="tooltip">
                    {item.issues.toLocaleString(numberLocale)} Issues · {item.pullRequests.toLocaleString(numberLocale)} PRs · {item.ratio.toFixed(2)}×
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.flowLegend}>
              <span data-flow="issue">Issues</span>
              <span data-flow="pull-request">{t("Pull requests", "PR")}</span>
            </div>
          </section>

          <section className={styles.pressurePanel} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>{t("PR intake doubled. The review queue did not keep up.", "PR 流入翻倍，评审队列没有跟上。")}</h4>
              </div>
              <p>
                {isChinese ? `这组对比每年都使用同一组 ${pressure.matchedRepositories} 个仓库，统计 1–8 月所有公开 Issue / PR 的新开与关闭数量，不是线程抽样。` : `This comparison follows the same ${pressure.matchedRepositories} repositories in every year. Counts cover all public Issues and pull requests opened or closed from January through August—not a thread sample.`}
              </p>
            </div>

            <div className={styles.pressureStory}>
              <section>
                <header>
                  <div>
                    <span>{t("Pull requests opened · same 55 repositories", "新开 PR · 同一组 55 个仓库")}</span>
                    <h5>{t("Incoming code doubled in one year.", "进入仓库的代码在一年内翻倍。")}</h5>
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
                <h5>{t("More of that code waited.", "更多代码留在了等待队列中。")}</h5>
                <dl>
                  <div>
                    <dt>{t("PR queue added", "PR 队列净增加")}</dt>
                    <dd>{formatSignedCompact(pressure2025.pullRequestBalance)} <i>→</i> {formatSignedCompact(pressure2026.pullRequestBalance)}</dd>
                  </div>
                  <div>
                    <dt>{t("Still open after 90 days", "90 天后仍为 open")}</dt>
                    <dd>{formatPercent(pressure2025.pullRequestUnresolved90dShare, 1)} <i>→</i> {formatPercent(pressure2026.pullRequestUnresolved90dShare, 1)}</dd>
                  </div>
                  <div>
                    <dt>{t("Median merged within 90 days", "90 天内合入率中位数")}</dt>
                    <dd>{formatPercent(pressure2025.repositoryMedianPullRequestMerged90dShare, 1)} <i>→</i> {formatPercent(pressure2026.repositoryMedianPullRequestMerged90dShare, 1)}</dd>
                  </div>
                </dl>
                <p>
                  {t("Issue intake changed little, and these repositories closed slightly more Issues than they opened in 2026. The growing queue is concentrated in PRs.", "Issue 流入变化不大，而且这些仓库在 2026 年关闭的 Issue 略多于新开的数量。增长的队列主要集中在 PR。")}
                </p>
              </aside>
            </div>

            <div className={styles.pressureRoleSummary}>
              <header>
                <h5>{t("The PR queue grew in 54 of 55 repositories.", "55 个仓库中有 54 个的 PR 队列继续增长。")}</h5>
                <p>{t("Every technical group added more pull requests than it closed during January–August 2026.", "2026 年 1–8 月，每一类技术项目的新开 PR 都多于关闭数量。")}</p>
              </header>
              <div>
                {pressure.roleFlows.map((item) => (
                  <p key={item.key}>
                    <span>{isChinese ? translateDataLabel(item.label) : item.label}</span>
                    <i><em style={{ width: `${(item.pullRequestBalance / pressureRoleMaximum) * 100}%` }} /></i>
                    <b>{formatSignedCompact(item.pullRequestBalance)}</b>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.efficiencyStudy} data-reveal>
            <header>
              <h3>{t("Agent activity reached more PRs, while fewer finished within 30 days.", "Agent 触达了更多 PR，但 30 天内完成的比例下降了。")}</h3>
              <p>
                {t("The full repository counts above show the growing queue. To see what happened inside it, we compared 2,750 threads from January–August 2025 with 2,750 from the same 55 repositories in 2026. Each repository contributes 50 threads in each year.", "上面的仓库全量数据说明队列怎样增长。为了观察队列内部发生了什么，我们比较同一组 55 个仓库在 2025 和 2026 年 1–8 月的线程：每个仓库、每年各 50 条，共 5,500 条。")}
              </p>
            </header>

            <div className={styles.efficiencyReport}>
              <div className={styles.reportTableWrap}>
                <table className={styles.efficiencyTable}>
                  <thead>
                    <tr>
                      <th>{t("Measure", "观察项")}</th>
                      <th>2025</th>
                      <th>2026</th>
                      <th>{t("Change", "变化")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: t("Threads where a named Agent or App appeared", "出现具名 Agent 或 App 的线程"),
                        earlier: threadPanel2025.agentParticipationShare,
                        later: threadPanel2026.agentParticipationShare,
                      },
                      {
                        label: t("A repository maintainer responded within 7 days", "7 天内收到仓库维护者响应"),
                        earlier: threadPanel2025.maintainerResponseWithin7dShare,
                        later: threadPanel2026.maintainerResponseWithin7dShare,
                      },
                      {
                        label: t("Pull requests resolved within 30 days", "PR 在 30 天内处理完成"),
                        earlier: threadPanel2025.pullRequestResolvedWithin30dShare,
                        later: threadPanel2026.pullRequestResolvedWithin30dShare,
                      },
                      {
                        label: t("Pull requests with a visible review", "PR 出现公开 review"),
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
                  {isChinese ? `具名 Agent 出现在线程中的比例翻了一倍以上，进入公开 review 的 PR 也更多；与此同时，第一周维护者响应从 ${formatPercent(threadPanel2025.maintainerResponseWithin7dShare, 1)} 降到 ${formatPercent(threadPanel2026.maintainerResponseWithin7dShare, 1)}，30 天 PR 完成率从 ${formatPercent(threadPanel2025.pullRequestResolvedWithin30dShare, 1)} 降到 ${formatPercent(threadPanel2026.pullRequestResolvedWithin30dShare, 1)}。Agent 帮助更多变更走到 review，仓库仍需要投入真人注意力并承担最终决定，才能把这些变更处理完。` : `Named Agents appeared in more than twice as many threads, and review reached a larger share of PRs. At the same time, first-week maintainer response fell from ${formatPercent(threadPanel2025.maintainerResponseWithin7dShare, 1)} to ${formatPercent(threadPanel2026.maintainerResponseWithin7dShare, 1)}, and 30-day PR completion fell from ${formatPercent(threadPanel2025.pullRequestResolvedWithin30dShare, 1)} to ${formatPercent(threadPanel2026.pullRequestResolvedWithin30dShare, 1)}. Agents helped more changes reach review; repositories still had to find the attention and authority to finish them.`}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.pushConcentration} data-reveal>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>{t("More accounts entered the push path, while integration stayed concentrated.", "更多账号进入 Push 路径，集成仍由小范围核心承担。")}</h4>
              </div>
              <p>
                {isChinese ? `同一组 55 个仓库中，出现 PushEvent 的账号中位数从 ${push2025.pushActors} 个增加到 ${push2026.pushActors} 个；但完成一半 push 所需的账号中位数仍只有 ${push2026.actorsForHalfOfPushes} 个。更多人进入了公开写入路径，大部分集成活动仍集中在一个很小的核心圈。` : `In the same 55 repositories, the median number of accounts with a PushEvent rose from ${push2025.pushActors} to ${push2026.pushActors}. Yet the median number producing half of all pushes stayed at ${push2026.actorsForHalfOfPushes}. More people reached the integration path; most integration activity still sat with a small core.`}
              </p>
            </div>
            <div className={styles.pushBenchmarkGrid}>
              <header>
                <strong>{t("2026 comparison", "2026 年对照")}</strong>
                <span>{t("repository medians", "仓库中位数")}</span>
              </header>
              {pressure.pushBenchmarks.map((item) => (
                <article key={item.label}>
                  <div>
                    <strong>{item.label.replace(" benchmark", "")}</strong>
                    <span>{item.repositories} {t("active repositories", "个活跃仓库")}</span>
                  </div>
                  <p>
                    <i style={{ width: `${(item.pushActors / pushBenchmarkMaximum) * 100}%` }} />
                    <b>{item.pushActors}</b>
                    <span>{t("accounts pushed", "个账号执行过 push")}</span>
                  </p>
                  <p>
                    <i style={{ width: `${(item.actorsForHalfOfPushes / 3) * 100}%` }} />
                    <b>{item.actorsForHalfOfPushes}</b>
                    <span>{t("accounts made half the pushes", "个账号完成一半 push")}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.releaseFlowPanel}>
            <div className={styles.activityPanelHeading}>
              <div>
                <h4>{t("Some repositories publish GitHub Releases almost every day.", "一部分仓库几乎每天都在发布 GitHub Release。")}</h4>
              </div>
              <p>{isChinese ? `2026 年 1 月 1 日至 8 月 31 日共 ${activityFlow.releases.observationDays} 天，Top 100 中有 ${activityFlow.releases.repositoriesWithRelease} 个仓库至少发布过一次非草稿 GitHub Release。Release day 按 UTC 日期去重；高频记录常常反映自动化发布。这里包含 prerelease，不包含只有 tag 或只发布到包仓库的记录。` : `From 1 January to 31 August 2026 (${activityFlow.releases.observationDays} days), ${activityFlow.releases.repositoriesWithRelease}/100 repositories published a non-draft GitHub Release. Release days deduplicate those records by UTC date; frequent records often reflect automation. Prereleases are included, while tag-only and package-registry publication are outside this view.`}</p>
            </div>
            <div className={styles.releaseFlowGrid}>
              <div className={styles.releaseHistogram} aria-label="Repositories by number of release days">
                {activityFlow.releases.buckets.map((item) => (
                  <div key={item.label}>
                    <span><i style={{ width: `${(item.count / releaseBucketMaximum) * 100}%` }} /></span>
                    <strong>{isChinese ? translateReleaseBucket(item.label) : item.label}</strong>
                    <b>{item.count}</b>
                  </div>
                ))}
              </div>
              <div className={styles.releaseLeaderTable}>
                <div className={styles.releaseLeadersHeader} aria-hidden="true">
                  <span>{t("Repository", "仓库")}</span>
                  <span>{t("Release days", "发布天数")}</span>
                  <span>{t("Release records", "Release 记录")}</span>
                </div>
                <ol className={styles.releaseLeaders}>
                  {activityFlow.releases.leaders.map((item) => (
                    <li key={item.repo}>
                      <a href={`https://github.com/${item.repo}/releases`} target="_blank" rel="noreferrer">{item.repo}</a>
                      <span>{item.releaseDays} / {activityFlow.releases.observationDays} {t("days", "天")}</span>
                      <small>{item.releaseRecords.toLocaleString(numberLocale)} {t("records", "条记录")}</small>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.subchapterMarker} data-reveal>
          <span>02B</span>
          <strong>{t("Contribution access and Agent setup", "贡献入口与 Agent 设置")}</strong>
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
              <dd>{t("Explicitly invite contribution", "明确邀请外部贡献")}</dd>
            </div>
            <div data-policy="gate">
              <dt>{collaboration.gatedPolicies}</dt>
              <dd>{t("Issue-first or scoped pre-approval", "要求先开 Issue 或事先限定范围")}</dd>
            </div>
            <div data-policy="unspecified">
              <dt>{collaboration.noDetectedPolicySignal}</dt>
              <dd>{t("No restrictive policy signal detected", "未发现限制性政策信号")}</dd>
            </div>
            <div data-policy="closed">
              <dt>{collaboration.restrictedCreationPolicies}</dt>
              <dd>{t("Restrict pull-request creation to collaborators", "仅允许 collaborators 创建 PR")}</dd>
            </div>
          </dl>
          <div className={styles.governanceExamples}>
            <article>
              <span>{t("THE TWO RESTRICTED REPOSITORIES", "两个限制 PR 创建的仓库")}</span>
              <p>
                <a href="https://github.com/openai/codex" target="_blank" rel="noreferrer">Codex</a>
                {isChinese ? " 与 " : " and "}
                <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noreferrer">Claude Code</a>
                {t(" leave Pull Requests enabled, while GitHub only permits collaborators to create them.", " 保留了 Pull Requests 页面，但 GitHub 只允许 collaborators 创建 PR。")}
              </p>
            </article>
            <article>
              <span>{t("ALIGN BEFORE CODING", "编码前先对齐")}</span>
              <p>
                <a href="https://github.com/mastra-ai/mastra/blob/75dd419e613fe9c39f846ffc500716141b74fda6/README.md" target="_blank" rel="noreferrer">Mastra</a>
                {t(" asks code contributors to open an Issue first. ", " 要求代码贡献者先开 Issue；")}
                <a href="https://github.com/open-webui/open-webui/blob/d3e8bf3405e848cfba377814d0aa7ba7290e414d/.github/pull_request_template.md" target="_blank" rel="noreferrer">Open WebUI</a>
                {t(" applies the same gate to first-time contributors, except localization changes.", " 对首次贡献者设置相同门槛，但本地化修改除外。")}
              </p>
            </article>
            <article>
              <span>{t("OUTSIDE THE TOP 100", "TOP 100 之外")}</span>
              <p>
                <a href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noreferrer">DeepSeek Harness</a>
                {t(" publishes its core under MIT, keeps core Issues and Pull Requests closed, and points outside development toward plugins.", " 以 MIT 协议公开核心代码，但关闭核心 Issues 与 PR，把外部开发引向插件。")}
              </p>
            </article>
          </div>
          <details className={styles.governanceMethod}>
            <summary>{t("How the contribution policy was classified", "贡献政策是怎样分类的")}</summary>
            <p>
              {isChinese ? "我们先读取 GitHub 的 " : "We read GitHub's "}<code>has_pull_requests</code>{isChinese ? " 与 " : " and "}<code>pull_request_creation_policy</code>{t(" first, then reviewed frozen copies of README, CONTRIBUTING, GOVERNANCE and Pull Request templates. Repositories enter “No restrictive signal detected” when this scan finds neither an explicit invitation nor a stated gate.", "，再检查冻结的 README、CONTRIBUTING、GOVERNANCE 和 PR template。只有既未发现明确邀请、也未发现事先门槛时，仓库才归入“未发现限制性政策信号”。")}
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
                <span>{t("Core code", "核心代码")}</span>
                <strong>{t("Public", "公开")}</strong>
                <small>{t("MIT licensed", "MIT 协议")}</small>
              </div>
              <div data-surface="closed">
                <span>{t("Core contribution", "核心贡献")}</span>
                <strong>{t("Closed", "关闭")}</strong>
                <small>Issues / PR</small>
              </div>
              <div data-surface="open">
                <span>{t("Extension ecosystem", "扩展生态")}</span>
                <strong>{t("Open", "开放")}</strong>
                <small>{t("Discussions and plugins", "Discussions 与插件")}</small>
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
            <p className={styles.caseLaunchDate}>{t("Open-sourced 13 Aug 2026", "2026 年 8 月 13 日开源")}</p>
            <div className={styles.caseAttention}>
              <strong>204K+</strong>
              <span>{t("GitHub stars in its first 17 days", "开源 17 天获得的 GitHub Stars")}</span>
              <small>23.6K forks</small>
            </div>
            <p className={styles.caseClosedSurface}>
              {isChinese ? "同时关闭了核心仓库的 " : "with "}<strong>Issues</strong>{isChinese ? " 和 " : " and "}<strong>Pull Requests</strong>{isChinese ? null : " closed"}
            </p>
            <dl className={styles.caseFacts}>
              <CaseFact label={t("License", "协议")} value="MIT" />
              <CaseFact label="Discussions" value={t("On", "开放")} state="on" />
              <CaseFact label={t("Extension path", "扩展路径")} value="dsh-plugin" state="on" />
            </dl>
            <a
              className={styles.sourceLink}
              href="https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
            >
              {t("Read the contribution guide", "阅读贡献指南")}
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
                {t("repositories publish a coding-agent instruction file or tool folder on the default branch. This setup is already common in every technical group.", "个仓库在默认分支上发布了 coding-agent instruction file 或工具目录。这种设置已经遍布各类技术项目。")}
              </p>
            </article>
            <div className={styles.agentRoleCoverage}>
              <h4>{t("Repositories with coding-agent setup", "具有 coding-agent 设置的仓库")}</h4>
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
            <summary>{t("Which instruction files and tool folders were found", "我们找到了哪些 instruction file 与工具目录")}</summary>
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
          <strong>{t("Where Agents enter the public workflow", "Agent 在公开流程的哪里进入")}</strong>
        </div>

        <SamplePoolHeader
          label={t("Thread sample", "线程样本")}
          title={t("5,000 Issues and pull requests", "5,000 条 Issue / PR")}
          body={isChinese ? `2026 年 1 月 1 日至 8 月 31 日，我们从 Top 100 的每个仓库抽取 50 条 Issue / PR：${(collaboration.sampleThreads - collaboration.samplePullRequests).toLocaleString(numberLocale)} 条 Issue 和 ${collaboration.samplePullRequests.toLocaleString(numberLocale)} 条 PR。图表串联这 ${collaboration.sampleThreads.toLocaleString(numberLocale)} 条线程及其 ${collaboration.publicEventsAnalyzed.toLocaleString(numberLocale)} 条公开事件；每条线程只计算一次。` : `Between 1 January and 31 August 2026, we sampled 50 Issues or pull requests from each of the Top 100 repositories: ${(collaboration.sampleThreads - collaboration.samplePullRequests).toLocaleString(numberLocale)} Issues and ${collaboration.samplePullRequests.toLocaleString(numberLocale)} pull requests. The charts show what happened in these ${collaboration.sampleThreads.toLocaleString(numberLocale)} threads and their ${collaboration.publicEventsAnalyzed.toLocaleString(numberLocale)} linked public events. Each thread counts once.`}
        />

        <section className={styles.visibleAgentActivity} data-reveal id="agent-workflow">
          <header>
            <EditableText as="h3" copyKey="collaborationEntryTitle" />
            <EditableText as="p" copyKey="collaborationEntryBody" />
          </header>
          <div className={styles.agentHandoff}>
            <article>
              <span>{t("Opened by a named Agent or App", "由具名 Agent 或 App 发起")}</span>
              <strong>{formatPercent(openedStage.agent / openedStage.denominator, 1)}</strong>
              <p>{openedStage.agent.toLocaleString(numberLocale)} / {openedStage.denominator.toLocaleString(numberLocale)} {t("sampled Issues and PRs", "条抽样 Issue / PR")}</p>
            </article>
            <article>
              <span>{t("Received an Agent review", "收到 Agent review")}</span>
              <strong>{formatPercent(reviewStage.agent / reviewStage.denominator, 1)}</strong>
              <p>{reviewStage.agent.toLocaleString(numberLocale)} / {reviewStage.denominator.toLocaleString(numberLocale)} {t("sampled PRs", "条抽样 PR")}</p>
            </article>
            <article>
              <span>{t("Ended with a GitHub User action", "最后由 GitHub User 账号执行公开动作")}</span>
              <strong>{formatPercent(finalStateStage.user / finalStateStage.denominator, 1)}</strong>
              <p>{finalStateStage.user.toLocaleString(numberLocale)} / {finalStateStage.denominator.toLocaleString(numberLocale)} {t("resolved threads", "条已解决线程")}</p>
            </article>
          </div>
          <div className={styles.agentWorkProfile}>
            <div>
              <h4>{t("What named Agents did in public", "具名 Agent 在公开记录中做了什么")}</h4>
              <p>{t("Review dominates the visible record; triage and discussion follow.", "Review 占据主要部分，其次是分流与讨论。")}</p>
            </div>
            <div className={styles.taskFootprintRows}>
            {taskFootprint.map((item, index) => (
              <div key={item.label}>
                <span>{isChinese ? translateWorkflowLabel(item.label) : item.label}</span>
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
            <summary>{t("What counts as a named Agent action", "什么会被计为具名 Agent 行为")}</summary>
            <div>
              <section>
                <h4>{t("GitHub names the Agent or App", "GitHub 明确显示 Agent 或 App 身份")}</h4>
                <p>{t("Examples include a CodeRabbit review, a Gemini Code Assist comment or an OpenHands App action. Conventional CI, dependency and release bots are kept separate.", "例如 CodeRabbit review、Gemini Code Assist 评论或 OpenHands App 行为。常规 CI、依赖更新和发布机器人单独统计。")}</p>
              </section>
              <section>
                <h4>{t("Local Agent use is not visible here", "本地 Agent 使用通常不可见")}</h4>
                <p>{t("Work done with Cursor, Claude Code or Codex usually appears under the developer's normal GitHub User account unless the public record adds a separate attribution.", "使用 Cursor、Claude Code 或 Codex 在本地完成的工作，通常只显示为开发者的普通 GitHub User 账号，除非公开记录提供了额外归因。")}</p>
              </section>
              <section>
                <h4>{t("The final action is a public state change", "最终动作指公开状态变化")}</h4>
                <p>{t("It is the latest visible merge, close or reopen event. It shows which account completed the public workflow, not who made every earlier decision.", "它是最后一个可见的 merge、close 或 reopen 事件，说明哪个账号完成了公开流程，不代表此前所有决定都由该账号作出。")}</p>
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
              <h4>{t("66.8% after an Agent-first review, versus 41.1% after a User-first review.", "Agent-first review 后有 66.8% 出现新提交，User-first review 后为 41.1%。")}</h4>
              <p>
                {t("Each reviewed PR is assigned to the account behind its first formal review, then followed through the next commit. The gap is 25.7 percentage points.", "每条收到 review 的 PR 都按第一次正式 review 背后的账号分类，再继续观察下一次 commit；两组相差 25.7 个百分点。")}
              </p>
            </header>
            <div>
              {reviewerFollowupComparison.map((item, index) => (
                <article key={item.id} data-reviewer={item.id}>
                  <span>{isChinese ? translateWorkflowLabel(item.label) : item.label}</span>
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
                  <small>{item.followups} / {item.total} {t("PRs received another commit", "条 PR 随后出现新 commit")}</small>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.changeRequestComparison}>
            <header>
              <h4>{t("An explicit request for changes is followed by another commit three quarters of the time.", "明确要求修改后，约四分之三的 PR 会出现新提交。")}</h4>
              <p>
                {t("Once the review state is CHANGES_REQUESTED, the Agent and User groups are nearly identical.", "当 review 状态明确为 CHANGES_REQUESTED 时，Agent 与 User 两组几乎没有差别。")}
              </p>
            </header>
            <div>
              {changeRequestComparison.map((item) => (
                <article key={item.id} data-reviewer={item.id}>
                  <span>{isChinese ? translateWorkflowLabel(item.label) : item.label}</span>
                  <strong>{formatPercent(item.value, 1)}</strong>
                  <small>{item.followups} / {item.total} {t("PRs received another commit", "条 PR 随后出现新 commit")}</small>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.iterationSignals} aria-label="Review sample context">
            {iterationSignals.map((item) => (
              <div key={item.label}>
                <strong>{formatPercent(item.value, 1)}</strong>
                <span>{isChinese ? translateWorkflowLabel(item.label) : item.label}</span>
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
              <span>{t("of the first Agent-patch lines remained as exact text", "的第一版 Agent patch 行以完全相同的文本保留下来")}</span>
              <small>{t("765 of 1,225 text lines · 9 traceable PRs", "1,225 行中的 765 行 · 9 条可追踪 PR")}</small>
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
                  <dd>{isChinese ? translateLineageText(segment.label) : segment.label}</dd>
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
                  <span>{isChinese ? translateLineageText(activeLineageCase.path) : activeLineageCase.path}</span>
                  <h4>{activeLineageCase.repo} #{activeLineageCase.number}</h4>
                </div>
                <a href={activeLineageCase.href} target="_blank" rel="noreferrer">
                  {t("Open PR", "打开 PR")} <ExternalLinkIcon aria-hidden="true" />
                </a>
              </header>
              {activeLineageCase.initial === null ? (
                <div className={styles.lineageUnresolved}>
                  <strong>{t("Not line-traceable", "无法进行行级追踪")}</strong>
                  <p>{isChinese ? translateLineageText(activeLineageCase.note) : activeLineageCase.note}</p>
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
                    <p><strong>{activeLineageCase.initial}</strong><span>{t("First Agent-patch lines", "第一版 Agent patch 行数")}</span></p>
                    <p><strong>{activeLineageCase.retained}</strong><span>{t("Exact text retained", "文本原样保留")}</span></p>
                    <p><strong>{activeLineageCase.human}</strong><span>{t("Changed by human account", "由真人账号修改")}</span></p>
                    <p><strong>{activeLineageCase.agent}</strong><span>{t("Changed by later Agent", "由后续 Agent 修改")}</span></p>
                    <p><strong>{activeLineageCase.unknown}</strong><span>{t("Author unresolved", "无法确认作者")}</span></p>
                  </div>
                  <p className={styles.caseLineageNote}>{isChinese ? translateLineageText(activeLineageCase.note) : activeLineageCase.note}</p>
                </>
              )}
            </article>
          </div>
        </div>

        <div className={styles.casebookIntro} data-reveal>
          <span>{t("Seven public threads", "七条公开线程")}</span>
          <h3>{t("The hand-off looks different in every repository.", "每个仓库里的交接方式都不一样。")}</h3>
          <p>{t("These cases show who opened the work, where an Agent entered, who revised it and who closed the loop.", "这些案例展示谁发起工作、Agent 在哪里进入、谁继续修改，以及最后由谁结束公开流程。")}</p>
        </div>

        <CollaborationCasebook locale={locale} />

      </section>

      <section className={styles.closing}>
        <EditableText as="p" copyKey="closingQuestion" />
        <EditableText as="small" copyKey="closingNote" />
      </section>

      <section className={styles.methodology} id="method">
        <details>
          <summary>{t("Methodology and data boundaries", "方法与数据边界")}</summary>
          <div className={styles.methodologyBody}>
            <p>
              {isChinese ? `当前两张全景图包含 data/agentic-ai-projects.csv 中标记为 keep 或 add 的 ${stats.total} 个仓库。5 月基线是 data/history_snapshot/2605_agentic_projects.csv 中保留的 ${stats.mayTracked} 个仓库；OpenRank 与参与者数量使用完整的 2026 年 7 月数据。` : `The current maps contain ${stats.total} repositories marked keep or add in data/agentic-ai-projects.csv. The May baseline is the ${stats.mayTracked}-repository tracking pool preserved in data/history_snapshot/2605_agentic_projects.csv. OpenRank and participant counts use the complete July 2026 month.`}
            </p>
            <p>
              {t("OpenRank, stars, forks and participant counts describe different signals. Primary language comes from GitHub's repository-level label. The OpenRouter app ranking is public and opt-in. Agent Sandbox, Kata Containers and OpenTelemetry provide project-level evidence for concrete engineering work around Agent execution. Revenue, deployment scale and technical performance require separate sources.", "OpenRank、Stars、Forks 与参与者数量描述的是不同信号；主要语言来自 GitHub 的仓库级标签。OpenRouter 应用榜公开且为自愿归因。Agent Sandbox、Kata Containers 与 OpenTelemetry 的项目材料用于证明 Agent 执行周围正在发生的具体工程工作；营收、部署规模与技术性能需要其他来源。")}
            </p>
            <p>
              {t("The Collaboration chapter freezes the tracked-pool Top 100 by July OpenRank, then treats OpenRank only as a sampling rule. Every 2026 collaboration measure stops at 31 August; September collection and publication dates do not extend that window. The current entry-surface refresh uses GitHub REST and GraphQL. Annual marker snapshots inspect coding-agent instruction files and tool-specific folders on the default branch. The ClickHouse event panel is retained for historical scale and quality checks, but its 2025–2026 PR author and merge-time payload is incomplete and is not used for a claim about productivity.", "协作章节按 7 月 OpenRank 冻结 tracking pool 的 Top 100，此后只把 OpenRank 作为抽样规则。所有 2026 年协作统计均截止到 8 月 31 日，9 月的采集与发布时间不延长观察窗口。贡献入口使用 GitHub REST 与 GraphQL；年度 marker 快照检查默认分支上的 coding-agent instruction file 与工具目录。ClickHouse 事件面板仅用于历史规模与质量检查，因为 2025–2026 年 PR 作者与合入时间数据不完整，不用于生产力结论。")}
            </p>
            <p>
              {t("The public-thread analysis samples 50 Issues or pull requests from each of the Top 100 repositories between 1 January and 31 August 2026. Every thread counts once. Actor labels follow the identity or App attribution GitHub exposes; undisclosed local Agent use remains under the developer's ordinary User account.", "公开线程分析从 Top 100 的每个仓库抽取 2026 年 1 月 1 日至 8 月 31 日的 50 条 Issue / PR，每条线程只计算一次。Actor 标签遵循 GitHub 公开的身份或 App 归因；未披露的本地 Agent 使用仍会显示在开发者普通 User 账号下。")}
            </p>
          </div>
        </details>
      </section>

      <ResearchTrail groups={references} locale={locale} />
      </ReportCopyEditor>
    </main>
  );
}

function ResearchTrail({
  groups,
  locale,
}: {
  groups: ReportReferenceGroup[];
  locale: ReportLocale;
}) {
  const references = groups.flatMap((group) => group.items);

  return (
    <section className={styles.referenceLibrary} id="references">
      <header className={styles.referenceHeader}>
        <h2>{locale === "zh-CN" ? "参考来源" : "References"}</h2>
        <span>{references.length} {locale === "zh-CN" ? "项来源" : "sources"}</span>
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
  locale,
  total,
}: {
  label: string;
  items: Array<{
    key: string;
    label: string;
    count: number;
    description?: string;
  }>;
  locale: ReportLocale;
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
            aria-label={item.description ? `${locale === "zh-CN" ? translateDataLabel(item.label) : item.label}: ${locale === "zh-CN" ? translateProfileDescription(item.description) : item.description}` : undefined}
            className={item.description ? styles.profileDefinition : undefined}
            data-profile={item.key}
            key={item.key}
            tabIndex={item.description ? 0 : undefined}
          >
            <dt>{locale === "zh-CN" ? translateDataLabel(item.label) : item.label}</dt>
            <dd>{item.count}</dd>
            {item.description ? (
              <span role="tooltip">{locale === "zh-CN" ? translateProfileDescription(item.description) : item.description}</span>
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
  locale,
}: {
  titleKey: ReportCopyKey;
  groups: MacroGroup[];
  accent: "agent" | "model";
  locale: ReportLocale;
}) {
  return (
    <article className={styles.macroChart} data-accent={accent}>
      <EditableText as="h3" copyKey={titleKey} />
      <div className={styles.macroLegend}>
        <span>
          <i data-series="projects" />
          {locale === "zh-CN" ? "项目占比" : "Project share"}
        </span>
        <span>
          <i data-series="openrank" />
          {locale === "zh-CN" ? "OpenRank 占比" : "OpenRank share"}
        </span>
      </div>
      <div className={styles.macroRows}>
        {groups.map((group, index) => (
          <div className={styles.macroRow} key={group.label}>
            <div>
              <strong>{locale === "zh-CN" ? translateDataLabel(group.label) : group.label}</strong>
              <span>
                {group.projects} {locale === "zh-CN" ? "个项目" : "projects"} · {group.newlyTracked} {locale === "zh-CN" ? "个不在 5 月项目池" : "outside May pool"}
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

function translateDataLabel(label: string) {
  const labels: Record<string, string> = {
    Application: "应用",
    Framework: "开发框架",
    Runtime: "运行时",
    Serving: "模型服务",
    "Pre-Train": "预训练",
    Data: "数据",
    Compute: "计算",
    "Post-Train": "后训练",
    "Model infrastructure": "模型基础设施",
    "Agent applications": "Agent 应用",
    "Agent frameworks": "Agent 框架",
    "Agent runtime infrastructure": "Agent 运行时基础设施",
    "Agent runtime infra": "Agent 运行时基础设施",
    "Model infra": "模型基础设施",
    "LLM-native": "LLM 原生",
    Traditional: "传统软件",
    Mixed: "混合型",
    "Created Dec 2022 or later": "创建于 2022 年 12 月或之后",
    "Created earlier": "创建时间更早",
    Other: "其他",
  };
  return labels[label] ?? label;
}

function translateShiftLabel(label: string) {
  const labels: Record<string, string> = {
    "Session runtime": "任务运行时",
    "Task authority": "任务权限",
    "State & recovery": "状态与恢复",
    "Action trace": "行动追踪",
    Accelerators: "加速器",
    "Traffic & budgets": "流量与预算",
  };
  return labels[label] ?? label;
}

function translateShiftText(value: string) {
  const copy: Record<string, string> = {
    "A deployed service starts from a known artifact": "部署服务从已知制品启动",
    "An agent can create and run code inside the task": "Agent 可以在任务中生成并运行代码",
    "The environment may last only a few minutes, yet it still needs isolation, network policy, a stable task identity, warm-start latency and reliable cleanup.": "环境可能只存活几分钟，却仍然需要隔离、网络策略、稳定的任务身份、可控的预热延迟和可靠清理。",
    "4 development sandboxes. Kubernetes Agent Sandbox adds declarative claims, templates and warm pools.": "全景图包含 4 个开发沙箱项目。Kubernetes Agent Sandbox 增加了声明式 claim、模板与 warm pool。",
    "Kubernetes manages the sandbox lifecycle; Kata Containers supplies a VM-backed boundary for untrusted code.": "Kubernetes 管理沙箱生命周期，Kata Containers 为不受信任的代码提供 VM 级边界。",
    "Strong isolation still competes with startup time. Warm pools need safe reset, tenant separation, capacity limits and portable templates.": "强隔离仍然与启动速度存在取舍；warm pool 还需要安全重置、租户隔离、容量限制和可移植模板。",
    "A service account represents a long-running application": "Service account 代表一个长期运行的应用",
    "Authority has to be scoped to one task and its tools": "权限必须限定在单项任务及其工具范围内",
    "One run may cross a repository, a document store and a deployment system. The platform needs bounded delegation, expiry and revocation while the run is still active.": "一次运行可能跨越代码仓库、文档存储与部署系统。平台需要在任务仍然运行时提供有限委托、到期与撤销机制。",
    "Protocols & interoperability grew from 5 to 8 projects; two agent gateways moved out of Model API gateways.": "协议与互操作项目从 5 个增加到 8 个；两个 Agent gateway 从 Model API gateway 中独立出来。",
    "SPIFFE/SPIRE already provides workload identity and delegated identity, while explicitly warning about impersonation risk.": "SPIFFE / SPIRE 已经提供 workload identity 与 delegated identity，同时明确提示身份冒用风险。",
    "An identity says who the workload is. The task still needs to carry which tools and resources it may use, who approved it, how much it may spend and when that authority expires.": "Identity 只能说明 workload 是谁；任务还需要携带它可使用哪些工具和资源、由谁批准、可以花费多少，以及权限何时到期。",
    "State is attached to a service or database transaction": "状态依附于服务或数据库事务",
    "A task can pause, retry and resume across several environments": "任务可以跨多个环境暂停、重试与恢复",
    "Context, artifacts and tool results need a durable home. A retry also has to know whether an earlier tool call already changed an external system.": "上下文、制品与工具结果需要持久保存；重试还必须知道先前的工具调用是否已经改变外部系统。",
    "9 memory and context projects. OpenViking gained 42.6 OpenRank points from April to July.": "全景图包含 9 个记忆与上下文项目；OpenViking 从 4 月到 7 月增长了 42.6 个 OpenRank 点。",
    "Dapr Agents packages durable workflows, retries and persistent state; data and context systems remain the durable substrate.": "Dapr Agents 封装 durable workflow、重试与持久状态；数据与上下文系统仍是持久化底座。",
    "Safe resume needs checkpoints, idempotency and compensation. Context also needs lineage, expiry, deletion and recovery from bad state.": "安全恢复需要 checkpoint、幂等与补偿；上下文还需要沿革、到期、删除和从错误状态恢复的能力。",
    "Teams inspect service requests, logs and resources": "团队检查服务请求、日志与资源",
    "Teams need to reconstruct a decision and its side effect": "团队需要重建一次决定及其外部影响",
    "A successful request confirms transport, while the useful question is whether the Agent made the intended change. Answering it requires a trace from model work through tool execution and sandbox events to the external result.": "请求成功只能证明传输完成，真正的问题是 Agent 是否做出了预期改变。回答它需要把模型工作、工具执行、沙箱事件与外部结果串成一条 trace。",
    "4 agent observability projects; the category is stable, while tool and protocol layers are growing around it.": "全景图包含 4 个 Agent 可观测项目；这一类数量稳定，周围的工具与协议层正在增长。",
    "OpenTelemetry is widely deployed, but its GenAI agent and tool conventions are still marked Development.": "OpenTelemetry 已广泛部署，但其 GenAI Agent 与工具语义仍标记为 Development。",
    "The trace still has to connect model work, tool execution and the external result. Independent platform records are essential when the Agent itself is one of the actors being audited.": "Trace 仍然必须连接模型工作、工具执行与外部结果；当 Agent 本身也是审计对象时，独立的平台记录尤其重要。",
    "Services reserve a relatively predictable resource profile": "服务预留相对可预测的资源配置",
    "One task mixes inference, tools and short bursts of compute": "一项任务混合推理、工具与短时计算高峰",
    "The sequence is harder to forecast and may span CPU, GPU and network-sensitive distributed work. Allocation, topology and per-task cost become scheduling inputs.": "这种序列更难预测，并可能跨越 CPU、GPU 与网络敏感的分布式工作；资源分配、拓扑与单任务成本都成为调度输入。",
    "Serving inference leads Model Infra with 786.8 combined July OpenRank; FlashInfer gained 20.7 from April to July.": "Serving inference 以 786.8 的 7 月合计 OpenRank 领先 Model Infra；FlashInfer 从 4 月到 7 月增长 20.7。",
    "Kubernetes DRA is GA; Kueue combines quota, topology-aware placement and training/inference workloads.": "Kubernetes DRA 已 GA；Kueue 将配额、拓扑感知 placement 与训练 / 推理 workload 结合起来。",
    "Platforms still need task-level SLOs and cost attribution across CPU, GPU, network and sandbox time, while balancing cold starts against reserved capacity.": "平台仍需要跨 CPU、GPU、网络与沙箱时间的任务级 SLO 和成本归因，同时平衡冷启动与预留容量。",
    "A request follows a bounded downstream path": "请求沿着有限的下游路径执行",
    "One task can fan out across models and tools": "一项任务可以扇出到多个模型与工具",
    "Calls may be serial, parallel or retried. Public token totals combine those patterns, so task-level QPS, concurrency and fan-out remain hidden inside the aggregate.": "调用可能串行、并行或重试。公开 token 总量会把这些模式合并，任务级 QPS、并发与扇出仍隐藏在聚合值中。",
    "Tools, protocols and gateways are filling in around the application layer. Nine OpenRouter Top 20 apps align to the current landscape.": "工具、协议与 gateway 正在应用层周围补齐；OpenRouter Top 20 中有 9 个应用与当前全景图对应。",
    "Agentgateway supports request and token limits, plus per-tool limits for MCP traffic.": "Agentgateway 支持请求与 token 限制，并可对 MCP 流量设置单工具限制。",
    "Budgets, fan-out caps, backpressure and cancellation need to cross gateway, model, tool and runtime boundaries. Agentgateway's local counters reset with the process, leaving task-wide limits to be coordinated across components.": "预算、扇出上限、背压与取消需要跨越 gateway、模型、工具和 runtime 边界。Agentgateway 的本地计数器会随进程重置，任务级限制仍需跨组件协调。"
  };
  return copy[value] ?? value;
}

function translateInfrastructureText(value: string) {
  const copy: Record<string, string> = {
    "Run & isolate": "运行与隔离",
    "Create short-lived environments and put a harder boundary under generated code.": "创建短生命周期环境，为生成代码提供更强的隔离边界。",
    "Sandbox lifecycle, claims and warm pools": "沙箱生命周期、claim 与 warm pool",
    "VM-backed isolation under Agent Sandbox": "Agent Sandbox 下的 VM 级隔离",
    "Attested confidential-computing substrate": "可验证的机密计算底座",
    "Coordinate & operate": "协调与运行",
    "Keep state, recover work and let agents operate the cloud-native stack.": "保存状态、恢复任务，并让 Agent 操作云原生技术栈。",
    "Agents for Kubernetes, Prometheus, Istio and Argo": "操作 Kubernetes、Prometheus、Istio 与 Argo 的 Agent",
    "Durable workflows, state, retries and identity": "Durable workflow、状态、重试与身份",
    "One platform for human and agent operations": "同一平台承载真人与 Agent 操作",
    "Connect & govern": "连接与治理",
    "Route model, MCP and agent traffic through policy-aware control points.": "通过感知策略的控制点路由模型、MCP 与 Agent 流量。",
    "Kubernetes control plane for AI traffic": "面向 AI 流量的 Kubernetes 控制面",
    "Data plane for LLMs, MCP tools and agents": "面向 LLM、MCP 工具与 Agent 的数据面",
    "Service-mesh policy extended to AI traffic": "将 service mesh 策略延伸到 AI 流量",
    "Trace & explain": "追踪与解释",
    "Carry agent, tool and sandbox activity into the existing telemetry path.": "把 Agent、工具与沙箱活动接入现有遥测路径。",
    "Agent, workflow and execute-tool semantics": "Agent、workflow 与 execute-tool 语义",
    "Agent execution paths built on OpenTelemetry": "基于 OpenTelemetry 的 Agent 执行路径",
  };
  return copy[value] ?? value;
}

function translateWorkflowLabel(value: string) {
  const labels: Record<string, string> = {
    Review: "评审",
    "Triage & routing": "分流与路由",
    Discussion: "讨论",
    "First formal review by a named Agent or App": "第一次正式 review 来自具名 Agent 或 App",
    "First formal review by a GitHub User account": "第一次正式 review 来自 GitHub User 账号",
    "All CHANGES_REQUESTED reviews": "全部 CHANGES_REQUESTED review",
    "Request from a named Agent or App": "具名 Agent 或 App 发出的修改要求",
    "Request from a GitHub User account": "GitHub User 账号发出的修改要求",
    "Formal review recorded · 2,521 / 3,567 PRs": "记录到正式 review · 2,521 / 3,567 条 PR",
    "Agent review or inline review comment · 1,342 / 3,567 PRs": "出现 Agent review 或行内评论 · 1,342 / 3,567 条 PR",
    "Another commit after first formal review · 1,385 / 2,521 PRs": "第一次正式 review 后出现新 commit · 1,385 / 2,521 条 PR",
  };
  return labels[value] ?? value;
}

function translateLineageText(value: string) {
  const copy: Record<string, string> = {
    "Exact text retained": "文本原样保留",
    "Changed by a human account": "由真人账号修改",
    "Changed by a later Agent commit": "由后续 Agent commit 修改",
    "Later author unresolved": "无法确认后续作者",
    "Agent iterates to merge": "Agent 持续迭代至合入",
    "Agent → human": "Agent → 真人",
    "Agent → unresolved author": "Agent → 无法确认的作者",
    "Merge commit · lineage unresolved": "Merge commit · 沿革无法确认",
    "The first 172-line patch was fully replaced by later Agent revisions.": "第一版 172 行补丁被后续 Agent 修改全部替换。",
    "The human handoff kept 31 of 44 first-patch lines unchanged.": "交接给真人后，第一版 44 行中有 31 行原样保留。",
    "The handoff is visible in the code: 29 lines changed under later human-account commits.": "交接清晰反映在代码中：29 行由后续真人账号 commit 修改。",
    "The largest case kept 533 of 611 first-patch lines; it also dominates the pooled total.": "最大案例在第一版 611 行中原样保留 533 行，因此也主导了合计结果。",
    "All 11 first-patch lines changed before merge: seven under Agent commits and four under human accounts.": "第一版 11 行在合入前全部发生变化：7 行由 Agent commit 修改，4 行由真人账号修改。",
    "The later commits do not expose a resolvable GitHub author, so 144 changed lines remain unattributed.": "后续 commit 没有公开可解析的 GitHub 作者，因此 144 行修改无法归因。",
    "All 33 lines in the first effective patch remained unchanged.": "第一份有效补丁的 33 行全部原样保留。",
    "Human commits followed, but none removed or rewrote the 25 first-patch lines.": "之后虽有真人 commit，但第一版的 25 行没有被删除或改写。",
    "Four of five lines remained; the Agent revised the fifth.": "5 行中有 4 行保留，第 5 行由 Agent 修改。",
    "Copilot is attached to a two-parent merge commit. Its first-parent diff includes upstream history, so the case stays in the review but outside the line denominator.": "Copilot 关联到一个双父节点 merge commit；其 first-parent diff 包含上游历史，因此案例保留在审查中，但不进入行数分母。",
  };
  return copy[value] ?? value;
}

function translateProfileDescription(value: string) {
  const copy: Record<string, string> = {
    "The project’s main purpose depends on language models or agents. Remove the LLM, and the core product no longer works as intended. LangChain and vLLM are examples.": "项目的核心用途依赖语言模型或 Agent；移除 LLM 后，核心产品无法按原本方式工作。LangChain 与 vLLM 属于这一类。",
    "The project has a complete core purpose without language models. It may serve AI workloads, but that does not define the project. PyTorch and ONNX Runtime are examples.": "项目在不依赖语言模型时也有完整核心用途。它可能服务 AI workload，但 AI 并不定义项目本身。PyTorch 与 ONNX Runtime 属于这一类。",
    "The project began with a broader software purpose, while AI or agents now form a substantial product surface. The non-AI product still stands. n8n, Warp and MLflow are examples.": "项目原本有更广泛的软件用途，AI 或 Agent 如今已成为重要产品表面，但非 AI 产品仍然成立。n8n、Warp 与 MLflow 属于这一类。",
  };
  return copy[value] ?? value;
}

function translateMonth(value: string) {
  const months: Record<string, string> = {
    Jan: "1 月",
    Feb: "2 月",
    Mar: "3 月",
    Apr: "4 月",
    May: "5 月",
    Jun: "6 月",
    Jul: "7 月",
    Aug: "8 月",
  };
  return months[value] ?? value;
}

function translateReleaseBucket(value: string) {
  if (value === "None") return "无";
  if (value === "1 day") return "1 天";
  return value;
}
