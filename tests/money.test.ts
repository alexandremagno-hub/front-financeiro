import { describe, expect, it } from "vitest";

import { centavosParaTexto, parseReaisParaCentavos } from "@/lib/money";

describe("parseReaisParaCentavos", () => {
  it.each([
    ["49,90", 4990],
    ["1.234,56", 123456],
    ["R$ 10,00", 1000],
    ["10", 1000],
    ["10,5", 1050],
    ["0,01", 1],
    ["0,10", 10], // 0.1 em float daria problema; aqui é aritmética inteira
    ["-5,00", -500],
    ["10.50", 1050], // ponto decimal (teclado US): NÃO pode virar R$ 1.050,00
    ["10.5", 1050],
    ["1.234", 123400], // ponto de milhar
    ["1.234.567,89", 123456789],
    ["10.555,00", 1055500],
  ])("%s -> %i", (texto, esperado) => {
    expect(parseReaisParaCentavos(texto)).toBe(esperado);
  });

  it.each(["", "abc", "10,555", "1,2,3", "1.2.3", "12.34.56"])("rejeita %j", (texto) => {
    expect(parseReaisParaCentavos(texto)).toBeNull();
  });
});

describe("centavosParaTexto", () => {
  it.each([
    [4990, "49,90"],
    [5, "0,05"],
    [0, "0,00"],
    [-1050, "-10,50"],
  ])("%i -> %s", (c, esperado) => {
    expect(centavosParaTexto(c)).toBe(esperado);
  });
});
