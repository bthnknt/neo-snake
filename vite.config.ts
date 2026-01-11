import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages için base path - repo adına göre otomatik
  base: './',
  server: {
    host: true,
    port: 3000,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    outDir: 'dist',
  },
});
