import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";
import { recordOpportunityEvent } from "@/lib/server/opportunityEvents";
import type { Job } from "@/types/job";

export const runtime = "nodejs";

const allowedStatuses = new Set([
  "new",
  "selected",
  "saved",
  "pipeline",
  "proposal",
  "applied",
  "interview",
  "offer",
  "rejected",
  "ignored"
]);

type StatusPayload = {
  jobId: string;
  status: string;
  job: Job;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): StatusPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.jobId !== "string" || typeof value.status !== "string" || !isRecord(value.job)) {
    return null;
  }

  if (!allowedStatuses.has(value.status)) {
    return null;
  }

  const job = value.job as Job;

  if (!job.source || !job.sourceUrl) {
    return null;
  }

  return {
    jobId: value.jobId,
    status: value.status,
    job
  };
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
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid opportunity status payload." }, { status: 400 });
    }

    const pool = getMysqlPool();

    await pool.execute(
      "INSERT INTO opportunity_statuses (user_id, job_id, status, source, source_url, job_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE status = VALUES(status), source = VALUES(source), source_url = VALUES(source_url), job_snapshot = VALUES(job_snapshot), updated_at = NOW()",
      [
        user.id,
        payload.jobId,
        payload.status,
        payload.job.source,
        payload.job.sourceUrl,
        JSON.stringify(payload.job)
      ]
    );

    await recordOpportunityEvent(pool, {
      userId: user.id,
      jobId: payload.jobId,
      eventType: "status_changed",
      status: payload.status,
      source: payload.job.source,
      sourceUrl: payload.job.sourceUrl,
      jobSnapshot: payload.job,
      metadata: { via: "opportunity_status_api" }
    });

    return NextResponse.json({
      ok: true,
      jobId: payload.jobId,
      status: payload.status
    });
  } catch (error) {
    console.error("Failed to update opportunity status:", error);
    return NextResponse.json({ ok: false, error: "opportunity_status_error", message: "Failed to update opportunity status." }, { status: 500 });
  }
}
