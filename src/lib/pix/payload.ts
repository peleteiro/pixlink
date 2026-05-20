/**
 * Gera o payload PIX no formato EMV QR Code (BR Code estatico).
 * Especificacao: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II-ManualdePadroesparaIniciacaodoPix.pdf
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Normaliza a descricao pra caber no payload EMV: remove diacriticos
 * (cafe → cafe) e dropa qualquer char fora de ASCII printavel (emojis,
 * caracteres de controle). A spec PIX usa encoding restrito — sem
 * sanitizar, bancos podem rejeitar o QR Code silenciosamente.
 */
export function sanitizarDescricao(descricao: string): string {
  return descricao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "");
}

export interface PayloadPixParsed {
  chave: string;
  /** Centavos. Ausente quando o payload nao traz o campo 54 (valor a definir). */
  valorCentavos?: number;
  descricao?: string;
}

/**
 * Parseia o corpo TLV de um payload EMV. Retorna mapa vazio se a estrutura
 * estiver malformada (tamanho declarado nao bate com o restante, sobra de
 * bytes, etc.) — assim quem chama trata como invalido sem precisar diferenciar.
 */
function parseCamposTlv(s: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > s.length) return new Map();
    out.set(tag, s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return i === s.length ? out : new Map();
}

/**
 * O campo 54 (valor) do EMV usa "." como separador decimal (ex: "50.00",
 * "0.50"). Para evitar floats, parseia como inteiros: reais * 100 + cents.
 */
function parseValorPayload(s: string): number | undefined {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return undefined;
  const reais = parseInt(m[1], 10);
  const cents = m[2] ? parseInt(m[2].padEnd(2, "0"), 10) : 0;
  const total = reais * 100 + cents;
  return total > 0 ? total : undefined;
}

/**
 * Tenta interpretar uma string como payload "PIX copia e cola" (EMV BR Code).
 * Valida o CRC16 e confere o GUI `br.gov.bcb.pix` antes de aceitar. Retorna
 * undefined para qualquer string que nao seja um payload PIX valido — a
 * funcao serve como detector + parser de uma so vez.
 */
export function parsearPayloadPix(raw: string): PayloadPixParsed | undefined {
  // Filtro rapido: todo BR Code estatico comeca com Payload Format Indicator
  // "000201" e termina com a tag CRC "6304" + 4 hex.
  if (raw.length < 50) return undefined;
  if (!raw.startsWith("0002")) return undefined;
  if (raw.slice(-8, -4) !== "6304") return undefined;

  const crcRecebido = raw.slice(-4).toUpperCase();
  const crcCalculado = crc16(raw.slice(0, -4));
  if (crcRecebido !== crcCalculado) return undefined;

  const campos = parseCamposTlv(raw.slice(0, -8));
  const merchant = campos.get("26");
  if (!merchant) return undefined;

  const sub = parseCamposTlv(merchant);
  if (sub.get("00")?.toLowerCase() !== "br.gov.bcb.pix") return undefined;

  const chave = sub.get("01");
  if (!chave) return undefined;

  const descricao = sub.get("02") || undefined;
  const valorStr = campos.get("54");
  const valorCentavos = valorStr ? parseValorPayload(valorStr) : undefined;

  return { chave, valorCentavos, descricao };
}

export function gerarPayloadPix(
  chave: string,
  valorCentavos: number,
  descricao?: string,
): string {
  const valor = (valorCentavos / 100).toFixed(2);

  // Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", chave);
  // Campo 02 = descricao (opcional, max 72 chars apos sanitizacao)
  const descSanitizada = descricao ? sanitizarDescricao(descricao) : "";
  const desc = descSanitizada ? tlv("02", descSanitizada.slice(0, 72)) : "";
  const merchantAccount = tlv("26", gui + key + desc);

  const parts = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("01", "12"), // Point of Initiation Method (12 = static)
    merchantAccount, // Merchant Account Information
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "986"), // Transaction Currency (BRL)
    tlv("54", valor), // Transaction Amount
    tlv("58", "BR"), // Country Code
    tlv("59", "PIX"), // Merchant Name
    tlv("60", "BRASIL"), // Merchant City
    tlv("62", tlv("05", "***")), // Additional Data Field
  ];

  const payloadSemCRC = parts.join("") + "6304";
  const checksum = crc16(payloadSemCRC);

  return payloadSemCRC + checksum;
}
