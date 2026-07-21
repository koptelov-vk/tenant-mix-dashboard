import { Bookmark, Check, Copy, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDashboardStore, type DashboardFilters } from '../../stores/dashboardStore';
import { useSavedViewStore, type SavedView } from '../../stores/savedViewStore';
import { Button } from '../ui/Button';
import { useControlledOverlay } from '../ui/OverlayController';

function currentFilters(state: ReturnType<typeof useDashboardStore.getState>): DashboardFilters {
  return {
    focusMall: state.focusMall, category: state.category, metric: state.metric, activePage: state.activePage, peerGroup: state.peerGroup,
    selectedMalls: [...state.selectedMalls], cities: [...state.cities], sourceQualities: [...state.sourceQualities], gapN: state.gapN,
    glaMin: state.glaMin, glaMax: state.glaMax, gbaMin: state.gbaMin, gbaMax: state.gbaMax, hideSmallCategories: state.hideSmallCategories,
  };
}

export function SavedViewsMenu({ snapshotDate }: { snapshotDate: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);
  const overlay = useControlledOverlay({ open, setOpen, triggerRef: trigger, contentRef: content });
  const hydrate = useDashboardStore((state) => state.hydrate);
  const { views, save, remove, rename, duplicate } = useSavedViewStore();

  const saveCurrent = () => {
    const cleanName = name.trim() || `Представление ${views.length + 1}`;
    save({ id: crypto.randomUUID(), name: cleanName, createdAt: new Date().toISOString(), snapshotDate, filters: currentFilters(useDashboardStore.getState()), schemaVersion: 1 });
    setName('');
    setMessage('Текущий срез сохранён.');
  };

  const load = (view: SavedView) => {
    hydrate(view.filters);
    setMessage(view.snapshotDate === snapshotDate ? `Загружено: ${view.name}` : `Загружено: ${view.name}. Снимок представления: ${view.snapshotDate}.`);
    overlay.close(false);
  };

  return <div className="saved-views-root" ref={root}>
    <Button ref={trigger} variant="ghost" onClick={overlay.toggle} aria-expanded={open} aria-controls={overlay.id} aria-haspopup="dialog" aria-label="Сохранённые представления"><Bookmark size={17} /><span className="desktop-label">Представления</span></Button>
    {open ? <section id={overlay.id} ref={content} data-pdf-exclude className="overlay-portal-layer saved-views-popover" role="dialog" aria-label="Сохранённые представления">
      <header><div><strong>Сохранённые представления</strong><small>Фильтры, фокус и активный раздел</small></div><button onClick={() => overlay.close(true)} aria-label="Закрыть"><X size={18} /></button></header>
      <div className="saved-view-create"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Название представления" aria-label="Название нового представления" /><Button onClick={saveCurrent}><Plus size={16} />Сохранить</Button></div>
      {message ? <p className="saved-view-message" role="status"><Check size={15} />{message}</p> : null}
      <div className="saved-view-list">{views.map((view) => <div key={view.id}>
        <div><input defaultValue={view.name} onBlur={(event) => rename(view.id, event.target.value)} aria-label={`Переименовать ${view.name}`} /><small>{view.filters.focusMall} · {view.filters.category}<br />снимок {view.snapshotDate}</small></div>
        <div className="saved-view-actions"><Button variant="outline" onClick={() => load(view)}>Открыть</Button><Button variant="ghost" onClick={() => duplicate(view.id)} aria-label={`Копировать ${view.name}`}><Copy size={16} /></Button><Button variant="ghost" onClick={() => remove(view.id)} aria-label={`Удалить ${view.name}`}><Trash2 size={16} /></Button></div>
      </div>)}{!views.length ? <p className="empty-state compact">Сохранённых представлений пока нет.</p> : null}</div>
    </section> : null}
  </div>;
}
