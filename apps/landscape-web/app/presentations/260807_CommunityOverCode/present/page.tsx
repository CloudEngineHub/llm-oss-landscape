import type { Metadata } from "next";

import KeynotePresentation from "@/app/keynote/present/presentation";
import { getLandscapeProjects } from "@/lib/landscape-data";

export const metadata: Metadata = {
  title: "演讲播放｜260807 CommunityOverCode",
  description:
    "Community Over Code Asia 2026 keynote 的 16:9 舞台播放模式。方向键或翻页笔控制前后，Enter 进入全屏，Esc 退出。",
};

export default function CommunityOverCodeStagePage() {
  const projects = getLandscapeProjects();

  return <KeynotePresentation projects={projects} />;
}
