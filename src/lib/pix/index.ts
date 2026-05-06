/**
 * Orquestracao dos dados renderizados na pagina do PIX. Os primitivos
 * (parse de chave, valor, payload EMV) vivem em modulos separados;
 * aqui fica apenas a composicao + re-exports para compatibilidade.
 */

import type { ChavePix } from "./chave";
import { gerarPayloadPix } from "./payload";
import { gerarSvg } from "./qrcode";
import { centavosParaUrl, formatValor } from "./valor";

export * from "./chave";
export * from "./payload";
export * from "./qrcode";
export * from "./valor";

export interface DadosPix {
  /** Payload EMV completo — vai no clipboard do "copia e cola". */
  payload: string;
  /** SVG do QR Code ja pronto pra injetar. */
  svg: string;
  /** Valor em BRL formatado: "R$ 50,00". */
  valorFormatado: string;
  /** URL canonica (sem UTMs e outros params nao-significativos). */
  canonicalUrl: string;
  /** URL da rota .png (mesma canonicalizacao). */
  imagemUrl: string;
  /** Titulo curto pro <title>. */
  titulo: string;
  /** Descricao curta pra meta description / OG. */
  resumo: string;
  /** Rotulo do tipo de chave ("Telefone", "CPF", etc.). */
  label: string;
  /** Chave formatada pra exibicao. */
  display: string;
}

/**
 * Monta todos os dados derivados usados na pagina do PIX:
 * payload, SVG, URL canonica (descarta UTMs), meta tags de preview.
 *
 * So a descricao participa do conteudo do QR Code, entao so ela entra
 * na canonical query — o resto e ruido de tracking.
 */
export function montarDadosPix(
  parsed: ChavePix,
  centavos: number,
  origin: string,
  descricao?: string,
): DadosPix {
  const payload = gerarPayloadPix(parsed.chave, centavos, descricao);
  const svg = gerarSvg(payload);
  const valorFormatado = formatValor(centavos);

  const canonicalQuery = descricao ? `?d=${encodeURIComponent(descricao)}` : "";
  const canonicalPath = `/${encodeURIComponent(parsed.chave)}/${centavosParaUrl(centavos)}`;
  const canonicalUrl = `${origin}${canonicalPath}${canonicalQuery}`;
  const imagemUrl = `${origin}${canonicalPath}.png${canonicalQuery}`;

  const titulo = `PIX ${valorFormatado}`;
  const resumo = descricao
    ? `${parsed.label}: ${parsed.display} — ${descricao}`
    : `${parsed.label}: ${parsed.display}`;

  return {
    payload,
    svg,
    valorFormatado,
    canonicalUrl,
    imagemUrl,
    titulo,
    resumo,
    label: parsed.label,
    display: parsed.display,
  };
}
