import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const utils = readFileSync(new URL('../src/lib/utils.ts', import.meta.url), 'utf8');
const potentialBrands = readFileSync(new URL('../src/components/dashboard/PotentialBrands.tsx', import.meta.url), 'utf8');

test('shared Russian pluralization covers object count edge cases', () => {
  assert.match(utils, /lastTwo >= 11 && lastTwo <= 14/);
  assert.match(utils, /last === 1/);
  assert.match(utils, /last >= 2 && last <= 4/);
});

test('potential brands uses existing formatCountRu and no hardcoded numeric objects form', () => {
  assert.match(potentialBrands, /formatCountRu\(item\.mallCount, objectForms\)/);
  assert.doesNotMatch(potentialBrands, /\{item\.mallCount\} объектов/);
  assert.doesNotMatch(potentialBrands, /function plural|const plural/);
});

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

test('production React consumers do not join a dynamic count to hardcoded "объектов"', () => {
  const offenders = sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))
    .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
    .flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return source.match(/(?:\$\{[^}\r\n]+\}|\{[^}\r\n]+\})\s+объектов/g)?.map((match) => ({ path, match })) ?? [];
    });

  assert.deepEqual(offenders, []);
});
