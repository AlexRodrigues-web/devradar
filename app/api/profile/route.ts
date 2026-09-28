import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getUserProfile, updateUserProfile } from "@/lib/server/services/domainService";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const profile = await getUserProfile(user.id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to load profile:", error);
    return NextResponse.json({ ok: false, error: "profile_error", message: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid profile payload." }, { status: 400 });
    }

    const profile = await updateUserProfile(user.id, body);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ ok: false, error: "profile_update_error", message: "Failed to update profile." }, { status: 500 });
  }
}
