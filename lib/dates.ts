/** "2026-10-12" -> "12/10/2026" sem passar por Date (evita deslocamento de fuso). */
export function formatData(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
