import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookie, logoutUser, SESSION_COOKIE_NAME } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const revoked = await logoutUser(sessionToken);
  const response = NextResponse.json({ ok: true, revoked });

  clearSessionCookie(response);

  return response;
}
