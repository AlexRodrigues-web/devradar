import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

type OpportunityRow = RowDataPacket & {
  id: string;
  user_id: string;
  loop_id: string | null;
  loop_run_id: string | null;
  source_id: string | null;
  source: string;
  source_url: string;
  title: string;
  company: string;
  location: string | null;
  match_score: number;
  status: string;
  job_snapshot: string;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  updated_at: Date | string;
};

type OpportunityStatusRow = RowDataPacket & {
  job_id: string;
  status: string;
};

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mapOpportunity(row: OpportunityRow, statusOverride?: string) {
  const snapshot = parseJsonObject(row.job_snapshot);

  return {
    id: String(row.id),
    userId: String(row.user_id),
    loopId: row.loop_id ? String(row.loop_id) : null,
    loopRunId: row.loop_run_id ? String(row.loop_run_id) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    source: String(row.source),
    sourceUrl: String(row.source_url),
    title: String(row.title),
    company: String(row.company),
    location: row.location ? String(row.location) : "",
    matchScore: Number(row.match_score) || 0,
    status: statusOverride ?? String(row.status),
    snapshot,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const loopId = searchParams.get("loopId");
    const requestedLimit = Number(searchParams.get("limit") ?? "20");
    const safeLimit = Math.max(1, Math.min(100, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 20));

    const pool = getMysqlPool();

    const baseSelect =
      "SELECT id, user_id, loop_id, loop_run_id, source_id, source, source_url, title, company, location, match_score, status, job_snapshot, first_seen_at, last_seen_at, updated_at FROM opportunities";

    const [rows] = loopId
      ? await pool.execute<OpportunityRow[]>(
          `${baseSelect} WHERE user_id = ? AND loop_id = ? ORDER BY match_score DESC, last_seen_at DESC LIMIT ${safeLimit}`,
          [user.id, loopId]
        )
      : await pool.execute<OpportunityRow[]>(
          `${baseSelect} WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT ${safeLimit}`,
          [user.id]
        );

    const jobIds = rows.map((row) => row.id);
    const statusByJobId = new Map<string, string>();

    if (jobIds.length) {
      const placeholders = jobIds.map(() => "?").join(",");
      const [statusRows] = await pool.execute<OpportunityStatusRow[]>(
        `SELECT job_id, status FROM opportunity_statuses WHERE user_id = ? AND job_id IN (${placeholders})`,
        [user.id, ...jobIds]
      );

      for (const statusRow of statusRows) {
        statusByJobId.set(String(statusRow.job_id), String(statusRow.status));
      }
    }

    return NextResponse.json({
      ok: true,
      opportunities: rows.map((row) => mapOpportunity(row, statusByJobId.get(row.id)))
    });
  } catch (error) {
    console.error("Failed to load opportunities:", error);

    return NextResponse.json(
      { ok: false, error: "opportunities_error", message: "Failed to load opportunities." },
      { status: 500 }
    );
  }
}
