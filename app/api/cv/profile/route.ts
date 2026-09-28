import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

export const runtime = "nodejs";

type DbRow = RowDataPacket & Record<string, unknown>;

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readString(input: Record<string, unknown>, key: string, fallback = "") {
  const value = input[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(input: Record<string, unknown>, key: string, fallback: string[]) {
  const value = input[key];

  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? Array.from(new Set(items)) : fallback;
}

function mapResume(row: DbRow | undefined) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    version: Number(row.version ?? 1),
    filename: String(row.filename),
    originalName: row.original_name ? String(row.original_name) : null,
    fileType: String(row.file_type),
    mimeType: row.mime_type ? String(row.mime_type) : null,
    sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
    rawText: row.raw_text ? String(row.raw_text) : "",
    detectedSkills: parseJsonArray(row.detected_skills),
    detectedSeniority: row.detected_seniority ? String(row.detected_seniority) : null,
    detectedStrengths: parseJsonArray(row.detected_strengths),
    extractedProfile: parseJsonRecord(row.extracted_profile),
    parserVersion: row.parser_version ? String(row.parser_version) : null,
    source: String(row.source ?? "upload"),
    status: String(row.status),
    active: Boolean(row.active),
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDevProfile(row: DbRow | undefined) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    resumeId: row.resume_id ? String(row.resume_id) : null,
    title: String(row.title),
    seniority: String(row.seniority),
    skills: parseJsonArray(row.skills),
    languages: parseJsonArray(row.languages),
    locations: parseJsonArray(row.locations),
    workModes: parseJsonArray(row.work_modes),
    salaryMin: row.salary_min === null || row.salary_min === undefined ? null : Number(row.salary_min),
    preferences: parseJsonRecord(row.preferences),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getCurrentCvProfile(userId: string) {
  const pool = getMysqlPool();

  const [resumeRows] = await pool.execute<DbRow[]>(
    "SELECT id, user_id, version, filename, original_name, file_type, mime_type, size_bytes, raw_text, detected_skills, detected_seniority, detected_strengths, extracted_profile, parser_version, source, status, active, uploaded_at, created_at, updated_at FROM resumes WHERE user_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  );

  const [devRows] = await pool.execute<DbRow[]>(
    "SELECT id, user_id, resume_id, title, seniority, skills, languages, locations, work_modes, salary_min, preferences, active, created_at, updated_at FROM dev_profiles WHERE user_id = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1",
    [userId]
  );

  return {
    resume: mapResume(resumeRows[0]),
    devProfile: mapDevProfile(devRows[0])
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const profile = await getCurrentCvProfile(user.id);

    return NextResponse.json({
      ok: true,
      profile
    });
  } catch (error) {
    console.error("Failed to load CV profile:", error);

    return NextResponse.json(
      { ok: false, error: "cv_profile_load_error", message: "Não foi possível carregar o perfil do CV." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const current = await getCurrentCvProfile(user.id);

    if (!current.resume || !current.devProfile) {
      return NextResponse.json(
        { ok: false, error: "cv_profile_not_found", message: "Carrega um CV antes de editar o perfil extraído." },
        { status: 404 }
      );
    }

    const title = readString(body, "title", current.devProfile.title);
    const seniority = readString(body, "seniority", current.devProfile.seniority);
    const skills = readStringArray(body, "skills", current.devProfile.skills as string[]);
    const languages = readStringArray(body, "languages", current.devProfile.languages as string[]);
    const locations = readStringArray(body, "locations", current.devProfile.locations as string[]);
    const workModes = readStringArray(body, "workModes", current.devProfile.workModes as string[]);
    const strengths = readStringArray(body, "strengths", current.resume.detectedStrengths as string[]);
    const summary = readString(body, "summary", `${title} · ${seniority} · ${skills.slice(0, 5).join(", ")}`);

    const preferences = {
      ...current.devProfile.preferences,
      source: "cv-profile-manual-edit",
      strengths,
      summary,
      updatedAt: new Date().toISOString()
    };

    const extractedProfile = {
      ...current.resume.extractedProfile,
      title,
      seniority,
      skills,
      languages,
      locations,
      workModes,
      strengths,
      summary,
      manuallyEdited: true
    };

    const pool = getMysqlPool();

    await pool.execute<ResultSetHeader>(
      "UPDATE dev_profiles SET title = ?, seniority = ?, skills = ?, languages = ?, locations = ?, work_modes = ?, preferences = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      [
        title,
        seniority,
        JSON.stringify(skills),
        JSON.stringify(languages),
        JSON.stringify(locations),
        JSON.stringify(workModes),
        JSON.stringify(preferences),
        current.devProfile.id,
        user.id
      ]
    );

    await pool.execute<ResultSetHeader>(
      "UPDATE resumes SET detected_skills = ?, detected_seniority = ?, detected_strengths = ?, extracted_profile = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      [
        JSON.stringify(skills.map((name) => ({ name, category: "manual", confidence: 1 }))),
        seniority,
        JSON.stringify(strengths),
        JSON.stringify(extractedProfile),
        current.resume.id,
        user.id
      ]
    );

    const profile = await getCurrentCvProfile(user.id);

    return NextResponse.json({
      ok: true,
      profile
    });
  } catch (error) {
    console.error("Failed to update CV profile:", error);

    return NextResponse.json(
      { ok: false, error: "cv_profile_update_error", message: "Não foi possível guardar o perfil extraído." },
      { status: 500 }
    );
  }
}
