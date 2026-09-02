import type { Metadata } from "next";

import { getInclusionResearchData } from "../research-data";
import InclusionPresentation from "./presentation";

export const metadata: Metadata = {
  title: "Presentation | 260910 InclusionConf",
  description:
    "Interactive presentation material for the 2026 Inclusion Conference research release.",
};

export default function InclusionPresentationPage() {
  const { projects, stats: researchStats } = getInclusionResearchData();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");
  return (
    <InclusionPresentation
      projects={projects}
      stats={{
        ...researchStats,
        agentParticipants: agentProjects.reduce(
          (total, project) => total + (project.participants ?? 0),
          0,
        ),
        modelParticipants: modelProjects.reduce(
          (total, project) => total + (project.participants ?? 0),
          0,
        ),
      }}
    />
  );
}
