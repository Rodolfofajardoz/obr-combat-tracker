import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

// En GitHub Pages el sitio vive en /obr-combat-tracker/ (lo pone el workflow con VITE_BASE)
const base = process.env.VITE_BASE || "/";

/** manifest.json con las rutas absolutas bajo `base`, para que Owlbear las encuentre aunque el sitio viva en una subcarpeta */
function manifest(): Plugin {
  const build = () => {
    const m = JSON.parse(readFileSync(resolve(__dirname, "manifest.json"), "utf-8"));
    const abs = (p: string) => base + p.replace(/^\.?\//, "");
    m.icon = abs(m.icon);
    m.action.icon = abs(m.action.icon);
    m.action.popover = abs(m.action.popover);
    m.background_url = abs(m.background_url);
    return JSON.stringify(m, null, 2);
  };
  return {
    name: "obr-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== `${base}manifest.json`) return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(build());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.json", source: build() });
    },
  };
}

export default defineConfig({
  plugins: [react(), manifest()],
  base,
  // Sello de compilación: las páginas emergentes (hoja, dados, tarjeta) se piden con ?v=… para que
  // GitHub Pages no sirva un HTML viejo de la caché después de publicar
  define: { "import.meta.env.VITE_BUILD": JSON.stringify(Date.now().toString(36)) },
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
        dice: resolve(__dirname, "dice.html"),
        sheet: resolve(__dirname, "sheet.html"),
      },
    },
  },
});
