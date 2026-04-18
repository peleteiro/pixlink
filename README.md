# pix

Cloudflare Worker que gera QR Codes de pagamento PIX a partir da URL.

## URL

```
/{chave-pix}/{valor-em-centavos}?d={descricao}
```

### Chaves aceitas

- **Telefone** — `21992446550`, `5521992446550` ou `+5521992446550`
- **CPF** — `052.868.827-81` ou `05286882781`
- **E-mail** — `jose@peleteiro.net`

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

| URL | Resultado |
|-----|-----------|
| `/21992446550/5000` | Pagina com QR Code de R$ 50,00 |
| `/052.868.827-81/1500` | QR Code para CPF, R$ 15,00 |
| `/jose@peleteiro.net/10000?d=Consultoria` | QR Code com descricao |
| `/21992446550/5000.png` | Imagem PNG do QR Code |

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
