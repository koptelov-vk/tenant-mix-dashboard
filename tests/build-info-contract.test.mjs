import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const validator = join(repositoryRoot, 'scripts', 'validate_production_artifact.mjs');
const schema = JSON.parse(readFileSync(join(repositoryRoot, 'config', 'build-info.schema.json'), 'utf8'));
const classifier = JSON.parse(readFileSync(join(repositoryRoot, 'config', 'classifier.json'), 'utf8'));
const build = '0123456789abcdef0123456789abcdef01234567';
const deploymentId = '29871238075';

const createFixture = (overrides = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'tenant-build-info-'));
  mkdirSync(join(root, 'dist', 'data'), { recursive: true });
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'build-info.schema.json'), JSON.stringify(schema));
  writeFileSync(join(root, 'config', 'classifier.json'), JSON.stringify(classifier));
  writeFileSync(
    join(root, 'dist', 'index.html'),
    '<script type="module" src="/tenant-mix-dashboard/assets/index-test.js"></script>',
  );
  writeFileSync(
    join(root, 'dist', 'data', 'dashboard_data.json'),
    JSON.stringify({ meta: { methodologyVersion: 'tenant-mix-active-only-v1' } }),
  );
  writeFileSync(
    join(root, 'dist', 'build-info.json'),
    JSON.stringify({
      status: 'production',
      build,
      generatedAt: '2026-07-21T21:47:29.701Z',
      app: 'tenant-mix-react',
      methodologyVersion: 'tenant-mix-active-only-v1',
      classifierVersion: classifier.classifierVersion,
      deploymentId,
      ...overrides,
    }),
  );
  return root;
};

const validate = (root) => spawnSync(process.execPath, [validator], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, GITHUB_SHA: build, DEPLOYMENT_ID: deploymentId },
});

test('accepts complete canonical production build metadata', () => {
  const root = createFixture();
  try {
    const result = validate(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /classifier tenant-mix-classifier-v1/);
    assert.match(result.stdout, /deployment 29871238075/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when classifierVersion is empty', () => {
  const root = createFixture({ classifierVersion: '' });
  try {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /classifierVersion is missing or empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when deploymentId is empty', () => {
  const root = createFixture({ deploymentId: '' });
  try {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deploymentId is missing or empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when artifact classifierVersion differs from canonical source', () => {
  const root = createFixture({ classifierVersion: 'other-classifier-v1' });
  try {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /classifierVersion mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when artifact deploymentId differs from workflow source', () => {
  const root = createFixture({ deploymentId: 'different-run' });
  try {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deploymentId .* does not match DEPLOYMENT_ID/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
