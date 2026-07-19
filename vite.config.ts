import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function copyDashboardData(): Plugin {
  return {
    name: 'copy-dashboard-data',
    closeBundle() {
      const source = resolve('data/aggregates/dashboard_data.json');
      const dashboardData = JSON.parse(readFileSync(source, 'utf8'));
      const methodologyVersion = dashboardData?.meta?.methodologyVersion;
      if (typeof methodologyVersion !== 'string' || !methodologyVersion.trim()) {
        throw new Error('dashboard aggregate methodologyVersion is missing or empty');
      }
      const target = resolve('dist/data');
      mkdirSync(target, { recursive: true });
      cpSync(source, resolve(target, 'dashboard_data.json'));
      writeFileSync(resolve('dist/build-info.json'), JSON.stringify({
        status: 'production',
        build: process.env.GITHUB_SHA ?? process.env.VITE_BUILD_SHA ?? `local-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        app: 'tenant-mix-react',
        methodologyVersion,
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
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
