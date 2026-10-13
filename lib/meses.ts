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
