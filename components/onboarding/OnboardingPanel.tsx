"use client";

import { useState } from "react";

import type { AuthUser } from "@/types/auth";

type OnboardingPanelProps = {
  user: AuthUser;
  onCompleted: () => Promise<void>;
};

const roleOptions = ["Frontend Developer", "Full Stack Developer", "WordPress Developer", "React Developer"];
const stackOptions = ["React", "Next.js", "TypeScript", "WordPress", "Tailwind", "Node.js"];

type OnboardingApiResponse = {
  ok?: boolean;
  message?: string;
};

function readApiResponse(value: unknown): OnboardingApiResponse {
  if (typeof value === "object" && value !== null) {
    return value as OnboardingApiResponse;
  }

  return {};
}

export function OnboardingPanel({ user, onCompleted }: OnboardingPanelProps) {
  const [desiredRole, setDesiredRole] = useState("Frontend Developer");
  const [seniority, setSeniority] = useState("junior");
  const [location, setLocation] = useState("Portugal / Remote Europe");
  const [workMode, setWorkMode] = useState("remote");
  const [stack, setStack] = useState("React, Next.js, TypeScript, WordPress");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleStackSkill(skill: string) {
    const current = stack
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (current.includes(skill)) {
      setStack(current.filter((item) => item !== skill).join(", "));
      return;
    }

    setStack([...current, skill].join(", "));
  }

  async function submitOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          desiredRole,
          seniority,
          location,
          workMode,
          stack
        }),
        credentials: "include"
      });

      const data = readApiResponse(await response.json().catch(() => null));

      if (!response.ok) {
        setError(data.message ?? "Não foi possível guardar o onboarding.");
        return;
      }

      await onCompleted();
    } catch {
      setError("Erro de ligação ao guardar onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-layout">
        <div className="onboarding-hero panel">
          <span className="badge badge-blue">Onboarding</span>
          <h1>Vamos configurar o teu radar, {user.name}.</h1>
          <p>
            Estas preferências vão criar o teu perfil técnico, o loop inicial e a base para filtrar oportunidades reais.
          </p>

          <div className="onboarding-summary-grid">
            <div className="surface onboarding-summary-card">
              <strong>Perfil</strong>
              <span>{desiredRole} · {seniority}</span>
            </div>
            <div className="surface onboarding-summary-card">
              <strong>Local</strong>
              <span>{location}</span>
            </div>
            <div className="surface onboarding-summary-card">
              <strong>Trabalho</strong>
              <span>{workMode}</span>
            </div>
          </div>
        </div>

        <form className="onboarding-card panel" onSubmit={submitOnboarding}>
          <div>
            <p className="onboarding-eyebrow">Preferências iniciais</p>
            <h2>O que queres encontrar?</h2>
            <p className="muted">Depois poderás ajustar tudo nas preferências.</p>
          </div>

          <label className="onboarding-field">
            <span>Área desejada</span>
            <select className="input-field" value={desiredRole} onChange={(event) => setDesiredRole(event.target.value)}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>

          <div className="onboarding-field">
            <span>Senioridade</span>
            <div className="onboarding-chip-row">
              {["junior", "mid", "senior"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSeniority(item)}
                  className={seniority === item ? "onboarding-chip active" : "onboarding-chip"}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="onboarding-field">
            <span>Localização</span>
            <input
              className="input-field"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Portugal / Remote Europe"
              required
            />
          </label>

          <div className="onboarding-field">
            <span>Tipo de trabalho</span>
            <div className="onboarding-chip-row">
              {["remote", "hybrid", "onsite"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setWorkMode(item)}
                  className={workMode === item ? "onboarding-chip active" : "onboarding-chip"}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="onboarding-field">
            <span>Stack</span>
            <textarea
              className="input-field onboarding-stack-input"
              value={stack}
              onChange={(event) => setStack(event.target.value)}
              placeholder="React, Next.js, TypeScript"
              required
            />
          </label>

          <div className="onboarding-chip-row">
            {stackOptions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleStackSkill(skill)}
                className={stack.includes(skill) ? "onboarding-chip active" : "onboarding-chip"}
              >
                {skill}
              </button>
            ))}
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary onboarding-submit" disabled={submitting}>
            {submitting ? "A guardar..." : "Guardar e abrir o radar"}
          </button>
        </form>
      </section>
    </main>
  );
}
