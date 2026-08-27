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

import styles from "./presentation.module.css";

type PressureSection = {
  label: string;
  zone: string;
  count: number;
  projects: Array<{ name: string; repo: string }>;
};

type KeynoteStats = {
  total: number;
  agent: number;
  model: number;
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
  { id: "workload", label: "WORKLOAD" },
  { id: "landscape", label: "ECOSYSTEM" },
  { id: "installed-base", label: "INSTALLED BASE" },
  { id: "task-envelope", label: "RESPONSE" },
  { id: "close", label: "CLOSE" },
] as const;

type SceneId = (typeof scenes)[number]["id"];

export default function OpenInfrastructureKeynote({
  stats,
}: {
  stats: KeynoteStats;
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
      if (/^[1-6]$/.test(event.key)) setSceneIndex(Number(event.key) - 1);
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
          <Scene id={scene.id} stats={stats} />
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

function Scene({ id, stats }: { id: SceneId; stats: KeynoteStats }) {
  if (id === "cover") return <CoverSlide />;
  if (id === "workload") return <WorkloadSlide />;
  if (id === "landscape") return <LandscapeSignalSlide stats={stats} />;
  if (id === "installed-base") return <InstalledBaseSlide />;
  if (id === "task-envelope") return <TaskEnvelopeSlide />;
  return <ClosingSlide />;
}

function CoverSlide() {
  return (
    <article className={styles.coverSlide}>
      <div className={styles.coverMark}>
        <LandscapeLogo title="Agentic AI Landscape" />
        <span>AGENTIC AI LANDSCAPE · 2026</span>
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
        <p>
          KubeCon + CloudNativeCon + OpenInfra Summit
          <span>+ PyTorch Conference China · Shanghai</span>
        </p>
      </div>
      <TaskReceipt status="TASK CREATED" />
    </article>
  );
}

function WorkloadSlide() {
  return (
    <article className={styles.workloadSlide}>
      <SlideHeading eyebrow="THE WORKLOAD">
        The code can appear after deployment.
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
      <p className={styles.workloadPoint}>
        A four-minute environment still needs a hard boundary, scoped authority
        and a record that survives cleanup.
      </p>
      <TaskReceipt status="CODE GENERATED · SANDBOX 04:18 · EFFECT RECORDED" />
    </article>
  );
}

function LandscapeSignalSlide({ stats }: { stats: KeynoteStats }) {
  return (
    <article className={styles.landscapeSignalSlide}>
      <SlideHeading eyebrow="AGENTIC AI ECOSYSTEM">
        The young layer is forming around the task.
      </SlideHeading>
      <div className={styles.layerComparison}>
        <div className={styles.agentLayer}>
          <span>AGENT INFRA</span>
          <strong>{stats.agent}</strong>
          <p>{stats.agentRecentShare}% created in 2025 or later</p>
        </div>
        <div className={styles.modelLayer}>
          <span>MODEL INFRA</span>
          <strong>{stats.model}</strong>
          <p>{stats.modelRecentShare}% created in 2025 or later</p>
        </div>
        <div className={styles.totalMark}>{stats.total} projects</div>
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
        Source: agentic-ai-projects.csv · July 2026 OpenRank · 23 Aug review
        snapshot. Counts show selected projects, not production adoption.
      </SourceLine>
    </article>
  );
}

function InstalledBaseSlide() {
  return (
    <article className={styles.installedBaseSlide}>
      <SlideHeading eyebrow="CNCF + OPENINFRA">
        The installed base is already carrying AI.
      </SlideHeading>
      <div className={styles.baselineNumbers}>
        <section>
          <strong>82%</strong>
          <p>Kubernetes in production among container users</p>
          <span>CNCF 2025 survey</span>
        </section>
        <section>
          <strong>66%</strong>
          <p>GenAI-hosting organisations using Kubernetes for inference</p>
          <span>CNCF 2025 survey</span>
        </section>
        <section>
          <strong>55M+</strong>
          <p>Documented OpenStack cores in production</p>
          <span>OpenInfra 2025 annual report</span>
        </section>
      </div>
      <p className={styles.dataBoundary}>
        These figures establish the substrate. They do not measure agent
        adoption.
      </p>
      <SourceLine>
        Sources: CNCF Annual Cloud Native Survey 2025 · OpenInfra Annual Report
        2025
      </SourceLine>
    </article>
  );
}

function TaskEnvelopeSlide() {
  const responses = [
    {
      step: "RUN",
      need: "Short-lived, untrusted code",
      existing: "Kubernetes lifecycle + Kata isolation",
      gap: "Fast, portable sandbox profiles",
    },
    {
      step: "ACT",
      need: "Authority borrowed for one task",
      existing: "SPIFFE/SPIRE workload identity",
      gap: "Delegation tied to tools and expiry",
    },
    {
      step: "REMEMBER",
      need: "Context survives the process",
      existing: "Open data and workflow systems",
      gap: "Context lifecycle and provenance",
    },
    {
      step: "PROVE",
      need: "A tool changes an external system",
      existing: "OpenTelemetry trace pipeline",
      gap: "Causal evidence from decision to effect",
    },
  ];

  return (
    <article className={styles.taskEnvelopeSlide}>
      <SlideHeading eyebrow="WHERE OPEN INFRA CAN RESPOND">
        A production agent needs a task envelope.
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
        Project evidence: Kubernetes Agent Sandbox · Kata Containers · SPIRE
        Delegated Identity API · OpenTelemetry GenAI semantic conventions
      </SourceLine>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.closingSlide}>
      <div className={styles.closingReceipt}>
        <span>TASK 8F21 · COMPLETE</span>
        <dl>
          <div>
            <dt>RUNTIME</dt>
            <dd>released</dd>
          </div>
          <div>
            <dt>AUTHORITY</dt>
            <dd>expired</dd>
          </div>
          <div>
            <dt>EFFECT</dt>
            <dd>pull request #482</dd>
          </div>
          <div>
            <dt>EVIDENCE</dt>
            <dd>retained</dd>
          </div>
        </dl>
      </div>
      <h2>
        A sandbox can disappear in minutes.
        <em>Its evidence should not.</em>
      </h2>
      <p>
        Open infrastructure already has most of the building blocks. The task
        boundary is where they now need to meet.
      </p>
      <div className={styles.closingMeta}>
        <LandscapeLogo title="Agentic AI Landscape" />
        <span>What AI Agents Need from Open Infrastructure</span>
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

function TaskReceipt({ status }: { status: string }) {
  return (
    <div className={styles.taskReceipt}>
      <span>TASK 8F21</span>
      <strong>{status}</strong>
      <span>OPEN INFRA · 2026</span>
    </div>
  );
}

function SourceLine({ children }: { children: ReactNode }) {
  return <p className={styles.sourceLine}>{children}</p>;
}
