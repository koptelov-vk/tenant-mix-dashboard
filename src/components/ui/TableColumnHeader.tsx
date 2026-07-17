import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { MultiFilter } from './MultiFilter';

export type SortDirection = 'asc' | 'desc' | null;

interface TableColumnHeaderProps {
  label: string;
  unit?: string | undefined;
  direction: SortDirection;
  onSort: () => void;
  options: string[];
  filterValue: string[];
  onFilterChange: (value: string[]) => void;
  numeric?: boolean;
}

export function TableColumnHeader({ label, unit, direction, onSort, options, filterValue, onFilterChange, numeric = false }: TableColumnHeaderProps) {
  return <div className={`table-column-header${numeric ? ' table-column-header-numeric' : ''}`}>
    <button type="button" className="table-column-sort" onClick={onSort} aria-label={label} title={`Сортировать: ${label}`}>
      <span>{label}{unit ? <small>{unit}</small> : null}</span>
      {direction === 'asc' ? <ArrowUp size={15} /> : direction === 'desc' ? <ArrowDown size={15} /> : <ArrowUpDown size={15} />}
    </button>
    <MultiFilter label={label} options={options} value={filterValue} onChange={onFilterChange} variant="header" align={numeric ? 'right' : 'left'} />
  </div>;
}
