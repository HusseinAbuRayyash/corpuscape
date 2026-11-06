import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  worker: { format: "es" },
  plugins: [react()],
  root: "web",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
