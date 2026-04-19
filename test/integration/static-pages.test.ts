import { beforeAll, describe, expect, it } from "vitest";
import { getAstroContainer } from "./_astro";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Astro resolve .astro via plugin do vitest, mas TS nao tem tipo.
import IndexPage from "@/pages/index.astro";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Astro resolve .astro via plugin do vitest, mas TS nao tem tipo.
import NotFoundPage from "@/pages/404.astro";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Astro resolve .astro via plugin do vitest, mas TS nao tem tipo.
import Error500Page from "@/pages/500.astro";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Astro resolve .astro via plugin do vitest, mas TS nao tem tipo.
import CnpjRedirectPage from "@/pages/[chave1]/[chave2]/[valor].astro";

let renderToResponse: Awaited<
  ReturnType<typeof getAstroContainer>
>["renderToResponse"];

beforeAll(async () => {
  const container = await getAstroContainer();
  renderToResponse = container.renderToResponse.bind(container);
});

describe("integracao: paginas estaticas e auxiliares", () => {
  it("renderiza a home com form e documentacao", async () => {
    const res = await renderToResponse(IndexPage, {
      request: new Request("https://pix.peleteiro.net/"),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("PIX QR Code");
    expect(html).toContain("Gerar link do PIX");
    expect(html).toContain('href="https://pix.peleteiro.net/"');
  });

  it("renderiza a pagina 404", async () => {
    const res = await renderToResponse(NotFoundPage, {
      request: new Request("https://pix.peleteiro.net/nao-existe"),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Pagina nao encontrada");
    expect(html).toContain("Voltar para a home");
  });

  it("renderiza a pagina 500", async () => {
    const res = await renderToResponse(Error500Page, {
      request: new Request("https://pix.peleteiro.net/500"),
    });

    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain("Algo deu errado");
    expect(html).toContain("Voltar para a home");
  });

  it("redireciona CNPJ com barra para a rota canonica", async () => {
    const res = await renderToResponse(CnpjRedirectPage, {
      params: {
        chave1: "12.345.678",
        chave2: "0001-95",
        valor: "250,00",
      },
      request: new Request(
        "https://pix.peleteiro.net/12.345.678/0001-95/250,00?d=Consultoria",
      ),
    });

    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "/12.345.6780001-95/250,00?d=Consultoria",
    );
  });
});
