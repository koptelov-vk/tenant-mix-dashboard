import { LayoutTemplate, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

export function TemplatesMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.templates-trigger')?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(true); } };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) close(); };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', keyboard); window.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <div className="templates-root" ref={root}><Button className="templates-trigger" variant="ghost" onClick={() => setOpen((value) => !value)} aria-label="Открыть шаблоны" aria-expanded={open} aria-haspopup="dialog" title="Шаблоны"><LayoutTemplate size={17} aria-hidden="true" /><span className="desktop-label">Шаблоны</span></Button>{open ? <section className="templates-popover" role="dialog" aria-label="Каталог шаблонов"><header><div><strong>Шаблоны</strong><small>Предопределённые конфигурации управленческих сценариев</small></div><button onClick={() => close(true)} aria-label="Закрыть шаблоны"><X size={18} aria-hidden="true" /></button></header><p className="empty-state compact">Шаблоны пока не настроены. Сохранённые представления пользователей не входят в этот каталог.</p></section> : null}</div>;
}
