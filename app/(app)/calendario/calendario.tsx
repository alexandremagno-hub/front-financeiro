"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button, Card, EmptyState, ErrorBox, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatData } from "@/lib/dates";
import { intervaloMes, nomeMes, semanasDoMes } from "@/lib/meses";
import { formatCentavos } from "@/lib/money";
import type { Categoria, Conta, Transacao, TransacaoPage } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const LIMITE_API = 500; // máximo aceito por GET /transacoes

export function Calendario() {
  const sp = useSearchParams();
  const meses = useAsync((signal) => api.get<string[]>("/resumo/meses", undefined, signal), []);

  if (meses.loading && !meses.data) return <EmptyState>Carregando…</EmptyState>;
  if (meses.error) return <ErrorBox>{meses.error}</ErrorBox>;
  if (!meses.data?.length) {
    return (
      <>
        <PageHeader title="Calendário" />
        <Card className="py-12 text-center">
          <p className="text-sm text-slate-600">Nenhum lançamento ainda.</p>
          <Link href="/importar" className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline">
            Importar extrato
          </Link>
        </Card>
      </>
    );
  }

  const mesUrl = sp.get("mes");
  const mes = mesUrl && /^\d{4}-\d{2}$/.test(mesUrl) ? mesUrl : meses.data[0];
  const diaUrl = sp.get("dia");
  const dia = diaUrl?.startsWith(`${mes}-`) ? diaUrl : null;
  return <CalendarioDoMes key={mes} mes={mes} meses={meses.data} dia={dia} />;
}

interface TotaisDia {
  entradas: number;
  saidas: number;
}

function CalendarioDoMes({ mes, meses, dia }: { mes: string; meses: string[]; dia: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { inicio, fim } = intervaloMes(mes);

  // O mês inteiro de uma vez: os totais de cada dia saem daqui.
  const transacoes = useAsync(
    async (signal) => {
      const todas: Transacao[] = [];
      for (let offset = 0; ; offset += LIMITE_API) {
        const pagina = await api.get<TransacaoPage>(
          "/transacoes",
          { data_inicio: inicio, data_fim: fim, limit: LIMITE_API, offset },
          signal,
        );
        todas.push(...pagina.items);
        if (todas.length >= pagina.total || !pagina.items.length) return todas;
      }
    },
    [mes],
  );
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

  function navegar(params: { mes?: string; dia?: string | null }) {
    const novo = new URLSearchParams();
    novo.set("mes", params.mes ?? mes);
    const d = "dia" in params ? params.dia : dia;
    if (d) novo.set("dia", d);
    router.replace(`${pathname}?${novo.toString()}`, { scroll: false });
  }

  const categoriaPorId = new Map((refs.data?.categorias ?? []).map((c) => [c.id, c]));
  const contaPorId = new Map((refs.data?.contas ?? []).map((c) => [c.id, c]));
  // Mesma regra do resumo: pagamento de fatura não entra nos totais.
  const contaNoTotal = (t: Transacao) => !categoriaPorId.get(t.categoria_id ?? -1)?.fora_do_resumo;

  const porDia = new Map<string, Transacao[]>();
  for (const t of transacoes.data ?? []) {
    const lista = porDia.get(t.data_competencia) ?? [];
    lista.push(t);
    porDia.set(t.data_competencia, lista);
  }
  function totais(lista: Transacao[]): TotaisDia {
    const r = { entradas: 0, saidas: 0 };
    for (const t of lista) {
      if (!contaNoTotal(t)) continue;
      if (t.tipo === "receita") r.entradas += t.valor_centavos;
      else r.saidas += t.valor_centavos;
    }
    return r;
  }

  const idx = meses.indexOf(mes);
  const anterior = idx >= 0 ? meses[idx + 1] : undefined; // lista vem do mais recente ao mais antigo
  const proximo = idx > 0 ? meses[idx - 1] : undefined;
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  // Entradas antes das saídas, como no resto do app.
  const doDia = [...(dia ? (porDia.get(dia) ?? []) : [])].sort(
    (a, b) => (a.tipo === b.tipo ? b.valor_centavos - a.valor_centavos : a.tipo === "receita" ? -1 : 1),
  );
  const totaisDia = totais(doDia);

  return (
    <>
      <PageHeader
        title="Calendário"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={!anterior} onClick={() => anterior && navegar({ mes: anterior, dia: null })} aria-label="Mês anterior">
              ‹
            </Button>
            <Select aria-label="Mês" value={mes} onChange={(e) => navegar({ mes: e.target.value, dia: null })} className="w-48">
              {!meses.includes(mes) && <option value={mes}>{nomeMes(mes)}</option>}
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nomeMes(m)}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={!proximo} onClick={() => proximo && navegar({ mes: proximo, dia: null })} aria-label="Próximo mês">
              ›
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <ErrorBox>{transacoes.error || refs.error}</ErrorBox>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {DIAS_DA_SEMANA.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-medium tracking-wide text-slate-500 uppercase">
                {d}
              </div>
            ))}
            {semanasDoMes(mes)
              .flat()
              .map((d, i) => {
                if (!d) return <div key={`vazio-${i}`} />;
                const t = totais(porDia.get(d) ?? []);
                const selecionado = d === dia;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => navegar({ dia: selecionado ? null : d })}
                    aria-pressed={selecionado}
                    aria-label={`Dia ${formatData(d)}`}
                    className={`flex min-h-16 flex-col items-stretch rounded-lg p-1.5 text-left ring-1 transition-colors sm:min-h-24 sm:p-2 ${
                      selecionado ? "bg-emerald-50 ring-2 ring-emerald-600" : "ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        d === hojeIso ? "inline-flex size-6 items-center justify-center self-start rounded-full bg-emerald-600 text-white" : "text-slate-700"
                      }`}
                    >
                      {Number(d.slice(-2))}
                    </span>
                    {transacoes.data && (
                      <span className="mt-auto space-y-0.5 text-[10px] leading-tight tabular-nums sm:text-xs">
                        {t.entradas > 0 && <span className="block truncate text-emerald-700">+ {formatCentavos(t.entradas)}</span>}
                        {t.saidas > 0 && <span className="block truncate text-slate-700">− {formatCentavos(t.saidas)}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
          {transacoes.loading && !transacoes.data && <p className="pt-3 text-center text-sm text-slate-500">Carregando…</p>}
        </Card>

        <Card className="overflow-hidden p-0">
          {!dia ? (
            <EmptyState>Clique em um dia para ver os lançamentos.</EmptyState>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">{formatData(dia)}</h2>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Entradas</div>
                    <div className="font-medium text-emerald-700 tabular-nums">{formatCentavos(totaisDia.entradas)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Saídas</div>
                    <div className="font-medium text-slate-900 tabular-nums">{formatCentavos(totaisDia.saidas)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Saldo</div>
                    <div className={`font-medium tabular-nums ${totaisDia.entradas - totaisDia.saidas < 0 ? "text-red-600" : "text-slate-900"}`}>
                      {formatCentavos(totaisDia.entradas - totaisDia.saidas)}
                    </div>
                  </div>
                </div>
              </div>
              {!transacoes.data ? (
                <EmptyState>Carregando…</EmptyState>
              ) : !doDia.length ? (
                <EmptyState>Nenhum lançamento neste dia.</EmptyState>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {doDia.map((t) => {
                    const categoria = categoriaPorId.get(t.categoria_id ?? -1);
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                        <div className="min-w-0">
                          <div className="truncate text-slate-900">{t.descricao || <span className="text-slate-400">—</span>}</div>
                          <div className="text-xs text-slate-500">
                            {contaPorId.get(t.conta_id)?.nome ?? "…"} · {categoria?.nome ?? "Sem categoria"}
                          </div>
                        </div>
                        <div
                          className={`font-medium whitespace-nowrap tabular-nums ${
                            !contaNoTotal(t) ? "text-slate-400" : t.tipo === "receita" ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {t.tipo === "receita" ? "+ " : "− "}
                          {formatCentavos(t.valor_centavos)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
