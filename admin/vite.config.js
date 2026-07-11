import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

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
        entryFileNames: "admin.js",
        assetFileNames: "admin.[ext]",
      },
    },
  },
});
