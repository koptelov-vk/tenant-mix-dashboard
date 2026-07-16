import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function copyDashboardData(): Plugin {
  return {
    name: 'copy-dashboard-data',
    closeBundle() {
      const target = resolve('dist/data');
      mkdirSync(target, { recursive: true });
      cpSync(resolve('data/aggregates/dashboard_data.json'), resolve(target, 'dashboard_data.json'));
    },
  };
}

export default defineConfig({
  base: '/tenant-mix-dashboard/',
  plugins: [react(), copyDashboardData()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: resolve('index-react.html'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
