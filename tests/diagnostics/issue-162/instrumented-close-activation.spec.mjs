import { test, expect } from '@playwright/test';

// Temporary diagnostic spec for Issue #162. Reproduces the exact same user
// scenario as tests/react/ux-tooltip-01-overlay-controller.spec.mjs:162
// ("quality disclosure close-button keyboard activation restores focus to
// trigger") with additional test-side-only event/DOM instrumentation
// installed via page.addInitScript. Does not modify application code, does
// not call .click() programmatically, does not preventDefault/stopPropagation
// on any observed event, and does not alter the original test in any way —
// the original spec continues to run unchanged and separately in the same CI
// cycle. This file exists solely to answer: at which point in the
// focus -> keydown -> keyup -> native click -> React onClick -> overlay.close
// -> DOM removal -> focus-restoration chain does a failing run diverge from a
// passing run.

const quality = (page) => page.locator('.category-profile-quality-trigger').first();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__diag = { events: [], mutations: [] };

    function describe(el) {
      if (!el || el.nodeType !== 1) return null;
      return {
        tag: el.tagName,
        id: el.id || null,
        className: typeof el.className === 'string' ? el.className : null,
        role: el.getAttribute ? el.getAttribute('role') : null,
        ariaLabel: el.getAttribute ? el.getAttribute('aria-label') : null,
        ariaExpanded: el.getAttribute ? el.getAttribute('aria-expanded') : null,
      };
    }

    ['keydown', 'keyup', 'click', 'focus', 'focusin', 'focusout'].forEach((type) => {
      document.addEventListener(type, (e) => {
        window.__diag.events.push({
          t: performance.now(),
          type: e.type,
          key: e.key ?? null,
          code: e.code ?? null,
          repeat: e.repeat ?? null,
          isTrusted: e.isTrusted,
          defaultPrevented: e.defaultPrevented,
          eventPhase: e.eventPhase,
          target: describe(e.target),
          activeElementAtDispatch: describe(document.activeElement),
        });
      }, true); // capture phase; never calls preventDefault/stopPropagation
    });

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        const isDialogNode = (n) => n.nodeType === 1 && (n.matches?.('[role="dialog"]') || n.querySelector?.('[role="dialog"]'));
        const addedDialog = Array.from(r.addedNodes).some(isDialogNode);
        const removedDialog = Array.from(r.removedNodes).some(isDialogNode);
        const attrRelevant = r.type === 'attributes' && r.target.nodeType === 1
          && (r.target.matches?.('[role="dialog"]') || r.target.matches?.('.category-profile-quality-trigger'));
        if (addedDialog || removedDialog || attrRelevant) {
          window.__diag.mutations.push({
            t: performance.now(),
            type: r.type,
            target: describe(r.target),
            addedDialog,
            removedDialog,
            attributeName: r.attributeName || null,
          });
        }
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded', 'class', 'style', 'aria-hidden'],
    });
  });
  await page.goto('?focus=Фантастика&tab=overview');
});

test('quality disclosure close-button keyboard activation — instrumented event-chain diagnostic', async ({ page }, testInfo) => {
  const consoleMessages = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMessages.push({ t: Date.now(), type: m.type(), text: m.text() }); });
  page.on('pageerror', (e) => pageErrors.push({ t: Date.now(), message: e.message }));
  page.on('requestfailed', (r) => requestFailures.push({ t: Date.now(), url: r.url(), failure: r.failure()?.errorText ?? null }));

  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTrigger = quality(page);

  await activate(qualityTrigger);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();

  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });

  const preFocusState = await page.evaluate(() => ({
    activeElementTag: document.activeElement?.tagName ?? null,
    dialogPresent: !!document.querySelector('[role="dialog"]'),
  }));

  await closeButton.focus();

  const closeButtonIsActive = await closeButton.evaluate((el) => document.activeElement === el);

  await page.evaluate(() => { window.__diag.checkpoints = window.__diag.checkpoints || {}; window.__diag.checkpoints.postFocusT = performance.now(); });

  await page.keyboard.press('Enter');

  await page.evaluate(() => { window.__diag.checkpoints = window.__diag.checkpoints || {}; window.__diag.checkpoints.postEnterT = performance.now(); });

  // Mirror the original test's own timeout budget (config default timeout is
  // 40s per test; the original assertion polls up to 5s). This waits up to
  // 5s for the dialog to leave the DOM/become hidden without asserting on it
  // yet, purely so the instrumentation has the same observation window as
  // the original failing/passing runs before we snapshot final state.
  let dialogWentHidden = true;
  try {
    await expect(dialog).toBeHidden({ timeout: 5000 });
  } catch {
    dialogWentHidden = false;
  }

  const finalState = await page.evaluate(() => ({
    dialogPresent: !!document.querySelector('[role="dialog"]'),
    dialogVisible: (() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return false;
      const style = window.getComputedStyle(d);
      return style.display !== 'none' && style.visibility !== 'hidden' && d.offsetParent !== null;
    })(),
    triggerAriaExpanded: document.querySelector('.category-profile-quality-trigger')?.getAttribute('aria-expanded') ?? null,
    activeElementTag: document.activeElement?.tagName ?? null,
    activeElementClass: typeof document.activeElement?.className === 'string' ? document.activeElement.className : null,
  }));

  const focusReturnedToTrigger = await qualityTrigger.evaluate((el) => document.activeElement === el);

  const diag = await page.evaluate(() => window.__diag);

  await testInfo.attach('event-chain.json', { body: JSON.stringify({
    preFocusState,
    closeButtonIsActive,
    dialogWentHidden,
    finalState,
    focusReturnedToTrigger,
    events: diag.events,
    mutations: diag.mutations,
    checkpoints: diag.checkpoints,
    consoleMessages,
    pageErrors,
    requestFailures,
  }, null, 2), contentType: 'application/json' });

  await page.screenshot({ path: testInfo.outputPath('final-state.png'), fullPage: false });

  // Same production contract as the original test — this diagnostic also
  // yields a genuine PASS/FAIL of its own, without weakening or replacing it.
  await expect(dialog).toBeHidden();
  await expect(qualityTrigger).toBeFocused();
});
