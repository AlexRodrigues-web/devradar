export type AppLanguage = "pt" | "en" | "es";

export type JobStatus =
  | "new"
  | "selected"
  | "applied"
  | "conversation"
  | "proposal"
  | "won"
  | "lost"
  | "ignored";

export type JobSource =
  | "Remotive"
  | "Remote OK"
  | "Adzuna"
  | "We Work Remotely"
  | "RSS"
  | "Manual";

export type WorkMode = "any" | "remote" | "hybrid" | "onsite";
export type ExperienceLevel = "any" | "junior" | "mid" | "senior";
export type ContractType = "any" | "freelance" | "contract" | "part-time" | "full-time";
export type OpportunityLanguage = "any" | "pt" | "en" | "es";

export type Job = {
  id: string;
  title: string;
  company: string;
  source: JobSource;
  sourceUrl: string;
  location: string;
  workMode: Exclude<WorkMode, "any">;
  level: Exclude<ExperienceLevel, "any">;
  category: string;
  contractType: Exclude<ContractType, "any">;
  language: Exclude<OpportunityLanguage, "any">;
  budgetMin?: number;
  budgetLabel: string;
  postedAt: string;
  deadline?: string;
  tags: string[];
  matchScore: number;
  status: JobStatus;
  summary: string;
  nextAction: string;
  strengths: string[];
  gaps: string[];
  risks?: string[];
};
