import "server-only";

import fs from "node:fs";
import path from "node:path";

export const PRESENTATION_COPY_KEYS = [
  "coverTitleLine1",
  "coverTitleLine2",
  "coverSpeakerName",
  "coverSpeakerOrg",
  "coverEvent",
  "coverDate",
  "questionKicker",
  "questionTitle",
  "questionBody",
  "questionIssueLabel",
  "questionPrLabel",
  "questionAgentLabel",
  "questionResolutionLabel",
  "agentTrendTitle",
  "agentTrendBody",
  "modelTrendTitle",
  "modelTrendBody",
  "landscapeTrendTitle",
  "landscapeTrendBody",
  "languageTrendTitle",
  "languageTrendBody",
  "runtimeTrendTitle",
  "runtimeTrendBody",
  "flowTitle",
  "flowBody",
  "flowIssueLabel",
  "flowPrLabel",
  "flowNote",
  "backlogTitle",
  "backlogBody",
  "backlogScope",
  "coreTitle",
  "coreBody",
  "coreHistoryTitle",
  "coreBenchmarkTitle",
  "accessTitle",
  "accessBody",
  "accessReadyTitle",
  "accessReadyBody",
  "accessPolicyTitle",
  "accessPolicyNote",
  "handoffTitle",
  "handoffBody",
  "handoffNote",
  "tasksTitle",
  "tasksBody",
  "reviewTitle",
  "reviewBody",
  "reviewNote",
  "lineageTitle",
  "lineageBody",
  "outcomesTitle",
  "outcomesBody",
  "outcomesNote",
  "deepseekKicker",
  "deepseekTitle",
  "deepseekBody",
  "deepseekQuote",
  "closingKicker",
  "closingTitleLine1",
  "closingTitleLine2",
  "closingBody",
  "closingLink",
  "closingPathCode",
  "closingPathResponse",
  "closingPathReview",
  "closingPathMerge",
  "closingPathMaintain",
] as const;

export type PresentationCopyKey = (typeof PRESENTATION_COPY_KEYS)[number];
export type PresentationCopy = Record<PresentationCopyKey, string>;

const PRESENTATION_COPY_RELATIVE_PATH = path.join(
  "insights",
  "presentations",
  "260910-InclusionConf",
  "presentation-copy.json",
);

function resolvePresentationCopyPath() {
  const candidates = [
    path.resolve(process.cwd(), "../..", PRESENTATION_COPY_RELATIVE_PATH),
    path.resolve(process.cwd(), PRESENTATION_COPY_RELATIVE_PATH),
    path.resolve(process.cwd(), "../../../..", PRESENTATION_COPY_RELATIVE_PATH),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Unable to locate presentation copy at ${PRESENTATION_COPY_RELATIVE_PATH}`,
    );
  }
  return existing;
}

export function validatePresentationCopy(
  value: unknown,
): value is PresentationCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  return (
    keys.length === PRESENTATION_COPY_KEYS.length &&
    PRESENTATION_COPY_KEYS.every(
      (key) =>
        typeof record[key] === "string" &&
        (record[key] as string).length <= 12_000,
    ) &&
    keys.every((key) =>
      PRESENTATION_COPY_KEYS.includes(key as PresentationCopyKey),
    )
  );
}

export function getPresentationCopy(): PresentationCopy {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolvePresentationCopyPath(), "utf8"),
  );
  if (!validatePresentationCopy(parsed)) {
    throw new Error("Invalid Inclusion Conference presentation-copy.json schema");
  }
  return parsed;
}

export async function writePresentationCopy(copy: PresentationCopy) {
  const target = resolvePresentationCopyPath();
  const temporary = `${target}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(copy, null, 2)}\n`);
  await fs.promises.rename(temporary, target);
}
