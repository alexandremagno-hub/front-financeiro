// Espelham os schemas Pydantic da API (app/schemas/*).

export type Role = "admin" | "usuario";
export type TipoConta = "carteira" | "corrente" | "cartao_credito";
export type TipoTransacao = "receita" | "despesa";
export type CampoData = "competencia" | "lancamento";

export interface Usuario {
  id: number;
  email: string;
  nome: string;
  role: Role;
  ativo: boolean;
  created_at: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface Conta {
  id: number;
  nome: string;
  tipo: TipoConta;
  saldo_inicial_centavos: number;
  ativa: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
  categoria_pai_id: number | null;
  /** Fica fora dos totais do resumo (ex.: pagamento de fatura). */
  fora_do_resumo: boolean;
}

export interface Transacao {
  id: number;
  conta_id: number;
  categoria_id: number | null;
  tipo: TipoTransacao;
  valor_centavos: number;
  descricao: string;
  data_competencia: string; // YYYY-MM-DD
  data_lancamento: string;
  created_at: string;
  updated_at: string;
}

export interface TransacaoPage {
  items: Transacao[];
  total: number;
  limit: number;
  offset: number;
}

export type FormatoExtrato = "nubank_conta" | "nubank_cartao" | "generico";

export const FORMATO_LABEL: Record<FormatoExtrato, string> = {
  nubank_conta: "Nubank · conta",
  nubank_cartao: "Nubank · cartão de crédito",
  generico: "Outro banco",
};

export interface PreviewExtrato {
  formato: FormatoExtrato;
  colunas: string[];
  amostra: Record<string, string>[];
  total_linhas: number;
  sugestao: { coluna_data: string | null; coluna_descricao: string | null; coluna_valor: string | null };
  conta_sugerida: string;
}

export interface Importacao {
  id: number;
  conta_id: number;
  conta_nome: string;
  nome_arquivo: string;
  formato: FormatoExtrato;
  total_linhas: number;
  importadas: number;
  duplicadas: number;
  com_erro: number;
  created_at: string;
}

export interface ResultadoImportacao {
  importacao: Importacao;
  meses: string[];
  erros: { linha: number; motivo: string }[];
}

export interface CategoriaResumo {
  categoria_id: number | null;
  nome: string;
  total_centavos: number;
  quantidade: number;
}

export interface DestinoResumo {
  /** Chave normalizada; filtra GET /transacoes?destino= (com tipo=receita nas origens). */
  chave: string;
  nome: string;
  total_centavos: number;
  quantidade: number;
}

export interface ResumoMes {
  /** Meses somados (AAAA-MM), do mais recente ao mais antigo. */
  meses: string[];
  total_despesas_centavos: number;
  total_receitas_centavos: number;
  saldo_centavos: number;
  fora_do_resumo_centavos: number;
  despesas_por_categoria: CategoriaResumo[];
  despesas_por_destino: DestinoResumo[];
  /** Quem enviou o dinheiro (pessoa, empresa, banco), maior primeiro. */
  receitas_por_origem: DestinoResumo[];
  quantidade_transacoes: number;
}

export interface TransacaoInput {
  conta_id: number;
  categoria_id: number | null;
  tipo: TipoTransacao;
  valor_centavos: number;
  descricao: string;
  data_competencia: string;
  data_lancamento: string;
}

export const TIPO_CONTA_LABEL: Record<TipoConta, string> = {
  carteira: "Carteira",
  corrente: "Conta corrente",
  cartao_credito: "Cartão de crédito",
};
