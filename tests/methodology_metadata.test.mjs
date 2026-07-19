import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const source = JSON.parse(fs.readFileSync('config/methodology.json', 'utf8'));
const validator = path.resolve('scripts/validate_production_artifact.mjs');

const makeArtifact = ({ buildVersion = source.methodologyVersion, aggregateVersion = source.methodologyVersion } = {}) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-mix-methodology-'));
  fs.mkdirSync(path.join(cwd, 'dist', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'dist', 'data'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'dist', 'index.html'), '<script src="/tenant-mix-dashboard/assets/app.js"></script>');
  fs.writeFileSync(path.join(cwd, 'dist', 'build-info.json'), JSON.stringify({
    status: 'production', build: 'test-sha', generatedAt: '2026-07-19T00:00:00.000Z', app: 'tenant-mix-react',
    ...(buildVersion === undefined ? {} : { methodologyVersion: buildVersion }),
  }));
  fs.writeFileSync(path.join(cwd, 'dist', 'data', 'dashboard_data.json'), JSON.stringify({
    meta: aggregateVersion === undefined ? {} : { methodologyVersion: aggregateVersion },
  }));
  return cwd;
};

const validate = (options) => {
  const cwd = makeArtifact(options);
  const result = spawnSync(process.execPath, [validator], { cwd, encoding: 'utf8' });
  fs.rmSync(cwd, { recursive: true, force: true });
  return result;
};

test('methodology version source uses a stable contract id', () => {
  assert.match(source.methodologyVersion, /^[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/);
  const builder = fs.readFileSync('scripts/build_dashboard_data.py', 'utf8');
  const vite = fs.readFileSync('vite.config.ts', 'utf8');
  assert.ok(builder.includes('config" / "methodology.json'));
  assert.ok(vite.includes('dashboardData?.meta?.methodologyVersion'));
  assert.equal((builder.match(/tenant-mix-active-only-v1/g) || []).length, 0);
  assert.equal((vite.match(/tenant-mix-active-only-v1/g) || []).length, 0);
});

test('artifact validator accepts matching methodology metadata', () => {
  assert.equal(validate().status, 0);
});

test('artifact validator rejects missing methodology metadata', () => {
  assert.notEqual(validate({ buildVersion: undefined }).status, 0);
  assert.notEqual(validate({ aggregateVersion: undefined }).status, 0);
});

test('artifact validator rejects empty methodology metadata', () => {
  assert.notEqual(validate({ buildVersion: '' }).status, 0);
  assert.notEqual(validate({ aggregateVersion: '' }).status, 0);
});

test('artifact validator rejects methodology metadata mismatch', () => {
  assert.notEqual(validate({ aggregateVersion: 'tenant-mix-active-only-v2' }).status, 0);
});
