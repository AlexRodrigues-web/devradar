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

type RemoteOkApiJob = {
  id?: number | string;
  slug?: string;
  position?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  tags?: string[];
  url?: string;
  apply_url?: string;
  date?: string;
  epoch?: number;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
};

function buildRemoteOkUrl(job: RemoteOkApiJob) {
  if (typeof job.url === "string" && job.url.trim()) {
    return job.url;
  }

  if (typeof job.slug === "string" && job.slug.trim()) {
    return `https://remoteok.com/remote-jobs/${job.slug}`;
  }

  if (job.id !== undefined && job.id !== null) {
    return `https://remoteok.com/remote-jobs/${job.id}`;
  }

  return "";
}

function formatRemoteOkSalary(job: RemoteOkApiJob) {
  if (typeof job.salary === "string" && job.salary.trim()) {
    return cleanText(job.salary);
  }

  if (typeof job.salary_min === "number" && typeof job.salary_max === "number") {
    return `$${job.salary_min} - $${job.salary_max}`;
  }

  if (typeof job.salary_min === "number") {
    return `$${job.salary_min}+`;
  }

  return "Não informado";
}

function getRemoteOkPostedAt(job: RemoteOkApiJob) {
  if (typeof job.date === "string") {
    return formatDate(job.date);
  }

  if (typeof job.epoch === "number") {
    return formatDate(new Date(job.epoch * 1000).toISOString());
  }

  return "Ver anúncio original";
}

export async function fetchRemoteOkJobs(query: JobConnectorQuery): Promise<JobConnectorResult> {
  const startedAt = Date.now();
  const tagQuery = query.keywords
    .slice(0, 3)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .join(",");

  const url = tagQuery
    ? `https://remoteok.com/api?tags=${encodeURIComponent(tagQuery)}`
    : "https://remoteok.com/api";

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "DevRadar/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Remote OK HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const apiJobs = Array.isArray(payload)
      ? payload.filter((item): item is RemoteOkApiJob => typeof item === "object" && item !== null && ("position" in item || "title" in item))
      : [];

    return {
      source: {
        name: "Remote OK",
        ok: true,
        status: "success",
        count: apiJobs.length,
        durationMs: Date.now() - startedAt
      },
      jobs: apiJobs.map(normalizeRemoteOkJob).filter(isValidJob)
    };
  } catch (error) {
    return {
      source: {
        name: "Remote OK",
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

export function normalizeRemoteOkJob(job: RemoteOkApiJob): Job {
  const title = cleanText(job.position ?? job.title ?? "Untitled opportunity");
  const company = cleanText(job.company ?? "Unknown company");
  const description = cleanHtml(job.description);
  const tags = normalizeTags(job.tags, [job.location]);
  const text = `${title} ${company} ${description} ${tags.join(" ")}`;
  const salaryLabel = formatRemoteOkSalary(job);

  return {
    id: `remoteok-${job.id ?? slugify(`${title}-${company}`)}`,
    title,
    company,
    source: "Remote OK",
    sourceUrl: buildRemoteOkUrl(job),
    location: cleanText(job.location ?? "Remote"),
    workMode: detectWorkMode(text, true),
    level: detectLevel(text),
    category: detectCategory(text),
    contractType: detectContract(text),
    language: detectLanguage(text),
    budgetMin: typeof job.salary_min === "number" ? job.salary_min : parseBudget(salaryLabel),
    budgetLabel: salaryLabel,
    postedAt: getRemoteOkPostedAt(job),
    deadline: "Ver anúncio original",
    tags,
    matchScore: 59,
    status: "new",
    summary: summarize(description),
    nextAction: "Abrir o anúncio original na Remote OK e validar requisitos antes de candidatar.",
    strengths: tags.slice(0, 4).length ? tags.slice(0, 4) : ["Remote", "Remote OK"],
    gaps: ["Confirmar requisitos completos no anúncio original"],
    risks: []
  };
}

export const RemoteOkConnector: JobConnector = {
  name: "Remote OK",
  enabled: true,
  fetchJobs: fetchRemoteOkJobs
};
