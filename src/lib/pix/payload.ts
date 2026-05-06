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
