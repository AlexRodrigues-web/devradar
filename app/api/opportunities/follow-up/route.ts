import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";
import { recordOpportunityEvent } from "@/lib/server/opportunityEvents";
import type { Job } from "@/types/job";

type FollowUpPayload = {
  job?: Job;
  note?: string;
};

function parsePayload(value: unknown): FollowUpPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as FollowUpPayload;

  if (!payload.job?.id) {
    return null;
  }

  return payload;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const payload = parsePayload(await request.json().catch(() => null));

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", message: "Invalid follow-up payload." },
        { status: 400 }
      );
    }

    const job = payload.job;

    if (!job) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", message: "Invalid follow-up payload." },
        { status: 400 }
      );
    }
    const pool = getMysqlPool();
    const note = payload.note?.trim() || "Follow-up manual criado a partir do detalhe da oportunidade.";

    await recordOpportunityEvent(pool, {
      userId: user.id,
      jobId: job.id,
      eventType: "follow_up_created",
      status: job.status,
      source: job.source,
      sourceUrl: job.sourceUrl,
      jobSnapshot: job,
      metadata: {
        channel: "manual",
        note,
        nextAction: job.nextAction,
        via: "opportunity_follow_up_api"
      }
    });

    return NextResponse.json({
      ok: true,
      event: {
        eventType: "follow_up_created",
        jobId: job.id,
        note
      }
    });
  } catch (error) {
    console.error("Failed to create follow-up:", error);

    return NextResponse.json(
      { ok: false, error: "follow_up_error", message: "Failed to create follow-up." },
      { status: 500 }
    );
  }
}
