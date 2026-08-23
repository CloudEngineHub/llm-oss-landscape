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
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./presentation.module.css";

type PresentationStats = {
  total: number;
  agent: number;
  model: number;
  agentParticipants: number;
  modelParticipants: number;
  agentTrend: number[];
  modelTrend: number[];
  leaders: Array<{
    name: string;
    openrank: number;
  }>;
};

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

const scenes = [
  { id: "cover", label: "OPEN" },
  { id: "landscape", label: "LANDSCAPE" },
  { id: "signals", label: "SIGNALS" },
] as const;

type SceneId = (typeof scenes)[number]["id"];

export default function InclusionPresentation({
  stats,
}: {
  stats: PresentationStats;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const swipeStart = useRef<SwipeStart | null>(null);

  const next = useCallback(() => {
    setSceneIndex((current) => Math.min(scenes.length - 1, current + 1));
  }, []);

  const previous = useCallback(() => {
    setSceneIndex((current) => Math.max(0, current - 1));
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
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

  const scene = scenes[sceneIndex];

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
          <div className={styles.stageHeaderLeft}>
            <Link
              className={styles.backLink}
              href="/presentations/260910_inclusion"
            >
              <ArrowLeftIcon aria-hidden="true" />
              260910_inclusion
            </Link>
            <span>{scene.label}</span>
          </div>
          <button
            className={styles.fullscreenButton}
            type="button"
            onClick={() => void enterFullscreen()}
          >
            <Maximize2Icon aria-hidden="true" />
            全屏
          </button>
        </header>

        <div
          className={styles.scene}
          data-stage-scene={scene.id}
          key={scene.id}
        >
          <Scene id={scene.id} stats={stats} />
        </div>

        <footer className={styles.controls}>
          <div className={styles.progress} aria-label="演示进度">
            {scenes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`前往第 ${index + 1} 页：${item.label}`}
                aria-current={index === sceneIndex ? "page" : undefined}
                data-active={index === sceneIndex}
                onClick={() => setSceneIndex(index)}
              >
                <i />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.pager}>
            <span>
              {String(sceneIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={previous}
              disabled={sceneIndex === 0}
              aria-label="上一页"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={sceneIndex === scenes.length - 1}
              aria-label="下一页"
            >
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Scene({ id, stats }: { id: SceneId; stats: PresentationStats }) {
  if (id === "cover") {
    return (
      <article className={styles.coverSlide}>
        <div className={styles.coverDate}>
          <span>260910</span>
          <strong>09.10</strong>
          <small>2026</small>
        </div>
        <div className={styles.coverCopy}>
          <div className={styles.inclusionLockup}>
            <Image
              src="/keynote/inclusionai/inclusionai.png"
              alt="InclusionAI"
              width={58}
              height={58}
              priority
            />
            <strong>InclusionAI</strong>
          </div>
          <h1>
            Agentic AI Landscape
            <em>趋势洞察</em>
          </h1>
          <p>September 2026</p>
        </div>
        <div className={styles.collaborationMark}>
          <strong>ANT OPEN SOURCE</strong>
          <span>×</span>
          <strong>INCLUSION AI</strong>
        </div>
      </article>
    );
  }

  if (id === "landscape") {
    return (
      <article className={styles.landscapeSlide}>
        <header className={styles.slideTitle}>
          <span>LANDSCAPE</span>
          <h2>当前收录项目</h2>
          <strong>{stats.total}</strong>
        </header>
        <div className={styles.infraLanes}>
          <section className={styles.agentLane}>
            <div>
              <span>A</span>
              <h3>Agent Infra</h3>
            </div>
            <strong>{stats.agent}</strong>
            <p>Applications · Frameworks · Runtime</p>
          </section>
          <section className={styles.modelLane}>
            <div>
              <span>M</span>
              <h3>Model Infra</h3>
            </div>
            <strong>{stats.model}</strong>
            <p>Access · Training · Data & compute</p>
          </section>
        </div>
        <div className={styles.leaderStrip}>
          <span>OPENRANK LEADERS</span>
          {stats.leaders.map((project, index) => (
            <div key={project.name}>
              <small>#{index + 1}</small>
              <strong>{project.name}</strong>
              <b>{project.openrank.toFixed(1)}</b>
            </div>
          ))}
        </div>
      </article>
    );
  }

  const maxTrend = Math.max(...stats.agentTrend, ...stats.modelTrend, 1);
  const chartPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 600;
        const y = 210 - (value / maxTrend) * 190;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  const participantMax = Math.max(
    stats.agentParticipants,
    stats.modelParticipants,
    1,
  );

  return (
    <article className={styles.signalsSlide}>
      <header className={styles.slideTitle}>
        <span>SIGNALS</span>
        <h2>本期关注的变化</h2>
      </header>
      <div className={styles.signalComposition}>
        <section className={styles.signalTrend}>
          <div className={styles.signalLabel}>
            <span>01</span>
            <h3>分领域 OpenRank 趋势</h3>
          </div>
          <div className={styles.trendChart}>
            <svg
              viewBox="0 0 600 220"
              role="img"
              aria-label="2025 年 8 月至 2026 年 7 月 Agent Infra 与 Model Infra OpenRank 汇总趋势"
            >
              <polyline
                className={styles.agentTrendLine}
                points={chartPoints(stats.agentTrend)}
              />
              <polyline
                className={styles.modelTrendLine}
                points={chartPoints(stats.modelTrend)}
              />
            </svg>
            <div className={styles.trendLegend}>
              <span>
                <i data-series="agent" />
                Agent Infra
                <strong>{stats.agentTrend.at(-1)?.toLocaleString()}</strong>
              </span>
              <span>
                <i data-series="model" />
                Model Infra
                <strong>{stats.modelTrend.at(-1)?.toLocaleString()}</strong>
              </span>
            </div>
          </div>
          <p>2025-08—2026-07 · 项目 OpenRank 按基础设施板块汇总</p>
        </section>
        <section className={styles.signalParticipation}>
          <div className={styles.signalLabel}>
            <span>02</span>
            <h3>参与者变化</h3>
          </div>
          <div className={styles.peopleBars}>
            <div>
              <span>Agent</span>
              <i
                style={{
                  height: `${(stats.agentParticipants / participantMax) * 100}%`,
                }}
              />
              <strong>{stats.agentParticipants.toLocaleString()}</strong>
            </div>
            <div>
              <span>Model</span>
              <i
                style={{
                  height: `${(stats.modelParticipants / participantMax) * 100}%`,
                }}
              />
              <strong>{stats.modelParticipants.toLocaleString()}</strong>
            </div>
          </div>
          <p>2026-07 · Participants 汇总</p>
        </section>
        <section className={styles.signalRanking}>
          <div className={styles.signalLabel}>
            <span>03</span>
            <h3>可筛选项目榜单</h3>
          </div>
          <div className={styles.filterLine}>
            <span>领域</span>
            <span>月份</span>
            <span>语言</span>
          </div>
          <p>榜单保留项目上下文，不把单一排名当作完整结论。</p>
        </section>
      </div>
    </article>
  );
}
