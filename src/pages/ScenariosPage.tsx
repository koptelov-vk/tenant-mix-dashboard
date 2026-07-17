import { Copy, Download, FolderOpen, Minus, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { calculateScenario } from '../lib/calculations/scenarios';
import { useScenarioStore, type SavedScenario } from '../stores/scenarioStore';
import type { AnalysisContext, DashboardData } from '../types/dashboard';

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  return <b className={value > 0 ? 'delta-positive' : value < 0 ? 'delta-negative' : ''}>{value > 0 ? '+' : ''}{value}{suffix}</b>;
}

export default function ScenariosPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [added, setAdded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [brandToAdd, setBrandToAdd] = useState('');
  const [brandToRemove, setBrandToRemove] = useState('');
  const [scenarioName, setScenarioName] = useState('Новый сценарий');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const { scenarios, save, remove, rename, duplicate, importMany } = useScenarioStore();
  const focusKeys = context.intersections.focusBrands;

  const candidates = useMemo(
    () => Object.values(data.brandPresence)
      .filter((item) => !focusKeys.has(item.brandNormalized))
      .sort((a, b) => a.brand.localeCompare(b.brand, 'ru')),
    [data, focusKeys],
  );
  const focusBrands = useMemo(
    () => [...focusKeys]
      .map((key) => data.brandPresence[key])
      .filter((item) => item != null)
      .sort((a, b) => a.brand.localeCompare(b.brand, 'ru')),
    [data, focusKeys],
  );
  const result = useMemo(() => calculateScenario(context, data, added, removed), [context, data, added, removed]);
  const categoryChanges = useMemo(() => {
    const categories = new Set([...Object.keys(result.baseline.categoryCounts), ...Object.keys(result.scenario.categoryCounts)]);
    return [...categories].map((category) => ({
      category,
      baseline: result.baseline.categoryCounts[category] ?? 0,
      scenario: result.scenario.categoryCounts[category] ?? 0,
    })).filter((item) => item.baseline !== item.scenario)
      .sort((a, b) => Math.abs(b.scenario - b.baseline) - Math.abs(a.scenario - a.baseline));
  }, [result]);

  const currentScenario = (): SavedScenario => ({
    id: activeId ?? crypto.randomUUID(),
    name: scenarioName.trim() || 'Новый сценарий',
    focusMallId: context.focusMall.mall,
    createdAt: new Date().toISOString(),
    dataSnapshot: data.meta.snapshotDate,
    addedBrandIds: added,
    removedBrandIds: removed,
    schemaVersion: 1,
  });

  const saveCurrent = () => {
    const scenario = currentScenario();
    save(scenario);
    setActiveId(scenario.id);
    setMessage('Сценарий сохранён локально.');
  };
  const loadScenario = (scenario: SavedScenario) => {
    setActiveId(scenario.id);
    setScenarioName(scenario.name);
    setAdded(scenario.addedBrandIds);
    setRemoved(scenario.removedBrandIds);
    setMessage(scenario.dataSnapshot === data.meta.snapshotDate
      ? 'Сценарий загружен.'
      : `Сценарий создан на снимке ${scenario.dataSnapshot}; текущий снимок ${data.meta.snapshotDate}.`);
  };
  const reset = () => {
    setActiveId(null);
    setScenarioName('Новый сценарий');
    setAdded([]);
    setRemoved([]);
    setMessage('');
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const imported = importMany(JSON.parse(await file.text()));
      setMessage(`Импортировано сценариев: ${imported.length}.`);
    } catch {
      setMessage('Файл не соответствует схеме сценариев Tenant Mix.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return <>
    <div className="page-heading">
      <div><h1>Сценарии</h1><p>Аналитический sandbox: изменения не затрагивают production-базу и не оценивают финансовый эффект.</p></div>
      <div className="page-actions">
        <Button variant="outline" onClick={reset}><RotateCcw size={17} />Сбросить</Button>
        <Button onClick={saveCurrent}><Save size={17} />Сохранить</Button>
      </div>
    </div>
    {message ? <div className="alert scenario-message" role="status">{message}</div> : null}
    <section className="scenario-grid">
      <Card>
        <CardHeader eyebrow="Baseline vs scenario" title={context.focusMall.mall} />
        <label className="scenario-name">Название сценария<input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label>
        <div className="scenario-kpis scenario-kpis-wide">
          <div><span>Бренды</span><b>{result.scenario.totalBrands}</b><small>baseline {result.baseline.totalBrands}</small><Delta value={result.scenario.totalBrands - result.baseline.totalBrands} /></div>
          <div><span>Эксклюзивы</span><b>{result.scenario.focusExclusive}</b><small>baseline {result.baseline.focusExclusive}</small><Delta value={result.scenario.focusExclusive - result.baseline.focusExclusive} /></div>
          <div><span>Пересечения</span><b>{result.scenario.intersections}</b><small>baseline {result.baseline.intersections}</small><Delta value={result.scenario.intersections - result.baseline.intersections} /></div>
        </div>

        <div className="scenario-editors">
          <label>Добавить бренд<select value={brandToAdd} onChange={(event) => setBrandToAdd(event.target.value)}><option value="">Выберите бренд</option>{candidates.map((item) => <option key={item.brandNormalized} value={item.brandNormalized}>{item.brand} · {item.category}</option>)}</select><Button disabled={!brandToAdd} onClick={() => { if (brandToAdd && !added.includes(brandToAdd)) setAdded([...added, brandToAdd]); setRemoved(removed.filter((item) => item !== brandToAdd)); setBrandToAdd(''); }}><Plus size={17} />Добавить</Button></label>
          <label>Удалить бренд<select value={brandToRemove} onChange={(event) => setBrandToRemove(event.target.value)}><option value="">Выберите бренд</option>{focusBrands.map((item) => <option key={item.brandNormalized} value={item.brandNormalized}>{item.brand} · {item.category}</option>)}</select><Button variant="outline" disabled={!brandToRemove} onClick={() => { if (brandToRemove && !removed.includes(brandToRemove)) setRemoved([...removed, brandToRemove]); setAdded(added.filter((item) => item !== brandToRemove)); setBrandToRemove(''); }}><Minus size={17} />Удалить</Button></label>
        </div>

        <div className="scenario-changes">
          <h3>Изменения</h3>
          {added.map((key) => <button key={`add-${key}`} onClick={() => setAdded(added.filter((item) => item !== key))}><Plus size={14} />{data.brandPresence[key]?.brand ?? key}<Trash2 size={14} /></button>)}
          {removed.map((key) => <button key={`remove-${key}`} onClick={() => setRemoved(removed.filter((item) => item !== key))}><Minus size={14} />{data.brandPresence[key]?.brand ?? key}<Trash2 size={14} /></button>)}
          {!added.length && !removed.length ? <p className="empty-state compact">Изменений пока нет.</p> : null}
        </div>

        <h3>Изменение категорий</h3>
        {categoryChanges.length ? <div className="scenario-category-list">{categoryChanges.map((item) => <div key={item.category}><span>{item.category}</span><small>{item.baseline} → {item.scenario}</small><Delta value={item.scenario - item.baseline} /></div>)}</div> : <p className="empty-state compact">Категорийная структура совпадает с baseline.</p>}

        <h3>Сходство состава брендов</h3>
        <div className="scenario-similarity-list">{result.scenario.similarities.slice(0, 5).map((item) => {
          const baseline = result.baseline.similarities.find((value) => value.mall === item.mall)?.jaccard ?? 0;
          const delta = Math.round((item.jaccard - baseline) * 1000) / 10;
          return <div key={item.mall}><span>{item.mall}</span><strong>{Math.round(item.jaccard * 100)}%</strong><small>{item.common} общих</small><Delta value={delta} suffix=" п.п." /></div>;
        })}</div>
        <p className="method-note">Индекс Жаккара отражает сходство состава брендов и не доказывает полную коммерческую сопоставимость объектов.</p>
      </Card>

      <Card>
        <CardHeader eyebrow="LocalStorage" title="Сохранённые сценарии" action={<div className="scenario-file-actions"><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importFile(event.target.files?.[0])} /><Button variant="outline" onClick={() => fileInput.current?.click()}><Upload size={16} />Импорт</Button><Button variant="outline" disabled={!scenarios.length} onClick={() => downloadJson(scenarios, 'tenant-mix-scenarios.json')}><Download size={16} />Экспорт</Button></div>} />
        <div className="saved-scenarios">{scenarios.map((item) => <div key={item.id} className={item.id === activeId ? 'active' : ''}><div><input aria-label={`Название сценария ${item.name}`} defaultValue={item.name} onBlur={(event) => rename(item.id, event.target.value)} /><small>{item.focusMallId} · {item.dataSnapshot} · +{item.addedBrandIds.length} / -{item.removedBrandIds.length}</small></div><div className="scenario-row-actions"><Button variant="ghost" onClick={() => loadScenario(item)} aria-label={`Загрузить ${item.name}`}><FolderOpen size={16} /></Button><Button variant="ghost" onClick={() => duplicate(item.id)} aria-label={`Создать копию ${item.name}`}><Copy size={16} /></Button><Button variant="ghost" onClick={() => downloadJson(item, `${item.name}.json`)} aria-label={`Экспортировать ${item.name}`}><Download size={16} /></Button><Button variant="ghost" onClick={() => { remove(item.id); if (activeId === item.id) reset(); }} aria-label={`Удалить ${item.name}`}><Trash2 size={16} /></Button></div></div>)}{!scenarios.length ? <p className="empty-state">Сохранённых сценариев пока нет.</p> : null}</div>
      </Card>
    </section>
  </>;
}
