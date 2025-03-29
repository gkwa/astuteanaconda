import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild",
    emptyOutDir: false,
  },
  esbuild: {
    keepNames: true,
    minifyIdentifiers: false,
  },
})
