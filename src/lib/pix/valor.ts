/**
 * Parsing, formatacao e limites do valor monetario (em centavos).
 */

export function formatValor(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Limite de centavos. Acima disso a aritmetica de float em JS perde precisao
 * (alem de Number.MAX_SAFE_INTEGER nao e mais "integer" confiavel). Na
 * pratica da o suficiente pra representar ate ~90 trilhoes de reais.
 */
export const MAX_CENTAVOS = Number.MAX_SAFE_INTEGER;

/**
 * Converte o valor digitado no form da home em centavos.
 *
 * Aqui o parse e mais permissivo do que na URL: qualquer caractere fora de
 * digitos e virgula e ignorado, e um ponto final com 1 ou 2 digitos vira
 * virgula decimal para facilitar colar valores em formato ingles.
 */
export function parseValorForm(valorStr: string): number | undefined {
  const normalizado = valorStr.replace(/\.(\d{1,2})$/, ",$1");
  const limpo = normalizado.replace(/[^\d,]/g, "").replace(",", ".");
  const centavos = Math.round(parseFloat(limpo) * 100);
  if (isNaN(centavos) || centavos <= 0 || centavos > MAX_CENTAVOS)
    return undefined;
  return centavos;
}

/**
 * Converte o valor da URL em centavos. Aceita "50" (reais inteiros) ou
 * "50,00" (virgula separando centavos). Como conveniencia, tambem aceita
 * ponto nos formatos pt-BR: multiplos pontos sao sempre separadores de
 * milhar (ex: "5.000.000" -> R$5.000.000,00, "5.000.00" -> R$500.000,00);
 * um unico ponto em posicao valida de milhar (ex: "50.000" -> R$50.000,00);
 * e ponto final com 1 ou 2 digitos tratado como virgula decimal (ex: "50.5",
 * "50.00"). Retorna undefined se o valor nao for um numero valido positivo
 * dentro do limite seguro.
 */
export function parseValorUrl(valorStr: string): number | undefined {
  let normalizado = valorStr;
  const pontos = (normalizado.match(/\./g) || []).length;
  if (pontos >= 2) {
    // Multiplos pontos: sao separadores de milhar (pt-BR), mesmo que
    // malformados (ex: "5.000.00" -> "500000").
    normalizado = normalizado.replace(/\./g, "");
  } else if (/^\d{1,3}\.\d{3}(,\d{1,2})?$/.test(normalizado)) {
    // Unico ponto em posicao de milhar (ex: "50.000", "1.000,50").
    normalizado = normalizado.replace(/\./g, "");
  } else {
    // Conveniencia: "50.5" ou "50.00" -> ponto vira virgula decimal.
    normalizado = normalizado.replace(/\.(\d{1,2})$/, ",$1");
  }
  if (!/^\d+(,\d+)?$/.test(normalizado)) return undefined;
  const centavos = Math.round(parseFloat(normalizado.replace(",", ".")) * 100);
  if (isNaN(centavos) || centavos <= 0 || centavos > MAX_CENTAVOS)
    return undefined;
  return centavos;
}

/** Formata centavos no formato canonico da URL: 5000 -> "50,00". */
export function centavosParaUrl(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const c = (centavos % 100).toString().padStart(2, "0");
  return `${reais},${c}`;
}
