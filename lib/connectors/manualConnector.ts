import type { JobConnector, JobConnectorResult } from "./types";

export async function fetchManualJobs(): Promise<JobConnectorResult> {
  const startedAt = Date.now();

  return {
    source: {
      name: "Manual",
      ok: false,
      status: "skipped",
      count: 0,
      durationMs: Date.now() - startedAt,
      error: "ManualConnector ainda não tem fluxo de input manual ligado."
    },
    jobs: []
  };
}

export const ManualConnector: JobConnector = {
  name: "Manual",
  enabled: true,
  fetchJobs: fetchManualJobs
};
