/** Máximo de nomes mostrados por lado antes do "Mostrar todos". */
export const MAX_LINHAS_RESUMO = 10;

/**
 * Quantas linhas mostrar em entradas e saídas para que os dois lados fiquem do
 * mesmo tamanho: o menor deles, até o máximo. Um lado vazio não conta — ele
 * mostra o aviso de "nenhum", e o outro aparece normalmente.
 */
export function linhasAlinhadas(...tamanhos: number[]): number {
  return Math.min(MAX_LINHAS_RESUMO, ...tamanhos.filter((t) => t > 0));
}
