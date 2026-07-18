import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { AnalysisContext, DashboardData } from '../../types/dashboard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { buildBrandTableRows, CHARACTERISTIC_DEFINITIONS, CHARACTERISTIC_LABELS, sourceLabel } from '../../lib/brandTable';

export function BrandSheet({ brandKey, data, context, onClose }: { brandKey: string; data: DashboardData; context: AnalysisContext; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const brand = data.brandPresence[brandKey];
  useEffect(() => { panel.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  if (!brand) return null;
  const inFocus = brand.malls.includes(context.focusMall.mall);
  const inGroup = brand.malls.filter((mall) => context.displayMalls.some((item) => item.mall === mall));
  const tableRow = buildBrandTableRows(context, data).find((row) => row.brandNormalized === brandKey);
  const originalNames = [...new Set(data.rows.filter((row) => row.brandNormalized === brandKey).map((row) => row.brand))].sort((a, b) => a.localeCompare(b, 'ru'));
  const gapStatus = context.gaps.some((item) => item.brandNormalized === brandKey) ? 'Потенциальный бренд для рассмотрения' : inFocus ? 'Представлен в фокусном объекте' : 'Не входит в текущий gap-анализ';
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="brand-sheet-title" tabIndex={-1} ref={panel}><header><div><p className="eyebrow">Карточка бренда</p><h2 id="brand-sheet-title">{brand.brand}</h2></div><Button variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button></header><dl className="detail-list"><div><dt>Нормализованный ключ</dt><dd>{brand.brandNormalized}</dd></div><div><dt>Исходные варианты</dt><dd>{originalNames.join('; ') || 'н/д'}</dd></div><div><dt>Характеристика</dt><dd>{tableRow ? <span className={`brand-characteristic brand-characteristic-${tableRow.characteristic}`} title={CHARACTERISTIC_DEFINITIONS[tableRow.characteristic]}>{CHARACTERISTIC_LABELS[tableRow.characteristic]}</span> : 'Вне текущего среза'}</dd></div><div><dt>Категория</dt><dd>{brand.category}</dd></div><div><dt>Статус в фокусном объекте</dt><dd><Badge tone={inFocus ? 'success' : 'warning'}>{inFocus ? 'Представлен' : 'Отсутствует'}</Badge></dd></div><div><dt>Количество объектов</dt><dd>{brand.mallCount}</dd></div><div><dt>Все объекты</dt><dd>{brand.malls.join('; ') || 'Нет'}</dd></div><div><dt>В текущей группе</dt><dd>{inGroup.join('; ') || 'Нет'}</dd></div><div><dt>Глобальная уникальность</dt><dd>{brand.mallCount === 1 ? 'Да' : 'Нет'}</dd></div><div><dt>Уникальность в группе</dt><dd>{inGroup.length === 1 ? 'Да' : 'Нет'}</dd></div><div><dt>Gap status</dt><dd>{gapStatus}</dd></div></dl><h3>Источники</h3><div className="source-list">{brand.sources.map((source) => <div key={`${source.mall}-${source.url}`}><div><strong>{source.mall}</strong><small>{sourceLabel(source.type, source.url)} · {source.quality} · {source.checkedAt || 'дата н/д'}</small></div>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : <span>Без ссылки</span>}</div>)}</div></div></div>;
}
