import { Filter, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { AnalysisContext, DashboardData, SourceQuality } from '../../types/dashboard';
import { Button } from '../ui/Button';

const qualities: SourceQuality[] = ['Высокая', 'Средняя', 'Низкая'];

export function GlobalFilters({ data, context }: { data: DashboardData; context: AnalysisContext }) {
  const state = useDashboardStore();
  const [advanced, setAdvanced] = useState(false);
  const cities = useMemo(() => [...new Set(data.mallSummary.map((mall) => mall.city))].sort((a, b) => a.localeCompare(b, 'ru')), [data]);
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const active = [state.category !== 'Все категории', state.cities.length > 0, state.sourceQualities.length > 0, state.selectedMalls.length > 0, state.glaMin != null, state.glaMax != null, state.gbaMin != null, state.gbaMax != null].filter(Boolean).length;
  return <section className="filter-shell" aria-label="Параметры анализа">
    <div className="filter-bar">
      <label><span>Фокусный ТЦ</span><select value={context.focusMall.mall} onChange={(event) => state.setFocusMall(event.target.value)}>{data.mallSummary.map((mall) => <option key={mall.mall}>{mall.mall}</option>)}</select></label>
      <label><span>Группа сравнения</span><select value={state.peerGroup} onChange={(event) => state.setPeerGroup(event.target.value as 'same-class' | 'all')}><option value="same-class">Тот же класс</option><option value="all">Все объекты</option></select></label>
      <label><span>География</span><select value={state.cities.length === 1 ? state.cities[0] : ''} onChange={(event) => state.setCities(event.target.value ? [event.target.value] : [])}><option value="">Все города</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
      <label><span>Категория</span><select value={state.category} onChange={(event) => state.setCategory(event.target.value)}><option>Все категории</option>{data.categoryMatrix.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <Button variant="outline" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}><Filter size={17} />Ещё фильтры{active ? <b className="filter-count">{active}</b> : null}</Button>
    </div>
    {advanced ? <div className="advanced-filters">
      <fieldset><legend>Качество источника</legend><div className="check-grid">{qualities.map((quality) => <label key={quality}><input type="checkbox" checked={state.sourceQualities.includes(quality)} onChange={() => state.setSourceQualities(toggle(state.sourceQualities, quality))} />{quality}</label>)}</div></fieldset>
      <fieldset><legend>Диапазон GLA, м²</legend><div className="range-inputs"><input type="number" placeholder="от" value={state.glaMin ?? ''} onChange={(event) => state.setAreaFilter('glaMin', event.target.value ? Number(event.target.value) : null)} /><input type="number" placeholder="до" value={state.glaMax ?? ''} onChange={(event) => state.setAreaFilter('glaMax', event.target.value ? Number(event.target.value) : null)} /></div></fieldset>
      <fieldset><legend>Диапазон GBA, м²</legend><div className="range-inputs"><input type="number" placeholder="от" value={state.gbaMin ?? ''} onChange={(event) => state.setAreaFilter('gbaMin', event.target.value ? Number(event.target.value) : null)} /><input type="number" placeholder="до" value={state.gbaMax ?? ''} onChange={(event) => state.setAreaFilter('gbaMax', event.target.value ? Number(event.target.value) : null)} /></div></fieldset>
    </div> : null}
    <div className="context-strip"><span>{context.peerMalls.length} объектов peer group</span><span>{new Set(context.displayMalls.map((mall) => mall.city)).size} городов</span><span>{context.filteredRows.length.toLocaleString('ru-RU')} строк</span>{!context.focusMatchesPeerCriteria ? <strong>Фокус добавлен отдельно и не входит в медиану</strong> : null}</div>
    <div className="active-tags">{state.category !== 'Все категории' ? <button onClick={() => state.setCategory('Все категории')}>{state.category}<X size={13} /></button> : null}{state.cities.map((city) => <button key={city} onClick={() => state.setCities(state.cities.filter((item) => item !== city))}>{city}<X size={13} /></button>)}</div>
  </section>;
}
