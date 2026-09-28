import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { NextRequest } from "next/server";

import { getMysqlPool } from "@/lib/server/mysql";
import type { AuthResult, AuthUser } from "@/types/auth";

import { hashPassword, verifyPassword, validatePassword } from "./password";
import { createUserSession, revokeSessionToken } from "./session";

type JsonRecord = Record<string, unknown>;

type UserCredentialRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string;
  onboarding_status: string | null;
  password_hash: string;
};

type ExistingUserRow = RowDataPacket & {
  id: string;
};

export class AuthServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(input: JsonRecord, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapUser(row: UserCredentialRow): AuthUser {
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

async function recordAuthEvent({
  userId,
  email,
  eventType,
  metadata
}: {
  userId: string | null;
  email: string | null;
  eventType: string;
  metadata?: JsonRecord;
}) {
  const pool = getMysqlPool();

  await pool.execute<ResultSetHeader>(
    "INSERT INTO auth_events (id, user_id, email, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [randomUUID(), userId, email, eventType, JSON.stringify(metadata ?? {})]
  );
}

export async function registerUser(input: unknown, request?: NextRequest): Promise<AuthResult> {
  if (!isRecord(input)) {
    throw new AuthServiceError("invalid_payload", 400, "Invalid registration payload.");
  }

  const name = readString(input, "name");
  const email = normalizeEmail(readString(input, "email"));
  const password = readString(input, "password");

  if (!name) {
    throw new AuthServiceError("invalid_name", 400, "Name is required.");
  }

  if (!validateEmail(email)) {
    throw new AuthServiceError("invalid_email", 400, "Valid email is required.");
  }

  try {
    validatePassword(password);
  } catch {
    throw new AuthServiceError("invalid_password", 400, "Password must have at least 8 characters.");
  }

  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute<ExistingUserRow[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

    if (existingRows.length) {
      throw new AuthServiceError("email_taken", 409, "This email is already registered.");
    }

    await connection.execute<ResultSetHeader>(
      "INSERT INTO users (id, name, email, role, status, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [userId, name, email, "member", "active", "free"]
    );

    await connection.execute<ResultSetHeader>(
      "INSERT INTO user_profiles (user_id, display_name, headline, location, language, onboarding_status, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [userId, name, null, null, "pt", "pending", JSON.stringify({ source: "registration" })]
    );

    await connection.execute<ResultSetHeader>(
      "INSERT INTO user_auth_credentials (user_id, password_hash, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [userId, passwordHash]
    );

    await connection.execute<ResultSetHeader>(
      "INSERT INTO auth_events (id, user_id, email, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [randomUUID(), userId, email, "register_success", JSON.stringify({ source: "auth_service" })]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();

    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError("register_failed", 500, "Registration failed.");
  } finally {
    connection.release();
  }

  const session = await createUserSession({ userId, request });

  return {
    user: {
      id: userId,
      name,
      email,
      role: "member",
      status: "active",
      plan: "free",
      onboardingStatus: "pending"
    },
    session
  };
}

export async function loginUser(input: unknown, request?: NextRequest): Promise<AuthResult> {
  if (!isRecord(input)) {
    throw new AuthServiceError("invalid_payload", 400, "Invalid login payload.");
  }

  const email = normalizeEmail(readString(input, "email"));
  const password = readString(input, "password");

  if (!validateEmail(email) || !password) {
    throw new AuthServiceError("invalid_credentials", 401, "Invalid email or password.");
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute<UserCredentialRow[]>(
    "SELECT u.id, u.name, u.email, u.role, u.status, u.plan, p.onboarding_status, c.password_hash FROM users u INNER JOIN user_auth_credentials c ON c.user_id = u.id LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.email = ? LIMIT 1",
    [email]
  );

  const row = rows[0];

  if (!row || row.status !== "active") {
    await recordAuthEvent({ userId: null, email, eventType: "login_failed", metadata: { reason: "not_found_or_inactive" } });
    throw new AuthServiceError("invalid_credentials", 401, "Invalid email or password.");
  }

  const passwordMatches = await verifyPassword(password, row.password_hash);

  if (!passwordMatches) {
    await recordAuthEvent({ userId: row.id, email, eventType: "login_failed", metadata: { reason: "password_mismatch" } });
    throw new AuthServiceError("invalid_credentials", 401, "Invalid email or password.");
  }

  await pool.execute<ResultSetHeader>("UPDATE user_auth_credentials SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = ?", [row.id]);
  await recordAuthEvent({ userId: row.id, email, eventType: "login_success", metadata: { source: "auth_service" } });

  const session = await createUserSession({ userId: row.id, request });

  return {
    user: mapUser(row),
    session
  };
}

export async function logoutUser(sessionToken: string | null | undefined) {
  if (!sessionToken) {
    return false;
  }

  return revokeSessionToken(sessionToken);
}
