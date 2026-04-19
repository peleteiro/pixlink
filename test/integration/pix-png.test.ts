import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@resvg/resvg-wasm/index_bg.wasm", () => ({
  default: {},
}));

vi.mock("@resvg/resvg-wasm", () => ({
  initWasm: vi.fn(async () => undefined),
  Resvg: class {
    render() {
      return {
        asPng() {
          return {
            buffer: new Uint8Array([
              0x89,
              0x50,
              0x4e,
              0x47,
              0x0d,
              0x0a,
              0x1a,
              0x0a,
              ...new Array(2048).fill(0),
            ]).buffer,
          };
        },
      };
    }
  },
}));

let GET: typeof import("@/pages/[chave]/[valor].png").GET;

beforeAll(async () => {
  ({ GET } = await import("@/pages/[chave]/[valor].png"));
});

function criarContexto(
  chave: string,
  valor: string,
): Parameters<typeof GET>[0] {
  return {
    params: { chave, valor },
    url: new URL(`https://pix.peleteiro.net/${chave}/${valor}.png`),
  } as unknown as Parameters<typeof GET>[0];
}

describe("integracao: rota /[chave]/[valor].png", () => {
  it("retorna PNG com cache longo para uma URL valida", async () => {
    const res = await GET(criarContexto("21992446550", "50,00"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it("retorna 400 quando a chave ou o valor sao invalidos", async () => {
    const res = await GET(criarContexto("nao-e-chave", "abc"));

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Chave ou valor invalido");
  });
});
