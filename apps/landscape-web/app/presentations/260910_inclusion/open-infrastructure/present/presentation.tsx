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
import type {
  OpenInfrastructurePresentationCopy,
  OpenInfrastructurePresentationCopyKey,
} from "@/lib/open-infrastructure-presentation-copy";
import { projectLogoUrl } from "@/lib/project-logo";

import type { InclusionResearchStats } from "../../research-data";
import {
  EditableOpenInfrastructureText,
  OpenInfrastructureCopyEditor,
} from "./open-infrastructure-copy-editor";
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
  {
    zone: "Memory, knowledge & context",
    labelKey: "runtimeMemoryLabel",
  },
  {
    zone: "Protocols & interoperability",
    labelKey: "runtimeProtocolsLabel",
  },
  {
    zone: "Tools, web & computer use",
    labelKey: "runtimeToolsLabel",
  },
  {
    zone: "Development sandboxes",
    labelKey: "runtimeSandboxesLabel",
  },
] as const;

type LandscapeTrend = {
  kickerKey: OpenInfrastructurePresentationCopyKey;
  index: string;
  metrics: Array<{
    value: string;
    labelKey: OpenInfrastructurePresentationCopyKey;
  }>;
  readingKey: OpenInfrastructurePresentationCopyKey;
  focus?: string[];
  projectFocus?: string[];
};

type LandscapeStep = {
  view: LandscapeView;
  trend?: LandscapeTrend;
};

const landscapeSteps: LandscapeStep[] = [
  { view: "agent" },
  {
    view: "agent",
    trend: {
      kickerKey: "agentTrendKicker",
      index: "01 / 02",
      metrics: [
        { value: "32 / 84", labelKey: "agentApplicationProjectsLabel" },
        { value: "55%", labelKey: "agentOpenRankLabel" },
      ],
      readingKey: "agentAttentionReading",
      focus: [
        "Agentic coding",
        "Coding workflows & harnesses",
        "Personal AI assistants",
        "Chatbot workspaces",
      ],
    },
  },
  {
    view: "agent",
    trend: {
      kickerKey: "agentTrendKicker",
      index: "02 / 02",
      metrics: [
        { value: "31", labelKey: "agentRuntimeProjectsLabel" },
      ],
      readingKey: "agentRuntimeReading",
      focus: [
        "Memory, knowledge & context",
        "Protocols & interoperability",
        "Tools, web & computer use",
        "Development sandboxes",
        "Observability & evaluation",
      ],
    },
  },
  { view: "model" },
  {
    view: "model",
    trend: {
      kickerKey: "modelTrendKicker",
      index: "01 / 03",
      metrics: [
        { value: "17%", labelKey: "modelCreatedLabel" },
        { value: "55%", labelKey: "agentCreatedLabel" },
      ],
      readingKey: "modelAgeReading",
    },
  },
  {
    view: "model",
    trend: {
      kickerKey: "modelTrendKicker",
      index: "02 / 03",
      metrics: [
        { value: "75%", labelKey: "modelOpenRankLabel" },
      ],
      readingKey: "modelActivityReading",
      focus: [
        "Model API gateways",
        "Serving · Deploy",
        "Serving · Inference",
        "Pre-Train · Framework & parallel",
        "Pre-Train · Compiler & accelerator",
        "Pre-Train · Evaluation & observability",
        "Pre-Train · Robotics infra",
      ],
    },
  },
  {
    view: "model",
    trend: {
      kickerKey: "modelTrendKicker",
      index: "03 / 03",
      metrics: [{ value: "6", labelKey: "modelApacheLabel" }],
      readingKey: "modelFoundationReading",
      focus: [
        "Pre-Train · Framework & parallel",
        "Data · Integration",
        "Data · Governance",
        "Compute & scheduling",
      ],
      projectFocus: [
        "pytorch/pytorch",
        "apache/airflow",
        "apache/gravitino",
        "apache/hudi",
        "apache/iceberg",
        "apache/paimon",
        "apache/spark",
      ],
    },
  },
];

const LANDSCAPE_STEP_COUNT = landscapeSteps.length;

const landscapeOverviewSteps: Record<LandscapeView, number> = {
  agent: 0,
  model: 3,
};

const runtimeResponseGroups = [
  {
    side: "process",
    sideLabelKey: "runtimeProcessSideLabel",
    projects: [
      {
        name: "Kubernetes Agent Sandbox",
        owner: "kubernetes-sigs",
        roleKey: "runtimeAgentSandboxRole",
      },
      {
        name: "Kata Containers",
        owner: "kata-containers",
        roleKey: "runtimeKataRole",
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  side: "process" | "task";
  sideLabelKey: OpenInfrastructurePresentationCopyKey;
  projects: ReadonlyArray<{
    name: string;
    owner: string;
    roleKey: OpenInfrastructurePresentationCopyKey;
  }>;
}>;

function isPresentationShortcutTarget(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof HTMLElement)) return false;
  return Boolean(
    eventTarget.isContentEditable ||
      eventTarget.closest(
        'a[href], button, input, select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="button"]',
      ),
  );
}

export default function OpenInfrastructureKeynote({
  initialCopy,
  stats,
  projects,
}: {
  initialCopy: OpenInfrastructurePresentationCopy;
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
    <OpenInfrastructureCopyEditor initialCopy={initialCopy}>
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
            <EditableOpenInfrastructureText
              as="span"
              copyKey="stageHeaderLabel"
            />
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
    </OpenInfrastructureCopyEditor>
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
        <EditableOpenInfrastructureText as="span" copyKey="coverMarkLabel" />
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
        <EditableOpenInfrastructureText
          as="span"
          copyKey="coverTitleLine1"
        />
        <EditableOpenInfrastructureText as="em" copyKey="coverTitleLine2" />
      </h1>
      <div className={styles.coverMeta}>
        <p>
          <EditableOpenInfrastructureText
            as="strong"
            copyKey="coverSpeakerName"
          />
          <EditableOpenInfrastructureText as="span" copyKey="coverSpeakerOrg" />
        </p>
        <p className={styles.coverEvent}>
          <EditableOpenInfrastructureText as="span" copyKey="coverEvent" />
          <EditableOpenInfrastructureText as="span" copyKey="coverDate" />
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
  const activeStep = landscapeSteps[step] ?? landscapeSteps[0];
  const { view, trend } = activeStep;

  return (
    <article
      className={styles.landscapeMapSlide}
      data-highlighted={Boolean(trend)}
      data-view={view}
    >
      <div className={styles.liveLandscape}>
        <LandscapeExplorer
          projects={projects}
          embedOnly={view}
          presentationMode
          presentationFocus={trend?.focus}
          presentationProjectFocus={trend?.projectFocus}
        />
      </div>
      <div className={styles.landscapeSwitcher} aria-label="Landscape view">
        <button
          type="button"
          data-active={view === "agent"}
          aria-pressed={view === "agent"}
          onClick={() => onStepChange(landscapeOverviewSteps.agent)}
        >
          Agent Infra · {stats.agent}
        </button>
        <button
          type="button"
          data-active={view === "model"}
          aria-pressed={view === "model"}
          onClick={() => onStepChange(landscapeOverviewSteps.model)}
        >
          Model Infra · {stats.model}
        </button>
      </div>
      {trend ? (
        <LandscapeInsightCard insight={trend} view={view} />
      ) : null}
    </article>
  );
}

function LandscapeInsightCard({
  insight,
  view,
}: {
  insight: LandscapeTrend;
  view: LandscapeView;
}) {
  return (
    <aside
      className={styles.landscapeInsight}
      data-view={view}
      aria-live="polite"
    >
      <div className={styles.insightIndex}>
        <EditableOpenInfrastructureText
          as="span"
          copyKey={insight.kickerKey}
        />
        <strong>{insight.index}</strong>
      </div>
      <div
        className={styles.insightMetrics}
        data-metric-count={insight.metrics.length}
      >
        {insight.metrics.map((metric) => (
          <div key={metric.labelKey}>
            <strong>{metric.value}</strong>
            <EditableOpenInfrastructureText
              as="span"
              copyKey={metric.labelKey}
            />
          </div>
        ))}
      </div>
      <EditableOpenInfrastructureText as="p" copyKey={insight.readingKey} />
    </aside>
  );
}

function NeedsGapSlide() {
  return (
    <article className={styles.needsGapSlide}>
      <SlideHeading eyebrowKey="needsGapEyebrow">
        <EditableOpenInfrastructureText as="span" copyKey="needsGapTitle" />
      </SlideHeading>
      <p className={styles.runtimePremise}>
        <EditableOpenInfrastructureText as="span" copyKey="runtimeStackPremise" />
      </p>
      <div className={styles.runtimeWorkload}>
        <p>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="runtimeProblemLead"
          />
        </p>
        <p>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="runtimeProblemEmphasis"
          />
        </p>
      </div>
      <p className={styles.runtimeProblemStatement}>
        <EditableOpenInfrastructureText
          as="span"
          copyKey="runtimeProblemStatement"
        />
      </p>
      <div className={styles.runtimeResponseBand}>
        <p className={styles.runtimeResponseLead}>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="runtimeResponseLead"
          />
        </p>
        <div className={styles.runtimeResponseProjects}>
          {runtimeResponseGroups.map((group) => (
            <section
              className={styles.runtimeResponseGroup}
              data-runtime-side={group.side}
              key={group.side}
            >
              <span className={styles.runtimeResponseSide}>
                <EditableOpenInfrastructureText
                  as="span"
                  copyKey={group.sideLabelKey}
                />
              </span>
              <div className={styles.runtimeResponseGroupProjects}>
                {group.projects.map((project) => (
                  <article
                    className={styles.runtimeResponseProject}
                    key={project.name}
                  >
                    <Image
                      alt=""
                      height={84}
                      src={projectLogoUrl(project.owner)}
                      unoptimized
                      width={84}
                    />
                    <div>
                      <strong>{project.name}</strong>
                      <small>
                        <EditableOpenInfrastructureText
                          as="span"
                          copyKey={project.roleKey}
                        />
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <p className={styles.taskEnvelopeStatement}>
        <EditableOpenInfrastructureText
          as="span"
          copyKey="taskEnvelopeSuffix"
        />
      </p>
      <SourceLine>
        <EditableOpenInfrastructureText as="span" copyKey="needsGapSource" />
      </SourceLine>
    </article>
  );
}

function LandscapeSignalSlide({ stats }: { stats: KeynoteStats }) {
  return (
    <article className={styles.landscapeSignalSlide}>
      <SlideHeading eyebrowKey="signalEyebrow">
        <EditableOpenInfrastructureText as="span" copyKey="signalTitle" />
      </SlideHeading>
      <div className={styles.pressureStack}>
        <section className={styles.attentionLayer}>
          <EditableOpenInfrastructureText as="span" copyKey="pressureTopLabel" />
          <p>
            <EditableOpenInfrastructureText
              as="span"
              copyKey="pressureTopBody"
            />
          </p>
        </section>
        <section className={styles.runtimeLayer}>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="pressureMiddleLabel"
          />
          <p>
            <strong>{stats.runtimeOutsideMay} of 23</strong>{" "}
            <EditableOpenInfrastructureText
              as="span"
              copyKey="pressureMiddleBody"
            />
          </p>
        </section>
        <section className={styles.foundationLayer}>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="pressureFoundationLabel"
          />
          <p>
            <EditableOpenInfrastructureText
              as="span"
              copyKey="pressureFoundationBody"
            />
          </p>
        </section>
      </div>
      <aside className={styles.runtimeProjectList}>
        <header>
          <strong>
            {stats.runtimeOutsideMayProjects.length}{" "}
            <EditableOpenInfrastructureText
              as="span"
              copyKey="runtimeAdditionsLabel"
            />
          </strong>
          <EditableOpenInfrastructureText
            as="span"
            copyKey="runtimeAdditionsPeriod"
          />
        </header>
        <div className={styles.runtimeProjectGroups}>
          {runtimeProjectGroups.map((group) => {
            const projects = stats.runtimeOutsideMayProjects.filter(
              (project) => project.zone === group.zone,
            );

            return (
              <section key={group.zone}>
                <h3>
                  <EditableOpenInfrastructureText
                    as="span"
                    copyKey={group.labelKey}
                  />{" "}
                  <span>{projects.length}</span>
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
        <EditableOpenInfrastructureText as="span" copyKey="signalSource" />
      </SourceLine>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.handoffSlide}>
      <EditableOpenInfrastructureText
        as="h2"
        className={styles.closingStatement}
        copyKey="closingStatement"
      />
      <EditableOpenInfrastructureText
        as="strong"
        className={styles.closingThanks}
        copyKey="closingThanks"
      />
    </article>
  );
}

function SlideHeading({
  eyebrowKey,
  children,
}: {
  eyebrowKey: keyof OpenInfrastructurePresentationCopy;
  children: ReactNode;
}) {
  return (
    <header className={styles.slideHeading}>
      <EditableOpenInfrastructureText as="span" copyKey={eyebrowKey} />
      <h2>{children}</h2>
    </header>
  );
}

function SourceLine({ children }: { children: ReactNode }) {
  return <p className={styles.sourceLine}>{children}</p>;
}
