/**
 * Avaliador de expressoes da calculadora do PIX.
 *
 * Suporta:
 *  - Numeros em pt-BR ou en (`100`, `100,50`, `100.50`, `0,5`)
 *  - Operadores `+ - * /` e `× ÷ x` como aliases
 *  - Parenteses
 *  - Sinal unario (`-100`, `-(5*2)`)
 *
 * Cada chamada retorna um `Item` da calculadora: alem de avaliar a
 * expressao toda, detecta quando o input comeca com `*` ou `/` e
 * trata como operacao sobre o total acumulado (`* 4`, `/ 2`).
 *
 * Numeros sao interpretados em reais (`100` = R$ 100,00). O resultado da
 * expressao e arredondado para centavos antes de virar item.
 */

export type Item =
  | { op: "+"; centavos: number }
  | { op: "-"; centavos: number }
  | { op: "*"; fator: number }
  | { op: "/"; divisor: number };

type Token =
  | { tipo: "+" | "-" | "*" | "/" | "(" | ")" }
  | { tipo: "num"; valor: number };

/**
 * Parseia um numero pt-BR ou en. Convencao:
 *  - Se ha virgula, ela e o decimal e os pontos sao milhar
 *    (`1.926,22` -> 1926.22, `1.234.567,89` -> 1234567.89).
 *  - Sem virgula com multiplos pontos: pontos sao milhar
 *    (`1.234.567` -> 1234567).
 *  - Sem virgula com um unico ponto na posicao tipica de milhar
 *    (`\d{1,3}.\d{3}`): trata como milhar (`1.000` -> 1000).
 *  - Caso contrario, ponto e decimal (`1926.22`, `0.5`, `100.50`).
 */
function parseNumero(raw: string): number | undefined {
  let normalizado: string;
  if (raw.includes(",")) {
    if ((raw.match(/,/g) || []).length > 1) return undefined;
    normalizado = raw.replace(/\./g, "").replace(",", ".");
  } else {
    const pontos = (raw.match(/\./g) || []).length;
    if (pontos >= 2 || /^\d{1,3}\.\d{3}$/.test(raw)) {
      normalizado = raw.replace(/\./g, "");
    } else {
      normalizado = raw;
    }
  }
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalizado)) return undefined;
  const n = Number(normalizado);
  return isFinite(n) ? n : undefined;
}

function tokenize(input: string): Token[] | undefined {
  // Conveniencia: usuario pode colar valores com prefixo "R$" ou "$"
  const limpo = input.replace(/R\$|\$/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < limpo.length) {
    const c = limpo[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "(" || c === ")") {
      tokens.push({ tipo: c });
      i++;
      continue;
    }
    if (c === "*" || c === "×" || c === "x") {
      tokens.push({ tipo: "*" });
      i++;
      continue;
    }
    if (c === "/" || c === "÷") {
      tokens.push({ tipo: "/" });
      i++;
      continue;
    }
    if (/[\d.,]/.test(c)) {
      let num = "";
      while (i < limpo.length && /[\d.,]/.test(limpo[i])) {
        num += limpo[i];
        i++;
      }
      const valor = parseNumero(num);
      if (valor === undefined) return undefined;
      tokens.push({ tipo: "num", valor });
      continue;
    }
    return undefined;
  }
  return tokens;
}

/** Recursive descent: expr := term (("+"|"-") term)*  */
function evalExpressao(input: string): number | undefined {
  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return undefined;
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number | undefined {
    let left = parseTerm();
    if (left === undefined) return undefined;
    while (true) {
      const t = peek();
      if (!t || (t.tipo !== "+" && t.tipo !== "-")) break;
      consume();
      const right = parseTerm();
      if (right === undefined) return undefined;
      left = t.tipo === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | undefined {
    let left = parseFactor();
    if (left === undefined) return undefined;
    while (true) {
      const t = peek();
      if (!t || (t.tipo !== "*" && t.tipo !== "/")) break;
      consume();
      const right = parseFactor();
      if (right === undefined) return undefined;
      if (t.tipo === "/") {
        if (right === 0) return undefined;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseFactor(): number | undefined {
    const t = peek();
    if (!t) return undefined;
    if (t.tipo === "-") {
      consume();
      const v = parseFactor();
      return v === undefined ? undefined : -v;
    }
    if (t.tipo === "+") {
      consume();
      return parseFactor();
    }
    if (t.tipo === "(") {
      consume();
      const v = parseExpr();
      if (v === undefined) return undefined;
      const fim = peek();
      if (!fim || fim.tipo !== ")") return undefined;
      consume();
      return v;
    }
    if (t.tipo === "num") {
      consume();
      return t.valor;
    }
    return undefined;
  }

  const r = parseExpr();
  if (r === undefined) return undefined;
  if (pos !== tokens.length) return undefined;
  if (!isFinite(r)) return undefined;
  return r;
}

/**
 * Parseia o input do usuario em um Item da calculadora. Inputs que
 * comecam com `*` ou `/` viram operacao sobre o total acumulado;
 * qualquer outra expressao e avaliada e somada como `+`/`-` conforme o
 * sinal do resultado.
 */
export function parseEntrada(input: string): Item | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // Comeca com operador multiplicativo: opera sobre o total. O operando
  // e a expressao restante (aceita "(...)" e operacoes complexas).
  const opLeading = /^([*×x/÷])(.*)$/.exec(trimmed);
  if (opLeading) {
    const isDiv = opLeading[1] === "/" || opLeading[1] === "÷";
    const operando = evalExpressao(opLeading[2]);
    if (operando === undefined || operando <= 0) return undefined;
    return isDiv
      ? { op: "/", divisor: operando }
      : { op: "*", fator: operando };
  }

  const reais = evalExpressao(trimmed);
  if (reais === undefined) return undefined;
  const centavos = Math.round(reais * 100);
  if (centavos === 0) return undefined;
  if (centavos > 0) return { op: "+", centavos };
  return { op: "-", centavos: -centavos };
}

/** Aplica um item ao total acumulado (em centavos). */
export function aplicar(total: number, item: Item): number {
  if (item.op === "+") return total + item.centavos;
  if (item.op === "-") return total - item.centavos;
  if (item.op === "*") return Math.round(total * item.fator);
  return Math.round(total / item.divisor);
}
