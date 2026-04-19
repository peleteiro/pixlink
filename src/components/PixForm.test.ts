import { describe, expect, it } from "vitest";
import { construirUrl } from "./PixForm";

describe("construirUrl", () => {
  describe("invalidos", () => {
    it("retorna undefined quando chave e vazia", () => {
      expect(construirUrl("", "50,00")).toBeUndefined();
    });

    it("retorna undefined quando valor e vazio", () => {
      expect(construirUrl("21992446550", "")).toBeUndefined();
    });

    it("retorna undefined quando valor nao e numero", () => {
      expect(construirUrl("21992446550", "abc")).toBeUndefined();
    });

    it("retorna undefined quando valor e zero", () => {
      expect(construirUrl("21992446550", "0")).toBeUndefined();
    });

    it("retorna undefined quando valor e negativo", () => {
      expect(construirUrl("21992446550", "-5")).toBeUndefined();
    });
  });

  describe("conversao de valor em centavos", () => {
    it("aceita valor com virgula", () => {
      expect(construirUrl("21992446550", "50,00")).toBe("/21992446550/5000");
    });

    it("aceita valor com ponto", () => {
      expect(construirUrl("21992446550", "50.00")).toBe("/21992446550/5000");
    });

    it("aceita valor inteiro sem decimais", () => {
      expect(construirUrl("21992446550", "50")).toBe("/21992446550/5000");
    });

    it("aceita valor abaixo de 1 real", () => {
      expect(construirUrl("21992446550", "0,50")).toBe("/21992446550/50");
    });

    it("arredonda fracao de centavo para o inteiro mais proximo", () => {
      expect(construirUrl("21992446550", "0,015")).toBe("/21992446550/2");
    });
  });

  describe("encoding da chave", () => {
    it("url-encoda e-mail com @ e +", () => {
      expect(construirUrl("jose+c6@peleteiro.net", "50")).toBe(
        "/jose%2Bc6%40peleteiro.net/5000",
      );
    });

    it("url-encoda barra do CNPJ", () => {
      expect(construirUrl("12.345.678/0001-95", "250")).toBe(
        "/12.345.678%2F0001-95/25000",
      );
    });

    it("url-encoda + do DDI no telefone", () => {
      expect(construirUrl("+5521992446550", "50")).toBe(
        "/%2B5521992446550/5000",
      );
    });
  });

  describe("descricao", () => {
    it("nao adiciona query quando descricao esta vazia", () => {
      expect(construirUrl("21992446550", "50")).toBe("/21992446550/5000");
    });

    it("nao adiciona query quando descricao e so espacos", () => {
      expect(construirUrl("21992446550", "50", "   ")).toBe(
        "/21992446550/5000",
      );
    });

    it("adiciona descricao como query param ?d=", () => {
      expect(construirUrl("21992446550", "50", "Almoco")).toBe(
        "/21992446550/5000?d=Almoco",
      );
    });

    it("trima espacos em volta da descricao", () => {
      expect(construirUrl("21992446550", "50", "  Almoco  ")).toBe(
        "/21992446550/5000?d=Almoco",
      );
    });

    it("url-encoda espacos e caracteres especiais na descricao", () => {
      expect(construirUrl("21992446550", "50", "Almoco R$50")).toBe(
        "/21992446550/5000?d=Almoco%20R%2450",
      );
    });
  });
});
