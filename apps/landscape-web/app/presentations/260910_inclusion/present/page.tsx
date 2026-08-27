import type { Metadata } from "next";

import { getLandscapeProjects } from "@/lib/landscape-data";

import InclusionPresentation from "./presentation";

export const metadata: Metadata = {
  title: "Presentation | 260910 InclusionConf",
  description:
    "Interactive presentation material for the 2026 Inclusion Conference research release.",
};

export default function InclusionPresentationPage() {
  const projects = getLandscapeProjects();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");
  const rankedProjects = projects
    .filter((project) => project.openrank !== null)
    .sort((a, b) => (b.openrank ?? 0) - (a.openrank ?? 0));

  return (
    <InclusionPresentation
      stats={{
        total: projects.length,
        agent: agentProjects.length,
        model: modelProjects.length,
        agentParticipants: agentProjects.reduce(
          (total, project) => total + (project.participants ?? 0),
          0,
        ),
        modelParticipants: modelProjects.reduce(
          (total, project) => total + (project.participants ?? 0),
          0,
        ),
        agentTrend: Array.from({ length: 12 }, (_, index) =>
          Math.round(
            agentProjects.reduce(
              (total, project) => total + (project.trend[index] ?? 0),
              0,
            ),
          ),
        ),
        modelTrend: Array.from({ length: 12 }, (_, index) =>
          Math.round(
            modelProjects.reduce(
              (total, project) => total + (project.trend[index] ?? 0),
              0,
            ),
          ),
        ),
        leaders: rankedProjects.slice(0, 3).map((project) => ({
          name: project.name,
          openrank: project.openrank ?? 0,
        })),
      }}
    />
  );
}
