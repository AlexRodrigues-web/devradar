"use client";

import { AuthGate } from "@/components/auth";
import { OnboardingPanel } from "@/components/onboarding";
import { ApplicationsView, CvView, DashboardView, LoopsView, ReportsView, RunView, SavedView, SettingsView, TemplatesView } from "@/components/views";

import { ResultsAndDetail } from "@/components/opportunities";

import { KanbanView } from "@/components/radar";

import { copy,
  i18nFix,
  pipelineSteps,
  statusLabels,
  viewLabels
} from "@/lib/i18n";

import { createProposalApplicationRemote, fetchApplicationsRemote } from "@/lib/applications/applicationActions";
import type { OutreachTemplateType } from "@/lib/outreach";
import type { ApplicationRecord, OutreachMessage } from "@/types/application";
import { fetchRealMetricsRemote, type RealMetrics } from "@/lib/metrics/metricsActions";
import { createOpportunityFollowUpRemote, fetchLoopOpportunitiesRemote, fetchOpportunityEventsRemote, type OpportunityEvent, updateOpportunityStatusRemote } from "@/lib/opportunities/opportunityActions";
import { fetchSavedSearches, saveSavedSearchRemote } from "@/lib/saved-searches/savedSearchActions";
import { fetchRadarResults, sleep } from "@/lib/radar";

import { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  BarChart3,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Columns3,
  FileText,
  Globe2,
  LayoutDashboard,
  Play,
  Search,
  Send,
  Settings2,
} from "lucide-react";

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
import type {
  SavedSearchFilters,
  SavedSearchFrequency,
  SavedSearchInput,
  SavedSearchItem,
  SavedSearchStatus
} from "@/types/saved-search";

type ViewKey =
  | "dashboard"
  | "run"
  | "loops"
  | "opportunities"
  | "pipeline"
  | "saved"
  | "applications"
  | "templates"
  | "reports"
  | "cv"
  | "settings";

type RunStats = {
  found: number;
  duplicates: number;
  approved: number;
  consulted: number;
  duration: string;
  lastRun: string;
};

const sourceOptions: JobSource[] = ["Remotive", "Arbeitnow", "Remote OK", "We Work Remotely", "Adzuna", "Manual"];

const viewOrder: ViewKey[] = [
  "dashboard",
  "run",
  "loops",
  "opportunities",
  "pipeline",
  "saved",
  "applications",
  "templates",
  "reports",
  "cv",
  "settings"
];

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

const locationCountryOptions = [
  { value: "pt", label: "Portugal" },
  { value: "es", label: "Espanha" },
  { value: "eu", label: "Europa" },
  { value: "remote", label: "Remoto" },
  { value: "any", label: "Todas" }
] as const;

const locationOptions = [
  { country: "any", value: "any", label: "Todas as localizações", hint: "Não limita por país, região ou cidade." },

  { country: "remote", value: "remote-worldwide", label: "Remoto · Worldwide", hint: "Vagas remotas globais." },
  { country: "remote", value: "remote-europe", label: "Remoto · Europa", hint: "Vagas remotas compatíveis com candidatos na Europa." },

  { country: "pt", value: "pt-remote-europe", label: "Portugal · Remoto / Europa", hint: "Padrão recomendado para trabalhar de Portugal em vagas remotas europeias." },
  { country: "pt", value: "pt", label: "Portugal · Todo o país", hint: "Portugal inteiro e vagas remotas compatíveis." },
  { country: "pt", value: "pt-norte", label: "Norte", hint: "Porto, Braga, Guimarães, Viana do Castelo, Vila Real e região Norte." },
  { country: "pt", value: "pt-porto", label: "Porto / Vila Nova de Gaia", hint: "Porto, Gaia, Matosinhos, Maia e Grande Porto." },
  { country: "pt", value: "pt-lisboa", label: "Lisboa", hint: "Lisboa, Oeiras, Cascais, Sintra, Amadora e região metropolitana." },
  { country: "pt", value: "pt-centro", label: "Centro", hint: "Coimbra, Aveiro, Leiria, Viseu, Castelo Branco e região Centro." },
  { country: "pt", value: "pt-alentejo", label: "Alentejo", hint: "Évora, Beja, Portalegre e região Alentejo." },
  { country: "pt", value: "pt-algarve", label: "Algarve", hint: "Faro, Portimão, Lagos, Albufeira e região Algarve." },
  { country: "pt", value: "pt-madeira", label: "Madeira", hint: "Madeira e Funchal." },
  { country: "pt", value: "pt-acores", label: "Açores", hint: "Açores, Ponta Delgada, Terceira e ilhas." },

  { country: "es", value: "es", label: "Espanha · Todo o país", hint: "Espanha inteira e vagas remotas compatíveis." },
  { country: "es", value: "es-madrid", label: "Madrid", hint: "Madrid e região metropolitana." },
  { country: "es", value: "es-catalunha", label: "Catalunha / Barcelona", hint: "Barcelona, Catalunha e região." },
  { country: "es", value: "es-valencia", label: "Valência", hint: "Valência e Comunidade Valenciana." },
  { country: "es", value: "es-andaluzia", label: "Andaluzia", hint: "Sevilha, Málaga, Granada, Córdoba e região." },
  { country: "es", value: "es-galiza", label: "Galiza", hint: "Vigo, A Coruña, Santiago e região." },
  { country: "es", value: "es-pais-basco", label: "País Basco", hint: "Bilbao, San Sebastián, Vitória e região." },

  { country: "eu", value: "eu", label: "Europa · Geral", hint: "Vagas europeias e remotas compatíveis com Europa." },
  { country: "eu", value: "eu-west", label: "Europa Ocidental", hint: "Portugal, Espanha, França, Alemanha, Holanda, Bélgica e próximos." },
  { country: "eu", value: "uk-ireland", label: "Reino Unido / Irlanda", hint: "UK, Ireland, London, Dublin e remoto compatível." },
  { country: "eu", value: "dach", label: "DACH", hint: "Alemanha, Áustria, Suíça e região DACH." }
] as const;

function getLocationOptions(country: string) {
  return locationOptions.filter((option) => option.country === country);
}
function getLocationHint(value: string) {
  return locationOptions.find((option) => option.value === value)?.hint ?? "Selecione uma localização.";
}

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

  const [keywords, setKeywords] = useState("react, next.js, wordpress");
  const [locationCountry, setLocationCountry] = useState("pt");
  const [location, setLocation] = useState("pt-remote-europe");
  const [workMode, setWorkMode] = useState<WorkMode>("remote");
  const [level, setLevel] = useState<ExperienceLevel>("junior");
  const [category, setCategory] = useState("any");
  const [contractType, setContractType] = useState<ContractType>("any");
  const [jobLanguage, setJobLanguage] = useState<OpportunityLanguage>("any");
  const [minBudget, setMinBudget] = useState("");
  const [excludedTerms, setExcludedTerms] = useState("senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil");
  const [dateRange, setDateRange] = useState("7d");
  const [scheduleEvery, setScheduleEvery] = useState("manual");
  const [selectedSources, setSelectedSources] = useState<JobSource[]>(["Remotive", "Arbeitnow"]);

  const [opportunities, setOpportunities] = useState<Job[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">("all");
  const [listSearch, setListSearch] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedOpportunityEvents, setSelectedOpportunityEvents] = useState<OpportunityEvent[]>([]);
  const [isLoadingOpportunityEvents, setIsLoadingOpportunityEvents] = useState(false);
  const [applicationRecords, setApplicationRecords] = useState<ApplicationRecord[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [logs, setLogs] = useState<string[]>([copy.pt.pipelineReady]);
  const [runStats, setRunStats] = useState<RunStats>(defaultRunStats);
  const [realMetrics, setRealMetrics] = useState<RealMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchSavedSearches()
      .then((items) => {
        if (!cancelled) {
          setSavedSearches(items);
        }
      })
      .catch((error) => {
        console.error("Failed to load saved searches:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cancelRunRef = useRef(false);
  const t = { ...copy[uiLanguage], ...i18nFix[uiLanguage] };

  useEffect(() => {
    let isMounted = true;

    fetchLoopOpportunitiesRemote(undefined, 50)
      .then((items) => {
        if (!isMounted || !items.length) return;

        const persistedJobs = items
          .map((item) => {
            const snapshot = (item as unknown as { snapshot?: unknown }).snapshot;
            return snapshot ? (snapshot as Job) : (item as unknown as Job);
          })
          .filter((job) => job.id && job.title && job.company && job.source && job.sourceUrl);

        if (!persistedJobs.length) return;

        setOpportunities(persistedJobs);
        setSelectedOpportunityId(persistedJobs[0]?.id ?? null);
        setLogs((current) => [`Inbox persistente carregado: ${persistedJobs.length} oportunidades.`, ...current].slice(0, 8));
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to load persistent inbox:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedOpportunityId) {
      queueMicrotask(() => setSelectedOpportunityEvents([]));
      return;
    }

    let isMounted = true;

    queueMicrotask(() => setIsLoadingOpportunityEvents(true));

    fetchOpportunityEventsRemote(selectedOpportunityId, 30)
      .then((events) => {
        if (!isMounted) return;

        setSelectedOpportunityEvents(events);
      })
      .catch((error) => {
        if (!isMounted) return;

        console.error("Failed to load opportunity events:", error);
        setSelectedOpportunityEvents([]);
      })
      .finally(() => {
        if (!isMounted) return;

        setIsLoadingOpportunityEvents(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOpportunityId]);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      setIsLoadingMetrics(true);

      fetchRealMetricsRemote()
        .then((metrics) => {
          if (!isMounted) {
            return;
          }

          setRealMetrics(metrics);
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          const message = error instanceof Error ? error.message : "Falha ao carregar métricas reais.";
          setLogs((current) => [`Erro nas métricas reais: ${message}`, ...current].slice(0, 8));
        })
        .finally(() => {
          if (!isMounted) {
            return;
          }

          setIsLoadingMetrics(false);
        });
    });

    return () => {
      isMounted = false;
    };
  }, []); // PHASE_8_5_REAL_METRICS_LOAD
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

  const refreshApplications = useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      const records = await fetchApplicationsRemote();
      setApplicationRecords(records);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar candidaturas.";
      setLogs((current) => [`Erro nas candidaturas: ${message}`, ...current].slice(0, 8));
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== "applications") return;

    queueMicrotask(() => {
      void refreshApplications();
    });
  }, [activeView, refreshApplications]);

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


  async function refreshRealMetrics() {
    try {
      const metrics = await fetchRealMetricsRemote();
      setRealMetrics(metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar métricas reais.";
      setLogs((current) => [`Erro nas métricas reais: ${message}`, ...current].slice(0, 8));
    }
  }
  async function updateOpportunityStatus(jobId: string, status: JobStatus) {
    const job = opportunities.find((item) => item.id === jobId);

    if (!job) {
      setLogs((current) => ["Oportunidade não encontrada para guardar status.", ...current].slice(0, 8));
      return;
    }

    try {
      await updateOpportunityStatusRemote(job, status);
      await refreshRealMetrics();
      await refreshApplications();

      setOpportunities((current) =>
        current.map((item) => (item.id === jobId ? { ...item, status } : item))
      );

      setLogs((current) => [`Status guardado no servidor: ${job.title}`, ...current].slice(0, 8));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao guardar status da oportunidade.";
      setLogs((current) => [`Erro ao guardar status: ${message}`, ...current].slice(0, 8));
    }
  }

  function clearFilters() {
    setKeywords("");
    setLocation("any");
    setWorkMode("any");
    setLevel("any");
    setCategory("any");
    setContractType("any");
    setJobLanguage("any");
    setMinBudget("");
    setExcludedTerms("senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil");
    setDateRange("7d");
    setSelectedSources(["Remotive", "Arbeitnow"]);
    setLogs((current) => [t.filtersCleared, ...current].slice(0, 8));
  }

  function normalizeScheduleFrequency(value: string): SavedSearchFrequency {
    if (value === "1h" || value === "3h" || value === "6h" || value === "12h" || value === "daily") {
      return value;
    }

    return "manual";
  }

  function getCurrentSavedSearchFilters(): SavedSearchFilters {
    return {
      keywords,
      locationCountry,
      location,
      workMode,
      level,
      category,
      contractType,
      jobLanguage,
      minBudget,
      excludedTerms,
      dateRange,
      selectedSources
    };
  }

  function buildSavedSearchTitle() {
    return [keywords.trim() || "Oportunidades", workMode !== "any" ? workMode : "", location !== "any" ? location : ""]
      .filter(Boolean)
      .join(" · ");
  }

  function buildSavedSearchInput(frequency: SavedSearchFrequency, status: SavedSearchStatus): SavedSearchInput {
    return {
      title: buildSavedSearchTitle(),
      filters: getCurrentSavedSearchFilters(),
      frequency,
      status
    };
  }

  function upsertSavedSearchState(savedSearch: SavedSearchItem) {
    setSavedSearches((current) => [savedSearch, ...current.filter((item) => item.id !== savedSearch.id)]);
  }

  async function saveSearch() {
    try {
      const savedSearch = await saveSavedSearchRemote(buildSavedSearchInput("manual", "draft"));
      upsertSavedSearchState(savedSearch);
      setLogs((current) => [t.savedSearchOk, ...current].slice(0, 8));
      setActiveView("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao guardar busca.";
      setLogs((current) => [`Erro ao guardar busca: ${message}`, ...current].slice(0, 8));
    }
  }

  async function scheduleSearch(savedSearch?: SavedSearchItem) {
    const frequency = normalizeScheduleFrequency(savedSearch?.frequency && savedSearch.frequency !== "manual" ? savedSearch.frequency : scheduleEvery);
    const activeFrequency = frequency === "manual" ? "daily" : frequency;

    try {
      const saved = await saveSavedSearchRemote(
        savedSearch
          ? {
              id: savedSearch.id,
              title: savedSearch.title,
              filters: savedSearch.filters,
              frequency: activeFrequency,
              status: "active"
            }
          : buildSavedSearchInput(activeFrequency, "active")
      );

      upsertSavedSearchState(saved);
      setLogs((current) => [`${t.scheduledSearchOk} (${activeFrequency})`, ...current].slice(0, 8));
      setActiveView("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao agendar busca.";
      setLogs((current) => [`Erro ao agendar busca: ${message}`, ...current].slice(0, 8));
    }
  }

  function runSavedSearch(savedSearch: SavedSearchItem) {
    setKeywords(savedSearch.filters.keywords);
    setLocationCountry(savedSearch.filters.locationCountry);
    setLocation(savedSearch.filters.location);
    setWorkMode(savedSearch.filters.workMode);
    setLevel(savedSearch.filters.level);
    setCategory(savedSearch.filters.category);
    setContractType(savedSearch.filters.contractType);
    setJobLanguage(savedSearch.filters.jobLanguage);
    setMinBudget(savedSearch.filters.minBudget);
    setExcludedTerms(savedSearch.filters.excludedTerms);
    setDateRange(savedSearch.filters.dateRange);
    setSelectedSources(savedSearch.filters.selectedSources.length ? savedSearch.filters.selectedSources : ["Remotive", "Arbeitnow"]);
    setLogs((current) => [`Busca carregada: ${savedSearch.title}`, ...current].slice(0, 8));
    setActiveView("run");
  }

  async function handleAlerts() {
    if (alertsEnabled) {
      setAlertsEnabled(false);
      setAlertMessage(t.alertsDisabled);
      setLogs((current) => [t.alertsDisabled, ...current].slice(0, 8));
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "granted") {
        setAlertsEnabled(true);
        setAlertMessage(t.alertsEnabledMessage);
        setLogs((current) => [t.alertsEnabledLog, ...current].slice(0, 8));

        new Notification("DevRadar", {
          body: t.alertsEnabledLog
        });

        return;
      }

      setAlertMessage(t.notificationsBlocked);
      setLogs((current) => [t.notificationsBlocked, ...current].slice(0, 8));
      return;
    }

    setAlertsEnabled(true);
    setAlertMessage(t.internalAlertsEnabledMessage);
    setLogs((current) => [t.internalAlertsEnabledLog, ...current].slice(0, 8));
  }


  async function createFollowUp(job: Job) {
    try {
      await createOpportunityFollowUpRemote(job);
      await refreshRealMetrics();

      if (selectedOpportunityId === job.id) {
        const events = await fetchOpportunityEventsRemote(job.id, 30);
        setSelectedOpportunityEvents(events);
      }

      setLogs((current) => [`Follow-up criado: ${job.title}`, ...current].slice(0, 8));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar follow-up.";
      setLogs((current) => [`Erro ao criar follow-up: ${message}`, ...current].slice(0, 8));
    }
  }
  async function generateProposal(job: Job, templateType: OutreachTemplateType = "short_application"): Promise<OutreachMessage | null> {
    try {
      const { outreach } = await createProposalApplicationRemote(job, uiLanguage, templateType);
      await refreshRealMetrics();
      await refreshApplications();

      setOpportunities((current) =>
        current.map((item) => (item.id === job.id ? { ...item, status: "proposal" } : item))
      );

      setLogs((current) => [`Proposta guardada no servidor: ${job.title}`, ...current].slice(0, 8));

      return outreach;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao guardar proposta.";
      setLogs((current) => [`Erro ao guardar proposta: ${message}`, ...current].slice(0, 8));

      return null;
    }
  }

  function cancelRadar() {
    cancelRunRef.current = true;
    setIsRunning(false);
    setProgress(0);
    setCurrentStep("");
    setLogs((current) => [t.pipelineCancelled, ...current].slice(0, 8));
  }

  async function runRadar() {
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

    const result = await fetchRadarResults({
      keywords,
      location,
      workMode,
      level,
      category,
      contractType,
      jobLanguage,
      minBudget,
      selectedSources,
      excludedTerms,
      loopId: "loop-local-default"
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
        highMatchCount > 0 ? `${t.alertsPrefix}: ${highMatchCount} ${t.highMatchOpportunityCount}` : t.noHighMatchAlerts,
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
      new Notification(t.strongOpportunitiesTitle, {
        body: `${highMatchCount} ${t.strongOpportunitiesBodySuffix}`
      });
    }

    setCurrentStep("done");
    setIsRunning(false);
  }
return (
    <AuthGate>
      {({ user, logout, refreshUser }) => (
        user.onboardingStatus !== "completed" ? (
          <OnboardingPanel user={user} onCompleted={refreshUser} />
        ) : (
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

        <section className="content-shell">
          <header className="top-product-bar">
  <div className="top-product-main">
    <div className="top-product-badges">
      <span className="badge badge-gray">DevRadar</span>
      <span className="badge badge-green">{t.mvpBadge}</span>
      <span className="badge badge-blue">{viewLabels[uiLanguage][activeView]}</span>
    </div>

    <h1>{activeView === "run" ? t.runSearchTitle : viewLabels[uiLanguage][activeView]}</h1>

    <p>
      {activeView === "run"
        ? t.runSearchDescription
        : activeView === "dashboard"
          ? t.dashboardText
          : t.subtitle}
    </p>
  </div>


              {/* PHASE 2.1 MOBILE NAV START */}
              <nav className="mobile-view-nav" aria-label="DevRadar mobile navigation">
                {viewOrder.map((view) => (
                  <button
                    key={`mobile-${view}`}
                    type="button"
                    onClick={() => handleNav(view)}
                    className={`mobile-nav-item ${activeView === view ? "mobile-nav-item-active" : ""}`}
                  >
                    {iconForView(view)}
                    <span>{viewLabels[uiLanguage][view]}</span>
                  </button>
                ))}
              </nav>
              {/* PHASE 2.1 MOBILE NAV END */}

  <div className="top-product-actions">
    <div className="top-user-pill" title={user.email}>
      <span>Conta</span>
      <strong>{user.name}</strong>
    </div>

    <button
      type="button"
      onClick={() => { void logout(); }}
      className="btn btn-soft"
    >
      Sair
    </button>

    <label className="top-language-switcher">
      <Globe2 size={16} className="muted" />
      <select
        value={uiLanguage}
        onChange={(event) => setUiLanguage(event.target.value as AppLanguage)}
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
      title={alertMessage || t.enableAlerts}
    >
      <Bell size={16} />
      {alertsEnabled ? t.alertsOn : t.alertsOff}
    </button>

    <button onClick={runRadar} disabled={isRunning} className="btn btn-primary">
      <Play size={17} />
      {isRunning
        ? pipelineSteps.find((step) => step.key === currentStep)?.[uiLanguage] ?? t.runRadar
        : t.runRadar}
    </button>
  </div>
</header>

          {activeView === "dashboard" ? (
            <DashboardView
              t={t}
              uiLanguage={uiLanguage}
              stats={stats}
              opportunities={opportunities}
              statusLabels={statusLabels}
              isRunning={isRunning}
              progress={progress}
              runStats={runStats}
          realMetrics={realMetrics}
          isLoadingMetrics={isLoadingMetrics}
              setSelectedOpportunityId={setSelectedOpportunityId}
              setActiveView={setActiveView}
              updateOpportunityStatus={updateOpportunityStatus}
              generateProposal={generateProposal}
              runRadar={runRadar}
              cancelRadar={cancelRadar}
            />
          ) : null}

          {activeView === "run" ? (
            <RunView
              t={t}
              keywords={keywords}
              setKeywords={setKeywords}
              locationCountry={locationCountry}
              setLocationCountry={setLocationCountry}
              location={location}
              setLocation={setLocation}
              workMode={workMode}
              setWorkMode={setWorkMode}
              level={level}
              setLevel={setLevel}
              category={category}
              setCategory={setCategory}
              contractType={contractType}
              setContractType={setContractType}
              jobLanguage={jobLanguage}
              setJobLanguage={setJobLanguage}
              minBudget={minBudget}
              setMinBudget={setMinBudget}
              excludedTerms={excludedTerms}
              setExcludedTerms={setExcludedTerms}
              dateRange={dateRange}
              setDateRange={setDateRange}
              scheduleEvery={scheduleEvery}
              setScheduleEvery={setScheduleEvery}
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              categoryOptions={categoryOptions}
              locationCountryOptions={locationCountryOptions}
              getLocationOptions={getLocationOptions}
              getLocationHint={getLocationHint}
              sourceOptions={sourceOptions}
              dateOptions={dateOptions}
              scheduleOptions={scheduleOptions}
              clearFilters={clearFilters}
              saveSearch={saveSearch}
              scheduleSearch={scheduleSearch}
              runRadar={runRadar}
              isRunning={isRunning}
              stats={stats}
              progress={progress}
              runStats={runStats}
              cancelRadar={cancelRadar}
              logs={logs}
              filteredOpportunities={filteredOpportunities}
              selectedOpportunity={selectedOpportunity}
        opportunityEvents={selectedOpportunityEvents}
        isLoadingOpportunityEvents={isLoadingOpportunityEvents}
              uiLanguage={uiLanguage}
              selectedStatus={selectedStatus}
              listSearch={listSearch}
              setListSearch={setListSearch}
              setSelectedStatus={setSelectedStatus}
              setSelectedOpportunityId={setSelectedOpportunityId}
              updateOpportunityStatus={updateOpportunityStatus}
              generateProposal={generateProposal}
        generateFollowUp={createFollowUp}
            />
          ) : null}

          {activeView === "loops" ? (
            <LoopsView
              t={t}
              uiLanguage={uiLanguage}
              viewLabels={viewLabels}
            />
          ) : null}

          {activeView === "opportunities" ? (
            <ResultsAndDetail
              jobs={filteredOpportunities}
              selectedOpportunity={selectedOpportunity}
        opportunityEvents={selectedOpportunityEvents}
        isLoadingOpportunityEvents={isLoadingOpportunityEvents}
              uiLanguage={uiLanguage}
              t={t}
              selectedStatus={selectedStatus}
              listSearch={listSearch}
              setListSearch={setListSearch}
              setSelectedStatus={setSelectedStatus}
              setSelectedOpportunityId={setSelectedOpportunityId}
              updateOpportunityStatus={updateOpportunityStatus}
              generateProposal={generateProposal}
        generateFollowUp={createFollowUp}
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
            <SavedView
              t={t}
              uiLanguage={uiLanguage}
              viewLabels={viewLabels}
              savedSearches={savedSearches}
              runSavedSearch={runSavedSearch}
              scheduleSavedSearch={scheduleSearch}
            />
          ) : null}
          {activeView === "applications" ? (
            <ApplicationsView
              t={t}
              uiLanguage={uiLanguage}
              viewLabels={viewLabels}
              applications={applicationRecords}
              isLoadingApplications={isLoadingApplications}
              statusLabels={statusLabels}
              setSelectedOpportunityId={setSelectedOpportunityId}
              setActiveView={setActiveView}
              updateOpportunityStatus={updateOpportunityStatus}
              generateProposal={generateProposal}
            />
          ) : null}
          {activeView === "templates" ? (
            <TemplatesView
              t={t}
              uiLanguage={uiLanguage}
              viewLabels={viewLabels}
            />
          ) : null}
          {activeView === "reports" ? (
            <ReportsView
              t={t}
              stats={stats}
              runStats={runStats}
          realMetrics={realMetrics}
          isLoadingMetrics={isLoadingMetrics}
              topTags={topTags}
            />
          ) : null}
            {activeView === "cv" ? (
              <CvView />
            ) : null}

          {activeView === "settings" ? (
            <SettingsView
              t={t}
              uiLanguage={uiLanguage}
              viewLabels={viewLabels}
              scheduleEvery={scheduleEvery}
              setScheduleEvery={setScheduleEvery}
              setUiLanguage={setUiLanguage}
              sourceOptions={sourceOptions}
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              scheduleOptions={scheduleOptions}
            />
          ) : null}
        </section>
      </div>
    </main>
        )
      )}
    </AuthGate>
  );
}


function iconForView(view: ViewKey) {
  switch (view) {
    case "dashboard":
      return <LayoutDashboard size={16} />;
    case "run":
      return <Play size={16} />;
    case "loops":
      return <span aria-hidden="true">↻</span>;
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
    case "cv":
      return <FileText size={16} />;
    case "settings":
      return <Settings2 size={16} />;
  }
}