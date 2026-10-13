"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { ApiError } from "./api-client";

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Carrega dados ao montar e sempre que `deps` mudar. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // O Next (Cache Components) esconde páginas com <Activity> em vez de desmontá-las.
  // Ao voltar, o efeito abaixo busca de novo, mas os dados antigos apareceriam até a
  // resposta chegar (ex.: o total do mês antes da importação). Limpar ao esconder
  // troca esse instante de número errado por "Carregando…".
  useLayoutEffect(() => {
    return () => {
      setData(undefined);
      setLoading(true);
    };
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        return fn(ctrl.signal);
      })
      .then((d) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.detail : "Falha ao carregar dados");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload };
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Erro inesperado. Tente novamente.";
}
