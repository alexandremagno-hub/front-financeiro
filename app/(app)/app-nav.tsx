"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Gastos do mês" },
  { href: "/importar", label: "Importar extrato" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function sair() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight text-emerald-700">
          Financeiro
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => {
            const ativo = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  ativo ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.nome}</span>
          <Button variant="ghost" onClick={sair}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
