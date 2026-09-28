import { CheckCircle2, ListChecks } from "lucide-react";

export function LogsPanel({ title, logs }: { title: string; logs: string[] }) {
  return (
    <section className="panel p-4 logs-mobile-panel">
      <div className="mb-3 flex items-center justify-between logs-mobile-head">
        <h2 className="text-base font-black">{title}</h2>
        <ListChecks size={18} className="muted" />
      </div>

      <div className="grid gap-2 logs-mobile-list">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="surface flex items-start gap-2 px-3 py-2 text-sm muted logs-mobile-item">
            <CheckCircle2 size={15} className={index === 0 ? "mt-0.5 text-blue-700" : "mt-0.5 text-slate-500"} />
            <span className="logs-mobile-text">{log}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
