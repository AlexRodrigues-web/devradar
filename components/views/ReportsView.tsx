"use client";

import { MetricCard } from "@/components/shared";
import type { RealMetrics } from "@/lib/metrics/metricsActions";

type ReportsStats = {
  total: number;
  highMatch: number;
  applications: number;
  pending: number;
};

type ReportsRunStats = {
  consulted: number;
};

type ReportsViewProps = {
  t: Record<string, string>;
  stats: ReportsStats;
  runStats: ReportsRunStats;
  realMetrics?: RealMetrics | null;
  isLoadingMetrics?: boolean;
  topTags: Array<[string, number]>;
};

export function ReportsView({ t, stats, runStats, realMetrics, isLoadingMetrics, topTags }: ReportsViewProps) {
  return (
    <section className="grid gap-4">
      <section className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Total" value={stats.total.toString()} />
        <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
        <MetricCard label={t.applications} value={stats.applications.toString()} />
        <MetricCard label={t.pending} value={stats.pending.toString()} />
        <MetricCard label={t.consulted} value={runStats.consulted.toString()} />
      </section>
      {realMetrics ? (
        <section className="panel p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Relatório persistido</h3>
            <p className="text-xs muted">Resumo baseado em dados guardados: pipeline, aplicações, eventos e runs.</p>
          </div>
          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Pipeline guardado" value={realMetrics.opportunities.total.toString()} />
            <MetricCard label="Aplicações" value={realMetrics.applications.total.toString()} />
            <MetricCard label="Drafts" value={realMetrics.outreach.drafts.toString()} />
            <MetricCard label="Eventos" value={realMetrics.events.total.toString()} />
            <MetricCard label="Follow-ups" value={realMetrics.events.followUpCreated.toString()} />
            <MetricCard label="Propostas" value={realMetrics.events.proposalCreated.toString()} />
            <MetricCard label="Runs" value={realMetrics.loops.runs.toString()} />
            <MetricCard label="Resposta" value={`${realMetrics.applications.responseRate}%`} />
          </section>
        </section>
      ) : isLoadingMetrics ? (
        <div className="surface p-4 text-sm muted">A carregar relatório persistido...</div>
      ) : null}

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
  );
}
