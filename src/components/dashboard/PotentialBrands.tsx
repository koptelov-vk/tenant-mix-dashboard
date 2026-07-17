import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AnalysisContext } from '../../types/dashboard';
import { formatPercent } from '../../lib/utils';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Card, CardHeader } from '../ui/Card';

export function PotentialBrands({ context, limit = 5 }: { context: AnalysisContext; limit?: number }) {
  const gapN = useDashboardStore((state) => state.gapN);
  const setGapN = useDashboardStore((state) => state.setGapN);
  const maxObjects = Math.max(1, context.peerMalls.length);

  useEffect(() => {
    if (gapN > maxObjects) setGapN(maxObjects);
  }, [gapN, maxObjects, setGapN]);

  return <Card><CardHeader title="Потенциальные бренды для рассмотрения" action={<label className="inline-control">Минимум объектов<select aria-label="Минимум объектов для списка брендов" value={Math.min(gapN, maxObjects)} onChange={(event) => setGapN(Number(event.target.value))}>{Array.from({ length: maxObjects }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select><span className="gap-result-count" aria-live="polite">{context.gaps.length} брендов</span></label>} /><div className="brand-signals">{context.gaps.slice(0, limit).map((item) => <div key={item.brandNormalized}><div><strong>{item.brand}</strong><small>{item.category} · {item.mallCount} объектов · {formatPercent(item.share)}</small></div><span>{item.malls.slice(0, 3).join(', ')}</span><a href={item.source.url} target="_blank" rel="noopener noreferrer" aria-label={`Источник бренда ${item.brand}`}><ExternalLink size={16} /></a></div>)}{!context.gaps.length ? <p className="empty-state">По текущим критериям бренды не найдены.</p> : null}</div><p className="method-note">Сигнал отражает распространённость бренда и качество источника, но не готовность к сделке.</p></Card>;
}
