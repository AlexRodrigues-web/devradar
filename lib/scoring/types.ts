import type { Job, ContractType, ExperienceLevel, OpportunityLanguage, WorkMode } from "@/types/job";

export type MatchBand = "excellent" | "good" | "maybe" | "rejected";

export type ScoreDecision = "apply" | "review" | "validate" | "auto-reject";

export type ScoreWeights = {
  requiredSkills: number;
  desiredSkills: number;
  seniority: number;
  location: number;
  language: number;
  contract: number;
  salary: number;
  remote: number;
  quality: number;
};

export type ScoreThresholds = {
  excellent: number;
  good: number;
  maybe: number;
  rejectBelow: number;
};

export type ScoreFilters = {
  keywords: string[];
  location: string;
  workMode: WorkMode | string;
  level: ExperienceLevel | string;
  category: string;
  contractType: ContractType | string;
  jobLanguage: OpportunityLanguage | string;
  minBudget: number;
  excludedTerms: string[];
};

export type ScoreProfile = {
  title?: string;
  seniority?: string | null;
  skills?: string[];
  languages?: string[];
  preferredRoles?: string[];
  workModes?: string[];
  salaryMin?: number | null;
  strengths?: string[];
  summary?: string;
};

export type ScoreLoopPreferences = {
  minScore?: number;
  weights?: Partial<ScoreWeights>;
  thresholds?: Partial<ScoreThresholds>;
  filters?: Partial<ScoreFilters> & Record<string, unknown>;
};

export type ScoreContext = {
  filters: ScoreFilters;
  profile?: ScoreProfile | null;
  loop?: ScoreLoopPreferences | null;
};

export type ScoreReason = {
  code: string;
  label: string;
  delta: number;
  kind: "positive" | "negative" | "neutral";
};

export type ScoreResult = {
  job: Job;
  score: number;
  band: MatchBand;
  decision: ScoreDecision;
  reasons: ScoreReason[];
  strengths: string[];
  gaps: string[];
  risks: string[];
  summary: string;
  nextAction: string;
  autoRejected: boolean;
};
