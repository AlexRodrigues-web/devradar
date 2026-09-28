import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";

type EventExecutor = Pool | PoolConnection;

type OpportunityEventInput = {
  userId: string;
  jobId: string;
  eventType: "status_changed" | "proposal_created" | "follow_up_created" | "outreach_draft_updated" | "outreach_copied";
  status?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  jobSnapshot: unknown;
  metadata?: Record<string, unknown>;
};

export async function recordOpportunityEvent(executor: EventExecutor, input: OpportunityEventInput) {
  const jobSnapshotJson = JSON.stringify(input.jobSnapshot ?? {}) ?? "{}";
  const metadataJson = JSON.stringify(input.metadata ?? {}) ?? "{}";

  await executor.execute(
    "INSERT INTO opportunity_events (id, user_id, job_id, event_type, status, source, source_url, job_snapshot, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
    [
      randomUUID(),
      input.userId,
      input.jobId,
      input.eventType,
      input.status ?? null,
      input.source ?? null,
      input.sourceUrl ?? null,
      jobSnapshotJson,
      metadataJson
    ]
  );
}
