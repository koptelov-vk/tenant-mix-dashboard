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
const runId = '29871238075';

const createFixture = ({ buildInfoOverrides = {}, omitBuildInfoFields = [], classifierPayload = classifier } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'tenant-build-info-'));
  mkdirSync(join(root, 'dist', 'data'), { recursive: true });
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'build-info.schema.json'), JSON.stringify(schema));
  writeFileSync(join(root, 'config', 'classifier.json'), JSON.stringify(classifierPayload));
  writeFileSync(
    join(root, 'dist', 'index.html'),
    '<script type="module" src="/tenant-mix-dashboard/assets/index-test.js"></script>',
  );
  writeFileSync(
    join(root, 'dist', 'data', 'dashboard_data.json'),
    JSON.stringify({ meta: { methodologyVersion: 'tenant-mix-active-only-v1' } }),
  );
  const buildInfo = {
    status: 'production',
    build,
    generatedAt: '2026-07-21T21:47:29.701Z',
    app: 'tenant-mix-react',
    methodologyVersion: 'tenant-mix-active-only-v1',
    classifierVersion: classifier.classifierVersion,
    deploymentId: runId,
    ...buildInfoOverrides,
  };
  for (const field of omitBuildInfoFields) delete buildInfo[field];
  writeFileSync(join(root, 'dist', 'build-info.json'), JSON.stringify(buildInfo));
  return root;
};

const validate = (root, envOverrides = {}) => spawnSync(process.execPath, [validator], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_SHA: build,
    GITHUB_RUN_ID: runId,
    ...envOverrides,
  },
});

const withFixture = (options, assertion) => {
  const root = createFixture(options);
  try {
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('accepts complete canonical CI production build metadata', () => {
  withFixture({}, (root) => {
    const result = validate(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /classifier tenant-mix-classifier-v1/);
    assert.match(result.stdout, /deployment 29871238075/);
  });
});

test('accepts local deploymentId when CI SHA is absent', () => {
  withFixture({ buildInfoOverrides: { build: 'local-test', deploymentId: 'local' } }, (root) => {
    const result = validate(root, { GITHUB_SHA: '', GITHUB_RUN_ID: '' });
    assert.equal(result.status, 0, result.stderr);
  });
});

test('fails when classifierVersion is absent', () => {
  withFixture({ omitBuildInfoFields: ['classifierVersion'] }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /classifierVersion is missing or empty/);
  });
});

test('fails when classifierVersion is empty', () => {
  withFixture({ buildInfoOverrides: { classifierVersion: '' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /classifierVersion is missing or empty/);
  });
});

test('fails when canonical classifierVersion is absent', () => {
  withFixture({ classifierPayload: {} }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /config\/classifier\.json classifierVersion is missing or empty/);
  });
});

test('fails when canonical classifierVersion is empty', () => {
  withFixture({ classifierPayload: { classifierVersion: '' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /config\/classifier\.json classifierVersion is missing or empty/);
  });
});

test('fails when deploymentId is absent', () => {
  withFixture({ omitBuildInfoFields: ['deploymentId'] }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deploymentId is missing or empty/);
  });
});

test('fails when deploymentId is empty', () => {
  withFixture({ buildInfoOverrides: { deploymentId: '' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deploymentId is missing or empty/);
  });
});

test('fails when deploymentId is local in CI context', () => {
  withFixture({ buildInfoOverrides: { deploymentId: 'local' } }, (root) => {
    const result = validate(root, { GITHUB_RUN_ID: '' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deploymentId must not be local when GITHUB_SHA is set/);
  });
});

test('fails when artifact classifierVersion differs from canonical source', () => {
  withFixture({ buildInfoOverrides: { classifierVersion: 'other-classifier-v1' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /classifierVersion mismatch/);
  });
});

test('fails when artifact deploymentId differs from GITHUB_RUN_ID', () => {
  withFixture({ buildInfoOverrides: { deploymentId: 'different-run' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match GITHUB_RUN_ID/);
  });
});

test('fails when methodologyVersion differs from dashboard data', () => {
  withFixture({ buildInfoOverrides: { methodologyVersion: 'other-methodology-v1' } }, (root) => {
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /methodologyVersion mismatch/);
  });
});
