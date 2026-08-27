import "server-only";

import fs from "node:fs";
import path from "node:path";

export type ReportReference = {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  usedFor: string;
};

export type ReportReferenceGroup = {
  label: string;
  description: string;
  items: ReportReference[];
};

const REFERENCES_RELATIVE_PATH = path.join(
  "insights",
  "260912_open_collaboration_ai",
  "report",
  "references.json",
);

function resolveReferencesPath() {
  const candidates = [
    path.resolve(process.cwd(), "../..", REFERENCES_RELATIVE_PATH),
    path.resolve(process.cwd(), REFERENCES_RELATIVE_PATH),
    path.resolve(process.cwd(), "../../../..", REFERENCES_RELATIVE_PATH),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Unable to locate report references at ${REFERENCES_RELATIVE_PATH}`,
    );
  }
  return existing;
}

function isReference(value: unknown): value is ReportReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    /^[A-Z]\d{2}$/.test(item.id) &&
    typeof item.title === "string" &&
    typeof item.publisher === "string" &&
    typeof item.date === "string" &&
    typeof item.url === "string" &&
    /^https:\/\//.test(item.url) &&
    typeof item.usedFor === "string"
  );
}

function isReferenceGroup(value: unknown): value is ReportReferenceGroup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const group = value as Record<string, unknown>;
  return (
    typeof group.label === "string" &&
    typeof group.description === "string" &&
    Array.isArray(group.items) &&
    group.items.length > 0 &&
    group.items.every(isReference)
  );
}

export function getReportReferences(): ReportReferenceGroup[] {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolveReferencesPath(), "utf8"),
  );
  if (!Array.isArray(parsed) || !parsed.every(isReferenceGroup)) {
    throw new Error("Invalid Inclusion Conference references.json schema");
  }

  const ids = parsed.flatMap((group) => group.items.map((item) => item.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate reference id in references.json");
  }

  return parsed;
}
