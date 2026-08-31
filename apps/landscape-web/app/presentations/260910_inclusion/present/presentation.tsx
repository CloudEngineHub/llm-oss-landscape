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

import type { InclusionResearchStats } from "../research-data";
import styles from "./presentation.module.css";

type PresentationStats = InclusionResearchStats & {
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
  { id: "tracked-pool", label: "MAY → NOW" },
  { id: "landscape", label: "LANDSCAPE" },
  { id: "two-gates", label: "TWO GATES" },
  { id: "deepseek", label: "CASE" },
  { id: "question", label: "QUESTION" },
  { id: "method", label: "METHOD" },
  { id: "close", label: "CLOSE" },
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
      if (/^[1-8]$/.test(event.key)) setSceneIndex(Number(event.key) - 1);
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
            <span>{scene.label}</span>
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
            <strong>The Inclusion Conference</strong>
          </div>
          <h1>
            When agents joined in,
            <em>what happened to open-source collaboration?</em>
          </h1>
          <p>Xiaoya Xia · September 2026</p>
        </div>
        <div className={styles.collaborationMark}>
          <strong>ANT OPEN SOURCE</strong>
          <span>×</span>
          <strong>THE INCLUSION CONFERENCE</strong>
        </div>
      </article>
    );
  }

  if (id === "tracked-pool") {
    return (
      <article className={styles.talkSlide}>
        <TalkHeading eyebrow="MAY → CURRENT REVIEW">
          Ongoing review expanded the tracked pool by {stats.trackedDelta}{" "}
          projects.
        </TalkHeading>
        <div className={styles.poolTimeline}>
          <section>
            <span>MAY 2026</span>
            <strong>{stats.mayTracked}</strong>
            <p>repositories in the frozen tracking pool</p>
          </section>
          <i aria-hidden="true" />
          <section>
            <span>CURRENT</span>
            <strong>{stats.currentTracked}</strong>
            <p>repositories in the canonical project list</p>
          </section>
          <aside>
            <strong>{stats.total}</strong>
            <span>selected for the two maps</span>
          </aside>
        </div>
        <p className={styles.slideConclusion}>
          Projects entered through activity-based discovery, targeted GitHub
          searches and editorial review. Selection for the map was a separate
          decision.
        </p>
      </article>
    );
  }

  if (id === "landscape") {
    return (
      <article className={styles.talkSlide}>
        <TalkHeading eyebrow="LANDSCAPE">
          The crowded part and the growing part are different.
        </TalkHeading>
        <div className={styles.talkMacroChart}>
          <div className={styles.talkMacroLegend}>
            <span><i data-series="projects" />Project share</span>
            <span><i data-series="openrank" />OpenRank share</span>
          </div>
          {stats.agentMacro.map((group) => (
            <section key={group.label}>
              <div>
                <strong>{group.label}</strong>
                <span>{group.projects} projects</span>
              </div>
              <p>
                <i data-series="projects" style={{ width: `${group.projectShare}%` }} />
                <i data-series="openrank" style={{ width: `${group.openrankShare}%` }} />
              </p>
              <b>{group.projectShare}% / {group.openrankShare}%</b>
            </section>
          ))}
        </div>
        <div className={styles.talkFindingStrip}>
          <p><strong>55%</strong><span>of Agent Infra OpenRank sits in Application</span></p>
          <p><strong>{stats.runtimeOutsideMay}/{stats.agentOutsideMay}</strong><span>Agent projects outside the May pool sit in Runtime</span></p>
          <p><strong>44%</strong><span>of Model Infra OpenRank sits in Serving</span></p>
        </div>
      </article>
    );
  }

  if (id === "two-gates") return <TwoGatesSlide />;
  if (id === "deepseek") return <DeepSeekSlide />;
  if (id === "question") return <QuestionSlide />;
  if (id === "method") return <MethodSlide />;
  return <ClosingSlide />;
}

function TalkHeading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <header className={styles.talkHeading}>
      <span>{eyebrow}</span>
      <h2>{children}</h2>
    </header>
  );
}

function TwoGatesSlide() {
  return (
    <article className={styles.talkSlide}>
      <TalkHeading eyebrow="ONE AGENT · TWO BOUNDARIES">Agents enter software twice.</TalkHeading>
      <div className={styles.gatePair}>
        <section>
          <span>BEFORE MERGE</span>
          <h3>Who can change the software?</h3>
          <p>Issues · pull requests · review · maintainer judgment</p>
          <strong>MERGE GATE</strong>
        </section>
        <section>
          <span>AFTER DEPLOYMENT</span>
          <h3>What can the software change?</h3>
          <p>Code execution · tools · authority · external effects</p>
          <strong>EXECUTION GATE</strong>
        </section>
      </div>
    </article>
  );
}

function DeepSeekSlide() {
  return (
    <article className={styles.talkSlide}>
      <TalkHeading eyebrow="CASE · DEEPSEEK HARNESS">
        Open code can still keep the core closed.
      </TalkHeading>
      <div className={styles.caseSlideGrid}>
        <blockquote>
          “You may consider this repository an idea, an official showcase, and a source of inspiration.”
        </blockquote>
        <dl>
          <div><dt>LICENSE</dt><dd>MIT</dd></div>
          <div><dt>ISSUES</dt><dd data-state="off">Off</dd></div>
          <div><dt>PULL REQUESTS</dt><dd data-state="off">Off</dd></div>
          <div><dt>DISCUSSIONS</dt><dd data-state="on">On</dd></div>
          <div><dt>ECOSYSTEM SURFACE</dt><dd>Plugins</dd></div>
        </dl>
      </div>
      <p className={styles.slideConclusion}>Publishing source, accepting outside changes and growing an ecosystem are three different decisions.</p>
    </article>
  );
}

function QuestionSlide() {
  return (
    <article className={styles.talkSlide}>
      <TalkHeading eyebrow="THE RESEARCH QUESTION">
        More code does not tell us whether collaboration improved.
      </TalkHeading>
      <div className={styles.researchMeasures}>
        <section><strong>OUTPUT</strong><span>PRs and commits per repository-month</span></section>
        <section><strong>ENTRY</strong><span>First-time contributor merge and return</span></section>
        <section><strong>JUDGMENT</strong><span>Time to first human review and revision rounds</span></section>
        <section><strong>PRESSURE</strong><span>Review load per active maintainer</span></section>
      </div>
      <p className={styles.slideConclusion}>The answer has to include the work that lands on maintainers.</p>
    </article>
  );
}

function MethodSlide() {
  return (
    <article className={styles.talkSlide}>
      <TalkHeading eyebrow="FIELD STUDY DESIGN">
        The answer needs a matched control group.
      </TalkHeading>
      <div className={styles.cohortFlow}>
        <section><strong>≈100</strong><span>post-2024 Agentic AI repositories</span></section>
        <i aria-hidden="true" />
        <section><strong>1:1</strong><span>traditional software controls</span></section>
        <i aria-hidden="true" />
        <section><strong>Same age window</strong><span>language · owner type · contributor scale · PR intake</span></section>
      </div>
      <div className={styles.methodBoundary}>
        <span>CONFIRMED AGENT</span>
        <span>AUTOMATION / BOT</span>
        <span>HUMAN ACCOUNT</span>
        <span>UNKNOWN</span>
      </div>
    </article>
  );
}

function ClosingSlide() {
  return (
    <article className={styles.talkClosing}>
      <span>THE SAME QUESTION RETURNS AFTER DEPLOYMENT</span>
      <h2>Who authorised the change, and can someone reconstruct it later?</h2>
      <div>
        <p><strong>MERGE GATE</strong><span>maintainer review</span></p>
        <p><strong>EXECUTION GATE</strong><span>infrastructure policy and evidence</span></p>
      </div>
    </article>
  );
}
