import { BarChart3, Building2, Database, Grid3X3, History, MoreHorizontal, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDashboardStore, type DashboardPage } from '../../stores/dashboardStore';

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
  useEffect(() => {
    if (!moreOpen) return;
    const closeOutside = (event: MouseEvent) => { if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [moreOpen]);
  return <nav className="navigation" aria-label="Основные разделы">
    {items.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} className={activePage === id ? 'nav-active' : ''} onClick={() => setActivePage(id)} aria-current={activePage === id ? 'page' : undefined}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}
    <div className="nav-more" ref={moreRef}><button aria-label="Ещё" className={secondary.some((item) => item.id === activePage) ? 'nav-active' : ''} onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} aria-haspopup="menu"><MoreHorizontal size={17} /><span>Ещё</span></button>{moreOpen ? <div role="menu">{secondary.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} role="menuitem" onClick={() => { setActivePage(id); setMoreOpen(false); }}><Icon size={16} aria-hidden="true" />{label}</button>)}</div> : null}</div>
  </nav>;
}
