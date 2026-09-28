import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUserFromSessionToken(sessionToken);

  if (!user) {
    return NextResponse.json({ ok: false, user: null, error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}
