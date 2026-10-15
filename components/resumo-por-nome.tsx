"use client";

import { useState } from "react";

import { BarrasPorNome, type Textos } from "@/components/barras-por-nome";
import { formatCentavos } from "@/lib/money";
import type { DestinoResumo, TipoTransacao } from "@/lib/types";

interface Props {
  /** despesa: para onde foi o dinheiro (destinos); receita: de onde veio (origens). */
  tipo: TipoTransacao;
  dados: DestinoResumo[];
  total: number;
  selecionado: string | null;
  onSelecionar: (chave: string | null) => void;
}

const VISIVEIS = 10;

const TEXTOS: Record<TipoTransacao, Textos & { coluna: string }> = {
  despesa: {
    lista: "Gastos por destino",
    coluna: "Destino",
    fracao: "dos gastos",
    mostrarTodos: (n) => `Mostrar todos os ${n} destinos`,
    mostrarMaiores: "Mostrar só os maiores",
  },
  receita: {
    lista: "Entradas por origem",
    coluna: "Quem enviou",
    fracao: "das entradas",
    mostrarTodos: (n) => `Mostrar todas as ${n} origens`,
    mostrarMaiores: "Mostrar só as maiores",
  },
};

type Visao = "grafico" | "tabela";

/**
 * Valores do mês agrupados por nome (destino dos gastos ou origem das entradas),
 * do maior para o menor, em gráfico de barras ou em tabela. Clicar filtra os
 * lançamentos; o nome escolhido fica em destaque.
 */
export function ResumoPorNome(props: Props) {
  const [visao, setVisao] = useState<Visao>("grafico");
  return (
    <>
      <div role="group" aria-label="Visualização" className="mb-3 inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
        {(["grafico", "tabela"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={visao === v}
            onClick={() => setVisao(v)}
            className={`rounded-md px-3 py-1 font-medium focus-visible:outline-2 focus-visible:outline-emerald-600 ${
              visao === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {v === "grafico" ? "Gráfico" : "Tabela"}
          </button>
        ))}
      </div>
      {visao === "grafico" ? (
        <BarrasPorNome
          dados={props.dados}
          total={props.total}
          selecionado={props.selecionado}
          onSelecionar={props.onSelecionar}
          textos={TEXTOS[props.tipo]}
        />
      ) : (
        <Tabela {...props} />
      )}
    </>
  );
}

function Tabela({ tipo, dados, total, selecionado, onSelecionar }: Props) {
  const textos = TEXTOS[tipo];
  const [todas, setTodas] = useState(false);
  // O nome filtrado continua visível mesmo fora dos maiores.
  const corte = Math.max(VISIVEIS, dados.findIndex((d) => d.chave === selecionado) + 1);
  const visiveis = todas ? dados : dados.slice(0, corte);

  return (
    <>
      <div className="-mx-5 overflow-x-auto">
        <table className="min-w-full text-sm" aria-label={textos.lista}>
          <thead className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr className="border-b border-slate-200">
              <th className="px-5 py-2">{textos.coluna}</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Lançamentos</th>
              <th className="px-3 py-2 text-right">% {textos.fracao}</th>
              <th className="px-5 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiveis.map((d) => {
              const pct = total > 0 ? (d.total_centavos / total) * 100 : 0;
              const ativa = selecionado === d.chave;
              const apagada = selecionado !== null && !ativa;
              return (
                <tr key={d.chave} className={ativa ? "bg-emerald-50" : "hover:bg-slate-50"}>
                  <td className="max-w-0 px-5 py-2 sm:max-w-none">
                    <button
                      type="button"
                      onClick={() => onSelecionar(ativa ? null : d.chave)}
                      aria-pressed={ativa}
                      className={`block w-full truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                        apagada ? "text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {d.nome}
                    </button>
                  </td>
                  <td className="hidden px-3 py-2 text-right text-slate-500 tabular-nums sm:table-cell">{d.quantidade}</td>
                  <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{pct.toFixed(1).replace(".", ",")}%</td>
                  <td
                    className={`px-5 py-2 text-right font-medium whitespace-nowrap tabular-nums ${
                      apagada ? "text-slate-400" : tipo === "receita" ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {formatCentavos(d.total_centavos)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dados.length > VISIVEIS && (
        <button
          type="button"
          onClick={() => setTodas((t) => !t)}
          className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
        >
          {todas ? textos.mostrarMaiores : textos.mostrarTodos(dados.length)}
        </button>
      )}
    </>
  );
}
