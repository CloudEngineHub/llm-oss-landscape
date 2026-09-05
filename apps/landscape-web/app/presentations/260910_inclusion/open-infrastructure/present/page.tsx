import type { Metadata } from "next";

import { getOpenInfrastructurePresentationCopy } from "@/lib/open-infrastructure-presentation-copy";

import { getInclusionResearchData } from "../../research-data";
import OpenInfrastructureKeynote from "./presentation";

export const metadata: Metadata = {
  title: "What AI Agents Need from Open Infrastructure | Keynote",
  description:
    "Interactive keynote for KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026.",
};

export default function OpenInfrastructureKeynotePage() {
  const { projects, stats: researchStats } = getInclusionResearchData();
  const initialCopy = getOpenInfrastructurePresentationCopy();

  return (
    <OpenInfrastructureKeynote
      initialCopy={initialCopy}
      projects={projects}
      stats={researchStats}
    />
  );
}
