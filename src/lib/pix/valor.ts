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
 * Converte o valor da URL em centavos. Aceita "50" (reais inteiros) ou
 * "50,00" (virgula separando centavos). Como conveniencia, se terminar com
 * ".XX" (ponto + dois digitos), tratamos o ponto como virgula.
 * Retorna undefined se o valor nao for um numero valido positivo dentro do
 * limite seguro.
 */
export function parseValorUrl(valorStr: string): number | undefined {
  const normalizado = valorStr.replace(/\.(\d{2})$/, ",$1");
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
