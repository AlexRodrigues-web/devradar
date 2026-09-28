import type { ResultSetHeader } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(input: Record<string, unknown>, key: string) {
  const value = input[key];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseStack(value: unknown) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const cleaned = rawItems
    .map((item) => String(item).trim())
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, 12);
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUserFromSessionToken(sessionToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated", message: "Login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid onboarding payload." }, { status: 400 });
  }

  const desiredRole = readString(body, "desiredRole");
  const seniority = readString(body, "seniority");
  const location = readString(body, "location");
  const workMode = readString(body, "workMode");
  const stack = parseStack(body.stack);

  if (!desiredRole || !seniority || !location || !workMode || stack.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_fields", message: "Please complete all onboarding fields." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const profilePreferences = {
    source: "onboarding",
    desiredRole,
    seniority,
    location,
    workMode,
    stack,
    completedAt: nowIso
  };
  const devProfilePreferences = {
    source: "onboarding",
    desiredRole,
    completedAt: nowIso
  };
  const loopFilters = {
    keywords: stack.join(", "),
    location,
    workMode,
    level: seniority,
    selectedSources: ["Remotive", "Arbeitnow"],
    dateRange: "7d",
    category: "any",
    contractType: "any",
    jobLanguage: "any",
    minBudget: "",
    excludedTerms: "senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil"
  };

  const devProfileId = `dev-profile-onboarding-${user.id}`;
  const loopId = `loop-onboarding-default-${user.id}`;
  const pool = getMysqlPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      "INSERT INTO user_profiles (user_id, display_name, headline, location, language, onboarding_status, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), headline = VALUES(headline), location = VALUES(location), onboarding_status = VALUES(onboarding_status), preferences = VALUES(preferences), updated_at = NOW()",
      [
        user.id,
        user.name,
        `${desiredRole} · ${seniority}` ,
        location,
        "pt",
        "completed",
        JSON.stringify(profilePreferences)
      ]
    );

    await connection.execute<ResultSetHeader>(
      "UPDATE dev_profiles SET active = 0, updated_at = NOW() WHERE user_id = ?",
      [user.id]
    );

    await connection.execute<ResultSetHeader>(
      "INSERT INTO dev_profiles (id, user_id, title, seniority, skills, languages, locations, work_modes, preferences, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE title = VALUES(title), seniority = VALUES(seniority), skills = VALUES(skills), languages = VALUES(languages), locations = VALUES(locations), work_modes = VALUES(work_modes), preferences = VALUES(preferences), active = 1, updated_at = NOW()",
      [
        devProfileId,
        user.id,
        desiredRole,
        seniority,
        JSON.stringify(stack),
        JSON.stringify(["pt", "en"]),
        JSON.stringify([location]),
        JSON.stringify([workMode]),
        JSON.stringify(devProfilePreferences)
      ]
    );

    await connection.execute<ResultSetHeader>(
      "INSERT INTO loops (id, user_id, name, role, status, frequency, automation_mode, min_score, filters, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), status = VALUES(status), frequency = VALUES(frequency), automation_mode = VALUES(automation_mode), min_score = VALUES(min_score), filters = VALUES(filters), active = 1, updated_at = NOW()",
      [
        loopId,
        user.id,
        "Onboarding Default Loop",
        desiredRole,
        "active",
        "manual",
        "manual-review",
        60,
        JSON.stringify(loopFilters)
      ]
    );

    await connection.commit();

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        onboardingStatus: "completed"
      },
      onboarding: {
        desiredRole,
        seniority,
        location,
        workMode,
        stack,
        devProfileId,
        loopId
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error("Failed to save onboarding:", error);

    return NextResponse.json({ ok: false, error: "onboarding_save_failed", message: "Failed to save onboarding." }, { status: 500 });
  } finally {
    connection.release();
  }
}
