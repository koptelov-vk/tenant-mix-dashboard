import { BarChart3, Building2, Database, Grid3X3, History, MoreHorizontal, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDashboardStore, type DashboardPage } from '../../stores/dashboardStore';
import { useControlledOverlay } from '../ui/OverlayController';

const items: Array<{ id: DashboardPage; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Сравнение', icon: Sparkles },
  { id: 'categories', label: 'Категории', icon: Grid3X3 },
  { id: 'brands', label: 'Бренды', icon: Store },
  { id: 'comparability', label: 'Сопоставимость', icon: Building2 },
  { id: 'upcoming', label: 'Скоро открытие', icon: BarChart3 },
];
const secondary: Array<{ id: DashboardPage; label: string; icon: LucideIcon }> = [
  { id: 'quality', label: 'Качество данных', icon: Database },
  { id: 'history', label: 'Динамика', icon: History },
];

export function Navigation() {
  const activePage = useDashboardStore((state) => state.activePage);
  const setActivePage = useDashboardStore((state) => state.setActivePage);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const moreContent = useRef<HTMLDivElement>(null);
  const moreOverlay = useControlledOverlay({ open: moreOpen, setOpen: setMoreOpen, triggerRef: moreTrigger, contentRef: moreContent });
  return <nav className="navigation" aria-label="Основные разделы">
    {items.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} className={activePage === id ? 'nav-active' : ''} onClick={() => setActivePage(id)} aria-current={activePage === id ? 'page' : undefined}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}
    <div className="nav-more" ref={moreRef}><button ref={moreTrigger} aria-label="Ещё" className={secondary.some((item) => item.id === activePage) ? 'nav-active' : ''} onClick={moreOverlay.toggle} aria-expanded={moreOpen} aria-controls={moreOverlay.id} aria-haspopup="menu"><MoreHorizontal size={17} /><span>Ещё</span></button>{moreOpen ? <div id={moreOverlay.id} ref={moreContent} data-pdf-exclude className="overlay-portal-layer" role="menu">{secondary.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} role="menuitem" onClick={() => { setActivePage(id); moreOverlay.close(false); }}><Icon size={16} aria-hidden="true" />{label}</button>)}</div> : null}</div>
  </nav>;
}
