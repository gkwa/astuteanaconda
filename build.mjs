import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyFiles() {
  // Create dist directory if it doesn't exist
  try {
    await fs.mkdir('dist', { recursive: true });
  } catch (err) {
    // Directory already exists, continue
  }

  // Files to copy
  const filesToCopy = [
    { src: 'src/manifest.json', dest: 'dist/manifest.json' },
    { src: 'src/popup.html', dest: 'dist/popup.html' },
    { src: 'src/options.html', dest: 'dist/options.html' },
  ];

  // Copy icon files
  const iconDir = path.join(__dirname, 'icons');
  try {
    const icons = await fs.readdir(iconDir);
    
    // Create icons directory in dist
    await fs.mkdir(path.join(__dirname, 'dist/icons'), { recursive: true });
    
    // Add icon files to the copy list
    for (const icon of icons) {
      filesToCopy.push({
        src: `icons/${icon}`,
        dest: `dist/icons/${icon}`
      });
    }
  } catch (err) {
    console.log('No icons directory found or error accessing it:', err.message);
  }

  // Copy each file
  for (const file of filesToCopy) {
    try {
      const content = await fs.readFile(path.join(__dirname, file.src));
      await fs.writeFile(path.join(__dirname, file.dest), content);
      console.log(`Copied ${file.src} to ${file.dest}`);
    } catch (err) {
      console.error(`Error copying ${file.src}:`, err.message);
    }
  }
}

async function buildExtension() {
  // Make sure dist directory exists and copy static files first
  await copyFiles();
  
  // Configuration for each entry point
  const entries = [
    { input: 'src/content-script.js', output: 'content' },
    { input: 'src/popup.js', output: 'popup' },
    { input: 'src/socialsparrow-bundle.js', output: 'socialsparrow' },
    { input: 'src/options.js', output: 'options' },
  ];

  // Build each entry point
  for (const { input, output } of entries) {
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'dist',
        sourcemap: true, // Explicitly enable sourcemaps
        lib: {
          entry: resolve(__dirname, input),
          name: output,
          fileName: () => `${output}.bundle.js`,
          formats: ['iife']
        },
        rollupOptions: {
          external: [],
        },
      }
    });
    console.log(`Built ${output} successfully`);
  }

  console.log('Build completed successfully');
}

buildExtension().catch(console.error);
