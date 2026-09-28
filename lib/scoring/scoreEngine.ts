import type { Job } from "@/types/job";
import type {
  MatchBand,
  ScoreContext,
  ScoreDecision,
  ScoreFilters,
  ScoreLoopPreferences,
  ScoreProfile,
  ScoreReason,
  ScoreResult,
  ScoreThresholds,
  ScoreWeights
} from "./types";

export const defaultScoreWeights: ScoreWeights = {
  requiredSkills: 24,
  desiredSkills: 14,
  seniority: 16,
  location: 10,
  language: 8,
  contract: 8,
  salary: 8,
  remote: 8,
  quality: 4
};

export const defaultScoreThresholds: ScoreThresholds = {
  excellent: 85,
  good: 72,
  maybe: 60,
  rejectBelow: 50
};

const genericKeywords = new Set([
  "developer",
  "engineer",
  "remote",
  "frontend",
  "backend",
  "fullstack",
  "full-stack",
  "software",
  "web",
  "app"
]);

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
  "5 years",
  "5+ years",
  "minimum 5",
  "minimum 6",
  "minimum 7",
  "minimum 8",
  "berufserfahren"
];

const juniorSignals = [
  "junior",
  "entry level",
  "entry-level",
  "trainee",
  "intern",
  "internship",
  "estagio",
  "estágio"
];

const remoteSignals = [
  "remote",
  "remoto",
  "remota",
  "fully remote",
  "100% remote",
  "work from anywhere",
  "remote-first"
];

const onsiteSignals = [
  "onsite",
  "on-site",
  "presencial",
  "office based",
  "office-based"
];

function clampScore(value: number) {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function clean(value: string | undefined | null) {
  return String(value ?? "").trim();
}

function lower(value: string | undefined | null) {
  return clean(value).toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => clean(value)).filter(Boolean)));
}

function includesAny(corpus: string, terms: string[]) {
  return terms.some((term) => corpus.includes(term.toLowerCase()));
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

function addReason(reasons: ScoreReason[], code: string, label: string, delta: number) {
  reasons.push({
    code,
    label,
    delta,
    kind: delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"
  });
}

function mergeWeights(loop?: ScoreLoopPreferences | null): ScoreWeights {
  return {
    ...defaultScoreWeights,
    ...(loop?.weights ?? {})
  };
}

function mergeThresholds(loop?: ScoreLoopPreferences | null): ScoreThresholds {
  return {
    ...defaultScoreThresholds,
    ...(loop?.thresholds ?? {})
  };
}

function normalizeSkills(profile?: ScoreProfile | null) {
  return unique(profile?.skills ?? []).map((skill) => skill.toLowerCase());
}

function getBand(score: number, thresholds: ScoreThresholds): MatchBand {
  if (score >= thresholds.excellent) return "excellent";
  if (score >= thresholds.good) return "good";
  if (score >= thresholds.maybe) return "maybe";
  return "rejected";
}

function hasReason(reasons: ScoreReason[], code: string) {
  return reasons.some((reason) => reason.code === code);
}

function applyRiskCaps(score: number, reasons: ScoreReason[], thresholds: ScoreThresholds) {
  let capped = score;

  if (hasReason(reasons, "excluded-term")) {
    capped = Math.min(capped, thresholds.rejectBelow - 1);
  }

  if (hasReason(reasons, "seniority-risk")) {
    capped = Math.min(capped, thresholds.good - 1);
  }

  if (hasReason(reasons, "seniority-too-high")) {
    capped = Math.min(capped, thresholds.good - 1);
  }

  if (hasReason(reasons, "remote-risk")) {
    capped = Math.min(capped, thresholds.maybe - 1);
  }

  if (hasReason(reasons, "location-risk")) {
    capped = Math.min(capped, thresholds.excellent - 1);
  }

  if (hasReason(reasons, "salary-risk")) {
    capped = Math.min(capped, thresholds.good - 1);
  }

  return capped;
}

function getDecision(score: number, band: MatchBand, reasons: ScoreReason[], thresholds: ScoreThresholds): ScoreDecision {
  if (hasReason(reasons, "excluded-term")) return "auto-reject";
  if (score < thresholds.rejectBelow || band === "rejected") return "auto-reject";
  if (hasReason(reasons, "remote-risk")) return "validate";
  if (hasReason(reasons, "location-risk")) return "validate";
  if (hasReason(reasons, "seniority-risk")) return "validate";
  if (hasReason(reasons, "seniority-too-high")) return "validate";
  if (band === "excellent" || band === "good") return "apply";
  return "review";
}

function scoreKeywords(job: Job, filters: ScoreFilters, weights: ScoreWeights, reasons: ScoreReason[]) {
  const corpus = getCorpus(job);
  let delta = 0;

  for (const keyword of filters.keywords) {
    const normalized = lower(keyword);
    if (!normalized) continue;

    if (corpus.includes(normalized)) {
      const value = genericKeywords.has(normalized) ? 2 : 7;
      delta += value;
      addReason(reasons, "keyword-match", `Keyword encontrada: ${keyword}`, value);
    }
  }

  return Math.min(weights.desiredSkills, delta);
}

function scoreProfileSkills(job: Job, profile: ScoreProfile | null | undefined, weights: ScoreWeights, reasons: ScoreReason[]) {
  const skills = normalizeSkills(profile);
  if (!skills.length) {
    addReason(reasons, "profile-skills-missing", "Sem skills do CV/perfil para comparar", 0);
    return 0;
  }

  const corpus = getCorpus(job);
  const matched = skills.filter((skill) => corpus.includes(skill));
  const delta = Math.min(weights.requiredSkills, matched.length * 6);

  if (matched.length) {
    addReason(reasons, "cv-skill-match", `Skills do CV encontradas: ${matched.slice(0, 5).join(", ")}`, delta);
  } else {
    addReason(reasons, "cv-skill-gap", "Nenhuma skill forte do CV aparece claramente na vaga", -10);
    return -10;
  }

  return delta;
}

function scoreSeniority(job: Job, filters: ScoreFilters, profile: ScoreProfile | null | undefined, weights: ScoreWeights, reasons: ScoreReason[]) {
  const corpus = getCorpus(job);
  const wantedLevel = lower(filters.level);
  const profileSeniority = lower(profile?.seniority);
  const hasSenior = includesAny(corpus, seniorSignals);
  const hasJunior = includesAny(corpus, juniorSignals);

  if ((wantedLevel === "junior" || profileSeniority === "junior") && hasSenior) {
    addReason(reasons, "seniority-risk", "Vaga parece senior/5+ anos para perfil junior", -weights.seniority);
    return -weights.seniority;
  }

  if ((wantedLevel === "mid" || profileSeniority === "mid") && includesAny(corpus, ["8+ years", "8 years", "principal", "staff "])) {
    addReason(reasons, "seniority-too-high", "Senioridade parece acima do alvo", -Math.round(weights.seniority * 0.8));
    return -Math.round(weights.seniority * 0.8);
  }

  if (wantedLevel && wantedLevel !== "any" && job.level === wantedLevel) {
    addReason(reasons, "seniority-match", "Senioridade alinhada com o Loop", weights.seniority);
    return weights.seniority;
  }

  if (hasJunior && (wantedLevel === "junior" || profileSeniority === "junior")) {
    addReason(reasons, "junior-friendly", "Vaga parece compatível com nível junior", Math.round(weights.seniority * 0.8));
    return Math.round(weights.seniority * 0.8);
  }

  addReason(reasons, "seniority-validate", "Senioridade precisa de validação no anúncio", 0);
  return 0;
}

function scoreLocation(job: Job, filters: ScoreFilters, weights: ScoreWeights, reasons: ScoreReason[]) {
  const wantedLocation = lower(filters.location);
  const jobLocation = lower(job.location);

  if (!wantedLocation || wantedLocation === "any") return 0;

  if (jobLocation.includes(wantedLocation)) {
    addReason(reasons, "location-match", "Localização alinhada com o filtro", weights.location);
    return weights.location;
  }

  if (job.workMode === "remote" && includesAny(jobLocation, ["worldwide", "europe", "emea", "remote"])) {
    addReason(reasons, "location-remote-compatible", "Remote parece compatível com a localização", Math.round(weights.location * 0.7));
    return Math.round(weights.location * 0.7);
  }

  addReason(reasons, "location-risk", "Localização pode não ser compatível", -weights.location);
  return -weights.location;
}

function scoreRemote(job: Job, filters: ScoreFilters, weights: ScoreWeights, reasons: ScoreReason[]) {
  const wantedWorkMode = lower(filters.workMode);
  const corpus = getCorpus(job);

  if (wantedWorkMode !== "remote") return 0;

  if (job.workMode === "onsite" || includesAny(corpus, onsiteSignals)) {
    addReason(reasons, "remote-risk", "Vaga parece presencial/onsite", -weights.remote);
    return -weights.remote;
  }

  if (job.workMode === "remote" || includesAny(corpus, remoteSignals)) {
    addReason(reasons, "remote-match", "Vaga indica remoto", weights.remote);
    return weights.remote;
  }

  addReason(reasons, "remote-validate", "Modelo remoto precisa de validação", 0);
  return 0;
}

function scoreLanguage(job: Job, filters: ScoreFilters, profile: ScoreProfile | null | undefined, weights: ScoreWeights, reasons: ScoreReason[]) {
  const wantedLanguage = lower(filters.jobLanguage);
  const profileLanguages = unique(profile?.languages ?? []).map((language) => language.toLowerCase());

  if (wantedLanguage && wantedLanguage !== "any" && job.language === wantedLanguage) {
    addReason(reasons, "language-match", "Idioma alinhado com o filtro", weights.language);
    return weights.language;
  }

  if (profileLanguages.includes(job.language)) {
    addReason(reasons, "profile-language-match", "Idioma da vaga aparece no perfil", Math.round(weights.language * 0.8));
    return Math.round(weights.language * 0.8);
  }

  if (job.language !== "en" && !profileLanguages.includes(job.language)) {
    addReason(reasons, "language-risk", "Idioma pode não estar coberto pelo perfil", -Math.round(weights.language * 0.8));
    return -Math.round(weights.language * 0.8);
  }

  return 0;
}

function scoreContract(job: Job, filters: ScoreFilters, weights: ScoreWeights, reasons: ScoreReason[]) {
  const wantedContract = lower(filters.contractType);

  if (!wantedContract || wantedContract === "any") return 0;

  if (job.contractType === wantedContract) {
    addReason(reasons, "contract-match", "Tipo de contrato alinhado", weights.contract);
    return weights.contract;
  }

  addReason(reasons, "contract-validate", "Tipo de contrato precisa de validação", -Math.round(weights.contract * 0.5));
  return -Math.round(weights.contract * 0.5);
}

function scoreSalary(job: Job, filters: ScoreFilters, profile: ScoreProfile | null | undefined, weights: ScoreWeights, reasons: ScoreReason[]) {
  const minBudget = Number(filters.minBudget || profile?.salaryMin || 0);

  if (!minBudget) return 0;

  if (!job.budgetMin) {
    addReason(reasons, "salary-missing", "Salário/rate não está claro", -Math.round(weights.salary * 0.4));
    return -Math.round(weights.salary * 0.4);
  }

  if (job.budgetMin >= minBudget) {
    addReason(reasons, "salary-match", "Salário/rate parece compatível", weights.salary);
    return weights.salary;
  }

  addReason(reasons, "salary-risk", "Salário/rate parece abaixo do mínimo", -weights.salary);
  return -weights.salary;
}

function scoreQuality(job: Job, weights: ScoreWeights, reasons: ScoreReason[]) {
  let delta = 0;

  if (job.sourceUrl && !job.sourceUrl.includes("example.com")) {
    delta += 2;
  }

  if (job.summary && job.summary.length > 80) {
    delta += 2;
  }

  if (job.tags.length >= 3) {
    delta += 2;
  }

  const capped = Math.min(weights.quality, delta);
  if (capped > 0) {
    addReason(reasons, "job-quality", "Vaga tem dados suficientes para avaliação inicial", capped);
  }

  return capped;
}

function buildRisks(reasons: ScoreReason[]) {
  return unique(
    reasons
      .filter((reason) => reason.kind === "negative")
      .map((reason) => reason.label)
  );
}

function buildStrengths(job: Job, reasons: ScoreReason[]) {
  return unique([
    ...job.strengths,
    ...reasons.filter((reason) => reason.kind === "positive").map((reason) => reason.label)
  ]).slice(0, 6);
}

function buildGaps(job: Job, reasons: ScoreReason[]) {
  const neutral = reasons.filter((reason) => reason.kind === "neutral").map((reason) => reason.label);
  return unique([...job.gaps, ...neutral]).slice(0, 6);
}

function buildSummary(job: Job, band: MatchBand, score: number, risks: string[]) {
  if (band === "rejected") {
    return `Compatibilidade baixa (${score}%). ${risks[0] ?? "Há desalinhamentos importantes para validar."}`;
  }

  if (band === "excellent") {
    return `Compatibilidade excelente (${score}%). A vaga parece alinhada com perfil, Loop e sinais técnicos.`;
  }

  if (band === "good") {
    return `Boa compatibilidade (${score}%). Vale avançar após validar requisitos principais.`;
  }

  return `Compatibilidade possível (${score}%). Há sinais positivos, mas precisa de validação antes de aplicar.`;
}

function buildNextAction(decision: ScoreDecision, risks: string[]) {
  if (decision === "auto-reject") {
    return `Ignorar ou arquivar automaticamente. Motivo principal: ${risks[0] ?? "score abaixo do threshold."}`;
  }

  if (decision === "validate") {
    return `Validar antes de aplicar: ${risks.slice(0, 2).join("; ") || "confirmar requisitos críticos."}`;
  }

  if (decision === "apply") {
    return "Preparar candidatura/proposta com foco nos pontos fortes encontrados.";
  }

  return "Guardar para revisão e validar requisitos antes de decidir.";
}

export function scoreJob(job: Job, context: ScoreContext): ScoreResult {
  const weights = mergeWeights(context.loop);
  const thresholds = mergeThresholds(context.loop);

  const reasons: ScoreReason[] = [];
  let score = job.matchScore;

  score += scoreKeywords(job, context.filters, weights, reasons);
  score += scoreProfileSkills(job, context.profile, weights, reasons);
  score += scoreSeniority(job, context.filters, context.profile, weights, reasons);
  score += scoreLocation(job, context.filters, weights, reasons);
  score += scoreRemote(job, context.filters, weights, reasons);
  score += scoreLanguage(job, context.filters, context.profile, weights, reasons);
  score += scoreContract(job, context.filters, weights, reasons);
  score += scoreSalary(job, context.filters, context.profile, weights, reasons);
  score += scoreQuality(job, weights, reasons);

  for (const excludedTerm of context.filters.excludedTerms) {
    if (lower(excludedTerm) && getCorpus(job).includes(lower(excludedTerm))) {
      const delta = -Math.max(30, weights.quality + weights.requiredSkills);
      score += delta;
      addReason(reasons, "excluded-term", `Termo excluído encontrado: ${excludedTerm}`, delta);
    }
  }

  const finalScore = clampScore(applyRiskCaps(score, reasons, thresholds));
  const risks = buildRisks(reasons);
  const band = getBand(finalScore, thresholds);
  const decision = getDecision(finalScore, band, reasons, thresholds);
  const strengths = buildStrengths(job, reasons);
  const gaps = buildGaps(job, reasons);
  const summary = buildSummary(job, band, finalScore, risks);
  const nextAction = buildNextAction(decision, risks);

  return {
    job: {
      ...job,
      matchScore: finalScore,
      strengths,
      gaps,
      risks,
      summary,
      nextAction
    },
    score: finalScore,
    band,
    decision,
    reasons,
    strengths,
    gaps,
    risks,
    summary,
    nextAction,
    autoRejected: decision === "auto-reject"
  };
}

export function scoreJobs(jobs: Job[], context: ScoreContext) {
  return jobs.map((job) => scoreJob(job, context));
}
