import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export function Tooltip({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [open]);
  return <span className={open ? 'tooltip tooltip-open' : 'tooltip'} ref={root}><button type="button" aria-label="Показать методику" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen((value) => !value)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)}><Info size={15} aria-hidden="true" /></button><span id={id} role="tooltip">{label}</span></span>;
}
