"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/contexts/auth-context";

import { FullScreenMessage } from "./ui";

/** Só renderiza os filhos com sessão confirmada; sem sessão, vai para o login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const atual = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(atual)}`);
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return <FullScreenMessage>{status === "loading" ? "Carregando sessão…" : "Redirecionando…"}</FullScreenMessage>;
  }
  return <>{children}</>;
}
