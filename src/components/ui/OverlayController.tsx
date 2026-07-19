import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

type OverlayRegistration = {
  id: string;
  triggerRef?: RefObject<HTMLElement | null>;
};

type OverlayControllerValue = {
  activeId: string | null;
  isActive: (id: string) => boolean;
  open: (registration: OverlayRegistration) => void;
  close: (options?: { restoreFocus?: boolean }) => void;
  toggle: (registration: OverlayRegistration) => void;
};

const OverlayControllerContext = createContext<OverlayControllerValue | null>(null);

export function OverlayControllerProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTriggerRef = useRef<RefObject<HTMLElement | null> | undefined>(undefined);

  const open = useCallback((registration: OverlayRegistration) => {
    activeTriggerRef.current = registration.triggerRef;
    setActiveId(registration.id);
  }, []);

  const close = useCallback((options?: { restoreFocus?: boolean }) => {
    const trigger = activeTriggerRef.current?.current;
    activeTriggerRef.current = undefined;
    setActiveId(null);
    if (options?.restoreFocus && trigger) requestAnimationFrame(() => trigger.focus());
  }, []);

  const toggle = useCallback((registration: OverlayRegistration) => {
    setActiveId((current) => {
      if (current === registration.id) {
        const trigger = activeTriggerRef.current?.current;
        activeTriggerRef.current = undefined;
        if (trigger) requestAnimationFrame(() => trigger.focus());
        return null;
      }
      activeTriggerRef.current = registration.triggerRef;
      return registration.id;
    });
  }, []);

  const value = useMemo<OverlayControllerValue>(() => ({
    activeId,
    isActive: (id) => activeId === id,
    open,
    close,
    toggle,
  }), [activeId, close, open, toggle]);

  return <OverlayControllerContext.Provider value={value}>{children}</OverlayControllerContext.Provider>;
}

export function useOverlayController() {
  const context = useContext(OverlayControllerContext);
  if (!context) throw new Error('useOverlayController must be used within OverlayControllerProvider');
  return context;
}
