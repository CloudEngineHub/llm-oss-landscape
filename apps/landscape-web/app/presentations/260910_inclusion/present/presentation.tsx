"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { Button } from "@/components/ui/button";
import type { LandscapeProject } from "@/lib/landscape-types";

import type { InclusionResearchStats } from "../research-data";
import styles from "./presentation.module.css";

type PresentationStats = InclusionResearchStats & {
  agentParticipants: number;
  modelParticipants: number;
};
type SwipeStart = { pointerId: number; x: number; y: number };

const scenes = [
  { id: "cover", label: "开场", time: "00:35" },
  { id: "agent-landscape", label: "Agent 全景", time: "00:55" },
  { id: "model-landscape", label: "Model 全景", time: "00:55" },
  { id: "landscape-signals", label: "版图信号", time: "01:05" },
  { id: "method", label: "研究设计", time: "00:55" },
  { id: "activity", label: "协作规模", time: "01:05" },
  { id: "participation", label: "参与位置", time: "01:10" },
  { id: "review", label: "Review 链路", time: "01:00" },
  { id: "efficiency", label: "效率实验", time: "01:15" },
  { id: "deepseek", label: "治理案例", time: "00:50" },
  { id: "close", label: "结论", time: "00:35" },
] as const;

type SceneId = (typeof scenes)[number]["id"];
type RevealableSceneId = "agent-landscape" | "model-landscape";
const revealableScenes = new Set<SceneId>(["agent-landscape", "model-landscape"]);

export default function InclusionPresentation({
  projects,
  stats,
}: {
  projects: LandscapeProject[];
  stats: PresentationStats;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [landscapeReveals, setLandscapeReveals] = useState<
    Record<RevealableSceneId, boolean>
  >({ "agent-landscape": false, "model-landscape": false });
  const swipeStart = useRef<SwipeStart | null>(null);
  const scene = scenes[sceneIndex];

  const next = useCallback(() => {
    if (
      revealableScenes.has(scene.id) &&
      !landscapeReveals[scene.id as RevealableSceneId]
    ) {
      setLandscapeReveals((current) => ({ ...current, [scene.id]: true }));
      return;
    }
    setSceneIndex((current) => Math.min(scenes.length - 1, current + 1));
  }, [landscapeReveals, scene.id]);

  const previous = useCallback(() => {
    if (
      revealableScenes.has(scene.id) &&
      landscapeReveals[scene.id as RevealableSceneId]
    ) {
      setLandscapeReveals((current) => ({ ...current, [scene.id]: false }));
      return;
    }
    setSceneIndex((current) => Math.max(0, current - 1));
  }, [landscapeReveals, scene.id]);

  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

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
      if (/^[1-9]$/.test(event.key)) setSceneIndex(Number(event.key) - 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterFullscreen, next, previous]);

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

  function jumpTo(index: number) {
    const target = scenes[index];
    if (revealableScenes.has(target.id)) {
      setLandscapeReveals((current) => ({ ...current, [target.id]: false }));
    }
    setSceneIndex(index);
  }

  const currentReveal = revealableScenes.has(scene.id)
    ? landscapeReveals[scene.id as RevealableSceneId]
    : false;

  return (
    <main
      className={styles.stage}
      lang="zh-CN"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      <section className={styles.deck} aria-live="polite">
        <header className={styles.stageHeader}>
          <Link className={styles.backLink} href="/presentations/260910_inclusion">
            <ArrowLeftIcon aria-hidden="true" />在线报告
          </Link>
          <strong>{scene.label}</strong>
          <div className={styles.stageHeaderRight}>
            <span>{scene.time}</span>
            <Button variant="ghost" size="lg" onClick={() => void enterFullscreen()}>
              <Maximize2Icon data-icon="inline-start" aria-hidden="true" />全屏
            </Button>
          </div>
        </header>

        <div className={styles.scene} data-stage-scene={scene.id} key={scene.id}>
          <Scene
            id={scene.id}
            projects={projects}
            stats={stats}
            revealed={currentReveal}
            onReveal={() =>
              setLandscapeReveals((current) => ({
                ...current,
                [scene.id as RevealableSceneId]: true,
              }))
            }
          />
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
                onClick={() => jumpTo(index)}
              >
                <i />
                <span className={styles.srOnly}>{item.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.pager}>
            <span>
              {String(sceneIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
            </span>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={previous}
              disabled={sceneIndex === 0}
              aria-label="上一页"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={next}
              disabled={sceneIndex === scenes.length - 1}
              aria-label="下一页"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
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
  revealed,
  onReveal,
}: {
  id: SceneId;
  projects: LandscapeProject[];
  stats: PresentationStats;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (id === "cover") return <CoverSlide />;
  if (id === "agent-landscape") {
    return (
      <LandscapeSlide
        kind="agent"
        projects={projects}
        stats={stats}
        revealed={revealed}
        onReveal={onReveal}
      />
    );
  }
  if (id === "model-landscape") {
    return (
      <LandscapeSlide
        kind="model"
        projects={projects}
        stats={stats}
        revealed={revealed}
        onReveal={onReveal}
      />
    );
  }
  if (id === "landscape-signals") return <LandscapeSignalsSlide stats={stats} />;
  if (id === "method") return <MethodSlide stats={stats} />;
  if (id === "activity") return <ActivitySlide stats={stats} />;
  if (id === "participation") return <ParticipationSlide stats={stats} />;
  if (id === "review") return <ReviewSlide stats={stats} />;
  if (id === "efficiency") return <EfficiencySlide stats={stats} />;
  if (id === "deepseek") return <DeepSeekSlide />;
  return <ClosingSlide />;
}

function CoverSlide() {
  return (
    <article className={styles.coverSlide}>
      <div className={styles.coverMain}>
        <small>2026 INCLUSION CONFERENCE · 2026 年 9 月</small>
        <h1>
          Agent 进入
          <br />
          <span>开源协作</span>之后
        </h1>
        <p>一份关于基础设施版图、公开协作链路与维护者压力的实证研究</p>
      </div>
      <section className={styles.coverEvidence}>
        <div><strong>143</strong><span>个 Agent 与 Model 基础设施项目</span></div>
        <div><strong>95.7 万</strong><span>条 Issue / PR 公开记录</span></div>
        <p>我们沿着 Landscape 里的活跃项目继续向下追踪：Agent 出现在哪里，工作量怎样变化，维护者是否真的因此更轻松。</p>
      </section>
      <footer className={styles.coverFooter}>
        <span>ANT OPEN SOURCE × INCLUSIONAI 联合发布</span>
        <div>
          <Image
            src="/community-logos/ant-open-source.png"
            alt="Ant Open Source"
            width={1282}
            height={389}
            priority
          />
          <i />
          <Image
            src="/community-logos/inclusionai.png"
            alt="InclusionAI"
            width={1612}
            height={466}
            priority
          />
        </div>
      </footer>
    </article>
  );
}

function LandscapeSlide({
  kind,
  projects,
  stats,
  revealed,
  onReveal,
}: {
  kind: "agent" | "model";
  projects: LandscapeProject[];
  stats: PresentationStats;
  revealed: boolean;
  onReveal: () => void;
}) {
  const isAgent = kind === "agent";
  const groups = isAgent ? stats.agentMacro : stats.modelMacro;
  const leaders = projects
    .filter((project) => (isAgent ? project.stage !== "model" : project.stage === "model"))
    .sort((a, b) => (b.openrank ?? -1) - (a.openrank ?? -1))
    .slice(0, 5);
  return (
    <article className={styles.landscapeSlide} data-kind={kind} data-revealed={revealed}>
      <header className={styles.landscapeHeader}>
        <div>
          <strong>{isAgent ? "Agent Infra" : "Model Infra"}</strong>
          <span>{isAgent ? stats.agent : stats.model} 个入选项目 · 2026</span>
        </div>
        <Button variant="outline" size="sm" onClick={onReveal} disabled={revealed}>
          {revealed ? "图中信号" : "查看图中信号 →"}
        </Button>
      </header>
      <div className={styles.landscapeCanvas}>
        <LandscapeExplorer projects={projects} embedOnly={kind} presentationMode />
      </div>
      <section className={styles.landscapeEvidence} aria-hidden={!revealed}>
        <div>
          <strong>
            {isAgent
              ? `${Math.round((stats.agentRecent / stats.agent) * 100)}%`
              : `${Math.round((stats.modelRecent / stats.model) * 100)}%`}
          </strong>
          <span>项目创建于 2025 年或以后</span>
        </div>
        <div>
          <strong>{groups[0]?.openrankShare ?? 0}%</strong>
          <span>
            {groups[0]?.label} 占该版图 7 月 OpenRank 的比例
          </span>
        </div>
        <div className={styles.landscapeLeaders}>
          {leaders.map((project) => (
            <p key={project.repo}>
              <b>{project.name}</b>
              <span>{project.openrank?.toFixed(1)}</span>
            </p>
          ))}
        </div>
      </section>
    </article>
  );
}

function ReportHeader({ title, body }: { title: ReactNode; body: ReactNode }) {
  return (
    <header className={styles.reportHeader}>
      <h2>{title}</h2>
      <p>{body}</p>
    </header>
  );
}

function LandscapeSignalsSlide({ stats }: { stats: PresentationStats }) {
  const movers = stats.growthLeaders.slice(0, 6);
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>应用仍然最热，基础设施新增供给已经向 Runtime 与 Serving 聚集。</>}
        body={<>Agent Infra 的 32 个应用项目贡献了 55% 的 7 月 OpenRank，但相较 5 月新增的 23 个 Agent Infra 项目中，有 13 个落在 Runtime。Model Infra 的 Serving 与 Pre-Train 合计占 75% 活跃度。增长榜同时出现 Lark CLI、OpenViking、FlashInfer 与 DeepSeek Reasonix，说明终端入口、长期上下文和推理效率正在一起被拉动。</>}
      />
      <div className={styles.signalBody}>
        <section className={styles.moverTable}>
          <h3>4 月—7 月 OpenRank 增长</h3>
          {movers.map((item, index) => (
            <div key={item.repo}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{item.name}</b>
              <small>{item.zone}</small>
              <i>
                <em
                  style={
                    {
                      "--bar": `${(item.growth / movers[0].growth) * 100}%`,
                      "--delay": `${index * 80}ms`,
                    } as CSSProperties
                  }
                />
              </i>
              <strong>+{item.growth.toFixed(1)}</strong>
            </div>
          ))}
        </section>
        <section className={styles.runtimeReport}>
          <h3>Agent Runtime 的公开项目分布</h3>
          <p>
            31 个 Runtime 项目覆盖从上下文到结果证据的完整链路。越靠近隔离与验证，项目数量越少，
            这也是当前版图里最清晰的基础设施缺口。
          </p>
          <div>
            {stats.runtimePath.map((item) => (
              <article key={item.label}>
                <strong>{item.projects}</strong>
                <span>{item.shortLabel}</span>
                <small>{item.examples.map((example) => example.name).join(" · ")}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

function MethodSlide({ stats }: { stats: PresentationStats }) {
  const collaboration = stats.collaboration;
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>规模、协作链路和年度变化，分别用不同的证据回答。</>}
        body={<>OpenRank 只负责从 277 个追踪项目中确定 Top 100。规模问题使用今年以来的全部 Issue / PR；协作链路按每个仓库 50 条均衡抽样；年度变化采用成员固定的历史队列。均衡样本适合观察“典型仓库”的协作过程，不代表按全网流量加权的总体比例。</>}
      />
      <table className={styles.reportTable}>
        <thead>
          <tr>
            <th>证据范围</th>
            <th>包含什么</th>
            <th>用来回答什么</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Top 100 仓库</th>
            <td>2026 年 7 月 OpenRank 最高的 100 个项目</td>
            <td>仓库类型、协作规则、Agent 文件、Release 与今年全部 Issue / PR</td>
          </tr>
          <tr>
            <th>固定 53 仓库历史队列</th>
            <td>当前 Top 100 中，2024 年 1 月前已经公开的仓库</td>
            <td>比较 2024—2026 年相同 1—8 月窗口，避免新增项目改变样本</td>
          </tr>
          <tr>
            <th>5,000 条均衡样本</th>
            <td>
              每仓库 50 条；{collaboration.sampleThreads - collaboration.samplePullRequests} 条 Issue、
              {collaboration.samplePullRequests.toLocaleString("en-US")} 条 PR、
              {formatCompact(collaboration.publicEventsAnalyzed)} 个公开事件
            </td>
            <td>谁发起、谁回应、谁 Review、谁执行最后的合并或关闭动作</td>
          </tr>
          <tr>
            <th>10 个仓库同期面板</th>
            <td>600 条 2025 / 2026 同期线程；完整实验共 {collaboration.efficiencyExperiment.sampleThreads} 条</td>
            <td>进入仓库的任务、Agent 可见度、响应速度与 30 天结果如何变化</td>
          </tr>
          <tr>
            <th>代码沿革与公开案例</th>
            <td>10 条 Agent 改过代码的已合并 PR；7 条可阅读的协作案例</td>
            <td>Agent 的第一笔代码后来保留多少，交接与治理选择如何发生</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function ActivitySlide({ stats }: { stats: PresentationStats }) {
  const activity = stats.collaboration.activityFlow;
  const history = activity.history;
  const maxMonthly = Math.max(...activity.monthly.flatMap((item) => [item.issues, item.pullRequests]));
  const maxHistory = Math.max(...history.flatMap((item) => [item.issues, item.pullRequests]));
  const prGrowth = ((history[2].pullRequests / history[1].pullRequests) - 1) * 100;
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>同一批仓库在一年里多收到了 {Math.round(prGrowth)}% 的 Pull Requests。</>}
        body={<>Top 100 在 2026 年 1—8 月共打开约 {formatCompact(activity.pullRequestsOpened)} 条 PR 和 {formatCompact(activity.issuesOpened)} 条 Issue。固定 53 个仓库后，2025 到 2026 年的 Issue 从 {formatCompact(history[1].issues)} 降到 {formatCompact(history[2].issues)}，PR 却从 {formatCompact(history[1].pullRequests)} 增至 {formatCompact(history[2].pullRequests)}。协作入口正在从“提出问题”转向“直接提交改动”。</>}
      />
      <div className={styles.activityBody}>
        <section className={styles.monthlyChart} aria-label="2026 年每月 Issue 与 Pull Request 数量">
          <h3>2026 年每月进入 Top 100 的 Issue 与 PR</h3>
          <div className={styles.monthlyBars}>
            {activity.monthly.map((item) => (
              <div key={item.month}>
                <i
                  data-series="issue"
                  style={{ "--height": `${(item.issues / maxMonthly) * 100}%` } as CSSProperties}
                />
                <i
                  data-series="pr"
                  style={{ "--height": `${(item.pullRequests / maxMonthly) * 100}%` } as CSSProperties}
                />
                <span>{item.label}</span>
                <small>{item.ratio.toFixed(2)}×</small>
              </div>
            ))}
          </div>
          <footer><span>Issue</span><span>Pull Request</span><b>PR / Issue 比值：1.35 → 2.11</b></footer>
        </section>
        <section className={styles.historyChart} aria-label="固定 53 个仓库 2024 至 2026 年活动">
          <h3>固定 53 个仓库 · 相同 1—8 月窗口</h3>
          {history.map((item, index) => (
            <div key={item.year}>
              <strong>{item.year}</strong>
              <p>
                <i style={{ "--width": `${(item.issues / maxHistory) * 100}%` } as CSSProperties} />
                <span>Issue {formatCompact(item.issues)}</span>
              </p>
              <p>
                <i style={{ "--width": `${(item.pullRequests / maxHistory) * 100}%` } as CSSProperties} />
                <span>PR {formatCompact(item.pullRequests)}</span>
              </p>
              <b>{index === 0 ? "基线" : `PR 同比 +${Math.round((item.pullRequests / history[index - 1].pullRequests - 1) * 100)}%`}</b>
            </div>
          ))}
        </section>
      </div>
    </article>
  );
}

const stageMeta = {
  opened: ["发起工作", "全部 5,000 条 Issue / PR"],
  response: ["参与回应", "全部 5,000 条线程"],
  review: ["参与 PR Review", "3,567 条抽样 PR"],
  "final-state": ["执行最后公开动作", "收集时已解决且能识别最后执行者的线程"],
} as const;

function ParticipationSlide({ stats }: { stats: PresentationStats }) {
  const collaboration = stats.collaboration;
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>Agent 很少发起工作，公开参与主要发生在回应与 Review。</>}
        body={<>我们只在 GitHub 明确显示 Agent、GitHub App，或提交文本明确归因给 Agent 时计入。5,000 条样本中，Agent 参与出现在 {collaboration.participationSampleThreads.toLocaleString("en-US")} 条线程，但由 Agent 直接打开的只有 {collaboration.participationOpenerSampleThreads} 条。普通 User 账号仍贯穿绝大多数公开链路，仓库团队账号在 Review 与最终状态变更中承担更高比例。</>}
      />
      <table className={`${styles.reportTable} ${styles.participationTable}`}>
        <thead>
          <tr>
            <th>公开协作阶段</th>
            <th>可识别 Agent / App</th>
            <th>GitHub User 账号</th>
            <th>仓库团队账号</th>
          </tr>
        </thead>
        <tbody>
          {collaboration.threadParticipationStages.map((stage, index) => (
            <tr key={stage.id}>
              <th>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><b>{stageMeta[stage.id][0]}</b><small>{stageMeta[stage.id][1]}</small></div>
              </th>
              {(["agent", "user", "repositoryTeam"] as const).map((actor) => (
                <td key={actor} data-actor={actor}>
                  <strong>{formatPercent(stage[actor] / stage.denominator)}</strong>
                  <span>{stage[actor].toLocaleString("en-US")} / {stage.denominator.toLocaleString("en-US")}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.definitionStrip}>
        <p><b>Agent / App</b>CodeRabbit、Gemini Code Assist、OpenHands 等公开身份；本地使用 Cursor、Claude Code 或 Codex 后以普通账号提交，无法从公开数据识别。</p>
        <p><b>仓库团队账号</b>GitHub 把该账号标为 OWNER、MEMBER 或 COLLABORATOR；它可以同时也是 User，也可能通过 App 执行动作，所以三列并非互斥。</p>
      </div>
    </article>
  );
}

function ReviewSlide({ stats }: { stats: PresentationStats }) {
  const collaboration = stats.collaboration;
  const segments = [
    { label: "原样保留", value: 765, color: "signal" },
    { label: "后来由人修改", value: 123, color: "agent" },
    { label: "后来由 Agent 修改", value: 193, color: "model" },
    { label: "作者无法确定", value: 144, color: "quiet" },
  ];
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const metrics = [
    ["出现过 Review 的抽样 PR", collaboration.reviewedPrShare],
    ["第一次 Review 后继续提交", collaboration.reviewedPrFollowupCommitShare],
    ["Changes requested 后继续提交", collaboration.changeRequestFollowupCommitShare],
  ] as const;
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>Agent 代码进入仓库后，Review 往往开启下一轮人机共同修订。</>}
        body={<>3,567 条抽样 PR 中，{formatPercent(collaboration.reviewedPrShare)} 出现过 Review；完成第一次 Review 后，{formatPercent(collaboration.reviewedPrFollowupCommitShare)} 继续产生新 commit。我们又追踪 10 条已合并、且有 Coding Agent 改动代码的 PR：9 条可以还原行级历史，第一笔 Agent patch 的 1,225 行中有 765 行原样保留。</>}
      />
      <div className={styles.reviewBody}>
        <section className={styles.reviewMetrics}>
          {metrics.map(([label, value]) => (
            <div key={label}><strong>{formatPercent(value)}</strong><span>{label}</span></div>
          ))}
        </section>
        <section className={styles.lineageReport}>
          <header><strong>62.4%</strong><span>第一笔 Agent patch 的文本行在合并时原样保留</span></header>
          <div className={styles.lineageBar}>
            {segments.map((item) => (
              <i
                key={item.label}
                data-color={item.color}
                style={{ "--width": `${(item.value / total) * 100}%` } as CSSProperties}
              />
            ))}
          </div>
          <dl>
            {segments.map((item) => (
              <div key={item.label} data-color={item.color}><dt>{item.value}</dt><dd>{item.label}</dd></div>
            ))}
          </dl>
        </section>
      </div>
      <div className={styles.caseRows}>
        <p><b>ONNX Runtime #28045</b><span>611 行第一笔 Agent patch 中，533 行原样保留，78 行后来由人类账号修改。</span></p>
        <p><b>OpenHands SDK #2614</b><span>最初 11 行没有原样留下；4 行后来由人修改，7 行由后续 Agent 修改。</span></p>
        <p><b>Vercel AI SDK #18818</b><span>最初 172 行全部被后续 Agent 提交替换，说明“Agent 生成”本身也包含多轮自动迭代。</span></p>
      </div>
    </article>
  );
}

function EfficiencySlide({ stats }: { stats: PresentationStats }) {
  const experiment = stats.collaboration.efficiencyExperiment;
  const selectedKeys = new Set([
    "human_response_7d",
    "maintainer_response_7d",
    "issue_closed_30d",
    "pr_merged_30d",
    "maintainer_actions_30d",
  ]);
  const labels: Record<string, string> = {
    human_response_7d: "7 天内出现人类回应",
    maintainer_response_7d: "7 天内出现维护者回应",
    issue_closed_30d: "Issue 在 30 天内关闭",
    pr_merged_30d: "PR 在 30 天内合入",
    maintainer_actions_30d: "每条线程的维护者动作",
  };
  const rows = experiment.panel.filter((item) => selectedKeys.has(item.key));
  const exposure = Object.fromEntries(experiment.exposure.map((item) => [item.key, item]));
  return (
    <article className={styles.reportSlide}>
      <ReportHeader
        title={<>Agent 扩大了吞吐，但维护者的及时响应没有同步增长。</>}
        body={<>在同一批 10 个仓库、相同 5—8 月窗口中，进入仓库的 Issue / PR 从 38.4K 增至 101.9K，可见 Agent 参与从 33.5% 升至 54.4%。与此同时，7 天维护者响应从 42.9% 降至 20.0%，30 天 Issue 关闭和 PR 合入率也下降。这个同期面板描述工作负荷变化，不把相关性解释成 Agent 单独造成的因果结果。</>}
      />
      <div className={styles.efficiencyBody}>
        <table className={`${styles.reportTable} ${styles.efficiencyTable}`}>
          <thead><tr><th>同一批仓库的协作指标</th><th>2025</th><th>2026</th><th>变化</th></tr></thead>
          <tbody>
            <tr className={styles.volumeRow}><th>进入仓库的 Issue / PR</th><td>{formatCompact(experiment.population.earlier)}</td><td>{formatCompact(experiment.population.later)}</td><td>2.65×</td></tr>
            <tr><th>可见 Agent 参与线程</th><td>{formatPercent(experiment.adoption.allAgentsEarlier)}</td><td>{formatPercent(experiment.adoption.allAgentsLater)}</td><td>{signedPointChange(experiment.adoption.allAgentsEarlier, experiment.adoption.allAgentsLater)}</td></tr>
            {rows.map((item) => (
              <tr key={item.key}>
                <th>{labels[item.key]}</th>
                <td>{formatMetric(item.earlier, item.format)}</td>
                <td>{formatMetric(item.later, item.format)}</td>
                <td>{item.format === "percent" ? signedPointChange(item.earlier, item.later) : signedNumber(item.later - item.earlier)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className={styles.efficiencyReading}>
          <h3>Agent 参与更多，不等于 30 天内更容易合入。</h3>
          <p>
            2026 年样本中，前 24 小时出现 Coding / Review Agent 的 PR，30 天合入率是
            {formatPercent(exposure.pr_merged_30d.agentVisible)}；未看到这类 Agent 的 PR 是
            {formatPercent(exposure.pr_merged_30d.noVisibleAgent)}，结果接近。
          </p>
          <p>
            差异主要体现在过程：前者平均有 {exposure.conversation_runs_30d.agentVisible.toFixed(2)} 轮公开对话，
            后者为 {exposure.conversation_runs_30d.noVisibleAgent.toFixed(2)}；第一次 Review 后的 commit
            分别为 {exposure.commits_after_first_review_30d.agentVisible.toFixed(2)} 与
            {exposure.commits_after_first_review_30d.noVisibleAgent.toFixed(2)}。Agent 让迭代更密集，
            但没有在这组样本里显示出明确的结果优势。
          </p>
        </section>
      </div>
    </article>
  );
}

function DeepSeekSlide() {
  return (
    <article className={`${styles.reportSlide} ${styles.deepseekSlide}`}>
      <section className={styles.deepseekStory}>
        <h2>DeepSeek Harness 把“代码公开”和“核心仓库开放贡献”分开了。</h2>
        <blockquote>
          “You may consider this repository an idea, an official showcase, and a source of
          inspiration, but not a mandate from us.”
        </blockquote>
        <p>
          仓库把官方代码定位为参考实现，把第三方插件作为生态继续生长的主要入口。这种安排把接口稳定、
          插件发现，以及不安全或无人维护插件的处置，留给核心仓库之外的治理机制。
        </p>
      </section>
      <section className={styles.deepseekEvidence}>
        <header><span>2026 年 8 月 13 日开源</span><h3>DeepSeek<br />Harness</h3></header>
        <div className={styles.deepseekHero}><strong>204K+</strong><span>17 天内获得的 GitHub Stars</span><small>23.6K forks</small></div>
        <dl>
          <div><dt>LICENSE</dt><dd>MIT</dd></div>
          <div><dt>ISSUES</dt><dd>关闭</dd></div>
          <div><dt>PULL REQUESTS</dt><dd>关闭</dd></div>
          <div><dt>DISCUSSIONS</dt><dd>开放</dd></div>
          <div><dt>EXTENSION PATH</dt><dd>dsh-plugin</dd></div>
        </dl>
      </section>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.closingSlide}>
      <h2>吞吐已经增长，协作能力仍取决于筛选、验证与责任交接。</h2>
      <section className={styles.closingReading}>
        <p>基础设施版图已经从应用扩展到 Runtime、Serving、隔离与结果证据。公开协作记录里，Agent 最常出现在回应、Review 和代码修订阶段，发起工作与最后的状态变更仍主要由人类账号完成。</p>
        <div><strong>2.65×</strong><span>同一批仓库的 Issue / PR 进入量</span></div>
        <div><strong>42.9% → 20.0%</strong><span>7 天内获得维护者回应的线程</span></div>
        <p>这组同期实验里，吞吐和迭代密度上升得很快，响应与 30 天结果没有同步改善。接下来的协作系统需要更认真地处理筛选、验证和责任交接。</p>
      </section>
      <footer>
        <span>完整数据、方法与案例见 Online Report</span>
        <div>
          <Image src="/community-logos/ant-open-source.png" alt="Ant Open Source" width={1282} height={389} />
          <i />
          <Image src="/community-logos/inclusionai.png" alt="InclusionAI" width={1612} height={466} />
        </div>
      </footer>
    </article>
  );
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 100_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetric(value: number, format: "percent" | "count") {
  return format === "percent" ? formatPercent(value) : value.toFixed(2);
}

function signedPointChange(earlier: number, later: number) {
  const difference = (later - earlier) * 100;
  return `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} pp`;
}

function signedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
