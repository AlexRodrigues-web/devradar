import type { Job } from "@/types/job";

import type { JobConnector, JobConnectorResult } from "./types";
import {
  cleanHtml,
  cleanText,
  detectCategory,
  detectContract,
  detectLanguage,
  detectLevel,
  detectWorkMode,
  formatDate,
  isValidJob,
  normalizeTags,
  slugify,
  summarize
} from "./sourceHelpers";

type ArbeitnowApiJob = {
  slug?: string;
  title?: string;
  company_name?: string;
  url?: string;
  location?: string;
  description?: string;
  remote?: boolean;
  tags?: string[];
  job_types?: Array<string | undefined>;
  created_at?: number | string;
};

type ArbeitnowApiResponse = {
  data?: ArbeitnowApiJob[];
};

export async function fetchArbeitnowJobs(): Promise<JobConnectorResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Arbeitnow HTTP ${response.status}`);
    }

    const payload = (await response.json()) as ArbeitnowApiResponse;
    const apiJobs = Array.isArray(payload.data) ? payload.data : [];

    return {
      source: {
        name: "Arbeitnow",
        ok: true,
        status: "success",
        count: apiJobs.length,
        durationMs: Date.now() - startedAt
      },
      jobs: apiJobs.map(normalizeArbeitnowJob).filter(isValidJob)
    };
  } catch (error) {
    return {
      source: {
        name: "Arbeitnow",
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

export function normalizeArbeitnowJob(job: ArbeitnowApiJob): Job {
  const title = cleanText(job.title ?? "Untitled opportunity");
  const company = cleanText(job.company_name ?? "Unknown company");
  const description = cleanHtml(job.description);
  const tags = normalizeTags(job.tags, job.job_types);
  const text = `${title} ${description} ${tags.join(" ")}`;

  return {
    id: `arbeitnow-${job.slug ?? slugify(`${title}-${company}`)}`,
    title,
    company,
    source: "Arbeitnow",
    sourceUrl: job.url ?? "",
    location: cleanText(job.location ?? (job.remote ? "Remote" : "Not specified")),
    workMode: detectWorkMode(text, Boolean(job.remote)),
    level: detectLevel(text),
    category: detectCategory(text),
    contractType: detectContract(`${tags.join(" ")} ${title}`),
    language: detectLanguage(text),
    budgetLabel: "Não informado",
    postedAt: formatDate(job.created_at === undefined ? undefined : String(job.created_at)),
    deadline: "Ver anúncio original",
    tags,
    matchScore: 58,
    status: "new",
    summary: summarize(description),
    nextAction: "Abrir o anúncio original e validar candidatura.",
    strengths: tags.slice(0, 4).length ? tags.slice(0, 4) : ["Job board"],
    gaps: ["Confirmar requisitos completos no anúncio original"],
    risks: []
  };
}

export const ArbeitnowConnector: JobConnector = {
  name: "Arbeitnow",
  enabled: true,
  fetchJobs: fetchArbeitnowJobs
};
