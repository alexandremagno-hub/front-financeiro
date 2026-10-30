"use client";

import { useEffect, useRef, useState } from "react";

import { rotuloMeses } from "@/lib/meses";

const NOMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** `"todos"` ou os meses marcados (AAAA-MM). Nunca uma lista vazia. */
export type SelecaoMeses = "todos" | string[];

/**
 * Escolhe um ou vários meses (salteados) ou todos de uma vez. `meses` são os que
 * têm lançamentos, do mais recente ao mais antigo, como vêm de /resumo/meses.
 */
export function SeletorMeses({
  meses,
  selecao,
  onChange,
}: {
  meses: string[];
  selecao: SelecaoMeses;
  onChange: (selecao: SelecaoMeses) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const todos = selecao === "todos";
  const marcados = new Set(todos ? meses : selecao);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar(mes: string) {
    const novo = new Set(marcados);
    if (novo.has(mes)) novo.delete(mes);
    else novo.add(mes);
    if (!novo.size) return; // sempre fica ao menos um mês
    onChange(novo.size === meses.length ? "todos" : meses.filter((m) => novo.has(m)));
  }

  // Desmarcar "Todos" volta para o mês mais recente.
  function alternarTodos() {
    onChange(todos ? [meses[0]] : "todos");
  }

  const anos = [...new Set(meses.map((m) => m.slice(0, 4)))];

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="flex w-56 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
      >
        <span className="truncate">{rotuloMeses(todos ? meses : selecao, todos)}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`size-4 shrink-0 text-slate-500 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher meses"
          className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200"
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50">
            <input type="checkbox" checked={todos} onChange={alternarTodos} className="size-4 accent-emerald-600" />
            Todos os meses
          </label>
          <div className="mt-2 max-h-72 space-y-3 overflow-y-auto border-t border-slate-100 pt-3">
            {anos.map((ano) => (
              <div key={ano}>
                <div className="mb-1.5 px-1 text-xs font-medium text-slate-500">{ano}</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {NOMES.map((nome, i) => {
                    const mes = `${ano}-${String(i + 1).padStart(2, "0")}`;
                    if (!meses.includes(mes)) {
                      return (
                        <span key={mes} className="rounded-md py-1.5 text-center text-xs text-slate-300">
                          {nome}
                        </span>
                      );
                    }
                    const marcado = marcados.has(mes);
                    return (
                      <button
                        key={mes}
                        type="button"
                        onClick={() => alternar(mes)}
                        aria-pressed={marcado}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                          marcado ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 px-1 pt-2 text-xs text-slate-500">
            Marque os meses que quer somar. Meses sem lançamento ficam apagados.
          </p>
        </div>
      )}
    </div>
  );
}
