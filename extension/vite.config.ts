import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '');
  const apiUrl =
    process.env.VITE_THRIVE_API_URL ||
    env.VITE_THRIVE_API_URL ||
    (mode === 'production'
      ? 'https://phisdetect-tau.vercel.app/api'
      : 'http://localhost:8000/api');

  const socUrl =
    process.env.VITE_THRIVE_SOC_URL ||
    env.VITE_THRIVE_SOC_URL ||
    (mode === 'production'
      ? 'https://phisdetect-tau.vercel.app'
      : 'http://localhost:5173');

  return {
    base: './',
    plugins: [react()],
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
          background: resolve(__dirname, 'src/background/service-worker.ts'),
          content: resolve(__dirname, 'src/content/content-script.ts')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'service-worker.js';
            }
            if (chunkInfo.name === 'content') {
              return 'content-script.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  };
});
