"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Maximize2Icon,
} from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import LandscapeExplorer from "@/app/components/landscape-explorer";
import type {
  PresentationCopy,
  PresentationCopyKey,
} from "@/lib/inclusion-presentation-copy";
import type { LandscapeProject } from "@/lib/landscape-types";

import type { InclusionResearchStats } from "../research-data";
import { LanguageMixChart } from "../report-figures";
import reportStyles from "../page.module.css";
import {
  EditablePresentationText,
  PresentationCopyEditor,
} from "./presentation-copy-editor";
import styles from "./presentation.module.css";

type SwipeStart = { pointerId: number; x: number; y: number };

const scenes = [
  { id: "cover", label: "开场", chapter: "开场", maxBuild: 0 },
  { id: "agent-landscape", label: "Agent Infra", chapter: "Landscape", maxBuild: 2 },
  { id: "model-landscape", label: "Model Infra", chapter: "Landscape", maxBuild: 1 },
  { id: "trend-observation", label: "语言分布", chapter: "Landscape", maxBuild: 0 },
  { id: "repository", label: "进入仓库", chapter: "协作", maxBuild: 0 },
  { id: "flow", label: "工作流入", chapter: "协作", maxBuild: 0 },
  { id: "pressure", label: "处理压力", chapter: "协作", maxBuild: 0 },
  { id: "setup", label: "仓库入口", chapter: "协作", maxBuild: 0 },
  { id: "public-work", label: "公开工作流", chapter: "Agent", maxBuild: 0 },
  { id: "review", label: "Review", chapter: "Agent", maxBuild: 0 },
  { id: "lineage", label: "代码变化", chapter: "Agent", maxBuild: 2 },
  { id: "close", label: "结尾", chapter: "结尾", maxBuild: 0 },
] as const;

type SceneId = (typeof scenes)[number]["id"];
type LandscapeView = "agent" | "model";

type LandscapeInsight = {
  domain: string;
  metric: string;
  titleKey: PresentationCopyKey;
  bodyKey: PresentationCopyKey;
  focus?: string | string[];
};

type BarStyle = CSSProperties & {
  "--bar-delay"?: string;
  "--bar-width"?: string;
  "--delay"?: string;
  "--height"?: string;
  "--ready"?: string;
  "--width"?: string;
};

const policyLabels = {
  invite: "明确邀请外部贡献",
  gate: "需先开 Issue、获同意或限定贡献类型",
  quiet: "没有检测到限制",
  closed: "仅 collaborators 可创建 PR",
} as const;

const lineageCases = [
  {
    name: "MLflow #21621",
    href: "https://github.com/mlflow/mlflow/pull/21621",
    retained: 33,
    human: 0,
    agent: 0,
    unresolved: 0,
    text: "第一笔 Agent patch 的 33 行全部原样进入最终版本，没有被人类或后续 Agent 改写。",
  },
  {
    name: "ONNX Runtime #28045",
    href: "https://github.com/microsoft/onnxruntime/pull/28045",
    retained: 533,
    human: 78,
    agent: 0,
    unresolved: 0,
    text: "第一笔 Agent patch 有 611 行；合入时 533 行原样保留，另外 78 行后来由人类账号修改。",
  },
  {
    name: "Vercel AI SDK #18818",
    href: "https://github.com/vercel/ai/pull/18818",
    retained: 0,
    human: 0,
    agent: 172,
    unresolved: 0,
    text: "最初 172 行全部被后续 Agent commit 替换。Agent 生成的代码也会经历完整的自动迭代。",
  },
] as const;

function isPresentationShortcutTarget(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof HTMLElement)) return false;
  return Boolean(
    eventTarget.isContentEditable ||
      eventTarget.closest(
        'a[href], button, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="button"]',
      ),
  );
}

export default function InclusionPresentation({
  initialCopy,
  projects,
  stats,
}: {
  initialCopy: PresentationCopy;
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [build, setBuild] = useState(0);
  const [hashReady, setHashReady] = useState(false);
  const swipeStart = useRef<SwipeStart | null>(null);
  const scene = scenes[sceneIndex];

  const next = useCallback(() => {
    if (build < scene.maxBuild) {
      setBuild((current) => current + 1);
      return;
    }
    const nextIndex = Math.min(scenes.length - 1, sceneIndex + 1);
    setSceneIndex(nextIndex);
    setBuild(0);
  }, [build, scene.maxBuild, sceneIndex]);

  const previous = useCallback(() => {
    if (build > 0) {
      setBuild((current) => current - 1);
      return;
    }
    const previousIndex = Math.max(0, sceneIndex - 1);
    setSceneIndex(previousIndex);
    setBuild(scenes[previousIndex].maxBuild);
  }, [build, sceneIndex]);

  const goToScene = useCallback((index: number, nextBuild = 0) => {
    const safeIndex = Math.max(0, Math.min(scenes.length - 1, index));
    setSceneIndex(safeIndex);
    setBuild(Math.max(0, Math.min(scenes[safeIndex].maxBuild, nextBuild)));
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const [requestedId, requestedBuild] = window.location.hash
        .slice(1)
        .split(".") as [SceneId, string?];
      const requestedIndex = scenes.findIndex((item) => item.id === requestedId);
      if (requestedIndex >= 0) {
        goToScene(
          requestedIndex,
          Number.parseInt(requestedBuild ?? "0", 10) || 0,
        );
      }
      setHashReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [goToScene]);

  useEffect(() => {
    const handleHashChange = () => {
      const [requestedId, requestedBuild] = window.location.hash
        .slice(1)
        .split(".") as [SceneId, string?];
      const requestedIndex = scenes.findIndex((item) => item.id === requestedId);
      if (requestedIndex >= 0) {
        goToScene(
          requestedIndex,
          Number.parseInt(requestedBuild ?? "0", 10) || 0,
        );
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [goToScene]);

  useEffect(() => {
    if (!hashReady) return;
    window.history.replaceState(null, "", `#${scene.id}.${build}`);
  }, [build, hashReady, scene.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPresentationShortcutTarget(event.target)) return;

      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        next();
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      }
      if (event.key === "Home") goToScene(0);
      if (event.key === "End") goToScene(scenes.length - 1);
      if (event.key === "Enter") void enterFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterFullscreen, goToScene, next, previous]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") return;
    swipeStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) next();
    else previous();
  }

  return (
    <PresentationCopyEditor initialCopy={initialCopy}>
      <main
        className={styles.stage}
        lang="zh-CN"
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <section
          className={styles.deck}
          data-current-scene={scene.id}
          aria-live="polite"
        >
          <div
            className={styles.scene}
            data-stage-scene={scene.id}
            key={scene.id === "lineage" ? scene.id : `${scene.id}.${build}`}
          >
            <Scene build={build} id={scene.id} projects={projects} stats={stats} />
          </div>

          <nav className={styles.deckNav} aria-label="演示导航">
            <Link href="/presentations/260910_inclusion" aria-label="返回研究报告">
              <ArrowLeftIcon aria-hidden="true" />
            </Link>
            <span>{scene.chapter} · {scene.label}</span>
            <button type="button" onClick={() => void enterFullscreen()} aria-label="全屏">
              <Maximize2Icon aria-hidden="true" />
            </button>
          </nav>

          <div className={styles.sceneDots} aria-label="跳转页面">
            {scenes.map((item, index) => (
              <button
                aria-current={index === sceneIndex ? "page" : undefined}
                aria-label={`跳转到第 ${index + 1} 页：${item.label}`}
                data-active={index === sceneIndex}
                key={item.id}
                onClick={() => goToScene(index)}
                title={item.label}
                type="button"
              />
            ))}
          </div>

          <div className={styles.pager}>
            <button type="button" onClick={previous} disabled={sceneIndex === 0} aria-label="上一页">
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <span>{String(sceneIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}</span>
            <button type="button" onClick={next} disabled={sceneIndex === scenes.length - 1} aria-label="下一页">
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </PresentationCopyEditor>
  );
}

function Scene({
  id,
  projects,
  stats,
  build,
}: {
  id: SceneId;
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
  build: number;
}) {
  if (id === "cover") return <CoverSlide />;
  if (id === "agent-landscape" || id === "model-landscape") {
    return (
      <LandscapeSlide
        build={build}
        projects={projects}
        stats={stats}
        view={id === "agent-landscape" ? "agent" : "model"}
      />
    );
  }
  if (id === "trend-observation") return <LanguageTrendSlide stats={stats} />;
  if (id === "repository") return <RepositorySlide stats={stats} />;
  if (id === "flow") return <FlowSlide stats={stats} />;
  if (id === "pressure") return <PressureSlide stats={stats} />;
  if (id === "setup") return <SetupSlide stats={stats} />;
  if (id === "public-work") return <PublicWorkSlide stats={stats} />;
  if (id === "review") return <ReviewSlide stats={stats} />;
  if (id === "lineage") return <LineageSlide build={build} />;
  return <ClosingSlide />;
}

function CoverSlide() {
  return (
    <article className={styles.coverSlide}>
      <header className={styles.coverMasthead}>
        <div className={styles.coverIdentity}>
          <Image src="/icon.svg" alt="" width={64} height={64} priority />
          <strong>Agentic AI Landscape · 2026</strong>
        </div>
        <LogoPair />
      </header>
      <section className={styles.coverTitleBlock}>
        <h1>
          <EditablePresentationText copyKey="coverTitleLine1" />
          <EditablePresentationText as="strong" copyKey="coverTitleLine2" />
        </h1>
      </section>
      <footer className={styles.coverMeta}>
        <p>
          <EditablePresentationText as="strong" copyKey="coverSpeakerName" />
          <EditablePresentationText copyKey="coverSpeakerOrg" />
        </p>
        <p>
          <EditablePresentationText as="strong" copyKey="coverEvent" />
          <EditablePresentationText as="time" copyKey="coverDate" />
        </p>
      </footer>
    </article>
  );
}

function SlideShell({
  bodyKey,
  className,
  children,
  titleKey,
  tone = "violet",
}: {
  bodyKey: PresentationCopyKey;
  className?: string;
  children: ReactNode;
  titleKey: PresentationCopyKey;
  tone?: "blue" | "pink" | "violet";
}) {
  return (
    <article className={[styles.slideShell, className].filter(Boolean).join(" ")} data-tone={tone}>
      <header className={styles.slideLead}>
        <EditablePresentationText as="h2" copyKey={titleKey} />
        <EditablePresentationText as="p" copyKey={bodyKey} />
      </header>
      {children}
    </article>
  );
}

function RepositorySlide({ stats }: { stats: InclusionResearchStats }) {
  const activity = stats.collaboration.activityFlow;
  const signals = [
    {
      labelKey: "questionIssueLabel" as const,
      value: formatCompact(activity.issuesOpened),
      tone: "blue",
    },
    {
      labelKey: "questionPrLabel" as const,
      value: formatCompact(activity.pullRequestsOpened),
      tone: "pink",
    },
  ] as const;

  return (
    <article className={styles.repositorySlide}>
      <section className={styles.repositoryQuestion}>
        <EditablePresentationText as="p" copyKey="questionKicker" />
        <EditablePresentationText as="h2" copyKey="questionTitle" />
        <EditablePresentationText as="p" copyKey="questionBody" />
      </section>
      <section className={styles.signalStack} aria-label="仓库协作关键数字">
        {signals.map((signal, index) => (
          <article data-tone={signal.tone} key={signal.labelKey} style={{ "--delay": `${index * 90}ms` } as BarStyle}>
            <EditablePresentationText as="span" copyKey={signal.labelKey} />
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>
    </article>
  );
}

function LandscapeSlide({
  projects,
  stats,
  view,
  build,
}: {
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
  view: LandscapeView;
  build: number;
}) {
  const activeInsight = getLandscapeInsight(view, stats, build);
  return (
    <article className={styles.landscapeSlide}>
      <LandscapeExplorer
        embedOnly={view}
        presentationFocus={build ? activeInsight.focus : undefined}
        presentationMode
        projects={projects}
      />
      <aside className={styles.landscapeCallout} data-view={view} data-active={build > 0}>
        <span>{activeInsight.domain}</span>
        <strong>{activeInsight.metric}</strong>
        <EditablePresentationText as="h2" copyKey={activeInsight.titleKey} />
        <EditablePresentationText as="p" copyKey={activeInsight.bodyKey} />
      </aside>
    </article>
  );
}

function getLandscapeInsight(
  view: LandscapeView,
  stats: InclusionResearchStats,
  build: number,
): LandscapeInsight {
  const application = stats.agentMacro.find((item) => item.label === "Application");
  const runtimeProjectCount = stats.runtimePath.reduce(
    (sum, point) => sum + point.projects,
    0,
  );
  const serving = stats.modelMacro.find((item) => item.label === "Serving");

  if (view === "agent") {
    if (build >= 2) {
      return {
        domain: "Runtime",
        metric: `${runtimeProjectCount}`,
        titleKey: "runtimeTrendTitle",
        bodyKey: "runtimeTrendBody",
        focus: stats.runtimePath.map((point) => point.label),
      };
    }

    return {
      domain: "Application",
      metric: `${application?.openrankShare ?? 0}%`,
      titleKey: "agentTrendTitle",
      bodyKey: "agentTrendBody",
      focus: [
        "Agentic coding",
        "Coding workflows & harnesses",
        "Personal AI assistants",
        "Chatbot workspaces",
      ],
    };
  }

  return {
    domain: "Serving",
    metric: `${serving?.openrankShare ?? 0}%`,
    titleKey: "modelTrendTitle",
    bodyKey: "modelTrendBody",
    focus: [
      "Model API gateways",
      "Serving · Deploy",
      "Serving · Inference",
    ],
  };
}

function LanguageTrendSlide({ stats }: { stats: InclusionResearchStats }) {
  return (
    <article className={styles.reportFigureSlide} data-report-figure="language">
      <section
        className={`${reportStyles.languageSignal} ${styles.reportFigureBlock}`}
        data-slide-figure="language"
      >
        <header>
          <EditablePresentationText as="h3" copyKey="languageTrendTitle" />
          <EditablePresentationText as="p" copyKey="languageTrendBody" />
        </header>
        <LanguageMixChart
          agentTotal={stats.agent}
          groups={stats.languageMix}
          modelTotal={stats.model}
        />
      </section>
    </article>
  );
}

function FlowSlide({ stats }: { stats: InclusionResearchStats }) {
  const activity = stats.collaboration.activityFlow;
  const monthlyMax = Math.max(
    ...activity.monthly.map((item) => Math.max(item.issues, item.pullRequests)),
  );

  return (
    <SlideShell bodyKey="flowBody" titleKey="flowTitle" tone="blue">
      <section className={styles.flowVisual} aria-label="2026 年每月公开工作流入">
        <div className={styles.flowTotals}>
          <article>
            <span>Issue 流入</span>
            <strong>{formatCompact(activity.issuesOpened)}</strong>
          </article>
          <article>
            <span>PR 流入</span>
            <strong>{formatCompact(activity.pullRequestsOpened)}</strong>
          </article>
        </div>
        <div className={styles.flowColumns}>
          {activity.monthly.map((item, index) => (
            <article key={item.month}>
              <div>
                <i
                  data-series="issue"
                  style={
                    {
                      "--delay": `${index * 55}ms`,
                      "--height": `${Math.max(6, (item.issues / monthlyMax) * 100)}%`,
                    } as BarStyle
                  }
                  title={`${item.label} Issue ${formatCompact(item.issues)}`}
                />
                <i
                  data-series="pr"
                  style={
                    {
                      "--delay": `${index * 55 + 70}ms`,
                      "--height": `${Math.max(6, (item.pullRequests / monthlyMax) * 100)}%`,
                    } as BarStyle
                  }
                  title={`${item.label} PR ${formatCompact(item.pullRequests)}`}
                />
              </div>
              <strong>{item.label}</strong>
              <span>{item.ratio.toFixed(1)}×</span>
            </article>
          ))}
        </div>
        <p className={styles.flowLegend}>
          <span data-series="issue">Issue</span>
          <span data-series="pr">Pull request</span>
          <strong>{activity.window} · Top 100</strong>
        </p>
      </section>
    </SlideShell>
  );
}

function PressureSlide({ stats }: { stats: InclusionResearchStats }) {
  const pressure = stats.collaboration.systemPressure;
  const history = pressure.history.filter((item) => item.year >= 2024);
  const latest = history[history.length - 1];
  const previous = history.find((item) => item.year === 2025) ?? history[history.length - 2];
  const threadPanel = stats.collaboration.threadPanel.years;
  const previousThreads = threadPanel.find((item) => item.year === 2025);
  const latestThreads = threadPanel.find((item) => item.year === 2026);
  const maxPullRequests = Math.max(
    ...history.map((item) => item.pullRequestsOpened),
  );

  return (
    <SlideShell bodyKey="backlogBody" titleKey="backlogTitle" tone="pink">
      <section className={styles.pressureVisual} aria-label="PR 流入和处理结果">
        <div className={styles.pressureBars}>
          {history.map((item, index) => (
            <article key={item.year}>
              <span>{item.year}</span>
              <i aria-hidden="true">
                <em
                  style={
                    {
                      "--delay": `${index * 120}ms`,
                      "--width": `${(item.pullRequestsOpened / maxPullRequests) * 100}%`,
                    } as BarStyle
                  }
                />
              </i>
              <strong>{formatCompact(item.pullRequestsOpened)}</strong>
            </article>
          ))}
        </div>
        <aside className={styles.pressureOutcomes}>
          <article data-tone="pink">
            <span>未处理 PR 净增</span>
            <strong>{formatSignedCompact(previous.pullRequestBalance)} → {formatSignedCompact(latest.pullRequestBalance)}</strong>
          </article>
          <article data-tone="violet">
            <span>90 天后仍开放</span>
            <strong>{formatPercent(previous.pullRequestUnresolved90dShare)} → {formatPercent(latest.pullRequestUnresolved90dShare)}</strong>
          </article>
          <article>
            <span>维护者 7 天内响应</span>
            <strong>
              {previousThreads && latestThreads
                ? `${formatPercent(previousThreads.maintainerResponseWithin7dShare)} → ${formatPercent(latestThreads.maintainerResponseWithin7dShare)}`
                : "—"}
            </strong>
          </article>
          <article data-tone="blue">
            <span>仓库中位 90 天合入率</span>
            <strong>{formatPercent(previous.repositoryMedianPullRequestMerged90dShare)} → {formatPercent(latest.repositoryMedianPullRequestMerged90dShare)}</strong>
          </article>
        </aside>
      </section>
    </SlideShell>
  );
}

function SetupSlide({ stats }: { stats: InclusionResearchStats }) {
  const collaboration = stats.collaboration;
  const total =
    collaboration.explicitInvitations +
    collaboration.gatedPolicies +
    collaboration.restrictedCreationPolicies +
    collaboration.noDetectedPolicySignal;
  const policies = [
    ["invite", collaboration.explicitInvitations],
    ["gate", collaboration.gatedPolicies],
    ["quiet", collaboration.noDetectedPolicySignal],
    ["closed", collaboration.restrictedCreationPolicies],
  ] as const;
  const readyShare = Math.round(
    (collaboration.codingAgentRepositories /
      collaboration.repositoryProfile.repositoryItems.length) *
      100,
  );
  const accessNarrative = [
    {
      titleKey: "accessReadyTitle" as const,
      bodyKey: "accessReadyBody" as const,
      metric: `${collaboration.codingAgentRepositories}/100`,
    },
    {
      titleKey: "accessPolicyTitle" as const,
      bodyKey: "accessPolicyNote" as const,
      metric: `${collaboration.explicitInvitations}+${collaboration.gatedPolicies}`,
    },
  ];

  return (
    <SlideShell
      bodyKey="accessBody"
      className={styles.setupSlideShell}
      titleKey="accessTitle"
      tone="blue"
    >
      <section className={styles.setupVisual}>
        <div className={styles.accessMap} style={{ "--ready": `${readyShare}%` } as BarStyle}>
          <div className={styles.accessNumber}>
            <strong>{collaboration.codingAgentRepositories}</strong>
            <span>/100</span>
          </div>
          <div className={styles.accessGauge} aria-hidden="true">
            <i />
          </div>
          <p>默认分支上能看到 coding-agent 文件或目录</p>
          <div className={styles.accessPathStrip} aria-label="常见 Agent 规则路径">
            <span>AGENTS.md</span>
            <span>CLAUDE.md</span>
            <span>.codex</span>
            <span>.cursor</span>
          </div>
        </div>
        <aside className={styles.accessStory}>
          <div className={styles.accessNarrative}>
            {accessNarrative.map((item, index) => (
              <article key={item.titleKey} style={{ "--delay": `${index * 100}ms` } as BarStyle}>
                <strong>{item.metric}</strong>
                <EditablePresentationText as="h3" copyKey={item.titleKey} />
                <EditablePresentationText as="p" copyKey={item.bodyKey} />
              </article>
            ))}
          </div>
          <div className={styles.policyRoutes} aria-label="贡献入口分布">
            {policies.map(([key, value], index) => (
              <article
                data-policy={key}
                key={key}
                style={
                  {
                    "--delay": `${index * 85}ms`,
                    "--width": `${(value / total) * 100}%`,
                  } as BarStyle
                }
              >
                <strong>{value}</strong>
                <span>{policyLabels[key]}</span>
                <i aria-hidden="true" />
              </article>
            ))}
          </div>
        </aside>
      </section>
    </SlideShell>
  );
}

function PublicWorkSlide({ stats }: { stats: InclusionResearchStats }) {
  const stages = stats.collaboration.threadParticipationStages;
  const meta = {
    opened: ["发起工作", "全部 5,000 条线程"],
    response: ["参与回应", "Issue / PR 时间线"],
    review: ["参与 Review", "3,567 条 PR"],
    "final-state": ["最后状态动作", "已解决且能识别执行者"],
  } as const;

  return (
    <SlideShell bodyKey="handoffBody" titleKey="handoffTitle" tone="violet">
      <section className={styles.publicWorkflow}>
        {stages.map((stage, index) => (
          <article key={stage.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{meta[stage.id][0]}</h3>
            <p>{meta[stage.id][1]}</p>
            <div className={styles.actorSplit}>
              <b>Agent / App</b>
              <strong>{formatPercent(stage.agent / stage.denominator)}</strong>
              <i><em data-actor="agent" style={{ "--width": `${(stage.agent / stage.denominator) * 100}%` } as BarStyle} /></i>
            </div>
            <div className={styles.actorSplit}>
              <b>GitHub 用户</b>
              <strong>{formatPercent(stage.user / stage.denominator)}</strong>
              <i><em data-actor="user" style={{ "--width": `${(stage.user / stage.denominator) * 100}%` } as BarStyle} /></i>
            </div>
          </article>
        ))}
      </section>
      <EditablePresentationText as="p" className={styles.readingNote} copyKey="handoffNote" />
    </SlideShell>
  );
}

function ReviewSlide({ stats }: { stats: InclusionResearchStats }) {
  const collaboration = stats.collaboration;
  const comparisons = [
    {
      id: "agent",
      label: "第一次正式 Review 来自 Agent",
      value: collaboration.firstReviewAgentFollowupShare,
      followups: collaboration.firstReviewAgentFollowupCommits,
      total: collaboration.firstReviewAgentPrs,
    },
    {
      id: "user",
      label: "第一次正式 Review 来自 GitHub User",
      value: collaboration.firstReviewGithubUserFollowupShare,
      followups: collaboration.firstReviewGithubUserFollowupCommits,
      total: collaboration.firstReviewGithubUserPrs,
    },
  ] as const;
  const comparisonGroups = [
    {
      id: "first-review",
      title: "第一次正式 Review 后出现新 commit",
      finding: "Agent 高 25.7 个百分点",
      items: comparisons,
    },
    {
      id: "change-request",
      title: "明确要求修改后出现新 commit",
      finding: "Agent 与人类基本相同",
      items: [
        {
          id: "agent",
          label: "修改要求来自 Agent",
          value: collaboration.agentChangeRequestFollowupCommitShare,
          followups: collaboration.agentChangeRequestFollowupCommits,
          total: collaboration.agentChangeRequestPrs,
        },
        {
          id: "user",
          label: "修改要求来自 GitHub User",
          value: collaboration.humanChangeRequestFollowupCommitShare,
          followups: collaboration.humanChangeRequestFollowupCommits,
          total: collaboration.humanChangeRequestPrs,
        },
      ],
    },
  ] as const;

  return (
    <SlideShell bodyKey="reviewBody" titleKey="reviewTitle" tone="blue">
      <section className={styles.reviewVisual}>
        {comparisonGroups.map((group, groupIndex) => (
          <article className={styles.reviewPanel} data-comparison={group.id} key={group.id}>
            <header>
              <h3>{group.title}</h3>
              <p>{group.finding}</p>
            </header>
            {group.items.map((item, index) => (
              <div
                className={styles.reviewRow}
                data-reviewer={item.id}
                key={item.id}
                style={{ "--delay": `${(groupIndex * 2 + index) * 100}ms` } as BarStyle}
              >
                <span>{item.label}</span>
                <strong>{formatPercent(item.value)}</strong>
                <i><em style={{ "--width": `${item.value * 100}%` } as BarStyle} /></i>
                <small>{item.followups.toLocaleString("en-US")} / {item.total.toLocaleString("en-US")} 个 PR</small>
              </div>
            ))}
          </article>
        ))}
      </section>
    </SlideShell>
  );
}

function LineageSlide({ build }: { build: number }) {
  const caseIndex = Math.min(build, lineageCases.length - 1);
  const selected = lineageCases[caseIndex];
  const total = selected.retained + selected.human + selected.agent + selected.unresolved;
  const overview = [
    ["原样保留", 765, "retained"],
    ["后来由人修改", 123, "human"],
    ["后来由 Agent 修改", 193, "agent"],
    ["作者无法确定", 144, "unknown"],
  ] as const;
  const caseSegments = [
    ["原样保留", selected.retained, "retained"],
    ["人类修改", selected.human, "human"],
    ["Agent 修改", selected.agent, "agent"],
    ["作者不明", selected.unresolved, "unknown"],
  ] as const;

  return (
    <SlideShell bodyKey="lineageBody" titleKey="lineageTitle" tone="violet">
      <section className={styles.lineageVisual}>
        <div className={styles.lineageOverview}>
          <strong>62.4%</strong>
          <div className={styles.lineageStack}>
            {overview.map((item, index) => (
              <i
                data-lineage={item[2]}
                key={item[0]}
                style={{ "--width": `${(item[1] / 1225) * 100}%`, "--delay": `${index * 90}ms` } as BarStyle}
                title={`${item[0]}：${item[1]} 行`}
              />
            ))}
          </div>
          <dl>
            {overview.map((item) => (
              <div data-lineage={item[2]} key={item[0]}>
                <dt>{formatPercent(item[1] / 1225)}</dt>
                <dd>{item[0]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={styles.lineageCase}>
          <nav aria-label="代码变化案例">
            {lineageCases.map((item, index) => (
              <span
                data-active={index === caseIndex}
                key={item.name}
              >
                {item.name}
              </span>
            ))}
          </nav>
          <article key={selected.name}>
            <header>
              <h3>{selected.name}</h3>
              <a href={selected.href} target="_blank" rel="noreferrer">
                查看 PR <ExternalLinkIcon aria-hidden="true" />
              </a>
            </header>
            <div className={styles.caseStack}>
              {caseSegments.filter((item) => item[1] > 0).map((item, index) => (
                <i
                  data-lineage={item[2]}
                  key={item[0]}
                  style={{ "--width": `${(item[1] / total) * 100}%`, "--delay": `${index * 90}ms` } as BarStyle}
                  title={`${item[0]}：${item[1]} 行`}
                />
              ))}
            </div>
            <p>{selected.text}</p>
          </article>
        </div>
      </section>
    </SlideShell>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.closingSlide}>
      <LogoPair />
      <section>
        <EditablePresentationText as="p" copyKey="closingKicker" />
        <h2>
          <EditablePresentationText copyKey="closingTitleLine1" />
          <br />
          <EditablePresentationText copyKey="closingTitleLine2" />
        </h2>
        <EditablePresentationText as="p" className={styles.closingText} copyKey="closingBody" />
      </section>
      <div className={styles.closingPath}>
        <EditablePresentationText copyKey="closingPathCode" />
        <EditablePresentationText copyKey="closingPathResponse" />
        <EditablePresentationText copyKey="closingPathReview" />
        <EditablePresentationText copyKey="closingPathMerge" />
        <EditablePresentationText as="strong" copyKey="closingPathMaintain" />
      </div>
      <Link className={styles.closingLink} href="/presentations/260910_inclusion">
        <EditablePresentationText copyKey="closingLink" />
        <ExternalLinkIcon aria-hidden="true" />
      </Link>
    </article>
  );
}

function LogoPair() {
  return (
    <div className={styles.logoPair} aria-label="蚂蚁开源与 InclusionAI">
      <Image src="/community-logos/ant-open-source.png" alt="Ant Open Source" width={1282} height={389} priority />
      <i aria-hidden="true" />
      <Image src="/community-logos/inclusionai.png" alt="InclusionAI" width={1612} height={466} priority />
    </div>
  );
}

function formatCompact(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}

function formatSignedCompact(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompact(Math.abs(value))}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
