import { Info } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useControlledOverlay } from './OverlayController';

type Position = { left: number; top: number; placement: 'top' | 'bottom'; arrowLeft: number };
const VIEWPORT_GUTTER = 12;
const CARD_GAP = 10;

export function Tooltip({ label, accessibleLabel = 'Показать методику', className = '' }: { label: string; accessibleLabel?: string; className?: string }) {
  const [requestedOpen, setRequestedOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const openedByClick = useRef(false);
  const overlay = useControlledOverlay({ open: requestedOpen, setOpen: (next) => { if (!next) openedByClick.current = false; setRequestedOpen(next); }, triggerRef: trigger, contentRef: floating });

  const updatePosition = useCallback(() => {
    if (!root.current || !floating.current) return;
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const anchor = root.current.closest<HTMLElement>('.kpi') ?? root.current;
    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.current.getBoundingClientRect();
    const minLeft = viewportLeft + VIEWPORT_GUTTER;
    const maxLeft = Math.max(minLeft, viewportLeft + viewportWidth - floatingRect.width - VIEWPORT_GUTTER);
    const left = Math.min(Math.max(anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2, minLeft), maxLeft);
    const fitsAbove = anchorRect.top - viewportTop >= floatingRect.height + CARD_GAP + VIEWPORT_GUTTER;
    const placement: Position['placement'] = fitsAbove ? 'top' : 'bottom';
    const idealTop = placement === 'top' ? anchorRect.top - floatingRect.height - CARD_GAP : anchorRect.bottom + CARD_GAP;
    const minTop = viewportTop + VIEWPORT_GUTTER;
    const maxTop = Math.max(minTop, viewportTop + viewportHeight - floatingRect.height - VIEWPORT_GUTTER);
    const top = Math.min(Math.max(idealTop, minTop), maxTop);
    const arrowLeft = Math.min(Math.max(anchorRect.left + anchorRect.width / 2 - left, 18), Math.max(18, floatingRect.width - 18));
    setPosition({ left, top, placement, arrowLeft });
  }, []);

  useLayoutEffect(() => {
    if (!overlay.open) { setPosition(null); return; }
    updatePosition();
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    };
  }, [label, overlay.open, updatePosition]);

  const style = position ? { left: position.left, top: position.top, '--tooltip-arrow-left': `${position.arrowLeft}px` } as CSSProperties : undefined;
  return <span className={`${overlay.open ? 'tooltip tooltip-open' : 'tooltip'} ${className}`.trim()} ref={root} onPointerEnter={(event) => { if (event.pointerType !== 'touch') overlay.openOverlay(); }} onPointerLeave={(event) => { if (event.pointerType !== 'touch' && !floating.current?.contains(event.relatedTarget as Node)) overlay.close(false, 'hover-leave'); }}>
    <button ref={trigger} type="button" data-overlay-trigger aria-label={accessibleLabel} aria-expanded={overlay.open} aria-controls={overlay.id} onClick={(event) => { event.preventDefault(); if (overlay.open && openedByClick.current) overlay.close(true); else { openedByClick.current = true; overlay.openOverlay(); } }} onFocus={() => overlay.openOverlay()} onBlur={(event) => { if (!floating.current?.contains(event.relatedTarget as Node)) overlay.close(false, 'hover-leave'); }}><Info size={15} aria-hidden="true" /></button>
    {overlay.open && typeof document !== 'undefined' ? createPortal(<div ref={floating} id={overlay.id} role="tooltip" data-pdf-exclude className={`overlay-portal-layer tooltip-popover tooltip-popover-${position?.placement ?? 'top'}${position ? ' tooltip-popover-ready' : ''}`} style={style}>{label}</div>, document.body) : null}
  </span>;
}
