import { Play, Square, Zap } from "lucide-react";

import { MiniMetric } from "@/components/shared";

import { RadarOutcomeNotice } from "./RadarOutcomeNotice";
import type { RunnerTexts, RunStatsSnapshot } from "./types";
export function RunnerPanel({
  t,
  isRunning,
  progress,
  runStats,
  onRun,
  onCancel
}: {
  t: RunnerTexts;
  isRunning: boolean;
  progress: number;
  runStats: RunStatsSnapshot;
  onRun: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="panel p-4 runner-mobile-panel">
      <RadarOutcomeNotice t={t} runStats={runStats} />
      <div className="mb-4 flex items-center justify-between runner-mobile-head">
        <div>
          <h2 className="text-base font-black">{t.pipelineRunner}</h2>
          <p className="text-sm muted">
            {runStats.lastRun ? `${t.lastRun}: ${runStats.lastRun}` : t.never}
          </p>
        </div>
        <Zap className="text-blue-700" size={20} />
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-400/30 runner-mobile-progress">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-2 runner-mobile-stats">
        <MiniMetric label={t.found} value={runStats.found.toString()} />
        <MiniMetric label={t.duplicates} value={runStats.duplicates.toString()} />
        <MiniMetric label={t.approved} value={runStats.approved.toString()} />
        <MiniMetric label={t.consulted} value={runStats.consulted.toString()} />
      </div>

      <div className="mt-4 flex gap-2 runner-mobile-actions">
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
