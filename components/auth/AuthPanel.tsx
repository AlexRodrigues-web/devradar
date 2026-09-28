"use client";

import { useState } from "react";

export type AuthMode = "login" | "register";

export type AuthSubmitInput = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
};

type AuthPanelProps = {
  onSubmit: (input: AuthSubmitInput) => Promise<void>;
  submitting: boolean;
  error: string;
  clearError: () => void;
};

export function AuthPanel({ onSubmit, submitting, error, clearError }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ mode, name, email, password });
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    clearError();
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <div className="auth-hero panel">
          <span className="badge badge-blue">DevRadar</span>
          <h1>Entra no teu Opportunity OS.</h1>
          <p>
            Cria conta, guarda preferências reais e prepara os teus loops, candidaturas e métricas por utilizador.
          </p>
          <div className="auth-proof-grid">
            <div className="surface auth-proof-card">
              <strong>Conta própria</strong>
              <span>CV, loops e candidaturas ficam ligados ao teu utilizador.</span>
            </div>
            <div className="surface auth-proof-card">
              <strong>Sessão protegida</strong>
              <span>Login com cookie httpOnly e sessão persistida no banco.</span>
            </div>
            <div className="surface auth-proof-card">
              <strong>Pronto para onboarding</strong>
              <span>A próxima fase salva stack, senioridade, localização e tipo de trabalho.</span>
            </div>
          </div>
        </div>

        <form className="auth-card panel" onSubmit={handleSubmit}>
          <div>
            <p className="auth-eyebrow">{isRegister ? "Criar conta" : "Entrar"}</p>
            <h2>{isRegister ? "Começar no DevRadar" : "Bem-vindo de volta"}</h2>
            <p className="muted">
              {isRegister
                ? "Cria a tua conta para começar a separar dados por utilizador."
                : "Entra para continuar com os teus dados e radar."}
            </p>
          </div>

          <div className="auth-mode-switch" role="tablist" aria-label="Modo de autenticação">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={mode === "login" ? "auth-mode-button active" : "auth-mode-button"}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={mode === "register" ? "auth-mode-button active" : "auth-mode-button"}
            >
              Cadastro
            </button>
          </div>

          {isRegister ? (
            <label className="auth-field">
              <span>Nome</span>
              <input
                className="input-field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="O teu nome"
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@email.com"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? "A processar..." : isRegister ? "Criar conta" : "Entrar"}
          </button>

          <p className="auth-hint">
            {isRegister
              ? "Já tens conta? Usa o separador Login."
              : "Ainda não tens conta? Usa o separador Cadastro."}
          </p>
        </form>
      </section>
    </main>
  );
}
