import type { Metadata } from "next";

import { getPresentationCopy } from "@/lib/inclusion-presentation-copy";

import { getInclusionResearchData } from "../research-data";
import InclusionPresentation from "./presentation";

export const metadata: Metadata = {
  title: "Agent 进入开源协作之后 | 外滩大会",
  description:
    "从 Agentic AI Landscape、生态趋势到仓库协作模式的中文演讲。",
};

export default function InclusionPresentationPage() {
  const { projects, stats } = getInclusionResearchData();
  const initialCopy = getPresentationCopy();
  return (
    <InclusionPresentation
      initialCopy={initialCopy}
      projects={projects}
      stats={stats}
    />
  );
}
