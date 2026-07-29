// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverlayControllerProvider, useControlledOverlay, useOverlayController } from './OverlayController';
import { Tooltip } from './Tooltip';

function Disclosure({ id, hidden = false, disabled = false, unmountTrigger = false }: {
  id: string;
  hidden?: boolean;
  disabled?: boolean;
  unmountTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [triggerMounted, setTriggerMounted] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlay = useControlledOverlay({ open, setOpen, triggerRef, contentRef });

  return <div>
    {triggerMounted ? (
      <button ref={triggerRef} data-testid={`trigger-${id}`} disabled={disabled} hidden={hidden} onClick={() => overlay.toggle()}>
        trigger-{id}
      </button>
    ) : null}
    {overlay.open ? (
      <div ref={contentRef} data-testid={`content-${id}`}>
        <button
          data-testid={`close-${id}`}
          onClick={() => {
            if (unmountTrigger) setTriggerMounted(false);
            overlay.close(true);
          }}
        >
          close-{id}
        </button>
      </div>
    ) : null}
  </div>;
}

function renderDisclosures(props: Partial<Parameters<typeof Disclosure>[0]>[] = [{ id: 'a' }, { id: 'b' }]) {
  return render(
    <OverlayControllerProvider>
      {props.map((p) => <Disclosure key={p.id} id={p.id as string} {...p} />)}
    </OverlayControllerProvider>,
  );
}

afterEach(() => { document.body.innerHTML = ''; });

describe('OverlayController close-button focus restoration', () => {
  it('returns focus to the exact trigger that opened it', () => {
    renderDisclosures();
    const triggerA = screen.getByTestId('trigger-a');
    act(() => { fireEvent.click(triggerA); });
    act(() => { fireEvent.click(screen.getByTestId('close-a')); });
    expect(document.activeElement).toBe(triggerA);
    expect(screen.queryByTestId('content-a')).toBeNull();
  });

  it('does not leave focus on <body> after close-button close', () => {
    renderDisclosures([{ id: 'a' }]);
    act(() => { fireEvent.click(screen.getByTestId('trigger-a')); });
    act(() => { fireEvent.click(screen.getByTestId('close-a')); });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('preserves the correct opener per trigger (A stays A, B stays B)', () => {
    renderDisclosures();
    const triggerA = screen.getByTestId('trigger-a');
    const triggerB = screen.getByTestId('trigger-b');

    act(() => { fireEvent.click(triggerA); });
    act(() => { fireEvent.click(screen.getByTestId('close-a')); });
    expect(document.activeElement).toBe(triggerA);

    act(() => { fireEvent.click(triggerB); });
    act(() => { fireEvent.click(screen.getByTestId('close-b')); });
    expect(document.activeElement).toBe(triggerB);
    expect(document.activeElement).not.toBe(triggerA);
  });

  it('repeated open/close cycles keep returning focus to the same trigger', () => {
    renderDisclosures([{ id: 'a' }]);
    const triggerA = screen.getByTestId('trigger-a');
    for (let cycle = 0; cycle < 3; cycle += 1) {
      act(() => { fireEvent.click(triggerA); });
      act(() => { fireEvent.click(screen.getByTestId('close-a')); });
      expect(document.activeElement).toBe(triggerA);
    }
  });

  it('safely no-ops when the opener was removed/disconnected before close', () => {
    renderDisclosures([{ id: 'a', unmountTrigger: true }]);
    act(() => { fireEvent.click(screen.getByTestId('trigger-a')); });
    expect(() => { act(() => { fireEvent.click(screen.getByTestId('close-a')); }); }).not.toThrow();
    expect(screen.queryByTestId('trigger-a')).toBeNull();
    expect(screen.queryByTestId('content-a')).toBeNull();
  });

  it('safely no-ops when the opener is disabled at close time', () => {
    renderDisclosures([{ id: 'a' }]);
    const triggerA = screen.getByTestId('trigger-a') as HTMLButtonElement;
    act(() => { fireEvent.click(triggerA); });
    triggerA.disabled = true;
    expect(() => { act(() => { fireEvent.click(screen.getByTestId('close-a')); }); }).not.toThrow();
    expect(screen.queryByTestId('content-a')).toBeNull();
  });

  it('safely no-ops when the opener is hidden at close time', () => {
    renderDisclosures([{ id: 'a' }]);
    const triggerA = screen.getByTestId('trigger-a');
    act(() => { fireEvent.click(triggerA); });
    triggerA.hidden = true;
    expect(() => { act(() => { fireEvent.click(screen.getByTestId('close-a')); }); }).not.toThrow();
    expect(screen.queryByTestId('content-a')).toBeNull();
  });

  it('enforces a single active overlay (opening B dismisses A as handoff)', () => {
    renderDisclosures();
    act(() => { fireEvent.click(screen.getByTestId('trigger-a')); });
    expect(screen.queryByTestId('content-a')).not.toBeNull();
    act(() => { fireEvent.click(screen.getByTestId('trigger-b')); });
    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(screen.queryByTestId('content-b')).not.toBeNull();
  });

  it('forward handoff (A open -> B open) does not force focus back to A', () => {
    renderDisclosures();
    const triggerA = screen.getByTestId('trigger-a');
    act(() => { fireEvent.click(triggerA); });
    act(() => { fireEvent.click(screen.getByTestId('trigger-b')); });
    expect(document.activeElement).not.toBe(triggerA);
  });

  it('reverse handoff (close B via its own close-button) returns focus to B, not A', () => {
    renderDisclosures();
    const triggerA = screen.getByTestId('trigger-a');
    const triggerB = screen.getByTestId('trigger-b');
    act(() => { fireEvent.click(triggerA); });
    act(() => { fireEvent.click(triggerB); });
    act(() => { fireEvent.click(screen.getByTestId('close-b')); });
    expect(document.activeElement).toBe(triggerB);
    expect(document.activeElement).not.toBe(triggerA);
  });

  it('Escape closes the active overlay and restores focus to its trigger', () => {
    renderDisclosures([{ id: 'a' }]);
    const triggerA = screen.getByTestId('trigger-a');
    act(() => { fireEvent.click(triggerA); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(document.activeElement).toBe(triggerA);
  });

  it('outside pointerdown closes the active overlay', () => {
    renderDisclosures([{ id: 'a' }]);
    act(() => { fireEvent.click(screen.getByTestId('trigger-a')); });
    act(() => { fireEvent.pointerDown(document.body); });
    expect(screen.queryByTestId('content-a')).toBeNull();
  });
});

// Test-only observable: the controller doesn't expose activeId outside its
// provider tree in production, so this probe renders it for direct assertion.
function ActiveIdProbe() {
  const { activeId } = useOverlayController();
  return <span data-testid="active-id-probe">{activeId ?? ''}</span>;
}

// Reproduces the exact vulnerable pattern from Tooltip.tsx: the trigger opens
// the overlay both on hover (pointerenter, does NOT focus) and on focus
// (onFocus, e.g. Tab navigation) — with no consumer-side guard of any kind.
// This intentionally has none of Tooltip's own suppressFocusOpen workaround,
// so a pass here proves the fix holds at the controller level regardless of
// what any individual consumer does.
function FocusOpenHarness({ id, onDismissCall }: { id: string; onDismissCall?: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlay = useControlledOverlay({
    open, setOpen, triggerRef, contentRef,
    onDismissReason: (reason) => onDismissCall?.(reason),
  });
  return <div>
    <button
      ref={triggerRef}
      data-testid={`trigger-${id}`}
      data-overlay-trigger
      onPointerEnter={() => overlay.openOverlay()}
      onFocus={() => overlay.openOverlay()}
    >
      trigger-{id}
    </button>
    {overlay.open ? <div ref={contentRef} data-testid={`content-${id}`} role="tooltip">content-{id}</div> : null}
  </div>;
}

describe('OverlayController reentrancy guard (focus-driven open, issue #156 second-review finding)', () => {
  it('BASE_REENTRANCY_FAIL/CORRECTIVE_HEAD_PASS: hover-open then Escape does not leave a stale active registration (Scenario A)', () => {
    const dismissA = vi.fn();
    render(
      <OverlayControllerProvider>
        <ActiveIdProbe />
        <FocusOpenHarness id="a" onDismissCall={dismissA} />
        <FocusOpenHarness id="b" />
      </OverlayControllerProvider>,
    );
    const triggerA = screen.getByTestId('trigger-a');

    // Hover-open: opens without focusing the trigger, exactly like real mouse hover.
    act(() => { fireEvent.pointerEnter(triggerA, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-a')).toBeTruthy();
    expect(document.activeElement).not.toBe(triggerA);
    expect(screen.getByTestId('active-id-probe').textContent).not.toBe('');

    // Escape closes it; close() synchronously focuses the opener, which fires
    // the trigger's own onFocus -> openOverlay() reentrantly on the unfixed code.
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });

    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(document.activeElement).toBe(triggerA);
    // The decisive assertion: no stale active registration left behind.
    expect(screen.getByTestId('active-id-probe').textContent).toBe('');
    expect(dismissA).toHaveBeenCalledTimes(1);

    // Next legitimate open of the SAME trigger must still work (not blocked forever).
    act(() => { fireEvent.pointerEnter(triggerA, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-a')).toBeTruthy();

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByTestId('content-a')).toBeNull();

    // A different, unrelated overlay must be able to open afterward, and must
    // not trigger a redundant/stale dismiss of A.
    const triggerB = screen.getByTestId('trigger-b');
    act(() => { fireEvent.pointerEnter(triggerB, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-b')).toBeTruthy();
    expect(dismissA).toHaveBeenCalledTimes(2); // exactly the two real closes above, no extra stale-triggered call
  });

  it('BASE_REENTRANCY_FAIL/CORRECTIVE_HEAD_PASS: hover-open then outside pointerdown does not leave a stale active registration (Scenario B)', () => {
    const dismissA = vi.fn();
    render(
      <OverlayControllerProvider>
        <ActiveIdProbe />
        <FocusOpenHarness id="a" onDismissCall={dismissA} />
        <FocusOpenHarness id="b" />
      </OverlayControllerProvider>,
    );
    const triggerA = screen.getByTestId('trigger-a');

    act(() => { fireEvent.pointerEnter(triggerA, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-a')).toBeTruthy();
    expect(document.activeElement).not.toBe(triggerA);

    act(() => { fireEvent.pointerDown(document.body); });

    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(document.activeElement).toBe(triggerA);
    expect(screen.getByTestId('active-id-probe').textContent).toBe('');
    expect(dismissA).toHaveBeenCalledTimes(1);

    const triggerB = screen.getByTestId('trigger-b');
    act(() => { fireEvent.pointerEnter(triggerB, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-b')).toBeTruthy();
    expect(dismissA).toHaveBeenCalledTimes(1); // unchanged — no stale-triggered redundant dismiss
  });

  it('forward handoff (hover-open A, then focus-open B) is not blocked by the reentrancy guard', () => {
    render(
      <OverlayControllerProvider>
        <ActiveIdProbe />
        <FocusOpenHarness id="a" />
        <FocusOpenHarness id="b" />
      </OverlayControllerProvider>,
    );
    const triggerA = screen.getByTestId('trigger-a');
    const triggerB = screen.getByTestId('trigger-b');

    act(() => { fireEvent.pointerEnter(triggerA, { pointerType: 'mouse' }); });
    expect(screen.getByTestId('content-a')).toBeTruthy();

    act(() => { fireEvent.focus(triggerB); });
    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(screen.getByTestId('content-b')).toBeTruthy();
    expect(screen.getByTestId('active-id-probe').textContent).not.toBe('');
  });

  it('the real Tooltip component: hover-open then Escape restores focus, closes cleanly, and can reopen', () => {
    render(
      <OverlayControllerProvider>
        <ActiveIdProbe />
        <Tooltip label="Formula details" accessibleLabel="Show formula" />
      </OverlayControllerProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Show formula' });
    const root = trigger.closest('span')!;

    act(() => { fireEvent.pointerEnter(root, { pointerType: 'mouse' }); });
    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(document.activeElement).not.toBe(trigger);

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByTestId('active-id-probe').textContent).toBe('');

    // A legitimate keyboard-focus open right after the close must work (this
    // is exactly the path a stuck consumer-side suppress-flag would break).
    act(() => { fireEvent.focus(trigger); });
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('hover-leave does not restore focus to the trigger (restoreFocus is explicitly false)', () => {
    function HoverLeaveHarness({ id }: { id: string }) {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);
      const contentRef = useRef<HTMLDivElement>(null);
      const overlay = useControlledOverlay({ open, setOpen, triggerRef, contentRef });
      return <div>
        <button ref={triggerRef} data-testid={`trigger-${id}`} onClick={() => overlay.openOverlay()}>trigger-{id}</button>
        <button data-testid={`leave-${id}`} onClick={() => overlay.close(false, 'hover-leave')}>leave-{id}</button>
        {overlay.open ? <div ref={contentRef} data-testid={`content-${id}`}>content-{id}</div> : null}
      </div>;
    }

    render(
      <OverlayControllerProvider>
        <HoverLeaveHarness id="a" />
      </OverlayControllerProvider>,
    );
    const triggerA = screen.getByTestId('trigger-a');
    act(() => { fireEvent.click(triggerA); });
    expect(screen.getByTestId('content-a')).toBeTruthy();

    act(() => { fireEvent.click(screen.getByTestId('leave-a')); });
    expect(screen.queryByTestId('content-a')).toBeNull();
    expect(document.activeElement).not.toBe(triggerA);
  });

  it('the close-in-flight guard clears even when onDismiss throws (error-safe path)', () => {
    let capturedClose: ((options?: { restoreFocus?: boolean; reason?: 'ordinary' | 'handoff' | 'hover-leave' | 'dismiss-key'; onlyIfId?: string }) => void) | null = null;
    let capturedOpen: ((registration: { id: string; triggerRef: { current: HTMLElement | null }; contentRef: { current: HTMLElement | null }; onDismiss: (reason: string) => void }) => void) | null = null;

    function ControllerAccessor() {
      const controller = useOverlayController();
      capturedClose = controller.close;
      capturedOpen = controller.open;
      return null;
    }

    const registration = {
      id: 'throwing-x',
      triggerRef: { current: document.createElement('button') },
      contentRef: { current: document.createElement('div') },
      onDismiss: () => { throw new Error('boom-onDismiss'); },
    };

    render(
      <OverlayControllerProvider>
        <ActiveIdProbe />
        <ControllerAccessor />
      </OverlayControllerProvider>,
    );

    act(() => { capturedOpen!(registration); });
    expect(screen.getByTestId('active-id-probe').textContent).toBe('throwing-x');

    expect(() => {
      act(() => { capturedClose!({ restoreFocus: false, reason: 'ordinary' }); });
    }).toThrow('boom-onDismiss');

    // The close-in-flight guard must not remain stuck on the thrown id: the
    // same id can be legitimately opened again right after.
    act(() => { capturedOpen!(registration); });
    expect(screen.getByTestId('active-id-probe').textContent).toBe('throwing-x');
  });
});
