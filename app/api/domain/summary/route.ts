import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getDomainSummary } from "@/lib/server/services/domainService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const summary = await getDomainSummary(user.id);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Failed to load domain summary:", error);
    return NextResponse.json({ ok: false, error: "domain_summary_error", message: "Failed to load domain summary." }, { status: 500 });
  }
}
