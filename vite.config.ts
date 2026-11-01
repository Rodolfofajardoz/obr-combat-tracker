import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // En GitHub Pages el sitio vive en /obr-combat-tracker/ (lo pone el workflow con VITE_BASE)
  base: process.env.VITE_BASE || "/",
  // dice-box usa web workers y wasm: mejor que Vite no lo pre-empaquete
  optimizeDeps: { exclude: ["@3d-dice/dice-box"] },
  // allowedHosts: para exponer el servidor con el túnel de Cloudflare (npm run tunnel)
  server: { cors: true, allowedHosts: [".trycloudflare.com"] },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
        card: resolve(__dirname, "card.html"),
      },
    },
  },
});
