import type { RunnerTexts, RunStatsSnapshot } from "./types";

export function RadarOutcomeNotice({ t, runStats }: { t: RunnerTexts; runStats: RunStatsSnapshot }) {
  const hasRun = Boolean(runStats.lastRun);
  const found = runStats.found;
  const approved = runStats.approved;
  const blocked = Math.max(found - approved - runStats.duplicates, 0);
  const shouldShowZero = hasRun && found > 0 && approved === 0;
  const shouldShowSummary = hasRun && found > 0;

  if (!shouldShowSummary) return null;

  return (
    <section className={shouldShowZero ? "radar-outcome-notice radar-outcome-notice--blocked" : "radar-outcome-notice"}>
      <div className="radar-outcome-topline">
        <span>{shouldShowZero ? t.radarTooRestrictive : t.radarFinished}</span>
        <strong>{found} {t.found.toLowerCase()}</strong>
      </div>

      <h3>
        {shouldShowZero
          ? `Encontrámos ${found} oportunidades reais, mas nenhuma passou nos critérios atuais.`
          : `${approved} oportunidades passaram nos critérios atuais.`}
      </h3>

      <p>
        {shouldShowZero
          ? t.radarZeroExplanation
          : "A lista abaixo mostra apenas as oportunidades que passaram pelos critérios configurados. O número encontrado nas fontes é bruto, antes da filtragem final."}
      </p>

      <div className="radar-outcome-grid" aria-label={t.radarFilteringSummary}>
        <span>
          <strong>{found}</strong>
          <small>nas fontes</small>
        </span>
        <span>
          <strong>{runStats.duplicates}</strong>
          <small>duplicadas</small>
        </span>
        <span>
          <strong>{approved}</strong>
          <small>aprovadas</small>
        </span>
        <span>
          <strong>{blocked}</strong>
          <small>bloqueadas</small>
        </span>
      </div>

      {shouldShowZero ? (
        <div className="radar-outcome-actions">
          <span>{t.openLocation}</span>
          <span>{t.tryAnyWorkMode}</span>
          <span>{t.removeSpecificLevel}</span>
          <span>{t.reduceExcludedTerms}</span>
        </div>
      ) : null}
    </section>
  );
}
