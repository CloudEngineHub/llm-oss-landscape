import type { Metadata } from "next";

import { getReportCopy } from "@/lib/inclusion-report-copy";
import { getReportReferences } from "@/lib/inclusion-report-references";

import { getInclusionResearchData } from "../research-data";
import InclusionConfStory from "../story";

export const metadata: Metadata = {
  title: "Agent 时代的开源协作",
  description:
    "从 143 个全景图项目、100 个高活跃仓库和 5,000 条公开 Issue / PR 出发，观察 Agent 如何改变开放基础设施与开源协作。",
  alternates: {
    canonical: "/presentations/260910_inclusion/zh-CN",
    languages: {
      en: "/presentations/260910_inclusion",
      "zh-CN": "/presentations/260910_inclusion/zh-CN",
    },
  },
  openGraph: {
    title: "Agent 时代的开源协作",
    description:
      "从项目全景图到 5,000 条公开协作线程，观察 Agent 扩大代码供给之后，开源项目如何承担评审、合入与维护。",
  },
  twitter: {
    title: "Agent 时代的开源协作",
  },
};

export default function ChineseInclusionConfStoryPage() {
  const { projects, stats } = getInclusionResearchData();
  const initialCopy = getReportCopy("zh-CN");
  const references = getReportReferences();

  return (
    <InclusionConfStory
      initialCopy={initialCopy}
      locale="zh-CN"
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
