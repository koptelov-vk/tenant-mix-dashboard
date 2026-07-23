import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const APP_ID = 'tenant-mix-react';
export const DATA_VERSION_PATTERN = /^sha256-[a-f0-9]{64}$/;
export const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export const SNAPSHOT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is missing or empty`);
  }
  return value.trim();
};

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
};

export const validateAppVersion = (value) => {
  const version = requiredString(value, 'appVersion');
  if (!SEMVER_PATTERN.test(version)) throw new Error(`appVersion is not valid SemVer: ${version}`);
  return version;
};

export const validateDataVersion = (value) => {
  const version = requiredString(value, 'dataVersion');
  if (!DATA_VERSION_PATTERN.test(version)) {
    throw new Error(`dataVersion must match sha256-<64 lowercase hex characters>: ${version}`);
  }
  return version;
};

export const validateSnapshotDate = (value) => {
  const snapshotDate = requiredString(value, 'dataSnapshotAt');
  if (!SNAPSHOT_DATE_PATTERN.test(snapshotDate)) {
    throw new Error(`dataSnapshotAt must use YYYY-MM-DD: ${snapshotDate}`);
  }
  const parsed = new Date(`${snapshotDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== snapshotDate) {
    throw new Error(`dataSnapshotAt is not a valid calendar date: ${snapshotDate}`);
  }
  return snapshotDate;
};

export const dataVersionFor = (dashboardDataBytes) => (
  `sha256-${createHash('sha256').update(dashboardDataBytes).digest('hex')}`
);

export const loadCanonicalBuildMetadata = (root = '.') => {
  const packageMetadata = readJson(resolve(root, 'package.json'), 'package.json');
  const dashboardDataPath = resolve(root, 'data/aggregates/dashboard_data.json');
  const dashboardDataBytes = readFileSync(dashboardDataPath);
  const dashboardData = readJson(dashboardDataPath, 'dashboard aggregate');
  const classifierMetadata = readJson(resolve(root, 'config/classifier.json'), 'classifier metadata');

  return {
    appVersion: validateAppVersion(packageMetadata?.version),
    dataVersion: validateDataVersion(dataVersionFor(dashboardDataBytes)),
    dataSnapshotAt: validateSnapshotDate(dashboardData?.meta?.snapshotDate),
    methodologyVersion: requiredString(
      dashboardData?.meta?.methodologyVersion,
      'dashboard aggregate methodologyVersion',
    ),
    classifierVersion: requiredString(
      classifierMetadata?.classifierVersion,
      'config/classifier.json classifierVersion',
    ),
    dashboardDataBytes,
  };
};

export const createBuildInfo = ({
  root = '.',
  env = process.env,
  generatedAt = new Date().toISOString(),
  metadata = loadCanonicalBuildMetadata(root),
} = {}) => {
  const githubSha = env.GITHUB_SHA?.trim();
  const githubRunId = env.GITHUB_RUN_ID?.trim();
  const deploymentId = requiredString(
    githubRunId || (githubSha ? '' : 'local'),
    'deploymentId',
  );
  if (githubSha && deploymentId === 'local') {
    throw new Error('deploymentId "local" is forbidden when GITHUB_SHA is present');
  }

  const generatedAtValue = requiredString(generatedAt, 'generatedAt');
  if (Number.isNaN(Date.parse(generatedAtValue))) {
    throw new Error(`generatedAt is not a valid date-time: ${generatedAtValue}`);
  }

  return {
    status: 'production',
    build: requiredString(githubSha ?? env.VITE_BUILD_SHA ?? `local-${Date.now()}`, 'build'),
    generatedAt: generatedAtValue,
    app: APP_ID,
    appVersion: metadata.appVersion,
    dataVersion: metadata.dataVersion,
    dataSnapshotAt: metadata.dataSnapshotAt,
    methodologyVersion: metadata.methodologyVersion,
    classifierVersion: metadata.classifierVersion,
    deploymentId,
  };
};
