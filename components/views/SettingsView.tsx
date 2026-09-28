"use client";

import { useEffect, useMemo, useState } from "react";

import type { AppLanguage, JobSource } from "@/types/job";

type SettingsViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  viewLabels: Record<AppLanguage, Record<string, string>>;
  scheduleEvery: string;
  setScheduleEvery: (value: string) => void;
  setUiLanguage: (value: AppLanguage) => void;
  sourceOptions: JobSource[];
  selectedSources: JobSource[];
  toggleSource: (source: JobSource) => void;
  scheduleOptions: string[];
};

type ProfileFormState = {
  displayName: string;
  headline: string;
  location: string;
  language: string;
  desiredRole: string;
  seniority: string;
  workMode: string;
  stack: string;
};

type ProfileApiData = {
  ok?: boolean;
  message?: string;
  profile?: {
    profile?: {
      displayName?: string;
      headline?: string | null;
      location?: string | null;
      language?: string;
      preferences?: Record<string, unknown>;
    };
    devProfile?: {
      title?: string;
      seniority?: string;
      skills?: string[];
      workModes?: string[];
      locations?: string[];
    };
  };
};

const emptyForm: ProfileFormState = {
  displayName: "",
  headline: "",
  location: "",
  language: "pt",
  desiredRole: "",
  seniority: "junior",
  workMode: "remote",
  stack: ""
};

const seniorityOptions = ["intern", "junior", "mid", "senior"];
const workModeOptions = ["remote", "hybrid", "onsite"];
const commonSkills = ["React", "Next.js", "TypeScript", "Node.js", "PHP", "Laravel", "Go", "Python", "SQL", "WordPress"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(items: string[]) {
  return Array.from(new Set(items));
}

function getText(t: Record<string, string>, key: string, fallback: string) {
  return t[key] ?? fallback;
}

function getFrequencyText(value: string) {
  if (value === "manual") return "Manual";
  if (value === "daily") return "Daily";
  if (value === "weekly") return "Weekly";
  return value;
}

function buildFormFromProfile(data: ProfileApiData): { form: ProfileFormState; preferences: Record<string, unknown> } {
  const profile = data.profile?.profile;
  const devProfile = data.profile?.devProfile;
  const preferences = profile?.preferences && isRecord(profile.preferences) ? profile.preferences : {};

  const desiredRole = readString(preferences, "desiredRole", devProfile?.title ?? "Frontend Developer");
  const seniority = readString(preferences, "seniority", devProfile?.seniority ?? "junior");
  const location = profile?.location ?? readString(preferences, "location", devProfile?.locations?.[0] ?? "Portugal / Remote Europe");
  const workMode = readString(preferences, "workMode", devProfile?.workModes?.[0] ?? "remote");
  const stack = readStringArray(preferences.stack, devProfile?.skills ?? ["React", "Next.js", "TypeScript"]).join(", ");

  return {
    form: {
      displayName: profile?.displayName ?? "Alex DevRadar",
      headline: profile?.headline ?? "",
      location,
      language: profile?.language ?? "pt",
      desiredRole,
      seniority,
      workMode,
      stack
    },
    preferences
  };
}

export function SettingsView({
  t,
  uiLanguage,
  viewLabels,
  scheduleEvery,
  setScheduleEvery,
  setUiLanguage,
  sourceOptions,
  selectedSources,
  toggleSource,
  scheduleOptions
}: SettingsViewProps) {
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyForm);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, unknown>>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const stackSkills = useMemo(() => splitList(profileForm.stack), [profileForm.stack]);

  useEffect(() => {
    let mounted = true;

    const timer = window.setTimeout(() => {
      async function loadProfile() {
        try {
          setProfileLoading(true);
          setProfileError("");

          const response = await fetch("/api/profile", {
            cache: "no-store",
            headers: {
              Accept: "application/json"
            }
          });

          const data = (await response.json().catch(() => ({}))) as ProfileApiData;

          if (!response.ok || !data.ok) {
            throw new Error(data.message ?? "Não foi possível carregar o perfil.");
          }

          const mapped = buildFormFromProfile(data);

          if (mounted) {
            setProfileForm(mapped.form);
            setProfilePreferences(mapped.preferences);
          }
        } catch (error) {
          if (mounted) {
            setProfileError(error instanceof Error ? error.message : "Erro ao carregar perfil.");
          }
        } finally {
          if (mounted) {
            setProfileLoading(false);
          }
        }
      }

      void loadProfile();
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  function updateProfileField(field: keyof ProfileFormState, value: string) {
    setProfileMessage("");
    setProfileError("");
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSkill(skill: string) {
    const current = splitList(profileForm.stack);
    const next = current.includes(skill)
      ? current.filter((item) => item !== skill)
      : uniqueList([...current, skill]);

    updateProfileField("stack", next.join(", "));
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setProfileSaving(true);
      setProfileError("");
      setProfileMessage("");

      const stack = splitList(profileForm.stack);

      const payload = {
        displayName: profileForm.displayName,
        headline: profileForm.headline,
        location: profileForm.location,
        language: profileForm.language,
        preferences: {
          ...profilePreferences,
          source: "account-preferences",
          desiredRole: profileForm.desiredRole,
          seniority: profileForm.seniority,
          location: profileForm.location,
          workMode: profileForm.workMode,
          stack,
          updatedAt: new Date().toISOString()
        }
      };

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => ({}))) as ProfileApiData;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Não foi possível guardar preferências.");
      }

      const mapped = buildFormFromProfile(data);
      setProfileForm(mapped.form);
      setProfilePreferences(mapped.preferences);
      setProfileMessage("Preferências guardadas com sucesso.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Erro ao guardar preferências.");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <form className="panel p-4 account-preferences-panel" onSubmit={saveProfile}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="badge badge-blue">Conta</span>
            <h2 className="mt-3 text-base font-black">Preferências da conta</h2>
            <p className="mt-1 text-sm muted">
              Edita o perfil usado como base do DevRadar antes do upload de CV da próxima fase.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            Nome visível
            <input
              className="input-field"
              value={profileForm.displayName}
              onChange={(event) => updateProfileField("displayName", event.target.value)}
              disabled={profileLoading || profileSaving}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Idioma
            <select
              className="input-field"
              value={profileForm.language}
              onChange={(event) => updateProfileField("language", event.target.value)}
              disabled={profileLoading || profileSaving}
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            Headline
            <input
              className="input-field"
              value={profileForm.headline}
              onChange={(event) => updateProfileField("headline", event.target.value)}
              placeholder="Frontend Developer · junior"
              disabled={profileLoading || profileSaving}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Cargo desejado
            <input
              className="input-field"
              value={profileForm.desiredRole}
              onChange={(event) => updateProfileField("desiredRole", event.target.value)}
              placeholder="Frontend Developer"
              disabled={profileLoading || profileSaving}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Localização
            <input
              className="input-field"
              value={profileForm.location}
              onChange={(event) => updateProfileField("location", event.target.value)}
              placeholder="Portugal / Remote Europe"
              disabled={profileLoading || profileSaving}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Senioridade
            <select
              className="input-field"
              value={profileForm.seniority}
              onChange={(event) => updateProfileField("seniority", event.target.value)}
              disabled={profileLoading || profileSaving}
            >
              {seniorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Tipo de trabalho
            <select
              className="input-field"
              value={profileForm.workMode}
              onChange={(event) => updateProfileField("workMode", event.target.value)}
              disabled={profileLoading || profileSaving}
            >
              {workModeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            Stack / skills base
            <textarea
              className="input-field"
              value={profileForm.stack}
              onChange={(event) => updateProfileField("stack", event.target.value)}
              placeholder="React, Next.js, TypeScript, WordPress"
              rows={3}
              disabled={profileLoading || profileSaving}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {commonSkills.map((skill) => {
            const active = stackSkills.includes(skill);

            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`badge ${active ? "badge-blue" : "badge-gray"}`}
                disabled={profileLoading || profileSaving}
              >
                {skill}
              </button>
            );
          })}
        </div>

        {profileError ? <div className="auth-error mt-4">{profileError}</div> : null}
        {profileMessage ? <div className="surface mt-4 p-3 text-sm font-bold">{profileMessage}</div> : null}

        <button className="btn btn-primary mt-4 w-full" type="submit" disabled={profileLoading || profileSaving}>
          {profileSaving ? "A guardar..." : "Guardar preferências"}
        </button>
      </form>

      <div className="grid gap-4">
        <div className="panel p-4">
          <h2 className="text-base font-black">{viewLabels[uiLanguage].settings}</h2>
          <p className="mt-1 text-sm muted">{getText(t, "settingsDescription", "Configura idioma, frequência e fontes.")}</p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-bold">
              Interface
              <select value={uiLanguage} onChange={(event) => setUiLanguage(event.target.value as AppLanguage)} className="input-field">
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Frequência padrão
              <select value={scheduleEvery} onChange={(event) => setScheduleEvery(event.target.value)} className="input-field">
                {scheduleOptions.map((option) => (
                  <option key={option} value={option}>
                    {getFrequencyText(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-base font-black">{getText(t, "sources", "Fontes")}</h2>
          <p className="mt-1 text-sm muted">{getText(t, "sourceSettingsDescription", "Escolhe as fontes usadas nas pesquisas.")}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {sourceOptions.map((source) => {
              const active = selectedSources.includes(source);

              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={`badge ${active ? "badge-blue" : "badge-gray"}`}
                >
                  {source}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
