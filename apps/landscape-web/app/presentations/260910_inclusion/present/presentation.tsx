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
import type { LandscapeProject } from "@/lib/landscape-types";

import type { InclusionResearchStats } from "../research-data";
import styles from "./presentation.module.css";

type SwipeStart = { pointerId: number; x: number; y: number };

const scenes = [
  { id: "cover", label: "开场" },
  { id: "question", label: "研究问题" },
  { id: "landscape", label: "全景图" },
  { id: "trend", label: "增长趋势" },
  { id: "method", label: "证据范围" },
  { id: "flow", label: "进入仓库的工作" },
  { id: "backlog", label: "处理结果" },
  { id: "core", label: "核心参与者" },
  { id: "access", label: "贡献入口" },
  { id: "handoff", label: "Agent 进入的位置" },
  { id: "tasks", label: "Agent 做了什么" },
  { id: "review", label: "Review 后的修改" },
  { id: "lineage", label: "代码沿革" },
  { id: "outcomes", label: "同期变化" },
  { id: "deepseek", label: "治理选择" },
  { id: "close", label: "结论" },
] as const;

type SceneId = (typeof scenes)[number]["id"];

export default function InclusionPresentation({
  projects,
  stats,
}: {
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [hashReady, setHashReady] = useState(false);
  const swipeStart = useRef<SwipeStart | null>(null);
  const scene = scenes[sceneIndex];

  const next = useCallback(() => {
    setSceneIndex((current) => Math.min(scenes.length - 1, current + 1));
  }, []);
  const previous = useCallback(() => {
    setSceneIndex((current) => Math.max(0, current - 1));
  }, []);
  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const requestedId = window.location.hash.slice(1).split(".")[0] as SceneId;
      const requestedIndex = scenes.findIndex((item) => item.id === requestedId);
      if (requestedIndex >= 0) setSceneIndex(requestedIndex);
      setHashReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const handleHashChange = () => {
      const requestedId = window.location.hash.slice(1).split(".")[0] as SceneId;
      const requestedIndex = scenes.findIndex((item) => item.id === requestedId);
      if (requestedIndex >= 0) setSceneIndex(requestedIndex);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => {
    if (hashReady) window.history.replaceState(null, "", `#${scene.id}`);
  }, [hashReady, scene.id]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        next();
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      }
      if (event.key === "Home") setSceneIndex(0);
      if (event.key === "End") setSceneIndex(scenes.length - 1);
      if (event.key === "Enter") void enterFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterFullscreen, next, previous]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
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
    <main
      className={styles.stage}
      lang="zh-CN"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { swipeStart.current = null; }}
    >
      <section className={styles.deck} aria-live="polite">
        <header className={styles.stageHeader}>
          <Link className={styles.backLink} href="/presentations/260910_inclusion">
            <ArrowLeftIcon aria-hidden="true" />Online report
          </Link>
          <span className={styles.chapterName}>{scene.label}</span>
          <div className={styles.stageHeaderRight}>
            <span>{String(sceneIndex + 1).padStart(2, "0")} / {scenes.length}</span>
            <button type="button" onClick={() => void enterFullscreen()}>
              <Maximize2Icon aria-hidden="true" />全屏
            </button>
          </div>
        </header>
        <div className={styles.scene} data-stage-scene={scene.id} key={scene.id}>
          <Scene id={scene.id} projects={projects} stats={stats} />
        </div>
        <footer className={styles.controls}>
          <div className={styles.progress} aria-label="演示进度">
            {scenes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`跳转到第 ${index + 1} 页：${item.label}`}
                aria-current={index === sceneIndex ? "page" : undefined}
                data-active={index === sceneIndex}
                onClick={() => setSceneIndex(index)}
              ><i /><span>{item.label}</span></button>
            ))}
          </div>
          <div className={styles.pager}>
            <button type="button" onClick={previous} disabled={sceneIndex === 0} aria-label="上一页"><ChevronLeftIcon aria-hidden="true" /></button>
            <button type="button" onClick={next} disabled={sceneIndex === scenes.length - 1} aria-label="下一页"><ChevronRightIcon aria-hidden="true" /></button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Scene({
  id,
  projects,
  stats,
}: {
  id: SceneId;
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
}) {
  if (id === "cover") return <CoverSlide />;
  if (id === "question") return <QuestionSlide stats={stats} />;
  if (id === "landscape") return <LandscapeSlide projects={projects} stats={stats} />;
  if (id === "trend") return <TrendSlide stats={stats} />;
  if (id === "method") return <MethodSlide stats={stats} />;
  if (id === "flow") return <FlowSlide stats={stats} />;
  if (id === "backlog") return <BacklogSlide stats={stats} />;
  if (id === "core") return <CoreSlide stats={stats} />;
  if (id === "access") return <AccessSlide stats={stats} />;
  if (id === "handoff") return <HandoffSlide stats={stats} />;
  if (id === "tasks") return <TaskSlide stats={stats} />;
  if (id === "review") return <ReviewSlide stats={stats} />;
  if (id === "lineage") return <LineageSlide />;
  if (id === "outcomes") return <OutcomeSlide stats={stats} />;
  if (id === "deepseek") return <DeepSeekSlide />;
  return <ClosingSlide />;
}

function CoverSlide() {
  return (
    <article className={styles.coverSlide}>
      <div className={styles.coverAccent} aria-hidden="true" />
      <section className={styles.coverCopy}>
        <p className={styles.coverKicker}>THE INCLUSION CONFERENCE</p>
        <h1>Agent 进入<br />开源协作之后</h1>
        <p className={styles.coverQuestion}>代码变多了，Review 变多了，合入为什么没有更快？</p>
        <div className={styles.speakerLine}><strong>Xiaoya Xia</strong><span>Ant Open Source</span></div>
      </section>
      <aside className={styles.coverLogoPlate} aria-label="Produced by Ant Open Source and InclusionAI">
        <Image src="/community-logos/ant-open-source.png" alt="Ant Open Source" width={1282} height={389} priority />
        <i aria-hidden="true" />
        <Image src="/community-logos/inclusionai.png" alt="InclusionAI" width={1612} height={466} priority />
      </aside>
      <p className={styles.coverSource}>September 2026 · Open-source collaboration research</p>
    </article>
  );
}

function SlideHeader({ title, body }: { title: ReactNode; body: ReactNode }) {
  return <header className={styles.slideHeader}><h2>{title}</h2><p>{body}</p></header>;
}

function QuestionSlide({ stats }: { stats: InclusionResearchStats }) {
  const activity = stats.collaboration.activityFlow;
  const panel = stats.collaboration.threadPanel.years;
  const earlier = panel.find((item) => item.year === 2025)!;
  const later = panel.find((item) => item.year === 2026)!;
  return (
    <article className={styles.questionSlide}>
      <section className={styles.questionCopy}>
        <p>研究从一个反差开始</p>
        <h2>代码供给增长，<br />协作效率会一起增长吗？</h2>
        <p>今年前八个月，Top 100 收到 {formatCompact(activity.pullRequestsOpened)} 条 Pull Request。在同一批可比仓库中，Agent 出现在更多公开线程里，但维护者的第一周响应和 PR 的 30 天完成率都下降了。</p>
      </section>
      <section className={styles.questionEvidence}>
        <div><span>PR opened</span><strong>{formatCompact(activity.pullRequestsOpened)}</strong><small>Top 100 · Jan–Aug 2026</small></div>
        <div><span>Agent visible</span><strong>{formatPercent(earlier.agentParticipationShare)} <i>→</i> {formatPercent(later.agentParticipationShare)}</strong><small>同一组 55 个仓库</small></div>
        <div><span>PR completed in 30 days</span><strong>{formatPercent(earlier.pullRequestResolvedWithin30dShare)} <i>→</i> {formatPercent(later.pullRequestResolvedWithin30dShare)}</strong><small>2025 → 2026</small></div>
      </section>
    </article>
  );
}

function LandscapeSlide({
  projects,
  stats,
}: {
  projects: LandscapeProject[];
  stats: InclusionResearchStats;
}) {
  const [view, setView] = useState<"agent" | "model">("agent");
  return (
    <article className={styles.landscapeSlide}>
      <div className={styles.landscapeCanvas}>
        <LandscapeExplorer projects={projects} embedOnly={view} presentationMode />
      </div>
      <div className={styles.landscapeSwitcher} aria-label="切换全景图">
        <span>2026 OPEN-SOURCE LANDSCAPE</span>
        <button
          type="button"
          data-active={view === "agent"}
          aria-pressed={view === "agent"}
          onClick={() => setView("agent")}
        >
          Agent Infra · {stats.agent}
        </button>
        <button
          type="button"
          data-active={view === "model"}
          aria-pressed={view === "model"}
          onClick={() => setView("model")}
        >
          Model Infra · {stats.model}
        </button>
      </div>
    </article>
  );
}

function TrendSlide({ stats }: { stats: InclusionResearchStats }) {
  const movers = stats.growthLeaders;
  const maxGrowth = Math.max(...movers.map((item) => item.growth));
  const application = stats.agentMacro.find((item) => item.label === "Application");
  const serving = stats.modelMacro.find((item) => item.label === "Serving");
  return (
    <article className={styles.standardSlide}>
      <SlideHeader
        title={<>应用层仍最活跃，近期增长已经扩散到 Runtime 和推理基础设施。</>}
        body={<>7 月 OpenRank 仍主要集中在成熟应用和 Serving 项目；4 月以来的增长榜则同时出现开发入口、上下文工具与推理基础设施。生态关注点正在沿着 Agent 的完整运行链路展开。</>}
      />
      <section className={styles.trendBody}>
        <div className={styles.trendSummary}>
          <article>
            <span>Agent Infra · July OpenRank</span>
            <strong>{application?.openrankShare ?? 0}%</strong>
            <p>来自 Application</p>
          </article>
          <article>
            <span>Model Infra · July OpenRank</span>
            <strong>{serving?.openrankShare ?? 0}%</strong>
            <p>来自 Serving</p>
          </article>
          <article>
            <span>Created since 2025</span>
            <strong>{Math.round((stats.agentRecent / stats.agent) * 100)}%</strong>
            <p>Agent Infra 入选项目</p>
          </article>
        </div>
        <div className={styles.trendMovers}>
          <header><h3>4–7 月 OpenRank 增长</h3><span>技术位置</span><span>增量</span></header>
          {movers.map((item, index) => (
            <div key={item.repo}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.name}</h3>
              <small>{item.zone}</small>
              <i><em style={{ "--width": `${(item.growth / maxGrowth) * 100}%` } as CSSProperties} /></i>
              <strong>+{item.growth.toFixed(1)}</strong>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function MethodSlide({ stats }: { stats: InclusionResearchStats }) {
  const collaboration = stats.collaboration;
  const methods = [
    ["100", "个高活跃仓库", "用完整记录计算 Issue、PR、积压、Release 和核心参与者。"],
    [collaboration.sampleThreads.toLocaleString("en-US"), "条公开线程", "每个仓库固定 50 条，逐条还原回应、Review 和修改过程。"],
    [String(collaboration.systemPressure.matchedRepositories), "个历史可比仓库", "固定仓库成员，比较 2024、2025、2026 年相同的前八个月。"],
    ["10", "条代码沿革案例", "继续追踪第一笔 Agent patch 到最终合入，九条可还原到行。"],
  ];
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>我们把仓库总量和协作过程分开看。</>} body={<>Top 100 来自 2026 年 7 月 OpenRank。所有 2026 年行为都截止到 8 月 31 日；图表按问题选择完整仓库记录或公开线程时间线。</>} />
      <section className={styles.methodBand}>
        {methods.map((item, index) => <article key={item[1]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item[0]}</strong><h3>{item[1]}</h3><p>{item[2]}</p></article>)}
      </section>
      <p className={styles.methodFooter}>完整记录回答“发生了多少”；线程时间线回答“协作怎样发生”。</p>
    </article>
  );
}

function FlowSlide({ stats }: { stats: InclusionResearchStats }) {
  const activity = stats.collaboration.activityFlow;
  const monthlyMax = Math.max(...activity.monthly.flatMap((item) => [item.issues, item.pullRequests]));
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>PR 流入增长最快，8 月已达到每个 Issue 对应 2.11 个 PR。</>} body={<>Top 100 在 1 月至 8 月收到 {formatCompact(activity.pullRequestsOpened)} 条 PR 和 {formatCompact(activity.issuesOpened)} 条 Issue。PR / Issue 比值从 1 月的 1.35 上升到 8 月的 2.11，维护工作的入口越来越像一条代码队列。</>} />
      <section className={styles.flowChart} aria-label="Top 100 monthly Issue and pull request intake">
        <div className={styles.flowTotals}><p><span>Issues</span><strong>{formatCompact(activity.issuesOpened)}</strong></p><p><span>Pull requests</span><strong>{formatCompact(activity.pullRequestsOpened)}</strong></p></div>
        <div className={styles.monthAxis}>
          {activity.monthly.map((item) => <div key={item.month}><div className={styles.monthBars}><i data-series="issue" style={{ "--height": `${(item.issues / monthlyMax) * 100}%` } as CSSProperties} /><i data-series="pr" style={{ "--height": `${(item.pullRequests / monthlyMax) * 100}%` } as CSSProperties} /></div><b>{item.label}</b><span>{item.ratio.toFixed(2)}×</span></div>)}
        </div>
        <footer><span><i data-series="issue" />Issue</span><span><i data-series="pr" />Pull request</span><b>下方数字为当月 PR / Issue</b></footer>
      </section>
    </article>
  );
}

function BacklogSlide({ stats }: { stats: InclusionResearchStats }) {
  const history = stats.collaboration.systemPressure.history;
  const earlier = history.find((item) => item.year === 2025)!;
  const later = history.find((item) => item.year === 2026)!;
  const measures = [
    ["PR 流入", formatCompact(earlier.pullRequestsOpened), formatCompact(later.pullRequestsOpened), `+${Math.round((later.pullRequestsOpened / earlier.pullRequestsOpened - 1) * 100)}%`],
    ["仍未处理的 PR 净增", formatSignedCompact(earlier.pullRequestBalance), formatSignedCompact(later.pullRequestBalance), formatSignedCompact(later.pullRequestBalance - earlier.pullRequestBalance)],
    ["90 天后仍开放", formatPercent(earlier.pullRequestUnresolved90dShare), formatPercent(later.pullRequestUnresolved90dShare), signedPointChange(earlier.pullRequestUnresolved90dShare, later.pullRequestUnresolved90dShare)],
    ["仓库中位 90 天合入率", formatPercent(earlier.repositoryMedianPullRequestMerged90dShare), formatPercent(later.repositoryMedianPullRequestMerged90dShare), signedPointChange(earlier.repositoryMedianPullRequestMerged90dShare, later.repositoryMedianPullRequestMerged90dShare)],
  ];
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>更多 PR 进入仓库，也有更多 PR 留在队列里。</>} body={<>固定同一组 {stats.collaboration.systemPressure.matchedRepositories} 个仓库后，PR 流入一年增加 {formatCompact(later.pullRequestsOpened - earlier.pullRequestsOpened)}。Issue 的流入与关闭量基本平衡，压力主要积累在代码合入这一侧。</>} />
      <section className={styles.comparisonRows}>
        <header><span>同一批仓库</span><b>2025</b><b>2026</b><b>变化</b></header>
        {measures.map((item) => <div key={item[0]}><h3>{item[0]}</h3><span>{item[1]}</span><span>{item[2]}</span><strong data-negative={item[3].startsWith("−")}>{item[3]}</strong></div>)}
      </section>
    </article>
  );
}

function CoreSlide({ stats }: { stats: InclusionResearchStats }) {
  const history = stats.collaboration.systemPressure.pushHistory;
  const benchmarks = stats.collaboration.systemPressure.pushBenchmarks;
  const maxActors = Math.max(...benchmarks.map((item) => item.pushActors));
  const labels: Record<string, string> = { "Agentic AI Top 100": "Agentic AI", "Cloud Native benchmark": "Cloud Native", "Big Data benchmark": "Big Data" };
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>参与合入的账号变多了，核心写入仍然集中。</>} body={<>在同一组 55 个仓库中，有 PushEvent 的账号中位数从 2024 年的 13 个增至 2026 年的 25 个；但一半 PushEvent 通常只由 3 个账号完成。参与面在扩大，真正把变化写进仓库的核心圈仍然很小。</>} />
      <section className={styles.coreBody}>
        <div className={styles.coreHistory}><h3>同一组 Agentic AI 仓库</h3><div>{history.map((item, index) => <article key={item.year}><span>{item.year}</span><strong>{item.pushActors}</strong><small>个账号产生 PushEvent</small><b>{item.actorsForHalfOfPushes}</b><small>个账号完成一半 Push</small>{index < history.length - 1 ? <i aria-hidden="true" /> : null}</article>)}</div></div>
        <div className={styles.coreBenchmark}><h3>2026 年领域对比 · 仓库中位数</h3>{benchmarks.map((item) => <div key={item.label}><span>{labels[item.label] ?? item.label}</span><i><em style={{ "--width": `${(item.pushActors / maxActors) * 100}%` } as CSSProperties} /></i><strong>{item.pushActors}</strong><small>一半 Push 由 {item.actorsForHalfOfPushes} 人完成</small></div>)}</div>
      </section>
    </article>
  );
}

function AccessSlide({ stats }: { stats: InclusionResearchStats }) {
  const collaboration = stats.collaboration;
  const total = collaboration.explicitInvitations + collaboration.gatedPolicies + collaboration.restrictedCreationPolicies + collaboration.noDetectedPolicySignal;
  const policies = [
    ["明确邀请外部贡献", collaboration.explicitInvitations, "violet"],
    ["Issue-first、预批准或限定范围", collaboration.gatedPolicies, "blue"],
    ["未检测到限制性政策", collaboration.noDetectedPolicySignal, "quiet"],
    ["仅 collaborators 可创建 PR", collaboration.restrictedCreationPolicies, "pink"],
  ] as const;
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>多数仓库为 Agent 留下了规则，贡献入口仍由项目决定。</>} body={<>92 个仓库的默认分支上存在 Agent instruction 或工具目录。我们再逐个检查仓库设置与贡献政策：开放代码、允许创建 PR、是否鼓励外部贡献，是三件不同的事。</>} />
      <section className={styles.accessBody}>
        <div className={styles.agentReady}><strong>{collaboration.codingAgentRepositories}<small>/100</small></strong><h3>存在 coding-agent 文件或目录</h3><p>包括 AGENTS.md、CLAUDE.md，以及 .claude、.cursor、.codex、.gemini 等路径。</p></div>
        <div className={styles.policyChart}><h3>贡献政策怎么写</h3>{policies.map((item) => <div key={item[0]} data-color={item[2]}><span>{item[0]}</span><i><em style={{ "--width": `${(item[1] / total) * 100}%` } as CSSProperties} /></i><strong>{item[1]}</strong></div>)}<p>Codex 与 Claude Code 的 PR 页面可见，但创建权限只开放给 collaborators。</p></div>
      </section>
    </article>
  );
}

function HandoffSlide({ stats }: { stats: InclusionResearchStats }) {
  const stages = stats.collaboration.threadParticipationStages;
  const meta = {
    opened: ["发起工作", "全部 5,000 条线程"],
    response: ["参与回应", "Issue / PR 时间线"],
    review: ["参与 Review", "3,567 条 PR"],
    "final-state": ["最后状态动作", "已解决且能识别执行者"],
  } as const;
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>Agent 很少发起工作，最常在 Review 阶段出现。</>} body={<>我们只在 GitHub 明确显示 Agent、App，或贡献文本明确归因给 Agent 时计入。普通 User 账号仍负责大多数工作入口，也执行了 88.5% 的最后公开状态动作。</>} />
      <section className={styles.handoffPath}>{stages.map((stage, index) => <article key={stage.id}><header><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{meta[stage.id][0]}</h3><small>{meta[stage.id][1]}</small></div></header><div className={styles.actorMetric} data-actor="agent"><span>Agent / App</span><strong>{formatPercent(stage.agent / stage.denominator)}</strong><i style={{ "--width": `${(stage.agent / stage.denominator) * 100}%` } as CSSProperties} /></div><div className={styles.actorMetric} data-actor="user"><span>GitHub User</span><strong>{formatPercent(stage.user / stage.denominator)}</strong><i style={{ "--width": `${(stage.user / stage.denominator) * 100}%` } as CSSProperties} /></div></article>)}</section>
      <p className={styles.handoffNote}>仓库团队账号是 User 的子集，因此这里不另画第三条线；它在 Review 与最终决策阶段承担的比例最高。</p>
    </article>
  );
}

function TaskSlide({ stats }: { stats: InclusionResearchStats }) {
  const tasks = stats.collaboration.agentTaskEvents;
  const rows = [["Review", tasks.review], ["讨论与回复", tasks.discussion], ["分流与路由", tasks.triage], ["公开归因的 commit", tasks.codeCommit], ["打开 Issue / PR", tasks.openedThread]] as const;
  const maxValue = Math.max(...rows.map((item) => item[1]));
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>公开可见的 Agent 工作，主要是 Review、讨论和分流。</>} body={<>5,000 条线程关联了 {formatCompact(stats.collaboration.publicEventsAnalyzed)} 个公开事件。同一条线程可能包含多次 Review 或回复，因此这里展示的是动作数量，它说明 Agent 服务被放在了协作流程的什么位置。</>} />
      <section className={styles.taskChart}>{rows.map((item, index) => <div key={item[0]}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item[0]}</h3><i><em style={{ "--width": `${(item[1] / maxValue) * 100}%` } as CSSProperties} /></i><strong>{item[1].toLocaleString("en-US")}</strong></div>)}</section>
    </article>
  );
}

function ReviewSlide({ stats }: { stats: InclusionResearchStats }) {
  const collaboration = stats.collaboration;
  const reviewedCount = Math.round(collaboration.reviewedPrShare * collaboration.samplePullRequests);
  const followupCount = Math.round(collaboration.reviewedPrFollowupCommitShare * reviewedCount);
  const metrics = [
    ["出现过 Review", collaboration.reviewedPrShare, `${reviewedCount.toLocaleString("en-US")} / ${collaboration.samplePullRequests.toLocaleString("en-US")} PRs`],
    ["第一次 Review 后又有 commit", collaboration.reviewedPrFollowupCommitShare, `${followupCount.toLocaleString("en-US")} / ${reviewedCount.toLocaleString("en-US")} reviewed PRs`],
    ["CHANGES_REQUESTED 后又有 commit", collaboration.changeRequestFollowupCommitShare, "123 / 161 PRs"],
  ] as const;
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>一次明确的修改要求，通常会带来下一轮提交。</>} body={<>我们按时间排列抽样 PR 里的 Review 与 commit。所有 reviewed PR 中，55.0% 在第一次 Review 后继续提交；当 Review 明确标记 CHANGES_REQUESTED，这个比例升到 76.4%。</>} />
      <section className={styles.reviewSequence}>{metrics.map((item, index) => <article key={item[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{formatPercent(item[1])}</strong><h3>{item[0]}</h3><p>{item[2]}</p><i><em style={{ "--width": `${item[1] * 100}%` } as CSSProperties} /></i></article>)}</section>
      <p className={styles.reviewReading}>Review 并没有停在一条评论上。越具体的修改要求，越可能触发下一轮代码。</p>
    </article>
  );
}

const lineageCases = [
  { name: "ONNX Runtime #28045", href: "https://github.com/microsoft/onnxruntime/pull/28045", retained: 533, human: 78, agent: 0, unresolved: 0, text: "第一笔 Agent patch 有 611 行；合入时 533 行原样保留，另外 78 行后来由人类账号修改。" },
  { name: "OpenHands SDK #2614", href: "https://github.com/OpenHands/software-agent-sdk/pull/2614", retained: 0, human: 4, agent: 7, unresolved: 0, text: "最初的 11 行没有原样留下；4 行后来由人修改，7 行由后续 Agent commit 修改。" },
  { name: "Vercel AI SDK #18818", href: "https://github.com/vercel/ai/pull/18818", retained: 0, human: 0, agent: 172, unresolved: 0, text: "最初 172 行全部被后续 Agent commit 替换。Agent 生成的代码也会经历完整的自动迭代。" },
] as const;

function LineageSlide() {
  const [caseIndex, setCaseIndex] = useState(0);
  const selected = lineageCases[caseIndex];
  const total = selected.retained + selected.human + selected.agent + selected.unresolved;
  const overview = [["原样保留", 765, "violet"], ["后来由人修改", 123, "pink"], ["后来由 Agent 修改", 193, "blue"], ["作者无法确定", 144, "quiet"]] as const;
  const caseSegments = [["原样保留", selected.retained, "violet"], ["人类修改", selected.human, "pink"], ["Agent 修改", selected.agent, "blue"], ["作者不明", selected.unresolved, "quiet"]] as const;
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>第一笔 Agent patch 常被保留，也可能在合入前被彻底重写。</>} body={<>我们跟踪了 10 条 Agent 改过代码的已合并 PR；其中 9 条可以还原行级历史。第一笔 Agent patch 共 1,225 行，最终有 62.4% 原样留在合入版本里。</>} />
      <section className={styles.lineageOverview}><div className={styles.lineageStack}>{overview.map((item) => <i key={item[0]} data-color={item[2]} style={{ "--width": `${(item[1] / 1225) * 100}%` } as CSSProperties} />)}</div><div className={styles.lineageLegend}>{overview.map((item) => <span key={item[0]} data-color={item[2]}><i /><b>{formatPercent(item[1] / 1225)}</b>{item[0]}</span>)}</div></section>
      <section className={styles.lineageCase}>
        <nav aria-label="选择代码沿革案例">{lineageCases.map((item, index) => <button key={item.name} type="button" data-active={index === caseIndex} onClick={() => setCaseIndex(index)}>{item.name}</button>)}</nav>
        <div><header><h3>{selected.name}</h3><a href={selected.href} target="_blank" rel="noreferrer">查看 PR <ExternalLinkIcon aria-hidden="true" /></a></header><div className={styles.caseStack}>{caseSegments.filter((item) => item[1] > 0).map((item) => <i key={item[0]} data-color={item[2]} style={{ "--width": `${(item[1] / total) * 100}%` } as CSSProperties} />)}</div><p>{selected.text}</p></div>
      </section>
    </article>
  );
}

function OutcomeSlide({ stats }: { stats: InclusionResearchStats }) {
  const years = stats.collaboration.threadPanel.years;
  const earlier = years.find((item) => item.year === 2025)!;
  const later = years.find((item) => item.year === 2026)!;
  const rows = [
    ["出现具名 Agent 或 App", earlier.agentParticipationShare, later.agentParticipationShare, "up"],
    ["PR 出现公开 Review", earlier.pullRequestReviewedShare, later.pullRequestReviewedShare, "up"],
    ["7 天内仓库维护者响应", earlier.maintainerResponseWithin7dShare, later.maintainerResponseWithin7dShare, "down"],
    ["PR 在 30 天内处理完成", earlier.pullRequestResolvedWithin30dShare, later.pullRequestResolvedWithin30dShare, "down"],
  ] as const;
  return (
    <article className={styles.standardSlide}>
      <SlideHeader title={<>Agent 和 Review 出现得更多，响应与完成速度却没有跟上。</>} body={<>我们在同一组 55 个仓库中，为 2025 和 2026 各取 2,750 条线程。更多 PR 进入公开 Review，但维护者第一周回应和 PR 的 30 天完成率同时下降。</>} />
      <section className={styles.outcomeGrid}>{rows.map((item) => <article key={item[0]} data-tone={item[3]}><h3>{item[0]}</h3><div><span>2025</span><strong>{formatPercent(item[1])}</strong></div><i aria-hidden="true"><em /></i><div><span>2026</span><strong>{formatPercent(item[2])}</strong></div><b>{signedPointChange(item[1], item[2])}</b></article>)}</section>
      <p className={styles.outcomeReading}>Review 容量在增加；维护者完成取舍、验证和合入的速度没有按同样幅度扩大。</p>
    </article>
  );
}

function DeepSeekSlide() {
  return (
    <article className={styles.deepseekSlide}>
      <section className={styles.deepseekCopy}><p>一个不同的贡献设计</p><h2>DeepSeek Harness 把外部扩展放在核心仓库之外。</h2><p>核心代码使用 MIT 许可证，Issues 和 Pull Requests 关闭，Discussions 开放；贡献指南把社区开发导向第三方插件。代码可以自由使用，不代表核心仓库必须接收外部改动。</p><blockquote>“an idea, an official showcase, and a source of inspiration”</blockquote></section>
      <section className={styles.deepseekSurface}><header><span>13–30 August 2026</span><strong>DeepSeek<br />Harness</strong></header><div><strong>204K+</strong><span>GitHub Stars in 17 days</span><small>23.6K forks</small></div><dl><div><dt>LICENSE</dt><dd>MIT</dd></div><div><dt>ISSUES</dt><dd>关闭</dd></div><div><dt>PULL REQUESTS</dt><dd>关闭</dd></div><div><dt>DISCUSSIONS</dt><dd>开放</dd></div><div><dt>EXTENSION</dt><dd>dsh-plugin</dd></div></dl></section>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.closingSlide}>
      <section><p>OPEN-SOURCE COLLABORATION IN THE AGENT ERA</p><h2>Agent 让 patch 的起点更便宜。<br />项目能走多远，仍取决于社区能否把变化接住。</h2></section>
      <div className={styles.closingPath}><span>生成代码</span><i /><span>回应问题</span><i /><span>接受 Review</span><i /><span>完成验证与合入</span><i /><strong>长期维护</strong></div>
      <p className={styles.closingText}>这份公开记录里，Agent 已经扩大了代码、Review 和修订的供给。开源贡献仍然包括理解项目的问题、遵守仓库规则、回应具体修改，并留下一个社区愿意继续承担的结果。</p>
      <footer><Link href="/presentations/260910_inclusion">完整报告与研究方法 <ExternalLinkIcon aria-hidden="true" /></Link><div><Image src="/community-logos/ant-open-source.png" alt="Ant Open Source" width={1282} height={389} /><i aria-hidden="true" /><Image src="/community-logos/inclusionai.png" alt="InclusionAI" width={1612} height={466} /></div></footer>
    </article>
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
function signedPointChange(earlier: number, later: number) {
  const difference = (later - earlier) * 100;
  return `${difference >= 0 ? "+" : "−"}${Math.abs(difference).toFixed(1)} pp`;
}
