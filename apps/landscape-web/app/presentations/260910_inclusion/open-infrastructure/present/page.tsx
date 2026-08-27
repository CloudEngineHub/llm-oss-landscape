import type { Metadata } from "next";

import { getLandscapeProjects } from "@/lib/landscape-data";

import OpenInfrastructureKeynote from "./presentation";

export const metadata: Metadata = {
  title: "What AI Agents Need from Open Infrastructure | Keynote",
  description:
    "Five-minute interactive keynote for KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026.",
};

const pressureSections = [
  {
    label: "Isolated execution",
    zone: "Development sandboxes",
    repos: [
      "kubernetes-sigs/agent-sandbox",
      "opensandbox-group/opensandbox",
      "daytonaio/daytona",
    ],
  },
  {
    label: "Tool control",
    zone: "Protocols & interoperability",
    repos: [
      "agentgateway/agentgateway",
      "ibm/mcp-context-forge",
      "stacklok/toolhive",
    ],
  },
  {
    label: "Durable context",
    zone: "Memory, knowledge & context",
    repos: [
      "volcengine/openviking",
      "infiniflow/ragflow",
      "milvus-io/milvus",
    ],
  },
] as const;

export default function OpenInfrastructureKeynotePage() {
  const projects = getLandscapeProjects();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");

  const pressure = pressureSections.map((section) => ({
    label: section.label,
    zone: section.zone,
    count: projects.filter((project) => project.zone === section.zone).length,
    projects: section.repos
      .map((repo) =>
        projects.find((project) => project.repo.toLowerCase() === repo),
      )
      .filter((project) => project !== undefined)
      .map((project) => ({ name: project.name, repo: project.repo })),
  }));

  return (
    <OpenInfrastructureKeynote
      stats={{
        total: projects.length,
        agent: agentProjects.length,
        model: modelProjects.length,
        agentRecentShare: Math.round(
          (agentProjects.filter((project) => project.createdAt >= "2025-01-01")
            .length /
            agentProjects.length) *
            100,
        ),
        modelRecentShare: Math.round(
          (modelProjects.filter((project) => project.createdAt >= "2025-01-01")
            .length /
            modelProjects.length) *
            100,
        ),
        pressure,
      }}
    />
  );
}
