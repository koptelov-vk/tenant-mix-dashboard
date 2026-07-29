import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createBuildInfo, loadCanonicalBuildMetadata } from './scripts/build-info-contract.mjs';

function copyDashboardData(): Plugin {
  return {
    name: 'copy-dashboard-data',
    closeBundle() {
      const metadata = loadCanonicalBuildMetadata();

      const target = resolve('dist/data');
      mkdirSync(target, { recursive: true });
      writeFileSync(resolve(target, 'dashboard_data.json'), metadata.dashboardDataBytes);
      writeFileSync(resolve('dist/build-info.json'), JSON.stringify(createBuildInfo({ metadata })));
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
