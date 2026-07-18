import { useCallback, useEffect, useId, useRef, type RefObject } from 'react';

const POPOVER_OPEN_EVENT = 'tenant-mix:popover-open';

type ExclusivePopoverOptions = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  dismissKey?: unknown;
  onClose?: () => void;
};

export function useExclusivePopover({ open, setOpen, triggerRef, contentRef, dismissKey, onClose }: ExclusivePopoverOptions) {
  const id = useId();
  const previousDismissKey = useRef(dismissKey);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    onClose?.();
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onClose, setOpen, triggerRef]);

  useEffect(() => {
    if (previousDismissKey.current === dismissKey) return;
    previousDismissKey.current = dismissKey;
    if (open) close(false);
  }, [close, dismissKey, open]);

  useEffect(() => {
    if (!open) return;

    const dismissOtherPopover = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail === id) return;
      close(false);
    };
    const dismissOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (triggerRef.current?.contains(event.target) || contentRef.current?.contains(event.target)) return;
      close(false);
    };
    const dismissWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };

    document.addEventListener(POPOVER_OPEN_EVENT, dismissOtherPopover);
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissWithKeyboard);
    document.dispatchEvent(new CustomEvent(POPOVER_OPEN_EVENT, { detail: id }));

    return () => {
      document.removeEventListener(POPOVER_OPEN_EVENT, dismissOtherPopover);
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissWithKeyboard);
    };
  }, [close, contentRef, id, open, triggerRef]);

  return { close };
}
