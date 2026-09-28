import type {
  ContractType,
  ExperienceLevel,
  Job,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "@/types/job";

type FetchRadarResultsInput = {
  keywords: string;
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  category: string;
  contractType: ContractType;
  jobLanguage: OpportunityLanguage;
  minBudget: string;
  excludedTerms: string;
  selectedSources: JobSource[];
  loopId?: string;
};

type RadarResults = {
  found: number;
  duplicates: number;
  rejected: number;
  approved: number;
  loopRunId: string | null;
  jobs: Job[];
};

export async function fetchRadarResults({
  keywords,
  location,
  workMode,
  level,
  category,
  contractType,
  jobLanguage,
  minBudget,
  excludedTerms,
  selectedSources,
  loopId
}: FetchRadarResultsInput): Promise<RadarResults> {
  const params = new URLSearchParams({
    keywords,
    location,
    workMode,
    level,
    category,
    contractType,
    jobLanguage,
    minBudget,
    excludedTerms,
    sources: selectedSources.join(",")
  });

  if (loopId && loopId !== "loop-local-default" && !loopId.startsWith("loop-local-")) {
    params.set("loopId", loopId);
  }

  const response = await fetch(`/api/jobs?${params.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`API jobs HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    found?: number;
    duplicates?: number;
    rejected?: number;
    approved?: number;
    loopRunId?: string | null;
    jobs?: Job[];
  };

  return {
    found: data.found ?? data.jobs?.length ?? 0,
    duplicates: data.duplicates ?? 0,
    rejected: data.rejected ?? 0,
    approved: data.approved ?? data.jobs?.length ?? 0,
    loopRunId: data.loopRunId ?? null,
    jobs: data.jobs ?? []
  };
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
