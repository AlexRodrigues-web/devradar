import { Columns3 } from "lucide-react";

import { i18nFix, pipelineStatuses, statusLabels, viewLabels } from "@/lib/i18n";
import type { AppLanguage } from "@/types/i18n";
import type { Job } from "@/types/job";
export function KanbanView({
  opportunities,
  uiLanguage,
  setSelectedOpportunityId,
  setActiveView
}: {
  opportunities: Job[];
  uiLanguage: AppLanguage;
  setSelectedOpportunityId: (id: string) => void;
  setActiveView: (view: "opportunities") => void;
}) {
  return (
    <section className="panel p-4 kanban-mobile-panel">
      <div className="mb-4 flex items-center justify-between kanban-mobile-head">
        <div>
          <h2 className="text-base font-black">{viewLabels[uiLanguage].pipeline}</h2>
          <p className="text-sm muted">{i18nFix[uiLanguage].kanbanDescription}</p>
        </div>
        <Columns3 size={19} className="muted" />
      </div>

      <div className="grid gap-3 xl:grid-cols-7 kanban-mobile-board">
        {pipelineStatuses.map((status) => {
          const jobs = opportunities.filter((job) => job.status === status);

          return (
            <div key={status} className="panel-inner p-3 kanban-mobile-column">
              <div className="mb-3 flex items-center justify-between gap-2 kanban-mobile-column-head">
                <h3 className="text-xs font-black uppercase tracking-wide muted">
                  {statusLabels[uiLanguage][status]}
                </h3>
                <span className="badge badge-gray">{jobs.length}</span>
              </div>

              <div className="grid gap-2 kanban-mobile-items">
                {jobs.slice(0, 5).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedOpportunityId(job.id);
                      setActiveView("opportunities");
                    }}
                    className="surface p-3 text-left transition hover:border-blue-400 kanban-mobile-card"
                  >
                    <div className="text-sm font-black kanban-mobile-card-title">{job.title}</div>
                    <div className="mt-1 text-xs muted">{job.company}</div>
                    <div className="mt-2 flex items-center justify-between kanban-mobile-card-meta">
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
