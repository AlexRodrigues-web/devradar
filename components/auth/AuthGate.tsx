"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { AuthUser } from "@/types/auth";

import { AuthPanel, type AuthSubmitInput } from "./AuthPanel";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthGateProps = {
  children: (state: {
    user: AuthUser;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
  }) => ReactNode;
};

type AuthApiResponse = {
  ok?: boolean;
  user?: AuthUser | null;
  error?: string;
  message?: string;
};

function readAuthResponse(value: unknown): AuthApiResponse {
  if (typeof value === "object" && value !== null) {
    return value as AuthApiResponse;
  }

  return {};
}

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadCurrentUser() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
      });

      const data = readAuthResponse(await response.json().catch(() => null));

      if (response.ok && data.user) {
        setUser(data.user);
        setStatus("authenticated");
        setAuthError("");
        return;
      }

      setUser(null);
      setStatus("unauthenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      setAuthError("Não foi possível validar a sessão.");
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCurrentUser();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function submitAuth(input: AuthSubmitInput) {
    setSubmitting(true);
    setAuthError("");

    try {
      const endpoint = input.mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = input.mode === "register"
        ? { name: input.name, email: input.email, password: input.password }
        : { email: input.email, password: input.password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        credentials: "include"
      });

      const data = readAuthResponse(await response.json().catch(() => null));

      if (!response.ok || !data.user) {
        setAuthError(data.message ?? "Não foi possível autenticar.");
        return;
      }

      setUser(data.user);
      setStatus("authenticated");
    } catch {
      setAuthError("Erro de ligação ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    }).catch(() => null);

    setUser(null);
    setStatus("unauthenticated");
  }

  if (status === "loading") {
    return (
      <main className="auth-shell">
        <section className="auth-loading-card panel">
          <span className="badge badge-blue">DevRadar</span>
          <h1>A validar sessão...</h1>
          <p className="muted">Estamos a confirmar a tua conta antes de abrir o radar.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthPanel
        onSubmit={submitAuth}
        submitting={submitting}
        error={authError}
        clearError={() => setAuthError("")}
      />
    );
  }

  return children({
    user,
    logout,
    refreshUser: loadCurrentUser
  });
}
