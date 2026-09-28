import type { AppLanguage } from "./i18n";
import type { UserId } from "./user";

export type CvId = string;

export type CvFileType = "pdf" | "docx" | "txt" | "manual";

export type CvStatus = "draft" | "active" | "archived";

export type CvSkill = {
  name: string;
  level?: "beginner" | "intermediate" | "advanced";
  years?: number;
};

export type CvExperience = {
  title: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description: string;
  skills: string[];
};

export type CvProfile = {
  id: CvId;
  userId: UserId;
  title: string;
  language: AppLanguage;
  status: CvStatus;
  fileType: CvFileType;
  fileName?: string;
  summary: string;
  headline?: string;
  skills: CvSkill[];
  experience: CvExperience[];
  preferredRoles: string[];
  createdAt: string;
  updatedAt?: string;
};