import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

export const OVERLAY_PDF_EXCLUSION_ATTRIBUTE = 'data-pdf-exclude';
export const OVERLAY_PORTAL_CLASS = 'overlay-portal-layer';

type CloseReason = 'ordinary' | 'handoff' | 'hover-leave' | 'dismiss-key';

type OverlayRegistration = {
  id: string;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  onDismiss: (reason: CloseReason) => void;
};

type OverlayControllerValue = {
  activeId: string | null;
  isActive: (id: string) => boolean;
  open: (registration: OverlayRegistration) => void;
  close: (options?: { restoreFocus?: boolean; reason?: CloseReason; onlyIfId?: string }) => void;
  toggle: (registration: OverlayRegistration) => void;
};

const OverlayControllerContext = createContext<OverlayControllerValue | null>(null);

// Documented opener-restore contract: an opener only receives focus back if it is
// still connected, visible and enabled. A removed/hidden/disabled opener is left
// alone (the browser's own default — typically <body> — stands as the fallback).
function isRestorableOpener(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  if (element.hidden || element.closest('[hidden]')) return false;
  if ('disabled' in element && (element as HTMLButtonElement).disabled) return false;
  return true;
}

export function OverlayControllerProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useRef<OverlayRegistration | null>(null);
  // Set for the duration of close()'s own synchronous work on a given overlay id.
  // Some triggers open on focus (e.g. Tooltip's onFocus -> openOverlay, for
  // keyboard users), and close() focuses the opener synchronously as part of
  // the #156 fix — which fires that same onFocus handler re-entrantly, from
  // inside close() itself, before onDismiss has run. Without this guard,
  // open()'s re-registration would overwrite the active/activeId this close()
  // is in the middle of clearing, leaving a stale active registration behind
  // even though the overlay is visually closed.
  const closingId = useRef<string | null>(null);

  const close = useCallback((options?: { restoreFocus?: boolean; reason?: CloseReason; onlyIfId?: string }) => {
    const current = active.current;
    if (!current) return;
    if (options?.onlyIfId && current.id !== options.onlyIfId) return;
    active.current = null;
    setActiveId(null);
    closingId.current = current.id;
    try {
      if (options?.restoreFocus !== false && options?.reason !== 'handoff' && options?.reason !== 'hover-leave') {
        // Move focus to the opener BEFORE onDismiss unmounts the overlay content.
        // Restoring focus after unmount (e.g. via requestAnimationFrame) races the
        // browser's own synchronous reassignment of a removed focused node to
        // <body> — that race is what left focus stranded on <body> after the
        // close-button click (issue #156). Moving focus first means the node the
        // browser is about to detach is never the focused one.
        const opener = current.triggerRef.current;
        if (isRestorableOpener(opener)) opener.focus({ preventScroll: true });
      }
      current.onDismiss(options?.reason ?? 'ordinary');
    } finally {
      closingId.current = null;
    }
  }, []);

  const open = useCallback((registration: OverlayRegistration) => {
    // Reject a re-entrant open of the same overlay triggered by the focus
    // restore inside this very close() call (see closingId comment above).
    // Opening a *different* overlay is never blocked: handoff dismisses the
    // previous one directly (not through close()), so restoreFocus/closingId
    // never come into play for A->B.
    if (closingId.current === registration.id) return;
    const previous = active.current;
    if (previous?.id === registration.id) return;
    if (previous) previous.onDismiss('handoff');
    active.current = registration;
    setActiveId(registration.id);
  }, []);

  const toggle = useCallback((registration: OverlayRegistration) => {
    if (active.current?.id === registration.id) close({ restoreFocus: true, reason: 'ordinary' });
    else open(registration);
  }, [close, open]);

  useEffect(() => {
    const pointer = (event: PointerEvent) => {
      const current = active.current;
      if (!current || !(event.target instanceof Node)) return;
      if (current.triggerRef.current?.contains(event.target) || current.contentRef.current?.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest('[data-overlay-trigger]')) return;
      close({ restoreFocus: true, reason: 'ordinary' });
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !active.current) return;
      event.preventDefault();
      event.stopPropagation();
      close({ restoreFocus: true, reason: 'ordinary' });
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [close]);

  const value = useMemo<OverlayControllerValue>(() => ({ activeId, isActive: (id) => activeId === id, open, close, toggle }), [activeId, close, open, toggle]);
  return <OverlayControllerContext.Provider value={value}>{children}</OverlayControllerContext.Provider>;
}

export function useOverlayController() {
  const context = useContext(OverlayControllerContext);
  if (!context) throw new Error('useOverlayController must be used within OverlayControllerProvider');
  return context;
}

export function useControlledOverlay({ open: requestedOpen, setOpen, triggerRef, contentRef, dismissKey, onClose, onDismissReason }: {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  dismissKey?: unknown;
  onClose?: () => void;
  onDismissReason?: (reason: CloseReason) => void;
}) {
  const reactId = useId();
  const id = `overlay-${reactId.replace(/:/g, '')}`;
  const controller = useOverlayController();
  const dismissedWhileOpen = useRef(false);
  const registration = useMemo<OverlayRegistration>(() => ({
    id, triggerRef, contentRef,
    onDismiss: (reason) => {
      dismissedWhileOpen.current = true;
      onDismissReason?.(reason);
      setOpen(false);
      onClose?.();
    },
  }), [contentRef, id, onClose, onDismissReason, setOpen, triggerRef]);
  const previousDismissKey = useRef(dismissKey);

  useEffect(() => {
    if (previousDismissKey.current === dismissKey) return;
    previousDismissKey.current = dismissKey;
    if (controller.isActive(id)) controller.close({ restoreFocus: false, reason: 'dismiss-key', onlyIfId: id });
  }, [controller, dismissKey, id]);

  useEffect(() => {
    if (!requestedOpen) {
      dismissedWhileOpen.current = false;
      return;
    }
    if (!dismissedWhileOpen.current && !controller.isActive(id)) controller.open(registration);
  }, [controller, id, registration, requestedOpen]);

  const active = controller.isActive(id) && requestedOpen;
  return {
    id,
    open: active,
    openOverlay: () => { dismissedWhileOpen.current = false; setOpen(true); controller.open(registration); },
    toggle: () => { dismissedWhileOpen.current = false; if (active) setOpen(false); else setOpen(true); controller.toggle(registration); },
    close: (restoreFocus = true, reason: CloseReason = 'ordinary') => controller.close({ restoreFocus, reason, onlyIfId: id }),
  };
}
