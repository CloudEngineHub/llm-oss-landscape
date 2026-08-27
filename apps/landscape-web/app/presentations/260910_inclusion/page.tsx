import type { Metadata } from "next";

import { getReportCopy } from "@/lib/inclusion-report-copy";
import { getReportReferences } from "@/lib/inclusion-report-references";

import { getInclusionResearchData } from "./research-data";
import InclusionConfStory from "./story";

export const metadata: Metadata = {
  title:
    "What Happened to Open-Source Collaboration When Agents Joined In? | The Inclusion Conference 2026",
  description:
    "A data-led study of open-source collaboration and open infrastructure across 143 Agentic AI projects.",
};

export default function InclusionConfStoryPage() {
  const { projects, stats } = getInclusionResearchData();
  const initialCopy = getReportCopy();
  const references = getReportReferences();

  return (
    <InclusionConfStory
      initialCopy={initialCopy}
      references={references}
      stats={stats}
      projects={projects.map((project) => ({
        name: project.name,
        repo: project.repo,
        layer: project.stage === "model" ? "model" : "agent",
        zone: project.zone,
        openrank: project.openrank,
        stars: project.stars,
        language: project.language,
        createdAt: project.createdAt,
        signals: project.trendSignals,
      }))}
    />
  );
}
