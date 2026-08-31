import "server-only";

import fs from "node:fs";
import path from "node:path";

export const REPORT_COPY_KEYS = [
  "heroPrefix",
  "heroAgent",
  "heroSuffix",
  "heroFocus",
  "heroByline",
  "heroLede",
  "voicesIntro",
  "zhengyuQuote",
  "xuQuote",
  "mergeGateTitle",
  "mergeGateBody",
  "executionGateTitle",
  "executionGateBody",
  "landscapeOverviewTitle",
  "landscapeOverviewBody",
  "landscapeTitle",
  "agentChartTitle",
  "modelChartTitle",
  "ageFinding",
  "languageTitle",
  "languageBody",
  "runtimePathTitle",
  "runtimePathBody",
  "growthSummary",
  "outsideGithubTitle",
  "outsideGithubBody",
  "collaborationTitle",
  "collaborationLede",
  "collaborationProfileTitle",
  "collaborationProfileBody",
  "collaborationAdoptionTitle",
  "collaborationAdoptionBody",
  "collaborationTasksTitle",
  "collaborationTasksBody",
  "collaborationEntryTitle",
  "collaborationEntryBody",
  "collaborationIterationTitle",
  "collaborationIterationBody",
  "collaborationLineageTitle",
  "collaborationLineageBody",
  "collaborationGovernanceTitle",
  "collaborationGovernanceBody",
  "collaborationBurdenTitle",
  "collaborationBurdenBody",
  "collaborationScarcityTitle",
  "collaborationScarcityBody",
  "caseTitle",
  "caseQuote",
  "caseBody",
  "governanceInterface",
  "governanceDiscovery",
  "governanceRevocation",
  "studyTitle",
  "studyNote",
  "infrastructureTitle",
  "infrastructureLede",
  "infrastructureProjectTitle",
  "infrastructureProjectBody",
  "closingQuestion",
  "closingNote",
] as const;

export type ReportCopyKey = (typeof REPORT_COPY_KEYS)[number];
export type ReportCopy = Record<ReportCopyKey, string>;

const REPORT_COPY_RELATIVE_PATH = path.join(
  "insights",
  "260912_open_collaboration_ai",
  "report",
  "web-copy.json",
);

function resolveReportCopyPath() {
  const candidates = [
    path.resolve(process.cwd(), "../..", REPORT_COPY_RELATIVE_PATH),
    path.resolve(process.cwd(), REPORT_COPY_RELATIVE_PATH),
    path.resolve(process.cwd(), "../../../..", REPORT_COPY_RELATIVE_PATH),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Unable to locate report copy at ${REPORT_COPY_RELATIVE_PATH}`,
    );
  }
  return existing;
}

export function validateReportCopy(value: unknown): value is ReportCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  return (
    keys.length === REPORT_COPY_KEYS.length &&
    REPORT_COPY_KEYS.every(
      (key) =>
        typeof record[key] === "string" &&
        (record[key] as string).length <= 12_000,
    ) &&
    keys.every((key) => REPORT_COPY_KEYS.includes(key as ReportCopyKey))
  );
}

export function getReportCopy(): ReportCopy {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolveReportCopyPath(), "utf8"),
  );
  if (!validateReportCopy(parsed)) {
    throw new Error("Invalid Inclusion Conference web-copy.json schema");
  }
  return parsed;
}

export async function writeReportCopy(copy: ReportCopy) {
  const target = resolveReportCopyPath();
  const temporary = `${target}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(copy, null, 2)}\n`);
  await fs.promises.rename(temporary, target);
}
