import type { AnalysisContext } from '../../types/dashboard';
import { formatArea, formatNumber, formatPercent } from '../../lib/utils';
import { Card, CardHeader } from '../ui/Card';

export function ComparableObjects({ context, limit = 3 }: { context: AnalysisContext; limit?: number }) {
  return <Card><CardHeader title="Наиболее сопоставимые ТЦ" /><div className="similarity-list">{context.similarities.slice(0, limit).map((item, index) => <div className="similarity-item" key={item.mall.mall}><span className="rank-dot">{index + 1}</span><div><strong>{item.mall.mall}</strong><small>{item.mall.city} · GLA {formatArea(item.mall.gla)}</small></div><div className="similarity-meter"><i style={{ width: `${item.jaccard * 100}%` }} /></div><b>{formatPercent(item.jaccard)}</b><small>{formatNumber.format(item.common)} общих</small></div>)}</div><p className="method-note">Индекс отражает сходство состава брендов, но не доказывает полную коммерческую сопоставимость.</p></Card>;
}
