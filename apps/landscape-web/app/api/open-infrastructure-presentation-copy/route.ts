import { NextResponse } from "next/server";

import {
  getOpenInfrastructurePresentationCopy,
  validateOpenInfrastructurePresentationCopy,
  writeOpenInfrastructurePresentationCopy,
} from "@/lib/open-infrastructure-presentation-copy";

export const dynamic = "force-dynamic";

function isLoopbackHostname(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

function canEdit(request: Request) {
  if (process.env.VERCEL) return false;

  const requestUrl = new URL(request.url);
  if (!isLoopbackHostname(requestUrl.hostname)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return isLoopbackHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    canEdit: canEdit(request),
    copy: getOpenInfrastructurePresentationCopy(),
  });
}

export async function PUT(request: Request) {
  if (!canEdit(request)) {
    return NextResponse.json(
      { error: "Editing is available only from the local preview." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json();
  const copy =
    body && typeof body === "object" && "copy" in body
      ? (body as { copy: unknown }).copy
      : null;

  if (!validateOpenInfrastructurePresentationCopy(copy)) {
    return NextResponse.json(
      { error: "The presentation copy does not match the editable schema." },
      { status: 400 },
    );
  }

  await writeOpenInfrastructurePresentationCopy(copy);
  return NextResponse.json({ copy, saved: true });
}
