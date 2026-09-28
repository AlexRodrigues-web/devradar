import type { OutreachTemplateType } from "@/lib/outreach";
import type { ApplicationRecord, OutreachMessage } from "@/types/application";
import type { AppLanguage, Job } from "@/types/job";

type ProposalResponse = {
  ok?: boolean;
  application?: ApplicationRecord;
  outreach?: OutreachMessage;
  error?: string;
  message?: string;
};

type ApplicationsResponse = {
  ok?: boolean;
  applications?: ApplicationRecord[];
  error?: string;
  message?: string;
};

export async function fetchApplicationsRemote() {
  const response = await fetch("/api/applications/proposals", {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const data = (await response.json().catch(() => null)) as ApplicationsResponse | null;

  if (!response.ok || !data?.ok || !Array.isArray(data.applications)) {
    throw new Error(data?.message ?? data?.error ?? `Applications API HTTP ${response.status}`);
  }

  return data.applications;
}

export async function createProposalApplicationRemote(
  job: Job,
  language: AppLanguage,
  templateType: OutreachTemplateType = "short_application"
) {
  const response = await fetch("/api/applications/proposals", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      job,
      language,
      templateType
    })
  });

  const data = (await response.json().catch(() => null)) as ProposalResponse | null;

  if (!response.ok || !data?.ok || !data.application || !data.outreach) {
    throw new Error(data?.message ?? data?.error ?? `Applications API HTTP ${response.status}`);
  }

  return {
    application: data.application,
    outreach: data.outreach
  };
}

type UpdateOutreachDraftInput = {
  outreachId: string;
  subject: string;
  body: string;
  action: "updated" | "copied";
};

type UpdateOutreachDraftResponse = {
  ok?: boolean;
  outreach?: OutreachMessage;
  eventType?: "outreach_draft_updated" | "outreach_copied";
  error?: string;
  message?: string;
};

export async function updateOutreachDraftRemote(input: UpdateOutreachDraftInput) {
  const response = await fetch("/api/applications/proposals", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const data = (await response.json().catch(() => null)) as UpdateOutreachDraftResponse | null;

  if (!response.ok || !data?.ok || !data.outreach) {
    throw new Error(data?.message ?? data?.error ?? `Applications API HTTP ${response.status}`);
  }

  return data.outreach;
}