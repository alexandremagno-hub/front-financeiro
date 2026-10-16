"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ResumoPorNome } from "@/components/resumo-por-nome";
import { Button, Card, EmptyState, ErrorBox, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatData } from "@/lib/dates";
import { intervaloMes, nomeMes } from "@/lib/meses";
import { formatCentavos } from "@/lib/money";
import type { Categoria, Conta, ResumoMes, TransacaoPage } from "@/lib/types";
import { errorMessage, useAsync } from "@/lib/use-async";

const OPCOES_POR_PAGINA = [10, 20, 50, 100];

export function Dashboard() {
  const sp = useSearchParams();
  const meses = useAsync((signal) => api.get<string[]>("/resumo/meses", undefined, signal), []);

  if (meses.loading && !meses.data) return <EmptyState>Carregando…</EmptyState>;
  if (meses.error) return <ErrorBox>{meses.error}</ErrorBox>;
  if (!meses.data?.length) return <SemDados />;

  // Mês da URL (link "Ver gastos de…") ou, por padrão, o mais recente com dados.
  const mesUrl = sp.get("mes");
  const mes = mesUrl && /^\d{4}-\d{2}$/.test(mesUrl) ? mesUrl : meses.data[0];
  return <GastosDoMes key={mes} mes={mes} meses={meses.data} destino={sp.get("destino")} origem={sp.get("origem")} />;
}

function SemDados() {
  return (
    <>
      <PageHeader title="Gastos do mês" />
      <Card className="py-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Comece importando um extrato</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Baixe o extrato em CSV no app do seu banco (no Nubank: conta ou fatura do cartão) e envie aqui. Mostramos
          para onde foi o seu dinheiro em cada mês.
        </p>
        <Link
          href="/importar"
          className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Importar extrato
        </Link>
      </Card>
    </>
  );
}

function GastosDoMes({
  mes,
  meses,
  destino,
  origem,
}: {
  mes: string;
  meses: string[];
  destino: string | null;
  origem: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(OPCOES_POR_PAGINA[0]);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const { inicio, fim } = intervaloMes(mes);

  const resumo = useAsync((signal) => api.get<ResumoMes>("/resumo", { mes }, signal), [mes]);
  const refs = useAsync(
    async (signal) => {
      const [categorias, contas] = await Promise.all([
        api.get<Categoria[]>("/categorias", undefined, signal),
        api.get<Conta[]>("/contas", undefined, signal),
      ]);
      return { categorias, contas };
    },
    [],
  );
  const lista = useAsync(
    (signal) =>
      api.get<TransacaoPage>(
        "/transacoes",
        {
          data_inicio: inicio,
          data_fim: fim,
          // Origem e destino usam a mesma chave; a origem só olha as entradas.
          destino: destino ?? origem ?? undefined,
          tipo: origem !== null ? "receita" : undefined,
          limit: porPagina,
          offset: pagina * porPagina,
        },
        signal,
      ),
    [mes, destino, origem, pagina, porPagina],
  );

  // Um filtro por vez: escolher um destino limpa a origem e vice-versa.
  function navegar(params: { mes?: string; destino?: string | null; origem?: string | null }) {
    const novo = new URLSearchParams();
    novo.set("mes", params.mes ?? mes);
    const mudouFiltro = "destino" in params || "origem" in params;
    const dest = mudouFiltro ? params.destino : destino;
    const orig = mudouFiltro ? params.origem : origem;
    if (dest !== null && dest !== undefined) novo.set("destino", dest);
    else if (orig !== null && orig !== undefined) novo.set("origem", orig);
    setPagina(0);
    router.replace(`${pathname}?${novo.toString()}`, { scroll: false });
  }

  async function recategorizar(transacaoId: number, novaCategoria: string) {
    setErroAcao(null);
    try {
      await api.patch(`/transacoes/${transacaoId}`, { categoria_id: novaCategoria ? Number(novaCategoria) : null });
      resumo.reload();
      lista.reload();
    } catch (e) {
      setErroAcao(errorMessage(e));
    }
  }

  const idx = meses.indexOf(mes);
  const anterior = idx >= 0 ? meses[idx + 1] : undefined; // lista vem do mais recente ao mais antigo
  const proximo = idx > 0 ? meses[idx - 1] : undefined;
  const categorias = [...(refs.data?.categorias ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const contaPorId = new Map((refs.data?.contas ?? []).map((c) => [c.id, c]));
  const r = resumo.data;
  const nomeFiltro =
    destino !== null
      ? r?.despesas_por_destino.find((d) => d.chave === destino)?.nome
      : origem !== null
        ? r?.receitas_por_origem.find((o) => o.chave === origem)?.nome
        : null;

  return (
    <>
      <PageHeader
        title={`Gastos do mês de ${nomeMes(mes).split(" ")[0].toLowerCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={!anterior} onClick={() => anterior && navegar({ mes: anterior, destino: null, origem: null })} aria-label="Mês anterior">
              ‹
            </Button>
            <Select
              aria-label="Mês"
              value={mes}
              onChange={(e) => navegar({ mes: e.target.value, destino: null, origem: null })}
              className="w-48"
            >
              {!meses.includes(mes) && <option value={mes}>{nomeMes(mes)}</option>}
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nomeMes(m)}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={!proximo} onClick={() => proximo && navegar({ mes: proximo, destino: null, origem: null })} aria-label="Próximo mês">
              ›
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <ErrorBox>{resumo.error || lista.error || refs.error || erroAcao}</ErrorBox>
      </div>

      {/* KPIs: o gasto do mês é o número principal da tela */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Gastos em {nomeMes(mes).toLowerCase()}</div>
          <div className="mt-1 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {r ? formatCentavos(r.total_despesas_centavos) : "—"}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Entradas</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{r ? formatCentavos(r.total_receitas_centavos) : "—"}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Saldo do mês</div>
          <div className={`mt-1 text-2xl font-semibold ${r && r.saldo_centavos < 0 ? "text-red-600" : "text-slate-900"}`}>
            {r ? formatCentavos(r.saldo_centavos) : "—"}
          </div>
        </Card>
      </div>

      {/* Lado a lado em telas largas; empilhados no celular. */}
      <div className="mb-6 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Entradas</h2>
            {origem !== null && (
              <button type="button" onClick={() => navegar({ origem: null })} className="text-sm font-medium text-emerald-700 hover:underline">
                Mostrar todas as origens
              </button>
            )}
          </div>
          {!r ? (
            <EmptyState>Carregando…</EmptyState>
          ) : r.receitas_por_origem.length === 0 ? (
            <EmptyState>Nenhuma entrada neste mês.</EmptyState>
          ) : (
            <ResumoPorNome
              tipo="receita"
              dados={r.receitas_por_origem}
              total={r.total_receitas_centavos}
              selecionado={origem}
              onSelecionar={(chave) => navegar({ origem: chave })}
            />
          )}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Saídas</h2>
            {destino !== null && (
              <button type="button" onClick={() => navegar({ destino: null })} className="text-sm font-medium text-emerald-700 hover:underline">
                Mostrar todos os destinos
              </button>
            )}
          </div>
          {!r ? (
            <EmptyState>Carregando…</EmptyState>
          ) : r.despesas_por_destino.length === 0 ? (
            <EmptyState>Nenhum gasto neste mês.</EmptyState>
          ) : (
            <ResumoPorNome
              tipo="despesa"
              dados={r.despesas_por_destino}
              total={r.total_despesas_centavos}
              selecionado={destino}
              onSelecionar={(chave) => navegar({ destino: chave })}
            />
          )}
          {r && r.fora_do_resumo_centavos > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              {formatCentavos(r.fora_do_resumo_centavos)} em pagamentos de fatura não entram nos totais: os gastos do cartão
              já aparecem um a um quando você importa a fatura.
            </p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            Lançamentos{nomeFiltro ? ` · ${nomeFiltro}` : ""}
          </h2>
          <span className="text-xs text-slate-500">Errou a categoria? Troque na lista e o resumo se ajusta.</span>
        </div>
        {lista.loading && !lista.data ? (
          <EmptyState>Carregando…</EmptyState>
        ) : !lista.data?.items.length ? (
          <EmptyState>Nenhum lançamento.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${lista.loading ? "opacity-60" : ""}`}>
                {lista.data.items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatData(t.data_competencia)}</td>
                    <td className="px-4 py-2.5">{t.descricao || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{contaPorId.get(t.conta_id)?.nome ?? "…"}</td>
                    <td className="px-4 py-2">
                      <Select
                        aria-label={`Categoria de ${t.descricao}`}
                        value={t.categoria_id ?? ""}
                        onChange={(e) => recategorizar(t.id, e.target.value)}
                        className="min-w-44 py-1.5 text-xs"
                      >
                        <option value="">Sem categoria</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums ${
                        categoriaPorId.get(t.categoria_id ?? -1)?.fora_do_resumo
                          ? "text-slate-400"
                          : t.tipo === "receita"
                            ? "text-emerald-700"
                            : "text-slate-900"
                      }`}
                    >
                      {t.tipo === "receita" ? "+ " : "− "}
                      {formatCentavos(t.valor_centavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lista.data && lista.data.total > OPCOES_POR_PAGINA[0] && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Mostrar
                <Select
                  value={porPagina}
                  onChange={(e) => {
                    setPorPagina(Number(e.target.value));
                    setPagina(0);
                  }}
                  className="w-20 py-1.5 tabular-nums"
                >
                  {OPCOES_POR_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
              <span>
                {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, lista.data.total)} de {lista.data.total}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
                ‹
              </Button>
              <Button variant="secondary" disabled={(pagina + 1) * porPagina >= lista.data.total} onClick={() => setPagina((p) => p + 1)} aria-label="Próxima página">
                ›
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
