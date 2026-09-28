import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";

import { getMysqlPool } from "@/lib/server/mysql";
import type { AuthUser } from "@/types/auth";

import { hashSessionToken, SESSION_COOKIE_NAME } from "./session";

type CurrentUserRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string;
  onboarding_status: string | null;
};

export class AuthRequiredError extends Error {
  status = 401;
  code = "unauthenticated";

  constructor() {
    super("Authentication is required.");
    this.name = "AuthRequiredError";
  }
}

function mapAuthUser(row: CurrentUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    plan: row.plan,
    onboardingStatus: row.onboarding_status
  };
}

export async function getCurrentUserFromSessionToken(sessionToken: string | null | undefined) {
  if (!sessionToken) {
    return null;
  }

  const pool = getMysqlPool();
  const sessionTokenHash = hashSessionToken(sessionToken);

  const [rows] = await pool.execute<CurrentUserRow[]>(
    "SELECT u.id, u.name, u.email, u.role, u.status, u.plan, p.onboarding_status FROM user_sessions s INNER JOIN users u ON u.id = s.user_id LEFT JOIN user_profiles p ON p.user_id = u.id WHERE s.session_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.status = ? LIMIT 1",
    [sessionTokenHash, "active"]
  );

  return rows[0] ? mapAuthUser(rows[0]) : null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getCurrentUserFromSessionToken(sessionToken);
}

export async function getRequiredUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthRequiredError();
  }

  return user;
}
