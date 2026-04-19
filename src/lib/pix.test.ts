import { describe, expect, it } from "vitest";
import { formatValor, gerarPayloadPix, parsearChave } from "./pix";

describe("parsearChave", () => {
  describe("e-mail", () => {
    it("aceita e-mail simples", () => {
      const r = parsearChave("jose@peleteiro.net");
      expect(r).toEqual({
        tipo: "email",
        chave: "jose@peleteiro.net",
        display: "jose@peleteiro.net",
        label: "E-mail",
      });
    });

    it("aceita e-mail com + (subaddressing)", () => {
      const r = parsearChave("jose+c6@peleteiro.net");
      expect(r).toEqual({
        tipo: "email",
        chave: "jose+c6@peleteiro.net",
        display: "jose+c6@peleteiro.net",
        label: "E-mail",
      });
    });
  });

  describe("telefone", () => {
    it("aceita somente digitos com DDD (11 digitos)", () => {
      const r = parsearChave("21992446550");
      expect(r?.tipo).toBe("telefone");
      expect(r?.chave).toBe("+5521992446550");
      expect(r?.display).toBe("+55 (21) 99244-6550");
    });

    it("aceita com DDI 55 prefixado", () => {
      const r = parsearChave("5521992446550");
      expect(r?.chave).toBe("+5521992446550");
    });

    it("aceita com + e DDI", () => {
      const r = parsearChave("+5521992446550");
      expect(r?.chave).toBe("+5521992446550");
    });

    it("aceita telefone fixo (10 digitos)", () => {
      const r = parsearChave("2122223333");
      expect(r?.tipo).toBe("telefone");
      expect(r?.chave).toBe("+552122223333");
      expect(r?.display).toBe("+55 (21) 2222-3333");
    });

    it("ignora pontuacao, parenteses e espacos", () => {
      const r = parsearChave("+55 (21) 99244-6550");
      expect(r?.chave).toBe("+5521992446550");
    });
  });

  describe("CPF", () => {
    it("aceita CPF valido formatado", () => {
      const r = parsearChave("052.868.827-81");
      expect(r?.tipo).toBe("cpf");
      expect(r?.chave).toBe("05286882781");
      expect(r?.display).toBe("052.868.827-81");
      expect(r?.label).toBe("CPF");
    });

    it("aceita CPF valido sem pontuacao", () => {
      const r = parsearChave("05286882781");
      expect(r?.tipo).toBe("cpf");
      expect(r?.chave).toBe("05286882781");
    });

    it("rejeita CPF com digito verificador errado", () => {
      // 11 digitos, mas DV invalido → cai para telefone (11 digitos)
      // Esperamos que NAO seja classificado como CPF.
      const r = parsearChave("12345678900");
      expect(r?.tipo).not.toBe("cpf");
    });

    it("rejeita sequencia repetida (00000000000)", () => {
      const r = parsearChave("00000000000");
      expect(r?.tipo).not.toBe("cpf");
    });
  });

  describe("CNPJ", () => {
    it("aceita CNPJ valido formatado", () => {
      const r = parsearChave("12.345.678/0001-95");
      expect(r?.tipo).toBe("cnpj");
      expect(r?.chave).toBe("12345678000195");
      expect(r?.display).toBe("12.345.678/0001-95");
      expect(r?.label).toBe("CNPJ");
    });

    it("aceita CNPJ valido so digitos", () => {
      const r = parsearChave("12345678000195");
      expect(r?.tipo).toBe("cnpj");
      expect(r?.chave).toBe("12345678000195");
    });

    it("rejeita sequencia repetida (00000000000000)", () => {
      const r = parsearChave("00000000000000");
      expect(r).toBeUndefined();
    });
  });

  describe("chave aleatoria", () => {
    it("aceita UUID com hifens (lowercase)", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const r = parsearChave(uuid);
      expect(r).toEqual({
        tipo: "aleatoria",
        chave: uuid,
        display: uuid,
        label: "Chave aleatoria",
      });
    });

    it("normaliza UUID uppercase para lowercase", () => {
      const r = parsearChave("123E4567-E89B-12D3-A456-426614174000");
      expect(r?.chave).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("aceita UUID sem hifens e insere hifens", () => {
      const r = parsearChave("123e4567e89b12d3a456426614174000");
      expect(r?.tipo).toBe("aleatoria");
      expect(r?.chave).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("ignora espacos em volta", () => {
      const r = parsearChave("  123e4567-e89b-12d3-a456-426614174000  ");
      expect(r?.tipo).toBe("aleatoria");
    });
  });

  describe("invalidos", () => {
    it("retorna undefined para string vazia", () => {
      expect(parsearChave("")).toBeUndefined();
    });

    it("retorna undefined para digitos de tamanho nao reconhecido", () => {
      expect(parsearChave("123")).toBeUndefined();
    });
  });
});

describe("formatValor", () => {
  it("formata centavos em BRL", () => {
    // Usa NBSP do Intl entre R$ e valor (\u00A0)
    expect(formatValor(5000)).toBe("R$\u00a050,00");
    expect(formatValor(1)).toBe("R$\u00a00,01");
    expect(formatValor(100000)).toBe("R$\u00a01.000,00");
  });
});

describe("gerarPayloadPix", () => {
  it("gera payload com estrutura esperada e CRC16 ao final", () => {
    const payload = gerarPayloadPix("+5521992446550", 5000);

    // Payload Format Indicator
    expect(payload.startsWith("000201")).toBe(true);
    // Point of Initiation Method (12 = estatico)
    expect(payload).toContain("010212");
    // Merchant Account Information com GUI do PIX
    expect(payload).toContain("br.gov.bcb.pix");
    // Chave presente
    expect(payload).toContain("+5521992446550");
    // Moeda BRL
    expect(payload).toContain("5303986");
    // Valor R$ 50,00
    expect(payload).toContain("540550.00");
    // Pais e merchant
    expect(payload).toContain("5802BR");
    // CRC16 sempre tem 4 chars hex no final, precedido por "6304"
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("inclui descricao quando informada", () => {
    const payload = gerarPayloadPix("+5521992446550", 5000, "Almoco");
    // Campo 02 dentro do merchant account: "02" + "06" (len) + "Almoco"
    expect(payload).toContain("0206Almoco");
  });

  it("trunca descricao maior que 72 chars", () => {
    const longa = "a".repeat(100);
    const payload = gerarPayloadPix("+5521992446550", 5000, longa);
    // Deve conter exatamente 72 'a's
    expect(payload).toContain("0272" + "a".repeat(72));
    expect(payload).not.toContain("a".repeat(73));
  });

  it("produz CRC16 deterministico para entradas iguais", () => {
    const a = gerarPayloadPix("+5521992446550", 5000);
    const b = gerarPayloadPix("+5521992446550", 5000);
    expect(a).toBe(b);
  });
});
