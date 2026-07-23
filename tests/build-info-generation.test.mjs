import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error('npm_execpath is required for build-info generation integration tests');
const ciSha = '0123456789abcdef0123456789abcdef01234567';
const ciRunId = '29871238075';
const canonicalSnapshotDate = '2026-07-16';

const copyRepository = () => {
  const root = mkdtempSync(join(tmpdir(), 'tenant-build-generation-'));
  cpSync(repositoryRoot, root, {
    recursive: true,
    filter: (source) => !['.git', 'node_modules', 'dist'].includes(basename(source)),
  });
  const sourceNodeModules = join(repositoryRoot, 'node_modules');
  if (!existsSync(sourceNodeModules)) throw new Error('node_modules is required for build-info generation integration tests');
  symlinkSync(sourceNodeModules, join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const methodology = JSON.parse(readFileSync(join(root, 'config', 'methodology.json'), 'utf8'));
  const dashboardDataPath = join(root, 'data', 'aggregates', 'dashboard_data.json');
  const dashboardData = JSON.parse(readFileSync(dashboardDataPath, 'utf8'));
  dashboardData.meta = { ...dashboardData.meta, methodologyVersion: methodology.methodologyVersion };
  writeFileSync(dashboardDataPath, JSON.stringify(dashboardData));
  return root;
};

const buildArtifact = (root, envOverrides = {}) => {
  const env = { ...process.env };
  delete env.GITHUB_SHA;
  delete env.GITHUB_RUN_ID;
  delete env.VITE_DEPLOYMENT_ID;
  Object.assign(env, envOverrides);
  return spawnSync(process.execPath, [pnpmCli, 'build'], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
};

const readBuildInfo = (root) => JSON.parse(readFileSync(join(root, 'dist', 'build-info.json'), 'utf8'));

test('canonical local build emits classifierVersion and deploymentId=local', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    const result = buildArtifact(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const buildInfo = readBuildInfo(root);
    assert.equal(buildInfo.status, 'production');
    assert.equal(buildInfo.app, 'tenant-mix-react');
    assert.match(buildInfo.build, /^local-/);
    assert.ok(buildInfo.generatedAt);
    assert.equal(buildInfo.appVersion, '3.0.0-alpha.1');
    assert.match(buildInfo.dataVersion, /^sha256-[a-f0-9]{64}$/);
    assert.equal(buildInfo.dataSnapshotAt, canonicalSnapshotDate);
    assert.notEqual(buildInfo.dataSnapshotAt, buildInfo.generatedAt);
    assert.equal(buildInfo.methodologyVersion, 'tenant-mix-active-only-v1');
    assert.equal(buildInfo.classifierVersion, 'tenant-mix-classifier-v1');
    assert.equal(buildInfo.deploymentId, 'local');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('canonical CI build emits GITHUB_SHA and GITHUB_RUN_ID', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    const result = buildArtifact(root, { GITHUB_SHA: ciSha, GITHUB_RUN_ID: ciRunId });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const buildInfo = readBuildInfo(root);
    assert.equal(buildInfo.build, ciSha);
    assert.equal(buildInfo.appVersion, '3.0.0-alpha.1');
    assert.match(buildInfo.dataVersion, /^sha256-[a-f0-9]{64}$/);
    assert.equal(buildInfo.dataSnapshotAt, canonicalSnapshotDate);
    assert.equal(buildInfo.classifierVersion, 'tenant-mix-classifier-v1');
    assert.equal(buildInfo.deploymentId, ciRunId);
    assert.notEqual(buildInfo.deploymentId, 'local');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('canonical build fails when package version is invalid', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    const packagePath = join(root, 'package.json');
    const packageMetadata = JSON.parse(readFileSync(packagePath, 'utf8'));
    packageMetadata.version = 'current';
    writeFileSync(packagePath, JSON.stringify(packageMetadata));
    const result = buildArtifact(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /appVersion is not valid SemVer/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('canonical build fails when aggregate snapshot date is absent', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    const dashboardDataPath = join(root, 'data', 'aggregates', 'dashboard_data.json');
    const dashboardData = JSON.parse(readFileSync(dashboardDataPath, 'utf8'));
    delete dashboardData.meta.snapshotDate;
    writeFileSync(dashboardDataPath, JSON.stringify(dashboardData));
    const result = buildArtifact(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /dataSnapshotAt is missing or empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('canonical CI build rejects an empty GITHUB_RUN_ID', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    const result = buildArtifact(root, { GITHUB_SHA: ciSha, GITHUB_RUN_ID: '' });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /deploymentId is missing or empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('canonical build fails when config/classifier.json is absent', { timeout: 120_000 }, () => {
  const root = copyRepository();
  try {
    rmSync(join(root, 'config', 'classifier.json'));
    const result = buildArtifact(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /classifier\.json|ENOENT/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
