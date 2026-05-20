import { describe, expect, it } from "vitest";
import {
  centavosParaUrl,
  formatValor,
  gerarPayloadPix,
  montarDadosPix,
  parseValorForm,
  parseValorUrl,
  parsearChave,
  parsearPayloadPix,
  sanitizarDescricao,
} from "@/lib/pix";

describe("parsearChave", () => {
  describe("e-mail", () => {
    it("aceita e-mail simples", () => {
      const r = parsearChave("joana@example.com");
      expect(r).toEqual({
        tipo: "email",
        chave: "joana@example.com",
        display: "joana@example.com",
        label: "E-mail",
      });
    });

    it("aceita e-mail com + (subaddressing)", () => {
      const r = parsearChave("joana+c6@example.com");
      expect(r).toEqual({
        tipo: "email",
        chave: "joana+c6@example.com",
        display: "joana+c6@example.com",
        label: "E-mail",
      });
    });

    it("rejeita strings com @ mas sem estrutura de e-mail", () => {
      expect(parsearChave("@")).toBeUndefined();
      expect(parsearChave("foo@")).toBeUndefined();
      expect(parsearChave("@bar")).toBeUndefined();
      // Sem TLD (nao tem ponto no dominio).
      expect(parsearChave("foo@bar")).toBeUndefined();
    });
  });

  describe("telefone", () => {
    it("aceita somente digitos com DDD (11 digitos)", () => {
      const r = parsearChave("11912345678");
      expect(r?.tipo).toBe("telefone");
      expect(r?.chave).toBe("+5511912345678");
      expect(r?.display).toBe("+55 (11) 91234-5678");
    });

    it("aceita com DDI 55 prefixado", () => {
      const r = parsearChave("5511912345678");
      expect(r?.chave).toBe("+5511912345678");
    });

    it("aceita com + e DDI", () => {
      const r = parsearChave("+5511912345678");
      expect(r?.chave).toBe("+5511912345678");
    });

    it("aceita telefone fixo (10 digitos)", () => {
      const r = parsearChave("2122223333");
      expect(r?.tipo).toBe("telefone");
      expect(r?.chave).toBe("+552122223333");
      expect(r?.display).toBe("+55 (21) 2222-3333");
    });

    it("ignora pontuacao, parenteses e espacos", () => {
      const r = parsearChave("+55 (11) 91234-5678");
      expect(r?.chave).toBe("+5511912345678");
    });
  });

  describe("CPF", () => {
    it("aceita CPF valido formatado", () => {
      const r = parsearChave("111.444.777-35");
      expect(r?.tipo).toBe("cpf");
      expect(r?.chave).toBe("11144477735");
      expect(r?.display).toBe("111.444.777-35");
      expect(r?.label).toBe("CPF");
    });

    it("aceita CPF valido sem pontuacao", () => {
      const r = parsearChave("11144477735");
      expect(r?.tipo).toBe("cpf");
      expect(r?.chave).toBe("11144477735");
    });

    it("rejeita CPF com digito verificador errado", () => {
      // 11 digitos, mas DV invalido → cai para telefone (11 digitos)
      // Esperamos que NAO seja classificado como CPF.
      const r = parsearChave("12345678900");
      expect(r?.tipo).not.toBe("cpf");
    });

    it("rejeita sequencia repetida (00000000000)", () => {
      const r = parsearChave("00000000000");
      expect(r?.tipo).not.toBe("cpf");
    });
  });

  describe("CNPJ", () => {
    it("aceita CNPJ valido formatado", () => {
      const r = parsearChave("12.345.678/0001-95");
      expect(r?.tipo).toBe("cnpj");
      expect(r?.chave).toBe("12345678000195");
      expect(r?.display).toBe("12.345.678/0001-95");
      expect(r?.label).toBe("CNPJ");
    });

    it("aceita CNPJ valido so digitos", () => {
      const r = parsearChave("12345678000195");
      expect(r?.tipo).toBe("cnpj");
      expect(r?.chave).toBe("12345678000195");
    });

    it("rejeita sequencia repetida (00000000000000)", () => {
      const r = parsearChave("00000000000000");
      expect(r).toBeUndefined();
    });
  });

  describe("chave aleatoria", () => {
    it("aceita UUID com hifens (lowercase)", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const r = parsearChave(uuid);
      expect(r).toEqual({
        tipo: "aleatoria",
        chave: uuid,
        display: uuid,
        label: "Chave aleatoria",
      });
    });

    it("normaliza UUID uppercase para lowercase", () => {
      const r = parsearChave("123E4567-E89B-12D3-A456-426614174000");
      expect(r?.chave).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("aceita UUID sem hifens e insere hifens", () => {
      const r = parsearChave("123e4567e89b12d3a456426614174000");
      expect(r?.tipo).toBe("aleatoria");
      expect(r?.chave).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("ignora espacos em volta", () => {
      const r = parsearChave("  123e4567-e89b-12d3-a456-426614174000  ");
      expect(r?.tipo).toBe("aleatoria");
    });
  });

  describe("invalidos", () => {
    it("retorna undefined para string vazia", () => {
      expect(parsearChave("")).toBeUndefined();
    });

    it("retorna undefined para digitos de tamanho nao reconhecido", () => {
      expect(parsearChave("123")).toBeUndefined();
    });
  });

  describe("url-encoded", () => {
    // Astro nao decodifica %XX automaticamente em Astro.params, entao a
    // forma canonica /%2B5511912345678/... e e-mails com %40 precisam ser
    // aceitos diretamente pelo parser.
    it("decodifica %40 em e-mail", () => {
      const r = parsearChave("pix_marketplace%40mercadolibre.com");
      expect(r?.tipo).toBe("email");
      expect(r?.chave).toBe("pix_marketplace@mercadolibre.com");
    });

    it("decodifica %2B em telefone (forma canonica)", () => {
      const r = parsearChave("%2B5511912345678");
      expect(r?.tipo).toBe("telefone");
      expect(r?.chave).toBe("+5511912345678");
    });

    it("decodifica %2F em CNPJ (caso o usuario escape manualmente)", () => {
      const r = parsearChave("12.345.678%2F0001-95");
      expect(r?.tipo).toBe("cnpj");
      expect(r?.chave).toBe("12345678000195");
    });

    it("nao quebra com sequencia %XX malformada — usa string original", () => {
      // "%" sem dois hex em seguida lanca URIError; o parser segue.
      expect(parsearChave("100%abc")).toBeUndefined();
    });
  });
});

describe("parseValorUrl", () => {
  it("aceita valor inteiro (sem decimais)", () => {
    expect(parseValorUrl("50")).toBe(5000);
  });

  it("aceita valor com virgula e dois decimais", () => {
    expect(parseValorUrl("50,00")).toBe(5000);
    expect(parseValorUrl("50,50")).toBe(5050);
  });

  it("aceita valor abaixo de 1 real", () => {
    expect(parseValorUrl("0,01")).toBe(1);
    expect(parseValorUrl("0,50")).toBe(50);
  });

  it("trata ponto final com 1 ou 2 digitos como virgula", () => {
    expect(parseValorUrl("50.00")).toBe(5000);
    expect(parseValorUrl("1234.56")).toBe(123456);
    expect(parseValorUrl("50.5")).toBe(5050);
    expect(parseValorUrl("50.0")).toBe(5000);
  });

  it("rejeita valor com caracteres nao numericos", () => {
    expect(parseValorUrl("50abc")).toBeUndefined();
    expect(parseValorUrl("abc")).toBeUndefined();
  });

  it("aceita prefixo R$ ou $ (com ou sem espaco)", () => {
    expect(parseValorUrl("R$10")).toBe(1000);
    expect(parseValorUrl("R$ 10")).toBe(1000);
    expect(parseValorUrl("$10")).toBe(1000);
    expect(parseValorUrl("$ 10")).toBe(1000);
    expect(parseValorUrl("R$50,00")).toBe(5000);
    expect(parseValorUrl("R$ 1.000,50")).toBe(100050);
    // Case-insensitive
    expect(parseValorUrl("r$10")).toBe(1000);
    // So o prefixo — rejeita lixo no meio.
    expect(parseValorUrl("R$abc")).toBeUndefined();
    expect(parseValorUrl("R$")).toBeUndefined();
  });

  it("aceita URL-encoded ($ vira %24)", () => {
    // Astro nao decodifica %XX em Astro.params, entao $/R$ chegam escapados.
    expect(parseValorUrl("R%2410")).toBe(1000);
    expect(parseValorUrl("%2410")).toBe(1000);
    expect(parseValorUrl("R%24%2010")).toBe(1000); // R$ 10
  });

  it("aceita ponto como separador de milhar (grupos de 3 digitos)", () => {
    expect(parseValorUrl("50.000")).toBe(5000000);
    expect(parseValorUrl("1.000")).toBe(100000);
    expect(parseValorUrl("1.000.000")).toBe(100000000);
    expect(parseValorUrl("50.000,00")).toBe(5000000);
    expect(parseValorUrl("1.234.567,89")).toBe(123456789);
  });

  it("com multiplos pontos, trata todos como milhar mesmo se malformado", () => {
    expect(parseValorUrl("5.000.00")).toBe(50000000);
    expect(parseValorUrl("5.000.000")).toBe(500000000);
  });

  it("rejeita ponto isolado ou em posicao invalida", () => {
    expect(parseValorUrl("50.")).toBeUndefined();
    expect(parseValorUrl("50.0000")).toBeUndefined();
    expect(parseValorUrl("1.00")).toBe(100); // ponto com 2 digitos = decimal
    expect(parseValorUrl(".000")).toBeUndefined();
  });

  it("rejeita valor zero ou vazio", () => {
    expect(parseValorUrl("0")).toBeUndefined();
    expect(parseValorUrl("0,00")).toBeUndefined();
    expect(parseValorUrl("")).toBeUndefined();
  });

  it("rejeita negativos (a URL nao deve ter sinal)", () => {
    expect(parseValorUrl("-50")).toBeUndefined();
  });

  it("rejeita valor acima do limite seguro (MAX_SAFE_INTEGER centavos)", () => {
    // Number.MAX_SAFE_INTEGER centavos = ~90 trilhoes de reais.
    // Acima disso o parseFloat perde precisao.
    expect(parseValorUrl("99999999999999999")).toBeUndefined();
  });
});

describe("parseValorForm", () => {
  it("aceita valor inteiro sem decimais", () => {
    expect(parseValorForm("50")).toBe(5000);
  });

  it("aceita valor com virgula", () => {
    expect(parseValorForm("50,00")).toBe(5000);
    expect(parseValorForm("0,50")).toBe(50);
  });

  it("ignora simbolos e texto de moeda", () => {
    expect(parseValorForm("R$ 50,00")).toBe(5000);
    expect(parseValorForm("$50")).toBe(5000);
  });

  it("trata ponto final com 1 ou 2 digitos como virgula", () => {
    expect(parseValorForm("50.00")).toBe(5000);
    expect(parseValorForm("50.5")).toBe(5050);
  });

  it("arredonda fracoes de centavo", () => {
    expect(parseValorForm("0,015")).toBe(2);
  });

  it("rejeita vazio, zero e valores acima do limite seguro", () => {
    expect(parseValorForm("")).toBeUndefined();
    expect(parseValorForm("0")).toBeUndefined();
    expect(parseValorForm("99999999999999999")).toBeUndefined();
  });
});

describe("centavosParaUrl", () => {
  it("formata em reais,centavos com 2 digitos", () => {
    expect(centavosParaUrl(5000)).toBe("50,00");
    expect(centavosParaUrl(5050)).toBe("50,50");
  });

  it("preenche centavos com zero a esquerda", () => {
    expect(centavosParaUrl(1)).toBe("0,01");
    expect(centavosParaUrl(50)).toBe("0,50");
  });

  it("formata valores grandes", () => {
    expect(centavosParaUrl(5000000)).toBe("50000,00");
  });
});

describe("formatValor", () => {
  it("formata centavos em BRL", () => {
    // Usa NBSP do Intl entre R$ e valor (\u00A0)
    expect(formatValor(5000)).toBe("R$\u00a050,00");
    expect(formatValor(1)).toBe("R$\u00a00,01");
    expect(formatValor(100000)).toBe("R$\u00a01.000,00");
  });
});

describe("gerarPayloadPix", () => {
  it("gera payload com estrutura esperada e CRC16 ao final", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000);

    // Payload Format Indicator
    expect(payload.startsWith("000201")).toBe(true);
    // Point of Initiation Method (12 = estatico)
    expect(payload).toContain("010212");
    // Merchant Account Information com GUI do PIX
    expect(payload).toContain("br.gov.bcb.pix");
    // Chave presente
    expect(payload).toContain("+5511912345678");
    // Moeda BRL
    expect(payload).toContain("5303986");
    // Valor R$ 50,00
    expect(payload).toContain("540550.00");
    // Pais e merchant
    expect(payload).toContain("5802BR");
    // CRC16 sempre tem 4 chars hex no final, precedido por "6304"
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("inclui descricao quando informada", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000, "Almoco");
    // Campo 02 dentro do merchant account: "02" + "06" (len) + "Almoco"
    expect(payload).toContain("0206Almoco");
  });

  it("trunca descricao maior que 72 chars", () => {
    const longa = "a".repeat(100);
    const payload = gerarPayloadPix("+5511912345678", 5000, longa);
    // Deve conter exatamente 72 'a's
    expect(payload).toContain("0272" + "a".repeat(72));
    expect(payload).not.toContain("a".repeat(73));
  });

  it("produz CRC16 deterministico para entradas iguais", () => {
    const a = gerarPayloadPix("+5511912345678", 5000);
    const b = gerarPayloadPix("+5511912345678", 5000);
    expect(a).toBe(b);
  });

  it("remove acentos da descricao antes de gerar o payload", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000, "Almoço café");
    // TLV = "02" + len (decimal, 2 digits) + "Almoco cafe" (11 chars)
    expect(payload).toContain("0211Almoco cafe");
    expect(payload).not.toContain("ç");
    expect(payload).not.toContain("é");
  });

  it("dropa emojis e caracteres nao-ASCII da descricao", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000, "Pizza 🍕 hoje");
    // Emoji removido, espacos preservados: "Pizza  hoje" (2 espacos)
    expect(payload).toContain("Pizza  hoje");
    expect(payload).not.toContain("🍕");
  });
});

describe("parsearPayloadPix", () => {
  it("parseia payload gerado pelo gerarPayloadPix (round trip)", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000);
    expect(parsearPayloadPix(payload)).toEqual({
      chave: "+5511912345678",
      valorCentavos: 5000,
      descricao: undefined,
    });
  });

  it("extrai descricao quando presente", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000, "Almoco");
    expect(parsearPayloadPix(payload)).toEqual({
      chave: "+5511912345678",
      valorCentavos: 5000,
      descricao: "Almoco",
    });
  });

  it("aceita CPF, CNPJ, e-mail e UUID", () => {
    expect(parsearPayloadPix(gerarPayloadPix("11144477735", 1500))?.chave).toBe(
      "11144477735",
    );
    expect(
      parsearPayloadPix(gerarPayloadPix("12345678000195", 25000))?.chave,
    ).toBe("12345678000195");
    expect(
      parsearPayloadPix(gerarPayloadPix("joana@example.com", 100))?.chave,
    ).toBe("joana@example.com");
    expect(
      parsearPayloadPix(
        gerarPayloadPix("123e4567-e89b-12d3-a456-426614174000", 50),
      )?.chave,
    ).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("preserva centavos com precisao em valores delicados", () => {
    expect(
      parsearPayloadPix(gerarPayloadPix("11144477735", 1))?.valorCentavos,
    ).toBe(1);
    expect(
      parsearPayloadPix(gerarPayloadPix("11144477735", 50))?.valorCentavos,
    ).toBe(50);
    expect(
      parsearPayloadPix(gerarPayloadPix("11144477735", 5050))?.valorCentavos,
    ).toBe(5050);
  });

  it("rejeita payload com CRC adulterado", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000);
    expect(parsearPayloadPix(payload.slice(0, -4) + "0000")).toBeUndefined();
  });

  it("rejeita payload com byte modificado no meio (CRC nao bate)", () => {
    const payload = gerarPayloadPix("+5511912345678", 5000);
    // Troca o valor de 50.00 pra 90.00 sem recalcular o CRC.
    const adulterado = payload.replace("540550.00", "540590.00");
    expect(parsearPayloadPix(adulterado)).toBeUndefined();
  });

  it("rejeita strings que nao sao payload PIX", () => {
    expect(parsearPayloadPix("")).toBeUndefined();
    expect(parsearPayloadPix("11912345678")).toBeUndefined();
    expect(parsearPayloadPix("joana@example.com")).toBeUndefined();
    expect(parsearPayloadPix("foo bar baz")).toBeUndefined();
  });
});

describe("sanitizarDescricao", () => {
  it("remove diacriticos mantendo letras base", () => {
    expect(sanitizarDescricao("café")).toBe("cafe");
    expect(sanitizarDescricao("pão de açúcar")).toBe("pao de acucar");
    expect(sanitizarDescricao("AÇÃO")).toBe("ACAO");
  });

  it("dropa emojis e simbolos nao-ASCII", () => {
    expect(sanitizarDescricao("oi 🍕")).toBe("oi ");
    expect(sanitizarDescricao("→ seta")).toBe(" seta");
  });

  it("mantem ASCII printavel intacto", () => {
    expect(sanitizarDescricao("Almoco R$50,00 - Bar!")).toBe(
      "Almoco R$50,00 - Bar!",
    );
  });

  it("remove caracteres de controle", () => {
    expect(sanitizarDescricao("a\nb\tc")).toBe("abc");
  });
});

describe("montarDadosPix", () => {
  const telefone = parsearChave("11912345678")!;

  it("retorna payload, svg, url canonica e meta tags", () => {
    const origin = "https://pix.peleteiro.net";
    const dados = montarDadosPix(telefone, 5000, origin);

    expect(dados.payload).toContain("br.gov.bcb.pix");
    expect(dados.payload).toContain("+5511912345678");
    expect(dados.svg).toContain("<svg");
    expect(dados.valorFormatado).toBe("R$\u00a050,00");
    expect(dados.titulo).toBe("PIX R$\u00a050,00");
    expect(dados.label).toBe("Telefone");
    expect(dados.display).toBe("+55 (11) 91234-5678");
    expect(dados.resumo).toBe("Telefone: +55 (11) 91234-5678");
  });

  it("canonical url usa o formato /{chave}/{reais,centavos}", () => {
    const origin = "https://pix.peleteiro.net";
    const dados = montarDadosPix(telefone, 5000, origin);

    // Chave e URL-encoded (+ vira %2B).
    expect(dados.canonicalUrl).toBe(
      "https://pix.peleteiro.net/%2B5511912345678/50,00",
    );
    expect(dados.imagemUrl).toBe(
      "https://pix.peleteiro.net/%2B5511912345678/50,00.png",
    );
  });

  it("canonical url inclui apenas a descricao, nao outros params", () => {
    // A funcao so recebe a descricao — UTMs, etc. nao sao passados, entao
    // por design nao aparecem na canonical. Esse teste confirma o formato.
    const dados = montarDadosPix(
      telefone,
      5000,
      "https://pix.peleteiro.net",
      "Almoco no Bar",
    );
    expect(dados.canonicalUrl).toContain("?d=Almoco%20no%20Bar");
    expect(dados.resumo).toBe("Telefone: +55 (11) 91234-5678 — Almoco no Bar");
  });

  it("descricao entra no payload PIX", () => {
    const dados = montarDadosPix(
      telefone,
      5000,
      "https://pix.peleteiro.net",
      "Almoco",
    );
    expect(dados.payload).toContain("0206Almoco");
  });

  it("nao gera canonical curta quando payload original e preservado", () => {
    // Quando ha payloadOriginal, a forma curta /{chave}/{valor} levaria a
    // um payload regenerado sem txid — entao a pagina nao deve oferecer
    // uma URL canonica curta nem PNG curto (que apontariam pra essa forma
    // lossy).
    const original =
      "00020126540014br.gov.bcb.pix0132pix_marketplace@mercadolibre.com5204000053039865406792.695802BR5911@34117387556009Sao Paulo62250521mpqrinter1592000744436304DA46";
    const email = parsearChave("pix_marketplace@mercadolibre.com")!;
    const dados = montarDadosPix(
      email,
      79269,
      "https://pix.peleteiro.net",
      undefined,
      original,
    );
    expect(dados.canonicalUrl).toBeUndefined();
    expect(dados.imagemUrl).toBeUndefined();
  });

  it("monta dados sem valor quando payload e 'valor a definir'", () => {
    // Payload sem campo 54 (valor a definir). Renderizamos o QR direto
    // — NUNCA caimos pra calculadora porque ela perderia o txid.
    const semValor =
      "00020126540014br.gov.bcb.pix0132pix_marketplace@mercadolibre.com5204000053039865802BR5911@34117387556009Sao Paulo62250521mpqrinter159200074443630417EF";
    const email = parsearChave("pix_marketplace@mercadolibre.com")!;
    const dados = montarDadosPix(
      email,
      undefined,
      "https://pix.peleteiro.net",
      undefined,
      semValor,
    );
    expect(dados.payload).toBe(semValor);
    expect(dados.valorFormatado).toBeUndefined();
    expect(dados.canonicalUrl).toBeUndefined();
    expect(dados.imagemUrl).toBeUndefined();
    expect(dados.titulo).toBe("PIX para pix_marketplace@mercadolibre.com");
  });

  it("lanca erro se chamada sem centavos e sem payloadOriginal", () => {
    const email = parsearChave("joana@example.com")!;
    expect(() => montarDadosPix(email, undefined, "https://x.com")).toThrow();
  });

  it("preserva o payload original quando fornecido (PIX copia e cola)", () => {
    // Caso marketplace: o payload colado tem txid e merchant name proprios
    // que o gerarPayloadPix nao reproduz. Quando passamos o payload
    // original, ele e usado verbatim no QR e no botao copiar.
    const original =
      "00020126540014br.gov.bcb.pix0132pix_marketplace@mercadolibre.com5204000053039865406792.695802BR5911@34117387556009Sao Paulo62250521mpqrinter1592000744436304DA46";
    const email = parsearChave("pix_marketplace@mercadolibre.com")!;
    const dados = montarDadosPix(
      email,
      79269,
      "https://pix.peleteiro.net",
      undefined,
      original,
    );
    expect(dados.payload).toBe(original);
    // O txid do marketplace tem que aparecer no payload final.
    expect(dados.payload).toContain("mpqrinter159200074443");
    // E no SVG do QR (qrcode-svg embute o texto literal nos pixels —
    // checar a presenca no SVG comprova que o QR carrega o payload exato).
    expect(dados.svg).toContain("<svg");
  });

  it("funciona com chaves de outros tipos", () => {
    const email = parsearChave("joana@example.com")!;
    const dados = montarDadosPix(email, 10000, "https://x.com");

    expect(dados.label).toBe("E-mail");
    expect(dados.display).toBe("joana@example.com");
    expect(dados.canonicalUrl).toBe("https://x.com/joana%40example.com/100,00");
  });
});
