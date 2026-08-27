import {
  getLandscapePoolRepositories,
  getLandscapeProjects,
  getMay2026TrackedRepositories,
} from "@/lib/landscape-data";

import type { LandscapeProject, StageId } from "@/lib/landscape-types";

export type MacroGroup = {
  label: string;
  projects: number;
  projectShare: number;
  openrank: number;
  openrankShare: number;
  newlyTracked: number;
};

export type LanguageMixGroup = {
  label: string;
  agent: number;
  model: number;
};

export type RuntimePathPoint = {
  label: string;
  shortLabel: string;
  projects: number;
  examples: Array<{
    name: string;
    repo: string;
  }>;
};

export type InclusionResearchStats = {
  total: number;
  agent: number;
  model: number;
  mayTracked: number;
  currentTracked: number;
  trackedDelta: number;
  selectedOutsideMay: number;
  agentOutsideMay: number;
  runtimeOutsideMay: number;
  agentRecent: number;
  modelRecent: number;
  agentMacro: MacroGroup[];
  modelMacro: MacroGroup[];
  growthLeaders: Array<{
    name: string;
    repo: string;
    zone: string;
    growth: number;
  }>;
  languageMix: LanguageMixGroup[];
  runtimePath: RuntimePathPoint[];
};

const agentMacroByStage: Record<Exclude<StageId, "model">, string> = {
  application: "Application",
  framework: "Framework",
  runtime: "Runtime",
};

function modelMacro(zone: string) {
  if (zone.startsWith("Serving") || zone === "Model API gateways") {
    return "Serving";
  }
  if (zone.startsWith("Pre-Train")) return "Pre-Train";
  if (zone.startsWith("Post-Train")) return "Post-Train";
  if (zone.startsWith("Data")) return "Data";
  return "Compute";
}

function projectGrowth(project: LandscapeProject) {
  const april = project.trend[8];
  const july = project.trend[11];
  if (typeof april !== "number" || typeof july !== "number") return null;
  return Math.round((july - april) * 100) / 100;
}

const LANGUAGE_GROUPS = ["TypeScript", "Python", "Go", "C++"] as const;

function languageMix(projects: LandscapeProject[]) {
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");

  return [...LANGUAGE_GROUPS, "Other"].map((label) => {
    const belongs = (project: LandscapeProject) =>
      label === "Other"
        ? !LANGUAGE_GROUPS.includes(
            project.language as (typeof LANGUAGE_GROUPS)[number],
          )
        : project.language === label;

    return {
      label,
      agent: agentProjects.filter(belongs).length,
      model: modelProjects.filter(belongs).length,
    };
  });
}

const RUNTIME_PATH = [
  { label: "Memory, knowledge & context", shortLabel: "Context" },
  { label: "Protocols & interoperability", shortLabel: "Interface" },
  { label: "Tools, web & computer use", shortLabel: "Action" },
  { label: "Development sandboxes", shortLabel: "Isolation" },
  { label: "Observability & evaluation", shortLabel: "Evidence" },
] as const;

function runtimePath(projects: LandscapeProject[]) {
  return RUNTIME_PATH.map(({ label, shortLabel }) => {
    const grouped = projects
      .filter((project) => project.zone === label)
      .sort(
        (a, b) =>
          (b.openrank ?? -1) - (a.openrank ?? -1) || b.stars - a.stars,
      );

    return {
      label,
      shortLabel,
      projects: grouped.length,
      examples: grouped.slice(0, 2).map((project) => ({
        name: project.name,
        repo: project.repo,
      })),
    };
  });
}

function buildMacroGroups(
  projects: LandscapeProject[],
  labels: string[],
  groupForProject: (project: LandscapeProject) => string,
  mayRepositories: Set<string>,
) {
  const totalOpenrank = projects.reduce(
    (sum, project) => sum + (project.openrank ?? 0),
    0,
  );

  return labels.map((label) => {
    const groupedProjects = projects.filter(
      (project) => groupForProject(project) === label,
    );
    const openrank = groupedProjects.reduce(
      (sum, project) => sum + (project.openrank ?? 0),
      0,
    );

    return {
      label,
      projects: groupedProjects.length,
      projectShare: Math.round((groupedProjects.length / projects.length) * 100),
      openrank: Math.round(openrank * 10) / 10,
      openrankShare: Math.round((openrank / totalOpenrank) * 100),
      newlyTracked: groupedProjects.filter(
        (project) => !mayRepositories.has(project.repo.toLowerCase()),
      ).length,
    };
  });
}

export function getInclusionResearchData() {
  const projects = getLandscapeProjects();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");
  const mayRepositories = new Set(
    getMay2026TrackedRepositories().map((repo) => repo.toLowerCase()),
  );
  const currentTracked = getLandscapePoolRepositories().length;
  const outsideMay = projects.filter(
    (project) => !mayRepositories.has(project.repo.toLowerCase()),
  );
  const stats: InclusionResearchStats = {
    total: projects.length,
    agent: agentProjects.length,
    model: modelProjects.length,
    mayTracked: mayRepositories.size,
    currentTracked,
    trackedDelta: currentTracked - mayRepositories.size,
    selectedOutsideMay: outsideMay.length,
    agentOutsideMay: outsideMay.filter((project) => project.stage !== "model")
      .length,
    runtimeOutsideMay: outsideMay.filter(
      (project) => project.stage === "runtime",
    ).length,
    agentRecent: agentProjects.filter(
      (project) => project.createdAt >= "2025-01-01",
    ).length,
    modelRecent: modelProjects.filter(
      (project) => project.createdAt >= "2025-01-01",
    ).length,
    agentMacro: buildMacroGroups(
      agentProjects,
      ["Application", "Framework", "Runtime"],
      (project) => agentMacroByStage[project.stage as Exclude<StageId, "model">],
      mayRepositories,
    ),
    modelMacro: buildMacroGroups(
      modelProjects,
      ["Serving", "Pre-Train", "Data", "Compute", "Post-Train"],
      (project) => modelMacro(project.zone),
      mayRepositories,
    ),
    growthLeaders: projects
      .map((project) => ({ project, growth: projectGrowth(project) }))
      .filter(
        (item): item is { project: LandscapeProject; growth: number } =>
          typeof item.growth === "number" && item.growth > 0,
      )
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 6)
      .map(({ project, growth }) => ({
        name: project.name,
        repo: project.repo,
        zone: project.zone,
        growth,
      })),
    languageMix: languageMix(projects),
    runtimePath: runtimePath(agentProjects),
  };

  return { projects, stats };
}
