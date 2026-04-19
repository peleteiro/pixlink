/**
 * Parsing e validacao de chaves PIX (telefone, CPF, CNPJ, e-mail, aleatoria).
 */

type TipoChave = "telefone" | "cpf" | "cnpj" | "email" | "aleatoria";

export interface ChavePix {
  tipo: TipoChave;
  /** Chave normalizada para o payload PIX (ex: +5521992446550, 05286882781) */
  chave: string;
  /** Chave formatada para exibição (ex: +55 (21) 99244-6550, 052.868.827-81) */
  display: string;
  label: string;
}

// Chave aleatória: UUID v4 (36 chars com hifens ou 32 hex sem hifens).
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX32_REGEX = /^[0-9a-f]{32}$/;

// Validacao basica de e-mail: localpart@dominio.tld. Rejeita lixo como
// "@", "foo@", "@bar", "foo@bar" (sem TLD). Nao tenta validar RFC
// completo — basta evitar URLs nitidamente quebradas.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parseia a chave PIX da URL e retorna a chave normalizada + display.
 *
 * Estratégia: se contém "@" é e-mail (validado). Se bate com o formato UUID
 * é chave aleatória. Caso contrário, extrai só os dígitos (ignora
 * pontuação, parênteses, espaços, "+") e tenta CPF (11 dígitos), CNPJ
 * (14 dígitos) ou telefone BR (10-13 dígitos, com ou sem DDI 55).
 */
export function parsearChave(raw: string): ChavePix | undefined {
  // E-mail
  if (raw.includes("@")) {
    if (!EMAIL_REGEX.test(raw)) return undefined;
    return { tipo: "email", chave: raw, display: raw, label: "E-mail" };
  }

  // Chave aleatória — normaliza para lowercase com hifens
  const normalizada = raw.trim().toLowerCase();
  if (UUID_REGEX.test(normalizada)) {
    return {
      tipo: "aleatoria",
      chave: normalizada,
      display: normalizada,
      label: "Chave aleatoria",
    };
  }
  if (HEX32_REGEX.test(normalizada)) {
    const h = normalizada;
    const comHifens = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    return {
      tipo: "aleatoria",
      chave: comHifens,
      display: comHifens,
      label: "Chave aleatoria",
    };
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;

  // CPF — 11 dígitos validados
  if (digits.length === 11 && validarCpf(digits)) {
    const display = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    return { tipo: "cpf", chave: digits, display, label: "CPF" };
  }

  // CNPJ — 14 dígitos validados
  if (digits.length === 14 && validarCnpj(digits)) {
    const display = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    return { tipo: "cnpj", chave: digits, display, label: "CNPJ" };
  }

  // Telefone BR — com ou sem DDI 55
  let ddd: string;
  let numero: string;

  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
  ) {
    ddd = digits.slice(2, 4);
    numero = digits.slice(4);
  } else if (digits.length === 10 || digits.length === 11) {
    ddd = digits.slice(0, 2);
    numero = digits.slice(2);
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

  return {
    tipo: "telefone",
    chave: chaveNormalizada,
    display,
    label: "Telefone",
  };
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

// --- Validação CNPJ ---

function validarCnpj(digits: string): boolean {
  if (digits.length !== 14) return false;
  // Rejeita sequências repetidas (00.000.000/0000-00, 111..., etc.)
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const nums = digits.split("").map(Number);

  // Primeiro dígito verificador: pesos 5,4,3,2,9,8,7,6,5,4,3,2
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += nums[i] * pesos1[i];
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== nums[12]) return false;

  // Segundo dígito verificador: pesos 6,5,4,3,2,9,8,7,6,5,4,3,2
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) soma += nums[i] * pesos2[i];
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  if (dv2 !== nums[13]) return false;

  return true;
}
