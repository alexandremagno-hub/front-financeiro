import { describe, expect, it } from "vitest";

import { semanasDoMes } from "@/lib/meses";

describe("semanasDoMes", () => {
  it("começa no dia da semana certo e completa a última semana", () => {
    // Outubro de 2026 começa numa quinta e termina num sábado.
    const semanas = semanasDoMes("2026-10");
    expect(semanas).toHaveLength(5);
    expect(semanas[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(semanas[4].at(-1)).toBe("2026-10-31");
  });

  it("trata fevereiro de ano bissexto", () => {
    const dias = semanasDoMes("2028-02").flat().filter(Boolean);
    expect(dias).toHaveLength(29);
    expect(dias.at(-1)).toBe("2028-02-29");
  });
});
