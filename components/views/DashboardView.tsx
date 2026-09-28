"use client";

import { Target } from "lucide-react";

import { OpportunityCard } from "@/components/opportunities";
import { RunnerPanel } from "@/components/radar";
import { MetricCard } from "@/components/shared";
import type { RealMetrics } from "@/lib/metrics/metricsActions";
import type { AppLanguage, Job, JobStatus } from "@/types/job";

type DashboardStats = {
  total: number;
  newToday: number;
  highMatch: number;
  applications: number;
  pending: number;
};

type DashboardRunStats = {
  found: number;
  duplicates: number;
  approved: number;
  consulted: number;
  duration: string;
  lastRun: string;
};

type DashboardViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  stats: DashboardStats;
  opportunities: Job[];
  statusLabels: Record<AppLanguage, Record<JobStatus, string>>;
  isRunning: boolean;
  progress: number;
  runStats: DashboardRunStats;
  realMetrics?: RealMetrics | null;
  isLoadingMetrics?: boolean;
  setSelectedOpportunityId: (id: string) => void;
  setActiveView: (view: "opportunities") => void;
  updateOpportunityStatus: (jobId: string, status: JobStatus) => void;
  generateProposal: (job: Job) => void;
  runRadar: () => void;
  cancelRadar: () => void;
};

export function DashboardView({
  t,
  uiLanguage,
  stats,
  opportunities,
  statusLabels,
  isRunning,
  progress,
  runStats,
  realMetrics,
  isLoadingMetrics,
  setSelectedOpportunityId,
  setActiveView,
  updateOpportunityStatus,
  generateProposal,
  runRadar,
  cancelRadar
}: DashboardViewProps) {
  return (
    <section className="grid gap-4 dashboard-mobile-view">
      <section className="grid gap-3 md:grid-cols-5 dashboard-metrics-grid">
        <MetricCard label="Total" value={stats.total.toString()} />
        <MetricCard label={t.newToday} value={stats.newToday.toString()} />
        <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
        <MetricCard label={t.applications} value={stats.applications.toString()} />
        <MetricCard label={t.pending} value={stats.pending.toString()} />
      </section>
      {realMetrics ? (
        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Métricas persistidas</h3>
              <p className="text-xs muted">Dados reais guardados na base de dados.</p>
            </div>
            <span className="badge badge-blue">real-time</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Persistidas" value={realMetrics.opportunities.total.toString()} />
            <MetricCard label="Propostas" value={realMetrics.applications.proposals.toString()} />
            <MetricCard label="Follow-ups" value={realMetrics.events.followUpCreated.toString()} />
            <MetricCard label="Resposta" value={`${realMetrics.applications.responseRate}%`} />
          </div>
        </section>
      ) : isLoadingMetrics ? (
        <div className="surface p-4 text-sm muted">A carregar métricas reais...</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_390px] dashboard-main-grid">
        <div className="panel p-4 dashboard-best-panel">
          <div className="mb-4 flex items-center justify-between dashboard-section-head">
            <div>
              <h2 className="text-base font-black">Melhores oportunidades</h2>
              <p className="text-sm muted">Ordenadas por compatibilidade.</p>
            </div>
            <Target size={19} className="text-blue-700" />
          </div>

          <div className="grid gap-3 dashboard-best-list">
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
          onRun={runRadar}
          onCancel={cancelRadar}
        />
      </section>
    </section>
  );
}
