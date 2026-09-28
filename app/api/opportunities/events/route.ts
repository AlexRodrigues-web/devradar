import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

type OpportunityEventRow = RowDataPacket & {
  id: string;
  user_id: string;
  job_id: string;
  event_type: string;
  status: string | null;
  source: string | null;
  source_url: string | null;
  job_snapshot: unknown;
  metadata: unknown;
  created_at: Date | string;
};

function parseJson(value: unknown) {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }

  return value;
}

function toIso(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapEvent(row: OpportunityEventRow) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    eventType: String(row.event_type),
    status: row.status ? String(row.status) : null,
    source: row.source ? String(row.source) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    jobSnapshot: parseJson(row.job_snapshot),
    metadata: parseJson(row.metadata),
    createdAt: toIso(row.created_at)
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const requestedLimit = Number(searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;

    const pool = getMysqlPool();

    let query = "SELECT id, user_id, job_id, event_type, status, source, source_url, job_snapshot, metadata, created_at FROM opportunity_events WHERE user_id = ?";
    const params: string[] = [user.id];

    if (jobId) {
      query += " AND job_id = ?";
      params.push(jobId);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const [rows] = await pool.execute<OpportunityEventRow[]>(query, params);

    return NextResponse.json({
      ok: true,
      events: rows.map(mapEvent)
    });
  } catch (error) {
    console.error("Failed to load opportunity events:", error);

    return NextResponse.json(
      { ok: false, error: "opportunity_events_error", message: "Failed to load opportunity events." },
      { status: 500 }
    );
  }
}
