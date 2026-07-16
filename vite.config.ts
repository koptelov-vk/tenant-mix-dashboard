import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/tenant-mix-dashboard/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
