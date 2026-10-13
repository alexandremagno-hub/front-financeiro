"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, ErrorBox, Field, FullScreenMessage, Input } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-client";
import { safeNext } from "@/lib/redirect";

export function LoginForm() {
  const { status, login } = useAuth();
  const router = useRouter();
  const destino = safeNext(useSearchParams().get("next"));

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Já tem sessão (ex.: refresh silencioso funcionou): não mostra o login.
  useEffect(() => {
    if (status === "authenticated") router.replace(destino);
  }, [status, destino, router]);

  if (status !== "unauthenticated") {
    return <FullScreenMessage>Carregando…</FullScreenMessage>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      // o efeito acima redireciona quando status vira "authenticated"
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      } else if (err instanceof ApiError && err.status === 401) {
        setErro("E-mail ou senha inválidos.");
      } else {
        setErro("Não foi possível entrar. Tente novamente.");
      }
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Entre com sua conta</p>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </Field>
            <ErrorBox>{erro}</ErrorBox>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-emerald-700 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
