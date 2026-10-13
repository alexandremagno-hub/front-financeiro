"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, ErrorBox, Field, FullScreenMessage, Input } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-client";

const SENHA_MIN = 6; // mesma regra da API (SENHA_MIN_CARACTERES)

export default function CadastroPage() {
  const { status, signup } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Recém-cadastrado ainda não tem dados: o primeiro passo é importar um extrato.
    if (status === "authenticated") router.replace("/importar");
  }, [status, router]);

  if (status !== "unauthenticated") return <FullScreenMessage>Carregando…</FullScreenMessage>;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (senha !== confirmacao) return setErro("As senhas não conferem.");
    setEnviando(true);
    try {
      await signup({ nome: nome.trim(), email: email.trim(), senha });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErro("Já existe uma conta com esse e-mail. Tente entrar.");
      else if (err instanceof ApiError && err.status === 429) setErro("Muitos cadastros a partir desta rede. Tente mais tarde.");
      else if (err instanceof ApiError) setErro(err.detail);
      else setErro("Não foi possível criar a conta. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Envie o extrato do seu banco e veja para onde foi o seu dinheiro.
        </p>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nome" htmlFor="nome">
              <Input id="nome" required autoFocus maxLength={120} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Senha" htmlFor="senha" hint={`Pelo menos ${SENHA_MIN} caracteres.`}>
              <Input id="senha" type="password" required minLength={SENHA_MIN} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </Field>
            <Field label="Confirme a senha" htmlFor="confirmacao">
              <Input id="confirmacao" type="password" required autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </Field>
            <ErrorBox>{erro}</ErrorBox>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-emerald-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
