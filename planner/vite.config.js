import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

// O Planner e buildado em arquivos estaticos de nome fixo e servido pelo
// server.js principal em /planner/dist. Sem code-splitting para simplificar
// a integracao na pagina existente (funciona offline na VM).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./src/main.jsx", import.meta.url)),
      output: {
        inlineDynamicImports: true,
        entryFileNames: "planner.js",
        assetFileNames: "planner.[ext]",
      },
    },
  },
});
