import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import type { ResultSetHeader } from "mysql2";
import { getMysqlPool, isMysqlConfigured } from "@/lib/server/mysql";
import type { Job } from "@/types/job";
import { defaultConnectors } from "@/lib/connectors";
import type { JobConnectorQuery, SourceLog } from "@/lib/connectors";
import { scoreJob } from "@/lib/scoring";
import type { ScoreContext, ScoreLoopPreferences, ScoreProfile } from "@/lib/scoring";
import { getLoop, getUserProfile } from "@/lib/server/repositories/domainRepository";

type Filters = {
  keywords: string[];
  location: string;
  workMode: string;
  level: string;
  category: string;
  contractType: string;
  jobLanguage: string;
  minBudget: number;
  excludedTerms: string[];
};

type SourceResult = SourceLog;

type ScoreEngineInput = {
  job: Job;
  filters: Filters;
  profile: ScoreProfile | null;
  loop: ScoreLoopPreferences | null;
  minScore: number;
};

type ResolvedScoreRequestContext = {
  userId: string | null;
  profile: ScoreProfile | null;
  loop: ScoreLoopPreferences | null;
  minScore: number;
  response?: NextResponse;
};

function normalizeLoopId(value: string | null) {
  if (!value) return null;

  if (value === "loop-local-default" || value.startsWith("loop-local-")) {
    return null;
  }

  return value;
}
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLoopId = searchParams.get("loopId");
  const loopId = normalizeLoopId(rawLoopId);

  const keywords = splitKeywords(searchParams.get("keywords") ?? "");
  const selectedSources = new Set(
    (searchParams.get("sources") ?? "Remotive,Arbeitnow")
      .split(",")
      .map((source) => source.trim())
      .filter(Boolean)
  );

  const filters: Filters = {
    keywords,
    location: searchParams.get("location") ?? "",
    workMode: searchParams.get("workMode") ?? "any",
    level: searchParams.get("level") ?? "any",
    category: searchParams.get("category") ?? "",
    contractType: searchParams.get("contractType") ?? "any",
    jobLanguage: searchParams.get("jobLanguage") ?? "any",
    minBudget: Number(searchParams.get("minBudget") ?? "0"),
    excludedTerms: splitKeywords(searchParams.get("excludedTerms") ?? "")
  };
  const selectedSourceNames = Array.from(selectedSources);
  const connectorQuery: JobConnectorQuery = {
    keywords,
    selectedSources: selectedSourceNames,
    loopId,
    filters: filters as unknown as Record<string, unknown>
  };

  const scoreRequestContext = await resolveScoreRequestContext(request, loopId);

  if (scoreRequestContext.response) {
    return scoreRequestContext.response;
  }

  const connectorTasks = defaultConnectors
    .filter((connector) => [connector.name, ...(connector.selectionNames ?? [])].some((sourceName) => selectedSources.has(sourceName)))
    .map((connector) => ({
      connector,
      promise: connector.fetchJobs(connectorQuery)
    }));

  const connectorResults = await Promise.allSettled(connectorTasks.map((task) => task.promise));
  const jobs: Job[] = [];
  const sources: SourceResult[] = [];

  connectorResults.forEach((result, index) => {
    const task = connectorTasks[index];

    if (result.status === "fulfilled") {
      jobs.push(...result.value.jobs);
      sources.push(result.value.source);
      return;
    }

    sources.push({
      name: task?.connector.name ?? "Unknown",
      ok: false,
      status: "failed",
      count: 0,
      durationMs: 0,
      error: result.reason instanceof Error ? result.reason.message : "Erro desconhecido"
    });
  });

  const found = jobs.length;
  const deduped = dedupeJobs(jobs);
  const hardFiltered = deduped.filter((job) => passesHardFilters(job, filters));

  const scored = hardFiltered
    .map((job) => applyScoreEngineWithFallback({ job, filters, profile: scoreRequestContext.profile, loop: scoreRequestContext.loop, minScore: scoreRequestContext.minScore }))
    .filter((job) => job.matchScore >= scoreRequestContext.minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 40);

  const currentUserId = scoreRequestContext.userId;

  const jobsWithPersistedStatus = await mergePersistedStatuses(scored, currentUserId);
  const duplicates = found - deduped.length;
  const rejected = deduped.length - hardFiltered.length;
  const approved = jobsWithPersistedStatus.length;

  const loopRunId = loopId
    ? await persistRadarRun({
        loopId,
  userId: currentUserId,
        filters,
        selectedSources: Array.from(selectedSources),
        found,
        duplicates,
        rejected,
        approved,
        sources,
        jobs: jobsWithPersistedStatus
      })
    : null;

  return NextResponse.json({
    found,
    duplicates,
    rejected,
    approved,
    sources,
    loopRunId,
    jobs: jobsWithPersistedStatus
  });
}

type PersistRadarRunInput = {
  loopId: string;
  userId: string | null;
  filters: Filters;
  selectedSources: string[];
  found: number;
  duplicates: number;
  rejected: number;
  approved: number;
  sources: SourceResult[];
  jobs: Job[];
};

function getSourceId(source: Job["source"]) {
  if (source === "Remotive") {
    return "source-remotive";
  }

  if (source === "Arbeitnow") {
    return "source-arbeitnow";
  }

  if (source === "Remote OK") {
    return "source-remote-ok";
  }

  if (source === "We Work Remotely") {
    return "source-we-work-remotely";
  }

  if (source === "Adzuna") {
    return "source-adzuna";
  }

  if (source === "Manual") {
    return "source-manual";
  }

  return null;
}

async function persistRadarRun({
  loopId,
  userId,
  filters,
  selectedSources,
  found,
  duplicates,
  rejected,
  approved,
  sources,
  jobs
}: PersistRadarRunInput) {
  if (!isMysqlConfigured()) {
    throw new Error("Database is not configured for loop run persistence.");
  }

  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  const loopRunId = crypto.randomUUID();
  const failedSources = sources
    .filter((source) => !source.ok)
    .map((source) => ({ name: source.name, error: source.error ?? "unknown_error" }));

  const metadata = JSON.stringify({
    persistedBy: "phase2f-radar-run-persistence",
    selectedSources,
    filters,
    sources
  });

  try {
    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      "INSERT INTO loop_runs (id, loop_id, user_id, status, found, duplicates, rejected, approved, failed_sources, started_at, finished_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)",
      [loopRunId, loopId, userId, "success", found, duplicates, rejected, approved, JSON.stringify(failedSources), metadata]
    );

    for (const job of jobs) {
      await connection.execute<ResultSetHeader>(
        "INSERT INTO opportunities (id, user_id, loop_id, loop_run_id, source_id, source, source_url, title, company, location, match_score, status, job_snapshot, first_seen_at, last_seen_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), loop_id = VALUES(loop_id), loop_run_id = VALUES(loop_run_id), source_id = VALUES(source_id), source = VALUES(source), source_url = VALUES(source_url), title = VALUES(title), company = VALUES(company), location = VALUES(location), match_score = VALUES(match_score), status = VALUES(status), job_snapshot = VALUES(job_snapshot), last_seen_at = NOW(), updated_at = NOW()",
        [
          job.id,
          userId,
          loopId,
  loopRunId,
          getSourceId(job.source),
          job.source,
          job.sourceUrl,
          job.title,
          job.company,
          job.location,
          job.matchScore,
          job.status,
          JSON.stringify(job)
        ]
      );
    }

    await connection.execute<ResultSetHeader>("UPDATE loops SET last_run_at = NOW(), updated_at = NOW() WHERE id = ? AND user_id = ?", [loopId, userId]);

    await connection.commit();
    return loopRunId;
  } catch (error) {
    await connection.rollback();
    console.error("Failed to persist radar run:", error);
    throw error;
  } finally {
    connection.release();
  }
}
async function mergePersistedStatuses(jobs: Job[], userId: string | null) {
  if (!jobs.length || !isMysqlConfigured()) {
    return jobs;
  }

  try {
    const pool = getMysqlPool();
    const jobIds = jobs.map((job) => job.id);
    const placeholders = jobIds.map(() => "?").join(", ");

    const [rows] = await pool.execute(
        `SELECT job_id, status FROM opportunity_statuses WHERE user_id = ? AND job_id IN (${placeholders})`,
        [userId, ...jobIds]
      );

    if (!Array.isArray(rows) || rows.length === 0) {
      return jobs;
    }

    const statusByJobId = new Map<string, Job["status"]>();

    for (const row of rows) {
      if (isPersistedStatusRow(row)) {
        statusByJobId.set(row.job_id, row.status);
      }
    }

    if (!statusByJobId.size) {
      return jobs;
    }

    return jobs.map((job) => ({
      ...job,
      status: statusByJobId.get(job.id) ?? job.status
    }));
  } catch (error) {
    console.error("Failed to merge persisted opportunity statuses:", error);
    return jobs;
  }
}

function isPersistedStatusRow(value: unknown): value is { job_id: string; status: Job["status"] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as { job_id?: unknown; status?: unknown };

  return typeof row.job_id === "string" && isJobStatus(row.status);
}

function isJobStatus(value: unknown): value is Job["status"] {
  return (
    value === "new" ||
    value === "selected" ||
    value === "applied" ||
    value === "conversation" ||
    value === "proposal" ||
    value === "won" ||
    value === "lost" ||
    value === "ignored"
  );
}
function normalizeMinScore(value: unknown) {
  const score = Number(value);

  if (!Number.isFinite(score)) return 60;

  return Math.min(99, Math.max(0, Math.round(score)));
}

function readStringArrayFromUnknown(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function mapScoreProfile(devProfile: unknown): ScoreProfile | null {
  if (!devProfile || typeof devProfile !== "object") return null;

  const record = devProfile as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title : undefined;
  const seniority = typeof record.seniority === "string" ? record.seniority : null;
  const skills = readStringArrayFromUnknown(record.skills);
  const languages = readStringArrayFromUnknown(record.languages);
  const workModes = readStringArrayFromUnknown(record.workModes);
  const salaryMin = Number(record.salaryMin);

  if (!title && !seniority && skills.length === 0 && languages.length === 0) return null;

  return {
    title,
    seniority,
    skills,
    languages,
    preferredRoles: title ? [title] : [],
    workModes,
    salaryMin: Number.isFinite(salaryMin) ? salaryMin : null
  };
}

async function resolveScoreRequestContext(request: NextRequest, loopId: string | null): Promise<ResolvedScoreRequestContext> {
  if (!loopId) {
    return {
      userId: null,
      profile: null,
      loop: {
        minScore: 60
      },
      minScore: 60
    };
  }

  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return {
      userId: null,
      profile: null,
      loop: null,
      minScore: 60,
      response: unauthorizedJson()
    };
  }

  const loop = await getLoop(user.id, loopId);

  if (!loop) {
    return {
      userId: user.id,
      profile: null,
      loop: null,
      minScore: 60,
      response: NextResponse.json({ ok: false, error: "loop_not_found", message: "Loop not found." }, { status: 404 })
    };
  }

  const minScore = normalizeMinScore(loop.minScore);
  const userProfile = await getUserProfile(user.id).catch((error) => {
    console.error("Failed to load profile for ScoreEngine:", error);
    return null;
  });

  const profile = mapScoreProfile(userProfile?.devProfile ?? null);
  const loopPreferences: ScoreLoopPreferences = {
    minScore,
    filters: (loop.filters ?? {}) as ScoreLoopPreferences["filters"],
    thresholds: {
      maybe: minScore,
      rejectBelow: Math.max(0, minScore - 10)
    }
  };

  return {
    userId: user.id,
    profile,
    loop: loopPreferences,
    minScore
  };
}

function applyScoreEngineWithFallback({ job, filters, profile, loop, minScore }: ScoreEngineInput) {
  try {
    const context: ScoreContext = {
      filters,
      profile,
      loop: loop ?? {
        minScore,
        thresholds: {
          maybe: minScore,
          rejectBelow: Math.max(0, minScore - 10)
        }
      }
    };

    return scoreJob(job, context).job;
  } catch (error) {
    console.error("ScoreEngine failed, using legacy score fallback:", error);

    return {
      ...job,
      matchScore: calculateScore(job, filters)
    };
  }
}

function passesHardFilters(job: Job, filters: Filters) {
  const corpus = getCorpus(job);

  const wantsJunior =
    filters.level === "junior" ||
    keywordIncludes(filters.keywords, ["junior", "entry level", "trainee", "intern", "estagio", "estágio"]);

  const wantsRemote =
    filters.workMode === "remote" ||
    keywordIncludes(filters.keywords, ["remote", "remoto", "remota"]);

  const wantsFreelance =
    filters.contractType === "freelance" ||
    keywordIncludes(filters.keywords, ["freelance", "freelancer"]);

  const wantsPartTime =
    filters.contractType === "part-time" ||
    keywordIncludes(filters.keywords, ["part-time", "part time", "parttime"]);

  const wantsGerman =
    keywordIncludes(filters.keywords, ["german", "deutsch", "alemao", "alemão"]);

  const seniorSignals = [
    "senior",
    "staff ",
    "principal",
    "lead ",
    "head of",
    "manager",
    "architect",
    "8 years",
    "8+ years",
    "7 years",
    "7+ years",
    "6 years",
    "6+ years",
    "minimum 6",
    "minimum 7",
    "minimum 8",
    "berufserfahren"
  ];

  if (filters.excludedTerms.length > 0 && filters.excludedTerms.some((term) => corpus.includes(term))) {
    return false;
  }

  if ((filters.level === "junior" || filters.level === "mid") && hasAny(corpus, seniorSignals)) {
    return false;
  }

  if (wantsJunior && hasAny(corpus, [
    "senior",
    "staff ",
    "principal",
    "lead ",
    "head of",
    "manager",
    "8 years",
    "8+ years",
    "minimum 8",
    "berufserfahren"
  ])) {
    return false;
  }

  if (wantsRemote && !isRemoteFirst(job, corpus)) {
    return false;
  }

  if (!matchesLocationIntent(job, filters.location)) {
    return false;
  }

  if (wantsFreelance && !hasAny(corpus, [
    "freelance",
    "freelancer",
    "contractor",
    "contract",
    "project-based",
    "project based"
  ])) {
    return false;
  }

  if (wantsPartTime && !hasAny(corpus, ["part-time", "part time", "parttime"])) {
    return false;
  }

  if (!wantsGerman && hasAny(corpus, [
    "german c1",
    "german b2",
    "deutsch c1",
    "deutsch b2",
    "fluent german",
    "proficient in german",
    "proficient in german and english",
    "german and english",
    "language requirements german",
    "alemão c1",
    "alemão b2"
  ])) {
    return false;
  }

  if (filters.workMode !== "any" && job.workMode !== filters.workMode) {
    return false;
  }

  if (filters.level !== "any" && job.level !== filters.level) {
    return false;
  }

  if (filters.contractType !== "any" && job.contractType !== filters.contractType) {
    return false;
  }

  if (filters.jobLanguage !== "any" && job.language !== filters.jobLanguage) {
    return false;
  }

  if (filters.category && filters.category !== "any") {
    const expected = filters.category.toLowerCase();

    if (job.category !== expected && !corpus.includes(expected)) {
      return false;
    }
  }

  if (filters.minBudget && job.budgetMin && job.budgetMin < filters.minBudget) {
    return false;
  }

  const importantKeywords = filters.keywords.filter((keyword) => !isGenericKeyword(keyword));

  if (importantKeywords.length > 0 && !importantKeywords.some((keyword) => corpus.includes(keyword))) {
    return false;
  }

  return true;
}

function calculateScore(job: Job, filters: Filters) {
  let score = job.matchScore;
  const corpus = getCorpus(job);

  for (const keyword of filters.keywords) {
    if (corpus.includes(keyword)) {
      score += isGenericKeyword(keyword) ? 2 : 8;
    }
  }

  const locationAliases = getLocationAliases(filters.location);
  if (locationAliases.some((alias) => corpus.includes(alias))) {
    score += 4;
  }

  if (filters.workMode !== "any" && job.workMode === filters.workMode) {
    score += 10;
  }

  if (filters.level !== "any" && job.level === filters.level) {
    score += 8;
  }

  if (filters.category && job.category === filters.category) {
    score += 8;
  }

  if (filters.contractType !== "any" && job.contractType === filters.contractType) {
    score += 8;
  }

  if (hasAny(corpus, ["possible scam", "unpaid", "commission only"])) {
    score -= 25;
  }

  return Math.max(35, Math.min(99, Math.round(score)));
}

function getLocationAliases(location: string) {
  const requested = location.trim().toLowerCase();

  const aliases: Record<string, string[]> = {
    any: [],

    "remote-worldwide": ["remote", "worldwide", "anywhere", "global"],
    "remote-europe": ["remote", "europe", "europe only", "european", "eu", "worldwide", "anywhere"],

    "pt-remote-europe": ["remote", "europe", "europe only", "portugal", "worldwide", "anywhere"],
    pt: ["portugal", "remote", "europe", "europe only", "worldwide", "anywhere"],
    "pt-norte": ["porto", "braga", "guimaraes", "guimarães", "viana do castelo", "vila real", "braganca", "bragança", "north portugal", "norte", "portugal", "remote", "europe"],
    "pt-porto": ["porto", "vila nova de gaia", "gaia", "matosinhos", "maia", "grande porto", "portugal", "remote", "europe"],
    "pt-lisboa": ["lisboa", "lisbon", "oeiras", "cascais", "sintra", "amadora", "portugal", "remote", "europe"],
    "pt-centro": ["coimbra", "aveiro", "leiria", "viseu", "castelo branco", "centro", "central portugal", "portugal", "remote", "europe"],
    "pt-alentejo": ["alentejo", "evora", "évora", "beja", "portalegre", "portugal", "remote", "europe"],
    "pt-algarve": ["algarve", "faro", "portimao", "portimão", "lagos", "albufeira", "portugal", "remote", "europe"],
    "pt-madeira": ["madeira", "funchal", "portugal", "remote", "europe"],
    "pt-acores": ["acores", "açores", "azores", "ponta delgada", "terceira", "portugal", "remote", "europe"],

    es: ["spain", "españa", "espana", "espanha", "remote", "europe", "worldwide", "anywhere"],
    "es-madrid": ["madrid", "spain", "españa", "espana", "remote", "europe"],
    "es-catalunha": ["barcelona", "catalonia", "catalunya", "catalunha", "spain", "españa", "espana", "remote", "europe"],
    "es-valencia": ["valencia", "valência", "comunidad valenciana", "spain", "españa", "espana", "remote", "europe"],
    "es-andaluzia": ["andalucia", "andalucía", "andaluzia", "sevilla", "sevilha", "malaga", "málaga", "granada", "cordoba", "córdoba", "spain", "remote", "europe"],
    "es-galiza": ["galicia", "galiza", "vigo", "a coruña", "coruna", "santiago", "spain", "remote", "europe"],
    "es-pais-basco": ["basque", "pais vasco", "país vasco", "pais basco", "bilbao", "san sebastian", "vitoria", "euskadi", "spain", "remote", "europe"],

    eu: ["europe", "europe only", "european", "eu", "remote", "worldwide", "anywhere"],
    "eu-west": ["western europe", "europe", "portugal", "spain", "france", "germany", "netherlands", "belgium", "remote"],
    "uk-ireland": ["united kingdom", "uk", "ireland", "london", "dublin", "remote", "europe"],
    dach: ["germany", "deutschland", "austria", "switzerland", "schweiz", "suisse", "dach", "remote", "europe"]
  };

  if (aliases[requested]) return aliases[requested];

  return requested
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesLocationIntent(job: Job, location: string) {
  const requested = location.trim().toLowerCase();

  if (!requested || requested === "any") {
    return true;
  }

  const jobLocation = job.location.toLowerCase();
  const aliases = getLocationAliases(requested);

  if (aliases.length === 0) {
    return true;
  }

  return aliases.some((alias) => jobLocation.includes(alias));
}
function isRemoteFirst(job: Job, corpus: string) {
  if (job.source === "Remotive" && !hasAny(corpus, ["hybrid", "office days", "remote days", "fixed quota"])) {
    return true;
  }

  if (hasAny(corpus, [
    "fully remote",
    "100% remote",
    "remote worldwide",
    "remote europe",
    "work from anywhere",
    "anywhere",
    "remote-first",
    "remote first"
  ])) {
    return true;
  }

  if (hasAny(corpus, [
    "hybrid",
    "remote days",
    "office days",
    "fixed quota",
    "hamburg",
    "berlin",
    "munich",
    "münchen",
    "germany",
    "deutschland",
    "on-site",
    "onsite"
  ])) {
    return false;
  }

  return job.workMode === "remote" && hasAny(corpus, ["remote", "remoto", "remota"]);
}

function dedupeJobs(jobs: Job[]) {
  const map = new Map<string, Job>();

  for (const job of jobs) {
    const key = `${job.title}-${job.company}`.toLowerCase();
    const existing = map.get(key);

    if (!existing || job.matchScore > existing.matchScore) {
      map.set(key, job);
    }
  }

  return Array.from(map.values());
}
function splitKeywords(value: string) {
  return value
    .split(",")
    .map((item) => normalizeKeyword(item))
    .filter(Boolean);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGenericKeyword(keyword: string) {
  return [
    "remote",
    "remoto",
    "remota",
    "junior",
    "developer",
    "engineer",
    "software",
    "frontend",
    "front-end",
    "backend",
    "back-end",
    "full stack",
    "fullstack",
    "freelance",
    "freelancer",
    "part-time",
    "part time",
    "full-time",
    "full time",
    "english",
    "portuguese",
    "spanish",
    "europe",
    "europa",
    "portugal"
  ].includes(keyword);
}

function keywordIncludes(keywords: string[], terms: string[]) {
  return keywords.some((keyword) => terms.includes(keyword));
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function getCorpus(job: Job) {
  return [
    job.title,
    job.company,
    job.location,
    job.category,
    job.contractType,
    job.language,
    job.budgetLabel,
    job.summary,
    job.nextAction,
    ...job.tags,
    ...job.strengths,
    ...job.gaps,
    ...(job.risks ?? [])
  ]
    .join(" ")
    .toLowerCase();
}
