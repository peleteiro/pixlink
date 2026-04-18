import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  compressHTML: true,
  integrations: [react()],
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
