import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const requiredArtifactFiles = ['index.html', 'build-info.json', 'data/dashboard_data.json'];

const count = (source, pattern) => [...source.matchAll(pattern)].length;

export const validateProductionWorkflowContract = (root = '.') => {
  const errors = [];
  const workflowsDir = join(root, '.github', 'workflows');
  const pagesPath = join(workflowsDir, 'pages.yml');
  const artifactValidatorPath = join(root, 'scripts', 'validate_production_artifact.mjs');

  if (!existsSync(workflowsDir)) return ['.github/workflows does not exist'];
  if (!existsSync(pagesPath)) return ['canonical .github/workflows/pages.yml is missing'];
  if (!existsSync(artifactValidatorPath)) {
    return ['scripts/validate_production_artifact.mjs is missing'];
  }

  const workflowFiles = readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => ({
      name,
      source: readFileSync(join(workflowsDir, name), 'utf8'),
    }));
  const pages = readFileSync(pagesPath, 'utf8');
  const artifactValidator = readFileSync(artifactValidatorPath, 'utf8');

  const deployPagesUses = workflowFiles.flatMap(({ name, source }) => (
    [...source.matchAll(/uses:\s*actions\/deploy-pages@[^ \r\n]+/g)]
      .map((match) => `${name}:${match[0]}`)
  ));
  if (deployPagesUses.length !== 1 || !deployPagesUses[0].startsWith('pages.yml:')) {
    errors.push(`expected exactly one deploy-pages publisher in pages.yml, found ${deployPagesUses.join(', ') || 'none'}`);
  }

  const uploadPagesUses = workflowFiles.flatMap(({ name, source }) => (
    [...source.matchAll(/uses:\s*actions\/upload-pages-artifact@[^ \r\n]+/g)]
      .map((match) => `${name}:${match[0]}`)
  ));
  if (uploadPagesUses.length !== 1 || !uploadPagesUses[0].startsWith('pages.yml:')) {
    errors.push(`expected exactly one upload-pages-artifact in pages.yml, found ${uploadPagesUses.join(', ') || 'none'}`);
  }

  if (!/push:\s*\r?\n\s+branches:\s*\[main\]/.test(pages)) {
    errors.push('canonical workflow must be triggered by push to main');
  }
  if (!/group:\s*pages-\$\{\{\s*github\.ref\s*\}\}/.test(pages)) {
    errors.push('canonical workflow must serialize Pages runs by ref');
  }
  if (!/cancel-in-progress:\s*true/.test(pages)) {
    errors.push('canonical workflow must cancel an older in-progress run for the same ref');
  }

  const qualityStart = pages.indexOf('\n  quality:');
  const deployStart = pages.indexOf('\n  deploy:');
  if (qualityStart < 0 || deployStart < 0 || deployStart <= qualityStart) {
    errors.push('canonical workflow must define quality before deploy');
  } else {
    const quality = pages.slice(qualityStart, deployStart);
    const deploy = pages.slice(deployStart);
    if (!/\n\s+needs:\s*quality\s*(?:\r?\n|$)/.test(deploy)) {
      errors.push('deploy must depend on quality');
    }
    if (!/\n\s+if:\s*needs\.quality\.result\s*==\s*'success'\s*(?:\r?\n|$)/.test(deploy)) {
      errors.push('deploy must run only when quality succeeds');
    }
    if (!/name:\s*production-dist[\s\S]*path:\s*dist\//.test(quality)) {
      errors.push('quality must preserve the verified dist artifact as production-dist');
    }
    if (!/name:\s*production-dist[\s\S]*path:\s*dist(?:\r?\n|$)/.test(deploy)) {
      errors.push('deploy must download production-dist into dist');
    }
    if (!/run:\s*pnpm validate:artifact/.test(deploy)) {
      errors.push('deploy must revalidate the downloaded production artifact');
    }
    if (!/uses:\s*actions\/upload-pages-artifact@[^\r\n]+[\s\S]*path:\s*dist(?:\r?\n|$)/.test(deploy)) {
      errors.push('deploy must upload dist as the Pages artifact root');
    }
    if (count(quality, /actions\/deploy-pages@/g) !== 0) {
      errors.push('quality must never publish Pages');
    }
  }

  for (const file of requiredArtifactFiles) {
    if (!artifactValidator.includes(`'${file}'`)) {
      errors.push(`artifact validator must require ${file}`);
    }
  }
  if (!/forbidden legacy or transitional file/.test(artifactValidator)) {
    errors.push('artifact validator must reject legacy and transitional files');
  }
  if (!/buildInfo\.build !== process\.env\.GITHUB_SHA/.test(artifactValidator)) {
    errors.push('artifact validator must bind build-info.build to GITHUB_SHA');
  }
  if (!/buildInfo\.deploymentId !== process\.env\.GITHUB_RUN_ID/.test(artifactValidator)) {
    errors.push('artifact validator must bind deploymentId to GITHUB_RUN_ID');
  }

  return errors;
};

const isCli = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const errors = validateProductionWorkflowContract(process.env.PRODUCTION_WORKFLOW_ROOT || '.');
  if (errors.length) {
    for (const error of errors) console.error(`Production workflow contract failed: ${error}`);
    process.exit(1);
  }
  console.log('Production workflow contract validated: one gated Pages publisher and one verified artifact path.');
}
