import { Info } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Position = {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
};

const VIEWPORT_GUTTER = 12;
const CARD_GAP = 10;

export function Tooltip({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const id = useId();

  const updatePosition = useCallback(() => {
    if (!root.current || !floating.current) return;

    const anchor = root.current.closest<HTMLElement>('.kpi') ?? root.current;
    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    const idealLeft = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
    const maxLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - floatingRect.width - VIEWPORT_GUTTER);
    const left = Math.min(Math.max(idealLeft, VIEWPORT_GUTTER), maxLeft);

    const fitsAbove = anchorRect.top >= floatingRect.height + CARD_GAP + VIEWPORT_GUTTER;
    const placement: Position['placement'] = fitsAbove ? 'top' : 'bottom';
    const idealTop = placement === 'top'
      ? anchorRect.top - floatingRect.height - CARD_GAP
      : anchorRect.bottom + CARD_GAP;
    const maxTop = Math.max(VIEWPORT_GUTTER, viewportHeight - floatingRect.height - VIEWPORT_GUTTER);
    const top = Math.min(Math.max(idealTop, VIEWPORT_GUTTER), maxTop);

    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    const arrowLeft = Math.min(
      Math.max(anchorCenter - left, 18),
      Math.max(18, floatingRect.width - 18),
    );

    setPosition({ left, top, placement, arrowLeft });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, label, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePosition();

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    const anchor = root.current?.closest<HTMLElement>('.kpi') ?? root.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reposition);
    if (anchor) observer?.observe(anchor);
    if (floating.current) observer?.observe(floating.current);

    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      observer?.disconnect();
    };
  }, [open, updatePosition]);

  const floatingStyle = position ? {
    left: `${position.left}px`,
    top: `${position.top}px`,
    '--tooltip-arrow-left': `${position.arrowLeft}px`,
  } as CSSProperties : undefined;

  return (
    <span
      className={open ? 'tooltip tooltip-open' : 'tooltip'}
      ref={root}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Показать методику"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={floating}
              id={id}
              role="tooltip"
              className={`tooltip-popover tooltip-popover-${position?.placement ?? 'top'}${position ? ' tooltip-popover-ready' : ''}`}
              style={floatingStyle}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
