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

export function OverlayControllerProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useRef<OverlayRegistration | null>(null);

  const close = useCallback((options?: { restoreFocus?: boolean; reason?: CloseReason; onlyIfId?: string }) => {
    const current = active.current;
    if (!current) return;
    if (options?.onlyIfId && current.id !== options.onlyIfId) return;
    active.current = null;
    setActiveId(null);
    current.onDismiss(options?.reason ?? 'ordinary');
    if (options?.restoreFocus !== false && options?.reason !== 'handoff' && options?.reason !== 'hover-leave') {
      requestAnimationFrame(() => { if (!active.current) current.triggerRef.current?.focus(); });
    }
  }, []);

  const open = useCallback((registration: OverlayRegistration) => {
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
  const registration = useMemo<OverlayRegistration>(() => ({
    id, triggerRef, contentRef,
    onDismiss: (reason) => { onDismissReason?.(reason); setOpen(false); onClose?.(); },
  }), [contentRef, id, onClose, onDismissReason, setOpen, triggerRef]);
  const previousDismissKey = useRef(dismissKey);

  useEffect(() => {
    if (previousDismissKey.current === dismissKey) return;
    previousDismissKey.current = dismissKey;
    if (controller.isActive(id)) controller.close({ restoreFocus: false, reason: 'dismiss-key', onlyIfId: id });
  }, [controller, dismissKey, id]);

  useEffect(() => {
    if (requestedOpen && !controller.isActive(id)) controller.open(registration);
  }, [controller, id, registration, requestedOpen]);

  const active = controller.isActive(id) && requestedOpen;
  return {
    id,
    open: active,
    openOverlay: () => { setOpen(true); controller.open(registration); },
    toggle: () => { if (active) setOpen(false); else setOpen(true); controller.toggle(registration); },
    close: (restoreFocus = true, reason: CloseReason = 'ordinary') => controller.close({ restoreFocus, reason, onlyIfId: id }),
  };
}
