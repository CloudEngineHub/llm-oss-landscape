import type { Metadata } from "next";

import KeynoteExperience from "@/app/keynote/keynote-experience";
import { getLandscapeProjects } from "@/lib/landscape-data";

export const metadata: Metadata = {
  title: "260807 CommunityOverCode｜Agentic AI Landscape",
  description:
    "CommunityOverCode China 2026 keynote 的交互式研究页面：生态图、Apache、InclusionAI、开放模型许可证与社区治理。",
};

export default function CommunityOverCodePresentationPage() {
  const projects = getLandscapeProjects();

  return <KeynoteExperience projects={projects} />;
}
