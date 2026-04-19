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
Exemplo: `/21992446550/50,00` → QR Code PIX de R$50,00 para +55 21 99244-6550
Valor usa `,` para separar centavos. Regras completas no `README.md`.

### Tech Stack

- **Framework**: Astro 6 (SSR)
- **Deploy**: Cloudflare Workers (via wrangler)
- **QR Code**: qrcode-svg (SVG puro, sem dependencias nativas)
- **Infra**: OpenTofu (Cloudflare DNS + Worker custom domain)
- **Dev**: `mise` (tasks), `Tilt` (orquestracao)

### Mapa do Projeto

| Caminho                                     | Proposito                                            |
| :------------------------------------------ | :--------------------------------------------------- |
| `src/pages/index.astro`                     | Home com form de geracao de link                     |
| `src/pages/[chave]/[valor].astro`           | Pagina do PIX — renderiza QR Code                    |
| `src/pages/[chave]/[valor].png.ts`          | Endpoint que serve o QR Code em PNG (1024x1024)      |
| `src/pages/[chave1]/[chave2]/[valor].astro` | Redirect pra CNPJ com `/` na URL                     |
| `src/pages/valor.test.ts`                   | Testes de integracao da pagina (AstroContainer)      |
| `src/layouts/Base.astro`                    | Shell compartilhado: head, meta tags, GA, body       |
| `src/lib/pix/chave.ts`                      | Parse/validacao de chave (CPF, CNPJ, UUID, email)    |
| `src/lib/pix/valor.ts`                      | Parse/format de valor, `MAX_CENTAVOS`                |
| `src/lib/pix/payload.ts`                    | Payload EMV + TLV + CRC16 + `sanitizarDescricao`     |
| `src/lib/pix/qrcode.ts`                     | Geracao do SVG do QR Code                            |
| `src/lib/pix/index.ts`                      | Barrel + `montarDadosPix` (orquestracao)             |
| `src/components/`                           | UI — PixForm, CopyButton, ShareButton, ErrorPage     |
| `src/styles/global.css`                     | Tailwind 4 + utilities `.btn-primary/.btn-secondary` |
| `public/`                                   | favicon.svg, robots.txt                              |
| `.github/workflows/ci.yml`                  | CI — roda `mise run check` em push/PR                |
| `sysadmin/tofu/`                            | Infraestrutura (DNS pix.peleteiro.net)               |
| `.config/mise/tasks/`                       | Scripts de tarefas                                   |

Imports usam o alias `@/` para `src/` (`@/lib/pix`, `@/layouts/Base.astro`).

### Payload PIX

O payload segue a especificacao EMV QR Code do Banco Central:

- Formato TLV (Tag-Length-Value)
- CRC16-CCITT para checksum
- Suporta chaves: telefone, CPF, CNPJ, e-mail, chave aleatoria

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

1. Leia `AGENTS.md` e `package.json` no inicio
2. Rode `mise run lint` antes de entregar
3. NUNCA faca commit ou deploy sem pedido explicito
