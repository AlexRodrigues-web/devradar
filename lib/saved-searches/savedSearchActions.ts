import type { SavedSearchInput, SavedSearchItem } from "@/types/saved-search";

type SavedSearchResponse = {
  ok?: boolean;
  savedSearch?: SavedSearchItem;
  savedSearches?: SavedSearchItem[];
  error?: string;
  message?: string;
};

function getSavedSearchErrorMessage(response: Response, data: SavedSearchResponse | null) {
  return data?.message ?? data?.error ?? `Saved searches API HTTP ${response.status}`;
}

export async function fetchSavedSearches() {
  const response = await fetch("/api/saved-searches", {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const data = (await response.json().catch(() => null)) as SavedSearchResponse | null;

  if (response.status === 401) {
    return [];
  }

  if (!response.ok || !data?.ok || !Array.isArray(data.savedSearches)) {
    throw new Error(getSavedSearchErrorMessage(response, data));
  }

  return data.savedSearches;
}

export async function saveSavedSearchRemote(input: SavedSearchInput) {
  const response = await fetch("/api/saved-searches", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const data = (await response.json().catch(() => null)) as SavedSearchResponse | null;

  if (!response.ok || !data?.ok || !data.savedSearch) {
    throw new Error(getSavedSearchErrorMessage(response, data));
  }

  return data.savedSearch;
}