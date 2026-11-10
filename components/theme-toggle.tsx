"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import { TEMA_STORAGE_KEY, type Tema } from "@/lib/tema";

function temaAtual(): Tema {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// O tema "mora" no atributo data-theme do <html>; o componente só o observa.
function assinarTema(aoMudar: () => void) {
  const obs = new MutationObserver(aoMudar);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

function temaPreferido(): Tema {
  try {
    const salvo = localStorage.getItem(TEMA_STORAGE_KEY);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore(assinarTema, temaAtual, () => "light" as Tema);

  // O script do <head> já aplicou o tema. Em dev, o Strict Mode limpa o atributo
  // do <html> ao remontar, então reaplicamos (em produção não muda nada).
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", temaPreferido());
  }, []);

  function alternar() {
    const novo: Tema = temaAtual() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem(TEMA_STORAGE_KEY, novo);
    } catch {}
  }

  const escuro = tema === "dark";
  const rotulo = escuro ? "Usar modo claro" : "Usar modo escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600 ${className}`}
    >
      {escuro ? (
        // Sol
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="size-5" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Lua
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
