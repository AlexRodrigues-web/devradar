import type { Job } from "@/types/job";

import type { JobConnector, JobConnectorQuery, JobConnectorResult } from "./types";
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
  parseBudget,
  slugify,
  summarize
} from "./sourceHelpers";

type AdzunaApiJob = {
  id?: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  company?: {
    display_name?: string;
  };
  location?: {
    display_name?: string;
  };
  category?: {
    label?: string;
    tag?: string;
  };
};

type AdzunaApiResponse = {
  results?: AdzunaApiJob[];
};

function getAdzunaCredentials() {
  return {
    appId: process.env.ADZUNA_APP_ID?.trim() ?? "",
    appKey: process.env.ADZUNA_APP_KEY?.trim() ?? "",
    country: process.env.ADZUNA_COUNTRY?.trim().toLowerCase() || "gb"
  };
}

function readQueryFilter(query: JobConnectorQuery, key: string) {
  const value = query.filters?.[key];
  return typeof value === "string" ? value.trim() : "";
}
function buildAdzunaUrl(query: JobConnectorQuery, country: string, appId: string, appKey: string) {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "30",
    "content-type": "application/json"
  });

  const what = query.keywords.map((keyword) => keyword.trim()).filter(Boolean).join(" ");

  if (what) {
    params.set("what", what);
  }
  const location = readQueryFilter(query, "location");

  if (location && location.toLowerCase() !== "any") {
    params.set("where", location);
  }

  return `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?${params.toString()}`;
}

function formatAdzunaBudget(job: AdzunaApiJob) {
  if (typeof job.salary_min === "number" && typeof job.salary_max === "number") {
    return `${Math.round(job.salary_min)} - ${Math.round(job.salary_max)}`;
  }

  if (typeof job.salary_min === "number") {
    return `A partir de ${Math.round(job.salary_min)}`;
  }

  if (typeof job.salary_max === "number") {
    return `Até ${Math.round(job.salary_max)}`;
  }

  return "Não informado";
}

function getAdzunaBudgetMin(job: AdzunaApiJob, text: string) {
  if (typeof job.salary_min === "number") {
    return Math.round(job.salary_min);
  }

  return parseBudget(text);
}

export async function fetchAdzunaJobs(query: JobConnectorQuery): Promise<JobConnectorResult> {
  const startedAt = Date.now();
  const credentials = getAdzunaCredentials();

  if (!credentials.appId || !credentials.appKey) {
    return {
      source: {
        name: "Adzuna",
        ok: false,
        status: "skipped",
        count: 0,
        durationMs: Date.now() - startedAt,
        error: "Credenciais ADZUNA_APP_ID/ADZUNA_APP_KEY ausentes."
      },
      jobs: []
    };
  }

  try {
    const response = await fetch(buildAdzunaUrl(query, credentials.country, credentials.appId, credentials.appKey), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "DevRadar/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Adzuna HTTP ${response.status}`);
    }

    const payload = (await response.json()) as AdzunaApiResponse;
    const apiJobs = Array.isArray(payload.results) ? payload.results : [];

    return {
      source: {
        name: "Adzuna",
        ok: true,
        status: "success",
        count: apiJobs.length,
        durationMs: Date.now() - startedAt
      },
      jobs: apiJobs.map(normalizeAdzunaJob).filter(isValidJob)
    };
  } catch (error) {
    return {
      source: {
        name: "Adzuna",
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

export function normalizeAdzunaJob(job: AdzunaApiJob): Job {
  const title = cleanText(job.title || "Oportunidade sem título");
  const company = cleanText(job.company?.display_name || "Empresa não informada");
  const location = cleanText(job.location?.display_name || "Localização não informada");
  const description = cleanHtml(job.description || "");
  const categoryLabel = cleanText(job.category?.label || job.category?.tag || "");
  const contractType = cleanText(job.contract_type || "");
  const sourceUrl = cleanText(job.redirect_url || "https://www.adzuna.com");
  const text = `${title} ${company} ${location} ${description} ${categoryLabel} ${contractType}`;
  const tags = normalizeTags([categoryLabel, contractType].filter((item): item is string => Boolean(item)), ["Adzuna"]);

  return {
    id: `adzuna-${slugify(job.id || sourceUrl || `${title}-${company}`)}`,
    title,
    company,
    source: "Adzuna",
    sourceUrl,
    location,
    workMode: detectWorkMode(text, false),
    level: detectLevel(text),
    category: categoryLabel || detectCategory(text),
    contractType: detectContract(text),
    language: detectLanguage(text),
    budgetMin: getAdzunaBudgetMin(job, text),
    budgetLabel: formatAdzunaBudget(job),
    postedAt: formatDate(job.created),
    deadline: "Ver anúncio original",
    tags,
    matchScore: 57,
    status: "new",
    summary: summarize(description || text),
    nextAction: "Abrir o anúncio original na Adzuna e validar requisitos antes de candidatar.",
    strengths: tags.slice(0, 4).length ? tags.slice(0, 4) : ["Adzuna"],
    gaps: ["Confirmar stack, localização permitida e requisitos completos no anúncio original"],
    risks: []
  };
}

export const AdzunaConnector: JobConnector = {
  name: "Adzuna",
  enabled: true,
  fetchJobs: fetchAdzunaJobs
};
