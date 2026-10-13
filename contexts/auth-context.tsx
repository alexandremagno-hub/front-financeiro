"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  apiFetch,
  configureApiClient,
  logoutRequest,
  refreshAccessToken,
} from "@/lib/api-client";
import type { AccessTokenResponse, Usuario } from "@/lib/types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  signup: (dados: { nome: string; email: string; senha: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // O access token vive SOMENTE aqui, em memória. F5 apaga; a sessão volta pelo
  // cookie HttpOnly de refresh. O ref espelha o state para o api-client ler o
  // valor atual de forma síncrona fora do ciclo de render.
  const [, setTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Usuario | null>(null);

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setTokenState(token);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [setToken]);

  const loadUser = useCallback(async () => {
    const me = await apiFetch<Usuario>("/usuarios/me");
    setUser(me);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    configureApiClient({
      getToken: () => tokenRef.current,
      setToken,
      onSessionExpired: clearSession,
    });

    // Recupera a sessão após F5: tenta o refresh silencioso ANTES de liberar
    // as rotas protegidas (enquanto isso status = "loading").
    // Em dev o StrictMode monta duas vezes; o refresh é single-flight, então
    // ambas as montagens compartilham a mesma requisição.
    let cancelado = false;
    refreshAccessToken()
      .then(async (token) => {
        if (cancelado) return;
        if (!token) return clearSession();
        await loadUser();
      })
      .catch(() => {
        if (!cancelado) clearSession();
      });
    return () => {
      cancelado = true;
    };
  }, [setToken, clearSession, loadUser]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const data = await apiFetch<AccessTokenResponse>("/auth/login", {
        method: "POST",
        body: { email, senha },
        auth: false,
      });
      setToken(data.access_token);
      await loadUser();
    },
    [setToken, loadUser],
  );

  const signup = useCallback(
    async (dados: { nome: string; email: string; senha: string }) => {
      // A API cria o tenant + usuário admin e já devolve o access token (e o cookie).
      const data = await apiFetch<AccessTokenResponse>("/auth/signup", {
        method: "POST",
        body: dados,
        auth: false,
      });
      setToken(data.access_token);
      await loadUser();
    },
    [setToken, loadUser],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, login, signup, logout }),
    [status, user, login, signup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
