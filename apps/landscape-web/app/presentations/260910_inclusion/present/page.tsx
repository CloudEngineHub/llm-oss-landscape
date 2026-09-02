import type { Metadata } from "next";

import { getInclusionResearchData } from "../research-data";
import InclusionPresentation from "./presentation";

export const metadata: Metadata = {
  title: "Presentation | 260910 InclusionConf",
  description:
    "Interactive presentation material for the 2026 Inclusion Conference research release.",
};

export default function InclusionPresentationPage() {
  const { projects, stats } = getInclusionResearchData();
  return <InclusionPresentation projects={projects} stats={stats} />;
}
