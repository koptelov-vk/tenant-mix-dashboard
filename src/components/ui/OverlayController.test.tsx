// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlayControllerProvider, useControlledOverlay } from './OverlayController';

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
