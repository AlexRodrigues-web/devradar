"use client";

import { useState } from "react";

import { updateOutreachDraftRemote } from "@/lib/applications/applicationActions";
import { outreachTemplateCatalog, type OutreachTemplateType } from "@/lib/outreach";
import type { ApplicationRecord, OutreachMessage } from "@/types/application";
import type { AppLanguage, Job, JobStatus } from "@/types/job";

type ApplicationsViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  viewLabels: Record<AppLanguage, Record<string, string>>;
  applications: ApplicationRecord[];
  isLoadingApplications: boolean;
  statusLabels: Record<AppLanguage, Record<JobStatus, string>>;
  setSelectedOpportunityId: (id: string) => void;
  setActiveView: (view: "opportunities") => void;
  updateOpportunityStatus: (jobId: string, status: JobStatus) => void;
  generateProposal: (job: Job, templateType?: OutreachTemplateType) => Promise<OutreachMessage | null>;
};

type OutreachDraftEdit = {
  subject: string;
  body: string;
};

const outreachLabels: Record<AppLanguage, {
  title: string;
  empty: string;
  loading: string;
  subject: string;
  body: string;
  template: string;
  templateHelp: string;
  preview: string;
  created: string;
  sent: string;
  draft: string;
  openOpportunity: string;
  saveSelected: string;
  markApplied: string;
  generateProposal: string;
  applicationStatus: string;
  match: string;
  source: string;
  channel: string;
  lastUpdate: string;
  saveDraft: string;
  copyDraft: string;
  saving: string;
  saved: string;
  copied: string;
  copyError: string;
  persistError: string;
  contextUsed: string;
  contextSummary: string;
}> = {
  pt: {
    title: "Histórico de outreach",
    empty: "Ainda não existe mensagem de outreach para esta candidatura.",
    loading: "A carregar candidaturas...",
    subject: "Assunto",
    body: "Mensagem",
    template: "Template",
    templateHelp: "Escolhe o tipo de mensagem antes de gerar novamente.",
    preview: "Prévia",
    created: "Criado",
    sent: "Enviado",
    draft: "Draft — nada enviado automaticamente",
    openOpportunity: "Ver oportunidade",
    saveSelected: "Guardar",
    markApplied: "Marcar aplicada",
    generateProposal: "Gerar proposta",
    applicationStatus: "Estado",
    match: "Match",
    source: "Fonte",
    channel: "Canal",
    lastUpdate: "Atualizado",
    saveDraft: "Guardar draft",
    copyDraft: "Copiar mensagem",
    saving: "A guardar...",
    saved: "Draft guardado.",
    copied: "Mensagem copiada.",
    copyError: "Não foi possível copiar automaticamente.",
    persistError: "Não foi possível guardar o draft.",
    contextUsed: "Contexto adicional do DevRadar usado para este rascunho:",
    contextSummary: "Incluído na mensagem editável acima. Revê o texto no campo Mensagem antes de copiar.",
  },
  en: {
    title: "Outreach history",
    empty: "There is no outreach message for this application yet.",
    loading: "Loading applications...",
    subject: "Subject",
    body: "Message",
    template: "Template",
    templateHelp: "Choose the message type before regenerating.",
    preview: "Preview",
    created: "Created",
    sent: "Sent",
    draft: "Draft — nothing sent automatically",
    openOpportunity: "View opportunity",
    saveSelected: "Save",
    markApplied: "Mark applied",
    generateProposal: "Generate proposal",
    applicationStatus: "Status",
    match: "Match",
    source: "Source",
    channel: "Channel",
    lastUpdate: "Updated",
    saveDraft: "Save draft",
    copyDraft: "Copy message",
    saving: "Saving...",
    saved: "Draft saved.",
    copied: "Message copied.",
    copyError: "Could not copy automatically.",
    persistError: "Could not save the draft.",
    contextUsed: "Additional DevRadar context used for this draft:",
    contextSummary: "Included in the editable message above. Review the Message field before copying.",
  },
  es: {
    title: "Historial de outreach",
    empty: "Todavía no existe un mensaje de outreach para esta candidatura.",
    loading: "Cargando candidaturas...",
    subject: "Asunto",
    body: "Mensaje",
    template: "Template",
    templateHelp: "Elige el tipo de mensaje antes de regenerar.",
    preview: "Vista previa",
    created: "Creado",
    sent: "Enviado",
    draft: "Draft — nada enviado automáticamente",
    openOpportunity: "Ver oportunidad",
    saveSelected: "Guardar",
    markApplied: "Marcar aplicada",
    generateProposal: "Generar propuesta",
    applicationStatus: "Estado",
    match: "Match",
    source: "Fuente",
    channel: "Canal",
    lastUpdate: "Actualizado",
    saveDraft: "Guardar draft",
    copyDraft: "Copiar mensaje",
    saving: "Guardando...",
    saved: "Draft guardado.",
    copied: "Mensaje copiado.",
    copyError: "No se pudo copiar automáticamente.",
    persistError: "No se pudo guardar el draft.",
    contextUsed: "Contexto adicional de DevRadar usado para este borrador:",
    contextSummary: "Incluido en el mensaje editable de arriba. Revisa el campo Mensaje antes de copiar.",
  }
};

const contextLabels = [
  "Contexto adicional do DevRadar usado para este rascunho:",
  "Additional DevRadar context used for this draft:",
  "Contexto adicional de DevRadar usado para este borrador:"
];

function languageBadge(language: string | undefined) {
  if (language === "en") return "EN";
  if (language === "es") return "ES";
  return "PT";
}

function formatDate(value: string | null | undefined, uiLanguage: AppLanguage) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const locale = uiLanguage === "en" ? "en-GB" : uiLanguage === "es" ? "es-ES" : "pt-PT";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function toJob(application: ApplicationRecord): Job {
  return {
    ...application.job,
    status: application.status,
    matchScore: application.matchScore
  };
}


function getDraftEdit(outreach: OutreachMessage, edits: Record<string, OutreachDraftEdit>) {
  return edits[outreach.id] ?? {
    subject: outreach.subject,
    body: outreach.body
  };
}

function getContextLabel(body: string) {
  return contextLabels.find((label) => body.includes(label)) ?? null;
}

export function ApplicationsView({
  t,
  uiLanguage,
  viewLabels,
  applications,
  isLoadingApplications,
  statusLabels,
  setSelectedOpportunityId,
  setActiveView,
  updateOpportunityStatus,
  generateProposal
}: ApplicationsViewProps) {
  const labels = outreachLabels[uiLanguage];
  const [draftEdits, setDraftEdits] = useState<Record<string, OutreachDraftEdit>>({});
  const [busyOutreachId, setBusyOutreachId] = useState<string | null>(null);
  const [feedbackByOutreachId, setFeedbackByOutreachId] = useState<Record<string, string>>({});
  const [selectedTemplateByJobId, setSelectedTemplateByJobId] = useState<Record<string, OutreachTemplateType>>({});

  function getSelectedTemplate(jobId: string): OutreachTemplateType {
    return selectedTemplateByJobId[jobId] ?? "short_application";
  }

  function updateSelectedTemplate(jobId: string, templateType: OutreachTemplateType) {
    setSelectedTemplateByJobId((state) => ({
      ...state,
      [jobId]: templateType
    }));
  }

  function updateDraftEdit(outreach: OutreachMessage, patch: Partial<OutreachDraftEdit>) {
    const current = getDraftEdit(outreach, draftEdits);

    setDraftEdits((state) => ({
      ...state,
      [outreach.id]: {
        ...current,
        ...patch
      }
    }));
  }

  async function persistDraft(outreach: OutreachMessage, action: "updated" | "copied") {
    const current = getDraftEdit(outreach, draftEdits);
    const subject = current.subject.trim();
    const body = current.body.trim();

    if (!subject || !body) {
      setFeedbackByOutreachId((state) => ({
        ...state,
        [outreach.id]: labels.persistError
      }));

      return;
    }

    try {
      setBusyOutreachId(outreach.id);
      setFeedbackByOutreachId((state) => ({
        ...state,
        [outreach.id]: labels.saving
      }));

      const updatedDraft = await updateOutreachDraftRemote({
        outreachId: outreach.id,
        subject,
        body,
        action
      });

      setDraftEdits((state) => ({
        ...state,
        [updatedDraft.id]: {
          subject: updatedDraft.subject,
          body: updatedDraft.body
        }
      }));

      if (action === "copied") {
        const message = `${updatedDraft.subject}\n\n${updatedDraft.body}`;

        if (typeof navigator !== "undefined" && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(message);

            setFeedbackByOutreachId((state) => ({
              ...state,
              [outreach.id]: labels.copied
            }));
          } catch {
            setFeedbackByOutreachId((state) => ({
              ...state,
              [outreach.id]: labels.copyError
            }));
          }
        } else {
          setFeedbackByOutreachId((state) => ({
            ...state,
            [outreach.id]: labels.copyError
          }));
        }

        return;
      }

      setFeedbackByOutreachId((state) => ({
        ...state,
        [outreach.id]: labels.saved
      }));
    } catch (error) {
      console.error("applications_outreach_draft_persist_error", error);

      setFeedbackByOutreachId((state) => ({
        ...state,
        [outreach.id]: labels.persistError
      }));
    } finally {
      setBusyOutreachId(null);
    }
  }

  async function regenerateProposal(job: Job, templateType: OutreachTemplateType = getSelectedTemplate(job.id)) {
    const draft = await generateProposal(job, templateType);

    if (draft) {
      setDraftEdits((state) => ({
        ...state,
        [draft.id]: {
          subject: draft.subject,
          body: draft.body
        }
      }));

      setFeedbackByOutreachId((state) => ({
        ...state,
        [draft.id]: labels.saved
      }));
    }
  }

  return (
    <section className="panel p-4 applications-ux-view" data-devradar="applications-ux-view">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">{viewLabels[uiLanguage].applications}</h2>
          <p className="mt-1 text-sm muted">{t.applicationsDescription}</p>
        </div>

        <span className="badge badge-blue w-fit">
          {applications.length} {viewLabels[uiLanguage].applications}
        </span>
      </div>

      <div className="mt-4 grid gap-3 applications-ux-list">
        {isLoadingApplications ? (
          <div className="surface p-4 text-sm muted">{labels.loading}</div>
        ) : applications.length ? (
          applications.map((application) => {
            const job = toJob(application);
            const outreach = application.outreach;
            const statusLabel = statusLabels[uiLanguage][job.status] ?? job.status;

            return (
              <article
                key={application.id}
                className="surface p-4"
                data-devradar="application-compact-card"
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-blue">{labels.match}: {job.matchScore}%</span>
                      <span className="badge badge-green">{statusLabel}</span>
                      <span className="badge badge-gray">{job.source}</span>
                      {outreach ? (
                        <span className="badge max-w-full whitespace-normal break-words text-left leading-5">
                          {languageBadge(outreach.language)} · {outreach.status}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 break-words text-base font-black leading-6">{job.title}</h3>
                    <p className="mt-1 break-words text-sm font-semibold muted">{job.company}</p>

                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <span className="font-bold">{labels.source}: </span>
                        <span className="muted">{job.source}</span>
                      </div>
                      <div>
                        <span className="font-bold">{labels.channel}: </span>
                        <span className="muted">{application.channel}</span>
                      </div>
                      <div>
                        <span className="font-bold">{labels.applicationStatus}: </span>
                        <span className="muted">{statusLabel}</span>
                      </div>
                      <div>
                        <span className="font-bold">{labels.lastUpdate}: </span>
                        <span className="muted">{formatDate(application.updatedAt ?? application.createdAt, uiLanguage)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="badge badge-gray">{tag}</span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        className="btn btn-soft"
                        onClick={() => {
                          setSelectedOpportunityId(job.id);
                          setActiveView("opportunities");
                        }}
                      >
                        {labels.openOpportunity}
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft"
                        onClick={() => updateOpportunityStatus(job.id, "selected")}
                      >
                        {labels.saveSelected}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => updateOpportunityStatus(job.id, "applied")}
                      >
                        {labels.markApplied}
                      </button>
                    </div>
                  </div>

                  <div
                    className="surface p-3"
                    data-devradar="application-outreach-history"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-black">{labels.title}</div>
                        <p className="mt-1 text-xs leading-5 muted">
                          {outreach ? labels.draft : labels.empty}
                        </p>
                      </div>
                    </div>

                    {outreach ? (
                      <div className="mt-4 grid gap-3 text-sm" data-devradar="application-outreach-editor">
                        {(() => {
                          const draft = getDraftEdit(outreach, draftEdits);
                          const contextLabel = getContextLabel(draft.body);
                          const feedback = feedbackByOutreachId[outreach.id];
                          const isBusy = busyOutreachId === outreach.id;

                          return (
                            <>
                              <label className="block" data-devradar="application-outreach-template-selector">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] muted">{labels.template}</span>
                                <select
                                  className="input-field mt-2"
                                  value={getSelectedTemplate(job.id)}
                                  onChange={(event) => updateSelectedTemplate(job.id, event.target.value as OutreachTemplateType)}
                                >
                                  {outreachTemplateCatalog.map((template) => (
                                    <option key={template.type} value={template.type}>
                                      {template.labels[uiLanguage]}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-xs leading-5 muted">{labels.templateHelp}</p>
                              </label>

                              <label className="block">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] muted">{labels.subject}</span>
                                <input
                                  className="input-field mt-2"
                                  value={draft.subject}
                                  onChange={(event) => updateDraftEdit(outreach, { subject: event.target.value })}
                                  data-devradar="application-outreach-subject-input"
                                />
                              </label>

                              <label className="block">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] muted">{labels.body}</span>
                                <textarea
                                  className="input-field mt-2 min-h-56 resize-y leading-6"
                                  value={draft.body}
                                  onChange={(event) => updateDraftEdit(outreach, { body: event.target.value })}
                                  data-devradar="application-outreach-body-textarea"
                                />
                              </label>

                              {contextLabel ? (
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5" data-devradar="application-outreach-context-visible">
                                  <div className="font-black">{labels.contextUsed}</div>
                                  <p className="mt-1 muted">{labels.contextSummary}</p>
                                </div>
                              ) : null}

                              <div className="grid gap-2 text-xs sm:grid-cols-2">
                                <div>
                                  <span className="font-bold">{labels.created}: </span>
                                  <span className="muted">{formatDate(outreach.createdAt, uiLanguage)}</span>
                                </div>
                                <div>
                                  <span className="font-bold">{labels.sent}: </span>
                                  <span className="muted">{formatDate(outreach.sentAt, uiLanguage)}</span>
                                </div>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-3">
                                <button
                                  type="button"
                                  className="btn btn-soft"
                                  disabled={isBusy}
                                  onClick={() => { void persistDraft(outreach, "updated"); }}
                                  data-devradar="application-outreach-save-button"
                                >
                                  {isBusy ? labels.saving : labels.saveDraft}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-soft"
                                  disabled={isBusy}
                                  onClick={() => { void persistDraft(outreach, "copied"); }}
                                  data-devradar="application-outreach-copy-button"
                                >
                                  {labels.copyDraft}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={isBusy}
                                  onClick={() => { void regenerateProposal(job, getSelectedTemplate(job.id)); }}
                                >
                                  {labels.generateProposal}
                                </button>
                              </div>

                              {feedback ? (
                                <p className="text-xs font-semibold muted" data-devradar="application-outreach-feedback">
                                  {feedback}
                                </p>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 text-sm">
                        <p className="muted">{labels.empty}</p>

                        <label className="block" data-devradar="application-outreach-template-selector">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] muted">{labels.template}</span>
                          <select
                            className="input-field mt-2"
                            value={getSelectedTemplate(job.id)}
                            onChange={(event) => updateSelectedTemplate(job.id, event.target.value as OutreachTemplateType)}
                          >
                            {outreachTemplateCatalog.map((template) => (
                              <option key={template.type} value={template.type}>
                                {template.labels[uiLanguage]}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs leading-5 muted">{labels.templateHelp}</p>
                        </label>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => { void regenerateProposal(job, getSelectedTemplate(job.id)); }}
                        >
                          {labels.generateProposal}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="surface p-4 text-sm muted">{t.noApplicationsYet}</div>
        )}
      </div>
    </section>
  );
}