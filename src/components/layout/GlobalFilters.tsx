import { Check, ChevronDown, Search, X } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { AnalysisContext, DashboardData } from '../../types/dashboard';
import { Button } from '../ui/Button';

type FilterOption = { value: string; label: string; meta?: string };

const mallLabel = (mall: { mall: string; city: string }) => mall.mall.toLocaleLowerCase('ru').includes(mall.city.toLocaleLowerCase('ru')) ? mall.mall : `${mall.mall} · ${mall.city}`;

export function GlobalFilters({ data, context }: { data: DashboardData; context: AnalysisContext }) {
  const state = useDashboardStore();
  const [mallSelector, setMallSelector] = useState(false);
  const cities = useMemo(() => [...new Set(data.mallSummary.map((mall) => mall.city))].sort((a, b) => a.localeCompare(b, 'ru')), [data]);
  const categories = useMemo(() => [...data.categoryMatrix.categories].sort((a, b) => a.localeCompare(b, 'ru')), [data]);
  const focusOptions = useMemo(() => [...data.mallSummary]
    .sort((a, b) => a.city.localeCompare(b.city, 'ru') || a.mall.localeCompare(b.mall, 'ru'))
    .map((mall) => ({ value: mall.mall, label: mallLabel(mall), meta: mall.mallClass })), [data]);
  const applyPreset = (mode: 'same-class' | 'all') => state.hydrate({ peerGroup: mode, selectedMalls: [] });

  return <section className="filter-shell" aria-label="Параметры анализа">
    <div className="filter-bar">
      <SearchableFilter label="Фокусный объект" options={focusOptions} selected={[context.focusMall.mall]} onChange={(values) => { const mall = values[0]; if (mall) state.setFocusMall(mall); }} single />
      <FilterSelect label="Группа сравнения" value={state.peerGroup} onChange={(value) => applyPreset(value as 'same-class' | 'all')}>
        <option value="same-class">Сопоставимые</option>
        <option value="all">Все объекты</option>
        {state.peerGroup === 'custom' ? <option value="custom">Ручной состав</option> : null}
      </FilterSelect>
      <SearchableFilter label="География" options={cities.map((city) => ({ value: city, label: city }))} selected={state.cities} onChange={state.setCities} allLabel="Все города" />
      <SearchableFilter label="Категории" options={categories.map((category) => ({ value: category, label: category }))} selected={state.categories} onChange={state.setCategories} allLabel="Все категории" />
      <div className="filter-field comparison-field">
        <span className="filter-label" id="comparison-field-label">Выбрать объекты</span>
        <button className="filter-control comparison-trigger" type="button" onClick={() => setMallSelector(true)} aria-haspopup="dialog" aria-labelledby="comparison-field-label comparison-field-value">
          <span id="comparison-field-value">{context.peerMalls.length} выбрано</span>
          <Check className="filter-control-icon-static" size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="context-strip"><span>{context.peerMalls.length} объектов в группе сравнения</span><span>{new Set(context.displayMalls.map((mall) => mall.city)).size} городов</span><span>{context.filteredRows.length.toLocaleString('ru-RU')} строк</span>{!context.focusMatchesPeerCriteria ? <strong>Фокусный объект не соответствует выбранной географии или диапазону площади и добавлен отдельно для сравнения.</strong> : null}</div>
    <div className="active-tags">
      {state.categories.map((category) => <button key={category} onClick={() => state.setCategories(state.categories.filter((item) => item !== category))}>{category}<X size={13} /></button>)}
      {state.cities.map((city) => <button key={city} onClick={() => state.setCities(state.cities.filter((item) => item !== city))}>{city}<X size={13} /></button>)}
    </div>
    {mallSelector ? createPortal(<MallSelector data={data} focusMall={context.focusMall.mall} selected={state.peerGroup === 'custom' ? state.selectedMalls : context.peerMalls.map((mall) => mall.mall)} onClose={() => setMallSelector(false)} onApply={(malls) => { state.setSelectedMalls(malls); setMallSelector(false); }} />, document.body) : null}
  </section>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="filter-field">
    <span className="filter-label">{label}</span>
    <span className="filter-control-frame">
      <select className="filter-control" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
      <ChevronDown className="filter-control-icon" size={16} aria-hidden="true" />
    </span>
  </label>;
}

function SearchableFilter({ label, options, selected, onChange, allLabel = 'Все', single = false }: { label: string; options: FilterOption[]; selected: string[]; onChange: (values: string[]) => void; allLabel?: string; single?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const id = useId();
  const selectedSet = new Set(selected);
  const filtered = options.filter((option) => `${option.label} ${option.meta ?? ''}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  const summary = single
    ? options.find((option) => option.value === selected[0])?.label ?? allLabel
    : selected.length === 0 ? allLabel : selected.length === 1 ? options.find((option) => option.value === selected[0])?.label ?? selected[0] : `${selected.length} выбрано`;
  const choose = (value: string) => {
    if (single) {
      onChange([value]);
      setOpen(false);
      setQuery('');
      return;
    }
    onChange(selectedSet.has(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };
  return <div className="filter-field searchable-filter">
    <span className="filter-label" id={`${id}-label`}>{label}</span>
    <button className="filter-control" type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen((value) => !value)}>
      <span id={`${id}-value`}>{summary}</span><ChevronDown className="filter-control-icon-static" size={16} aria-hidden="true" />
    </button>
    {open ? <div className="filter-popover" role="dialog" aria-label={`Выбор: ${label}`}>
      <label className="filter-popover-search"><Search size={15} aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Поиск: ${label.toLocaleLowerCase('ru')}`} /></label>
      {!single ? <div className="filter-popover-tools"><button type="button" onClick={() => onChange([])}>{allLabel}</button><span>{selected.length ? `Выбрано: ${selected.length}` : 'Без ограничений'}</span></div> : null}
      <div className="filter-options" role="listbox" aria-multiselectable={!single}>
        {filtered.map((option) => <button key={option.value} type="button" role="option" aria-selected={selectedSet.has(option.value)} className={selectedSet.has(option.value) ? 'selected' : ''} onClick={() => choose(option.value)}>
          <span className="filter-option-check">{selectedSet.has(option.value) ? <Check size={14} /> : null}</span><span><b>{option.label}</b>{option.meta ? <small>{option.meta}</small> : null}</span>
        </button>)}
        {!filtered.length ? <p className="filter-empty">Ничего не найдено</p> : null}
      </div>
      <button className="filter-popover-close" type="button" onClick={() => { setOpen(false); setQuery(''); }}>Готово</button>
    </div> : null}
  </div>;
}

function MallSelector({ data, focusMall, selected, onClose, onApply }: { data: DashboardData; focusMall: string; selected: string[]; onClose: () => void; onApply: (malls: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(selected.filter((mall) => mall !== focusMall));
  const malls = useMemo(() => data.mallSummary.filter((mall) => mall.mall !== focusMall && `${mall.mall} ${mall.city}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => Number(draft.includes(b.mall)) - Number(draft.includes(a.mall)) || a.city.localeCompare(b.city, 'ru') || a.mall.localeCompare(b.mall, 'ru')), [data, focusMall, query, draft]);
  const toggleMall = (mall: string) => setDraft((current) => current.includes(mall) ? current.filter((item) => item !== mall) : [...current, mall]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="comparison-selector" role="dialog" aria-modal="true" aria-labelledby="comparison-selector-title"><div className="selector-head"><div><span className="eyebrow">Группа сравнения</span><h2 id="comparison-selector-title">Выбор объектов</h2><p>Фокусный объект добавляется отдельно и не входит в медиану.</p></div><Button variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button></div><label className="selector-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по ТЦ или городу" /></label><div className="selector-tools"><Button variant="outline" onClick={() => setDraft(data.mallSummary.filter((mall) => mall.mall !== focusMall).map((mall) => mall.mall))}>Выбрать все</Button><Button variant="ghost" onClick={() => setDraft([])}>Снять все</Button><span>Выбрано: {draft.length}</span></div><div className="selector-list">{malls.map((mall) => <label key={mall.mall} className={draft.includes(mall.mall) ? 'selected' : ''}><input type="checkbox" checked={draft.includes(mall.mall)} onChange={() => toggleMall(mall.mall)} /><span><b>{mallLabel(mall)}</b><small>{mall.mallClass}</small></span></label>)}</div><div className="selector-footer"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={() => onApply(draft)} disabled={!draft.length}>Применить</Button></div></section></div>;
}