import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('maintenance shell polls an uncached production marker and uses visual viewport', async () => {
  const html = await read('deploy/maintenance/index.html');
  assert.match(html, /visualViewport/);
  assert.match(html, /build-info\.json\?t=/);
  assert.match(html, /cache:\s*'no-store'/);
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
});

test('React production build publishes a build marker and clears dist', async () => {
  const config = await read('vite.config.ts');
  assert.match(config, /build-info\.json/);
  assert.match(config, /status:\s*'production'/);
  assert.match(config, /emptyOutDir:\s*true/);
});

test('legacy builder cannot overwrite production dist or root index', async () => {
  const builder = await read('scripts/build_dashboard_v2.py');
  assert.match(builder, /LEGACY_DIST = ROOT \/ "dist-legacy"/);
  assert.doesNotMatch(builder, /DIST = ROOT \/ "dist"/);
  assert.doesNotMatch(builder, /ROOT \/ "index\.html"/);
});
