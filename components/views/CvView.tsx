"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type DetectedSkill = {
  name: string;
  category?: string;
  confidence?: number;
};

type CvResume = {
  id: string;
  version: number;
  originalName: string | null;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number | null;
  rawText: string;
  detectedSkills: DetectedSkill[];
  detectedSeniority: string | null;
  detectedStrengths: string[];
  parserVersion: string | null;
  status: string;
  active: boolean;
  uploadedAt: string | null;
  updatedAt: string | null;
};

type CvDevProfile = {
  id: string;
  resumeId: string | null;
  title: string;
  seniority: string;
  skills: string[];
  languages: string[];
  locations: string[];
  workModes: string[];
  strengths?: string[];
  preferences?: {
    strengths?: string[];
    summary?: string;
  };
};

type CvProfilePayload = {
  ok: boolean;
  profile?: {
    resume: CvResume | null;
    devProfile: CvDevProfile | null;
  };
  message?: string;
};

type UploadPayload = {
  ok: boolean;
  resume?: CvResume;
  devProfile?: CvDevProfile & {
    strengths?: string[];
    summary?: string;
  };
  message?: string;
};

type CvFormState = {
  title: string;
  seniority: string;
  skills: string;
  languages: string;
  locations: string;
  workModes: string;
  strengths: string;
  summary: string;
};

const emptyForm: CvFormState = {
  title: "",
  seniority: "junior",
  skills: "",
  languages: "pt, en",
  locations: "Portugal / Remote Europe",
  workModes: "remote",
  strengths: "",
  summary: ""
};

const seniorityOptions = ["intern", "junior", "mid", "senior"];

function splitList(value: string) {
  return Array.from(new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ));
}

function joinList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback.join(", ");
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .join(", ");
}

function formatBytes(value: number | null) {
  if (!value) {
    return "—";
  }

  if (value < 1024) {
    return value + " B";
  }

  if (value < 1024 * 1024) {
    return Math.round(value / 1024) + " KB";
  }

  return (value / 1024 / 1024).toFixed(1) + " MB";
}

function buildForm(profile: CvProfilePayload["profile"]): CvFormState {
  const devProfile = profile?.devProfile;
  const resume = profile?.resume;
  const strengths = devProfile?.preferences?.strengths ?? resume?.detectedStrengths ?? [];

  if (!devProfile) {
    return emptyForm;
  }

  return {
    title: devProfile.title,
    seniority: devProfile.seniority,
    skills: joinList(devProfile.skills),
    languages: joinList(devProfile.languages, ["pt", "en"]),
    locations: joinList(devProfile.locations, ["Portugal / Remote Europe"]),
    workModes: joinList(devProfile.workModes, ["remote"]),
    strengths: joinList(strengths),
    summary: devProfile.preferences?.summary ?? [devProfile.title, devProfile.seniority, devProfile.skills.slice(0, 5).join(", ")].filter(Boolean).join(" · ")
  };
}

export function CvView() {
  const [profile, setProfile] = useState<CvProfilePayload["profile"] | null>(null);
  const [form, setForm] = useState<CvFormState>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resume = profile?.resume ?? null;
  const devProfile = profile?.devProfile ?? null;
  const skills = useMemo(() => splitList(form.skills), [form.skills]);
  const strengths = useMemo(() => splitList(form.strengths), [form.strengths]);

  async function loadCvProfile() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cv/profile", {
        method: "GET",
        credentials: "include"
      });

      const data = await response.json().catch(() => ({})) as CvProfilePayload;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Não foi possível carregar o perfil do CV.");
      }

      setProfile(data.profile ?? null);
      setForm(buildForm(data.profile));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar o CV.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCvProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updateField(field: keyof CvFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function uploadCv() {
    if (!selectedFile) {
      setError("Seleciona um ficheiro PDF, DOCX ou TXT.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await response.json().catch(() => ({})) as UploadPayload;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Não foi possível processar o CV.");
      }

      setMessage("CV processado com sucesso.");
      setSelectedFile(null);
      await loadCvProfile();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erro ao fazer upload do CV.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resume) {
      setError("Carrega um CV antes de editar o perfil extraído.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        title: form.title,
        seniority: form.seniority,
        skills: splitList(form.skills),
        languages: splitList(form.languages),
        locations: splitList(form.locations),
        workModes: splitList(form.workModes),
        strengths: splitList(form.strengths),
        summary: form.summary
      };

      const response = await fetch("/api/cv/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({})) as CvProfilePayload;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Não foi possível guardar o perfil do CV.");
      }

      setProfile(data.profile ?? null);
      setForm(buildForm(data.profile));
      setMessage("Perfil do CV guardado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cv-view grid gap-4">
      <div className="panel p-4 cv-hero-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="badge badge-blue">Meu CV</span>
            <h2 className="mt-3 text-xl font-black">Upload de CV e perfil dev</h2>
            <p className="mt-2 text-sm muted">
              Carrega um PDF, DOCX ou TXT. O DevRadar extrai texto, detecta skills e cria um DevProfile editável.
            </p>
          </div>

          <div className="surface p-3 text-sm cv-status-card">
            <span className="muted">Estado</span>
            <strong>{resume ? "CV ativo" : "Sem CV carregado"}</strong>
            <span>{resume ? resume.originalName ?? "CV processado" : "Começa por carregar o teu CV."}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <div className="panel p-4 cv-upload-panel">
            <h3 className="text-base font-black">Carregar CV</h3>
            <p className="mt-1 text-sm muted">Formatos aceites: PDF, DOCX ou TXT até 5 MB.</p>

            <label className="cv-upload-drop mt-4">
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <span>{selectedFile ? selectedFile.name : "Selecionar ficheiro"}</span>
              <small>{selectedFile ? formatBytes(selectedFile.size) : "Arrasta mentalmente o próximo passo: upload real."}</small>
            </label>

            <button className="btn btn-primary mt-4 w-full" type="button" onClick={uploadCv} disabled={uploading || !selectedFile}>
              {uploading ? "A processar..." : "Processar CV"}
            </button>
          </div>

          <div className="panel p-4">
            <h3 className="text-base font-black">Resumo extraído</h3>

            {loading ? (
              <div className="surface mt-3 p-3 text-sm muted">A carregar perfil do CV...</div>
            ) : resume ? (
              <div className="mt-3 grid gap-3">
                <div className="surface p-3 text-sm">
                  <div className="cv-meta-grid">
                    <span><strong>Ficheiro</strong><br />{resume.originalName ?? "—"}</span>
                    <span><strong>Tipo</strong><br />{resume.fileType.toUpperCase()}</span>
                    <span><strong>Tamanho</strong><br />{formatBytes(resume.sizeBytes)}</span>
                    <span><strong>Parser</strong><br />{resume.parserVersion ?? "—"}</span>
                  </div>
                </div>

                <div className="surface p-3">
                  <p className="text-xs font-black uppercase muted">Texto extraído</p>
                  <p className="mt-2 text-sm cv-raw-preview">{resume.rawText.slice(0, 650)}</p>
                </div>
              </div>
            ) : (
              <div className="surface mt-3 p-3 text-sm muted">
                Ainda não há CV ativo. O perfil atual vem do onboarding até carregares um CV.
              </div>
            )}
          </div>
        </div>

        <form className="panel p-4 cv-profile-editor" onSubmit={saveProfile}>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-base font-black">Perfil dev extraído</h3>
              <p className="mt-1 text-sm muted">Corrige skills, senioridade e preferências antes do matching.</p>
            </div>
            <span className="badge badge-green">{devProfile ? "DevProfile ativo" : "Base onboarding"}</span>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold">
              Título
              <input className="input-field" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Frontend Developer" />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Senioridade
              <select className="input-field" value={form.seniority} onChange={(event) => updateField("seniority", event.target.value)}>
                {seniorityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Skills
              <textarea className="input-field" value={form.skills} onChange={(event) => updateField("skills", event.target.value)} rows={3} placeholder="React, Next.js, TypeScript" />
            </label>

            {skills.length > 0 ? (
              <div className="cv-chip-row">
                {skills.map((skill) => (
                  <span className="badge badge-blue" key={skill}>{skill}</span>
                ))}
              </div>
            ) : null}

            <label className="grid gap-1 text-sm font-bold">
              Idiomas
              <input className="input-field" value={form.languages} onChange={(event) => updateField("languages", event.target.value)} placeholder="pt, en" />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Localizações
              <input className="input-field" value={form.locations} onChange={(event) => updateField("locations", event.target.value)} placeholder="Portugal / Remote Europe" />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Work modes
              <input className="input-field" value={form.workModes} onChange={(event) => updateField("workModes", event.target.value)} placeholder="remote, hybrid" />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Áreas fortes
              <input className="input-field" value={form.strengths} onChange={(event) => updateField("strengths", event.target.value)} placeholder="Frontend moderno, APIs e backend" />
            </label>

            {strengths.length > 0 ? (
              <div className="cv-chip-row">
                {strengths.map((strength) => (
                  <span className="badge badge-gray" key={strength}>{strength}</span>
                ))}
              </div>
            ) : null}

            <label className="grid gap-1 text-sm font-bold">
              Resumo
              <textarea className="input-field" value={form.summary} onChange={(event) => updateField("summary", event.target.value)} rows={3} placeholder="Frontend Developer · junior · React..." />
            </label>
          </div>

          {message ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button className="btn btn-primary mt-4 w-full" type="submit" disabled={saving || !resume}>
            {saving ? "A guardar..." : "Guardar perfil extraído"}
          </button>
        </form>
      </div>
    </section>
  );
}
