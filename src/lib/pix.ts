/**
 * Gera o payload PIX no formato EMV QR Code (BR Code estático).
 * Especificação: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II-ManualdePadroesparaIniciacaodoPix.pdf
 */

// --- Tipos de chave ---

type TipoChave = "telefone" | "cpf" | "email";

export interface ChavePix {
  tipo: TipoChave;
  /** Chave normalizada para o payload PIX (ex: +5521992446550, 05286882781) */
  chave: string;
  /** Chave formatada para exibição (ex: +55 (21) 99244-6550, 052.868.827-81) */
  display: string;
  label: string;
}

/**
 * Parseia a chave PIX da URL e retorna a chave normalizada + display.
 *
 * Telefone aceita:
 *   +5521992446550 → já com DDI
 *   5521992446550  → com DDI sem +
 *   21992446550    → só DDD + número
 *
 * CPF aceita:
 *   052.868.827-81 → com pontuação
 *   05286882781    → sem pontuação (validado por dígitos verificadores)
 *
 * Email:
 *   jose@peleteiro.net
 */
export function parsearChave(raw: string): ChavePix | undefined {
  // Email
  if (raw.includes("@")) {
    return { tipo: "email", chave: raw, display: raw, label: "E-mail" };
  }

  // CPF — formato XXX.XXX.XXX-XX (com pontuação)
  const cpfMatch = raw.match(/^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/);
  if (cpfMatch) {
    const digits = cpfMatch[1] + cpfMatch[2] + cpfMatch[3] + cpfMatch[4];
    if (!validarCpf(digits)) return undefined;
    return { tipo: "cpf", chave: digits, display: raw, label: "CPF" };
  }

  // CPF — 11 dígitos sem pontuação (valida para distinguir de telefone)
  if (/^\d{11}$/.test(raw) && validarCpf(raw)) {
    const display = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    return { tipo: "cpf", chave: raw, display, label: "CPF" };
  }

  // Telefone — só dígitos, opcionalmente começa com +
  const phoneRaw = raw.startsWith("+") ? raw.slice(1) : raw;
  if (!/^\d+$/.test(phoneRaw)) return undefined;

  let ddd: string;
  let numero: string;

  if (phoneRaw.length === 13 && phoneRaw.startsWith("55")) {
    // +5521992446550 ou 5521992446550 (13 dígitos com DDI)
    ddd = phoneRaw.slice(2, 4);
    numero = phoneRaw.slice(4);
  } else if (phoneRaw.length === 12 && phoneRaw.startsWith("55")) {
    // 5521992446550 sem o 9 extra? Ou telefone fixo com DDI
    ddd = phoneRaw.slice(2, 4);
    numero = phoneRaw.slice(4);
  } else if (phoneRaw.length === 11 || phoneRaw.length === 10) {
    // 21992446550 (DDD + número) ou 2133445566 (fixo)
    ddd = phoneRaw.slice(0, 2);
    numero = phoneRaw.slice(2);
  } else {
    return undefined;
  }

  const chaveNormalizada = `+55${ddd}${numero}`;

  // Formata display: +55 (21) 99244-6550
  let display: string;
  if (numero.length === 9) {
    display = `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  } else {
    display = `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
  }

  return { tipo: "telefone", chave: chaveNormalizada, display, label: "Telefone" };
}

// --- Validação CPF ---

function validarCpf(digits: string): boolean {
  if (digits.length !== 11) return false;
  // Rejeita sequências repetidas (000.000.000-00, 111..., etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const nums = digits.split("").map(Number);

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += nums[i] * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== nums[9]) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += nums[i] * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== nums[10]) return false;

  return true;
}

// --- Formatação ---

export function formatValor(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// --- Payload PIX ---

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

export function gerarPayloadPix(
  chave: string,
  valorCentavos: number,
  descricao?: string,
): string {
  const valor = (valorCentavos / 100).toFixed(2);

  // Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", chave);
  // Campo 02 = descrição (opcional, max 73 chars após gui+key)
  const desc = descricao ? tlv("02", descricao.slice(0, 72)) : "";
  const merchantAccount = tlv("26", gui + key + desc);

  const parts = [
    tlv("00", "01"),           // Payload Format Indicator
    tlv("01", "12"),           // Point of Initiation Method (12 = static)
    merchantAccount,           // Merchant Account Information
    tlv("52", "0000"),         // Merchant Category Code
    tlv("53", "986"),          // Transaction Currency (BRL)
    tlv("54", valor),          // Transaction Amount
    tlv("58", "BR"),           // Country Code
    tlv("59", "PIX"),          // Merchant Name
    tlv("60", "BRASIL"),       // Merchant City
    tlv("62", tlv("05", "***")), // Additional Data Field
  ];

  const payloadSemCRC = parts.join("") + "6304";
  const checksum = crc16(payloadSemCRC);

  return payloadSemCRC + checksum;
}
