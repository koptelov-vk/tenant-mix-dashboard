import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = 'dist';
const fail = (message) => {
  console.error(`Artifact validation failed: ${message}`);
  process.exitCode = 1;
};

if (!existsSync(root) || !statSync(root).isDirectory()) {
  fail('dist/ does not exist');
  process.exit(1);
}

const walk = (directory) => readdirSync(directory).flatMap((name) => {
  const absolute = join(directory, name);
  return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
});

const files = walk(root).map((file) => relative(root, file).split(sep).join('/')).sort();
for (const file of ['index.html', 'build-info.json', 'data/dashboard_data.json']) {
  if (!files.includes(file)) fail(`required file is missing: ${file}`);
}

const htmlFiles = files.filter((file) => file.toLowerCase().endsWith('.html'));
if (htmlFiles.length !== 1 || htmlFiles[0] !== 'index.html') {
  fail(`artifact must contain exactly one HTML entrypoint (index.html); found: ${htmlFiles.join(', ') || 'none'}`);
}

const forbiddenName = /(^|\/)(maintenance|backup|rollback|legacy|old)([-_.\/]|$)|index-react\.html$|service-worker\.js$|(^|\/)sw\.js$|precache-manifest/i;
for (const file of files) if (forbiddenName.test(file)) fail(`forbidden legacy or transitional file found: ${file}`);

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (index.includes('/src/main.tsx')) fail('index.html still references the development source entrypoint');
if (index.includes('index-react.html')) fail('index.html references the removed legacy entrypoint');
if (!index.includes('/tenant-mix-dashboard/assets/')) fail('index.html does not reference the production asset path');

const parseJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
};
const buildInfo = parseJson(join(root, 'build-info.json'), 'build-info.json');
const dashboardData = parseJson(join(root, 'data/dashboard_data.json'), 'dashboard_data.json');

if (buildInfo) {
  if (buildInfo.status !== 'production') fail(`build-info status must be production, got ${buildInfo.status}`);
  if (buildInfo.app !== 'tenant-mix-react') fail(`unexpected app id in build-info: ${buildInfo.app}`);
  if (!buildInfo.build) fail('build-info build SHA is missing');
  if (!buildInfo.generatedAt || Number.isNaN(Date.parse(buildInfo.generatedAt))) fail('build-info generatedAt is missing or invalid');
  if (typeof buildInfo.methodologyVersion !== 'string' || !buildInfo.methodologyVersion.trim()) fail('build-info methodologyVersion is missing or empty');
  if (process.env.GITHUB_SHA && buildInfo.build !== process.env.GITHUB_SHA) {
    fail(`build-info SHA ${buildInfo.build} does not match GITHUB_SHA ${process.env.GITHUB_SHA}`);
  }
}

const aggregateVersion = dashboardData?.meta?.methodologyVersion;
if (typeof aggregateVersion !== 'string' || !aggregateVersion.trim()) fail('aggregate methodologyVersion is missing or empty');
if (buildInfo?.methodologyVersion && aggregateVersion && buildInfo.methodologyVersion !== aggregateVersion) {
  fail(`methodologyVersion mismatch: build-info=${buildInfo.methodologyVersion}, aggregate=${aggregateVersion}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Production artifact validated: ${files.length} files, one canonical index, build ${buildInfo.build}, methodology ${buildInfo.methodologyVersion}`);
