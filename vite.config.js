import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.js'),
        popup: resolve(__dirname, 'src/popup.js'),
        socialsparrow: resolve(__dirname, 'src/socialsparrow-bundle.js')
      },
      output: {
        entryFileNames: '[name].bundle.js',
        chunkFileNames: '[name].bundle.js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json', dest: '' },
        { src: 'src/popup.html', dest: '' },
        { src: 'icons', dest: '' }
      ]
    })
  ]
});

