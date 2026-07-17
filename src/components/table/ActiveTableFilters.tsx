import { RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ActiveTableFilter { key: string; label: string; value: string; }

export function ActiveTableFilters({ filters, onRemove, onReset }: { filters: ActiveTableFilter[]; onRemove: (key: string) => void; onReset: () => void }) {
  if (!filters.length) return null;
  return <div className="active-table-filters" aria-label="Активные фильтры таблицы">{filters.map((filter) => <button type="button" key={filter.key} onClick={() => onRemove(filter.key)}><span>{filter.label}: {filter.value}</span><X size={13} aria-hidden="true" /></button>)}<Button variant="ghost" onClick={onReset}><RotateCcw size={15} />Сбросить фильтры</Button></div>;
}
