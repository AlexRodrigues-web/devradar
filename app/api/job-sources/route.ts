import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { listJobSources, updateJobSource } from "@/lib/server/services/domainService";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const sources = await listJobSources();
    return NextResponse.json({ ok: true, sources });
  } catch (error) {
    console.error("Failed to load job sources:", error);
    return NextResponse.json({ ok: false, error: "job_sources_error", message: "Failed to load job sources." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body.id !== "string" || typeof body.enabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid job source payload." }, { status: 400 });
    }

    const sources = await updateJobSource(body.id, body.enabled);
    return NextResponse.json({ ok: true, sources });
  } catch (error) {
    console.error("Failed to update job source:", error);
    return NextResponse.json({ ok: false, error: "job_source_update_error", message: "Failed to update job source." }, { status: 500 });
  }
}
