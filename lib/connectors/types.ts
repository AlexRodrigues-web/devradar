import type { Job } from "@/types/job";

export type ConnectorName =
  | "Remotive"
  | "Arbeitnow"
  | "Remote OK"
  | "WWR RSS"
  | "Adzuna"
  | "Manual";

export type ConnectorStatus = "success" | "failed" | "skipped";

export type JobConnectorQuery = {
  keywords: string[];
  selectedSources: string[];
  loopId?: string | null;
  filters?: Record<string, unknown>;
};

export type SourceLog = {
  name: ConnectorName | string;
  ok: boolean;
  status: ConnectorStatus;
  count: number;
  durationMs: number;
  error?: string;
};

export type JobConnectorResult = {
  source: SourceLog;
  jobs: Job[];
};

export type JobConnector = {
  name: ConnectorName;
  enabled: boolean;
  selectionNames?: string[];
  fetchJobs: (query: JobConnectorQuery) => Promise<JobConnectorResult>;
};
