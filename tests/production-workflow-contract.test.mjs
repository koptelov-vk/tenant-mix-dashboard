import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateProductionWorkflowContract } from '../scripts/validate_production_workflow.mjs';

const sourceRootUrl = new URL('..', import.meta.url);
const sourceRoot = fileURLToPath(sourceRootUrl);

const withFixture = (mutation, assertion) => {
  const root = mkdtempSync(join(tmpdir(), 'tenant-production-workflow-'));
  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(
      join(root, '.github', 'workflows', 'pages.yml'),
      readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
    );
    writeFileSync(
      join(root, 'scripts', 'validate_production_artifact.mjs'),
      readFileSync(new URL('../scripts/validate_production_artifact.mjs', import.meta.url)),
    );
    mutation?.(root);
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('repository has one success-gated Pages publisher', () => {
  assert.deepEqual(validateProductionWorkflowContract(sourceRoot), []);
});

test('negative path rejects deploy without successful quality dependency', () => {
  withFixture((root) => {
    const path = join(root, '.github', 'workflows', 'pages.yml');
    const workflow = readFileSync(path, 'utf8')
      .replace('    needs: quality\n', '')
      .replace("    if: needs.quality.result == 'success'\n", '');
    writeFileSync(path, workflow);
  }, (root) => {
    const errors = validateProductionWorkflowContract(root);
    assert.ok(errors.includes('deploy must depend on quality'));
    assert.ok(errors.includes('deploy must run only when quality succeeds'));
  });
});

test('negative path rejects a second Pages publisher', () => {
  withFixture((root) => {
    writeFileSync(
      join(root, '.github', 'workflows', 'parallel-pages.yml'),
      "name: parallel\njobs:\n  deploy:\n    steps:\n      - uses: actions/deploy-pages@v4\n",
    );
  }, (root) => {
    const errors = validateProductionWorkflowContract(root);
    assert.ok(errors.some((error) => error.includes('expected exactly one deploy-pages publisher')));
  });
});

test('negative path rejects a repository-root Pages artifact', () => {
  withFixture((root) => {
    const path = join(root, '.github', 'workflows', 'pages.yml');
    const workflow = readFileSync(path, 'utf8')
      .replace('          path: dist\n      - name: Deploy verified dashboard once', '          path: .\n      - name: Deploy verified dashboard once');
    writeFileSync(path, workflow);
  }, (root) => {
    const errors = validateProductionWorkflowContract(root);
    assert.ok(errors.includes('deploy must upload dist as the Pages artifact root'));
  });
});
