const { build } = require("vite")
const { resolve } = require("path")

async function buildExtension() {
  // Configuration for each entry point
  const entries = [
    { input: "src/content-script.js", output: "content" },
    { input: "src/popup.js", output: "popup" },
    { input: "src/socialsparrow-bundle.js", output: "socialsparrow" },
    { input: "src/options.js", output: "options" },
  ]

  // Build each entry point
  for (const { input, output } of entries) {
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: "dist",
        lib: {
          entry: resolve(__dirname, input),
          name: output,
          fileName: () => `${output}.bundle.js`,
          formats: ["iife"],
        },
        rollupOptions: {
          external: [],
        },
      },
    })
    console.log(`Built ${output} successfully`)
  }

  // Copy static files
  await build({
    configFile: "vite.config.js",
    build: {
      emptyOutDir: false,
      rollupOptions: {
        input: [],
      },
    },
  })
}

buildExtension().catch(console.error)
