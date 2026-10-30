import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, configureApiClient, refreshAccessToken } from "@/lib/api-client";

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeader(c: Call): string | undefined {
  return (c.init.headers as Record<string, string> | undefined)?.Authorization;
}

let token: string | null;
let expired: ReturnType<typeof vi.fn>;
let calls: Call[];

function setup(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    }),
  );
}

beforeEach(() => {
  token = "velho";
  expired = vi.fn();
  configureApiClient({
    getToken: () => token,
    setToken: (t) => {
      token = t;
    },
    onSessionExpired: expired,
  });
});

describe("apiFetch", () => {
  it("envia credentials: include e o Bearer token em toda chamada", async () => {
    setup(() => json(200, { ok: true }));
    await apiFetch("/contas");
    expect(calls[0].url).toBe("/api/contas");
    expect(calls[0].init.credentials).toBe("include");
    expect(authHeader(calls[0])).toBe("Bearer velho");
  });

  it("repete o parâmetro para listas e ignora vazios", async () => {
    setup(() => json(200, {}));
    await apiFetch("/resumo", { query: { mes: ["2026-03", "2026-01"], tipo: undefined, destino: "" } });
    expect(calls[0].url).toBe("/api/resumo?mes=2026-03&mes=2026-01");
  });

  it("em 401 faz refresh e repete a requisição original uma vez com o token novo", async () => {
    setup((url, init) => {
      if (url === "/api/auth/refresh") return json(200, { access_token: "novo", token_type: "bearer", expires_in: 900 });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer novo" ? json(200, [{ id: 1 }]) : json(401, { detail: "Não autenticado" });
    });

    const data = await apiFetch<{ id: number }[]>("/transacoes");

    expect(data).toEqual([{ id: 1 }]);
    expect(calls.map((c) => c.url)).toEqual(["/api/transacoes", "/api/auth/refresh", "/api/transacoes"]);
    expect(calls[1].init.method).toBe("POST");
    expect(calls[1].init.credentials).toBe("include");
    expect(token).toBe("novo"); // token atualizado no "AuthContext"
    expect(expired).not.toHaveBeenCalled();
  });

  it("requisições concorrentes com 401 disparam UM único refresh", async () => {
    let refreshes = 0;
    setup(async (url, init) => {
      if (url === "/api/auth/refresh") {
        refreshes++;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { access_token: "novo", token_type: "bearer", expires_in: 900 });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer novo" ? json(200, { url }) : json(401, { detail: "x" });
    });

    const r = await Promise.all([apiFetch("/a"), apiFetch("/b"), apiFetch("/c")]);

    expect(r).toEqual([{ url: "/api/a" }, { url: "/api/b" }, { url: "/api/c" }]);
    expect(refreshes).toBe(1);
  });

  it("refresh simultâneo do mount (StrictMode) e de uma requisição também é compartilhado", async () => {
    setup(() => json(200, { access_token: "novo", token_type: "bearer", expires_in: 900 }));
    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
    expect(a).toBe("novo");
    expect(b).toBe("novo");
    expect(calls).toHaveLength(1);
  });

  it("se o refresh falha, encerra a sessão e lança o 401", async () => {
    setup((url) => (url === "/api/auth/refresh" ? json(401, { detail: "Sessão inválida" }) : json(401, { detail: "Não autenticado" })));

    await expect(apiFetch("/contas")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    expect(token).toBeNull();
    expect(calls.map((c) => c.url)).toEqual(["/api/contas", "/api/auth/refresh"]);
  });

  it("não entra em loop: se a repetição também der 401, desiste", async () => {
    setup((url) =>
      url === "/api/auth/refresh"
        ? json(200, { access_token: "novo", token_type: "bearer", expires_in: 900 })
        : json(401, { detail: "Não autenticado" }),
    );

    await expect(apiFetch("/contas")).rejects.toBeInstanceOf(ApiError);
    expect(calls.map((c) => c.url)).toEqual(["/api/contas", "/api/auth/refresh", "/api/contas"]);
    expect(expired).toHaveBeenCalledOnce();
  });

  it("rotas públicas (auth: false) não mandam token nem tentam refresh", async () => {
    setup(() => json(401, { detail: "Credenciais inválidas" }));
    await expect(apiFetch("/auth/login", { method: "POST", body: {}, auth: false })).rejects.toMatchObject({
      status: 401,
      detail: "Credenciais inválidas",
    });
    expect(calls).toHaveLength(1);
    expect(authHeader(calls[0])).toBeUndefined();
    expect(expired).not.toHaveBeenCalled();
  });

  it("se outra requisição já renovou o token, reaproveita sem novo refresh", async () => {
    setup((url, init) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      if (auth === "Bearer velho") {
        token = "renovado-por-outra-requisicao";
        return json(401, { detail: "x" });
      }
      return json(200, { ok: true });
    });
    await apiFetch("/contas");
    expect(calls.map((c) => c.url)).toEqual(["/api/contas", "/api/contas"]);
    expect(authHeader(calls[1])).toBe("Bearer renovado-por-outra-requisicao");
  });

  it("formata erros de validação 422 do FastAPI", async () => {
    setup(() => json(422, { detail: [{ loc: ["body", "valor_centavos"], msg: "Input should be greater than 0" }] }));
    await expect(apiFetch("/transacoes", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 422,
      detail: "valor_centavos: Input should be greater than 0",
    });
  });
});

describe("upload", () => {
  it("envia FormData sem forçar Content-Type JSON e repete após refresh", async () => {
    setup((url, init) => {
      if (url === "/api/auth/refresh") return json(200, { access_token: "novo", token_type: "bearer", expires_in: 900 });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer novo" ? json(201, { ok: true }) : json(401, { detail: "x" });
    });
    const form = new FormData();
    form.append("arquivo", new Blob(["a,b\n1,2"], { type: "text/csv" }), "x.csv");

    const { api } = await import("@/lib/api-client");
    await api.upload("/importacoes", form);

    const envios = calls.filter((c) => c.url === "/api/importacoes");
    expect(envios).toHaveLength(2);
    for (const c of envios) {
      expect(c.init.body).toBe(form);
      expect((c.init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    }
  });
});
