import type { Metadata } from "next";

import { getInclusionResearchData } from "../../research-data";
import OpenInfrastructureKeynote from "./presentation";

export const metadata: Metadata = {
  title: "What AI Agents Need from Open Infrastructure | Keynote",
  description:
    "Interactive keynote for KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026.",
};

export default function OpenInfrastructureKeynotePage() {
  const { projects, stats: researchStats } = getInclusionResearchData();

  return (
    <OpenInfrastructureKeynote
      projects={projects}
      stats={researchStats}
    />
  );
}
