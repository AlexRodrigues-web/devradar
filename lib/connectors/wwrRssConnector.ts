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

type WwrRssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  category?: string;
  guid?: string;
};

const WWR_PROGRAMMING_RSS_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss";

function stripCdata(value: string) {
  return value.trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeXmlEntities(value: string) {
  return stripCdata(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function getTagValue(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseWwrRss(xml: string): WwrRssItem[] {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const itemXml = match[1];

      return {
        title: cleanText(getTagValue(itemXml, "title")),
        link: cleanText(getTagValue(itemXml, "link")),
        description: cleanHtml(getTagValue(itemXml, "description")),
        pubDate: cleanText(getTagValue(itemXml, "pubDate")),
        category: cleanText(getTagValue(itemXml, "category")),
        guid: cleanText(getTagValue(itemXml, "guid"))
      };
    })
    .filter((item) => item.title && item.link);
}

function splitWwrTitle(rawTitle: string) {
  const title = cleanText(rawTitle);

  if (title.includes(":")) {
    const [company, ...rest] = title.split(":");
    return {
      company: cleanText(company) || "We Work Remotely",
      title: cleanText(rest.join(":")) || title
    };
  }

  const atIndex = title.toLowerCase().lastIndexOf(" at ");

  if (atIndex > 0) {
    return {
      title: cleanText(title.slice(0, atIndex)),
      company: cleanText(title.slice(atIndex + 4)) || "We Work Remotely"
    };
  }

  return {
    title,
    company: "We Work Remotely"
  };
}

function matchesKeywords(job: Job, keywords: string[]) {
  const normalizedKeywords = keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);

  if (!normalizedKeywords.length) {
    return true;
  }

  const corpus = [
    job.title,
    job.company,
    job.location,
    job.category,
    job.contractType,
    job.language,
    job.summary,
    job.tags.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return normalizedKeywords.some((keyword) => corpus.includes(keyword));
}

export async function fetchWwrRssJobs(query: JobConnectorQuery): Promise<JobConnectorResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch(WWR_PROGRAMMING_RSS_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "DevRadar/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`WWR RSS HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = parseWwrRss(xml);
    const jobs = items.map(normalizeWwrRssJob).filter(isValidJob).filter((job) => matchesKeywords(job, query.keywords));

    return {
      source: {
        name: "WWR RSS",
        ok: true,
        status: "success",
        count: items.length,
        durationMs: Date.now() - startedAt
      },
      jobs
    };
  } catch (error) {
    return {
      source: {
        name: "WWR RSS",
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

export function normalizeWwrRssJob(item: WwrRssItem): Job {
  const parsedTitle = splitWwrTitle(item.title);
  const text = `${parsedTitle.title} ${parsedTitle.company} ${item.description} ${item.category ?? ""}`;
  const categoryTags = item.category ? [item.category] : [];
  const tags = normalizeTags(categoryTags, ["We Work Remotely", "Remote"]);

  return {
    id: `wwr-${slugify(item.guid || item.link || `${parsedTitle.title}-${parsedTitle.company}`)}`,
    title: parsedTitle.title,
    company: parsedTitle.company,
    source: "We Work Remotely",
    sourceUrl: item.link,
    location: "Remote",
    workMode: detectWorkMode(text, true),
    level: detectLevel(text),
    category: detectCategory(text),
    contractType: detectContract(text),
    language: detectLanguage(text),
    budgetMin: parseBudget(text),
    budgetLabel: "Não informado",
    postedAt: item.pubDate ? formatDate(item.pubDate) : "Ver anúncio original",
    deadline: "Ver anúncio original",
    tags,
    matchScore: 58,
    status: "new",
    summary: summarize(item.description || text),
    nextAction: "Abrir o anúncio original na We Work Remotely e validar requisitos antes de candidatar.",
    strengths: tags.slice(0, 4).length ? tags.slice(0, 4) : ["Remote", "We Work Remotely"],
    gaps: ["Confirmar stack, localização permitida e requisitos completos no anúncio original"],
    risks: []
  };
}

export const WwrRssConnector: JobConnector = {
  name: "WWR RSS",
  enabled: true,
  selectionNames: ["We Work Remotely", "RSS"],
  fetchJobs: fetchWwrRssJobs
};
