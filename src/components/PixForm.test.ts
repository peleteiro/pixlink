import { describe, expect, it } from "vitest";
import { construirUrl } from "./PixForm";

describe("construirUrl", () => {
  describe("erros", () => {
    it("retorna erro 'chave-vazia' quando chave e vazia", () => {
      expect(construirUrl("", "50,00")).toEqual({ erro: "chave-vazia" });
    });

    it("retorna erro 'chave-vazia' quando chave e so espacos", () => {
      expect(construirUrl("   ", "50,00")).toEqual({ erro: "chave-vazia" });
    });

    it("retorna erro 'chave-invalida' quando chave nao bate com nenhum formato", () => {
      expect(construirUrl("nao-e-chave", "50,00")).toEqual({
        erro: "chave-invalida",
      });
    });

    it("retorna erro 'chave-invalida' para CNPJ com DV errado", () => {
      // 14 digitos mas nao e um CNPJ valido (nao bate tamanho de telefone tambem).
      expect(construirUrl("12345678901234", "50,00")).toEqual({
        erro: "chave-invalida",
      });
    });

    it("retorna erro 'valor-invalido' quando valor e vazio", () => {
      expect(construirUrl("21992446550", "")).toEqual({
        erro: "valor-invalido",
      });
    });

    it("retorna erro 'valor-invalido' quando valor nao e numero", () => {
      expect(construirUrl("21992446550", "abc")).toEqual({
        erro: "valor-invalido",
      });
    });

    it("retorna erro 'valor-invalido' quando valor e zero", () => {
      expect(construirUrl("21992446550", "0")).toEqual({
        erro: "valor-invalido",
      });
    });
  });

  describe("formato do valor na URL", () => {
    it("usa virgula com dois digitos de centavos", () => {
      expect(construirUrl("21992446550", "50,00")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("aceita valor inteiro sem decimais", () => {
      expect(construirUrl("21992446550", "50")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("aceita valor abaixo de 1 real", () => {
      expect(construirUrl("21992446550", "0,50")).toEqual({
        url: "/21992446550/0,50",
      });
    });

    it("arredonda fracao de centavo para o inteiro mais proximo", () => {
      expect(construirUrl("21992446550", "0,015")).toEqual({
        url: "/21992446550/0,02",
      });
    });

    it("ignora prefixo R$", () => {
      expect(construirUrl("21992446550", "R$50,00")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("ignora prefixo R$ com espaco", () => {
      expect(construirUrl("21992446550", "R$ 50,00")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("ignora cifrao", () => {
      expect(construirUrl("21992446550", "$50")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("ignora ponto como separador de milhar", () => {
      expect(construirUrl("21992446550", "50.000,00")).toEqual({
        url: "/21992446550/50000,00",
      });
    });

    it("trata ponto final seguido de 2 digitos como virgula", () => {
      expect(construirUrl("21992446550", "50.00")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("trata ponto final seguido de 1 digito como virgula", () => {
      expect(construirUrl("21992446550", "50.5")).toEqual({
        url: "/21992446550/50,50",
      });
    });

    it("trata ponto final seguido de 2 digitos como virgula com prefixo R$", () => {
      expect(construirUrl("21992446550", "R$ 50.00")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("trata valor negativo como positivo", () => {
      expect(construirUrl("21992446550", "-50,00")).toEqual({
        url: "/21992446550/50,00",
      });
    });
  });

  describe("encoding da chave", () => {
    it("url-encoda e-mail com @ e +", () => {
      expect(construirUrl("jose+c6@peleteiro.net", "50")).toEqual({
        url: "/jose%2Bc6%40peleteiro.net/50,00",
      });
    });

    it("url-encoda barra do CNPJ", () => {
      expect(construirUrl("12.345.678/0001-95", "250")).toEqual({
        url: "/12.345.678%2F0001-95/250,00",
      });
    });

    it("url-encoda + do DDI no telefone", () => {
      expect(construirUrl("+5521992446550", "50")).toEqual({
        url: "/%2B5521992446550/50,00",
      });
    });
  });

  describe("descricao", () => {
    it("nao adiciona query quando descricao esta vazia", () => {
      expect(construirUrl("21992446550", "50")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("nao adiciona query quando descricao e so espacos", () => {
      expect(construirUrl("21992446550", "50", "   ")).toEqual({
        url: "/21992446550/50,00",
      });
    });

    it("adiciona descricao como query param ?d=", () => {
      expect(construirUrl("21992446550", "50", "Almoco")).toEqual({
        url: "/21992446550/50,00?d=Almoco",
      });
    });

    it("trima espacos em volta da descricao", () => {
      expect(construirUrl("21992446550", "50", "  Almoco  ")).toEqual({
        url: "/21992446550/50,00?d=Almoco",
      });
    });

    it("url-encoda espacos e caracteres especiais na descricao", () => {
      expect(construirUrl("21992446550", "50", "Almoco R$50")).toEqual({
        url: "/21992446550/50,00?d=Almoco%20R%2450",
      });
    });
  });
});
