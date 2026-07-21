import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../src/components/ui/OverlayController.tsx', import.meta.url), 'utf8');
const inventory = readFileSync(new URL('../docs/ux-tooltip-01-inventory.md', import.meta.url), 'utf8');

test('overlay controller exposes one active id and atomic open/toggle/close operations', () => {
  assert.match(controller, /activeId: string \| null/);
  assert.match(controller, /previous\.onDismiss\('handoff'\)/);
  assert.match(controller, /active\.current\?\.id === registration\.id/);
  assert.match(controller, /restoreFocus/);
  assert.match(controller, /document\.addEventListener\('pointerdown'/);
  assert.match(controller, /document\.addEventListener\('keydown'/);
  assert.match(controller, /OVERLAY_PDF_EXCLUSION_ATTRIBUTE/);
});

test('inventory covers required handoff and device contracts', () => {
  for (const phrase of ['quality → calculation', 'calculation → quality', 'calculation A → calculation B', 'outside tap', 'iPhone Safari', 'Android Chrome', 'PDF-exclusion']) {
    assert.match(inventory, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
