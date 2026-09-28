"use client";

import { useState } from "react";
import { updateOutreachDraftRemote } from "@/lib/applications/applicationActions";
import { outreachTemplateCatalog, type OutreachTemplateType } from "@/lib/outreach";

import type { OpportunityEvent } from "@/lib/opportunities/opportunityActions";
import { ExternalLink, Search, Target } from "lucide-react";

import { InfoBlock } from "@/components/shared";
import { pipelineStatuses, statusLabels } from "@/lib/i18n";
import type { AppLanguage } from "@/types/i18n";
import type { OutreachMessage } from "@/types/application";
import type { Job, JobStatus } from "@/types/job";

import { OpportunityCard } from "./OpportunityCard";

export function ResultsAndDetail({
  jobs,
  selectedOpportunity,
  opportunityEvents = [],
  isLoadingOpportunityEvents = false,
  uiLanguage,
  t,
  selectedStatus,
  listSearch,
  setListSearch,
  setSelectedStatus,
  setSelectedOpportunityId,
  updateOpportunityStatus,
  generateProposal,
  generateFollowUp
}: {
  jobs: Job[];
  selectedOpportunity?: Job;
  opportunityEvents?: OpportunityEvent[];
  isLoadingOpportunityEvents?: boolean;
  uiLanguage: AppLanguage;
  t: Record<string, string>;
  selectedStatus: JobStatus | "all";
  listSearch: string;
  setListSearch: (value: string) => void;
  setSelectedStatus: (value: JobStatus | "all") => void;
  setSelectedOpportunityId: (value: string) => void;
  updateOpportunityStatus: (jobId: string, status: JobStatus) => void;
  generateProposal: (job: Job, templateType?: OutreachTemplateType) => Promise<OutreachMessage | null>;
  generateFollowUp?: (job: Job) => void;
}) {
  const [outreachDraft, setOutreachDraft] = useState<OutreachMessage | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<OutreachTemplateType>("short_application");
  const [copyStatus, setCopyStatus] = useState("");
  const [draftPersistStatus, setDraftPersistStatus] = useState("");

  const outreachEditorCopy = {
    title: t.outreachDraftTitle ?? "Draft de outreach",
    description: t.outreachDraftDescription ?? "Revê, ajusta e copia a mensagem antes de qualquer envio manual.",
    subject: t.outreachDraftSubject ?? "Assunto",
    body: t.outreachDraftBody ?? "Mensagem",
    template: t.outreachTemplateLabel ?? "Template",
    templateHelp: t.outreachTemplateHelp ?? "Escolhe o tipo de mensagem antes de gerar novamente.",
    save: t.saveOutreachDraft ?? "Guardar draft",
    saved: t.outreachDraftSaved ?? "Draft guardado.",
    copy: t.copyOutreachDraft ?? "Copiar mensagem",
    copied: t.outreachDraftCopied ?? "Mensagem copiada.",
    copyError: t.outreachDraftCopyError ?? "Não foi possível copiar automaticamente.",
    persistError: t.outreachDraftPersistError ?? "Não foi possível guardar o draft.",
    draftOnly: t.outreachDraftOnly ?? "Draft guardado como rascunho. Nada foi enviado."
  };

  async function handleGenerateProposal(job: Job, templateType: OutreachTemplateType = selectedTemplateType) {
    const draft = await generateProposal(job, templateType);

    if (draft) {
      setOutreachDraft(draft);
      setCopyStatus("");
      setDraftPersistStatus("");
    }
  }

  async function persistOutreachDraft(action: "updated" | "copied") {
    if (!outreachDraft) return null;

    try {
      const persistedDraft = await updateOutreachDraftRemote({
        outreachId: outreachDraft.id,
        subject: outreachDraft.subject,
        body: outreachDraft.body,
        action
      });

      setOutreachDraft(persistedDraft);
      setDraftPersistStatus(outreachEditorCopy.saved);

      return persistedDraft;
    } catch {
      setDraftPersistStatus(outreachEditorCopy.persistError);

      return null;
    }
  }

  async function saveOutreachDraft() {
    setCopyStatus("");
    await persistOutreachDraft("updated");
  }

  async function copyOutreachDraft() {
    setCopyStatus("");

    const persistedDraft = await persistOutreachDraft("copied");

    if (!persistedDraft) return;

    const message = `${persistedDraft.subject}\n\n${persistedDraft.body}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus(outreachEditorCopy.copied);
    } catch {
      setCopyStatus(outreachEditorCopy.copyError);
    }
  }

  return (
    <section className="jobboard-run-layout opportunities-mobile-layout">
      <div className="panel p-4 opportunities-list-panel">

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between opportunities-header-row">
          <div>
            <h2 className="text-base font-black">{t.results}</h2>
            <p className="text-sm muted">{jobs.length} oportunidades filtradas</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row opportunities-filter-row">
            <label className="surface flex items-center gap-2 px-3 py-2 opportunity-search-box">
              <Search size={16} className="muted" />
              <input
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full min-w-0 bg-transparent text-sm outline-none opportunity-search-input"
              />
            </label>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as JobStatus | "all")}
              className="input-field sm:w-52"
            >
              <option value="all">{t.all}</option>
              {pipelineStatuses.map((status) => (
                <option key={status} value={status}>{statusLabels[uiLanguage][status]}</option>
              ))}
              <option value="ignored">{statusLabels[uiLanguage].ignored}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 opportunities-list">
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
              onProposal={() => { void handleGenerateProposal(job, selectedTemplateType); }}
            />
          ))}
        </div>
      </div>

      <aside className="panel p-4 opportunity-detail-panel">
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
              <div className="mb-2 flex items-center justify-between gap-3 opportunity-detail-title-row">
                <h3 className="text-lg font-black">{selectedOpportunity.title}</h3>
                <span className="badge badge-blue">{selectedOpportunity.matchScore}%</span>
              </div>

              <p className="text-sm muted">
                {selectedOpportunity.company} · {selectedOpportunity.location}
              </p>

              <p className="mt-3 text-sm leading-6 muted">{selectedOpportunity.summary}</p>
            </div>

              <InfoBlock title={t.nextAction} items={[selectedOpportunity.nextAction]} />
              {selectedOpportunity.risks && selectedOpportunity.risks.length > 0 ? (
                <InfoBlock title="Riscos a validar" items={selectedOpportunity.risks} tone="risk" />
              ) : null}
              <InfoBlock title={t.strengths} items={selectedOpportunity.strengths} tone="strength" />
              <InfoBlock title={t.gaps} items={selectedOpportunity.gaps} tone="gap" />
              {outreachDraft ? (
                <div className="surface p-4 outreach-draft-editor-card" data-devradar="outreach-draft-editor">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black">{outreachEditorCopy.title}</div>
                      <p className="mt-1 text-xs leading-5 muted">{outreachEditorCopy.description}</p>
                    </div>
                    <span className="badge max-w-full whitespace-normal break-words text-left leading-5">{outreachEditorCopy.draftOnly}</span>
                  </div>

                  <label className="mt-4 block text-xs font-bold">
                    {outreachEditorCopy.subject}
                    <input
                      className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-transparent p-3 text-sm outline-none"
                      value={outreachDraft.subject}
                      onChange={(event) => setOutreachDraft({ ...outreachDraft, subject: event.target.value })}
                    />
                  </label>

                  <label className="mt-3 block text-xs font-bold">
                    {outreachEditorCopy.body}
                    <textarea
                      rows={8}
                      className="mt-2 min-h-56 w-full min-w-0 resize-y rounded-2xl border border-white/10 bg-transparent p-3 text-sm leading-6 outline-none outreach-draft-textarea"
                      value={outreachDraft.body}
                      onChange={(event) => setOutreachDraft({ ...outreachDraft, body: event.target.value })}
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-soft" onClick={() => { void saveOutreachDraft(); }}>
                      {outreachEditorCopy.save}
                    </button>
                    <button type="button" className="btn btn-soft" onClick={() => { void copyOutreachDraft(); }}>
                      {outreachEditorCopy.copy}
                    </button>
                    {draftPersistStatus ? <span className="text-xs muted">{draftPersistStatus}</span> : null}
                    {copyStatus ? <span className="text-xs muted">{copyStatus}</span> : null}
                  </div>
                </div>
              ) : null}

              <OpportunityTimeline events={opportunityEvents} isLoading={isLoadingOpportunityEvents} />

            <div className="grid gap-2">
              <label className="block" data-devradar="outreach-template-selector">
                <span className="text-xs font-bold uppercase tracking-[0.18em] muted">{outreachEditorCopy.template}</span>
                <select
                  className="input-field mt-2"
                  value={selectedTemplateType}
                  onChange={(event) => setSelectedTemplateType(event.target.value as OutreachTemplateType)}
                >
                  {outreachTemplateCatalog.map((template) => (
                    <option key={template.type} value={template.type}>
                      {template.labels[uiLanguage]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs leading-5 muted">{outreachEditorCopy.templateHelp}</p>
              </label>

              <button onClick={() => { void handleGenerateProposal(selectedOpportunity, selectedTemplateType); }} className="btn btn-success">
                {t.proposal}
              </button>
              {generateFollowUp ? (
                <button onClick={() => generateFollowUp(selectedOpportunity)} className="btn btn-soft">
                  Criar follow-up
                </button>
              ) : null}

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

function OpportunityTimeline({ events, isLoading }: { events: OpportunityEvent[]; isLoading: boolean }) {
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Histórico</p>
          <h4 className="text-sm font-black text-slate-900">Timeline da oportunidade</h4>
        </div>
        <span className="badge badge-blue">{events.length}</span>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm muted">A carregar histórico...</p>
      ) : events.length ? (
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-900">{getOpportunityEventLabel(event)}</p>
                <span className="text-xs font-semibold muted">{formatOpportunityEventDate(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs leading-5 muted">{getOpportunityEventDescription(event)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm muted">Ainda não há eventos registados para esta oportunidade.</p>
      )}
    </div>
  );
}

function getOpportunityEventLabel(event: OpportunityEvent) {
  if (event.eventType === "status_changed") {
    return "Status atualizado";
  }

  if (event.eventType === "proposal_created") {
    return "Proposta criada";
  }

  if (event.eventType === "follow_up_created") {
    return "Follow-up criado";
  }

  return "Evento registado";
}

function getOpportunityEventDescription(event: OpportunityEvent) {
  const details: string[] = [];

  if (event.status) {
    details.push(`Status: ${event.status}`);
  }

  const automationStatus =
    event.metadata && typeof event.metadata.automationStatus === "string"
      ? event.metadata.automationStatus
      : null;

  if (automationStatus) {
    details.push(`Automação: ${automationStatus}`);
  }

  const channel =
    event.metadata && typeof event.metadata.channel === "string"
      ? event.metadata.channel
      : null;

  if (channel) {
    details.push(`Canal: ${channel}`);
  }

  return details.length ? details.join(" · ") : "Evento persistido na base de dados.";
}

function formatOpportunityEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}