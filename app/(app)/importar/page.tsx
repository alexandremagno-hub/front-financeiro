"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api-client";
import { nomeMes } from "@/lib/meses";
import {
  FORMATO_LABEL,
  type Conta,
  type Importacao,
  type PreviewExtrato,
  type ResultadoImportacao,
} from "@/lib/types";
import { errorMessage, useAsync } from "@/lib/use-async";

const NOVA = "__nova__";

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewExtrato | null>(null);
  const [contaSel, setContaSel] = useState(NOVA);
  const [contaNome, setContaNome] = useState("");
  const [colunas, setColunas] = useState({ coluna_data: "", coluna_descricao: "", coluna_valor: "" });
  const [gastosPositivos, setGastosPositivos] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const [contasAtuais, setContasAtuais] = useState<Conta[]>([]);
  const historico = useAsync((signal) => api.get<Importacao[]>("/importacoes", undefined, signal), []);

  function recomecar() {
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function escolherArquivo(f: File | undefined) {
    if (!f) return;
    recomecar();
    setArquivo(f);
    setOcupado(true);
    try {
      const form = new FormData();
      form.append("arquivo", f);
      // Contas buscadas junto com a prévia: a lista da tela pode estar desatualizada
      // (ex.: a importação anterior acabou de criar a conta).
      const [p, listaContas] = await Promise.all([
        api.upload<PreviewExtrato>("/importacoes/preview", form),
        api.get<Conta[]>("/contas"),
      ]);
      setPreview(p);
      setContasAtuais(listaContas);
      // Reaproveita a conta com o nome sugerido, se já existir (ex.: segundo mês do Nubank).
      const existente = listaContas.find((c) => c.nome === p.conta_sugerida);
      setContaSel(existente ? String(existente.id) : NOVA);
      setContaNome(p.conta_sugerida);
      setColunas({
        coluna_data: p.sugestao.coluna_data ?? "",
        coluna_descricao: p.sugestao.coluna_descricao ?? "",
        coluna_valor: p.sugestao.coluna_valor ?? "",
      });
      setGastosPositivos(false);
    } catch (e) {
      setErro(errorMessage(e));
      setArquivo(null);
    } finally {
      setOcupado(false);
    }
  }

  async function importar() {
    if (!arquivo || !preview) return;
    setErro(null);
    const form = new FormData();
    form.append("arquivo", arquivo);
    if (contaSel === NOVA) {
      if (!contaNome.trim()) return setErro("Dê um nome para a conta, por exemplo “Itaú corrente”.");
      form.append("conta_nome", contaNome.trim());
    } else {
      form.append("conta_id", contaSel);
    }
    if (preview.formato === "generico") {
      if (!colunas.coluna_data || !colunas.coluna_descricao || !colunas.coluna_valor) {
        return setErro("Indique as colunas de data, descrição e valor.");
      }
      Object.entries(colunas).forEach(([k, v]) => form.append(k, v));
      form.append("gastos_positivos", String(gastosPositivos));
    }
    setOcupado(true);
    try {
      setResultado(await api.upload<ResultadoImportacao>("/importacoes", form));
      setPreview(null);
      historico.reload();
    } catch (e) {
      setErro(errorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  async function desfazer(imp: Importacao) {
    if (!window.confirm(`Desfazer a importação de "${imp.nome_arquivo}"? Os ${imp.importadas} lançamentos dela serão removidos.`)) return;
    try {
      await api.delete(`/importacoes/${imp.id}`);
      historico.reload();
    } catch (e) {
      setErro(errorMessage(e));
    }
  }

  return (
    // O painel usa a largura toda; a importação é um formulário e fica estreita.
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Importar extrato" />

      {/* A área de envio fica sempre visível: o Next preserva o estado da página ao
          voltar para ela, e esconder o campo atrás do último resultado confundia. */}
      <Card className="mb-6">
        <label
          htmlFor="arquivo"
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            escolherArquivo(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            arrastando ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
          }`}
        >
          <span className="text-sm font-medium text-slate-800">
            {arquivo ? arquivo.name : "Arraste o arquivo CSV aqui ou clique para escolher"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {ocupado && !preview ? "Lendo arquivo…" : "Nubank (conta ou cartão) é reconhecido automaticamente. Outros bancos também funcionam. Até 5 MB."}
          </span>
          <input
            ref={inputRef}
            id="arquivo"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
          />
        </label>

        {erro && (
          <div className="mt-4">
            <ErrorBox>{erro}</ErrorBox>
          </div>
        )}

        {preview && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                {FORMATO_LABEL[preview.formato]}
              </span>
              <span className="text-slate-600">{preview.total_linhas} lançamentos no arquivo</span>
            </div>

            <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {preview.colunas.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.amostra.map((linha, i) => (
                    <tr key={i}>
                      {preview.colunas.map((c) => (
                        <td key={c} className="max-w-64 truncate px-3 py-2 whitespace-nowrap text-slate-700">
                          {linha[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.formato === "generico" && (
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  Não reconhecemos este banco. Indique o que é cada coluna:
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["coluna_data", "Data"],
                      ["coluna_descricao", "Descrição"],
                      ["coluna_valor", "Valor"],
                    ] as const
                  ).map(([campo, label]) => (
                    <Field key={campo} label={label} htmlFor={campo}>
                      <Select id={campo} value={colunas[campo]} onChange={(e) => setColunas({ ...colunas, [campo]: e.target.value })}>
                        <option value="">Escolha…</option>
                        {preview.colunas.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-emerald-600"
                    checked={gastosPositivos}
                    onChange={(e) => setGastosPositivos(e.target.checked)}
                  />
                  <span>
                    Neste arquivo os <strong>gastos aparecem como valores positivos</strong> (comum em faturas de cartão).
                    Deixe desmarcado se os gastos vêm com sinal de menos.
                  </span>
                </label>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Conta deste extrato" htmlFor="conta">
                <Select id="conta" value={contaSel} onChange={(e) => setContaSel(e.target.value)}>
                  {contasAtuais.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                  <option value={NOVA}>Nova conta…</option>
                </Select>
              </Field>
              {contaSel === NOVA && (
                <Field label="Nome da nova conta" htmlFor="conta-nome">
                  <Input id="conta-nome" maxLength={120} value={contaNome} onChange={(e) => setContaNome(e.target.value)} />
                </Field>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Lançamentos que já estão nesta conta são ignorados, então pode reimportar sem medo de duplicar.
            </p>

            <div className="flex gap-2">
              <Button onClick={importar} disabled={ocupado}>
                {ocupado ? "Importando…" : "Importar"}
              </Button>
              <Button variant="secondary" onClick={recomecar} disabled={ocupado}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {resultado && <ResultadoCard resultado={resultado} onOutro={recomecar} />}

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Importações anteriores</h2>
      <Card className="p-0">
        {historico.loading && !historico.data ? (
          <EmptyState>Carregando…</EmptyState>
        ) : !historico.data?.length ? (
          <EmptyState>Nenhum extrato importado ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.data.map((imp) => (
              <li key={imp.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">{imp.nome_arquivo}</span>
                <span className="text-slate-500">{imp.conta_nome}</span>
                <span className="text-slate-500">
                  {imp.importadas} novos · {imp.duplicadas} já existiam{imp.com_erro ? ` · ${imp.com_erro} com erro` : ""}
                </span>
                <span className="text-slate-400">{new Date(imp.created_at + "Z").toLocaleDateString("pt-BR")}</span>
                <button type="button" onClick={() => desfazer(imp)} className="ml-auto font-medium text-red-600 hover:underline">
                  Desfazer
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ResultadoCard({ resultado, onOutro }: { resultado: ResultadoImportacao; onOutro: () => void }) {
  const { importacao: imp, meses, erros } = resultado;
  return (
    <Card className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900">
        {imp.importadas > 0 ? `${imp.importadas} lançamentos importados` : "Nenhum lançamento novo"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Conta {imp.conta_nome} · {FORMATO_LABEL[imp.formato]}
        {imp.duplicadas > 0 && ` · ${imp.duplicadas} já estavam importados e foram ignorados`}
      </p>

      {erros.length > 0 && (
        <details className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <summary className="cursor-pointer font-medium">
            {imp.com_erro} {imp.com_erro === 1 ? "linha não pôde ser lida" : "linhas não puderam ser lidas"}
          </summary>
          <ul className="mt-2 space-y-0.5">
            {erros.map((e) => (
              <li key={e.linha}>
                Linha {e.linha}: {e.motivo}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {meses.map((m) => (
          <Link
            key={m}
            href={`/dashboard?mes=${m}`}
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Ver gastos de {nomeMes(m)}
          </Link>
        ))}
        <Button variant="secondary" onClick={onOutro}>
          Fechar
        </Button>
      </div>
    </Card>
  );
}
