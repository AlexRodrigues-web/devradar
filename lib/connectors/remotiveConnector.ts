import type { Job } from "@/types/job";

import type { JobConnector, JobConnectorQuery, JobConnectorResult } from "./types";
import {
  cleanHtml,
  cleanText,
  detectCategory,
  detectContract,
  detectLanguage,
  detectLevel,
  formatDate,
  isValidJob,
  normalizeTags,
  parseBudget,
  slugify,
  summarize
} from "./sourceHelpers";

type RemotiveApiJob = {
  id?: number | string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  url?: string;
  description?: string;
  tags?: string[];
  category?: string;
  job_type?: string;
  salary?: string;
  publication_date?: string;
};

type RemotiveApiResponse = {
  jobs?: RemotiveApiJob[];
};

export async function fetchRemotiveJobs(query: JobConnectorQuery): Promise<JobConnectorResult> {
  const startedAt = Date.now();
  const search = encodeURIComponent(query.keywords.slice(0, 5).join(" "));
  const url = search
    ? `https://remotive.com/api/remote-jobs?search=${search}`
    : "https://remotive.com/api/remote-jobs";

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Remotive HTTP ${response.status}`);
    }

    const payload = (await response.json()) as RemotiveApiResponse;
    const apiJobs = Array.isArray(payload.jobs) ? payload.jobs : [];

    return {
      source: {
        name: "Remotive",
        ok: true,
        status: "success",
        count: apiJobs.length,
        durationMs: Date.now() - startedAt
      },
      jobs: apiJobs.map(normalizeRemotiveJob).filter(isValidJob)
    };
  } catch (error) {
    return {
      source: {
        name: "Remotive",
        ok: false,
        status: "failed",
        count: 0,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      },
      jobs: []
    };
  }
}

export function normalizeRemotiveJob(job: RemotiveApiJob): Job {
  const title = cleanText(job.title ?? "Untitled opportunity");
  const company = cleanText(job.company_name ?? "Unknown company");
  const description = cleanHtml(job.description);
  const tags = normalizeTags(job.tags, [job.category, job.job_type]);
  const text = `${title} ${description} ${tags.join(" ")}`;

  return {
    id: `remotive-${job.id ?? slugify(`${title}-${company}`)}`,
    title,
    company,
    source: "Remotive",
    sourceUrl: job.url ?? "",
    location: cleanText(job.candidate_required_location ?? "Remote"),
    workMode: "remote",
    level: detectLevel(text),
    category: detectCategory(text),
    contractType: detectContract(`${job.job_type ?? ""} ${title}`),
    language: detectLanguage(text),
    budgetMin: parseBudget(job.salary),
    budgetLabel: cleanText(job.salary ?? "Não informado"),
    postedAt: formatDate(job.publication_date),
    deadline: "Ver anúncio original",
    tags,
    matchScore: 60,
    status: "new",
    summary: summarize(description),
    nextAction: "Abrir o anúncio original e validar requisitos antes de candidatar.",
    strengths: tags.slice(0, 4).length ? tags.slice(0, 4) : ["Remote", "Opportunity"],
    gaps: ["Confirmar requisitos completos no anúncio original"],
    risks: []
  };
}

export const RemotiveConnector: JobConnector = {
  name: "Remotive",
  enabled: true,
  fetchJobs: fetchRemotiveJobs
};
