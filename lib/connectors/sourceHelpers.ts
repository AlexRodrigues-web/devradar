import type { Job } from "@/types/job";

export function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function cleanHtml(value?: string) {
  return cleanText((value ?? "").replace(/<[^>]*>/g, " "));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function summarize(value?: string) {
  const clean = cleanText(value ?? "");
  return clean ? clean.slice(0, 260) : "Descrição disponível no anúncio original.";
}

export function normalizeTags(primary?: string[], secondary?: Array<string | undefined>) {
  const tags = [...(primary ?? []), ...(secondary ?? [])]
    .map((tag) => cleanText(String(tag)))
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 8);
}

export function detectWorkMode(text: string, remoteFlag: boolean): Job["workMode"] {
  const value = text.toLowerCase();

  if (hasAny(value, ["hybrid", "híbrido"])) return "hybrid";
  if (remoteFlag || hasAny(value, ["remote", "remoto", "remota"])) return "remote";
  return "onsite";
}

export function detectLevel(text: string): Job["level"] {
  const value = text.toLowerCase();

  if (hasAny(value, ["senior", "lead", "staff", "principal", "head of", "8 years", "8+ years", "berufserfahren"])) {
    return "senior";
  }

  if (hasAny(value, ["mid", "middle", "pleno"])) {
    return "mid";
  }

  return "junior";
}

export function detectCategory(text: string) {
  const value = text.toLowerCase();

  if (value.includes("wordpress")) return "wordpress";
  if (value.includes("full stack") || value.includes("fullstack")) return "full stack";
  if (value.includes("backend") || value.includes("api") || value.includes("node") || value.includes("golang") || value.includes("go ")) return "backend";
  if (value.includes("design")) return "design";
  if (value.includes("marketing")) return "marketing";
  if (value.includes("copy")) return "copywriting";
  if (value.includes("support")) return "support";

  return "frontend";
}

export function detectContract(text: string): Job["contractType"] {
  const value = text.toLowerCase();

  if (hasAny(value, ["freelance", "freelancer"])) return "freelance";
  if (hasAny(value, ["contract", "contractor"])) return "contract";
  if (hasAny(value, ["part-time", "part time", "parttime"])) return "part-time";

  return "full-time";
}

export function detectLanguage(text: string): Job["language"] {
  const value = text.toLowerCase();

  if (hasAny(value, ["portuguese", "português", "portugues"])) return "pt";
  if (hasAny(value, ["spanish", "español", "espanhol"])) return "es";

  return "en";
}

export function parseBudget(value?: string) {
  if (!value) return undefined;

  const match = value.replace(/[,.]/g, "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

export function formatDate(value?: string) {
  if (!value) return "Data não informada";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-PT");
}

export function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function isValidJob(job: Job) {
  const blockedExampleHost = ["example", "com"].join(".");
  const invalidUrls = new Set([
    "https://remotive.com",
    "https://remotive.com/",
    "https://remoteok.com",
    "https://remoteok.com/",
    "https://www.adzuna.com",
    "https://www.adzuna.com/",
    "https://www.arbeitnow.com",
    "https://www.arbeitnow.com/"
  ]);

  return Boolean(
    job.title &&
    job.company &&
    job.sourceUrl &&
    !job.sourceUrl.includes(blockedExampleHost) &&
    !invalidUrls.has(job.sourceUrl)
  );
}
