"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Maximize2Icon,
} from "lucide-react";
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

import type { InclusionResearchStats } from "../../research-data";
import styles from "./presentation.module.css";

type PressureSection = {
  label: string;
  zone: string;
  count: number;
  projects: Array<{ name: string; repo: string }>;
};

type KeynoteStats = InclusionResearchStats & {
  agentRecentShare: number;
  modelRecentShare: number;
  pressure: PressureSection[];
};

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

const scenes = [
  { id: "cover", label: "OPEN" },
  { id: "landscape", label: "LANDSCAPE" },
  { id: "signal", label: "TREND" },
  { id: "workload", label: "WORKLOAD" },
  { id: "project-bridge", label: "PROJECTS" },
  { id: "task-envelope", label: "RESPONSE" },
  { id: "handoff", label: "NEXT" },
] as const;

type SceneId = (typeof scenes)[number]["id"];

export default function OpenInfrastructureKeynote({
  stats,
  projects,
}: {
  stats: KeynoteStats;
  projects: LandscapeProject[];
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
      if (/^[1-7]$/.test(event.key)) setSceneIndex(Number(event.key) - 1);
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
          key={scene.id}
        >
          <Scene id={scene.id} stats={stats} projects={projects} />
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
}: {
  id: SceneId;
  stats: KeynoteStats;
  projects: LandscapeProject[];
}) {
  if (id === "cover") return <CoverSlide />;
  if (id === "landscape") {
    return <LandscapeMapSlide projects={projects} stats={stats} />;
  }
  if (id === "signal") return <LandscapeSignalSlide stats={stats} />;
  if (id === "workload") return <WorkloadSlide />;
  if (id === "project-bridge") return <ProjectBridgeSlide />;
  if (id === "task-envelope") return <TaskEnvelopeSlide />;
  return <DemoHandoffSlide />;
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
          <strong>Xiaoya Xia</strong>
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
}: {
  projects: LandscapeProject[];
  stats: KeynoteStats;
}) {
  const [view, setView] = useState<"agent" | "model">("agent");

  return (
    <article className={styles.landscapeMapSlide}>
      <div className={styles.liveLandscape}>
        <LandscapeExplorer
          projects={projects}
          embedOnly={view}
          presentationMode
        />
      </div>
      <div className={styles.landscapeSwitcher} aria-label="Landscape view">
        <span>EXPLORE THE MAP</span>
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

function WorkloadSlide() {
  const traits = [
    ["UNKNOWN", "Code appears during the task"],
    ["VARIABLE", "Model and tool calls can fan out"],
    ["INTERRUPTIBLE", "Work pauses, retries and resumes"],
    ["DURABLE", "Authority, state and effects outlive a process"],
  ];

  return (
    <article className={styles.workloadSlide}>
      <SlideHeading eyebrow="THE WORKLOAD">
        The process is temporary. The task is not.
      </SlideHeading>
      <div className={styles.workloadSequence}>
        <div className={styles.deployedArtifact}>
          <span>09:00 · DEPLOY</span>
          <strong>Known image</strong>
          <code>service:v42</code>
        </div>
        <div className={styles.sequenceArrow} aria-hidden="true">
          <i />
        </div>
        <div className={styles.agentTask}>
          <span>10:42 · AGENT TASK</span>
          <strong>Code written inside the run</strong>
          <code>fix_auth.py · created 10:43</code>
        </div>
        <div className={styles.sequenceArrow} aria-hidden="true">
          <i />
        </div>
        <div className={styles.externalEffect}>
          <span>10:46 · EFFECT</span>
          <strong>The environment is gone. The change remains.</strong>
          <code>repository · pull request #482</code>
        </div>
      </div>
      <div className={styles.workloadTraits}>
        {traits.map(([label, text]) => (
          <section key={label}>
            <span>{label}</span>
            <p>{text}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function LandscapeSignalSlide({ stats }: { stats: KeynoteStats }) {
  const applicationShare = Math.round(
    stats.agentMacro.find((group) => group.label === "Application")
      ?.openrankShare ?? 0,
  );

  return (
    <article className={styles.landscapeSignalSlide}>
      <SlideHeading eyebrow="AGENTIC AI ECOSYSTEM">
        Attention sits at the top. New demand is forming below.
      </SlideHeading>
      <div className={styles.signalNumbers}>
        <section>
          <strong>{applicationShare}%</strong>
          <p>of selected Agent Infra OpenRank still sits in Application</p>
          <span>JULY 2026</span>
        </section>
        <section>
          <strong>{stats.agentRecentShare}%</strong>
          <p>of Agent Infra projects were created in 2025 or later</p>
          <span>MODEL INFRA: {stats.modelRecentShare}%</span>
        </section>
        <section>
          <strong>{stats.runtimeOutsideMay}/{stats.agentOutsideMay}</strong>
          <p>Agent Infra selections outside the May pool sit in Runtime</p>
          <span>CURRENT SELECTION</span>
        </section>
      </div>
      <div className={styles.pressureRail}>
        {stats.pressure.map((section) => (
          <section key={section.zone}>
            <div className={styles.pressureCount}>{section.count}</div>
            <div>
              <h3>{section.label}</h3>
              <p>{section.zone}</p>
              <div className={styles.projectLine}>
                {section.projects.map((project) => (
                  <ProjectMark key={project.repo} {...project} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
      <SourceLine>
        Source: current landscape selection + May tracking snapshot. OpenRank
        describes community activity, not production adoption.
      </SourceLine>
    </article>
  );
}

function ProjectBridgeSlide() {
  const lanes = [
    {
      role: "RUN & ISOLATE",
      projects: ["Agent Sandbox", "Kata Containers", "Confidential Containers"],
      note: "Lifecycle, VM isolation and attestation",
    },
    {
      role: "COORDINATE",
      projects: ["kagent", "Dapr Agents", "OpenChoreo"],
      note: "Operations, durable state and recovery",
    },
    {
      role: "CONNECT & GOVERN",
      projects: ["kgateway", "agentgateway", "Istio"],
      note: "LLM, MCP and agent traffic under policy",
    },
    {
      role: "TRACE & EXPLAIN",
      projects: ["OpenTelemetry", "Jaeger"],
      note: "Agent semantics and execution paths",
    },
  ];

  return (
    <article className={styles.installedBaseSlide}>
      <SlideHeading eyebrow="OPEN INFRASTRUCTURE PROJECTS">
        Open projects are already moving into the task path.
      </SlideHeading>
      <div className={styles.projectLanes}>
        {lanes.map((lane) => (
          <section key={lane.role}>
            <span>{lane.role}</span>
            <div>
              {lane.projects.map((project) => (
                <strong key={project}>{project}</strong>
              ))}
            </div>
            <p>{lane.note}</p>
          </section>
        ))}
      </div>
      <p className={styles.dataBoundary}>
        Some were built for agents. Others are established projects adding an
        agent-specific interface, traffic path or evidence model.
      </p>
      <SourceLine>
        Sources: CNCF and project documentation · Kata Containers / OpenInfra ·
        OpenTelemetry GenAI semantic conventions
      </SourceLine>
    </article>
  );
}

function TaskEnvelopeSlide() {
  const responses = [
    {
      step: "START",
      need: "Unknown code in a short-lived environment",
      existing: "Agent Sandbox + Kata Containers",
      gap: "Low-latency isolation and safe warm reuse",
    },
    {
      step: "CALL",
      need: "Model and tool calls fan out or retry",
      existing: "Gateways + agentgateway",
      gap: "Task budgets, backpressure and cancellation",
    },
    {
      step: "RESUME",
      need: "Work outlives one process",
      existing: "Dapr workflows + state systems",
      gap: "Safe replay after an external side effect",
    },
    {
      step: "ACT",
      need: "Authority borrowed for one task",
      existing: "SPIFFE/SPIRE workload identity",
      gap: "Intent, tool scope, approval and expiry",
    },
    {
      step: "PLACE",
      need: "Inference, tools and sandbox compute mix",
      existing: "Kubernetes DRA + Kueue",
      gap: "Task SLOs, capacity and cost attribution",
    },
    {
      step: "PROVE",
      need: "A tool changes an external system",
      existing: "OpenTelemetry + Jaeger",
      gap: "Causal evidence from decision to effect",
    },
  ];

  return (
    <article className={styles.taskEnvelopeSlide}>
      <SlideHeading eyebrow="WHERE THE STACK IS STILL OPEN">
        The missing layer is task-wide control.
      </SlideHeading>
      <div className={styles.envelopeLegend}>
        <span>AGENT BEHAVIOUR</span>
        <span>ESTABLISHED OPEN INFRA</span>
        <span>WORK STILL OPEN</span>
      </div>
      <div className={styles.envelopeRows}>
        {responses.map((response) => (
          <section key={response.step}>
            <div className={styles.stepMark}>{response.step}</div>
            <p>{response.need}</p>
            <p>{response.existing}</p>
            <p>{response.gap}</p>
          </section>
        ))}
      </div>
      <SourceLine>
        Project evidence: Agent Sandbox · Kata · agentgateway · Dapr · SPIRE ·
        Kueue · OpenTelemetry
      </SourceLine>
    </article>
  );
}

function DemoHandoffSlide() {
  return (
    <article className={styles.handoffSlide}>
      <div className={styles.handoffIntro}>
        <span>NEXT · ONE TASK, RUN LIVE</span>
        <h2>Building an Agent Runtime with Open Infrastructure</h2>
      </div>
      <div className={styles.demoChain}>
        <section>
          <span>01 · LIFECYCLE</span>
          <strong>Kubernetes Agent Sandbox</strong>
          <p>creates, warms and releases the task environment</p>
        </section>
        <i aria-hidden="true" />
        <section>
          <span>02 · BOUNDARY</span>
          <strong>Kata Containers</strong>
          <p>puts untrusted code behind a dedicated guest kernel</p>
        </section>
        <i aria-hidden="true" />
        <section>
          <span>03 · DELIVERY</span>
          <strong>Open runtime chain</strong>
          <p>executes containers and delivers images and model artifacts</p>
        </section>
      </div>
      <div className={styles.handoffFooter}>
        <div>
          <strong>Xu Wang</strong>
          <span>Ant Group · CNCF + OpenInfra Foundation</span>
        </div>
        <p>
          The next keynote turns this ecosystem signal into a working stack.
        </p>
      </div>
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

function ProjectMark({ name, repo }: { name: string; repo: string }) {
  const owner = repo.split("/")[0];
  return (
    <span className={styles.projectMark}>
      {/* GitHub organisation avatar is used as the project mark in the landscape. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/project-logo/${encodeURIComponent(owner)}`} alt="" />
      {name}
    </span>
  );
}

function SourceLine({ children }: { children: ReactNode }) {
  return <p className={styles.sourceLine}>{children}</p>;
}
