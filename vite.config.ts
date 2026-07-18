import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
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
      cpSync(resolve('dist/index-react.html'), resolve('dist/index.html'));
      writeFileSync(resolve('dist/build-info.json'), JSON.stringify({
        status: 'production',
        build: process.env.GITHUB_SHA ?? process.env.VITE_BUILD_SHA ?? `local-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        app: 'tenant-mix-react',
      }));
    },
  };
}

export default defineConfig({
  base: '/tenant-mix-dashboard/',
  plugins: [react(), copyDashboardData()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: { index: resolve('index-react.html') },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
