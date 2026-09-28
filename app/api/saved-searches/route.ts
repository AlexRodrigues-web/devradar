import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";
import type { SavedSearchFilters, SavedSearchFrequency, SavedSearchItem, SavedSearchStatus } from "@/types/saved-search";

export const runtime = "nodejs";

type SavedSearchRow = RowDataPacket & {
  id: string;
  user_id: string;
  title: string;
  filters: string | SavedSearchFilters;
  frequency: SavedSearchFrequency;
  status: SavedSearchStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

const allowedFrequencies = ["manual", "1h", "3h", "6h", "12h", "daily"] as const;
const allowedStatuses: SavedSearchStatus[] = ["active", "paused", "draft"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFrequency(value: unknown): value is SavedSearchFrequency {
  return typeof value === "string" && allowedFrequencies.includes(value as SavedSearchFrequency);
}

function isStatus(value: unknown): value is SavedSearchStatus {
  return typeof value === "string" && allowedStatuses.includes(value as SavedSearchStatus);
}

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readString(input: Record<string, unknown>, key: string, fallback = "") {
  const value = input[key];
  return typeof value === "string" ? value : fallback;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function parseFiltersFromDb(value: unknown): SavedSearchFilters {
  const parsed = parseJsonRecord(value);

  return {
    keywords: readString(parsed, "keywords"),
    locationCountry: readString(parsed, "locationCountry", "pt"),
    location: readString(parsed, "location", "pt-remote-europe"),
    workMode: readString(parsed, "workMode", "remote") as SavedSearchFilters["workMode"],
    level: readString(parsed, "level", "junior") as SavedSearchFilters["level"],
    category: readString(parsed, "category", "any"),
    contractType: readString(parsed, "contractType", "any") as SavedSearchFilters["contractType"],
    jobLanguage: readString(parsed, "jobLanguage", "any") as SavedSearchFilters["jobLanguage"],
    minBudget: readString(parsed, "minBudget"),
    excludedTerms: readString(parsed, "excludedTerms"),
    dateRange: readString(parsed, "dateRange", "7d"),
    selectedSources: parseStringArray(parsed.selectedSources) as SavedSearchFilters["selectedSources"]
  };
}

function normalizeFilters(value: unknown): SavedSearchFilters {
  return parseFiltersFromDb(value);
}

function mapRow(row: SavedSearchRow): SavedSearchItem {
  return {
    id: row.id,
    title: row.title,
    filters: parseFiltersFromDb(row.filters),
    frequency: row.frequency,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute<SavedSearchRow[]>("SELECT id, user_id, title, filters, frequency, status, created_at, updated_at FROM saved_searches WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50", [user.id]);

    return NextResponse.json({
      ok: true,
      savedSearches: rows.map(mapRow)
    });
  } catch (error) {
    console.error("Failed to load saved searches:", error);
    return NextResponse.json({ ok: false, error: "saved_searches_error", message: "Failed to load saved searches." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid saved search payload." }, { status: 400 });
    }

    const title = readString(body, "title", "Saved search").trim() || "Saved search";
    const frequency = isFrequency(body.frequency) ? body.frequency : "manual";
    const status = isStatus(body.status) ? body.status : "active";
    const filters = normalizeFilters(body.filters);
    const id = readString(body, "id").trim() || crypto.randomUUID();
    const pool = getMysqlPool();

    const [existingRows] = await pool.execute<SavedSearchRow[]>("SELECT id, user_id, title, filters, frequency, status, created_at, updated_at FROM saved_searches WHERE id = ? LIMIT 1", [id]);
    const existing = existingRows[0];

    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "not_found", message: "Saved search not found." }, { status: 404 });
    }

    await pool.execute("INSERT INTO saved_searches (id, user_id, title, filters, frequency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE title = VALUES(title), filters = VALUES(filters), frequency = VALUES(frequency), status = VALUES(status), updated_at = NOW()", [id, user.id, title, JSON.stringify(filters), frequency, status]);

    const [rows] = await pool.execute<SavedSearchRow[]>("SELECT id, user_id, title, filters, frequency, status, created_at, updated_at FROM saved_searches WHERE id = ? AND user_id = ? LIMIT 1", [id, user.id]);
    const savedSearch = rows[0] ? mapRow(rows[0]) : null;

    if (!savedSearch) {
      return NextResponse.json({ ok: false, error: "not_found_after_save", message: "Saved search was not found after save." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, savedSearch });
  } catch (error) {
    console.error("Failed to save search:", error);
    return NextResponse.json({ ok: false, error: "saved_search_save_error", message: "Failed to save search." }, { status: 500 });
  }
}
