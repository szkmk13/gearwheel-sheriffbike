import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/static/frontend/',
  build: {
    manifest: true,
    outDir: resolve(__dirname, '../static/frontend'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.jsx'),
    },
  },
  server: {
    port: 5173,
  },
});
