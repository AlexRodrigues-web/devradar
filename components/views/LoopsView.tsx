import { CalendarClock, Pause, Play, Plus, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createLoopRemote,
  deleteLoopRemote,
  fetchLoopsRemote,
  fetchLoopRunsRemote,
  updateLoopRemote,
  type LoopFrequency,
  type LoopInput,
  type LoopItem,
  type LoopRunItem
} from "@/lib/loops";
import { fetchRadarResults } from "@/lib/radar";
import { fetchLoopOpportunitiesRemote, type LoopOpportunityItem } from "@/lib/opportunities/opportunityActions";
import type {
  AppLanguage,
  ContractType,
  ExperienceLevel,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "@/types/job";

const historyLabels: Record<AppLanguage, {
  title: string;
  help: string;
  refresh: string;
  loading: string;
  empty: string;
  found: string;
  duplicates: string;
  rejected: string;
  approved: string;
  status: string;
  finishedAt: string;
}> = {
  pt: {
    title: "Histórico de execuções",
    help: "Últimas execuções deste loop com funil encontrado/rejeitado/aprovado.",
    refresh: "Ver histórico",
    loading: "A carregar...",
    empty: "Ainda sem histórico carregado.",
    found: "Encontradas",
    duplicates: "Duplicadas",
    rejected: "Rejeitadas",
    approved: "Aprovadas",
    status: "Status",
    finishedAt: "Finalizado"
  },
  en: {
    title: "Run history",
    help: "Latest runs for this loop with found/rejected/approved funnel.",
    refresh: "Load history",
    loading: "Loading...",
    empty: "No history loaded yet.",
    found: "Found",
    duplicates: "Duplicates",
    rejected: "Rejected",
    approved: "Approved",
    status: "Status",
    finishedAt: "Finished"
  },
  es: {
    title: "Historial de ejecuciones",
    help: "Últimas ejecuciones de este loop con embudo encontrado/rechazado/aprobado.",
    refresh: "Ver historial",
    loading: "Cargando...",
    empty: "Todavía no hay historial cargado.",
    found: "Encontradas",
    duplicates: "Duplicadas",
    rejected: "Rechazadas",
    approved: "Aprobadas",
    status: "Status",
    finishedAt: "Finalizado"
  }
};
const loopDetailLabels: Record<AppLanguage, {
  show: string;
  hide: string;
  title: string;
  opportunitiesTitle: string;
  load: string;
  loading: string;
  empty: string;
  score: string;
  source: string;
  lastSeen: string;
}> = {
  pt: {
    show: "Ver detalhe",
    hide: "Ocultar detalhe",
    title: "Detalhe do Loop",
    opportunitiesTitle: "Oportunidades ligadas ao Loop",
    load: "Atualizar oportunidades",
    loading: "A carregar oportunidades...",
    empty: "Ainda não há oportunidades aprovadas ligadas a este Loop.",
    score: "Score",
    source: "Fonte",
    lastSeen: "Última vez vista"
  },
  en: {
    show: "View detail",
    hide: "Hide detail",
    title: "Loop detail",
    opportunitiesTitle: "Opportunities linked to this Loop",
    load: "Refresh opportunities",
    loading: "Loading opportunities...",
    empty: "There are no approved opportunities linked to this Loop yet.",
    score: "Score",
    source: "Source",
    lastSeen: "Last seen"
  },
  es: {
    show: "Ver detalle",
    hide: "Ocultar detalle",
    title: "Detalle del Loop",
    opportunitiesTitle: "Oportunidades vinculadas al Loop",
    load: "Actualizar oportunidades",
    loading: "Cargando oportunidades...",
    empty: "Todavía no hay oportunidades aprobadas vinculadas a este Loop.",
    score: "Score",
    source: "Fuente",
    lastSeen: "Última vez vista"
  }
};
type LoopsViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  viewLabels: Record<AppLanguage, Record<string, string>>;
};

type LoopFormState = {
  name: string;
  role: string;
  keywords: string;
  technologies: string;
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  contractType: ContractType;
  minBudget: string;
  jobLanguage: OpportunityLanguage;
  frequency: LoopFrequency;
  minScore: string;
  excludedTerms: string;
  selectedSources: JobSource[];
};

const sourceOptions: JobSource[] = ["Remotive", "Arbeitnow", "Remote OK", "We Work Remotely", "Adzuna", "Manual"];

const initialForm: LoopFormState = {
  name: "Frontend Junior Remote Europe",
  role: "Frontend Developer",
  keywords: "React, Next.js, TypeScript",
  technologies: "React, Next.js, TypeScript, WordPress",
  location: "Portugal / Remote Europe",
  workMode: "remote",
  level: "junior",
  contractType: "any",
  minBudget: "",
  jobLanguage: "any",
  frequency: "manual",
  minScore: "60",
  excludedTerms: "senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil",
  selectedSources: ["Remotive", "Arbeitnow"]
};

function getCopy(uiLanguage: AppLanguage) {
  if (uiLanguage === "en") {
    return {
      title: "Real loops",
      description: "Create and control saved search strategies connected to the database.",
      createTitle: "Create loop",
      name: "Loop name",
      role: "Target role",
      keywords: "Keywords",
      location: "Location",
      mode: "Mode",
      level: "Level",
      frequency: "Frequency",
      score: "Minimum score",
      excluded: "Excluded terms",
      sources: "Sources",
      create: "Create loop",
      loading: "Loading loops...",
      empty: "No loops yet.",
      active: "Active",
      paused: "Paused",
      draft: "Draft",
      archived: "Archived",
      activate: "Activate",
      pause: "Pause",
      remove: "Delete",
      manual: "Manual",
      daily: "Daily",
      lastRun: "Last run",
      never: "Never",
      created: "Loop created.",
      updated: "Loop updated.",
      deleted: "Loop deleted.",
      runNow: "Run now",
      running: "Running...",
      runFinished: "Loop run finished"
    };
  }

  if (uiLanguage === "es") {
    return {
      title: "Loops reales",
      description: "Crea y controla estrategias de búsqueda guardadas conectadas a la base de datos.",
      createTitle: "Crear loop",
      name: "Nombre del loop",
      role: "Rol objetivo",
      keywords: "Palabras clave",
      location: "Ubicación",
      mode: "Modalidad",
      level: "Nivel",
      frequency: "Frecuencia",
      score: "Score mínimo",
      excluded: "Términos excluidos",
      sources: "Fuentes",
      create: "Crear loop",
      loading: "Cargando loops...",
      empty: "Todavía no hay loops.",
      active: "Activo",
      paused: "Pausado",
      draft: "Borrador",
      archived: "Archivado",
      activate: "Activar",
      pause: "Pausar",
      remove: "Eliminar",
      manual: "Manual",
      daily: "Diaria",
      lastRun: "Última ejecución",
      never: "Nunca",
      created: "Loop creado.",
      updated: "Loop actualizado.",
      deleted: "Loop eliminado.",
      runNow: "Ejecutar ahora",
      running: "Ejecutando...",
      runFinished: "Ejecución del loop finalizada"
    };
  }

  return {
    title: "Loops reais",
    description: "Cria e controla estratégias de busca salvas ligadas ao banco de dados.",
    createTitle: "Criar loop",
    name: "Nome do loop",
    role: "Cargo alvo",
    keywords: "Palavras-chave",
    location: "Localização",
    mode: "Modalidade",
    level: "Nível",
    frequency: "Frequência",
    score: "Score mínimo",
    excluded: "Termos excluídos",
    sources: "Fontes",
    create: "Criar loop",
    loading: "A carregar loops...",
    empty: "Ainda não há loops.",
    active: "Ativo",
    paused: "Pausado",
    draft: "Rascunho",
    archived: "Arquivado",
    activate: "Ativar",
    pause: "Pausar",
    remove: "Apagar",
    manual: "Manual",
    daily: "Diária",
    lastRun: "Última execução",
    never: "Nunca",
    created: "Loop criado.",
    updated: "Loop atualizado.",
    deleted: "Loop apagado.",
    runNow: "Rodar agora",
    running: "A rodar...",
    runFinished: "Execução do loop concluída"
  };
}

function getStatusLabel(status: string, labels: ReturnType<typeof getCopy>) {
  if (status === "active") return labels.active;
  if (status === "paused") return labels.paused;
  if (status === "archived") return labels.archived;
  return labels.draft;
}

function getExtendedCopy(uiLanguage: AppLanguage) {
  const extraLabels = {
    pt: {
      technologies: "Tecnologias",
      contract: "Contrato",
      budget: "Salário mínimo",
      language: "Idioma",
      edit: "Editar",
      saveEdit: "Guardar alterações",
      cancelEdit: "Cancelar",
      duplicate: "Duplicar"
    },
    en: {
      technologies: "Technologies",
      contract: "Contract",
      budget: "Minimum salary",
      language: "Language",
      edit: "Edit",
      saveEdit: "Save changes",
      cancelEdit: "Cancel",
      duplicate: "Duplicate"
    },
    es: {
      technologies: "Tecnologías",
      contract: "Contrato",
      budget: "Salario mínimo",
      language: "Idioma",
      edit: "Editar",
      saveEdit: "Guardar cambios",
      cancelEdit: "Cancelar",
      duplicate: "Duplicar"
    }
  };

  return {
    ...getCopy(uiLanguage),
    ...extraLabels[uiLanguage]
  };
}
function getFrequencyLabel(frequency: string, labels: ReturnType<typeof getCopy>) {
  if (frequency === "manual") return labels.manual;
  if (frequency === "daily") return labels.daily;
  return frequency;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readSources(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value.filter((item): item is string => typeof item === "string").join(", ");
}

function normalizeWorkMode(value: unknown): WorkMode {
  return value === "remote" || value === "hybrid" || value === "onsite" || value === "any" ? value : "any";
}

function normalizeLevel(value: unknown): ExperienceLevel {
  return value === "junior" || value === "mid" || value === "senior" || value === "any" ? value : "any";
}

function normalizeContractType(value: unknown): ContractType {
  return value === "freelance" || value === "contract" || value === "part-time" || value === "full-time" || value === "any" ? value : "any";
}

function normalizeOpportunityLanguage(value: unknown): OpportunityLanguage {
  return value === "pt" || value === "en" || value === "es" || value === "any" ? value : "any";
}

function normalizeSources(value: unknown): JobSource[] {
  if (!Array.isArray(value)) {
    return sourceOptions;
  }

  const items = value.filter((item): item is JobSource => typeof item === "string" && sourceOptions.includes(item as JobSource));
  return items.length ? items : sourceOptions;
}

function readFilterString(filters: LoopItem["filters"], key: string, fallback: string) {
  return readString(filters[key], fallback);
}

function getRunDiagnosis(run: LoopRunItem, language: AppLanguage) {
  if (run.approved > 0) {
    const text = {
      pt: `${run.approved} oportunidade(s) aprovadas. Abre a Inbox para rever os resultados.`,
      en: `${run.approved} approved opportunit(y/ies). Open the Inbox to review results.`,
      es: `${run.approved} oportunidad(es) aprobadas. Abre la Inbox para revisar resultados.`
    };

    return text[language];
  }

  if (run.found > 0 && run.rejected > 0) {
    const text = {
      pt: `${run.found} encontradas, mas ${run.rejected} rejeitadas. Os critérios parecem demasiado restritivos.`,
      en: `${run.found} found, but ${run.rejected} rejected. The criteria look too restrictive.`,
      es: `${run.found} encontradas, pero ${run.rejected} rechazadas. Los criterios parecen demasiado restrictivos.`
    };

    return text[language];
  }

  const text = {
    pt: "Sem oportunidades encontradas nesta execução.",
    en: "No opportunities found in this run.",
    es: "No se encontraron oportunidades en esta ejecución."
  };

  return text[language];
}
function formatRunDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-PT");
}
function buildRadarInputFromLoop(loop: LoopItem) {
  const filters = loop.filters;

  return {
    keywords: [readFilterString(filters, "keywords", ""), readFilterString(filters, "technologies", "")].filter(Boolean).join(", "),
    location: readFilterString(filters, "location", ""),
    workMode: normalizeWorkMode(filters.workMode),
    level: normalizeLevel(filters.level),
    category: readFilterString(filters, "category", "any"),
    contractType: normalizeContractType(filters.contractType),
    jobLanguage: normalizeOpportunityLanguage(filters.jobLanguage),
    minBudget: String(filters.minBudget ?? ""),
    excludedTerms: readFilterString(filters, "excludedTerms", ""),
    selectedSources: normalizeSources(filters.selectedSources ?? filters.sources),
    loopId: loop.id
  };
}
function normalizeLoopFrequency(value: unknown): LoopFrequency {
  return value === "manual" || value === "1h" || value === "3h" || value === "6h" || value === "12h" || value === "daily" ? value : "manual";
}
function formFromLoop(loop: LoopItem): LoopFormState {
  const filters = loop.filters;

  return {
    name: loop.name,
    role: loop.role,
    keywords: readFilterString(filters, "keywords", ""),
    technologies: readFilterString(filters, "technologies", ""),
    location: readFilterString(filters, "location", ""),
    workMode: normalizeWorkMode(filters.workMode),
    level: normalizeLevel(filters.level),
    contractType: normalizeContractType(filters.contractType),
    minBudget: String(filters.minBudget ?? ""),
    jobLanguage: normalizeOpportunityLanguage(filters.jobLanguage),
    frequency: normalizeLoopFrequency(loop.frequency),
    minScore: String(loop.minScore || 60),
    excludedTerms: readFilterString(filters, "excludedTerms", ""),
    selectedSources: normalizeSources(filters.selectedSources ?? filters.sources)
  };
}
function buildLoopInput(form: LoopFormState): LoopInput {
  return {
    name: form.name.trim() || initialForm.name,
    role: form.role.trim() || initialForm.role,
    status: "active",
    frequency: form.frequency,
    automationMode: "manual-review",
    minScore: Number(form.minScore) || 60,
    filters: {
      keywords: form.keywords,
      technologies: form.technologies,
      locationCountry: "pt",
      location: form.location,
      workMode: form.workMode,
      level: form.level,
      category: "any",
      contractType: form.contractType,
      jobLanguage: form.jobLanguage,
      minBudget: form.minBudget,
      excludedTerms: form.excludedTerms,
      dateRange: "7d",
      selectedSources: form.selectedSources
    },
    active: true
  };
}

export function LoopsView({ t, uiLanguage, viewLabels }: LoopsViewProps) {
  const labels = useMemo(() => getExtendedCopy(uiLanguage), [uiLanguage]);
  const historyCopy = historyLabels[uiLanguage];
  const detailCopy = loopDetailLabels[uiLanguage];
  const [loops, setLoops] = useState<LoopItem[]>([]);
  const [form, setForm] = useState<LoopFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [runningId, setRunningId] = useState("");
  const [runsByLoopId, setRunsByLoopId] = useState<Record<string, LoopRunItem[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState("");
  const [editingLoopId, setEditingLoopId] = useState("");
  const [selectedLoopId, setSelectedLoopId] = useState("");
  const [opportunitiesByLoopId, setOpportunitiesByLoopId] = useState<Record<string, LoopOpportunityItem[]>>({});
  const [opportunitiesLoadingId, setOpportunitiesLoadingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadLoops() {
    try {
      setLoading(true);
      setError("");
      const items = await fetchLoopsRemote();
      setLoops(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar loops.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const items = await fetchLoopsRemote();

        if (mounted) {
          setLoops(items);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Erro ao carregar loops.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(field: keyof LoopFormState, value: string) {
    setMessage("");
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSource(source: JobSource) {
    setMessage("");
    setError("");
    setForm((current) => {
      const selectedSources = current.selectedSources.includes(source)
        ? current.selectedSources.filter((item) => item !== source)
        : [...current.selectedSources, source];

      return {
        ...current,
        selectedSources: selectedSources.length ? selectedSources : [source]
      };
    });
  }


  async function createLoop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (editingLoopId) {
        const updated = await updateLoopRemote(editingLoopId, buildLoopInput(form));
        setLoops((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setEditingLoopId("");
        setForm(initialForm);
        setMessage(labels.updated);
      } else {
        const created = await createLoopRemote(buildLoopInput(form));
        setLoops((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        setMessage(labels.created);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar loop.");
    } finally {
      setSaving(false);
    }
  }
  function startEditLoop(loop: LoopItem) {
    setMessage("");
    setError("");
    setEditingLoopId(loop.id);
    setForm(formFromLoop(loop));
  }

  function cancelEditLoop() {
    setMessage("");
    setError("");
    setEditingLoopId("");
    setForm(initialForm);
  }

  async function duplicateLoop(loop: LoopItem) {
    try {
      setBusyId(loop.id);
      setMessage("");
      setError("");

      const sourceForm = formFromLoop(loop);
      const duplicated = await createLoopRemote({
        ...buildLoopInput({
          ...sourceForm,
          name: `${sourceForm.name} copy`
        }),
        status: "active",
        active: true
      });

      setLoops((current) => [duplicated, ...current.filter((item) => item.id !== duplicated.id)]);
      setMessage(labels.created);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Erro ao duplicar loop.");
    } finally {
      setBusyId("");
    }
  }
  async function setLoopPaused(loop: LoopItem, paused: boolean) {
    try {
      setBusyId(loop.id);
      setMessage("");
      setError("");

      const updated = await updateLoopRemote(loop.id, {
        status: paused ? "paused" : "active",
        active: !paused
      });

      setLoops((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(labels.updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar loop.");
    } finally {
      setBusyId("");
    }
  }

  async function loadLoopOpportunities(loopId: string) {
    try {
      setOpportunitiesLoadingId(loopId);
      setError("");

      const items = await fetchLoopOpportunitiesRemote(loopId, 10);
      setOpportunitiesByLoopId((current) => ({
        ...current,
        [loopId]: items
      }));
    } catch (opportunitiesError) {
      setError(opportunitiesError instanceof Error ? opportunitiesError.message : "Erro ao carregar oportunidades do Loop.");
    } finally {
      setOpportunitiesLoadingId("");
    }
  }

  function toggleLoopDetail(loop: LoopItem) {
    const nextLoopId = selectedLoopId === loop.id ? "" : loop.id;
    setSelectedLoopId(nextLoopId);

    if (nextLoopId) {
      void loadLoopRuns(loop.id);
      void loadLoopOpportunities(loop.id);
    }
  }
  async function loadLoopRuns(loopId: string) {
    try {
      setHistoryLoadingId(loopId);
      setError("");

      const runs = await fetchLoopRunsRemote(loopId, 5);
      setRunsByLoopId((current) => ({
        ...current,
        [loopId]: runs
      }));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Erro ao carregar histórico do loop.");
    } finally {
      setHistoryLoadingId("");
    }
  }
  async function runLoop(loop: LoopItem) {
    try {
      setRunningId(loop.id);
      setBusyId(loop.id);
      setMessage("");
      setError("");

      const result = await fetchRadarResults(buildRadarInputFromLoop(loop));
      setMessage(`${labels.runFinished}: ${result.approved}/${result.found} · ${result.loopRunId ?? "sem run id"}`);
      await loadLoops();
      await loadLoopRuns(loop.id);
      await loadLoopOpportunities(loop.id);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Erro ao rodar loop.");
    } finally {
      setRunningId("");
      setBusyId("");
    }
  }
  async function removeLoop(loop: LoopItem) {
    const confirmed = window.confirm(`${labels.remove}: ${loop.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(loop.id);
      setMessage("");
      setError("");

      await deleteLoopRemote(loop.id);
      setLoops((current) => current.filter((item) => item.id !== loop.id));
      setMessage(labels.deleted);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro ao apagar loop.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form className="panel p-4" onSubmit={createLoop} aria-label={labels.createTitle}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="badge badge-blue">{viewLabels[uiLanguage].loops ?? labels.title}</span>
            <h2 className="mt-3 text-base font-black">{labels.createTitle}</h2>
            <p className="mt-1 text-sm muted">{labels.description}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary focus-visible:outline" type="submit" disabled={saving} aria-label={editingLoopId ? labels.saveEdit : labels.create}>
            <Plus size={15} />
            {saving ? "..." : editingLoopId ? labels.saveEdit : labels.create}
          </button>
          {editingLoopId ? (
            <button className="btn btn-soft focus-visible:outline" type="button" onClick={() => cancelEditLoop()} aria-label={labels.cancelEdit}>
              {labels.cancelEdit}
            </button>
          ) : null}
        </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            {labels.name}
            <input className="input-field" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.role}
            <input className="input-field" value={form.role} onChange={(event) => updateField("role", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            {labels.keywords}
            <input className="input-field" value={form.keywords} onChange={(event) => updateField("keywords", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            {labels.technologies}
            <input className="input-field" value={form.technologies} onChange={(event) => updateField("technologies", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.location}
            <input className="input-field" value={form.location} onChange={(event) => updateField("location", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.frequency}
            <select className="input-field" value={form.frequency} onChange={(event) => updateField("frequency", event.target.value)}>
              <option value="manual">{labels.manual}</option>
              <option value="1h">1h</option>
              <option value="3h">3h</option>
              <option value="6h">6h</option>
              <option value="12h">12h</option>
              <option value="daily">{labels.daily}</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.mode}
            <select className="input-field" value={form.workMode} onChange={(event) => updateField("workMode", event.target.value)}>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
              <option value="any">Any</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.level}
            <select className="input-field" value={form.level} onChange={(event) => updateField("level", event.target.value)}>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="any">Any</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            {labels.contract}
            <select className="input-field" value={form.contractType} onChange={(event) => updateField("contractType", event.target.value)}>
              <option value="any">Any</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.budget}
            <input className="input-field" type="number" min="0" value={form.minBudget} onChange={(event) => updateField("minBudget", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.language}
            <select className="input-field" value={form.jobLanguage} onChange={(event) => updateField("jobLanguage", event.target.value)}>
              <option value="any">Any</option>
              <option value="pt">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            {labels.score}
            <input className="input-field" type="number" min="0" max="100" value={form.minScore} onChange={(event) => updateField("minScore", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            {labels.excluded}
            <textarea className="input-field" value={form.excludedTerms} onChange={(event) => updateField("excludedTerms", event.target.value)} />
          </label>
        </div>

        <div className="mt-4">
          <div className="text-sm font-bold">{t.sourcesLabel ?? labels.sources}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sourceOptions.map((source) => (
              <button
                key={source}
                className={`btn ${form.selectedSources.includes(source) ? "btn-primary" : "btn-soft"}`}
                type="button"
                onClick={() => toggleSource(source)}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {message ? <div className="surface mt-4 p-3 text-sm">{message}</div> : null}
        {error ? <div className="surface mt-4 p-3 text-sm text-red-600">{error}</div> : null}
      </form>

      <section className="panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="badge badge-green">{loops.length} loops</span>
            <h2 className="mt-3 text-base font-black">{viewLabels[uiLanguage].loops ?? labels.title}</h2>
            <p className="mt-1 text-sm muted">{labels.description}</p>
          </div>
          <button className="btn btn-soft" type="button" onClick={() => void loadLoops()} disabled={loading}>
            <RotateCw size={15} />
            {loading ? "..." : "Sync"}
          </button>
        </div>

        {loading ? <div className="surface mt-4 p-4 text-sm muted">{labels.loading}</div> : null}

        {!loading && loops.length === 0 ? <div className="surface mt-4 p-4 text-sm muted">{labels.empty}</div> : null}

        {!loading && loops.length ? (
          <div className="mt-4 grid gap-3">
            {loops.map((loop) => (
              <article key={loop.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{loop.name}</div>
                    <div className="mt-1 text-sm muted">{loop.role}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-blue">{getStatusLabel(loop.status, labels)}</span>
                    <span className="badge badge-gray">
                      <CalendarClock size={13} />
                      {getFrequencyLabel(loop.frequency, labels)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div className="muted">{labels.keywords}: {readString(loop.filters.keywords, "any")}</div>
                  <div className="muted">{labels.location}: {readString(loop.filters.location, "any")}</div>
                  <div className="muted">{labels.sources}: {readSources(loop.filters.selectedSources) || readSources(loop.filters.sources) || "any"}</div>
                  <div className="muted">{labels.score}: {loop.minScore}</div>
                  <div className="muted md:col-span-2">{labels.lastRun}: {loop.lastRunAt ? new Date(loop.lastRunAt).toLocaleString("pt-PT") : labels.never}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busyId === loop.id || runningId === loop.id || loop.status !== "active" || !loop.active}
                    onClick={() => void runLoop(loop)}
                  >
                    <Play size={15} />
                    {runningId === loop.id ? labels.running : labels.runNow}
                  </button>
                  {loop.status === "active" && loop.active ? (
                    <button className="btn btn-soft" type="button" disabled={busyId === loop.id} onClick={() => void setLoopPaused(loop, true)}>
                      <Pause size={15} />
                      {labels.pause}
                    </button>
                  ) : (
                    <button className="btn btn-primary" type="button" disabled={busyId === loop.id} onClick={() => void setLoopPaused(loop, false)}>
                      <Play size={15} />
                      {labels.activate}
                    </button>
                  )}
                  <button className="btn btn-soft focus-visible:outline" type="button" disabled={busyId === loop.id} onClick={() => toggleLoopDetail(loop)} aria-label={selectedLoopId === loop.id ? detailCopy.hide : detailCopy.show}>
                    {selectedLoopId === loop.id ? detailCopy.hide : detailCopy.show}
                  </button>
                  <button className="btn btn-soft focus-visible:outline" type="button" disabled={busyId === loop.id} onClick={() => startEditLoop(loop)} aria-label={labels.edit}>
                    {labels.edit}
                  </button>

                  <button className="btn btn-soft focus-visible:outline" type="button" disabled={busyId === loop.id} onClick={() => void duplicateLoop(loop)} aria-label={labels.duplicate}>
                    {labels.duplicate}
                  </button>

                  <button className="btn btn-soft focus-visible:outline" type="button" disabled={busyId === loop.id} onClick={() => void removeLoop(loop)} aria-label={labels.remove}>
                    <Trash2 size={15} />
                    {labels.remove}
                  </button>
                </div>
                <div className="surface mt-4 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black">{historyCopy.title}</div>
                      <div className="mt-1 text-xs muted">{historyCopy.help}</div>
                    </div>
                    <button
                      className="btn btn-soft"
                      type="button"
                      disabled={historyLoadingId === loop.id}
                      onClick={() => void loadLoopRuns(loop.id)}
                    >
                      <RotateCw size={14} />
                      {historyLoadingId === loop.id ? historyCopy.loading : historyCopy.refresh}
                    </button>
                  </div>

                  {runsByLoopId[loop.id]?.length ? (
                    <div className="mt-3 grid gap-2">
                      {runsByLoopId[loop.id].map((run) => (
                        <div key={run.id} className="surface p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold">{historyCopy.status}: {run.status}</span>
                            <span className="muted">{historyCopy.finishedAt}: {formatRunDate(run.finishedAt ?? run.startedAt)}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                            <span>{historyCopy.found}: <strong>{run.found}</strong></span>
                            <span>{historyCopy.duplicates}: <strong>{run.duplicates}</strong></span>
                            <span>{historyCopy.rejected}: <strong>{run.rejected}</strong></span>
                            <span>{historyCopy.approved}: <strong>{run.approved}</strong></span>
                          </div>
                          <div className="mt-2 rounded-2xl border border-white/10 p-2 muted">
                            {getRunDiagnosis(run, uiLanguage)}
                          </div>
                          <div className="mt-2 truncate muted">ID: {run.id}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs muted">
                      {historyLoadingId === loop.id ? historyCopy.loading : historyCopy.empty}
                    </div>
                  )}
                </div>
                {selectedLoopId === loop.id ? (
                  <div className="surface mt-4 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black">{detailCopy.title}</div>
                        <div className="mt-1 text-xs muted">{detailCopy.opportunitiesTitle}</div>
                      </div>
                      <button
                        className="btn btn-soft"
                        type="button"
                        disabled={opportunitiesLoadingId === loop.id}
                        onClick={() => void loadLoopOpportunities(loop.id)}
                      >
                        {opportunitiesLoadingId === loop.id ? detailCopy.loading : detailCopy.load}
                      </button>
                    </div>

                    {opportunitiesByLoopId[loop.id]?.length ? (
                      <div className="mt-3 grid gap-2">
                        {opportunitiesByLoopId[loop.id].map((opportunity) => (
                          <div key={opportunity.id} className="surface p-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold">{opportunity.title}</span>
                              <span className="badge">{detailCopy.score}: {opportunity.matchScore}</span>
                            </div>
                            <div className="mt-1 muted">
                              {opportunity.company} · {opportunity.location || "Remote"} · {detailCopy.source}: {opportunity.source}
                            </div>
                            <div className="mt-1 muted">
                              {detailCopy.lastSeen}: {formatRunDate(opportunity.lastSeenAt ? String(opportunity.lastSeenAt) : null)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs muted">
                        {opportunitiesLoadingId === loop.id ? detailCopy.loading : detailCopy.empty}
                      </div>
                    )}
                  </div>
                ) : null}

              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
