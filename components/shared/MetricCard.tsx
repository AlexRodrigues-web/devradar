export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm muted">{label}</div>
    </div>
  );
}
