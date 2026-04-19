import { getViteConfig } from "astro/config";

// Usa a config do Astro pra que o Vitest resolva modulos virtuais como
// astro:*, permitindo importar .astro files e usar AstroContainer nos
// testes de integracao.
export default getViteConfig({});
