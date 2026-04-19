# pixlink

Cloudflare Worker que gera QR Codes de pagamento PIX a partir da URL.

## URL

```
/{chave-pix}/{valor}?d={descricao}
```

### Chaves aceitas

- **Telefone** — `21992446550`, `5521992446550` ou `+5521992446550`
- **CPF** — `052.868.827-81` ou `05286882781`
- **CNPJ** — `12.345.678/0001-95` ou `12345678000195`
- **E-mail** — `jose@peleteiro.net`
- **Chave aleatoria** — UUID, com ou sem hifens:
  `123e4567-e89b-12d3-a456-426614174000` ou
  `123e4567e89b12d3a456426614174000`

O parser é permissivo:

1. Se contém `@` → e-mail. Validacao basica: `localpart@dominio.tld`
   (rejeita `@`, `foo@`, `@bar`, `foo@bar` sem TLD).
2. Se bate com o formato UUID (36 chars com hifens ou 32 hex) → chave
   aleatória, normalizada para lowercase com hifens.
3. Caso contrário, tudo que não for dígito é removido (pontuação,
   espaços, `+`, parênteses) e o que sobra é classificado pelo tamanho
   — 11 dígitos = CPF, 14 = CNPJ, 10–13 com ou sem DDI 55 = telefone.
   CPF e CNPJ são validados pelos dígitos verificadores.

### CNPJ com `/` na URL

A barra do CNPJ quebraria o roteamento, então existe uma rota auxiliar
que aceita o CNPJ com a barra literal e redireciona (301) para a forma
canônica com os dois segmentos unidos:

```
/12.345.678/0001-95/25000  →  /12.345.6780001-95/25000
```

Assim o usuário pode colar o CNPJ formatado direto na URL sem precisar
escapar o `/` como `%2F`.

### Valor

O valor usa **`,` como separador de centavos**. Ambos os formatos sao
aceitos sem redirect, mas a forma canonica (usada na tag `<link
rel="canonical">` e gerada pelo form na home) e `{reais},{centavos}`
com dois digitos:

| Entrada na URL | Centavos | Formatado    |
| -------------- | -------- | ------------ |
| `/50,00`       | 5000     | R$ 50,00     |
| `/50`          | 5000     | R$ 50,00     |
| `/0,50`        | 50       | R$ 0,50      |
| `/0,01`        | 1        | R$ 0,01      |
| `/50000,00`    | 5000000  | R$ 50.000,00 |

**Heuristica:** se o valor terminar com `.` + dois digitos (ex: `50.00`),
tratamos esse ponto como virgula — conveniencia para quem cola valores
em formato em ingles. `/50.00` equivale a `/50,00`.

Invalidos (retornam HTTP 400 com pagina estilizada):

- Zero ou negativo (`/0`, `/0,00`, `/-50`)
- Caracteres nao numericos alem de `,` ou do `.XX` final (`/R$50`,
  `/50abc`)
- Ponto no meio que nao seja o `.XX` final (`/50.000`, `/50.5`)
- Valor acima de `Number.MAX_SAFE_INTEGER` centavos (~R$ 90 trilhoes) —
  acima disso o parseFloat perde precisao.

#### Valor no form da home

O campo de valor no form da home e mais permissivo que a URL: aceita
qualquer formatacao e gera a URL canonica. A regra e "so digitos e
virgula importam, o resto e ignorado":

| Entrada no form | URL gerada  |
| --------------- | ----------- |
| `50`            | `/50,00`    |
| `50,00`         | `/50,00`    |
| `R$ 50,00`      | `/50,00`    |
| `R$50`          | `/50,00`    |
| `$50`           | `/50,00`    |
| `50.00`         | `/50,00`    |
| `50.000,00`     | `/50000,00` |
| `-50,00`        | `/50,00`    |
| `0,015`         | `/0,02`     |

Detalhes:

- `,` separa os centavos; se ausente, o valor e tratado como reais
  inteiros.
- Tudo que nao for digito ou `,` e removido (inclusive `-`, entao
  valores negativos viram positivos).
- Como na URL, `.` no final seguido de dois digitos vira `,` (`50.00`
  = `50,00`).
- Fracoes menores que 1 centavo sao arredondadas para o inteiro mais
  proximo (`0,015` → 2 centavos).

### Descricao (opcional)

Query param `?d=Almoco` — incluida no payload PIX.

A descricao e sanitizada antes de entrar no QR Code: acentos sao
transliterados (`café` → `cafe`) e caracteres nao-ASCII (emojis,
simbolos Unicode, controles) sao removidos. A especificacao EMV usa
encoding restrito e bancos podem rejeitar o QR Code silenciosamente
sem esse passo. O texto maximo no payload e 72 caracteres (o que
passar disso e truncado).

### PNG

Adicione `.png` ao valor para receber apenas a imagem do QR Code (1024x1024):

```
/21992446550/50,00.png
```

### URL canonica

A pagina inclui `<link rel="canonical">` apontando para a forma
preferida (`/{chave-normalizada}/{reais,centavos}`). Query params de
tracking (UTMs, etc.) sao descartados — so a descricao `?d=`, que
participa do conteudo do QR Code, entra na canonical. Evita que
`/21992446550/50` e `/+5521992446550/50,00?utm_source=x` contem como
paginas diferentes pra crawlers.

### Previews em redes sociais

A página do PIX inclui meta tags Open Graph e Twitter Card, então ao
colar o link no WhatsApp, Telegram, Slack, etc. o preview mostra o QR
Code (via endpoint `.png`), o valor e a chave.

## Exemplos

| URL                                        | Resultado                              |
| ------------------------------------------ | -------------------------------------- |
| `/21992446550/50,00`                       | Pagina com QR Code de R$ 50,00         |
| `/21992446550/50`                          | Mesmo resultado (forma compacta)       |
| `/052.868.827-81/15`                       | QR Code para CPF, R$ 15,00             |
| `/12.345.678%2F0001-95/250,00`             | QR Code para CNPJ, R$ 250,00           |
| `/123e4567-e89b-12d3-a456-426614174000/50` | QR Code para chave aleatoria, R$ 50,00 |
| `/jose@peleteiro.net/100?d=Consultoria`    | QR Code com descricao                  |
| `/21992446550/50,00.png`                   | Imagem PNG do QR Code                  |

## Estrutura

```
src/
├── components/     # CopyButton, ShareButton, PixForm (React);
│                   # ErrorPage, GoogleAnalytics (Astro)
├── layouts/        # Base.astro — shell com head/meta/GA
├── lib/pix/        # dominio: chave, valor, payload EMV, qrcode, montarDadosPix
├── pages/          # rotas: /, /[chave]/[valor], /[chave]/[valor].png,
│                   # rota auxiliar /[chave1]/[chave2]/[valor] (CNPJ com barra)
└── styles/         # global.css (Tailwind 4 + btn utilities)
public/             # favicon.svg, robots.txt
```

Imports usam o alias `@/` para `src/` (ex: `@/lib/pix`, `@/layouts/Base.astro`).

## Desenvolvimento

```bash
pnpm install
tilt up          # servidor dev na porta 3000
```

## Tarefas

```bash
mise run deploy  # build + deploy Cloudflare Workers
mise run lint    # format + type check
mise run test    # roda a suite de testes (vitest)
mise run check   # verificacao CI (format + types + testes)
mise run clean   # limpar gerados
```

## Infraestrutura

DNS e Worker custom domain gerenciados via OpenTofu em `sysadmin/tofu/`.

```bash
mise run tofu:plan   # ver mudancas
mise run tofu:apply  # aplicar
```

## Stack

- [Astro 6](https://astro.build) (SSR) + React 19 + Tailwind CSS 4
- [Cloudflare Workers](https://workers.cloudflare.com)
- [qrcode-svg](https://github.com/nicktomlin/qrcode-svg) + [@resvg/resvg-wasm](https://github.com/nicktomlin/resvg-js) (PNG)
- [OpenTofu](https://opentofu.org) (infra)
