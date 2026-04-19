import { beforeAll, describe, expect, it } from "vitest";
import { getAstroContainer } from "./_astro";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Astro resolve .astro via plugin do vitest, mas TS nao tem tipo.
import ValorPage from "@/pages/[chave]/[valor].astro";

type Params = Record<string, string>;

let renderToResponse: Awaited<
  ReturnType<typeof getAstroContainer>
>["renderToResponse"];

async function render(params: Params, url: string) {
  return renderToResponse(ValorPage, {
    params,
    request: new Request(url),
  });
}

describe("integracao: pagina /[chave]/[valor]", () => {
  beforeAll(async () => {
    const container = await getAstroContainer();
    renderToResponse = container.renderToResponse.bind(container);
  });

  it("renderiza pagina valida com 200 e QR Code", async () => {
    const res = await render(
      { chave: "21992446550", valor: "50,00" },
      "https://pix.peleteiro.net/21992446550/50,00",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<svg");
    expect(html).toContain("R$");
    expect(html).toContain("50,00");
    expect(html).toContain("+55 (21) 99244-6550");
  });

  it("canonical aponta para o formato /{chave}/{reais,centavos}", async () => {
    const res = await render(
      { chave: "21992446550", valor: "50" },
      "https://pix.peleteiro.net/21992446550/50?utm_source=x",
    );
    const html = await res.text();
    expect(html).toContain(
      '<link rel="canonical" href="https://pix.peleteiro.net/%2B5521992446550/50,00">',
    );
    expect(html).not.toContain("utm_source");
  });

  it("canonical inclui ?d= quando ha descricao", async () => {
    const res = await render(
      { chave: "21992446550", valor: "50,00" },
      "https://pix.peleteiro.net/21992446550/50,00?d=Almoco&utm_source=x",
    );
    const html = await res.text();
    expect(html).toContain(
      'canonical" href="https://pix.peleteiro.net/%2B5521992446550/50,00?d=Almoco"',
    );
    expect(html).not.toContain("utm_source");
  });

  it("meta og:image aponta para a rota .png canonica", async () => {
    const res = await render(
      { chave: "21992446550", valor: "50,00" },
      "https://pix.peleteiro.net/21992446550/50,00",
    );
    const html = await res.text();
    expect(html).toContain(
      'property="og:image" content="https://pix.peleteiro.net/%2B5521992446550/50,00.png"',
    );
  });

  it("retorna 400 com pagina de erro quando valor e invalido", async () => {
    const res = await render(
      { chave: "21992446550", valor: "abc" },
      "https://pix.peleteiro.net/21992446550/abc",
    );
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Link invalido");
    expect(html).toContain("Voltar para a home");
  });

  it("retorna 400 quando chave e invalida", async () => {
    const res = await render(
      { chave: "nao-e-chave", valor: "50,00" },
      "https://pix.peleteiro.net/nao-e-chave/50,00",
    );
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Link invalido");
  });

  it("aceita chave com barra (CNPJ)", async () => {
    const res = await render(
      { chave: "12.345.678/0001-95", valor: "250,00" },
      "https://pix.peleteiro.net/12.345.678%2F0001-95/250,00",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("12.345.678/0001-95");
    expect(html).toContain("CNPJ");
  });

  it("renderiza com chave CPF e label correto", async () => {
    const res = await render(
      { chave: "052.868.827-81", valor: "15" },
      "https://pix.peleteiro.net/052.868.827-81/15",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("CPF");
    expect(html).toContain("052.868.827-81");
    expect(html).toContain("R$");
  });

  it("renderiza com chave aleatoria (UUID)", async () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const res = await render(
      { chave: uuid, valor: "50,00" },
      `https://pix.peleteiro.net/${uuid}/50,00`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Chave aleatoria");
    expect(html).toContain(uuid);
  });

  it("exibe a descricao na pagina quando presente", async () => {
    const res = await render(
      { chave: "21992446550", valor: "50,00" },
      "https://pix.peleteiro.net/21992446550/50,00?d=Almoco",
    );
    const html = await res.text();
    expect(html).toContain("Descricao");
    expect(html).toContain("Almoco");
    expect(html).toContain('content="Telefone: +55 (21) 99244-6550 — Almoco"');
  });

  it("trunca descricao longa no payload PIX (72 chars max)", async () => {
    const longa = "a".repeat(100);
    const res = await render(
      { chave: "21992446550", valor: "50,00" },
      `https://pix.peleteiro.net/21992446550/50,00?d=${longa}`,
    );
    const html = await res.text();
    expect(html).toContain("a".repeat(72));
  });

  it("rejeita chave sem TLD (validacao de e-mail)", async () => {
    const res = await render(
      { chave: "foo@bar", valor: "50,00" },
      "https://pix.peleteiro.net/foo@bar/50,00",
    );
    expect(res.status).toBe(400);
  });

  it("rejeita valor acima do limite seguro", async () => {
    const res = await render(
      { chave: "21992446550", valor: "99999999999999999" },
      "https://pix.peleteiro.net/21992446550/99999999999999999",
    );
    expect(res.status).toBe(400);
  });
});
