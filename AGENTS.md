# Guia de Agentes — pixlink

Fonte unica da verdade para agentes de IA trabalhando neste projeto.

## Restricoes Criticas

1. **Task Runner**: SEMPRE use `mise`.
   - `mise run tarefa` (ex: `mise run deploy`).
   - Tasks sao scripts bash em `.config/mise/tasks/`.
2. **Gerenciador de Pacotes**: SEMPRE use `pnpm`.
3. **TypeScript**: Tipagem estrita. `any` proibido.
   - Prefira `undefined` a `null`.
4. **Infraestrutura**:
   - NUNCA execute `tofu apply` ou `terraform apply`.
5. **Idioma**: Comentarios em **Portugues**.
6. **Deploy**: Via `mise run deploy`. NUNCA sem pedido explicito.
7. **Git**: NUNCA faca commit sem pedido explicito.
8. **Simplicidade**: Codigo que um junior entende. Sem over-engineering.

## Contexto e Arquitetura

**pixlink** e um Cloudflare Worker que gera QR Codes de pagamento PIX a partir da URL.

URL: `/{chave-pix}/{valor}`
Exemplo: `/11912345678/50,00` → QR Code PIX de R$50,00 para +55 11 91234-5678
Valor usa `,` para separar centavos. Aceita prefixo "R$" ou "$".
Regras completas no `README.md`; resumo orientado a IA em `public/llms.txt`.

### Tech Stack

- **Framework**: Astro 6 (SSR)
- **Deploy**: Cloudflare Workers (via wrangler)
- **QR Code**: qrcode-svg (SVG puro, sem dependencias nativas)
- **Infra**: OpenTofu (Cloudflare DNS + Worker custom domain)
- **Dev**: `mise` (tasks), `Tilt` (orquestracao)

### Mapa do Projeto

| Caminho                                     | Proposito                                               |
| :------------------------------------------ | :------------------------------------------------------ |
| `src/pages/index.astro`                     | Home com form de geracao de link                        |
| `src/pages/[chave]/index.astro`             | PIX copia e cola + calculadora (chave so)               |
| `src/pages/[chave]/[valor].astro`           | Pagina do PIX — renderiza QR Code                       |
| `src/pages/[chave]/[valor].png.ts`          | Endpoint que serve o QR Code em PNG (1024x1024)         |
| `src/pages/[chave1]/[chave2]/[valor].astro` | Redirect pra CNPJ com `/` na URL                        |
| `test/integration/`                         | Testes de integracao via AstroContainer                 |
| `src/layouts/Base.astro`                    | Shell compartilhado: head, meta tags, GA, body          |
| `src/lib/pix/chave.ts`                      | Parse/validacao de chave (CPF, CNPJ, UUID, email)       |
| `src/lib/pix/valor.ts`                      | Parse/format de valor, `MAX_CENTAVOS`                   |
| `src/lib/pix/payload.ts`                    | EMV TLV + CRC16, `gerarPayloadPix`, `parsearPayloadPix` |
| `src/lib/pix/qrcode.ts`                     | Geracao do SVG do QR Code                               |
| `src/lib/pix/index.ts`                      | Barrel + `montarDadosPix` (orquestracao)                |
| `src/components/PixPage.astro`              | Template compartilhado da pagina do QR Code             |
| `src/components/`                           | UI — PixForm, CopyButton, ShareButton, ErrorPage        |
| `src/styles/global.css`                     | Tailwind 4 + utilities `.btn-primary/.btn-secondary`    |
| `public/`                                   | favicon.svg, robots.txt, llms.txt                       |
| `.github/workflows/ci.yml`                  | CI — roda `mise run check` em push/PR                   |
| `sysadmin/tofu/`                            | Infraestrutura (DNS pix.peleteiro.net)                  |
| `.config/mise/tasks/`                       | Scripts de tarefas                                      |

Imports usam o alias `@/` para `src/` (`@/lib/pix`, `@/layouts/Base.astro`).

### Payload PIX

O payload segue a especificacao EMV QR Code do Banco Central:

- Formato TLV (Tag-Length-Value)
- CRC16-CCITT para checksum
- Suporta chaves: telefone, CPF, CNPJ, e-mail, chave aleatoria

A URL aceita tanto a forma curta `/{chave}/{valor}` (regera o payload
do zero) quanto o payload EMV inteiro como path unico `/{payload}` —
neste caso o QR Code preserva o payload original com txid e merchant
name, com ou sem valor.

**Invariante**: payload com txid nunca cai pra calculadora. Mesmo sem
valor no payload (`valor a definir`), renderiza o QR direto e o app do
banco captura o valor na hora — a calculadora regeraria o payload e
perderia o txid. Detalhes no `README.md`.

### URL-encoding e `Astro.params`

Astro 6 nao decodifica `%XX` em `Astro.params`. Os parsers
(`parsearChave`, `parseValorUrl`) chamam `decodeURIComponent` internamente
com try/catch — ou seja, qualquer rota nova que receba um param da URL
deve confiar nesses parsers ou repetir o padrao. Caveat conhecido: a
combinacao `%24%20` (`$` + espaco) e bloqueada no nivel de routing
(Vite dev + adapter Cloudflare) antes de chegar no app.

## Fluxos de Trabalho

```bash
pnpm install       # Dependencias + instala git hooks (lefthook)
tilt up            # Servidor dev (porta 3000)
mise run lint      # Correcao automatica (prettier + astro check)
mise run test      # Roda os testes (vitest)
mise run check     # Verificacao CI (prettier --check + astro check + vitest)
mise run deploy    # Build + deploy Cloudflare Workers
mise run clean     # Limpar gerados
```

## Padroes de Codigo

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`
- **Comentarios**: Explique o _porque_, nao o _o que_
- **Git**: NUNCA commit/deploy sem pedido explicito

## Instrucoes para Agentes

1. Leia este arquivo (`AGENTS.md`) e `package.json` no inicio
2. Rode `mise run lint` antes de entregar
3. NUNCA faca commit ou deploy sem pedido explicito
4. Para AI agents que vao **usar** o servico (construir URLs pixlink em
   prol de um usuario), consultem `public/llms.txt`
