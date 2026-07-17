import { Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export const EMPTY_FILTER = '__EMPTY_FILTER__';

interface MultiFilterProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  variant?: 'toolbar' | 'header';
  align?: 'left' | 'right';
}

export function MultiFilter({ label, options, value, onChange, variant = 'toolbar', align = 'left' }: MultiFilterProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru');
    return normalized ? options.filter((option) => option.toLocaleLowerCase('ru').includes(normalized)) : options;
  }, [options, query]);
  const noneSelected = value.includes(EMPTY_FILTER);
  const allSelected = value.length === 0;
  const selected = allSelected ? new Set(options) : new Set(noneSelected ? [] : value);
  const activeCount = noneSelected ? 0 : value.length;

  const positionMenu = () => {
    if (!detailsRef.current) return;
    const rect = detailsRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const preferred = align === 'right' ? rect.right - width : rect.left;
    const left = Math.max(12, Math.min(preferred, window.innerWidth - width - 12));
    setMenuStyle({ top: rect.bottom + 6, left, width, maxHeight: Math.max(220, window.innerHeight - rect.bottom - 18) });
  };

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!detailsRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        detailsRef.current?.querySelector('summary')?.focus();
      }
    };
    const reposition = () => positionMenu();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, align]);

  const commit = (next: Set<string>) => {
    if (next.size === options.length) onChange([]);
    else if (next.size === 0) onChange([EMPTY_FILTER]);
    else onChange(options.filter((option) => next.has(option)));
  };
  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option); else next.add(option);
    commit(next);
  };
  const selectVisible = () => {
    const next = new Set(selected);
    filteredOptions.forEach((option) => next.add(option));
    commit(next);
  };
  const clearVisible = () => {
    const next = new Set(selected);
    filteredOptions.forEach((option) => next.delete(option));
    commit(next);
  };
  const menu = <div ref={menuRef} className={`registry-filter-menu registry-filter-portal registry-filter-portal-${variant}`} style={menuStyle} role="dialog" aria-label={`Фильтр столбца: ${label}`}>
    <header><div><strong>{label}</strong><span>{options.length} значений</span></div><button type="button" className="registry-filter-close" onClick={() => setOpen(false)} aria-label="Закрыть фильтр"><X size={17} /></button></header>
    {options.length > 8 ? <label className="registry-filter-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск в списке" aria-label={`Поиск: ${label}`} />{query ? <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={14} /></button> : null}</label> : null}
    <div className="registry-filter-tools"><button type="button" onClick={selectVisible}>Выбрать все</button><button type="button" onClick={clearVisible}>Снять все</button></div>
    <div className="registry-filter-options">{filteredOptions.map((option) => <label key={option}><input type="checkbox" checked={selected.has(option)} onChange={() => toggle(option)} /><span>{option}</span></label>)}{!filteredOptions.length ? <p>Значения не найдены</p> : null}</div>
  </div>;

  return <><details ref={detailsRef} open={open} className={`registry-filter registry-filter-${variant} registry-filter-${align}`}>
    <summary aria-label={`Фильтр: ${label}`} title={`Фильтр: ${label}`} onClick={(event) => { event.preventDefault(); setOpen((current) => { if (current) setQuery(''); return !current; }); }}>
      <Filter size={variant === 'header' ? 15 : 14} aria-hidden="true" />
      {variant === 'toolbar' ? <span>{label}</span> : <span className="sr-only">{label}</span>}
      {value.length ? <b aria-label={`Выбрано: ${activeCount}`}>{activeCount}</b> : null}
    </summary>
  </details>{open ? createPortal(menu, document.body) : null}</>;
}

export function matchesFilter(value: string[], candidate: string) {
  if (!value.length) return true;
  if (value.includes(EMPTY_FILTER)) return false;
  return value.includes(candidate);
}

export function uniqueOptions(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}
