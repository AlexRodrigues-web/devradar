export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3">
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  );
}
