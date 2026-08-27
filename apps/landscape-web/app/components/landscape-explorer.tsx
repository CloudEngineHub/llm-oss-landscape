"use client";

import {
  ArrowUpRightIcon,
  Maximize2Icon,
  Share2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LandscapeProject, StageId } from "@/lib/landscape-types";
import { projectLogoUrl } from "@/lib/project-logo";
import { cn } from "@/lib/utils";

import styles from "../page.module.css";
import { EcosystemSignals } from "./ecosystem-signals";
import { LandscapeShareDialog } from "./landscape-share-dialog";
import { ProjectInsightDialog } from "./project-insight-dialog";
import { ProjectRanking } from "./project-ranking";

type StageDefinition = {
  id: StageId;
  label: string;
  description: string;
};

const STAGES: StageDefinition[] = [
  {
    id: "application",
    label: "Agent Application",
    description: "Where people delegate work",
  },
  {
    id: "framework",
    label: "Agent Framework",
    description: "How agents are assembled and orchestrated",
  },
  {
    id: "runtime",
    label: "Agent Runtime Infra",
    description: "What agents need to execute reliably",
  },
  {
    id: "model",
    label: "Model Infrastructure",
    description: "From data and training to serving and scheduling",
  },
];

function matchesQuery(project: LandscapeProject, query: string) {
  if (!query) return true;

  const searchableText = [
    project.name,
    project.repo,
    project.owner,
    project.description,
    project.language,
    project.zone,
    ...project.categories,
    ...project.topics,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term));
}

function formatOpenRank(project: LandscapeProject) {
  return project.openrank?.toLocaleString("en", {
    maximumFractionDigits: 1,
  }) ?? "—";
}

function projectInitials(name: string) {
  return name
    .split(/[\s./_-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function logoContentClipPath(image: HTMLImageElement) {
  const style = window.getComputedStyle(image);
  const width = image.clientWidth;
  const height = image.clientHeight;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
  const availableWidth = Math.max(0, width - paddingLeft - paddingRight);
  const availableHeight = Math.max(0, height - paddingTop - paddingBottom);
  const aspectRatio = image.naturalWidth / image.naturalHeight;

  if (!width || !height || !availableWidth || !availableHeight || !aspectRatio) {
    return undefined;
  }

  const availableAspectRatio = availableWidth / availableHeight;
  const renderedWidth =
    aspectRatio >= availableAspectRatio
      ? availableWidth
      : availableHeight * aspectRatio;
  const renderedHeight =
    aspectRatio >= availableAspectRatio
      ? availableWidth / aspectRatio
      : availableHeight;
  const horizontalInset = (width - renderedWidth) / 2;
  const verticalInset = (height - renderedHeight) / 2;
  const radius = Math.min(7, renderedWidth * 0.18, renderedHeight * 0.18);
  const px = (value: number) => `${value.toFixed(2)}px`;

  return `inset(${px(verticalInset)} ${px(horizontalInset)} round ${px(radius)})`;
}

const CURATED_PROJECT_PRIORITY = new Map([
  ["deepseek-ai/deepseek-harness", 100],
]);

function compareLandscapeProjects(
  a: LandscapeProject,
  b: LandscapeProject,
) {
  return (
    (CURATED_PROJECT_PRIORITY.get(b.repo) ?? 0) -
      (CURATED_PROJECT_PRIORITY.get(a.repo) ?? 0) ||
    (b.openrank ?? -1) - (a.openrank ?? -1) ||
    a.name.localeCompare(b.name)
  );
}

type RankStyle = CSSProperties & {
  "--name-size": string;
};

type ZoneStyle = CSSProperties & {
  "--project-columns": number;
  "--project-rows": number;
};

type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WeightedZone = {
  zone: string;
  projects: LandscapeProject[];
  weight: number;
  area: number;
};

const STAGE_ASPECT_RATIO: Record<StageId, number> = {
  application: 6.2,
  framework: 8.4,
  runtime: 5.3,
  model: 2.05,
};

const MODEL_STAGES = [
  {
    label: "Access & Serving",
    description: "Closest to model workloads",
    rows: [
      [
        "Model API gateways",
        "Serving · Deploy",
        "Serving · Inference",
      ],
    ],
  },
  {
    label: "Model Training",
    description: "Post-train and pre-train systems",
    rows: [
      [
        "Post-Train · RL & environments",
        "Post-Train · Supervised fine-tuning",
      ],
      [
        "Pre-Train · Framework & parallel",
        "Pre-Train · Compiler & accelerator",
        "Pre-Train · Evaluation & observability",
        "Pre-Train · Robotics infra",
      ],
    ],
  },
  {
    label: "Data & Compute",
    description: "Foundation for model development",
    rows: [
      [
        "Data · Labeling",
        "Data · Integration",
        "Data · Governance",
        "Compute & scheduling",
      ],
    ],
  },
] as const;

const MODEL_STAGE_ASPECT_RATIO: Record<
  (typeof MODEL_STAGES)[number]["label"],
  number
> = {
  "Access & Serving": 6.83,
  "Model Training": 4.74,
  "Data & Compute": 6.83,
};

const LANDSCAPE_CANVAS_WIDTH = 1440;
const LANDSCAPE_CANVAS_HEIGHT = 810;
const LANDSCAPE_UPDATED_AT = "2026-08-26";

function FixedLandscapeFrame({
  children,
  fitViewport,
  allowUpscale,
  fitContainerHeight,
}: {
  children: ReactNode;
  fitViewport?: boolean;
  allowUpscale?: boolean;
  fitContainerHeight?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const fit = () => {
      const availableHeight = fitContainerHeight
        ? viewport.clientHeight
        : window.innerHeight;
      const heightScale = fitViewport
        ? availableHeight / LANDSCAPE_CANVAS_HEIGHT
        : 1;
      setScale(
        Math.min(
          allowUpscale ? Number.POSITIVE_INFINITY : 1,
          viewport.clientWidth / LANDSCAPE_CANVAS_WIDTH,
          heightScale,
        ),
      );
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    if (fitViewport) window.addEventListener("resize", fit);

    return () => {
      observer.disconnect();
      if (fitViewport) window.removeEventListener("resize", fit);
    };
  }, [allowUpscale, fitContainerHeight, fitViewport]);

  return (
    <div
      ref={viewportRef}
      className={styles.boardViewport}
      data-fit-container-height={fitContainerHeight || undefined}
    >
      <div
        className={styles.landscapeFrameSizer}
        style={{
          width: LANDSCAPE_CANVAS_WIDTH * scale,
          height: LANDSCAPE_CANVAS_HEIGHT * scale,
        }}
      >
        <div
          className={styles.landscapeFrameSurface}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function projectGrid(count: number, aspectRatio: number) {
  if (count <= 1) return { columns: 1, rows: 1 };

  let columns = Math.max(
    1,
    Math.min(count, Math.round(Math.sqrt(count * aspectRatio))),
  );

  if (count === 2 && aspectRatio < 1) columns = 1;
  if (count === 3) columns = aspectRatio >= 1.35 ? 3 : 2;
  if (count === 4 && aspectRatio > 0.55 && aspectRatio < 2.2) {
    columns = 2;
  }

  if (count >= 5 && aspectRatio >= 1.15) {
    columns = Math.max(columns, Math.ceil(count / 2));
  }

  if (count >= 5 && count % columns === 1 && columns < count) {
    columns += 1;
  }

  return {
    columns,
    rows: Math.ceil(count / columns),
  };
}

function worstRowAspect(row: WeightedZone[], shortSide: number) {
  if (!row.length) return Number.POSITIVE_INFINITY;

  const area = row.reduce((sum, item) => sum + item.area, 0);
  const largest = Math.max(...row.map((item) => item.area));
  const smallest = Math.min(...row.map((item) => item.area));
  const sideSquared = shortSide ** 2;

  return Math.max(
    (sideSquared * largest) / area ** 2,
    area ** 2 / (sideSquared * smallest),
  );
}

function placeTreemapRow(
  row: WeightedZone[],
  remaining: LayoutRect,
  layouts: Map<string, LayoutRect>,
) {
  const rowArea = row.reduce((sum, item) => sum + item.area, 0);

  if (remaining.width >= remaining.height) {
    const columnWidth = rowArea / remaining.height;
    let y = remaining.y;

    row.forEach((item) => {
      const height = item.area / columnWidth;
      layouts.set(item.zone, {
        x: remaining.x,
        y,
        width: columnWidth,
        height,
      });
      y += height;
    });

    return {
      x: remaining.x + columnWidth,
      y: remaining.y,
      width: Math.max(0, remaining.width - columnWidth),
      height: remaining.height,
    };
  }

  const rowHeight = rowArea / remaining.width;
  let x = remaining.x;

  row.forEach((item) => {
    const width = item.area / rowHeight;
    layouts.set(item.zone, {
      x,
      y: remaining.y,
      width,
      height: rowHeight,
    });
    x += width;
  });

  return {
    x: remaining.x,
    y: remaining.y + rowHeight,
    width: remaining.width,
    height: Math.max(0, remaining.height - rowHeight),
  };
}

function buildTreemap(items: Omit<WeightedZone, "area">[], aspect: number) {
  const width = 1000;
  const height = width / aspect;
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const scale = (width * height) / totalWeight;
  const remainingItems: WeightedZone[] = items
    .map((item) => ({ ...item, area: item.weight * scale }))
    .sort((a, b) => b.area - a.area);
  const layouts = new Map<string, LayoutRect>();
  let remaining: LayoutRect = { x: 0, y: 0, width, height };
  let row: WeightedZone[] = [];

  while (remainingItems.length) {
    const candidate = remainingItems[0];
    const shortSide = Math.min(remaining.width, remaining.height);
    const nextRow = [...row, candidate];

    if (
      !row.length ||
      worstRowAspect(nextRow, shortSide) <=
        worstRowAspect(row, shortSide)
    ) {
      row = nextRow;
      remainingItems.shift();
    } else {
      remaining = placeTreemapRow(row, remaining, layouts);
      row = [];
    }
  }

  if (row.length) placeTreemapRow(row, remaining, layouts);

  return new Map(
    [...layouts].map(([zone, rect]) => [
      zone,
      {
        x: (rect.x / width) * 100,
        y: (rect.y / height) * 100,
        width: (rect.width / width) * 100,
        height: (rect.height / height) * 100,
      },
    ]),
  );
}

function ProjectMark({
  project,
  matched,
  selected,
  focused,
  onSelect,
}: {
  project: LandscapeProject;
  matched: boolean;
  selected: boolean;
  focused?: boolean;
  onSelect: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoClipPath, setLogoClipPath] = useState<string>();
  const labelScale = Math.max(
    0.62,
    1 - Math.max(0, project.name.length - 10) * 0.035,
  );
  const style: RankStyle = {
    "--name-size": `${(10.2 * labelScale).toFixed(3)}px`,
  };

  return (
    <button
      className={cn(
        styles.projectMark,
        focused && styles.focusedProjectMark,
        !matched && styles.projectMarkDimmed,
        selected && styles.projectMarkSelected,
      )}
      type="button"
      style={style}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${project.name}, OpenRank ${formatOpenRank(project)}`}
      data-landscape-project
      data-landscape-signal={
        project.trendSignals.length
          ? project.trendSignals.join(" ")
          : undefined
      }
    >
      <span className={styles.projectLogoWrap} data-landscape-logo>
        <span className={styles.projectLogo}>
          {!logoFailed ? (
            <Image
              src={projectLogoUrl(project.owner)}
              width={112}
              height={96}
              unoptimized
              data-export-logo-owner={project.owner}
              decoding="async"
              loading="eager"
              alt=""
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                padding: 2,
                objectFit: "contain",
                display: "block",
                clipPath: logoClipPath,
              }}
              onLoad={(event) =>
                setLogoClipPath(logoContentClipPath(event.currentTarget))
              }
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className={styles.projectLogoFallback}>
              {projectInitials(project.name)}
            </span>
          )}
        </span>
      </span>
      <span className={styles.projectLabelLine}>
        <span className={styles.projectName} data-landscape-project-name>
          {project.name}
        </span>
        {project.trendSignals.length ? (
          <span className={styles.projectSignalBadges}>
            {project.trendSignals.map((signal) => (
              <span
                key={signal}
                className={styles.projectNewBadge}
                data-signal={signal}
                title={project.trendSignalReason}
                aria-label={
                  signal === "new"
                    ? "Created in the current three-month window"
                    : "Project with strong recent growth"
                }
              >
                {signal === "new" ? "NEW" : "RISING"}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {focused ? (
        <span className={styles.focusedProjectMeta}>
          {project.owner} · OR {formatOpenRank(project)}
        </span>
      ) : null}
      <span className={styles.projectRank}>
        <strong>{formatOpenRank(project)}</strong>
        <small>OpenRank</small>
      </span>
    </button>
  );
}

function ZoneSection({
  zone,
  zoneProjects,
  normalizedQuery,
  selectedRepo,
  presentationFocus,
  onSelect,
  expanded,
  style,
  aspectRatio,
  className,
}: {
  zone: string;
  zoneProjects: LandscapeProject[];
  normalizedQuery: string;
  selectedRepo: string | null;
  presentationFocus?: string;
  onSelect: (repo: string) => void;
  expanded?: boolean;
  style?: CSSProperties;
  aspectRatio: number;
  className?: string;
}) {
  const orderedZoneProjects = [...zoneProjects].sort(
    compareLandscapeProjects,
  );
  const [zoneFamily, zoneName = zone] = zone.includes(" · ")
    ? zone.split(" · ", 2)
    : ["", zone];
  const grid = projectGrid(orderedZoneProjects.length, aspectRatio);
  const zoneStyle: ZoneStyle = {
    ...style,
    "--project-columns": grid.columns,
    "--project-rows": grid.rows,
  };
  const title = (
    <Badge className={styles.zoneTitleBadge} variant="outline">
      <span>{zoneFamily ? `${zoneFamily} / ${zoneName}` : zoneName}</span>
    </Badge>
  );

  return (
    <section
      data-landscape-zone
      data-presentation-focus={
        presentationFocus === zone ? "true" : undefined
      }
      data-presentation-muted={
        presentationFocus && presentationFocus !== zone ? "true" : undefined
      }
      className={cn(styles.zone, className)}
      style={zoneStyle}
    >
      <header className={styles.zoneHeader}>
        <span aria-hidden="true" />
        <h4>{title}</h4>
        <Badge className={styles.zoneCountBadge} variant="secondary">
          {orderedZoneProjects.length}
        </Badge>
        <span aria-hidden="true" />
      </header>
      <div className={styles.projectCloud}>
        {orderedZoneProjects.map((zoneProject) => (
          <ProjectMark
            key={zoneProject.repo}
            project={zoneProject}
            matched={matchesQuery(zoneProject, normalizedQuery)}
            selected={selectedRepo === zoneProject.repo}
            focused={expanded}
            onSelect={() => onSelect(zoneProject.repo)}
          />
        ))}
      </div>
    </section>
  );
}

function StageSection({
  stage,
  projects,
  normalizedQuery,
  selectedRepo,
  presentationFocus,
  onSelect,
  focused,
  onFocusStage,
}: {
  stage: StageDefinition;
  projects: LandscapeProject[];
  normalizedQuery: string;
  selectedRepo: string | null;
  presentationFocus?: string;
  onSelect: (repo: string) => void;
  focused?: boolean;
  onFocusStage?: (stage: StageId) => void;
}) {
  const stageProjects = projects.filter(
    (project) => project.stage === stage.id,
  );
  const zones = [...new Set(stageProjects.map((project) => project.zone))];
  const zoneItems = zones.map((zone) => {
    const zoneProjects = stageProjects
      .filter((project) => project.zone === zone)
      .sort(compareLandscapeProjects);
    const weight =
      1.1 +
      zoneProjects.reduce(
        (sum, project) =>
          sum +
          1 +
          Math.min(project.name.length, 24) * 0.006,
        0,
      );

    return { zone, projects: zoneProjects, weight };
  });
  const stageAspect = focused ? 2.08 : STAGE_ASPECT_RATIO[stage.id];
  const zoneLayouts = buildTreemap(
    zoneItems,
    stageAspect,
  );

  const stageTitle = (
    <>
      <div>
        <h3>{stage.label}</h3>
        <span>{stage.description}</span>
      </div>
      <em>
        {stageProjects.length}
        {onFocusStage ? <Maximize2Icon aria-hidden="true" /> : null}
      </em>
    </>
  );

  return (
    <article
      className={cn(
        styles.stage,
        styles[`stage_${stage.id}`],
        focused && styles.stageFocused,
      )}
      data-focused-stage={focused ? stage.id : undefined}
    >
      {onFocusStage ? (
        <button
          className={styles.stageLabel}
          type="button"
          aria-pressed={focused}
          aria-label={`Focus ${stage.label}`}
          onClick={() => onFocusStage(stage.id)}
        >
          {stageTitle}
        </button>
      ) : (
        <header className={styles.stageLabel}>{stageTitle}</header>
      )}

      <div className={styles.stageGrid}>
        {zoneItems.map(({ zone, projects: zoneProjects }) => {
          const layout = zoneLayouts.get(zone)!;
          const zoneStyle: CSSProperties = {
            left: `${layout.x}%`,
            top: `${layout.y}%`,
            width: `${layout.width}%`,
            height: `${layout.height}%`,
          };

          return (
            <ZoneSection
              key={zone}
              zone={zone}
              zoneProjects={zoneProjects}
              normalizedQuery={normalizedQuery}
              selectedRepo={selectedRepo}
              presentationFocus={presentationFocus}
              onSelect={onSelect}
              expanded={focused}
              style={zoneStyle}
              aspectRatio={
                (stageAspect * layout.width) /
                layout.height
              }
            />
          );
        })}
      </div>
    </article>
  );
}

function ModelStageSection({
  definition,
  projects,
  normalizedQuery,
  selectedRepo,
  presentationFocus,
  onSelect,
  focused,
  onFocusStage,
}: {
  definition: (typeof MODEL_STAGES)[number];
  projects: LandscapeProject[];
  normalizedQuery: string;
  selectedRepo: string | null;
  presentationFocus?: string;
  onSelect: (repo: string) => void;
  focused?: boolean;
  onFocusStage?: (stage: string) => void;
}) {
  const modelProjects = projects.filter(
    (project) => project.stage === "model",
  );
  const rows = definition.rows.map((rowZones) => {
    const items = rowZones.map((zone) => {
      const zoneProjects = modelProjects
        .filter((project) => project.zone === zone)
        .sort(compareLandscapeProjects);
      const weight =
        1.25 +
        zoneProjects.reduce(
          (sum, project) =>
            sum +
            1 +
            Math.min(project.name.length, 24) * 0.005,
          0,
        );

      return { zone, projects: zoneProjects, weight };
    });
    const projectCount = items.reduce(
      (sum, item) => sum + item.projects.length,
      0,
    );

    return {
      items,
      weight: 3 + projectCount,
    };
  });
  const totalRowWeight = rows.reduce(
    (sum, row) => sum + row.weight,
    0,
  );
  const macroAspect = MODEL_STAGE_ASPECT_RATIO[definition.label];
  const projectCount = rows.reduce(
    (sum, row) =>
      sum + row.items.reduce((rowSum, item) => rowSum + item.projects.length, 0),
    0,
  );
  const stageTitle = (
    <>
      <div>
        <h3>{definition.label}</h3>
        <span>{definition.description}</span>
      </div>
      <em>
        {projectCount}
        {onFocusStage ? <Maximize2Icon aria-hidden="true" /> : null}
      </em>
    </>
  );

  return (
    <article
      className={cn(
        styles.stage,
        styles.stage_model,
        styles.modelMacroStage,
        focused && styles.stageFocused,
      )}
      data-focused-stage={focused ? definition.label : undefined}
    >
      {onFocusStage ? (
        <button
          className={styles.stageLabel}
          type="button"
          aria-pressed={focused}
          aria-label={`Focus ${definition.label}`}
          onClick={() => onFocusStage(definition.label)}
        >
          {stageTitle}
        </button>
      ) : (
        <header className={styles.stageLabel}>{stageTitle}</header>
      )}
      <div
        className={styles.modelStageGrid}
        style={{
          gridTemplateRows: rows
            .map((row) => `${row.weight}fr`)
            .join(" "),
        }}
      >
        {rows.map((row, rowIndex) => {
          const rowAspect =
            macroAspect * (totalRowWeight / row.weight);
          const totalItemWeight = row.items.reduce(
            (sum, item) => sum + item.weight,
            0,
          );

          return (
            <div
              key={`${definition.label}-${rowIndex}`}
              className={styles.modelStageRow}
              style={{
                gridTemplateColumns: row.items
                  .map((item) => `${item.weight}fr`)
                  .join(" "),
              }}
            >
              {row.items.map(
                ({ zone, projects: zoneProjects, weight }) => (
                  <ZoneSection
                    key={zone}
                    zone={zone}
                    zoneProjects={zoneProjects}
                    normalizedQuery={normalizedQuery}
                    selectedRepo={selectedRepo}
                    presentationFocus={presentationFocus}
                    onSelect={onSelect}
                    expanded={focused}
                    aspectRatio={
                      rowAspect * (weight / totalItemWeight)
                    }
                    className={styles.modelStageZone}
                  />
                ),
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function EmbeddedLandscape({
  id,
  title,
  detail,
  src,
  accent,
}: {
  id: string;
  title: string;
  detail: string;
  src: string;
  accent: "models" | "awesome";
}) {
  return (
    <section
      className={cn(
        styles.landscapeModule,
        styles.embeddedLandscapeModule,
        accent === "models"
          ? styles.largeModelsModule
          : styles.awesomeLandscapeModule,
      )}
      id={id}
    >
      <header className={styles.embeddedModuleHeader}>
        <div className={styles.moduleHeading}>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
        <a
          className={styles.canvasLink}
          href={src}
          target="_blank"
          rel="noreferrer"
        >
          Open full canvas
          <ArrowUpRightIcon aria-hidden="true" />
        </a>
      </header>

      <div className={styles.embeddedLandscapeFrame}>
        <iframe
          src={src}
          title={`${title} Landscape 2026`}
          loading="lazy"
        />
      </div>
    </section>
  );
}

export default function LandscapeExplorer({
  projects,
  embedOnly,
  standalone,
  presentationFocus,
  presentationMode,
  filterQuery,
}: {
  projects: LandscapeProject[];
  embedOnly?: "agent" | "model";
  standalone?: boolean;
  presentationFocus?: string;
  presentationMode?: boolean;
  filterQuery?: string;
}) {
  const [infraQuery, setInfraQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<{
    module: "agent" | "model";
    stage: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<"agent" | "model">(
    "agent",
  );
  const [dialogScope, setDialogScope] = useState<"agent" | "model" | null>(
    embedOnly ?? null,
  );
  const agentSlideRef = useRef<HTMLElement>(null);
  const modelSlideRef = useRef<HTMLElement>(null);
  const [agentDialogHost, setAgentDialogHost] =
    useState<HTMLDivElement | null>(null);
  const [modelDialogHost, setModelDialogHost] =
    useState<HTMLDivElement | null>(null);
  const activeInfraQuery = filterQuery ?? infraQuery;
  const normalizedInfraQuery = activeInfraQuery.trim().toLowerCase();

  useEffect(() => {
    if (!focusedStage || selectedRepo) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusedStage(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedStage, selectedRepo]);

  const selectedProject =
    projects.find((project) => project.repo === selectedRepo) ?? null;
  const selectedNeighbors = selectedProject
    ? projects
        .filter(
          (project) =>
            project.zone === selectedProject.zone &&
            project.repo !== selectedProject.repo,
        )
        .sort(
          (a, b) =>
            (b.openrank ?? -1) - (a.openrank ?? -1) ||
            a.name.localeCompare(b.name),
        )
    : [];

  const agentProjects = projects.filter(
    (project) => project.stage !== "model",
  );
  const modelProjects = projects.filter(
    (project) => project.stage === "model",
  );
  const agentMatchCount = agentProjects.filter((project) =>
    matchesQuery(project, normalizedInfraQuery),
  ).length;
  const modelMatchCount = modelProjects.filter((project) =>
    matchesQuery(project, normalizedInfraQuery),
  ).length;
  const agentStages = STAGES.filter((stage) => stage.id !== "model");
  const agentStageStyle: CSSProperties = {
    gridTemplateRows: agentStages
      .map((stage) => {
        const stageProjects = projects.filter(
          (project) => project.stage === stage.id,
        );
        const zoneCount = new Set(
          stageProjects.map((project) => project.zone),
        ).size;
        return `${
          18 + stageProjects.length * 0.55 + zoneCount * 1.2
        }fr`;
      })
      .join(" "),
  };
  const modelStageStyle: CSSProperties = {
    gridTemplateRows: MODEL_STAGES.map((definition) => {
      const stageZones = new Set<string>(definition.rows.flat());
      const projectCount = projects.filter(
        (project) =>
          project.stage === "model" && stageZones.has(project.zone),
      ).length;

      return `${8 + projectCount}fr`;
    }).join(" "),
  };

  return (
    <section
      className={cn(styles.explorer, embedOnly && styles.embedExplorer)}
      data-presentation-mode={presentationMode || undefined}
      id="landscape"
      aria-label={
        embedOnly
          ? `${embedOnly === "agent" ? "Agent" : "Model"} Infra landscape`
          : "Interactive Agentic AI open-source landscape"
      }
    >
      {!embedOnly ? (
        <>
          <div className={styles.landscapeLead} id="landscape-home">
            <h1>
              Era of Agentic AI:
              <br />
              Landscape and Trends
            </h1>
          </div>

          <div className={styles.sharedInfraSearchBar}>
            <label className={cn(styles.search, styles.sharedInfraSearch)}>
              <SearchIcon aria-hidden="true" />
              <span className={styles.srOnly}>
                Search Agent and Model Infra
              </span>
              <Input
                value={infraQuery}
                onChange={(event) => setInfraQuery(event.target.value)}
                placeholder="Search projects, organizations, languages, technologies"
              />
              {infraQuery ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => setInfraQuery("")}
                  aria-label="Clear Infra search"
                >
                  <XIcon />
                </Button>
              ) : null}
            </label>
            <span className={styles.srOnly} aria-live="polite">
              {normalizedInfraQuery
                ? `${agentMatchCount} Agent Infra matches and ${modelMatchCount} Model Infra matches`
                : `${agentProjects.length} Agent Infra projects and ${modelProjects.length} Model Infra projects`}
            </span>
          </div>
        </>
      ) : null}

      {embedOnly !== "model" ? (
        <section
          className={cn(
            styles.landscapeModule,
            styles.agentLandscapeModule,
          )}
          id="agent-infra"
        >
          {!embedOnly ? (
            <>
              <header className={styles.moduleHeader}>
                <div className={styles.moduleHeading}>
                  <h2>Agent Infra</h2>
                  <h3>Where agents are built, operated, and used.</h3>
                  <p>Applications · Frameworks · Runtime infrastructure</p>
                </div>
                <div className={styles.moduleHeaderActions}>
                  <a
                    className={styles.canvasLink}
                    href="/embed/agent-infra"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open canvas
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                  <Button
                    className={styles.shareButton}
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setShareTarget("agent");
                      setShareOpen(true);
                    }}
                  >
                    <Share2Icon data-icon="inline-start" />
                    Export &amp; share
                  </Button>
                </div>
              </header>
            </>
          ) : null}

          <FixedLandscapeFrame
            fitViewport={standalone || presentationMode}
            allowUpscale={presentationMode}
            fitContainerHeight={presentationMode}
          >
            <div className={styles.landscapeBoard}>
              <section
                ref={agentSlideRef}
                className={cn(
                  styles.landscapeSlide,
                  styles.agentLandscapeSlide,
                )}
              >
                <header className={styles.boardMasthead}>
                  <div className={styles.boardTitleLockup}>
                    <h2>
                      <span>Agent Infra</span>
                      <em>Landscape 2026</em>
                    </h2>
                  </div>
                  <div className={styles.boardSource}>
                    <span>
                      {agentProjects.length} projects
                      <br />
                      Updated {LANDSCAPE_UPDATED_AT}
                    </span>
                    {focusedStage?.module === "agent" ? (
                      <button
                        className={styles.resetStageView}
                        type="button"
                        onClick={() => setFocusedStage(null)}
                      >
                        Back to overview
                      </button>
                    ) : null}
                  </div>
                </header>

                <div className={styles.landscapeBand}>
                  <div
                    className={cn(
                      styles.stageStack,
                      styles.agentStageStack,
                      focusedStage?.module === "agent" &&
                        styles.stageStackFocused,
                    )}
                    style={
                      focusedStage?.module === "agent"
                        ? { gridTemplateRows: "minmax(0, 1fr)" }
                        : agentStageStyle
                    }
                  >
                    {agentStages
                      .filter(
                        (stage) =>
                          focusedStage?.module !== "agent" ||
                          focusedStage.stage === stage.id,
                      )
                      .map((stage) => (
                        <StageSection
                          key={stage.id}
                          stage={stage}
                          projects={projects}
                          normalizedQuery={normalizedInfraQuery}
                          selectedRepo={selectedRepo}
                          presentationFocus={presentationFocus}
                          onSelect={(repo) => {
                            setDialogScope("agent");
                            setSelectedRepo(repo);
                          }}
                          focused={
                            focusedStage?.module === "agent" &&
                            focusedStage.stage === stage.id
                          }
                          onFocusStage={
                            presentationMode
                              ? undefined
                              : (stageId) =>
                                  setFocusedStage((current) =>
                                    current?.module === "agent" &&
                                    current.stage === stageId
                                      ? null
                                      : { module: "agent", stage: stageId },
                                  )
                          }
                        />
                      ))}
                  </div>
                </div>
              </section>
              <div
                ref={setAgentDialogHost}
                className={styles.landscapeDialogHost}
                aria-hidden={
                  !selectedProject || dialogScope !== "agent"
                }
              />
            </div>
          </FixedLandscapeFrame>
        </section>
      ) : null}

      {embedOnly !== "agent" ? (
        <section
          className={cn(
            styles.landscapeModule,
            styles.modelLandscapeModule,
          )}
          id="model-infra"
        >
          {!embedOnly ? (
            <>
              <header className={styles.moduleHeader}>
                <div className={styles.moduleHeading}>
                  <h2>Model Infra</h2>
                  <h3>The systems beneath model workloads.</h3>
                  <p>Access &amp; serving · Training · Data &amp; compute</p>
                </div>
                <div className={styles.moduleHeaderActions}>
                  <a
                    className={styles.canvasLink}
                    href="/embed/model-infra"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open canvas
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                  <Button
                    className={styles.shareButton}
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setShareTarget("model");
                      setShareOpen(true);
                    }}
                  >
                    <Share2Icon data-icon="inline-start" />
                    Export &amp; share
                  </Button>
                </div>
              </header>
            </>
          ) : null}

          <FixedLandscapeFrame
            fitViewport={standalone || presentationMode}
            allowUpscale={presentationMode}
            fitContainerHeight={presentationMode}
          >
            <div className={styles.landscapeBoard}>
              <section
                ref={modelSlideRef}
                className={cn(
                  styles.landscapeSlide,
                  styles.modelLandscapeSlide,
                )}
              >
                <header className={styles.boardMasthead}>
                  <div className={styles.boardTitleLockup}>
                    <h2>
                      <span>Model Infra</span>
                      <em>Landscape 2026</em>
                    </h2>
                  </div>
                  <div className={styles.boardSource}>
                    <span>
                      {modelProjects.length} projects
                      <br />
                      Updated {LANDSCAPE_UPDATED_AT}
                    </span>
                    {focusedStage?.module === "model" ? (
                      <button
                        className={styles.resetStageView}
                        type="button"
                        onClick={() => setFocusedStage(null)}
                      >
                        Back to overview
                      </button>
                    ) : null}
                  </div>
                </header>

                <div className={styles.landscapeBand}>
                  <div
                    className={cn(
                      styles.stageStack,
                      styles.modelStageStack,
                      focusedStage?.module === "model" &&
                        styles.stageStackFocused,
                    )}
                    style={
                      focusedStage?.module === "model"
                        ? { gridTemplateRows: "minmax(0, 1fr)" }
                        : modelStageStyle
                    }
                  >
                    {MODEL_STAGES.filter(
                      (definition) =>
                        focusedStage?.module !== "model" ||
                        focusedStage.stage === definition.label,
                    ).map((definition) => (
                      <ModelStageSection
                        key={definition.label}
                        definition={definition}
                        projects={projects}
                        normalizedQuery={normalizedInfraQuery}
                        selectedRepo={selectedRepo}
                        presentationFocus={presentationFocus}
                        onSelect={(repo) => {
                          setDialogScope("model");
                          setSelectedRepo(repo);
                        }}
                        focused={
                          focusedStage?.module === "model" &&
                          focusedStage.stage === definition.label
                        }
                        onFocusStage={
                          presentationMode
                            ? undefined
                            : (stageLabel) =>
                                setFocusedStage((current) =>
                                  current?.module === "model" &&
                                  current.stage === stageLabel
                                    ? null
                                    : { module: "model", stage: stageLabel },
                                )
                        }
                      />
                    ))}
                  </div>
                </div>
              </section>
              <div
                ref={setModelDialogHost}
                className={styles.landscapeDialogHost}
                aria-hidden={
                  !selectedProject || dialogScope !== "model"
                }
              />
            </div>
          </FixedLandscapeFrame>
        </section>
      ) : null}

      {!embedOnly ? (
        <>
          <EmbeddedLandscape
            id="awesome-list"
            title="Awesome × Agentic"
            detail="Collections · skills · domain playbooks · workflows"
            src="/awesome/awesome_agentic_landscape_2026.html"
            accent="awesome"
          />
          <EcosystemSignals projects={projects} />
          <ProjectRanking
            projects={projects}
            onSelect={(repo) => {
              setDialogScope(null);
              setSelectedRepo(repo);
            }}
          />
        </>
      ) : null}

      {selectedProject ? (
        <ProjectInsightDialog
          key={selectedProject.repo}
          project={selectedProject}
          neighbors={selectedNeighbors}
          onClose={() => {
            setSelectedRepo(null);
            if (!embedOnly) setDialogScope(null);
          }}
          onSelect={setSelectedRepo}
          contained={Boolean(dialogScope)}
          portalContainer={
            dialogScope === "agent"
              ? agentDialogHost
              : dialogScope === "model"
                ? modelDialogHost
                : undefined
          }
        />
      ) : null}

      {!embedOnly ? (
        <LandscapeShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          initialSelection={shareTarget}
          getTarget={(id) =>
            id === "agent" ? agentSlideRef.current : modelSlideRef.current
          }
        />
      ) : null}
    </section>
  );
}
