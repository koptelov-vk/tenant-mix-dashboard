import { useRef, useState, type ReactNode } from 'react';
import { useControlledOverlay } from './OverlayController';

export function ControlledDisclosure({ summary, children, className = 'method-disclosure' }: { summary: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const overlay = useControlledOverlay({ open, setOpen, triggerRef: trigger, contentRef: content });
  return <details open={open} className={className}>
    <summary ref={trigger} aria-expanded={open} aria-controls={overlay.id} onClick={(event) => { event.preventDefault(); overlay.toggle(); }}>{summary}</summary>
    {open ? <div id={overlay.id} ref={content} data-pdf-exclude className="overlay-inline-disclosure" role="region" aria-label={summary}>{children}</div> : null}
  </details>;
}
