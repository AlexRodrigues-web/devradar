import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

export const runtime = "nodejs";

type LoopRunRow = RowDataPacket & {
  id: string;
  loop_id: string;
  user_id: string;
  status: string;
  found: number;
  duplicates: number;
  rejected: number;
  approved: number;
  failed_sources: string | null;
  started_at: Date | string;
  finished_at: Date | string | null;
  metadata: string | null;
};

function toIso(value: unknown) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJsonRecord(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseFailedSources(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapLoopRun(row: LoopRunRow) {
  return {
    id: String(row.id),
    loopId: String(row.loop_id),
    userId: String(row.user_id),
    status: String(row.status),
    found: Number(row.found) || 0,
    duplicates: Number(row.duplicates) || 0,
    rejected: Number(row.rejected) || 0,
    approved: Number(row.approved) || 0,
    failedSources: parseFailedSources(row.failed_sources),
    metadata: parseJsonRecord(row.metadata),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at)
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const pool = getMysqlPool();
    const searchParams = request.nextUrl.searchParams;
    const loopId = searchParams.get("loopId");
    const requestedLimit = Number(searchParams.get("limit") ?? "10");
    const safeLimit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 10));

    const baseSelect =
      "SELECT id, loop_id, user_id, status, found, duplicates, rejected, approved, failed_sources, started_at, finished_at, metadata FROM loop_runs";

    const [rows] = loopId
      ? await pool.execute<LoopRunRow[]>(
          `${baseSelect} WHERE user_id = ? AND loop_id = ? ORDER BY started_at DESC LIMIT ${safeLimit}`,
          [user.id, loopId]
        )
      : await pool.execute<LoopRunRow[]>(
          `${baseSelect} WHERE user_id = ? ORDER BY started_at DESC LIMIT ${safeLimit}`,
          [user.id]
        );

    return NextResponse.json({
      ok: true,
      runs: rows.map(mapLoopRun)
    });
  } catch (error) {
    console.error("Failed to load loop runs:", error);

    return NextResponse.json(
      { ok: false, error: "loop_runs_error", message: "Failed to load loop runs." },
      { status: 500 }
    );
  }
}
