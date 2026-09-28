import crypto from "crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getMysqlPool } from "@/lib/server/mysql";

type JsonRecord = Record<string, unknown>;
type DbRow = RowDataPacket & Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): JsonRecord {
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

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readString(input: JsonRecord, key: string, fallback: string) {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumber(input: JsonRecord, key: string, fallback: number) {
  const value = input[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function readBoolean(input: JsonRecord, key: string, fallback: boolean) {
  const value = input[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value === "true" || value === "1";
  }

  return fallback;
}

function toIso(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapLoop(row: DbRow) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    role: String(row.role),
    status: String(row.status),
    frequency: String(row.frequency),
    automationMode: String(row.automation_mode),
    minScore: Number(row.min_score) || 0,
    filters: parseJsonRecord(row.filters),
    active: Boolean(row.active),
    lastRunAt: toIso(row.last_run_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapNotification(row: DbRow) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    readAt: toIso(row.read_at),
    metadata: parseJsonRecord(row.metadata),
    createdAt: toIso(row.created_at)
  };
}

function mapLoopRun(row: DbRow) {
  return {
    id: String(row.id),
    loopId: String(row.loop_id),
    userId: String(row.user_id),
    status: String(row.status),
    found: Number(row.found) || 0,
    duplicates: Number(row.duplicates) || 0,
    rejected: Number(row.rejected) || 0,
    approved: Number(row.approved) || 0,
    failedSources: parseJsonArray(row.failed_sources),
    metadata: parseJsonRecord(row.metadata),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at)
  };
}

function mapJobSource(row: DbRow) {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    enabled: Boolean(row.enabled),
    config: parseJsonRecord(row.config),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function getDomainSummary(userId: string) {
  const pool = getMysqlPool();

  const [userRows] = await pool.execute<DbRow[]>("SELECT id, name, email, role, status, plan, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [userId]);
  const [profileRows] = await pool.execute<DbRow[]>("SELECT user_id, display_name, headline, location, language, onboarding_status, preferences, created_at, updated_at FROM user_profiles WHERE user_id = ? LIMIT 1", [userId]);
  const [devProfileRows] = await pool.execute<DbRow[]>("SELECT id, user_id, title, seniority, skills, languages, locations, work_modes, salary_min, preferences, active, created_at, updated_at FROM dev_profiles WHERE user_id = ? AND active = 1 LIMIT 1", [userId]);
  const [countRows] = await pool.execute<DbRow[]>("SELECT 'loops' AS name, COUNT(*) AS total FROM loops WHERE user_id = ? UNION ALL SELECT 'loop_runs' AS name, COUNT(*) AS total FROM loop_runs WHERE user_id = ? UNION ALL SELECT 'opportunities' AS name, COUNT(*) AS total FROM opportunities WHERE user_id = ? UNION ALL SELECT 'notifications' AS name, COUNT(*) AS total FROM notifications WHERE user_id = ?", [userId, userId, userId, userId]);

  return {
    user: userRows[0] ?? null,
    profile: profileRows[0]
      ? {
          userId: String(profileRows[0].user_id),
          displayName: String(profileRows[0].display_name),
          headline: profileRows[0].headline ? String(profileRows[0].headline) : null,
          location: profileRows[0].location ? String(profileRows[0].location) : null,
          language: String(profileRows[0].language),
          onboardingStatus: String(profileRows[0].onboarding_status),
          preferences: parseJsonRecord(profileRows[0].preferences)
        }
      : null,
    devProfile: devProfileRows[0]
      ? {
          id: String(devProfileRows[0].id),
          userId: String(devProfileRows[0].user_id),
          title: String(devProfileRows[0].title),
          seniority: String(devProfileRows[0].seniority),
          skills: parseJsonArray(devProfileRows[0].skills),
          languages: parseJsonArray(devProfileRows[0].languages),
          locations: parseJsonArray(devProfileRows[0].locations),
          workModes: parseJsonArray(devProfileRows[0].work_modes),
          salaryMin: devProfileRows[0].salary_min ?? null,
          preferences: parseJsonRecord(devProfileRows[0].preferences),
          active: Boolean(devProfileRows[0].active)
        }
      : null,
    counts: countRows.reduce<JsonRecord>((acc, row) => {
      acc[String(row.name)] = Number(row.total) || 0;
      return acc;
    }, {})
  };
}

export async function getUserProfile(userId: string) {
  const summary = await getDomainSummary(userId);
  return {
    user: summary.user,
    profile: summary.profile,
    devProfile: summary.devProfile
  };
}

export async function updateUserProfile(userId: string, input: JsonRecord) {
  const current = await getUserProfile(userId);
  const pool = getMysqlPool();
  const displayName = readString(input, "displayName", current.profile?.displayName ?? "User");
  const headline = readString(input, "headline", current.profile?.headline ?? "Developer looking for opportunities");
  const location = readString(input, "location", current.profile?.location ?? "Portugal");
  const language = readString(input, "language", current.profile?.language ?? "pt");
  const preferences = isRecord(input.preferences) ? input.preferences : current.profile?.preferences ?? {};

  await pool.execute<ResultSetHeader>("UPDATE user_profiles SET display_name = ?, headline = ?, location = ?, language = ?, preferences = ?, updated_at = NOW() WHERE user_id = ?", [displayName, headline, location, language, JSON.stringify(preferences), userId]);

  return getUserProfile(userId);
}

const defaultJobSources = [
  {
    id: "source-remotive",
    name: "Remotive",
    type: "api",
    enabled: true,
    config: { connector: "Remotive" }
  },
  {
    id: "source-arbeitnow",
    name: "Arbeitnow",
    type: "api",
    enabled: true,
    config: { connector: "Arbeitnow" }
  },
  {
    id: "source-remote-ok",
    name: "Remote OK",
    type: "api",
    enabled: true,
    config: { connector: "Remote OK" }
  },
  {
    id: "source-we-work-remotely",
    name: "We Work Remotely",
    type: "rss",
    enabled: true,
    config: { connector: "WWR RSS" }
  },
  {
    id: "source-adzuna",
    name: "Adzuna",
    type: "api",
    enabled: true,
    config: { connector: "Adzuna" }
  },
  {
    id: "source-manual",
    name: "Manual",
    type: "manual",
    enabled: true,
    config: { connector: "Manual" }
  }
] as const;

async function ensureDefaultJobSources() {
  const pool = getMysqlPool();

  for (const source of defaultJobSources) {
    await pool.execute<ResultSetHeader>(
      "INSERT INTO job_sources (id, name, type, enabled, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), config = VALUES(config)",
      [source.id, source.name, source.type, source.enabled ? 1 : 0, JSON.stringify(source.config)]
    );
  }
}

export async function listJobSources() {
  await ensureDefaultJobSources();
  const pool = getMysqlPool();
  const [rows] = await pool.execute<DbRow[]>("SELECT id, name, type, enabled, config, created_at, updated_at FROM job_sources ORDER BY name");
  return rows.map(mapJobSource);
}

export async function updateJobSource(id: string, enabled: boolean) {
  const pool = getMysqlPool();
  await pool.execute<ResultSetHeader>("UPDATE job_sources SET enabled = ?, updated_at = NOW() WHERE id = ?", [enabled ? 1 : 0, id]);
  return listJobSources();
}

export async function listLoops(userId: string) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<DbRow[]>("SELECT id, user_id, name, role, status, frequency, automation_mode, min_score, filters, active, last_run_at, created_at, updated_at FROM loops WHERE user_id = ? ORDER BY updated_at DESC", [userId]);
  return rows.map(mapLoop);
}

export async function getLoop(userId: string, id: string) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<DbRow[]>("SELECT id, user_id, name, role, status, frequency, automation_mode, min_score, filters, active, last_run_at, created_at, updated_at FROM loops WHERE user_id = ? AND id = ? LIMIT 1", [userId, id]);
  return rows[0] ? mapLoop(rows[0]) : null;
}

export async function createLoop(userId: string, input: JsonRecord) {
  const pool = getMysqlPool();
  const id = readString(input, "id", crypto.randomUUID());
  const name = readString(input, "name", "New Loop");
  const role = readString(input, "role", "Developer");
  const status = readString(input, "status", "draft");
  const frequency = readString(input, "frequency", "manual");
  const automationMode = readString(input, "automationMode", "manual-review");
  const minScore = readNumber(input, "minScore", 60);
  const filters = isRecord(input.filters) ? input.filters : {};

  await pool.execute<ResultSetHeader>("INSERT INTO loops (id, user_id, name, role, status, frequency, automation_mode, min_score, filters, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())", [id, userId, name, role, status, frequency, automationMode, minScore, JSON.stringify(filters)]);

  const loop = await getLoop(userId, id);

  if (!loop) {
    throw new Error("Loop was not found after create.");
  }

  return loop;
}

export async function updateLoop(userId: string, id: string, input: JsonRecord) {
  const pool = getMysqlPool();
  const current = await getLoop(userId, id);

  if (!current) {
    return null;
  }

  const name = readString(input, "name", current.name);
  const role = readString(input, "role", current.role);
  const status = readString(input, "status", current.status);
  const frequency = readString(input, "frequency", current.frequency);
  const automationMode = readString(input, "automationMode", current.automationMode);
  const minScore = readNumber(input, "minScore", current.minScore);
  const filters = isRecord(input.filters) ? input.filters : current.filters;
  const active = readBoolean(input, "active", current.active);

  await pool.execute<ResultSetHeader>("UPDATE loops SET name = ?, role = ?, status = ?, frequency = ?, automation_mode = ?, min_score = ?, filters = ?, active = ?, updated_at = NOW() WHERE id = ? AND user_id = ?", [name, role, status, frequency, automationMode, minScore, JSON.stringify(filters), active ? 1 : 0, id, userId]);

  return getLoop(userId, id);
}

export async function deleteLoop(userId: string, id: string) {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>("DELETE FROM loops WHERE id = ? AND user_id = ?", [id, userId]);
  return result.affectedRows > 0;
}

async function getLoopRunById(userId: string, id: string) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<DbRow[]>("SELECT id, loop_id, user_id, status, found, duplicates, rejected, approved, failed_sources, started_at, finished_at, metadata FROM loop_runs WHERE id = ? AND user_id = ? LIMIT 1", [id, userId]);
  return rows[0] ? mapLoopRun(rows[0]) : null;
}

export async function createLoopRun(userId: string, input: JsonRecord) {
  const pool = getMysqlPool();
  const id = readString(input, "id", crypto.randomUUID());
  const loopId = readString(input, "loopId", "");

  if (!loopId) {
    throw new Error("Loop id is required to create a loop run.");
  }

  const loop = await getLoop(userId, loopId);

  if (!loop) {
    throw new Error("Loop not found for loop run creation.");
  }

  const status = readString(input, "status", "pending");
  const found = readNumber(input, "found", 0);
  const duplicates = readNumber(input, "duplicates", 0);
  const rejected = readNumber(input, "rejected", 0);
  const approved = readNumber(input, "approved", 0);
  const failedSources = Array.isArray(input.failedSources) ? input.failedSources : [];
  const metadata = isRecord(input.metadata) ? input.metadata : {};
  const startedAt = toDate(input.startedAt) ?? new Date();
  const finishedAt = toDate(input.finishedAt);

  await pool.execute<ResultSetHeader>(
    "INSERT INTO loop_runs (id, loop_id, user_id, status, found, duplicates, rejected, approved, failed_sources, started_at, finished_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, loopId, userId, status, found, duplicates, rejected, approved, JSON.stringify(failedSources), startedAt, finishedAt, JSON.stringify(metadata)]
  );

  const run = await getLoopRunById(userId, id);

  if (!run) {
    throw new Error("Loop run was created but could not be loaded.");
  }

  return run;
}

export async function updateLoopRun(userId: string, id: string, input: JsonRecord) {
  const current = await getLoopRunById(userId, id);

  if (!current) {
    return null;
  }

  const pool = getMysqlPool();
  const status = readString(input, "status", current.status);
  const found = readNumber(input, "found", current.found);
  const duplicates = readNumber(input, "duplicates", current.duplicates);
  const rejected = readNumber(input, "rejected", current.rejected);
  const approved = readNumber(input, "approved", current.approved);
  const failedSources = Array.isArray(input.failedSources) ? input.failedSources : current.failedSources;
  const metadata = isRecord(input.metadata) ? input.metadata : current.metadata;
  const finishedAt = input.finishedAt === null ? null : toDate(input.finishedAt) ?? toDate(current.finishedAt);

  await pool.execute<ResultSetHeader>(
    "UPDATE loop_runs SET status = ?, found = ?, duplicates = ?, rejected = ?, approved = ?, failed_sources = ?, finished_at = ?, metadata = ? WHERE id = ? AND user_id = ?",
    [status, found, duplicates, rejected, approved, JSON.stringify(failedSources), finishedAt, JSON.stringify(metadata), id, userId]
  );

  return getLoopRunById(userId, id);
}

export async function finishLoopRun(userId: string, id: string, input: JsonRecord = {}) {
  const current = await getLoopRunById(userId, id);

  if (!current) {
    return null;
  }

  const pool = getMysqlPool();
  const finishedAt = toDate(input.finishedAt) ?? new Date();
  const status = readString(input, "status", "success");
  const run = await updateLoopRun(userId, id, {
    ...input,
    status,
    finishedAt
  });

  await pool.execute<ResultSetHeader>("UPDATE loops SET last_run_at = ?, updated_at = NOW() WHERE id = ? AND user_id = ?", [finishedAt, current.loopId, userId]);

  return run;
}

export async function listNotifications(userId: string) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<DbRow[]>("SELECT id, user_id, type, title, body, read_at, metadata, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId]);
  return rows.map(mapNotification);
}

export async function createNotification(userId: string, input: JsonRecord) {
  const pool = getMysqlPool();
  const id = readString(input, "id", crypto.randomUUID());
  const type = readString(input, "type", "info");
  const title = readString(input, "title", "Notification");
  const body = readString(input, "body", "");
  const metadata = isRecord(input.metadata) ? input.metadata : {};

  await pool.execute<ResultSetHeader>("INSERT INTO notifications (id, user_id, type, title, body, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())", [id, userId, type, title, body, JSON.stringify(metadata)]);

  const notifications = await listNotifications(userId);
  return notifications.find((item) => item.id === id) ?? null;
}

export async function markNotificationRead(userId: string, id: string) {
  const pool = getMysqlPool();
  await pool.execute<ResultSetHeader>("UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?", [id, userId]);
  const notifications = await listNotifications(userId);
  return notifications.find((item) => item.id === id) ?? null;
}

export async function deleteNotification(userId: string, id: string) {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>("DELETE FROM notifications WHERE id = ? AND user_id = ?", [id, userId]);
  return result.affectedRows > 0;
}