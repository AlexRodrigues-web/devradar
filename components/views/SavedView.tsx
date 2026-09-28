"use client";

import { CalendarClock, Play } from "lucide-react";

import type { AppLanguage } from "@/types/job";
import type { SavedSearchItem } from "@/types/saved-search";

type SavedViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  viewLabels: Record<AppLanguage, Record<string, string>>;
  savedSearches: SavedSearchItem[];
  runSavedSearch: (savedSearch: SavedSearchItem) => void;
  scheduleSavedSearch: (savedSearch: SavedSearchItem) => void;
};

function getEmptyText(uiLanguage: AppLanguage) {
  if (uiLanguage === "en") return "No saved searches yet.";
  if (uiLanguage === "es") return "Todavía no hay búsquedas guardadas.";
  return "Ainda não há buscas guardadas.";
}

function getFrequencyText(frequency: SavedSearchItem["frequency"], uiLanguage: AppLanguage) {
  if (frequency === "manual") {
    if (uiLanguage === "en") return "Manual";
    if (uiLanguage === "es") return "Manual";
    return "Manual";
  }

  if (frequency === "daily") {
    if (uiLanguage === "en") return "Daily";
    if (uiLanguage === "es") return "Diaria";
    return "Diária";
  }

  return frequency;
}

export function SavedView({
  t,
  uiLanguage,
  viewLabels,
  savedSearches,
  runSavedSearch,
  scheduleSavedSearch
}: SavedViewProps) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-black">{viewLabels[uiLanguage].saved}</h2>
      <p className="mt-1 text-sm muted">{t.savedSearchesDescription}</p>

      {savedSearches.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedSearches.map((search) => (
            <article key={search.id} className="surface p-4">
              <div className="font-black">{search.title}</div>
              <div className="mt-2 text-sm muted">{t.sourcesLabel}: {search.filters.selectedSources.join(", ")}</div>
              <div className="mt-1 text-sm muted">{t.search}: {search.filters.keywords || "any"}</div>
              <div className="mt-1 text-sm muted">{t.location}: {search.filters.location}</div>
              <div className="mt-1 text-sm muted">Frequency: {getFrequencyText(search.frequency, uiLanguage)}</div>
              <div className="mt-1 text-sm muted">Status: {search.status}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => runSavedSearch(search)} className="btn btn-primary flex-1">
                  <Play size={15} />
                  {t.runSavedSearch}
                </button>
                <button onClick={() => scheduleSavedSearch(search)} className="btn btn-soft flex-1">
                  <CalendarClock size={15} />
                  {t.scheduleSavedSearch}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface mt-4 p-4 text-sm muted">{getEmptyText(uiLanguage)}</div>
      )}
    </section>
  );
}
