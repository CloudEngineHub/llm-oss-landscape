import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  type PresentationCopy,
  validatePresentationCopy,
} from "./inclusion-presentation-copy";

const PRESENTATION_COPY_RELATIVE_PATH = path.join(
  "insights",
  "presentations",
  "260924-MiniMaxDeveloper",
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

export function getMiniMaxDeveloperPresentationCopy(): PresentationCopy {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolvePresentationCopyPath(), "utf8"),
  );
  if (!validatePresentationCopy(parsed)) {
    throw new Error("Invalid MiniMax Developer presentation-copy.json schema");
  }
  return parsed;
}

export async function writeMiniMaxDeveloperPresentationCopy(
  copy: PresentationCopy,
) {
  const target = resolvePresentationCopyPath();
  const temporary = `${target}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(copy, null, 2)}\n`);
  await fs.promises.rename(temporary, target);
}
