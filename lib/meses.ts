/** "2026-10" -> "Outubro de 2026" */
export function nomeMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(ano, m - 1, 1));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Primeiro e último dia do mês "AAAA-MM", em ISO. */
export function intervaloMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

/**
 * Semanas do calendário de "AAAA-MM", domingo a sábado. Dias fora do mês são null
 * para completar a primeira e a última semana.
 */
export function semanasDoMes(mes: string): (string | null)[][] {
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  const celulas: (string | null)[] = Array(new Date(ano, m - 1, 1).getDay()).fill(null);
  for (let d = 1; d <= ultimo; d++) celulas.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (celulas.length % 7) celulas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}
