import {
  getLandscapePoolRepositories,
  getLandscapeProjects,
  getMay2026TrackedRepositories,
} from "@/lib/landscape-data";

import type { LandscapeProject, StageId } from "@/lib/landscape-types";

export type MacroGroup = {
  label: string;
  projects: number;
  projectShare: number;
  openrank: number;
  openrankShare: number;
  newlyTracked: number;
};

export type LanguageMixGroup = {
  label: string;
  agent: number;
  model: number;
};

export type RuntimePathPoint = {
  label: string;
  shortLabel: string;
  projects: number;
  examples: Array<{
    name: string;
    repo: string;
  }>;
};

export type InclusionResearchStats = {
  total: number;
  agent: number;
  model: number;
  mayTracked: number;
  currentTracked: number;
  trackedDelta: number;
  selectedOutsideMay: number;
  agentOutsideMay: number;
  runtimeOutsideMay: number;
  agentRecent: number;
  modelRecent: number;
  agentMacro: MacroGroup[];
  modelMacro: MacroGroup[];
  growthLeaders: Array<{
    name: string;
    repo: string;
    zone: string;
    growth: number;
  }>;
  languageMix: LanguageMixGroup[];
  runtimePath: RuntimePathPoint[];
  collaboration: CollaborationResearchStats;
};

export type CollaborationResearchStats = {
  sampleThreads: number;
  samplePullRequests: number;
  activeRepositories: number;
  strictInstructionRepositories: number;
  observedParticipationRepositories: number;
  participationThreadShare: number;
  participationMacroShare: number;
  participationOpenerShare: number;
  participationResponseShare: number;
  knownAutomationShare: number;
  agentReviewShare: number;
  userReviewShare: number;
  maintainerReviewShare: number;
  userGateShare: number;
  maintainerGateShare: number;
  agentGateShare: number;
  userResponseShare: number;
  maintainerResponseShare: number;
  externalPrShare: number;
  externalMergeFlagShare: number;
  internalMergeFlagShare: number;
  explicitInvitations: number;
  gatedPolicies: number;
  restrictedCreationPolicies: number;
  noDetectedPolicySignal: number;
  top100PrUnresolvedMedian: number;
  controlPrUnresolvedMedian: number;
  controlsWithRisingPrBacklog: number;
  controlsTotal: number;
  reviewedPrShare: number;
  reviewedPrFollowupCommitShare: number;
  changeRequestFollowupCommitShare: number;
  agentChangeRequestFollowupCommitShare: number;
  humanChangeRequestFollowupCommitShare: number;
  publicEventsAnalyzed: number;
  agentTaskEvents: {
    review: number;
    triage: number;
    discussion: number;
    codeCommit: number;
    openedThread: number;
  };
  automationByItem: Array<{
    label: "Issues" | "Pull requests";
    knownAutomation: number;
    verifiedAgent: number;
    conventionalAutomation: number;
    automationOnly: number;
  }>;
};

function resolveResearchFile(filename: string) {
  const relative = path.join(
    "insights",
    "260912_open_collaboration_ai",
    "research",
    filename,
  );
  const candidates = [
    path.resolve(process.cwd(), "../..", relative),
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), "../../../..", relative),
  ];
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) throw new Error(`Unable to locate research file ${relative}`);
  return existing;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function readCsv(filename: string) {
  const lines = fs
    .readFileSync(resolveResearchFile(filename), "utf8")
    .trim()
    .split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function numberValue(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collaborationResearchStats(): CollaborationResearchStats {
  const summary = readCsv("collaboration-thread-analysis-2026-summary.csv");
  const overall = summary.find(
    (row) => row.scope_type === "overall" && row.scope_value === "all",
  );
  if (!overall) throw new Error("Overall collaboration thread summary is missing");
  const issueSummary = summary.find(
    (row) => row.scope_type === "item_type" && row.scope_value === "issue",
  );
  const pullRequestSummary = summary.find(
    (row) => row.scope_type === "item_type" && row.scope_value === "pull_request",
  );
  if (!issueSummary || !pullRequestSummary) {
    throw new Error("Issue / pull-request collaboration summary rows are missing");
  }

  const sensitivity = readCsv("collaboration-agent-participation-sensitivity-2026.csv");
  const strict = sensitivity.find((row) => row.scenario === "strict_verified");
  if (!strict) throw new Error("Strict Agent participation sensitivity row is missing");

  const policies = readCsv("collaboration-contribution-policies-reviewed-260829.csv");
  const policyCount = (classes: string[]) =>
    policies.filter((row) => classes.includes(row.final_policy_class)).length;

  const maturity = readCsv("collaboration-fixed-90d-summary.csv");
  const top100 = maturity.find(
    (row) => row.panel === "agentic_top100" && row.scope_type === "overall",
  );
  const control = maturity.find(
    (row) =>
      row.panel === "long_lived_benchmark" &&
      row.scope_type === "overall" &&
      row.year === "2026",
  );
  if (!top100 || !control) throw new Error("Fixed-maturity comparison rows are missing");

  const transitions = readCsv("collaboration-control-2022-2026-transitions.csv");
  const threadRows = readCsv("collaboration-thread-analysis-2026.csv");
  const taskRows = readCsv("collaboration-agent-observed-tasks-2026.csv");
  const taskEvents = (task: string) =>
    taskRows
      .filter((row) => row.task === task)
      .reduce((sum, row) => sum + numberValue(row.observed_events), 0);
  return {
    sampleThreads: numberValue(overall.threads),
    samplePullRequests: threadRows.filter((row) => row.item_type === "pull_request").length,
    activeRepositories: 100,
    strictInstructionRepositories: 86,
    observedParticipationRepositories: numberValue(strict.repositories_with_observed_participation),
    participationThreadShare: numberValue(strict.weighted_thread_share),
    participationMacroShare: numberValue(strict.equal_repository_thread_share),
    participationOpenerShare: numberValue(strict.weighted_opener_share),
    participationResponseShare: numberValue(overall.agent_participation_response_present_share_weighted),
    knownAutomationShare: numberValue(overall.known_automation_bot_present_share_weighted),
    agentReviewShare: numberValue(overall.agent_review_event_present_share_pr_weighted),
    userReviewShare: numberValue(overall.human_account_review_event_present_share_pr_weighted),
    maintainerReviewShare: numberValue(overall.maintainer_account_review_event_present_share_pr_weighted),
    userGateShare: numberValue(overall.human_account_gate_share_resolved_with_visible_gate_weighted),
    maintainerGateShare: numberValue(overall.maintainer_account_gate_share_resolved_with_visible_gate_weighted),
    agentGateShare: numberValue(overall.agent_gate_share_resolved_with_visible_gate_weighted),
    userResponseShare: numberValue(overall.human_account_response_share_weighted),
    maintainerResponseShare: numberValue(overall.maintainer_account_response_share_weighted),
    externalPrShare: numberValue(overall.external_pr_author_share_weighted),
    externalMergeFlagShare: numberValue(overall.external_pr_github_merge_flag_share_resolved_fixed_maturity_weighted),
    internalMergeFlagShare: numberValue(overall.internal_pr_github_merge_flag_share_resolved_fixed_maturity_weighted),
    explicitInvitations: policyCount(["explicit_invitation"]),
    gatedPolicies: policyCount(["conditional_gate", "issue_first", "conditional_restriction"]),
    restrictedCreationPolicies: policyCount(["collaborators_only", "pull_requests_disabled"]),
    noDetectedPolicySignal: policyCount(["no_detected_policy_signal"]),
    top100PrUnresolvedMedian: numberValue(top100.pr_unresolved_share_median_repo),
    controlPrUnresolvedMedian: numberValue(control.pr_unresolved_share_median_repo),
    controlsWithRisingPrBacklog: transitions.filter(
      (row) => numberValue(row.pr_unresolved_share_change) > 0,
    ).length,
    controlsTotal: transitions.length,
    reviewedPrShare: numberValue(overall.pr_review_observed_share_weighted),
    reviewedPrFollowupCommitShare: numberValue(overall.reviewed_pr_post_review_commit_share_weighted),
    changeRequestFollowupCommitShare: numberValue(overall.change_requested_pr_followup_commit_share_weighted),
    agentChangeRequestFollowupCommitShare: numberValue(overall.agent_change_requested_pr_followup_commit_share_weighted),
    humanChangeRequestFollowupCommitShare: numberValue(overall.human_change_requested_pr_followup_commit_share_weighted),
    publicEventsAnalyzed: 50_140,
    agentTaskEvents: {
      review: taskEvents("code_review"),
      triage: taskEvents("triage_and_routing") + taskEvents("review_routing"),
      discussion: taskEvents("discussion_comment"),
      codeCommit: taskEvents("code_commit"),
      openedThread: taskEvents("opened_issue") + taskEvents("opened_pull_request"),
    },
    automationByItem: [
      { label: "Issues", row: issueSummary },
      { label: "Pull requests", row: pullRequestSummary },
    ].map(({ label, row }) => ({
      label: label as "Issues" | "Pull requests",
      knownAutomation: numberValue(row.known_automation_bot_present_share_weighted),
      verifiedAgent: numberValue(row.agent_participation_present_share_weighted),
      conventionalAutomation: numberValue(row.conventional_automation_present_share_weighted),
      automationOnly: numberValue(row.automation_only_visible_thread_share_weighted),
    })),
  };
}

const agentMacroByStage: Record<Exclude<StageId, "model">, string> = {
  application: "Application",
  framework: "Framework",
  runtime: "Runtime",
};

function modelMacro(zone: string) {
  if (zone.startsWith("Serving") || zone === "Model API gateways") {
    return "Serving";
  }
  if (zone.startsWith("Pre-Train")) return "Pre-Train";
  if (zone.startsWith("Post-Train")) return "Post-Train";
  if (zone.startsWith("Data")) return "Data";
  return "Compute";
}

function projectGrowth(project: LandscapeProject) {
  const april = project.trend[8];
  const july = project.trend[11];
  if (typeof april !== "number" || typeof july !== "number") return null;
  return Math.round((july - april) * 100) / 100;
}

const LANGUAGE_GROUPS = ["TypeScript", "Python", "Go", "C++"] as const;

function languageMix(projects: LandscapeProject[]) {
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");

  return [...LANGUAGE_GROUPS, "Other"].map((label) => {
    const belongs = (project: LandscapeProject) =>
      label === "Other"
        ? !LANGUAGE_GROUPS.includes(
            project.language as (typeof LANGUAGE_GROUPS)[number],
          )
        : project.language === label;

    return {
      label,
      agent: agentProjects.filter(belongs).length,
      model: modelProjects.filter(belongs).length,
    };
  });
}

const RUNTIME_PATH = [
  { label: "Memory, knowledge & context", shortLabel: "Context" },
  { label: "Protocols & interoperability", shortLabel: "Interface" },
  { label: "Tools, web & computer use", shortLabel: "Action" },
  { label: "Development sandboxes", shortLabel: "Isolation" },
  { label: "Observability & evaluation", shortLabel: "Evidence" },
] as const;

function runtimePath(projects: LandscapeProject[]) {
  return RUNTIME_PATH.map(({ label, shortLabel }) => {
    const grouped = projects
      .filter((project) => project.zone === label)
      .sort(
        (a, b) =>
          (b.openrank ?? -1) - (a.openrank ?? -1) || b.stars - a.stars,
      );

    return {
      label,
      shortLabel,
      projects: grouped.length,
      examples: grouped.slice(0, 2).map((project) => ({
        name: project.name,
        repo: project.repo,
      })),
    };
  });
}

function buildMacroGroups(
  projects: LandscapeProject[],
  labels: string[],
  groupForProject: (project: LandscapeProject) => string,
  mayRepositories: Set<string>,
) {
  const totalOpenrank = projects.reduce(
    (sum, project) => sum + (project.openrank ?? 0),
    0,
  );

  return labels.map((label) => {
    const groupedProjects = projects.filter(
      (project) => groupForProject(project) === label,
    );
    const openrank = groupedProjects.reduce(
      (sum, project) => sum + (project.openrank ?? 0),
      0,
    );

    return {
      label,
      projects: groupedProjects.length,
      projectShare: Math.round((groupedProjects.length / projects.length) * 100),
      openrank: Math.round(openrank * 10) / 10,
      openrankShare: Math.round((openrank / totalOpenrank) * 100),
      newlyTracked: groupedProjects.filter(
        (project) => !mayRepositories.has(project.repo.toLowerCase()),
      ).length,
    };
  });
}

export function getInclusionResearchData() {
  const projects = getLandscapeProjects();
  const agentProjects = projects.filter((project) => project.stage !== "model");
  const modelProjects = projects.filter((project) => project.stage === "model");
  const mayRepositories = new Set(
    getMay2026TrackedRepositories().map((repo) => repo.toLowerCase()),
  );
  const currentTracked = getLandscapePoolRepositories().length;
  const outsideMay = projects.filter(
    (project) => !mayRepositories.has(project.repo.toLowerCase()),
  );
  const stats: InclusionResearchStats = {
    total: projects.length,
    agent: agentProjects.length,
    model: modelProjects.length,
    mayTracked: mayRepositories.size,
    currentTracked,
    trackedDelta: currentTracked - mayRepositories.size,
    selectedOutsideMay: outsideMay.length,
    agentOutsideMay: outsideMay.filter((project) => project.stage !== "model")
      .length,
    runtimeOutsideMay: outsideMay.filter(
      (project) => project.stage === "runtime",
    ).length,
    agentRecent: agentProjects.filter(
      (project) => project.createdAt >= "2025-01-01",
    ).length,
    modelRecent: modelProjects.filter(
      (project) => project.createdAt >= "2025-01-01",
    ).length,
    agentMacro: buildMacroGroups(
      agentProjects,
      ["Application", "Framework", "Runtime"],
      (project) => agentMacroByStage[project.stage as Exclude<StageId, "model">],
      mayRepositories,
    ),
    modelMacro: buildMacroGroups(
      modelProjects,
      ["Serving", "Pre-Train", "Data", "Compute", "Post-Train"],
      (project) => modelMacro(project.zone),
      mayRepositories,
    ),
    growthLeaders: projects
      .map((project) => ({ project, growth: projectGrowth(project) }))
      .filter(
        (item): item is { project: LandscapeProject; growth: number } =>
          typeof item.growth === "number" && item.growth > 0,
      )
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 6)
      .map(({ project, growth }) => ({
        name: project.name,
        repo: project.repo,
        zone: project.zone,
        growth,
      })),
    languageMix: languageMix(projects),
    runtimePath: runtimePath(agentProjects),
    collaboration: collaborationResearchStats(),
  };

  return { projects, stats };
}
import fs from "node:fs";
import path from "node:path";
