import { defineConfig, loadEnv, build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '');
  const apiUrl =
    process.env.VITE_THRIVE_API_URL ||
    env.VITE_THRIVE_API_URL ||
    'http://localhost:8000/api';

  const socUrl =
    process.env.VITE_THRIVE_SOC_URL ||
    env.VITE_THRIVE_SOC_URL ||
    'http://localhost:5173';

  return {
    base: './',
    plugins: [
      react(),
      {
        name: 'build-standalone-extension-scripts',
        apply: 'build',
        async closeBundle() {
          // 1. Build content script as IIFE (classic script for Chrome content_scripts)
          await viteBuild({
            configFile: false,
            root: resolve(__dirname),
            define: {
              'import.meta.env.VITE_THRIVE_API_URL': JSON.stringify(apiUrl),
              'import.meta.env.VITE_THRIVE_SOC_URL': JSON.stringify(socUrl),
            },
            build: {
              emptyOutDir: false,
              outDir: resolve(__dirname, 'dist'),
              lib: {
                entry: resolve(__dirname, 'src/content/content-script.ts'),
                formats: ['iife'],
                name: 'PhishXContentScript',
                fileName: () => 'content-script.js',
              },
            },
          });

          // 2. Build service worker as standalone ES module
          await viteBuild({
            configFile: false,
            root: resolve(__dirname),
            define: {
              'import.meta.env.VITE_THRIVE_API_URL': JSON.stringify(apiUrl),
              'import.meta.env.VITE_THRIVE_SOC_URL': JSON.stringify(socUrl),
            },
            build: {
              emptyOutDir: false,
              outDir: resolve(__dirname, 'dist'),
              lib: {
                entry: resolve(__dirname, 'src/background/service-worker.ts'),
                formats: ['es'],
                fileName: () => 'service-worker.js',
              },
            },
          });
        },
      },
    ],
    root: resolve(__dirname),
    define: {
      'import.meta.env.VITE_THRIVE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_THRIVE_SOC_URL': JSON.stringify(socUrl),
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
