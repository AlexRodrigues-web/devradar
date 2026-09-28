export type RealMetrics = {
  opportunities: {
    total: number;
    selected: number;
    applied: number;
    conversation: number;
    proposal: number;
    won: number;
    lost: number;
    ignored: number;
  };
  applications: {
    total: number;
    proposals: number;
    needsReview: number;
    responseRate: number;
  };
  outreach: {
    drafts: number;
    approved: number;
    sent: number;
  };
  events: {
    total: number;
    statusChanged: number;
    proposalCreated: number;
    followUpCreated: number;
  };
  loops: {
    runs: number;
    found: number;
    duplicates: number;
    rejected: number;
    approved: number;
  };
};

type MetricsResponse = {
  ok?: boolean;
  metrics?: RealMetrics;
  error?: string;
  message?: string;
};

export async function fetchRealMetricsRemote(): Promise<RealMetrics> {
  const response = await fetch("/api/metrics", {
    credentials: "include",
    headers: { Accept: "application/json" }
  });

  const data = (await response.json().catch(() => null)) as MetricsResponse | null;

  if (!response.ok || data?.ok === false || !data?.metrics) {
    throw new Error(data?.message ?? data?.error ?? `Metrics API HTTP ${response.status}`);
  }

  return data.metrics;
}
