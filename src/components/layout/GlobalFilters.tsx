import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { AnalysisContext, DashboardData } from '../../types/dashboard';
import { Button } from '../ui/Button';

export function GlobalFilters({ data, context }: { data: DashboardData; context: AnalysisContext }) {
  const state = useDashboardStore();
  const [mallSelector, setMallSelector] = useState(false);
  const cities = useMemo(() => [...new Set(data.mallSummary.map((mall) => mall.city))].sort((a, b) => a.localeCompare(b, 'ru')), [data]);
  const applyPreset = (mode: 'same-class' | 'all') => {
    state.hydrate({ peerGroup: mode, selectedMalls: [] });
  };
  return <section className="filter-shell" aria-label="Параметры анализа">
    <div className="filter-bar">
      <label><span>Фокусный объект</span><select value={context.focusMall.mall} onChange={(event) => state.setFocusMall(event.target.value)}>{data.mallSummary.map((mall) => <option key={mall.mall}>{mall.mall}</option>)}</select></label>
      <label><span>Группа сравнения</span><select value={state.peerGroup} onChange={(event) => applyPreset(event.target.value as 'same-class' | 'all')}><option value="same-class">Сопоставимые</option><option value="all">Все объекты</option>{state.peerGroup === 'custom' ? <option value="custom">Ручной состав</option> : null}</select></label>
      <label><span>География</span><select value={state.cities.length === 1 ? state.cities[0] : ''} onChange={(event) => state.setCities(event.target.value ? [event.target.value] : [])}><option value="">Все города</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
      <label><span>Категория</span><select value={state.category} onChange={(event) => state.setCategory(event.target.value)}><option>Все категории</option>{data.categoryMatrix.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <div className="comparison-field"><span id="comparison-field-label">Выбрать объекты</span><button className="comparison-trigger" type="button" onClick={() => setMallSelector(true)} aria-haspopup="dialog" aria-labelledby="comparison-field-label comparison-field-value"><span className="comparison-trigger-surface"><span id="comparison-field-value">{context.peerMalls.length} выбрано</span><Check size={16} /></span></button></div>
    </div>
    <div className="context-strip"><span>{context.peerMalls.length} объектов в группе сравнения</span><span>{new Set(context.displayMalls.map((mall) => mall.city)).size} городов</span><span>{context.filteredRows.length.toLocaleString('ru-RU')} строк</span>{!context.focusMatchesPeerCriteria ? <strong>Фокусный объект не соответствует текущим критериям группы и добавлен отдельно для сравнения.</strong> : null}</div>
    <div className="active-tags">{state.category !== 'Все категории' ? <button onClick={() => state.setCategory('Все категории')}>{state.category}<X size={13} /></button> : null}{state.cities.map((city) => <button key={city} onClick={() => state.setCities(state.cities.filter((item) => item !== city))}>{city}<X size={13} /></button>)}</div>
    {mallSelector ? createPortal(<MallSelector data={data} focusMall={context.focusMall.mall} selected={state.peerGroup === 'custom' ? state.selectedMalls : context.peerMalls.map((mall) => mall.mall)} onClose={() => setMallSelector(false)} onApply={(malls) => { state.setSelectedMalls(malls); setMallSelector(false); }} />, document.body) : null}
  </section>;
}

function MallSelector({ data, focusMall, selected, onClose, onApply }: { data: DashboardData; focusMall: string; selected: string[]; onClose: () => void; onApply: (malls: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(selected.filter((mall) => mall !== focusMall));
  const malls = useMemo(() => data.mallSummary.filter((mall) => mall.mall !== focusMall && `${mall.mall} ${mall.city}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => Number(draft.includes(b.mall)) - Number(draft.includes(a.mall)) || a.city.localeCompare(b.city, 'ru') || a.mall.localeCompare(b.mall, 'ru')), [data, focusMall, query, draft]);
  const toggleMall = (mall: string) => setDraft((current) => current.includes(mall) ? current.filter((item) => item !== mall) : [...current, mall]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="comparison-selector" role="dialog" aria-modal="true" aria-labelledby="comparison-selector-title"><div className="selector-head"><div><span className="eyebrow">Группа сравнения</span><h2 id="comparison-selector-title">Выбор объектов</h2><p>Фокусный объект добавляется отдельно и не входит в медиану.</p></div><Button variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button></div><label className="selector-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по ТЦ или городу" /></label><div className="selector-tools"><Button variant="outline" onClick={() => setDraft(data.mallSummary.filter((mall) => mall.mall !== focusMall).map((mall) => mall.mall))}>Выбрать все</Button><Button variant="ghost" onClick={() => setDraft([])}>Снять все</Button><span>Выбрано: {draft.length}</span></div><div className="selector-list">{malls.map((mall) => <label key={mall.mall} className={draft.includes(mall.mall) ? 'selected' : ''}><input type="checkbox" checked={draft.includes(mall.mall)} onChange={() => toggleMall(mall.mall)} /><span><b>{mall.mall}</b><small>{mall.city} · {mall.mallClass}</small></span></label>)}</div><div className="selector-footer"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={() => onApply(draft)} disabled={!draft.length}>Применить</Button></div></section></div>;
}
