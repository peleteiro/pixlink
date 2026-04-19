import type { APIRoute } from "astro";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasmModule from "@resvg/resvg-wasm/index_bg.wasm";
import { gerarPayloadPix, parsearChave } from "../../lib/pix";
import { gerarSvgPng } from "../../lib/qrcode";

let wasmInitialized = false;

export const GET: APIRoute = async ({ params, url }) => {
  const { chave: chaveRaw, valor: valorStr } = params;
  const valorCentavos = parseInt(valorStr!, 10);
  const parsed = chaveRaw
    ? parsearChave(decodeURIComponent(chaveRaw))
    : undefined;

  if (!parsed || !valorStr || isNaN(valorCentavos) || valorCentavos <= 0) {
    return new Response("Chave ou valor invalido", { status: 400 });
  }

  const descricao = url.searchParams.get("d") ?? undefined;
  const payload = gerarPayloadPix(parsed.chave, valorCentavos, descricao);
  const svg = gerarSvgPng(payload);

  if (!wasmInitialized) {
    await initWasm(wasmModule);
    wasmInitialized = true;
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1024 },
    shapeRendering: 1, // crispEdges
  });
  // resvg-wasm retorna Uint8Array<ArrayBufferLike>; Response exige ArrayBuffer.
  const png = resvg.render().asPng().buffer as ArrayBuffer;

  return new Response(png, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
