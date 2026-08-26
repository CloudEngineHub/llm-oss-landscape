import type { Metadata } from "next";

import { getLandscapeProjects } from "@/lib/landscape-data";

import BundSummitStory from "./story";

export const metadata: Metadata = {
  title: "What Happened to Open-Source Collaboration When Agents Joined In? | The Bund Summit 2026",
  description:
    "A data-led study of open-source collaboration and open infrastructure across 143 Agentic AI projects.",
};

function projectGrowth(trend: Array<number | null>) {
  const april = trend[8];
  const july = trend[11];
  if (typeof april !== "number" || typeof july !== "number") return null;
  return Math.round((july - april) * 100) / 100;
}

export default function BundSummitStoryPage() {
  const projects = getLandscapeProjects();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");

  return (
    <BundSummitStory
      stats={{
        total: projects.length,
        agent: agentProjects.length,
        model: modelProjects.length,
        agentRecent: agentProjects.filter((project) => project.createdAt >= "2025-01-01").length,
        modelRecent: modelProjects.filter((project) => project.createdAt >= "2025-01-01").length,
        agentAdds: agentProjects.filter((project) => project.landscapeAction === "add").length,
        modelAdds: modelProjects.filter((project) => project.landscapeAction === "add").length,
        sinceCoc: 17,
      }}
      projects={projects.map((project) => ({
        name: project.name,
        repo: project.repo,
        layer: project.stage === "model" ? "model" : "agent",
        zone: project.zone,
        openrank: project.openrank,
        participants: project.participants,
        createdAt: project.createdAt,
        growth: projectGrowth(project.trend),
        signals: project.trendSignals,
      }))}
    />
  );
}
