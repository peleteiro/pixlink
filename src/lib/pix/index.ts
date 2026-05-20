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
  /** Valor em BRL formatado ("R$ 50,00"). Ausente em payloads "valor a definir". */
  valorFormatado?: string;
  /**
   * URL canonica curta. Ausente em payloads "copia e cola" (sem valor ou com
   * valor + txid) — esses vivem apenas na URL longa pra nao induzir crawlers
   * a indexar uma forma curta que regeraria o payload e perderia o txid.
   */
  canonicalUrl?: string;
  /** URL da rota .png (mesma canonicalizacao). Ausente quando nao ha forma curta. */
  imagemUrl?: string;
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
 * Monta todos os dados derivados usados na pagina do PIX: payload, SVG,
 * URL canonica (descarta UTMs), meta tags de preview.
 *
 * Quando o pagador colou um "PIX copia e cola", o payload original
 * (`payloadOriginal`) e preservado no QR Code e no botao copiar — o
 * gerarPayloadPix nao reproduz txid, merchant name e city, campos que
 * marketplaces usam pra reconciliar o pagamento com o pedido.
 *
 * Se `payloadOriginal` esta presente, a URL canonica curta e omitida
 * mesmo havendo valor — a forma curta perderia o txid e nao queremos
 * que crawlers/sharers a usem como alternativa. Sem `payloadOriginal`
 * e sem `centavos` nao ha o que montar.
 */
export function montarDadosPix(
  parsed: ChavePix,
  centavos: number | undefined,
  origin: string,
  descricao?: string,
  payloadOriginal?: string,
): DadosPix {
  if (centavos === undefined && payloadOriginal === undefined) {
    throw new Error("montarDadosPix: precisa de centavos ou payloadOriginal");
  }

  const payload =
    payloadOriginal ?? gerarPayloadPix(parsed.chave, centavos!, descricao);
  const svg = gerarSvg(payload);
  const valorFormatado =
    centavos !== undefined ? formatValor(centavos) : undefined;

  // Forma curta so existe quando NAO ha payload original (caso contrario a
  // forma curta regeraria o payload e perderia txid/merchant).
  const canonicalQuery = descricao ? `?d=${encodeURIComponent(descricao)}` : "";
  const canonicalPath =
    centavos !== undefined
      ? `/${encodeURIComponent(parsed.chave)}/${centavosParaUrl(centavos)}`
      : undefined;
  const canonicalUrl =
    !payloadOriginal && canonicalPath
      ? `${origin}${canonicalPath}${canonicalQuery}`
      : undefined;
  const imagemUrl =
    !payloadOriginal && canonicalPath
      ? `${origin}${canonicalPath}.png${canonicalQuery}`
      : undefined;

  const titulo = valorFormatado
    ? `PIX ${valorFormatado}`
    : `PIX para ${parsed.display}`;
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
