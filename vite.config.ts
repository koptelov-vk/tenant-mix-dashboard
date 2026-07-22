import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const requiredMetadata = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is missing or empty`);
  }
  return value.trim();
};

function copyDashboardData(): Plugin {
  return {
    name: 'copy-dashboard-data',
    closeBundle() {
      const source = resolve('data/aggregates/dashboard_data.json');
      const dashboardData = JSON.parse(readFileSync(source, 'utf8'));
      const methodologyVersion = requiredMetadata(
        dashboardData?.meta?.methodologyVersion,
        'dashboard aggregate methodologyVersion',
      );

      const classifierMetadata = JSON.parse(readFileSync(resolve('config/classifier.json'), 'utf8'));
      const classifierVersion = requiredMetadata(
        classifierMetadata?.classifierVersion,
        'config/classifier.json classifierVersion',
      );
      const githubRunId = process.env.GITHUB_RUN_ID?.trim();
      const deploymentId = requiredMetadata(
        githubRunId || (process.env.GITHUB_SHA ? '' : 'local'),
        'deploymentId',
      );
      if (process.env.GITHUB_SHA && deploymentId === 'local') {
        throw new Error('deploymentId "local" is forbidden when GITHUB_SHA is present');
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
        classifierVersion,
        deploymentId,
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
