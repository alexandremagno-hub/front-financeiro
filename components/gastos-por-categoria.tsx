"use client";

import { useState } from "react";

import { formatCentavos } from "@/lib/money";
import type { CategoriaResumo } from "@/lib/types";

interface Props {
  dados: CategoriaResumo[];
  total: number;
  selecionada: number | null;
  onSelecionar: (categoriaId: number | null) => void;
}

/**
 * Barras horizontais, uma por categoria, ordenadas do maior para o menor gasto.
 * Uma série só (magnitude): um único tom, sem legenda; o título da seção nomeia o
 * que está plotado. Valor no fim de cada barra; percentual e quantidade no tooltip
 * (hover ou foco do teclado). Clicar filtra a lista abaixo; a categoria escolhida
 * fica em destaque e as demais em cinza.
 */
export function GastosPorCategoria({ dados, total, selecionada, onSelecionar }: Props) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const max = Math.max(...dados.map((d) => d.total_centavos), 1);

  return (
    <ul className="space-y-1" aria-label="Gastos por categoria">
      {dados.map((d, i) => {
        const pct = total > 0 ? (d.total_centavos / total) * 100 : 0;
        const largura = Math.max((d.total_centavos / max) * 100, 0.5);
        const id = d.categoria_id;
        const destacada = selecionada === null || selecionada === id;
        const mostrarTooltip = ativa === i;
        return (
          <li key={id ?? `sem-${i}`} className="relative">
            <button
              type="button"
              onClick={() => onSelecionar(selecionada === id ? null : id)}
              onPointerEnter={() => setAtiva(i)}
              onPointerLeave={() => setAtiva((a) => (a === i ? null : a))}
              onFocus={() => setAtiva(i)}
              onBlur={() => setAtiva((a) => (a === i ? null : a))}
              aria-pressed={selecionada === id}
              aria-label={`${d.nome}: ${formatCentavos(d.total_centavos)}, ${pct.toFixed(1).replace(".", ",")}% dos gastos, ${d.quantidade} lançamentos`}
              className="grid w-full grid-cols-[minmax(6rem,11rem)_1fr] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span className={`truncate text-sm ${destacada ? "text-slate-800" : "text-slate-400"}`}>{d.nome}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-5 shrink-0 rounded-r transition-colors ${
                    destacada ? (mostrarTooltip ? "bg-emerald-500" : "bg-emerald-600") : "bg-slate-200"
                  }`}
                  style={{ width: `calc((100% - 6.5rem) * ${largura / 100})` }}
                />
                <span className={`text-sm whitespace-nowrap ${destacada ? "font-medium text-slate-900" : "text-slate-400"}`}>
                  {formatCentavos(d.total_centavos)}
                </span>
              </span>
            </button>
            {mostrarTooltip && (
              // Uma linha, dentro da própria linha da categoria (à direita): não cobre
              // as barras vizinhas; no máximo cobre o valor desta, que ele repete.
              <div
                role="tooltip"
                className="pointer-events-none absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center gap-2 rounded-md bg-white px-2.5 py-1 text-xs whitespace-nowrap shadow-md ring-1 ring-slate-200"
              >
                <span className="inline-block h-0.5 w-3 rounded bg-emerald-600" aria-hidden />
                <span className="text-sm font-semibold text-slate-900">{formatCentavos(d.total_centavos)}</span>
                <span className="text-slate-500">
                  {pct.toFixed(1).replace(".", ",")}% dos gastos · {d.quantidade} {d.quantidade === 1 ? "lançamento" : "lançamentos"}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
