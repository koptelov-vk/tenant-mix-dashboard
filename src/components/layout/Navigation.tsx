import { BarChart3, Building2, Database, FlaskConical, Grid3X3, History, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { useDashboardStore, type DashboardPage } from '../../stores/dashboardStore';

const items: Array<{ id: DashboardPage; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Обзор', icon: Sparkles },
  { id: 'comparability', label: 'Сопоставимость', icon: Building2 },
  { id: 'categories', label: 'Категории', icon: Grid3X3 },
  { id: 'brands', label: 'Бренды', icon: Store },
  { id: 'scenarios', label: 'Сценарии', icon: FlaskConical },
  { id: 'upcoming', label: 'Скоро открытие', icon: BarChart3 },
  { id: 'quality', label: 'Качество данных', icon: Database },
  { id: 'history', label: 'Динамика', icon: History },
];

export function Navigation() {
  const activePage = useDashboardStore((state) => state.activePage);
  const setActivePage = useDashboardStore((state) => state.setActivePage);
  return <nav className="navigation" aria-label="Основные разделы">
    {items.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? 'nav-active' : ''} onClick={() => setActivePage(id)} aria-current={activePage === id ? 'page' : undefined}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}
  </nav>;
}
