import type {
  ContractType,
  ExperienceLevel,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "./job";
import type { CvId } from "./cv";
import type { UserId } from "./user";

export type LoopId = string;

export type LoopStatus = "draft" | "active" | "paused" | "archived";

export type LoopFrequency = "manual" | "1h" | "3h" | "6h" | "12h" | "daily";

export type LoopAutomationMode = "manual-review" | "assisted-apply" | "auto-apply";

export type LoopFilters = {
  keywords: string[];
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  category: string;
  contractType: ContractType;
  jobLanguage: OpportunityLanguage;
  minBudget?: number;
  excludedTerms: string[];
  sources: JobSource[];
};

export type JobSearchLoop = {
  id: LoopId;
  userId: UserId;
  cvId: CvId;
  name: string;
  status: LoopStatus;
  frequency: LoopFrequency;
  automationMode: LoopAutomationMode;
  filters: LoopFilters;
  minimumMatchScore: number;
  createdAt: string;
  updatedAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
};