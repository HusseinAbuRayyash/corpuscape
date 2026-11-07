import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  worker: { format: "es" },
  plugins: [react()],
  optimizeDeps: {include:["@mlc-ai/web-llm","docx","fflate"]},
  root: "web",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
