"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Gastos do mês" },
  { href: "/calendario", label: "Calendário" },
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
      <div className="flex h-20 items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-semibold tracking-tight text-emerald-700">
          Finanças
        </Link>
        <nav className="flex gap-2">
          {LINKS.map((l) => {
            const ativo = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-4 py-2 text-base font-medium ${
                  ativo ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-base text-slate-500 sm:inline">{user?.nome}</span>
          <Button variant="ghost" onClick={sair} className="text-base!">
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
