import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// O adapter Cloudflare injeta config de vite que briga com o vitest
// (resolve.external de builtins). Em modo teste, rodamos em node puro.
const isTest = !!process.env.VITEST;

export default defineConfig({
  output: "server",
  ...(isTest ? {} : { adapter: cloudflare() }),
  compressHTML: true,
  integrations: [react()],
  // Desabilita sessions: nao usamos Astro.session em lugar nenhum. Sem isso,
  // o adapter Cloudflare auto-injeta uma KV binding "SESSION" no wrangler.
  // Driver "null" e no-op: writes descartados, reads retornam null.
  session: {
    driver: { entrypoint: "unstorage/drivers/null" },
  },
  vite: {
    resolve: {
      alias:
        process.env.NODE_ENV === "production"
          ? { "react-dom/server": "react-dom/server.edge" }
          : {},
    },
    plugins: [tailwindcss()],
  },
});
