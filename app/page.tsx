"use client";

import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Columns3,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Play,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings2,
  Square,
  Target,
  Zap
} from "lucide-react";
import { initialJobs, opportunityBank } from "@/data/mock-jobs";
import type {
  AppLanguage,
  ContractType,
  ExperienceLevel,
  Job,
  JobSource,
  JobStatus,
  OpportunityLanguage,
  WorkMode
} from "@/types/job";

type ViewKey =
  | "dashboard"
  | "run"
  | "opportunities"
  | "pipeline"
  | "saved"
  | "applications"
  | "templates"
  | "reports"
  | "settings";

type RunStats = {
  found: number;
  duplicates: number;
  approved: number;
  consulted: number;
  duration: string;
  lastRun: string;
};

const sourceOptions: JobSource[] = [
  "Remotive",
  "Remote OK",
  "Adzuna",
  "We Work Remotely",
  "RSS",
  "Manual"
];

const viewOrder: ViewKey[] = [
  "dashboard",
  "run",
  "opportunities",
  "pipeline",
  "saved",
  "applications",
  "templates",
  "reports",
  "settings"
];

const viewLabels: Record<AppLanguage, Record<ViewKey, string>> = {
  pt: {
    dashboard: "Dashboard",
    run: "Rodar Pipeline",
    opportunities: "Oportunidades",
    pipeline: "Pipeline",
    saved: "Pesquisas salvas",
    applications: "Candidaturas",
    templates: "Templates",
    reports: "Relatórios",
    settings: "Configurações"
  },
  en: {
    dashboard: "Dashboard",
    run: "Run Pipeline",
    opportunities: "Opportunities",
    pipeline: "Pipeline",
    saved: "Saved searches",
    applications: "Applications",
    templates: "Templates",
    reports: "Reports",
    settings: "Settings"
  },
  es: {
    dashboard: "Panel",
    run: "Ejecutar Pipeline",
    opportunities: "Oportunidades",
    pipeline: "Pipeline",
    saved: "Búsquedas guardadas",
    applications: "Candidaturas",
    templates: "Plantillas",
    reports: "Informes",
    settings: "Configuración"
  }
};

const copy: Record<AppLanguage, Record<string, string>> = {
  pt: {
    subtitle: "Pipeline profissional para encontrar vagas dev, freelance e remotas sem saltar entre páginas.",
    mainTitle: "Encontre oportunidades freelance e remotas",
    keywordsHint: "Palavras-chave separadas por vírgula.",
    runPipeline: "Rodar Pipeline",
    runAgain: "Executar novamente",
    cancelRun: "Cancelar execução",
    saveSearch: "Salvar busca",
    scheduleSearch: "Agendar busca",
    clearFilters: "Limpar filtros",
    keywords: "Palavras-chave",
    location: "Localização",
    workMode: "Modelo",
    level: "Nível",
    category: "Categoria",
    contract: "Tipo de trabalho",
    language: "Idioma das vagas",
    minBudget: "Orçamento mínimo",
    dateRange: "Data",
    sources: "Fontes",
    schedule: "Frequência",
    results: "Resultados",
    detail: "Detalhe da oportunidade",
    dashboardText: "Visão rápida do volume, qualidade e estado das oportunidades.",
    pipelineRunner: "Pipeline Runner",
    logs: "Logs da execução",
    never: "Nunca executado",
    lastRun: "Última execução",
    found: "Encontradas",
    duplicates: "Duplicados removidos",
    approved: "Aprovadas pelo filtro",
    consulted: "Fontes consultadas",
    newToday: "Novas hoje",
    highMatch: "Match acima de 80%",
    applications: "Candidaturas",
    pending: "Respostas pendentes",
    viewDetails: "Ver detalhes",
    viewAd: "Ver anúncio",
    save: "Guardar",
    apply: "Candidatar-me",
    proposal: "Gerar proposta",
    ignore: "Ignorar",
    openSource: "Abrir fonte",
    nextAction: "Próxima ação",
    strengths: "Pontos fortes",
    gaps: "Pontos a validar",
    searchPlaceholder: "Filtrar por título, empresa, skill ou fonte...",
    pipelineReady: "Pronto para buscar oportunidades com os filtros escolhidos.",
    savedSearchOk: "Busca salva.",
    scheduledSearchOk: "Busca agendada.",
    proposalLog: "Proposta gerada em modo local.",
    pipelineFinished: "Pipeline finalizado com resultados classificados.",
    pipelineCancelled: "Execução cancelada.",
    emptyDetail: "Selecione uma oportunidade para analisar."
  },
  en: {
    subtitle: "Professional pipeline to find dev, freelance and remote opportunities without jumping between pages.",
    mainTitle: "Find freelance and remote opportunities",
    keywordsHint: "Comma-separated keywords.",
    runPipeline: "Run Pipeline",
    runAgain: "Run again",
    cancelRun: "Cancel run",
    saveSearch: "Save search",
    scheduleSearch: "Schedule search",
    clearFilters: "Clear filters",
    keywords: "Keywords",
    location: "Location",
    workMode: "Mode",
    level: "Level",
    category: "Category",
    contract: "Work type",
    language: "Job language",
    minBudget: "Minimum budget",
    dateRange: "Date",
    sources: "Sources",
    schedule: "Frequency",
    results: "Results",
    detail: "Opportunity detail",
    dashboardText: "Quick view of opportunity volume, quality and status.",
    pipelineRunner: "Pipeline Runner",
    logs: "Run logs",
    never: "Never run",
    lastRun: "Last run",
    found: "Found",
    duplicates: "Duplicates removed",
    approved: "Approved by filter",
    consulted: "Sources checked",
    newToday: "New today",
    highMatch: "Match above 80%",
    applications: "Applications",
    pending: "Pending replies",
    viewDetails: "Details",
    viewAd: "View job",
    save: "Save",
    apply: "Apply",
    proposal: "Generate proposal",
    ignore: "Ignore",
    openSource: "Open source",
    nextAction: "Next action",
    strengths: "Strengths",
    gaps: "Gaps to validate",
    searchPlaceholder: "Filter by title, company, skill or source...",
    pipelineReady: "Ready to search opportunities with selected filters.",
    savedSearchOk: "Search saved.",
    scheduledSearchOk: "Search scheduled.",
    proposalLog: "Local proposal generated.",
    pipelineFinished: "Pipeline finished with ranked results.",
    pipelineCancelled: "Run cancelled.",
    emptyDetail: "Select an opportunity to analyze."
  },
  es: {
    subtitle: "Pipeline profesional para encontrar oportunidades dev, freelance y remotas sin saltar entre páginas.",
    mainTitle: "Encuentra oportunidades freelance y remotas",
    keywordsHint: "Palabras clave separadas por comas.",
    runPipeline: "Ejecutar Pipeline",
    runAgain: "Ejecutar otra vez",
    cancelRun: "Cancelar ejecución",
    saveSearch: "Guardar búsqueda",
    scheduleSearch: "Programar búsqueda",
    clearFilters: "Limpiar filtros",
    keywords: "Palabras clave",
    location: "Ubicación",
    workMode: "Modalidad",
    level: "Nivel",
    category: "Categoría",
    contract: "Tipo de trabajo",
    language: "Idioma de las ofertas",
    minBudget: "Presupuesto mínimo",
    dateRange: "Fecha",
    sources: "Fuentes",
    schedule: "Frecuencia",
    results: "Resultados",
    detail: "Detalle de la oportunidad",
    dashboardText: "Vista rápida del volumen, calidad y estado de las oportunidades.",
    pipelineRunner: "Pipeline Runner",
    logs: "Logs de ejecución",
    never: "Nunca ejecutado",
    lastRun: "Última ejecución",
    found: "Encontradas",
    duplicates: "Duplicados eliminados",
    approved: "Aprobadas por filtro",
    consulted: "Fuentes consultadas",
    newToday: "Nuevas hoy",
    highMatch: "Match superior a 80%",
    applications: "Candidaturas",
    pending: "Respuestas pendientes",
    viewDetails: "Ver detalles",
    viewAd: "Ver anuncio",
    save: "Guardar",
    apply: "Postularme",
    proposal: "Generar propuesta",
    ignore: "Ignorar",
    openSource: "Abrir fuente",
    nextAction: "Próxima acción",
    strengths: "Puntos fuertes",
    gaps: "Puntos a validar",
    searchPlaceholder: "Filtrar por título, empresa, skill o fuente...",
    pipelineReady: "Listo para buscar oportunidades con los filtros elegidos.",
    savedSearchOk: "Búsqueda guardada.",
    scheduledSearchOk: "Búsqueda programada.",
    proposalLog: "Propuesta local generada.",
    pipelineFinished: "Pipeline finalizado con resultados clasificados.",
    pipelineCancelled: "Ejecución cancelada.",
    emptyDetail: "Selecciona una oportunidad para analizar."
  }
};

const statusLabels: Record<AppLanguage, Record<JobStatus, string>> = {
  pt: {
    new: "Novo",
    selected: "Selecionado",
    applied: "Candidatado",
    conversation: "Em conversa",
    proposal: "Proposta enviada",
    won: "Fechado/Ganho",
    lost: "Rejeitado",
    ignored: "Ignorado"
  },
  en: {
    new: "New",
    selected: "Selected",
    applied: "Applied",
    conversation: "In conversation",
    proposal: "Proposal sent",
    won: "Closed/Won",
    lost: "Rejected",
    ignored: "Ignored"
  },
  es: {
    new: "Nuevo",
    selected: "Seleccionado",
    applied: "Postulado",
    conversation: "En conversación",
    proposal: "Propuesta enviada",
    won: "Cerrado/Ganado",
    lost: "Rechazado",
    ignored: "Ignorado"
  }
};

const pipelineStatuses: JobStatus[] = [
  "new",
  "selected",
  "applied",
  "conversation",
  "proposal",
  "won",
  "lost"
];

const pipelineSteps = [
  { key: "search", pt: "Buscando oportunidades", en: "Searching opportunities", es: "Buscando oportunidades" },
  { key: "normalize", pt: "Normalizando dados", en: "Normalizing data", es: "Normalizando datos" },
  { key: "dedupe", pt: "Removendo duplicados", en: "Removing duplicates", es: "Eliminando duplicados" },
  { key: "score", pt: "Calculando score", en: "Calculating score", es: "Calculando score" },
  { key: "filter", pt: "Aplicando filtros", en: "Applying filters", es: "Aplicando filtros" },
  { key: "final", pt: "Gerando lista final", en: "Generating final list", es: "Generando lista final" }
] as const;

const categoryOptions = [
  "frontend",
  "backend",
  "full stack",
  "wordpress",
  "design",
  "marketing",
  "copywriting",
  "support"
];

const dateOptions = ["24h", "7d", "30d", "any"];
const scheduleOptions = ["manual", "1h", "3h", "6h", "12h", "daily"];

const defaultRunStats: RunStats = {
  found: 0,
  duplicates: 0,
  approved: 0,
  consulted: 0,
  duration: "0s",
  lastRun: ""
};

export default function Home() {
  const [uiLanguage, setUiLanguage] = useState<AppLanguage>("pt");
  const [activeView, setActiveView] = useState<ViewKey>("run");

  const [keywords, setKeywords] = useState("freelance, junior, full stack, remote, react, next.js, wordpress");
  const [location, setLocation] = useState("Portugal, Europe, Remote");
  const [workMode, setWorkMode] = useState<WorkMode>("remote");
  const [level, setLevel] = useState<ExperienceLevel>("junior");
  const [category, setCategory] = useState("frontend");
  const [contractType, setContractType] = useState<ContractType>("any");
  const [jobLanguage, setJobLanguage] = useState<OpportunityLanguage>("any");
  const [minBudget, setMinBudget] = useState("");
  const [dateRange, setDateRange] = useState("7d");
  const [scheduleEvery, setScheduleEvery] = useState("manual");
  const [selectedSources, setSelectedSources] = useState<JobSource[]>(["Remotive", "Remote OK", "Adzuna", "RSS"]);

  const [opportunities, setOpportunities] = useState<Job[]>(initialJobs);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">("all");
  const [listSearch, setListSearch] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(initialJobs[0]?.id ?? null);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [logs, setLogs] = useState<string[]>([copy.pt.pipelineReady]);
  const [runStats, setRunStats] = useState<RunStats>(defaultRunStats);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const cancelRunRef = useRef(false);
  const t = copy[uiLanguage];

  const filteredOpportunities = useMemo(() => {
    const query = listSearch.trim().toLowerCase();

    return opportunities
      .filter((job) => selectedStatus === "all" || job.status === selectedStatus)
      .filter((job) => {
        if (!query) return true;

        return [
          job.title,
          job.company,
          job.source,
          job.location,
          job.category,
          job.contractType,
          ...job.tags
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [listSearch, opportunities, selectedStatus]);

  const applicationOpportunities = useMemo(
    () =>
      opportunities.filter((job) =>
        ["applied", "conversation", "proposal", "won", "lost"].includes(job.status)
      ),
    [opportunities]
  );

  const selectedOpportunity =
    opportunities.find((job) => job.id === selectedOpportunityId) ??
    filteredOpportunities[0] ??
    opportunities[0];

  const stats = useMemo(() => {
    const highMatch = opportunities.filter((job) => job.matchScore >= 80).length;
    const applications = opportunities.filter((job) =>
      ["applied", "conversation", "proposal", "won"].includes(job.status)
    ).length;
    const pending = opportunities.filter((job) =>
      ["conversation", "proposal"].includes(job.status)
    ).length;
    const newToday = opportunities.filter((job) =>
      ["Hoje", "Today", "Últimas 24h"].includes(job.postedAt)
    ).length;

    return {
      total: opportunities.length,
      highMatch,
      applications,
      pending,
      newToday
    };
  }, [opportunities]);

  const savedSearches = [
    "Full Stack Junior Remote",
    "WordPress Freelance Europe",
    "React Part-time",
    "Frontend Remote English",
    "Laravel Freelance"
  ];

  const topTags = useMemo(() => {
    const count = new Map<string, number>();

    for (const job of opportunities) {
      for (const tag of job.tags) {
        count.set(tag, (count.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [opportunities]);

  function handleNav(view: ViewKey) {
    setActiveView(view);

    if (view === "opportunities") {
      setSelectedStatus("all");
    }

    if (view === "applications") {
      setSelectedStatus("applied");
    }
  }

  function toggleSource(source: JobSource) {
    setSelectedSources((current) => {
      if (current.includes(source)) {
        const next = current.filter((item) => item !== source);
        return next.length ? next : current;
      }

      return [...current, source];
    });
  }

  function updateOpportunityStatus(jobId: string, status: JobStatus) {
    setOpportunities((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job))
    );
  }

  function clearFilters() {
    setKeywords("");
    setLocation("");
    setWorkMode("any");
    setLevel("any");
    setCategory("frontend");
    setContractType("any");
    setJobLanguage("any");
    setMinBudget("");
    setDateRange("7d");
    setSelectedSources(["Remotive", "Remote OK", "Adzuna", "RSS"]);
    setLogs((current) => ["Filtros limpos.", ...current].slice(0, 8));
  }

  function saveSearch() {
    setLogs((current) => [t.savedSearchOk, ...current].slice(0, 8));
    setActiveView("saved");
  }

  function scheduleSearch() {
    setLogs((current) => [`${t.scheduledSearchOk} (${scheduleEvery})`, ...current].slice(0, 8));
    setActiveView("saved");
  }

  async function handleAlerts() {
    if (alertsEnabled) {
      setAlertsEnabled(false);
      setAlertMessage("Alertas desativados.");
      setLogs((current) => ["Alertas desativados.", ...current].slice(0, 8));
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "granted") {
        setAlertsEnabled(true);
        setAlertMessage("Alertas ativados. O DevRadar vai avisar quando encontrar oportunidades fortes.");
        setLogs((current) => ["Alertas ativados para oportunidades com match alto.", ...current].slice(0, 8));

        new Notification("DevRadar Alerts", {
          body: "Alertas ativados para oportunidades com match alto."
        });

        return;
      }

      setAlertMessage("Permissão de notificações bloqueada no navegador.");
      setLogs((current) => ["Permissão de notificações bloqueada no navegador.", ...current].slice(0, 8));
      return;
    }

    setAlertsEnabled(true);
    setAlertMessage("Alertas internos ativados. Este navegador não suporta notificações do sistema.");
    setLogs((current) => ["Alertas internos ativados.", ...current].slice(0, 8));
  }

  function generateProposal(job: Job) {
    setLogs((current) => [`${t.proposalLog}: ${job.title}`, ...current].slice(0, 8));
    updateOpportunityStatus(job.id, "proposal");
  }

  function cancelPipeline() {
    cancelRunRef.current = true;
    setIsRunning(false);
    setProgress(0);
    setCurrentStep("");
    setLogs((current) => [t.pipelineCancelled, ...current].slice(0, 8));
  }

  async function runPipeline() {
    cancelRunRef.current = false;
    setIsRunning(true);
    setActiveView("run");
    setProgress(0);
    setCurrentStep("");
    setLogs([]);

    const startTime = performance.now();

    for (let index = 0; index < pipelineSteps.length; index += 1) {
      if (cancelRunRef.current) return;

      const step = pipelineSteps[index];
      setCurrentStep(step.key);
      setLogs((current) => [step[uiLanguage], ...current].slice(0, 8));
      setProgress(Math.round(((index + 1) / pipelineSteps.length) * 100));

      await sleep(420);
    }

    if (cancelRunRef.current) return;

    const result = buildPipelineResults({
      keywords,
      location,
      workMode,
      level,
      category,
      contractType,
      jobLanguage,
      minBudget,
      selectedSources
    });

    const duration = `${Math.max(1, Math.round((performance.now() - startTime) / 1000))}s`;

    setOpportunities(result.jobs);
    setSelectedOpportunityId(result.jobs[0]?.id ?? null);
    setRunStats({
      found: result.found,
      duplicates: result.duplicates,
      approved: result.jobs.length,
      consulted: selectedSources.length,
      duration,
      lastRun: new Date().toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    const highMatchCount = result.jobs.filter((job) => job.matchScore >= 85).length;

    setLogs((current) =>
      [
        t.pipelineFinished,
        `${t.found}: ${result.found}`,
        `${t.duplicates}: ${result.duplicates}`,
        `${t.approved}: ${result.jobs.length}`,
        highMatchCount > 0 ? `Alertas: ${highMatchCount} oportunidade(s) com match alto.` : "Alertas: nenhuma oportunidade acima do limite.",
        ...current
      ].slice(0, 8)
    );

    if (
      alertsEnabled &&
      highMatchCount > 0 &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("DevRadar encontrou oportunidades fortes", {
        body: `${highMatchCount} oportunidade(s) com match acima de 85%.`
      });
    }

    setCurrentStep("done");
    setIsRunning(false);
  }

  return (
    <main className="devradar-shell">
      <div className="app-grid">
        <aside className="sidebar">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <BriefcaseBusiness size={20} />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight">DevRadar</div>
              <div className="text-xs muted">Opportunity OS</div>
            </div>
          </div>

          <nav className="grid gap-1">
            {viewOrder.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => handleNav(view)}
                className={`nav-item ${activeView === view ? "nav-item-active" : ""}`}
              >
                {iconForView(view)}
                {viewLabels[uiLanguage][view]}
              </button>
            ))}
          </nav>
        </aside>

        <section className="grid gap-4">
          <header className="panel p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-gray">DevRadar</span>
                  <span className="badge badge-green">MVP profissional</span>
                  <span className="badge badge-blue">{viewLabels[uiLanguage][activeView]}</span>
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {activeView === "run" ? t.mainTitle : viewLabels[uiLanguage][activeView]}
                </h1>

                <p className="mt-1 max-w-4xl text-sm leading-6 muted">
                  {activeView === "dashboard" ? t.dashboardText : t.subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="surface flex items-center gap-2 px-3 py-2 text-sm">
                  <Globe2 size={16} className="muted" />
                  <select
                    value={uiLanguage}
                    onChange={(event) => setUiLanguage(event.target.value as AppLanguage)}
                    className="bg-transparent font-bold outline-none"
                  >
                    <option value="pt">PT</option>
                    <option value="en">EN</option>
                    <option value="es">ES</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleAlerts}
                  className={`btn ${alertsEnabled ? "btn-primary" : "btn-soft"}`}
                  title={alertMessage || "Ativar alertas"}
                >
                  <Bell size={16} />
                  {alertsEnabled ? "Alertas ON" : "Alerts"}
                </button>

                <button onClick={runPipeline} disabled={isRunning} className="btn btn-primary">
                  <Play size={17} />
                  {isRunning
                    ? pipelineSteps.find((step) => step.key === currentStep)?.[uiLanguage] ?? t.runPipeline
                    : t.runPipeline}
                </button>
              </div>
            </div>
          </header>

          {activeView === "dashboard" ? (
            <section className="grid gap-4">
              <section className="grid gap-3 md:grid-cols-5">
                <MetricCard label="Total" value={stats.total.toString()} />
                <MetricCard label={t.newToday} value={stats.newToday.toString()} />
                <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
                <MetricCard label={t.applications} value={stats.applications.toString()} />
                <MetricCard label={t.pending} value={stats.pending.toString()} />
              </section>

              <section className="grid gap-4 xl:grid-cols-[1fr_390px]">
                <div className="panel p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-black">Melhores oportunidades</h2>
                      <p className="text-sm muted">Ordenadas por compatibilidade.</p>
                    </div>
                    <Target size={19} className="text-blue-700" />
                  </div>

                  <div className="grid gap-3">
                    {opportunities
                      .slice()
                      .sort((a, b) => b.matchScore - a.matchScore)
                      .slice(0, 4)
                      .map((job) => (
                        <OpportunityCard
                          key={job.id}
                          job={job}
                          uiLanguage={uiLanguage}
                          t={t}
                          statusLabel={statusLabels[uiLanguage][job.status]}
                          onDetails={() => {
                            setSelectedOpportunityId(job.id);
                            setActiveView("opportunities");
                          }}
                          onSave={() => updateOpportunityStatus(job.id, "selected")}
                          onApply={() => updateOpportunityStatus(job.id, "applied")}
                          onProposal={() => generateProposal(job)}
                        />
                      ))}
                  </div>
                </div>

                <RunnerPanel
                  t={t}
                  isRunning={isRunning}
                  progress={progress}
                  runStats={runStats}
                  onRun={runPipeline}
                  onCancel={cancelPipeline}
                />
              </section>
            </section>
          ) : null}

          {activeView === "run" ? (
            <section className="grid gap-4">
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="panel p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black">{t.mainTitle}</h2>
                      <p className="text-sm muted">{t.keywordsHint}</p>
                    </div>
                    <Search size={19} className="muted" />
                  </div>

                  <div className="grid gap-3">
                    <Field label={t.keywords}>
                      <textarea
                        value={keywords}
                        onChange={(event) => setKeywords(event.target.value)}
                        rows={3}
                        className="input-field resize-none"
                        placeholder="freelance, junior, full stack, remote, react, next.js..."
                      />
                    </Field>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Field label={t.location}>
                        <input
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          className="input-field"
                          placeholder="Portugal, Europe, Remote"
                        />
                      </Field>

                      <Field label={t.workMode}>
                        <select value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)} className="input-field">
                          <option value="any">Any</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="onsite">On-site</option>
                        </select>
                      </Field>

                      <Field label={t.level}>
                        <select value={level} onChange={(event) => setLevel(event.target.value as ExperienceLevel)} className="input-field">
                          <option value="any">Any</option>
                          <option value="junior">Junior</option>
                          <option value="mid">Mid</option>
                          <option value="senior">Senior</option>
                        </select>
                      </Field>

                      <Field label={t.category}>
                        <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field">
                          {categoryOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label={t.contract}>
                        <select value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)} className="input-field">
                          <option value="any">Any</option>
                          <option value="freelance">Freelance</option>
                          <option value="contract">Contract</option>
                          <option value="part-time">Part-time</option>
                          <option value="full-time">Full-time</option>
                        </select>
                      </Field>

                      <Field label={t.language}>
                        <select value={jobLanguage} onChange={(event) => setJobLanguage(event.target.value as OpportunityLanguage)} className="input-field">
                          <option value="any">Any</option>
                          <option value="pt">Português</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </Field>

                      <Field label={t.minBudget}>
                        <input
                          value={minBudget}
                          onChange={(event) => setMinBudget(event.target.value)}
                          className="input-field"
                          placeholder="Ex: 1200"
                          inputMode="numeric"
                        />
                      </Field>

                      <Field label={t.dateRange}>
                        <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="input-field">
                          {dateOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="panel-inner p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wide muted">{t.sources}</span>
                        <span className="text-xs font-bold muted">{selectedSources.length} selected</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {sourceOptions.map((source) => {
                          const active = selectedSources.includes(source);

                          return (
                            <button
                              key={source}
                              type="button"
                              onClick={() => toggleSource(source)}
                              className={`badge ${active ? "badge-blue" : "badge-gray"}`}
                            >
                              {source}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <Field label={t.schedule}>
                        <select value={scheduleEvery} onChange={(event) => setScheduleEvery(event.target.value)} className="input-field min-w-44">
                          {scheduleOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </Field>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={clearFilters} className="btn btn-soft">
                          <RotateCcw size={16} />
                          {t.clearFilters}
                        </button>

                        <button type="button" onClick={saveSearch} className="btn btn-soft">
                          <Save size={16} />
                          {t.saveSearch}
                        </button>

                        <button type="button" onClick={scheduleSearch} className="btn btn-soft">
                          <CalendarClock size={16} />
                          {t.scheduleSearch}
                        </button>

                        <button type="button" onClick={runPipeline} disabled={isRunning} className="btn btn-primary">
                          <Play size={17} />
                          {t.runPipeline}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <RunnerPanel
                    t={t}
                    isRunning={isRunning}
                    progress={progress}
                    runStats={runStats}
                    onRun={runPipeline}
                    onCancel={cancelPipeline}
                  />

                  <LogsPanel title={t.logs} logs={logs} />
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-4">
                <MetricCard label={t.newToday} value={stats.newToday.toString()} />
                <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
                <MetricCard label={t.applications} value={stats.applications.toString()} />
                <MetricCard label={t.pending} value={stats.pending.toString()} />
              </section>

              <ResultsAndDetail
                jobs={filteredOpportunities}
                selectedOpportunity={selectedOpportunity}
                uiLanguage={uiLanguage}
                t={t}
                selectedStatus={selectedStatus}
                listSearch={listSearch}
                setListSearch={setListSearch}
                setSelectedStatus={setSelectedStatus}
                setSelectedOpportunityId={setSelectedOpportunityId}
                updateOpportunityStatus={updateOpportunityStatus}
                generateProposal={generateProposal}
              />
            </section>
          ) : null}

          {activeView === "opportunities" ? (
            <ResultsAndDetail
              jobs={filteredOpportunities}
              selectedOpportunity={selectedOpportunity}
              uiLanguage={uiLanguage}
              t={t}
              selectedStatus={selectedStatus}
              listSearch={listSearch}
              setListSearch={setListSearch}
              setSelectedStatus={setSelectedStatus}
              setSelectedOpportunityId={setSelectedOpportunityId}
              updateOpportunityStatus={updateOpportunityStatus}
              generateProposal={generateProposal}
            />
          ) : null}

          {activeView === "pipeline" ? (
            <KanbanView
              opportunities={opportunities}
              uiLanguage={uiLanguage}
              setSelectedOpportunityId={setSelectedOpportunityId}
              setActiveView={setActiveView}
            />
          ) : null}

          {activeView === "saved" ? (
            <section className="panel p-4">
              <h2 className="text-base font-black">{viewLabels[uiLanguage].saved}</h2>
              <p className="mt-1 text-sm muted">Buscas reutilizáveis com frequência, fontes e score mínimo.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {savedSearches.map((search) => (
                  <article key={search} className="surface p-4">
                    <div className="font-black">{search}</div>
                    <div className="mt-2 text-sm muted">Fontes: Remotive, Remote OK, Adzuna, RSS</div>
                    <div className="mt-1 text-sm muted">Score mínimo: 70%</div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={runPipeline} className="btn btn-primary flex-1">
                        <Play size={15} />
                        Rodar
                      </button>
                      <button onClick={scheduleSearch} className="btn btn-soft flex-1">
                        <CalendarClock size={15} />
                        Agendar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === "applications" ? (
            <section className="panel p-4">
              <h2 className="text-base font-black">{viewLabels[uiLanguage].applications}</h2>
              <p className="mt-1 text-sm muted">Oportunidades que já avançaram para candidatura, conversa ou proposta.</p>

              <div className="mt-4 grid gap-3">
                {applicationOpportunities.length ? (
                  applicationOpportunities.map((job) => (
                    <OpportunityCard
                      key={job.id}
                      job={job}
                      uiLanguage={uiLanguage}
                      t={t}
                      statusLabel={statusLabels[uiLanguage][job.status]}
                      onDetails={() => {
                        setSelectedOpportunityId(job.id);
                        setActiveView("opportunities");
                      }}
                      onSave={() => updateOpportunityStatus(job.id, "selected")}
                      onApply={() => updateOpportunityStatus(job.id, "applied")}
                      onProposal={() => generateProposal(job)}
                    />
                  ))
                ) : (
                  <div className="surface p-4 text-sm muted">Ainda não há candidaturas enviadas.</div>
                )}
              </div>
            </section>
          ) : null}

          {activeView === "templates" ? (
            <section className="panel p-4">
              <h2 className="text-base font-black">{viewLabels[uiLanguage].templates}</h2>
              <p className="mt-1 text-sm muted">Modelos rápidos para candidatura e proposta freelance.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {["Profissional direto", "Freelance curto", "Follow-up após candidatura"].map((template) => (
                  <article key={template} className="surface p-4">
                    <div className="font-black">{template}</div>
                    <p className="mt-2 text-sm leading-6 muted">
                      Gera uma mensagem ajustada à oportunidade selecionada, com foco em skills, disponibilidade e próximo passo.
                    </p>
                    <button className="btn btn-soft mt-4 w-full">
                      <FileText size={15} />
                      Usar template
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === "reports" ? (
            <section className="grid gap-4">
              <section className="grid gap-3 md:grid-cols-5">
                <MetricCard label="Total" value={stats.total.toString()} />
                <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
                <MetricCard label={t.applications} value={stats.applications.toString()} />
                <MetricCard label={t.pending} value={stats.pending.toString()} />
                <MetricCard label={t.consulted} value={runStats.consulted.toString()} />
              </section>

              <section className="panel p-4">
                <h2 className="text-base font-black">Skills mais pedidas</h2>
                <p className="mt-1 text-sm muted">Análise simples baseada nos resultados atuais.</p>

                <div className="mt-4 grid gap-2 md:grid-cols-4">
                  {topTags.map(([tag, count]) => (
                    <div key={tag} className="surface flex items-center justify-between p-3">
                      <span className="font-bold">{tag}</span>
                      <span className="badge badge-blue">{count}</span>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {activeView === "settings" ? (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="panel p-4">
                <h2 className="text-base font-black">{viewLabels[uiLanguage].settings}</h2>
                <p className="mt-1 text-sm muted">Preferências base da plataforma.</p>

                <div className="mt-4 grid gap-3">
                  <Field label="Idioma da interface">
                    <select value={uiLanguage} onChange={(event) => setUiLanguage(event.target.value as AppLanguage)} className="input-field">
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </Field>

                  <Field label={t.schedule}>
                    <select value={scheduleEvery} onChange={(event) => setScheduleEvery(event.target.value)} className="input-field">
                      {scheduleOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="panel p-4">
                <h2 className="text-base font-black">{t.sources}</h2>
                <p className="mt-1 text-sm muted">Ativa ou desativa fontes para a execução do pipeline.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sourceOptions.map((source) => {
                    const active = selectedSources.includes(source);

                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => toggleSource(source)}
                        className={`badge ${active ? "badge-blue" : "badge-gray"}`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ResultsAndDetail({
  jobs,
  selectedOpportunity,
  uiLanguage,
  t,
  selectedStatus,
  listSearch,
  setListSearch,
  setSelectedStatus,
  setSelectedOpportunityId,
  updateOpportunityStatus,
  generateProposal
}: {
  jobs: Job[];
  selectedOpportunity?: Job;
  uiLanguage: AppLanguage;
  t: Record<string, string>;
  selectedStatus: JobStatus | "all";
  listSearch: string;
  setListSearch: (value: string) => void;
  setSelectedStatus: (value: JobStatus | "all") => void;
  setSelectedOpportunityId: (value: string) => void;
  updateOpportunityStatus: (jobId: string, status: JobStatus) => void;
  generateProposal: (job: Job) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="panel p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black">{t.results}</h2>
            <p className="text-sm muted">{jobs.length} oportunidades filtradas</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="surface flex items-center gap-2 px-3 py-2">
              <Search size={16} className="muted" />
              <input
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="min-w-72 bg-transparent text-sm outline-none"
              />
            </label>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as JobStatus | "all")}
              className="input-field sm:w-52"
            >
              <option value="all">All</option>
              {pipelineStatuses.map((status) => (
                <option key={status} value={status}>{statusLabels[uiLanguage][status]}</option>
              ))}
              <option value="ignored">{statusLabels[uiLanguage].ignored}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          {jobs.map((job) => (
            <OpportunityCard
              key={job.id}
              job={job}
              uiLanguage={uiLanguage}
              t={t}
              statusLabel={statusLabels[uiLanguage][job.status]}
              onDetails={() => setSelectedOpportunityId(job.id)}
              onSave={() => updateOpportunityStatus(job.id, "selected")}
              onApply={() => updateOpportunityStatus(job.id, "applied")}
              onProposal={() => generateProposal(job)}
            />
          ))}
        </div>
      </div>

      <aside className="panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black">{t.detail}</h2>
            <p className="text-sm muted">Análise de compatibilidade</p>
          </div>
          <Target size={19} className="text-blue-700" />
        </div>

        {selectedOpportunity ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{selectedOpportunity.title}</h3>
                <span className="badge badge-blue">{selectedOpportunity.matchScore}%</span>
              </div>

              <p className="text-sm muted">
                {selectedOpportunity.company} · {selectedOpportunity.location}
              </p>

              <p className="mt-3 text-sm leading-6 muted">{selectedOpportunity.summary}</p>
            </div>

            <InfoBlock title={t.nextAction} items={[selectedOpportunity.nextAction]} />
            <InfoBlock title={t.strengths} items={selectedOpportunity.strengths} />
            <InfoBlock title={t.gaps} items={selectedOpportunity.gaps} />

            <div className="grid gap-2">
              <button onClick={() => generateProposal(selectedOpportunity)} className="btn btn-success">
                {t.proposal}
              </button>

              <a href={selectedOpportunity.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-soft">
                {t.openSource}
                <ExternalLink size={16} />
              </a>

              <button onClick={() => updateOpportunityStatus(selectedOpportunity.id, "ignored")} className="btn btn-soft">
                {t.ignore}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm muted">{t.emptyDetail}</p>
        )}
      </aside>
    </section>
  );
}

function OpportunityCard({
  job,
  uiLanguage,
  t,
  statusLabel,
  onDetails,
  onSave,
  onApply,
  onProposal
}: {
  job: Job;
  uiLanguage: AppLanguage;
  t: Record<string, string>;
  statusLabel: string;
  onDetails: () => void;
  onSave: () => void;
  onApply: () => void;
  onProposal: () => void;
}) {
  const matchLabel = uiLanguage === "es" ? "Match" : "Match";

  return (
    <article className="surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="badge badge-blue">{matchLabel}: {job.matchScore}%</span>
            <span className="badge badge-gray">{job.source}</span>
            <span className="badge badge-green">{statusLabel}</span>
          </div>

          <h3 className="text-base font-black">{job.title}</h3>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm muted">
            <span>{job.company}</span>
            <span>{job.location}</span>
            <span>{job.budgetLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 size={14} />
              {job.postedAt}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 muted">{job.summary}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span key={tag} className="badge badge-gray">{tag}</span>
            ))}
          </div>
        </div>

        <div className="grid min-w-48 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onDetails} className="btn btn-soft">
              {t.viewDetails}
            </button>

            <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-soft">
              {t.viewAd}
              <ExternalLink size={14} />
            </a>
          </div>

          <button onClick={onSave} className="btn btn-soft">
            {t.save}
          </button>

          <button onClick={onApply} className="btn btn-primary">
            {t.apply}
          </button>

          <button onClick={onProposal} className="btn btn-success">
            {t.proposal}
          </button>
        </div>
      </div>
    </article>
  );
}

function RunnerPanel({
  t,
  isRunning,
  progress,
  runStats,
  onRun,
  onCancel
}: {
  t: Record<string, string>;
  isRunning: boolean;
  progress: number;
  runStats: RunStats;
  onRun: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">{t.pipelineRunner}</h2>
          <p className="text-sm muted">
            {runStats.lastRun ? `${t.lastRun}: ${runStats.lastRun}` : t.never}
          </p>
        </div>
        <Zap className="text-blue-700" size={20} />
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-400/30">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniMetric label={t.found} value={runStats.found.toString()} />
        <MiniMetric label={t.duplicates} value={runStats.duplicates.toString()} />
        <MiniMetric label={t.approved} value={runStats.approved.toString()} />
        <MiniMetric label={t.consulted} value={runStats.consulted.toString()} />
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onRun} disabled={isRunning} className="btn btn-dark flex-1">
          <Play size={16} />
          {t.runAgain}
        </button>

        <button onClick={onCancel} disabled={!isRunning} className="btn btn-soft flex-1 disabled:opacity-50">
          <Square size={14} />
          {t.cancelRun}
        </button>
      </div>
    </section>
  );
}

function LogsPanel({ title, logs }: { title: string; logs: string[] }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-black">{title}</h2>
        <ListChecks size={18} className="muted" />
      </div>

      <div className="grid gap-2">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="surface flex items-start gap-2 px-3 py-2 text-sm muted">
            <CheckCircle2 size={15} className={index === 0 ? "mt-0.5 text-blue-700" : "mt-0.5 text-slate-500"} />
            <span>{log}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function KanbanView({
  opportunities,
  uiLanguage,
  setSelectedOpportunityId,
  setActiveView
}: {
  opportunities: Job[];
  uiLanguage: AppLanguage;
  setSelectedOpportunityId: (id: string) => void;
  setActiveView: (view: ViewKey) => void;
}) {
  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">{viewLabels[uiLanguage].pipeline}</h2>
          <p className="text-sm muted">Kanban compacto para acompanhar cada oportunidade.</p>
        </div>
        <Columns3 size={19} className="muted" />
      </div>

      <div className="grid gap-3 xl:grid-cols-7">
        {pipelineStatuses.map((status) => {
          const jobs = opportunities.filter((job) => job.status === status);

          return (
            <div key={status} className="panel-inner p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wide muted">
                  {statusLabels[uiLanguage][status]}
                </h3>
                <span className="badge badge-gray">{jobs.length}</span>
              </div>

              <div className="grid gap-2">
                {jobs.slice(0, 5).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedOpportunityId(job.id);
                      setActiveView("opportunities");
                    }}
                    className="surface p-3 text-left transition hover:border-blue-400"
                  >
                    <div className="text-sm font-black">{job.title}</div>
                    <div className="mt-1 text-xs muted">{job.company}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-black text-blue-700">{job.matchScore}%</span>
                      <span className="text-xs muted">{job.source}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide muted">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm muted">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-black uppercase tracking-wide muted">{title}</h4>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="surface px-3 py-2 text-sm leading-6 muted">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function iconForView(view: ViewKey) {
  switch (view) {
    case "dashboard":
      return <LayoutDashboard size={16} />;
    case "run":
      return <Play size={16} />;
    case "opportunities":
      return <Search size={16} />;
    case "pipeline":
      return <Columns3 size={16} />;
    case "saved":
      return <Bookmark size={16} />;
    case "applications":
      return <Send size={16} />;
    case "templates":
      return <FileText size={16} />;
    case "reports":
      return <BarChart3 size={16} />;
    case "settings":
      return <Settings2 size={16} />;
  }
}

function buildPipelineResults({
  keywords,
  location,
  workMode,
  level,
  category,
  contractType,
  jobLanguage,
  minBudget,
  selectedSources
}: {
  keywords: string;
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  category: string;
  contractType: ContractType;
  jobLanguage: OpportunityLanguage;
  minBudget: string;
  selectedSources: JobSource[];
}) {
  const keywordList = keywords
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const minimumBudget = Number(minBudget);
  const rawJobs = [...initialJobs, ...opportunityBank].filter((job) =>
    selectedSources.includes(job.source)
  );

  const scoredJobs = rawJobs.map((job) => ({
    ...job,
    matchScore: calculateScore(job, {
      keywordList,
      location,
      workMode,
      level,
      category,
      contractType,
      jobLanguage,
      minimumBudget
    }),
    status: (job.status === "ignored" ? "ignored" : "new") as JobStatus
  }));

  const uniqueJobs = new Map<string, Job>();

  for (const job of scoredJobs) {
    const key = `${job.title}-${job.company}`.toLowerCase();
    const current = uniqueJobs.get(key);

    if (!current || job.matchScore > current.matchScore) {
      uniqueJobs.set(key, job);
    }
  }

  const dedupedJobs = Array.from(uniqueJobs.values());
  const approvedJobs = dedupedJobs
    .filter((job) => job.matchScore >= 55)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    found: rawJobs.length,
    duplicates: rawJobs.length - dedupedJobs.length,
    jobs: approvedJobs.length ? approvedJobs : dedupedJobs.slice(0, 5)
  };
}

function calculateScore(
  job: Job,
  filters: {
    keywordList: string[];
    location: string;
    workMode: WorkMode;
    level: ExperienceLevel;
    category: string;
    contractType: ContractType;
    jobLanguage: OpportunityLanguage;
    minimumBudget: number;
  }
) {
  let score = job.matchScore;

  const corpus = [
    job.title,
    job.company,
    job.location,
    job.category,
    job.contractType,
    job.language,
    job.summary,
    ...job.tags
  ]
    .join(" ")
    .toLowerCase();

  for (const keyword of filters.keywordList) {
    if (corpus.includes(keyword)) score += 4;
  }

  if (filters.location && corpus.includes(filters.location.toLowerCase())) score += 4;
  if (filters.workMode !== "any") score += job.workMode === filters.workMode ? 8 : -10;
  if (filters.level !== "any") score += job.level === filters.level ? 7 : -6;
  if (filters.category) score += job.category === filters.category ? 7 : -4;
  if (filters.contractType !== "any") score += job.contractType === filters.contractType ? 7 : -5;
  if (filters.jobLanguage !== "any") score += job.language === filters.jobLanguage ? 6 : -8;
  if (filters.minimumBudget && job.budgetMin && job.budgetMin < filters.minimumBudget) score -= 12;

  return Math.max(35, Math.min(99, Math.round(score)));
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}


