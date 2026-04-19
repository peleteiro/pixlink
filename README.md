# pixlink

Cloudflare Worker que gera QR Codes de pagamento PIX a partir da URL.

## URL

```
/{chave-pix}/{valor-em-centavos}?d={descricao}
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

1. Se contém `@` → e-mail.
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

Em centavos. `5000` = R$ 50,00.

### Descricao (opcional)

Query param `?d=Almoco` — incluida no payload PIX.

### PNG

Adicione `.png` ao valor para receber apenas a imagem do QR Code (1024x1024):

```
/21992446550/5000.png
```

## Exemplos

| URL                                          | Resultado                              |
| -------------------------------------------- | -------------------------------------- |
| `/21992446550/5000`                          | Pagina com QR Code de R$ 50,00         |
| `/052.868.827-81/1500`                       | QR Code para CPF, R$ 15,00             |
| `/12.345.678%2F0001-95/25000`                | QR Code para CNPJ, R$ 250,00           |
| `/123e4567-e89b-12d3-a456-426614174000/5000` | QR Code para chave aleatoria, R$ 50,00 |
| `/jose@peleteiro.net/10000?d=Consultoria`    | QR Code com descricao                  |
| `/21992446550/5000.png`                      | Imagem PNG do QR Code                  |

## Desenvolvimento

```bash
pnpm install
tilt up          # servidor dev na porta 3000
```

## Tarefas

```bash
mise run deploy  # build + deploy Cloudflare Workers
mise run lint    # format + type check
mise run check   # verificacao CI
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
