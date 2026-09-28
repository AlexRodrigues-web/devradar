import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader } from "mysql2";
import type { NextRequest, NextResponse } from "next/server";

import { getMysqlPool } from "@/lib/server/mysql";
import type { AuthSession } from "@/types/auth";

export const SESSION_COOKIE_NAME = "devradar_session";
export const SESSION_TTL_DAYS = 7;

function getClientIp(request?: NextRequest) {
  if (!request) {
    return null;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

export async function createUserSession({
  userId,
  request
}: {
  userId: string;
  request?: NextRequest;
}): Promise<AuthSession> {
  const pool = getMysqlPool();
  const token = createSessionToken();
  const sessionTokenHash = hashSessionToken(token);
  const sessionId = randomUUID();
  const expiresAt = getSessionExpiry();

  await pool.execute<ResultSetHeader>(
    "INSERT INTO user_sessions (id, user_id, session_token_hash, user_agent, ip_address, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NOW())",
    [
      sessionId,
      userId,
      sessionTokenHash,
      request?.headers.get("user-agent") ?? null,
      getClientIp(request),
      SESSION_TTL_DAYS
    ]
  );

  return {
    id: sessionId,
    userId,
    token,
    expiresAt
  };
}

export function setSessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt
  });

  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });

  return response;
}

export async function revokeSessionToken(token: string) {
  const pool = getMysqlPool();
  const sessionTokenHash = hashSessionToken(token);

  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE user_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE session_token_hash = ? AND revoked_at IS NULL",
    [sessionTokenHash]
  );

  return result.affectedRows > 0;
}
