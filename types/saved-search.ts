import type {
  ContractType,
  ExperienceLevel,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "./job";

export type SavedSearchStatus = "draft" | "active" | "paused" | "archived";

export type SavedSearchFrequency = "manual" | "1h" | "3h" | "6h" | "12h" | "daily";

export type SavedSearchFilters = {
  keywords: string;
  locationCountry: string;
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  category: string;
  contractType: ContractType;
  jobLanguage: OpportunityLanguage;
  minBudget: string;
  excludedTerms: string;
  dateRange: string;
  selectedSources: JobSource[];
};

export type SavedSearchItem = {
  id: string;
  title: string;
  filters: SavedSearchFilters;
  frequency: SavedSearchFrequency;
  status: SavedSearchStatus;
  createdAt: string;
  updatedAt: string;
};

export type SavedSearchInput = {
  id?: string;
  title: string;
  filters: SavedSearchFilters;
  frequency: SavedSearchFrequency;
  status: SavedSearchStatus;
};
