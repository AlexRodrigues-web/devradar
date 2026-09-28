export type DetectedSkill = {
  name: string;
  category: "frontend" | "backend" | "database" | "devops" | "mobile" | "cms" | "language" | "tool";
  confidence: number;
};

export type ExtractedDevProfile = {
  title: string;
  seniority: "intern" | "junior" | "mid" | "senior";
  skills: string[];
  detectedSkills: DetectedSkill[];
  languages: string[];
  locations: string[];
  workModes: string[];
  strengths: string[];
  summary: string;
};

type SkillDefinition = {
  name: string;
  category: DetectedSkill["category"];
  priority: number;
  patterns: RegExp[];
};

const skillDefinitions: SkillDefinition[] = [
  { name: "Next.js", category: "frontend", priority: 10, patterns: [/\bnext\.js\b/i, /\bnextjs\b/i] },
  { name: "React", category: "frontend", priority: 11, patterns: [/\breact\b/i, /\breact\.js\b/i] },
  { name: "TypeScript", category: "language", priority: 12, patterns: [/\btypescript\b/i] },
  { name: "Angular", category: "frontend", priority: 13, patterns: [/\bangular\b/i] },
  { name: "Ionic", category: "mobile", priority: 14, patterns: [/\bionic\b/i] },
  { name: "Tailwind CSS", category: "frontend", priority: 15, patterns: [/\btailwind\s*css\b/i, /\btailwind\b/i] },
  { name: "Node.js", category: "backend", priority: 20, patterns: [/\bnode\.js\b/i, /\bnodejs\b/i] },
  { name: "Go", category: "language", priority: 21, patterns: [/\bgolang\b/i, /(^|[^a-z])go([^a-z]|$)/i] },
  { name: "REST API", category: "backend", priority: 22, patterns: [/\brest\s*api\b/i, /\bapi\s*rest\b/i, /\bapis?\b/i] },
  { name: "WebSocket", category: "backend", priority: 23, patterns: [/\bwebsocket\b/i, /\bweb\s*socket\b/i, /\brealtime\b/i, /\btempo real\b/i] },
  { name: "Laravel", category: "backend", priority: 24, patterns: [/\blaravel\b/i] },
  { name: "PHP", category: "language", priority: 25, patterns: [/\bphp\b/i] },
  { name: "HTML", category: "frontend", priority: 26, patterns: [/\bhtml\b/i] },
  { name: "CSS", category: "frontend", priority: 27, patterns: [/\bcss\b/i] },
  { name: "PostgreSQL", category: "database", priority: 30, patterns: [/\bpostgresql\b/i, /\bpostgres\b/i] },
  { name: "MySQL", category: "database", priority: 31, patterns: [/\bmysql\b/i, /\bmariadb\b/i] },
  { name: "Redis", category: "database", priority: 32, patterns: [/\bredis\b/i] },
  { name: "SQL", category: "database", priority: 33, patterns: [/\bsql\b/i] },
  { name: "Docker", category: "devops", priority: 40, patterns: [/\bdocker\b/i] },
  { name: "Git/GitHub", category: "tool", priority: 41, patterns: [/\bgit\s*\/\s*github\b/i, /\bgithub\b/i, /\bgitlab\b/i, /\bgit\b/i] },
  { name: "Python", category: "language", priority: 50, patterns: [/\bpython\b/i] },
  { name: "Airflow", category: "tool", priority: 51, patterns: [/\bairflow\b/i] },
  { name: "dbt", category: "tool", priority: 52, patterns: [/\bdbt\b/i] },
  { name: "Streamlit", category: "tool", priority: 53, patterns: [/\bstreamlit\b/i] },
  { name: "Leaflet", category: "frontend", priority: 54, patterns: [/\bleaflet\b/i] },
  { name: "Alpine.js", category: "frontend", priority: 55, patterns: [/\balpine\.js\b/i, /\balpinejs\b/i] },
  { name: "Vite", category: "tool", priority: 56, patterns: [/\bvite\b/i] },
  { name: "JavaScript", category: "language", priority: 60, patterns: [/\bjavascript\b/i] },
  { name: "WordPress", category: "cms", priority: 70, patterns: [/\bwordpress\b/i] },
  { name: "GraphQL", category: "backend", priority: 80, patterns: [/\bgraphql\b/i] },
  { name: "Vue", category: "frontend", priority: 81, patterns: [/\bvue\b/i, /\bvue\.js\b/i] }
];

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function countPatternMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function hasAnySkill(skills: Set<string>, names: string[]) {
  return names.some((name) => skills.has(name));
}

export function detectSkills(rawText: string): DetectedSkill[] {
  const text = rawText.normalize("NFKC");

  return skillDefinitions
    .map((skill) => {
      const matches = countPatternMatches(text, skill.patterns);

      if (!matches) {
        return null;
      }

      return {
        name: skill.name,
        category: skill.category,
        confidence: Math.min(1, 0.75 + matches * 0.1),
        priority: skill.priority
      };
    })
    .filter((skill): skill is DetectedSkill & { priority: number } => Boolean(skill))
    .sort((a, b) => a.priority - b.priority || b.confidence - a.confidence)
    .map((skill) => ({ name: skill.name, category: skill.category, confidence: skill.confidence }));
}

export function detectSeniority(rawText: string): ExtractedDevProfile["seniority"] {
  const text = rawText.toLowerCase();

  if (/\b(senior|sr\.?|lead|principal|staff|tech lead|arquiteto)\b/.test(text)) {
    return "senior";
  }

  if (/\b(mid|pleno|middle)\b/.test(text)) {
    return "mid";
  }

  if (/\b(junior|jr\.?|estagi[aá]rio|intern)\b/.test(text)) {
    return "junior";
  }

  if (/\b(2024|2025|2 years|2 anos|web development)\b/.test(text)) {
    return "junior";
  }

  return "junior";
}

export function detectLanguages(rawText: string) {
  const text = rawText.toLowerCase();
  const languages: string[] = [];

  if (/\b(portugu[eê]s|portuguese|pt)\b/.test(text)) {
    languages.push("pt");
  }

  if (/\b(ingl[eê]s|english|en)\b/.test(text)) {
    languages.push("en");
  }

  if (/\b(espanhol|spanish|es)\b/.test(text)) {
    languages.push("es");
  }

  return unique(languages.length ? languages : ["pt", "en"]);
}

export function detectLocations(rawText: string) {
  const text = rawText.toLowerCase();
  const locations: string[] = [];

  if (/vila nova de gaia/i.test(rawText)) {
    locations.push("Vila Nova de Gaia, Portugal");
  }

  if (/\bportugal\b/.test(text)) {
    locations.push("Portugal");
  }

  if (/\bremote europe\b|\beuropa\b|\beurope\b/.test(text)) {
    locations.push("Remote Europe");
  }

  if (/\bremote\b|\bremoto\b/.test(text) && !locations.includes("Remote Europe")) {
    locations.push("Remote");
  }

  return unique(locations.length ? locations : ["Portugal / Remote Europe"]);
}

export function detectWorkModes(rawText: string) {
  const text = rawText.toLowerCase();
  const modes: string[] = [];

  if (/\bremote\b|\bremoto\b|remote europe/.test(text)) {
    modes.push("remote");
  }

  if (/\bhybrid\b|\bh[ií]brido\b/.test(text)) {
    modes.push("hybrid");
  }

  if (/\bon[- ]?site\b|\bpresencial\b/.test(text)) {
    modes.push("onsite");
  }

  return unique(modes.length ? modes : ["remote"]);
}

export function detectTitle(skills: string[], rawText = "") {
  const skillSet = new Set(skills);
  const text = rawText.toLowerCase();

  if (/full[- ]stack developer|desenvolvedor full[- ]stack|full[- ]stack/i.test(rawText)) {
    return "Full-Stack Developer";
  }

  const hasFrontend = hasAnySkill(skillSet, ["Next.js", "React", "TypeScript", "Angular", "Tailwind CSS", "HTML", "CSS", "Ionic"]);
  const hasBackend = hasAnySkill(skillSet, ["Node.js", "Go", "REST API", "WebSocket", "Laravel", "PHP", "Python"]);
  const hasDatabase = hasAnySkill(skillSet, ["PostgreSQL", "MySQL", "Redis", "SQL"]);

  if (hasFrontend && hasBackend && hasDatabase) {
    return "Full-Stack Developer";
  }

  if (hasFrontend && hasBackend) {
    return "Full-Stack Developer";
  }

  if (hasBackend && /api|backend|laravel|go|node|php/.test(text)) {
    return "Backend Developer";
  }

  if (hasFrontend) {
    return "Frontend Developer";
  }

  if (skillSet.has("WordPress")) {
    return "WordPress Developer";
  }

  return "Software Developer";
}

export function detectStrengths(skills: DetectedSkill[], rawText = "") {
  const categories = new Set(skills.map((skill) => skill.category));
  const skillNames = new Set(skills.map((skill) => skill.name));
  const strengths: string[] = [];

  if (/full[- ]stack/i.test(rawText) || (categories.has("frontend") && categories.has("backend"))) {
    strengths.push("Full-stack produto");
  }

  if (categories.has("frontend")) {
    strengths.push("Frontend moderno");
  }

  if (categories.has("backend")) {
    strengths.push("APIs e backend");
  }

  if (skillNames.has("WebSocket")) {
    strengths.push("Realtime/WebSocket");
  }

  if (categories.has("database")) {
    strengths.push("Base de dados");
  }

  if (categories.has("mobile") || skillNames.has("Leaflet")) {
    strengths.push("Mobile/PWA");
  }

  if (skillNames.has("Python") || skillNames.has("Airflow") || skillNames.has("dbt") || skillNames.has("Streamlit")) {
    strengths.push("Data pipelines/analytics");
  }

  if (categories.has("devops") || skillNames.has("Docker")) {
    strengths.push("DevOps básico");
  }

  if (categories.has("cms")) {
    strengths.push("CMS e WordPress");
  }

  return unique(strengths.length ? strengths : ["Perfil técnico em construção"]);
}

function buildSummary(title: string, seniority: ExtractedDevProfile["seniority"], skills: string[]) {
  const highlighted = skills.slice(0, 6).join(", ");

  return `${title} · ${seniority} · ${highlighted}`;
}

export function extractDevProfileFromText(rawText: string): ExtractedDevProfile {
  const detectedSkills = detectSkills(rawText);
  const skills = detectedSkills.map((skill) => skill.name);
  const seniority = detectSeniority(rawText);
  const title = detectTitle(skills, rawText);
  const languages = detectLanguages(rawText);
  const locations = detectLocations(rawText);
  const workModes = detectWorkModes(rawText);
  const strengths = detectStrengths(detectedSkills, rawText);

  return {
    title,
    seniority,
    skills,
    detectedSkills,
    languages,
    locations,
    workModes,
    strengths,
    summary: buildSummary(title, seniority, skills)
  };
}
