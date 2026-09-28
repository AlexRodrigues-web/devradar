export type RunnerTexts = Record<string, string>;

export type RunStatsSnapshot = {
  found: number;
  duplicates: number;
  approved: number;
  consulted: number;
  lastRun: string;
};