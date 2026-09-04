"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Maximize2Icon,
} from "lucide-react";
import Image from "next/image";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import LandscapeLogo from "@/app/components/landscape-logo";
import LandscapeExplorer from "@/app/components/landscape-explorer";
import type { LandscapeProject } from "@/lib/landscape-types";
import { projectLogoUrl } from "@/lib/project-logo";

import type { InclusionResearchStats } from "../../research-data";
import styles from "./presentation.module.css";

type KeynoteStats = InclusionResearchStats;

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

const scenes = [
  { id: "cover", label: "OPEN" },
  { id: "landscape", label: "LANDSCAPE" },
  { id: "signal", label: "TREND" },
  { id: "needs-gap", label: "RUNTIME" },
  { id: "closing", label: "THANKS" },
] as const;

type SceneId = (typeof scenes)[number]["id"];
type LandscapeView = "agent" | "model";

const runtimeProjectGroups = [
  { zone: "Memory, knowledge & context", label: "Memory & context" },
  { zone: "Protocols & interoperability", label: "Protocols" },
  { zone: "Tools, web & computer use", label: "Tools & computer use" },
  { zone: "Development sandboxes", label: "Sandboxes" },
] as const;

type LandscapeInsight = {
  metrics: Array<{ value: string; label: string }>;
  reading: string;
  focus: string[];
};

const LANDSCAPE_STEP_COUNT = 4;

const landscapeInsights: Record<LandscapeView, LandscapeInsight> = {
  agent: {
    metrics: [
      { value: "32 / 84", label: "Application projects" },
      { value: "55%", label: "July OpenRank in Application" },
      { value: "31", label: "Runtime projects" },
    ],
    reading:
      "Runtime runs through context, protocols, tools, sandboxes and evidence.",
    focus: [
      "Agentic coding",
      "Coding workflows & harnesses",
      "Personal AI assistants",
      "Chatbot workspaces",
      "Memory, knowledge & context",
      "Protocols & interoperability",
      "Tools, web & computer use",
      "Development sandboxes",
      "Observability & evaluation",
    ],
  },
  model: {
    metrics: [
      { value: "17%", label: "Created since 2025" },
      { value: "75%", label: "OpenRank in serving + pre-training" },
      { value: "6", label: "Apache projects" },
    ],
    reading:
      "PyTorch sits in training; Apache sits in data and compute.",
    focus: [
      "Model API gateways",
      "Serving · Deploy",
      "Serving · Inference",
      "Pre-Train · Framework & parallel",
      "Pre-Train · Compiler & accelerator",
      "Pre-Train · Evaluation & observability",
      "Pre-Train · Robotics infra",
      "Data · Integration",
      "Data · Governance",
      "Compute & scheduling",
    ],
  },
};

export default function OpenInfrastructureKeynote({
  stats,
  projects,
}: {
  stats: KeynoteStats;
  projects: LandscapeProject[];
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [landscapeStep, setLandscapeStep] = useState(0);
  const swipeStart = useRef<SwipeStart | null>(null);

  const next = useCallback(() => {
    if (
      scenes[sceneIndex].id === "landscape" &&
      landscapeStep < LANDSCAPE_STEP_COUNT - 1
    ) {
      setLandscapeStep((current) => current + 1);
      return;
    }

    const nextIndex = Math.min(scenes.length - 1, sceneIndex + 1);
    if (scenes[nextIndex].id === "landscape") setLandscapeStep(0);
    setSceneIndex(nextIndex);
  }, [landscapeStep, sceneIndex]);

  const previous = useCallback(() => {
    if (scenes[sceneIndex].id === "landscape" && landscapeStep > 0) {
      setLandscapeStep((current) => current - 1);
      return;
    }

    const previousIndex = Math.max(0, sceneIndex - 1);
    if (scenes[previousIndex].id === "landscape") {
      setLandscapeStep(LANDSCAPE_STEP_COUNT - 1);
    }
    setSceneIndex(previousIndex);
  }, [landscapeStep, sceneIndex]);

  const goToScene = useCallback((index: number) => {
    if (scenes[index].id === "landscape") setLandscapeStep(0);
    setSceneIndex(index);
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
      if (event.key === "Home") goToScene(0);
      if (event.key === "End") setSceneIndex(scenes.length - 1);
      if (event.key === "Enter") void enterFullscreen();
      if (/^[1-5]$/.test(event.key)) goToScene(Number(event.key) - 1);
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

  const scene = scenes[sceneIndex];

  return (
    <main
      className={styles.stage}
      lang="en"
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
              260910_InclusionConf
            </Link>
            <span>OPEN INFRASTRUCTURE KEYNOTE</span>
          </div>
          <button
            className={styles.fullscreenButton}
            type="button"
            onClick={() => void enterFullscreen()}
          >
            <Maximize2Icon aria-hidden="true" />
            Fullscreen
          </button>
        </header>

        <div
          className={styles.scene}
          data-stage-scene={scene.id}
          data-stage-build={scene.id === "landscape" ? landscapeStep : 0}
          key={scene.id}
        >
          <Scene
            id={scene.id}
            stats={stats}
            projects={projects}
            landscapeStep={landscapeStep}
            onLandscapeStepChange={setLandscapeStep}
          />
        </div>

        <footer className={styles.controls}>
          <div className={styles.progress} aria-label="Presentation progress">
            {scenes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to slide ${index + 1}: ${item.label}`}
                aria-current={index === sceneIndex ? "page" : undefined}
                data-active={index === sceneIndex}
                onClick={() => goToScene(index)}
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
              aria-label="Previous slide"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={sceneIndex === scenes.length - 1}
              aria-label="Next slide"
            >
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Scene({
  id,
  stats,
  projects,
  landscapeStep,
  onLandscapeStepChange,
}: {
  id: SceneId;
  stats: KeynoteStats;
  projects: LandscapeProject[];
  landscapeStep: number;
  onLandscapeStepChange: (step: number) => void;
}) {
  if (id === "cover") return <CoverSlide />;
  if (id === "landscape") {
    return (
      <LandscapeMapSlide
        projects={projects}
        stats={stats}
        step={landscapeStep}
        onStepChange={onLandscapeStepChange}
      />
    );
  }
  if (id === "signal") return <LandscapeSignalSlide stats={stats} />;
  if (id === "needs-gap") return <NeedsGapSlide />;
  return <ClosingSlide />;
}

function CoverSlide() {
  return (
    <article className={styles.coverSlide}>
      <div className={styles.coverMark}>
        <LandscapeLogo title="Agentic AI Landscape" />
        <span>AGENTIC AI LANDSCAPE · 2026</span>
      </div>
      <div
        className={styles.coverBrands}
        aria-label="Produced by Ant Open Source and InclusionAI"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/community-logos/ant-open-source.png" alt="Ant Open Source" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/community-logos/inclusionai.png" alt="InclusionAI" />
      </div>
      <h1>
        What AI Agents Need
        <em>from Open Infrastructure</em>
      </h1>
      <div className={styles.coverMeta}>
        <p>
          <strong>Yaya Xia</strong>
          <span>Ant Open Source</span>
        </p>
        <p className={styles.coverEvent}>
          KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China
          <span>8 September 2026 · Shanghai</span>
        </p>
      </div>
    </article>
  );
}

function LandscapeMapSlide({
  projects,
  stats,
  step,
  onStepChange,
}: {
  projects: LandscapeProject[];
  stats: KeynoteStats;
  step: number;
  onStepChange: (step: number) => void;
}) {
  const view: LandscapeView = step < 2 ? "agent" : "model";
  const highlighted = step % 2 === 1;
  const insight = landscapeInsights[view];

  return (
    <article
      className={styles.landscapeMapSlide}
      data-highlighted={highlighted}
      data-view={view}
    >
      <div className={styles.liveLandscape}>
        <LandscapeExplorer
          projects={projects}
          embedOnly={view}
          presentationMode
          presentationFocus={highlighted ? insight.focus : undefined}
        />
      </div>
      <div className={styles.landscapeSwitcher} aria-label="Landscape view">
        <button
          type="button"
          data-active={view === "agent"}
          aria-pressed={view === "agent"}
          onClick={() => onStepChange(0)}
        >
          Agent Infra · {stats.agent}
        </button>
        <button
          type="button"
          data-active={view === "model"}
          aria-pressed={view === "model"}
          onClick={() => onStepChange(2)}
        >
          Model Infra · {stats.model}
        </button>
      </div>
      {highlighted ? (
        <LandscapeInsightCard insight={insight} view={view} />
      ) : null}
    </article>
  );
}

function LandscapeInsightCard({
  insight,
  view,
}: {
  insight: LandscapeInsight;
  view: LandscapeView;
}) {
  return (
    <aside
      className={styles.landscapeInsight}
      data-view={view}
      aria-live="polite"
    >
      <div className={styles.insightIndex}>
        <span>KEY TREND</span>
        <strong>{view === "agent" ? "01" : "02"} / 02</strong>
      </div>
      <div className={styles.insightMetrics}>
        {insight.metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <p>{insight.reading}</p>
    </aside>
  );
}

function NeedsGapSlide() {
  return (
    <article className={styles.needsGapSlide}>
      <SlideHeading eyebrow="AGENT RUNTIME">
        What Agents Need, and Where the Gap Is
      </SlideHeading>
      <div className={styles.runtimeNarrative}>
        <p className={styles.runtimeProblem}>
          An agent can write code, call a model and tools, wait, and retry before
          its process disappears. <strong>The permissions it used, the state it
          changed, and its effects on other systems can last much longer.</strong>
        </p>
        <p className={styles.runtimeResponse}>
          <strong>Kubernetes Agent Sandbox and Kata Containers</strong> give
          untrusted execution a lifecycle and a safer boundary. <strong>Dapr
          Agents, agentgateway and Kueue</strong> carry recovery, governed traffic
          and quota across the task.
        </p>
      </div>
      <p className={styles.taskEnvelopeStatement}>
        A <strong>task envelope</strong> would keep the tenant and policy boundary,
        runtime profile, artifacts and state, and evidence and cleanup tied to one
        run. Open infrastructure has these pieces, but does not yet carry that
        boundary consistently through the whole stack.
      </p>
      <SourceLine>
        Source: CNCF TAB reference architecture submission #147 + project documentation
      </SourceLine>
    </article>
  );
}

function LandscapeSignalSlide({ stats }: { stats: KeynoteStats }) {
  return (
    <article className={styles.landscapeSignalSlide}>
      <SlideHeading eyebrow="WHERE THE PRESSURE LANDS">
        New Agent Infra work is gathering in Runtime.
      </SlideHeading>
      <div className={styles.pressureStack}>
        <section className={styles.attentionLayer}>
          <span>TOP</span>
          <p>
            Visible community attention remains with <strong>applications</strong>,
            especially coding agents and assistants.
          </p>
        </section>
        <section className={styles.runtimeLayer}>
          <span>MIDDLE</span>
          <p>
            <strong>{stats.runtimeOutsideMay} of 23</strong> new Agent Infra
            projects since May landed in Runtime.
          </p>
        </section>
        <section className={styles.foundationLayer}>
          <span>FOUNDATION</span>
          <p>
            The older <strong>model infrastructure</strong> stack stays underneath
            every agent task.
          </p>
        </section>
      </div>
      <aside className={styles.runtimeProjectList}>
        <header>
          <strong>{stats.runtimeOutsideMayProjects.length} Runtime additions</strong>
          <span>since May</span>
        </header>
        <div className={styles.runtimeProjectGroups}>
          {runtimeProjectGroups.map((group) => {
            const projects = stats.runtimeOutsideMayProjects.filter(
              (project) => project.zone === group.zone,
            );

            return (
              <section key={group.zone}>
                <h3>
                  {group.label} <span>{projects.length}</span>
                </h3>
                <ul>
                  {projects.map((project) => (
                    <li key={project.repo}>
                      <Image
                        src={projectLogoUrl(project.repo.split("/")[0])}
                        width={28}
                        height={28}
                        unoptimized
                        alt=""
                      />
                      <span>{project.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </aside>
      <SourceLine>
        Source: current landscape selection + May tracking snapshot.
      </SourceLine>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.handoffSlide}>
      <p className={styles.closingLead}>A working open source runtime built with</p>
      <h2>Kata Containers</h2>
      <p className={styles.closingTail}>and an open delivery chain.</p>
      <strong className={styles.closingThanks}>Thank you.</strong>
    </article>
  );
}

function SlideHeading({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <header className={styles.slideHeading}>
      <span>{eyebrow}</span>
      <h2>{children}</h2>
    </header>
  );
}

function SourceLine({ children }: { children: ReactNode }) {
  return <p className={styles.sourceLine}>{children}</p>;
}
