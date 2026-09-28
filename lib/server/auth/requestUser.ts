import { NextRequest, NextResponse } from "next/server";

import type { AuthUser } from "@/types/auth";

import { getCurrentUserFromSessionToken } from "./currentUser";
import { SESSION_COOKIE_NAME } from "./session";

export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getCurrentUserFromSessionToken(sessionToken);
}

export function unauthorizedJson() {
  return NextResponse.json(
    { ok: false, error: "unauthenticated", message: "Login required." },
    { status: 401 }
  );
}
