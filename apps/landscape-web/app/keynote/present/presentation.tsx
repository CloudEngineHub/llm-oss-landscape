"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import LandscapeExplorer from "@/app/components/landscape-explorer";
import LandscapeLogo from "@/app/components/landscape-logo";
import type { LandscapeProject } from "@/lib/landscape-types";

import {
  apacheBackbone,
  apacheDomainOrder,
} from "../apache-ecosystem";
import ApacheProjectAtlas from "../apache-project-atlas";
import {
  type CommunityKey,
  type StackKey,
  communityData,
  inclusionServices,
  stackData,
} from "../keynote-experience";
import researchStyles from "../page.module.css";
import styles from "./presentation.module.css";

type Chapter =
  | "open"
  | "landscape"
  | "apache"
  | "inclusion"
  | "license"
  | "community";

type Scene = {
  id: string;
  chapter: Chapter;
  label: string;
  duration: string;
  maxBuild: number;
};

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
  time: number;
};

function resolveSwipeDirection(
  start: SwipeStart,
  endX: number,
  endY: number,
  endTime: number,
  viewportWidth: number,
) {
  const deltaX = endX - start.x;
  const deltaY = endY - start.y;
  const minimumDistance = Math.max(56, Math.min(110, viewportWidth * 0.06));

  if (endTime - start.time > 1400) return null;
  if (Math.abs(deltaX) < minimumDistance) return null;
  if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return null;

  return deltaX < 0 ? "next" : "previous";
}

const scenes: Scene[] = [
  { id: "title", chapter: "open", label: "OPEN", duration: "0:00—0:35", maxBuild: 0 },
  { id: "familiarity", chapter: "open", label: "SHOW OF HANDS", duration: "0:35—1:05", maxBuild: 0 },
  { id: "question", chapter: "open", label: "QUESTION", duration: "1:05—1:50", maxBuild: 1 },
  { id: "agent", chapter: "landscape", label: "AGENT INFRA", duration: "1:50—3:25", maxBuild: 3 },
  { id: "model", chapter: "landscape", label: "MODEL INFRA", duration: "3:25—5:05", maxBuild: 3 },
  { id: "large", chapter: "landscape", label: "LARGE MODELS", duration: "5:05—6:15", maxBuild: 3 },
  { id: "zenmux-premium", chapter: "landscape", label: "ZENMUX · DEMAND", duration: "6:15—6:40", maxBuild: 0 },
  { id: "zenmux-value", chapter: "landscape", label: "ZENMUX · VALUE", duration: "6:40—7:05", maxBuild: 0 },
  { id: "awesome", chapter: "landscape", label: "AWESOME", duration: "7:05—8:25", maxBuild: 3 },
  { id: "production", chapter: "apache", label: "TURN", duration: "9:45—10:20", maxBuild: 0 },
  { id: "apache-scale", chapter: "apache", label: "APACHE", duration: "10:20—11:45", maxBuild: 1 },
  { id: "apache-position", chapter: "apache", label: "POSITION", duration: "11:45—14:00", maxBuild: 6 },
  { id: "ant-apache", chapter: "apache", label: "ANT × APACHE", duration: "14:00—15:50", maxBuild: 3 },
  { id: "inclusion-scale", chapter: "inclusion", label: "INCLUSIONAI", duration: "15:50—17:20", maxBuild: 1 },
  { id: "inclusion-stack", chapter: "inclusion", label: "PARTICIPATION", duration: "17:20—20:20", maxBuild: 4 },
  { id: "license-question", chapter: "license", label: "OPEN MODEL", duration: "20:20—21:05", maxBuild: 1 },
  { id: "license-distribution", chapter: "license", label: "LICENSE DATA", duration: "21:05—22:35", maxBuild: 2 },
  { id: "license-compare", chapter: "license", label: "REDISTRIBUTE", duration: "22:35—24:10", maxBuild: 2 },
  { id: "license-layers", chapter: "license", label: "LICENSE", duration: "24:10—25:30", maxBuild: 2 },
  { id: "release-check", chapter: "license", label: "RELEASE CHECK", duration: "25:30—27:00", maxBuild: 3 },
  { id: "community", chapter: "community", label: "COMMUNITY", duration: "27:00—29:20", maxBuild: 4 },
  { id: "close", chapter: "community", label: "CLOSE", duration: "29:20—30:00", maxBuild: 0 },
];

const chapterLabels: Array<{ id: Chapter; label: string }> = [
  { id: "open", label: "开场" },
  { id: "landscape", label: "生态" },
  { id: "apache", label: "Apache" },
  { id: "inclusion", label: "InclusionAI" },
  { id: "license", label: "开源软件与开放模型的约束" },
  { id: "community", label: "Community" },
];

const onlineFootnoteScenes = new Set([
  "title",
  "familiarity",
  "question",
  "production",
  "license-question",
  "close",
]);

type LandscapeStageInsight = {
  angle: string;
  metric: string;
  label: string;
  note: string;
  focus?: string;
  interaction?: "top10" | "open" | "aai" | "direct" | "install" | "all";
};

const externalLandscapes: Record<
  "large" | "awesome",
  {
    src: string;
    posters: Record<string, string>;
    insights: LandscapeStageInsight[];
  }
> = {
  large: {
    src: "/keynote/large-models/index.html",
    posters: {
      all: "/keynote/large-models/overview.jpg",
      top10: "/keynote/large-models/top10.jpg",
      open: "/keynote/large-models/open.jpg",
      aai: "/keynote/large-models/aai.jpg",
    },
    insights: [
      {
        angle: "真实使用",
        metric: "4 / 6",
        label: "Top 10 仍由两种开放路径共同组成",
        note: "2026 年 7 月，4 个开放权重模型和 6 个未公开权重模型进入使用 Top 10。",
        interaction: "top10",
      },
      {
        angle: "能力分布",
        metric: "9 / 10",
        label: "Reasoning 区几乎都是开放权重模型",
        note: "Frontier Generalist 则是 0 / 13。开放程度与模型所处的能力区间高度相关。",
        interaction: "open",
      },
      {
        angle: "使用与能力",
        metric: "#1 / #23",
        label: "使用榜第一与 AAI 第一不是同一个模型",
        note: "最新 AAI 快照与 7 月使用 Top 50 匹配后取前 10：GLM 5.2 使用排名第 1、AAI 为 51.1；Claude Opus 5 AAI 为 60.7、使用排名第 23。",
        interaction: "aai",
      },
    ],
  },
  awesome: {
    src: "/keynote/awesome/awesome_agentic_landscape_2026.html",
    posters: {
      all: "/keynote/awesome/overview.jpg",
      direct: "/keynote/awesome/direct.jpg",
      install: "/keynote/awesome/install.jpg",
    },
    insights: [
      {
        angle: "可消费性",
        metric: "19 / 26",
        label: "多数入图项目已经提供 Agent 可直接读取的材料",
        note: "判断依据是仓库里确实有 skill、instruction、hook、workflow 或 MCP 配置。",
        interaction: "direct",
      },
      {
        angle: "安装类项目",
        metric: "7 / 7",
        label: "7 个项目都给出了机器可执行入口",
        note: "Install 指安装或注册工具；direct 指 Agent 可直接调用命令、manifest 或配置。",
        interaction: "install",
      },
      {
        angle: "形成速度",
        metric: "22 / 26",
        label: "入图项目中有 22 个创建于 2025 年以后",
        note: "这是编辑样本的年龄结构，不代表 GitHub 全量；但它说明 Agent-native 知识资产还在快速形成。",
        interaction: "all",
      },
    ],
  },
};

type ExternalLandscapeId = keyof typeof externalLandscapes;

const landscapeInsights: Record<"agent" | "model", LandscapeStageInsight[]> = {
  agent: [
    {
      angle: "当前结构",
      metric: "22 / 74",
      label: "最大的两个 section 仍然围绕 coding",
      note: "Agentic coding 有 12 个项目，Code-first frameworks 有 10 个。代码仍是最密集的 Agent 入口。",
      focus: "Agentic coding",
    },
    {
      angle: "社区热度",
      metric: "TOP 2",
      label: "7 月 OpenRank 前两名都是 Personal AI assistants",
      note: "OpenClaw 为 462.71，Hermes Agent 为 350.21；个人 Agent 正在成为长期运行的工作入口。",
      focus: "Personal AI assistants",
    },
    {
      angle: "近期信号",
      metric: "112.46 → 177.61",
      label: "OpenViking · 2026-03—07 OpenRank",
      note: "个人 Agent 开始长期运行，memory、RAG 和 skills 随之收进独立的 context database。",
      focus: "Memory, knowledge & context",
    },
  ],
  model: [
    {
      angle: "Gateway 分型",
      metric: "4.48 → 31.92",
      label: "Gateway 开始接管工具与 Agent 调用链",
      note: "LiteLLM 代理 MCP 工具访问；AgentGateway 管流量策略；ContextForge 聚合 MCP Server 与 A2A Agent。",
      focus: "Model API gateways",
    },
    {
      angle: "执行链路",
      metric: "6 → 8",
      label: "Serving · Inference",
      note: "LMCache 补上 KV cache 复用，vLLM-Omni 补上多模态 serving；推理区内部的职责已经分开。",
      focus: "Serving · Inference",
    },
    {
      angle: "协作许可",
      metric: "39 / 58",
      label: "Model Infra 中三分之二采用 Apache-2.0",
      note: "硬件适配、专利授权和企业协作，使 Apache-2.0 在这一层保持明显多数。",
    },
  ],
};

const releaseMaterials = [
  ["模型权重", 0],
  ["架构说明", 1],
  ["训练代码", 2],
  ["数据来源", 2],
  ["评测方法", 3],
  ["修改文档", 3],
] as const;

type LicenseDistributionItem = {
  label: string;
  value: number;
  share: number;
  color: string;
};

const softwareLicenseDistribution: readonly LicenseDistributionItem[] = [
  { label: "Apache-2.0", value: 61, share: 46.2, color: "#6d50ff" },
  { label: "MIT", value: 37, share: 28.0, color: "#ff68b4" },
  { label: "NOASSERTION", value: 25, share: 18.9, color: "#b7b7b1" },
  { label: "Other", value: 9, share: 6.8, color: "#ff955d" },
];

const top50OpenWeightLicenseDistribution: readonly LicenseDistributionItem[] = [
  { label: "MIT", value: 8, share: 40, color: "#ff68b4" },
  { label: "Apache-2.0", value: 6, share: 30, color: "#6d50ff" },
  { label: "模型专用 / 修改版", value: 6, share: 30, color: "#ff955d" },
] as const;

const modelLicenseDistribution: readonly LicenseDistributionItem[] = [
  { label: "Apache-2.0", value: 57, share: 57, color: "#6d50ff" },
  { label: "MIT", value: 19, share: 19, color: "#ff68b4" },
  { label: "模型专用 / 其他", value: 20, share: 20, color: "#73dce9" },
  { label: "未标注", value: 4, share: 4, color: "#b7b7b1" },
];

const licenseComparisonRows = [
  {
    label: "分发对象",
    apache: "Source、Object 与衍生作品",
    openmdw: "Model Materials",
  },
  {
    label: "下游保留",
    apache: "LICENSE、修改说明、原始声明；符合条件时传递 NOTICE",
    openmdw: "LICENSE、适用的版权与来源声明",
  },
  {
    label: "诉讼终止",
    apache: "相关专利许可终止",
    openmdw: "专利或版权诉讼触发全部授权终止",
  },
  {
    label: "模型输出",
    apache: "没有相关条款",
    openmdw: "输出不承接 OpenMDW 义务",
  },
] as const;

const communityKeys: CommunityKey[] = [
  "discover",
  "propose",
  "review",
  "ship",
  "trust",
];

export default function KeynotePresentation({
  projects,
}: {
  projects: LandscapeProject[];
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [build, setBuild] = useState(0);
  const hashReady = useRef(false);
  const swipeStart = useRef<SwipeStart | null>(null);
  const scene = scenes[sceneIndex];

  const goTo = useCallback((nextIndex: number, nextBuild = 0) => {
    const safeIndex = Math.max(0, Math.min(scenes.length - 1, nextIndex));
    const safeBuild = Math.max(
      0,
      Math.min(scenes[safeIndex].maxBuild, nextBuild),
    );
    setSceneIndex(safeIndex);
    setBuild(safeBuild);
  }, []);

  const next = useCallback(() => {
    if (build < scene.maxBuild) {
      setBuild((current) => current + 1);
      return;
    }
    if (sceneIndex < scenes.length - 1) goTo(sceneIndex + 1);
  }, [build, goTo, scene.maxBuild, sceneIndex]);

  const previous = useCallback(() => {
    if (build > 0) {
      setBuild((current) => current - 1);
      return;
    }
    if (sceneIndex > 0) {
      const previousIndex = sceneIndex - 1;
      goTo(previousIndex, scenes[previousIndex].maxBuild);
    }
  }, [build, goTo, sceneIndex]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") return;

      swipeStart.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events used in QA do not always register an active pointer.
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start || start.pointerId !== event.pointerId) return;

      const direction = resolveSwipeDirection(
        start,
        event.clientX,
        event.clientY,
        event.timeStamp,
        window.innerWidth,
      );
      if (direction) event.preventDefault();
      if (direction === "next") next();
      if (direction === "previous") previous();
    },
    [next, previous],
  );

  const handlePointerCancel = useCallback(() => {
    swipeStart.current = null;
  }, []);

  useEffect(() => {
    const restoreHash = () => {
      const raw = window.location.hash.replace("#", "");
      hashReady.current = true;
      if (!raw) {
        window.history.replaceState(null, "", `#${scenes[0].id}.0`);
        return;
      }
      const [sceneId, buildValue] = raw.split(".");
      const index = scenes.findIndex((item) => item.id === sceneId);
      if (index >= 0) {
        goTo(index, Number.parseInt(buildValue ?? "0", 10) || 0);
      }
    };

    window.addEventListener("hashchange", restoreHash);
    const restoreTimer = window.setTimeout(restoreHash, 0);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("hashchange", restoreHash);
    };
  }, [goTo]);

  useEffect(() => {
    if (!hashReady.current) return;
    window.history.replaceState(null, "", `#${scene.id}.${build}`);
  }, [build, scene.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("a, button, input, textarea, select")
      ) {
        return;
      }

      const nextKeys = ["PageDown", "ArrowDown", "ArrowRight"];
      const previousKeys = ["PageUp", "ArrowUp", "ArrowLeft"];

      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        next();
        return;
      }

      if (previousKeys.includes(event.key)) {
        event.preventDefault();
        previous();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen().catch(() => undefined);
        }
        return;
      }

      if (event.key === "Escape" && document.fullscreenElement) {
        event.preventDefault();
        void document.exitFullscreen().catch(() => undefined);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, previous]);

  const chapterProgress = useMemo(
    () =>
      chapterLabels.map((chapter) => {
        const chapterScenes = scenes
          .map((item, index) => ({ ...item, index }))
          .filter((item) => item.chapter === chapter.id);
        const first = chapterScenes[0]?.index ?? 0;
        const last = chapterScenes.at(-1)?.index ?? first;
        return {
          ...chapter,
          active: sceneIndex >= first && sceneIndex <= last,
          complete: sceneIndex > last,
          width: chapterScenes.length,
        };
      }),
    [sceneIndex],
  );

  return (
    <main
      className={styles.stage}
      lang="zh-CN"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <section className={styles.deck} aria-live="polite">
        <header className={styles.stageHeader}>
          <div className={styles.stageHeaderLeft}>
            <Link className={styles.backLink} href="/keynote">
              ← 回到 keynote
            </Link>
            <span>{scene.label}</span>
          </div>
          <span>
            {scene.duration} · {String(sceneIndex + 1).padStart(2, "0")} /{" "}
            {scenes.length}
          </span>
        </header>

        <div className={styles.scene} data-stage-scene={scene.id} key={scene.id}>
          <SceneContent
            id={scene.id}
            build={build}
            projects={projects}
          />
        </div>

        <footer className={styles.timeline} aria-label="演讲章节进度">
          <div className={styles.timelineChapters}>
            {chapterProgress.map((chapter) => (
              <div
                key={chapter.id}
                data-active={chapter.active}
                data-complete={chapter.complete}
                style={{ "--chapter-width": chapter.width } as CSSProperties}
              >
                <i />
                <span>{chapter.label}</span>
              </div>
            ))}
          </div>
          {onlineFootnoteScenes.has(scene.id) ? (
            <a
              className={styles.onlineFootnote}
              href="https://landscape.16507.cn/keynote"
              target="_blank"
              rel="noreferrer"
              aria-label="在线打开 keynote 体验页面"
            >
              线上体验 · landscape.16507.cn/keynote ↗
            </a>
          ) : null}
        </footer>
      </section>
    </main>
  );
}

function ExternalLandscapeFrame({
  id,
  build,
}: {
  id: ExternalLandscapeId;
  build: number;
}) {
  const landscape = externalLandscapes[id];
  const activeInsight = landscape.insights[build - 1];
  const posterKey = activeInsight?.interaction ?? "all";

  return (
    <div className={styles.externalLandscapeFrameShell}>
      {Object.entries(landscape.posters).map(([key, poster]) => {
        const isActive = key === posterKey;
        return (
          <Image
            key={poster}
            className={styles.externalLandscapePoster}
            data-active={isActive}
            src={poster}
            alt=""
            fill
            loading={isActive ? "eager" : "lazy"}
            fetchPriority={isActive ? "high" : "low"}
            unoptimized
            sizes="100vw"
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function LandscapeInsightCard({
  insight,
  index,
  total,
}: {
  insight: LandscapeStageInsight;
  index: number;
  total: number;
}) {
  return (
    <aside
      key={`${insight.angle}-${insight.metric}`}
      className={styles.landscapeInsight}
      data-visible="true"
      aria-live="polite"
    >
      <div className={styles.insightIndex}>
        <span>{insight.angle}</span>
        <strong>
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </strong>
        <div aria-hidden="true">
          {Array.from({ length: total }, (_, itemIndex) => (
            <i key={itemIndex} data-active={itemIndex + 1 === index} />
          ))}
        </div>
      </div>
      <strong className={styles.insightMetric}>{insight.metric}</strong>
      <div className={styles.insightCopy}>
        <p>{insight.label}</p>
        <span>{insight.note}</span>
      </div>
    </aside>
  );
}

function SceneContent({
  id,
  build,
  projects,
}: {
  id: string;
  build: number;
  projects: LandscapeProject[];
}) {
  if (id === "title") {
    return (
      <div className={styles.titleScene}>
        <div className={styles.titleBrand}>
          <LandscapeLogo />
          <span>COMMUNITY OVER CODE ASIA 2026</span>
        </div>
        <h1>
          Agentic AI 新趋势下，
          <em>开放生态</em>的那些老规矩
        </h1>
        <div className={styles.titleContext}>
          <span>2026 年 8 月 7 日</span>
          <strong>Community Over Code Asia 2026</strong>
          <span>演讲人：王旭、夏小雅</span>
        </div>
        <div className={styles.titleMeta}>
          <span>30 MIN · 中文 KEYNOTE</span>
          <span className={styles.keyboardControls}>
            Enter 全屏 · Esc 退出 · ↓ / → 开始
          </span>
          <span className={styles.touchControls}>手指左右滑动翻页</span>
        </div>
      </div>
    );
  }

  if (id === "familiarity") {
    return (
      <div className={styles.familiarityScene}>
        <h2>现场有多少人见过这两张图？</h2>
        <div className={styles.familiarityPair}>
          <figure className={styles.familiarityPrint} data-landscape="agent">
            <Image
              src="/keynote/recognition/agent-infra-handdrawn.png"
              alt="粉色的 Agent Infra Landscape 2026 静态图"
              fill
              sizes="46vw"
              priority
              unoptimized
            />
          </figure>
          <figure className={styles.familiarityPrint} data-landscape="model">
            <Image
              src="/keynote/recognition/model-infra-handdrawn.png"
              alt="蓝色的 Model Infra Landscape 2026 静态图"
              fill
              sizes="46vw"
              priority
              unoptimized
            />
          </figure>
        </div>
      </div>
    );
  }

  if (id === "question") {
    return (
      <div className={styles.questionScene}>
        <p>Agentic AI 的项目名单，几个月就要重画一次。</p>
        <h2>
          图一直在变。
          <br />
          什么值得留下？
        </h2>
        <div className={styles.questionAnswer} data-visible={build >= 1}>
          <span>开放生态真正关心的是</span>
          <strong>别人能不能接住它，继续往下做。</strong>
        </div>
      </div>
    );
  }

  if (id === "agent" || id === "model") {
    const landscapeModule = id as "agent" | "model";
    const insights = landscapeInsights[landscapeModule];
    const activeInsight = insights[build - 1];
    return (
      <div className={styles.liveLandscapeScene}>
        <div className={styles.liveLandscape}>
          <LandscapeExplorer
            projects={projects}
            embedOnly={landscapeModule}
            presentationMode
            presentationFocus={activeInsight?.focus}
          />
        </div>
        {activeInsight ? (
          <LandscapeInsightCard
            insight={activeInsight}
            index={build}
            total={insights.length}
          />
        ) : null}
      </div>
    );
  }

  if (id === "large" || id === "awesome") {
    const landscape = externalLandscapes[id];
    const activeInsight = landscape.insights[build - 1];
    return (
      <div className={styles.externalLandscapeScene}>
        <ExternalLandscapeFrame id={id} build={build} />
        {activeInsight ? (
          <LandscapeInsightCard
            insight={activeInsight}
            index={build}
            total={landscape.insights.length}
          />
        ) : null}
      </div>
    );
  }

  if (id === "zenmux-premium" || id === "zenmux-value") {
    const isPremium = id === "zenmux-premium";
    return (
      <div className={styles.zenmuxScene} data-variant={isPremium ? "premium" : "value"}>
        <div className={styles.zenmuxChart}>
          <Image
            src={
              isPremium
                ? "/keynote/large-models/zenmux-premium-demand.png"
                : "/keynote/large-models/zenmux-value-frontier.png"
            }
            alt={
              isPremium
                ? "ZenMux Token Economics 价值图，聚焦 Anthropic 模型"
                : "ZenMux Token Economics 价值图，聚焦 DeepSeek 与 InclusionAI 模型"
            }
            fill
            sizes="74vw"
            priority
            unoptimized
          />
          <div className={styles.zenmuxFocus} aria-hidden="true">
            <span>{isPremium ? "Anthropic cluster" : "Value leaders"}</span>
          </div>
        </div>

        <aside className={styles.zenmuxFinding}>
          <p className={styles.zenmuxKicker}>ZenMux Token Economics</p>
          {isPremium ? (
            <>
              <h2>高价 + 高使用区，Anthropic 占前十中的七席</h2>
              <strong className={styles.zenmuxMetric}>7 / 10</strong>
              <p className={styles.zenmuxBody}>
                按发布期日 token 中位数排序。高价格没有把这些模型挤出 ZenMux 的需求中心。
              </p>
            </>
          ) : (
            <>
              <h2>价值效率前三名，DeepSeek 占两席，Ling 排第三</h2>
              <ol className={styles.zenmuxRanking}>
                <li><strong>#1</strong><span>DeepSeek V4 Flash*</span></li>
                <li><strong>#2</strong><span>DeepSeek V4 Pro</span></li>
                <li><strong>#3</strong><span>Ling-3.0-flash*</span></li>
              </ol>
            </>
          )}

          <div className={styles.zenmuxSource}>
            <strong>来源</strong>
            <span>ZenMux Arena · Token Economics</span>
            <span>ZenMux token 消耗数据 + 官网模型价格</span>
            <span>页面快照：2026-08-06</span>
          </div>
          <p className={styles.zenmuxCaveat}>
            {isPremium
              ? "ZenMux 平台样本，不代表全市场份额。"
              : "* 发布未满 14 个工作日；ZenMux 平台样本。"}
          </p>
        </aside>
      </div>
    );
  }

  if (id === "method") {
    const methodRows = [
      {
        id: "agent",
        view: "Agent Infra",
        count: "74 项",
        window: "截至 08-01 · OpenRank 05—07",
        sources: [
          { label: "OpenDigger", mark: "OD" },
          { label: "GitHub", icon: "/project-logos/github.png" },
        ],
        path: ["绝对信号 + 90 天增速", "README 与状态复核", "结构补位"],
      },
      {
        id: "model",
        view: "Model Infra",
        count: "58 项",
        window: "截至 08-01 · OpenRank 05—07",
        sources: [
          { label: "OpenDigger", mark: "OD" },
          { label: "GitHub", icon: "/project-logos/github.png" },
        ],
        path: ["共用仓库候选池", "模型生命周期复核", "去重与归类"],
      },
      {
        id: "large",
        view: "Large Models",
        count: "50 个 endpoint",
        window: "完整自然月 · 2026-07",
        sources: [
          {
            label: "OpenRouter",
            icon: "/keynote/large-models/assets/vendor-logos/openrouter-text.svg",
          },
          { label: "ZenMux", mark: "ZM" },
          { label: "Hugging Face", icon: "/project-logos/huggingface.png" },
        ],
        path: ["月度 endpoint 合并", "平台内分位", "官方权重核验"],
      },
      {
        id: "awesome",
        view: "Awesome",
        count: "26 项",
        window: "截至 08-01 · OpenRank 05—07",
        sources: [
          { label: "GitHub", icon: "/project-logos/github.png" },
          { label: "OpenDigger", mark: "OD" },
          { label: "13 seeds", mark: "+" },
        ],
        path: ["集合类候选", "README consumability", "四阶段编辑"],
      },
    ] as const;

    const methodChecks = [
      ["WINDOW", "只比较完整窗口"],
      ["GRAIN", "仓库、endpoint、知识资产分开"],
      ["EVIDENCE", "使用信号与项目材料相互校验"],
      ["EDITORIAL", "补结构缺口，同时去重"],
    ] as const;

    const methodTakeaways = [
      [
        "OBSERVATION",
        "开放权重进入主流使用；协议、推理与可执行知识资产也在增厚。",
      ],
      [
        "CONCLUSION",
        "采用数据回答有没有人在用；许可证和发布材料回答社区能不能接着做。",
      ],
      [
        "INITIATIVE",
        "每次更新同步发布快照、脚本和入图理由，项目社区可以直接补证据、提修正。",
      ],
    ] as const;

    return (
      <div className={styles.methodScene}>
        <div className={styles.methodIntro}>
          <h2>四张图各自取样，判断准则放在一起核对。</h2>
        </div>

        <div className={styles.methodMatrix}>
          {methodRows.map((row) => (
            <div className={styles.methodRow} data-view={row.id} key={row.id}>
              <strong>{row.view}</strong>
              <div className={styles.methodSources}>
                <div>
                  {row.sources.map((source) => (
                    <span key={source.label}>
                      {"icon" in source ? (
                        <Image
                          src={source.icon}
                          alt=""
                          width={54}
                          height={22}
                        />
                      ) : (
                        <i>{source.mark}</i>
                      )}
                      {source.label}
                    </span>
                  ))}
                </div>
                <small>{row.window}</small>
              </div>
              <b>{row.count}</b>
              <div className={styles.methodPath} data-visible={build >= 1}>
                {row.path.map((step, index) => (
                  <span key={step}>
                    {step}
                    {index < row.path.length - 1 ? <i>→</i> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.methodChecks} data-visible={build >= 2}>
          <strong>共同判断</strong>
          {methodChecks.map(([label, text]) => (
            <div key={label}>
              <span>{label}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className={styles.methodTakeaways} data-visible={build >= 3}>
          {methodTakeaways.map(([label, text]) => (
            <div key={label} data-kind={label.toLocaleLowerCase()}>
              <span>{label}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "production") {
    return (
      <div className={styles.productionScene}>
        <h2>
          Agent 跑起来以后，
          <br />
          工程和开放开始变得具体。
        </h2>
      </div>
    );
  }

  if (id === "apache-scale") {
    const stats = [
      ["295", "Projects"],
      ["1,310", "Software releases"],
      ["9,905", "Committers"],
      ["1,147", "Members"],
    ];
    return (
      <div className={styles.apacheScaleScene}>
        <div className={styles.apacheIdentity}>
          <Image
            src="/project-logos/apache.png"
            alt="Apache Software Foundation"
            width={220}
            height={220}
          />
          <div>
            <p>02 · THE APACHE WAY</p>
            <h2>Apache</h2>
            <strong>PROJECTS &amp; PEOPLE</strong>
          </div>
        </div>
        <div className={styles.apacheMeaning}>
          <article>
            <span>PROJECTS</span>
            <strong>ARE COMMUNITIES</strong>
            <p>代码是产出；社区才是项目本身。</p>
          </article>
          <article>
            <span>PEOPLE</span>
            <strong>MAKE THEM LAST</strong>
            <p>权限随持续贡献和共同信任增长。</p>
          </article>
        </div>
        <div className={styles.apacheStats} data-visible={build >= 1}>
          {stats.map(([value, label], index) => (
            <div key={label} style={{ "--stat-index": index } as CSSProperties}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "apache-position") {
    const activeDomain = apacheDomainOrder[Math.min(build, apacheDomainOrder.length - 1)];
    return (
      <div className={styles.apacheAtlasStage}>
        <ApacheProjectAtlas activeDomain={activeDomain} stage stageBuild={build} />
      </div>
    );
  }

  if (id === "ant-apache") {
    return (
      <div className={`${styles.researchScene} ${styles.apacheBackboneScene}`}>
        <div className={researchStyles.apacheBridgeLead} data-stage="true">
          <div className={researchStyles.apacheBridgeSource}>
            <Image src="/project-logos/apache.png" alt="Apache" width={44} height={44} />
            <span>LANDSCAPE</span>
            <strong>6 个 Apache 项目</strong>
          </div>
          <div className={researchStyles.apacheBridgeAxis}>
            <span>共同覆盖一条运行链</span>
            <div>
              <b>编排</b>
              <b>计算</b>
              <b>数据</b>
              <b>状态</b>
              <b>恢复</b>
            </div>
          </div>
          <div className={researchStyles.apacheBridgeSource}>
            <Image
              src="/keynote/apache/assets/ant-group.png"
              alt="蚂蚁集团"
              width={44}
              height={44}
            />
            <span>ANT PARTICIPATION</span>
            <strong>4 个 Apache 项目</strong>
          </div>
        </div>
        <div className={researchStyles.apacheBackbone} data-stage="true">
          {apacheBackbone.map((stage, index) => (
            <article
              key={stage.label}
              className={styles.guidedApacheGroup}
              data-active={build === 0 || build === index + 1}
            >
              <header>
                <p>{stage.label}</p>
                <h3>{stage.title}</h3>
              </header>
              <div className={researchStyles.apacheBackboneProjects}>
                {stage.projects.map((project) => (
                  <a
                    href={`https://github.com/${project.repo}`}
                    key={project.name}
                    tabIndex={-1}
                  >
                    <div className={researchStyles.apacheProjectLogo}>
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        width={150}
                        height={54}
                      />
                    </div>
                    <div className={researchStyles.apacheProjectIdentity}>
                      <strong>{project.name}</strong>
                      <div className={researchStyles.apacheProjectMarks}>
                        <span>
                          <Image src="/project-logos/apache.png" alt="" width={18} height={18} />
                          ASF
                        </span>
                        {project.source === "ant" ? (
                          <span className={researchStyles.antMark}>
                            <Image
                              src="/keynote/apache/assets/ant-group.png"
                              alt=""
                              width={18}
                              height={18}
                            />
                            ANT
                          </span>
                        ) : (
                          <span className={researchStyles.landscapeMark}>LANDSCAPE</span>
                        )}
                      </div>
                    </div>
                    <dl className={researchStyles.apacheProjectFacts}>
                      <div>
                        <dt>ROLE</dt>
                        <dd>{project.role}</dd>
                      </div>
                    </dl>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (id === "inclusion-scale") {
    return (
      <div className={`${styles.researchScene} ${styles.inclusionScaleScene}`}>
        <div className={styles.inclusionHeroStage}>
          <div className={styles.inclusionHeroMark}>
            <Image
              src="/keynote/inclusionai/inclusionai.png"
              alt="InclusionAI logo"
              width={460}
              height={460}
            />
          </div>
          <div className={styles.inclusionHeroCopy}>
            <h2>InclusionAI</h2>
            <strong className={styles.inclusionSlogan}>
              AI Built By Everyone,
              <br />
              For Everyone.
            </strong>
            <div className={styles.inclusionPrinciples} aria-label="InclusionAI 3A 价值主张">
              <div>
                <span>AVAILABLE</span>
                <strong>技术可获得</strong>
              </div>
              <div>
                <span>AFFORDABLE</span>
                <strong>成本可负担</strong>
              </div>
              <div>
                <span>INCLUSIVE</span>
                <strong>人人能受益</strong>
              </div>
            </div>
          </div>
        </div>
        <div className={researchStyles.platformGrid} data-stage="true" data-visible={build >= 1}>
          <a href="https://github.com/inclusionAI" tabIndex={-1}>
            <header><span>GitHub · 3 orgs</span></header>
            <strong>93</strong>
            <p>公开仓库</p>
            <div><span><b>41,542</b> Stars</span><span><b>3,933</b> Forks</span></div>
          </a>
          <a href="https://huggingface.co/inclusionAI" tabIndex={-1}>
            <header><span>Hugging Face · 3 orgs</span></header>
            <strong>198</strong>
            <p>公开模型</p>
            <div><span><b>534,356</b> 近 30 天下载</span><span><b>8,790</b> Likes</span></div>
          </a>
          <a href="https://modelscope.cn/organization/inclusionAI" tabIndex={-1}>
            <header><span>ModelScope · 3 orgs</span></header>
            <strong>188</strong>
            <p>公开模型</p>
            <div><span><b>205,569</b> Downloads</span><span><b>638</b> Likes</span></div>
          </a>
        </div>
      </div>
    );
  }

  if (id === "inclusion-stack") {
    const stackKeys: StackKey[] = ["models", "embodied", "infra", "industry"];
    const isService = build === 4;
    const stackKey = stackKeys[Math.min(build, 3)];
    const stack = stackData[stackKey];
    return (
      <div className={`${styles.researchScene} ${styles.inclusionStackScene}`}>
        <div className={researchStyles.inclusionAtlas}>
          <div className={researchStyles.stackLayers}>
            <button
              type="button"
              tabIndex={-1}
              className={isService ? researchStyles.activeStack : ""}
            >
              <strong>AI Service</strong>
            </button>
            {[...stackKeys].reverse().map((key) => (
              <button
                type="button"
                tabIndex={-1}
                key={key}
                className={!isService && key === stackKey ? researchStyles.activeStack : ""}
              >
                <strong>{stackData[key].label}</strong>
              </button>
            ))}
          </div>
          {!isService ? (
            <article className={researchStyles.stackDetail} key={stackKey}>
              <p className={researchStyles.utilityLabel}>{stack.kicker}</p>
              <h3>{stack.title}</h3>
              <p>{stack.body}</p>
              <div className={researchStyles.inclusionProjects}>
                {stack.projects.map((project) => (
                  <a href={project.href} key={project.name} tabIndex={-1}>
                    <span className={researchStyles.inclusionProjectLogo}>
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        width={72}
                        height={72}
                      />
                    </span>
                    <span>
                      <strong>{project.name}</strong>
                    </span>
                    <p>{project.description}</p>
                  </a>
                ))}
              </div>
            </article>
          ) : (
            <div className={`${researchStyles.serviceBand} ${styles.serviceDetail}`}>
              <header>
                <span>AI SERVICE</span>
                <strong>真实服务会把新问题重新带回技术栈</strong>
              </header>
              <div>
                {inclusionServices.map((service) => (
                  <article key={service.domain}>
                    <Image
                      src={service.logo}
                      alt={`${service.name} logo`}
                      width={84}
                      height={84}
                    />
                    <span>{service.domain}</span>
                    <strong>{service.name}</strong>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (id === "license-question") {
    return (
      <div className={styles.licenseQuestionScene}>
        <h2>许可证要管的对象，变多了。</h2>
        <div className={styles.missingMaterials} data-visible={build >= 1}>
          <i>权重</i>
          <i>代码</i>
          <i>数据</i>
          <i>文档</i>
          <i>输出</i>
        </div>
      </div>
    );
  }

  if (id === "license-distribution") {
    const softwareBar = {
      cohort: "software",
      title: "Landscape 软件",
      subtitle: "132 个 GitHub 仓库",
      items: softwareLicenseDistribution,
      source: "GitHub SPDX · 2026-08-01",
      metric: "74.2%",
    };
    const hfBar = {
      cohort: "hf",
      title: "HF 下载量 Top 100",
      subtitle: "Text Generation 模型仓库",
      items: modelLicenseDistribution,
      source: "Hugging Face license tag · 2026-08-01",
      metric: "76%",
    };
    const top50Bar = {
      cohort: "usage",
      title: "调用量 Top 50 · 开放权重",
      subtitle: "20 个模型",
      items: top50OpenWeightLicenseDistribution,
      source: "OpenRouter + ZenMux · 2026-07",
      metric: "70%",
    };
    const bars = [softwareBar, hfBar, top50Bar];
    return (
      <div className={styles.licenseDistributionScene}>
        <header>
          <h2>Apache-2.0 + MIT：三组样本均超过 70%。</h2>
        </header>
        <div className={styles.licenseSamplePair}>
          {bars.map((bar, index) => (
            <article
              key={bar.title}
              data-visible={build >= index}
              data-cohort={bar.cohort}
            >
              <header>
                <div>
                  <strong>{bar.title}</strong>
                  <span>{bar.subtitle}</span>
                </div>
                <b>{bar.metric}</b>
              </header>
              <p>Apache-2.0 + MIT</p>
              <div className={styles.stackedLicenseBar}>
                {bar.items.map((item) => (
                  <i
                    key={item.label}
                    style={{
                      width: `${item.share}%`,
                      background: item.color,
                    }}
                    title={`${item.label}: ${item.value}`}
                  />
                ))}
              </div>
              <div className={styles.licenseLegend}>
                {bar.items.map((item) => (
                  <span key={item.label}>
                    <i style={{ background: item.color }} />
                    <b>{item.label}</b>
                    <strong>{item.value}</strong>
                  </span>
                ))}
              </div>
              <footer>{bar.source}</footer>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (id === "license-compare") {
    return (
      <div className={styles.licenseCompareScene}>
        <header>
          <h2>两份宽松许可，分发清单不一样。</h2>
        </header>
        <div className={styles.licenseComparisonTable}>
          <div className={styles.licenseComparisonHead}>
            <span />
            <strong data-visible={build >= 1}>Apache License 2.0</strong>
            <strong data-visible={build >= 2}>OpenMDW 1.1</strong>
          </div>
          {licenseComparisonRows.map((row) => (
            <div className={styles.licenseComparisonRow} key={row.label}>
              <strong>{row.label}</strong>
              <p data-visible={build >= 1}>{row.apache}</p>
              <p data-visible={build >= 2}>{row.openmdw}</p>
            </div>
          ))}
        </div>
        <div className={styles.licenseSharedBoundary} data-visible={build >= 2}>
          <strong>共同边界</strong>
          <p>两者都允许商业使用，也都没有 share-alike；许可证本身不要求发布者补齐训练代码和数据。</p>
        </div>
      </div>
    );
  }

  if (id === "license-layers") {
    return (
      <div className={styles.licenseLayersScene}>
        <h2>许可证给权利，材料决定研究能走多远。</h2>
        <div className={styles.licenseLayers}>
          <article data-visible={build >= 1}>
            <span>RIGHTS</span>
            <strong>法律上可以做什么？</strong>
            <p>Apache-2.0 与 OpenMDW 都允许使用、修改和分发；要继续核对 notices、诉讼终止和输出边界。</p>
          </article>
          <article data-visible={build >= 2}>
            <span>MATERIALS</span>
            <strong>实际上拿到了什么？</strong>
            <p>MOF 与 OSAID 检查权重之外的代码、数据说明、评测和修改所需文档。</p>
          </article>
        </div>
      </div>
    );
  }

  if (id === "release-check") {
    const statuses = [
      "只有权重，可下载",
      "结构清楚，可理解",
      "训练材料较完整，可研究",
      "评测与文档齐备，可继续修改",
    ];
    return (
      <div className={styles.releaseScene}>
        <header>
          <h2>一个模型发布，到底交付了什么？</h2>
          <strong>{statuses[build]}</strong>
        </header>
        <div className={styles.materialGrid}>
          {releaseMaterials.map(([label, threshold]) => (
            <div key={label} data-checked={build >= threshold}>
              <i>{build >= threshold ? "✓" : ""}</i>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p>许可证仍然重要。它无法替发布者补齐没有提供的材料。</p>
      </div>
    );
  }

  if (id === "community") {
    const activeKey = communityKeys[build];
    const [title, body] = communityData[activeKey];
    return (
      <div className={`${styles.researchScene} ${styles.communityScene}`}>
        <h2>陌生贡献怎样变成长期信任</h2>
        <div className={researchStyles.communityPath} data-stage="true">
          {communityKeys.map((key, index) => (
            <button
              type="button"
              tabIndex={-1}
              key={key}
              className={key === activeKey ? researchStyles.activeCommunity : ""}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{communityData[key][0]}</strong>
            </button>
          ))}
        </div>
        <article className={researchStyles.communityDetail} data-stage="true" key={activeKey}>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>
      </div>
    );
  }

  return (
    <div className={styles.closeScene}>
      <span>COMMUNITY &gt;&gt;&gt; CODE</span>
      <h2>老规矩继续有效。</h2>
      <p>现在，它们要覆盖模型、数据和评测。</p>
      <div>
        <i>入口能被找到</i>
        <i>过程经得起回看</i>
        <i>信任跟着贡献增长</i>
      </div>
      <small>THANK YOU</small>
    </div>
  );
}
