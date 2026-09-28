import type { Job, JobStatus } from "@/types/job";

export type OpportunityEvent = {
  id: string;
  userId: string;
  jobId: string;
  eventType: "status_changed" | "proposal_created" | "follow_up_created" | "outreach_draft_updated" | "outreach_copied" | string;
  status: JobStatus | string | null;
  source: string | null;
  sourceUrl: string | null;
  jobSnapshot?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type FollowUpResponse = {
  ok?: boolean;
  event?: {
    eventType: string;
    jobId: string;
    note?: string;
  };
  error?: string;
  message?: string;
};

type OpportunityEventsResponse = {
  ok?: boolean;
  events?: OpportunityEvent[];
  error?: string;
  message?: string;
};

type UpdateOpportunityStatusResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export async function updateOpportunityStatusRemote(job: Job, status: JobStatus) {
  const response = await fetch("/api/opportunities/status", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jobId: job.id,
      status,
      job
    })
  });

  const data = (await response.json().catch(() => null)) as UpdateOpportunityStatusResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message ?? data?.error ?? `Opportunity status API HTTP ${response.status}`);
  }

  return data;
}

export type LoopOpportunityItem = {
  id: string;
  userId: string;
  loopId: string | null;
  loopRunId: string | null;
  sourceId: string | null;
  source: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  status: string;
  snapshot: Record<string, unknown>;
  firstSeenAt: string | Date;
  lastSeenAt: string | Date;
  updatedAt: string | Date;
};

type LoopOpportunitiesResponse = {
  ok?: boolean;
  opportunities?: LoopOpportunityItem[];
  error?: string;
  message?: string;
};

function getOpportunityErrorMessage(response: Response, data: { error?: string; message?: string } | null, fallback: string) {
  return data?.message ?? data?.error ?? `${fallback} HTTP ${response.status}`;
}

export async function fetchLoopOpportunitiesRemote(loopId?: string, limit = 20): Promise<LoopOpportunityItem[]> {
  const params = new URLSearchParams();

  if (loopId) {
    params.set("loopId", loopId);
  }

  params.set("limit", String(limit));

  const response = await fetch(`/api/opportunities?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const data = (await response.json().catch(() => null)) as LoopOpportunitiesResponse | null;

  if (response.status === 401) {
    return [];
  }

  if (!response.ok || !data?.ok) {
    throw new Error(getOpportunityErrorMessage(response, data, "Failed to load loop opportunities."));
  }

  return data.opportunities ?? [];
}

export async function fetchOpportunityEventsRemote(jobId?: string, limit = 20): Promise<OpportunityEvent[]> {
  const params = new URLSearchParams();

  if (jobId) {
    params.set("jobId", jobId);
  }

  params.set("limit", String(limit));

  const response = await fetch(`/api/opportunities/events?${params.toString()}`, {
    method: "GET",
    credentials: "include"
  });

  const data = (await response.json().catch(() => null)) as OpportunityEventsResponse | null;

  if (response.status === 401) {
    return [];
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(getOpportunityErrorMessage(response, data, "Opportunity events API"));
  }

  return Array.isArray(data?.events) ? data.events : [];
}

export async function createOpportunityFollowUpRemote(job: Job, note?: string) {
  const response = await fetch("/api/opportunities/follow-up", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, note })
  });

  const data = (await response.json().catch(() => null)) as FollowUpResponse | null;

  if (!response.ok || data?.ok === false) {
    throw new Error(getOpportunityErrorMessage(response, data, "Follow-up API"));
  }

  return data?.event ?? { eventType: "follow_up_created", jobId: job.id };
}