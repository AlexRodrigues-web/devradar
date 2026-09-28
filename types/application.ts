import type { Job, JobStatus } from "./job";
import type { LoopId } from "./loop";
import type { UserId } from "./user";

export type ApplicationId = string;

export type ApplicationChannel = "job-board" | "email" | "linkedin" | "manual" | "other";

export type ApplicationAutomationStatus =
  | "not-started"
  | "queued"
  | "needs-review"
  | "sent"
  | "failed"
  | "blocked";

export type ApplicationRecord = {
  id: ApplicationId;
  userId: UserId;
  loopId?: LoopId;
  jobId: Job["id"];
  job: Job;
  jobSnapshot?: Job;
  outreach?: OutreachMessage;
  status: JobStatus;
  channel: ApplicationChannel;
  automationStatus: ApplicationAutomationStatus;
  matchScore: number;
  notes?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type OutreachMessage = {
  id: string;
  applicationId: ApplicationId;
  subject: string;
  body: string;
  language: "pt" | "en" | "es";
  status: "draft" | "approved" | "sent";
  createdAt: string;
  sentAt?: string;
};
