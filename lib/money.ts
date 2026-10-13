// Dinheiro trafega e é guardado em CENTAVOS inteiros. Nada de float aqui:
// a conversão texto <-> centavos é feita com manipulação de string.

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCentavos(centavos: number): string {
  // Divisão só para exibição; o valor nunca volta para a API a partir daqui.
  return formatter.format(centavos / 100);
}

/**
 * Texto digitado -> centavos inteiros, ou null se inválido.
 *   "1.234,56" | "1234,5" | "R$ 10,00" | "10"  (formato brasileiro)
 *   "10.50" | "10.5"                         (ponto decimal, comum em teclado US)
 * Ponto só é separador de milhar quando forma grupos de 3 ("1.234", "1.234.567,89").
 * Ambíguo/malformado ("10,555", "1.2.3") é rejeitado em vez de adivinhado.
 */
export function parseReaisParaCentavos(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, "");
  if (/^-?\d+\.\d{1,2}$/.test(limpo)) {
    limpo = limpo.replace(".", ","); // ponto decimal
  } else if (/^-?\d{1,3}(\.\d{3})+(,\d{0,2})?$/.test(limpo)) {
    limpo = limpo.replace(/\./g, ""); // pontos de milhar
  }
  const m = /^(-)?(\d+)(?:,(\d{0,2}))?$/.exec(limpo);
  if (!m) return null;
  const [, sinal, inteiro, frac = ""] = m;
  // Soma de inteiros: reais * 100 + centavos. Sem multiplicar frações.
  const centavos = Number(inteiro) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos)) return null;
  return sinal ? -centavos : centavos;
}

/** centavos -> "1234,56" (para preencher inputs de edição). */
export function centavosParaTexto(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos).toString().padStart(3, "0");
  return `${negativo ? "-" : ""}${abs.slice(0, -2)},${abs.slice(-2)}`;
}
