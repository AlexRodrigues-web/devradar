type InfoBlockTone = "neutral" | "strength" | "gap" | "risk";

export function InfoBlock({
  title,
  items,
  tone = "neutral"
}: {
  title: string;
  items: string[];
  tone?: InfoBlockTone;
}) {
  if (!items.length) return null;

  const toneClass =
    tone === "risk"
      ? "border-amber-200 bg-amber-50/80 text-amber-950"
      : tone === "strength"
        ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
        : tone === "gap"
          ? "border-sky-200 bg-sky-50/70 text-sky-950"
          : "border-slate-200 bg-white/70 text-slate-900";

  const bullet = tone === "risk" ? "!" : tone === "strength" ? "+" : tone === "gap" ? "✓" : "•";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 score-explanation-block">
      <h4 className="mb-2 text-xs font-black uppercase tracking-wide muted">{title}</h4>
      <ul className="grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className={`rounded-2xl border px-3 py-2 leading-5 ${toneClass}`}>
            <span className="mr-2 font-black">{bullet}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
