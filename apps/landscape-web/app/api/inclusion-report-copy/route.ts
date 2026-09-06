import { NextResponse } from "next/server";

import {
  getReportCopy,
  type ReportLocale,
  validateReportCopy,
  writeReportCopy,
} from "@/lib/inclusion-report-copy";

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
  const locale = readLocale(new URL(request.url).searchParams.get("locale"));
  return NextResponse.json({
    canEdit: canEdit(request),
    copy: getReportCopy(locale),
  });
}

function readLocale(value: unknown): ReportLocale {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export async function PUT(request: Request) {
  if (!canEdit(request)) {
    return NextResponse.json(
      { error: "Editing is available only from the local preview." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json();
  const locale =
    body && typeof body === "object" && "locale" in body
      ? readLocale((body as { locale: unknown }).locale)
      : "en";
  const copy =
    body && typeof body === "object" && "copy" in body
      ? (body as { copy: unknown }).copy
      : null;

  if (!validateReportCopy(copy)) {
    return NextResponse.json(
      { error: "The report copy does not match the editable schema." },
      { status: 400 },
    );
  }

  await writeReportCopy(copy, locale);
  return NextResponse.json({ copy, locale, saved: true });
}
