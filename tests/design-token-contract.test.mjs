import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const run = (script, args = []) => spawnSync(
  process.execPath,
  [resolve(root, script), ...args],
  { cwd: root, encoding: 'utf8' },
);

test('generated tokens.css is byte-identical to canonical JSON output', () => {
  const result = run('scripts/generate-design-tokens.mjs', ['--check']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /DESIGN_TOKEN_GENERATION_IDEMPOTENT/);
});

test('product token validation passes and its report is deterministic', () => {
  const first = run('scripts/validate-design-tokens.mjs');
  const second = run('scripts/validate-design-tokens.mjs');

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.equal(first.stdout, second.stdout);
  assert.equal(first.stderr, second.stderr);
  assert.match(first.stdout, /307 validated \+ 3 excluded \+ 30 decorative-exempt \+ 27 informational = 367/);
});

test('negative control rejects an undefined product CSS variable', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'tenant-mix-token-negative-'));
  try {
    writeFileSync(resolve(directory, 'negative.css'), '.negative-control { color: var(--undefined-negative-control); }\n');
    const result = run('scripts/validate-design-tokens.mjs', ['--src', directory]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /undefined-var: .*var\(--undefined-negative-control\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('token contract changes require the browser QA matrix', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/pr-quality.yml'), 'utf8');
  const browserFilter = workflow.match(/\n            browser:\r?\n([\s\S]*?)\n            performance:/)?.[1];

  assert.ok(browserFilter, 'browser paths-filter block is missing');
  for (const path of [
    'design-system/tokens/**',
    'scripts/generate-design-tokens.mjs',
    'scripts/validate-design-tokens.mjs',
    'tests/design-token-contract.test.mjs',
  ]) {
    assert.ok(browserFilter.includes(`- '${path}'`), `${path} must trigger browser QA`);
  }
});
