import { NextRequest, NextResponse } from "next/server";

import { AuthServiceError, loginUser, setSessionCookie } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  try {
    const result = await loginUser(body, request);
    const response = NextResponse.json({ ok: true, user: result.user });

    setSessionCookie(response, result.session);

    return response;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }

    console.error("Failed to login user:", error);
    return NextResponse.json({ ok: false, error: "login_failed", message: "Login failed." }, { status: 500 });
  }
}
