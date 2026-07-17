import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export function Tooltip({ label }: { label: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(260, window.innerWidth - 24);
      const preferredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - width - 12));
      const top = Math.max(12, rect.top - 12);
      setPosition({ left, top });
    }
    setOpen(true);
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="tooltip-trigger"
      aria-describedby={open ? id : undefined}
      aria-expanded={open}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onClick={() => open ? setOpen(false) : show()}
    >
      <Info size={17} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
    {open && typeof document !== 'undefined' ? createPortal(
      <span
        id={id}
        role="tooltip"
        className="tooltip-floating"
        style={{ left: position.left, top: position.top }}
      >
        {label}
      </span>,
      document.body,
    ) : null}
  </>;
}
