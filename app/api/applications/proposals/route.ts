import crypto from "crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";
import { recordOpportunityEvent } from "@/lib/server/opportunityEvents";
import { buildOutreachMessage, type OutreachTemplateType } from "@/lib/outreach";
import type { AppLanguage, Job } from "@/types/job";

export const runtime = "nodejs";

type ProposalPayload = {
  job: Job;
  language: AppLanguage;
  templateType?: OutreachTemplateType;
};

type OutreachPatchAction = "updated" | "copied";

type OutreachPatchPayload = {
  outreachId: string;
  subject: string;
  body: string;
  action: OutreachPatchAction;
};

type ApplicationRow = RowDataPacket & {
  id: string;
  user_id: string;
  job_id: string;
  job_snapshot: string | Job;
  status: string;
  channel: string;
  automation_status: string;
  match_score: number;
  notes: string | null;
  applied_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
};

type OutreachRow = RowDataPacket & {
  id: string;
  application_id: string;
  subject: string;
  body: string;
  language: string;
  status: string;
  created_at: Date | string;
  sent_at: Date | string | null;
};

type OutreachContextRow = RowDataPacket & Record<string, unknown>;

type MysqlPool = ReturnType<typeof getMysqlPool>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJobSnapshot(value: unknown): Job {
  if (isRecord(value)) {
    return value as Job;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {} as Job;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed as Job : {} as Job;
  } catch {
    return {} as Job;
  }
}

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapApplication(row: ApplicationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    job: parseJobSnapshot(row.job_snapshot),
    status: row.status,
    channel: row.channel,
    automationStatus: row.automation_status,
    matchScore: Number(row.match_score) || 0,
    notes: row.notes ?? undefined,
    appliedAt: toIso(row.applied_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at)
  };
}

function mapOutreach(row: OutreachRow) {
  return {
    id: row.id,
    applicationId: row.application_id,
    subject: row.subject,
    body: row.body,
    language: row.language,
    status: row.status,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    sentAt: toIso(row.sent_at)
  };
}

function parseTemplateType(value: unknown): OutreachTemplateType | undefined {
  if (value === "short_application") return value;
  if (value === "recruiter_email") return value;
  if (value === "freelance_proposal") return value;
  if (value === "follow_up") return value;
  if (value === "interview_reply") return value;

  return undefined;
}
function parsePayload(value: unknown): ProposalPayload | null {
  if (!isRecord(value) || !isRecord(value.job)) {
    return null;
  }

  const job = value.job as Job;
  const language = value.language === "en" || value.language === "es" ? value.language : "pt";
  const templateType = parseTemplateType(value.templateType);

  if (!job.id || !job.title || !job.company || !job.source || !job.sourceUrl) {
    return null;
  }

  return { job, language, templateType };
}

function parsePatchPayload(value: unknown): OutreachPatchPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const outreachId = typeof value.outreachId === "string" ? value.outreachId.trim() : "";
  const rawSubject = typeof value.subject === "string" ? value.subject.trim() : "";
  const rawBody = typeof value.body === "string" ? value.body.trim() : "";
  const action = value.action === "copied" || value.action === "updated" ? value.action : null;

  if (!outreachId || !rawSubject || !rawBody || !action) {
    return null;
  }

  return {
    outreachId,
    subject: rawSubject.slice(0, 255),
    body: rawBody.slice(0, 12000),
    action
  };
}

function parseJson(value: unknown) {
  if (typeof value !== "string") {
    return isRecord(value) ? value : {};
  }

  try {
    const parsed = JSON.parse(value);

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseOutreachContextJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function readOutreachContextRecord(value: unknown): Record<string, unknown> {
  const parsed = parseOutreachContextJson(value);
  return isRecord(parsed) ? parsed : {};
}

function readOutreachContextString(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : undefined;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function readOutreachContextNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readOutreachContextStringList(value: unknown) {
  const parsed = parseOutreachContextJson(value);
  const values = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "string"
      ? parsed.split(",")
      : [];

  return values
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (isRecord(item)) {
        return readOutreachContextString(item.name ?? item.label ?? item.value);
      }

      return undefined;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
}

function mergeOutreachContextLists(...lists: string[][]) {
  return Array.from(new Set(lists.flat().map((item) => item.trim()).filter(Boolean))).slice(0, 8);
}

function readFirstOutreachContextString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readOutreachContextString(record[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function getJobSnapshotValue(snapshot: unknown, key: "source" | "sourceUrl") {
  if (!isRecord(snapshot)) {
    return null;
  }

  const value = snapshot[key];

  return typeof value === "string" ? value : null;
}

async function loadOutreachCandidateContext(pool: MysqlPool, userId: string) {
  const [rows] = await pool.execute<OutreachContextRow[]>(
    `SELECT
       u.name,
       up.display_name,
       up.headline,
       up.location AS profile_location,
       up.preferences AS profile_preferences,
       dp.title,
       dp.seniority,
       dp.skills,
       dp.languages,
       dp.locations,
       dp.work_modes,
       dp.preferences AS dev_preferences
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     LEFT JOIN dev_profiles dp ON dp.user_id = u.id AND dp.active = 1
     WHERE u.id = ?
     ORDER BY dp.updated_at DESC
     LIMIT 1`,
    [userId]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const profilePreferences = readOutreachContextRecord(row.profile_preferences);
  const devPreferences = readOutreachContextRecord(row.dev_preferences);
  const profileLocation = readOutreachContextString(row.profile_location);
  const locations = mergeOutreachContextLists(
    readOutreachContextStringList(row.locations),
    profileLocation ? [profileLocation] : []
  );

  return {
    name: readOutreachContextString(row.display_name) ?? readOutreachContextString(row.name),
    title: readOutreachContextString(row.title) ?? readOutreachContextString(row.headline),
    seniority: readOutreachContextString(row.seniority),
    skills: readOutreachContextStringList(row.skills),
    languages: readOutreachContextStringList(row.languages),
    locations,
    workModes: readOutreachContextStringList(row.work_modes),
    summary:
      readFirstOutreachContextString(devPreferences, ["summary", "about", "headline"]) ??
      readFirstOutreachContextString(profilePreferences, ["summary", "about", "headline"]) ??
      readOutreachContextString(row.headline)
  };
}

async function loadLatestActiveOutreachLoop(pool: MysqlPool, userId: string) {
  const [rows] = await pool.execute<OutreachContextRow[]>(
    "SELECT name, role, frequency, min_score, filters FROM loops WHERE user_id = ? AND active = 1 ORDER BY last_run_at DESC, updated_at DESC LIMIT 1",
    [userId]
  );

  return rows[0] ?? null;
}

async function loadOutreachLoopContext(pool: MysqlPool, userId: string, jobId: string) {
  const [opportunityRows] = await pool.execute<OutreachContextRow[]>(
    `SELECT
       l.name,
       l.role,
       l.frequency,
       l.min_score,
       l.filters
     FROM opportunities o
     INNER JOIN loops l ON l.id = o.loop_id AND l.user_id = o.user_id
     WHERE o.user_id = ? AND o.id = ?
     LIMIT 1`,
    [userId, jobId]
  );

  const row = opportunityRows[0] ?? await loadLatestActiveOutreachLoop(pool, userId);

  if (!row) {
    return null;
  }

  const filters = readOutreachContextRecord(row.filters);

  return {
    name: readOutreachContextString(row.name),
    role: readOutreachContextString(row.role),
    frequency: readOutreachContextString(row.frequency),
    minScore: readOutreachContextNumber(row.min_score),
    keywords: readOutreachContextStringList(filters.keywords ?? filters.keyword ?? filters.query),
    technologies: readOutreachContextStringList(filters.technologies ?? filters.techs ?? filters.stack ?? filters.skills),
    location: readFirstOutreachContextString(filters, ["location", "region", "country"]),
    seniority: readFirstOutreachContextString(filters, ["seniority", "level"]),
    workMode: readFirstOutreachContextString(filters, ["workMode", "work_mode", "remote"]),
    contract: readFirstOutreachContextString(filters, ["contract", "contractType", "contract_type"])
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const pool = getMysqlPool();
    const [applications] = await pool.execute<ApplicationRow[]>("SELECT id, user_id, job_id, job_snapshot, status, channel, automation_status, match_score, notes, applied_at, created_at, updated_at FROM application_records WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50", [user.id]);
    const mappedApplications = applications.map(mapApplication);

    if (mappedApplications.length === 0) {
      return NextResponse.json({
        ok: true,
        applications: []
      });
    }

    const applicationIds = mappedApplications.map((application) => application.id);
    const placeholders = applicationIds.map(() => "?").join(", ");
    const [outreachRows] = await pool.execute<OutreachRow[]>(
      `SELECT id, application_id, subject, body, language, status, created_at, sent_at FROM outreach_messages WHERE application_id IN (${placeholders})`,
      applicationIds
    );

    const outreachByApplicationId = new Map(outreachRows.map((row) => [row.application_id, mapOutreach(row)]));

    return NextResponse.json({
      ok: true,
      applications: mappedApplications.map((application) => ({
        ...application,
        outreach: outreachByApplicationId.get(application.id)
      }))
    });
  } catch (error) {
    console.error("Failed to load application proposals:", error);
    return NextResponse.json({ ok: false, error: "applications_error", message: "Failed to load applications." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);
    const payload = parsePayload(body);

    if (!payload) {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid proposal payload." }, { status: 400 });
    }

    const pool = getMysqlPool();
    const applicationId = crypto.randomUUID();
    const outreachId = crypto.randomUUID();
    const jobSnapshot = JSON.stringify(payload.job);
    const matchScore = Number(payload.job.matchScore ?? 0);
    const candidateContext = await loadOutreachCandidateContext(pool, user.id);
    const loopContext = await loadOutreachLoopContext(pool, user.id, payload.job.id);
    const outreach = buildOutreachMessage({
      job: payload.job,
      language: payload.language,
      templateType: payload.templateType,
      candidateName: candidateContext?.name ?? undefined,
      candidateContext,
      loopContext
    });
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute<ResultSetHeader>("INSERT INTO application_records (id, user_id, job_id, job_snapshot, status, channel, automation_status, match_score, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE job_snapshot = VALUES(job_snapshot), status = VALUES(status), channel = VALUES(channel), automation_status = VALUES(automation_status), match_score = VALUES(match_score), notes = VALUES(notes), updated_at = NOW()", [applicationId, user.id, payload.job.id, jobSnapshot, "proposal", "manual", "needs-review", matchScore, "Proposal draft created"]);

      const [applicationRows] = await connection.execute<ApplicationRow[]>("SELECT id, user_id, job_id, job_snapshot, status, channel, automation_status, match_score, notes, applied_at, created_at, updated_at FROM application_records WHERE user_id = ? AND job_id = ? LIMIT 1", [user.id, payload.job.id]);
      const applicationRow = applicationRows[0];

      if (!applicationRow) {
        throw new Error("Application record was not found after save.");
      }

      await connection.execute<ResultSetHeader>("INSERT INTO outreach_messages (id, application_id, subject, body, language, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE subject = VALUES(subject), body = VALUES(body), language = VALUES(language), status = VALUES(status), updated_at = NOW()", [outreachId, applicationRow.id, outreach.subject, outreach.body, payload.language, "draft"]);

      await connection.execute<ResultSetHeader>("INSERT INTO opportunity_statuses (user_id, job_id, status, source, source_url, job_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE status = VALUES(status), source = VALUES(source), source_url = VALUES(source_url), job_snapshot = VALUES(job_snapshot), updated_at = NOW()", [user.id, payload.job.id, "proposal", payload.job.source, payload.job.sourceUrl, jobSnapshot]);

      await recordOpportunityEvent(connection, {
        userId: user.id,
        jobId: payload.job.id,
        eventType: "proposal_created",
        status: "proposal",
        source: payload.job.source,
        sourceUrl: payload.job.sourceUrl,
        jobSnapshot: payload.job,
        metadata: {
          applicationId: applicationRow.id,
          outreachId,
          language: payload.language,
      templateType: payload.templateType,
          channel: "manual",
          automationStatus: "needs-review"
        }
      });

      const [outreachRows] = await connection.execute<OutreachRow[]>("SELECT id, application_id, subject, body, language, status, created_at, sent_at FROM outreach_messages WHERE application_id = ? LIMIT 1", [applicationRow.id]);
      const outreachRow = outreachRows[0];

      if (!outreachRow) {
        throw new Error("Outreach message was not found after save.");
      }

      await connection.commit();

      return NextResponse.json({
        ok: true,
        application: mapApplication(applicationRow),
        outreach: mapOutreach(outreachRow)
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json({ ok: false, error: "proposal_error", message: "Failed to create proposal." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);
    const payload = parsePatchPayload(body);

    if (!payload) {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid outreach draft payload." }, { status: 400 });
    }

    const pool = getMysqlPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [outreachRows] = await connection.execute<OutreachRow[]>(
        "SELECT id, application_id, subject, body, language, status, created_at, sent_at FROM outreach_messages WHERE id = ? LIMIT 1",
        [payload.outreachId]
      );
      const existingOutreach = outreachRows[0];

      if (!existingOutreach) {
        await connection.rollback();
        return NextResponse.json({ ok: false, error: "not_found", message: "Outreach draft was not found." }, { status: 404 });
      }

      const [applicationRows] = await connection.execute<ApplicationRow[]>(
        "SELECT id, user_id, job_id, job_snapshot, status, channel, automation_status, match_score, notes, applied_at, created_at, updated_at FROM application_records WHERE id = ? AND user_id = ? LIMIT 1",
        [existingOutreach.application_id, user.id]
      );
      const applicationRow = applicationRows[0];

      if (!applicationRow) {
        await connection.rollback();
        return NextResponse.json({ ok: false, error: "not_found", message: "Application record was not found." }, { status: 404 });
      }

      await connection.execute<ResultSetHeader>(
        "UPDATE outreach_messages SET subject = ?, body = ?, status = ?, updated_at = NOW() WHERE id = ? AND application_id = ?",
        [payload.subject, payload.body, "draft", existingOutreach.id, applicationRow.id]
      );

      const [updatedRows] = await connection.execute<OutreachRow[]>(
        "SELECT id, application_id, subject, body, language, status, created_at, sent_at FROM outreach_messages WHERE id = ? LIMIT 1",
        [existingOutreach.id]
      );
      const updatedOutreach = updatedRows[0];

      if (!updatedOutreach) {
        throw new Error("Outreach message was not found after update.");
      }

      const jobSnapshot = parseJson(applicationRow.job_snapshot);
      const eventType = payload.action === "copied" ? "outreach_copied" : "outreach_draft_updated";

      await recordOpportunityEvent(connection, {
        userId: user.id,
        jobId: applicationRow.job_id,
        eventType,
        status: applicationRow.status,
        source: getJobSnapshotValue(jobSnapshot, "source"),
        sourceUrl: getJobSnapshotValue(jobSnapshot, "sourceUrl"),
        jobSnapshot,
        metadata: {
          applicationId: applicationRow.id,
          outreachId: updatedOutreach.id,
          action: payload.action,
          channel: applicationRow.channel,
          automationStatus: applicationRow.automation_status,
          persistedStatus: "draft",
          subjectPreview: payload.subject.slice(0, 120),
          bodyPreview: payload.body.slice(0, 240),
          bodyLength: payload.body.length
        }
      });

      await connection.commit();

      return NextResponse.json({
        ok: true,
        outreach: mapOutreach(updatedOutreach),
        eventType
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("applications_proposals_patch_error", error);

    return NextResponse.json(
      { ok: false, error: "proposal_update_error", message: "Failed to update outreach draft." },
      { status: 500 }
    );
  }
}
