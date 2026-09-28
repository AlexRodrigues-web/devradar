import { Clock3, ExternalLink } from "lucide-react";

import { localizeGeneratedJobText } from "@/lib/radar";
import type { AppLanguage } from "@/types/i18n";
import type { Job } from "@/types/job";
export function OpportunityCard({
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
    <article className="surface p-4 opportunity-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between opportunity-card-layout">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 opportunity-card-badges">
            <span className="badge badge-blue">{matchLabel}: {job.matchScore}%</span>
            <span className="badge badge-gray">{job.source}</span>
            <span className="badge badge-green">{statusLabel}</span>
          </div>

          <h3 className="text-base font-black opportunity-card-title">{job.title}</h3>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm muted opportunity-card-meta">
            <span>{job.company}</span>
            <span>{job.location}</span>
            <span>{localizeGeneratedJobText(job.budgetLabel, uiLanguage, "budget")}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 size={14} />
              {job.postedAt}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 muted opportunity-card-summary">{job.summary}</p>

      <div className="mt-3 grid gap-2 text-xs opportunity-score-preview">
        {job.strengths.slice(0, 2).map((strength) => (
          <div key={`strength-${job.id}-${strength}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 font-bold text-emerald-800">
            + {strength}
          </div>
        ))}
        {job.risks?.slice(0, 1).map((risk) => (
          <div key={`risk-${job.id}-${risk}`} className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 font-bold text-amber-900">
            ! {risk}
          </div>
        ))}
      </div>

          <div className="mt-3 flex flex-wrap gap-2 opportunity-card-tags">
            {job.tags.map((tag) => (
              <span key={tag} className="badge badge-gray">{tag}</span>
            ))}
          </div>
        </div>

        <div className="grid min-w-48 gap-2 opportunity-card-actions">
          <div className="grid grid-cols-2 gap-2 opportunity-card-secondary-actions">
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
