import "server-only";

import fs from "node:fs";
import path from "node:path";

export const OPEN_INFRASTRUCTURE_PRESENTATION_COPY_KEYS = [
  "stageHeaderLabel",
  "coverMarkLabel",
  "coverTitleLine1",
  "coverTitleLine2",
  "coverSpeakerName",
  "coverSpeakerOrg",
  "coverEvent",
  "coverDate",
  "agentTrendKicker",
  "modelTrendKicker",
  "agentApplicationProjectsLabel",
  "agentOpenRankLabel",
  "agentRuntimeProjectsLabel",
  "agentAttentionReading",
  "agentRuntimeReading",
  "modelCreatedLabel",
  "agentCreatedLabel",
  "modelOpenRankLabel",
  "modelApacheLabel",
  "modelAgeReading",
  "modelActivityReading",
  "modelFoundationReading",
  "signalEyebrow",
  "signalTitle",
  "pressureTopLabel",
  "pressureTopBody",
  "pressureMiddleLabel",
  "pressureMiddleBody",
  "pressureFoundationLabel",
  "pressureFoundationBody",
  "runtimeAdditionsLabel",
  "runtimeAdditionsPeriod",
  "runtimeMemoryLabel",
  "runtimeProtocolsLabel",
  "runtimeToolsLabel",
  "runtimeSandboxesLabel",
  "signalSource",
  "needsGapEyebrow",
  "needsGapTitle",
  "runtimeStackPremise",
  "runtimeProblemLead",
  "runtimeProblemEmphasis",
  "runtimeProblemStatement",
  "runtimeResponseLead",
  "runtimeProcessSideLabel",
  "runtimeAgentSandboxRole",
  "runtimeKataRole",
  "taskEnvelopeSuffix",
  "needsGapSource",
  "closingStatement",
  "closingThanks",
] as const;

export type OpenInfrastructurePresentationCopyKey =
  (typeof OPEN_INFRASTRUCTURE_PRESENTATION_COPY_KEYS)[number];
export type OpenInfrastructurePresentationCopy = Record<
  OpenInfrastructurePresentationCopyKey,
  string
>;

const OPEN_INFRASTRUCTURE_PRESENTATION_COPY_RELATIVE_PATH = path.join(
  "insights",
  "presentations",
  "260908-kubecon-openinfra-pytorch",
  "open-infrastructure-presentation-copy.json",
);

function resolveOpenInfrastructurePresentationCopyPath() {
  const candidates = [
    path.resolve(
      process.cwd(),
      "../..",
      OPEN_INFRASTRUCTURE_PRESENTATION_COPY_RELATIVE_PATH,
    ),
    path.resolve(
      process.cwd(),
      OPEN_INFRASTRUCTURE_PRESENTATION_COPY_RELATIVE_PATH,
    ),
    path.resolve(
      process.cwd(),
      "../../../..",
      OPEN_INFRASTRUCTURE_PRESENTATION_COPY_RELATIVE_PATH,
    ),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Unable to locate open infrastructure presentation copy at ${OPEN_INFRASTRUCTURE_PRESENTATION_COPY_RELATIVE_PATH}`,
    );
  }
  return existing;
}

export function validateOpenInfrastructurePresentationCopy(
  value: unknown,
): value is OpenInfrastructurePresentationCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  return (
    keys.length === OPEN_INFRASTRUCTURE_PRESENTATION_COPY_KEYS.length &&
    OPEN_INFRASTRUCTURE_PRESENTATION_COPY_KEYS.every(
      (key) =>
        typeof record[key] === "string" &&
        (record[key] as string).length <= 12_000,
    ) &&
    keys.every((key) =>
      OPEN_INFRASTRUCTURE_PRESENTATION_COPY_KEYS.includes(
        key as OpenInfrastructurePresentationCopyKey,
      ),
    )
  );
}

export function getOpenInfrastructurePresentationCopy(): OpenInfrastructurePresentationCopy {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolveOpenInfrastructurePresentationCopyPath(), "utf8"),
  );
  if (!validateOpenInfrastructurePresentationCopy(parsed)) {
    throw new Error(
      "Invalid open-infrastructure-presentation-copy.json schema",
    );
  }
  return parsed;
}

export async function writeOpenInfrastructurePresentationCopy(
  copy: OpenInfrastructurePresentationCopy,
) {
  const target = resolveOpenInfrastructurePresentationCopyPath();
  const temporary = `${target}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(copy, null, 2)}\n`);
  await fs.promises.rename(temporary, target);
}
