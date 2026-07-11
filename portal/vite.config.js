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
      input: {
        portal: fileURLToPath(new URL("./src/main.jsx", import.meta.url)),
        "portal-standalone": fileURLToPath(new URL("./src/standalone.jsx", import.meta.url)),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "portal.[ext]",
      },
    },
  },
});
