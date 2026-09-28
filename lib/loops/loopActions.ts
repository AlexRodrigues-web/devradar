import type {
  ContractType,
  ExperienceLevel,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "@/types/job";

export type LoopStatus = "draft" | "active" | "paused" | "archived";

export type LoopFrequency = "manual" | "1h" | "3h" | "6h" | "12h" | "daily";

export type LoopAutomationMode = "manual-review" | "assisted-apply" | "auto-apply";

export type LoopFilters = {
  keywords?: string;
  locationCountry?: string;
  location?: string;
  workMode?: WorkMode;
  level?: ExperienceLevel;
  category?: string;
  contractType?: ContractType;
  jobLanguage?: OpportunityLanguage;
  minBudget?: string | number;
  excludedTerms?: string;
  dateRange?: string;
  selectedSources?: JobSource[];
  sources?: JobSource[];
  [key: string]: unknown;
};

export type LoopItem = {
  id: string;
  userId: string;
  name: string;
  role: string;
  status: LoopStatus | string;
  frequency: LoopFrequency | string;
  automationMode: LoopAutomationMode | string;
  minScore: number;
  filters: LoopFilters;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LoopInput = {
  id?: string;
  name: string;
  role: string;
  status?: LoopStatus;
  frequency?: LoopFrequency;
  automationMode?: LoopAutomationMode;
  minScore?: number;
  filters?: LoopFilters;
  active?: boolean;
};

type LoopsApiResponse = {
  ok?: boolean;
  loop?: LoopItem;
  loops?: LoopItem[];
  deleted?: boolean;
  error?: string;
  message?: string;
};

async function readLoopsApiResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as LoopsApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message ?? data?.error ?? `Loops API HTTP ${response.status}`);
  }

  return data;
}

export async function fetchLoopsRemote() {
  const response = await fetch("/api/loops", {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const data = await readLoopsApiResponse(response);

  if (!Array.isArray(data.loops)) {
    throw new Error("Loops API response did not include loops.");
  }

  return data.loops;
}

export async function createLoopRemote(input: LoopInput) {
  const response = await fetch("/api/loops", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const data = await readLoopsApiResponse(response);

  if (!data.loop) {
    throw new Error("Loops API response did not include created loop.");
  }

  return data.loop;
}

export async function updateLoopRemote(id: string, input: Partial<LoopInput>) {
  const response = await fetch("/api/loops", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...input, id })
  });

  const data = await readLoopsApiResponse(response);

  if (!data.loop) {
    throw new Error("Loops API response did not include updated loop.");
  }

  return data.loop;
}

export async function deleteLoopRemote(id: string) {
  const response = await fetch(`/api/loops?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json"
    }
  });

  const data = await readLoopsApiResponse(response);

  return Boolean(data.deleted);
}
export type LoopRunItem = {
  id: string;
  loopId: string;
  userId: string;
  status: string;
  found: number;
  duplicates: number;
  rejected: number;
  approved: number;
  failedSources: unknown[];
  metadata: Record<string, unknown>;
  startedAt: string | null;
  finishedAt: string | null;
};

type LoopRunsResponse = {
  ok?: boolean;
  runs?: LoopRunItem[];
  error?: string;
  message?: string;
};

export async function fetchLoopRunsRemote(loopId?: string, limit = 10): Promise<LoopRunItem[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (loopId) {
    params.set("loopId", loopId);
  }

  const response = await fetch(`/api/loops/runs?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  const payload = (await response.json().catch(() => null)) as LoopRunsResponse | null;

  if (!response.ok || !payload?.ok || !Array.isArray(payload.runs)) {
    throw new Error(payload?.message ?? payload?.error ?? "Falha ao carregar histórico dos loops.");
  }

  return payload.runs;
}