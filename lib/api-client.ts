/**
 * Wrapper central de acesso à API.
 *
 * - Toda chamada usa `credentials: "include"` (o cookie de refresh é HttpOnly e
 *   só o navegador o envia; o JS nunca o lê).
 * - O access token NÃO é guardado aqui nem em storage: ele vive no estado do
 *   AuthContext, que registra getter/setter via `configureApiClient`.
 * - Em 401, tenta POST /auth/refresh uma vez e repete a requisição original.
 *
 * Refresh "single-flight": a API rotaciona o refresh token a cada uso e trata
 * reuso como roubo (revoga a sessão). Se duas requisições recebessem 401 e cada
 * uma chamasse /refresh, a segunda reusaria o cookie já consumido e derrubaria
 * a sessão. Por isso existe no máximo um refresh em andamento por aba
 * (`refreshPromise`) e, entre abas, um Web Lock serializa as chamadas.
 */

import type { AccessTokenResponse } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly body?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

interface AuthHandlers {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  /** Chamado quando a sessão não pode ser renovada (refresh falhou). */
  onSessionExpired: () => void;
}

let handlers: AuthHandlers = {
  getToken: () => null,
  setToken: () => {},
  onSessionExpired: () => {},
};

export function configureApiClient(h: AuthHandlers): void {
  handlers = h;
}

type Valor = string | number | boolean | null | undefined;
/** Lista vira parâmetro repetido: { mes: ["2026-01", "2026-03"] } -> ?mes=2026-01&mes=2026-03 */
type Query = Record<string, Valor | Valor[]>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** false para rotas públicas (login): não injeta token nem tenta refresh. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(v) ? v : [v]) {
      if (item !== undefined && item !== null && item !== "") qs.append(k, String(item));
    }
  }
  const s = qs.toString();
  return `${API_BASE}${path}${s ? `?${s}` : ""}`;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return new ApiError(res.status, res.statusText || `Erro ${res.status}`);
  }
  const detail = (body as { detail?: unknown })?.detail;
  let message: string;
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    // Erros de validação do FastAPI (422): lista de {loc, msg}
    message = detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const campo = d.loc?.filter((p) => p !== "body").join(".");
        return campo ? `${campo}: ${d.msg}` : d.msg;
      })
      .join("; ");
  } else {
    message = `Erro ${res.status}`;
  }
  return new ApiError(res.status, message, body);
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AccessTokenResponse;
    return data.access_token;
  } catch {
    return null;
  }
}

async function refreshWithLock(): Promise<string | null> {
  // Serializa entre abas: sem isso, duas abas renovando ao mesmo tempo enviariam
  // o mesmo cookie e a API trataria o segundo uso como roubo.
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return await navigator.locks.request("financeiro-auth-refresh", doRefresh);
  }
  return doRefresh();
}

/**
 * Renova o access token usando o cookie HttpOnly. Chamadas concorrentes
 * compartilham a mesma requisição. Atualiza o token no AuthContext.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshWithLock()
      .then((token) => {
        handlers.setToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Requisições
// ---------------------------------------------------------------------------

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // FormData (upload de arquivo): o navegador define o Content-Type com o boundary.
  const multipart = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : multipart ? (opts.body as FormData) : JSON.stringify(opts.body),
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
}

export async function apiFetch<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  const tokenUsado = auth ? handlers.getToken() : null;
  let res = await send(path, opts, tokenUsado);

  if (res.status === 401 && auth) {
    // Se outra requisição já renovou o token enquanto esta estava em voo, usa o
    // novo direto; senão renova (ou entra no refresh que já está em andamento).
    const atual = handlers.getToken();
    const novoToken = atual && atual !== tokenUsado ? atual : await refreshAccessToken();
    if (!novoToken) {
      handlers.onSessionExpired();
      throw await parseError(res);
    }
    res = await send(path, opts, novoToken); // repete UMA vez
    if (res.status === 401) {
      handlers.onSessionExpired();
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Revoga a sessão na API (refresh + access atual). Nunca lança. */
export async function logoutRequest(): Promise<void> {
  const token = handlers.getToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // Mesmo offline, o estado local é limpo pelo chamador.
  }
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiFetch<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  /** Envia multipart/form-data (o FormData pode ser reenviado na repetição após refresh). */
  upload: <T>(path: string, form: FormData) => apiFetch<T>(path, { method: "POST", body: form }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: (path: string) => apiFetch<void>(path, { method: "DELETE" }),
};
