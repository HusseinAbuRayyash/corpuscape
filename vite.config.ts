import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  worker: { format: "es" },
  plugins: [
    react(),
    {
      name: "corpuscape-html-version",
      transformIndexHtml: (html) => html.replace("%APP_VERSION%", () => pkg.version),
    },
  ],
  optimizeDeps: {include:["@mlc-ai/web-llm","docx","fflate"]},
  root: "web",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
